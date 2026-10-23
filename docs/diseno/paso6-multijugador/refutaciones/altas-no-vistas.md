# Objeciones de gravedad ALTA que el corrector no vio · Multijugador

**Total:** 15.
Texto íntegro de cada experto (de `refutaciones/*.json`). Id = ronda/experto/problema.

## INV-B-1 · Investigación · experto B (investigacion-2.json, problemas[0])

- **Dónde:** tecnologia.md §0.1, §2.4, §6.1, §10–10.1 (F0 y F3) frente a codigo.md §0.4, §4 y §5
- **Problema:** Los dos informes recomiendan modelos opuestos. tecnologia.md propone una autoridad única: el anfitrión simula los 4 héroes y el invitado solo predice su movimiento. Además dice que F3 corre «la misma simulación de F1» en un DO. codigo.md propone autoridad repartida (B): cada cliente es dueño de su héroe y el anfitrión, del mundo; el modelo A queda para el ladder. Si la v1 es B, la reutilización para F3 no existe. Un DO autoritativo necesita el modelo A completo, que exige: mover el estado de lanzamiento de `Game` al héroe (`_channel` 28, `_charging` 22, `_windup` 15, `_needsRelease` 15…, unos 130 sitios); pasar `input` al héroe; quitar las 13 guardas `g.player !== p`; y una simulación sin DOM. El F0 de tecnologia.md no incluye ese traslado del estado de lanzamiento, así que el costo de F0 y de F3 está subestimado.
- **Arreglo propuesto:** Decidir por escrito y en un solo documento. Recomiendo B para la v1: menos refactor, las habilidades propias con 0 ms y aguanta las trampas entre amigos. Meter igual en F0 el estado de lanzamiento por héroe (`p.cast`), como deuda que hay que pagar antes del ladder. Costear F3 como «modelo A + simulación sin DOM + predicción de habilidades», no como reutilización. Unificar la tabla de fases y los criterios de salida.
- **Fuente:** js/game-skills.js (estado `_channel/_charging/_windup` en Game; codigo.md §3.1), js/main.js:1576-1708; https://gabrielgambetta.com/client-server-game-architecture.html

## INV-B-2 · Investigación · experto B (investigacion-2.json, problemas[1])

- **Dónde:** tecnologia.md §8 y §11 R1; codigo.md §7.6 y paso 0.1 (acumulador con un máximo de 4 pasos)
- **Problema:** El riesgo del anfitrión oculto está mal dimensionado:
(a) En Windows, Chrome trata como oculta una ventana tapada por otra ventana nativa, como Discord o un juego a pantalla completa, y también la pantalla bloqueada: «rendering stops, and js is throttled». Basta un alt-tab; no hace falta cambiar de pestaña.
(b) Con un DataChannel abierto, los temporizadores quedan a 1 por segundo. Con el acumulador de codigo.md (como máximo 4 pasos de 1/60) el mundo correría al 6,7 % de velocidad; con el `Math.min(0.05, dt)` de hoy (main.js:1545), al 5 %. La mitigación (a) de codigo.md (setTimeout al ocultarse) solo funciona con audio audible.
(c) Ninguno de los dos vio que RTCDataChannel es transferible a un Worker: Chrome 130, Firefox 144 y Safari 15. La red del anfitrión puede ir directo a un Dedicated Worker; solo `RTCPeerConnection` se crea en el hilo principal.
(d) Falta un dato a favor: el congelamiento por Ahorro de energía (Chrome 133) exime a las páginas con un RTCDataChannel abierto.
- **Arreglo propuesto:** Tratar R1 como bloqueante de F1 y probar con un prototipo, en este orden:
1) Simulación del anfitrión en un Worker, con los DataChannels transferidos.
2) Plan B barato en el hilo principal: avanzar la simulación cuando llega cada `onmessage` de los invitados (los eventos de red no dependen de temporizadores), con un acumulador por `performance.now()` y un tope de pasos alto (~30) solo para el anfitrión.
3) Si nada sirve, pausa cooperativa con el aviso «el anfitrión está ausente».
Medir en Chrome, Firefox y Safari con la ventana tapada, minimizada, la pestaña oculta y la pantalla bloqueada.
- **Fuente:** https://chromium.googlesource.com/chromium/src/+/HEAD/docs/windows_native_window_occlusion_tracking.md ; https://developer.chrome.com/blog/timer-throttling-in-chrome-88 ; https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/RTCDataChannel.json (transferable: chrome 130, firefox 144, safari 15) ; https://developer.chrome.com/blog/freezing-on-energy-saver ; js/main.js:212, 1545

