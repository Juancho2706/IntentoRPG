# Paso 2g: coherencia de la Maga, v3 (talentos estilo WoW: clase · Paragon · Piromante), documento de diseño

> Estado: **diseño v3**, sin código del juego. Fecha: 2026-10-20. Alcance: la **Maga Piromante completa**: árbol de clase, árbol del Piromante, Paragon (árboles héroe y tablero de glifos) y ritmo de puntos hasta el **nivel 100**. Crionte y Arcanista quedan esbozados (Anexo A.5).
> Mockup: `docs/mockups/skills-ux.html` (clase Maga; vista Talentos con `N` o `&view=talents`). Pasó **tres rondas de refutación** con capturas y cuadros de animación (§15).
> **Fuente única de datos:** el bloque `TALENTS_V2` / `BUILDS_V2` / `t3earnedAt` del mockup. Las tablas de §3, §4, §5, §6 y §7 se **generan** desde ese bloque.
> Historia: la v1 (`993cefc`) fue rechazada; la v2 (`b962487`) iba «por buen camino». La v3 aplica las respuestas del dueño (§0).

## 0. Historial

| Versión | Qué era | Qué dijo el dueño |
|---|---|---|
| v1 | Dos árboles pequeños de pasivas | Rechazada: no se parecía a WoW y las elecciones no pesaban |
| v2 | Tres columnas (clase · Paragon · Piromante), 31/13/31 puntos al Nv53, finales potentes, arquetipos, híbrida | «Vamos por buen camino», con 6 cambios |
| **v3** | Esta versión | — |

**Respuestas del dueño y cómo se aplican en la v3:**

| # | Pedido | Cambio en la v3 |
|---|---|---|
| 1 | **Nivel máximo 100.** Ningún árbol se puede completar; el Paragon tampoco | Ritmo nuevo (§3.1): clase 34 de 53 rangos (64 %), Piromante 31 de 59 (53 %), Paragon 11 de 13 nodos (85 %), tablero de glifos 16 de 81 casillas (20 %). Puertas y finales ajustados a ese ritmo (§3.3) |
| 2 | La especialización se elige al **nivel 10** | Sin cambio en el kit; el calendario de puntos empieza al 10 (especialización) y al 11 (clase). Revisado en §3.2 |
| 3 | **Textos claros** con números, sin jerga | Reescritos los 85 nodos y las 9 habilidades del Piromante. Reglas en §9.1 |
| 4 | **Forma por tipo:** círculo = pasivo, cuadrado = activo, hexágono = elección | Aplicado en árboles, leyenda, tooltip, flotante A/B y libro (§9.2). Sí hay nodos que conceden habilidades: son opciones cuadradas dentro de un hexágono |
| 5 | Híbrida a ~8–9 % | Aceptado (§6.5) |
| 6 | Glifos y Paragon: decide tú | El tablero de glifos queda **después** del árbol héroe: 16 puntos del 81 al 100 (§7.4) |
| 7 | **Paragon en gris** hasta tener la especialización al máximo | Se abre al gastar el **último** punto de especialización (Nv70). Estado gris con candado, «Gasta tus 31 puntos de especialización (X/31)» y avance (§7.1). Revelación nueva (§10) |
| 8 | Árboles héroe **de la clase**, no de un elemento | Fuera Señora del Sol y Escarcha Ardiente. Entran **Cronomante** (tiempo), **Invocadora** (constructos de maná) y **Escriba Rúnica** (esbozo). Funcionan con cualquier elemento (§7) |

## 1. Resumen (15 líneas)

1. Nivel máximo **100**. Un punto por nivel desde el 10: especialización en los pares 10–70, clase en los impares 11–69 y en 85/90/95/100, Paragon 71–80 y tablero de glifos 81–100.
2. **Nada se completa:** clase 34 de 53 rangos (64 %), Piromante 31 de 59 (53 %), árbol héroe 11 de 13 nodos (85 %), tablero 16 de 81 (20 %).
3. Puertas: clase 8 → fila 4 y **24** → fila 7; Piromante 8 → fila 4, 20 → fila 7 y 25 → ápice.
4. Un final de clase al máximo cuesta **30** (Nv69); dos al máximo, 36: imposibles. Un final del Piromante cuesta 26 (Nv60) y el ápice completo 30 (Nv68).
5. El **Paragon está en gris** hasta que ganas y gastas los 31 puntos de especialización (Nv70). Al gastarlo se abre con su **nodo clave gratis**.
6. Tres **árboles héroe de la clase**: Cronomante (Piromante y Arcanista), Invocadora (Piromante y Crionte) y Escriba Rúnica (Crionte y Arcanista, esbozo).
7. Cronomante: tus golpes ponen una **Marca del Tiempo** que repite el 30 % del daño. Invocadora: un **Familiar** dispara con el elemento de tu último hechizo.
8. **Forma por tipo:** círculo = pasivo, cuadrado = activo, hexágono = elección A/B. Las opciones que conceden una habilidad se ven cuadradas y con la marca HABILIDAD.
9. Cinco habilidades salen de talentos (todas en la ranura `2`): Bloque de Hielo, Inversión del Tiempo y Contrahechizo (clase), y Detener el Tiempo y Llamar Constructo (Paragon).
10. **Textos nuevos**: verbo + efecto + número, sin jerga («Quebranto» en vez de *stagger*, «contra jefes / contra grupos» en vez de UNI / ÁREA×5).
11. Árbol de clase con tres finales: Bastión Arcano (defensa), Archimaga (copia cada 4.ª gastadora) y Paso del Vacío (Parpadeo ofensivo).
12. Piromante con tres arquetipos (Brasa, Cataclismo, Ignición), cada uno con su elección definitoria y su final; nodos híbridos y una build híbrida sin final a ~8–9 % de la mejor.
13. Cuatro builds de ejemplo a Nv100 con el orden de compra nivel a nivel y la rotación (§6).
14. Motion: el último punto de especialización dispara la **revelación del Paragon** (contador que late, barrido de luz, candado que se abre, velo gris que se funde, árbol que sube).
15. Iconos nuevos para Codex listados en §7.5. Migración v5 → v6 en §11.

---

## 2. Investigación (consultada el 2026-10-20)

Se suma a la de la v1 (Anexo A.1). Varias fuentes de Midnight son de la alfa de 2025; lo no confirmado va marcado.

