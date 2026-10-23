# Objeciones media/baja y faltantes que el corrector no vio (175)

Id = ronda-experto-(P problema | F faltante)número. Texto íntegro salvo la fuente (está en `*.json`).

### INV-A-P11 · media
- Dónde: codigo.md §5 `js/net/session.js` (saludo con `VERSION` de `sw.js`) y §8 «Código distinto»; tecnologia.md no versiona el protocolo de la F3
- Problema: `VERSION` de `sw.js` sube con cada cambio de assets (CLAUDE.md, regla 2), incluso por CSS o arte. Usarla para el saludo expulsa a los amigos por cambios cosméticos. Al revés, el service worker puede dejar a un cliente días en una versión vieja. Frente a un DO, nada impide que un cliente desactualizado juegue el ladder.
- Arreglo propuesto: Usar en el saludo `NET_PROTOCOL` más un hash de los catálogos y de los módulos de simulación. Crear un flujo de actualización forzada en el lobby (`registration.update()`, `skipWaiting` y recarga). En la F3, fijar la versión de la simulación por temporada y rechazar a quien no coincida.

### INV-A-P12 · media
- Dónde: tecnologia.md §2.3 (30 Hz fijo) frente a codigo.md 0.1 (`DT = 1/60`); tools/smoke/baseline.json usa 1/60
- Problema: Los informes no coinciden en el paso fijo. A 30 Hz, la ventana de carga perfecta (0,20–0,30 s; skills-arquera.js:93,116 y skills-guerrero.js:146,159) queda en saltos de 33 ms, entre el 11 y el 16 % de la ventana. Los costos del DO están calculados con un número de ticks distinto al que usaría el cliente.
- Arreglo propuesto: Usar 60 Hz en todas partes: cuesta unos 0,07 ms por tick según la línea base, y el humo ya lo mide así. Enviar las instantáneas a 20 Hz. Recalcular la CPU del DO (×2) y la duración, que no cambia.

### INV-A-P13 · media
- Dónde: tecnologia.md §2.3 y §3; codigo.md §5 (`st` con `{ordered:false, maxRetransmits:0}`)
- Problema: `maxRetransmits:0` no vacía la cola del emisor. Con congestión, `bufferedAmount` crece y las instantáneas viejas salen tarde aunque no se retransmitan. Ninguno de los informes controla esa cola. Además, una instantánea más grande que la carga útil de un paquete (unos 1,2 KB, criterio de ingeniería sin fuente) se fragmenta, y en modo no fiable basta perder un fragmento para perder el mensaje entero. La instantánea completa de unión y las de referencia para el delta superan con facilidad ese tamaño.
- Arreglo propuesto: Antes de cada envío, si `bufferedAmount` supera un umbral, no encolar y mandar solo la última instantánea. Evaluar `maxPacketLifeTime` de unos 100 ms en lugar de `maxRetransmits:0`, porque limita el tiempo en que el navegador puede seguir intentando enviar. Mantener cada instantánea en 1 KB o menos, partiéndola por área de interés. La completa (unión o reconexión) va por el canal fiable.

### INV-A-P14 · media
- Dónde: tecnologia.md §9 («dos tarjetas» con `rev`) frente a codigo.md §9 («el más reciente gana»)
- Problema: Las reglas de conflicto se contradicen. Con «el más reciente gana», un PC viejo que autoguarda al abrir pisa horas de progreso, porque depende del reloj de cada dispositivo.
- Arreglo propuesto: Quedarse con el `rev` optimista de Tecnología. Que el `rev` lo incremente un trigger en el servidor, no el cliente; que la actualización compare `rev` y verifique que afectó una fila. Nunca resolver por fecha del dispositivo. Mantener la copia `.bak-nube`.

### INV-A-P15 · baja
- Dónde: tecnologia.md §3 («Solo un suscriptor puede responder al publicador, así que como relé de 4 jugadores es incómodo»)
- Problema: La razón para descartar la SFU de Cloudflare es débil. `canReply` limita las respuestas a un suscriptor por cada canal publicado, pero el patrón natural es que cada jugador publique su propio canal: el anfitrión publica instantáneas y cada invitado publica sus entradas. Así no hace falta `canReply`, se esquiva el NAT al 100 % y comparte los mismos 1.000 GB gratis.
- Arreglo propuesto: Dejarla documentada como plan B prototipable para cuando el NAT falle mucho. Requiere un Worker con el secreto de la app para crear las sesiones.

### INV-A-P16 · baja
- Dónde: tecnologia.md §0.7, §4.2, §4.3 y §12 («PoE pasa a lockstep a partir de ~150 ms») frente a codigo.md §2 («pasa a predictivo a partir de ≈ 150 ms»)
- Problema: Las dos afirmaciones son opuestas. La guía conocida de GGG es lockstep con ping bajo y predictivo con ping alto, que coincide con Código. Tecnología usa la cifra invertida para concluir que entre 92 y 136 ms el juego es cómodo. Además, la cita de Last Epoch («hasta 200 de ping») es de un blog de 2021, anterior al lanzamiento.
- Arreglo propuesto: Corregir el texto de Tecnología y no apoyar la jugabilidad del DO en esa cifra. Sostenerla con la predicción propia y con la prueba de F1 (latencia simulada de 150 ms).

### INV-A-P17 · baja
- Dónde: tecnologia.md §6 (Oracle como plan B en Santiago)
- Problema: Faltan tres condiciones: los recursos Always Free solo existen en la región de origen («You must create the Always Free compute instances in your home region»), así que hay que elegir Santiago al crear la cuenta; los errores de «out of host capacity» son habituales; y un servidor de juego ocioso casi toda la semana cumple los tres criterios de recuperación (p95 de CPU, red y memoria por debajo del 20 %).
- Arreglo propuesto: Elegir sa-santiago-1 como región de origen en el alta. Contar con que Oracle recupere la instancia (o pasar la cuenta a Pay as You Go sin salir de Always Free, [sin verificar] si eso la evita). Mantenerlo como plan B, no como dependencia.

### INV-A-P18 · baja
- Dónde: tecnologia.md §6 (Vercel, `api/turn`) y §6.1
- Problema: Las funciones de Vercel corren por defecto en `iad1` (Washington), así que cada pedido de credenciales desde Chile suma ~136 ms más el arranque en frío. Las cuotas diarias de Cloudflare se reinician a las 00:00 UTC, que en Chile son las 21:00 en horario de verano: en plena hora punta.
- Arreglo propuesto: Configurar la región `gru1` para `api/turn`. Poner alertas de cuota y no depender del plan gratis para salas con tick.

### INV-A-P19 · baja
- Dónde: tecnologia.md R9 y §9; codigo.md §2
- Problema: R9 queda confirmado: GitHub desactiva los workflows programados de un repo público tras 60 días sin actividad, así que un cron para mantener vivo Supabase no es confiable. Además, `combatRng` sin asignar no solo afecta a `powers-maga.js:258` (lo que vio Código): `mech-guerrero.js:231` también usa 0,5 por defecto, y el Fervor por probabilidad sale siempre o nunca según la cifra.
- Arreglo propuesto: No depender del cron: aceptar la pausa y mostrar «nube no disponible» con el juego local intacto, o pasar a Pro al tener comunidad. Incluir `mech-guerrero.js:231` en el arreglo 0.5 de Código (sembrar `combatRng`).

### INV-A-P20 · baja
- Dónde: tecnologia.md §1 (286 referencias; main 49, game-skills 44; ~217 trascendentes) frente a codigo.md §3.2 y §2 (main 53, game-skills 43; ≈206)
- Problema: Los conteos no coinciden entre informes y no se pueden reproducir. Mi `grep -oE "(this|g|game)\.player\b"` da main 56, ui 49, economy 45, game-skills 48, input 14. Las llamadas trascendentes son 333 en todo `js/`. No cambia ninguna conclusión, pero el plan va a usar estas cifras para estimar el trabajo.
- Arreglo propuesto: Fijar en el diseño un solo comando de medición por métrica y su resultado, con la rama y el commit.

### INV-A-F1 · faltante
- Control de la sala: aprobar a quien entra con el código, expulsar, bloquear y limitar el tamaño y la frecuencia de los mensajes por cada par. Un par malicioso puede inundar al anfitrión con mensajes de 256 KB.

### INV-A-F2 · faltante
- Interruptor remoto y versión mínima: un JSON (en Vercel o en una fila de Supabase) que se lee al abrir el lobby, para apagar el multijugador o el ladder ante una vulnerabilidad sin depender de que el service worker se actualice.

### INV-A-F3 · faltante
- Reglas de intercambio: solo entre héroes abiertos y nunca con héroes de temporada. Prever la duplicación de objetos por rollback del guardado local (dar un objeto y recargar sin guardar).

### INV-A-F4 · faltante
- Ladder con build fija (opción B): choca con el roadmap del dueño (ítems → calibración → multijugador y ladder), porque deja los ítems fuera del ladder. Es una decisión del dueño y hay que plantearla así.

### INV-A-F5 · faltante
- Privacidad: aviso de privacidad, borrado de cuenta (una Edge Function con la clave secreta) y retención de registros e IP (TURN, métricas). Revisar la Ley 21.719 de Chile, cuya vigencia sería el 1-dic-2026 [sin verificar por el límite de búsquedas].

### INV-A-F6 · faltante
- Respaldo de la nube: en el plan gratis hay que asumir que no hay copias automáticas útiles [sin verificar]. Programar un `pg_dump` periódico de `heroes`/`stash` y documentar cómo restaurarlo.

### INV-A-F7 · faltante
- Observabilidad mínima por sesión, muestreada: tipo de candidato ICE (host, srflx o relay), RTT, pérdida, correcciones de predicción, motivo de desconexión y versión. Sin esto no se puede comprobar el criterio de salida de F1 (menos del 1 % de correcciones).

### INV-A-F8 · faltante
- Matriz de navegadores con pruebas manuales en Chrome/Edge, Firefox y Safari de macOS: canal no fiable, TURN por TLS en el 443, pestaña oculta 10 min con DataChannel abierto, con música y sin música.

### INV-A-F9 · faltante
- Experiencia con la nube caída (proyecto pausado o cuota agotada): mensajes claros en el lobby, juego en solitario y guardado local intactos, y co-op con la señalización de respaldo.

### INV-A-F10 · faltante
- Límites de Supabase Realtime que nadie contó: Presence admite 20 mensajes/s en el plan gratis (importa si el lobby usa Presence) y el 30-oct-2026 cambian los GRANT. Las migraciones SQL del repo tienen que incluir los GRANT y las políticas RLS de `realtime.messages`, y desactivar «Allow public access» si se usan canales privados (eso rompe la estrategia de Supabase de Trystero, que usa canales públicos).

### INV-A-F11 · faltante
- Si el anfitrión corre la simulación en un Worker y usa SharedArrayBuffer, hace falta COOP/COEP. Con el importmap apuntando a jsdelivr hay que verificar que CORS/CORP lo permite, o usar `postMessage` con transferibles.

### INV-A-F12 · faltante
- Despliegue del servidor de la F3: wrangler empaqueta con esbuild. Hay que documentar que la regla «sin build step» vale solo para el cliente y que la simulación compartida debe importarse igual desde el navegador, Node y workerd (rutas relativas, sin `window`).

### INV-B-P5 · media
- Dónde: tecnologia.md §0.7 («PoE pasa a lockstep a partir de ~150 ms») y tabla §4.2; codigo.md §2 («pasa a predictivo a partir de ≈150 ms»)
- Problema: Los informes dicen lo contrario sobre el modo Auto de PoE, y los dos citan un resumen de poewiki que nadie pudo leer (tiene protección anti-bots). El lockstep de PoE, que espera la confirmación del servidor, es el modo pensado para latencia baja. Si es así, el argumento de §0.7 está invertido. Además, «PoE2 solo tiene lockstep» lo afirma un jugador en el hilo 3887145, sin respuesta de GGG, y otros dicen que hay un ajuste predictivo en el config. No sirve como prueba.
- Arreglo propuesto: Corregir §0.7 y §4.2 y marcarlos [sin verificar] hasta tener la nota oficial de GGG. Apoyar la jugabilidad a 92–136 ms en Last Epoch («up to 200 ping») y en el prototipo, no en PoE ni en PoE2.

### INV-B-P6 · media
- Dónde: tecnologia.md §8 («Salas DO (F3): el estado vive en el servidor… la sala reenvía un snapshot completo») y §7.3 B
- Problema: Los Durable Objects se reinician con cada despliegue, con las actualizaciones del runtime de Cloudflare y por decisiones de ubicación. Al reiniciarse se cortan los WebSocket, vuelve a correr el constructor y se pierde la memoria. Una grieta autoritativa de 10 minutos en curso se pierde; no hay instantánea que reenviar. Además, si pasan más de 30 s de CPU entre mensajes entrantes, aumenta el riesgo de desalojo.
- Arreglo propuesto: - Guardar un checkpoint en la SQLite del DO cada N segundos, o semilla + tick + entradas para volver a simular.
- Regla del ladder: un intento cortado por mantenimiento no consume intento.
- No desplegar durante el cierre de una temporada.
- Medir en el prototipo R2 el límite de CPU del plan gratis: la doc dice que los DO siguen el límite por invocación del plan de Workers, que en el gratis es de 10 ms.

