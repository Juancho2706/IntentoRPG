# Frontend: de abrir el juego a jugar — «La Vigilia» (diseño y mockup)

> Estado: **diseño y mockup** (2026-10-20). No toca código del juego.
> Mockup interactivo: `docs/mockups/frontend.html`. Necesita servidor por los `.glb`:
> `npx http-server -p 8105 -c-1` desde la raíz del repo, y abrir
> `http://localhost:8105/docs/mockups/frontend.html`.
> Arte nuevo: `docs/mockups/frontend-art/` (versión web); los originales están en
> `D:\Proyectos\IntentoRPG-assets\raw\frontend\` y la versión web en `…\web\frontend\`.

Pedido del dueño: hoy el juego arranca sin presentación y la selección/creación «es muy horrible».
Se piden **todas** las pantallas previas a jugar, con el modelo 3D del héroe visible, el multijugador
visible pero bloqueado (llega en el Paso 6) y solo PC (ratón y teclado, 1920 y 1366).

---

## 1. Auditoría: cómo arranca hoy

**Flujo actual.** `index.html` carga `js/main.js`. El constructor de `Game` migra el guardado único
antiguo al hueco 0 y llama a `ui.showClassSelect(...)` (`js/ui.js` ≈ l. 418). No hay splash, ni menú, ni
pantalla de carga: lo primero que se ve es un formulario plano (captura:
`scratchpad/frontend/shots/actual_1920.png`):

- título de texto «IntentoRPG» con un subtítulo;
- **3 huecos** (`intentorpg_save_slot{0..2}`) como botones con «Hueco N / Nuevo héroe», o «Clase Nv X · Piso máx»
  con Jugar y una papelera que borra con un `confirm()` del navegador;
- el selector de esquema de control (WASD o clic para mover), que es una **opción** y no debería estar aquí;
- la casilla Hardcore, el nombre opcional y 8 círculos de color (`tint`, que hoy tiñe el modelo procedural);
- 3 tarjetas de clase con emoji, una frase y los atributos base (FUE/DES/VIT/ENE), y el botón «Elegir»;
- una línea de ayuda con todos los atajos de teclado.

Elegir clase inicia la partida al instante: no hay confirmación, ni vista del personaje, ni transición. `startGame()`
siempre carga la zona `Cripta` (el campamento), sin importar dónde quedó el héroe.

**Qué se guarda** (`js/save-schema.js`, `SAVE_VERSION = 4`, `PLAYER_SAVE_FIELDS`):
`classId, level, xp, attributes, statPoints, skillPoints, skillSystemV, skillBranches, hotbar, gold, potions,
inventory, materials, equipment, lastFloor, hp, mp, waypoints, records, cube, quest, hardcore, pet, talents,
era, titles, title, discoveredZones, homeZone, strongholdsCleared, dailyDone, tips, supports, knownSupports,
skillMods, paragon, refugeUnlocked, discovered, heroName, tint, torment, codex, blessings`.

**Qué muestra hoy la selección** (`Game.slotMetas()`): `classId, level, maxFloor, hardcore, name, tint`. Nada más.

**Qué ya se podría mostrar sin cambiar el formato** (está en el save, solo hay que leerlo en `slotMetas`):

| Dato de la ficha | Fuente actual |
|---|---|
| Especialización | `talents.spec` (desde nivel 10; `TALENT_START_LEVEL`) |
| Paragon | `paragon.points` + nodos (`level − 20`) |
| Tormento | `torment` |
| Temporada | `era` (temporada local de la semana) |
| Tiempo jugado | `records.playTime` (segundos) |
| Título | `title` |
| Zona hogar | `homeZone` (hoy siempre `Cripta` salvo bastiones reclamados) |

**Qué hay que agregar** (detalle en §6): sexo, última zona real, fechas (creación y última partida), registro de
caídos en Hardcore y, para la cámara, un índice liviano del roster.

**Clases** (`js/data.js` `CLASSES`): `guerrero` (Furia), `maga` (Maná), `arquera` (Energía). Los **nombres
tienen género** (Guerrero, Maga, Arquera): al agregar sexo hay que separar el id interno del nombre visible
(Guerrero/Guerrera, Mago/Maga, Arquero/Arquera) y lo mismo con 4 especializaciones (Guardián/Guardiana,
Cruzado/Cruzada, Francotirador/Francotiradora, Tirador/Tiradora Veloz). Las 9 especializaciones ya tienen
retrato (`assets/specs`), emblema (`assets/emblems`), color (`hud-model.js SPEC_COLOR`), rol y descripción
(`ui-talents.js SPEC_INFO`).

**Modelos 3D disponibles hoy** (`tools/compare/models/hunyuan/`): `mago_anim.glb` (rig Mixamo, 13 clips:
`reposo`, `reposo_2`, `caminar`, `correr`, `lanzar`, `ataque_1h/2h/area`, `bloqueo`, `golpe(_fuerte)`, `muerte_1/2`),
`maga.glb` y `mago.glb` estáticos en pose A, `esqueleto_anim.glb` (18 clips). `maga_anim.glb` aún no existe:
el mockup la busca primero y, si falta, usa `maga.glb` y lo avisa en la ficha. Guerrero y arquera no tienen modelo.

---

## 2. Investigación (consultas del 2026-10-20)

Se marca **[V]** lo verificado en una fuente y **[M]** lo que es conocimiento propio sin fuente hoy. No se
pudo verificar en la web el menú de Path of Exile 2, Torchlight Infinite, Grim Dawn, Hades 2 ni V Rising (escena);
varias páginas (Icy Veins, Game UI Database) responden 403 a la descarga directa.

### 2.1 Por juego

- **Diablo 4.** [V] En el parche 2.0 (Vessel of Hatred, 2024) la hoguera con los héroes alrededor se cambió por
  iconos de clase con una vista previa animada al pasar el ratón; con 6 clases la hoguera se veía saturada, y la
  comunidad quedó dividida. [V] *Lord of Hatred* salió el 28-abr-2026 con 8 clases y 2 huecos de personaje extra;
  no hallé fuente sobre cambios en la selección. **Lección:** la hoguera es icónica (viene de Diablo 2), pero
  como diorama no pasa de 5–6 figuras. Por eso aquí el roster es una lista y la hoguera muestra hasta 5 lugares.
  Fuentes: [Icy Veins, «The Campfire Is Gone»](https://icy-veins.com/d4/news/the-campfire-is-gone-diablo-4-2-0-has-a-new-character-creation-screen) (2024; fecha exacta no visible),
  [WowVendor](https://wowvendor.com/media/diablo/diablo-4-character-creation-screen/) (fecha no visible),
  [Icy Veins, segunda clase de Lord of Hatred](https://www.icy-veins.com/d4/news/lord-of-hatred-second-new-class-after-paladin/) (fecha no visible).
- **WoW (The War Within → Midnight).** [V] La selección de personaje usa **campamentos** (*campsites*) de la
  banda guerrera: fondos 3D elegibles en los que los personajes se agrupan de a 4 alrededor de un fuego; en 11.1
  se sumaron hasta 20 grupos, favoritos y fondos al azar, y se desbloquean nuevos campamentos con logros. [V]
  Midnight (salida el 2-mar-2026) agrega en 12.1 dos campamentos de Silvermoon (el del Pozo del Alba y uno
  tomado por el Vacío). **Lección:** el fondo de la selección es contenido coleccionable y cuenta la historia del
  momento. Fuentes: [Blizzard Watch, 2025-02-20](https://blizzardwatch.com/2025/02/20/unlock-new-campsite-scenes-world-warcraft-patch-11-1),
  [Icy Veins, mejoras de la pantalla de personaje 11.1](https://icy-veins.com/wow/news/all-character-screen-improvements-patch-11-1-multiple-warband-camp-grouping-new-campsites) (fecha no visible),
  [Icy Veins, campamentos de Silvermoon en 12.1](https://www.icy-veins.com/wow/news/wow-players-can-choose-between-dawnwell-and-void-silvermoon-campsites-in-patch-12-1/) (fecha no visible),
  [warcraft.wiki.gg · Campsites](https://warcraft.wiki.gg/wiki/Campsites) (consulta 2026-10-20),
  [Warcraft Tavern, lanzamiento de Midnight](https://www.warcrafttavern.com/wow/news/world-of-warcraft-midnight-launches-march-2-early-access-february-27/) (fecha no visible).
- **Diablo Immortal.** [V] Al abrir entra directo con el último personaje; para cambiar hay que salir desde
  Ajustes. **Lección:** «continuar» en cero clics para el jugador recurrente. Fuentes: [Attack of the Fanboy](https://attackofthefanboy.com/guides/diablo-immortal-how-to-change-class/) (fecha no visible), [Wikipedia](https://en.wikipedia.org/wiki/Diablo_Immortal) (consulta 2026-10-20).
- **Last Epoch.** [V] En la selección el héroe aparece con el nombre de su **maestría** (no de la clase base), y en
  la creación se eligen el modo y los desafíos a un lado. **Lección:** mostrar la especialización, que es la
  identidad de la build. Fuente: [Prima Games](https://primagames.com/tips/can-you-change-your-mastery-in-last-epoch) (fecha no visible).
- **Grim Dawn.** [V] La maestría se elige dentro del juego (niveles 2 y 10), no en la creación. **Lección:** igual que
  aquí (especialización al nivel 10): la creación debe mostrar las especializaciones como **avance**, no como
  decisión. Fuente: [grimdawn.com](https://www.grimdawn.com/guide/character/character-basics/) (fecha no visible).
- **Lost Ark.** [V] Clases ligadas a un género fijo; la vista previa de creación muestra un atuendo de fin de juego.
  [M] Cada clase se presenta con una escena corta de habilidades. Fuente: [Gamepressure](https://www.gamepressure.com/S013-amp.asp?ID=16167) (fecha no visible).
- **Baldur's Gate 3.** [V] La creación separa Personaje (raza/clase/trasfondo) de Apariencia; Larian informó que solo el
  7 % eligió un Origen. **Lección:** la decisión mecánica primero y la cosmética después, en pasos separados.
  Fuentes: [Wargamer](https://www.wargamer.com/baldurs-gate-3/character-creation-88-years) (fecha no visible), [PlayStation Blog](https://blog.playstation.com/?p=384175) (fecha no visible).
- **V Rising.** [V] El aspecto se cambia gratis después, en un Espejo del castillo; el color de la armadura va por
  paletas fijas desde la 1.0. **Lección:** la apariencia editable después baja el miedo a equivocarse; las paletas
  fijas son más baratas que los sliders. Fuente: [guía oficial](https://guides.playvrising.com/hc/en-us/articles/28676448475805-Can-I-Change-My-Vampire-s-Appearance-in-V-Rising) (fecha no visible).
- **Titan Quest 2.** [V] El playtest usaba modelos prearmados masculino/femenino sin sliders; en oct-2025 se anunció un
  editor completo. **Lección:** un selector de modelos prearmados es un primer paso digno. Fuentes:
  [CGMagazine](https://www.cgmagonline.com/articles/previews/titan-quest-ii-hands-on-promising-start) (fecha no visible),
  [iXBT, 2025-10-24](https://ixbt.games/en/news/2025/10/24/avtory-titan-quest-2-pokazali-polnocennyi-redaktor-personazei-i-geroiniu-v-stile-hades-2.html).
- **No Rest for the Wicked.** [V, wiki de fans] Nombre, tipo de cuerpo y rasgos faciales con cuerpos predeterminados.
  Fuente: [Fextralife](https://norestforthewicked.wiki.fextralife.com/Character+Creation) (fecha no visible).
- **Hades 2.** [V] Del título se pasa directo al juego. [M] Menú breve con mucha identidad visual. Fuente:
  [RPG Site](https://www.rpgsite.net/news/18542-hades-ii-1-0-download-steam-nintendo-switch-2-launch-trailer) (fecha no visible).
- **Path of Exile 2.** [V] La 1.0 figura para diciembre de 2026; sobre su pantalla de personaje no encontré fuente.
  [M] Personajes de pie en una escena 3D con la clase en primer plano. Fuente: [Wikipedia](https://en.wikipedia.org/wiki/Path_of_Exile_2) (consulta 2026-10-20).

### 2.2 Patrones y por qué funcionan

| Patrón | Quién | Por qué funciona |
|---|---|---|
| Escena 3D con los héroes alrededor de un fuego | Diablo 2/3/4 (hasta 2.0), WoW (campamentos) | El roster se vuelve un lugar: los héroes «esperan» al jugador |
| Fondo de selección coleccionable | WoW 11.1/12.1 | La pantalla cuenta el momento del juego y se renueva |
| Continuar directo con el último héroe | Diablo Immortal | Cero fricción para el jugador que vuelve |
| Especialización como identidad del héroe | Last Epoch | Es lo que el jugador siente que «es» |
| Clase primero, apariencia después | BG3 | Evita el formulario gigante; decide lo mecánico primero |
| Paletas fijas y apariencia editable después | V Rising, Titan Quest 2 | Barato de producir, sin miedo a equivocarse |
| Vista previa animada al pasar el ratón | Diablo 4 2.0 | Muestra la fantasía sin leer |
| El diorama no escala más allá de 5–6 figuras | Diablo 4 2.0 | Por eso el roster es una lista y la escena muestra hasta 5 |

### 2.3 Consejos de UX de menús

1. **«Continuar» primero y diciendo qué carga** (nombre, clase, nivel). [TechSpot, «diez mandamientos»](https://www.techspot.com/news/62281-ten-commandments-video-game-menus.html) (fecha no visible); [Space Engineers, soporte](https://support.keenswh.com/spaceengineers/pc/topic/main-menu-continue-game-button-behavior) (fecha no visible).
2. No mostrar «Continuar» si no hay partida real (ojo con los autoguardados vacíos). [Adventure Creator, sep-2025](https://adventurecreator.org/forum/discussion/comment/64931/).
3. **Acciones destructivas** con confirmación explícita y separadas de las frecuentes. [CSIR](https://gsdms.csir.co.za/blog/in-game-menu-adding-abandon) (fecha no visible).
4. «Pulsa cualquier tecla» es redundante si la siguiente pantalla pide otra entrada. [PC Gamer, foro](https://forums.pcgamer.com/threads/no-more-press-any-key-prompts-at-game-start-please.2462) (opinión de jugadores). **Aquí se justifica:** el navegador exige un gesto del usuario para activar el audio, y ese mismo gesto sirve de entrada.
5. Respuesta inmediata a cada acción (animación, sonido, estado). [HITEM3D](https://blog.hitem3d.ai/blog/How-to-Design-Game-UI-A-Beginner-s-Guide-to-Game-User-Interface-Design) (fecha no visible).
6. No depender solo del color: forma o icono, más contraste. Misma fuente; además [Game Accessibility Guidelines](https://gameaccessibilityguidelines.com/) (consulta 2026-10-20).
7. Jerarquía visual clara y consistencia con el resto de la UI. [Wayline](https://www.wayline.io/blog/game-ui-ux-design-best-practices-and-examples) (fecha no visible); [Xsolla](https://xsolla.com/blog/5-words-to-remember-when-designing-your-game-menu) (fecha no visible).
8. Onboarding: no enseñar todo de golpe. Celia Hodent, [GDC 2016](https://gamedeveloper.com/design/video-inside-the-ux-of-onboarding-and-player-engagement) (fecha no visible).
9. [M] Foco de teclado visible, `Esc` siempre vuelve un paso y las transiciones cortas (≤ 2,5 s) y saltables.

---

## 3. Concepto: «La Vigilia»

**Idea fuerte:** *los héroes guardados velan junto a la última hoguera del campamento en ruinas, al borde del
valle de la Cripta.* El fuego es el guardado: cada lugar junto al fuego es un hueco, y crear un héroe es
**prestar juramento** en una piedra junto a la hoguera. Toda la presentación es **una sola escena 3D continua**
y la cámara viaja entre pantallas: nunca hay un corte a negro hasta entrar al mundo.

**Por qué esta y no la catedral profanada:**
1. **Es el lugar real del juego.** `startGame()` deja al héroe en el campamento contiguo a la Cripta («Sal del
   campamento para explorar las Tierras de la Cripta»). La presentación y la primera partida suceden en el mismo sitio.
2. **Hereda la herencia de Diablo 2** (la hoguera) sin el problema de escala de Diablo 4: con 5 lugares el diorama funciona.
3. **Da sentido a sistemas que ya existen:**
   - *Hardcore:* el héroe que cae no desaparece en silencio, sino que pasa al **Muro de los Caídos**, junto a un
     brasero frío y con luz azul. Hoy `onPlayerDeath` borra el hueco: esto lo convierte en memoria.
   - *Especializaciones:* el fuego toma el color de la especialización del héroe elegido.
   - *Multijugador (Paso 6):* **«otras hogueras aún no arden»**. Al pasar por Multijugador, la cámara mira más allá
     del campamento, hacia tres braseros lejanos con una llama fría y azul: los campamentos de otros jugadores,
     que se encenderán en el Paso 6. El bloqueo se entiende sin leer.
4. **Es barato de producir:** usa las piezas del juego (`world.js`: rocas y ruinas), el `fx_*` de VFX ya hecho, un
   fondo pintado en un cilindro (*matte painting*) y los modelos Hunyuan que ya se están riggeando.

**Título.** Se mantiene **IntentoRPG** con el subtítulo **«La Última Brasa»**, que nombra el concepto. Se generó
también un logotipo alternativo «La Última Brasa» por si el dueño quiere un título definitivo (`?titulo=brasa` en
el mockup). Recomendación: decidir el nombre antes de publicar; «IntentoRPG» suena a nombre de trabajo.

---

## 4. Pantallas

Todas a 1920×1080 y 1366×768: la UI escala con `--s = clamp(min(W/1920, H/1080), 0.8, 1.3)` (en `rem`), anclada
a los bordes. Tipografía Cinzel (títulos) e Inter (datos), tarjetas oscuras `#15111a` con borde oro tenue,
botones `ui_boton*`, tooltip `ui_tooltip` y modal `ui_marco_panel` + `tx_panel`: el mismo lenguaje que el HUD de
PC y los paneles de talentos/habilidades.

