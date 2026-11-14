# ⚔️ IntentoRPG

ARPG isométrico 3D estilo **Diablo**, hecho con [Three.js](https://threejs.org/) y JavaScript sin frameworks. No tiene paso de build: es HTML + módulos ES, con Three.js 0.160 cargado desde CDN. Se juega en **PC, con ratón y teclado**, es una PWA instalable y guarda la partida en el navegador. Todo el texto del juego está en español.

## 🎮 Cómo jugar

Los módulos ES no funcionan abriendo `index.html` como archivo: hay que servir la carpeta por HTTP.

```bash
# opción 1 (Node)
npm start                      # npx http-server -p 8080

# opción 2 (Python)
python3 -m http.server 8080
```

Abre `http://localhost:8080` en un navegador de escritorio. Para jugar no hace falta `npm install` (solo para las pruebas). La primera carga necesita conexión, porque Three.js viene de jsDelivr.

En la pantalla de inicio eliges clase, nombre y color de armadura, y si el héroe es **Hardcore** (la muerte borra su hueco de guardado). La casilla **Héroe de prueba** crea un héroe al nivel 100, con equipo legendario y la primera especialización ya montada, para probar el final del juego sin subir de nivel.

## 🕹️ Controles

| Acción | Por defecto |
|---|---|
| Mover | `W` `A` `S` `D` o las flechas |
| Apuntar | Ratón |
| Habilidad básica · principal | Clic izquierdo · clic derecho |
| Resto de la barra | `1` movilidad · `2` defensa, utilidad u otra principal · `3` insignia de la especialización · `4` definitiva |
| Acción (interactuar o atacar) | `Espacio` |
| Esquivar | `Mayús` |
| Poción de vida · de recurso | `Q` · `E` |
| Recoger botín | `F` |
| Mapa | `M` o `Tab` |
| Inventario · Habilidades · Personaje · Talentos | `I` o `B` · `T` · `C` · `N` |
| Tablero de glifos · Misiones · Colección · Guía de sistemas | `P` · `J` · `K` · `H` |
| Modo limpio del HUD | `Z` |
| Cerrar panel / Opciones | `Esc` |
| Ampliar la información en pantalla | `Alt` mantenido |

En **Opciones → Controles** se puede:

- Cambiar el esquema a **Clic para mover** (estilo Diablo II: el clic izquierdo mueve y ataca, el derecho lanza la principal).
- Reasignar cualquier tecla.
- Elegir si las habilidades de cargar y canalizar se **mantienen** pulsadas o se **alternan**.

Con un panel abierto la partida se pausa.

## 🧙 Clases, especializaciones y talentos

Hay tres clases. Cada una tiene su recurso, y cada especialización añade un **indicador de mecánica** propio en el HUD.

| Clase | Recurso | Especializaciones (indicador) |
|---|---|---|
| **Guerrero** | **Furia**: se gana golpeando y recibiendo daño, y se pierde fuera de combate | Berserker (Sed) · Guardián (Bastión) · Cruzado (Fervor) |
| **Maga** | **Maná**: reserva amplia que se regenera | Piromante (Calor) · Crionte (Escarcha) · Arcanista (Cargas) |
| **Arquera** | **Energía**: reserva pequeña que se regenera rápido | Tiradora Veloz (Impulso) · Francotiradora (Concentración) · Montaraz (Coto) |

Qué mide cada indicador:

- **Sed** (Berserker): se llena al perder vida y al desangrar enemigos; llena, da Sed Saciada.
- **Bastión** (Guardián): cargas por bloquear o plantarte, que reducen el daño recibido.
- **Fervor** (Cruzado): tres soles; con los tres, el siguiente martillo sale como Veredicto.
- **Calor** (Piromante): sube con cada golpe de fuego hasta la Ignición Total.
- **Escarcha** (Crionte): capas por enemigo, hasta congelarlo (a los jefes los deja Ateridos).
- **Cargas** (Arcanista): se acumulan y las gasta el Rayo.
- **Impulso** (Tiradora Veloz): sube acertando en movimiento hasta el Vendaval.
- **Concentración** (Francotiradora): sube quieta y baja al moverte, hasta la Calma Absoluta.
- **Coto** (Montaraz): cuenta tus trampas armadas y marca una Presa.

### Progresión (niveles 1 a 100)

Cada nivel da un punto de un solo sistema:

- **Niveles 2 a 20, atributos:** +5 puntos por nivel para Fuerza, Destreza, Vitalidad y Energía. Redistribuirlos cuesta oro.
- **Nivel 10, especialización:** eliges una de las tres de tu clase. Cambiarla es gratis fuera de combate y cada una conserva sus talentos.
- **Niveles 10 a 70, talentos:** se alternan los puntos del **árbol de especialización** (31) y del **árbol de clase** (34; los cuatro últimos llegan en los niveles 85, 90, 95 y 100).
- **Niveles 71 a 80, árbol héroe:** 10 puntos; exige haber gastado antes los 31 de especialización. Hay tres por clase, cada uno compartido por dos especializaciones:
  - Guerrero: Titán, Gladiador, Caudillo.
  - Maga: Cronomante, Invocadora, Escriba Rúnica.
  - Arquera: Errante del Viento, Carcaj Encantado, Halconera.
- **Niveles 81 a 100, tablero de glifos:** 16 puntos en un tablero de 9×9 propio de cada clase, con cuatro brazos (ofensiva, utilidad, sustento y defensa), zócalos de glifo y nodos legendarios. El poder de un glifo crece con su rango y con los nodos vecinos de su familia.

Talentos, forja y tablero se cambian **gratis fuera de combate** (5 s sin recibir daño, o en un campamento). El panel de talentos (`N`) tiene un botón **Recomendado** que monta una build completa (talentos, barra y forja), guarda configuraciones y exporta o importa un **código de build** para compartir.

## ⚔️ Habilidades y combate

- **Las habilidades se aprenden solas** al subir de nivel y suben de rango (hasta 5) con el nivel. No hay puntos de habilidad.
- **Barra de 6 ranuras**, una por categoría: básica, principal, movilidad, defensa o utilidad, insignia y definitiva. Se abren en los niveles 1, 2, 4, 6, 10 y 15; entre el 10 y el 15 entra el kit de tu especialización.
- **Forja** (libro de habilidades, `T`): cada habilidad tiene una mejora y dos variantes que cambian cómo se juega; eliges una.
- **Verbos:** además de pulsar y lanzar, hay habilidades de cargar y soltar, relanzar, combo, secuencia, postura, marcar, trampa, detonar y canalizar, cada una con su aviso en la barra y junto al cursor.
- **Soportes:** 12 gemas de soporte que caen del botín y se engarzan en las habilidades (un hueco en la básica y la definitiva, dos en el resto): Amplificado, Multiproyectil, Perforante, Encadenado, Eco…
- **Esquiva** con invulnerabilidad breve, y **ataques telegrafiados**: los golpes pesados y las mecánicas de jefe avisan con un círculo rojo.
- **Los enemigos avisan antes de pegar:** preparan el golpe cuerpo a cuerpo y, si te apartas a tiempo, fallan.
- **Quebranto:** a los jefes el control no los aturde; llena una barra que, al completarse, los deja Quebrantados (aturdidos y vulnerables) unos segundos.
- **Control con rendimientos decrecientes:** aturdir, congelar o empujar al mismo enemigo una y otra vez dura cada vez menos.
- **Sensación de golpe:** *hit-stop* según la fuerza del impacto, destello en el enemigo golpeado, sacudida de cámara y números de daño por elemento.

## 🌍 Mundo

- **Mundo abierto de cuatro zonas** encadenadas que se cruzan caminando: Cripta (nivel 1), Cavernas de Hielo (6), Infierno (11) y Abismo Estelar (16).
- **La Cripta es el hogar:** su campamento reúne curandero, mercader, encantadora, capitán de la guardia, domador de bestias, alijo, la Estatua del Mundo y el portal del Desafío Diario.
- **Bastiones** en las Cavernas de Hielo y el Infierno: al derrotar a su guardián se convierten en un campamento más.
- **Vida en cada zona:** entradas a mazmorras, reaparición gradual de enemigos, un **jefe de mundo** que defiende su territorio, obeliscos de evento, santuarios, tesoros custodiados, **Goblins del Tesoro** (tres tipos, cada uno con su forma de escapar) y **contratos de zona** con objetivos seguidos en vivo.
- **Mundo persistente por sesión:** cada zona se genera una vez por partida y conserva su trazado y lo explorado hasta que recargas la página.
- **Mazmorras procedurales infinitas** con dificultad creciente y cuatro biomas por profundidad: Cripta (pisos 1 a 5), Cavernas de Hielo (6 a 10), Infierno (11 a 15) y Abismo Estelar (16 en adelante). Tienen un jefe por piso, cofres (algunos son mímicos), santuarios, altares de pacto (más peligro a cambio de más recompensa) y un waypoint cada 5 pisos.
- **Refugio del Abismo:** un segundo pueblo que se desbloquea en el piso 16.
- **Encuentros con guion:** manadas con líder, salas-emboscada y tesoros custodiados.
- **Misiones** del Capitán de la Guardia y **Desafío Diario**: una mazmorra con la misma semilla para todos cada día, con tabla de tus últimas 14 partidas.
- **Eras:** cada semana cambia un mutador local (más daño, más experiencia, más hallazgo mágico…) y hay objetivos semanales con recompensa.
- **Minimapa** orientado a la cámara, **mapa** con niebla de guerra y **brújula** que señala al goblin o al jefe de mundo cuando están fuera de pantalla.

## 👹 Enemigos

- **Rarezas:** campeones y élites con auras visibles y modificadores con mecánica (Ardiente, Explosivo, Espinoso, Encarcelador, Vórtice, Escudado, Cadenas).
- **Arquetipos con contrajuego:** Nigromante (invoca esbirros), Acólito Sanador, Portaestandarte (escuda a sus aliados), Sembrador de Esporas (se divide al morir), Embestidor (carga en línea con aviso) y Francotirador del Vacío (disparo cargado de largo alcance).
- **Mecánicas:** lanzadores con abanico de proyectiles, telarañas y escarcha que ralentizan, auras que exaltan a los aliados y cobardes que huyen.
- **Jefes con mecánicas por bioma:** el Señor del Abismo invoca esbirros, el Rey Gélido congela con novas de hielo y el Avatar del Infierno deja charcos de fuego.
- **Línea de visión real:** no te detectan a través de los muros.

## 💎 Botín, objetos y crafteo

- **Rarezas:** Normal, Mágico, Raro, Legendario, Conjunto y Mítico, con afijos aleatorios y **afijos superiores ★** más fuertes. La rareza se marca con color y con glifo (✦◆★❖).
- **Identificación:** legendarios, conjuntos y reliquias caen sin identificar.
- **Poderes legendarios únicos** (Festín, Volátil, Vendaval, Viento, Furia, Avaricia) y **reliquias de jefe**.
- **Conjuntos:** tres sets de tres piezas (Senda del Lobo, Legado del Hechicero, Paso del Cazador) con bonus por llevar 2 y 3.
- **Inventario:** 32 casillas de mochila y 12 ranuras de equipo, con off-hand propio de cada clase (escudo, orbe o carcaj). Se arrastra y suelta entre mochila, equipo, cubo y alijo, y cada objeto se compara (▲▼) con el que llevas puesto.
- **Bolsa de materiales** aparte: gemas, runas, llaves de grieta, fragmentos y glifos no ocupan mochila.
- **Gemas y runas:** 6 gemas y 6 runas que se engarzan en objetos con hueco; las runas en el orden correcto forman **palabras rúnicas** (Filo, Bastión, Zancada, Tormenta, Coloso).
- **Cubo de transmutación:** tres objetos de la misma rareza dan uno superior pagando oro, y tres legendarios se reforjan en uno nuevo. Incluye un libro de recetas.
- **Encantadora:** reforja un afijo de un objeto por oro.
- **Mejora de objeto:** sube la calidad de una pieza por rangos, pagando oro.
- **Códice de Aspectos:** extrae el poder único de un legendario y grábalo en otra pieza.
- **Mercader** con mercancía que rota cada 5 minutos y **apuesta** de objetos sin identificar.
- **Amuletos de mochila (charms):** dan stats mientras estén en la bolsa, a cambio de espacio.
- **Stats secundarios:** vida y maná al golpear, reducción de enfriamiento (tope del 50 %), espinas y hallazgo mágico.
- **Filtro de botín:** oculta lo que quede por debajo de la rareza que elijas.
- **Alijo compartido:** 24 casillas comunes a todos tus personajes.
- **Compañero de utilidad** (lobo, halcón o familiar arcano): no combate; recoge botín y da un aura según su collar. Se adopta y mejora con el Domador de Bestias.

## 🏆 Endgame

- **Grietas:** los jefes profundos sueltan llaves; cada grieta trae varios modificadores y más botín, y completarla sube tu nivel de grieta.
- **Tormento:** dificultad seleccionable hasta el nivel 10 en la Estatua del Mundo; sube el reto y el botín.
- **Bendiciones permanentes:** ocho, en cuatro categorías (ofensiva, defensiva, celeridad y fortuna).
- **Jefe Pináculo:** reúne tres Fragmentos de Pináculo para invocar al Heraldo del Vacío, que suelta objetos Míticos.
- **Colección y bestiario**, y una **crónica** de la partida en la ficha del personaje.

## 🖥️ Interfaz, gráficos y sonido

- **HUD de PC** escalable (del 70 % al 150 %): barra de 6 ranuras con enfriamientos, indicador de la especialización, marco del objetivo con su barra de Quebranto, beneficios y perjuicios con cuenta atrás, registro de botín y micromenú. `Z` lo deja en modo limpio.
- **Guía de sistemas** (`H`) dentro del juego.
- **Post-procesado:** oclusión ambiental (GTAO), antialias SMAA, bloom, tone mapping ACES, viñeta con gradación de color por bioma, iluminación basada en imagen y sombras de contacto. El contorno estilizado marca al héroe y a los enemigos notables.
- **Calidad adaptativa** y preajustes de vídeo: si los FPS bajan, se reducen resolución y sombras.
- **Efectos:** motor de partículas propio y un kit de efectos de malla con shader (ondas, tajos, marcas en el suelo, haces, telegrafías). Hay un editor de partículas aparte en `/particulasmaker.html`.
- **Modelos:** los enemigos son procedurales y animados; el demonio usa ya un modelo 3D riggeado (`.glb`) con animaciones propias.
- **Sonido:** efectos sintetizados con WebAudio y música ambiental generativa por bioma, sin archivos de audio.
- **Accesibilidad:** movimiento reducido, texto grande y modo daltónico.

## 💾 Guardado

- **Tres huecos de personaje** con guardado automático en `localStorage`.
- **Formato versionado:** una partida guardada con una versión anterior se migra al cargarla.
- **Exportar e importar** la partida con un código, como copia de seguridad o para cambiar de equipo.
- **PWA:** instalable, y jugable sin conexión una vez cargada.

## 📁 Estructura

```
index.html            HUD, paneles y arranque (importmap de Three.js)
css/                  estilos: base, libro de habilidades, talentos, verbos y barras de mecánica
js/main.js            clase Game: render, cámara, bucle, mundo y combate
js/game-*.js          sistemas de Game por archivo (habilidades, talentos, endgame, eras, mundo)
js/entities.js        jugador, enemigos, proyectiles y mascota
js/combat-math.js     todas las fórmulas de combate
js/data.js, items.js  catálogos (clases, enemigos, zonas) y botín
js/skills-<clase>.js  habilidades de cada clase   (talents-, powers-, mech-: talentos, poderes, mecánica)
js/world.js, zones.js mazmorras, pueblos y mundo abierto
js/ui*.js             interfaz; hud-model.js y talents-view.js calculan, ui*.js pinta
js/save-schema.js     guardado versionado y migraciones
sw.js                 service worker (PWA sin conexión)
assets/               iconos, marcos, arte y modelos .glb
tests/                suites de simulación sin navegador y regresiones de balance
tools/                humo en Chrome, turno de pruebas y conversor de talentos
docs/                 diseño, contratos y maquetas
```

## 🧪 Pruebas

```bash
npm install                   # trae three, la única dependencia (de desarrollo)
npm test                      # todas las suites de tests/
node tests/<suite>.mjs        # una sola suite
npm run smoke                 # arranca el juego real en Chrome sin ventana (pide Chrome y Node 22 o superior)
```

Las suites simulan el juego sin navegador (sin DOM ni WebGL). Incluyen **regresiones de balance**: simulan la progresión del héroe contra enemigos escalados y fallan si el tiempo de matar, el aguante o el ritmo de subida se salen de los rangos de diseño, y lo mismo para el equilibrio del endgame y las tasas de botín.

## 📚 Documentación

- [`CLAUDE.md`](CLAUDE.md): guía de trabajo del repo (comandos, convenciones, arquitectura y patrones).
- [`MEMORIA.md`](MEMORIA.md): inventario detallado de lo que ya existe.
- [`INFORME_EXPANSION_2026.md`](INFORME_EXPANSION_2026.md): hoja de ruta de producto.
- [`docs/`](docs/): diseño y contratos de cada paso, y las maquetas aprobadas de la interfaz.

## 🤝 Contribuir

El trabajo va en una rama y llega a `main` por un pull request; nunca se empuja a `main` directamente. Antes de commitear, `npm test` tiene que quedar en verde.