### INV-B-P7 · media
- Dónde: tecnologia.md §7.3 opción B y §12 («en solitario la latencia pesa menos»)
- Problema: La grieta de desafío autoritativa corre en un DO que, desde Chile, nace en el este de Norteamérica (Cloudflare lo confirma para la pista `sam`). El jugador iría solo, en el modo más competitivo, con 92–136 ms de retardo en cada habilidad. Nadie costeó predecir las habilidades, y las ventanas de carga perfecta son de 0,20–0,30 s. Es una sensación peor que la del juego normal, justo en el ladder.
- Arreglo propuesto: Evaluar una verificación en sombra:
- El cliente juega en local con 0 ms y envía las entradas en vivo al DO.
- El DO corre la misma simulación con matemática determinista y su resultado es el oficial; si diverge, el intento se anula.
- Exige determinismo solo en la simulación del ladder (ver el problema de detmath).
Si no, medir el retardo en un prototipo antes de comprometer la opción B.

### INV-B-P8 · media
- Dónde: tecnologia.md §2.3 (30 Hz) frente a codigo.md 0.1 (1/60, «riesgo bajo»)
- Problema: Los informes fijan pasos distintos.
- A 30 Hz, las ventanas de carga perfecta se cuantizan a 33 ms (±15 %), cambia la sensación y el banco deja de ser comparable (el humo mide con dt de 1/60).
- Con cualquier paso fijo, un monitor de 144 Hz tiene tirones si el render no interpola. Interpolar no es trivial: la posición ES la malla (`get pos() { return this.group.position; }` en entities.js:744, 1906 y 3278). Hay que separar la posición de simulación de la de render en Player, Enemy y Pet; no es «riesgo bajo».
- Arreglo propuesto: - Simulación a 60 Hz: cuesta ~0,07 ms por tick según la línea base del humo.
- Instantáneas a 20 Hz.
- En F0, añadir `simPos`/`prevPos` separados de `group.position`, con interpolación alfa en `present()`.
- En solitario se puede mantener el dt variable hasta terminar ese refactor.

### INV-B-P9 · media
- Dónde: tecnologia.md §0.1 y §7.2(1) («Basta un solo Math.sin olvidado para romperlo»); codigo.md §2
- Problema: Presentan el determinismo como casi imposible, pero el issue que citan muestra lo contrario. El arreglo fueron 32 llamadas a sin/cos/atan cambiadas por núcleos fdlibm hechos solo con operaciones exactas, a 1,10× el costo, y los hashes coincidieron entre V8 11.3 y 14.9. Solo se probó entre versiones de V8, nunca SpiderMonkey ni JavaScriptCore. El «olvido» se previene con una prueba de lint. La conclusión para el co-op sigue en pie, por unirse a mitad, esperar al más lento y reconectar. Pero el rechazo a la re-simulación del ladder debe apoyarse en los TAS, los bots y la progresión editable del héroe, no en una imposibilidad técnica.
- Arreglo propuesto: - Reescribir §7.2 con las razones en el orden correcto.
- Dejar «detmath + lint» como opción costeada: una prueba que prohíba `Math.sin|cos|tan|atan2|exp|pow|hypot|log` y los métodos trigonométricos de THREE (`applyAxisAngle`, `setFromAxisAngle`) en los módulos de simulación del ladder, como `test67` prohíbe `powers.has(`.
- Probarlo también en Firefox y Safari.

### INV-B-P10 · media
- Dónde: tecnologia.md §0.3, §5.1 y §10.1 F1; codigo.md §5 (señalización por Trystero con relés públicos)
- Problema: Si la señalización vive en Supabase gratis, el co-op se cae cuando el proyecto se pausa tras 7 días sin uso, y la restauración es manual. Los canales privados con RLS que recomienda tecnologia.md exigen usuarios autenticados, o sea Supabase Auth ya en F1, antes de F2. La opción Worker + DO con hibernación, que el propio informe lista, no se pausa, cuesta US$0 a este volumen y es la misma pieza que emitirá las credenciales TURN y alojará F3. Nostr, MQTT y BitTorrent no tienen SLA.
- Arreglo propuesto: - Señalización principal: un Worker + un DO por sala con WebSocket Hibernation y código de sala de alta entropía.
- Respaldo: Trystero/Nostr con la opción `password`, que cifra el SDP con AES-GCM. Trystero expone las `RTCPeerConnection` (`getPeers`), así que se puede añadir el canal no fiable con `negotiated:true` y un id fijo, sin renegociar.
- Supabase queda solo para cuentas y nube (F2): su pausa ya no tumba el juego.

### INV-B-P11 · media
- Dónde: tecnologia.md §5.2 («ttl 86400», «función de 20 líneas»)
- Problema: El endpoint de credenciales es público: repo público y PWA. Cualquiera puede pedir credenciales y gastar los 1.000 GB, que se comparten con la SFU. 86400 es solo el ejemplo de la doc: Cloudflare dice que el TTL debe cubrir la sesión esperada y no habla de abuso.
- Arreglo propuesto: - Emitir credenciales solo para una sala viva: las pide el DO de señalización al crearla.
- TTL igual a la sesión prevista (3–4 h), con renovación.
- Revocarlas al cerrar la sala (la API responde 204).
- Límite por IP, y Turnstile si hay abuso.
- Vigilar el consumo en el panel de Cloudflare.

### INV-B-P12 · media
- Dónde: codigo.md §5 (flujo «Daño recibido»); tecnologia.md §2.4 (no hay compensación de lag)
- Problema: En B, el anfitrión ve al héroe del invitado medio RTT más el búfer en el pasado y resuelve el cuerpo a cuerpo contra esa posición: el invitado recibe golpes después de haberse alejado en su pantalla. A la vez, proyectiles y áreas se comprueban del lado de la víctima, lo que es incoherente. En A, el invitado ataca a enemigos interpolados ~100 ms en el pasado y nadie costeó la compensación de lag (rebobinar). Las habilidades apuntadas fallarían contra lo que el jugador vio.
- Arreglo propuesto: - En B, el evento de golpe cuerpo a cuerpo lleva el tick y la posición del atacante. El dueño lo acepta si su héroe estaba al alcance más una tolerancia de ~1 m en ese tick. Es favorecer a la víctima, como ya se hace con los proyectiles.
- En A, un historial de posiciones de 200–300 ms en el anfitrión para rebobinar al tick que vio el invitado.

### INV-B-P13 · media
- Dónde: Ningún informe; afecta a session.js, remote-hero.js y ui.js (marcos de grupo, chat, inspeccionar, registro de botín)
- Problema: Los datos que llegan de otros jugadores se pintarían con `innerHTML`. `heroName` es texto libre que se guarda (save-schema.js:39-58), y los nombres de objetos se interpolan en `innerHTML` (ui.js tiene 119 usos, por ejemplo ui.js:861) sin función de escape. Un par malicioso o un guardado editado puede inyectar HTML o JS en el navegador de los demás. En F2 eso permitiría robar el token de sesión de Supabase, que vive en localStorage. Además, un JSON de héroe con `__proto__`, tipos raros o un tamaño enorme puede corromper el `Player` que arma el anfitrión, o el guardado local del invitado si recibe objetos.
- Arreglo propuesto: - Un validador de esquema para todo lo que entra por la red: tipos, longitudes, ids de catálogo y tamaño máximo del mensaje. Se aplica antes de construir `Player` u objetos.
- Los textos de otros jugadores, con `textContent` o un escape central.
- Nunca escribir en el guardado local un objeto recibido sin validar.

### INV-B-P14 · media
- Dónde: codigo.md §5 (replica.js y flujo «Golpe propio»)
- Problema: En B, el dueño calcula el daño contra su réplica: resistencias, armadura, élite, pacto, tormento y escalado de grupo. Si la réplica no tiene exactamente los modificadores que aplicó `buffByPact` en el anfitrión, el daño y los umbrales de ejecución salen mal. El informe solo replica posición, vida y banderas.
- Arreglo propuesto: - Un evento fiable `spawn{netId, defId, floor, mods de pacto/tormento/élite/grupo, maxHP}` con todo lo que sale de `buffByPact`.
- Un evento `rescale` cuando cambia el tamaño del grupo (paso 0.12).
- En las instantáneas, solo lo dinámico.

### INV-B-P15 · media
- Dónde: codigo.md §3.2 («el viaje lo decide el anfitrión»); tecnologia.md no lo trata
- Problema: Con un anfitrión en navegador hay un solo mundo simulado. En D2, D3 y D4 un jugador puede volver al pueblo a vender mientras los demás siguen. Si todo viaje lo decide el anfitrión, cada visita a la tienda arrastra a todo el grupo.
- Arreglo propuesto: Decidirlo en el diseño:
(a) Portal personal: el invitado carga el pueblo en local (sin combate) y vuelve por el portal con el flujo de reconexión, que trae una instantánea completa. En B sale casi gratis.
(b) Viaje en grupo con votación.
Lo recomendable es (a).

### INV-B-P16 · baja
- Dónde: tecnologia.md §7.1.2
- Problema: Presenta `validateItem()` «contra los rangos de afijos de items.js» como algo que ya existe, y no existe. En js/ solo hay validadores de habilidades, forja y barras. Además los rangos de afijos van a cambiar con el rework de ítems.
- Arreglo propuesto: Marcarlo como «a crear» y asignarlo al frente de itemización: un validador declarativo junto al catálogo de afijos, reutilizable para el intercambio, la nube y el co-op.

### INV-B-P17 · baja
- Dónde: tecnologia.md §2.3 («delta contra el último confirmado»)
- Problema: No dice cómo se confirma una instantánea en un canal no fiable, ni cómo se asegura que un alta o una baja de entidad no se pierda.
- Arreglo propuesto: - Cada paquete de entradas del invitado lleva el número de la última instantánea recibida.
- El anfitrión hace el delta contra ese acuse, o manda una completa si es viejo.
- Altas y bajas de entidades, con su `netId`, por el canal fiable.

### INV-B-P18 · baja
- Dónde: tecnologia.md §2.3, §5.1 y §6.1; codigo.md §4 (fila D)
- Problema: Las tasas no coinciden. §2.3 dice que las entradas se muestrean a 30 Hz y salen en paquetes de 2 (15/s). §5.1 cuenta 30 mensajes/s por invitado. §6.1 calcula con 30 Hz y 10 Hz. codigo.md usa 20 msg/s. Los costos de DO y Supabase cambian del orden de 3× según cuál se tome.
- Arreglo propuesto: Fijar una sola tasa, por ejemplo 20 paquetes/s con 3 entradas redundantes, y rehacer con ella las cuentas de DO, Supabase y TURN.

### INV-B-P19 · baja
- Dónde: codigo.md §2 (solo cita powers-maga.js:258)
- Problema: Hay otro caso del mismo bug: mech-guerrero.js:231 usa `combatRng ? … : 0.5`. Como `combatRng` no se asigna en producción, una probabilidad `fervorChance` menor del 50 % nunca dispara y una mayor siempre dispara. Hoy está latente, porque ningún nodo v2 la da.
- Arreglo propuesto: El paso 0.5 de codigo.md (sembrar `p.combatRng` en `loadWorld`) lo arregla. Añadir una prueba que falle si una tirada de producción cae en el 0,5 fijo.

### INV-B-P20 · baja
- Dónde: codigo.md §8 (fila «Trampas»)
- Problema: La cota de plausibilidad usa «los stats publicados del héroe», que publica el mismo cliente, así que puede mentir.
- Arreglo propuesto: El anfitrión recalcula los stats con `recompute()` sobre el equipo recibido y validado, como propone tecnologia.md §7.1.1.

### INV-B-P21 · baja
- Dónde: tecnologia.md §6 (Vercel, «300 s en Hobby»), §5.1 (Trystero 0.25.x), §5.2 (10–25 % por TURN) y §9 (anónimo: 30 por hora por IP)
- Problema: Hay cifras sin fuente primaria. El changelog de Vercel no menciona los 300 s; la versión de Trystero no aparece en su README; el 10–25 % sale de una sola medición de 2017. Además, el tope de 30 registros anónimos por hora y por IP choca con el CGNAT, frecuente en LatAm.
- Arreglo propuesto: Marcarlas [sin verificar]. Ninguna cambia una decisión. Medir el porcentaje de relé con la telemetría del lobby (R6). Si se usa el registro anónimo, pedir un aumento del límite o usar Turnstile.