## INV-B-3 · Investigación · experto B (investigacion-2.json, problemas[2])

- **Dónde:** codigo.md §1 (fila «Mundo reproducible por semilla»), §5 session.js («el mapa se reconstruye por semilla»), §8; tecnologia.md no lo trata
- **Problema:** `buildTown()` y `buildRefuge()` colocan árboles y cristales con `ri()`, que es `Math.random` (world.js:6), y bloquean esas celdas con `grid.cells[z][x] = 0` (world.js:778-783 y 1284-1288). `loadWorld` los construye sin semilla (main.js:472-473). Por eso la rejilla de colisión del pueblo y del refugio es distinta en cada máquina. En B, cada dueño mueve su héroe contra su propia rejilla: un héroe remoto atraviesa árboles o se traba. En A, la predicción del movimiento se corrige todo el tiempo. Además, zones.js:217 decide la colocación con `Math.hypot`, que ECMA-262 deja como aproximada por la implementación, así que entre Chrome y Firefox no hay garantía de que un empate en un umbral se resuelva igual. test58 solo lo prueba en Node.
- **Arreglo propuesto:** En F0, pasar el pueblo y el refugio a `mulberry32(seed)`, como ya hacen la mazmorra y la zona. En el saludo, el anfitrión manda la semilla y un CRC32 de la rejilla; si no coincide, manda la rejilla como bitset (120×120 = 1,8 KB) por el canal fiable. Ampliar test58 al pueblo y al refugio, comparando el hash de la rejilla con una constante.
- **Fuente:** js/world.js:6, 778-783, 1252-1288; js/main.js:472-475; js/zones.js:217; https://esdiscuss.org/topic/es6-accuracy-of-special-functions

## INV-B-4 · Investigación · experto B (investigacion-2.json, problemas[3])

- **Dónde:** tecnologia.md §2.3, §3 (fila «Tamaño de mensaje») y §4.1; codigo.md §5 (transport.js) y §7.4
- **Problema:** Ninguno de los dos fija un presupuesto por mensaje ni el control de cola. dcSCTP, la pila de Chrome, usa por defecto una MTU de 1191 B, `rto_min` de 400 ms, `rto_initial` de 500 ms, ACK diferido de 200 ms y no intercala mensajes (RFC 8260 desactivado). Eso implica:
(a) Una instantánea de más de ~1150 B se fragmenta, y con `maxRetransmits:0` perder un fragmento pierde la instantánea entera, así que la pérdida efectiva se multiplica. Las cifras de 0,5–0,75 KB son el promedio; un jefe con 4 héroes, invocaciones y proyectiles puede pasarse.
(b) En el canal fiable, un paquete perdido puede tardar 400 ms o más en reenviarse, y con él los eventos de daño recibido, muerte y botín.
(c) Un mensaje grande, como el guardado de 11 KB al unirse o la instantánea completa al reconectar, sale de corrido y retrasa al otro canal.
(d) Si se envía más de lo que deja la ventana de congestión, las instantáneas se encolan en `bufferedAmount` y suman latencia.
- **Arreglo propuesto:** - Tope duro de ~1100 B por mensaje no fiable; si se pasa, partirlo por grupos de entidades con secuencia propia.
- Trocear en la app todo lo que pase de ~16 KB.
- Un tercer canal con `ordered:false, maxPacketLifeTime:~250` para eventos urgentes que admiten redundancia (golpe recibido, lanzamiento remoto), o redundancia más acuse como en las entradas.
- Descartar la instantánea en vez de encolarla si `bufferedAmount` supera ~2 instantáneas.
- Diagnóstico con chrome://webrtc-internals.
- **Fuente:** https://webrtc.googlesource.com/src/+/refs/heads/main/net/dcsctp/public/dcsctp_options.h ; https://developer.mozilla.org/en-US/docs/Web/API/RTCDataChannel (bufferedAmount, bufferedAmountLowThreshold)

## R1-B-1 · Diseño ronda 1 · experto B (ronda1-b.json, problemas[0])

