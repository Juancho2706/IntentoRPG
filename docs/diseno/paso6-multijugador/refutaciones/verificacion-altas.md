# Verificación · 15 objeciones altas · Multijugador (v5.1)

**Fecha:** 22-oct-2026 · **Verifica:** el autor de las objeciones (backend e infraestructura), con una segunda mirada de netcode de acción en tiempo real en navegador.
**Leído íntegro:** `refutaciones/altas-no-vistas.md`, `paso6-multijugador-diseno.md` v5.1 (1.091 líneas) y `refutaciones/trazabilidad-altas.md` (solo para ubicar los cambios: cada veredicto sale del **documento**, no de la trazabilidad).
**Código:** `paso2-impl` (solo lectura: grep y lecturas puntuales). **Carga:** no se corrió ninguna prueba ni proceso pesado.

## Resultado

| Id | Veredicto | En una línea |
|---|---|---|
| INV-B-1 | **DISCREPANCIA ACEPTADA** | B decidido en un solo documento, fases unificadas; `p.cast` fuera de F0 se sostiene porque F3 re-simula un solo héroe |
| INV-B-2 | **DISCREPANCIA ACEPTADA** | Todo lo pedido está; poner el metrónomo antes que H2 se sostiene (H2 exige la `WorldSim` sin DOM de F3) |
| INV-B-3 | **OK** | Comprobado en el código: el pueblo real es la Cripta sembrada; el Refugio y `Math.hypot` entran en F0 #10 |
| INV-B-4 | **OK** | T1–T10 cubren tope por mensaje, troceo, contrapresión y alternativa al tercer canal |
| R1-B-1 | **OK** | Daño en dos factores; el único factor del objetivo en `takeDamage` es el saco de Debilidad |
| R1-B-2 | **INSUFICIENTE** | `FIELD` v2 es estático y hay campos que cambian después de nacer: el Cebo de Caza del Montaraz no llega al anfitrión |
| R1-B-3 | **OK** | `DISP`, empuje por fracción en el anfitrión y `ATK` con posición para el Vórtice |
| R1-B-4 | **OK** | Regla de tiempo por clase de mensaje, `ATK` con posición y edad, D17 aprobada |
| R1-B-5 | **INSUFICIENTE** | La edad de un urgente reenviado por `r` no mide su espera en SCTP: el `ATK` viejo tras un corte de 2 s sigue entrando |
| R1-B-6 | **OK** | §5.4 completo, con el tope por segundo de la redirección |
| R2-B-1 | **OK** | Arriendos `EST`, campo-sombra para frenar y debilitar, topes del banco sin expulsión |
| R2-B-2 | **INSUFICIENTE** | Lint, API y contrato bien; el `invocador` de la v5.1 no cubre al esbirro que aparece para ti después de morir su Nigromante |
| R2-B-3 | **OK** | Dos vistas, los poderes leen la de juego |
| R2-B-4 | **INSUFICIENTE** | La reconciliación solo mira los acuses de `u`; un golpe que pasó a `r` hace rebotar la barra |
| R2-B-5 | **OK** | Edge, Ahorro de memoria, sonido audible, Web Lock, `wasDiscarded`, R17 (verificado en las fuentes) |

**Conteo:** 9 OK · 2 discrepancias aceptadas · 4 insuficientes · 0 discrepancias rechazadas.
**Errores ALTOS nuevos por las correcciones:** ninguno. Hay dos huecos de gravedad media que nacen en correcciones (el reenvío por `r` fuera de la reconciliación y el `invocador` incompleto). Los reporto en su id. Los cuatro arreglos suman menos de 1 d-t, dentro de E6 y E9.

---

## Detalle por objeción

### INV-B-1 · DISCREPANCIA ACEPTADA
**Pedía:** decidirlo en un solo documento (B para la v1), meter `p.cast` en F0 como deuda, costear F3 como «modelo A + sin DOM + predicción» y unificar la tabla de fases.

**Está en el documento:**
- §3.1 y D1 (B aprobada);
- §6, «Lo que NO entra en F0»;
- §9, «Qué no reutiliza F3»;
- §0 #12 y los totales de §11, que ahora coinciden. Sumé las etapas: E1–E5 = 16,5–18,5 d-t y E6–E9 = 35–37 d-t, como dicen los totales.