### INV-B-F1 · faltante
- Firefox y Safari (macOS) con la pestaña oculta, la ventana tapada o minimizada: no se investigó. El juego es de PC, pero no solo para Chrome. Y con temporizadores de Worker en las tres marcas: nadie lo confirmó con una fuente primaria.

### INV-B-F2 · faltante
- Un simulador de red dentro de `Transport` (latencia, jitter, pérdida, reordenamiento y duplicados), usable en Node y en el navegador. El throttling de DevTools no parece afectar a WebRTC [sin verificar]. Opcional: node-datachannel o werift para pruebas de integración WebRTC sin navegador.

### INV-B-F3 · faltante
- Sincronización de reloj y numeración de ticks y entradas: obligatoria en A, y en B para los eventos con tick (golpe cuerpo a cuerpo validado por la víctima, carga perfecta).

### INV-B-F4 · faltante
- El peor caso de mensajes, no solo el promedio: un jefe con 4 héroes lanzando definitivas, invocaciones, campos de suelo y FX remotos. Ver si cabe en 1100 B por instantánea y cuántos KB/s suman los eventos.

### INV-B-F5 · faltante
- El contenido exacto y el tamaño troceado de la instantánea completa para unirse o reconectar: enemigos con stats, cofres abiertos, campos de suelo, telegrafiados, DoT activos, marcas, Escarcha por enemigo, objetos en el suelo.

### INV-B-F6 · faltante
- El flujo de versión distinta en una PWA cacheada: desde el lobby, `registration.update()`, luego `skipWaiting` y recarga, con un mensaje visual claro, no un rechazo mudo.

### INV-B-F7 · faltante
- Muerte, resurrección y desconexión en B: el dueño del héroe es el que se fue, así que el anfitrión debe congelar y luego quitar su marioneta. Falta definir qué pasa con sus DoT, sus campos y su amenaza.

### INV-B-F8 · faltante
- Telemetría mínima del lobby: tipo de candidato (host, srflx o relay), RTT, pérdida y correcciones por minuto. El criterio de salida de F1, «menos del 1 % de correcciones visibles», hoy no tiene definición medible.

### INV-B-F9 · faltante
- Un aviso de privacidad: con P2P cada par ve la IP del otro, y en F2 Supabase guarda datos de cuenta. Con desconocidos, `iceTransportPolicy:'relay'` y su costo en TURN.

### INV-B-F10 · faltante
- Evaluar librerías de netcode JS de 2026 antes de escribirlo todo: serializadores e interpolación (nengi.js, el esquema de Colyseus), geckos.io y NetplayJS como referencia.

### INV-B-F11 · faltante
- La prioridad visual de los telegrafiados enemigos sobre los efectos aliados y el presupuesto de partículas por fuente: codigo.md lo menciona, pero no entra en ningún criterio de salida.

### INV-B-F12 · faltante
- Reconciliar las dos listas de F0 en una sola, ordenada por dependencia: paso fijo de 60 Hz con posición de render separada; hit-stop y pausa solo de presentación; semillas de combate e IA; pueblo y refugio con semilla; `heroId` y `netId`; `takeDamage({by})`; aggro al héroe más cercano; daño enemigo a todos los héroes; `resolveKill`/`grantKill`; guardado con debounce; `p.cast` por héroe; validador de esquema de red.

### R1-A-P12 · media
- Dónde: §4 identidad (anónimo → linkIdentity con Google), F2 «Cambio de PC recupera el héroe»
- Problema: Faltan piezas que la propia documentación exige: (1) linkIdentity «requires you to enable manual linking». (2) En el cambio de PC, la segunda máquina entra anónima y la cuenta de Google YA existe, así que vincularla falla. Supabase dice que esos conflictos se resuelven a mano: entrar a la cuenta existente y fusionar o elegir los datos. El diseño no tiene ese flujo, y es justo el criterio de salida de F2. (3) El anónimo tiene un límite de 30 por hora por IP y se recomienda CAPTCHA o Turnstile. (4) Los anónimos no se borran solos. (5) supabase-js guarda la sesión en localStorage: cualquier XSS roba el token de refresco (otra razón para P7/P8).
- Arreglo propuesto: Flujo explícito: «Entrar con Google» en la máquina nueva = signInWithOAuth (no link). Si había héroes locales o anónimos, mostrar las dos tarjetas que el diseño ya propone y fusionar por slot. Activar la vinculación manual y Turnstile en Auth. Cron SQL que borre anónimos sin vincular de más de 30 días. Probar el criterio de salida de F2 con dos navegadores limpios.

### R1-A-P13 · media
- Dónde: §3.8 «Respaldo de señalización: Trystero (Nostr)» y «Respaldo de TURN: Metered»
- Problema: El respaldo se salta lo que el diseño pone como seguridad base. Sin el DO no hay aprobación del anfitrión (hay que rehacerla dentro de la app), ni credenciales TURN emitidas por el servidor: Metered exige una API key, que en el cliente queda expuesta y cualquiera puede gastar los 20 GB. Además obliga a abrir connect-src a relés públicos de Nostr que cambian, y un respaldo que nunca se usa queda sin probar y se pudre. A cambio protege de un evento raro (caída de Workers).
- Arreglo propuesto: Sacar Trystero y Metered de F1 (anotarlos como plan C documentado). Si se mantienen: aprobación del anfitrión dentro de la app antes de cualquier dato, sin TURN en el respaldo (solo directa), relés fijos y listados en la CSP, y una prueba E2E mensual del respaldo.

### R1-A-P14 · baja
- Dónde: §3.2 «Presupuesto de SCTP (dcSCTP de Chrome…)» [V], R3
- Problema: El presupuesto es solo de Chrome. Firefox usa usrsctp (con otros valores; en el árbol de Firefox ya hay DataChannelDcSctp.cpp, sin que se sepa qué está activo). Chrome además reemplaza valores de dcsctp_options.h: max_send_buffer_size = ilimitado (tecnologia.md dice 2 MB), max_retransmissions = nullopt, backoff máximo de 3 s, e intercalado detrás del field trial WebRTC-DataChannelMessageInterleaving. Encima, TURN por TCP/TLS (redes cerradas) anula lo «no fiable» del canal u.
- Arreglo propuesto: R3 con matriz Chrome↔Chrome, Chrome↔Firefox y Firefox↔Firefox, directo y por relé UDP y TLS-443; medir la latencia de un urgente perdido y el bufferedAmount. Corregir el dato de 2 MB en tecnologia.md. El control de cola (T5) es la única defensa real, porque el búfer de Chrome no tiene tope.

### R1-A-P15 · baja
- Dónde: §3.3 «RTT y reloj · PING · 1 Hz · r»
- Problema: Medir el RTT por el canal fiable y ordenado mezcla la latencia de red con el bloqueo de cabeza de línea y los 400 ms de RTO de SCTP: con pérdida, el indicador del HUD y el ajuste del búfer de interpolación (100–150 ms) leen picos falsos.
- Arreglo propuesto: RTT de red con getStats(): currentRoundTripTime del par de candidatos seleccionado (sirve también para el panel de depuración y para saber si es host, srflx o relay). Reloj y offset con marcas de tiempo en la cabecera de u (tick + eco), no en r.

### R1-A-P16 · baja
- Dónde: §2.1 enlace «…/?sala=K7QM3XRD»
- Problema: El SW actual guarda en caché cada GET propio con su query (caches.match/put por URL completa): cada enlace de sala suma una copia de index.html en la caché y la navegación offline no coincide. El código queda además en los logs de Vercel y en el Referer.
- Arreglo propuesto: Usar #sala=K7QM3XRD (el fragmento no viaja al servidor ni forma parte de la clave de caché) y leerlo con location.hash. Si se mantiene la query, que el SW use ignoreSearch en las navegaciones.

