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
- **Jefes con mecánicas por bioma**: el Señor del Abismo invoca esbirros, el Rey Gélido congela con novas de hielo y el Avatar del Infierno deja charcos de fuego
- **Cubo de transmutación** en el inventario: 3 objetos de la misma rareza → 1 de la rareza superior
- **Monstruos con rareza** estilo Diablo 2: Campeones (azules) y Élites (dorados, con modificadores como Veloz, Brutal o Colosal) con mejor botín
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
- **Inventario** de 32 casillas + 6 huecos de equipo (arma, casco, armadura, botas, anillo, amuleto), vender y tirar objetos
- **Pociones** de vida y maná, oro, barra de experiencia, orbes de vida/maná, minimapa
- **Guardado automático** en localStorage (continúa donde lo dejaste)
- Efectos de sonido sintetizados con WebAudio, números de daño flotantes, críticos

## 🕹️ Controles

| Acción | Escritorio | Móvil |
|---|---|---|
| Mover | Clic en el suelo o WASD | Joystick (mitad izquierda; el tap no mueve) |
| Atacar | Clic en el enemigo o `Espacio` | Botón ⚔️ |
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
js/items.js     — generación de loot, rarezas y afijos
js/world.js     — pueblo y mazmorras procedurales
js/entities.js  — jugador, enemigos y proyectiles
js/ui.js        — HUD, inventario, árbol de habilidades, minimapa
js/main.js      — bucle del juego, entrada, combate y guardado
```