- **Dónde:** §3.3, §3.4 (HIT, registro de entidad con banderas «vulnerable» y «debilitado»), §7 fila «Apoyo»; código combat-math.js:249-259 (weaknessMult/sumWeakness), entities.js:2294 (Enemy.takeDamage aplica Debilidad), entities.js:2196-2205 (outDmgMul)
- **Problema:** En el modelo B quien calcula la fracción del golpe es el atacante. Pero los modificadores del lado del objetivo son numéricos y viven en el anfitrión: la Debilidad es un saco que suma los % de cada apoyo con tope, Vulnerable suma +20 y el debilitamiento saliente (`weakenOutgoing`) es un producto de entradas. El registro de entidad solo trae dos banderas, así que el cliente no conoce el valor. Resultado: un invitado reclama sin la Debilidad que puso el apoyo, el rol de apoyo no rinde con invitados, y la barra predicha diverge de la autoritativa. Al revés pasa lo mismo: la víctima calcula el daño enemigo sin el debilitamiento que le puso un aliado.
- **Arreglo propuesto:** Partir el daño en dos factores:
- **Del atacante (lo calcula el cliente):** HIT viaja como fracción «antes del objetivo».
- **Del objetivo (lo aplica el anfitrión):** `weaknessMult(vuln, Σdebuffs)` y lo demás, con su estado al momento de recibir el golpe.
- **Para predecir:** el registro de élites y jefes, o un mensaje ENEMYMOD cuando cambie, lleva `u8 debilidad%` y `u8 multSaliente%`.
- **ATK** lleva el multiplicador saliente que el anfitrión calculó al iniciar el ataque.
- **Prueba:** un caso en `net-paso2` donde el apoyo debilita, el invitado pega y la vida converge.
- **Fuente:** Código del repo (líneas citadas); Gambetta, «Client-Server Game Architecture» (el estado del objetivo lo resuelve la autoridad): https://www.gabrielgambetta.com/client-server-game-architecture.html

## R1-B-2 · Diseño ronda 1 · experto B (ronda1-b.json, problemas[1])

- **Dónde:** §7 filas «Auras y campos» y «Campos dañinos del héroe»; §3.4 FIELD (15 B: tipo, x, z, radio, ms, dueño, valor); código field-entities.js:383-430 (lureStep, _pickLure, constrainMove), 646-672 (muro/senuelo); skills-maga.js:234, 375-377, 810 (muros con `blocks`); skills-arquera.js:129, 784-787 (`lure`, `contain`); skills-guerrero.js:188, 380 (Desafío con `contain`)
- **Problema:** Hay campos de héroe que no dañan sino que cambian el movimiento de la IA enemiga: los muros de la Maga (`blocks`), los encierros de la Arquera y del Guerrero (`contain`) y los cebos y señuelos de la Arquera (`lure`, que atraen a los enemigos a 5 Hz). En el modelo B solo el anfitrión mueve enemigos. El diseño deja los campos «al dueño contra sus réplicas», pero el dueño no puede mover nada del mundo. Encima, FIELD no puede describir un muro: es una línea con extremos y ancho, no un radio. Tres especializaciones pierden su mecánica de control en grupo.
- **Arreglo propuesto:** Clasificar los campos en dos tipos:
- **Sobre héroes** (auras, `allyDr`): los resuelve el cliente de quien los recibe, como ya dice el diseño.
- **Sobre el mundo** (`blocks`, `contain`, `lure`, `emisor` que dispara): el anfitrión crea un **campo-sombra** y corre `constrainMove` y `lureStep` con él.

Cambios concretos:
- FIELD v2 con forma (círculo o línea: `x1,z1,x2,z2,ancho`), máscara de banderas (bloquea, encierra, atrae) y los parámetros del cebo.
- El daño de esos campos lo sigue reclamando su dueño.
- Pruebas en `net-paso2`: muro de la Maga, cebo y encierro de la Arquera, y Desafío del Guerrero, con 150 ms de latencia.
- **Fuente:** Código del repo (líneas citadas)

## R1-B-3 · Diseño ronda 1 · experto B (ronda1-b.json, problemas[2])