**La discrepancia se sostiene.** Con B, cada cliente simula solo su héroe. El anfitrión, del héroe remoto, solo reconstruye los stats (§5.2 #1) y corre los campos-sombra; no corre sus lanzamientos. F3 re-simula **un** héroe: la grieta verificada es individual, porque el ladder de grupo es F4 (§9, §11). Mi objeción suponía que F3 corría «la simulación de F1» en un DO. El documento ya no lo dice, y con eso se cae la razón para pagar unos 100 sitios en F0.

**Nota menor (no bloquea):** las cifras no coinciden entre sí.
- Mi grep da 101 usos de `_channel/_charging/_windup/_needsRelease` y 12–13 guardas `player !== p`.
- §3.1 y §6 dicen ~108 y 14; la trazabilidad, 102 y 12.

Conviene unificarlas cuando se estime F4, que sigue sin orden de magnitud (aceptable, porque es opcional).

### INV-B-2 · DISCREPANCIA ACEPTADA
**Pedía:** los puntos (a)–(d), R1 como bloqueante con prototipo en el orden Worker → bombeo por red → pausa, y medir las cuatro formas de anfitrión oculto.

**Está en el documento:**
- §3.6: ventana tapada y pantalla bloqueada; rAF detenido; temporizadores a 1 por segundo con un DataChannel abierto.
- H1 (bombeo por red), H1b (metrónomo), audio, H2 (Worker con los canales transferidos y sin `SharedArrayBuffer`) y H3 (pausa).
- Recuperación de hasta 1 s, solo en el anfitrión (D9).
- §3.6.1: la exención del congelamiento por Ahorro de energía.
- R1 en E0: las cuatro formas, Chrome, Edge y Firefox, un invitado y criterios numéricos (≥ 0,98, ≤ 60 ms, p95 ≤ 20 ms).
- Safari no puede ser anfitrión (§2.1).

**Código:** `main.js:212` usa `setAnimationLoop` (rAF) y `main.js:1545` hace `Math.min(0.05, dt)`. Con la ventana oculta, hoy el mundo corre al 0 %, como dice el documento. Mi «5 %» suponía un temporizador que no existe.

**La discrepancia se sostiene.** H2 exige el mundo sin DOM, que hoy no existe: `main.js` no se importa headless, y esa pieza es la `WorldSim` de F3. El metrónomo cuesta poco, R1 lo mide con criterio numérico y el documento avisa que, si R1 falla, F1 se reestima antes de E6.

**Recomendación barata (no bloquea):** la eficacia de H1b no está documentada en ninguna fuente primaria de Chrome (busqué; solo aparecen pruebas de terceros), y el documento la marca bien como [S]. Sumaría a R1 un pico de medio día que transfiera un `RTCDataChannel` a un Worker y bombee un mundo de juguete en Chrome y en Firefox 144+. Así se sabe si H2 es viable antes de necesitarlo.

### INV-B-3 · OK
**Comprobado en el código:**
- `travelTo('town')` carga la zona de la Cripta (`game-world-flow.js:79`), y el arranque también (`main.js:376, 1539`). Ningún `loadWorld` de `js/` pide `{type:'town'}`, así que `buildTown()` solo lo usan `tests/test.mjs`, `test4`, `test8` y `test9`.
- El campamento usa el stream derivado de la semilla (`zones.js:240`), y su `carve` usa enteros (`world.js:611-613`).
- `buildRefuge` coloca cristales con `ri()`, que es `Math.random` (`world.js:6, 1285-1288`).
- `Math.hypot` decide celdas en `zones.js:217`. Los `**2` de `zones.js:211` son exactos con enteros.

F0 #10 y §3.7 lo cubren: semilla, CRC y bitset, con tamaños correctos (26×26 = 85 B, 46×46 = 265 B, 120×120 = 1.800 B), y test58 con hash.

**Nota:** hoy `loadWorld` solo pasa semilla a la mazmorra y a la zona (`main.js:470`). F0 #10 tiene que agregar el Refugio a `createWorldRng` y a `welcome.world.seed`. Va implícito en `buildRefuge(seed)`; conviene escribirlo.

### INV-B-4 · OK
- T1: paquete `u` ≤ 1.100 B. Cabe: con un MTU de 1.191 B, menos 12 B de la cabecera común y 16 de la de DATA, quedan 1.163 B de carga útil.
- T4: trozos ≤ 1.100 B, a ≤ 25 % de la subida, y el guardado completo solo al anfitrión.
- T5: se descarta la instantánea si `bufferedAmount` pasa de 2.200 B.
- T2: redundancia con acuse en vez de un tercer canal, que es la alternativa que yo mismo ofrecía.
- Lo urgente de mi punto (b) ya no depende de `r`: el daño recibido lo resuelve la víctima, `KILL` viaja por `u` y el botín no viaja.
- `webrtc-internals` en E10, y en `net-protocolo` la prueba de 100 entidades + 32 arriendos ≤ 1.100 B.

Ver la nota 1 de R2-B-1: falta fijar si los arriendos van también en los paquetes inmediatos, y eso cambia el presupuesto.

### R1-B-1 · OK
**Comprobado en el código:**
- En `Enemy.takeDamage`, el único factor del objetivo es `weaknessMult(vuln, Σdebuffs)` (`entities.js:2294`).
- `multiplierProduct` lee estado del objetivo, pero es parte del atacante (`:2300-2305`).
- El escudo del afijo se resuelve en la IA del mundo (`:2476`), y el documento ya lo saca de la muerte prevista.
- `outDmgMul` nunca baja de 0,1 (`:2204`), lo que coincide con el rango [10, 100] de `saliente %` en §5.4.
- El saco tiene tope ×1,5, así que cabe en un `u8`.

**Documento:** `HIT` «antes del objetivo», extensión `MOD`, `ATK`/`PROJ` con el saliente, la Debilidad de la vista de juego en la reconciliación y la prueba en `net-paso2`. Está completo.

### R1-B-2 · INSUFICIENTE
**Lo que está bien:** el campo-sombra; `FIELD` v2 con línea o círculo, máscara, parámetros del cebo y armado; «ya pelea contigo» medido contra el dueño; las pruebas de muro, cebo, encierro y Desafío.

**El hueco:** `FIELD` v2 viaja «al crearse y al terminar» (§3.3, fila de campos), y el anfitrión mantiene la sombra «mientras le quede duración» (§3.5.1). Pero en el código hay campos que **cambian lo que le hacen al mundo después de nacer**:
- `powers-arquera.js:2446-2459`, **Cebo de Caza** (m0, la pasiva innata del Montaraz): en `onTick` agrega `data.lure` a todas tus trampas ya puestas y llama a `_recountMoveFields`. El `FIELD` de creación sale sin «atrae», así que el cebo del Montaraz **no existe en el anfitrión**.
- `powers-arquera.js:2784-2787`, **Gran Cacería**: mueve tus trampas (que ya atraen) alrededor de la Presa.
- `powers-arquera.js:2549`, **Zarzal Creciente**: el Cerco crece 1 m/s hasta 12 m. Con la forja **Jaula de Espinas** (`contain`, `skills-arquera.js:468, 784`) es un encierro que crece.
- `powers-arquera.js:1424`, **Zarzas Trepadoras**: alarga `f.t` del Cerco ya activo, así que la sombra vence antes que el campo.
- `powers-guerrero.js:785-794`: Tierra Bendita cambia el radio y la duración de zonas ya puestas, y **Senda Ardiente** agrega `slow` a un `g_sendero` ya puesto (toca también R2-B-1).

Es justo la falla que señalaba la objeción, una especialización que pierde su control en grupo, y en el caso más común del Montaraz.

**Arreglo:**
1. **Un `FIELD` con un `id` vivo es una actualización:** reemplaza la posición, la forma (radio o ancho), los efectos, sus parámetros y el tiempo restante. El dueño lo reemite como urgente, con la redundancia de T2, cuando cambia algo de lo que toca al mundo. Para no perseguir cada poder: al final de cada fotograma, en cada campo de héroe con `movesEnemies(f)` o con «ralentiza» o «debilita» (`field-entities.js:268` ya cuenta los de movimiento), se compara un hash de (posición, radio o ancho, máscara, parámetros, `t`) con el último enviado. Si cambió, sale otro `FIELD`, como mucho 4 por segundo por campo; así entran también los que siguen a un punto, como la Gran Cacería.
2. La sombra vive hasta `FIELDX` o hasta su `ms` + 1 s, lo que llegue antes, y el `ms` de cada actualización pisa al anterior.
3. En el cliente del invitado, `constrainMove`, `lureStep` y el arrastre **no corren sobre réplicas**: solo la sombra del anfitrión mueve enemigos. El lint de F0 #12 permite escribir desde `field-entities.js`, así que esto debe ser una regla escrita con su prueba.
4. En `net-contrato`, toda escritura en `f.radius`, `f.width`, `f.pos`, `f.t`, `f.dur` o en `f.data.(lure|contain|blocks|slow|slowPct)` de un campo de héroe hecha fuera de `field-entities.js` debe caer en el hash del punto 1, o pasar por `g.fieldChanged(f)`.
5. En `net-paso2`, con 150 ms: Cebo de Caza sobre una trampa recién puesta; Gran Cacería; Jaula de Espinas + Zarzal Creciente + Zarzas Trepadoras; Senda Ardiente.

**Costo:** menos de 0,5 d-t, dentro de E9.

### R1-B-3 · OK
**Comprobado en el código:**
- El empuje por golpe sale de `pct = amount/maxHP` (`entities.js:2321, 2338`), así que es función de la fracción y el anfitrión lo calcula bien desde el `HIT`.
- `displace` aplica sus rendimientos decrecientes y, en jefes, la conversión a Quebranto (`:2249-2280`).
- El Vórtice es un **tirón único** hacia el enemigo (`enemy-abilities.js:250-264`): un `ATK{vórtice}` con la posición alcanza.

**Documento:** `DISP` con sus topes en §5.4, «tu cliente no mueve la réplica», la bandera de salto y la simplificación del origen del empuje, aceptable.

### R1-B-4 · OK
**Documento:**
- §3.5.1: tres clases de mensaje.
- `ATK` con posición, preparación y edad; la animación la dispara el `ATK`, y el atacante «vive en tu presente» mientras dura la preparación.
- Telegrafiados con un mínimo de 250 ms.
- Lo que observas, en una sola línea de interpolación.
- D17 aprobada, con su parte adaptativa. Revisé las cuentas: con 250 ms de RTT la víctima ve ≈ 109 ms de preparación, y con 300 ms, ≈ 84 ms.

**Nota:** la tolerancia es alcance + 1 m (D17) + mín(1 m, v·½RTT), así que puede llegar a +2 m. Es a favor del atacante y coherente con «caminar no esquiva», pero conviene medirla en E10.

### R1-B-5 · INSUFICIENTE
**Lo que está bien:** la época en `u` y el `ep` en `r`; `netId` sin reutilizar; caducidad por tipo; lápidas para los pares inicio/fin; las pruebas.

**El hueco:** la edad de un urgente se mide «respecto del `tick` de esta cabecera» (§3.4). En `u` eso funciona, porque `u` no retransmite. Pero el reenvío por `r` lleva «su época y su edad» (§3.2 T2), sin ningún sello de tiempo, y `r` es fiable: el mensaje puede quedar en la cola de SCTP mientras dura el corte y salir con el siguiente RTO (mínimo 400 ms, con retroceso hasta 3 s en Chrome, §3.2 T5; RFC 9260 §6.3.3).

Es el caso exacto de la objeción:
1. Hay un corte de Wi-Fi de 2 s.
2. A los 300 ms el anfitrión pasa el `ATK` a `r` con una edad de ≈ 300 ms.
3. El mensaje llega a los ~2,5–3 s con esa misma edad.
4. El receptor calcula «restante = preparación − 300 ms» y «caduca a preparación + 300 ms», así que lo aplica: un golpe viejo y sin aviso. En Hardcore, la muerte es permanente.

Además, el documento no dice que un urgente descartado por caducidad entre en la ventana de duplicados. Si no entra, la copia tardía que llega por `r` se aplica aunque la de `u` se haya descartado.

**Arreglo:**
1. Todo urgente que viaja por `r` lleva `t0`, el **tiempo del anfitrión en que nació** (`u32`, en ms; si lo origina un invitado, su estimación). El receptor calcula `edad = ahoraDelAnfitrión(estimado) − t0`. En `u` puede quedar la edad relativa, que es equivalente.
2. Los urgentes que caducan en 1 s o menos (`ATK`, `PROJ`, `PROJX`, `CC`, `DISP`, `CAST`, `AID{redirección}`) **nunca se reenvían por `r`**: se repiten por `u` hasta su acuse o hasta caducar, y el emisor deja de repetirlos cuando caducan. Por `r` solo van los de caducidad larga o sin caducidad: `HIT`, `HITS`, `TICKS`, `THR`, `KILL`, `SPAWN`, `GONE`, `FIELD`, `FIELDX` y `AID` de cura, escudo o guarda.
3. Un urgente descartado por caducidad **sí** entra en la ventana de duplicados.
4. En `net-sim`: un corte de 2 s en el que `LoopbackNet` retiene `r` y lo entrega de golpe al volver, como SCTP, con un `ATK`, un `CC` y un `HIT` en vuelo. Resultado esperado: ningún daño ni control viejo, y el `HIT` se cuenta una vez.

**Costo:** casi nulo: un campo y una regla en `protocol.js`.

### R1-B-6 · OK
§5.4 está completo:
- números finitos (−0 → 0);
- rangos: fracciones en (0, 1], saliente en [10, 100], `DISP` ≤ 6 m y duraciones con tope;
- topes relativos a los stats publicados que trae el perfil (T4);
- redirección acotada por evento y, desde la v5.1, también por segundo;
- ritmos sacados del banco;
- `save()` que se niega a escribir valores no finitos (F0 #11);
- aviso en las salas HC;
- fuzz con una ráfaga de redirecciones.

**Nota:** cuando el protector descarta una redirección que excede el tope, la víctima ya se había quitado ese 30 % en local, así que ese daño desaparece. Está acotado y no daña a nadie, pero conviene anotarlo como aceptado en §7 (fila de los ganchos ⑫).

### R2-B-1 · OK
**Documento:**
- arriendos `EST` mantenidos hasta el tiempo restante + 150 ms, y `DEB` eliminado;
- los campos que frenan o debilitan pasan al campo-sombra;
- agregación correcta dentro de un paquete: `HIT` y `TICKS` se suman y solo lo idempotente usa «gana el último»;
- topes del banco GRUPO × 2, sin expulsar a nadie;
- `net-contrato` detecta los mutadores dentro de `onTick`.

**Código:** los cinco sitios citados llaman a `applyWeakness` o ralentizan, sin nada discreto por tic (`powers-arquera.js:2537`, `powers-maga.js:2139`, `powers-common.js:208`, `powers-maga.js:3105`, `skills-maga.js:476`). El único control discreto dentro de un `onTick` que encontré, la raíz de Zarzal Creciente, se aplica una sola vez por enemigo, con un `WeakSet` (`powers-arquera.js:2550-2556`).

**Notas de coherencia (no bloquean):**
1. T3 dice que los paquetes inmediatos llevan «solo cabecera y urgentes», pero §3.4 pone los arriendos «en todo paquete», y §3.9 los cuenta a 20 Hz. Hay que fijar que los arriendos van **solo** en los paquetes de estado del invitado (20 Hz). Si fueran en todos: 32 × 6 B × 60/s = 11,5 KB/s más.
2. Senda Ardiente agrega `slow` a un campo ya puesto; lo cubre el arreglo 1 de R1-B-2.

### R2-B-2 · INSUFICIENTE
**Lo que está bien:** el grep del documento coincide exactamente con el mío.
- **Del héroe (7 sitios):** `game-skills.js:394, 422`; `powers-guerrero.js:2019, 2042, 2293`; `mech-maga.js:118`; `powers-maga.js:3148`.
- **Del mundo:** `main.js:1003-1010, 1019, 1196-1199` y `game-world-flow.js:140-142`.

También están la API, el lint con el patrón amplio, la sombra «arrastra» y el contrato de escrituras y mutadores.

**La discrepancia sobre `marks` se acepta:**
- solo la lee código del dueño, que filtra por `m.by` (`entities.js:113-136`, `game-skills.js:2081-2140`);
- el mundo solo la descuenta en `tickStun` (`entities.js:2241`);
- la interfaz la dibuja (`hud-model.js:170`).

**El hueco (nace en la corrección v5.1):** `SPAWN` con `invocador` arregla las réplicas que ya existen cuando llega el `KILL` del Nigromante. No arregla las que **aparecen después** para ese cliente, porque `SPAWN` se manda por área de interés (§3.3, pool de §3.5).
- Si un esbirro alzado entra en tu área cuando su Nigromante ya murió, tu cliente arma la réplica con vida y daño completos. En el anfitrión, `main.js:1194-1199` los dejó en 50 % de vida y 60 % de daño.
- Consecuencia: tu vida de vista es el doble, así que tus `HIT` valen la mitad de fracción. Y el daño que recibes de ese esbirro, que tu cliente calcula con el daño de tu réplica (§2.5), sale ×1,67.
- Pasa también en la unión tardía si el Nigromante murió fuera de tu vista, porque la bienvenida solo trae a los vivos.

En ese caso sigue siendo falsa la afirmación de §2.4 de que la vida máxima de vista es «una función pura».

**Arreglo:** `SPAWN` lleva un `u8 mods` con lo que el mundo le aplicó **después de nacer**.
- Bit 0: «invocador caído» → ×0,5 vida máxima y ×0,6 daño, la misma regla de `main.js:1196-1199`.
- Los demás bits quedan libres para el futuro.
- El anfitrión lo llena al emitir `SPAWN`, también en la bienvenida y al responder un `need`.
- `SPAWN` pasa a 14 B: con 60 enemigos, la bienvenida queda en ≈ 860 B.
- Prueba en `net-paso2`: el Nigromante muere con un esbirro fuera del área del invitado, el esbirro entra después y su vida máxima de vista es igual a la del anfitrión.

(El pacto no tiene este problema: `applyPact` aplica a los presentes la misma fórmula que `buffByPact` al nacer (`game-world-flow.js:139-142` frente a `main.js:1008-1010`). Una réplica que nace tarde con el pacto vigente da la misma vida.)

### R2-B-3 · OK
**Documento:** dos vistas por réplica; los poderes leen la de juego; tus predicciones vencen a los RTT + 150 ms; pruebas del Dardo tras congelar y de Quiebrahuesos.

**Nota:** la confirmación de una predicción usa los mismos acuses que R2-B-4. Con el arreglo 2 de R1-B-5 (`CC` y `DISP` nunca van por `r`) no queda el caso de una predicción que vence antes de que el anfitrión la aplique.

### R2-B-4 · INSUFICIENTE
**Lo que está bien:** la fórmula de reconciliación, el uso de la última instantánea, la propiedad «nunca sube sin una cura» en `net-sim` y las dos reversiones.

**El hueco:** «pendientes = los de paquetes con `seq` posterior al `ack` (más `ackBits`)» solo ve el canal `u`. Pero T2 pasa a `r` todo urgente sin acuse en `máx(300 ms, SRTT + 4·RTTVAR + 50 ms)`, y el anfitrión lo aplica al llegar por `r` sin que ningún `ack` de `u` lo refleje. Las dos salidas posibles son malas:
- Si el `HIT` sigue «pendiente», se resta dos veces cuando la instantánea ya lo incluye, y la barra **sube** cuando por fin se acusa (o el golpe nunca sale de pendientes).
- Si se saca de pendientes al pasar a `r`, la barra sube hasta que el anfitrión lo aplica.

Con 5 % de pérdida (la condición de `net-sim`) y las ráfagas típicas del Wi-Fi, pasa varias veces por hora, y la propiedad «nunca sube sin una cura» falla. Además, la reversión (a) de la muerte prevista vence a los RTT + 300 ms, antes de que llegue el `KILL` de un golpe letal que fue por `r`: la réplica vuelve y luego muere otra vez.

**Arreglo:**
1. La cabecera de `u` del anfitrión lleva `u16 rHechos`: cuántos mensajes de `r` de ese par aplicó al armar esa instantánea (cíclico; como `r` es ordenado, un contador alcanza). Cada urgente reenviado por `r` guarda su número de orden en `r`.
2. Un `HIT`, `HITS` o `TICKS` deja de estar pendiente cuando lo cubre un `ack` de `u` **o** `rHechos`, nunca antes. La barra es la última instantánea menos los pendientes según esa misma cabecera.
3. Cuando un urgente pasa a `r`, deja de repetirse por `u`: un solo camino de confirmación por urgente.
4. La reversión (a) cuenta los RTT + 300 ms **desde que el golpe letal quedó confirmado** (por `ack` o por `rHechos`), no desde que salió.
5. En `net-sim`: pérdida en ráfagas que obligue a mandar por `r` un `HIT` letal. Resultado esperado: la barra no sube y la muerte prevista no se revierte.

**Costo:** 2 B por instantánea y unas líneas en `replica.js` y `protocol.js`.

### R2-B-5 · OK
**Documento:** §3.6.1, R17, E0, la ayuda del lobby en §2.9 y la pregunta §14 #11 (aprobada).

**Fuentes que revisé:**
- El **Ahorro de memoria** de Chrome no desactiva pestañas con audio o video activos, pestañas fijadas ni sitios de la lista «Mantener siempre activos», y no menciona WebRTC (Google).
- Las **pestañas dormidas** de Edge eximen el audio en reproducción, la captura de pantalla o de cámara y micrófono y la lista, pero **no** las pestañas fijadas. Los tiempos son 2 h, ≤ 30 min con el Ahorro de energía equilibrado y 5 min en el modo máximo (Microsoft).

El documento lo dice igual: «las pestañas fijadas eximen en Chrome; la lista, en los dos».

**Nota menor:** el Web Lock con el nombre fijo `'sala'` es por origen. En `?net=local`, con dos ventanas del mismo origen, la segunda queda esperando el bloqueo y sin exención. Conviene usar `'sala-' + crypto.randomUUID()`.

---

## ¿Las correcciones rompen otra parte del diseño? (mirada de netcode)
1. **El reenvío por `r` quedó fuera del reloj y de los acuses.** Es la raíz común de R1-B-5 y R2-B-4. Lo cierran tres piezas: `t0` absoluto en `r`, los urgentes cortos nunca por `r` y `rHechos` en la cabecera. No hace falta un tercer canal.
2. **`FIELD` estático.** El hueco de R1-B-2 alcanza también a la sombra que frena o debilita (R2-B-1). El campo «arrastra» de la carrera (R2-B-2) fija su ruta al lanzarse, así que no lo afecta.
3. **`invocador` incompleto** (R2-B-2). Es un desajuste de vida y daño acotado al afijo del Nigromante.
4. **Arriendos en los paquetes inmediatos:** hay una contradicción entre T3 y §3.4 (nota 1 de R2-B-1). Fijarlo evita 11,5 KB/s que §3.9 no cuenta.
5. **Ninguna corrección introduce un error ALTO nuevo.** Revisé que los arreglos no rompan:
   - la línea única de interpolación;
   - la pausa: `t0` está en tiempo del anfitrión, que se detiene en la pausa, así que nada envejece pausado;
   - el salto de recuperación de hasta 1 s, en el que un `ATK` nacido durante el salto caduca a favor del que defiende;
   - el presupuesto de 1.100 B.
6. **Totales de §11:** la frase «las correcciones de las 15 altas no suman días» deja de ser exacta con estos cuatro arreglos, pero suman menos de 1 d-t, repartido en E6 y E9.

## Fuentes
- Google, Ahorro de memoria (excepciones: audio o video, pestañas fijadas, «Mantener siempre activos»; sin WebRTC): https://support.google.com/chrome/answer/12929150
- Microsoft, funciones de rendimiento de Edge (pestañas dormidas: audio, captura y lista; sin pestañas fijadas; 2 h / 30 min / 5 min): https://support.microsoft.com/en-gb/topic/learn-about-performance-features-in-microsoft-edge-7b36f363-2119-448a-8de6-375cfd88ab25
- RFC 9260 §6.3.3, temporizador de retransmisión y retroceso exponencial (por qué un mensaje de `r` puede salir segundos tarde): https://www.rfc-editor.org/rfc/rfc9260.html#section-6.3.3
- Gambetta, reconciliación con entradas pendientes: https://www.gabrielgambetta.com/client-side-prediction-server-reconciliation.html
- Gaffer On Games, *Reliable Ordered Messages* (acuses por secuencia; un solo camino de confirmación): https://gafferongames.com/post/reliable_ordered_messages/
- Temporizadores en un Worker con la pestaña oculta: no encontré fuente primaria de Chrome (búsqueda del 22-oct-2026); se mide en R1, como dice el documento.
- Código leído: `js/main.js:212, 376, 422-475, 1188-1202, 1544-1575`; `js/world.js:6, 600-640, 950-970, 1250-1294`; `js/zones.js:28-41, 205-249`; `js/game-world-flow.js:79-142`; `js/entities.js:1670-1719, 2186-2355, 2466-2486`; `js/enemy-abilities.js:246-264`; `js/powers-arquera.js:2436-2462, 2528-2560, 2772-2792, 730-742, 1403-1426`; `js/powers-guerrero.js:782-794, 3138-3168`; `js/powers-maga.js:2130-2145, 3098-3112`; `js/powers-common.js:200-215`; `js/skills-maga.js:468-482`; `js/skills-arquera.js:450-470`; grep de escrituras directas sobre `Enemy`, de `marks`, `prey`, `fieldDur`, de las guardas `player !== p` y del estado de lanzamiento.