### (a) Splash — «el cuadro vivo»
- **Layout:** key art pintado a pantalla completa (`fe_splash`: hoguera con una espada clavada, la puerta de la
  cripta al fondo). Emblema + logotipo arriba al centro, «Pulsa cualquier tecla» abajo con respiración de 2,6 s, y
  versión y «Solo PC» en letra chica.
- **Vida:** brasas en canvas 2D que salen de la hoguera pintada, parpadeo de luz sobre el fuego (capa en *screen*),
  zoom lento estilo Ken Burns (40 s) y una barra fina de carga de los modelos que desaparece al terminar.
- **Interacción:** cualquier tecla o clic (cuando terminó la carga). Ese gesto **activa el audio**.
- **Audio:** viento nocturno, rumor grave de la hoguera con chasquidos al azar y un dron de cuerdas en re menor.
  Al pulsar: golpe sordo, *whoosh* y una campana lejana.
- **Transición → menú (2,4 s):** el cuadro se funde mientras la cámara 3D se aleja desde la hoguera hasta el
  plano del campamento. El logotipo pasa de centrado a la esquina superior izquierda.

### (b) Menú principal
- **Layout:** columna izquierda con texto Cinzel grande (estilo Blizzard, sin cajas):
  **Continuar** (emblema de la especialización + «Taliesin · Mago Crionte · Nv 42»), Personajes, **Multijugador**
  (gris, con un sello de lacre «6 · Próximamente · Paso 6»), Opciones, Créditos y Salir. Abajo a la izquierda,
  la versión. Abajo a la derecha, una tarjeta de **Novedades** de una línea. A la derecha, la escena: la hoguera,
  los héroes velando y tres llamas frías a lo lejos.