- **Dónde:** §3.4 urgentes (no hay mensaje de desplazamiento; `CC` lleva solo tipo, ms y %); código entities.js:88-96 (perfil pull/knock → `e.displace`), 2249-2280 (`displace` con DISPLACE_DR y conversión a Quebranto en jefes), 2331-2342 (empuje físico en CADA golpe no letal), enemy-abilities.js:252-266 (Vórtice: el enemigo arrastra al héroe)
- **Problema:** Los desplazamientos son una primitiva de rol del Paso 2 (tirones, empujones y arrastres; contra un jefe se convierten en stagger) y el protocolo no los puede expresar. Además, `Enemy.takeDamage` empuja al enemigo entre 0,12 y 0,34 m con cada golpe. Si el invitado lo predice sobre su réplica, la instantánea lo devuelve: tirones visibles en cada golpe. Del lado del héroe pasa lo mismo: el afijo Vórtice tira de ti hacia el enemigo, pero ATK no trae la posición del enemigo, así que la víctima no puede aplicarlo.
- **Arreglo propuesto:** - **Urgente nuevo** `DISP {u16 netId, u16 x, u16 z (origen), u8 dist (dm), u8 hacia/desde}`. Lo aplica el anfitrión con sus rendimientos decrecientes y la conversión a Quebranto en jefes.
- **Empuje por golpe:** lo calcula el anfitrión con el HIT más la última posición reportada del atacante. El cliente no mueve réplicas; solo hace la reacción visual (`lunge`).
- **ATK:** sumarle `u16 x · u16 z` del enemigo al iniciar el ataque. Con eso la víctima resuelve el Vórtice y el alcance.
- **Fuente:** Código del repo (líneas citadas)

## R1-B-4 · Diseño ronda 1 · experto B (ronda1-b.json, problemas[3])

- **Dónde:** §3.5 «Ataques enemigos contra ti» y §3.3 ATK (`u16 preparación`); mockup «Un enemigo te ataca: esquivas o bloqueas con lo que ves»; código entities.js:2931-2952 (el cuerpo a cuerpo es instantáneo: `player.takeDamage` sin preparación) y 2944-2947 (solo `slam` se telegrafía, 0,65 s)
- **Problema:** Hay dos problemas de tiempo:
- **El ataque básico enemigo no tiene preparación.** El ATK llega con preparación 0 y se resuelve al llegar. Como la víctima mide el alcance contra una réplica que va 100 ms + ½RTT atrás, un enemigo que te persigue se ve a 0,5–1 m de su posición real. O los invitados esquivan gratis (el anfitrión recibe más golpes que ellos) o reciben golpes «a distancia».
- **Estado y eventos van en dos líneas de tiempo sin regla.** La animación de preparación llega por la instantánea (atrasada) y el ATK llega al instante, así que el golpe cae antes de que termine la animación. Para un observador, el KILL urgente se ve antes que el golpe interpolado de Ana: el «≈ 190 ms» del mockup supone una regla que el documento no fija.
- **Arreglo propuesto:** Fijar una regla de tiempo por tipo de mensaje, por escrito:
1. **Lo que te afecta a ti** (ATK, PROJ, telegrafiados) se resuelve en tu presente.
   - ATK lleva la posición del enemigo y su `t0`.
   - El alcance se compara contra esa posición, con tolerancia `alcance + v·½RTT`.
   - La animación del atacante la dispara el ATK, no la instantánea.
   - Telegrafiados: tiempo restante = retardo − edad estimada, con un mínimo de reacción de unos 250 ms (a favor del que se defiende).
2. **Lo que solo observas** (CAST, KILL y FX de otros) se programa en la línea de interpolación: tick de origen + retardo de interpolación.
3. **Opcional:** añadir una preparación corta (unos 150 ms) al cuerpo a cuerpo enemigo, que además mejora la lectura en solitario. Decisión de diseño de combate.
- **Fuente:** Gambetta, «Lag Compensation» (ves a los demás en el pasado y a ti en el presente): https://www.gabrielgambetta.com/lag-compensation.html ; Valve, Source Multiplayer Networking (interpolación de 100 ms y compensación): https://developer.valvesoftware.com/wiki/Source_Multiplayer_Networking ; código del repo

## R1-B-5 · Diseño ronda 1 · experto B (ronda1-b.json, problemas[4])

