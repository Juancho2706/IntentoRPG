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

- **3 clases** con stats propios: Guerrero (melee), Maga (hechizos) y Arquera (a distancia)
- **Atributos RPG**: Fuerza, Destreza, Vitalidad y Energía (+5 puntos por nivel)
- **Árbol de habilidades**: 6 habilidades por clase en 3 tiers (activas, buffs y pasivas), +1 punto por nivel
- **Sinergias** estilo Diablo 2: invertir puntos en una habilidad potencia a otras de su rama
- **Biomas por profundidad**: Cripta (1-5), Cavernas de Hielo (6-10) e Infierno (11+), con paleta, decoración y enemigos propios (Yeti, Diablillo)
- **Pueblo** con curandero, mercader (tienda de pociones) y portal a la mazmorra
- **Mazmorras procedurales infinitas** con dificultad creciente, cofres, antorchas y un **jefe por piso**
- **Encuentros con guion**: manadas con líder campeón/élite cuyos esbirros heredan su rasgo, salas-emboscada con oleadas, tesoros custodiados y curva de densidad con respiros y picos; los brujos se teletransportan y las ratas huyen malheridas
- **Música ambiental generativa** por bioma (WebAudio, sin assets) con fanfarria al matar jefes
- **Jefes con mecánicas por bioma**: el Señor del Abismo invoca esbirros, el Rey Gélido congela con novas de hielo y el Avatar del Infierno deja charcos de fuego
- **Cubo de transmutación** con recetas: 3 objetos de la misma rareza → 1 superior · 3 gemas iguales → gema superior · 3 gemas distintas → gema aleatoria
- **Monstruos con rareza** estilo Diablo 2: Campeones (azules) y Élites (dorados) con auras visibles y modificadores con mecánica (Ardiente quema de cerca, Explosivo detona al morir, Espinoso refleja daño…)
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
- **Inventario** de 32 casillas + **12 ranuras de equipo** estilo Diablo (arma, escudo, casco, hombreras, armadura, guantes, cinturón, pantalones, botas, amuleto y 2 anillos) en silueta anatómica
- **Gemas y engarces**: 6 gemas (Rubí, Zafiro, Amatista, Esmeralda, Topacio, Diamante) que se engarzan en objetos con ranura
- **Runas y palabras rúnicas**: 6 runas que, engarzadas en el orden correcto, forman palabras con bonus especiales (Filo, Bastión, Zancada, Tormenta, Coloso)
- **Encantadora** en el pueblo: reforja un afijo de un objeto por oro (precio creciente)
- **Re-spec**: redistribuye atributos y habilidades pagando oro
- **Paragon**: tras el nivel 20, cada nivel da puntos para mejoras infinitas (daño, vida, armadura, vel. de ataque)
- **Acto 2 — Abismo Estelar (pisos 16+)**: bioma del vacío con Espectros, Caballeros del Abismo, el jefe Corazón del Vacío y el **Refugio del Abismo**, un segundo pueblo que se desbloquea al llegar
- **Alijo compartido** en el pueblo: 24 casillas comunes a todos tus personajes (sobrevive al Hardcore)
- **Tabla del Desafío Diario**: tus últimas 14 runs con clase, piso y tiempo, en el panel de personaje
- **Pociones** de vida y maná, oro, barra de experiencia, orbes de vida/maná, minimapa
- **3 huecos de personaje** con guardado automático local, y **exportar/importar partida** por código (copia de seguridad o cambio de dispositivo)
- Los enemigos tienen **línea de visión real**: no te detectan a través de los muros
- **PWA instalable**: añádelo a la pantalla de inicio del móvil y juega incluso sin conexión
- **Calidad adaptativa**: si los FPS bajan, reduce resolución y sombras automáticamente (desactivable en Opciones)
- Efectos de sonido sintetizados con WebAudio, números de daño flotantes, críticos

## 🕹️ Controles

| Acción | Escritorio | Móvil |
|---|---|---|
| Mover | Clic en el suelo o WASD | Joystick (mitad izquierda; el tap no mueve) |
| Atacar / Interactuar | Clic en el enemigo o `Espacio` | Botón de acción ⚔️ |

El botón de acción es contextual: junto a un portal, NPC, cofre, waypoint o alijo cambia de icono y sirve para interactuar (los portales ya no se activan al pisarlos). En Opciones ⚙️ hay control de brillo, sonido, vibración y sacudida de cámara.
| Habilidades | `1` – `4` | Botones de habilidad |
| Poción vida / maná | `Q` / `E` | Botones 🧪 / 🔷 |
| Inventario / Habilidades / Personaje | `I` / `T` / `C` | Botones del menú |
| Recoger objeto | Clic en su etiqueta | Toca su etiqueta |

El oro y las pociones se recogen automáticamente al pasar por encima.

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

Incluye una **regresión de balance**: simula la progresión (héroe con equipo acorde a cada piso vs enemigos escalados) y falla si el tiempo de matar, los golpes que aguantas o el ritmo de subida salen de los rangos de diseño.