- **Primera vez (sin héroes):** el primario pasa a **Nuevo héroe** y no aparece «Personajes».
- **Interacción:** ↑/↓ o W/S mueven el foco (el bloqueado se salta), Enter activa y Esc vuelve al splash. Hover:
  rombo de oro y subrayado de brasa. **Multijugador:** al pasar el ratón, la cámara viaja hacia las hogueras frías
  y aparece «Otras hogueras aún no arden · Cooperativo de 2 a 4 · llega en el Paso 6». Al hacer clic: sacudida,
  sonido de negación y aviso.
- **Salir:** en el navegador vuelve al título (en una versión de escritorio cerraría el juego).
- **Audio:** sigue el dron con un tema lento (violonchelo solo y coro lejano, 70 bpm, propuesto para el juego
  real). Hover: tic metálico. Clic: golpe de pedernal.
- **Clics a jugar con héroe existente:** tecla (splash) → **Continuar** → carga → juego = **2 acciones** (meta ≤ 3).

### (c) Selección de personaje
- **Layout:** izquierda, el roster (5 lugares): emblema de la especialización (o arma de la clase si aún no tiene),
  nombre, «Nv 42 · Crionte» en el color de la especialización, la zona e insignia **HC**. Los lugares libres se ven
  como «Lugar libre junto al fuego». Debajo, separado, el **Muro de los Caídos**. A la derecha, la **ficha**: banda
  con el retrato de la especialización, nombre grande, especialización · clase, y 5 datos en tarjetas (nivel y
  Paragon, dificultad o Hardcore, zona con miniatura de su arte, tiempo jugado, temporada) más «Última vez» y
  **Borrar**. Abajo al centro, **JUGAR ⏎** y los atajos. Arriba, el selector Solo | **Grupo (Paso 6)** bloqueado.