### R1-A-P17 · baja
- Dónde: §6 #4 heroId con crypto.randomUUID(); §8 pruebas en dos PCs
- Problema: crypto.randomUUID solo existe en un contexto seguro. Probar entre dos PCs de la LAN con npm start (http://192.168.x.x:8080) deja heroId undefined y la migración a v6 falla.
- Arreglo propuesto: Respaldo con crypto.getRandomValues (disponible sin contexto seguro) para armar un UUID v4, o probar siempre por https (Vercel preview) o localhost. Una prueba unitaria del respaldo.

### R1-A-P18 · baja
- Dónde: §3.7 guardado con debounce de 3 s; §2.3 regalos
- Problema: Con debounce, quien regala un objeto y cierra la pestaña o se cae antes de 3 s lo conserva en su guardado, mientras el receptor ya lo tiene: duplicación. Entre amigos tiene poco impacto, pero contamina el origen de los objetos y, con la nube de F2, viaja entre máquinas.
- Arreglo propuesto: Guardado inmediato en ambos lados al regalar (el que da guarda ANTES de mandar; el que recibe guarda al aceptar) y un giftId idempotente (el receptor descarta duplicados).

### R1-A-P19 · baja
- Dónde: §3.4 welcome/travel (torment, floor, rift, pact) y KILL
- Problema: El invitado tira su botín en local con los parámetros que le manda el anfitrión. Un anfitrión manipulado (o con errores) puede mandar un Tormento fuera de rango, NaN, o KILL de netIds que nunca existieron o repetidos: botín ilimitado o una excepción en items.js. El diseño solo se defiende del invitado.
- Arreglo propuesto: El invitado recorta los parámetros del mundo a los rangos del catálogo, acepta KILL solo de netIds con SPAWN previo y una sola vez, y limita los KILL por segundo. Los objetos van marcados con origen: {reino: abierto, partida} (ya previsto) para que nunca crucen al ladder.

### R1-A-P20 · baja
- Dónde: §3.8 tabla (marcas [V]); §16
- Problema: Hay marcas [V] mal puestas o incompletas: «solo suma ~1 s al armar la sala» es una deducción; los «1.000 GB gratis» de TURN están escritos de forma ambigua en la página de TURN («free… when used together with the Realtime SFU», otherwise US$0,05/GB), aunque la de precios dice que los 1.000 GB se comparten; no está verificado si TURN pide tarjeta ni qué pasa al pasar el tope sin tarjeta; y el efecto de revocar una credencial sobre una asignación viva no está documentado.
- Arreglo propuesto: Marcar como [D]/[S] lo que corresponda y llevar las tres incógnitas (tarjeta, sobreuso, revocación en vivo) a la lista de verificación de E0/R2, con medición en el panel de Cloudflare.

### R1-A-P21 · baja
- Dónde: §3.8 privacidad; §4 cuentas (F2)
- Problema: Desde F1 se tratan datos personales (IPs en el DO para limitar intentos y en Workers Logs; desde F2, correos de Google). La Ley 21.719 de Chile entra en vigor el 1-dic-2026 (hay un proyecto en trámite para postergarla a 2027), y el diseño no menciona aviso de privacidad, retención ni borrado de cuenta. Publicar la pantalla de consentimiento OAuth de Google también pide página de inicio y política de privacidad [S].
- Arreglo propuesto: Aviso de privacidad corto (qué se guarda: IP con hash para limitar, 3 días de logs; correo y héroes en F2). No guardar IPs en claro (hash con sal rotativa). Botón «Borrar mi cuenta» (Edge Function con service_role). Revisar el estado del boletín 18.623-07 antes de F2.

### R1-A-F1 · faltante
- Versiones y despliegues: constante BUILD/PROTO dentro del JS (no la VERSION de sw.js), flujo «Actualizar» que espera al SW nuevo, el Worker acepta el protocolo actual y el N-1, y un interruptor de apagado («versión mínima») servido por el Worker. Regla de no desplegar el Worker con salas activas, o probar el redespliegue en R2.

### R1-A-F2 · faltante
- Observabilidad mínima: telemetría opcional por el Worker (tipo de candidato host/srflx/relay, RTT, motivo de desconexión, duración de la sesión, GB de TURN por sala) con Workers Logs (gratis: 200.000 eventos al día, 3 días de retención, muestreo con head_sampling_rate) para medir de verdad R7 (CGNAT en LatAm) y R9. Sin esto, E10 calibra a ciegas.

### R1-A-F3 · faltante
- Topes de costo y manual de operación: Cron que lee callsTurnUsageAdaptiveGroups, revoca por sala y apaga la emisión por umbral; alertas de facturación; qué ve el jugador si se agotan las 100.000 peticiones diarias (error 1027) o el cupo de TURN.

### R1-A-F4 · faltante
- Defensas del Worker: rate limit por IP en el Worker (no en el DO de la sala), Turnstile al crear y al unirse, control de Origin, tamaño y ritmo máximos de los mensajes de señalización (el SDP pesa unos 10 KB), máximo de salas por IP.

### R1-A-F5 · faltante
- Diseño del estado del DO: esquema de su SQLite (sala, anfitrión, aceptados, rejoinToken con vencimiento, credenciales emitidas con customIdentifier), Alarms en vez de setTimeout, deleteAll al cerrar y reconexión automática del WebSocket del anfitrión.

### R1-A-F6 · faltante
- Renovación de TURN sin cortar: setConfiguration + restartIce negociados por el canal r antes de que venza el TTL, con prueba en R2 (TTL de 5 min).

### R1-A-F7 · faltante
- Validación semántica de todos los campos de red (finitos, rangos, divisores ≥ 1) en ambos sentidos (invitado→anfitrión y anfitrión→invitado), y que save-schema se niegue a guardar NaN o Infinity.

### R1-A-F8 · faltante
- Trusted Types en report-only como red de seguridad para los 119 innerHTML de ui.js (Baseline desde febrero de 2026).

### R1-A-F9 · faltante
- F2 en la base de datos: restricciones de tamaño y de slots, escrituras de temporada y del ladder solo por RPC o Edge Function, GRANT de solo lectura en el ladder, y backups propios (el plan gratis no deja descargar backups: supabase db dump programado, p. ej. con GitHub Actions gratis, más un historial de las últimas N revisiones por héroe).

### R1-A-F10 · faltante
- F2 en cuentas: activar la vinculación manual, el flujo de conflicto de identidad al entrar con Google en otra PC, CAPTCHA o Turnstile para el anónimo, limpieza de anónimos, borrado de cuenta y aviso de privacidad (Ley 21.719).

### R1-A-F11 · faltante
- Sincronización al cerrar (F2): pagehide con fetch keepalive (el cuerpo tiene un tope de 64 KiB; sendBeacon no permite las cabeceras Authorization/apikey de Supabase), así que el alijo grande se sube antes, con debounce, no al cerrar.

### R1-A-F12 · faltante
- Pruebas del Worker sin cargar la PC: la lógica de la sala como módulo puro probado con node y un storage falso dentro de npm test; wrangler dev o Miniflare solo en E0 y por turno.

### R1-A-F13 · faltante
- Secretos: TURN_KEY_ID, la clave de la API de TURN y el token de la GraphQL como wrangler secret; nada en wrangler.toml ni en el repo (el código es público). Declarar new_sqlite_classes en las migraciones (el plan gratis solo admite DO con SQLite).

### R1-A-F14 · faltante
- Matriz de navegadores del transporte (Chrome↔Firefox, directo, relé UDP, relé TLS-443) dentro de R3, porque Firefox no usa la misma pila SCTP que Chrome.

### R1-B-P7 · media
- Dónde: §3.5 «Muerte de un enemigo: solo con KILL; mientras, a 0 queda tambaleando»; mockup «0 ms en todo lo tuyo» y «Ve morir al enemigo ≈ 90 ms»
- Problema: Para un invitado, cada enemigo que mata vive 1 RTT más como «zombi» con 0 de vida (150–250 ms a 90–175 ms de RTT). En ese tiempo sigue atrayendo el objetivo automático, los rebotes de cadena, los proyectiles que atraviesan y las áreas, así que en manadas densas el invitado pierde daño efectivo. El banco GRUPO no lo mide porque no simula latencia. Además, los efectos «al matar» (`killHeal`, `manaOnKill`, curas por quemadura o sangrado) llegan tarde: las builds que se sostienen matando se sienten peor como invitado. El «0 ms en todo lo tuyo» es falso.
- Arreglo propuesto: - **Muerte predicha visual:** si tu propia predicción deja al enemigo en ≤ 0 y no hay reclamaciones ajenas sin confirmar, la réplica pasa a «muerta prevista». Se excluye de objetivos, rebotes y áreas, y arranca la disolución.
- Botín y XP siguen esperando el KILL.
- Los efectos «al matar» del tipo recurso o cura pueden predecirse, con una corrección si el KILL no llega.
- En el modelo B el anfitrión aplica sin recalcular, así que la predicción casi nunca falla. Solo falla por concurrencia o por escudos del enemigo.
- **Medir:** p95 de confirmación de muerte y cuántas muertes predichas se revierten en `net-sim`.
- **Mockup:** cambiar a «0 ms en tus habilidades».

### R1-B-P8 · media
- Dónde: §2.5 (cada uno ve al enemigo a su nivel) junto con §3.4 THR (`f32 n` absoluto) y §7 «Amenaza»; código entities.js:2316-2318 (`threatFromDamage(dealt, threatMult)` con daño absoluto)
- Problema: La amenaza se suma en unidades absolutas de daño. Pero con la escala por espectador, Beto (Nv 60) le hace 11.000 de daño al mismo enemigo al que Ana (Nv 20) le hace 500 con la misma fracción. Beto genera unas 22 veces más amenaza por el mismo aporte, y un tanque de menor nivel nunca retiene a los enemigos. Lo mismo pasa con la amenaza de las curas (`threatFromHeal`), que se mide con las vidas absolutas de héroes de distinto nivel.
- Arreglo propuesto: - La amenaza la calcula el anfitrión en unidades de **fracción de vida del enemigo** (× `threatMult` del héroe), a partir de la fracción del HIT. Así no viaja `n` absoluto.
- Las provocaciones siguen como `forceTarget`.
- Amenaza por curas: normalizada por la vida máxima del curado.
- **Prueba:** tanque Nv 30 y daño Nv 60 → el tanque retiene.

### R1-B-P9 · media
- Dónde: §3.4 registro de entidad (`u16 banderas`: aturdido, congelado, ralentizado, vulnerable, debilitado, provocado, inmune, afijo, fuera de interés); código entities.js:1858 (`rootT`), 1871 (`numbT`), 2088-2110 (stagger y Quebrantado), 2152-2170 (`beginCast` interrumpible); lecturas desde código del héroe: `frozenT` 12, `slowT` 6, `numbT` 5, `vulnT` 4, `rootT` 4, `staggerBrokenT` 3, `aggroed` 3, `debuffs` 3
- Problema: La réplica no puede responder lo que preguntan los talentos y la interfaz:
- **Inmovilizado** (`rootedWeak`, `drVsSlowed`).
- **Aterido.**
- **Quebrantado y valor de stagger:** el marco del jefe muestra la barra de stagger.
- **DoT por tipo:** `burningCrit`, curas por quemadura o sangrado, `hasDoT`.
- **Lanzamiento interrumpible:** id y progreso. Interrumpir es una primitiva de rol; sin la barra de lanzamiento, el invitado no sabe cuándo cortar.
- **En combate** (`aggroed`).

Con 16 bits no alcanza.
- Arreglo propuesto: - Banderas a `u32`: más inmovilizado, Aterido, Quebrantado, en combate y una máscara de DoT (quemadura, sangrado, veneno).
- Registro extendido solo para élites y jefes: `u8 stagger`, `u8 castId`, `u8 castProg`.
- **Prueba de contrato:** recorre los campos de enemigo que leen `powers-*.js`, `skills-*.js` y `game-skills.js` (hay un recuento con grep) y exige que `replica.js` los exponga desde los datos replicados.

### R1-B-P10 · media
- Dónde: §7 «DoT: los tics corren en el anfitrión; ⑬ vuelve al dueño como evento» (no hay tipo de mensaje); código powers-guerrero.js:1748-1774, 1905-1999 (`dotRemaining`, `consumeDoT`, `hasDoT` de sangrado), skills-maga.js:340 (consume quemadura), mech-guerrero.js:87, powers-maga.js:420, 2109, 3090 (`replaceDoT`), game-skills.js:1174-1178
- Problema: Los DoT corren en el planificador del anfitrión, pero hay habilidades del Guerrero (Sangría y Desangrar) y de la Maga que leen lo que queda, lo consumen (detonan) o lo reemplazan. En el modelo B el cliente no tiene ese estado ni un mensaje para pedirlo, y el ⑬ `onDotEnd` no tiene tipo de urgente. Tampoco se decide si `hasDoT(e, 'bleed')` cuenta el sangrado de otro jugador.
- Arreglo propuesto: - **Espejo local de los DoT propios** (lo aplicado menos lo transcurrido), para `dotRemaining` y `hasDoT` propios sin red.
- **Urgente** `DOTX {netId, tipo, acción: consumir | reemplazar}`. El anfitrión responde con `DOTR {fracción consumida}` y la reclama como HIT del dueño.
- **Urgente** `DOTEND {netId, fuente}` para el gancho ⑬.
- **Decisión:** los DoT ajenos no cuentan para tus talentos, salvo Vulnerable y Debilidad, en línea con D14.

### R1-B-P11 · media
- Dónde: §3.2 T3 («envío inmediato si entra un urgente, tope de 60 paquetes/s») y §3.9 (≈ 15 KB/s, tope 22 KB/s); codigo.md §7.6 H1 («las instantáneas salen al final de cada bombeo»)
- Problema: No dice si los paquetes inmediatos llevan los registros de estado. Si los llevan, a 60 paquetes/s son unos 48 KB/s por invitado y la subida del anfitrión con 3 invitados pasa de unos 0,5 a unos 1,2 Mbps, justo lo que §3.9 quería evitar. Por otro lado, con H1 cada mensaje de cada invitado bombea el mundo, y si cada bombeo emite instantáneas son 60 por segundo y por invitado. El presupuesto tampoco cuenta la sobrecarga por paquete (IP, UDP, DTLS con GCM y SCTP ≈ 70–95 B) multiplicada por los paquetes extra de T3.
- Arreglo propuesto: - Los paquetes inmediatos llevan solo cabecera, acuses y urgentes.
- Las instantáneas salen con su propio reloj a 20 Hz (15 Hz en «subida baja»), desacoplado del bombeo.
- Agregar los golpes del mismo tick sobre el mismo enemigo en un solo HIT.
- Recalcular §3.9 con sobrecarga × paquetes/s reales.
- Medir en R3 los KB/s de subida del anfitrión con 3 invitados haciendo daño de área.

### R1-B-P12 · media
- Dónde: §3.2 T2 (reenvío por `r` a los 300 ms fijos) y §3.4 (`u16 id` de urgente)
- Problema: El reenvío por `r` a 300 ms fijos falla con latencia alta. Con RTT de 175–210 ms (Ciudad de México, Madrid), más jitter, más hasta 50 ms de espera del paquete que trae el acuse, casi todo urgente pasa los 300 ms y se duplica por `r`. Eso llena el canal fiable y lo bloquea por cabeza de línea. Si un invitado usa Firefox, su SCTP es usrsctp, que no ajusta el RTO (el mínimo recomendado por la RFC 9260 es 1 s, frente a 400 ms en Chrome) [a medir]: el canal fiable de ese emisor se recupera mucho más lento. Por último, no se dice que el receptor deduplique entre `u` y `r` ni cómo se comparan ids que dan la vuelta.
- Arreglo propuesto: - Tiempo de reenvío adaptativo = `max(300, SRTT + 4·RTTVAR + 1 intervalo de envío del otro)`.
- Deduplicación por id de urgente con ventana y comparación cíclica, común a los dos canales.
- Caducidad por tipo (ver el problema de la época).
- R3 con Chrome↔Firefox en las dos direcciones y RTT de 200 ms.

### R1-B-P13 · media
- Dónde: §3.3 fila «RTT y reloj: PING 1 Hz por `r`»
- Problema: Medir el RTT por el canal fiable y ordenado lo falsea. Un ping perdido espera al menos 400 ms (RTO) y uno que queda detrás de un mensaje grande hereda su bloqueo. Con ese RTT se ajustan la interpolación, el reenvío adaptativo, las barras de latencia y los avisos de «con retraso».
- Arreglo propuesto: - RTT a partir de los acuses del canal `u`: guardar la hora de envío por `seq` y medir al recibir el `ack`, con un filtro EWMA.
- Contraste con `getStats()` (`RTCIceCandidatePairStats.currentRoundTripTime`).
- Reloj del anfitrión estimado con el mínimo de una ventana de muestras.
- El `ping` fiable queda solo como latido.

### R1-B-P14 · media
- Dónde: §3.8 (credenciales TURN con TTL de 2 h, revocadas al cerrar) y §3.7 (reconexión con `restartIce()`); criterio de E10 (sesión de 1 hora)
- Problema: La doc de Cloudflare no dice qué pasa con una asignación activa cuando la credencial vence o se revoca. Pide un TTL «mayor que el tiempo que esperas que usen TURN» y renovar con `RTCPeerConnection.setConfiguration()`. Según el borrador de la API REST de TURN, la asignación ya hecha sobrevive al vencimiento, pero toda asignación nueva falla, y eso incluye el ICE restart. Una sesión por relé de más de 2 h no puede reconectarse si no se renovaron las credenciales. La prueba de 1 h de E10 no lo detecta.
- Arreglo propuesto: - TTL = vida máxima de la sala (por ejemplo, 12 h), con el tope diario y la revocación al expulsar o cerrar.
- O bien: renovar a mitad del TTL desde el DO y hacer `pc.setConfiguration({iceServers})` antes de cada `restartIce()`.
- **Prueba en E10:** sesión de 2,5 h con relé forzado, con un corte de red y un ICE restart pasado el TTL.

### R1-B-P15 · media
- Dónde: §3.6 H3 «pausa cooperativa: el mundo se congela (enemigos quietos, nadie recibe daño)»
- Problema: En el modelo B cada héroe es autoritativo en su cliente. Si solo se congela el mundo del anfitrión, los invitados siguen corriendo su héroe: sus DoT recibidos, sus canalizaciones, su recurso y los charcos enemigos que su cliente resuelve. Un invitado puede morir, gastar enfriamientos o seguir reclamando golpes a un mundo detenido durante la pausa.
- Arreglo propuesto: - Estado `pause {tick, motivo}` replicado por `r` y además como bandera en la cabecera de `u`.
- Al recibirlo, cada cliente (anfitrión incluido) deja de llamar a `simStep` de su héroe y bloquea la entrada. Solo corre `present`.
- Reanudación sincronizada por tick.
- Prueba en `net-sim`: el anfitrión se oculta con un DoT activo sobre un invitado.

### R1-B-P16 · media
- Dónde: §3.5 «Lo que la IA del anfitrión mira de un invitado» y §5.2 (cota de plausibilidad calculada con el héroe reconstruido en el saludo)
- Problema: El anfitrión reconstruye al invitado una sola vez, en el `hello`. Si el invitado sube de nivel, se equipa un objeto recogido o regalado, cambia talentos o recibe un bufo de santuario, sus golpes legítimos superan la cota vieja y se rechazan en silencio: el daño se pierde sin aviso. `level` viaja, pero el equipo no. Y el `RemoteHero` que ven los demás tampoco se actualiza en lo visual.
- Arreglo propuesto: - Mensaje `equip` o `hero-delta` por `r`, compacto (ids de catálogo saneados), al cambiar equipo, talentos o nivel. El anfitrión recalcula con `recompute()`.
- Entre amigos, la cota en modo «registrar y marcar», no «descartar», salvo excesos de más de 3×.
- Agregar al saneado una comprobación de alcance: distancia entre el héroe reportado y el enemigo (con 500 ms de historial) ≤ alcance máximo + margen.

### R1-B-P17 · media
- Dónde: §5.3 CSP: `script-src 'self' https://cdn.jsdelivr.net`
- Problema: Permitir el dominio entero de jsDelivr anula la CSP como defensa contra XSS. jsDelivr sirve cualquier paquete de npm y cualquier archivo de GitHub, y hay paquetes publicados justamente para saltarse CSPs que lo permiten. Si sobrevive un `innerHTML` de los 119, se carga cualquier script desde ese dominio.
- Arreglo propuesto: - Vendorizar `three@0.160` (y Trystero si se usa) en `/vendor/`, copiando los `.js`. No exige paso de compilación y además mejora el PWA sin conexión.
- CSP: `script-src 'self' 'sha256-<importmap>'`, más `object-src 'none'` y `base-uri 'self'`.
- Si queda algún CDN: ruta exacta con versión más SRI.
- Probar primero en `report-only`, como ya propone el diseño.

### R1-B-P18 · media
- Dónde: §8 «Navegador, una PC: `?net=local`: dos pestañas por BroadcastChannel»
- Problema: Dos pestañas de la misma ventana nunca están visibles a la vez: la de fondo tiene rAF detenido, así que la prueba siempre ejercita «anfitrión oculto» o «invitado ausente». Dos ventanas que se tapan caen en la oclusión de Windows. Y dos juegos Three.js a la vez son una prueba pesada en la PC del dueño, que exige turno.
- Arreglo propuesto: - Dos ventanas lado a lado, sin solaparse, siempre lanzadas con `node tools/turno.mjs`.
- Mejor aún: una pestaña real más un invitado headless en Node (el arnés `makeHarness` con `LoopbackNet` hablando por WebSocket local), que no dibuja.
- Para condiciones reales en Windows: clumsy (retardo, pérdida, desorden y cortes) en lugar de solo `?lag=`.

### R1-B-P19 · baja
- Dónde: §3.4 registro de entidad y de héroe: `u16 x · u16 z (1/256 m; la zona mide 120 m)`; código world.js:263-288 (`Grid`: `ox = −w/2`, coordenadas centradas)
- Problema: Las coordenadas del mundo son negativas (−60 a +60 m en una zona). Escritas con `setUint16`, sin desplazamiento, las negativas dan la vuelta.
- Arreglo propuesto: Usar `i16` (±128 m a 1/256 m) o codificar `x − grid.ox`. Documentar el rango y probar la ida y vuelta en `net-protocolo` con esquinas negativas.

### R1-B-P20 · baja
- Dónde: §3.4 PROJ (`u8 dirección`, `u16 velocidad o radio`, `u16 retardo`)
- Problema: Una dirección en 256 pasos tiene 1,4° de resolución: a 20 m son unos 0,5 m de error lateral, suficiente para que un proyectil «te pase» distinto que en el anfitrión. Además PROJ no lleva duración, así que no puede representar charcos ni anillos persistentes (el Encarcelador dura 1,4 s, la lava, etc.).
- Arreglo propuesto: Mandar el punto de destino (`u16 x · u16 z`) en vez de la dirección, más `u16 duración`. Que la víctima use el tiempo restante = retardo − edad.

### R1-B-P21 · baja
- Dónde: §3.4 registro de héroe (sin marca de tiempo del emisor ni bandera de teletransporte)
- Problema: El anfitrión retransmite el héroe de un invitado con la hora de llegada, así que el jitter de la ida invitado→anfitrión se ve en los demás. Parpadeo y las cargas largas se interpolan como un deslizamiento.
- Arreglo propuesto: Agregar `u16 ms` del emisor por registro de héroe y un `u8 movEpoch` (o bandera «snap») que se incrementa al teletransportarse, para cortar la interpolación.

### R1-B-P22 · baja
- Dónde: §5.3 «ritmo máximo por par (120 mensajes/s) y expulsión»
- Problema: No define si «mensaje» es un paquete o un urgente. Una build de área legítima produce más de 120 HIT por segundo (20 enemigos × 6 golpes) y sería expulsada.
- Arreglo propuesto: Límite por paquetes (≤ 70/s, compatible con T3) y por reclamaciones por enemigo y segundo. Expulsión solo tras varios segundos seguidos de exceso.

### R1-B-P23 · baja
- Dónde: §3.8 Worker + DO (hibernación) y reconexión
- Problema: Hay tres detalles operativos sin tratar:
- Un despliegue del Worker cierra todos los WebSockets de las salas activas.
- El navegador no puede mandar pings de protocolo, así que hace falta un latido de la aplicación, y si ese latido despierta al DO se pierde la hibernación.
- La memoria del DO se borra al hibernar o al ser desalojado.
- Arreglo propuesto: - Latido de texto `"ping"` desde el cliente cada unos 30 s, respondido con `setWebSocketAutoResponse('ping','pong')` sin despertar al DO.
- Reconexión automática del cliente (`partysocket`).
- Estado de la sala en la SQLite del DO o en `serializeAttachment` (≤ 16 KB).
- Clase de DO SQLite: el plan Free solo admite SQLite (desde jun-2026 con el campo declarativo `exports`).
- Prueba: desplegar a mitad de una sesión y reconectar un invitado.

### R1-B-P24 · baja
- Dónde: §3.5 «Tu golpe: barra predicha; la instantánea del anfitrión pisa la barra cuando llega el acuse»
- Problema: Está escrito de forma vaga. Si la barra toma el valor interpolado (100 ms atrás) o una instantánea generada antes de que el anfitrión procesara tu HIT, la vida rebota hacia arriba en cada golpe.
- Arreglo propuesto: Vida mostrada = la vida autoritativa más reciente (no la interpolada) − Σ de tus reclamaciones aún no procesadas. «Procesada» se sabe porque el `ack` de la cabecera cubre el `seq` del paquete que llevaba el HIT.

### R1-B-P25 · baja
- Dónde: §3.4 KILL (`u16 netId · u8 slot del golpe final · u8 banderas`)
- Problema: Si el golpe final fue un DoT o un campo, el cliente que mató no tiene la habilidad ni el estado del enemigo al morir (`killStatus`: quemado, sangrando). Los ganchos ⑥ `onKill` con condición por habilidad o estado no pueden evaluarse.
- Arreglo propuesto: KILL con `u8 habilidad` y `u8 máscara de estado al morir` (los bits de DoT y control).

### R1-B-P26 · baja
- Dónde: §2.1 «Trystero de respaldo»; §3.2 (ids 100/101 «no chocan con Trystero»)
- Problema: Confirmado: Trystero crea un solo canal en banda (`createDataChannel('data')`, id 0 o 1), así que 100 y 101 negociados no chocan. Pero Trystero hoy es un monorepo en TypeScript con paquetes separados (`packages/nostr` y otros) y su última versión es 0.26.0, del 4-oct-2026. El diseño no fija versión ni ruta ESM.
- Arreglo propuesto: Fijar `trystero@0.26.0` y la ruta exacta del paquete nostr, vendorizado (ver el problema de la CSP). Probar en R2 que `getPeers()` sigue devolviendo la `RTCPeerConnection` en esa versión.

### R1-B-P27 · baja
- Dónde: §3.6 anfitrión oculto (R1)
- Problema: R1 no mide el descarte por Memory Saver ni el congelamiento de una pestaña oculta mucho tiempo. La doc de Chrome no dice si una pestaña con DataChannel queda exenta del descarte. Y el criterio «≥ 55 ticks/s» no mide la regularidad de los envíos: con H1, los envíos salen a ráfagas, al ritmo de los mensajes que llegan.
- Arreglo propuesto: - Añadir a R1: 30 min oculta con Memory Saver activo, más la comprobación de `document.wasDiscarded` y `freeze`.
- p95 del intervalo entre instantáneas ≤ 70 ms.
- Si hay descarte: sugerir «mantener siempre activo» para el sitio, o mantener audio.

### R1-B-P28 · baja
- Dónde: Mockup, sección «Cómo viaja un golpe» y franja de datos de la cabecera
- Problema: El mockup dice «0 ms en todo lo tuyo» y «Beto ve golpe y muerte ≈ 190 ms (100 de interpolación)». Lo primero es falso: las muertes, el botín y los efectos al matar esperan 1 RTT. Lo segundo depende de una regla de tiempo que el documento no fija, porque el KILL urgente se aplica al llegar.
- Arreglo propuesto: - Cambiar a «0 ms en tus habilidades» y mostrar «tu muerte confirmada ≈ 1 RTT».
- Rehacer el diagrama con la regla de §3.5 corregida: lo que ves de otros, en la línea de interpolación.

### R1-B-F1 · faltante
- Mensajes que faltan en §3.4:
- `DISP` (desplazamiento).
- `DOTX`, `DOTR` y `DOTEND` (consumir o reemplazar DoT y el gancho ⑬).
- `ENEMYMOD` o un registro extendido de élites y jefes (debilidad %, multiplicador saliente, stagger, lanzamiento interrumpible, máscara de DoT).
- `FIELD` v2 con forma y banderas de mundo.
- `equip` o `hero-delta`.
- `party {n, tick}` para que todos cambien `partyHpMult` en el mismo tick.
- `pause {tick}`.

### R1-B-F2 · faltante
- Regla de tiempo escrita por tipo de mensaje: qué se resuelve en el presente de la víctima y qué se programa en la línea de interpolación del observador, con la tolerancia de alcance y el mínimo de reacción.

### R1-B-F3 · faltante
- Época del mundo en la cabecera de `u` y en los mensajes de `r` que dependan del mundo; caducidad por tipo de urgente; deduplicación entre `u` y `r` con comparación cíclica de ids.

### R1-B-F4 · faltante
- Orden por emisor en los mensajes de par a par que tienen pareja (FIELD inicio y fin, AID guarda y consumida, CC y su fin): un `seq` por emisor o una versión por entidad, porque el canal `u` llega desordenado.

### R1-B-F5 · faltante
- Interés también para los urgentes: no mandar CAST, FIELD ni FX de un aliado que está a 80 m (35 m más un margen), para no gastar el presupuesto de 1.100 B.

### R1-B-F6 · faltante
- Agregación de golpes por enemigo y por tick antes de armar el paquete, más el presupuesto real con la sobrecarga por paquete (IP, UDP, DTLS, SCTP ≈ 70–95 B) y los paquetes inmediatos de T3.

### R1-B-F7 · faltante
- Métricas de `?netdebug` y de E10:
- p95 de confirmación de muerte.
- % de muertes predichas que se revierten.
- % de reclamaciones rechazadas por la cota.
- Duplicados reenviados por `r`.
- Tipo de candidato (host, srflx, relay).
- KB/s reales de subida del anfitrión.

### R1-B-F8 · faltante
- Pruebas que faltan:
- Chrome↔Firefox en las dos direcciones (SCTP distinto).
- Sesión de 2,5 h por relé con un ICE restart pasado el TTL.
- Despliegue del Worker a mitad de sesión.
- Pérdida en ráfagas (Gilbert–Elliott) y cortes de 1–2 s, no solo 5 % uniforme.
- Subida limitada a 0,5 Mbps en el anfitrión.

### R1-B-F9 · faltante
- Prueba de contrato de la réplica: todo campo de enemigo que lea el código del héroe (`frozenT`, `slowT`, `numbT`, `vulnT`, `rootT`, `staggerBrokenT`, `aggroed`, `debuffs`, `marks`, `prey`, `_lure`) tiene que existir en `replica.js` alimentado por datos replicados.

### R1-B-F10 · faltante
- Política de actualización del service worker para el «Actualiza la página» del saludo: `registration.update()`, `skipWaiting` y recarga, y aviso a todos los de la sala.

### R1-B-F11 · faltante
- Comportamiento del invitado al volver de una pestaña oculta: su héroe no debe «ponerse al día» con 1 s de subpasos (solo el anfitrión hace eso). Hay que descartar el tiempo oculto.

### R1-B-F12 · faltante
- Juego en LAN (hermanos en la misma casa): los candidatos mDNS de Chrome y routers sin hairpinning pueden obligar a usar relé. Medir en el lobby y documentarlo.

### R1-B-F13 · faltante
- Safari como anfitrión: declararlo no soportado hasta probarlo, porque WebKit limita mucho las ventanas tapadas u ocultas. Como invitado, a medir en E10.

### R1-B-F14 · faltante
- Decisión explícita: ¿los DoT, marcas y estados ajenos cuentan para tus talentos (`hasDoT`, `burningCrit`, `killStatus`)? Hoy D14 solo cubre las marcas y la Escarcha.

### R1-B-F15 · faltante
- La sección de refutaciones (§13 y §14) la hizo el mismo autor tomando distintos roles. Esta revisión es la primera externa de netcode; conviene una segunda ronda externa sobre el protocolo v2 una vez incorporados estos cambios.

### R2-A-P11 · baja
- Dónde: §4 (`signInAnonymously`, `linkIdentity` con Google)
- Problema: Faltan cuatro cosas:
- El límite por defecto es de 30 por hora por IP (choca con el CGNAT).
- Supabase recomienda «strongly» un CAPTCHA o Turnstile.
- No hay limpieza automática de anónimos, que crecen hacia los 500 MB.
- `linkIdentity` exige activar «manual linking». El caso «esa cuenta de Google ya está vinculada a otro usuario» (el jugador se vinculó en otra PC) lo tiene que resolver la app.
- Arreglo propuesto: 1) Llamar a `signInAnonymously` solo cuando el jugador activa la nube o el ladder, no al abrir el juego.
2) Turnstile en ese momento.
3) Activar manual linking.
4) Flujo «ya tienes cuenta»: iniciar sesión en la existente y mostrar las dos tarjetas de §4.
5) SQL mensual que borre los anónimos de más de 30 días sin héroes.

