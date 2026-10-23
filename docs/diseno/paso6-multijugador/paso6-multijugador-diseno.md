# Paso 6 · Cooperativo de 2 a 4 en navegador — Diseño

**Fecha:** 22 de octubre de 2026 · **Versión:** v5.2 (22-oct-2026). Sobre la v5 hubo una pasada **v6 a medias**: los cambios marcados «v6» en el cuerpo son de esa pasada, que se detuvo antes de terminar y no dejó su `refutaciones/trazabilidad.md`. La v5.1 atiende las 15 objeciones altas que no habían llegado (§13.0) y marca las decisiones que aprobó el dueño. La **v5.2** corrige las 4 que el experto marcó **insuficientes** al verificar la v5.1, y sus notas (§13.0, «Tras la verificación»).
**Rama leída:** `paso2-impl` @ `4095ab6` (solo lectura). **Regla de carga:** no se corrió nada pesado.
**Base:** `investigacion/tecnologia.md` y `investigacion/codigo.md` (ya refutados), los informes del frente de ítems (`diseno-items/investigacion/arpg.md` §7.12 y `ux.md` §3.12) y búsquedas nuevas sobre cómo resuelven el grupo D4, PoE2 y Last Epoch (§15).
**Marcas:** [V] verificado en fuente primaria o en el código · [S] fuente secundaria o resumen de buscador · [D] deducción mía · [M] a medir en un prototipo.
**Sobre las refutaciones:**
- **Aviso honesto:** en las rondas anteriores el texto de los expertos le llegó al corrector **recortado** (de 221 objeciones y faltantes vio completas 31, 3 a medias y 187 no las vio). En la v5.1 ya están atendidas **las 15 de gravedad alta**, una por una contra este texto y el código: ver `refutaciones/trazabilidad-altas.md` y §13.0. El experto que las escribió verificó la v5.1 (`refutaciones/verificacion-altas.md`): 9 bien, 2 discrepancias aceptadas y 4 insuficientes, que la v5.2 corrige. **Siguen sin atender 172 de gravedad media o baja** (lista en `refutaciones/no-vistas.md`; textos íntegros en `refutaciones/*.json`): puede que el cuerpo ya resuelva algunas por otro camino, pero no está verificado una por una.
- **Decisiones:** el dueño aprobó el 22-oct **todas las recomendadas** (D1–D19 y D21 en §12, y las preguntas de §14). Queda **una** pregunta abierta: el choque entre D22 (escrita por la pasada v6) y D3 aprobada (§12, §14 #13).
- §13.1 es la **ronda 2**: un experto en netcode (28 objeciones: 5 altas, 15 medias y 8 bajas) y uno en backend e infraestructura (21: 2 altas, 8 medias y 11 bajas). Los dos aprueban con correcciones. Releí en el código cada línea que citan y en las fuentes primarias las cifras de Chrome, Edge, Cloudflare y Supabase.
- §13.2 es la ronda 1 (netcode y autoridad del Paso 2; la parte de backend de esa ronda **no** llegó al corrector: ver `refutaciones/no-vistas.md`).
- §13.3 y §13.4 son las dos autorrefutaciones previas, con la mirada de cuatro especialistas: netcode en navegador, diseño cooperativo e itemización, infraestructura y seguridad web, y UX de juego de PC.
- Donde discrepo, lo digo con la razón y la fuente.

---

## 0. En un minuto

1. **Autoridad repartida (modelo B).** Tu cliente manda en **tu héroe**: tus habilidades y el daño que recibes van a 0 ms, carga perfecta incluida. El **anfitrión manda en el mundo** (enemigos, IA, apariciones, muertes, cofres, viajes). Nada de lockstep. El canal de habilidades del Paso 2 **no se reescribe**. Lo que depende del mundo (la muerte confirmada, tu botín, tu XP) llega en 1 RTT, pero la muerte se **ve** al instante como «muerte prevista» (§3.5).
2. **Regla de oro:** *lo que le pasa a tu héroe lo resuelve tu cliente; lo que le pasa al mundo lo resuelve el anfitrión.* Golpes, control, desplazamientos y amenaza viajan como **reclamaciones** al anfitrión; daño recibido, curas, escudos y auras viajan como **efectos** al dueño del héroe. Los campos del héroe que mueven, frenan o debilitan enemigos (muros, encierros, cebos, estelas, la carrera con arrastre) tienen un **campo-sombra** en el anfitrión, que se **actualiza** cuando el campo cambia después de nacer (crece, se alarga, se mueve o gana un efecto).
3. **Lo que aplicas cuenta ya en tu cliente.** Cada réplica de enemigo tiene dos vistas: la de **dibujo** (interpolada) y la de **juego** (lo último del anfitrión más tu control, tus debilitamientos y tus golpes aún sin confirmar). Los talentos leen la de juego: «congelo y disparo» da el crítico al instante, y la barra de vida no rebota.
4. **La vida de los enemigos viaja como fracción (0–1) y el daño en dos factores.** Tu parte (arma, crítico, multiplicadores) la calcula tu cliente; la del objetivo (Debilidad, Vulnerable) la pone el anfitrión al recibir el golpe. Con la fracción salen casi gratis el escalado por número de jugadores, que **cada uno vea a los enemigos a su nivel** (como D4) y una amenaza justa entre niveles distintos.
5. **WebRTC en estrella**, con **2 canales**: `u` no fiable y `r` fiable (unión, chat, viajes, regalos).
   - `u` lleva instantáneas a 20 Hz de ≤ 1.100 B, con acuse, **época del mundo** y **caducidad**, más los urgentes, que se repiten cada ~50 ms hasta su acuse.
   - Si el acuse no llega, solo los urgentes **de vida larga** (golpes, muertes, apariciones, campos, curas) pasan al canal fiable, con su **hora de nacimiento**. Los de vida corta (ataques enemigos, control, lanzamientos) caducan sin pasar nunca por `r`: un corte de Wi-Fi no puede soltar después un golpe viejo.
   - Lo que dura y se refresca (Debilidad, ralentizar, Vulnerable) viaja como **arriendo**: un estado que tu cliente publica en cada paquete de estado (20 por segundo), nunca un mensaje por fotograma.
   - **El reloj** es el tiempo de simulación del anfitrión, medido con los acuses de `u`.
   - **Regla de tiempo:** lo que te ataca se resuelve en tu presente; lo que observas se dibuja en una sola línea, 100–250 ms en el pasado (§3.5.1).
6. **Señalización y credenciales TURN en un Worker + Durable Object de Cloudflare** (US$0 a este volumen): estado de la sala en la SQLite del DO, códigos de sala firmados, credenciales TURN de 24 h con renovación, **revocación por sala si su consumo se dispara** y un tablero de cuotas (§3.8, §3.10). Respaldo: Trystero (Nostr) sin TURN si el Worker falla, como dice D3 aprobada. ⚠ **Conflicto abierto:** la pasada v6 había escrito aquí «sin respaldo P2P en F1: Trystero queda como plan C documentado (D22)», que choca con D3; rige D3 hasta que el dueño responda (§14 #13). Vercel sigue sirviendo el juego estático. **Supabase solo llega con las cuentas (F2)**, con permisos por columna, topes de tamaño y copias en R2.
7. **Botín personal e instanciado** (nadie ve ni pelea tu botín), sembrado por `(semilla, héroe, enemigo)`: no viaja por la red. **El anfitrión decide quién gana** XP y botín: los que estaban cerca y presentes. Un héroe ausente no gana nada. Regalos solo dentro del grupo, como pide el frente de ítems.
8. **Escalado:** solo la **vida** sube con el grupo (por rango), el daño enemigo no (regla de Last Epoch y PoE2). Revivir como D4: lápida, 3 s de canal, fantasma invulnerable al volver.
9. **Un mundo de combate por grupo** (el del anfitrión). Si el anfitrión cruza un portal, su mundo **espera 5 s al grupo** antes de viajar; quien no lo sigue se va **de excursión en solitario** (una carga nueva de esa zona) y vuelve con «Unirse al grupo».
10. **Cada receptor valida lo que recibe**, no solo el anfitrión: números finitos, rangos y topes por tipo y por segundo, sacados del peor caso del banco GRUPO. Si un jugador legítimo pasa un tope, se descarta lo que sobra y no se lo expulsa. El guardado se niega a escribir un héroe con valores no finitos (§5.4).
11. **Bloqueantes, con prototipo antes de F1 (E0):**
    - el anfitrión con la ventana tapada, minimizada, la pestaña oculta o la pantalla bloqueada, medido con **1 solo invitado** y con un metrónomo en un Worker;
    - la **pestaña dormida o descartada** (Edge, Ahorro de memoria de Chrome);
    - el presupuesto de SCTP con pérdida;
    - la sala y el TURN cuando el DO se reinicia o la credencial vence.
12. **Fases:** F0 cimientos sin red (≈ 16,5–18,5 días-trabajador) → F1 cooperativo P2P (≈ 36–38, más 6,5 de prototipos) → F2 cuentas, nube y ladder «de honor» (≈ 11–13) → F3 ladder verificable (verificación en sombra) → F4 opcional (anfitrión único, ladder de grupo).

---

## 1. Objetivos y alcance

### 1.1 Qué tiene que lograr la v1 (F1)
| Meta | Cómo se mide |
|---|---|
| Jugar de 2 a 4 amigos desde el navegador, sin instalar nada | 4 jugadores (Chile, Argentina, Perú o simulados) juegan 1 hora sin muertes fantasma ni dobles créditos |
| Tus habilidades se sienten igual que en solitario | 0 ms en tus habilidades y en el daño que recibes; la muerte de un enemigo se ve al instante (prevista) y se confirma en 1 RTT; el banco en solitario y el humo no cambian de banda |
| Lo del mundo se siente bien hasta 150 ms de RTT y aceptable hasta 200 | Pruebas con latencia artificial (`net-sim` y E10). La cifra de Last Epoch («up to 200 ping») es solo una referencia: sale de un blog de desarrollo de julio de 2021, anterior al lanzamiento [S]; la meta la validan nuestras pruebas, no esa cita |
| Unirse con pocos clics | Enlace o código → elegir héroe → el anfitrión acepta: **3 acciones** |
| Cero costo fijo | Todo en planes gratis no comerciales (proyecto no comercial); alertas al 50 % y al 80 % de cada cuota (§3.10) |
| Robusto ante lo cotidiano | Anfitrión tapado por otra ventana, minimizado o con la pantalla bloqueada 5 minutos **con un solo invitado**, pestaña del anfitrión oculta 30–60 min en Chrome y en Edge, un invitado que se cae y vuelve, una sesión de **más de 2 h** con un enlace por relé |

### 1.2 Qué entra y qué no
| Entra en F1 | Queda para después |
|---|---|
| Grupo de 2 a 4 entre amigos, por código o enlace | Emparejamiento con desconocidos (F4: exige anfitrión único o servidor) |
| Botín personal y regalos dentro del grupo | Comercio libre (no se planea: rompe la economía y nada local es de fiar) |
| Escalado de vida por grupo y por nivel | Migración del anfitrión (si se va, termina la sesión) |
| Revivir aliados, lápidas, punto de control | Voz (Discord cumple) |
| Campamento, Refugio, zonas, mazmorras y grietas en grupo | Ladder de grupo verificable (F4) |
| Señales en el mundo (pings) y chat corto | Cuentas y nube (F2), ladder (F2/F3) |
| Héroes **abiertos** (los locales de hoy) | Héroes de temporada en el servidor (F3/F4) |

### 1.3 Principios de diseño
1. **Lo tuyo es instantáneo.** Nada que dependa de tu mano espera a la red.
2. **El mundo es uno.** Un solo dueño decide muertes, apariciones y cofres: no hay dobles créditos.
3. **Nada que se pueda calcular viaja.** Botín, terreno y números de daño se calculan en cada cliente con semillas.
4. **Visual antes que texto** (preferencia del dueño): iconos y anillos para «con retraso», «anfitrión ausente», «seguir», «revivir»; barras sin números en el HUD.
5. **El solitario no cambia.** Cada pieza de F0 se comprueba con el banco y el humo en solitario.

---

## 2. La experiencia en grupo (decisiones de juego)

### 2.1 Sala y unión: las hogueras
El menú ya prepara la metáfora (`docs/paso-frontend-menus.md` §(a)–(c)): «otras hogueras aún no arden». En el Paso 6 **se encienden**.

1. **Encender hoguera** (crear sala): el anfitrión elige héroe → ve un código de 8 caracteres (`K7QM-3XRD`, base32 de Crockford, sin letras ambiguas) y **Copiar enlace** (`…/#sala=K7QM3XRD`). **v6:** el código va en el **fragmento** (`#`), no en la consulta (`?`): el fragmento no viaja al servidor (no queda en los registros de Vercel ni en el `Referer`) y no forma parte de la clave de caché del service worker, que hoy guarda cada URL con su consulta (`caches.match(e.request)`, `sw.js:390`) [V]. Se lee con `location.hash`.
2. **Unirse:** el amigo abre el enlace (o escribe el código) → elige héroe → espera.
3. **Aceptar:** al anfitrión le aparece una tarjeta con el emblema de la especialización, el nombre y el nivel: **Aceptar / Rechazar / Bloquear** (bloquear = ese navegador no puede volver a pedir entrada en esta sala). El nombre de la tarjeta es un dato de un desconocido **antes** de aceptarlo: se pasa por `sanitizeHeroName` y se pinta con `textContent`. Al aceptar, una de las tres hogueras lejanas se enciende con el color de esa especialización.
4. **Datos visibles en el lobby, sin texto largo:** latencia (barras), tipo de conexión (directa / por relé), Tormento del mundo, nivel de cada uno.

Selector **Solo | Grupo** de la selección de personaje (hoy bloqueado): se activa. Un héroe **Hardcore** solo entra en salas Hardcore (precedente de los reinos separados de D2 y D4).

**Safari (v6):** como invitado se prueba en E10. Como **anfitrión** queda deshabilitado hasta que E10 lo apruebe: WebKit frena mucho las ventanas ocultas o tapadas y no hay datos (R13). En Safari, «Encender hoguera» aparece apagado con un icono que sugiere Chrome, Edge o Firefox.

### 2.2 Mundo compartido, viajes y excursiones
**Hallazgo nuevo (corrige a los dos informes):** el «pueblo» real **no** es `buildTown()`. Es el **campamento dentro de la zona de la Cripta** (`townPocket`, `zones.js:236-244`, con su decoración sembrada); `travelTo('town')` carga esa zona (`game-world-flow.js:79`). `buildTown()` solo lo usan tests viejos (`tests/test.mjs`, `test4`, `test8`, `test9`). Lo que de verdad hay que sembrar en F0 es **el Refugio** (`buildRefuge`, 10 cristales con `Math.random` que bloquean celdas). [V]

Consecuencia: el campamento ya es parte de un mundo de combate (la Cripta, con zona segura), así que **es compartido de forma natural**.

| Regla | Detalle |
|---|---|
| **Un mundo de combate por grupo** | El del anfitrión. Las zonas, mazmorras, grietas y el Refugio que el anfitrión carga son «el mundo del grupo». |
| **El anfitrión lleva (viaje pendiente)** | Cuando el anfitrión cruza un portal, un punto de ruta o un camino, **su mundo sigue simulándose** y él ve «esperando al grupo». Los que están en su mundo ven un **anillo de 5 s** con el destino («Seguir» por defecto, Esc = quedarse). El viaje ocurre cuando termina el anillo o cuando todos eligieron; el anfitrión puede cancelarlo con Esc. La máquina de estados está en §3.7. |
| **Quedarse = excursión** | Quien no sigue, o quien viaja por su cuenta, recibe una **carga local nueva** de esa zona: la misma semilla, más la lista de enemigos ya muertos y de cofres ya abiertos, para no repoblar lo limpiado. Es el solitario de hoy, con su escalado normal. **Nunca se convierte una réplica en enemigo de verdad** (las réplicas no tienen IA, lanzamientos ni temporizadores). Sigue en la sala: chat y marcos de grupo («de excursión · Refugio»). |
| **Volver** | «Unirse al grupo» en su marco (o en un punto de ruta): carga el mundo del anfitrión con la unión tardía (§3.7) y aparece junto a él. |
| **Tiendas, alijo, forja, mascota** | Siempre **locales**: cada cliente tiene su tienda y su alijo (`shopStock`, `stash`). Abrir un panel **no pausa** en grupo (`main.js:1552`). |
| **Cofres** | Instanciados: cada uno abre **su** cofre una vez (el anfitrión guarda «abierto por» como máscara de bits). |
| **Santuarios** | Compartidos: al activarlo, el bufo llega a los héroes a ≤ 8 m (evento del anfitrión). |
| **Goblin, mímico, jefe de mundo** | Estado del anfitrión; el botín es personal. |

Por qué la excursión sale barata en el modelo B: el cliente del invitado ya sabe simular un mundo entero (es el juego de hoy). Volver es exactamente la misma unión tardía que hace falta igual.

### 2.3 Botín
| | Decisión |
|---|---|
| Reparto | **Personal e instanciado** (D4, Last Epoch [S]). Cada uno ve y recoge solo lo suyo. Oro personal. |
| Quién recibe | **Lo decide el anfitrión** y viaja en el `KILL` como máscara de slots elegibles: héroes a ≤ 40 m del enemigo, presentes (no ausentes, §3.6) y con alguna entrada en los últimos 60 s. Solo los elegibles tiran botín y suman XP. Así nadie farmea con la ventana minimizada junto al anfitrión, y no hace falta que tu cliente tenga replicado a un enemigo lejano para medir la distancia. |
| Cómo se tira | `killLootRng(semillaDelMundo, heroId, netId)`: cada cliente elegible tira su botín al recibir `KILL`. **No viaja nada**, no depende del orden de las muertes y la grieta se puede reproducir (solo con el paso fijo y la simulación determinista de F3, §9; aviso del diseño de ítems v4.2). |
| Cantidad | `partyLootMult(n) = 1` al empezar: con la vida escalada por debajo de ×n (§2.4), el botín por hora y jugador ya sube algo en grupo. Es una perilla para la calibración. |
| Regalos | Del frente de ítems (`arpg.md` §7.12, `ux.md` §3.12): solo a quien estaba en la partida, solo lo que cayó en ella, ventana de **2 h**, lo regalado no se vende. **Arrastrar el objeto al retrato** del compañero = ofrecer. Su cliente simula el objeto con su build y responde solo ▲ / ↔ / ▼ (no expone su equipo). El objeto recibido pasa por `sanitizeItem` (rehecho desde el catálogo y **cada valor recortado al rango de su afijo y su nivel de objeto**, §5.4) y `syncItemUids`. **v6:** solo entre héroes **abiertos** (los de temporada no entran al co-op); **contra la duplicación**, el que regala guarda **antes** de enviar y el que recibe guarda **al aceptar**, los dos de inmediato y no con el debounce de 3 s; cada regalo lleva un `giftId` y el receptor descarta los repetidos. Así, regalar y cerrar la pestaña antes del guardado no deja el objeto en las dos mochilas. |
| Origen | `origen: { reino, partida }` en cada objeto (frente de ítems). Un objeto de un héroe abierto nunca entra al reino del ladder. |

### 2.4 Escalado de enemigos con más jugadores
**Qué escala:** solo la vida. **No** escalan el daño enemigo, la cantidad ni la velocidad. Es la regla de Last Epoch («Enemies gain additional health based on the number of players in the zone»; el daño, la cantidad y lo demás no cambian) [V] y evita que una maga frágil muera de un golpe al entrar a un grupo.

**Fórmula (en `combat-math.js`):** `partyHpMult(n, rango) = 1 + k[rango] × (n − 1)`, con `n` = héroes **presentes en el mundo del grupo** (no cuentan los de excursión, los desconectados ni los ausentes: un jugador con la ventana minimizada no endurece el mundo de los demás).

| Rango | k inicial | Referencias |
|---|---|---|
| Común | 0,5 | D2: `HP × (n+1)/2` (k = 0,5) [S]; PoE2 normales: +50 % con 2 [S] |
| Élite / campeón | 0,7 | PoE2 raros: +80 % con 2 [S] |
| Jefe | 0,8 | PoE2 únicos: +100 % con 2 [S]; bajo por los roles (ver abajo) |

**Por qué más bajo que PoE2:** aquí hay roles. Un grupo de 4 típico (tanque + apoyo + 2 de daño) no pega ×4. El objetivo de calibración (E10) es: **jefe con 4 (mezcla de roles) = 0,8–1,0× lo que tarda un héroe de daño solo; manadas, 0,6–0,8×**. Se mide con un escenario **GRUPO** nuevo en `balance-bench.mjs`.

**Por qué con fracción no hay que reescalar a nadie:** la vida que guarda el anfitrión es `hpFrac` (0–1). Cuando alguien entra o sale, cada cliente recalcula **su** vida máxima de vista; la fracción no cambia. Se acaba el problema de «vida fijada al aparecer» de D2.

**Cuándo cambia `n` en todos (v6).** El anfitrión es quien sabe quién está presente. Cuando cambia el conjunto (alguien entra, sale, queda ausente o vuelve), manda por `r` `party{ep, n, desde: tick}`, y cada cliente cambia `partyHpMult` a partir de ese tiempo del anfitrión. Sin eso, un invitado que todavía usa la `n` vieja calcula sus fracciones contra otra vida máxima durante un rato.

**Qué necesita una réplica para ser igual a la del anfitrión (v6).** `buffByPact` (`main.js:998-1012`) es determinista: Tormento (`tormentMods`) y modificadores del pacto (`pactEnemyMods`), sin azar [V]; la vida base sale de la definición (`entities.js:1850-1851`) [V]. Por eso la vida máxima de vista es una **función pura** de `defId`, `rango` y afijos (en `SPAWN`), del piso, el Tormento y el pacto del mundo (en `welcome`), de `n` (en `party`) y del nivel de quien mira. Prueba en `net-paso2`: con el mismo nivel, la réplica y el enemigo del anfitrión dan la misma vida máxima. Si algún día la aparición suma azar (variación de vida), ese número viaja en `SPAWN`. **Dos excepciones de hoy (v5.1, código leído):** un pacto aceptado con enemigos ya presentes les suma vida, daño y velocidad (`game-world-flow.js:136-142`), y al morir un Nigromante sus esbirros alzados pierden la mitad de la vida y el 40 % del daño (`main.js:1193-1199`) [V]. Por eso el pacto también viaja como `pact{ep, id, desde}` por `r` cuando cambia, y `SPAWN` lleva el `invocador`: con el `KILL` del Nigromante, cada cliente aplica la misma regla a sus réplicas (F0 #12).

**v5.2 (R2-B-2, tras la verificación).** El `invocador` arregla las réplicas que ya existen cuando llega el `KILL` del Nigromante, pero no las que **aparecen después** para ti: `SPAWN` se manda por área de interés, y la bienvenida de una unión tardía solo trae a los vivos. Un esbirro alzado que entraba a tu área con su Nigromante ya muerto nacía en tu cliente con vida y daño completos (el anfitrión los tiene en 50 % y 60 %): tus golpes valían la mitad de fracción y su golpe te hacía ×1,67. Por eso `SPAWN` lleva además **`u8 mods`**, lo que el mundo le aplicó **después de nacer**: bit 0 = «invocador caído» (×0,5 vida máxima y ×0,6 daño, la regla de `main.js:1196-1199`); los demás bits quedan libres. El anfitrión lo llena en el `SPAWN` urgente, en la bienvenida y al responder un `need`. La vida máxima de vista se **recalcula desde cero** con `mods` (nunca se multiplica dos veces, tampoco al reutilizar una réplica latente del pool, §3.5). El pacto no necesita bit: `applyPact` aplica a los presentes la misma fórmula que `buffByPact` al nacer (`game-world-flow.js:139-142` frente a `main.js:1008-1010`) [V]. Sigue siendo una función pura **salvo el redondeo a enteros**: si el pacto llega después de la muerte del Nigromante, el orden de los redondeos puede dar ±1 de vida, y la prueba lo tolera.

**Aturdimiento y stagger:** se calculan contra la vida **sin** el multiplicador de grupo, como PoE (stun y estados usan la vida base) [S]. Así los jefes no se vuelven imposibles de Quebrantar en grupo.

### 2.5 Niveles distintos: cada uno ve al enemigo a su nivel
**Problema:** un Nv20 que acompaña a un Nv60 a una zona de nivel 40 muere de un golpe y no aporta.
**Solución (decisión D6 · ✅ Aprobada por el dueño (22-oct); como D4: «Enemy HP, damage they deal and take are relative to every player's level») [S]:**
- Cada cliente construye su réplica del enemigo con **su** escala: `pisoDeVista = mín(pisoDelMundo, areaLevelForHero(nivel) + 2)`. El «+2» es el mismo margen que el «NO efectivo» del frente de ítems (§7.6).
- El daño que **haces** se mide contra tu vida de vista y viaja como fracción. El daño que **recibes** lo calcula tu cliente con el daño de tu réplica.
- Solo baja, nunca sube: quien tiene nivel de sobra ve la zona como es (y la arrasa: es llevar a un amigo, aceptado).
- Tu botín y tu XP salen de tu piso de vista.
- **Solo actúa en un mundo de grupo:** el solitario no cambia. Dentro del grupo, `zoneLevelGap` ya no bloquea al invitado que sigue al anfitrión.

**Por qué no es un exploit:** un Nv20 que pega contra enemigos de su franja aporta lo mismo que un compañero de nivel equivalente. Distinto es el Tormento (§2.6): eso **no** se escala por jugador.

### 2.6 XP, Tormento, misiones, contratos y grietas
| Tema | Regla |
|---|---|
| XP | Cada muerte a **≤ 40 m** de ti te da su XP completa (en tu piso de vista), la hayas golpeado o no (D4 [S]). La distancia y la presencia las mide el anfitrión (máscara de elegibles del `KILL`, §2.3). **+10 %** si hay otro jugador a ≤ 40 m (D4: +10 % a 90 m en un mundo mucho más grande [S]). Si alguien del grupo te lleva **más de 15 niveles**, tu XP baja a la mitad (anti-arrastre; D4 recortó el *powerleveling* en la temporada 1 [S]). |
| Tormento | **El del anfitrión, igual para todos** (como el nivel de mundo compartido de D4). No se escala por jugador: si se escalara, unos amigos en Tormento 0 matarían rápido los enemigos de Tormento 10 del anfitrión. El lobby lo muestra. |
| Pactos | Del mundo (anfitrión); cada vista aplica sus modificadores sobre su escala. |
| Misiones y contratos | Cada uno avanza los suyos con las muertes a ≤ 40 m. Los objetivos de lugar (llegar, activar) cuentan para quien los toca. |
| Grietas y llaves | La llave la gasta el anfitrión (Last Epoch: llaves por corrida de grupo [V]). Al cerrarla, cada cliente calcula **su** recompensa con su piso de vista. El tiempo es el del anfitrión. |
| Diaria | Se juega en solitario (su escala depende de tu récord personal). En grupo, la del anfitrión cuenta como mazmorra normal. |

### 2.7 Muerte y revivir
| | Regla (base D4 [S]) |
|---|---|
| Al caer | Tu héroe queda como **lápida** con el color de tu especialización. Tu cámara sigue al grupo. No hay pantalla de muerte mientras quede alguien vivo. |
| Revivir a un aliado | Mantener **F** junto a la lápida **3 s** (un anillo se llena). Dos que reviven a la vez lo hacen más rápido. **El segundo golpe** que recibe quien revive lo interrumpe (D4: «interrupted by the SECOND attack») [S]. |
| Al volver | **Fantasma invulnerable** hasta que te muevas o lances algo (D4) [S]. Vuelves con el 50 % de la vida y del recurso [D: valor propio, a revisar en E10]. |
| Volver solo | **Revivir en el punto de control** (entrada del mundo del grupo o último punto de ruta). Espera creciente por muerte: 0 / 5 / 10 / 15 s (precedente de D3: la espera crece con cada muerte) [S]. Pérdida de oro de hoy (−10 %), solo para ti. |
| Todos caídos | Todos reviven en el punto de control con su espera. En una grieta, el reloj sigue. |
| Hardcore | Sin revivir: la lápida pasa al **Muro de los Caídos** como hoy. Salas HC separadas. **v6 (decisión D21 · ✅ Aprobada por el dueño (22-oct)):** en una sala HC, quedar **ausente** no te deja invulnerable en el sitio, porque bastaría con desconectarse para no morir. A los 3 s de ausencia tu héroe **sale del mundo del grupo** (vuelve al punto de control al regresar, sin XP ni botín de lo que pasó) y, si había un enemigo atacándolo en los últimos 5 s, los marcos del grupo muestran «desconexión en combate» y el héroe lo guarda en su historial. Si se cae el **anfitrión**, nadie muere: cada uno conserva su héroe con el guardado inmediato. En el modelo B un compañero tramposo igual puede matarte (por eso el aviso de §5.4): HC en grupo es solo con gente de confianza. |
| Ganchos del Paso 2 | Intercesión y Bastión Eterno siguen salvando de una muerte (§7). |

En el modelo B lo decide el dueño: el cliente del que revive completa el canal y manda `AID{revive}` al dueño de la lápida, que se revive en local. El anfitrión no arbitra nada.

### 2.8 Comunicación
**Señales (lo principal, visual):** la tecla **G**.
- **Toque:** señal contextual donde apuntas: sobre un enemigo = «Atacar», sobre un objeto o cofre = «Aquí», sobre el suelo = «Ir aquí».
- **Mantener:** rueda de 4: Atacar · Peligro · Voy · Ayuda.
- Se ve en el mundo (marca con el color de tu especialización, 4 s) y en el minimapa. Máximo 3 cada 5 s.
- Precedentes: la rueda de WoW (5 tipos, en pantalla y minimapa, con límite contra el abuso) [V] y el «ping» de Apex como comunicación sin voz [S].

**Chat corto:** Enter abre la línea en el **registro de sistema** (abajo a la izquierda, ya reservado para el chat en `paso2d2-hud-pc.md`). 140 caracteres, 1 mensaje por segundo (ráfaga de 5), silenciar por jugador. Siempre con `textContent`. Ctrl+clic sobre un objeto lo enlaza en el chat (convención de PoE, `ux.md`).

**Sin voz** (Discord cumple). Sin emotes en la v1.

### 2.9 HUD de grupo
- **Marcos de grupo** bajo la placa del héroe (arriba a la izquierda, espacio reservado en `paso2d2-hud-pc.md`): emblema, barra de vida y barra fina de recurso **sin números** (regla del HUD), iconos de estado: lápida, luna (ausente), barras de latencia, brújula (de excursión). Se refrescan a 10 Hz.
- **Aliados en el mundo:** anillo del color de su especialización bajo los pies y nombre corto.
- **Avisos con icono y anillo** en lugar de frases: reloj de arena («el anfitrión está ausente» o pausa cooperativa, con cuenta atrás al reanudar), barras rojas («con retraso»), portal con anillo de 5 s («seguir»), caracol sobre las barras de latencia («relé lento», cuando el relé va por TCP o TLS), triángulo («subida baja» activada sola).
- **En el lobby del anfitrión:** un alfiler con ayuda emergente («fija esta pestaña y añade el juego a “mantener siempre activos”») y una nota de música («deja el sonido del juego encendido»): son las dos excepciones documentadas de Chrome y Edge para que la pestaña no se duerma (§3.6.1). Un icono de casa con escudo explica el aviso de red local de Chromium cuando dos amigos juegan desde la misma red.
- **Al cerrar la sesión:** botón «Copiar diagnóstico» (resumen de `getStats` y métricas propias en JSON) para calibrar en E10 sin backend.
- **Efectos de los aliados:** opción «intensidad de efectos aliados» y tope de partículas por fuente (cada remoto ≤ 15 % del pool; los telegrafiados enemigos siempre encima) [S: Icy Veins sobre D4].

---

## 3. Arquitectura

### 3.1 Modelo de red (decisión D1)
| Opción | Qué hace cada máquina | Latencia de lo tuyo | Costo en este código | Trampas |
|---|---|---|---|---|
| **A · Anfitrión único** | Simula los 4 héroes; los clientes predicen | 1 RTT si no se predice | `p.cast` (101 usos de `_channel/_charging/_windup/_needsRelease`), `p.input` (19), quitar 12 guardas `player !== p` (grep en `4095ab6`, v5.2), **predicción de habilidades** | Resistente |
| **B · Autoridad repartida** ✅ | Dueño: su héroe y el daño que recibe. Anfitrión: el mundo | **0 ms** | Réplica de `Enemy` con dos vistas (dibujo y juego) y arriendos de estado; pasar a API las escrituras directas sobre enemigos (ronda 2; v5.1: 7 sitios del héroe y 4 grupos del mundo fuera de los módulos permitidos, F0 #12); `RemoteHero`, bus de eventos, partir `onEnemyKilled` | Un cliente puede mentir (cotas) |
| **C · Lockstep** | Todos simulan todo | 1 RTT en todo, al ritmo del más lento | Determinismo total, estado serializable (hoy hay cierres: `casting.run`, ~43 sitios) | Bajas |

**✅ Aprobada por el dueño (22-oct): B.** No se toca el canal de habilidades (2.462 líneas, 9 especializaciones, ventanas de carga perfecta de 0,20–0,30 s), lo tuyo va a 0 ms y entre amigos las trampas se aceptan (Grim Dawn, D2 abierto) [V en los informes]. A queda para F4 (co-op público o ladder de grupo).

### 3.2 Topología y transporte (decisión D2 · ✅ Aprobada por el dueño (22-oct))
- **Estrella** con el anfitrión al centro. Los mensajes de invitado a invitado (curas, revivir, lanzamientos para ver) **pasan por el anfitrión** (+½ RTT). La malla completa queda para F4.
- **WebRTC DataChannel**, dos canales propios creados con `negotiated: true` e ids fijos altos (no chocan con Trystero):

| Canal | Config | Lleva |
|---|---|---|
| `u` (id 101) | `{ ordered: false, maxRetransmits: 0 }` | **Instantáneas** a 20 Hz: cabecera con acuses, época y tiempo + **urgentes** (con redundancia hasta el acuse) + **registros de estado**. Del invitado al anfitrión, además, sus **arriendos** (`EST`), solo en sus paquetes de estado de 20 Hz. Entre medio, **paquetes inmediatos** con solo cabecera y urgentes. `PING` de respaldo |
| `r` (id 100) | fiable y ordenado | Saludo, bienvenida, héroe saneado (solo al anfitrión), perfil de los demás, chat, viajes, pausa, regalos, misiones, nivel, rejilla de respaldo, reenvío de los urgentes **de vida larga** sin acuse (con época y `t0`; T2) |

Por qué 2 y no 3 canales (tecnologia.md proponía `st`, `rt` y `ev`): los urgentes viajan **dentro** del mismo paquete no fiable que el estado (patrón de Gaffer, como propone `codigo.md` T2). Una instantánea por tick (más inmediatos que solo llevan urgentes) en vez de dos flujos con colas distintas; misma recuperación ante pérdidas.

**Presupuesto de SCTP (dcSCTP de Chrome: MTU 1.191 B, RTO mínimo 400 ms, sin intercalado) [V]:**
- T1 · **Paquete `u` ≤ 1.100 B**, armado con un **acumulador de prioridad** por receptor: lo que no cabe sale primero en el siguiente. Cada paquete es autosuficiente.
- T2 · **Urgentes con redundancia acotada:** un urgente va en el primer paquete y se **repite como mucho cada máx(50 ms, RTT/3)**, más siempre en la siguiente instantánea, hasta su acuse. Es la regla de Gaffer («no se envió en los últimos 0,1 s»), no «en cada paquete»: con 150–300 ms de RTT salen unas 4 copias de cada urgente. Los urgentes ocupan **como mucho la mitad** del paquete. Si no llega el acuse en **`máx(300 ms, SRTT + 4·RTTVAR + 50 ms)`** (v6: un plazo fijo de 300 ms duplicaba por `r` casi todo con 175–210 ms de RTT y llenaba el canal fiable), pasan a `r` **solo los urgentes de vida larga** (v5.2, R1-B-5):
  - **Pasan a `r`:** `HIT`, `HITS`, `TICKS`, `THR`, `KILL`, `SPAWN`, `GONE`, `FIELD`, `FIELDX` y `AID` de cura, escudo, guarda o consumida (`AID{revivir}` ya va por `r`). Viajan con su época y con **`t0`, el tiempo del anfitrión en que nacieron** (`u32` en ms; si lo origina un invitado, su estimación; el anfitrión lo conserva al reenviar), **nunca con una edad relativa**. `r` es fiable: tras un corte, SCTP entrega el mensaje con la siguiente retransmisión (RTO de 400 ms como mínimo, con retroceso hasta 3 s en Chrome; RFC 9260 §6.3.3), así que una edad escrita al pasarlo a `r` llegaba segundos más vieja de lo que decía. El receptor calcula `edad = ahoraDelAnfitrión (estimado) − t0` y descarta lo caducado (§3.5.1).
  - **Nunca pasan a `r`** los de vida corta, que caducan con su preparación o su vuelo o en ≤ 1 s: `ATK`, `PROJ`, `PROJX`, `CC`, `DISP`, `CAST` y `AID{redirección}`. Se repiten por `u` hasta su acuse o hasta caducar, y el emisor deja de repetirlos al caducar. Si se pierden todas las copias, el efecto no ocurre (a favor del que defiende, o del protector en la redirección, §7).
  - **Un solo camino de confirmación (v5.2, R2-B-4):** un urgente que pasa a `r` deja de repetirse por `u`. El emisor deja de repetir un urgente cuando un acuse lo cubre (de paquete, o el acuse de golpes de §3.4 para `HIT`, `HITS` y `TICKS`).
  - El receptor deduplica por `id` con **una ventana por contador** de ids (§3.4), común a los dos canales (1.024 ids con comparación cíclica, como Gaffer): un urgente que llega por `u` y después por `r` se aplica una vez. **Un urgente descartado por caducidad también entra en la ventana** (v5.2): así su copia tardía por el otro canal no se aplica.
  
  **Agregación dentro de un paquete (v6, corregida):** los `HIT` y `TICKS` del mismo enemigo y la misma fuente se **suman** en un solo registro (sumar fracciones; nunca «gana el último», que perdería daño); solo lo idempotente (`CC` del mismo tipo, `DISP`, `THR{provocar}`) se fusiona con «gana el último». La suma se hace **al crear** el urgente (lo que nace en el mismo fotograma o bombeo), así cada registro conserva un solo `id` en todas sus copias, que es lo que acusa §3.4.
- T3 · **Envío inmediato de urgentes, sin estado:** los urgentes que nacen en un mismo fotograma o bombeo salen juntos en **un** paquete que lleva solo cabecera y urgentes (ningún registro de estado ni arriendo: v5.2, para no sumar 32 × 6 B × 60/s ≈ 11,5 KB/s que §3.9 no cuenta). Tope total de 60 paquetes/s por par (30 en «subida baja»), contando las instantáneas.
- T4 · **Lo grande se trocea y se dosifica, también en combate.** La unión tardía, la vuelta de excursión y la reconexión ocurren justo mientras los demás pelean, y dcSCTP sin intercalado programa mensaje a mensaje: un trozo de 16 KB ocupa la asociación entera [S: `stream_scheduler.h` de dcSCTP, citado por el experto]. Además la subida del anfitrión es **una sola** para sus 3 asociaciones. Por eso, en `r`:
  - trozos de **≤ 1.100 B**, con un ritmo global del anfitrión de **≤ 25 % de su subida medida**, regulado con `bufferedAmountLowThreshold`;
  - el guardado completo del recién llegado va **solo al anfitrión**, que lo necesita para `recompute()`;
  - a los demás invitados les llega un **perfil** de ≤ 1 KB: clase, especialización, nivel, apariencia y los stats publicados que hacen falta para validar sus `AID` (vida máxima, curación recibida, % del Vínculo; §5.4), calculados por el anfitrión. Así nadie expone su equipo, como pide §2.3.
- T5 · **Contrapresión:** si `u.bufferedAmount` > 2.200 B, la instantánea se **descarta** (los urgentes no: viajan en el paquete siguiente). **Es la única defensa real:** Chrome reemplaza los valores por defecto de dcSCTP y deja `max_send_buffer_size` en «prácticamente ilimitado» (`std::numeric_limits<size_t>::max()`), sin cerrar la asociación por exceso de retransmisiones (`max_retransmissions = nullopt`) y con el retroceso de los temporizadores topado en 3 s [V: `media/sctp/dcsctp_transport.cc`]. El «búfer de 2 MB» que citaban los informes es el valor por defecto de la biblioteca, no el que usa Chrome (corregido en `codigo.md` §7.4). El intercalado de mensajes existe, pero detrás del experimento `WebRTC-DataChannelMessageInterleaving` [V]: se diseña como si no estuviera.
- **Por qué `maxRetransmits: 0` y no `maxPacketLifeTime`** (I1-P13, I2-P04): con vida máxima, el navegador puede reintentar en silencio dentro de la ventana y el emisor no sabe si llegó; con un RTO mínimo de 400 ms, solo lo repara la retransmisión rápida, que exige tráfico continuo (RFC 9260 §7.2.4). La recuperación con acuse propio (T2) tiene un plazo predecible. Detalle en `codigo.md` §7.4 T5.
- T6 · **Las instantáneas tienen su propio reloj:** salen a 20 Hz exactos por un acumulador sobre `performance.now()` del anfitrión, **no** al final de cada bombeo. Con el bombeo por red y el metrónomo (H1 y H1b, §3.6: unos 60 bombeos/s) solo uno de cada tres bombeos emite instantánea. Esto corrige `codigo.md` §7.6 H1 («las instantáneas salen al final de cada bombeo»), que habría triplicado la bajada.
- T7 · **La sobrecarga por paquete entra en el presupuesto:** IPv4 20 + UDP 8 + DTLS 13 + GCM 24 + SCTP 12 + DATA 16 = **93 B por paquete** (113 B con IPv6, +4 B por relé TURN) [V: desglose del MTU de 1.191 B en Chromium; RFC 9260 §3.1 y §3.3.1]. Las cuentas de §3.9 ya la incluyen.
- T8 · **Control de congestión y adaptación automática.** SCTP aplica su control de congestión también a los canales no fiables [S: RFC 9260 §7, citado por el experto; el modo no fiable solo quita las retransmisiones, no la ventana]. Con la fórmula de Mathis (ancho ≈ 1,22 × MSS ÷ (RTT × √pérdida)), 5 % de pérdida y 200 ms de RTT dan ≈ 32 KB/s por asociación, justo el tope de bajada de §3.9; con 2 % y 150 ms, ≈ 68 KB/s [D]. Por eso la «subida baja» deja de ser solo un interruptor:
  - si `bufferedAmount` pasa de 2 instantáneas, o la pérdida medida con los acuses de `u` supera el 3 % durante 2 s, el anfitrión baja ese par a 15 Hz, achica el área de interés de 35 a 28 m y baja la prioridad de los enemigos quietos;
  - vuelve al modo normal tras 10 s estables;
  - el marco del invitado muestra el triángulo de «subida baja».
  
  La **compresión delta** contra la última instantánea acusada (Gaffer, *Snapshot Compression*) queda como mejora **condicionada a R3**: solo si el modo de 15 Hz no alcanza (§13.1, discrepancia parcial).
- T9 · **Los SACK cuentan.** SCTP acusa los DATA con un SACK cada 2 paquetes o cada 200 ms [S: RFC 9260 §6.2, citado por el experto; es la misma regla de RFC 4960]. Muchos viajan pegados a los DATA del otro sentido; en el peor caso son 10–30 paquetes/s de 93 B por sentido (1–3 KB/s). Ya están en §3.9.
- T10 · **Área de interés también para los urgentes (v6).** Los urgentes que solo sirven para **ver** (`CAST`, los `FIELD` de héroe que no tocan el mundo y los efectos) se reenvían solo a los receptores a ≤ 45 m (35 m del área de interés + 10 de margen) del origen. Los que cambian algo (`AID`, `KILL`, `ATK`, `PROJ`, `PROJX`, los `FIELD` con efecto sobre el mundo, que van al anfitrión) se mandan siempre. Así un aliado a 80 m no gasta los 1.100 B de tu paquete.

**Bibliotecas de netcode evaluadas (v6, I2-F10).** Ninguna encaja con un anfitrión que corre en una pestaña y un modelo B, así que se escribe un códec propio pequeño (`DataView`, unas 300 líneas) y se toman ideas:
- **nengi.js**: servidor autoritativo en Node con WebSocket; trae interpolación, predicción, culling por interés y serialización binaria, pero no anfitrión en el navegador [S: README]. Se toma la idea del culling por interés.
- **geckos.io**: cliente-servidor en Node por WebRTC, con un rango de puertos UDP abierto (1025–65535) y sin P2P entre navegadores [S: README]. Descartado (ya en `tecnologia.md` §3.1).
- **NetplayJS**: P2P con *rollback* o *lockstep* y un servidor de emparejamiento; el *rollback* exige un estado que se pueda rebobinar, y el nuestro tiene cierres (`casting.run`, el planificador) [S: README]. Descartado por el mismo motivo que el lockstep (§3.1).
- **Colyseus**: servidor autoritativo con su esquema de estado; sin plan gratis en la nube (`tecnologia.md` §10). Descartado.
- Para pruebas de integración WebRTC sin navegador quedan `node-datachannel` o `werift` (opcionales, en E0 y por turno; §8).

### 3.3 Qué se sincroniza, quién manda y a qué frecuencia
| Dato | Dueño | Viaja | Frecuencia | Canal |
|---|---|---|---|---|
| Posición, giro, animación, vida %, recurso %, banderas visibles de tu héroe | Su dueño | Registro de héroe (~18 B; 19 B cuando el anfitrión lo reenvía, con `Δtick`) | 20 Hz | `u` |
| **Estado continuo que aplicas a enemigos:** Debilidad, debilitamiento saliente, Vulnerable, Aterido, ralentizar (también los que tus talentos refrescan en cada tic: Presa Herida, Hielo Quebradizo, Espinas Venenosas) | Tú lo publicas; el anfitrión lo aplica como factor del objetivo | **Arriendos `EST`** (6 B cada uno, con el tiempo que le queda) | En cada paquete de estado del invitado (20 Hz; los inmediatos no los llevan, v5.2); los nuevos, en el siguiente | `u` (estado, no urgente) |
| Enemigos: posición, giro, vida (fracción), animación, banderas de estado (32) y, cuando hace falta, Debilidad y multiplicador saliente (`MOD`) o stagger y lanzamiento (`JEFE`) | Anfitrión | Registro de entidad (14 B + 2 o 3 B de extensión), solo en tu área de interés (35 m) | 20 Hz (15 en «subida baja»); quietos y lejanos a 5–10 Hz por el acumulador de prioridad | `u` |
| Aparición de un enemigo (definición, rango, afijos, invocador y lo que el mundo le cambió después de nacer, `mods`, v5.2) | Anfitrión | `SPAWN` | Al aparecer; en bloque al unirse | `u` urgente / `r` en la bienvenida |
| Ataque enemigo contra un héroe (golpe, golpe pesado, Vórtice) | Anfitrión lo inicia, **la víctima lo resuelve en su presente** | `ATK` con la posición del enemigo, la preparación y el multiplicador saliente | Al **empezar** la preparación | `u` urgente |
| Proyectiles, áreas telegrafiadas, charcos enemigos | Anfitrión | `PROJ` con trayectoria determinista (origen y **punto de destino**, v6), duración para lo persistente y multiplicador saliente | Al crearse | `u` urgente |
| Proyectil enemigo que ya golpeó a un héroe | La víctima | `PROJX` (los demás lo borran; decisión D19) | Al golpear | `u` urgente |
| Auras enemigas por cercanía (ardiente, de escarcha) y reflejo de Espinoso | **Nadie viaja**: el aura la resuelve la víctima contra la posición dibujada (a favor del que defiende); Espinoso lo calcula el atacante con su daño de vista | — (el afijo llega en `SPAWN`) | — | — |
| Tu golpe, control, amenaza y desplazamiento sobre un enemigo | Tú calculas **tu parte**; el anfitrión pone **la del objetivo** y lo aplica | `HIT` (un objetivo), `HITS` (un lanzamiento de área), `CC` (solo control con rendimientos decrecientes), `THR`, `DISP` | Al ocurrir | `u` urgente |
| Tus DoT y los tics de tus campos | **Tú** (tu planificador, contra tus réplicas; decisión D18) | `TICKS`, agrupados por fuente cada 0,25 s | Cada 0,25 s | `u` urgente |
| Muerte de un enemigo | Anfitrión (tu cliente la **prevé** para dibujarla) | `KILL`, con la máscara de quién recibe XP y botín, la posición y (v6) la habilidad del golpe final y el estado al morir | Al ocurrir | `u` urgente |
| Tamaño del grupo presente (`n`) y pacto del mundo | Anfitrión | `party{ep, n, desde}` (v6, §2.4) y `pact{ep, id, desde}` (v5.1, §2.4) | Al cambiar | `r` |
| Equipo, talentos y nivel de un invitado | Su dueño | `heroDelta` saneado, solo al anfitrión; el anfitrión rehace el perfil de los demás (v6, §5.2) | Al cambiar | `r` |
| Curas, escudos, bufos, redirecciones, revivir de un héroe a otro | Lo emite el que lo lanza, **lo aplica el dueño del receptor** (validando, §5.4) | `AID` (vía anfitrión) | Al ocurrir | `u` urgente |
| Lanzamiento de habilidad de otro (para verlo) | Su dueño | `CAST` + efectos por id de preset | Al ocurrir | `u` urgente |
| Campos de suelo de un héroe (auras, zonas, trampas, muros, cebos, estelas, la carrera con arrastre) | Su dueño; los que **mueven, frenan o debilitan enemigos** tienen un **campo-sombra** en el anfitrión | `FIELD` v2 (forma de círculo o línea, efectos sobre el mundo, valores ya resueltos, versión) y `FIELDX` (fin, detonación) | Al crearse, **al cambiar** lo que le hace al mundo (≤ 4 por segundo por campo; v5.2, §3.4) y al terminar | `u` urgente |
| Unión, mundo, viaje (en dos fases), pausa, chat, señales, regalos, misiones, nivel | Quien corresponda | JSON | Al ocurrir | `r` |
| RTT y reloj | Ambos | **Acuses de `u`** (hora de envío de cada `seq`); `PING` por `u` solo de respaldo | Continuo | `u` |
| Botín | **Nadie** | No viaja (`killLootRng`) | — | — |
| Terreno | **Nadie** | Semilla + CRC32 de la rejilla (bitset si no coincide) | Al cargar el mundo | `r` |
| Barras de mecánica, marcas propias | Su dueño | No viajan (solo un icono en tu marco si hace falta) | — | — |

### 3.4 Formato de mensajes
**Paquete `u` (binario, `DataView`, little-endian):**

| Byte | Tamaño | Campo |
|---|---|---|
| 0 | 1 | `kind` (0x10 anfitrión→invitado, 0x11 invitado→anfitrión) · 3 bits altos = versión del protocolo |
| 1 | 1 | **`época` del mundo** (sube en cada `loadWorld` del mundo del grupo; el invitado que vuelve de excursión entra en la época vigente) |
| 2 | 2 | `seq` del paquete (cíclico) |
| 4 | 2 | `ack`: último `seq` recibido del otro |
| 6 | 4 | `ackBits`: los 32 anteriores (para saber qué urgentes llegaron) |
| 10 | 4 | `tick` = **tiempo de simulación del anfitrión en ms** (`u32`; ronda 2). No es «un tick de 60 por segundo»: con paso semifijo y fotogramas de 144 Hz eso no está definido. Se **detiene en la pausa** y salta en una recuperación (§3.5.1). El invitado manda **su estimación** del tiempo actual del anfitrión |
| 14 | 6 | **Solo anfitrión → invitado (v5.2, R2-B-4): acuse de golpes** `u16 golpeAcum · u32 golpeBits`. Dice que el anfitrión ya **procesó** (aplicó, o descartó por época o caducidad) todos los `HIT`, `HITS` y `TICKS` de ese invitado con `id` ≤ `golpeAcum`, y los de `golpeAcum + 1 … + 32` marcados en los bits, hayan llegado por `u` o por `r`. Es acumulativo más selectivo, como el SACK de SCTP (RFC 9260 §3.3.4). El invitado → anfitrión no lleva estos 6 B |
| 14 o 20 | 1 | `nUrg` |
| … | … | urgentes: `[u16 id][u8 tipo][u8 largo][u8 edad][carga]`.<br>• **`id` (v5.2):** dos contadores por emisor, cíclicos de 15 bits: uno para `HIT`, `HITS` y `TICKS` (bit alto en 0), que es el que acusa `golpeAcum`, y otro para el resto (bit alto en 1). Un solo contador no servía: un `CC` perdido nunca pasa a `r` (T2) y dejaría el acumulado trabado para siempre.<br>• **`edad`** = tiempo desde que nació el urgente, en 1/60 s, respecto del `tick` de esta cabecera (cada repetición la actualiza; se satura en 255 ≈ 4,25 s). El receptor calcula `t0 = tick − edad` y la **edad real = ahoraDelAnfitrión (estimado) − t0**, no la `edad` a secas (v5.2): con `maxRetransmits: 0`, SCTP abandona un mensaje recién cuando tocaría su primer reintento (RFC 7496 §3.1), así que un paquete que quedó en la cola durante un corte sale tarde igual, con su `tick` viejo. Por `r` el urgente lleva `t0` (`u32`) en lugar de `edad` (T2) |
| … | … | arriendos (**solo invitado → anfitrión, solo en sus paquetes de estado de 20 Hz**; los inmediatos no los llevan, v5.2): `[u8 n]` + `EST` |
| … | … | estado: `[u8 n]` + registros (**solo en las instantáneas**; los paquetes inmediatos no llevan estado) |

**Reglas de la cabecera:**
- Todo paquete `u`, y todo mensaje de `r` que dependa del mundo (lleva `ep`), con **otra época se descarta**. Así, tras un viaje o una vuelta de excursión, un `HIT` o un `KILL` del mundo anterior nunca cae sobre un enemigo del nuevo.
- **`netId` no se reutiliza dentro de una época** (contador de 16 bits: 65.535 apariciones por mundo cargado alcanzan de sobra [D]; si se agotara, el anfitrión abre una época nueva con el mismo mundo, como una unión tardía).
- **Precisión:** el anfitrión guarda la vida como `double`; cada golpe viaja como `f32` (su error relativo, 6·10⁻⁸, es del golpe y no de la vida); la barra viaja en `u16`. Los umbrales los decide el anfitrión en `double`.
- **Coordenadas (v6).** El mundo está centrado: `Grid` pone el origen en `ox = −w/2`, `oz = −h/2` (`world.js:263-266`) [V], así que en una zona van de −60 a +60 m y un `setUint16` directo daba la vuelta con las negativas. Toda posición viaja como `u16 (x − grid.ox) × 256` (1/256 m; alcanza 256 m, y la zona más grande mide 120). Prueba de ida y vuelta en las cuatro esquinas.
- **Pares inicio/fin y orden por emisor (v6).** El canal `u` llega desordenado, y con la redundancia un fin puede llegar antes que su inicio. Reglas: un fin (`FIELDX`, `GONE`, `KILL`, `AID{consumida}`) deja una **lápida** por id durante la duración máxima de su tipo, y un inicio (o una actualización de `FIELD`) que llega después de su lápida se descarta; las guardas (`AID{guarda}`) llevan una **versión `u8` por protector y receptor**, y gana la mayor (comparación cíclica); las actualizaciones de un `FIELD` llevan su `u8 ver` con la misma regla (v5.2); `CC` no tiene fin explícito (vence por su duración).

**Registro de entidad (14 B):** `u16 netId · u16 x · u16 z (1/256 m desde el origen de la rejilla) · u8 giro · u16 vida (fracción × 65.535) · u8 animación · u32 banderas`.
- **Banderas (32 bits):** aturdido · congelado · inmovilizado · ralentizado · Aterido · silenciado · vulnerable · debilitado · provocado (+ 2 bits con el slot de quien provoca + 1 bit «por un campo») · inmune · escudado (afijo) · afijo activo · en combate · Quebrantado · stagger bloqueado · lanzando · DoT de quemadura · de sangrado · de veneno · `MOD` · `JEFE` · fuera de interés · **salto** (v6: cambia de 0 a 1 tras un tirón, un empuje grande o un teletransporte; el receptor corta la interpolación en vez de deslizarlo). Quedan bits libres para crecer.
- **Extensión `MOD` (+2 B, la anuncia su bandera):** `u8 debilidad %` (el saco del objetivo: Vulnerable + Σ debilitamientos, con su tope) · `u8 saliente %` (`outDmgMul` × 100). Va en el registro mientras alguno sea distinto del neutro: así tu predicción usa la misma Debilidad que aplicará el anfitrión.
- **Extensión `JEFE` (+3 B, jefes y élites con lanzamientos):** `u8 stagger (0–100)` · `u8 castId` · `u8 progreso del lanzamiento (0–255)`. Alimenta la barra de stagger del marco del jefe y la barra de lanzamiento que te dice cuándo interrumpir.

**Registro de héroe (~18 B):** `u8 slot · u16 x · u16 z · u8 giro · u16 vida · u8 recurso · u8 animación · u8 habilidad · u16 banderas` (caído, fantasma, invisible, con escudo, canalizando, ausente, Vínculo listo, Intercesión lista y, v6, **salto**: un contador de 2 bits que sube con cada Parpadeo, Carrera o teletransporte, para que los demás corten la interpolación en vez de mostrar un deslizamiento) `· u16 bufos visibles · u8 nivel`. Su dueño lo manda con el tiempo del anfitrión **estimado por él** en la cabecera. Cuando el anfitrión lo **reenvía** dentro de su instantánea, le agrega `u8 Δtick` (en 1/60 s, respecto de la cabecera del anfitrión): sin ese campo se perdía el tiempo del dueño (ronda 2). Así todos lo dibujan en la misma línea de tiempo que a los enemigos (§3.5.1).

**Arriendo `EST` (6 B, invitado → anfitrión):** `u16 netId · u8 tipo (debilidad, saliente, vulnerable, aterido, ralentizar) · u8 id (índice del catálogo de efectos, cubierto por el hash `cat`) · u8 % · u8 restante (× 50 ms, ≤ 12,75 s)`.
- Es **estado**, no un evento: cada paquete de estado del invitado (20 Hz) lleva la lista vigente (los nuevos y los que cambiaron primero; tope de 32 por paquete, y si hay más, rotan: con 64 vigentes cada uno sale al menos cada 2 paquetes) y lo último pisa a lo anterior. Perder un paquete no importa: el siguiente trae lo mismo.
- El anfitrión mantiene cada arriendo hasta `restante + 150 ms` si no se renueva (dos intervalos más jitter). Así una Debilidad de 0,3 s que se refresca en cada fotograma no **parpadea**, y nunca sale un urgente por fotograma.
- Cubre todo efecto **idempotente con duración** sobre un enemigo: una entrada por (enemigo, tipo, id) que se refresca. En el código son `applyWeakness`, `weakenOutgoing`, Vulnerable, Aterido y `applyCC('slow')`, que no tiene rendimientos decrecientes (gana el más fuerte: `entities.js:1992-1998`) [V]. También los Vulnerables de 3 s de Guardia Rota y Estampida, y el de la Gracia de Rajar (v5.1): el tiempo restante viaja dentro del arriendo.
- Lo **discreto** (aturdir, congelar, inmovilizar, empujar, silenciar, interrumpir, provocar) sigue como `CC` urgente, porque tiene rendimientos decrecientes y debe aplicarse una sola vez (`entities.js:1958-1991`) [V].

**Urgentes (carga):**
| Tipo | Dirección | Carga | B |
|---|---|---|---|
| `HIT` 0x01 | inv → anf | `u16 netId · f32 fracción` (**tu parte, antes del objetivo**: arma × coeficiente × aditivo × atributo × crítico × Π[×], dividido por tu vida de vista) `· u8 banderas (crítico, cuerpo a cuerpo, intento de ejecutar, área) · u8 habilidad · u8 elemento · u8 stagger · u8 amenaza× (threatMult × 10)` | 11 |
| `HITS` 0x07 | inv → anf | **Un mensaje por lanzamiento de área** (ronda 2): `u8 habilidad · u8 elemento · u8 banderas comunes · u8 stagger · u8 amenaza× · u8 n · n × (u16 netId · u16 fracción logarítmica · u8 banderas propias: crítico, ejecutar)`. La fracción en `u16` logarítmico (2⁻ᵏ⁄²⁰⁴⁸) tiene un error relativo ≤ 0,02 % [D] | 6 + 5n |
| `TICKS` 0x02 | inv → anf | **Agrupados por fuente cada 0,25 s** (ronda 2): `u8 fuente · u8 n · n × (u16 netId · f32 fracción antes del objetivo)`: tics de tus DoT y de tus campos | 2 + 6n |
| `CC` 0x03 | inv → anf | `u16 netId · u8 tipo (aturdir, congelar, inmovilizar, empujar, silenciar, interrumpir, provocar) · u16 ms · u8 %`. **Solo lo discreto**; ralentizar pasó a `EST` | 6 |
| `THR` 0x04 | inv → anf | `u16 netId · u8 modo (sumar, provocar, provocar por campo) · f32 amenaza en **fracciones de tu vida de vista** · u16 ms o id de campo` | 9 |
| ~~`DEB` 0x05~~ | — | **Eliminado en la v5:** la Debilidad y el debilitamiento saliente viajan como arriendos `EST` | — |
| `DISP` 0x06 | inv → anf | `u16 netId · u16 x · u16 z (origen) · u8 distancia (dm) · u8 sentido (hacia, desde)`. La carrera con arrastre no va aquí: es un campo-sombra «arrastra» (ver `FIELD`) | 8 |
| `ATK` 0x10 | anf → víctima | `u16 enemigo · u8 slot víctima · u8 tipo (golpe, golpe pesado, Vórtice, …) · u16 preparación (ms) · u16 x · u16 z (enemigo al iniciar) · u8 saliente %` | 11 |
| `PROJ` 0x11 | anf → todos | `u16 id · u8 tipo · u16 x · u16 z (origen) · u16 x · u16 z (destino) · u16 velocidad o radio · u16 retardo · u16 duración · u8 saliente %`. **v6:** el destino reemplaza al `u8 dirección` (1,4° de resolución daban ≈ 0,5 m de error lateral a 20 m), y la duración permite charcos y anillos persistentes (el Encarcelador dura 1,4 s, la lava) | 18 |
| `PROJX` 0x15 | víctima → todos (vía anf) | `u16 id · u8 slot`: el proyectil enemigo se consumió en ese héroe; los demás lo borran al llegar (D19) | 3 |
| `KILL` 0x12 | anf → todos | `u16 netId · u8 slot del golpe final · u8 banderas · u8 máscara de slots elegibles (XP y botín) · u16 x · u16 z · u8 habilidad del golpe final · u8 estado al morir` (v6: bits de quemadura, sangrado, veneno, congelado, aturdido, inmovilizado, Vulnerable y Quebrantado). Sin esos dos campos, un golpe final de un DoT o de un campo no dejaba evaluar los ganchos ⑥ `onKill` que miran la habilidad o `killStatus` (`main.js:1224`, `entities.js:2309`) [V] | 11 |
| `SPAWN` 0x13 | anf → todos | `u16 netId · u16 defId · u8 rango · u16 afijos · u16 x · u16 z · u16 invocador` (v5.1: `netId` de quien lo alzó, 0 si nadie; con el `KILL` del Nigromante cada cliente debilita a sus esbirros como el anfitrión, §2.4) `· u8 mods` (v5.2: lo que el mundo le aplicó **después de nacer**; bit 0 = invocador caído → ×0,5 vida máxima y ×0,6 daño; los demás, libres. Va también en la bienvenida y en la respuesta a un `need`, §2.4) | 14 |
| `GONE` 0x14 | anf → todos | `u16 netId · u8 motivo` | 3 |
| `AID` 0x20 | héroe → héroe (vía anf) | `u8 de · u8 para · u8 tipo (cura, escudo, bufo, redirección, revivir, guarda) · f32 cantidad · u16 ms · u16 fuente` | 12 |
| `CAST` 0x21 | héroe → todos (vía anf) | `u8 slot · u8 habilidad · u16 x · u16 z · u8 variante` | 7 |
| `FIELD` 0x22 | héroe → todos (vía anf) | `u16 id · u8 ver · u8 tipo · u8 forma (círculo, línea) · u8 sigue (no, al dueño, a la mira) · u16 x1 · u16 z1` · [línea: `u16 x2 · u16 z2 · u8 ancho (dm)`] [círculo: `u8 radio (dm)`] `· u16 ms · u16 armado en (ms) · u8 dueño · u8 efectos sobre el mundo (bloquea, bloquea a todos, encierra, atrae, ralentiza, debilita, arrastra) ·` [atrae: `u8 radio · u8 radio élite · u8 velocidad % · u8 a jefes`] [ralentiza: `u8 %`] [debilita: `u8 id · u8 %`] [arrastra: `u8 radio de llegada (dm)`; la línea es la ruta de la carrera y `ms` su duración] `· f32 valor`. **v5.2: un `FIELD` con un `id` vivo es una actualización** (ver «Campos que cambian después de nacer», abajo) | 19–32 |
| `FIELDX` 0x23 | dueño → todos (vía anf) | `u16 id · u8 motivo (fin, detonado, destruido)` | 3 |

**Campos que cambian después de nacer (v5.2, R1-B-2, tras la verificación).** Hay campos del héroe que cambian lo que le hacen al mundo **después de nacer** [V]:
- **Cebo de Caza**, la pasiva innata del Montaraz, agrega «atrae» a tus trampas ya puestas en su `onTick` y llama a `_recountMoveFields` (`powers-arquera.js:2446-2459`). Con un `FIELD` solo al nacer, el cebo del Montaraz **no existía en el anfitrión**, en el caso más común de esa especialización.
- **Gran Cacería** mueve tus trampas (que ya atraen) alrededor de la Presa y las rearma (`powers-arquera.js:2784-2788`; el daño extra que les da lo sigue reclamando su dueño).
- **Zarzal Creciente** hace crecer el Cerco 1 m/s hasta 12 m (`:2549`); con la forja **Jaula de Espinas** (`contain`, `skills-arquera.js:468, 784`) es un encierro que crece.
- **Zarzas Trepadoras** alarga `f.t` del Cerco activo (`:1424`): la sombra vencía antes que el campo.
- **Tierra Bendita** agranda y alarga zonas ya puestas, y **Senda Ardiente** le agrega `slow` a un sendero ya puesto (`powers-guerrero.js:788-794`).

Reglas:
1. **Un `FIELD` con un `id` vivo es una actualización:** reemplaza posición, forma (radio o ancho), efectos, sus parámetros, armado y tiempo restante. Gana la `ver` mayor (comparación cíclica), porque `u` llega desordenado; tras un `FIELDX`, la lápida descarta cualquier actualización.
2. **Detección sin perseguir cada poder:** al final de cada fotograma, en cada campo de héroe que mueve, frena o debilita enemigos (`movesEnemies`, que `field-entities.js:109` ya define, más «ralentiza» y «debilita»), el dueño compara un hash de (posición, radio o ancho, máscara de efectos, parámetros, **fin previsto** = ahora + `f.t` y **armado previsto**, redondeados a 1 dm y a 50 ms) con el último enviado. Si cambió, emite otro `FIELD` urgente con `ver + 1`, como mucho **4 por segundo por campo** (con la redundancia de T2 y, si hace falta, por `r`). El fin previsto no cambia porque `f.t` baje en cada fotograma; cambia cuando un talento lo alarga.
3. **`sigue = al dueño`:** la sombra sigue la última posición reportada del dueño, con la misma extrapolación de ≤ 100 ms que usa la IA (§3.5), y la posición no entra en el hash. **`sigue = a la mira`:** la posición entra en el hash. Una ruta de «arrastra» se fija al lanzarse y no cambia.
4. La sombra vive hasta su `FIELDX` o hasta su `ms` + 1 s, lo que llegue antes; el `ms` de cada actualización pisa al anterior.
5. **En el cliente del invitado, `constrainMove`, `lureStep`, el empuje del muro y el arrastre no tocan réplicas:** solo la sombra del anfitrión mueve enemigos. El lint de F0 #12 deja escribir desde `field-entities.js`, así que es una regla aparte, con su prueba en `net-contrato`.
6. **`net-contrato`:** toda escritura en `f.radius`, `f.width`, `f.pos`, `f.t`, `f.dur`, `f.armAt` o en `f.data.(lure|contain|blocks|slow|slowPct|…)` de un campo de héroe hecha fuera de `field-entities.js` tiene que caer en lo que lee el hash del punto 2, o llamar a `g.fieldChanged(f)`.

Costo: ≈ 0,5 KB/s de subida por cada campo que cambia (4 por segundo × ~30 B × las copias de T2) y < 0,5 d-t en E9.

**Fiables (`r`, JSON, ≤ 1.100 B por trozo en combate; T4):** `hello`, `welcome`, `hero` (solo al anfitrión), `heroDelta` (v6: cambios de equipo, talentos o nivel, saneados y solo al anfitrión; §5.2), `profile` (a los demás; se reenvía cuando cambia), `party` (v6: `n` presente; §2.4), `pact` (v5.1: pacto aceptado a mitad de mundo; §2.4), `need` (pido un `SPAWN` que me falta), `grid`, `travelPending`, `travel`, `follow`, `pause`, `resume`, `chat`, `gift`, `giftVerdict`, `quest`, `level`, `turn` (credenciales TURN renovadas, §3.8), `renegotiate` (oferta y respuesta de `restartIce`, sin depender del DO), `bye`, `kick`. Los que dependen del mundo (`welcome`, `party`, `pact`, `need`, `grid`, `travelPending`, `travel`, `follow`, `pause`, `resume`, `quest` y los urgentes de vida larga reenviados, que además llevan `t0`; T2) llevan `ep`.
- `hello` = `{ proto, build, cat, simHash, env, heroId, hero }` (ronda 2; §3.7):
  - `proto`: versión del protocolo;
  - `build`: `BUILD` de `js/build.js`, igual a `VERSION` de `sw.js` (una prueba lo exige). Solo se muestra: la página hoy no conoce `VERSION` [V: no aparece en ningún `js/*.js`];
  - `cat`: CRC32 de los catálogos (clases, enemigos, afijos, efectos);
  - `simHash`: hash de las fuentes de simulación, generado por una prueba;
  - `env`: producción o vista previa;
  - `hero`: guardado **saneado** (3–11 KB), solo al anfitrión.
  
  La compatibilidad la deciden `proto`, `cat` y `simHash`. Un cambio de CSS que sube `VERSION` no impide jugar juntos.
- `welcome` = `{ slot, world: { type, biome, seed, floor, rift, torment, pact }, gridCrc, poi: [...], tick, party: [...perfiles] }`. Los POI (portales, cofres, santuarios, puntos de ruta) **siempre** vienen del anfitrión.
- `travelPending` = `{ ep, destino, hasta }` y `travel` = `{ ep: ep + 1, world }` (§3.7). `pause` = `{ ep, tick }`, `resume` = `{ ep, tick, en: 1000 }`.

### 3.5 Predicción, interpolación y reconciliación
| Qué | Cómo |
|---|---|
| Tu héroe | **Autoritativo en local.** No hay reconciliación. |
| **Dos vistas por réplica** (ronda 2) | Cada réplica de enemigo tiene: **dibujo**, la interpolada, que solo pinta; y **juego**, el último dato autoritativo más **tus predicciones** (el control, el Vulnerable, los debilitamientos y los desplazamientos que **tú** aplicaste, cada uno con su vencimiento). Una predicción se borra cuando el anfitrión la confirma o la niega, o a los RTT + 150 ms. **Todos los poderes, talentos y mecánicas leen la vista de juego** (`frozenT`, `slowT`, `stunT`, `rootT`, `staggerBrokenT`, `vulnT`, Debilidad, posición): así «congelo y lanzo el Dardo» da el crítico en el mismo segundo (`powers-maga.js:1510`), y Quiebrahuesos ve el Quebrantado que tú causaste (`powers-guerrero.js:1131, 1138, 1411, 2162`) [V]. El control que aplican **otros** llega con la instantánea (1 RTT): es lo mismo que verlo en pantalla. |
| Tu golpe sobre un enemigo | Número y reacción **predichos** con los **dos factores**: tu parte y la Debilidad de la vista de juego (`MOD` más tus arriendos). El anfitrión aplica `fracción × weaknessMult(su estado al recibir)`. **Tu cliente no mueve la réplica:** el empuje por golpe lo calcula el anfitrión (es función de la fracción); tú solo dibujas la reacción (`lunge`). Excepción: tus propios desplazamientos (tirón, carrera con arrastre) se predicen en la vista de juego para que tu golpe de llegada encuentre a los arrastrados. |
| **Barra de vida (reconciliación)** | `vida mostrada = vida de la última instantánea − Σ tus HIT, HITS y TICKS pendientes × Debilidad de la vista de juego`. **Pendiente (v5.2, R2-B-4)** = un golpe que la cabecera de esa misma instantánea todavía no da por procesado: ni su `id` está cubierto por el acuse de golpes (`golpeAcum`/`golpeBits`, §3.4), ni el `ack`/`ackBits` acusa alguno de los paquetes `u` que lo llevaron. Deja de estar pendiente cuando lo cubre uno de los dos, nunca antes. La v5.1 solo miraba los acuses de paquetes `u`, y fallaba en dos casos: un golpe que pasó a `r` lo aplica el anfitrión sin que ningún `ack` de `u` lo refleje, y tras un corte de más de ~0,5–1,6 s (33 paquetes a 20–60 por segundo) la ventana de `ackBits` ya no alcanza a un golpe que el anfitrión sí aplicó justo antes. En los dos la barra restaba el golpe dos veces y después **subía**. El acuse de golpes cubre los dos canales y los cortes. La barra usa siempre la **última** instantánea, no la interpolada. Sin esto, la instantánea (armada ½RTT antes) «curaba» al enemigo hasta que llegaban tus golpes: la barra rebotaba y la muerte prevista resucitaba un instante (Gambetta, reconciliación con entradas pendientes). Propiedad en `net-sim`: **la barra mostrada nunca sube sin una cura** (o sin que el anfitrión rechace un golpe). |
| Muerte de un enemigo | **Muerte prevista (solo visual):** si la vida mostrada llega a ≤ 0 y el enemigo no es jefe, ni está inmune, escudado o **encadenado** (Cadenas reparte la vida de la manada: `entities.js:2866-2881` [V]), la réplica sale de objetivos, rebotes, perforaciones y áreas, y arranca la disolución. Los efectos «al matar» que **solo tocan a tu héroe** (recurso y curas: `killHeal`, `manaOnKill`, `burn/bleedKillHeal\|Mana`) se adelantan. Los que **tocan el mundo** (explosiones, contagios), el botín, la XP y las misiones esperan el `KILL`. **Dos reversiones distintas** (ronda 2):<br>(a) el `KILL` no llega en RTT + 300 ms **contados desde que el golpe letal quedó procesado** según el acuse de golpes o de paquetes (v5.2; antes se contaban desde que salía, y un golpe letal que pasaba a `r` revertía la muerte justo antes de que llegara su `KILL`), y como mucho a los 2 s (su caducidad) + RTT + 300 ms de haber salido → la réplica vuelve y los efectos adelantados se descuentan si aún están (nunca bajo 0);<br>(b) el `KILL` llega con **otro** golpe final → el enemigo **sí** murió: la réplica no vuelve; solo se descuentan tus efectos «al matar» adelantados.<br>A los inmunes y escudados tampoco se les predice el número. Los demás ven la muerte con el `KILL`, en su línea de interpolación. |
| Umbrales (ejecutar, muerte) | Los decide el anfitrión con su fracción en `double`. |
| Enemigos y otros héroes | **Interpolados en una sola línea de tiempo** (§3.5.1), con un atraso **adaptativo** de 100–250 ms que cubre a los aliados de dos saltos (Gambetta, Colyseus [V]). Si faltan datos, extrapolación de ≤ 200 ms y luego quietos. |
| Réplicas que salen del área de interés | **Pool por `netId` dentro de la época** (ronda 2): `GONE{fuera de interés}` deja la réplica **latente** (oculta, sin destruir) al menos 10 s, y un `SPAWN` posterior reutiliza el **mismo objeto** y recalcula desde cero su vida máxima de vista con los `mods` de ese `SPAWN` (v5.2, §2.4). Solo `KILL` y `GONE{desaparece}` la destruyen. Hoy tu estado se indexa por la identidad del objeto (el `Set` de Escarcha en `powers-maga.js:472`, el `Map` de `powers-arquera.js:2659`, los DoT del planificador) [V]: sin el pool, alejarte 40 m y volver borraba tu Escarcha, tus marcas y tus DoT. |
| Lo que la IA del anfitrión mira de un invitado | La **última posición reportada** + extrapolación de ≤ 100 ms (no la interpolada: si no, los enemigos persiguen fantasmas atrasados). |
| Ataques enemigos contra ti | Se resuelven **en tu presente** (§3.5.1). `ATK` llega al **empezar** la preparación y trae la posición del enemigo. Tu cliente dispara la animación del atacante con el `ATK` y, **mientras dura la preparación, la réplica del atacante vive en tu presente**: se desliza en ~80 ms hasta la posición del `ATK` y vuelve a la línea de interpolación al terminar. Sin eso lo veías a 1–2 m cuando te pegaba (el «golpe a distancia» clásico de los ARPG). Resuelve al terminar la preparación con tu posición, esquiva y bloqueo. |
| Proyectiles y áreas | Entidades con trayectoria determinista que **nacen avanzadas por su edad**; cada cliente comprueba solo a su héroe. Si la edad se come más de la mitad del vuelo, se dibujan desde el origen y se aceleran hasta alcanzarse (a favor del que defiende). Exige la misma rejilla (§3.7). **Los proyectiles enemigos no perforan** (`entities.js:3170-3183`: se borran en el primer héroe) [V]: la víctima manda `PROJX` y los demás lo borran al llegar. Queda una ventana de ½RTT de la víctima + ½RTT tuyo en que podría tocarte también; se mide en `net-paso2` (D19). |
| Auras enemigas y Espinoso | **Aura ardiente** (daño cada 0,5 s a < 2 m) y **aura de escarcha** (ralentiza a < 2,6 m) (`entities.js:2721-2734`) [V]: las resuelve la víctima contra la posición **dibujada** del enemigo («lo que ves te quema»), con el afijo conocido por `SPAWN`. **Espinoso** (refleja el 20 % al que pega, `entities.js:1717-1718`) [V]: lo calcula el atacante en local con su daño de vista. Nada de esto viaja. |
| Hit-stop, sacudida, números | Locales y solo de presentación: **nunca** tocan el `dt` del mundo. |

#### 3.5.1 Reloj y regla de tiempo por tipo de mensaje
**El reloj (ronda 2).** El `PING` a 1 Hz por el canal fiable era mala base: una pérdida bloquea `r` hasta la retransmisión (RTO mínimo de 400 ms en dcSCTP; Firefox puede usar usrsctp, con otros valores), y la línea de interpolación heredaba el error. `currentRoundTripTime` de `getStats` sale de las comprobaciones de consentimiento STUN, cada ~5 s [S: MDN, RFC 7675]: sirve para la interfaz, no para el reloj. Queda así:
1. **`tick` = tiempo de simulación del anfitrión en ms** (`u32`). Se detiene en la pausa cooperativa.
2. **RTT por los acuses de `u`:** cada lado guarda la hora de envío de cada `seq`. Al recibir un `ack` toma una muestra, descarta las que pasan del p90 y usa el **mínimo de las últimas 16** (filtro tipo NTP) más un promedio móvil para el jitter.
3. **Desfase** con las muestras de RTT mínimo (estilo NTP) y **corrección suave** (≤ 5 ms por segundo), para que la línea no dé saltos.
4. **Saltos de tiempo:** si las instantáneas muestran que el tiempo del anfitrión saltó (recuperación de hasta 1 s, reanudación tras la pausa), el búfer de interpolación se **vacía y se rearma**.
5. `PING`/`PONG` por `u` (con `seq` y marcas de tiempo) solo de respaldo, cuando no hay tráfico.

Cada urgente lleva su **edad** (en `u`) o su `t0` (en `r`). El receptor saca de ahí su hora de nacimiento en el tiempo del anfitrión y su **edad real** contra su estimación del tiempo actual del anfitrión (§3.4, v5.2), así que da igual cuánto esperó en una cola de SCTP. En la tabla, «edad» es siempre esa edad real. Con eso cada mensaje cae en una de tres clases:

| Clase | Mensajes | Se resuelve o se dibuja | Caduca (se descarta si su edad supera) |
|---|---|---|---|
| **Te afecta a ti** | `ATK`, `PROJ`, `PROJX`, telegrafiados, `AID` | **En tu presente.** `ATK`: tiempo restante = preparación − edad; el alcance se mide contra la posición que trae el `ATK`, con tolerancia `alcance + margen + mín(1 m, tu velocidad × ½RTT)` (el anfitrión decidió con tu posición atrasada ½RTT; sin esa tolerancia los invitados esquivarían gratis y el anfitrión recibiría más golpes). Telegrafiados: restante = duración − edad, con un **mínimo de 250 ms** para reaccionar (a favor del que defiende). Proyectiles: ver arriba. | `ATK`, `PROJ` y `PROJX`: preparación o vuelo + 300 ms (un corte de Wi-Fi de 2 s **no** produce una ráfaga de daño viejo) · `AID` de cura o escudo: 2 s · redirección: 1 s · revivir: va por `r` y no caduca |
| **Lo observas** | Registros de estado, `CAST`, `KILL` de otros, `FIELD` ajenos, efectos | **En tu línea de interpolación** (ver abajo). Cada mensaje se dibuja en **su tiempo de origen** sobre esa línea, así el golpe de Ana se ve **antes** de la muerte que causa. | `CAST` y efectos: 500 ms (si no, se omite el efecto) · `KILL`, `SPAWN`, `GONE`: nunca (solo por época) · `FIELD`: mientras le quede duración (se le descuenta la edad); cada actualización con `ver` mayor pisa la anterior (v5.2, §3.4) |
| **Reclamas al mundo** | `HIT`, `HITS`, `TICKS`, `CC`, `THR`, `DISP` y los arriendos `EST` | El anfitrión las aplica **al llegar**, con el estado del objetivo en ese momento (Debilidad, inmunidad, rendimientos decrecientes). Los arriendos se aplican con su tiempo restante menos la edad del paquete. | `HIT`, `HITS`, `TICKS`, `THR`: 2 s · `CC` y `DISP`: 0,5 s (un tirón tardío se siente como un error) · `EST`: no caduca, vence por su tiempo restante + 150 ms |

**Qué puede viajar por `r` (v5.2, R1-B-5).** Solo lo que caduca en más de 1 s o no caduca (`HIT`, `HITS`, `TICKS`, `THR`, `KILL`, `SPAWN`, `GONE`, `FIELD`, `FIELDX`, `AID` de cura, escudo, guarda, consumida o revivir), siempre con `t0`. Lo que caduca con su preparación, su vuelo o en ≤ 1 s (`ATK`, `PROJ`, `PROJX`, `CC`, `DISP`, `CAST`, `AID{redirección}`) se repite por `u` hasta su acuse o su caducidad y **nunca** pasa a `r` (§3.2 T2). El caso que pedía cerrar la objeción: con un corte de Wi-Fi de 2 s, a los 300 ms la v5.1 pasaba el `ATK` a `r` con una edad de ≈ 300 ms; salía con la siguiente retransmisión de SCTP, a los ~2,5–3 s, todavía con esa edad, y el receptor lo aplicaba: un golpe viejo y sin aviso, y en Hardcore una muerte permanente. Ahora esa copia no existe, y una copia tardía por `u` trae su `tick` viejo y se descarta por su edad real. Un `HIT` que llega por `r` pasados sus 2 s se descarta igual que por `u`, y su `id` queda en la ventana de duplicados.

**La línea de interpolación, adaptativa (ronda 2).** La v4 usaba `tVista = tiempoDelAnfitrión − (½RTT + 100 ms)`. Un aliado que llega por dos saltos tarda ½RTT de él + hasta 50 ms de espera hasta la siguiente instantánea + tu ½RTT. Con 150 ms de RTT del aliado, el margen era negativo y el aliado iba casi siempre extrapolado, y los aliados son lo que más se mira en un cooperativo. Ahora:

`atraso = clamp(máx(½RTT + 100 ms, p95(edad de los registros de dos saltos) + 20 ms), 100 ms, 250 ms)`

- La edad de dos saltos sale del `Δtick` de cada registro reenviado.
- Con 90 ms de RTT para todos (Santiago–Miami), el atraso pasa de 145 a ≈ 160 ms. Con aliados a 150 ms, a ≈ 190 ms.
- Por encima del tope de 250 ms, los aliados de dos saltos se extrapolan ≤ 100 ms.
- Sigue siendo **una sola línea**: el golpe del aliado se ve antes de la reacción del enemigo, que es el orden que arregló la ronda 1.
- El costo (ver a los demás un poco más atrás) no toca tu combate, porque lo que te ataca vive en tu presente.
- El experto proponía reenviar los registros de héroe en paquetes inmediatos (unos 40 paquetes/s más de subida para el anfitrión con 3 invitados) o una segunda línea más atrasada para los de dos saltos (con un pequeño desorden). La primera queda como alternativa a medir en `net-sim`. La segunda la descarto porque vuelve a desordenar causa y efecto (§13.1).

**El cuerpo a cuerpo enemigo hoy es instantáneo** (`entities.js:2931-2952`: `player.takeDamage` en el mismo fotograma; solo el `slam` se telegrafía 0,65 s). Con preparación 0, el `ATK` se resuelve al llegar y el margen es 0. La decisión **D17** (corregida en la ronda 2; ✅ Aprobada por el dueño (22-oct), con un interruptor para probar la sensación en solitario) fija una **preparación de 150 ms, más una parte adaptativa para las víctimas remotas**:
- `preparación = 150 ms + mín(½RTT de la víctima, 100 ms)`. Para el héroe del anfitrión, 150 ms.
- Margen de alcance de +1 m: el héroe corre 4,3 m/s y hasta 6,45 con +50 %; en 150 ms recorre ≤ 0,97 m.
- **Corrección de la v4:** decía que el `ATK` llegaba dentro de la preparación «hasta con 300 ms de RTT». Era falso: con 300 ms, ½RTT ya son los 150 ms enteros, y hay que sumar el fotograma o el bombeo del anfitrión (16 ms; hasta 50 ms tapado con un invitado).
- Con la parte adaptativa, la víctima ve **≥ 100 ms de preparación hasta unos 250 ms de RTT** y ≈ 85 ms con 300 ms [D].
- La animación del golpe se ve antes del daño (mejor lectura también en solitario). Solo esquivan las habilidades de movimiento (Carrera, Parpadeo) o la invulnerabilidad, no el caminar.
- La cadencia (`atkTime`) no cambia, así que el daño por segundo enemigo casi tampoco: solo se pierden los golpes de enemigos que mueren durante la preparación [D; se mide y compensa con el banco].
- Que la víctima con más latencia vea un poco más de preparación es «a favor del que defiende», como el mínimo de 250 ms de los telegrafiados.

### 3.6 Bucle del anfitrión y anfitrión oculto (bloqueante)
**Paso de simulación (decisión D9 · ✅ Aprobada por el dueño (22-oct)):** semifijo. `advanceTo(t, tope)` avanza en subpasos de ≤ 1/60 s. Con la ventana visible: un subpaso por fotograma (misma sensación de hoy). Para ponerse al día: hasta 1 s de atraso (60 subpasos ≈ ≤ 18 ms de CPU). El paso fijo con render interpolado es deuda de F3.

**El problema:** en Windows, Chrome trata una ventana **tapada** (un alt-tab a Discord basta) o la pantalla bloqueada como pestaña de fondo: rAF se detiene y los temporizadores van a 1 por segundo con un DataChannel abierto. Hoy el mundo correría al 0 % (solo rAF) [V].

**Solución por capas (decisión D10 · ✅ Aprobada por el dueño (22-oct)):**
1. **H1 · Bombeo por red** (F1): cada `onmessage` de un invitado llama a `advanceTo(performance.now())`. Con 3 invitados a 20 Hz son 60 bombeos por segundo, pero **en el caso más común (2 jugadores) hay un solo invitado: 20–25 bombeos/s**, y si ese invitado también tapa su ventana, su envío cae a 1 Hz y el mundo se para (ronda 2). Si la ventana se ve, rAF hace lo mismo y además dibuja. Cada bombeo envía los urgentes que nacieron en él (un paquete por par); las instantáneas salen solo por su reloj de 20 Hz (§3.2 T6).
2. **H1b · Metrónomo en un Dedicated Worker** (F1, nuevo): un Worker de 10 líneas con `setInterval(16)` que hace `postMessage` a la página; cada mensaje es un bombeo, independiente de los invitados. Es el patrón de la biblioteca `worker-timers`: los temporizadores de un Worker no sufren el ritmo de 1 por segundo de las páginas ocultas [S: la eficacia depende del navegador; se mide en R1 en Chrome, Edge y Firefox]. Respaldo final: `setTimeout(16)`.
3. **Audio** como refuerzo: en Firefox basta con que exista el `AudioContext` del juego (`sfx.js:62`) [V]; en Chrome, sonido audible en los últimos 30 s [V]. Además, el audio audible es la excepción que comparten el Ahorro de memoria de Chrome y las pestañas dormidas de Edge (§3.6.1).
4. **H2 · Worker** (si R1 falla): el mundo en un Dedicated Worker con los DataChannels **transferidos** (Chrome 130, Firefox 144, Safari 15 [V]); el canal se transfiere en la misma tarea en que se crea. **Sin `SharedArrayBuffer`** (v6): el hilo principal y el Worker se hablan con `postMessage` y transferibles. Así no hace falta aislar el origen (COOP/COEP), que obligaría a que jsDelivr y Google Fonts sirvan cabeceras CORP o CORS para cada recurso. **Costo (v5.1, INV-B-2):** H2 exige que el mundo corra **sin DOM**, y hoy `main.js` usa `window` y el renderer y no se importa headless (CLAUDE.md). Es adelantar a F1 la `WorldSim` sin DOM de F3, con el bus de E5 como base. Por eso va **después** del metrónomo (10 líneas) y no primero, como proponía el experto: si R1 obliga a H2, F1 se reestima antes de empezar E6 [D].
5. **H3 · Pausa cooperativa** (siempre): si el mundo se atrasa > 2 s, **todos los clientes** congelan su simulación con `pause`/`resume` (máquina de estados en §3.7).

**Héroe ausente:** si la página de un jugador (anfitrión o invitado) queda oculta > 3 s o su estado no llega en 3 s, su héroe queda **ausente**: invulnerable, los enemigos lo ignoran, luna en su marco. Es la red de seguridad para el problema de fondo del navegador. **Un ausente no gana XP ni botín y no cuenta en `n`** (§2.3, §2.4). En salas Hardcore, el ausente sale del mundo (D21, §2.7).

**Un invitado que vuelve no se pone al día (v6).** Solo el anfitrión recupera tiempo con subpasos (hasta 1 s). Un invitado que vuelve de estar oculto **descarta el tiempo oculto**: su héroe estuvo ausente, así que no corre de golpe sus DoT, sus enfriamientos ni sus bufos de esos segundos, y su línea de interpolación se rearma con las instantáneas nuevas (§3.5.1).

#### 3.6.1 Ciclo de vida de la pestaña (ronda 2, bloqueante)
Que la pestaña del anfitrión corra lento no es el único riesgo: también puede **dormirse o descartarse**, y eso termina la sesión de los cuatro. Lo comprobé en las fuentes:

| Mecanismo | Cuándo | ¿Exime un DataChannel abierto? | Qué sí exime |
|---|---|---|---|
| **Congelamiento por Ahorro de energía** de Chrome | Oculta y en silencio > 5 min, uso intensivo de CPU y Ahorro de energía activo | **Sí**: cuenta como conferencia «un `RTCPeerConnection` con un `RTCDataChannel` abierto» [V: developer.chrome.com] | Además: dispositivos externos, un **Web Lock** o una conexión de IndexedDB que bloquea a otros [V] |
| **Ahorro de memoria** de Chrome (descarta la pestaña) | Pestañas que no usas; Moderado, Equilibrado o Máximo, sin tiempos publicados | **No figura** en la lista [V: soporte de Google] | Audio o video activos (incluidas llamadas), compartir pantalla, notificaciones, descargas, formularios a medio llenar, **pestañas fijadas**, dispositivos y la lista **«Mantener siempre activos estos sitios»** [V] |
| **Pestañas dormidas** de Edge (navegador por defecto en Windows) | 2 h por defecto; **≤ 30 min** con Ahorro de energía Equilibrado; **5 min** en Máximo o con batería baja | **No figura** [V: soporte de Microsoft] | Pestaña visible, **audio en reproducción**, captura de pantalla, cámara o micrófono, DevTools, WebUSB y la lista **«Mantener siempre activos»** [V] |
| «Infinite Tabs Freezing» de Chrome (en prueba) | — | — | Según la nota, solo el audio audible [S: la página respondió 403] |

**Medidas, de la más fuerte a la más débil:**
1. **Sonido del juego audible para el anfitrión, encendido por defecto** (la música a bajo volumen basta). Es la única excepción común a Chrome y a Edge. Si lo silencia, el lobby le muestra la nota de música tachada.
2. **Ayuda visual en el lobby del anfitrión:** el alfiler («fija esta pestaña») y «añade el juego a *Mantener siempre activos*» (§2.9). Las pestañas fijadas eximen en Chrome; la lista, en los dos.
3. **Web Lock mientras dure la sesión** (`navigator.locks.request('sala-' + crypto.randomUUID(), () => new Promise(() => {}))`; v5.2: el bloqueo es por origen, y con un nombre fijo, en `?net=local`, la segunda ventana se quedaba esperando sin exención): exime del congelamiento de Chrome. Cuesta una línea, pero **no figura** en las excepciones del Ahorro de memoria ni de Edge, así que no se confía solo en él (discrepancia parcial, §13.1).
4. **Escuchar `freeze`, `resume` y `document.wasDiscarded`:**
   - un **invitado** que vuelve reconecta con su `rejoinToken`;
   - si se descarta el **anfitrión**, la sesión termina (no hay migración). Los invitados ven el reloj de arena y, a los 60 s, «fin de la sesión», y cada uno conserva su héroe.
5. **R1 lo mide** en Chrome, Edge y Firefox, con 30–60 min de pestaña oculta y los dos ahorros activados (§11 E0). Riesgo nuevo **R17** (§10).

### 3.7 Sesión: estados, unión, reconexión y fin
```
lobby → conectando → sincronizando → jugando ⇄ (con retraso → reconectando) → fin
                                       ⇅ pausa ⇄ reanudando
                                       ⇅ viaje pendiente → cargando
                         ↑ excursión ↔ unirse al grupo ↑
```
- **Versión, antes de entrar (ronda 2):**
  - Al pulsar «Encender hoguera» o «Unirse», el juego pide `version.json` sin caché (`fetch(…, { cache: 'no-store' })`). Si hay una versión nueva, **recarga antes de entrar al lobby**. Hace falta porque hoy `sw.js` sirve el código propio con *stale-while-revalidate* (`sw.js:388-405` [V]): la primera carga tras un despliegue trae el código viejo, y un módulo que no estaba en caché llega nuevo (mezcla).
  - El saludo compara `proto`, `cat` y `simHash`. Si no coinciden, recarga **el que tiene la versión vieja**, no siempre el invitado.
  - Durante una sesión el service worker sigue sin recargar solo: avisa al terminar.
  - El Worker de señalización acepta su protocolo N y N−1, porque la caché sigue sirviendo clientes viejos.
- **Cómo se actualiza de verdad (v6).** Hoy `sw.js` precachea en `install` y hace `skipWaiting()`, borra las cachés viejas y hace `clients.claim()` en `activate`, y sirve lo propio con *stale-while-revalidate* (`sw.js:346, 353-354, 388-405`) [V]. Consecuencias: un `location.reload()` a secas puede volver a servir el código viejo desde la caché y repetir el aviso en bucle, y una página vieja que pase a estar controlada por un SW nuevo recibiría módulos **nuevos** si los pidiera tarde. Por eso:
  1. `sw.js` deja pasar `version.json` **directo a la red** (sin caché): un `fetch(…, { cache: 'no-store' })` desde la página pasa igual por el SW, y hoy este lo respondería desde su caché.
  2. Si `version.json` trae un `build` distinto del `BUILD` de la página: `reg.update()`, esperar a que el SW nuevo quede **activo** y llegue `controllerchange` (el SW nuevo ya precacheó los recursos nuevos en `install`), y recién entonces `location.reload()`. Si tras una recarga sigue sin coincidir, no se insiste: icono de «actualiza a mano» (Ctrl+F5).
  3. **Nada de `import()` perezoso de módulos propios** durante una sesión: los módulos de red se cargan al inicio, o con `?v=BUILD` en la URL.
  4. Al abrir el lobby, el Worker responde `{ mp, ladder, minProto }`: **interruptor remoto** del multijugador y del ladder, y versión mínima del protocolo. Se cambia sin desplegar el juego ni esperar al SW (I1-F02).
  5. Cuando el anfitrión recarga por versión, los invitados ven el reloj de arena con el icono de «actualizando».
- **Mapa compartido:** el anfitrión manda tipo, bioma, semilla, piso y **CRC32 de la rejilla**. Si el CRC del invitado no coincide, pide la rejilla como bitset (zona 120×120 = 1.800 B; mazmorra 46×46 = 265 B; Refugio 26×26 = 85 B) y colisiona con esa.
- **Unión tardía y vuelta de excursión:** la bienvenida trae la época vigente, los `SPAWN` de todo el mundo (60 enemigos ≈ 860 B con el `invocador` de la v5.1 y los `mods` de la v5.2), los campos-sombra activos en su última versión, el estado de cofres y santuarios y los **perfiles** del grupo. Todo va troceado a ≤ 1.100 B y dosificado (§3.2 T4), porque los demás siguen peleando. El guardado completo del recién llegado solo va al anfitrión. El héroe aparece junto al anfitrión.

**Viaje del grupo (ronda 2: viaje pendiente).** En la v4 el anfitrión subía la época y cargaba el mundo nuevo mientras los invitados decidían, y durante 5 s nadie simulaba el mundo en que seguían peleando. Ahora:
```
jugando ─(el anfitrión toca un portal)→ VIAJE PENDIENTE ─(fin del anillo de 5 s, o todos eligieron)→ época + 1 → cargando → jugando
              │ el mundo viejo se sigue simulando; el anfitrión ve «esperando al grupo»
              └─(el anfitrión pulsa Esc)→ jugando (viaje cancelado)
```
- `travelPending{ep, destino, hasta}` abre el anillo en todos. `travel{ep + 1, world}` sale solo al cerrarse.
- Todo lo que llegue después con la época anterior se descarta. Tus DoT y campos sobre enemigos del mundo viejo se cortan en tu cliente.
- **Quien se queda** recibe una carga local nueva de la zona (misma semilla + `netId` muertos + cofres abiertos; §2.2). Nunca se promueve una réplica a enemigo autoritativo.
- Prueba en `net-sim`: «el anfitrión viaja mientras un invitado pelea».

**Pausa cooperativa (ronda 2).** En la v4 solo se congelaba el mundo del anfitrión, pero en el modelo B cada dueño simula su héroe, sus DoT, sus campos, sus enfriamientos y sus bufos, y resuelve los `ATK` pendientes. Si eso seguía corriendo, los tics caducaban, los bufos vencían y los proyectiles en vuelo golpeaban. Ahora:
```
jugando ─(mundo atrasado > 2 s, o un invitado sin noticias del anfitrión 5 s)→ PAUSA ─(el anfitrión vuelve)→ REANUDANDO (cuenta atrás de 1 s) → jugando
```
- `pause{ep, tick}` por `r`: cada cliente congela **toda** su simulación (héroe, planificador, campos, `ATK` y `PROJ` pendientes), su héroe queda invulnerable y deja de emitir reclamaciones. Se ve el reloj de arena.
- Un invitado que pierde al anfitrión 5 s entra solo en esa misma pausa, sin esperar el mensaje.
- `resume{ep, tick, en: 1000}`: cuenta atrás visible, búferes de interpolación rearmados y RTT y desfase medidos de nuevo (§3.5.1).
- Prueba en `net-sim`: tras pausa y reanudación no caduca ningún tic ni vence ningún bufo.

- **Visto desde el invitado:** 1 s sin instantáneas → barras rojas («con retraso»); 5 s → reloj de arena y pausa cooperativa.
- **Visto desde el anfitrión:** 3 s sin el estado de un invitado → su héroe queda ausente; 10 s → desconectado, con **60 s de gracia** (su lápida o su héroe ausente siguen en el mundo). Reintento: `restartIce()` con credenciales TURN vigentes (§3.8), con la oferta y la respuesta por `r` si el canal sigue vivo; si falla, conexión nueva por el DO de la sala con un `rejoinToken` de un solo uso. Su héroe nunca se pierde: vive en su `localStorage`.
- **Anfitrión que se cae:** fin de la sesión con aviso; cada uno conserva su héroe (guardado inmediato). Sin migración del anfitrión en la v1.
- **Guardado:** con debounce de 3 s, más guardado inmediato al subir de nivel, al recibir un legendario, al morir y al salir de la sala (hoy se guarda en cada muerte y cada recogida: `main.js:1315, 1471`).

### 3.8 Señalización, NAT, TURN y hosting
**Flujo de la sala (v5; decisión D3 · ✅ Aprobada por el dueño (22-oct)):**
1. El anfitrión pulsa «Encender hoguera» → Turnstile invisible → el Worker emite un **código firmado** y crea el **DO de la sala**, que le entrega un `hostToken`.
2. El invitado entra con el código. El **Worker descarta, sin tocar ningún DO**, los códigos que no emitió, y aplica un límite de ritmo.
3. El DO avisa al anfitrión (como mucho 3 solicitudes pendientes).
4. Al aceptar, el DO reenvía oferta, respuesta y candidatos ICE, y entrega **credenciales TURN** a los dos, con un `rejoinToken` de un solo uso para el invitado.
5. Con los canales abiertos, el DO hiberna (sin cobro de duración) y solo despierta para reconectar o renovar.

**El estado de la sala vive en la SQLite del DO, no en variables (ronda 2).** Con la API de hibernación, el objeto sale de memoria tras un rato sin eventos y, al despertar, **vuelve a correr el constructor** [V: Cloudflare]. Además, **cada despliegue cierra todos los WebSocket** y reinicia todos los DO [V]. Una implementación ingenua perdería justo lo que el DO existe para cuidar: quién es el anfitrión, los aceptados, los `rejoinToken` y los usuarios TURN emitidos (hacen falta para revocarlos). Por eso:
- **SQLite del DO:** miembros, hash del `hostToken` y de cada `rejoinToken`, usuarios TURN emitidos y estado (creada o cerrada). En el plan gratis solo hay DO con SQLite: la clase se declara en `new_sqlite_classes` [S: precios de DO].
- **Cada socket** guarda su slot y su rol con `serializeAttachment` (≤ 16 KB) [V].
- **Latido de aplicación cada 30 s** con `setWebSocketAutoResponse('ping', 'pong')`: no despierta al objeto, no se cobra [S: precios de DO] y evita que NAT y proxies corten el WebSocket inactivo.
- **El cliente reconecta solo**, con espera creciente, y reanuda con su token (como hace `partysocket`).
- **Una alarma de limpieza** hace `deleteAll()` al cerrar la sala o a las 24 h.
- **La partida no depende del DO:** un despliegue a mitad de sesión solo corta la señalización; el juego sigue por WebRTC. Solo falla una reconexión hecha justo en ese momento, y el cliente la reintenta.

**Autoridad del anfitrión ante el DO:** al crear la sala recibe un `hostToken` de 128 bits (el DO guarda su hash). Aceptar, rechazar, expulsar y cerrar solo se admiten desde el socket marcado como anfitrión. Sin eso, cualquiera con el código podía reclamar el rol tras una caída del WebSocket del anfitrión.

**Códigos y abuso (ronda 2).** Cada código adivinado era `idFromName(código)`, es decir, **un DO distinto**: un límite guardado dentro de cada sala nunca veía los intentos contra las demás. Y en el plan gratis, pasadas las 100.000 peticiones del día, las operaciones fallan hasta las 00:00 UTC [V: precios de DO], que son las 21:00 en Chile en horario de verano, en plena hora de juego. Ahora:
1. **Código firmado:** los 8 caracteres de Crockford (40 bits) son 24 bits de id de sala + 16 bits de un HMAC truncado con un secreto del Worker. El Worker rechaza sin crear ningún DO el 99,998 % de los intentos al azar.
2. **Límite de ritmo en el Worker** con el binding de Rate Limiting (períodos de 10 o 60 s; contadores por ubicación, no globales) [V: Cloudflare; S: disponible en el plan gratis]. Va por código y por IP, con umbrales generosos (≈ 20 uniones por minuto por IP), porque Cloudflare desaconseja usar la IP como clave [V] y en LatAm abunda el CGNAT. Es un filtro grueso: la barrera real es la firma.
3. **Turnstile invisible** solo al **crear** una sala (cada sala cuesta un DO); unirse no lo necesita (firma + aprobación del anfitrión).
4. **Por sala:** como mucho 3 solicitudes pendientes y botón «apagar la hoguera».
5. **Interruptor de emergencia:** una variable del Worker que muestra «multijugador en mantenimiento» (icono de yunque).
6. **`Origin`:** al abrir el WebSocket, el Worker lo compara con una lista (dominio de producción, patrón de vistas previas del proyecto en `vercel.app`, `localhost:8080`). No frena un script, pero sí que otra web gaste tu cuota desde los navegadores de sus visitantes.
7. **Entornos separados:** `env` (producción o vista previa) va dentro del código de sala y del saludo; el Worker nunca mezcla un amigo en producción con otro en la vista previa.

**Credenciales TURN (ronda 2).** Cloudflare corta la conexión «poco después» de que vence la credencial; la asignación no tiene duración máxima, pero cada *Refresh* debe ir con una credencial válida, y el TTL máximo es de 48 h [V: FAQ de TURN]. Con un 17,7 % de pares que necesitan relé, un grupo de 4 (3 enlaces) tiene ≈ 44 % de probabilidad de tener al menos uno por relé (1 − 0,823³) [D]. El TTL de 2 h de la v4 cortaba casi la mitad de las sesiones largas de grupos completos, y la prueba de 1 hora no lo detectaba. Ahora:
- **TTL de 24 h** (≤ 48 h). Cloudflare recomienda un TTL mayor que el uso esperado; su ejemplo es de 86.400 s [V]. La protección es la **revocación** (al cerrar la sala o expulsar a alguien; endpoint `…/credentials/$USERNAME/revoke`) [V], no un TTL corto.
- `customIdentifier` = id de sala al generar la credencial, para medir el consumo por sala [S: analítica de TURN].
- **Renovación** a T − 30 min y antes de cualquier `restartIce()`:
  - el DO emite credenciales nuevas y el cliente llama a `pc.setConfiguration({ iceServers })` [V: Cloudflare lo documenta para refrescar en mitad de la sesión];
  - luego `restartIce()`, con la oferta y la respuesta por `r` (`renegotiate`), sin depender del DO [M: comprobar en R2 que hace falta el `restartIce` y que no se corta la asignación viva].
- **Filtrar las URL del puerto 53** que devuelve `generate-ice-servers`: los navegadores lo bloquean y la URL vence por tiempo (sin ICE por goteo) [V]. Se conservan 3478/udp, 443/udp y **443 por TLS**, para las redes que solo dejan salir por ese puerto.
- **Relé lento:** si `getStats` muestra que el candidato local de relé va por TCP o TLS (`relayProtocol`), el canal no fiable queda detrás de TCP (bloqueo de cabeza de línea, aunque `maxRetransmits` sea 0). Se muestra el caracol en el marco (§2.9); pasa en ~0,5 % de las sesiones [S: OpenVidu].

**Respaldo y modo degradado:** si el Worker cae o se agota su cuota del día, el lobby ofrece Trystero (Nostr) **sin TURN**: ≈ 18 % de los pares no conectarán, salvo que se usen las credenciales de Metered. El lobby lo dice con un icono y la hora de vuelta (00:00 UTC). La CSP debe listar los relés de Nostr elegidos (versión de Trystero fijada) o el respaldo no corre (§5.3).

| Pieza | Servicio | Plan gratis (oct-2026) | Uso |
|---|---|---|---|
| Juego estático | **Vercel Hobby** (ya en uso) | Sitio estático; añadir `vercel.json` con la CSP y `version.json` | Sin cambios de costo |
| Señalización y credenciales TURN | **Cloudflare Worker `signal` + 1 DO por sala** (SQLite) | 100.000 peticiones al día (WebSocket entrante 20:1; pings y autorrespuestas no se cobran), 13.000 GB-s al día, sin cobro mientras hiberna; al pasar el límite falla hasta las 00:00 UTC [V]. Sin DO en Sudamérica: nace en el este de EE. UU. (solo suma ~1 s al armar la sala) [V] | F1 |
| Relé para NAT difícil | **Cloudflare TURN** | 1.000 GB al mes compartidos con la SFU; solo se cobra lo que sale del TURN hacia el cliente dueño de la asignación; luego US$0,05/GB, **sin techo de gasto** [V]. Credenciales solo por el DO de la sala, TTL 24 h, revocadas al cerrar o expulsar, renovadas; tope diario y corte a ~800 GB por el DO «cuota» (§3.10) | F1 |
| Respaldo de señalización | **Trystero** (Nostr) con `password` (cifra el SDP con AES-GCM) [V] | Relés públicos sin garantía; sin TURN | Si el Worker falla |
| Respaldo de TURN | Metered Open Relay | 20 GB al mes [V] | Emergencia |
| Cuentas y nube | **Supabase** | 50.000 MAU, 500 MB, 1 GB de archivos, 5 GB de salida, **pausa tras 7 días sin actividad**, **sin copias automáticas** [V/S] | F2 |
| Copias y grabaciones | **Cloudflare R2** | 10 GB, salida sin cobro [S] | F2 |
| Verificador del ladder | **Worker `verify` aparte** + DO | ≈ 28 salas-hora al día gratis [V en tecnologia.md] | F3 |

**Privacidad:** los candidatos ICE muestran la IP pública. Opción «Ocultar mi IP» = `iceTransportPolicy: 'relay'` (gasta TURN).
**Misma red:** dos amigos en la misma casa dependen de los candidatos mDNS; si no se resuelven y el router no hace *hairpinning*, caen al relé. Desde junio de 2025 Chromium pide permiso de **acceso a la red local** para los candidatos locales [S], así que puede aparecer un aviso: el lobby lo explica con un icono (§2.9) y E10 lo prueba.
**Carpetas nuevas:** `server/signal/` (Worker + DO, `wrangler.toml` con la clase SQLite) y, en F3, `server/verify/` como **Worker aparte**: un despliegue reinicia todos los DO del mismo script, y arreglar la señalización no debe cortar intentos del ladder (ni al revés). El juego sigue sin paso de compilación; los Workers se despliegan aparte.

### 3.9 Ancho de banda y latencia
Cuentas rehechas en la v5 [D; se miden en R3]. Ahora incluyen:
- **93 B de sobrecarga por paquete** (§3.2 T7);
- las **~4 copias** de cada urgente que deja la redundancia acotada (T2);
- los **SACK** (T9);
- el peor caso real del banco, que cambia la subida del invitado: la ronda 2 mostró que una Maga con quemadura y campos sobre una manada de 60 genera **≈ 240 tics/s**, no los «2 tics/s por enemigo» de la v4.

| Flujo | Típico | Peor caso | Cómo sale |
|---|---|---|---|
| **Instantánea** | ≈ 0,7 KB (acumulador de prioridad) | ≈ 1,0 KB | 60 enemigos × 14 B + extensiones (~10 × 2–5 B) + 4 héroes × 19 B + cabecera |
| **Bajada por invitado** | **≈ 19–25 KB/s** | **≈ 35 KB/s** | 20 × (0,7–1,0 + 0,09) KB + urgentes × 4 copias (≈ 1 KB/s) + inmediatos (15–40/s × 0,15–0,2 KB) + SACK |
| **Subida del anfitrión, 3 invitados** | **≈ 57–75 KB/s (0,46–0,6 Mbps)** | **≈ 105 KB/s (0,84 Mbps)** | 3 × la fila anterior |
| **Subida de un invitado** | **≈ 6–8 KB/s** | **≈ 20 KB/s (0,16 Mbps)** | Típico: 20 × (registro + ~5 arriendos + cabecera + 93 B) ≈ 3,2 KB/s + reclamaciones ≈ 300 B/s × 4 copias + inmediatos + SACK. Peor caso (Maga, área sobre 60): `HITS` 2 × 306 B/s + `TICKS` ≈ 1,5 KB/s, × 4 copias ≈ 8,6 KB/s; 32 arriendos × 20 Hz ≈ 3,8 KB/s; 40 inmediatos × 93 B ≈ 3,7 KB/s (sin arriendos: van solo en los 20 paquetes de estado por segundo); SACK ≈ 1,6 KB/s. Más ≈ 0,5 KB/s por cada campo que cambia después de nacer (v5.2, §3.4) |
| **Bajada del anfitrión, 3 invitados** | ≈ 20 KB/s | ≈ 60 KB/s | 3 × la fila anterior |

- **Congestión:** el peor caso de bajada (≈ 35 KB/s) roza el ancho que SCTP deja con 5 % de pérdida y 200 ms de RTT (≈ 32 KB/s por Mathis). Por eso la adaptación automática de T8 baja ese par a 15 Hz y achica el área antes de que crezcan las colas. R3 lo mide con 2 % y 5 % de pérdida y con 150 y 200 ms.
- **Subida asimétrica:** 0,46–0,84 Mbps cabe justo en un ADSL con 0,5–1 Mbps de subida (Last Epoch atribuye congelamientos a la subida asimétrica [V]). La «subida baja» se activa sola (T8) o a mano: instantáneas a 15 Hz y tope de 30 paquetes/s por par (≈ 0,35–0,45 Mbps). La calidad del anfitrión se ve en el lobby.
- **TURN** (solo se cobra lo que sale del TURN hacia el **dueño** de la asignación [V]):

| Caso | Se cobra | Por hora |
|---|---|---|
| Un invitado por relé | Su bajada, 19–25 KB/s | ≈ 70–90 MB |
| Anfitrión con «Ocultar mi IP» y 3 invitados | La bajada del anfitrión, ≈ 18–24 KB/s | ≈ 65–86 MB |
| Los dos extremos de un enlace por relé | Bajada del invitado + su parte en la del anfitrión, ≈ 26–33 KB/s | ≈ 95–120 MB |
| Peor grupo: anfitrión oculto + 3 invitados por relé | ≈ 99 KB/s | ≈ 0,36 GB |

  Con 1.000 GB al mes caben ≈ 11.000–14.000 horas-invitado por relé, o ≈ 2.800 horas del peor grupo. Un grupo de amigos que juega 3 h diarias gasta como mucho ≈ 32 GB al mes. Alertas al 50 % y al 80 % (§3.10).
- **Latencia desde Santiago:** Buenos Aires 21 ms, Lima 30, São Paulo 46, Bogotá 68, Miami 92, Ciudad de México 175, Madrid 210 [V]. Hasta ~150 ms se siente bien; > 200 ms, aviso en el lobby.

### 3.10 Operación del servidor: cuotas, secretos y modo degradado (ronda 2, nuevo)
**Cuotas, con alertas al 50 % y al 80 %.** Todo lo diario se reinicia a las **00:00 UTC** (21:00 en Chile en horario de verano y 20:00 en invierno):

| Recurso | Límite gratis | Uso esperado | Qué pasa al agotarse |
|---|---|---|---|
| Peticiones de Workers y de DO | 100.000 al día cada uno (WebSocket entrante 20:1) [V] | Cientos al día | Las operaciones fallan hasta las 00:00 UTC → modo degradado |
| Duración de DO | 13.000 GB-s al día [V] | Mínima (hiberna) | Igual |
| TURN | 1.000 GB al mes [V] | ≤ 32 GB al mes por grupo de amigos | Se cobra, **sin techo**: el DO «cuota» corta la emisión a ~800 GB |
| Supabase (F2) | 500 MB de base, 1 GB de archivos, 5 GB de salida, 50.000 MAU [S] | MB | Se bloquean escrituras; el cron evita la pausa de 7 días |
| Workers Logs | 200.000 eventos al día, 3 días de retención [S] | Un evento por sesión | Se pierden métricas, no el juego |
| Cron Triggers | 5 por cuenta [S] | 4: TURN cada hora (F1); Supabase despierto, copia semanal y limpieza de anónimos (F2) | — |
| R2 (F2) | 10 GB, salida sin cobro [S] | Copias y grabaciones del ladder | Rotar a 4 semanas y al top N |

**Consumo de TURN medido, no supuesto.** Un DO por sala no puede contar credenciales globales. Por eso:
- un Cron cada hora consulta en GraphQL `callsTurnUsageAdaptiveGroups` (`sum.egressBytes` del mes, filtrable por `customIdentifier`) con un token de Analytics de solo lectura, y guarda el total en un **DO único «cuota»** [S: analítica de TURN];
- el DO de cada sala le pregunta antes de pedir credenciales (contador diario y corte a 800 GB);
- **sin tarjeta en Cloudflare hasta F3.** Con tarjeta, primero una alerta de facturación en el panel. Qué pasa con una cuenta sin medio de pago al pasar los 1.000 GB **no está documentado** [sin verificar]: por eso, **sin tarjeta hasta F3** (✅ Aprobado por el dueño (22-oct), §14 #10).

**Manual de operación (corto):**
- **Secretos** con `wrangler secret put`: clave de TURN, token de Analytics, HMAC de los códigos y, en F2, la clave secreta de Supabase. El HMAC rota cada 6 meses o ante una filtración, con dos claves vivas (la actual y la anterior) para no invalidar las salas abiertas.
- **Despliegue:** a mano, por el dueño (no hay CI), fuera de la hora de juego. Un despliegue corta la señalización, no las partidas (§3.8).
- **Interruptor de emergencia** («multijugador en mantenimiento») y **modo degradado** (Trystero sin TURN, con icono y hora de vuelta).
- **Telemetría anónima, un mensaje por sesión:** al cerrar, el cliente manda al DO tipo de candidato por enlace, RTT p50/p95, pérdida, motivo del fin y versión. El DO lo escribe en Workers Logs y suma contadores diarios en «cuota». Sin esto no se sabe el % real de relé en LatAm (R7), cuántas salas fallan en ICE ni cuánto tarda una sala en armarse. Una página de estado mínima para el dueño y una línea en el aviso de privacidad.
- **R2 (E0) amplía sus criterios** con estos casos (§11):
  - TTL de 5 min renovado en mitad de la sesión;
  - DO desalojado tras 3 min y redespliegue, y luego volver a unirse;
  - fuerza bruta de códigos sin gastar la cuota;
  - UDP bloqueado (solo TURN-TLS en el 443);
  - anfitrión con `iceTransportPolicy: 'relay'` y 3 invitados.

---

## 4. Cuentas y guardado en la nube (F2)
El cooperativo F1 **no necesita cuentas**: cada uno trae su héroe local (modelo del Battle.net abierto de D2). Las cuentas llegan con la nube y el ladder.

| Opción (decisión D11) | A favor | En contra |
|---|---|---|
| **Supabase Auth + Postgres** ✅ | Anónimo → vinculado (`signInAnonymously`, `linkIdentity` con Google); RLS; región `sa-east-1`; 50.000 MAU [V] | Se pausa tras 7 días sin actividad; desde el 30-oct-2026 las tablas nuevas necesitan `GRANT` explícito [V] |
| Firebase Auth + Firestore | No se pausa: al agotar la cuota diaria deja de responder hasta el día siguiente; 50.000 lecturas y 20.000 escrituras al día [S] | Otra pila y otro lenguaje de reglas; las cifras de la autenticación anónima no coinciden entre fuentes [S] |
| Cloudflare D1 + OAuth propio en el Worker | Un solo proveedor con la señalización | Escribir y mantener la autenticación nosotros: más superficie de seguridad |

**✅ Aprobada por el dueño (22-oct): Supabase** (decisión D11), con un Cron Trigger del Worker que haga una consulta liviana cada 3 días para que el proyecto no se pause.
- **Esquema mínimo:** `heroes(id, user_id, hero_id, slot, kind ∈ {abierto, temporada}, save jsonb, save_version, rev, updated_at)` y `stash(user_id, data, rev)`.
- **Seguridad de verdad (ronda 2).** Con RLS solo por `auth.uid()`, cualquier jugador hacía `PATCH` de su fila con curl y su JWT: podía cambiar `kind`, `rev` y el guardado de un héroe de temporada. Además, el `rev` lo ponía el cliente, así que el control de conflictos era de buena fe. Ahora:
  - **`GRANT` por columna:** nada a `anon`. A `authenticated`: `select`, `insert (hero_id, slot, kind, save, save_version)` y `update (save, save_version, slot)`.
  - **Trigger `before update`:** fija `rev = old.rev + 1` y `updated_at = now()`, y prohíbe cambiar `kind` o `user_id`.
  - **Política de actualización:** `using (user_id = auth.uid() and kind = 'abierto')`. Los héroes de temporada solo se escriben por RPC (`security definer`).
  - **Escritura condicional:** `update … where id = $1 and rev = $2 returning rev`; 0 filas = conflicto.
  - **Claves nuevas:** `sb_publishable_…` en el cliente y `sb_secret_…` solo en el Worker. Supabase retira `anon` y `service_role` a fines de 2026 [V: documentación de claves].
- **Inicio de sesión:**
  - `signInAnonymously` solo cuando el jugador activa la nube o el ladder, no al abrir el juego. El límite por defecto es de 30 por hora por IP y choca con el CGNAT; Supabase recomienda mucho un CAPTCHA, así que va con Turnstile en ese momento [S].
  - Activar el *manual linking* para `linkIdentity` con Google.
  - Flujo «esa cuenta de Google ya tiene héroes» (te vinculaste en otra PC): iniciar sesión en la existente y mostrar las dos tarjetas de conflicto.
  - SQL mensual que borra los anónimos de más de 30 días sin héroes (hoy crecerían hacia los 500 MB).
- **Migración al primer inicio de sesión:** sube `intentorpg_save_slot{0..2}` e `intentorpg_stash` tal cual (las `MIGRATIONS` ya los llevan al formato vigente), deja una copia `.bak-nube` y desde ahí `localStorage` es la caché sin conexión, que **nunca se borra** al sincronizar.
- **Sincronización (ronda 2):**
  - cada 30 s;
  - en `pagehide`, solo el héroe activo, con `fetch(…, { keepalive: true })` y si pesa ≤ 60 KiB (comprimido con `CompressionStream` si hace falta). El límite de *keepalive* es de 64 KiB en vuelo [S: MDN], y `sendBeacon` no deja poner las cabeceras que exige PostgREST;
  - el alijo, en la sincronización de 30 s y al cerrar su panel;
  - lo que no alcanzó a subir queda marcado «pendiente» en `localStorage` y se resuelve en el siguiente inicio.
- **Conflictos:** con `rev` puesto por el servidor. Si choca: **dos tarjetas** (nivel, horas, fecha) y el jugador elige.
- **Copias (ronda 2):** el plan Free **no** trae copias automáticas ni recuperación a un punto en el tiempo [S: precios de Supabase]. Un Cron semanal del Worker exporta `heroes` y `stash` a **R2**, de a páginas y con la clave secreta, y conserva 4 semanas. E11 incluye una prueba de restauración.
- **Datos personales:** con cuentas se guarda el correo de Google en `auth.users`, de jugadores de Chile, Argentina y Perú; en Chile la Ley 21.719 entra en vigor el 1-dic-2026, con un proyecto para aplazarla a 2027 [S]. Por eso:
  - aviso de privacidad corto (qué se guarda y dónde: `sa-east-1`), que además pide Google para publicar la app OAuth;
  - botón **«Borrar mi cuenta»**: una RPC con la clave secreta que borra al usuario y sus filas;
  - el correo no se copia a tablas propias.
- **Abierto frente a temporada:** los abiertos se editan, van al co-op y se exportan como hoy. Los de temporada viven en el servidor (F3/F4). En F2 la temporada también es «de honor»: se escribe por RPC, pero el cliente sigue simulando. Un héroe de temporada pasa a abierto al terminar la temporada; nunca al revés (D2) [V].

---

## 5. Anti-trampa razonable y seguridad

### 5.1 Qué protegemos y qué no
| Contexto | Postura |
|---|---|
| **Co-op entre amigos (F1)** | Cada uno manda en su héroe y **puede mentir**. Se acepta, como en Grim Dawn y D2 abierto. Las medidas solo cortan lo burdo y protegen la máquina de los demás. |
| **Ladder (F2/F3)** | Nunca confía en el co-op: héroes separados y verificación propia (§9). |

### 5.2 Medidas en el anfitrión (baratas)
1. **Héroe del invitado reconstruido** desde su guardado **saneado** con el mismo `recompute()`.
2. **Cota de plausibilidad por reclamación:** golpe máximo = stats publicados × coeficiente máximo × Π[×] máximo × crítico, medido contra **la vida de vista de ese invitado** (el anfitrión conoce su nivel y `n`). Más un tope de reclamaciones por segundo.
3. **Velocidad máxima** sobre el estado de 20 Hz (con margen para Carrera, Parpadeo y empujes).
4. **El anfitrión fija el campo `de`** de cada `AID`/`CAST`/`FIELD` que reenvía: nadie se hace pasar por otro.
5. Nada de firmas con claves escondidas en el cliente: el código es público.
6. **Lo que depende del objetivo lo pone el anfitrión:** la Debilidad, el empuje por golpe y la amenaza de daño salen de su estado y de la fracción; un invitado no puede inflarlos mandando números absolutos.

### 5.3 Seguridad entre jugadores (bloqueante de F1)
| Riesgo [V en el código] | Medida |
|---|---|
| XSS: `heroName` (`ui.js:2894`), `item.name`/`item.icon` (`ui.js:2670, 2723, 2812, 3071`) se pintan con `innerHTML`; 119 `innerHTML` en `ui.js`; sin CSP | `js/sanitize.js` puro: `esc()` único (hoy hay 3 copias), `sanitizeHeroName` (`^[\p{L}\p{N} '\-]{1,20}$`), `sanitizeSave` con lista blanca de `PLAYER_SAVE_FIELDS` y **objetos rehechos desde el catálogo** (nunca se pinta el `name` recibido). Todo lo remoto con `textContent`. |
| Contaminación del prototipo: `Object.assign(this, saved)` (`entities.js:524`) con un `"__proto__"` propio | *Reviver* que descarta `__proto__`, `constructor`, `prototype`, o copiar solo campos de la lista blanca. Prueba unitaria. |
| `importSave()` (`main.js:337-349`) acepta cualquier JSON | Pasa por `sanitizeSave`. |
| Sin CSP | **Corregido en la ronda 2** (la v4 se equivocaba: los `onclick` de `ui.js` son asignaciones de propiedad, líneas 548-649 y 1507-1518, y la CSP los permite). Lo que la CSP bloquea son **4 atributos `onerror="…"`** dentro de plantillas (`ui.js:805, 947, 1352, 1357`; el de la 805 además mete `${v.icon}` dentro de un string de JS) [V]. Hay además **≈ 40 atributos `style="…"`** en plantillas de `ui*.js` (39 líneas), las fuentes de Google (`index.html:15-17`) y el registro del SW en línea (`index.html:491-495`) [V]. CSP de partida en `vercel.json`, primero en `report-only`:<br>`default-src 'self'; script-src 'self' https://cdn.jsdelivr.net https://challenges.cloudflare.com 'sha256-<importmap>' 'sha256-<registroSW>'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self' https://cdn.jsdelivr.net wss://<signal>.workers.dev https://<ref>.supabase.co wss://<ref>.supabase.co <relés Nostr elegidos>; worker-src 'self'; frame-src https://challenges.cloudflare.com; object-src 'none'; base-uri 'self'; frame-ancestors 'none'`<br>Detalles:<br>• `connect-src` incluye jsdelivr porque el SW precachea three.js con `fetch`, y sin eso el modo sin conexión se rompería en silencio (`catch(() => {})`).<br>• `worker-src` cubre el metrónomo (H1b) y H2.<br>• Los 4 `onerror=` pasan a **un único listener delegado** (`addEventListener('error', …, true)` en el contenedor), y una prueba estática prohíbe `on[a-z]+="` en `js/`.<br>• `d3@7` no se importa en ningún `js/` [V]: sale del import map.<br>• `integrity` en el import map (Chrome 127+ y Safari 18; Firefox sin confirmar, no rompe) [S]: protege la sesión de Supabase si el CDN se ve comprometido. |
| Mensajes malformados | Decodificador con comprobación de límites y `try/catch` por mensaje; tamaño máximo por canal; ritmo máximo por par **sacado del banco** (§5.4). Esto cubre bytes y largos; los **valores** los valida cada receptor (§5.4). |
| Adivinar códigos de sala | **Código firmado** (24 bits de sala + 16 de HMAC): el Worker rechaza los no emitidos sin crear un DO; límite de ritmo en el Worker; Turnstile al crear; **aprobación del anfitrión** (§3.8). |
| Suplantar al anfitrión ante el DO | `hostToken` de 128 bits (hash en SQLite); aceptar, rechazar, expulsar y cerrar solo desde su socket; `rejoinToken` de un solo uso, renovado en cada reconexión. |
| Otra web gastando la señalización | Lista de `Origin` permitidos y entornos separados (§3.8). |
| Abuso de TURN | Credenciales solo por el DO de la sala, con `customIdentifier`; **revocación** al cerrar o expulsar; tope diario y corte a ~800 GB medido por GraphQL (§3.10). |

### 5.4 Validación de valores en cada receptor (bloqueante de F1)
El anfitrión no es el único que aplica cosas: `AID` y `FIELD` los aplica **quien los recibe**. Un `f32` puede llegar como NaN, ±Infinity, −0 o negativo, por un error o a propósito: una cura NaN deja `hp = NaN`, el guardado lo escribe como `null` (`JSON.stringify` convierte NaN e Infinity en `null` [V: ECMA-262]) y el héroe queda roto en `localStorage`; una redirección enorme mata al protector, y en Hardcore para siempre. Por eso **cada receptor** valida, en el módulo puro `js/net/protocol.js`:

| Regla | Detalle |
|---|---|
| Números finitos | `Number.isFinite` en todo `f32`; −0 → 0. Un mensaje con NaN o ±Infinity se descarta entero y cuenta como falta del emisor. |
| Rangos | Fracciones de `HIT`, `HITS` y `TICKS` en (0, 1]; `debilidad %` ≤ el tope del saco; `saliente %` en [10, 100]; arriendos `EST` con `%` ≤ el tope de su tipo y ≤ 32 por paquete; `DISP` ≤ 6 m; duraciones ≤ el tope de su tipo (control ≤ 6 s, campos ≤ 30 s, arriendos ≤ 12,75 s); posiciones dentro de la rejilla. **v5.2:** un `t0` más de 1 s en el futuro del receptor descarta el urgente; un `FIELD` se aplica como mucho 8 veces por segundo (el doble del tope del emisor, por el jitter): si llegan más, el receptor guarda solo la de `ver` mayor y la aplica al abrirse la ventana, así nunca pierde el último estado; los bits de `mods` que el receptor no conoce se ignoran. |
| Topes relativos al emisor | El anfitrión usa el `RemoteHero` del emisor (reconstruido con el mismo `recompute()`). Los demás invitados no tienen su guardado (§3.2 T4): usan los **stats publicados** que el anfitrión calculó y puso en el perfil. Topes: cura o escudo por evento ≤ la vida máxima del receptor y ≤ 2× por segundo; `AID{redirección}` ≤ vida máxima de la víctima × % del Vínculo **del propio protector** (lo conoce él) por evento, una cada 100 ms **y, sumadas, esa misma cota por segundo** (v5.1: sin tope por segundo, diez redirecciones válidas por segundo podían quitarle al protector 3 veces la vida de la víctima; lo que excede se descarta, a favor del protector); `amenaza×` ≤ 10. |
| Ritmo (ronda 2) | Los topes fijos de la v4 (60 `HIT`/s, 120 tics/s) quedaban **por debajo de la cadencia real**: una Maga con quemadura y campos sobre 60 enemigos genera ≈ 240 tics/s, y la estela del Paso de Escarcha pulsa cada 0,25 s (`skills-maga.js:476`) [V]. Ahora:<br>• los topes por emisor y por tipo salen del **peor caso del banco GRUPO por clase × 2**, se versionan con el protocolo y los fija una prueba;<br>• cuentan **mensajes** ya agrupados (`HITS` por lanzamiento, `TICKS` por fuente cada 0,25 s) y arriendos por paquete, no tics sueltos;<br>• lo que excede se **descarta sin aviso**. Solo tras **10 s sostenidos** aparece el icono de alerta en su marco; nunca se expulsa sola a nadie (el anfitrión puede hacerlo). |
| Guardado | `save()` recorre los campos numéricos de `PLAYER_SAVE_FIELDS` y **se niega a escribir** si alguno no es finito: conserva el guardado anterior y anota el motivo. Entra en F0 (#11) porque protege también al solitario. |
| Hardcore | Al crear o unirte a una sala HC, icono de calavera con apretón de manos («solo con gente de confianza»): en el modelo B un compañero tramposo puede matarte para siempre. |
| Fuzz | `net-protocolo` con NaN, ±Infinity, −0, fracciones negativas o > 1 y ráfagas: nunca lanza ni deja un estado no finito. |

---

## 6. Separación del código y su orden (F0)
**Objetivo:** que el mundo pueda tener varios héroes y que la simulación no dependa de la ventana, **sin cambiar el solitario**. Cada paso se cierra con `npm test` en verde y el banco y el humo en banda (por turno).

| # | Qué | Dónde | Por qué va en este orden |
|---|---|---|---|
| 1 | `tick()` → `simStep(dt)` + `present(realDt)` + `advanceTo(t, tope)` | `main.js:1544-1818` | Todo lo demás cuelga de aquí (anfitrión oculto, red, pruebas). |
| 2 | Hit-stop solo visual; pausa solo en solitario | `main.js:1552-1574`, `vfx.js:27` | El crítico de uno no puede congelar a cuatro. |
| 3 | Streams `ai` y `combat`; `killLootRng(seed, heroId, netId)`; `p.combatRng` por héroe (arregla el `rng(p)` fijo en 0,5 de `powers-maga.js:258`); los 36 `Math.random` de simulación a streams | `rng.js`, `entities.js`, `game-zone-life.js`, `enemy-abilities.js`, `main.js` | Botín personal reproducible. |
| 4 | `heroId` (`crypto.randomUUID()`) en el guardado → **`SAVE_VERSION` 6**; ids de red por mundo (`g.nextNetId()`) **sin reutilizar dentro de una época**, y contador de época del mundo | `save-schema.js`, `entities.js:1843`, `field-entities.js:79`, `main.js:72` | Identidad estable en la red y en la nube; nada de un mundo cae en otro. |
| 5 | **Varios héroes:** `g.heroes()`; `takeDamage({ by })` y `Projectile.owner`; `acquireTarget()` (el héroe vivo, visible y más cercano); los efectos enemigos dañan a **todos** los héroes. **Daño en dos factores** (`attackerPart` y `targetFactor` en `combat-math.js`; en solitario el producto es idéntico). **Empuje por golpe y `displace` como funciones del mundo** (`e.knockFromHit(frac, desde)`). El multiplicador saliente viaja con el ataque (`Projectile`, telegrafiado, golpe). D17 (✅ aprobada por el dueño, 22-oct): preparación del cuerpo a cuerpo enemigo (`beginStrike`), con un interruptor para probarla en solitario | `entities.js:88-96, 1313, 2201, 2249-2342, 2526, 2685-2728, 2931-2952, 3155-3183`, `main.js:882, 931, 1666-1670`, `enemy-abilities.js:44, 116, 234, 252-266`, `combat-math.js:249-259` | Hoy todo supone `g.player`, y el daño, el empuje y la Debilidad se mezclan en `Enemy.takeDamage`. |
| 6 | **Vida enemiga como fracción** (`e.hpFrac`, `e.applyFrac`) y `partyHpMult(n, rango)`; `pisoDeVista`. **Amenaza en fracciones de la vida de vista** (`threatFromFrac`; la de curas dividida por la vida de vista del que cura); el piso de 1 de `forceTarget` pasa a 1/vida máxima | `entities.js:2117-2151, 2316-2318`, `game-skills.js:900-910`, `combat-math.js:437-443`, `buffByPact` (`main.js:998`) | Base del escalado, de los niveles distintos y de una amenaza justa entre niveles. En solitario es idéntico: todas las fuentes se dividen por la misma vida, así que las razones y la histéresis no cambian. |
| 7 | `onEnemyKilled` → `resolveKill(e)` (mundo) + `grantKill(p, e, kill)` (héroe) | `main.js:1134-1323` | La muerte la decide el anfitrión; las recompensas, cada cliente. |
| 8 | **Bus de presentación:** `emitFx` (64 llamadas), `sfx`, `ui.message`, sacudida, `flashDamage` → `g.events` con presets serializables (coordinar con el rework de VFX) | `main.js`, `game-skills.js`, `enemy-abilities.js`, `fx-*.js`, nuevo `js/events.js` | Que un lanzamiento remoto dispare el mismo efecto, y que en F3 la simulación corra sin DOM. |
| 9 | Seguridad (§5.3), con la CSP real: los 4 `onerror=` a un listener delegado, prueba contra `on[a-z]+="`, hashes del import map y del registro del SW, `d3` fuera del import map | `js/sanitize.js`, `ui*.js`, `main.js:337`, `entities.js:524`, `vercel.json`, `index.html` | Bloqueante antes de recibir datos de otros. |
| 10 | Mapa compartido: `buildRefuge(seed)`, y el Refugio entra en `createWorldRng` (hoy `main.js:470` solo siembra mazmorra y zona) y en `welcome.world.seed` (v5.2, nota del verificador); `buildTown` borrado (solo lo usan tests) o sembrado; distancias al cuadrado en `zones.js:217`; `test58` con **hash de la rejilla contra una constante** (Cripta con campamento, Refugio, una mazmorra, una zona) | `world.js`, `zones.js`, `main.js:472-473`, `tests/test58` | Misma colisión en todas las máquinas. |
| 11 | Guardado con debounce **y negativa a guardar valores no finitos** (§5.4) | `main.js:1315, 1471`, `save-schema.js` | Menos trabajo por muerte; guardado inmediato en hitos; un NaN nunca llega a `localStorage`. |
| 12 | **Escrituras del héroe sobre enemigos, solo por API (ronda 2).** Hoy se escriben campos del enemigo directo, sin pasar por ningún método que una réplica pueda interceptar. El experto contó 11 sitios en 6 archivos; **v5.1:** un grep más amplio (`hp`, `maxHP`, `def`, `pos.x/z`, `*T`, `aggroed`, `marks` con `=`, fuera de `entities.js`) encuentra más [V]. **Siete** están en código del héroe:<br>• el arrastre de la carrera (`e.pos.x += dx`, `game-skills.js:422`) y la junta al llegar (`:394`);<br>• `e.vulnT =` de Estampida y Guardia Rota (`powers-guerrero.js:2042, 2293`) y **de la Gracia del tercer paso de Rajar** (`:2019`; se le había escapado a la ronda 2);<br>• `e.numbT =` del Aterido de jefe (`mech-maga.js:118`);<br>• el empuje del muro definido en `powers-maga.js:3140-3148`.<br>Otros cinco están en `field-entities.js` (`:130, 394-395, 430-433`), que es del mundo y en grupo corre en el campo-sombra del anfitrión. **Del mundo, pero fuera de esos módulos (v5.1):** el Tormento y el pacto al aparecer (`buffByPact`, `main.js:1003-1010`), el aggro al aparecer (`:1019`), los esbirros del Nigromante al morir su invocador (`:1196-1199`) y el pacto aceptado con enemigos presentes (`game-world-flow.js:140-142`). En un invitado, las siete escrituras del héroe cambiaban solo su réplica y el anfitrión nunca se enteraba. Arreglo:<br>• API nueva: `e.applyVuln(dur)`, `e.applyNumb(dur)` y el arrastre como función del mundo, `g.dragAlong(hero, ruta, ancho)`;<br>• las cuatro del mundo pasan a `e.rescale(vida, daño, vel)` y `e.aggro()`, porque un lint por archivo no distingue las funciones del mundo dentro de `main.js`; el pacto a mitad de mundo y el Nigromante cambian la vida máxima de vista y se replican (`pact`, `SPAWN` con `invocador` y, v5.2, con `u8 mods` para el esbirro que aparece después de morir su Nigromante; §2.4). `e.rescale` deja anotado en el enemigo lo que cambió (`e.mods`), para que el anfitrión llene el `SPAWN`;<br>• el muro de `powers-maga.js` declara `blocks` y lo mueve `constrainMove` del mundo;<br>• **prueba de lint** al estilo de `test67`: prohíbe escribir `hp`, `maxHP`, `def`, `pos.x/z`, `*T`, `aggroed` o `tauntSrc` de un `Enemy` fuera de `entities.js` y de los módulos del mundo (`field-entities.js`, `enemy-abilities.js`, `game-zone-life.js`). **`marks` no entra en el lint** (discrepo del experto en ese detalle): es del dueño (D14) y el código del héroe la crea con todo derecho (`game-skills.js:2081`);<br>• cada mutador llamado dentro de un `onTick` o del `tick` de un campo se declara **estado continuo** (irá como arriendo) o **evento** (irá como urgente). | `game-skills.js`, `powers-guerrero.js`, `mech-maga.js`, `powers-maga.js`, `main.js`, `game-world-flow.js`, `entities.js`, test nuevo | Sin esto, la réplica no ve esas mutaciones y aparecen desincronizaciones silenciosas. En solitario es idéntico: la API hace lo mismo que la escritura directa. |
| 13 | **`js/build.js` con `BUILD`** (una prueba exige que coincida con `VERSION` de `sw.js`), **`simHash`** de las fuentes de simulación generado por una prueba, y `version.json` publicado (§3.7) | `js/build.js`, `sw.js`, `tests/`, raíz | La compatibilidad entre amigos no puede depender de un número que sube con cada cambio de CSS. |

**Lo que NO entra en F0 (decidido):**
- **Mover el estado de lanzamiento a `p.cast`** (101 usos + 19 de entrada + 43 de lanzador implícito + 12 guardas `player !== p`; recuento unificado en la v5.2 con un grep en `4095ab6`, que coincide con el del verificador): con B nadie simula un héroe ajeno. Se paga solo si se elige el modelo A (F4). Coincido con `tecnologia.md` frente a `codigo.md` 0.18.
- **Paso fijo con render interpolado y `simPos`/`prevPos`:** F3.
- **`main.js` y `ui.js` siguen sin importarse headless.** La red vive en módulos puros (`js/net/*`), probados con el arnés.
- **Campos-sombra, `TICKS`, arriendos, vista de juego, reconciliación, muerte prevista y la regla de tiempo:** son de F1 (E6 y E9). F0 solo deja las costuras: daño en dos factores, empuje, desplazamiento y arrastre como funciones del mundo, escrituras por API, amenaza en fracciones y la clasificación de cada campo (¿mueve, frena o debilita enemigos?) declarada en su `defineField`.

---

## 7. Impacto en los sistemas del Paso 2
| Sistema | Hoy | En grupo (modelo B) |
|---|---|---|
| **Amenaza y provocación** (`entities.js:2117-2151, 2316-2318`; `g.addThreat`, `g.forceTarget`, `combatTarget` con histéresis) | `Map` con objetos como clave, en daño absoluto; solo `g.player` | El anfitrión la guarda por `heroId` (y por id de campo para los señuelos) en **fracciones de la vida de vista**: un golpe suma `fracción aplicada × amenaza×` del `HIT`; una cura llega como `THR{sumar}` ya dividida por la vida de vista de cada enemigo **del que cura**. Así un tanque Nv 30 retiene frente a un Nv 60 que, con la misma fracción, haría 22 veces más daño absoluto. Provocar: `CC{provocar}` o `THR{provocar por campo}`. Adquisición inicial por cercanía (`acquireTarget`). Los héroes **ausentes** o **invisibles** (bandera) no se eligen. |
| **Curas y escudos a aliados** (`g.heal`, `g.shield` con `target: 'lowest'/'all'`, `g.allies()` ya incluye `g.party`) | `RemoteHero` en `g.party` | El lanzador elige con la vida % replicada (20 Hz) y manda `AID{cura/escudo, cantidad ya escalada por su healPct}`; el dueño aplica `healSkill`/`addShield` con sus modificadores de curación recibida, **después de validar** (§5.4). |
| **Auras y campos sobre héroes** (`type: 'aura'`, Estandarte de Guerra, Bomba de Humo `allyDr`, Sello de la Maga, Manto) | Campo del dueño que bufa cada 0,5 s a quien está dentro | `FIELD` replicado con sus valores **ya resueltos** por el rango del lanzador. **El cliente del receptor** decide si está dentro y se aplica el bufo. Sin mensajes cada 0,5 s. |
| **Campos sobre el mundo:** muros de la Maga (`blocks`: `skills-maga.js:234, 375-377, 810`), encierros de la Arquera y del Guerrero (`contain`: `skills-arquera.js:129`, Desafío en `skills-guerrero.js:188, 380`), cebos y señuelos (`lure`: `skills-arquera.js:784-787`) | `constrainMove` y `lureStep` corren contra los enemigos locales (`field-entities.js:383-430, 646-672`) | **Campo-sombra en el anfitrión:** `FIELD` v2 (línea con extremos y ancho, o círculo; máscara bloquea / encierra / atrae; parámetros del cebo; armado) crea una copia sin daño ni dibujo, y el anfitrión corre `constrainMove` y `lureStep` con ella. «Ya pelea contigo» (`LURE_MELEE_R`) se mide contra el **dueño** del campo. **Ronda 2:** los campos que **ralentizan o debilitan a quien está dentro** (la estela del Paso de Escarcha, que pulsa cada 0,25 s en `skills-maga.js:476`, y el Sello con Glosa, cada 0,5 s en `powers-maga.js:3105`) también son efectos del campo-sombra (`ralentiza %`, `debilita %`): los aplica el anfitrión con sus posiciones, sin un mensaje por pulso. El daño del campo lo sigue reclamando su dueño (`TICKS`); la detonación de una trampa la detecta el dueño sobre sus réplicas y avisa con `FIELDX{detonado}`. Los emisores (Familiar, Halcón, Pendón) no mueven enemigos: siguen solo en su dueño. **v5.2 (R1-B-2):** los campos que cambian **después de nacer** (Cebo de Caza, que vuelve cebo cada trampa tuya; Gran Cacería; Zarzal Creciente con Jaula de Espinas; Zarzas Trepadoras; Tierra Bendita; Senda Ardiente) reemiten su `FIELD` como actualización, detectada por un hash al final de cada fotograma (≤ 4 por segundo por campo, §3.4). La sombra vive hasta su `FIELDX` o su `ms` + 1 s. En el cliente del invitado, `constrainMove`, `lureStep`, el empuje del muro y el arrastre **no tocan réplicas**. |
| **Apoyo: Debilidad, Vulnerable, debilitamiento saliente, Aterido, ralentizar, aturdir** (`combat-math.js:249-259`, `entities.js:1936-1998, 2189-2205, 1313`) | Estado **numérico** del enemigo: un saco que suma con tope y un producto de entradas | Del anfitrión. **Ronda 2:** lo idempotente con duración (Debilidad, saliente, Vulnerable, Aterido, ralentizar) llega como **arriendo `EST`** en cada paquete de estado del invitado (20 Hz; v5.2); lo discreto con rendimientos decrecientes (aturdir, congelar, inmovilizar), como `CC` urgente. Así los talentos que refrescan en **cada fotograma** con 0,3–0,7 s de duración no inundan la red ni parpadean: Presa Herida (`powers-arquera.js:2537`, «+10 % de todo el grupo»), Hielo Quebradizo (`powers-maga.js:2139`) y Espinas Venenosas (`powers-common.js:208`) [V]. Se aplica como **factor del objetivo** a cada golpe al llegar; se replica en la extensión `MOD` y en `ATK`/`PROJ` (`saliente %`). **Compartido** por el grupo. |
| **Desplazamientos:** tirones y empujones (`entities.js:88-96, 2249-2280`), empuje en cada golpe (`2331-2342`), Vórtice (`enemy-abilities.js:252-266`), **carrera con arrastre** del Guerrero (`game-skills.js:388-424`) | `e.displace` y el empuje mueven al enemigo en el acto; el Vórtice mueve a `g.player`; la carrera escribe `e.pos` en cada paso | `DISP` al anfitrión, que aplica `displace` con sus rendimientos decrecientes y, en jefes, la conversión a Quebranto. El empuje por golpe lo calcula el anfitrión desde la fracción del `HIT` (es su `pct`) y la última posición del atacante; tu cliente solo dibuja la reacción. El Vórtice llega como `ATK{vórtice}` con la posición del enemigo y lo aplica la víctima. **La carrera con arrastre** (un desplazamiento continuo que `DISP` no expresa) es un **campo-sombra «arrastra»**: una línea con la ruta, su ancho y su duración. El anfitrión mueve un punto virtual por la ruta, arrastra a los no jefes que toca y al final los junta a 0,8 × radio, como hoy. Tu cliente lo predice en la vista de juego para que tu golpe de llegada los encuentre. Guardia Rota marca Vulnerables a los arrastrados con un arriendo. |
| **Proyectiles enemigos** (`entities.js:3170-3183`) | Se borran en el primer héroe que tocan | La víctima manda `PROJX` y los demás lo borran: el tanque sigue cubriendo a la maga (D19). |
| **Auras enemigas y Espinoso** (`entities.js:2721-2734, 1717-1718`) | Daño o ralentización por cercanía a `g.player`; reflejo al que pega | Las auras las resuelve la víctima contra la posición **dibujada**; Espinoso lo calcula el atacante con su daño de vista. No viajan. |
| **Stagger y Quebrantado** | `addStagger`, por % de vida | Del anfitrión; los puntos viajan en `HIT`/`CC`/`DISP`, calculados contra la vida **sin** multiplicador de grupo. Valor y bloqueo se replican (extensión `JEFE` y banderas) para el marco del jefe. |
| **Lanzamientos interrumpibles** (`entities.js:2152-2170`) | `beginCast`/`interruptCast` locales | `castId` y progreso en la extensión `JEFE` (la barra que te dice cuándo cortar); interrumpir = `CC{interrumpir}`; lo decide el anfitrión con `interruptCast`. |
| **Ganchos ⑫ síncronos** (Vínculo del Guardián, Intercesión, Bastión Eterno: `powers-guerrero.js:2339, 2750, 2769`) | `g.damageAlly` llama a `onAllyDamaged`/`onAllyLethal` del protector en el acto | **Guardas replicadas:** el protector publica en el héroe protegido `AID{guarda: vínculo 30 %, intercesión lista}`. El **cliente de la víctima** aplica la guarda al recibir daño, se queda a 1 de vida si hay Intercesión y manda `AID{redirección}` / `AID{consumida}` al protector, que aplica su parte y arranca el enfriamiento. Si dos la consumen a la vez, se salvan los dos una vez (aceptado). **Aceptado también (v5.2, nota del verificador):** la víctima ya se quitó su parte en local; si la `AID{redirección}` se pierde (nunca pasa a `r`, §3.2 T2) o el protector la descarta por el tope por segundo (§5.4), ese daño no lo recibe nadie. Está acotado por la misma cota y no daña a nadie. `AID{consumida}` sí pasa a `r`, para que el protector siempre arranque su enfriamiento. |
| **Marcas y mecánicas por enemigo** (Escarcha del Crionte, Presa y cepos del Montaraz, marcas con `by`: `game-skills.js:2129-2140`, `spec-mechanics.js:186-193`) | Sin dueño | **Por dueño** (decisión D14): cada cliente guarda las suyas por `netId`. El efecto sobre el enemigo (congelar, inmovilizar, Vulnerable) sí va al anfitrión. `markDetonation` comprueba `m.by`. **Ronda 2:** el estado del dueño se indexa por el **objeto** réplica (`Set`/`Map` de los poderes, marcas, DoT del planificador), así que las réplicas viven en un **pool por `netId`** y quedan latentes ≥ 10 s al salir del área de interés (§3.5): alejarte y volver conserva tu Escarcha. |
| **Barras de mecánica** | Del jugador local | Igual. Solo un icono pequeño en el marco del aliado si su mecánica afecta al grupo (p. ej. «Vínculo listo»). |
| **Invisibilidad** (`p.goInvisible`) | Local | Bandera en el registro de héroe: la IA del anfitrión no lo elige. |
| **DoT** (`g.applyDoT`, `dotsOf`, `hasDoT`, `dotRemaining`, `consumeDoT`, `replaceDoT`, ⑬ `onDotEnd`: `timers.js:96-160`, `game-skills.js:1171-1180`) | Planificador local; un DoT por fuente `<habilidad>:<tipo>` | **Los simula su dueño** (decisión D18): `g.applyDoT` corre en tu planificador contra tu réplica y los tics viajan en `TICKS`, **agrupados por fuente cada 0,25 s** (fracción antes del objetivo). Así la API completa y ⑬ funcionan igual que en solitario y sin mensajes nuevos: Sangría y Desangrar del Guerrero (`powers-guerrero.js:1728-1775, 1905-1999`, `mech-guerrero.js:87`), las quemaduras de la Maga (`skills-maga.js:340`, `powers-maga.js:417-440, 1188, 1824-1853, 2010-2109, 3090`) y un poder de la Arquera (`powers-arquera.js:414`): 26 usos en total. Además no chocan las claves `<habilidad>:<tipo>` de dos jugadores de la misma clase. Los DoT **ajenos no cuentan** para tus talentos (como D14); solo se ven (máscara de DoT en las banderas). Con el `KILL`, tu planificador corta los tics de ese enemigo. Si quedas ausente o te desconectas, tus DoT se detienen (aceptado: tu héroe tampoco pelea). |
| **Campos dañinos del héroe** (trampas, zonas de fuego) | Del dueño | Los simula su dueño contra sus réplicas y reclama con `HIT`/`TICKS`. |
| **Mascota** | Del dueño | La simula su dueño; se replica como adorno (posición). Recoge solo tu botín. |
| **Banco de balance** | APOYO con 2 aliados fantasma | Escenario nuevo **GRUPO**: 4 héroes (tanque + apoyo + 2 de daño) contra jefe y manadas, con `partyHpMult`. Calibra los `k` y valida los objetivos de rol. **Ronda 2:** también saca el peor caso de mensajes por segundo de cada clase (los topes de §5.4) y mide el daño enemigo perdido con la preparación de D17. |

---

## 8. Pruebas
**Regla del dueño:** una prueba pesada a la vez en toda la PC (`tools/turno.mjs`). Durante el trabajo, solo suites sueltas.

| Capa | Qué | Dónde |
|---|---|---|
| **Pura** | Protocolo: ida y vuelta de cada mensaje (también `HITS` con su error logarítmico ≤ 0,02 %, `EST`, `KILL` con máscara y `PROJX`); **fuzz** (bytes al azar nunca lanzan; NaN, ±Infinity, −0 y fracciones fuera de [0, 1] se descartan; una ráfaga de `AID{redirección}` nunca quita al protector más que la cota por segundo); topes y ritmos de §5.4 **sacados del banco**; paquete ≤ 1.100 B con 100 entidades, sus extensiones y 32 arriendos; urgentes ≤ la mitad del paquete; versiones y épocas distintas se rechazan; ids cíclicos deduplicados en el borde de 65.535. **v5.2:** dos contadores de ids (golpes y resto) con su ventana; `golpeAcum`/`golpeBits` de ida y vuelta; un urgente de vida corta nunca sale por `r` y uno de vida larga sale con `t0`; un caducado entra en la ventana de duplicados; la edad real se calcula con el `tick` de la cabecera (un paquete viejo con `edad` 0 igual caduca); un `FIELD` con `ver` vieja no pisa a la nueva y nada pisa a un `FIELDX`; `SPAWN` de 14 B con `mods` | `tests/net-protocolo.mjs` |
| **Pura** | **Contrato de réplica (ronda 2: lecturas, escrituras y mutadores):**<br>• recorre los campos de enemigo que lee el código del héroe (`powers-*.js`, `skills-*.js`, `game-skills.js`, `spec-mechanics.js`, `mech-*.js`, `field-entities.js`) y exige que la **vista de juego** de `replica.js` los dé, o que estén en la lista de lo «del dueño». Recuento de hoy: `pos`, `alive`, `def`, `hp`/`maxHP` (de vista), `frozenT` 11, `vulnT` 6, `slowT` 6, `numbT` 5, `rootT` 3, `staggerBrokenT` 3, `debuffs` 3, `stunT`, `aggroed`, `tauntSrc`; `marks` (12) es del dueño (D14);<br>• **escrituras:** ninguna escritura directa fuera de `entities.js` y del mundo (es el lint de F0 #12);<br>• **mutadores en `onTick` y en el `tick` de los campos:** cada uno debe estar declarado como arriendo o como evento;<br>• **campos que cambian después de nacer (v5.2):** toda escritura en `f.radius`, `f.width`, `f.pos`, `f.t`, `f.dur`, `f.armAt` o `f.data.(lure|contain|blocks|slow|slowPct|…)` de un campo de héroe fuera de `field-entities.js` la lee el hash de actualización o llama a `g.fieldChanged(f)` (§3.4);<br>• **en el cliente del invitado ninguna función de campo mueve réplicas** (`constrainMove`, `lureStep`, empuje del muro, arrastre): con un muro y un cebo sobre réplicas, sus posiciones solo cambian con las instantáneas;<br>• auras enemigas y Espinoso, clasificados (§3.5). | `tests/net-contrato.mjs` |
| **Pura** | `sanitize`: `heroName` y nombres de objeto con `<img onerror>`, `__proto__`, números enormes; `save()` con un NaN no escribe y conserva el anterior; **ningún `on[a-z]+="` en `js/`**; `BUILD` = `VERSION` | `tests/net-sanitize.mjs` |
| **Simulación de red headless** | `LoopbackNet` con semilla: latencia (150 ms), jitter (±30), pérdida (5 %), duplicados y desorden. 2 a 4 juegos del arnés (`makeHarness`, Player y Enemy reales): uno de anfitrión, el resto con réplicas | `js/net/loopback.js`, `tests/net-sim.mjs` |
| | Propiedades: **sin muertes fantasma**, **sin dobles créditos**, la vida converge en < 300 ms tras el último golpe (también con Debilidad de un apoyo), **la barra mostrada nunca sube sin una cura**, cada `KILL` produce el mismo botín en el cliente que lo tira dos veces, **un ausente no gana nada**, ancho de banda medio ≤ 25 KB/s por invitado **contando sobrecarga, ~4 copias de los urgentes y SACK**, instantáneas a 20 Hz exactos con el anfitrión bombeado a 60 Hz, **la adaptación baja a 15 Hz** al crecer `bufferedAmount` | |
| | Unión tardía **en combate** (los demás no pierden instantáneas), excursión y vuelta, reconexión a los 5 y a los 30 s, anfitrión «oculto» (`advanceTo` llamado de a ráfagas); **viaje con paquetes en vuelo** (nada de la época anterior se aplica); **el anfitrión viaja mientras un invitado pelea**; **pausa y reanudación** (no caduca ningún tic ni vence ningún bufo); **corte de 2 s y vuelta** (v5.2: `LoopbackNet` retiene `r` y lo entrega de golpe al volver, como SCTP, y suelta tarde unos paquetes `u` encolados; con un `ATK`, un `CC` y un `HIT` en vuelo, ningún daño ni control viejo se aplica y el `HIT` se cuenta una vez); **pérdida en ráfagas que obliga a mandar por `r` un `HIT` letal** y un corte justo después de que el anfitrión aplica un golpe (v5.2: la barra no sube y la muerte prevista no se revierte); **salto de tiempo** (el búfer de interpolación se rearma); **reloj con pérdida** (el RTT por acuses no se infla como el `PING` por `r`); **dos saltos** (atraso adaptativo frente a reenvío inmediato: qué fracción de tiempo va extrapolado cada aliado); **p95 de confirmación de muerte** y % de muertes previstas revertidas, por cada uno de los dos casos | |
| | Paso 2 en grupo, con 150 ms: Vínculo e Intercesión; aura de un aliado; Escarcha de dos Criontes sobre el mismo enemigo; provocación con dos tanques; **apoyo que debilita + invitado que pega** (la vida converge); **muro de la Maga, cebo y encierro de la Arquera, Desafío del Guerrero** (campos-sombra); **tirón, empuje y tirón a un jefe** (Quebranto); **Vórtice** sobre un invitado; **Sangría y Desangrar** consumiendo el sangrado propio; **reemplazo de quemadura** de la Maga y ⑬; **tanque Nv 30 + daño Nv 60** (el tanque retiene); **interrupción** con la barra de lanzamiento replicada. **Nuevas en la ronda 2:**<br>• **congelar y lanzar el Dardo en el mismo segundo da el crítico**, y Quiebrahuesos sobre tu propio Quebrantado;<br>• **Presa Herida e Hielo Quebradizo** sin parpadeo y dentro de los topes;<br>• **carrera con arrastre** (los arrastrados no vuelven a su sitio) y Vulnerable de **Guardia Rota, Estampida y la Gracia de Rajar** para todo el grupo;<br>• **pacto aceptado a mitad de mundo** y **muerte de un Nigromante**: la vida máxima de vista de réplicas y esbirros sigue igual a la del anfitrión (v5.1);<br>• **v5.2:** el Nigromante muere con un esbirro **fuera del área** del invitado (o latente en su pool) y el esbirro entra después, también por una unión tardía: su vida máxima de vista es igual a la del anfitrión (±1 de redondeo);<br>• **v5.2, campos que cambian:** Cebo de Caza sobre una trampa recién puesta (los enemigos del anfitrión van al cepo); Gran Cacería; Jaula de Espinas + Zarzal Creciente + Zarzas Trepadoras (el encierro crece y la sombra no vence antes que el campo); Senda Ardiente (el sendero frena en el anfitrión), todo con 150 ms;<br>• **Aterido** de jefe visto por todos;<br>• **estela del Paso de Escarcha** como campo-sombra;<br>• **proyectil enemigo consumido** por el tanque (la maga no recibe doble golpe);<br>• **aura ardiente** y **Espinoso**;<br>• **alejarse 40 m y volver** conserva la Escarcha y los DoT. | `tests/net-paso2.mjs` |
| **Banco** | Escenario GRUPO (`--group`), con el peor caso de mensajes por clase | `tests/balance-bench.mjs` |
| **Navegador, una PC** | `?net=local`: dos pestañas por `BroadcastChannel` (sin WebRTC). **`&perfil=b` antepone un prefijo a todas las claves de guardado** (`intentorpg_save_slot*` e `intentorpg_stash`, `main.js:288, 1479`), para no pisar el alijo del dueño mientras prueba. Se usan **dos ventanas que no se tapen**: dos pestañas de una ventana dejan una oculta y frenada. `?lag=150&loss=5&jitter=30` inyecta condiciones en el transporte; `?netdebug=1`: RTT, pérdida, KB/s, tipo de candidato, protocolo del relé y navegador de cada par | `js/net/transport-local.js` |
| **Navegador, real (E10)** | Matriz: Chrome, **Edge** y Firefox; pares mixtos Chrome↔Firefox y Edge↔Firefox (Firefox tiene dos implementaciones de SCTP en su árbol, usrsctp y dcSCTP [S]); **2 PCs en la misma red** (mDNS y aviso de red local); relé forzado y **relé por TCP o TLS** (UDP bloqueado); **sesión de más de 2 h con un enlace por relé**; anfitrión tapado con **1 solo invitado**; `chrome://webrtc-internals` y «Copiar diagnóstico». **v5.2:** medir cuántos golpes enemigos te alcanzan cerca del borde de la tolerancia de D17 (alcance + 1 m + mín(1 m, v·½RTT), hasta +2 m) | Manual |
| **Prototipos de riesgo (E0)** | **R1** anfitrión oculto en sus cuatro formas (ventana tapada por otra, minimizada, pestaña oculta y pantalla bloqueada; v5.1): Chrome, Edge y Firefox, **1 invitado**, metrónomo H1b, 30–60 min oculta con los ahorros activados. **R1b (v5.2, medio día):** transferir un `RTCDataChannel` a un Worker y bombear un mundo de juguete desde ahí, en Chrome y en Firefox 144+, con la ventana tapada: dice si H2 es viable antes de necesitarlo. **R2** DO + TURN con los casos de §3.10. **R3** SCTP con 2 % y 5 % de pérdida, 150 y 200 ms, pares mixtos. Criterios en §11 | `tools/net-proto/`, `server/signal/` |

---

## 9. Ladder (después del co-op)
| Fase | Qué | Protege de | Costo |
|---|---|---|---|
| **F2 · Ladder «de honor»** | El servidor emite la semilla (de un uso) y **mide el tiempo con su reloj**. Héroes de **temporada** separados (también «de honor» en F2: se escriben por RPC, pero el cliente simula). Topes de plausibilidad y grabación para revisar a mano. Categorías 1, 2, 3 y 4 jugadores (marcadas «sin verificar») | Errores y trampas burdas | US$0 (Supabase + R2) |
| **F3 · Grieta de desafío verificada (B′)** ✅ | Semilla semanal y **build fija** para todos. Juegas en local a 0 ms y mandas tus entradas en vivo al DO (lotes a 10 Hz, CRC cada 60 ticks). El DO re-simula con matemática determinista y **su resultado es el oficial**. El reloj del servidor detecta la cámara lenta y el rebobinado (TAS) | Todo salvo un bot en tiempo real | US$0; US$5 al mes al crecer |
| F4 · Temporada en servidor | El héroe de temporada solo existe en el servidor (modelo A) | Todo | ~US$13 al mes con 50 jugadores; refactor del modelo A |

**Cómo «mide el servidor» en F2 (ronda 2).** En Supabase no hay otro servidor que Postgres y las Edge Functions; con una tabla del ladder con RLS de inserción por dueño, cualquiera insertaba un tiempo. Ahora:
- `ladder_seeds` y `ladder_runs` **sin `GRANT` de escritura** para `authenticated`.
- Dos funciones `security definer` con `grant execute`:
  - `start_run()` devuelve la semilla y guarda `issued_at = now()`;
  - `submit_run(id, …)` calcula `elapsed = now() − issued_at`, se usa una sola vez y aplica los topes.
- El ladder exige **cuenta permanente** (no anónima: el claim `is_anonymous` en la RLS).
- **Grabaciones** a 2 Hz (posiciones y eventos, ≈ 1 MB por intento, no los 10–15 MB de 20 Hz), solo del **top N** de cada categoría y en **R2**: el 1 GB de archivos y los 5 GB de salida de Supabase se acababan en pocas decenas de intentos.

**F3 (ronda 2):**
- El verificador vive en un **Worker `verify` aparte** (§3.8).
- Ese Worker verifica el JWT de Supabase con **JWKS** (`/auth/v1/.well-known/jwks.json`, claves asimétricas), sin compartir el secreto JWT.
- **Regla de cámara lenta:** `ticksRecibidos(t) ≥ 60 · (t − t0) − holgura`, con una holgura acumulada de hasta 3 s por intento (un corte de Wi-Fi honesto no lo anula). El tiempo oficial lo da el reloj del servidor. Un corte de más de 10 s pausa el intento y lo marca para revisión.

**Qué no reutiliza F3 (v5.1, INV-B-1).** F3 no corre «la simulación de F1» en un servidor ni necesita el modelo A: el DO re-simula **un** héroe con sus entradas, así que el estado de lanzamiento puede seguir en `Game`. Mover ese estado a `p.cast`, pasar `input` al héroe, quitar las guardas `g.player !== p` y predecir habilidades son piezas del modelo A (F4) y se costean ahí (§6). El costo de F3 es determinismo, paso fijo, simulación sin DOM y verificador, no una reutilización de la red de F1.

**Requisitos de F3:** `detmath` (núcleos fdlibm con `+ − × ÷`, 1,10× el costo en bounce#8 [V]) para las 235 llamadas trascendentes y los 15 `**`; prueba de lint al estilo de `test67`; paso fijo de 60 Hz (nunca 30: cuantiza la carga perfecta) con render interpolado; simulación sin DOM; entradas registradas; `g.clockNow` inyectado. **Puerta:** la misma grabación da el mismo CRC en Node, Chrome, Firefox (y Safari si se puede) y workerd. Si falla, queda F2.

Precedente reciente: D4 retiró su primer ladder en la temporada 6 por fácil de explotar y relanzó La Torre con tablas en 2026, con retrasos para investigar problemas de clasificación [S].

---

## 10. Riesgos
| # | Riesgo | Prob. | Impacto | Mitigación |
|---|---|---|---|---|
| R1 | Anfitrión tapado, minimizado o con pantalla bloqueada, **sobre todo con 1 solo invitado** | Alta | Alto | H1 + **H1b (metrónomo en un Worker)** + H3; H2 si R1 falla (adelanta la simulación sin DOM de F3: F1 se reestima); héroe ausente; R1 mide las cuatro formas (tapada, minimizada, oculta, pantalla bloqueada); R1b (v5.2) prueba barato que el canal transferido a un Worker funciona |
| R2 | CPU del DO gratis y reinicios del DO (desalojo, despliegues) | Media | Medio (F1: solo señalización) | Estado de la sala en SQLite; latido con autorrespuesta; reconexión del WebSocket con espera creciente; la partida sigue por WebRTC sin el DO; F3: re-simular por tramos |
| R3 | SCTP: fragmentación, 400 ms de retransmisión, colas, sobrecarga por paquete, **control de congestión con pérdida** | Media | Alto | T1–T9 (adaptación automática); prototipo R3 con 2 % y 5 % |
| R4 | Rejillas distintas entre máquinas | Media | Alto | F0 #10; CRC + bitset; desajustes en las métricas |
| R5 | XSS y contaminación del prototipo | Alta si no se hace F0 #9 | Crítico | `sanitize.js`, `textContent`, CSP |
| R6 | Abuso de credenciales TURN | Baja | Medio | DO emisor, revocación, `customIdentifier`, consumo medido por GraphQL y corte a ~800 GB |
| R7 | CGNAT en LatAm: más relé del previsto (17,7 % medido en 2017 [V]) | Media | Bajo (1.000 GB) | Telemetría anónima por sesión (§3.10): el % real de relé, agregado |
| R8 | Movilidad y canales en réplicas (Carrera, Parpadeo, Remolino) — la lección de Last Epoch | Media | Medio | `net-paso2` con latencia; las réplicas interpolan por marca de tiempo |
| R9 | Subida del anfitrión en conexiones asimétricas | Media | Medio | Modo 15 Hz **automático** (T8); calidad en el lobby; compresión delta si R3 la exige |
| R10 | Escalado por espectador con efectos absolutos del enemigo (escudos de afijo, curas) | Media | Medio | Todo lo absoluto del enemigo pasa a fracción en F0 #6; prueba por afijo |
| R11 | Efectos ajenos tapando los telegrafiados | Media | Medio | Tope por fuente e intensidad de efectos aliados |
| R12 | Choque con los reworks en curso (ítems, VFX) en archivos compartidos | Alta | Medio | F0 #3 y #8 se coordinan con esos frentes; un workflow a la vez |
| R13 | Safari sin probar (el dueño no tiene Mac) | Media | Bajo | Pedir a un amigo con Mac en E10; si falla, aviso «usa Chrome o Firefox» |
| R14 | El protocolo se desfasa del Paso 2: una clave de habilidad, un estado, un desplazamiento, una **escritura directa** o un **refresco por tic** que el protocolo no expresa (lo que encontraron las dos rondas; la v5.1 halló una escritura más del héroe y cuatro del mundo fuera de sus módulos; la verificación de la v5.2 halló **campos que cambian después de nacer** y un esbirro que aparece después de morir su invocador) | Alta | Alto | Contrato de réplica con lecturas, escrituras y mutadores (`net-contrato`), y con las escrituras sobre campos de héroe (v5.2); lint de escrituras (F0 #12), con el patrón amplio de la v5.1; `FIELD` como actualización y `SPAWN` con `mods` (v5.2); `net-paso2` por clase; toda clave nueva de habilidad o de campo declara si toca el mundo y si es arriendo o evento |
| R15 | Valores no finitos o abusivos de un compañero | Media | Crítico en Hardcore | §5.4 en cada receptor; guardado que se niega; aviso en salas HC |
| R16 | Muertes previstas que se revierten (escudos, concurrencia) | Baja | Bajo | Excluir jefes, inmunes, escudados y encadenados; dos casos de reversión; medir la tasa en `net-sim` |
| R17 | **Pestaña del anfitrión dormida o descartada** (Edge, Ahorro de memoria de Chrome, pruebas de congelamiento): termina la sesión de todos | Media | Alto | Sonido audible por defecto, pestaña fijada y lista «Mantener siempre activos», Web Lock, `wasDiscarded` → reconexión; R1 con Edge y 30–60 min (§3.6.1) |
| R18 | **Denegación de servicio a la señalización** por la cuota diaria gratis (un script a ~1,2 peticiones/s la agota) | Baja | Alto (nadie arma salas hasta las 00:00 UTC) | Códigos firmados, límite de ritmo, Turnstile al crear, interruptor y modo degradado (§3.8, §3.10) |
| R19 | **Sesiones por relé más largas que la credencial** | Media | Alto | TTL de 24 h, renovación con `setConfiguration` + `restartIce` [M], R2 con TTL de 5 min |
| R20 | **Versiones distintas entre amigos** (caché del SW, vista previa frente a producción) | Alta | Medio | `version.json` sin caché antes del lobby, `simHash`, recarga el más viejo, entornos separados (§3.7, §3.8) |
| R21 | **Pérdida de héroes en la nube** (F2) | Baja | Crítico | La caché local nunca se borra; copia semanal a R2 con prueba de restauración (§4) |

---

## 11. Plan por etapas
**Reglas de trabajo:** el modelo principal orquesta y juzga; **Opus** implementa guiado; **Sonnet** hace lo mecánico. Un workflow a la vez. Pruebas pesadas por turno. Tras cada ola: juicio de los diffs y correcciones al mismo trabajador. Esfuerzo en **días-trabajador (d-t)**.

| Etapa | Contenido | Trabajadores | Archivos | Esfuerzo | Sale cuando |
|---|---|---|---|---|---|
| **E0 · Prototipos de riesgo** | **R1** anfitrión oculto en sus cuatro formas (ventana tapada por otra, minimizada, pestaña oculta y pantalla bloqueada): Chrome, Edge y Firefox, **1 invitado**, metrónomo H1b, 30–60 min oculta con Ahorro de memoria y de energía, Web Lock y sonido audible. **R1b** (v5.2, medio día): `RTCDataChannel` transferido a un Worker que bombea un mundo de juguete, en Chrome y Firefox 144+. **R3** SCTP con 2 % y 5 % de pérdida, 150 y 200 ms, adaptación automática, pares mixtos Chrome↔Firefox. **R2** Worker + DO (SQLite) + TURN con los casos de §3.10 | 2 Opus (en paralelo, sin tocar el juego) | `tools/net-proto/*`, `server/signal/*` | 6,5 d-t + pruebas del dueño | **R1:** con 1 invitado y en cada una de las cuatro formas, segundos simulados por segundo real ≥ 0,98, hueco máximo entre bombeos ≤ 60 ms y p95 del jitter de instantáneas ≤ 20 ms; la pestaña sigue viva tras 60 min oculta en Chrome y en Edge (o la pausa cooperativa queda decidida). **R1b:** se sabe si el Worker con el canal transferido mantiene ese ritmo tapado, en Chrome y en Firefox. **R2:** una sesión por relé con TTL de 5 min dura 20 min sin cortes; reunirse tras 3 min de DO desalojado y tras un `wrangler deploy`; la fuerza bruta de códigos no toca ningún DO; conecta con UDP bloqueado. **R3:** p99 ≤ 100 ms de demora adicional de las reclamaciones y 0 reclamaciones perdidas |
| **E1 · F0 bucle** | #1, #2, #11 | Opus | `main.js`, `vfx.js`, test nuevo | 2–3 | Banco y humo en banda; solitario igual |
| **E2 · F0 azar, ids, guardado** | #3, #4 | Sonnet + juicio | `rng.js`, `save-schema.js` (v6), `entities.js`, `field-entities.js`, `game-zone-life.js`, `enemy-abilities.js`, `main.js` | 2 | `test57`/`test80` y migración v5→v6 |
| **E3 · F0 varios héroes** | #5, #6, #7, **#12** (con daño en dos factores, empuje, desplazamiento y arrastre del mundo, escrituras por API y su lint, amenaza en fracciones y D17, aprobada, con su interruptor) | Opus | `entities.js`, `main.js`, `game-skills.js`, `game-world-flow.js`, `enemy-abilities.js`, `combat-math.js`, `field-entities.js`, `powers-guerrero.js`, `powers-maga.js`, `mech-maga.js` | 6–7 | Arnés con 2 héroes en un mundo: amenaza, daño a ambos, muerte y botín por héroe; lint de escrituras en verde; banco y humo en solitario sin cambio de banda |
| **E4 · F0 seguridad, mapa y versión** | #9, #10, **#13** y el flujo de actualización del SW de §3.7 (v6: `version.json` directo a la red, `reg.update` y `controllerchange`) | Opus (`sanitize.js`, CSP) + Sonnet (`esc`, `onerror` delegado) | `js/sanitize.js`, `ui*.js`, `main.js`, `entities.js`, `world.js`, `zones.js`, `vercel.json`, `index.html`, `js/build.js`, `sw.js`, `test58` | 3,5 | Cargas hostiles inertes; CSP en `report-only` sin violaciones en una partida; hashes dorados de rejilla; `BUILD` = `VERSION` |
| **E5 · F0 bus de presentación** | #8 | Opus (coordina con el rework de VFX) | nuevo `js/events.js`, `main.js`, `game-skills.js`, `enemy-abilities.js`, `fx-*.js` | 3 | Ningún `emitFx`/`sfx` directo en simulación (prueba de lint) |
| **E6 · F1 red pura y simulación de red** | `protocol` (época, edad, extensiones, `HITS`, `EST`, `PROJX`, la validación de §5.4 con topes del banco), `loopback`, `replica` (**dos vistas**, **reconciliación de la barra**, muerte prevista con sus dos reversiones, **pool por `netId`**, línea adaptativa de §3.5.1), `clock` (tiempo de simulación, RTT por acuses, desfase), `remote-hero`, `host-loop` (instantáneas con reloj propio, redundancia acotada, adaptación automática, elegibilidad en `KILL`), `session` (**viaje pendiente**, **pausa y reanudación**, D21 en HC). Lo de la v6 y la v5.1: `party`, `pact`, `heroDelta` y perfil rehecho, pares inicio/fin, coordenadas desde el origen de la rejilla, `KILL`, `PROJ` y `SPAWN` ampliados, T10. Lo de la v5.2: solo los urgentes de vida larga pasan a `r`, con `t0`; edad real por el `tick` de la cabecera; caducados en la ventana de duplicados; dos contadores de ids y **acuse de golpes** (`golpeAcum`/`golpeBits`) en la reconciliación y en la reversión (a); `SPAWN` con `mods` | 2 Opus en worktrees (protocolo + loopback + reloj · réplica + héroe remoto), luego integración | `js/net/*.js`, `tests/net-*.mjs` | 13,5–14,5 | Propiedades de §8 en verde con 150 ms y 5 % de pérdida; contrato de réplica en verde |
| **E7 · F1 transporte y servidor** | WebRTC (2 canales), transporte local por `BroadcastChannel` (con `perfil`), metrónomo H1b, ciclo de vida de la pestaña (§3.6.1), cliente de señalización con reconexión, **DO con SQLite**, códigos firmados, límite de ritmo, Turnstile, `Origin` y entornos, TURN de 24 h con renovación y filtro del 53, DO «cuota» y su Cron, telemetría por sesión, `version.json`, Trystero de respaldo, mixin `game-net.js` | Opus | `js/net/transport*.js`, `js/net/signal-client.js`, `js/net/metronome.js`, `server/signal/*`, `js/game-net.js`, `sw.js` (ASSETS), `test43` | 7 | Dos ventanas juegan por `?net=local`; dos PCs por WebRTC; los casos de R2 en verde con el código real |
| **E8 · F1 interfaz de grupo** | Hogueras y lobby (con la ayuda para fijar la pestaña y el sonido del anfitrión), marcos de grupo, chat, señales, lápida y revivir, seguir/excursión/viaje pendiente, pausa con cuenta atrás, avisos (relé lento, subida baja), «Copiar diagnóstico», regalo por arrastre. Lo de la v6: código de sala en el fragmento (`#sala=`), Safari sin «Encender hoguera», regalos sin duplicar (guardado inmediato de los dos lados y `giftId`) | Opus | nuevo `js/ui-party.js`, `css/party.css`, `hud-model.js` (`partyView`, `pingView`, puros), `ui.js` (mínimo), menú | 7 | `test71`/`test73` + capturas por turno |
| **E9 · F1 Paso 2 en grupo** | Guardas ⑫, `AID`, `FIELD` v2 y campos-sombra (con ralentiza, debilita y arrastra; v5.2: **actualizaciones por hash** de los campos que cambian después de nacer, `sigue`, y ninguna función de campo sobre réplicas), `DISP`, **arriendos `EST`** de cada clase, DoT del dueño por `TICKS` agrupados, marcas por dueño, amenaza, `PROJX`, auras y Espinoso; escenario GRUPO con el peor caso de mensajes | 1 Opus núcleo, luego 3 Opus por clase | `game-skills.js`, `field-entities.js`, `timers.js`, `spec-mechanics.js`, `powers-*.js`, `entities.js`, `balance-bench.mjs` | 8,5–9,5 | `net-paso2` en verde (lista completa de §8); banco GRUPO dentro de las bandas |
| **E10 · Prueba en vivo y calibración** | Sesiones con amigos con la matriz de §8 (Edge, pares mixtos, misma red, relé por TCP o TLS, **más de 2 h** con relé, anfitrión tapado con 1 invitado); ajustar `k`, XP y tope de efectos con «Copiar diagnóstico» y la telemetría; medir la tolerancia de alcance de D17 (hasta +2 m, v5.2) | Dueño + juez | — | 1 semana de calendario | Meta de §1.1 |
| **F2 · E11–E12** | Cuentas (anónimo solo al activar la nube, Turnstile, *manual linking*), nube con `GRANT` por columna, trigger de `rev` y RPC de temporada, migración, conflictos, sincronización con *keepalive*, copias a R2 y prueba de restauración, privacidad y «Borrar mi cuenta»; ladder de honor por RPC y grabaciones a R2 | 2 Opus | `js/cloud.js`, SQL de Supabase, `server/signal/` (crons), UI | 11–13 | Cambio de PC recupera el héroe; un `PATCH` con curl no cambia `kind` ni `rev`; restaurar desde R2 funciona; tabla de honor por temporada |
| **F3 · E13–E15** | `detmath` + lint, paso fijo + render interpolado, `WorldSim` sin DOM, verificador en un **Worker `verify` aparte** con JWKS, regla de cámara lenta, grieta de desafío, prueba dorada en CI | 3–4 Opus por olas | `js/sim/*`, `server/verify/*`, CI | 15–20 | CRC idéntico entre motores; intento manipulado anulado |
| F4 (opcional) | Modelo A, co-op público, ladder de grupo, servidor en Santiago | — | — | Lo decide el dueño | — |

**Totales:** F0 ≈ 16,5–18,5 d-t · F1 ≈ 36–38 d-t (+ E0 6,5) · F2 ≈ 11–13 · F3 ≈ 15–20.
- **v5.2 · tras la verificación de las altas.** Los cuatro arreglos que el experto pidió suman menos de 1 d-t: **E6 +0,5** (urgentes de vida larga por `r` con `t0`, edad real, acuse de golpes, `SPAWN` con `mods`) y **E9 +0,5** (actualizaciones de `FIELD`, regla de réplicas y sus pruebas). **E0 +0,5** por R1b, el pico de un canal transferido a un Worker que recomendó el verificador. La frase de la v5.1 de abajo («no suman días») queda corregida por esta.
- **v5.1 · una sola tabla.** La pasada v6 había subido el resumen de §0 (F0 16,5–18,5, F1 35–37, F2 11,5–13,5) sin tocar esta tabla. La v5.1 reparte lo que la v6 agregó al cuerpo: **E4 +0,5** (flujo de actualización del SW), **E6 +1** (`party`, `heroDelta`, pares inicio/fin, coordenadas, `KILL` y `PROJ` ampliados, T10, D21) y **E8 +1** (fragmento, Safari, regalos sin duplicar) [D]. En F2 no encontré trabajo nuevo de la v6 en el cuerpo: queda 11–13 y §0 se alinea. Las correcciones de las 15 objeciones altas no suman días: son reglas, pruebas y 5 sitios más en F0 #12 (dentro de E3).
- La ronda 1 sumó ≈ 1 d-t a F0 y ≈ 3–4 a F1.
- **La ronda 2 suma ≈ 1,5–2 a F0** (lint y API de escrituras, CSP real, `build.js`), **≈ 8 a F1** (E6 +3, E7 +2, E8 +0,5, E9 +2), **2 a E0** y **≈ 3 a F2**.
- El experto en netcode estimó +3–5 para su parte. El resto viene del backend (estado del DO, códigos firmados, cuotas, renovación de TURN) y de la seguridad de F2.
- Es el costo de que el protocolo exprese el Paso 2 real y de que la operación aguante sin nadie mirando.
**Encaje en el roadmap (ítems → calibración → multijugador):** E0 puede correr ya: el dueño aprobó el diseño el 22-oct (no toca el juego; solo falta abrir la cuenta de Cloudflare, §14 #4). E4 (seguridad) se adelanta al rework de ítems (✅ aprobado, §14 #7): `importSave` ya es una puerta hoy. `killLootRng` (#3) y el formato compacto de objetos se acuerdan con el rework de ítems; el bus (#8), con el de VFX.

---

## 12. Decisiones (resumen)
El 22-oct-2026 el dueño **aprobó todas las recomendadas**: D1–D19 y D21. D20 no se usó. D21 y D22 los abrió la pasada v6 en el cuerpo (§2.7 y §0) y no estaban en esta tabla: se agregan. **D22 choca con D3** y queda como única pregunta abierta (§14 #13); mientras tanto rige D3.

| Id | Pregunta | Opciones | Recomendada | Estado |
|---|---|---|---|---|
| D1 | Modelo de red | A anfitrión único · **B repartida** · C lockstep | **B** | ✅ Aprobada por el dueño (22-oct) |
| D2 | Topología y canales | **Estrella WebRTC, 2 canales** · estrella con 3 canales · relé por servidor (WebSocket en DO) | **Estrella, 2 canales** | ✅ Aprobada por el dueño (22-oct) |
| D3 | Señalización | **Worker + DO** · Trystero/Nostr · Supabase Realtime | **Worker + DO** (v5: estado en la SQLite del DO, códigos firmados, TURN de 24 h renovable; Trystero de respaldo sin TURN) | ✅ Aprobada por el dueño (22-oct) |
| D4 | Botín | **Personal instanciado + regalos** · libre para todos · asignación por turnos (PoE2) | **Personal** | ✅ Aprobada por el dueño (22-oct) |
| D5 | Escalado por jugadores | **Solo vida por rango** · vida y daño · sin escalado, más densidad | **Solo vida** | ✅ Aprobada por el dueño (22-oct) |
| D6 | Niveles distintos | Nivel del mundo para todos · **cada uno a su nivel, solo hacia abajo** · sincronía hacia abajo (FFXIV) | **Cada uno a su nivel** | ✅ Aprobada por el dueño (22-oct) |
| D7 | Revivir | **Lápida + 3 s + punto de control** · solo punto de control · revivir sin canal | **Lápida + 3 s** | ✅ Aprobada por el dueño (22-oct) |
| D8 | Mundos y viajes | Siempre juntos · **un mundo de grupo + excursión en solitario** · cada uno en su mundo (multimundo) | **Mundo de grupo + excursión** | ✅ Aprobada por el dueño (22-oct) |
| D9 | Paso de simulación | **Semifijo (subpasos ≤ 1/60)** · fijo 60 Hz + interpolación ya · variable como hoy | **Semifijo**; fijo en F3 | ✅ Aprobada por el dueño (22-oct) |
| D10 | Anfitrión oculto | **Bombeo por red + metrónomo en un Worker + pausa cooperativa + medidas contra el sueño de la pestaña** · simulación en un Worker desde el inicio · exigir ventana visible | **Bombeo + metrónomo + pausa** (v5: con 1 solo invitado el bombeo por red no basta; sonido audible y pestaña fijada contra el descarte); la simulación en un Worker si R1 falla | ✅ Aprobada por el dueño (22-oct) |
| D11 | Cuentas y nube | **Supabase** · Firebase · D1 + OAuth propio | **Supabase** (con cron contra la pausa) | ✅ Aprobada por el dueño (22-oct) |
| D12 | Ladder | **De honor (F2) → verificado en sombra (F3)** · servidor autoritativo · sin ladder | **Honor → sombra** | ✅ Aprobada por el dueño (22-oct) |
| D13 | Comunicación | **Señales + chat corto** · solo señales y frases fijas · chat libre + voz | **Señales + chat corto** | ✅ Aprobada por el dueño (22-oct) |
| D14 | Marcas y mecánicas por enemigo | **Por dueño** · compartidas | **Por dueño** (Vulnerable y Debilidad sí compartidos) | ✅ Aprobada por el dueño (22-oct) |
| D15 | Hit-stop | **Solo visual siempre** · solo visual en grupo | **Solo visual siempre** (un solo camino; el dueño prueba la sensación) | ✅ Aprobada por el dueño (22-oct) |
| D16 | Tormento en grupo | **El del anfitrión para todos** · cada uno el suyo | **El del anfitrión** | ✅ Aprobada por el dueño (22-oct) |
| D17 | Preparación del cuerpo a cuerpo enemigo (v4, corregida en la v5) | Ninguna, como hoy · **150 ms + parte adaptativa para víctimas remotas (+ mín(½RTT, 100 ms)), alcance generoso (+1 m)** · 250 ms esquivable caminando | **150 ms + adaptativa**: el golpe se lee antes del daño; la víctima ve ≥ 100 ms de preparación hasta unos 250 ms de RTT (la v4 decía «hasta 300 ms», y era falso); mientras te ataca, el enemigo se dibuja en tu presente; caminar no lo esquiva y el daño por segundo casi no cambia. Cambia la sensación del solitario: el dueño la prueba con un interruptor | ✅ Aprobada por el dueño (22-oct) |
| D18 | DoT del héroe en grupo (nueva, v4) | **Los simula su dueño (tics por `TICKS`)** · los simula el anfitrión con un espejo local y mensajes `DOTX`/`DOTR`/`DOTEND` | **Los simula su dueño**: la API de DoT y ⑬ quedan exactas y locales, sin mensajes nuevos ni espejo que se desfase | ✅ Aprobada por el dueño (22-oct) |
| D19 | Proyectiles enemigos en grupo (nueva, v5) | **Se consumen en el primer héroe que tocan (`PROJX`)** · atraviesan a los aliados | **Se consumen (`PROJX`)**: como en solitario, el tanque puede cubrir a la maga y no hay dobles golpes; queda una ventana de ½RTT + ½RTT en que podría tocar a dos, que se mide. «Atraviesan» es más simple, pero cambia el juego en grupo | ✅ Aprobada por el dueño (22-oct) |
| D21 | Ausente en una sala Hardcore (nueva, v6; §2.7) | Invulnerable en el sitio, como en las salas normales · **a los 3 s sale del mundo del grupo y vuelve al punto de control, sin XP ni botín; aviso de «desconexión en combate»** | **Sale del mundo**: desconectarse no puede servir para no morir; si se cae el anfitrión nadie muere | ✅ Aprobada por el dueño (22-oct) |
| D22 | Respaldo P2P de la señalización en F1 (v6, solo en §0) | **Trystero (Nostr) sin TURN si el Worker falla**, como dice D3 · sin respaldo en F1: Trystero como plan C documentado | La v6 escribió «sin respaldo en F1» pero no tocó §3.8, §3.10, §5.3 ni E7, que siguen con Trystero | ⚠ **Conflicto con D3 aprobada.** Rige D3 (Trystero de respaldo, que es lo que el dueño vio y aprobó) hasta que responda §14 #13 |

---

## 13. Refutación y cambios

### 13.0 Pasada v5.1 · las 15 objeciones altas que no habían llegado
Las 15 objeciones de gravedad alta que el corrector no vio completas (4 de la refutación de la investigación y 11 del experto B de las dos rondas del diseño) se revisaron **una por una contra este texto y contra el código** (`paso2-impl` @ `4095ab6`). Detalle, fuentes y razones en `refutaciones/trazabilidad-altas.md`.

| Id | Estado | Dónde |
|---|---|---|
| INV-B-1 · modelos opuestos, costo de F0 y F3 | **Corregida** (y discrepo en meter `p.cast` en F0) | §0, §9, §11 |
| INV-B-2 · anfitrión oculto mal dimensionado | **Corregida** (y discrepo en el orden: Worker después del metrónomo) | §0, §1.1, §3.6, §8, §10, §11 |
| INV-B-3 · rejilla distinta por `Math.random` | Resuelta | §2.2, §3.7, F0 #10 |
| INV-B-4 · presupuesto de SCTP y colas | Resuelta | §3.2 T1–T9 |
| R1-B-1 · modificadores del objetivo | Resuelta | §3.4, §3.5, §6 #5 |
| R1-B-2 · campos que mueven a la IA | Resuelta | §3.4 `FIELD`, §7 |
| R1-B-3 · desplazamientos | Resuelta | §3.4 `DISP`/`ATK`, §7 |
| R1-B-4 · regla de tiempo | Resuelta | §3.5, §3.5.1, D17 |
| R1-B-5 · época y caducidad | Resuelta | §3.4, §3.5.1 |
| R1-B-6 · validación en cada receptor | **Corregida** (tope por segundo de la redirección) | §5.4, §8 |
| R2-B-1 · refrescos por tic | Resuelta | §3.4 `EST`, §5.4, §7 |
| R2-B-2 · escrituras directas | **Corregida** (1 sitio más del héroe, 4 grupos del mundo, `pact` y `invocador`; `marks` fuera del lint) | §2.4, §3.1, §3.3, §3.4, §3.7, §6 #12, §8, R14 |
| R2-B-3 · dos vistas | Resuelta | §3.5 |
| R2-B-4 · reconciliación de la barra | Resuelta | §3.5, §8 |
| R2-B-5 · pestaña dormida o descartada | Resuelta | §3.6.1, R17, E0 |

**Además en esta pasada:** las decisiones quedaron aprobadas por el dueño (§12, §14); el resumen de §0 y la tabla de §11 vuelven a coincidir; se anota el choque entre D22 y D3.

**Tras la verificación (v5.2).** El experto que escribió las 15 verificó la v5.1 contra el documento y el código (`refutaciones/verificacion-altas.md`): **9 OK, 2 discrepancias aceptadas (INV-B-1, INV-B-2), 4 insuficientes y ningún error alto nuevo**. Releí en el código cada línea que cita para los cuatro (`powers-arquera.js:1424, 2446-2459, 2549, 2784-2788`; `powers-guerrero.js:788-794`; `field-entities.js:109, 207, 268`; `main.js:470, 1194-1199`; `game-world-flow.js:140-142`) y son como dice.

| Id | Veredicto | Qué hace la v5.2 | Dónde |
|---|---|---|---|
| R1-B-2 | Insuficiente → **corregida** | `FIELD` con `id` vivo = actualización, con `ver`; hash por fotograma (fin y armado previstos) y ≤ 4/s por campo; `sigue` al dueño o a la mira; sombra hasta `FIELDX` o `ms` + 1 s; ninguna función de campo mueve réplicas en el invitado; `net-contrato` vigila las escrituras sobre campos | §0 #2, §3.3, §3.4, §3.5.1, §3.9, §7, §8, R14, E9 |
| R1-B-5 | Insuficiente → **corregida y ampliada** | Solo los urgentes de vida larga pasan a `r`, con `t0`; los de vida corta nunca; los caducados entran en la ventana de duplicados. **Amplío:** también en `u` la edad se mide con el `tick` de la cabecera contra el tiempo actual del anfitrión, porque con `maxRetransmits: 0` SCTP no abandona un mensaje que quedó en la cola sin enviarse (RFC 7496 §3.1) | §0 #5, §3.2 T2, §3.4, §3.5.1, §8, E6 |
| R2-B-2 | Insuficiente → **corregida** | `SPAWN` con `u8 mods` (bit 0: invocador caído), también en la bienvenida y en `need`; vida de vista recalculada desde cero, también al reutilizar una réplica latente | §2.4, §3.3, §3.4, §3.5, §3.7, §6 #12, §8, R14, E6 |
| R2-B-4 | Insuficiente → **corregida, con otro mecanismo** | Acepto el problema y el arreglo en lo demás (un solo camino de confirmación, reversión (a) desde la confirmación, prueba con ráfagas). **Discrepo en `rHechos`** (contador de mensajes de `r`): cubre el golpe que pasó a `r`, pero no el que el anfitrión aplicó desde `u` justo antes de un corte de más de ~0,5–1,6 s, cuando la ventana de 33 paquetes de `ackBits` ya no lo alcanza y su copia por `r` todavía no llegó. En su lugar, un **acuse de golpes** acumulativo más selectivo por `id` (`u16 golpeAcum · u32 golpeBits`, 6 B por instantánea, como el SACK de SCTP: RFC 9260 §3.3.4), que cubre los dos canales y los cortes | §3.2 T2, §3.4, §3.5, §8, E6 |

**Notas del verificador que también entran:** recuentos unificados de INV-B-1 (101 usos y 12 guardas, §3.1 y §6); R1b, el pico de medio día de un canal transferido a un Worker (INV-B-2; E0 pasa a 6,5 d-t); el Refugio en `createWorldRng` y en `welcome.world.seed` (INV-B-3, F0 #10); medir la tolerancia de hasta +2 m de D17 en E10 (R1-B-4); la redirección perdida o descartada, anotada como aceptada en §7 (R1-B-6); arriendos solo en los paquetes de estado de 20 Hz, que resuelve la contradicción entre T3 y §3.4 (R2-B-1); Web Lock con nombre único (R2-B-5); y los días de §11 (F1 36–38 d-t).

### 13.1 Ronda 2 · dos refutaciones externas (netcode y backend)
**Veredictos:**
- **Netcode:** «Lo apruebo con correcciones obligatorias antes de E6 y E9. E0 a E5 pueden arrancar ya». Da por correcto el fondo (modelo B, estrella con 2 canales, urgentes con redundancia dentro de `u`, Worker + DO + TURN, fracción con daño en dos factores, regla de tiempo y época con caducidad) y por bien aplicadas las correcciones de la ronda 1. Su diagnóstico: el protocolo todavía suponía que el héroe muta a los enemigos con eventos sueltos a través de unos 12 métodos, y el código hace otras dos cosas: **refresca estado en cada tic** y **escribe campos directo**.
- **Backend:** «Aprobado con correcciones». Comprobó en fuentes primarias las cifras de DO, TURN y Supabase. Lo que falla es la **operación** (TTL de TURN, estado de la sala en el DO, abuso de la cuota, versiones) y los **detalles de seguridad** (CSP, RLS de F2), no las decisiones de fondo.

**Método:** el texto me llegó cortado en el encargo, así que recuperé las dos refutaciones completas del registro local del flujo de trabajo y respondí a las 49 objeciones. Releí cada línea de código citada en `paso2-impl` @ `4095ab6`: todas son como dicen. El grep de escrituras directas me da los mismos 11 sitios en 6 archivos. Contrasté en la fuente primaria las afirmaciones que cambian decisiones (Chrome, Edge, TURN, DO, Rate Limiting, Supabase), y una de ellas la matizo.

**Netcode (N1–N28):**

| # | Grav. | Objeción | Veredicto | Cambio |
|---|---|---|---|---|
| N1 | Alta | Talentos y campos que refrescan Debilidad o ralentizar **en cada fotograma** o cada 0,25–0,5 s (Presa Herida, Hielo Quebradizo, Espinas Venenosas, Sello, estela) desbordan los topes, harían expulsar a un jugador limpio y parpadean con 0,3 s de duración | **Aceptada y generalizada** | **Arriendos `EST`**: todo efecto idempotente con duración (Debilidad, saliente, Vulnerable, Aterido, ralentizar) viaja como estado en cada paquete del invitado, con su tiempo restante, y el anfitrión lo mantiene hasta restante + 150 ms. `DEB` desaparece. Los campos que frenan o debilitan pasan al campo-sombra. Fusión por (enemigo, tipo, id). El contrato detecta mutadores en `onTick`. **Generalizo** el arreglo del experto (él lo pedía para lo que se refresca por tic): un solo camino para todo lo idempotente es más simple. §3.3, §3.4, §5.4, §7, §8 |
| N2 | Alta | El código del héroe **escribe campos del enemigo directo** (`e.pos`, `e.vulnT`, `e.numbT`): la réplica no se entera y aparecen desincronizaciones silenciosas; la carrera con arrastre no cabe en `DISP` | **Aceptada** (mi grep coincide; v5.1: un grep más amplio halló un sitio más del héroe y cuatro del mundo, §6 #12) | F0 #12: API `applyVuln`, `applyNumb` y `dragAlong`; el muro de `powers-maga.js` declara `blocks`; **lint** de escrituras al estilo de `test67`. **Variante:** la carrera es un **campo-sombra «arrastra»** (la ruta como línea, con ancho y duración) en vez de `DISP{arrastre}` con el camino: reutiliza `FIELD` v2 y el anfitrión la corre con sus posiciones. §3.4, §6, §7, §8 |
| N3 | Alta | Los talentos leen `frozenT`, `slowT`, `stunT`… de la réplica sin decir de qué vista, y tu propio control vuelve 1 RTT después: «congelo y disparo» pierde el crítico ≈ 250 ms | **Aceptada** | **Dos vistas** por réplica (dibujo y juego); los poderes leen la de juego, con tus predicciones y su vencimiento. Pruebas: Dardo tras congelar y Quiebrahuesos sobre tu Quebrantado. §0, §3.5, §8 |
| N4 | Alta | La instantánea pisa la barra predicha sin contar tus golpes en vuelo: la barra rebota y la muerte prevista resucita | **Aceptada** | **Reconciliación** con los acuses: vida de la última instantánea − tus golpes pendientes. Propiedad «la barra nunca sube sin una cura». §3.5, §8 |
| N5 | Alta | La pestaña del anfitrión puede **dormirse o descartarse** (Edge, Ahorro de memoria de Chrome); el diseño ni mencionaba Edge | **Aceptada, con un matiz verificado** | Lo comprobé en las tres fuentes: el **congelamiento por Ahorro de energía de Chrome sí exime** una página con un `RTCDataChannel` abierto; el Ahorro de memoria y las pestañas dormidas de Edge **no** lo listan. Por eso la medida principal es la que exime en los dos: **sonido audible** del anfitrión por defecto, más pestaña fijada y lista «Mantener siempre activos». El **Web Lock** queda como extra barato: tampoco figura en esas dos listas, así que no confío solo en él. `freeze`/`wasDiscarded` → reconexión. R1 con Edge y 30–60 min. §2.9, §3.6.1, R17, E0 |
| N6 | Media | Repetir cada urgente en **todos** los paquetes multiplica la subida ×4–12; un `HIT` por objetivo infla las áreas | **Aceptada** | T2: repetición como mucho cada máx(50 ms, RTT/3) (≈ 4 copias); **`HITS`** por lanzamiento con fracción logarítmica de 16 bits; urgentes ≤ la mitad del paquete; §3.9 rehecha con el peor caso. §3.2, §3.4, §3.9 |
| N7 | Media | Los topes fijos (120 tics/s) quedan bajo la cadencia real (≈ 240 tics/s de una Maga sobre 60) | **Aceptada** | Topes del **banco GRUPO × 2**, versionados; `TICKS` agrupados por fuente cada 0,25 s; exceso descartado en silencio; alerta solo tras 10 s; nunca se expulsa a nadie automáticamente. §5.4 |
| N8 | Media | «Tick de 60 por segundo» indefinido con paso semifijo, en la pausa y en la recuperación; `PING` por `r` inflado por el RTO | **Aceptada** | `tick` = ms de simulación del anfitrión (se detiene en la pausa); RTT por acuses de `u` con filtro de mínimo; desfase estilo NTP con corrección suave; rearme del búfer ante saltos; `PING` en `u` de respaldo. §3.4, §3.5.1 |
| N9 | Media | Al viajar, el anfitrión dejaba 5 s a los invitados en un mundo sin simulador; «quedarse» exigía promover réplicas | **Aceptada** | **Viaje pendiente** (el mundo viejo sigue hasta que cierra el anillo) y **carga local nueva** para quien se queda. §2.2, §3.7, §8 |
| N10 | Media | La pausa cooperativa solo congelaba el mundo del anfitrión; los dueños seguían simulando | **Aceptada** | `pause`/`resume` congelan **toda** la simulación de cada cliente; cuenta atrás de 1 s; el invitado sin anfitrión 5 s se pausa solo. §3.6, §3.7 |
| N11 | Media | Nadie decidía quién recibe botín y XP: un ausente farmeaba invulnerable; `KILL` sin posición; `n` contaba ausentes | **Aceptada, con un ajuste** | `KILL` con **máscara de elegibles** y posición, decidida por el anfitrión; `n` sin ausentes. **Ajuste:** «con entrada en los últimos **60 s**» en vez de 30: leer un objeto o esperar tras el tanque no debe cortar la XP, y el exploit de minimizar ya lo cierra la bandera de ausente. §2.3, §2.4, §2.6, §3.4 |
| N12 | Media | El registro de héroe reenviado perdía el tiempo de su dueño, y los aliados de dos saltos iban casi siempre extrapolados | **Aceptada en el problema, con otra solución** | `Δtick` en cada registro reenviado. En vez de una **segunda línea** más atrasada (el experto acepta su «pequeño desorden»), uso **una sola línea con atraso adaptativo** (100–250 ms) que cubre el p95 de los dos saltos. Una segunda línea vuelve a mostrar la reacción del enemigo antes que el golpe del aliado, justo lo que arregló la ronda 1, y lo que te ataca ya vive en tu presente. El **reenvío inmediato** queda como alternativa medida en `net-sim`. §3.4, §3.5.1 |
| N13 | Media | D17 decía «hasta 300 ms de RTT» (falso: ½RTT ya se come los 150 ms) y el atacante se dibujaba a 1–2 m al pegarte | **Aceptada** | Texto corregido (~250 ms con la parte adaptativa); **preparación adaptativa** 150 ms + mín(½RTT, 100 ms) para víctimas remotas; **el atacante vive en tu presente** durante la preparación. §3.5, §3.5.1, D17 |
| N14 | Media | Los proyectiles enemigos no perforan, pero en red cada cliente los dejaba seguir: el tanque ya no cubre y aparecen dobles golpes | **Aceptada** | `PROJX` de la víctima; decisión **D19** (recomendado: se consumen). §3.3–3.5, §7 |
| N15 | Media | Auras enemigas por cercanía y reflejo de Espinoso sin mensaje ni clase de tiempo | **Aceptada** | Auras: las resuelve la víctima contra la posición dibujada; Espinoso: el atacante con su daño de vista. En el contrato y en `net-paso2`. §3.3, §3.5, §7 |
| N16 | Media | El control de congestión de SCTP también frena el canal no fiable (≈ 32 KB/s con 5 % y 200 ms) y los SACK no estaban en las cuentas | **Aceptada en parte** | **Adaptación automática** (T8), SACK contados (T9), R3 con 2 % y 5 %. **Discrepo** en meter ya la compresión delta: exige guardar por invitado la instantánea base acusada y reconstruir contra ella (más código y más casos de error), y con las cuentas nuevas el modo de 15 Hz automático puede bastar. Queda **condicionada a R3** (Gaffer, *Snapshot Compression*, la recomienda cuando el ancho manda). §3.2, §3.9 |
| N17 | Media | Uniones y reconexiones ocurren en combate; un trozo de 16 KB ocupa la asociación y la subida del anfitrión es una sola | **Aceptada y ampliada** | Trozos ≤ 1.100 B con ritmo ≤ 25 % de la subida; el guardado completo solo al anfitrión; a los demás, un **perfil**. **Agrego** algo que faltaba: el perfil lleva los **stats publicados** que la validación de §5.4 necesita. Sin ellos, los invitados no podían acotar un `AID`, porque no tienen el guardado del emisor. §3.2, §3.7, §5.4 |
| N18 | Media | H1 depende de que los invitados manden: con 1 invitado son 20–25 bombeos/s, y si también se tapa, el mundo se para; R1 sin criterio claro | **Aceptada** | **H1b: metrónomo** en un Dedicated Worker; R1 con 1 invitado: ≥ 0,98 s simulados por s, hueco ≤ 60 ms, p95 del jitter ≤ 20 ms. §3.6, E0 |
| N19 | Media | TTL de 2 h sin renovación; el consumo de TURN sí se puede medir por GraphQL | **Aceptada** (coincide con B1 y B4) | TTL de 24 h, renovación, Cron con `callsTurnUsageAdaptiveGroups`. §3.8, §3.10 |
| N20 | Media | El estado del dueño se indexa por **objeto**; al salir del área de interés y volver se perdían Escarcha, marcas y DoT | **Aceptada** | **Pool de réplicas por `netId`**, latentes ≥ 10 s. Prueba de alejarse 40 m. §3.5, §7, §8 |
| N21 | Baja | La CSP bloqueaba el respaldo de Nostr y no declaraba `worker-src` | **Aceptada** | Relés en `connect-src`; `worker-src 'self'`. §5.3 |
| N22 | Baja | `?net=local` en dos pestañas pisa `localStorage` y deja una pestaña oculta | **Aceptada** | `&perfil=b` con prefijo de claves; dos ventanas que no se tapen. §8 |
| N23 | Baja | Firefox tiene dos SCTP; R3 solo probaba Chrome | **Aceptada** | Pares mixtos en R3 y E10; navegador por par en `?netdebug`. §8, E0 |
| N24 | Baja | Misma red: mDNS, *hairpinning* y el aviso de red local de Chromium | **Aceptada** | E10 «2 PCs en la misma red»; icono en el lobby. §2.9, §3.8, §8 |
| N25 | Baja | DO gratis solo con SQLite; latido con autorrespuesta | **Aceptada** (coincide con B2) | Plantilla de `server/signal/` con la clase SQLite y `setWebSocketAutoResponse`. §3.8 |
| N26 | Baja | Si el `KILL` llega con otro golpe final, el enemigo sí murió; Cadenas e inmunes rompen la predicción | **Aceptada** | **Dos reversiones** separadas; encadenados fuera de la muerte prevista; inmunes y escudados fuera de la predicción del número. §3.5 |
| N27 | Baja | Relé por TCP o TLS: bloqueo de cabeza de línea | **Aceptada** | `relayProtocol` en `getStats` → icono de «relé lento»; en R2. §2.9, §3.8 |
| N28 | Baja | «Ninguna reclamación tarda más de 100 ms» no se cumple con pérdida aleatoria; las estimaciones no incluían lo nuevo | **Aceptada** | R3: p99 ≤ 100 ms y 0 perdidas. F1 sube ≈ 8 d-t (más que los 3–5 que estimó el experto, porque suma lo del backend). §11, mockup |

**Backend (B1–B21):**

| # | Grav. | Objeción | Veredicto | Cambio |
|---|---|---|---|---|
| B1 | Alta | TTL de 2 h sin renovación: Cloudflare corta poco después del vencimiento; con 17,7 % de pares por relé, ≈ 44 % de los grupos de 4 tienen un enlace expuesto, y la prueba de 1 h no lo ve | **Aceptada** (verifiqué la FAQ: corte «after a short delay», TTL máximo de 48 h) | TTL de 24 h, revocación como protección, `customIdentifier`, renovación a T − 30 min con `setConfiguration` + `restartIce` por `r` [M]; R2 con TTL de 5 min; E10 > 2 h. §3.8, R19 |
| B2 | Alta | El estado de la sala en variables del DO se pierde al desalojarlo (el constructor vuelve a correr) y en cada despliegue | **Aceptada** (verificado en la documentación de WebSockets en DO) | Estado en **SQLite**, `serializeAttachment`, latido con autorrespuesta, reconexión con espera creciente, alarma de limpieza; R2 con desalojo y redespliegue. §3.8, R2 |
| B3 | Media | El límite por IP dentro de cada DO no ve los intentos contra otras salas; la cuota diaria gratis es un vector de denegación de servicio | **Aceptada** | **Códigos firmados** (HMAC de 16 bits), límite de ritmo en el Worker como filtro grueso (Cloudflare desaconseja la IP como clave, y lo respeto con umbrales generosos), Turnstile al crear, 3 pendientes, interruptor; Trystero documentado sin TURN. §3.8, §5.3, R18 |
| B4 | Media | Un DO por sala no cuenta credenciales globales; TURN no tiene techo de gasto | **Aceptada** | Cron horario por GraphQL → DO «cuota» → corte a ~800 GB; token de solo lectura; **sin tarjeta hasta F3** (✅ aprobado por el dueño el 22-oct). §3.10, §14 |
| B5 | Media | La página no conoce `VERSION`; el SW sirve código viejo con *stale-while-revalidate*; `VERSION` sube por un CSS | **Aceptada** (verificado en `sw.js`) | `js/build.js`, `simHash`, `version.json` sin caché antes del lobby, recarga el viejo, Worker con N−1. §3.4, §3.7, F0 #13, R20 |
| B6 | Media | La CSP apuntaba a los `onclick` (permitidos) y no veía los 4 `onerror=`, los ≈ 40 `style=`, las fuentes ni el registro del SW | **Aceptada: era un error mío** | CSP de partida completa; listener delegado de `error`; prueba contra `on[a-z]+="`; `d3` fuera del import map; `integrity`. §5.3, F0 #9 |
| B7 | Media | Con RLS por dueño cualquiera edita `kind`, `rev` y su héroe de temporada con curl; `rev` lo ponía el cliente | **Aceptada** | `GRANT` por columna, trigger de `rev`, política solo para abiertos, RPC para temporada, claves `sb_publishable`/`sb_secret`. §4 |
| B8 | Media | En F2 no hay «servidor» que mida el tiempo; el DO de F3 no sabía quién es el usuario | **Aceptada** | `start_run`/`submit_run` `security definer`, sin `GRANT` de escritura, cuenta permanente; JWKS en F3. §9 |
| B9 | Media | Supabase Free no trae copias | **Aceptada** | Copia semanal a R2, 4 semanas, prueba de restauración. §4, R21 |
| B10 | Media | Medir el relé «en el lobby» deja el dato en cada PC | **Aceptada** | Telemetría anónima por sesión → Workers Logs + contadores + página de estado + línea de privacidad. §3.10 |
| B11 | Baja | Anónimos: 30 por hora por IP, CAPTCHA, limpieza, *manual linking*, cuenta ya vinculada | **Aceptada** | §4 |
| B12 | Baja | `pagehide`: *keepalive* ≤ 64 KiB; `sendBeacon` sin cabeceras | **Aceptada** | Solo el héroe activo, ≤ 60 KiB, comprimido; alijo aparte; marca «pendiente». §4 |
| B13 | Baja | `PING` por el canal fiable infla el RTT | **Aceptada** (coincide con N8) | §3.5.1 |
| B14 | Baja | Producción y vista previa mezcladas; sin control de `Origin` | **Aceptada** | `env` en el código y en el saludo; lista de `Origin`; redirecciones con comodín en Supabase. §3.8 |
| B15 | Baja | Sin prueba de que quien vuelve es el anfitrión | **Aceptada** | `hostToken`, acciones solo desde su socket, `rejoinToken` de un uso. §3.8, §5.3 |
| B16 | Baja | URL del puerto 53 y TLS en el 443 | **Aceptada** (con ICE por goteo el 53 no molesta, pero filtrarlo cuesta una línea) | §3.8 |
| B17 | Baja | Solo se cobra la bajada del dueño de la asignación; faltan casos | **Aceptada** | Tabla de 3 casos más el peor grupo en §3.9; ≈ 11.000–14.000 horas-invitado por relé |
| B18 | Baja | Cámara lenta frente a cortes honestos en F3 | **Aceptada** | Regla con holgura de 3 s; > 10 s pausa y revisión. §9 |
| B19 | Baja | Grabaciones a 20 Hz llenan Supabase | **Aceptada** | 2 Hz, top N, en R2. §9 |
| B20 | Baja | Un mismo Worker para señalización y verificador | **Aceptada** | Dos Workers. §3.8, §9 |
| B21 | Baja | Datos personales y Ley 21.719 | **Aceptada** | Aviso, «Borrar mi cuenta», no copiar el correo. §4, §14 |

**Lo que listaron como faltante, y dónde quedó:**
- **Netcode:** arriendos (§3.4), lint de escrituras (F0 #12), dos vistas (§3.5), reconciliación (§3.5), viaje y pausa (§3.7), elegibilidad (§2.3), ciclo de la pestaña (§3.6.1), metrónomo (§3.6), adaptación y SACK (§3.2), reloj (§3.5.1), `Δtick` (§3.4), pool latente (§3.5), `PROJX` (D19), auras y Espinoso (§3.5), ritmo de las uniones y perfil (§3.2 T4), TTL y GraphQL (§3.8, §3.10), matriz en vivo (§8), «Copiar diagnóstico» (§2.9) y prefijo de guardado (§8).
- **Backend:** tabla de cuotas y manual de operación (§3.10), criterios de R2 (§11), versionado N−1 (§3.7), modo degradado (§3.8), medio de pago (§3.10, §14), limpieza (§3.8, §4), copias (§4), telemetría (§3.10) y entornos (§3.8).

**Discrepancias, en resumen:**
- N5: el congelamiento de Chrome sí exime un DataChannel; el riesgo real es el descarte. La medida principal es el sonido audible y el Web Lock queda de extra.
- N11: 60 s en vez de 30.
- N12: una línea adaptativa en vez de dos.
- N16: compresión delta condicionada a R3.
- Variantes del mismo fondo: N1 generalizado (un solo camino para lo idempotente) y N2 con un campo-sombra en vez de `DISP{arrastre}`.
- B6: la CSP de la v4 tenía un error mío.

**El mockup** se corrigió:
- dice v5;
- el diagrama del golpe usa el atraso adaptativo (Beto ve el golpe de Ana a ≈ 160 ms y la muerte a ≈ 205 ms) y la redundancia acotada;
- tres flujos nuevos: congelar y disparar, debilidades que se renuevan y la flecha que se consume;
- las tres pruebas de riesgo con sus criterios nuevos (Edge, 1 invitado, TTL de 5 min, p99);
- las etapas con el esfuerzo nuevo, y D17 y D19.

**Lo que no cambió en esta ronda:** modelo B, estrella WebRTC con 2 canales, urgentes dentro del canal no fiable, Worker + DO + TURN de Cloudflare, Vercel para lo estático, Supabase recién en F2, verificación en sombra para el ladder, botín personal, solo la vida escala, sin lockstep.

### 13.2 Ronda 1 · refutación externa (experto en netcode y en la autoridad del Paso 2)
**Veredicto del experto:** aprobado con correcciones obligatorias antes de E6. No discute las decisiones de fondo (modelo B, estrella WebRTC, urgentes con redundancia dentro del canal no fiable, Worker + DO + TURN de Cloudflare, anfitrión oculto como bloqueante, sin lockstep) y **confirmó** cifras marcadas [V]: dcSCTP (MTU de 1.191 B, `rto_min` de 400 ms con RTO = máx(400, SRTT + 4·RTTVAR), sin intercalado), Cloudflare (los 1.000 GB se comparten entre la SFU y TURN; solo se cobra la salida), Chrome (WebRTC exime de la limitación intensiva de temporizadores, pero no del ritmo de 1 por segundo) y el pueblo real dentro de la Cripta. Su diagnóstico: **el protocolo se escribió para un Paso 2 más simple que el del código**. Lo acepto: revisé en el código cada línea que citó (`combat-math.js:249-259`; `entities.js:88-96, 1313, 2196-2205, 2249-2342, 2931-2952`; `field-entities.js:383-430, 646-672`; `enemy-abilities.js:252-266`; `timers.js:96-160`) y son como dice.

**Nota de método:** el texto de la refutación me llegó cortado a mitad del problema 11. Lo reconstruí por su título y sus referencias (§3.2 T3, §3.9, `codigo.md` §7.6 H1). Si había problemas bajos después, no los vi: conviene que la ronda 2 los repita.

| # | Grav. | Objeción | Veredicto | Cambio |
|---|---|---|---|---|
| 1 | Alta | Los modificadores del objetivo son **numéricos** (saco de Debilidad con tope, Vulnerable +20, debilitamiento saliente como producto) y el registro solo traía banderas: el apoyo no rinde con invitados y la barra predicha diverge de la autoritativa | **Aceptada** | Daño en **dos factores**: `HIT` lleva tu parte «antes del objetivo» y el anfitrión la multiplica por `weaknessMult` con su estado al recibir. Extensión `MOD` (`debilidad %`, `saliente %`) para predecir; `ATK` y `PROJ` llevan `saliente %` para la víctima; `DEB` con tipo. Prueba «apoyo debilita + invitado pega». §3.4, §3.5, §6 #5, §7, §8 |
| 2 | Alta | Muros (`blocks`), encierros (`contain`) y cebos (`lure`) **mueven a la IA**, que solo existe en el anfitrión; `FIELD` no podía describir una línea | **Aceptada, con un matiz** | **Campo-sombra** en el anfitrión con `FIELD` v2 (círculo, o línea con extremos y ancho; máscara bloquea / encierra / atrae; parámetros del cebo; armado) y `FIELDX`. El daño sigue en el dueño. **Matiz:** los emisores (Familiar, Halcón, Pendón) no mueven enemigos, así que no necesitan sombra. Pruebas de muro, cebo, encierro y Desafío con 150 ms. §3.3, §3.4, §7, §8 |
| 3 | Alta | Tirones, empujones y Vórtice sin mensaje; el empuje de cada golpe (0,12–0,34 m) daría tirones visibles si lo predijera el invitado | **Aceptada** | `DISP` (lo aplica el anfitrión, con rendimientos decrecientes y Quebranto en jefes); el empuje por golpe lo calcula el anfitrión desde la fracción y la última posición del atacante, y el cliente solo dibuja la reacción; `ATK` con la posición del enemigo para el Vórtice. **Simplificación aceptada:** en golpes de área, el origen del empuje será el atacante y no el centro del área (`opts.from`): diferencia de centímetros [D]. §3.4, §6 #5, §7 |
| 4 | Alta | Temporalidad sin regla: el cuerpo a cuerpo enemigo es instantáneo, la víctima mediría el alcance contra una réplica atrasada, y estado y eventos iban en dos líneas de tiempo | **Aceptada** | **Regla de tiempo por clase de mensaje** (§3.5.1): lo que te afecta, en tu presente (`ATK` con posición, preparación y edad; tolerancia por ½RTT; telegrafiados con un mínimo de 250 ms); lo que observas, en **una** línea de interpolación según su tick de origen; las reclamaciones, al llegar. La animación del atacante la dispara el `ATK`. La preparación del cuerpo a cuerpo queda como decisión **D17** del dueño. §3.4, §3.5, §12 |
| 5 | Alta | Sin época del mundo, los `netId` reiniciados por mundo y los reenvíos por `r` aplican golpes viejos a enemigos nuevos; un `ATK` tardío tras un corte haría una ráfaga de daño viejo | **Aceptada** | `u8 época` en la cabecera de `u` y `ep` en `r`; `netId` sin reutilizar dentro de una época; `u8 edad` en cada urgente y **caducidad por tipo** (`ATK` y `PROJ`: preparación + 300 ms; `HIT` y `TICKS`: 2 s; `KILL`, `SPAWN` y `GONE`: nunca). Pruebas de viaje con paquetes en vuelo y de corte de 2 s. §3.2, §3.4, §3.5.1, §3.7, §8 |
| 6 | Alta | La validación vivía solo en el anfitrión, pero `AID` y `FIELD` los aplica quien los recibe: un NaN rompe el guardado y una redirección enorme mata, en Hardcore para siempre | **Aceptada** | §5.4 nueva: `Number.isFinite`, rangos, topes relativos al emisor (la redirección, contra el % del Vínculo del propio protector), ritmo por tipo, `save()` que se niega a escribir no finitos (F0 #11), aviso de confianza en salas HC y fuzz con NaN, ±Infinity y −0. §0, §5.4, §6, §8, R15 |
| 7 | Media | Cada enemigo que mata un invitado vive 1 RTT como «zombi» que atrae objetivos, rebotes y áreas; los efectos «al matar» llegan tarde; «0 ms en todo lo tuyo» es falso | **Aceptada** | **Muerte prevista** solo visual (fuera de objetivos, rebotes y áreas; empieza la disolución); los efectos «al matar» que solo tocan a tu héroe se adelantan, con reversión; el botín, la XP y los efectos sobre el mundo esperan el `KILL`. **Matiz:** excluyo jefes, inmunes y escudados, que son los casos donde la predicción falla. Métricas en `net-sim`. Mockup: «0 ms en tus habilidades». §0, §1.1, §3.5, §8, R16 |
| 8 | Media | La amenaza suma daño absoluto, pero con la escala por espectador un Nv 60 genera ~22 veces más amenaza que un Nv 20 por el mismo aporte | **Aceptada, con otra normalización para las curas** | Amenaza en **fracciones de la vida de vista**: el anfitrión la calcula con la fracción del `HIT` × `amenaza×`. **Discrepo** en normalizar las curas por la vida máxima del curado: cambiaría la razón entre cura y daño que hoy tiene el solitario. Las normalizo por la vida de vista del enemigo **que tiene el que cura** (`threatFromHeal / vidaDeVista`): en solitario daño y cura se dividen por la misma vida y el resultado es idéntico. Además, el piso de 1 de `forceTarget` (`entities.js:2129`) pasa a 1/vida máxima, que en fracciones sería una amenaza enorme. Prueba con tanque Nv 30 y daño Nv 60. §6 #6, §7 |
| 9 | Media | 16 bits de banderas no alcanzan para lo que leen los talentos y la interfaz (inmovilizado, Aterido, Quebrantado y stagger, lanzamiento interrumpible, DoT por tipo, en combate) | **Aceptada** | Banderas `u32`, registro de 14 B, extensión `JEFE` (stagger, `castId`, progreso) y **prueba de contrato** con el recuento real de campos (rehíce el grep: `frozenT` sale 11 veces y no 12; el resto coincide). §3.4, §8, R14 |
| 10 | Media | La API de DoT (consumir, reemplazar, lo que queda) y ⑬ no tenían mensaje; tampoco estaba decidido si cuentan los DoT ajenos | **Aceptada en el problema, con otro arreglo** | En vez de un espejo local más `DOTX`/`DOTR`/`DOTEND`, **el dueño simula sus DoT** y manda los tics en `TICKS` (decisión D18). La API completa y ⑬ quedan locales y exactas, sin mensajes nuevos ni un espejo que se desfase. Además evita un choque que la propuesta original no veía: `timers.js` guarda **un DoT por fuente `<habilidad>:<tipo>`**, así que dos magas con la misma quemadura se pisarían en el anfitrión. Costo: ≈ 0,4 KB/s de subida con 30 enemigos ardiendo. Los DoT ajenos no cuentan (como propone el experto, en línea con D14). §3.3, §3.4, §7, §12 |
| 11 | Media | (texto cortado) Los paquetes inmediatos y el bombeo H1 («las instantáneas salen al final de cada bombeo») no dicen si llevan estado: con 60 bombeos/s la bajada se triplicaría. Además, §3.9 no contaba la sobrecarga por paquete | **Aceptada** | T3: los inmediatos llevan **solo urgentes**, agrupados por fotograma o bombeo. T6: las instantáneas tienen **su propio reloj de 20 Hz** (corrige `codigo.md` §7.6). T7: **93–117 B de sobrecarga por paquete** [V: RFC 9260 y el MTU de Chromium]. §3.9 rehecha: 18–24 KB/s típico por invitado (tope 32), anfitrión 0,45–0,6 Mbps (tope 0,77), «subida baja» con 30 paquetes/s. §3.2, §3.6, §3.8, §3.9 |

**El mockup** también se corrigió: dice «0 ms en tus habilidades» en lugar de «0 ms en todo lo tuyo», y el diagrama del golpe usa una sola línea de tiempo (Beto ve el golpe de Ana a ≈ 145 ms y la muerte a ≈ 190 ms, en orden; Ana ve la muerte prevista al instante y su botín a ≈ 90 ms).

**Lo que no cambió en esta ronda:** modelo B, estrella WebRTC con 2 canales, urgentes dentro del canal no fiable, Worker + DO + TURN de Cloudflare, anfitrión oculto como bloqueante, sin lockstep, botín personal, solo la vida escala.

### 13.3 Autorrefutación previa A (miradas de netcode en navegador y de diseño cooperativo e itemización de ARPG/MMO)
| # | Objeción | Veredicto | Cambio |
|---|---|---|---|
| 1 | **N:** «La vida como fracción en `f32` pierde precisión con jefes de millones de vida» | **Rechazada con cuentas:** el anfitrión guarda `double`; el cable lleva cada golpe como `f32`, cuyo error relativo (6·10⁻⁸) es del golpe, no de la vida. Un golpe de 1 sobre 10⁷ (10⁻⁷) se representa bien. La barra va en `u16` (0,0015 %), suficiente para dibujar; los umbrales los decide el anfitrión en `double`. | Aclarado en §3.4 |
| 2 | **N:** «La cota de plausibilidad no sirve si cada uno ve una vida distinta» | **Aceptada:** el anfitrión debe medir la cota contra la vida de vista de ese invitado. La conoce (nivel del invitado, `n`, definición). | §5.2 punto 2 |
| 3 | **N:** «Meter los urgentes en el paquete del tick suma hasta 50 ms a cada golpe» | **Aceptada:** envío inmediato cuando entra un urgente, con tope de 60 paquetes/s. | §3.2 T3 |
| 4 | **N:** «La IA del anfitrión persigue la posición interpolada del invitado, atrasada 100 ms + ½ RTT» | **Aceptada:** la IA usa la última posición reportada con extrapolación de ≤ 100 ms. | §3.5 |
| 5 | **N:** «No dice qué pasa con las entidades que salen del área de interés» | **Aceptada:** `GONE` explícito al morir, desaparecer o salir del área; sin noticias en 1 s → oculta. | §3.4 (`GONE`) |
| 6 | **N:** «Un invitado podría reenviar `AID` en nombre de otro» | **Aceptada:** el anfitrión fija el campo `de` al reenviar. | §5.2 punto 4 |
| 7 | **N:** «¿Por qué 2 canales si tecnologia.md dice 3?» | **Mantenida:** los urgentes con redundancia van en el mismo paquete no fiable (`codigo.md` T2). Un paquete por tick es más simple y recupera igual. | §3.2 |
| 8 | **A:** «Copiar los k de PoE2 hace eternos los jefes con roles de apoyo y tanque» | **Aceptada:** k iniciales más bajos (0,5 / 0,7 / 0,8) y un objetivo explícito por duración, medido con el escenario GRUPO. | §2.4 |
| 9 | **A:** «Escalar por espectador abre un exploit: amigos de bajo Tormento revientan el Tormento alto del anfitrión» | **Aceptada y razonada:** el nivel se escala por jugador (es una franja de progreso: un Nv20 aporta lo que un compañero equivalente), pero el **Tormento no** (es dificultad opcional). Tormento del anfitrión para todos, como el nivel de mundo de D4. | §2.5, §2.6, D16 |
| 10 | **A:** «Arrastre de nivel: un Nv5 gana XP de su franja a la velocidad del Nv70 que limpia» | **Aceptada en parte:** −50 % de XP si te llevan más de 15 niveles (D4 recortó el *powerleveling*). Entre amigos no se va más allá. | §2.6 |
| 11 | **A:** «Revivir gratis e infinito trivializa los jefes» | **Aceptada en parte:** el canal de 3 s se interrumpe con el segundo golpe (D4), y volver solo tiene espera creciente (D3). No limito los revivir de aliados en la v1; se revisa en E10. | §2.7 |
| 12 | **A:** «Cofres compartidos generan carreras» | **Aceptada:** cofres instanciados por jugador; santuarios compartidos. | §2.2 |
| 13 | **A:** «Con botín personal y vida < ×n, ¿el grupo infla el botín?» | **Aceptada como perilla:** `partyLootMult = 1` y se mide botín por hora y jugador en E10 contra el solitario. D4 y Last Epoch no dan bono de botín por grupo [S]. | §2.3 |
| 14 | **A:** «El stagger con vida escalada hace imposible Quebrantar en grupo» | **Aceptada:** stagger contra la vida sin multiplicador de grupo (PoE) [S]. | §2.4, §7 |

### 13.4 Autorrefutación previa B (miradas de infraestructura y seguridad web y de UX de juego de PC)
| # | Objeción | Veredicto | Cambio |
|---|---|---|---|
| 1 | **I:** «Si se despliega una versión nueva a mitad de sesión, el service worker recarga a un invitado y queda incompatible» | **Aceptada:** durante una sesión no hay recarga automática; aviso al terminar. | §3.7 |
| 2 | **I:** «Supabase gratis se pausa a los 7 días y el ladder quedaría caído» | **Aceptada:** Cron Trigger del Worker cada 3 días; alternativa Firebase documentada. | §4 |
| 3 | **I:** «Las IP de los jugadores quedan expuestas en ICE» | **Aceptada:** opción «Ocultar mi IP» (relé). Con amigos, por defecto directa. | §3.8 |
| 4 | **I:** «El héroe entero viaja al unirse: ¿lleva el alijo?» | **Rechazada:** solo `PLAYER_SAVE_FIELDS` del héroe, saneado; nada del alijo ni de opciones. | §3.4 |
| 5 | **I:** «El informe de código y el de tecnología mandan sembrar `buildTown`; ¿es el pueblo real?» | **Hallazgo propio, verificado:** el pueblo es el campamento de la Cripta, ya sembrado; `buildTown` solo vive en tests viejos. F0 siembra el Refugio y borra o siembra `buildTown`. | §2.2, §6 #10 |
| 6 | **U:** «Demasiados avisos de texto para un dueño que quiere lo visual» | **Aceptada:** iconos y anillos (reloj de arena, barras rojas, luna, brújula, anillo de 5 s), barras sin números. | §2.9 |
| 7 | **U:** «Unirse en más de 3 pasos espanta» | **Aceptada:** enlace → elegir héroe → aceptar. El código queda para dictarlo por voz. | §2.1 |
| 8 | **U:** «Sin pausa, abrir el inventario en combate mata» | **Aceptada como regla del grupo:** el frente de ítems ya pide acciones rápidas (clic derecho, Ctrl+clic, Espacio, F). El héroe no es «ausente» por tener un panel abierto; solo por página oculta. | §2.2, §3.6 |
| 9 | **U:** «Seguir al anfitrión sin preguntar te arranca de lo que hacías» | **Aceptada en parte:** seguir es lo normal (5 s con Esc para quedarte); quedarte te lleva de excursión sin perder la sala. | §2.2 |
| 10 | **U:** «Los efectos de 4 jugadores tapan los telegrafiados» | **Aceptada** (ya estaba): tope por fuente, intensidad de efectos aliados, telegrafiados encima. | §2.9 |
| 11 | **U:** «Las señales con rueda son otro control más que aprender» | **Rechazada en parte:** el toque de G sirve solo (contextual); la rueda es opcional. | §2.8 |

**Lo que no cambió en las autorrefutaciones:** modelo B, nada de lockstep, botín personal, solo vida escala, Worker + DO + TURN de Cloudflare, prototipos antes de F1, ladder fuera del co-op.

---

## 14. Preguntas para el dueño (respondidas el 22-oct)
El dueño aceptó la opción recomendada de cada una. Queda abierta solo la #13, que nace de un choque dentro del documento.

1. **Excursión en solitario** (salir del mundo del grupo y volver) o grupo siempre junto. **✅ Aprobada por el dueño (22-oct): excursión en solitario** (D8).
2. **Héroe ausente** (página oculta > 3 s → invulnerable e ignorado) o expuesto como en D2/D4. **✅ Aprobada por el dueño (22-oct): ausente, invulnerable e ignorado**, sin XP ni botín; en HC sale del mundo (D21).
3. **Hit-stop solo visual también en solitario** (un solo camino de código). **✅ Aprobada por el dueño (22-oct): solo visual siempre** (D15); el dueño prueba la sensación con un interruptor.
4. **Cuentas de Cloudflare** (Worker, DO, TURN; gratis) para E0. **✅ Aprobada por el dueño (22-oct): se abren ya.** Para empezar E0 hacen falta su correo y la clave de TURN creada en el panel.
5. **Ladder con héroes de temporada separados** (como D2), aunque parta la lista de personajes. **✅ Aprobada por el dueño (22-oct): separados** (D12, §4).
6. **Amigo con Mac** para probar Safari en E10. **✅ Aprobado el plan por defecto (22-oct):** se pide a un amigo en E10; sin Mac, Safari queda como invitado sin probar y sin «Encender hoguera» (§2.1, R13).
7. **Adelantar E4 (seguridad)** antes del rework de ítems (arregla también la importación de héroes de hoy). **✅ Aprobada por el dueño (22-oct): se adelanta** (§11).
8. **Preparación del cuerpo a cuerpo enemigo (D17):** 150 ms en que ves venir el golpe (un poco más con más latencia); caminar no lo esquiva, Carrera y Parpadeo sí. **✅ Aprobada por el dueño (22-oct): entra con un interruptor** para probarla en solitario.
9. **Proyectiles enemigos (D19):** se consumen en el primer héroe que tocan, o atraviesan a los aliados. **✅ Aprobada por el dueño (22-oct): se consumen (`PROJX`)**, y el tanque sigue cubriendo.
10. **Medio de pago en Cloudflare.** TURN no tiene techo de gasto y la documentación no dice qué pasa sin tarjeta al pasar los 1.000 GB (el grupo usaría ≤ 32 GB al mes). **✅ Aprobada por el dueño (22-oct): sin tarjeta hasta F3** (§3.10).
11. **Sonido del anfitrión encendido por defecto en grupo** (la música a bajo volumen): es lo único que Chrome y Edge respetan para no dormir la pestaña. **✅ Aprobada por el dueño (22-oct): encendido por defecto** (§3.6.1).
12. **Cuentas (F2):** aviso de privacidad y botón «Borrar mi cuenta» por guardar correos de Chile, Argentina y Perú. **✅ Aprobada por el dueño (22-oct): se redactan en E11 con un texto corto** (§4).
13. **⚠ Abierta (conflicto, v5.1): respaldo de la señalización en F1.** D3, que aprobaste, deja **Trystero (Nostr) sin TURN** de respaldo si el Worker de Cloudflare falla. La pasada v6 escribió en el resumen la opción contraria (D22: sin respaldo en F1; Trystero como plan C documentado), sin tocar el resto del documento. ¿Mantenemos el respaldo de D3 (más código en E7, relés de Nostr en la CSP; ≈ 18 % de los pares no conecta sin TURN) o lo dejamos fuera de F1 (más simple; si el Worker cae, no hay co-op hasta que vuelva)? Mientras no respondas, rige D3.

---

## 15. Fuentes (nuevas en este diseño)
- Maxroll, *D4 Multiplayer* (actualizada 05-mar-2025): revivir en ~3 s, interrupción con el segundo golpe, fantasma invulnerable, grupo de 4, XP +10 % a 90 m, botín personal, el mundo abierto no escala por jugadores — https://maxroll.gg/d4/resources/multiplayer [S, leída]
- Last Epoch, *The Convergence Update – Beta 0.9 Patch Notes*: grupo de 4, solo la vida escala, botín instanciado, regalos, llaves por corrida — https://forum.lastepoch.com/t/the-convergence-update-beta-0-9-patch-notes/51975/2 [V]
- PoE2 wiki, *Party* (bloqueada para bots; datos del resumen del buscador): vida +50/80/100 % con 2 jugadores por rareza, stun con la vida base — https://www.poe2wiki.net/wiki/Party [S]
- Game8 sobre D4 («Enemy HP, damage… relative to every player's level») — https://game8.co/games/Diablo-4/archives/415629 [S]
- Warcraft Wiki, *Ping System*: 5 tipos, en pantalla y minimapa, límite contra el abuso — https://warcraft.wiki.gg/wiki/Ping_System [V]
- UX Collective sobre las señales de Apex — https://uxdesign.cc/apex-legends-ping-system-gaming-ux-done-right-4661cd94954c [S]
- Foros de Blizzard y Diablo Wiki sobre la espera creciente al morir en D3 — https://di.diablowiki.net/Revive [S]
- Icy Veins y Blizzard Watch sobre La Torre y las tablas de D4 en 2026 — https://www.icy-veins.com/d4/news/diablo-4-tower-leaderboards-delayed-fix-incoming/ , https://blizzardwatch.com/2026/01/23/tower-leaderboards-diablo-4/ [S]
- Cloudflare, precios de Durable Objects (100.000 peticiones al día, 13.000 GB-s) — https://developers.cloudflare.com/durable-objects/platform/pricing [V, ya en tecnologia.md]
- Firebase Spark (cuotas, sin pausa) — https://magora-systems.com/firebase-pricing/ , https://dev.to/androve2k/spark-vs-blaze-the-firebase-pricing-guide-i-wish-id-read-sooner-onb [S]
- **Nuevas en la v4 (refutación externa):**
  - Gambetta, *Lag Compensation* (ves a los demás en el pasado y a ti en el presente) — https://www.gabrielgambetta.com/lag-compensation.html [V, leída]
  - Gaffer On Games, *Reliable Ordered Messages* (búfer de secuencias cíclico, mensajes incluidos hasta su acuse; no fija una caducidad: la nuestra es propia) — https://gafferongames.com/post/reliable_ordered_messages/ [V, leída]
  - RFC 9260 §3.1 y §3.3.1: cabecera común de SCTP de 12 B y cabecera de DATA de 16 B — https://www.rfc-editor.org/rfc/rfc9260.html [V, leída]
  - Chromium/WebRTC, cambio del MTU seguro de SCTP a 1.191 B (IPv6 40, UDP 8, GCM 24, DTLS 13, ChannelData 4) — https://chromium.googlesource.com/external/webrtc/+/branch-heads/4389%5E%21/ [V, resumen del buscador coincidente con `dcsctp_options.h`]
  - W3C webrtc-rtptransport #103 (feb-2026): la sobrecarga cambia con el par de candidatos (TURN o directo) — https://lists.w3.org/Archives/Public/public-webrtc-logs/2026Feb/0099.html [S]
  - Valve, *Source Multiplayer Networking* (interpolación de 100 ms y compensación) — https://developer.valvesoftware.com/wiki/Source_Multiplayer_Networking [S: la página respondió 403; citada por el experto]
  - ECMA-262, `SerializeJSONProperty` (NaN e Infinity → `null`) — https://tc39.es/ecma262/#sec-serializejsonproperty [S, citada por el experto; comportamiento conocido]
  - GGG, *Client-server Action Synchronisation* (modo predictivo) — https://www.pathofexile.com/forum/view-thread/889669 [S, citada por el experto]
  - Game Developer, *Enemy Attacks and Telegraphing* (la preparación avisa «ahí voy» y hace justo el golpe) — https://gamedeveloper.com/design/enemy-attacks-and-telegraphing [S]
- **Nuevas en la v5 (ronda 2):**
  - Chrome for Developers, *Freezing on Energy Saver*: se exime una página con «an RTCPeerConnection with an "open" RTCDataChannel», con un Web Lock o con IndexedDB que bloquea a otros; oculta y en silencio > 5 min — https://developer.chrome.com/blog/freezing-on-energy-saver [V, leída]
  - Google, *Ahorro de memoria*: excepciones (audio o video, llamadas, compartir pantalla, notificaciones, descargas, formularios, pestañas fijadas, dispositivos, lista «Mantener siempre activos»); no menciona WebRTC — https://support.google.com/chrome/answer/12929150 [V, leída]
  - Microsoft, funciones de rendimiento de Edge: pestañas dormidas a las 2 h, ≤ 30 min con Ahorro de energía y 5 min en Máximo; excepciones (visible, audio, captura, cámara o micrófono, DevTools, WebUSB, lista) — https://support.microsoft.com/en-gb/topic/learn-about-performance-features-in-microsoft-edge-7b36f363-2119-448a-8de6-375cfd88ab25 [V, leída]
  - Windows Report sobre «Infinite Tabs Freezing» — https://windowsreport.com/google-tests-infinite-tabs-freezing-in-chrome-to-boost-speed-and-performance-for-heavy-tab-users/ [S: respondió 403, citada por el experto]
  - Cloudflare, *TURN FAQ*: corte «after a short delay» al vencer la credencial, TTL máximo de 48 h, sin duración máxima de asignación, solo se cobra lo que sale hacia el cliente — https://developers.cloudflare.com/realtime/turn/faq/ [V, leída]
  - Cloudflare, *Generate credentials*: TTL mayor que el uso esperado (ejemplo de 86.400 s), refresco con `setConfiguration()`, endpoint de revocación, puerto 53 bloqueado por los navegadores — https://developers.cloudflare.com/realtime/turn/generate-credentials/ [V, leída]
  - Cloudflare, *TURN analytics* (`callsTurnUsageAdaptiveGroups`, `egressBytes`, `customIdentifier`) — https://developers.cloudflare.com/realtime/turn/analytics/ [S, citada por los expertos]
  - Cloudflare, *WebSockets en Durable Objects*: el constructor vuelve a correr al despertar, adjuntos de 16.384 B, los despliegues desconectan todos los WebSocket — https://developers.cloudflare.com/durable-objects/best-practices/websockets/ [V, leída]
  - Cloudflare, *Rate Limiting binding*: períodos de 10 o 60 s, contadores por ubicación, desaconseja la IP como clave — https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/ [V, leída; S: disponible en el plan gratis]
  - Cloudflare, precios de DO (solo SQLite en el plan gratis; autorrespuestas sin cobro; fallo hasta las 00:00 UTC) y ciclo de vida de los DO — https://developers.cloudflare.com/durable-objects/platform/pricing/ , https://developers.cloudflare.com/durable-objects/concepts/durable-object-lifecycle/ [S, citadas por el experto]
  - Cloudflare, Workers Logs y precios de R2 — https://developers.cloudflare.com/workers/observability/logs/workers-logs/ , https://developers.cloudflare.com/r2/pricing/ [S]
  - Supabase, *API keys*: `anon` y `service_role` se retiran a fines de 2026; `sb_publishable_…` y `sb_secret_…` — https://supabase.com/docs/guides/api/api-keys [V, leída]
  - Supabase: cambio de `GRANT` del 30-oct-2026, autenticación anónima, vinculación de identidades y precios (Free sin copias ni PITR) — https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically , https://supabase.com/docs/guides/auth/auth-anonymous , https://supabase.com/docs/guides/auth/auth-identity-linking , https://supabase.com/pricing [S, citadas por el experto]
  - Gaffer On Games, *State Synchronization* y *Snapshot Compression* — https://gafferongames.com/post/state_synchronization/ , https://gafferongames.com/post/snapshot_compression/ [S]
  - Gambetta, *Client-Side Prediction and Server Reconciliation* y *Entity Interpolation* — https://www.gabrielgambetta.com/client-side-prediction-server-reconciliation.html , https://www.gabrielgambetta.com/entity-interpolation.html [S]
  - RFC 9260 §6.2 (SACK) y §7 (congestión); Mathis et al. 1997 — https://www.rfc-editor.org/rfc/rfc9260.html [S]
- **Nuevas en la v5.2 (tras la verificación de las altas):**
  - RFC 7496 §3.1, *Limited Retransmissions Policy*: el emisor abandona un mensaje solo cuando un reintento pasaría el límite; con límite 0, «when it would get retransmitted for the first time». Un mensaje que espera en la cola sin enviarse no se abandona — https://www.rfc-editor.org/rfc/rfc7496.html#section-3.1 [V, leída]
  - RFC 9260 §3.3.4 (SACK: acuse acumulativo + bloques selectivos, modelo del acuse de golpes) y §6.3.3 (retransmisión con retroceso: por qué un mensaje de `r` puede salir segundos tarde) — https://www.rfc-editor.org/rfc/rfc9260.html#section-3.3.4 , https://www.rfc-editor.org/rfc/rfc9260.html#section-6.3.3 [V para §3.3.4, leída: «Cumulative TSN Ack» = el último recibido antes de un hueco, y cada «Gap Ack Block» acusa lo recibido después; S para §6.3.3, citada por el verificador]
  - dcSCTP `stream_scheduler.h` — https://webrtc.googlesource.com/src/+/08007e52590b05a05d89eb7fa02db1ec2b5604b4/net/dcsctp/tx/stream_scheduler.h [S]
  - MDN, `currentRoundTripTime` y `RequestInit` (*keepalive* de 64 KiB); RFC 7675 — https://developer.mozilla.org/en-US/docs/Web/API/RTCIceCandidatePairStats/currentRoundTripTime , https://developer.mozilla.org/en-US/docs/Web/API/RequestInit , https://www.rfc-editor.org/rfc/rfc7675 [S]
  - `worker-timers` (temporizadores en un Worker) — https://github.com/chrisguttandin/worker-timers [S: la eficacia depende del navegador; se mide en R1]
  - Chromium, permiso de red local para candidatos ICE (jun-2025) y discuss-webrtc sobre mDNS — https://webrtc.googlesource.com/src/+/e2cfc36f368bed29d006aae529314474bf85992d , https://groups.google.com/g/discuss-webrtc/c/6stQXi72BEU [S]
  - Firefox, SCTP de los DataChannels — https://searchfox.org/firefox-main/source/netwerk/sctp/datachannel/ [S]
  - OpenVidu, *TURN key considerations* (jun-2026: 17,7 % por relé, ~0,5 % solo TURN-TLS) — https://openvidu.io/blog/2026/06/09/turn-key-considerations/ [S]
  - Trystero — https://github.com/dmotz/trystero [S]
  - Shopify Engineering sobre `integrity` en el import map — https://shopify.engineering/shipping-support-for-module-script-integrity-in-chrome-safari [S]
  - Ley 21.719 de Chile (vigencia 1-dic-2026) — https://www.diarioconstitucional.cl/2026/06/12/la-ley-21-719-entra-en-vigor-el-1-de-diciembre-y-expone-vacios-en-regulacion-de-pequenas-empresas/ [S]
- El resto (dcSCTP, Chromium, MDN, BCD, Gaffer, Gambetta, Supabase, Vercel, bounce#8, pings desde Santiago) está citado y verificado en `investigacion/tecnologia.md` §16 y `investigacion/codigo.md` §12.

**Código leído para este diseño (además de los informes):** en la v5, `js/powers-arquera.js:2525-2545, 2655-2662`; `js/powers-maga.js:468-476, 1508-1512, 2130-2145, 3098-3110, 3140-3152`; `js/powers-common.js:128-131, 200-215`; `js/powers-guerrero.js:1129-1139, 1409-1412, 2038-2046, 2160-2163, 2288-2296`; `js/powers-forge-maga.js:99-102`; `js/mech-maga.js:112-122`; `js/skills-maga.js:468-482`; `js/game-skills.js:388-426`; `js/entities.js:1712-1720, 1930-1999, 2185-2209, 2718-2736, 2862-2884, 3165-3186`; `sw.js:1-8, 340-358, 385-408`; `index.html:12-30, 488-497`; grep de escrituras directas a campos de `Enemy`, de `onerror=`, `style=` y `onclick` en `ui*.js`, y de `VERSION` y `d3` en `js/`. En la v4, `js/combat-math.js:240-262, 437-443`; `js/entities.js:80-100, 1313-1314, 1850-1880, 2080-2210, 2240-2345, 2920-2960`; `js/field-entities.js:375-435, 640-680`; `js/enemy-abilities.js:245-270`; `js/timers.js:96-160`; `js/game-skills.js:880-950, 1171-1180`; recuento por grep de los campos de enemigo que lee el código del héroe y de los usos de la API de DoT. En la v3: `js/main.js:422-500, 990-1015, 1134-1160, 1505-1545`; `js/zones.js:225-260`; `js/world.js:6, 263-288, 709, 937, 1358`; `js/game-world-flow.js:79-113`; `js/game-skills.js:884-948`; `js/combat-math.js:545-562`; `js/skills-*.js` (auras y `allyDr`); `js/powers-*.js` (curas, escudos y ⑫); `docs/paso-frontend-menus.md:160-220`; `docs/paso2d2-hud-pc.md:75, 105, 113`; `MEMORIA.md:189-200`.