- **Dónde:** §3.4 cabecera del paquete `u` (sin época del mundo); §6 #4 «ids de red por mundo (`g.nextNetId()`)»; §3.2 T2 (reenvío por `r` a los 300 ms); código main.js:444-450 (`loadWorld` vacía los enemigos)
- **Problema:** Los ids de red se reinician en cada mundo, el canal `u` llega desordenado y los urgentes se reenvían por `r` a los 300 ms. Tras un viaje o una vuelta de excursión, siguen llegando HIT, KILL y DOT del mundo anterior que coinciden en `netId` con enemigos del mundo nuevo y se aplican a otro enemigo. Además, nada dice que un ATK que llega tarde por `r` (tras un corte de Wi-Fi de 2 s) deba descartarse: hoy causaría una ráfaga de daño viejo y una muerte injusta.
- **Arreglo propuesto:** - **Época:** `u8 época del mundo` en la cabecera de `u` y en cada mensaje de `r` que dependa del mundo; descartar lo que no coincida.
- **Ids:** no reutilizar `netId` dentro de una época.
- **Caducidad por tipo** según el tick del anfitrión estimado: ATK y PROJ caducan pasada su preparación más un margen; HIT y DOT se aceptan hasta unos 2 s; KILL, SPAWN y GONE nunca caducan.
- **Pruebas en `net-sim`:** viaje con paquetes en vuelo, y corte de 2 s seguido de vuelta.
- **Fuente:** Gaffer, «Reliable Ordered Messages» (ids con ventana y comparación cíclica): https://gafferongames.com/post/reliable_ordered_messages/ ; código del repo

## R1-B-6 · Diseño ronda 1 · experto B (ronda1-b.json, problemas[5])

- **Dónde:** §5.2 (las medidas son solo del anfitrión), §5.3 «Mensajes malformados», §7 «Ganchos ⑫» (AID con redirección); campos `f32` en HIT, DOT, THR, AID y FIELD; guardado con `JSON.stringify`
- **Problema:** La validación vive solo en el anfitrión, pero AID y FIELD los aplica quien los recibe. Un `f32` puede llegar como NaN, ±Infinity o negativo, por un error o a propósito:
- Una cura NaN deja `hp = NaN`. El guardado lo escribe como `null` (JSON) y el héroe queda roto en `localStorage`.
- Una `AID{redirección}` enorme mata al protector, y en una sala Hardcore esa muerte es permanente.
- Una fracción de HIT negativa cura al enemigo.

El «decodificador con comprobación de límites» solo cubre bytes y largos, no valores.
- **Arreglo propuesto:** Validación en cada receptor, en el módulo puro `protocol.js`:
- `Number.isFinite` en todo `f32`.
- Fracciones acotadas a [0, 1].
- Topes por tipo, relativos a los stats del emisor que el receptor ya tiene en su `RemoteHero`. Por ejemplo, la redirección ≤ el daño recibido × el % del Vínculo, por evento y por segundo.
- Ritmo máximo por emisor y por tipo.
- `save()` se niega a escribir un héroe con campos no finitos y conserva el guardado anterior.
- En Hardcore: aviso de confianza al crear la sala.
- Fuzz en `net-protocolo` con NaN, ±Inf y −0.
- **Fuente:** Diseño §5.2, §5.3 y §7; ECMA-262 (`JSON.stringify` serializa NaN e Infinity como `null`): https://tc39.es/ecma262/#sec-serializejsonproperty

## R2-B-1 · Diseño ronda 2 · experto B (ronda2-b.json, problemas[0])

