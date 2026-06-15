# ⚔️ IntentoRPG

ARPG isométrico 3D estilo **Diablo 2**, hecho con [Three.js](https://threejs.org/). Sin build, sin dependencias instaladas: HTML + módulos ES + Three.js desde CDN. Funciona en escritorio y **móvil** (joystick táctil y botones de acción).

## 🎮 Cómo jugar la demo

Necesitas servir los archivos por HTTP (los módulos ES no funcionan abriendo el archivo directamente):

```bash
# opción 1 (Node)
npx http-server -p 8080

# opción 2 (Python)
python3 -m http.server 8080
```

Abre `http://localhost:8080` en el navegador. En móvil, abre la IP de tu PC en la misma red, o publica el repo con **GitHub Pages** (Settings → Pages → rama → raíz) y juega desde cualquier dispositivo.

## ✨ Características

- **3 clases** con **ataque básico propio**: Guerrero (tajo amplio que golpea a varios), Maga (proyectil arcano a distancia) y Arquera (flecha de largo alcance)
- **Atributos RPG**: Fuerza, Destreza, Vitalidad y Energía (+5 puntos por nivel)
- **Árbol de habilidades**: 6 habilidades por clase en 3 tiers (activas, buffs y pasivas), +1 punto por nivel
- **Sinergias** estilo Diablo 2: invertir puntos en una habilidad potencia a otras de su rama
- **Soportes de habilidad 2.0** (estilo gemas de PoE): se aprenden del botín y se engarzan **hasta 2 por habilidad**, con efectos y contrapartidas (Amplificado, Multiproyectil, Perforante, Expansivo, Gélido, **Encadenado**, **Concentrado** +daño/−área, **Eco** que repite la habilidad, **Veneno/Sangrado** con daño por tiempo, **Sangre Fría** crítico contra congelados, **Sobrecarga**)
- **Biomas por profundidad**: Cripta (1-5), Cavernas de Hielo (6-10) e Infierno (11+), con paleta, decoración y enemigos propios (Yeti, Diablillo)
- **Pueblo** con curandero, mercader (tienda de pociones) y portal a la mazmorra
- **Mundo abierto (4 regiones)**: zonas abiertas (Cripta, Cavernas de Hielo, Infierno, Abismo Estelar; 120×120, terreno orgánico) desbloqueadas por nivel y viajables desde cualquier waypoint; el pueblo conecta con la Cripta por puertas que se cruzan caminando. Cada zona tiene entradas a mazmorras instanciadas escaladas a su bioma, **respawn gradual**, **jefe de mundo** con gran botín y **obeliscos de evento**; tap en el minimapa abre el **mapa descubierto** (niebla de guerra)
- **Mundo persistente por sesión** (estilo Diablo 2): cada región se genera una vez al empezar la partida y conserva su trazado y lo que llevas explorado hasta que recargas la página (nueva sesión)
- **Jefe de mundo con territorio**: ronda solo su zona de aparición; si lo alejas demasiado de su guarida, deja de perseguirte y vuelve a su sitio regenerándose
- **Minimapa orientado a la cámara**: girado para que el norte de tu cámara isométrica sea arriba en el minimapa
- **Mapa en vivo**: el mapa completo no detiene el juego — puedes seguir moviéndote y combatir mientras lo miras, y los enemigos descubiertos se mueven en tiempo real
- **Héroe personalizable**: ponle nombre y elige el color de su armadura al crear el personaje
- **Vida en el mundo abierto**: **Goblins del Tesoro** que huyen y sueltan un gran botín si los cazas antes de que escapen; **santuarios de campo** (incluido el de la Avaricia, que invoca un goblin); **tesoros custodiados** por élites; y **Contratos de zona** (estilo susurros) con objetivos seguidos en vivo (cazar enemigos/élites, saquear cofres, abatir al jefe o al goblin) que premian con oro, un legendario y una Llave de Grieta al completarlos
- **Goblins del Tesoro con mecánica de captura** (3 tipos): el Veloz se detiene a burlarse, el Cargado va lento soltando oro, el de Portal se teletransporta pero queda aturdido — todos alcanzables como melee o a distancia
- **Mecánicas de enemigos**: lanzadores con abanico de proyectiles, **CC telegrafiado** (telaraña/escarcha que ralentiza), auras de escarcha y de exaltación de aliados; los cobardes huyen a ráfagas y se cansan (ya no escapan eternamente)
- **Iconos de buff/efectos activos** en el HUD con cuenta atrás visual; tócalos para ver qué hacen y cuánto duran
- **Calidad de vida**: toca/clica fuera de un menú para cerrarlo, y compara objetos (▲▼) al tocarlos o pasar el ratón también en el inventario y el equipo
- **Mazmorras procedurales infinitas** con dificultad creciente, cofres, antorchas y un **jefe por piso**
- **Encuentros con guion**: manadas con líder campeón/élite cuyos esbirros heredan su rasgo, salas-emboscada con oleadas, tesoros custodiados y curva de densidad con respiros y picos; los brujos se teletransportan y las ratas huyen malheridas
- **Música ambiental generativa** por bioma (WebAudio, sin assets) con fanfarria al matar jefes
- **Jefes con mecánicas por bioma**: el Señor del Abismo invoca esbirros, el Rey Gélido congela con novas de hielo y el Avatar del Infierno deja charcos de fuego
- **Cubo de transmutación** (sumidero de oro): 3 objetos de la misma rareza → 1 superior pagando oro (escala con la rareza); 3 legendarios → reforjar uno nuevo (muy caro); si los 3 comparten ranura, el resultado es de esa ranura; recetas de gemas gratis
- **Monstruos con rareza** estilo Diablo 2: Campeones (azules) y Élites (dorados) con auras visibles y modificadores con mecánica (Ardiente, Explosivo, Espinoso, **Encarcelador**, **Vórtice**, **Escudado**, **Cadenas**…)
- **Arquetipos de enemigos** con telegrafía y contrajuego: **Nigromante** (invoca esbirros), **Acólito Sanador**, **Portaestandarte** (escudo a aliados), **Sembrador de Esporas** (se divide al morir), **Embestidor** (carga en línea con aviso) y **Francotirador del Vacío** (disparo cargado de largo alcance)
- **Game-feel / efectos de impacto**: *hit-stop* escalado con la fuerza del golpe, destello blanco en los enemigos golpeados, sacudida de cámara basada en "trauma" y estallidos al impactar los proyectiles
- **Partículas por habilidad y enemigo**: motor propio de partículas (`js/particles.js`) con efectos temáticos por elemento para las habilidades de las 3 clases (fuego/hielo/rayo/físico/arcano/viento) y para las mecánicas y muertes de los enemigos; los proyectiles dejan estela. Hay un **editor de partículas** independiente en `/particulasmaker.html` para diseñar y exportar presets
- **Modelos de enemigos con animación**: siluetas con cabeza, brazos, piernas y cola; animación procedural de caminar (oscilación de piernas/brazos), respiración en reposo y arremetida al atacar; los limos saltan y aplastan, los cofres mímicos castañean
- **Post-procesado (estética)**: bloom selectivo sobre lo emisivo, tone mapping ACES, viñeta y **gradación de color por bioma** (frío/cálido/violeta); **partículas ambientales** (polvo, nieve, brasas, vacío) y antorchas que titilan — todo desactivable y con calidad adaptativa
- **Brújula de objetivos**: cuando aparece un **Goblin del Tesoro** o un **Jefe de Mundo** fuera de pantalla, una flecha discreta en el borde te señala dónde está (se desvanece al tenerlo a la vista)
- **Feedback de momentos**: destellos al subir de nivel y al caer un legendario/mítico, cooldowns radiales y coste de maná en las habilidades, y números de daño que no saturan
- **Build a la vista**: barra de navegación Personaje ↔ Habilidades ↔ Paragon/Glifos, con avisos de puntos sin gastar y glifos sin engarzar; el inventario se abre también con **B**
- **Esquiva** con invulnerabilidad breve (Shift / botón 💨) y **ataques telegrafiados**: los golpes pesados y las mecánicas de jefe avisan con un círculo rojo
- **Santuarios** en las mazmorras: bendiciones de XP, furia, vida y oro… y alguno maldito
- **Loot estilo Diablo**: rarezas Normal / Mágico / Raro / Legendario con afijos aleatorios, con tasas equilibradas (los legendarios son un acontecimiento, no rutina)
- **Conjuntos (sets)**: 3 sets verdes de 3 piezas (Senda del Lobo, Legado del Hechicero, Paso del Cazador) con bonus por llevar 2 y 3 piezas equipadas
- **Mercader con stock rotativo**: la mercancía cambia cada 5 minutos (con temporizador) y mejora con tu nivel
- **Apuesta del mercader**: compra objetos sin identificar — mínimo mágico, con suerte legendario
- **Waypoints**: cada 5 pisos hay un waypoint que desbloquea viaje rápido desde el pueblo (y entre pisos)
- **Cofres mímico**: algunos cofres muerden... y sueltan mejor botín
- **Misiones**: el Capitán de la Guardia del pueblo ofrece misiones (matar monstruos/élites/jefes, abrir cofres) con oro, XP y objetos raros de recompensa
- **Desafío Diario**: portal dorado con una mazmorra de semilla fija — el mismo trazado para todos cada día, con botín legendario al derrotar a su jefe (una vez al día)
- **Modo Hardcore** opcional al crear personaje: la muerte es permanente y borra el guardado
- **Lobo de caza**: mascota comprable al mercader que te sigue y ataca a tus enemigos
- **Crónica de partida**: monstruos, jefes, mímicos, legendarios, misiones, diarias, oro, muertes, piso máximo y tiempo jugado
- **Inventario estilo Diablo IV**: en escritorio, equipo y mochila en **dos columnas a la vez** (sin scroll); 32 casillas + **12 ranuras de equipo** en silueta anatómica; **armas y off-hands acordes a tu clase** (escudo para el Guerrero, orbe/foco para la Maga, carcaj para la Arquera). Se abre con `I` o `B`
- **Bolsa de materiales** aparte (pestaña propia): gemas, runas, llaves de grieta, fragmentos y glifos no ocupan espacio en la mochila
- **Arrastrar y soltar**: mueve objetos entre mochila, equipo, cubo y alijo; arrastra una pieza a su ranura para equiparla o una gema/runa sobre un objeto con engarce para incrustarla (Pointer Events: funciona en ratón y táctil)
- **Stats secundarios** estilo Diablo 3/4: Vida al golpear, Maná al golpear, Reducción de enfriamiento (tope 50%) y Espinas
- **Gemas y engarces**: 6 gemas (Rubí, Zafiro, Amatista, Esmeralda, Topacio, Diamante) que se engarzan en objetos con ranura
- **Runas y palabras rúnicas**: 6 runas que, engarzadas en el orden correcto, forman palabras con bonus especiales (Filo, Bastión, Zancada, Tormenta, Coloso)
- **Libro de recetas** (📖 junto al cubo): todas las recetas del cubo y la tabla de palabras rúnicas
- **Abrir engarce** (receta cara): 1 objeto + 2 gemas → +1 hueco, hasta el tope de cada pieza
- **Encantadora** en el pueblo: reforja un afijo de un objeto por oro (precio creciente)
- **Re-spec**: redistribuye atributos y habilidades pagando oro
- **Tablero de Paragon** (estilo Diablo 4): tras el nivel 20, cada nivel da un punto que se gasta en un **tablero de nodos conectados** (9×9) — nodos menores, mágicos, raros y **legendarios (★) que otorgan poderes únicos**; solo activas nodos que conecten con otros ya activos, y puedes reespecializar por oro
- **Glifos del tablero**: nodos de **engarce (◇)** donde colocas **glifos** (caen en grietas y del Pináculo); su poder escala con el **rango del glifo** y con los **nodos activos adyacentes** al engarce (sinergia de colocación), y suben de rango al completar grietas
- **Poderes legendarios únicos** y **reliquias de jefe**: legendarios que cambian cómo juegas (Festín, Volátil, Vendaval, Viento, Furia, Avaricia); los jefes sueltan reliquias temáticas
- **Tormento (dificultad seleccionable)**: en la **Estatua del Mundo** del pueblo eliges el nivel de Tormento (hasta 10), que sube la dificultad y el botín (rareza y cantidad); se desbloquea empujando grietas y descendiendo en las mazmorras
- **Códice de Aspectos**: extrae el poder único de un legendario al Códice y **grábalo en otra pieza** por oro (estilo Diablo 4) — define tu build sin depender del azar
- **Bendiciones permanentes** (estilo Last Epoch): cada grieta completada (corrupción) te ofrece elegir 1 de 3 bendiciones; equipas una por categoría (Ofensiva, Defensiva, Celeridad, Fortuna) y su poder escala con el nivel de grieta — un objetivo de empuje infinito que mejora tu personaje para siempre
- **Jefe Pináculo (uber)**: los jefes de mundo y las grietas sueltan **Fragmentos de Pináculo**; reúne 3 y ofréndalos en la Estatua del Mundo para invocar al **Heraldo del Vacío**, el reto final, que suelta un objeto **MÍTICO** — un legendario con **doble poder único**
- **Identificación**: legendarios, conjuntos y reliquias caen "sin identificar" — el momento de revelarlos
- **Hallazgo mágico**: afijo, nodo Paragon y santuario que aumentan la rareza y cantidad del botín
- **Pactos de piso**: un altar opcional ofrece más peligro a cambio de más recompensa (botín/MF/XP)
- **Amuletos de mochila (charms)**: dan stats mientras estén en la bolsa, a coste de espacio
- **Colección y bestiario**: registro de conjuntos, poderes legendarios y enemigos derrotados
- **Acto 2 — Abismo Estelar (pisos 16+)**: bioma del vacío con Espectros, Caballeros del Abismo, el jefe Corazón del Vacío y el **Refugio del Abismo**, un segundo pueblo que se desbloquea al llegar
- **Alijo compartido** en el pueblo: 24 casillas comunes a todos tus personajes (sobrevive al Hardcore)
- **Tabla del Desafío Diario**: tus últimas 14 runs con clase, piso y tiempo, en el panel de personaje
- **Pociones** de vida y maná, oro, barra de experiencia, orbes de vida/maná, minimapa
- **3 huecos de personaje** con guardado automático local, y **exportar/importar partida** por código (copia de seguridad o cambio de dispositivo)
- Los enemigos tienen **línea de visión real**: no te detectan a través de los muros
- **PWA instalable**: añádelo a la pantalla de inicio del móvil y juega incluso sin conexión
- **Calidad adaptativa**: si los FPS bajan, reduce resolución y sombras automáticamente (desactivable en Opciones)
- **Filtro de loot**: en Opciones, oculta el botín por debajo de la rareza que elijas (limpia la pantalla en niveles altos)
- **Mejora de objeto (masterworking)** y **afijos superiores ★**: sube la calidad de una pieza en rangos por oro (+% a sus stats) y caza afijos 1.5× más fuertes
- **Grietas (endgame)**: los jefes profundos sueltan Llaves de Grieta; ábrelas para mazmorras con varios modificadores y botín aumentado, y al completarlas sube tu nivel de grieta y obtienes una llave superior (empuje infinito)
- **Tooltips al pasar el ratón** (escritorio): ver stats y comparación ▲▼ de cualquier objeto sin abrir la ficha
- **Accesibilidad**: movimiento reducido, texto grande y modo daltónico (colores de rareza seguros); la rareza se marca también con glifo (✦◆★❖), no solo por color
- **UI/UX renovada**: paneles de NPCs (mercader con secciones y temporizador, misiones con progreso, alijo con contador, pactos riesgo/recompensa), inventario (EQUIPO/CUBO/MOCHILA claros, ranuras con icono guía, indicadores táctiles) y hoja de personaje (atributos en tarjetas, stats derivadas agrupadas en ofensivas/defensivas/utilidad) rediseñados para móvil
- Efectos de sonido sintetizados con WebAudio, números de daño flotantes, críticos

## 🕹️ Controles

| Acción | Escritorio | Móvil |
|---|---|---|
| Mover | Clic en el suelo o WASD | Joystick (mitad izquierda; el tap no mueve) |
| Atacar / Interactuar | Clic en el enemigo o `Espacio` | Botón de acción ⚔️ |
| Esquivar | `Shift` | Botón 💨 |
| Habilidades | `1` – `4` | Botones de habilidad |
| Poción vida / maná | `Q` / `E` | Botones 🧪 / 🔷 |
| Inventario / Habilidades / Personaje | `I` / `T` / `C` | Botones del menú |
| Recoger objeto | Etiqueta o tecla `F` | Etiqueta o botón 🖐️ |

El botón de acción es contextual: junto a un portal, NPC, cofre, waypoint o alijo cambia de icono y sirve para interactuar (los portales no se activan al pisarlos). Si no hay nada que usar, ataca al enemigo más cercano — **puedes atacar mientras te mueves** con el joystick. El oro, las pociones, las gemas y las runas se recogen automáticamente al pasar por encima — y el lobo de caza va a buscarlos por ti. En Opciones ⚙️ hay brillo, sonido, música, vibración, sacudida de cámara y copia de seguridad de la partida.

## 📁 Estructura

```
index.html      — HUD, paneles y arranque
css/style.css   — estilos responsive
js/data.js      — clases, habilidades, enemigos y constantes
js/items.js     — generación de loot, rarezas, afijos, gemas y runas
js/world.js     — pueblos, refugio y mazmorras procedurales
js/entities.js  — jugador, enemigos, mascota y proyectiles
js/ui.js        — HUD, inventario, árbol de habilidades, minimapa
js/economy.js   — tienda, cubo, encantadora, re-spec y paragon
js/input.js     — ratón, teclado y joystick táctil
js/sfx.js       — sintetizador de efectos (WebAudio)
js/main.js      — bucle del juego, mundo y combate
sw.js           — service worker (PWA offline)
tests/          — suites de simulación + regresión de balance
```

## 🧪 Pruebas

```bash
npm install
npm test
```

Incluye una **regresión de balance**: simula la progresión (héroe con equipo acorde a cada piso vs enemigos escalados) y falla si el tiempo de matar, los golpes que aguantas o el ritmo de subida salen de los rangos de diseño. También una **regresión de equilibrio del endgame** que verifica el TTK por nivel de Tormento, que los conjuntos y el legendario de jefe no se vuelvan rutina con Hallazgo Mágico, y que el poder del Paragon+glifos no eclipse al equipo.