### R2-A-P12 · baja
- Dónde: §4, migración («sincroniza cada 30 s y en pagehide»)
- Problema: En `pagehide` solo sobreviven `fetch(…, {keepalive: true})`, con un cuerpo de hasta 64 KiB en vuelo, o `sendBeacon`. `sendBeacon` no deja poner las cabeceras `Authorization`/`apikey` que exige PostgREST. El alijo puede pasar de 64 KiB.
- Arreglo propuesto: 1) `fetch` con keepalive solo para el héroe activo y si pesa ≤ 60 KiB (comprimido con `CompressionStream` si hace falta).
2) El alijo se sube en la sincronización de 30 s y al cerrar el panel del alijo.
3) Una marca «pendiente de subir» en localStorage, que se resuelve en el siguiente inicio.

### R2-A-P13 · baja
- Dónde: §3.3 (RTT y reloj por `PING` en `r`); §3.4 (tick estimado); §3.5.1
- Problema: El canal `r` es fiable y ordenado. Un paquete perdido bloquea a los que siguen hasta la retransmisión (RTO mínimo de 400 ms en dcSCTP), y los trozos de 16 KB también lo retrasan. Esas muestras inflan el RTT y desplazan el tick estimado, que decide las edades y las caducidades de §3.5.1.
- Arreglo propuesto: 1) PING/PONG en `u`, con secuencia y marcas de tiempo.
2) Estimar el RTT y el desfase con el mínimo de una ventana de 8–16 muestras (filtro tipo NTP).
3) Descartar las muestras por encima del p90.