| Fuente (fecha) | Qué dice | Qué tomamos |
|---|---|---|
| [Blizzard vía warcraft-secrets (2022-06-03)](https://warcraft-secrets.com/?p=17425) | Dragonflight: 31 puntos de clase + 30 de especialización al Nv70, alternando desde el Nv10/11. Nodos de **elección octogonales**. Puertas de ejemplo: **8 puntos → fila 5, 20 → fila 8**. Una flecha exige **al menos un** prerrequisito comprado entero | Presupuesto 31/31, octógonos, puertas 8 / 20–22 y «cualquiera de los requisitos al máximo» |
| [Blizzard: «Let Your New Talents Shine»](https://worldofwarcraft.blizzard.com/en-us/news/23865972/let-your-new-talents-shine-in-dragonflight) (sin año en la página) | Árboles separados con sus puntos arriba; el ratón muestra la descripción; la búsqueda resalta talentos relacionados; clic derecho desaprende en cascada; **loadouts** con desplegable y **Starter Build**; **Import / Share** con un código | Cabecera «Gastados X / Y», resaltado por habilidad, clic derecho, Configuración + Recomendado + Código |
| [Warcraft Tavern: talentos héroe (2024-08-14)](https://www.warcrafttavern.com/wow/news/hero-talents-preview-for-the-war-within-2/) | TWW: **talentos héroe** al Nv71–80, ~11 nodos, 3–4 elecciones, nodo clave arriba y **capstone**. **3 árboles por clase, cada especialización elige entre 2 y cada árbol lo comparten 2**. Mago: Frostfire, Spellslinger, Sunfury | La columna **Paragon**: 2 árboles por especialización, compartidos, con clave, 3 elecciones y capstone (13 nodos) |
| [Warcraft Tavern: Apex en Midnight (2025-10-02)](https://www.warcrafttavern.com/wow/news/apex-talents-talent-tree-changes-coming-in-world-of-warcraft-midnight/) · [Icy Veins: Midnight](https://www.icy-veins.com/wow/midnight-expansion-guide) | Midnight suma 3 puntos de clase, 3 de héroe y 4 de especialización. El último nodo de clase sube su puerta de **20 a 23**. Los **Apex** (4 puntos) van bajo el árbol de especialización y tratan su fantasía central | Ápice de **4 rangos** bajo el Piromante (Corazón del Sol) y puerta de clase alta (22) para que el final cueste |
| [Wowhead: notas de la alfa de Midnight (2025-10)](https://www.wowhead.com/ptr/news/midnight-alpha-development-notes-378688) | Poda de nodos de poco impacto y de «exceso de botones y auras» | Sin relleno: cada nodo es «número» que se nota o «mecánica» |
| [Wowhead: Paladín en Midnight](https://www.wowhead.com/it/news/cooldown-and-ability-tuning-ui-issues-and-raid-viability-paladin-must-haves-for-379877) · [foro EU: puntos sobrantes](https://eu.forums.blizzard.com/en/wow/t/the-difference-in-leftover-talents/593575) | **Críticas:** nodos obligatorios, builds casi idénticas, «puntos sobrantes» muy desiguales entre especializaciones (6 frente a 18) | Presupuesto calculado para que haya **1–3 puntos de margen** en cada build y varios caminos legales |
| [Retrospectiva del Mago Arcano en Midnight (2026-05-25)](https://seramate.com/news/2026/05/25/arcane-mage-midnight-retrospective-1f158630) | **Crítica:** nodos sin salida y talentos de una especialización en el árbol de clase | El árbol de clase **no nombra** habilidades de especialización (regla G1) |
| [Foro US: Armas en Midnight](https://us.forums.blizzard.com/en/wow/t/my-midnight-arms-feedback/2187564/1) · [foro: talentos de Midnight](https://us.forums.blizzard.com/en/wow/t/midnight-talents/2165999) | **Crítica:** una opción de elección que domina a la otra y cuesta menos. Blizzard quiere «builds más débiles, pero ninguna rota» (cita de segunda mano) | Cada elección lleva su «gana en» y se prueba en el banco por escenario (G8) |
| [Foro US: formato del código de build](https://us.forums.blizzard.com/en/wow/t/talent-build-string-sharing-docs/1404862) · [Wowhead: calculadora](https://www.wowhead.com/ptr-2/help=talent-calculator) | El código no es base64 estándar; Wowhead actualiza la URL y tiene Link / Load / Export | Código **versionado** `IRPG2-maga-piromante-…` que avisa si la build es de otra versión |
| [Icy Veins: Brujo Destrucción (2026-03)](https://icy-veins.com/wow/destruction-warlock-pve-dps-spec-builds-talents) | En Midnight se cambian puntos gratis fuera de combate | Cambiar es **gratis fuera de combate** (como hoy) |
| [d4guides: Lord of Hatred (2026-04)](https://d4guides.gg/en/guides/diablo-4-lord-of-hatred-overview) · [kami-labs (2026-04)](https://kami-labs.fr/en/diablo-4/diablo-4-lord-of-hatred-embargo-presse-saison-13-en/) | D4: el Paragon (tableros + glifos) empieza tras el nivel máximo; los nodos aditivos se reducen a la mitad (cifra por verificar) | El **tablero de glifos sigue**, pero después del árbol héroe y sin poderes en los nodos legendarios (§7.4) |

**Lagunas.** No encontré los totales exactos de puntos ni de nodos de Midnight, ni ninguna referencia de animaciones al aprender un nodo en WoW: el motion de §10 es diseño propio.

**Lecciones aplicadas.** Presupuesto visible por árbol; puertas por puntos; pocas elecciones y cada una con habilidad concreta; nada de relleno; árbol héroe con clave, elecciones y capstone; clic derecho que desaprende; loadouts con nombre y código; resaltado de nodos relacionados.

---

## 3. Ritmo de puntos, puertas y presupuesto (nivel 1–100)

### 3.1 Reparto de puntos por nivel

Un punto por nivel desde el 10. Cada nivel da **una** decisión, siempre en un solo sistema.

| Nivel | Clase | Piromante | Paragon | Tablero de glifos | Qué pasa |
|---|---|---|---|---|---|
| 1–9 | 0 / 34 | 0 / 31 | 0 / 10 | 0 / 16 | Kit base, sin talentos |
| 10 | 0 / 34 | 1 / 31 | 0 / 10 | 0 / 16 | Eliges especialización: Ignición gratis y 1.er punto de especialización |
| 11 | 1 / 34 | 1 / 31 | 0 / 10 | 0 / 16 | 1.er punto de clase |
| 24–25 | 8 / 34 | 8 / 31 | 0 / 10 | 0 / 16 | Se abre la fila 4 de cada árbol (8 puntos) |
| 48 | 19 / 34 | 20 / 31 | 0 / 10 | 0 / 16 | Fila 7 del Piromante (20 puntos) |
| 57 | 24 / 34 | 24 / 31 | 0 / 10 | 0 / 16 | Fila 7 de clase (24 puntos) |
| 58 | 24 / 34 | 25 / 31 | 0 / 10 | 0 / 16 | Ápice del Piromante (25 puntos) |
| 60 | 25 / 34 | 26 / 31 | 0 / 10 | 0 / 16 | Final del Piromante al máximo (26) |
| 68 | 29 / 34 | 30 / 31 | 0 / 10 | 0 / 16 | Ápice completo (30) |
| 69 | 30 / 34 | 30 / 31 | 0 / 10 | 0 / 16 | Final de clase al máximo (30) |
| 70 | 30 / 34 | 31 / 31 | 0 / 10 | 0 / 16 | ÚLTIMO punto de especialización (31). Al gastarlo se abre el Paragon con su nodo clave |
| 71–80 | 30 / 34 | 31 / 31 | 10 / 10 | 0 / 16 | Paragon: 1 punto por nivel |
| 81–100 | 34 / 34 | 31 / 31 | 10 / 10 | 16 / 16 | Tablero de glifos; los niveles 85, 90, 95 y 100 dan un punto de clase |

| Sistema | Puntos a Nv100 | Tamaño | Alcanzas | Qué te falta siempre |
|---|---|---|---|---|
| Clase | **34** | 30 nodos · 53 rangos | **64 %** | Dos de las tres ramas finales y la mitad de las elecciones de los costados |
| Piromante | **31** | 29 nodos · 59 rangos | **53 %** | Dos de los tres finales y la mayoría de los nodos de los otros arquetipos |
| Paragon (árbol héroe) | **1 gratis + 10** | 13 nodos | **85 %** | 2 nodos de 13, y el otro árbol héroe entero |
| Tablero de glifos | **16** | 81 casillas | **20 %** | Un nodo legendario y la mitad de los zócalos (§7.4) |

**Por qué se sienten como decisiones.**
- **Ningún árbol se llena**, ni siquiera al 100: cada punto que pones en un sitio es un punto que no pones en otro.
- **Puntos escasos en el momento justo:** al Nv69 la clase tiene exactamente 30, lo que cuesta **un** final con nada de margen. Los 4 puntos tardíos (85–100) son el margen que se elige al final.
- **La especialización termina primero** (Nv70) y abre el Paragon: es una meta clara a mitad de camino y obliga a «cerrar» la build de especialización antes de pasar a la identidad del Paragon.
- **Un solo sistema por nivel:** el jugador nunca reparte dos puntos a la vez; cada subida es una pregunta.
- **Ritmo similar a WoW:** alternancia clase/especialización hasta la mitad, árbol héroe después (TWW: 71–80) y un remate final.

### 3.2 Calendario Nv1–15 (la especialización se elige al Nv10)

| Nv | Libro (kit) | Talentos |
|---|---|---|
| 1 | Dardo Arcano | — |
| 2 | Bola de Fuego (explosión 100 %) | — |
| 4 | Parpadeo | — |
| 6 | Barrera de Maná | — |
| 8 | Nova de Hielo | — |
| **10** | **Eliges especialización** → Llamarada (ranura `3`) y la Bola sube al 350 % | Ignición gratis + 1.er punto del Piromante |
| 11 | — | 1.er punto de clase |
| 12 | Estela Ígnea | 2.º punto del Piromante |
| 14 | Meteoro | 3.º del Piromante |
| 15 | Supernova (ranura `4`) | 3.º de clase |

Coincide con el kit de la v1 (Anexo A.3): el kit base llena `IZQ`, `DER`, `1` y `2` del Nv1 al 9; la especialización trae su kit desde el 10. Las habilidades de talento llegan cuando su nodo se puede comprar: Bloque de Hielo ≈ Nv21, Inversión del Tiempo ≈ Nv27, Contrahechizo ≈ Nv31; las del Paragon desde el Nv72.

### 3.3 Puertas y presupuesto de los finales

| Árbol | Puerta | Nivel en que se abre (comprando todo seguido) |
|---|---|---|
| Clase | 8 puntos → fila 4 | Nv25 |
| Clase | **24** → fila 7 (penúltimos y finales) | Nv57 |
| Piromante | 8 → fila 4 | Nv24 |
| Piromante | 20 → fila 7 | Nv48 |
| Piromante | 25 → ápice | Nv58 |

| | Un final al máximo | Dos finales | Qué sacrificas por el segundo |
|---|---|---|---|
| **Clase** (34) | **30** puntos → Nv69, y 4 de margen al Nv100 | Al máximo, 36: **imposible**. A rango 1: 32 (Nv90) | Los dos finales a ⅓ de potencia y solo 2 puntos para todo lo demás |
| **Piromante** (31) | **26** → Nv60; con el ápice completo, **30** → Nv68; 1 de margen | Al máximo, 32: **imposible**. A rango 1: 28, sin ápice (pide un final al máximo) | 3 de los 4 rangos del ápice y todos los nodos híbridos |

Un final a rango 1 «se prueba», no se juega: cada final escala fuerte por rango (por ejemplo, la copia de Archimaga hace el 40 / 60 / 80 %).

### 3.4 Etiquetas «número» y «mecánica»

| Árbol | Filas 0–2 | Filas 3–6 | Filas 7–9 |
|---|---|---|---|
| Clase | 4 mecánica / 6 número | **9 / 5** | **6 / 0** |
| Piromante | 4 / 4 | **11 / 3** | **7 / 0** |
| Cronomante · Invocadora | 10 de 13 mecánica en cada uno | | |

---

## 4. Árbol de clase de la Maga (30 nodos)

Generada del mockup. ○ pasiva · ⬡ elección · □ opción que concede una habilidad. «Requiere» = cualquiera de esos nodos al máximo.

| Fila | Id | Nodo | Forma · tipo | Etiqueta | Rangos | Requiere | Qué hace (al máximo) | Cuál conviene |
|---|---|---|---|---|---|---|---|---|
| 0 | c1 | Reservas Profundas | ○ pasiva | número | 2 | — | Rango 2: +30 % de maná máximo |  |
| 0 | c2 | Intelecto Arcano | ○ pasiva | número | 2 | — | Rango 2: Todos tus hechizos hacen +12 % de daño |  |
| 0 | c3 | Reflejos Arcanos | ○ pasiva | número | 2 | — | Rango 2: Parpadeo se recarga en 8 s (antes 12 s) |  |
| 1 | c4 | Escudo Prismático | ○ pasiva | número | 3 | c1 | Rango 3: Mientras tengas la Barrera de Maná, recibes un 24 % menos de daño |  |
| 1 | c5 | Dardo: Certero o Sifón | ⬡ elección | mecánica | 1 | c1 o c2 | **A · ○ Dardo Certero**: Cada 4.º Dardo Arcano es crítico seguro _(contra jefes)_<br>**B · ○ Dardo Sifón**: Si el Dardo mata, ganas 6 de maná y tus gastadoras se recargan 1 s antes _(contra grupos)_ | A, contra jefes: un crítico seguro cada ~4 s. B, contra grupos: como mueren muchos, ≈1 gastadora extra cada 8 s |
| 1 | c6 | Bola: Núcleo u Onda | ⬡ elección | número | 1 | c2 o c3 | **A · ○ Núcleo Denso**: El impacto directo de la Bola de Fuego hace +30 % _(contra jefes)_<br>**B · ○ Onda Expansiva**: La explosión de la Bola de Fuego hace +35 % _(contra grupos)_ | A, contra jefes (un solo blanco recibe el impacto). B, contra grupos (la explosión golpea a todos) |
| 1 | c7 | Paso Fugaz | ○ pasiva | mecánica | 1 | c3 | Después de Parpadeo corres un 30 % más rápido durante 3 s |  |
| 2 | c8 | Piel de Maná | ○ pasiva | número | 2 | c4 o c5 | Rango 2: Con más de la mitad del maná, recibes un 16 % menos de daño |  |
| 2 | c9 | Nova: Congelante o Cortante | ⬡ elección | mecánica | 1 | c5 o c6 | **A · ○ Nova Congelante**: La Nova de Hielo congela 1 s (no a jefes); como mucho una vez cada 8 s _(control)_<br>**B · ○ Nova Cortante**: La Nova de Hielo hace +40 % de daño, pero ralentiza 1 s menos _(contra grupos)_ | A, para controlar y sobrevivir: congelas al grupo un 8–12 % del tiempo. B, para matar grupos más rápido |
| 2 | c10 | Ralentizar o Disrupción | ⬡ elección | mecánica | 1 | c6 o c7 | **A · ○ Ralentizar**: Cada 8 s, tu siguiente hechizo ralentiza un 50 % durante 4 s _(control)_<br>**B · ○ Disrupción**: Cada 10 s, tu siguiente Dardo corta el hechizo del enemigo y lo deja mudo 3 s _(contra jefes)_ | A, contra grupos que te rodean. B, contra jefes y élites que lanzan hechizos (además llena su barra de Quebranto) |
| 3 | c11 | Bloque de Hielo o Aguante | ⬡ elección | mecánica | 1 | c8 | **A · □ Bloque de Hielo** (habilidad): Habilidad (ranura 2): te encierras en hielo 4 s; no recibes daño ni te mueves. Se recarga en 90 s _(supervivencia)_<br>**B · ○ Aguante Arcano**: Un golpe que te mataría te deja con 1 de vida y una Barrera gratis. Una vez cada 120 s _(supervivencia)_ | A, contra golpes de jefe que se ven venir (ocupa la ranura 2). B, siempre activo y sin ocupar ranura |
| 3 | c12 | Flujo de Maná | ○ pasiva | número | 2 | c8 o c9 | Rango 2: Cada golpe te devuelve 4 de maná |  |
| 3 | c13 | Mente Afilada | ○ pasiva | número | 2 | c9 o c10 | Rango 2: +10 % de probabilidad de crítico |  |
| 3 | c14 | Parpadeo: Runa o Reparo | ⬡ elección | mecánica | 1 | c10 | **A · ○ Runa de Escarcha**: Donde empieza tu Parpadeo queda una runa que ralentiza un 50 % durante 3 s _(control)_<br>**B · ○ Parpadeo Reparador**: Parpadeo te cura un 8 % de la vida y te quita las ralentizaciones _(supervivencia)_ | A, para escapar de enemigos cuerpo a cuerpo. B, para aguantar peleas largas |
| 4 | c15 | Escudo de Maná o Mente Clara | ⬡ elección | mecánica | 1 | c11 o c12 | **A · ○ Escudo de Maná**: El 20 % del daño que recibes lo pagas con maná en vez de vida _(supervivencia)_<br>**B · ○ Mente Clara**: Recuperas maná un 30 % más rápido; con el maná lleno, haces +10 % de daño _(contra jefes)_ | A, para sobrevivir (+15–20 % de aguante). B, para hacer daño (+6–8 %: lanzas más gastadoras) |
| 4 | c16 | Armonía o Pureza Elemental | ⬡ elección | mecánica | 1 | c12 o c13 | **A · ○ Armonía Elemental**: Cada vez que cambias de elemento: +8 % de daño 5 s (se suma hasta 3 veces) _(contra jefes)_<br>**B · ○ Pureza Elemental**: 3 hechizos seguidos del mismo elemento: +15 % de daño de ese elemento durante 6 s _(contra grupos)_ | A, si mezclas elementos (Dardo Arcano + Fuego + Nova): hasta +24 %. B, si todo es del mismo elemento (Dardo con Saeta Ígnea + Fuego): +15 % casi siempre. Es la pieza que une el árbol con la forja |
| 4 | c17 | Inversión o Anclaje | ⬡ elección | mecánica | 1 | c13 o c14 | **A · □ Inversión del Tiempo** (habilidad): Habilidad (ranura 2): vuelves a la vida y al lugar que tenías hace 5 s. Se recarga en 60 s _(supervivencia)_<br>**B · ○ Anclaje Temporal**: Al bajar del 30 % de vida: −30 % de daño recibido y +50 % de velocidad 4 s. Una vez cada 60 s _(supervivencia)_ | A, contra un golpe enorme de jefe (ocupa la ranura 2). B, contra el daño constante de un grupo, sin ocupar ranura |
| 5 | c18 | Barrera Reforzada | ○ pasiva | número | 2 | c15 | Rango 2: La Barrera de Maná absorbe un 50 % más |  |
| 5 | c19 | Barrera Resonante | ○ pasiva | mecánica | 1 | c15 o c16 | Con la Barrera puesta, cada Dardo te da 2 de maná y la recarga un 2 % de tu vida<br>_híbrido: Defensa + Arcano_ |  |
| 5 | c20 | Escarcha Arcana | ○ pasiva | mecánica | 1 | c16 o c17 | Tus críticos ralentizan un 30 % 2 s; contra enemigos ralentizados, el Dardo tiene +15 % de crítico<br>_híbrido: Arcano + Control_ |  |
| 5 | c21 | Escarcha Tenaz | ○ pasiva | número | 1 | c17 | Todas tus ralentizaciones duran 2 s más |  |
| 6 | c22 | Contrahechizo o Canalizador | ⬡ elección | mecánica | 1 | c18 o c19 | **A · □ Contrahechizo** (habilidad): Habilidad (ranura 2): corta el hechizo de un enemigo a 12 m y lo deja mudo 3 s. Se recarga en 18 s _(control)_<br>**B · ○ Canalizador**: Los hechizos que cuestan más de 20 de maná cuestan un 20 % menos _(contra jefes)_ | A, en grupo y contra enemigos que lanzan hechizos. B, para hacer daño (+5–7 %) |
| 6 | c23 | Ritmo Arcano | ○ pasiva | mecánica | 2 | c19 o c20 | Rango 2: Cada crítico del Dardo recarga 1 s de Parpadeo y de la Barrera |  |
| 6 | c24 | Celeridad | ○ pasiva | número | 2 | c20 o c21 | Rango 2: Lanzas hechizos un 14 % más rápido |  |
| 7 | c25 | Cristal de Barrera | ○ pasiva | mecánica | 3 | c22 | Rango 3: Cuando se rompe la Barrera, estalla: empuja 3 m, ralentiza un 40 % 2 s y te devuelve el 30 % del maná |  |
| 7 | c26 | Torrente de Maná | ○ pasiva | mecánica | 3 | c23 | Rango 3: Si gastas 60 de maná en 3 s, entras en Sobrecarga: +28 % de daño durante 4 s |  |
| 7 | c27 | Imagen Arcana | ○ pasiva | mecánica | 3 | c24 | Rango 3: Parpadeo deja una copia tuya 5 s; los enemigos a 6 m la atacan a ella |  |
| 8 | c28 | Bastión Arcano | ○ **FINAL** | mecánica | 3 | c25 | Rango 3: La Barrera ya no caduca: dura hasta que la rompen y vuelve a los 20 s. Con ella, tus hechizos cuestan un 30 % menos<br>_final: Defensa_ |  |
| 8 | c29 | Archimaga | ○ **FINAL** | mecánica | 3 | c26 | Rango 3: Cada 4.ª gastadora se lanza dos veces: la copia es gratis y hace el 80 %<br>_final: Arcano_ |  |
| 8 | c30 | Paso del Vacío | ○ **FINAL** | mecánica | 3 | c27 | Rango 3: Después de Parpadeo, tu siguiente gastadora no se recarga y hace +45 %<br>_final: Movilidad_ |  |

**Tres finales:** **Bastión Arcano** (izquierda, defensa: la Barrera se queda puesta y abarata hechizos), **Archimaga** (centro: cada 4.ª gastadora sale dos veces) y **Paso del Vacío** (derecha: tras Parpadeo, la siguiente gastadora sin recarga y +45 %).

**Implementación (por nodo):** `c1` stats.mpPct · existe; `c2` mod @all dmg · existe; `c3` mod m_parpadeo cdr · existe; `c4` tv.barrierDr · existe; `c5` A: power m_dardo_certero · NUEVO · B: power m_dardo_sifon · NUEVO; `c6` A: mod bola_fuego dmgDirect · NUEVO (clave) · B: mod bola_fuego splashPct · NUEVO (clave); `c7` power m_paso_fugaz · NUEVO (afterCast + addBuff); `c8` tv.drHighMana · existe; `c9` A: power m_nova_congelante · NUEVO (applyCC freeze) · B: mod nova_hielo dmg/slow · claves existentes; `c10` A: power m_ralentizar · existe · B: power m_disrupcion · NUEVO (lógica de m_t_contrahechizo; +20 de Quebranto a jefes); `c11` A: activa m_t_bloque · existe · B: power m_aguante · NUEVO (onLethal); `c12` stats.mph · existe; `c13` stats.crit · existe; `c14` A: power m_runa · NUEVO (spawnField zona) · B: power m_parpadeo_cura · NUEVO (g.heal); `c15` A: power m_escudo_mana · NUEVO (④ onDamaged) · B: stats regen + tv.highManaDmg · existe; `c16` A: power m_armonia · NUEVO · B: power m_pureza · NUEVO; `c17` A: activa m_t_inversion · existe · B: power m_anclaje · NUEVO (onDamaged); `c18` mod m_barrera shieldManaPct · claves; `c19` power m_barrera_resonante · NUEVO; `c20` power m_escarcha_arcana · NUEVO; `c21` mod @all slow +2 · claves; `c22` A: activa m_t_contrahechizo · existe · B: tv.costRedBig · existe; `c23` tv.dartCritCdr · NUEVO; `c24` stats.aspdPct · existe; `c25` power m_cristal · NUEVO (onShieldBreak); `c26` power m_torrente · NUEVO (⑪ onResource); `c27` power m_imagen · NUEVO (g.forceTarget); `c28` power m_bastion · NUEVO; `c29` power m_archimaga · NUEVO (echo del canal); `c30` power m_vacio · NUEVO.

---

## 5. Árbol del Piromante (29 nodos)

| Fila | Id | Nodo | Forma · tipo | Etiqueta | Rangos | Requiere | Qué hace (al máximo) | Cuál conviene |
|---|---|---|---|---|---|---|---|---|
| 0 | s0 | Ignición | ○ clave | mecánica | gratis | gratis | Tus golpes de Fuego queman (un 60 % extra del golpe en 4 s) y la Bola de Fuego explota al 350 % (antes 100 %) |  |
| 1 | s1 | Brasas | ○ pasiva | número | 3 | s0 | Rango 3: Las quemaduras duran 7 s (antes 4 s) |  |
| 1 | s2 | Calor Abrasador | ○ pasiva | número | 3 | s0 | Rango 3: +15 % de crítico contra enemigos que se queman |  |
| 1 | s3 | Mecha Corta | ○ pasiva | número | 3 | s0 | Rango 3: La Bola de Fuego se recarga en 1,05 s (antes 1,5 s) |  |
| 2 | s4 | Llama Persistente | ○ pasiva | número | 2 | s1 | Rango 2: Las quemaduras hacen +30 % de daño |  |
| 2 | s5 | Chispas | ○ pasiva | mecánica | 1 | s1 o s2 | Un crítico sobre un enemigo que se quema reinicia su quemadura y te da 5 de Calor<br>_híbrido: Brasa + Ignición_ |  |
| 2 | s6 | Combustible Volátil | ○ pasiva | mecánica | 1 | s2 o s3 | Con Ignición Total, la Bola explota en 4 m (antes 2 m) y el Meteoro cae al instante<br>_híbrido: Ignición + Cataclismo_ |  |
| 2 | s7 | Pira | ○ pasiva | mecánica | 2 | s3 | Rango 2: El Meteoro deja el suelo ardiendo 3 s (40 % por segundo) |  |
| 3 | s8 | Propagación o Brasa Profunda | ⬡ elección | mecánica | 1 | s4 o s5 | **A · ○ Propagación**: Cuando muere un enemigo que se quema, su quemadura pasa a 2 enemigos cercanos _(contra grupos)_<br>**B · ○ Brasa Profunda**: Puedes poner hasta 3 quemaduras a la vez en el mismo enemigo _(contra jefes)_ | A, contra grupos: cada muerte enciende a los siguientes. B, contra jefes: ×2,2 de daño de quemadura. Decide qué Brasa juegas |
| 3 | s9 | Llamarada: Avivada o Voraz | ⬡ elección | mecánica | 1 | s5 o s6 | **A · ○ Llamarada Avivada**: Llamarada hace estallar el 100 % de las quemaduras (antes 60 %) y te da 25 de Calor _(contra jefes)_<br>**B · ○ Llamarada Voraz**: Si Llamarada hace estallar 3 o más quemaduras: se recarga 4 s antes y ganas 8 de Calor por enemigo _(contra grupos)_ | A, contra jefes: una Ignición Total extra cada ~25 s. B, contra grupos: Llamarada cada 4 s y el Calor lleno en 2 usos |
| 3 | s10 | Meteoro: Gemelo o Concentrado | ⬡ elección | mecánica | 1 | s6 o s7 | **A · ○ Meteoro Gemelo**: Cada 3.er Meteoro cae dos veces en el mismo sitio _(contra grupos)_<br>**B · ○ Meteoro Concentrado**: El Meteoro hace +50 % al enemigo más cercano al centro _(contra jefes)_ | A, contra grupos: un 33 % más de Meteoros. B, contra jefes. Decide qué Cataclismo juegas: barrido o martillo |
| 4 | s11 | Fuego Interior | ○ pasiva | número | 2 | s8 | Rango 2: Cuando matas a un enemigo que se quema, te curas un 4 % y ganas 6 de maná |  |
| 4 | s12 | Pirotecnia | ○ pasiva | mecánica | 2 | s8 o s9 | Rango 2: Cada crítico de Fuego recarga 1 s de todas tus habilidades de Fuego |  |
| 4 | s13 | Ceniza Ardiente | ○ pasiva | número | 2 | s9 o s10 | Rango 2: Meteoro y Supernova hacen +30 % de daño |  |
| 4 | s14 | Impacto Sísmico | ○ pasiva | mecánica | 1 | s10 | Quien sobrevive al Meteoro queda ralentizado un 50 % 3 s; a los jefes les llena 20 de Quebranto |  |
| 5 | s15 | Fénix o Escudo de Llamas | ⬡ elección | mecánica | 1 | s11 o s12 | **A · ○ Fénix**: Si mueres, renaces con la mitad de la vida. Una vez cada 2 min _(supervivencia)_<br>**B · ○ Escudo de Llamas**: Recibes un 10 % menos de daño y quien te golpea cuerpo a cuerpo se quema _(supervivencia)_ | A, donde morir cuesta caro (Hardcore, jefes Pináculo). B, contra grupos: +12–15 % de aguante siempre |
| 5 | s16 | Brasero | ○ pasiva | mecánica | 2 | s12 o s13 | Rango 2: Con más de 50 de Calor: quemaduras +35 % y Meteoro +20 %<br>_híbrido: Los tres estilos (por el Calor)_ |  |
| 5 | s17 | Estrellas Fugaces | ○ pasiva | mecánica | 2 | s13 o s14 | Rango 2: Supernova suelta además 5 meteoros pequeños (40 % cada uno) en 3 s |  |
| 6 | s18 | Brasa Errante | ○ pasiva | mecánica | 2 | s15 | Rango 2: Las quemaduras que pasan a otro enemigo no pierden daño ni tiempo, y pasan a 2 enemigos más |  |
| 6 | s19 | Ignición Rápida | ○ pasiva | mecánica | 2 | s15 o s16 | Rango 2: Cada golpe de Fuego te da 9 de Calor (antes 5) |  |
| 6 | s20 | Ola de Calor | ○ pasiva | número | 2 | s16 o s17 | Rango 2: Todas tus explosiones y áreas de Fuego son un 30 % más grandes |  |
| 6 | s21 | Estela Meteórica | ○ pasiva | mecánica | 1 | s17 | Al terminar la Estela Ígnea, tu siguiente Meteoro cae allí al instante |  |
| 7 | s22 | Brasa Viva | ○ pasiva | mecánica | 3 | s18 | Rango 3: Los enemigos que se queman contagian: cada segundo, el 40 % de su quemadura pasa a otro enemigo a 2 m |  |
| 7 | s23 | Combustión | ○ pasiva | mecánica | 3 | s19 | Rango 3: Al usar Ignición Total, durante 4,5 s todo tu Fuego es crítico |  |
| 7 | s24 | Cráter | ○ pasiva | mecánica | 3 | s21 | Rango 3: El Meteoro deja un cráter 4 s: dentro, los enemigos reciben +25 % de Fuego y tu Bola de Fuego explota dos veces |  |
| 8 | s25 | Incendio Forestal | ○ **FINAL** | mecánica | 3 | s22 | Rango 3: Un enemigo aguanta hasta 5 quemaduras tuyas. Cuando muere, todas pasan a cada enemigo a 4 m. Quemaduras +40 %<br>_final: Brasa_ |  |
| 8 | s26 | Combustión Perpetua | ○ **FINAL** | mecánica | 3 | s23 | Rango 3: En Combustión, cada crítico da 4 de Calor; a 100, dura 3 s más y lanza una Bola gratis. Críticos +30 %<br>_final: Ignición_ |  |
| 8 | s27 | Lluvia de Fuego | ○ **FINAL** | mecánica | 3 | s24 | Rango 3: Con Ignición Total, el Meteoro cae 3 veces (100/60/60 %); si golpea a 3 o más, se recarga al instante. Meteoro +30 %<br>_final: Cataclismo_ |  |
| 9 | s28 | Corazón del Sol | ○ **ÁPICE** | mecánica | 4 | s25 o s26 o s27 | 1) Ignición Total hace estallar las quemaduras a 8 m (50 % de lo que les queda). 2) Matar a un élite te da 25 de Calor. 3) Ignición Total salta a 80 de Calor (antes 100). 4) Cada 20 explosiones, Supernova se lanza sola y gratis. |  |

### 5.1 Los tres arquetipos

| Arquetipo | Fantasía | Elección que lo define | Penúltimo → final | Mejor en |
|---|---|---|---|---|
| **Brasa** | El fuego se contagia solo | s8 **Propagación** (grupos) o Brasa Profunda (jefes) | Brasa Viva → **Incendio Forestal** | Grupos y supervivencia |
| **Cataclismo** | Golpes enormes en el sitio justo | s10 **Meteoro Gemelo** (barrido) o Concentrado (martillo) | Cráter → **Lluvia de Fuego** | Grupos con control |
| **Ignición** | Ventanas de crítico que se encadenan | s9 **Llamarada Avivada** (jefes) o Voraz (grupos) | Combustión → **Combustión Perpetua** | Jefes |

Nodos que mezclan arquetipos: **Chispas** (Brasa + Ignición), **Combustible Volátil** (Ignición + Cataclismo), **Brasero** (los tres, por el Calor) y **Ola de Calor**. El ápice **Corazón del Sol** (4 rangos) sirve a los tres.

**Implementación (por nodo):** `s0` power p_ignicion · existe (+ modifyResolve de la Bola); `s1` tv.burnDur · existe; `s2` tv.burningCrit · existe; `s3` mod bola_fuego cdr · existe; `s4` tv.burnPct · existe; `s5` power p_chispas · NUEVO; `s6` power p_volatil · NUEVO (modifyResolve con prof.ignition); `s7` mod meteoro zone · existe; `s8` A: power p_propagacion · existe · B: power p_acumular · existe; `s9` A: power p_llamarada_avivada · existe · B: power p_llamarada_voraz · NUEVO; `s10` A: power p_meteoro_gemelo · NUEVO (echo del canal) · B: power p_meteoro_conc · NUEVO (condAdd); `s11` tv.burnKillHeal + burnKillMana · existen; `s12` tv.critFireCdr · existe; `s13` mod meteoro/supernova dmg · existe; `s14` mod meteoro slow + stagger · claves; `s15` A: power p_fenix · existe · B: power p_escudo_llamas · NUEVO; `s16` power p_brasero · NUEVO (cond con gaugeValue); `s17` power p_estrellas_fugaces · NUEVO; `s18` power p_brasa_errante · NUEVO; `s19` stat gaugeGain:calor · existe; `s20` mod @fire radius · existe; `s21` power p_estela_meteorica · NUEVO; `s22` power p_brasa_viva · NUEVO (onTick); `s23` power p_combustion · existe (+ afterCast con prof.ignition); `s24` power p_crater · NUEVO (campo); `s25` power p_incendio · NUEVO; `s26` power p_perpetua · NUEVO; `s27` power p_lluvia_fuego · NUEVO; `s28` power p_corazon_sol (rangos) · NUEVO sobre el existente.

---

## 6. Builds de ejemplo a Nv100

Validadas comprando **punto a punto en el orden de la build** (cada punto al primer nodo de la lista que se pueda comprar), como haría el jugador al subir. Están en el mockup (**Configuración** y **Recomendado**). Las cifras de «mejor en» son **estimaciones de diseño**; se calibran en E3.

### 6.1 «Incendio» (Brasa) · Paragon Invocadora

- **Clase (34/34):** Reservas Profundas 2 · Escudo Prismático 3 · Dardo Sifón (B) 1 · Piel de Maná 2 · Aguante Arcano (B) 1 · Escudo de Maná (A) 1 · Barrera Resonante 1 · Canalizador (B) 1 · Intelecto Arcano 2 · Flujo de Maná 2 · Nova Cortante (B) 1 · Pureza Elemental (B) 1 · Barrera Reforzada 2 · Mente Afilada 2 · Onda Expansiva (B) 1 · Ralentizar (A) 1 · Cristal de Barrera 3 · Bastión Arcano 3 · Reflejos Arcanos 2 · Paso Fugaz 1 · Runa de Escarcha (A) 1
- **Piromante (31/31):** Ignición (gratis) · Brasas 3 · Llama Persistente 2 · Chispas 1 · Propagación (A) 1 · Fuego Interior 2 · Escudo de Llamas (B) 1 · Brasa Errante 2 · Brasa Viva 3 · Incendio Forestal 3 · Corazón del Sol 4 · Calor Abrasador 3 · Llamarada Voraz (B) 1 · Pirotecnia 2 · Brasero 2 · Mecha Corta 1
- **Paragon:** Invocadora: Familiar Arcano (gratis) · Enjambre (B) · Imitación · Detonar Constructo · Sobrecarga · Eco Elemental · Fragua Rúnica (B) · Hilo de Maná · Legión · Guardián (A) · Vínculo — 10/10; quedan fuera Aprendiz y Constructo Templado

**Rotación.** Enciende **la manada**, no al objetivo: Dardo con Saeta Ígnea o Bola con Racimo en el centro. Cuando arden 3 o más, **Llamarada Voraz**: hace estallar las quemaduras, se recarga 4 s antes y llena el Calor. Con Ignición Total, Bola gratis. Desde ahí, **matar es tu rotación**: cada muerte pasa las quemaduras a todos (Propagación, Brasa Errante e Incendio Forestal) y te cura. El **Enjambre** de tres Familiares reparte fuego a tres blancos y te da Calor; Bastión Arcano mantiene la Barrera puesta.
**Final de clase:** Bastión Arcano a Nv69.

### 6.2 «Lluvia de Fuego» (Cataclismo) · Paragon Cronomante

- **Clase (34/34):** Intelecto Arcano 2 · Reflejos Arcanos 2 · Onda Expansiva (B) 1 · Paso Fugaz 1 · Ralentizar (A) 1 · Runa de Escarcha (A) 1 · Anclaje Temporal (B) 1 · Escarcha Arcana 1 · Celeridad 2 · Reservas Profundas 2 · Dardo Sifón (B) 1 · Nova Cortante (B) 1 · Flujo de Maná 2 · Mente Afilada 2 · Pureza Elemental (B) 1 · Escarcha Tenaz 1 · Ritmo Arcano 2 · Imagen Arcana 3 · Paso del Vacío 3 · Piel de Maná 2 · Escudo Prismático 2
- **Piromante (31/31):** Ignición (gratis) · Mecha Corta 3 · Pira 2 · Combustible Volátil 1 · Meteoro Gemelo (A) 1 · Ceniza Ardiente 2 · Impacto Sísmico 1 · Estrellas Fugaces 2 · Estela Meteórica 1 · Cráter 3 · Lluvia de Fuego 3 · Corazón del Sol 4 · Calor Abrasador 3 · Llamarada Voraz (B) 1 · Brasero 2 · Ola de Calor 2
- **Paragon:** Cronomante: Marca del Tiempo (gratis) · Marca Contagiosa (B) · Prisa Temporal · Paradoja · Segundos Robados · Grieta Temporal · Presagio (A) · Momento Exacto · Señora del Tiempo · Retroceso (B) · Reloj de Arena — 10/10; quedan fuera Bucle y Aceleración

**Rotación.** Estela Ígnea sobre la manada → al terminar, **Meteoro instantáneo** allí → Cráter. Dentro, Bola de Fuego cada ~1 s, que **explota dos veces** y llena el Calor. A 100, Meteoro con Ignición Total: cae 3 veces y, si golpea a 3 o más, se recarga. Las **Marcas del Tiempo** (con Marca Contagiosa) repiten un 30 % de todo ese daño y saltan a los vecinos. Parpadeo con **Paso del Vacío**: la siguiente gastadora sin recarga y +45 %.
**Final de clase:** Paso del Vacío a Nv69.

### 6.3 «Combustión Perpetua» (Ignición) · Paragon Cronomante

- **Clase (34/34):** Reservas Profundas 2 · Intelecto Arcano 2 · Dardo Certero (A) 1 · Núcleo Denso (A) 1 · Nova Cortante (B) 1 · Flujo de Maná 2 · Mente Afilada 2 · Armonía Elemental (A) 1 · Barrera Resonante 1 · Ritmo Arcano 2 · Disrupción (B) 1 · Inversión del Tiempo (A) 1 · Escarcha Arcana 1 · Escudo Prismático 3 · Piel de Maná 2 · Mente Clara (B) 1 · Reflejos Arcanos 2 · Torrente de Maná 3 · Archimaga 3 · Celeridad 2
- **Piromante (31/31):** Ignición (gratis) · Calor Abrasador 3 · Chispas 1 · Llamarada Avivada (A) 1 · Pirotecnia 2 · Brasero 2 · Ignición Rápida 2 · Combustión 3 · Combustión Perpetua 3 · Corazón del Sol 4 · Brasas 3 · Llama Persistente 1 · Brasa Profunda (B) 1 · Fénix (A) 1 · Mecha Corta 3 · Combustible Volátil 1
- **Paragon:** Cronomante: Marca del Tiempo (gratis) · Eco Mayor (A) · Reloj de Arena · Prisa Temporal · Segundos Robados · Presagio (A) · Retroceso (B) · Bucle · Aceleración · Señora del Tiempo · Momento Exacto — 10/10; quedan fuera Paradoja y Grieta Temporal

**Rotación.** Llena el Calor con Bola (Núcleo Denso) y Dardo Certero. Llamarada Avivada → Ignición Total → **Combustión**: 4,5 s de crítico seguro; cada crítico da Calor y, si llegas a 100, Combustión se alarga y lanza una Bola gratis. Con **Eco Mayor** y **Presagio**, cada Marca del Tiempo repite el 45 % de la ventana: el jefe recibe la Combustión dos veces. Archimaga copia cada 4.ª gastadora; Inversión del Tiempo en la `2` contra el golpe grande.
**Final de clase:** Archimaga a Nv69.

### 6.4 «Brasa Ardiente» (híbrida Brasa + Ignición, sin final) · Paragon Invocadora

- **Clase (34/34):** Reservas Profundas 2 · Intelecto Arcano 2 · Dardo Certero (A) 1 · Onda Expansiva (B) 1 · Nova Cortante (B) 1 · Flujo de Maná 2 · Mente Afilada 2 · Pureza Elemental (B) 1 · Barrera Resonante 1 · Ritmo Arcano 2 · Ralentizar (A) 1 · Anclaje Temporal (B) 1 · Escarcha Arcana 1 · Escudo Prismático 2 · Piel de Maná 2 · Escudo de Maná (A) 1 · Reflejos Arcanos 2 · Torrente de Maná 3 · Archimaga 3 · Celeridad 2 · Paso Fugaz 1
- **Piromante (31/31):** Ignición (gratis) · Brasas 3 · Calor Abrasador 3 · Llama Persistente 2 · Chispas 1 · Propagación (A) 1 · Llamarada Avivada (A) 1 · Fuego Interior 2 · Pirotecnia 2 · Escudo de Llamas (B) 1 · Brasero 2 · Brasa Errante 2 · Ignición Rápida 2 · Brasa Viva 3 · Combustión 3 · Mecha Corta 1 · Ola de Calor 2
- **Paragon:** Invocadora: Familiar Arcano (gratis) · Gran Constructo (A) · Vínculo · Guardián (A) · Sobrecarga · Llamar Constructo (A) · Imitación · Aprendiz · Constructo Templado · Legión · Hilo de Maná — 10/10; quedan fuera Detonar Constructo y Eco Elemental

**Rotación.** Enciende la manada y deja que **Brasa Viva** contagie. Los críticos sobre enemigos que se queman reinician su quemadura y dan Calor (**Chispas**); Ignición Rápida y Brasero lo suben todo. En **Combustión**, cada crítico renueva las quemaduras de la manada. El **Gran Constructo** pega fuerte al élite y **Llamar Constructo** (ranura `2`, cuadrado en el árbol) atrae a los enemigos mientras tanto.
**Dónde brilla:** contenido mixto (élites con manada, recompensas, Pesadillas).

### 6.5 Comparación (estimación de diseño; el dueño acepta la híbrida a ~8–9 %)

| Build | Contra jefes | Contra 5 | Peor de los dos | Aguante | Control |
|---|---|---|---|---|---|
| Incendio (Brasa) | 0,86 | **1,00** | 0,86 | alto | medio |
| Lluvia de Fuego (Cataclismo) | 0,90 | 0,96 | 0,90 | medio | **alto** |
| Combustión Perpetua (Ignición) | **1,00** | 0,80 | 0,80 | medio-bajo | bajo |
| **Brasa Ardiente (híbrida)** | 0,92 | 0,91 | **0,91** | medio-alto | medio |

---

## 7. Paragon: árboles héroe de la clase y tablero de glifos

### 7.1 Reglas

- **Se abre al tener la especialización «al máximo»:** haber ganado los 31 puntos de especialización (el último llega al **Nv70**) y haberlos **gastado todos**. Antes, la columna está **en gris**.
- **Al abrirse**, su **nodo clave es gratis** (como Ignición en el Piromante). Luego, **10 puntos** del Nv71 al 80 para los otros 12 nodos: siempre quedan **2 fuera**.
- **Dos árboles por especialización, cada uno compartido por dos**, con temas **de la clase**, no de un elemento. Su mecánica funciona con Fuego, Hielo o Arcano.
- Cambiar de árbol héroe es gratis fuera de combate y guarda las elecciones de cada uno. Si después quitas un punto de especialización, el Paragon **vuelve a gris** (sus nodos se guardan, pero no hacen efecto) hasta que lo vuelvas a gastar.

**Estado en gris (diseño):**

| Pieza | Contenido |
|---|---|
| Columna | Árbol del héroe elegido al 28 % de opacidad y en escala de grises, arte de fondo al 10 % |
| Tarjeta central | Candado · «**Paragon**» · «**Gasta tus 31 puntos de especialización (X/31)**» · barra de avance · «El último punto se gana al nivel 70» (o «Te quedan N por gastar en el Piromante») |
| Avance de qué trae | Una tarjeta por árbol héroe con su nodo clave en una línea (Cronomante: «Tu primer golpe marca al enemigo 4 s; al acabar, la marca repite el 30 % del daño que le hiciste») y la nota «su nodo clave es gratis y luego 10 puntos (Nv71–80) para 12 nodos; después, el tablero de glifos (16 puntos, Nv81–100)» |
| Cabecera | «Gastados 0 / 10 · Espec. X/31»; al abrirse antes del 71: «1.er punto al Nv71» |

| Árbol héroe | Especializaciones | Mecánica (con cualquier elemento) |
|---|---|---|
| **Cronomante** | Piromante · Arcanista | **Marca del Tiempo:** el primer golpe marca al enemigo 4 s; al terminar, la marca repite el 30 % de todo el daño que le hiciste |
| **Invocadora** | Piromante · Crionte | **Familiar Arcano:** un constructo de maná dispara cada 1,5 s con el elemento de tu último hechizo (el Fuego quema, el Hielo ralentiza, el Arcano da maná) |
| **Escriba Rúnica** (esbozo) | Crionte · Arcanista | **Runas:** tus hechizos escriben runas en el suelo; tres juntas forman un Sello que potencia a quien está dentro |

### 7.2 Cronomante (Piromante · Arcanista)

| Fila | Id | Nodo | Forma · tipo | Etiqueta | Rangos | Requiere | Qué hace (al máximo) | Cuál conviene |
|---|---|---|---|---|---|---|---|---|
| 0 | t0 | Marca del Tiempo | ○ clave | mecánica | gratis | gratis | Tu primer golpe marca al enemigo 4 s. Al acabar, la Marca repite el 30 % del daño que le hiciste en ese tiempo |  |
| 1 | t1 | Reloj de Arena | ○ pasiva | número | 1 | t0 | La Marca dura 6 s (antes 4 s) |  |
| 1 | t2 | Eco Mayor o Contagio | ⬡ elección | mecánica | 1 | t0 | **A · ○ Eco Mayor**: La Marca repite el 45 % (antes 30 %) _(contra jefes)_<br>**B · ○ Marca Contagiosa**: Al terminar, la Marca pasa a 2 enemigos cercanos _(contra grupos)_ | A, contra jefes. B, contra grupos |
| 1 | t3 | Prisa Temporal | ○ pasiva | mecánica | 1 | t0 | Cada Marca que termina te hace lanzar un 10 % más rápido durante 3 s |  |
| 2 | t4 | Detener o Retroceder | ⬡ elección | mecánica | 1 | t1 o t2 | **A · □ Detener el Tiempo** (habilidad): Habilidad (ranura 2): paras el tiempo 3 s a 8 m; las Marcas guardan el doble. Se recarga en 75 s _(control)_<br>**B · ○ Retroceso**: Al bajar del 40 % de vida, vuelves a la vida que tenías hace 3 s. Una vez cada 90 s _(supervivencia)_ | A, para controlar grupos y preparar un golpe enorme (ocupa la ranura 2). B, para sobrevivir sin ocupar ranura |
| 2 | t5 | Segundos Robados | ○ pasiva | número | 1 | t2 | Cada Marca que termina recarga 1 s de tu definitiva |  |
| 2 | t6 | Paradoja | ○ pasiva | mecánica | 1 | t2 o t3 | Si el enemigo marcado muere antes de tiempo, la Marca pasa al más cercano con lo que llevaba |  |
| 3 | t7 | Bucle | ○ pasiva | mecánica | 1 | t4 o t5 | Cada 4.ª Marca que termina se repite una segunda vez |  |
| 3 | t8 | Presagio o Memoria | ⬡ elección | mecánica | 1 | t5 | **A · ○ Presagio**: El golpe que pone la Marca ya cuenta el doble para ella _(contra jefes)_<br>**B · ○ Memoria**: Al terminar una Marca, te curas el 3 % del daño que repitió _(supervivencia)_ | A, contra jefes. B, para aguantar en grupos |
| 3 | t9 | Grieta Temporal | ○ pasiva | mecánica | 1 | t5 o t6 | Si 3 Marcas terminan a la vez, abren una grieta 3 s que ralentiza un 30 % |  |
| 4 | t10 | Aceleración | ○ pasiva | número | 1 | t7 o t8 | Con 3 o más Marcas puestas, lanzas un 12 % más rápido |  |
| 4 | t11 | Momento Exacto | ○ pasiva | mecánica | 1 | t8 o t9 | Tus críticos alargan la Marca 1 s (hasta 3 s más) |  |
| 5 | t12 | Señora del Tiempo | ○ **FINAL** | mecánica | 1 | t10 o t11 | Cada 30 s, tu siguiente gastadora para el reloj 5 s: las Marcas no terminan y luego repiten el 100 % de lo guardado |  |

### 7.3 Invocadora (Piromante · Crionte)

| Fila | Id | Nodo | Forma · tipo | Etiqueta | Rangos | Requiere | Qué hace (al máximo) | Cuál conviene |
|---|---|---|---|---|---|---|---|---|
| 0 | f0 | Familiar Arcano | ○ clave | mecánica | gratis | gratis | Un Familiar de maná dispara cada 1,5 s (50 % del arma) con tu último elemento: Fuego quema, Hielo frena, Arcano da maná |  |
| 1 | f1 | Vínculo | ○ pasiva | número | 1 | f0 | El Familiar tiene +50 % de vida y cada disparo te da 2 de maná |  |
| 1 | f2 | Uno o Muchos | ⬡ elección | mecánica | 1 | f0 | **A · ○ Gran Constructo**: Un solo Familiar, +80 % de daño; cada 5.º disparo aturde 0,5 s _(contra jefes)_<br>**B · ○ Enjambre**: Tres Familiares pequeños; cada uno hace el 40 % _(contra grupos)_ | A, contra jefes. B, contra grupos (tres blancos a la vez) |
| 1 | f3 | Imitación | ○ pasiva | mecánica | 1 | f0 | Cuando usas tu definitiva, el Familiar lanza una copia al 25 % |  |
| 2 | f4 | Guardián o Cazador | ⬡ elección | mecánica | 1 | f1 o f2 | **A · ○ Guardián**: El Familiar se interpone: recibe el 15 % del daño que te hacen _(supervivencia)_<br>**B · ○ Cazador**: El Familiar persigue al enemigo con más vida; ese enemigo recibe +10 % de daño _(contra jefes)_ | A, para sobrevivir. B, contra jefes |
| 2 | f5 | Sobrecarga | ○ pasiva | número | 1 | f2 | Cada gastadora tuya hace disparar al Familiar un 30 % más rápido durante 3 s |  |
| 2 | f6 | Detonar Constructo | ○ pasiva | mecánica | 1 | f2 o f3 | Si el Familiar cae, estalla (200 % del arma, 4 m) y vuelve a los 5 s |  |
| 3 | f7 | Aprendiz | ○ pasiva | mecánica | 1 | f4 o f5 | El Familiar copia la variante de forja de tu Dardo (por ejemplo, con Saeta Ígnea sus disparos explotan) |  |
| 3 | f8 | Constructo o Fragua | ⬡ elección | mecánica | 1 | f5 | **A · □ Llamar Constructo** (habilidad): Habilidad (ranura 2): un Constructo grande aparece 10 s y obliga a los enemigos a 8 m a atacarlo. Se recarga en 45 s _(supervivencia)_<br>**B · ○ Fragua Rúnica**: El Familiar hace +5 % por cada habilidad distinta que usaste en 8 s (hasta +25 %) _(contra jefes)_ | A, para aguantar grupos grandes (ocupa la ranura 2). B, para hacer daño sin ocupar ranura |
| 3 | f9 | Eco Elemental | ○ pasiva | mecánica | 1 | f5 o f6 | Los disparos del Familiar alimentan tu mecánica: 3 de Calor (Piromante) o 1 capa de Escarcha (Crionte) |  |
| 4 | f10 | Constructo Templado | ○ pasiva | número | 1 | f7 o f8 | El Familiar hace +20 % de daño |  |
| 4 | f11 | Hilo de Maná | ○ pasiva | mecánica | 1 | f8 o f9 | Un hilo de maná te une al Familiar y daña a quien lo cruza (60 % por segundo) |  |
| 5 | f12 | Legión | ○ **FINAL** | mecánica | 1 | f10 o f11 | Cada 25 s, tu Familiar se divide en 3 durante 8 s y todos copian tu siguiente gastadora al 50 % |  |

### 7.4 Tablero de glifos (`PARAGON_BOARD`)

| Hoy | v3 |
|---|---|
| Puntos de tablero desde el Nv20 | **16 puntos del Nv81 al 100** (los niveles 85, 90, 95 y 100 son de clase) |
| Los nodos legendarios conceden poderes | Dan **estadísticas** grandes; los poderes de identidad los da el árbol héroe |
| Tablero 9 × 9 | Se mantiene. Requisito para E4: desde el inicio, el primer nodo legendario a 8–10 casillas, un zócalo de glifo en el camino y el segundo legendario a 10 casillas más. Con 16 puntos se llega a **uno** con su zócalo, nunca a los dos |

### 7.5 Iconos nuevos para Codex

Hoy el mockup usa iconos de reemplazo. Arte crudo en `D:\Proyectos\IntentoRPG-assets` según el pipeline de Codex. Pedidos con el estilo de `assets/talents` (128 y 256 px, fondo oscuro y elemento neutro, en violeta y oro de la Maga):

| Archivo | Qué dibujar |
|---|---|
| `assets/talents/hero-crono.webp` | Emblema del Cronomante: reloj de arena de cristal arcano con arena dorada que sube |
| `assets/talents/hero-invoca.webp` | Emblema de la Invocadora: pequeño constructo de maná (cuerpo de runas flotantes) con ojo brillante |
| `assets/talents/hero-escriba.webp` | Emblema de la Escriba Rúnica: pluma trazando un círculo de tres runas |
| `assets/talents/maga-crono-t0…t12.webp` (13) | Marca del Tiempo (sello de reloj sobre un enemigo), Reloj de Arena, Eco Mayor / Marca Contagiosa, Prisa Temporal, Detener / Retroceder, Segundos Robados, Paradoja, Bucle, Presagio / Memoria, Grieta Temporal, Aceleración, Momento Exacto, Señora del Tiempo |
| `assets/talents/maga-invoca-f0…f12.webp` (13) | Familiar Arcano, Vínculo, Gran Constructo / Enjambre, Imitación, Guardián / Cazador, Sobrecarga, Detonar Constructo, Aprendiz, Constructo / Fragua, Eco Elemental, Constructo Templado, Hilo de Maná, Legión |
| `assets/skills/m_h_detener.webp` y `m_h_constructo.webp` | Habilidades: Detener el Tiempo (esfera de tiempo congelado) y Llamar Constructo (gólem de maná grande) |

---

## 8. Forja y talentos: sin repetición

**Regla (Anexo A.4):** la forja **transforma** (forma, geometría, elemento, ritmo); el talento **añade o multiplica**. Los árboles héroe nuevos no tocan la forma de ninguna habilidad: la Marca **repite daño** y el Familiar **es otra fuente**. «Aprendiz» (f7) **lee** la variante del Dardo para el Familiar, sin cambiar el Dardo.

| Habilidad | Variantes (2f) | Talentos que la tocan | Cómo conviven |
|---|---|---|---|
| Bola de Fuego | Pirodardo · Racimo | c6, s3, s6, s24 | La variante da la forma; el talento suma daño o repite la explosión (Cráter + Racimo = dos explosiones con sus brasas) |
| Meteoro | Lluvia de Meteoritos · Meteoro Ancestral | s7, s10, s13, s14, s21, s27 | Gemelo y Lluvia de Fuego **repiten el lanzamiento**; con Lluvia de Meteoritos, cada repetición trae sus 3 meteoritos |
| Llamarada | Lanza de Llamas · Erupción | s9 | La variante da el cono o el anillo; el talento decide qué hace estallar |
| Estela Ígnea | Senda de Llamas · Muro de Llamas | s21 | El talento añade un Meteoro al final |
| Supernova | Sol Errante · Colapso | s13, s17, t5, f3 | Estrellas Fugaces añade meteoros; Imitación lanza una copia al 25 % |
| Dardo Arcano | Saeta Ígnea · Saeta Gélida | c5, c19, c20, c23, f7 | Ninguno cambia el elemento ni la forma |
| Nova de Hielo | Corazón de Hielo · Nova Fracturante | c9 | Congelante añade un congelamiento |
| Parpadeo | Doble Parpadeo · Parpadeo Disruptor | c3, c7, c14, c27, c30 | Runa, Imagen y Paso del Vacío añaden algo al salir |
| Barrera de Maná | Barrera Gélida · Coraza Arcana | c4, c15, c18, c19, c25, c28 | Bastión cambia duración y coste; Cristal añade una explosión |

**Nombres:** ningún nodo comparte nombre con una variante ni con una habilidad. «Inversión del Tiempo» (clase) y «Retroceso» (Cronomante) se parecen en tema, pero no en efecto: una es habilidad de 5 s; el otro, un salvavidas automático de 3 s, y conviven solo si el jugador quiere las dos.

---

## 9. UI/UX del panel de talentos

### 9.1 Reglas de texto (pedido 3)

| Regla | Antes (v2) | Ahora (v3) |
|---|---|---|
| Empieza por lo que pasa, con el número | «Parpadeo: −4 s de enfriamiento» | «Parpadeo se recarga en 8 s (antes 12 s)» |
| Nada de jerga ni siglas | «A gana en UNI… B gana en ÁREA×5» | «A, contra jefes… B, contra grupos» |
| *Stagger* → **Quebranto** (el nombre del juego) | «+20 de stagger» | «a los jefes les llena 20 de Quebranto» |
| Di el antes y el después cuando cambias un valor | «La Quemadura dura +3 s» | «Las quemaduras duran 7 s (antes 4 s)» |
| Una idea por frase; si hay dos, punto y seguido | «…y TODAS saltan…; +40 %» | «Cuando muere, todas pasan a cada enemigo a 4 m. Quemaduras +40 %» |
| Las habilidades de talento dicen dónde van y cuándo vuelven | «ACTIVA (ranura 2): inmune 4 s; 90 s» | «Habilidad (ranura 2): te encierras en hielo 4 s… Se recarga en 90 s» |
| El libro describe la habilidad en una línea | «Dardo arcano a distancia; recupera Maná al impactar» | «Dispara un dardo a 20 m. Cada impacto te devuelve 3 de maná» |

El tooltip sigue la regla de poco texto del libro: título, una línea de tipo, **una** frase de efecto (o dos opciones de una frase), la caja verde «cuál conviene», las habilidades que toca y el estado. `Alt` añade el detalle técnico.

### 9.2 Forma por tipo (pedido 4)

| Forma | Qué es | Dónde se ve |
|---|---|---|
| **Círculo** | Pasivo (también la clave, los finales con doble aro naranja y el ápice con 4 pips) | Árboles, leyenda, icono del tooltip, mitad B del flotante si es pasiva |
| **Cuadrado** | Activo: concede una habilidad | Libro (todas las habilidades), mitad del flotante con la marca **HABILIDAD**, icono interior del hexágono cuando eliges esa opción, punto azul en la esquina del hexágono que la ofrece |
| **Hexágono** | Elección A/B, partido en dos mitades | Árboles, leyenda, icono del tooltip |

### 9.3 Resto de la UI

| Pieza | Diseño |
|---|---|
| Cabecera | Emblema, «Talentos · Maga Piromante», nivel; Habilidades (T) · Configuración · Guardar · Código · Recomendado · ↶ · Reiniciar · ✕ |
| Columnas | Maga · Paragon · Piromante (2 : 1 : 2), sin scroll horizontal a 1366 y 1920 |
| Cabecera por árbol | «Gastados X / Y», «Nv req.»; en el Paragon, el árbol héroe, «Tablero N/16» y, en gris, «Espec. X/31» |
| Elección | Al pasar el ratón, las dos mitades se abren lado a lado sobre el hexágono; un clic elige |
| Puertas | Línea discontinua con sello y «X/24» en la primera columna libre; ápice con banda «Ápice · 25» |
| Loadouts, código, Recomendado, deshacer | Como en la v2: hasta 10 configuraciones por especialización, código versionado `IRPG2-…`, Recomendado en orden de compra, `Ctrl+Z` |
| Libro | Las habilidades de talento aparecen en el kit base con la etiqueta **TALENTO** o **PARAGON** y su tooltip dice el nodo que la concede |

---

## 10. Motion design

Solo `transform` y `opacity` (más `clip-path` en el arte y `stroke-dashoffset` en las líneas). Curva por defecto `cubic-bezier(.2,.8,.2,1)`.

| Momento | Qué se ve | Duración | Con «reducir movimiento» |
|---|---|---|---|
| Gastar un punto | Pulso, anillo, chispas y líneas hacia los hijos que se abren | 260 / 420 / 500 / 350 ms | Fundido 120 ms |
| Nodo al máximo | Destello dentro del icono | 900 ms | Sin destello |
| Abrir una puerta | El sello se parte; la línea brilla | 480 / 600 ms | Sin animar |
| Elegir (hexágono) | Mitades que salen del centro; al elegir, el nodo gira | 180 / 360 ms | Sin desplazamiento ni giro |
| Quitar o deshacer | El nodo se encoge y vuelve | 220 ms | Fundido 120 ms |
| **Revelar el Paragon** (último punto de especialización) | 0 ms: se gasta el punto (pulso y chispas) · 0–420 ms: «31/31» del Piromante late · 250–870 ms: **barrido de luz** desde el borde del Piromante a lo ancho del Paragon · 300–750 ms: el **candado** se levanta, gira y se desvanece · 550–1000 ms: el **velo gris** se funde · 600–1300 ms: el arte se abre en iris · 700 ms + 30 ms por nodo: el árbol sube nodo a nodo · 1100–1500 ms: aparecen las flechas | ≈ 1,6 s en total | Solo el fundido del velo (200 ms) |
| Cambiar de árbol héroe | Los nodos suben escalonados | 340 ms + 30 ms por nodo | Fundido 120 ms |
| Cambiar de especialización | Fundido cruzado del arte y nodos que bajan | 500 / 380 ms | Fundido 120 ms |
| Iluminar por habilidad | Brillo en los nodos que la tocan; el resto al 22 % | 150 ms | Igual |

Demos en el mockup: `&demo=spend|gate|choice|hover|hoveract|undo|reveal|swap|hl|code` y `&t=<ms>` congela el cuadro.

---

## 11. Migración de guardados (v5 → v6)

Además de los pasos heredados (Anexo A.6):
1. Todos los árboles de la Maga son nuevos → se **liberan** todos los puntos. Se recalculan con `t3earnedAt(nivel)`: clase, especialización, Paragon y tablero.
2. Se aplica el **Recomendado** de su especialización hasta donde alcancen los puntos («Migrado: revisa tus talentos»).
3. `paragon.nodes` se vacía (los glifos vuelven al inventario con su nivel). Campos nuevos: `talents.hero = { tree, nodes, choice }` y `talents.loadouts[spec]`.
4. Habilidades de talento en la barra (`m_t_*`, `m_h_*`): se quitan salvo que el Recomendado elija su opción; la `2` vuelve a la Barrera.
5. Aviso único: «Los talentos de la Maga se rehicieron hasta el nivel 100. Te aplicamos el Recomendado; revísalo con N».
6. Test `tests/test-save-maga2g.mjs`: Nv5, 10, 18, 40, 69, 70, 80 y 100 de cada especialización; idempotente; Guerrero y Arquera intactos.

---

## 12. Banco de balance: impacto y riesgos

| Cambio | Efecto esperado | Calibración |
|---|---|---|
| Nivel máximo 100 y un punto por nivel | La potencia crece hasta el 100, sin escalón | La curva de enemigos `G(AL)` se extiende al 100 en E3 |
| Finales a Nv60–69 | +15–20 % de daño de su arquetipo | Rango 3 calibrable por separado |
| Paragon (Nv70–80) | +10–15 % | Marca del Tiempo (30 %) y el daño del Familiar (50 %) son los números a vigilar |
| Repeticiones (Archimaga, Gemelo, Cráter, Lluvia de Fuego, Marca del Tiempo, Bucle) | Riesgo de que se multipliquen entre sí | Una repetición no genera otra; la Marca no cuenta el daño de otras Marcas; tope de 3 impactos por lanzamiento |
| Cinco habilidades en la ranura `2` | Más opciones en la misma ranura | Solo una cabe; el árbol las ofrece como opción A frente a una pasiva |

**Riesgos.** (1) La clase pesa más que la especialización: los finales de clase son de utilidad o ritmo. (2) Las otras clases siguen con el sistema viejo hasta su rework. (3) El tablero de glifos se retrasa al 81: los glifos se conservan. (4) Quien quite puntos de especialización pierde el efecto del Paragon: el aviso lo dice antes de confirmar.

---

## 13. Criterios de aceptación (comprobables)

| # | Criterio | Cómo se comprueba |
|---|---|---|
| G1 | Ningún nodo de clase toca una habilidad de especialización ni usa `@spec` | Test `test-maga-coherencia` |
| G2 | Solo c11A, c17A, c22A, t4A y f8A conceden habilidades; todas caben solo en la `2` | Test con `fitsSlot` |
| G3 | **Ritmo:** con `t3earnedAt(100)` ningún árbol se completa (clase < 53, Piromante < 59, Paragon < 13, tablero < 81); el último punto de especialización llega al Nv70 | Test |
| G4 | **Presupuesto:** un final cabe al máximo; dos al máximo no; con dos, el ápice no pasa de rango 1 | Test con el algoritmo de `check3.js` |
| G5 | **Paragon:** sin puntos ni efecto mientras la especialización no esté 31/31 gastada; el nodo clave se activa gratis al abrirse | Test |
| G6 | **Forma:** el panel pinta círculo / hexágono / cuadrado según el tipo y si la opción concede habilidad | `?talentscheck=1` + capturas |
| G7 | **Textos:** ninguno contiene «UNI», «ÁREA×5», «TTD», «stagger» ni «proc»; cada `d` cabe en 120 caracteres (el ápice, por rango); cada elección tiene «cuál conviene» | Test |
| G8 | Los 4 loadouts son legales comprando punto a punto (34/31/1+10) | Test |
| G9 | Banco: cada arquetipo gana su escenario; la híbrida ≥ 0,85 de la mejor en los dos | `balance-bench --seeds 5` |
| G10 | Motion con solo `transform`/`opacity`/`clip-path`/`stroke-dashoffset`; respeta `prefers-reduced-motion` | Revisión de CSS |
| G11 | Migración correcta e idempotente | `test-save-maga2g` |
| G12 | `npm test` en verde | `npm test` |

---

## 14. Plan de implementación por etapas

| Etapa | Archivos (propiedad exclusiva) | Entrega |
|---|---|---|
| **E0 · Diseño restante** | `docs/` | Crionte, Arcanista y Escriba Rúnica con este formato; iconos de §7.5 por Codex |
| **E1 · Motor** | `js/talents.js` (ritmo `t3earnedAt`, puertas, finales, ápice, Paragon con desbloqueo por especialización), `js/talents-ops.js`, `js/save-schema.js` (v6), `js/game-skills.js` (repeticiones) | G3, G4, G5, G8, G11 |
| **E2 · Datos de la Maga** | `js/talents-maga.js`, `js/powers-maga.js`, `js/skills-maga.js`, `js/hero-maga.js` (nuevo) | G1, G2, G7 |
| **E3 · Banco** | `tests/balance-bench.mjs` (loadouts por arquetipo, escenario mixto, curva hasta el 100) | G9 |
| **E4 · Interfaz** | `js/ui-talents.js`, `css/talents.css`, `js/data.js` (`PARAGON_BOARD`) | G6, G10 |
| **E5 · Cierre** | `tests/test-save-maga2g.mjs`, `MEMORIA.md`, `CLAUDE.md`, `sw.js` | `npm test` en verde, push a las dos ramas |

---

## 15. Mockup, capturas y refutaciones (v3)

### 15.1 Uso

`docs/mockups/skills-ux.html?cls=maga&view=talents`. Parámetros: `&res=1366|1920`, `&lvl=5|10|18|40|60|69|70|80|100`, `&loadout=brasa|cataclismo|ignicion|hibrido`, `&tipnode=cls:c17|spec:s10|hero:f8`, `&tipskill=m_h_constructo`, `&alt=1`, `&rm=1`, `&demo=…&t=<ms>`. El selector de nivel reaplica la configuración elegida a ese nivel.

Capturas en `C:\Users\juanm\AppData\Local\Temp\claude\D--Proyectos-IntentoRPG\6ead5cf3-f7a8-4c53-8c4f-4d18d352840c\scratchpad\maga-v3\`:

| Captura | Muestra |
|---|---|
| `final_tal_hibrido_100_1920.png` | Nv100 completo: 34/34, 10/10 + tablero 16/16, 31/31; círculos, hexágonos y el cuadrado de Llamar Constructo |
| `final_tal_cataclismo_eleccion_1920.png` | Hexágono de s10 abierto en dos mitades y tooltip «A, contra grupos… B, contra jefes» |
| `final_tal_ignicion_c17_1366.png` | Elección con habilidad: opción A cuadrada «HABILIDAD» (Inversión del Tiempo) frente a la B circular |
| `final_tal_paragon_f8_1920.png` | Paragon Invocadora: Llamar Constructo (cuadrado) frente a Fragua Rúnica (círculo) |
| `final_tal_gris_69_1366.png` | Nv69: Paragon en gris, «Gasta tus 31 puntos de especialización (30/31)», «El último punto se gana al nivel 70» y el avance de los dos árboles |
| `final_tal_gris_40_1366.png` | Nv40: 15/34 y 16/31, Paragon en gris (16/31) |
| `final_tal_alt_1366.png` | `Alt`: etiquetas M/N y tooltip del final Combustión Perpetua con su coste y el texto nuevo |
| `final_libro_100_1366.png` | Libro con Llamar Constructo en el kit base (cuadrado, etiqueta PARAGON) |
| `motion_<momento>.gif` y `_cuadros.png` | reveal, hoveract, spend, choice, gate, undo, swap (cuadros en `frames\<momento>\`) |

### 15.2 Refutaciones (tres rondas)

**Ronda 1** (`r1_*.png`).

| Crítica | Cambio |
|---|---|
| La cabecera del Paragon se cortaba («Se abre con la especialización a…») y su emblema salía aplastado | Texto corto («Espec. X/31») y emblema sin encoger |
| Los nodos clave (Ignición, clave del héroe) seguían octogonales: una regla vieja ganaba en especificidad | Círculo forzado para todo pasivo |
| El libro no mostraba la habilidad del Paragon con la configuración aplicada desde la URL, y las habilidades de talento salían redondas | El libro se redibuja tras aplicar la configuración; toda habilidad es cuadrada, con etiqueta PARAGON o TALENTO |
| La marca «HABILIDAD» del flotante tapaba el icono | Pastilla bajo la mitad |

**Ronda 2** (cuadros de la revelación).

| Crítica | Cambio |
|---|---|
| El candado no se veía durante la revelación: la animación de las flechas también ocultaba el SVG del candado | La animación se limita a las flechas (`.t3can > svg`) |
| La revelación terminaba en un árbol entero gris (a Nv70 no hay puntos de Paragon): sin recompensa visible | El **nodo clave es gratis** al abrirse; la revelación termina con la clave encendida y «1.er punto al Nv71» |
| Las builds compraban en un orden imposible (puertas sin abrir) | Compra punto a punto en el orden de la build, validada por `check3.js` |

**Ronda 3** (`final_*.png`). Se usó porque la segunda encontró problemas reales.

| Crítica | Cambio |
|---|---|
| En el libro, la etiqueta «PARAGON» de Llamar Constructo quedaba cortada por el icono de categoría | Etiqueta a la derecha, por encima, más compacta |
| El nivel de Contrahechizo en el libro (Nv37) no coincidía con el primer nivel en que se puede comprar su nodo | Nv31 en el libro y en el doc |

Quedan menores: los iconos de los árboles héroe son de reemplazo (§7.5) y el tooltip puede tapar parte del árbol a 1366 (sigue al cursor).

---

## 16. Preguntas para el dueño (antes de E0)

1. ¿El Paragon vuelve a gris si quitas un punto de especialización (propuesta) o queda abierto para siempre una vez conseguido?
2. ¿Los 4 puntos de clase tardíos (85/90/95/100) o 4 puntos más de tablero?
3. ¿Cronomante e Invocadora para el Piromante, o prefieres cambiar alguno por Escriba Rúnica?

---

## Anexo A. Lo que sigue vigente de la v1

### A.1 Investigación de la v1 (consultada el 2026-10-20)

| Fuente (fecha) | Juego | Qué tomamos |
|---|---|---|
| [Wowhead: alfa de Midnight (2025-10-01)](https://www.wowhead.com/ptr-2/news/midnight-alpha-development-notes-378688) | WoW Midnight | El árbol de clase no lleva daño elemental fuerte; menos botones |
| [Icy Veins: Mago de Fuego en Midnight](https://www.icy-veins.com/wow/fire-mage-midnight-guide) | WoW Midnight | Combustión ligada al recurso |
| [DiabloBytes: rework del árbol (2026-04-28)](https://www.diablobytes.com/diablo-iv/guides/skill-tree-rework/) y [la división (2026-04-30)](https://diablobytes.com/diablo-iv/news/2026-04-30-diablo-4-lord-of-hatreds-allnew-class-skill-trees-divided/) | Diablo 4 | La forja transforma; ningún arquetipo pierde su pieza central |
| [Maxroll: Last Epoch (2026-03-27)](https://maxroll.gg/last-epoch/resources/passives-and-skills) · [AFK Gaming](https://afkgaming.com/gaming/general/a-guide-to-unlocking-mastery-classes-in-last-epoch) | Last Epoch | Kit de especialización que solo existe con ella |
| [PoE Vault (2025-12)](https://www.poe-vault.com/poe2/news/path-of-exile-2-updates-all-ascendancies-ahead-of-druid) · [Mobalytics (2026-05-23)](https://mobalytics.gg/blog/path-of-exile/12-classes-and-36-ascendancies/) | PoE 2 | Evitar «todo para todos» |
| [Maxroll: Ark Passive (2024-11-29)](https://maxroll.gg/lost-ark/news/ark-passive-changes-kr-11-27) | Lost Ark | La mecánica de identidad (Calor) como pegamento |

### A.2 Auditoría (resumen)

Hoy la Maga tiene **30 activas** (14 en el libro y 16 concedidas por talentos). Las tres especializaciones comparten un libro con lo fuerte de los tres elementos; cuatro talentos repiten una variante (Carámbanos, Cadena de Rayos, Misiles Arcanos, Ventisca); tres nombres chocan (Fénix, Singularidad, Combustión); un nodo de clase depende de la especialización (`@spec`). La matriz completa por habilidad está en el commit `993cefc` (§2.1 de la v1).

### A.3 Modelo de capas

| Capa | Qué es | Qué contiene |
|---|---|---|
| **Kit base de la Maga** | Lo que sabe toda Maga desde el Nv1 | Dardo Arcano, Bola de Fuego (100 %), Nova de Hielo (Nv8), Parpadeo (Nv4), Barrera de Maná (Nv6) |
| **Kit de especialización** | Llega al elegirla (Nv10) y por nivel | Piromante: Llamarada (insignia, `3`, Nv10), Estela Ígnea (`1`, Nv12), Meteoro (`DER/2`, Nv14), Supernova (`4`, Nv15) |
| **Talentos (v2)** | Clase · Paragon · Especialización | §4, §7 y §5. Habilidades de talento solo por c11A / c17A / c22A (clase) y t4A / f8A (Paragon) |
| **Forja** (2f) | Mejora + 2 variantes por habilidad | Transforma; el talento no la repite (§8) |

Ranuras del Piromante: `IZQ` Dardo (Saeta Ígnea ★) · `DER` Bola o Meteoro · `1` Parpadeo o Estela · `2` flexible (Barrera, Nova, Bola, Meteoro o la activa de clase elegida) · `3` Llamarada · `4` Supernova. Pasiva de la especialización: **explosión de la Bola 100 → 350 %** (la aplica Ignición). Mecánica: **Calor** (+5 por golpe de Fuego; a 100, Ignición Total; −10/s tras 3 s).

### A.4 Regla forja frente a talento

| Va en la **forja** | Va en el **talento** |
|---|---|
| Forma (cono, anillo, proyectil, canalizado), geometría con contrapartida, elemento y tags, ritmo (cargas, preparación), papel | Números que se notan, efectos añadidos (charco, explosión al matar, cura), **ecos** (repetir el lanzamiento), la mecánica de la especialización, sinergias entre habilidades, economía y supervivencia |

Prohibido: un talento que cambie forma, elemento, rebote, perforación o cargas; una variante que dependa de la mecánica de una especialización; dos cosas con el mismo nombre en la clase.

### A.5 Esbozo de Crionte y Arcanista

| | Crionte (control) | Arcanista (un objetivo) |
|---|---|---|
| Kit | Prisión de Hielo (`3`) · Paso de Escarcha (`1`) · Lanza de Hielo (`DER/2`) · Tormenta Glacial (`4`) | Orbe Arcano (`3`) · Sello del Archimago (`2`) · Rayo (`DER/2`) · Desgarro Arcano (`4`) |
| Árboles héroe | Escarcha Ardiente · Tejehechizos | Señora del Sol · Tejehechizos |
| Sale | Ventisca, Aliento Boreal, Toque Gélido, Armadura de Hielo, Carámbanos, Témpano | Misiles Arcanos, Evocación, Arco Voltaico, Sobretensión |

### A.6 Migración heredada de la v1 (barra, forja, soportes)

- Barra: `m_t_parpadeo` → `m_parpadeo`; `m_t_barrera`, `m_armadura`, `m_onda` → `m_barrera`; `m_ascua`, `m_toque` → `m_dardo`; `p_combustion` → `p_llamarada`; `p_muro_fuego` → `m_barrera` (`2`) o `p_llamarada` (`3`); lo que exige otra especialización cae al kit base de su ranura.
- Forja: Ascua → Dardo `i` (Saeta Ígnea); Toque Gélido → Dardo `ii`; Armadura `i`/`ii` → Barrera `i`/`ii`; Estela `ii` (Fénix) → `null`.
- Soportes engarzados en habilidades borradas vuelven a `knownSupports`.

### A.7 Catálogo y forja del Piromante (vigentes; referenciados desde 2f)

#### Catálogo (v1 §4.1)

`WD` = daño de arma. Coeficientes como en `skills-maga.js`. Rango por nivel sin cambios.

| id | Nombre | Dueño · categoría · ranura | Nv | Coef. | Coste · enfr. | Efecto (línea del libro) | Cambio respecto de hoy |
|---|---|---|---|---|---|---|---|
| `m_dardo` | Dardo Arcano | base · básico · `IZQ` | 1 | 1,05 | +3 maná · cadencia 1,1 s | Dardo arcano a distancia; recupera Maná al impactar | Ninguno. La Mejora ya no da maná (lo da el árbol de clase) |
| `bola_fuego` | Bola de Fuego | base · gastadora · `DER/2` | 2 | 2,2 + **1,0** a 2 m | 18 · 1,5 s · prep. 0,3 s | Esfera ardiente que explota a 2 m | **Salpicadura 3,5 → 1,0** en el kit base. El Piromante la recupera (3,5) con su pasiva |
| `nova_hielo` | Nova de Hielo | base · gastadora · `DER/2` | **8** (era 14) | 1,4 r 3,3 | 25 · 4 s | Onda gélida que ralentiza 30 % 3 s | Pasa al kit base y se aprende antes |
| `m_parpadeo` | Parpadeo | base · movilidad · `1` | **4** | — | — · **12 s** | Teletransporte de 8 m al cursor; atraviesa enemigos | **Nuevo id** (era `m_t_parpadeo`, talento c3). Enfriamiento 15 → 12 s para competir con Estela (10 s) |
| `m_barrera` | Barrera de Maná | base · defensa · `2` | **6** | — | — · 20 s | Escudo del 60 % del maná máximo durante 8 s | **Nuevo id** (era `m_t_barrera`, talento c2) |
| `p_llamarada` | Llamarada | Piromante · insignia · `3` | 10 | 1,5 cono 7 m 70° | 25 · 8 s · prep. 0,1 s | Cono de fuego que detona las Quemaduras (60 % de lo que les queda) | Pasa al libro (`spec:'piromante'`). Ya no la concede s0. **Gana forja** |
| `m_estela_ignea` | Estela Ígnea | Piromante · movilidad · `1` | 12 | 0,4/s × 3 s | — · 10 s | Desliz de 6 m dejando fuego | Solo con Piromante |
| `meteoro` | Meteoro | Piromante · gastadora · `DER/2` | 14 | 3,7 r 3 | 40 · 6 s · cae a 0,6 s | Meteoro sobre la zona | Solo con Piromante |
| `m_u_supernova` | Supernova | Piromante · definitiva · `4` | 15 | 3 × 4,7 + Quemadura 12 en 6 s | — · 50 s | Estrella que estalla en 3 ondas y quema | Solo con Piromante. Es la definitiva del Piromante |

**Pasiva de la especialización** («innata», no es un nodo): **la explosión de la Bola de Fuego sube del 100 % al 350 %**.
- La aplica `p_ignicion` (nodo gratis s0) con `modifyResolve` sobre `bola_fuego`, sin motor nuevo.
- Se ve como chip en la forja, en el tooltip de la Bola y en la sección del Piromante del libro.

**Mecánica: Calor** (sin cambios en `spec-mechanics.js`; el disparo de Combustión (s23) lo hace su propio poder):
- **Generar:** +5 por golpe de Fuego, una vez por instante.
- **Descargar:** a 100, Ignición Total: la siguiente Bola de Fuego o Meteoro es gratis y crítica.
- **Pérdida:** −10/s tras 3 s sin ganar.

#### Forja del kit (v1 §4.2; Mejora Nv+3 · variantes Nv+6)

| Habilidad | Mejora | Variante I | Variante II |
|---|---|---|---|
| Dardo Arcano | **Dardo Veloz**: +40 % de velocidad del proyectil y +2 m de alcance | **Saeta Ígnea** · ÁREA: se vuelve de Fuego y estalla a 1,5 m (30 %). `★elem fire · ★set{splash:.3, radius:1.5}`. Absorbe a Ascua | **Saeta Gélida** · CONTROL: se vuelve de Hielo; ralentiza 20 % 1,5 s, −10 %. Absorbe a Toque Gélido |
| Bola de Fuego | Núcleo Inestable: explosión 2 → 2,6 m | Pirodardo · UNI | Racimo · ÁREA (como 2f) |
| Nova de Hielo | Escarcha Profunda: 30 → 40 % | Corazón de Hielo · AGUANTE | Nova Fracturante · UNI (como 2f) |
| Parpadeo | **Salto Largo**: 8 → 10 m | **Doble Parpadeo** · MOVILIDAD: 2 cargas (12 s cada una). `★charges 2` | **Parpadeo Disruptor** · CONTROL: al llegar empuja 3 m y aturde 0,5 s (80 %). `behavior v_parpadeo_onda` = el `m_onda` de hoy. Absorbe a Onda Repulsora |
| Barrera de Maná | **Burbuja Estable**: 8 → 10 s | **Barrera Gélida** · CONTROL: se vuelve de Hielo; al romperse congela 1,5 s a 3 m. `★power v_reactiva`. Absorbe a Armadura Reactiva | **Coraza Arcana** · UNI: mientras aguanta, +15 % de daño de hechizos. `★power v_coraza_arcana` |
| Llamarada | **Llama Ancha**: cono 70 → 90° | **Lanza de Llamas** · UNI: cono de 25° y 10 m, +50 %. `★set{angle:25, radius:10} · dmg +50` | **Erupción** · ÁREA: anillo de 5 m a tu alrededor, −15 %. `★set{type:area, at:self, radius:5}` |
| Estela Ígnea | Rastro Ardiente: 3 → 4 s | Senda de Llamas · ÁREA | **Muro de Llamas** · CONTROL: el rastro corta el paso 3 s (no a jefes), −50 % de daño. Campo `p_muro_fuego` con `blocks`. Absorbe a Muro de Fuego. **Sustituye a «Fénix»** |
| Meteoro | Puntería Ígnea | Lluvia de Meteoritos · ÁREA | Meteoro Ancestral · UNI (como 2f; no choca con Pira) |
| Supernova | Gravedad Solar | Sol Errante · ÁREA | Colapso · UNI (como 2f) |

Variantes recomendadas del Piromante: Dardo **I**, Bola **II**, Llamarada **II**, Meteoro **I** y Supernova **I**. Ninguna apaga el Calor (regla 7 de §7 de 2f).