- **La cámara:** al elegir, el héroe **da un paso hacia el fuego** (clip `caminar`, luego `reposo`) y la cámara
  orbita alrededor de la hoguera hasta encuadrarlo de cuerpo entero con un tele de 31°. El resto queda en
  penumbra (se atenúa al 7 %). Una luz del color de la especialización le hace contraluz y el fuego vira un 35 %
  hacia ese color. El caído se ve con su modelo real (el esqueleto), con luz fría y la hoguera azulada.
- **Interacción:** ↑/↓ o ←/→ cambian de héroe (la cámara viaja), clic en el héroe en 3D o en el roster, Enter
  juega, N crea, Supr borra y Esc vuelve al menú. Clic en un lugar libre: crear.
- **Borrar:** modal con marco pintado: «¿Borrar a Taliesin? Crionte · Nv 42 · 31 h…» y hay que **escribir el
  nombre** para habilitar el botón rojo. El alijo compartido se conserva.
- **Caídos:** la ficha dice dónde cayó, quién lo mató y cuánto vivió. «Jugar» pasa a «Su vigilia terminó» y la
  acción es «Liberar su recuerdo» (con la misma confirmación).
- **Placeholders honestos:** guerrero y arquera son un **eidolon** (silueta negra con contorno de brasa del color
  de la clase), hecho con el esqueleto (guerrero, con la espada KayKit) o la maga y el mago (arquera/arquero). La
  ficha dice «Silueta provisional: el modelo 3D está en producción».