### R2-A-P14 · baja
- Dónde: §3.8 (Worker, Supabase); regla de trabajo «push solo a preview»
- Problema: El dueño publica en preview. Un amigo en producción y otro en preview usarían el mismo Worker y las mismas salas con versiones distintas. Supabase necesita las URL de redirección de los dominios de preview, y la CSP cambia por entorno. Tampoco se comprueba el `Origin` del WebSocket, así que otra web puede gastar tu cuota desde el navegador de sus visitantes.
- Arreglo propuesto: 1) `env` (prod o preview) en el código de sala y en el saludo; el Worker no mezcla entornos.
2) Al abrir el WS, comprobar `Origin` contra una lista: dominio de producción, patrón de previews del proyecto en vercel.app y localhost:8080. No frena scripts, pero sí el uso desde otras webs.
3) URL de redirección con comodín en Supabase.

### R2-A-P15 · baja
- Dónde: §3.8 (flujo); §3.7 (reconexión)
- Problema: Si el WS del anfitrión se cae y vuelve, el diseño no dice cómo prueba ante el DO que es el anfitrión. Con solo el código, cualquiera que lo tenga podría reclamar el rol y aceptar, rechazar o expulsar.
- Arreglo propuesto: 1) Al crear la sala, el DO entrega un `hostToken` de 128 bits y guarda su hash en SQLite.
2) Aceptar, rechazar, expulsar y cerrar solo se admiten desde el socket marcado como anfitrión (`serializeAttachment`).
3) Cada invitado recibe un `rejoinToken` de un solo uso, que se renueva en cada reconexión.

### R2-A-P16 · baja
- Dónde: §3.8 (credenciales TURN)
- Problema: `generate-ice-servers` también devuelve URLs en el puerto 53, que los navegadores bloquean y terminan por tiempo de espera. Además, hay que conservar TURN por TLS en el 443 para las redes que solo dejan salir por ese puerto (~0,5 % de las sesiones).
- Arreglo propuesto: 1) Filtrar en el DO las URLs `:53` antes de entregarlas.
2) Conservar 3478/udp, 443/udp y 443 por TLS.
3) En R2, probar con UDP bloqueado.

### R2-A-P17 · baja
- Dónde: §3.8 («≈ 9.300 horas-invitado por relé, a ~30 KB/s»); R7
- Problema: Cloudflare cobra solo lo que sale del TURN hacia el cliente dueño de la asignación; lo que va al otro par no se cobra. Si el invitado va por relé, se paga más o menos su bajada (18–24 KB/s), no la suma de las dos direcciones. La cifra por invitado es conservadora, pero faltan dos cosas: el caso «Ocultar mi IP» del anfitrión (sus 3 enlaces por relé) y que un grupo de 4 tiene ~44 % de probabilidad de usar al menos un relé.
- Arreglo propuesto: Tabla de presupuesto con 3 casos (invitado por relé, anfitrión con IP oculta, ambos por relé) y alertas al 50 % y al 80 %. Con estas cuentas sigue cabiendo en los 1.000 GB.

### R2-A-P18 · baja
- Dónde: §9 F3 («El reloj del servidor detecta la cámara lenta»); tecnologia.md §7.3
- Problema: Un corte de Wi-Fi de 3 s hace que los ticks lleguen «más lentos que el reloj real» y anularía un intento honesto. Pero si se tolera la recuperación sin límite, se puede jugar en cámara lenta dentro del margen.
- Arreglo propuesto: 1) Regla explícita: `ticksRecibidos(t) ≥ 60·(t − t0) − holgura`, con una holgura acumulada de hasta 3 s por intento.
2) El tiempo oficial lo da el reloj del servidor.
3) Un corte de más de 10 s pausa el intento y lo marca para revisión.

### R2-A-P19 · baja
- Dónde: §9 F2 («grabación para revisar a mano»)
- Problema: Grabar instantáneas a 20 Hz durante 12 minutos son ~10–15 MB por intento. Con eso, el 1 GB de Supabase Storage y sus 5 GB de salida al mes se acaban en pocas decenas de intentos.
- Arreglo propuesto: 1) Grabar a 2 Hz las posiciones y los eventos (~1 MB por intento).
2) Guardar solo el top N de cada categoría.
3) Guardarlas en R2 (10 GB gratis, salida sin cobro).

### R2-A-P20 · baja
- Dónde: §3.8, tabla («Verificador del ladder: DO (el mismo Worker)»)
- Problema: Un despliegue reinicia todos los DO del mismo script. Arreglar la señalización cortaría intentos del ladder y viceversa, y la regla «no desplegar al cierre de temporada» bloquearía también la señalización.
- Arreglo propuesto: Dos Workers, `signal` y `verify`, con despliegues independientes. Las cuotas siguen siendo por cuenta.

### R2-A-P21 · baja
- Dónde: §4 (cuentas F2)
- Problema: Con cuentas se guardan datos personales (el correo de Google en `auth.users`) de jugadores de Chile, Argentina y Perú. La Ley 21.719 entra en vigor el 1-dic-2026 (hay un proyecto para aplazarla a 2027). El diseño no tiene aviso de privacidad, borrado de cuenta ni exportación.
- Arreglo propuesto: 1) Aviso de privacidad corto: qué se guarda y dónde (`sa-east-1`).
2) Botón «Borrar mi cuenta»: una Edge Function o una RPC con la clave secreta que borre al usuario y sus filas.
3) No copiar el correo a tablas propias.
4) Tener la URL de la política lista: Google la pide para publicar la app OAuth.

### R2-A-F1 · faltante
- Tabla de presupuesto de cuotas por recurso, con alertas al 50 % y al 80 %: peticiones del Worker y del DO al día, GB-s, GB de TURN al mes, base de datos, salida y MAU de Supabase, eventos de Workers Logs y los 5 Cron Triggers gratis. Debe anotar que todo se reinicia a las 00:00 UTC (21:00 en Chile en verano).

### R2-A-F2 · faltante
- Manual de operación:
- Secretos con `wrangler secret put`: clave de TURN, token de Analytics, clave secreta de Supabase y HMAC de los códigos.
- Rotación de esos secretos.
- Quién despliega el Worker y cómo, ya que no hay CI.
- Interruptor de emergencia y mensaje «multijugador en mantenimiento».

### R2-A-F3 · faltante
- Criterios de salida de R2 ampliados:
- TTL corto con renovación en mitad de la sesión.
- DO desalojado y redespliegue durante una sesión, y luego volver a unirse.
- Fuerza bruta de códigos sin agotar la cuota.
- UDP bloqueado (solo TURN-TLS en el 443).
- Anfitrión con `iceTransportPolicy: 'relay'` y 3 invitados.

### R2-A-F4 · faltante
- Versionado: protocolo de señalización y de juego compatibles con N−1, una «versión mínima» que publica el Worker, y `version.json` sin caché antes de entrar al lobby.

### R2-A-F5 · faltante
- Modo degradado documentado: qué ve el jugador cuando se agota la cuota diaria o cae el Worker (Trystero sin TURN, es decir, ≈ 18 % de los pares sin conexión), y cuándo vuelve el servicio.

### R2-A-F6 · faltante
- Decisión explícita sobre el medio de pago en Cloudflare: sin tarjeta hasta F3; con tarjeta, alerta de facturación. No hay techo de gasto en TURN.

### R2-A-F7 · faltante
- Limpieza: alarma del DO de sala con `deleteAll()`, borrado periódico de usuarios anónimos de Supabase y retención de las grabaciones del ladder.

### R2-A-F8 · faltante
- Respaldo de la nube a R2 con una prueba de restauración, y el flujo «esa cuenta de Google ya está vinculada» con prueba propia en E11.

### R2-A-F9 · faltante
- Telemetría agregada anónima: relé, fallos de ICE, tiempo de armado y RTT, con su línea en el aviso de privacidad.

### R2-A-F10 · faltante
- Separar entornos (prod y preview) en las salas, la CSP, el `Origin` permitido y las URL de redirección de Supabase.