- **Dónde:** §3.3, §3.4 (DEB, CC), §5.4 (ritmos), §7. Código: powers-arquera.js:2537 (Presa Herida: applyWeakness en cada tic con 0,3 s), powers-maga.js:2139 (Hielo Quebradizo, cada tic), powers-common.js:208 (Espinas Venenosas), powers-maga.js:3105 (Sello: m_glosa con 0,7 s), skills-maga.js:476 (estela que ralentiza cada 0,25 s)
- **Problema:** Varios poderes y campos refrescan Debilidad o ralentización en cada fotograma (`onTick`, que con dt variable puede ir de 60 a 144 veces por segundo) o cada 0,25–0,5 s, con duraciones cortas (0,3–0,7 s). En el modelo B cada llamada a una réplica se vuelve un `DEB` o un `CC` urgente: hasta 60–144 mensajes por segundo por enemigo. Eso supera los topes de §5.4 (60 `HIT`/s; `CC` ni figura) y dispara la «alerta y expulsión» contra una Arquera o una Maga que juegan limpio. Además, con 0,3 s de duración, el jitter más el reenvío a 300 ms hacen parpadear la Debilidad en el anfitrión, y Presa Herida es justamente un bufo del grupo («+10 % de todo el grupo»).
- **Arreglo propuesto:** (1) **Arriendos de estado continuo:** el dueño publica en su registro de héroe, a 20 Hz, la lista vigente (netId, idDebuff, %). El anfitrión la mantiene mientras se renueve, hasta 2 intervalos + jitter (unos 150 ms) más allá de la duración nominal. Nada de un urgente por tic. (2) Los campos que ralentizan o debilitan a quien está dentro pasan a efectos del **campo-sombra** (`FIELD` v2 con «ralentiza %» y «debilita %»). (3) Fusión por (netId, tipo, id) dentro de cada paquete: gana el último. (4) Topes de §5.4 sacados del peor caso del banco GRUPO × 2; un exceso se descarta, sin expulsar antes de 10 s. (5) `net-contrato` debe detectar mutadores llamados dentro de `onTick` y de los `tick` de campo.
- **Fuente:** Código leído. Gaffer, State Synchronization (estado frente a eventos): https://gafferongames.com/post/state_synchronization/

## R2-B-2 · Diseño ronda 2 · experto B (ronda2-b.json, problemas[1])

- **Dónde:** §6 #5, §8 (net-contrato) y codigo.md §5 (réplica con «≈12 métodos que mutan»). Código: game-skills.js:410-424 (arrastre del Guerrero en la carrera: `e.pos.x += dx` en cada paso) y :394 (junta a los arrastrados), powers-guerrero.js:2042 y 2293 (`e.vulnT =`), mech-maga.js:118 (`e.numbT =`), powers-maga.js:3148 y field-entities.js:394-433 (empujes de muros)
- **Problema:** El código del héroe escribe directamente en los campos del enemigo, sin pasar por los métodos que la réplica intercepta. En el cliente del invitado esas escrituras cambian solo la réplica local y el anfitrión nunca se entera. Resultado: Vulnerable de Estampida o Guardia Rota sin efecto para el grupo, enemigos arrastrados que vuelven de golpe a su sitio y Aterido de jefe que solo existe en un cliente. La prueba `net-contrato` cuenta lecturas, no escrituras. La carrera con arrastre es un desplazamiento continuo, y `DISP` (un origen y una distancia) no lo expresa.
- **Arreglo propuesto:** En F0 (E3), una prueba de lint al estilo de `test67` que prohíba escribir `hp`, `pos.x/z`, `*T`, `aggroed`, `tauntSrc` o `marks` de un `Enemy` fuera de `entities.js` y del mundo. Convertir esas escrituras en API: `e.applyVuln(dur)`, `e.applyNumb(dur)`, `e.dragWith(heroId, ruta)`. Añadir `DISP{arrastre}` con el camino del héroe (o un campo-sombra «arrastre» ligado a la carrera). Ampliar `net-contrato` a las escrituras y a los métodos llamados desde `powers-*`, `skills-*`, `mech-*` y `field-entities`.
- **Fuente:** Código leído (grep de escrituras directas: 11 sitios en 6 archivos)

## R2-B-3 · Diseño ronda 2 · experto B (ronda2-b.json, problemas[2])

- **Dónde:** §3.5 («predichos: número, reacción y barra»), §3.5.1 (línea de interpolación), §8 (contrato). Código: powers-maga.js:1510 (crítico del Dardo contra ralentizado o congelado), powers-forge-maga.js:101 (+% de Nova contra congelado), powers-guerrero.js:1131, 1138, 1411 y 2162 (crítico y +% contra ralentizado, aturdido o Quebrantado), powers-common.js:130
- **Problema:** Los talentos leen `frozenT`, `slowT`, `stunT`, `rootT` y `staggerBrokenT` de la réplica. El diseño no dice si leen el estado interpolado (que va ½RTT + 100 ms atrás) o el último. Tampoco predice el control que tú aplicas: tu `CC{congelar}` va al anfitrión y la bandera vuelve en la instantánea. Con 150 ms de RTT, el combo «congelo y disparo» pierde el crítico o el +% durante unos 250 ms. Esa es la sensación que §1.1 promete conservar.
- **Arreglo propuesto:** Dos vistas por réplica:
- **render:** interpolada; solo dibuja.
- **juego:** el último dato autoritativo más tus predicciones (control, Vulnerable y debilitamientos que tú aplicaste, con su vencimiento). Cada predicción se borra cuando el anfitrión la confirma o la niega, o a los RTT + 150 ms.