- **Audio:** al cambiar de héroe, un **leitmotiv corto por clase** que se cruza con el anterior: guerrero con
  tambores graves, maga con celesta y coro, arquera con cuerda pulsada y flauta de hueso. En el caído: campanas
  frías y el chasquido del fuego baja.
- **Transición → juego (1,2 s):** la cámara **se zambulle en la hoguera** (picado sobre las llamas, el fuego se
  aviva en el color del héroe), fundido a negro y pantalla de carga.

### (d) Creación — «el Juramento»
Tres pasos con un indicador arriba: **I Clase · II Héroe · III Juramento**. La cámara viaja a la **Piedra del
Juramento**, una losa con un anillo de runas que se enciende en el color de la clase.

- **I · Clase.** Izquierda: 3 tarjetas grandes (arma insignia, nombre según el sexo elegido, «Distancia · Frágil»,
  atajo 1/2/3). Derecha: el **nombre de la clase** enorme y una frase de fantasía («La voluntad hecha elemento.»).
  Debajo, chips (recurso con su icono `res_*`, estilo, dificultad ◆◆◇) y **3 habilidades insignia**: al pasar el
  ratón, **el modelo 3D las ejecuta** (`lanzar`, `ataque_area`, `ataque_2h`…) con una ráfaga de brasas del color
  de la clase. Esa es la «presentación en video», hecha con el motor. Al pie, «Al nivel 10 eliges tu senda» y las
  **3 especializaciones** como cartas con retrato, emblema y rol. Al pasar el ratón, el fuego y la luz del altar
  toman el color de esa especialización y un tooltip lateral explica el rol y la mecánica (Escarcha, Sed…).
  Al cambiar de clase, el modelo **surge** del altar con una ráfaga de brasas y suena el leitmotiv.