### R2-B-P6 · media
- Dónde: §3.2 T2 («se repiten en cada paquete hasta su acuse»), §3.9 (subida del invitado de 6–8 KB/s), mockup («Lo urgente se repite en cada paquete»)
- Problema: Repetir cada urgente en **todos** los paquetes hasta el acuse multiplica la subida entre 4 y 12 veces (con RTT de 150–200 ms y hasta 60 paquetes/s). Además, un `HIT` por objetivo infla cada golpe de área: 30 enemigos × 16 B = 480 B por lanzamiento, repetidos en los paquetes siguientes. Eso llena los 1.100 B, desplaza el estado y deja la estimación de §3.9 muy corta. Gaffer, que es la fuente citada, reenvía como mucho cada 0,1 s, no en cada paquete.
- Arreglo propuesto: (1) Reenvío como mucho cada máx(50 ms, RTT/3), además de siempre en la siguiente instantánea. (2) Un mensaje `HITS` por lanzamiento: habilidad, elemento y banderas comunes, más n × (netId, fracción en `u16` logarítmica). (3) Los urgentes ocupan como mucho la mitad del paquete. (4) Rehacer §3.9 con el peor caso del banco (Maga con área sobre una manada de 60) y medirlo en R3.

### R2-B-P7 · media
- Dónde: §5.4 (ritmos: 120 tics/s, 60 HIT/s, 30 AID/s), §3.9 («30 enemigos ardiendo a 2 tics/s»). Código: timers.js (intervalos de 0,25–1 s), skills-maga.js:476 (0,25 s), campos de 0,5 s (skills-arquera.js:468, powers-maga.js:1846, skills-maga.js:92)
- Problema: Los topes son fijos e inferiores a la cadencia real del juego. Una Maga con quemadura y un campo de 0,5 s sobre 60 enemigos genera unos 240 tics/s; con la estela de 0,25 s, más. Un jugador honesto supera los 120 y lo descartan o lo marcan. Las cuentas de §3.9 dan por hecho 2 tics/s.
- Arreglo propuesto: Sacar los topes del banco GRUPO (peor caso por clase × 2) y versionarlos con el protocolo. Agrupar los `TICKS` por fuente e intervalo: un mensaje cada 0,25 s con n enemigos. Agrupar también el ritmo de `CC` y `DEB`. «Excedido» descarta sin alerta hasta 10 s sostenidos.

### R2-B-P8 · media
- Dónde: §3.4 (`tick` de 60 por segundo; el invitado manda su estimación), §3.6 (semifijo, ponerse al día, pausa), §3.3 (`PING` a 1 Hz por `r`)
- Problema: Con paso semifijo y dt variable (un subpaso por fotograma a 144 Hz), el «tick de 60 por segundo» no está definido. Tampoco lo está durante la pausa cooperativa ni en una recuperación de hasta 1 s, en que el tiempo del anfitrión salta. El RTT se mide con un `PING` a 1 Hz por el canal fiable y ordenado. Con pérdida, la retransmisión de SCTP (RTO mínimo de 400 ms en dcSCTP; Firefox puede usar usrsctp, con otros valores) infla las muestras, y la línea de interpolación hereda el error. `currentRoundTripTime` de `getStats` sale de las comprobaciones de consentimiento STUN (cada ~5 s): sirve para la interfaz, no para sincronizar el reloj.
- Arreglo propuesto: (1) `tick` = tiempo de **simulación** del anfitrión en unidades de 1/60 (o ms en `u32`); se detiene en la pausa. (2) RTT por acuses de `u`: guardar la hora de envío de cada seq, promedio móvil exponencial y filtro de mínimo. (3) Desfase de reloj con las muestras de RTT mínimo (estilo NTP) y corrección suave. (4) Si las instantáneas muestran un salto de tiempo (recuperación o reanudación), vaciar y rearmar el búfer de interpolación. (5) `PING` solo como respaldo.

### R2-B-P9 · media
- Dónde: §2.2 («El anfitrión lleva… anillo de 5 s»; «Quedarse = excursión»), §3.7 (viaje del grupo)
- Problema: El anfitrión cruza el portal y carga el mundo nuevo (sube la época) mientras los demás deciden durante 5 s. Durante esos 5 s nadie simula el mundo viejo en que siguen los invitados. «Quedarse» dice que pasan a «su propio mundo local», pero continuar ese mundo exige convertir réplicas en enemigos autoritativos, y las réplicas no tienen IA, `casting.run` ni temporizadores (cierres).
- Arreglo propuesto: Viaje **pendiente**: al tocar el portal, el anfitrión ve «esperando al grupo» y su mundo sigue simulándose hasta 5 s. La época sube solo cuando termina el anillo. Quien se queda recibe una **carga local nueva** de esa zona: misma semilla, más la lista de netId ya muertos o de cofres abiertos para no repoblar lo limpiado. Nunca se promueve una réplica a autoridad. Prueba en `net-sim`: «el anfitrión viaja mientras un invitado pelea».

### R2-B-P10 · media
- Dónde: §3.6 H3 («el mundo se congela, nadie recibe daño»), §3.7 (invitado: a los 5 s, pausa cooperativa)
- Problema: La pausa está definida solo para el mundo del anfitrión. En el modelo B cada dueño simula su héroe, sus DoT, sus campos, sus enfriamientos y sus bufos, y resuelve los `ATK` pendientes. Si estos siguen corriendo durante la pausa, los tics caducan (2 s), los bufos expiran, los proyectiles en vuelo golpean y, al reanudar, el estado está desfasado.
- Arreglo propuesto: Mensaje `pause{ep, tick}` por `r`: cada cliente congela su simulación (héroe, planificador, campos, `ATK` y `PROJ` pendientes) y muestra el reloj de arena. Luego `resume{tick, en 1 s}` con cuenta atrás y búferes rearmados. Un invitado que pierde al anfitrión 5 s congela también su propio héroe (invulnerable) y no sigue emitiendo reclamaciones. Prueba en `net-sim`.

### R2-B-P11 · media
- Dónde: §2.3 (cada cliente tira botín al recibir `KILL`), §2.6 (XP a ≤ 40 m), §3.4 (`KILL` sin posición), §3.6 (héroe ausente invulnerable), §2.4 (`n` = héroes presentes)
- Problema: (1) No está definido quién recibe botín: hoy cualquier `KILL` del mundo le da botín a cada cliente, esté donde esté. (2) Un héroe ausente (ventana minimizada) es invulnerable y su cliente sigue recibiendo `KILL` (los eventos de red no se frenan): basta minimizar al lado del anfitrión para farmear XP y botín sin riesgo. (3) El área de interés (35 m) es menor que el radio de XP (40 m) y `KILL` no trae posición: el cliente no puede medir la distancia a un enemigo que no tiene replicado. (4) `n` contaría a los ausentes y endurecería el mundo por un jugador ausente.
- Arreglo propuesto: El anfitrión decide quién recibe: `KILL` con `u8 máscara de slots elegibles` (≤ 40 m, presentes, no ausentes, con entrada en los últimos 30 s) y `u16 x · u16 z`. Botín y XP solo para los elegibles. `n` excluye a los ausentes. Prueba «un ausente no gana nada».

### R2-B-P12 · media
- Dónde: §3.4 (registro de héroe: «Sus posiciones llevan el tick… estimado por su dueño»), §3.5.1 («los héroes de dos saltos se extrapolan ≤ 100 ms»)
- Problema: (1) El registro de héroe no tiene campo de tiempo. Al reenviarlo dentro de la instantánea del anfitrión, se pierde el tick de su dueño. (2) Un aliado de dos saltos llega con ½RTT_B + hasta 50 ms de espera (la siguiente instantánea) + ½RTT_A. La línea de vista solo deja 100 ms de margen tras ½RTT_A: con RTT_B ≥ 150 ms el margen es negativo y el aliado va **casi siempre extrapolado**. Los aliados son lo que más se mira en un cooperativo.
- Arreglo propuesto: Añadir `u8 Δtick` (respecto del tick de la cabecera) a cada registro de héroe reenviado. Elegir una de dos y medirla en `net-sim`: (a) reenviar los registros de héroe como paquete inmediato al recibirlos (unos 40 paquetes/s más de subida para el anfitrión con 3 invitados), o (b) una segunda línea para los héroes de dos saltos, ½RTT_B + 50 ms más atrás, aceptando el pequeño desorden con lo que causan.

### R2-B-P13 · media
- Dónde: §3.5.1 y D17 («el ATK llega dentro de la preparación hasta con 300 ms de RTT»), §3.5 («dispara la animación del atacante con el ATK»)
- Problema: (1) Con 300 ms de RTT, ½RTT = 150 ms, que es toda la preparación, así que el `ATK` llega cuando el golpe ya se resuelve. A eso se suma el retardo del fotograma o del bombeo del anfitrión (16 ms visible; hasta 50 ms tapado con un invitado), así que la preparación visible es nula desde unos 200–250 ms. (2) El atacante se dibuja en tu línea de interpolación (100–250 ms atrás): lo ves a 1–2 m cuando te pega («golpe a distancia», la queja clásica del desync en los ARPG). Disparar la animación no lo arregla si la posición sigue vieja.
- Arreglo propuesto: (1) Corregir el texto de D17 a «hasta ~200 ms». (2) **Preparación adaptativa por víctima remota:** 150 ms + mín(½RTT_víctima, 100 ms). La cadencia (`atkTime`) no cambia y el daño por segundo se compensa en el banco. (3) Mientras un enemigo te ataca, su réplica vive en **tu presente**: se desliza hacia la posición del `ATK` durante la preparación y vuelve a la línea de interpolación al terminar.

### R2-B-P14 · media
- Dónde: §3.3 y §3.5 (`PROJ`: «cada cliente comprueba solo a su héroe»). Código: entities.js:3170-3183 (el proyectil enemigo se elimina al tocar al jugador)
- Problema: Los proyectiles enemigos no perforan: desaparecen en el primer héroe que tocan. Si cada cliente solo comprueba a su héroe, en el cliente de Beto el proyectil que ya golpeó a Ana sigue de largo y puede golpearlo también. En la práctica perforan a los aliados: un tanque ya no puede cubrir a la maga y aparecen dobles golpes que en solitario no existen.
- Arreglo propuesto: Urgente `PROJX{id, consumido, slot}` de la víctima a todos (vía anfitrión): los demás lo borran al llegar, aceptando la ventana de ½RTT. O bien una regla explícita, «los proyectiles enemigos atraviesan aliados», decidida por el dueño. Una prueba en `net-paso2` para cualquiera de las dos.

### R2-B-P15 · media
- Dónde: §3.3 (no hay clase para auras ni espinas enemigas). Código: entities.js:2721-2734 (aura ardiente: daño cada 0,5 s a < 2 m; aura de escarcha: ralentiza a < 2,6 m), data.js:283 y entities.js:1717-1718 (afijo Espinoso: refleja el 20 % al héroe que pega)
- Problema: El daño y la ralentización por cercanía a un enemigo, y el reflejo de Espinoso, no tienen mensaje ni clase de tiempo. Si los resuelve la víctima contra la réplica interpolada, mide con una posición vieja. Si los resuelve el anfitrión, sería un `ATK` cada 0,5 s por enemigo. Espinoso depende del daño absoluto de tu golpe sobre tu vista.
- Arreglo propuesto: Clasificarlos explícitamente:
- **Auras:** las resuelve la víctima contra la posición **dibujada** («lo que ves te quema»), a favor del que defiende, con el afijo conocido por `SPAWN`.
- **Espinoso:** lo calcula el atacante en local, con su daño de vista.

Agregarlos a `net-contrato` y a `net-paso2`.

### R2-B-P16 · media
- Dónde: §3.2 T5–T7, §3.9, §8 (R3: 5 % de pérdida)
- Problema: El control de congestión de SCTP también se aplica a los canales no fiables. Con la fórmula de Mathis (ancho ≈ 1,22 × MSS ÷ (RTT × √pérdida)), 5 % de pérdida y 200 ms de RTT dan unos 32 KB/s por asociación: justo el tope de bajada de §3.9. Con pérdida de Wi-Fi, las colas crecen y las instantáneas se descartan. Además, SCTP acusa cada paquete DATA (un SACK cada 2 paquetes o cada 200 ms), y esos 30–60 SACK/s por sentido (~3–6 KB/s) no están en las cuentas.
- Arreglo propuesto: (1) Que R3 mida 2 % y 5 % de pérdida con 150 y 200 ms de RTT al tope de 32 KB/s, mirando `bufferedAmount` y la ventana de congestión en `webrtc-internals`. (2) **Adaptación automática:** si crece `bufferedAmount` o la pérdida medida, bajar a 15 Hz, achicar el área de interés y bajar la prioridad de los quietos. Hoy es solo un interruptor manual. (3) Compresión delta contra la última instantánea acusada (Gaffer) para el modo «subida baja». (4) Sumar los SACK a §3.9.