Todos los poderes leen la vista de juego. Prueba en `net-paso2` con 150 ms de RTT: «congelar y Dardo en el mismo segundo da el crítico» y «Quebrantado propio y Quiebrahuesos».
- **Fuente:** Gambetta, Client-Side Prediction and Server Reconciliation: https://www.gabrielgambetta.com/client-side-prediction-server-reconciliation.html

## R2-B-4 · Diseño ronda 2 · experto B (ronda2-b.json, problemas[3])

- **Dónde:** §3.5 («la instantánea pisa la barra cuando llega»), §3.4 (cabecera con ack)
- **Problema:** La instantánea que llega se armó ½RTT antes y no incluye tus `HIT` que siguen en vuelo. Si pisa la barra predicha, la vida sube y vuelve a bajar en cada instantánea mientras pegas (rebote), y la muerte prevista se «resucita» un instante. Es el defecto clásico de aplicar el estado autoritativo sin reconciliar.
- **Arreglo propuesto:** Reconciliar:
- vida mostrada = vida autoritativa de la última instantánea − Σ de tus `HIT` y `TICKS` pendientes que esa instantánea todavía no incluye (los de paquetes con seq > `ack` de su cabecera);
- la barra usa siempre la **última** instantánea, no la interpolada;
- añadir a `net-sim` la propiedad «la barra mostrada nunca sube sin una cura».
- **Fuente:** Gambetta (reconciliación con entradas pendientes): https://www.gabrielgambetta.com/client-side-prediction-server-reconciliation.html. Gaffer (acuses por seq): https://gafferongames.com/post/reliable_ordered_messages/

## R2-B-5 · Diseño ronda 2 · experto B (ronda2-b.json, problemas[4])

- **Dónde:** §3.6, §10 R1 y R13, §11 E0 (R1 solo mide temporizadores en Chrome y Firefox)
- **Problema:** Que la pestaña del anfitrión no corra no es el único riesgo: también puede **dormirse o descartarse**, y eso termina la sesión de los cuatro.
- **Edge**, navegador por defecto de Windows, no exime a las páginas que solo tienen un DataChannel. Su lista de excepciones es: audio en curso, captura de pantalla o de cámara y micrófono, WebUSB y DevTools. Las pestañas dormidas están activadas por defecto (2 h) y el Ahorro de energía las duerme en ≤ 30 min (5 min en el modo Máximo).
- **El Ahorro de memoria de Chrome** tampoco las exime: protege audio o video y llamadas, compartir pantalla, notificaciones, descargas, formularios, pestañas fijadas y dispositivos.
- **Chrome está probando el «Infinite Tabs Freezing»**, en el que solo el audio audible evitaría el congelamiento.

El diseño ni menciona Edge.
- **Arreglo propuesto:** (1) R1 añade Edge y 30–60 min de pestaña oculta con el Ahorro de memoria y el de energía activados. (2) Tomar un Web Lock mientras dure la sesión (`navigator.locks.request` con una promesa que no se resuelve): es una excepción documentada del congelamiento de Chrome. (3) Escuchar `freeze`/`resume` y `document.wasDiscarded`; al volver, reconectar con el `rejoinToken`. (4) En el lobby del anfitrión, un icono con la ayuda «fija la pestaña / añádela a “mantener siempre activos”». (5) Opción de música audible para el anfitrión. (6) Nueva fila R17 en riesgos.
- **Fuente:** Microsoft, funciones de rendimiento de Edge: https://support.microsoft.com/en-gb/topic/learn-about-performance-features-in-microsoft-edge-7b36f363-2119-448a-8de6-375cfd88ab25 · Google, Ahorro de memoria: https://support.google.com/chrome/answer/12929150 · Chrome, Freezing on Energy Saver (Web Lock exento): https://developer.chrome.com/blog/freezing-on-energy-saver · Windows Report sobre Infinite Tabs Freezing [S; la página respondió 403]: https://windowsreport.com/google-tests-infinite-tabs-freezing-in-chrome-to-boost-speed-and-performance-for-heavy-tab-users/