- **II · Héroe.** La cámara se acerca a medio cuerpo. Panel: el nombre en vivo, **Forma: Hombre | Mujer** (H/M; el
  modelo cambia en vivo), **Tinte de la orden** (las 8 muestras que el juego ya guarda en `tint`; el modelo se
  recolorea en vivo), **Nombre** con 🎲 (nombres del mundo según la forma) y **Hardcore** («Una sola vida. Si cae,
  su silueta velará en el Muro de los Caídos»).
- **III · Juramento.** «Prestar juramento» se **mantiene presionado** (0,9 s, con ratón o Enter): evita el clic
  accidental y da peso al momento. Se levanta una **columna de luz** del color de la clase sobre el altar, las brasas
  giran en espiral, la cámara empuja hacia el héroe y sube, y al final hay una sacudida, un **destello blanco-ámbar**
  y la pantalla de carga de la Cripta. Audio: barrido de ruido ascendente, acorde de coro que crece, golpe grave al
  destello y 300 ms de silencio antes del ambiente de la zona.
- **Esc** vuelve un paso (II → I → Héroes, o al Menú si no hay héroes).

**Apariencia viable con Hunyuan** (texturas horneadas, un solo material por modelo):
1. **Sexo:** dos modelos por clase (mago/maga ya existen). Es lo que pidió el dueño y es lo más barato.
2. **Tinte de la orden (en el mockup ya funciona):** un *shader* que detecta el tono del azul de la orden
   (#3a6bd6, tono ≈ 222°, medido en las texturas) y lo rota al tono elegido, conservando la luz y la sombra de la
   textura. Solo cambia la tela de la orden; el cuero, el oro y la piel quedan intactos. Sirve con las 8 muestras
   actuales (`tint`) y no requiere nuevo arte.
3. **Más adelante:** una variante de cabeza o peinado por sexo (otro `.glb` de cabeza montado en el hueso `Head`) y el
   brillo del arma en el color de la especialización. Los sliders de cara o cuerpo **no son viables** con Hunyuan
   (malla horneada sin *blendshapes*).

### (e) Pantalla de carga
- Arte de la zona del héroe a pantalla completa (`fe_carga_cripta / hielo / infierno / abismo`) con un zoom lento de
  9 s. Abajo a la izquierda: «Acto II · Nivel 6+», el **nombre de la zona** en Cinzel grande y una línea de lore
  entre comillas. A la derecha, una tarjeta de **Consejo** con su tecla (Mayús, N, Alt…). Una **mecha encendida**
  hace de barra de progreso y abajo aparecen el héroe (emblema · nombre · clase · nivel) y el porcentaje.
- Héroe nuevo: siempre la Cripta, con el consejo de esquivar.
- **Audio:** sin música, solo el ambiente de la zona (viento de cripta, goteo de cueva, lava, zumbido estelar).
- Para esto hace falta guardar **`lastZone`**: hoy siempre se entra al campamento de la Cripta.

### (f) Opciones (vista rápida)
Modal pintado con 4 pestañas: **Gráficos** (calidad, post-procesado, sombras, escala de render), **Audio** (general,
música y efectos; en el mockup controlan el sonido real), **Controles** (esquema WASD o clic, que **sale de la
pantalla de clase**, y reasignar teclas) y **Accesibilidad** (reducir movimiento, texto grande, daltonismo,
escala del HUD). Todos son *settings* que el juego ya tiene (`settings.quality/postfx/shadows/renderScale/volMaster/
volMusic/volSfx/controlScheme/reduceMotion/bigText/colorblind/hudScale`). `reduceMotion` también apaga los viajes
de cámara: con él, las transiciones son fundidos de 0,3 s.

### Mapa de transiciones

| De → a | Cámara | Duración |
|---|---|---|
| Splash → Menú | se aleja de la hoguera hasta el plano general; el cuadro se funde | 2,4 s |
| Menú → Multijugador (hover) | sale del campamento hacia las hogueras frías | 1,4 s (vuelve en 1,2) |
| Menú → Selección | órbita alrededor del fuego hasta el héroe | 1,5 s |
| Héroe → héroe | órbita corta; el elegido avanza y el anterior retrocede | 1,15 s |
| Selección/Menú → Creación | órbita hasta la Piedra del Juramento | 1,7 s |
| Clase → Héroe | se acerca a medio cuerpo | 1,1 s |
| Juramento → Carga | columna de luz, empuje, destello | 1,9 s |
| Jugar/Continuar → Carga | zambullida en la hoguera y fundido a negro | 1,2 s |

Todas se pueden saltar con Esc o con un clic (en el juego real).

---

## 5. Sonido (resumen)

| Pantalla | Música | Ambiente | UI |
|---|---|---|---|
| Splash | dron grave en re menor | viento, hoguera con chasquidos | golpe + campana al pulsar |
| Menú | tema lento: violonchelo solo + coro lejano (70 bpm) | hoguera | tic al pasar, pedernal al clic, negación en Multijugador |
| Selección | tema a −6 dB + leitmotiv por clase al cambiar | hoguera; campanas frías en el caído | igual |
| Creación | leitmotiv de la clase al elegirla | brasas que suben al surgir el modelo | — |
| Juramento | coro que crece + golpe | rugido del fuego | — |
| Carga | silencio | ambiente de la zona | — |

El mockup lo **sintetiza con WebAudio** (sin archivos), como boceto. En el juego van pistas reales en `js/music.js` y
`js/sfx.js`, con un *crossfade* entre el tema del menú y el ambiente de la zona.

---

## 6. Datos de guardado nuevos (migración v4 → v5)

| Campo | Tipo | Default en la migración | Para qué |
|---|---|---|---|
| `sex` | `'h' \| 'm'` | por clase: `guerrero → 'h'`, `maga → 'm'`, `arquera → 'm'` (los nombres actuales) | modelo 3D y nombres con género |
| `lastZone` | string (bioma) | `homeZone` | arte de carga y zona de entrada |
| `createdAt` / `lastPlayed` | ms epoch | `Date.now()` al migrar | «Última vez», orden del roster |
| `appearance` | `{ v:1, head:0 }` | `{ v:1, head:0 }` | reservado para variantes de cabeza; el tinte sigue en `tint` |

- `SAVE_VERSION = 5` y `MIGRATIONS[4]` (idempotente, como las anteriores). `tint` **no cambia de formato** (las 8
  muestras siguen valiendo); solo cambia cómo se aplica (en el modelo Hunyuan, rotación de tono).
- **Índice del roster** `intentorpg_roster` (nuevo, opcional): `[{slot, name, classId, sex, spec, level, paragon,
  torment, hardcore, lastZone, playTime, lastPlayed, era, tint}]`, escrito en cada `save()`. Así la selección no
  tiene que parsear 5 guardados completos (inventarios incluidos) para pintar el roster. Si falta, se reconstruye
  desde los huecos (como hoy hace `slotMetas`).
- **Caídos** `intentorpg_fallen` (nuevo): `[{name, classId, sex, spec, level, where:{zone, floor}, killer,
  playTime, date}]`, con un tope de 12. Lo escribe `onPlayerDeath` en Hardcore **antes** de borrar el hueco. Pide
  un campo en tiempo de ejecución `p.lastHitBy` (nombre del enemigo que dio el último golpe) que no se persiste.
- **Huecos:** de 3 a **5** (`slotKey(0..4)`; los huecos nuevos están vacíos y no hace falta migrar nada).
- **Catálogo:** `CLASSES[id].names = { h, m }` y `SPEC` con `names` cuando cambia el género. Los ids internos (`maga`,
  `arquera`) **no cambian** (romperían saves, talentos y tests).
- **Tests:** `test-save-schema` (v4→v5 idempotente, defaults por clase) y uno nuevo para el modelo puro del frontend
  (ver §7).

---

## 7. Plan de implementación

**Arquitectura propuesta** (respeta «`ui.js`/`main.js` no se importan headless»):
- `js/frontend-model.js` (**puro**, testeable): ítems del menú según haya héroes, `rosterView(metas)`,
  `sheetView(meta)` (textos de ficha con género), orden de foco, conteo de acciones hasta jugar, nombres al azar y
  la validación del nombre y del borrado.
- `js/frontend-scene.js`: escena de la hoguera (fondo cilíndrico, fuego, brasas, huecos, altar, hogueras lejanas),
  director de cámara (tomas + viaje cilíndrico) y carga de modelos con `GLTFLoader` y *fallback*: si no hay `.glb`
  de la clase, eidolon. Reutiliza `world.js` y `postfx.js`.
- `js/frontend-ui.js`: el DOM de las 6 pantallas (sustituye a `showClassSelect`). `css/frontend.css`.
- `Game`: nuevo estado `'front'` antes de `'play'`. El renderer y el composer son los mismos, y al entrar a jugar
  se libera la escena del frontend (`dispose`).
- `sw.js`: bump de `VERSION`, los `js/*` nuevos en `ASSETS` y el arte de `web/frontend` (≈ 1,3 MB en webp) en
  caché diferida (no en `UI_ASSETS`, salvo el emblema y el logotipo).

**Etapas**

| Etapa | Contenido | Depende de | Esfuerzo |
|---|---|---|---|
| F0 | Guardado v5 (`sex`, `lastZone`, fechas, roster, caídos, 5 huecos), nombres con género, `frontend-model.js` y tests | — | S |
| F1 | Splash (cuadro vivo), menú, carga y opciones, en 2D, con el arte nuevo. Sale `controlScheme` de la creación | F0 | M |
| F2 | Escena 3D de la hoguera + selección + creación con los **modelos procedurales actuales** (`makePlayerModel`) y eidolon donde falte | F1 | M |
| F3 | Modelos Hunyuan riggeados (mago/maga ya; el resto según el pipeline), tinte por rotación de tono y demo de habilidades con clips | pipeline 3D | M |
| F4 | Audio real (tema del menú, leitmotiv, ambientes de carga) | F1 | S–M |
| F5 | Pestaña Grupo y hogueras lejanas activas | **Paso 6** | — |

**Dónde encaja y recomendación.** Recomiendo **adelantar F0 + F1 (y si cabe F2) a antes de publicar los pasos
0+1+2** en Vercel. La publicación es la primera impresión pública del juego rehecho, y hoy esa impresión es
el formulario de §1. F0 es una migración pequeña que conviene hacer **antes** de que haya más saves en
producción, y F1 no depende de los modelos. F3 se integra con el pipeline de personajes 3D (Hunyuan → Mixamo)
a medida que llegue cada clase: el mockup ya demuestra que mago/maga y el esqueleto entran tal cual. F5 queda
atada al Paso 6 (el mockup ya deja el lugar visible y bloqueado).

---

## 8. Refutación (3 rondas sobre capturas a 1920 y 1366)

Capturas finales: `scratchpad/frontend/shots/r3_<ancho>_<pantalla>.png`.

**Ronda 1** («¿AAA o plantilla?»)
- El splash 3D (cámara pegada a la hoguera procedural) era más pobre que el key art pintado → el splash pasa a ser el
  **cuadro vivo** (brasas en canvas, parpadeo, Ken Burns) y el 3D aparece al alejarse la cámara.
- Un arco de cajas y estandartes planos se veían baratos → fuera; el fondo pintado en cilindro hace ese trabajo.
- Los héroes no elegidos competían con el elegido → paso al frente del elegido, atenuación de los demás y más separación.
- El eidolon se veía como un «esqueleto de lava» (el especular de la luz del fuego sobre un material negro) →
  material Lambert negro con solo el contorno.
- El caído tapaba el menú; el sello del Multijugador se partía en dos líneas; había una pila de huesos blanca → corregidos.

**Ronda 2** («¿luce el 3D? ¿se entiende el multijugador?»)
- El menú se veía vacío (cámara lejana, una franja de suelo plano) → cámara más baja y cercana: héroes y fuego llenan la derecha.
- Las hogueras lejanas no se leían → llamas frías azules sobre plintos y la cámara **sale del campamento** hacia
  ellas. El bloqueo se entiende sin texto: sello «Paso 6» + escena + una frase.
- La columna del juramento salía arcoíris (textura de llama teñida) → luz del color de la clase + núcleo tenue.
- El fondo mostraba un corte al mirar hacia el altar → cilindro completo de 360°, espejado.

**Ronda 3** (1366, texto y coherencia)
- A 1366 el tooltip de la especialización tapaba las habilidades → tooltip lateral, fuera del panel.
- La etiqueta 3D «modelo en producción» chocaba con la cabecera o con el botón → pasa a la ficha y al panel (una línea).
- En las cartas de especialización el rol en dos líneas pisaba el nombre → nombre y rol apilados desde abajo.
- La columna del juramento aún traía los colores de la textura de llama → solo luz del color de la clase.
- La luz del altar sobreexponía un pilar del fondo en el plano medio → menos alcance (4,4 m).
- La vista de las hogueras lejanas tenía ruinas y plintos tapando el encuadre → corredor libre y plintos más bajos.
- Texto: la creación muestra una frase de fantasía y nombres; las descripciones viven en tooltips (regla de los paneles 2f).
- Clics de abrir a jugar con héroe guardado: **2** (tecla + Continuar). Nuevo héroe: tecla + Nuevo héroe + Enter
  (clase) + mantener Juramento = **4** (el nombre es opcional).
- Coherencia: Cinzel/Inter, tarjetas `#15111a`, botones y marcos pintados de `assets/chrome`, retratos, emblemas e
  iconos reales del juego.

**Pendiente honesto:** guerrero y arquera siguen como silueta hasta que haya modelos. La maga es estática (pose A)
hasta que llegue `maga_anim.glb`; el código ya la busca primero. La música es un boceto sintetizado.