### R2-B-P17 · media
- Dónde: §3.2 T4 («lo grande… solo en momentos sin combate»), §3.7 (unión tardía con todos los `SPAWN`, campos-sombra y héroe de 3–11 KB)
- Problema: La unión tardía, la vuelta de excursión y la reconexión ocurren justo mientras los demás pelean: «solo sin combate» no se puede cumplir. dcSCTP sin intercalado programa por turnos mensaje a mensaje (WFQ solo con intercalado), así que un trozo de 16 KB ocupa la asociación entera. Además, la subida del anfitrión es **una sola** para las 3 asociaciones: 16 KB a 0,5 Mbps son unos 256 ms de cola que también retrasan las instantáneas de los otros invitados.
- Arreglo propuesto: Trozos ≤ 1.100 B con un ritmo global del anfitrión (≤ 25 % de la subida medida), regulado con `bufferedAmountLowThreshold`. A los demás invitados se manda solo un **perfil** del recién llegado (≤ 1 KB: clase, especialización, nivel, apariencia); el guardado completo va solo al anfitrión, que lo necesita para `recompute()`. Eso de paso cuadra con «no expone su equipo» de §2.3.

### R2-B-P18 · media
- Dónde: §3.6 H1 («con 3 invitados a 20 Hz son 60 bombeos por segundo»), §11 E0 (R1: «≥ 55 ticks/s»)
- Problema: H1 depende de que los invitados manden. En el caso más común, 2 jugadores, hay un solo invitado: unos 20–25 bombeos/s. Los `ATK` y las instantáneas quedan cuantizados a 50 ms (se comen la preparación de D17). Si ese invitado también tapa su ventana, su envío cae a 1 Hz y el mundo del anfitrión se para. El criterio de R1 no dice con cuántos invitados se mide ni qué es un «tick».
- Arreglo propuesto: (1) **H1b: metrónomo en un Dedicated Worker** (`setInterval(16)` → `postMessage`), al estilo de `worker-timers`, como bombeo independiente de los invitados; medirlo en R1 en Chrome, Edge y Firefox. (2) Criterio de R1 con **1 invitado**: segundos simulados por segundo real ≥ 0,98, hueco máximo entre bombeos ≤ 60 ms y p95 del jitter de instantáneas ≤ 20 ms.

### R2-B-P19 · media
- Dónde: §3.8 (credenciales TURN con TTL de 2 h, revocadas al cerrar; «se dejan de emitir a ~800 GB»), tecnologia.md §5.2 («[sin verificar] API de consumo»)
- Problema: Cloudflare recomienda que el TTL **supere el uso esperado** (su ejemplo es de 86.400 s) y renovar con `setConfiguration`. Una sesión de ARPG pasa de 2 h fácilmente, y cualquier `restartIce()` posterior al vencimiento no podrá juntar candidatos de relé. Qué pasa con una asignación activa al vencer o al revocar no está documentado. Por otro lado, la API de consumo sí existe: el GraphQL de analítica de TURN.
- Arreglo propuesto: TTL ≥ 8–12 h (tope en el DO). Antes de cualquier `restartIce()`, el DO entrega credenciales nuevas y el cliente llama a `setConfiguration`. Revocar al expulsar o cerrar. R2 prueba el vencimiento y la revocación sobre una asignación viva. Para el tope mensual: Cron que consulta `callsTurnUsageAdaptiveGroups` (`egressBytes`) con un token «Account Analytics» y etiqueta cada sala con `customIdentifier`.

### R2-B-P20 · media
- Dónde: §3.4 (`GONE` con motivo «fuera de interés» y `SPAWN` al volver), §7 (marcas, Escarcha y DoT del dueño). Código: powers-maga.js:472 (Set `F.on` de enemigos), powers-arquera.js:2659 (Map `st.rt`), timers.js (DoT por objeto)
- Problema: El estado del dueño se indexa por la **identidad del objeto** enemigo (Sets y Maps de poderes, marcas, DoT en el planificador). Si una réplica sale del área de interés (35 m, cerca de una pantalla y media) y se destruye, al volver llega un `SPAWN` que crea otro objeto. Se pierden tu Escarcha, tus marcas y tus DoT sobre ese enemigo, sin aviso.
- Arreglo propuesto: Un pool de réplicas indexado por `netId` dentro de cada época. `GONE{fuera de interés}` deja la réplica **latente** (oculta, sin destruir) al menos 10 s, y un `SPAWN` posterior reutiliza el mismo objeto. Solo `KILL` y `GONE{desaparece}` la destruyen. Prueba «alejarse a 40 m y volver conserva la Escarcha».

### R2-B-P21 · baja
- Dónde: §5.3 (CSP: `connect-src` solo a Cloudflare y Supabase), §3.8 (Trystero con Nostr de respaldo), §3.6 H2
- Problema: La CSP propuesta bloquea el respaldo de señalización: Trystero con Nostr abre WebSockets a relés públicos (`wss://…`). Tampoco declara `worker-src` para H2 ni para el metrónomo.
- Arreglo propuesto: Listar en `connect-src` los relés de Nostr elegidos (versión fijada de Trystero) o aceptar que el respaldo no corre bajo CSP. Añadir `worker-src 'self'`. Probar en modo `report-only` que la sala por Nostr se arma.

### R2-B-P22 · baja
- Dónde: §8 («`?net=local`: dos pestañas por BroadcastChannel»)
- Problema: Dos pestañas del mismo origen comparten `localStorage`: `intentorpg_save_slot*` e `intentorpg_stash` se pisarían entre anfitrión e invitado, con riesgo de perder el alijo del dueño mientras prueba. Además, dos pestañas de la misma ventana dejan una oculta (frenada), y dos ventanas que se tapan activan la oclusión.
- Arreglo propuesto: `?net=local&perfil=b` antepone un prefijo a todas las claves de guardado (o desactiva el guardado en la segunda). Probar con dos ventanas que no se superpongan. Documentarlo en el panel `?netdebug`.

### R2-B-P23 · baja
- Dónde: §3.2 (presupuesto verificado solo con el dcSCTP de Chrome), §10 R3
- Problema: Firefox tiene hoy dos implementaciones de SCTP en su árbol (`DataChannelUsrsctp` y `DataChannelDcSctp`), con otros valores por defecto (RTO, MTU, intercalado). R3 solo prueba Chrome, así que un grupo mixto puede comportarse distinto.
- Arreglo propuesto: R3 y E10 con pares mixtos Chrome↔Firefox y Edge↔Firefox; registrar en `?netdebug` el navegador de cada par.

### R2-B-P24 · baja
- Dónde: §3.8 (NAT), §10 R7, E10
- Problema: Dos amigos en la **misma casa** dependen de los candidatos mDNS. Si no se resuelven, sin hairpinning en el router la conexión cae al relé. Desde junio de 2025, Chromium además pide permiso de acceso a la red local (LNA) para los candidatos locales, lo que puede mostrar un aviso o bloquear la vía directa.
- Arreglo propuesto: Agregar «2 PCs en la misma red» a la matriz de E10. Medir el tipo de candidato. En el lobby, un icono que explique el aviso de red local.

### R2-B-P25 · baja
- Dónde: §3.8 (Worker + DO, `wrangler.toml`), §3.8 (el DO hiberna)
- Problema: En el plan gratis solo hay DO con SQLite: la clase debe declararse en `new_sqlite_classes`, o con el campo `exports` del 30-jun-2026. Además, el WebSocket del anfitrión con el DO necesita un latido de aplicación respondido por `setWebSocketAutoResponse`, para no despertar al DO ni caer por inactividad.
- Arreglo propuesto: Plantilla de `server/signal/` con la clase SQLite, la respuesta automática al ping y un latido del cliente cada 30 s; probarlo en R2.

### R2-B-P26 · baja
- Dónde: §3.5 (muerte prevista: «o llega con otro golpe final, se revierte: la réplica vuelve»), afijos `cadenas` y `escudado` (entities.js:2866-2881; data.js)
- Problema: Si el `KILL` llega con otro golpe final, el enemigo **sí** murió: solo deben revertirse tus efectos «al matar» adelantados, no la réplica. Además, Cadenas reparte la vida entre la manada y los inmunes no reciben daño: la predicción del número y de la muerte fallaría con ellos.
- Arreglo propuesto: Separar los dos casos de reversión en el texto y en `net-sim`. Excluir de la predicción de muerte a los encadenados, y de la predicción del número a los inmunes o escudados.

### R2-B-P27 · baja
- Dónde: §3.8 (TURN por UDP, TCP o TLS en el 443), §2.9 (iconos de conexión)
- Problema: Cuando el relé va por TCP o TLS (redes que bloquean UDP; Hancke midió ~0,5 % que solo funciona así), el canal no fiable queda detrás de TCP: bloqueo de cabeza de línea y picos de latencia, aunque `maxRetransmits` sea 0.
- Arreglo propuesto: Detectar el `relayProtocol` del candidato local en `getStats` y mostrar un icono de «relé lento». Incluirlo en R2.

### R2-B-P28 · baja
- Dónde: Mockup (R3: «Pasa si: ninguna reclamación tarda más de 100 ms extra»), §11 (E6 de 9–10 d-t, E9 de 6–7 d-t)
- Problema: «Ninguna» no se puede cumplir con 5 % de pérdida aleatoria; hace falta un percentil. Las estimaciones de E6 y E9 no incluyen los arriendos, la vista de juego, la reconciliación, la máquina de viaje y pausa ni el lint de escrituras.
- Arreglo propuesto: R3: p99 ≤ 100 ms de demora adicional y 0 reclamaciones perdidas. Sumar unos 3–5 d-t a F1 (E6 +2, E9 +2, E3 +1 por el lint y la API de escrituras).

### R2-B-F1 · faltante
- Arriendos de estado continuo: los Debilidad, ralentizaciones y Presas que se refrescan por tic viajan como estado renovado a 20 Hz en el registro del dueño, no como urgentes. Clasificar cada `onTick` y cada `tick` de campo por si toca el mundo.

### R2-B-F2 · faltante
- Lint de F0 contra escrituras directas a campos de `Enemy` desde el código del héroe, y API equivalentes (`applyVuln`, `applyNumb`, `dragWith`), con `DISP{arrastre}` para la carrera del Guerrero.

### R2-B-F3 · faltante
- Dos vistas de la réplica: render (interpolada) y juego (último dato más tus predicciones de control y debilitamiento con vencimiento). Declarar que los poderes leen solo la de juego.

### R2-B-F4 · faltante
- Reconciliación de la barra de vida (y de la muerte prevista) con los acuses: vida autoritativa menos tus golpes pendientes.

### R2-B-F5 · faltante
- Máquina de estados de viaje pendiente (el anfitrión espera el anillo de 5 s) y del mensaje `pause`/`resume`, que congela la simulación de cada dueño.

### R2-B-F6 · faltante
- Elegibilidad de recompensas decidida por el anfitrión: máscara de slots y posición en `KILL`, nada para ausentes ni inactivos, y `n` sin ausentes.

### R2-B-F7 · faltante
- Política del ciclo de vida de la pestaña: Edge (pestañas dormidas y ahorro de energía), Ahorro de memoria de Chrome, Web Lock, `freeze`/`resume`/`wasDiscarded`, y ayuda en el lobby para fijar la pestaña.

### R2-B-F8 · faltante
- Metrónomo en un Worker (H1b) y R1 medido con 1 solo invitado y con Edge.

### R2-B-F9 · faltante
- Adaptación automática de la tasa (congestión de SCTP) y compresión delta contra la instantánea acusada. Cuentas con SACK y redundancia real.

### R2-B-F10 · faltante
- Reloj definido como tiempo de simulación, RTT por acuses de `u`, desfase por RTT mínimo y rearme del búfer ante saltos de tiempo.

### R2-B-F11 · faltante
- `Δtick` en los registros de héroe reenviados y una política para los héroes de dos saltos (reenvío inmediato o segunda línea).

### R2-B-F12 · faltante
- Pool de réplicas por `netId` con estado latente al salir del área de interés.

### R2-B-F13 · faltante
- Mensaje de proyectil consumido (`PROJX`) o una regla explícita de que atraviesan aliados.

### R2-B-F14 · faltante
- Clases de tiempo para auras enemigas por cercanía y para el reflejo de Espinoso.

### R2-B-F15 · faltante
- Ritmo global de subida del anfitrión para las uniones, vueltas y reconexiones en combate. Perfil liviano del recién llegado para los demás invitados.

### R2-B-F16 · faltante
- TTL de TURN mayor que la sesión, renovación antes de `restartIce`, y consumo por GraphQL (`callsTurnUsageAdaptiveGroups`) con `customIdentifier` por sala.

### R2-B-F17 · faltante
- Matriz de pruebas en vivo: Edge, pares mixtos Chrome↔Firefox, misma red local (mDNS y LNA), relé por TCP o TLS, sesión de más de 2 h y anfitrión tapado con 1 invitado.

### R2-B-F18 · faltante
- Botón «copiar diagnóstico» al cerrar la sesión (resumen de `getStats` y métricas propias en JSON) para calibrar E10 sin backend.

### R2-B-F19 · faltante
- Prefijo de guardado por perfil en `?net=local`, para no pisar `localStorage` en las pruebas de dos pestañas.
