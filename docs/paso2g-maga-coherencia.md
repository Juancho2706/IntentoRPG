# Paso 2g: coherencia de la Maga, v4 (talentos estilo WoW para las tres especializaciones), documento de diseño

> Estado: **diseño v4**, sin código del juego. Fecha: 2026-10-20. Alcance: **la Maga completa**: árbol de clase, **Piromante, Crionte y Arcanista** (kit, árbol, barra de mecánica y builds), Paragon (Cronomante, Invocadora y Escriba Rúnica, más el tablero de glifos) y ritmo de puntos hasta el **nivel 100**. Termina con la **plantilla para otras clases** (§17), que usará el diseño del Guerrero y la Arquera.
> Mockup: `docs/mockups/skills-ux.html` (clase Maga; vista Talentos con `N` o `&view=talents`; **Cambiar** abre el selector de especialización). Pasó **tres rondas de refutación** con capturas (§15).
> **Fuente única de datos:** el bloque `TALENTS_V2` / `BUILDS_V2` / `t3earnedAt` del mockup. Las tablas de §3–§7 se **generan** desde ese bloque.
> Historia: v1 (`993cefc`) rechazada · v2 (`b962487`) «por buen camino» · v3 (`302dfd7`) aprobada como dirección · **v4**: Crionte y Arcanista completos y correcciones del dueño (§0).

## 0. Historial

| Versión | Qué era | Qué dijo el dueño |
|---|---|---|
| v1 | Dos árboles pequeños de pasivas | Rechazada: no se parecía a WoW y las elecciones no pesaban |
| v2 | Tres columnas (clase · Paragon · Piromante), finales potentes, arquetipos, híbrida | «Vamos por buen camino», con cambios |
| v3 | Nivel 100 sin árboles completos, Paragon en gris hasta la especialización al máximo, árboles héroe de la clase, formas por tipo, textos nuevos | Aprobada como dirección |
| **v4** | **Crionte y Arcanista completos**, Escriba Rúnica detallada, «Principal» en lugar de «Gastadora», hexágono que no tapa el icono | — |

**Decisiones sobre las preguntas de la v3** (delegadas por el dueño):

| Pregunta | Decisión |
|---|---|
| ¿El Paragon vuelve a gris si bajas un punto de especialización? | **Sí.** Sus puntos y nodos se conservan, pero no hacen efecto. Se reactivan al recuperar el 31/31. Lo avisa un mensaje suave y la columna muestra «Paragon en pausa» (§7.1) |
| ¿Los niveles 85, 90, 95 y 100? | Dan punto de **clase** |
| ¿Qué árboles héroe tiene el Piromante? | **Cronomante e Invocadora.** La Escriba Rúnica es del Crionte y del Arcanista |

**Pedidos de la v4 y cómo se aplican:**

| Pedido | Dónde |
|---|---|
| Crionte y Arcanista al nivel del Piromante: kit, árbol de 29 nodos con 3 arquetipos, finales, ápice, textos con números, formas, builds con híbrida y barra de mecánica | §5.2 y §5.3 |
| Escriba Rúnica e Invocadora detalladas | §7.3 y §7.4 |
| Revisar que el árbol de clase sirva igual a las tres | §4.1: **c6** deja de ser de la Bola de Fuego y pasa a tocar a todas las habilidades principales |
| Selector de especialización funcionando para las 3 | Botón **Cambiar** en el panel de talentos (§9.3) |
| «Gastadora» → **«Principal»**; revisar las otras categorías | §9.4 |
| El flotante del hexágono va **arriba** del icono; el clic derecho sobre el icono quita el punto | §9.2 y §15 (prueba con capturas) |
| Plantilla para otras clases | §17 |

## 1. Resumen (15 líneas)

1. Nivel máximo **100**, un punto por nivel desde el 10: especialización en los pares 10–70 (31), clase en los impares 11–69 y en 85/90/95/100 (34), Paragon del 71 al 80 (10) y tablero de glifos del 81 al 100 (16).
2. Ningún árbol se completa: clase 64 %, especialización 53 %, Paragon 11 de 13 nodos y tablero 20 %.
3. **Las tres especializaciones comparten rejilla:** 29 nodos, las mismas filas, columnas, rangos, requisitos y puertas. Cambia el contenido; el presupuesto y la lectura son idénticos.
4. **Piromante** (daño en área, Calor): Brasa, Cataclismo e Ignición.
5. **Crionte** (control, Escarcha por enemigo): **Glaciar** (congelar a todos), **Fractura** (hacer añicos a los Congelados) y **Tormenta** (la Tormenta Glacial que no se acaba).
6. **Arcanista** (un objetivo, Cargas Arcanas): **Rayo** (gastar Cargas en golpes enormes), **Orbe** (orbes que rebotan y se quedan) y **Grieta** (canalizar el Desgarro Arcano).
7. Cada especialización trae 4 habilidades con forja (Mejora + 2 variantes), una pasiva y su **barra de mecánica** real (la de `js/ui-gauges-maga.js`), visible en el libro.
8. Cuatro builds por especialización (12 en total), una **híbrida** en cada una, validadas comprando punto a punto hasta el Nv100.
9. Árbol de clase igual para las tres: la elección c6 ahora potencia a **todas** las habilidades principales (antes solo la Bola de Fuego).
10. Paragon: Cronomante (Piromante y Arcanista), Invocadora (Piromante y Crionte) y **Escriba Rúnica** (Crionte y Arcanista), con sus mecánicas para cualquier elemento.
11. El Paragon **queda en pausa** si bajas de 31/31 en especialización: se guardan sus nodos y vuelven a funcionar al recuperarlo.
12. «Gastadora» pasa a **«Principal»**, «Especialización» (categoría) a **«Insignia»** y «Básico» a **«Básica»**. Nota de implementación para `skill-defs.js` y `hud-model.js`.
13. Hexágono: las dos opciones aparecen **sobre** el nodo sin taparlo; clic derecho en el icono quita el punto; clic en el icono compra con la última opción.
14. Seis habilidades salen de talentos, todas para la ranura `2`: Bloque de Hielo, Inversión del Tiempo y Contrahechizo (clase); Detener el Tiempo, Llamar Constructo y Palabra de Poder (Paragon).
15. §17 deja la **plantilla** para el Guerrero y la Arquera: rejilla, ritmo, puertas, formas, reglas de texto, arquetipos y criterios.

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

| Nv | Kit base | Piromante | Crionte | Arcanista | Talentos |
|---|---|---|---|---|---|
| 1 | Dardo Arcano | | | | — |
| 2 | Bola de Fuego (100 %) | | | | — |
| 4 | Parpadeo | | | | — |
| 6 | Barrera de Maná | | | | — |
| 8 | Nova de Hielo | | | | — |
| **10** | | Llamarada (`3`) · Bola al 350 % | Prisión de Hielo (`3`) | Orbe Arcano (`3`) · el Dardo da Cargas | Nodo clave gratis + 1.er punto de especialización |
| 11 | | | | | 1.er punto de clase |
| 12 | | Estela Ígnea (`1`) | Paso de Escarcha (`1`) | Sello del Archimago (`2`) | |
| 14 | | Meteoro (`DER/2`) | Lanza de Hielo (`DER/2`) | Rayo (`DER/2`) | |
| 15 | | Supernova (`4`) | Tormenta Glacial (`4`) | Desgarro Arcano (`4`) | |

El kit base llena `IZQ`, `DER`, `1` y `2` del Nv1 al 9 y coincide con lo aprobado (Anexo A.3). Al elegir especialización, su insignia ocupa la `3` sola; el resto se ofrece con ★. El Arcanista no trae movilidad: usa Parpadeo. Las habilidades de talento llegan cuando su nodo se puede comprar: Bloque de Hielo ≈ Nv21, Inversión del Tiempo ≈ Nv27, Contrahechizo ≈ Nv31; las del Paragon desde el Nv72.

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
| 1 | c5 | Dardo: Certero o Sifón | ⬡ elección | mecánica | 1 | c1 o c2 | **A · ○ Dardo Certero**: Cada 4.º Dardo Arcano es crítico seguro _(contra jefes)_<br>**B · ○ Dardo Sifón**: Si el Dardo mata, ganas 6 de maná y tus habilidades principales se recargan 1 s antes _(contra grupos)_ | A, contra jefes: un crítico seguro cada ~4 s. B, contra grupos: como mueren muchos, ≈1 habilidad principal extra cada 8 s |
| 1 | c6 | Principal: Núcleo u Onda | ⬡ elección | número | 1 | c2 o c3 | **A · ○ Núcleo Denso**: El golpe directo de tus habilidades principales hace +25 % _(contra jefes)_<br>**B · ○ Onda Expansiva**: Las explosiones y áreas de tus habilidades principales hacen +30 % _(contra grupos)_ | A, contra jefes (un solo blanco recibe el golpe). B, contra grupos (el área golpea a todos). Sirve igual con Fuego, Hielo o Arcano |
| 1 | c7 | Paso Fugaz | ○ pasiva | mecánica | 1 | c3 | Después de Parpadeo corres un 30 % más rápido durante 3 s |  |
| 2 | c8 | Piel de Maná | ○ pasiva | número | 2 | c4 o c5 | Rango 2: Con más de la mitad del maná, recibes un 16 % menos de daño |  |
| 2 | c9 | Nova: Congelante o Cortante | ⬡ elección | mecánica | 1 | c5 o c6 | **A · ○ Nova Congelante**: La Nova de Hielo congela 1 s (no a jefes); como mucho una vez cada 8 s _(control)_<br>**B · ○ Nova Cortante**: La Nova de Hielo hace +40 % de daño, pero ralentiza 1 s menos _(contra grupos)_ | A, para controlar y sobrevivir: congelas al grupo un 8–12 % del tiempo. B, para matar grupos más rápido |
| 2 | c10 | Ralentizar o Disrupción | ⬡ elección | mecánica | 1 | c6 o c7 | **A · ○ Ralentizar**: Cada 8 s, tu siguiente hechizo ralentiza un 50 % durante 4 s _(control)_<br>**B · ○ Disrupción**: Cada 10 s, tu siguiente Dardo corta el hechizo del enemigo y lo deja mudo 3 s _(contra jefes)_ | A, contra grupos que te rodean. B, contra jefes y élites que lanzan hechizos (además llena su barra de Quebranto) |
| 3 | c11 | Bloque de Hielo o Aguante | ⬡ elección | mecánica | 1 | c8 | **A · □ Bloque de Hielo** (habilidad): Habilidad (ranura 2): te encierras en hielo 4 s; no recibes daño ni te mueves. Se recarga en 90 s _(supervivencia)_<br>**B · ○ Aguante Arcano**: Un golpe que te mataría te deja con 1 de vida y una Barrera gratis. Una vez cada 120 s _(supervivencia)_ | A, contra golpes de jefe que se ven venir (ocupa la ranura 2). B, siempre activo y sin ocupar ranura |
| 3 | c12 | Flujo de Maná | ○ pasiva | número | 2 | c8 o c9 | Rango 2: Cada golpe te devuelve 4 de maná |  |
| 3 | c13 | Mente Afilada | ○ pasiva | número | 2 | c9 o c10 | Rango 2: +10 % de probabilidad de crítico |  |
| 3 | c14 | Parpadeo: Runa o Reparo | ⬡ elección | mecánica | 1 | c10 | **A · ○ Runa de Escarcha**: Donde empieza tu Parpadeo queda una runa que ralentiza un 50 % durante 3 s _(control)_<br>**B · ○ Parpadeo Reparador**: Parpadeo te cura un 8 % de la vida y te quita las ralentizaciones _(supervivencia)_ | A, para escapar de enemigos cuerpo a cuerpo. B, para aguantar peleas largas |
| 4 | c15 | Escudo de Maná o Mente Clara | ⬡ elección | mecánica | 1 | c11 o c12 | **A · ○ Escudo de Maná**: El 20 % del daño que recibes lo pagas con maná en vez de vida _(supervivencia)_<br>**B · ○ Mente Clara**: Recuperas maná un 30 % más rápido; con el maná lleno, haces +10 % de daño _(contra jefes)_ | A, para sobrevivir (+15–20 % de aguante). B, para hacer daño (+6–8 %: lanzas más habilidades principales) |
| 4 | c16 | Armonía o Pureza Elemental | ⬡ elección | mecánica | 1 | c12 o c13 | **A · ○ Armonía Elemental**: Cada vez que cambias de elemento: +8 % de daño 5 s (se suma hasta 3 veces) _(contra jefes)_<br>**B · ○ Pureza Elemental**: 3 hechizos seguidos del mismo elemento: +15 % de daño de ese elemento durante 6 s _(contra grupos)_ | A, si mezclas elementos (Dardo Arcano + Fuego + Nova): hasta +24 %. B, si todo es del mismo elemento (todo Fuego, todo Hielo o todo Arcano): +15 % casi siempre. Es la pieza que une el árbol con la forja |
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
| 8 | c29 | Archimaga | ○ **FINAL** | mecánica | 3 | c26 | Rango 3: Cada 4.ª habilidad principal se lanza dos veces: la copia es gratis y hace el 80 %<br>_final: Arcano_ |  |
| 8 | c30 | Paso del Vacío | ○ **FINAL** | mecánica | 3 | c27 | Rango 3: Tras Parpadeo, tu siguiente habilidad principal no se recarga y hace +45 %<br>_final: Movilidad_ |  |

**Tres finales:** **Bastión Arcano** (izquierda, defensa: la Barrera se queda puesta y abarata hechizos), **Archimaga** (centro: cada 4.ª principal sale dos veces) y **Paso del Vacío** (derecha: tras Parpadeo, la siguiente principal sin recarga y +45 %).

**Implementación (por nodo):** `c1` stats.mpPct · existe; `c2` mod @all dmg · existe; `c3` mod m_parpadeo cdr · existe; `c4` tv.barrierDr · existe; `c5` A: power m_dardo_certero · NUEVO · B: power m_dardo_sifon · NUEVO; `c6` A: mod @spender dmgDirect · NUEVO (clave) · B: mod @spender splashPct · NUEVO (clave); `c7` power m_paso_fugaz · NUEVO (afterCast + addBuff); `c8` tv.drHighMana · existe; `c9` A: power m_nova_congelante · NUEVO (applyCC freeze) · B: mod nova_hielo dmg/slow · claves existentes; `c10` A: power m_ralentizar · existe · B: power m_disrupcion · NUEVO (lógica de m_t_contrahechizo; +20 de Quebranto a jefes); `c11` A: activa m_t_bloque · existe · B: power m_aguante · NUEVO (onLethal); `c12` stats.mph · existe; `c13` stats.crit · existe; `c14` A: power m_runa · NUEVO (spawnField zona) · B: power m_parpadeo_cura · NUEVO (g.heal); `c15` A: power m_escudo_mana · NUEVO (④ onDamaged) · B: stats regen + tv.highManaDmg · existe; `c16` A: power m_armonia · NUEVO · B: power m_pureza · NUEVO; `c17` A: activa m_t_inversion · existe · B: power m_anclaje · NUEVO (onDamaged); `c18` mod m_barrera shieldManaPct · claves; `c19` power m_barrera_resonante · NUEVO; `c20` power m_escarcha_arcana · NUEVO; `c21` mod @all slow +2 · claves; `c22` A: activa m_t_contrahechizo · existe · B: tv.costRedBig · existe; `c23` tv.dartCritCdr · NUEVO; `c24` stats.aspdPct · existe; `c25` power m_cristal · NUEVO (onShieldBreak); `c26` power m_torrente · NUEVO (⑪ onResource); `c27` power m_imagen · NUEVO (g.forceTarget); `c28` power m_bastion · NUEVO; `c29` power m_archimaga · NUEVO (echo del canal); `c30` power m_vacio · NUEVO.

### 4.1 Revisión: ¿sirve igual a las tres especializaciones?

| Rama / nodo | Piromante | Crionte | Arcanista | Veredicto |
|---|---|---|---|---|
| c5 Dardo (Certero / Sifón) | Saeta Ígnea | Saeta Gélida | Dardo puro (Cargas) | Sirve a las tres |
| **c6** (v3: «Bola: Núcleo u Onda») | Muy bueno | Casi muerto (el Crionte no usa la Bola) | Casi muerto | **Cambiado:** ahora «Principal: Núcleo u Onda» (+25 % al golpe directo o +30 % a las áreas de **todas** las habilidades principales: Bola, Meteoro, Lanza de Hielo, Rayo, Nova) |
| c9 Nova (Congelante / Cortante) | Útil (control) | Muy bueno | Útil (control) | Sirve: la Nova es del kit base de las tres |
| c10, c14, c17, c21 (control y movilidad) | Igual | Igual | Igual | Genéricos |
| c16 Armonía / Pureza | Pureza (todo Fuego) | Pureza (todo Hielo) | Pureza (todo Arcano) o Armonía | Texto generalizado: «todo Fuego, todo Hielo o todo Arcano» |
| c20 Escarcha Arcana (críticos que ralentizan) | Bien | Muy bien | Bien | Híbrido Arcano + Control, sin elemento propio |
| Finales: Bastión, Archimaga, Paso del Vacío | Los tres | Los tres | Los tres | Las 12 builds usan los tres finales de forma repartida (§5) |

Ningún nodo de clase nombra una habilidad de especialización (G1).

---

## 5. Especializaciones (29 nodos cada una, misma rejilla)

Las tres comparten rejilla: mismas filas, columnas, rangos, requisitos y puertas. La izquierda es el arquetipo A, el centro el B y la derecha el C. Así el presupuesto de §3.3 vale igual para las tres y una build legal en una lo es en las otras con sus ids.

### 5.0 Piromante (daño en área · Calor)

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

### 5.1 Los tres arquetipos del Piromante

| Arquetipo | Fantasía | Elección que lo define | Penúltimo → final | Mejor en |
|---|---|---|---|---|
| **Brasa** | El fuego se contagia solo | s8 **Propagación** (grupos) o Brasa Profunda (jefes) | Brasa Viva → **Incendio Forestal** | Grupos y supervivencia |
| **Cataclismo** | Golpes enormes en el sitio justo | s10 **Meteoro Gemelo** (barrido) o Concentrado (martillo) | Cráter → **Lluvia de Fuego** | Grupos con control |
| **Ignición** | Ventanas de crítico que se encadenan | s9 **Llamarada Avivada** (jefes) o Voraz (grupos) | Combustión → **Combustión Perpetua** | Jefes |

Nodos que mezclan arquetipos: **Chispas** (Brasa + Ignición), **Combustible Volátil** (Ignición + Cataclismo), **Brasero** (los tres, por el Calor) y **Ola de Calor**. El ápice **Corazón del Sol** (4 rangos) sirve a los tres.

**Implementación (por nodo):** `s0` power p_ignicion · existe (+ modifyResolve de la Bola); `s1` tv.burnDur · existe; `s2` tv.burningCrit · existe; `s3` mod bola_fuego cdr · existe; `s4` tv.burnPct · existe; `s5` power p_chispas · NUEVO; `s6` power p_volatil · NUEVO (modifyResolve con prof.ignition); `s7` mod meteoro zone · existe; `s8` A: power p_propagacion · existe · B: power p_acumular · existe; `s9` A: power p_llamarada_avivada · existe · B: power p_llamarada_voraz · NUEVO; `s10` A: power p_meteoro_gemelo · NUEVO (echo del canal) · B: power p_meteoro_conc · NUEVO (condAdd); `s11` tv.burnKillHeal + burnKillMana · existen; `s12` tv.critFireCdr · existe; `s13` mod meteoro/supernova dmg · existe; `s14` mod meteoro slow + stagger · claves; `s15` A: power p_fenix · existe · B: power p_escudo_llamas · NUEVO; `s16` power p_brasero · NUEVO (cond con gaugeValue); `s17` power p_estrellas_fugaces · NUEVO; `s18` power p_brasa_errante · NUEVO; `s19` stat gaugeGain:calor · existe; `s20` mod @fire radius · existe; `s21` power p_estela_meteorica · NUEVO; `s22` power p_brasa_viva · NUEVO (onTick); `s23` power p_combustion · existe (+ afterCast con prof.ignition); `s24` power p_crater · NUEVO (campo); `s25` power p_incendio · NUEVO; `s26` power p_perpetua · NUEVO; `s27` power p_lluvia_fuego · NUEVO; `s28` power p_corazon_sol (rangos) · NUEVO sobre el existente.


### 5.2 Crionte (control · Escarcha)

**Fantasía:** congela, ralentiza y hace añicos. **Pasiva:** llenas un 25 % más rápido el Quebranto de los jefes. **Dardo recomendado:** Saeta Gélida (pone capas).

**Kit (libro; forja con Mejora a Nv+3 y variantes a Nv+6):**

| Habilidad | Ranura · Nv | Qué hace | Mejora | Variante I | Variante II |
|---|---|---|---|---|---|
| **Prisión de Hielo** | Insignia `3` · 10 | Encierras en hielo 2 s a los enemigos a 4 m y les pones 2 capas | Celda Amplia: radio 4 → 5 m | **Celda Lejana** (un objetivo): la lanzas a 15 m sobre uno solo, 3 s | **Muralla de Hielo** (control): muro de 8 m que corta el paso 3 s |
| **Paso de Escarcha** | Movilidad `1` · 12 | Te deslizas 6 m dejando hielo 3 s que ralentiza un 40 % y pone 1 capa por segundo | Hielo Duradero: 3 → 4 s | **Paso Doble**: 2 cargas | **Prisión Fugaz**: al llegar, congelas 1 s a 2 m |
| **Lanza de Hielo** | Principal `DER/2` · 14 | Atraviesa en línea 12 m; a los Congelados les hace el triple | Punta Afilada: +2 m y +15 % | **Lanza Pesada** (un objetivo): no atraviesa, +60 % y 2 capas | **Abanico Gélido** (área): 3 lanzas al 50 % |
| **Tormenta Glacial** | Definitiva `4` · 15 | Una ventisca te sigue 8 s: daña cada 0,5 s a 4 m y pone 1 capa por golpe | Ojo Tranquilo: dentro recibes −10 % | **Ventisca Anclada** (área): fija, 6 m | **Granizo** (un objetivo): un pedrisco de 1100 % que congela 2 s |

**Barra de mecánica: Escarcha** (ya existe en `spec-mechanics.js`; se ve en el libro con el widget real):

| Generar | Descargar | Pérdida | La alimentan |
|---|---|---|---|
| +1 capa **por enemigo** por golpe de Hielo; la Nova, +2 | A 5 capas: **Congelado** 1 s. Un jefe queda **Aterido** 4 s (−30 % de movimiento y −15 % de ataque) y suma 25 de Quebranto | 1 capa cada 2 s sin golpearlo | Saeta Gélida, Nova, Prisión, Paso de Escarcha, Lanza, Tormenta |

**Árbol (generado):**

| Fila | Id | Nodo | Forma · tipo | Etiqueta | Rangos | Requiere | Qué hace (al máximo) | Cuál conviene |
|---|---|---|---|---|---|---|---|---|
| 0 | i0 | Escarcha | ○ clave | mecánica | gratis | gratis | Tus golpes de Hielo ponen 1 capa de Escarcha (la Nova, 2). A 5 capas se congela 1 s; un jefe queda Aterido 4 s |  |
| 1 | i1 | Frío Penetrante | ○ pasiva | número | 3 | i0 | Rango 3: Congelado dura 1,6 s (antes 1 s) |  |
| 1 | i2 | Filo Helado | ○ pasiva | número | 3 | i0 | Rango 3: +15 % de crítico contra enemigos con 3 o más capas |  |
| 1 | i3 | Viento Cortante | ○ pasiva | número | 3 | i0 | Rango 3: La Nova de Hielo se recarga en 2,5 s (antes 4 s) |  |
| 2 | i4 | Escarcha Densa | ○ pasiva | número | 2 | i1 | Rango 2: Las capas caen cada 4 s (antes cada 2 s) |  |
| 2 | i5 | Hielo Quebradizo | ○ pasiva | mecánica | 1 | i1 o i2 | Los enemigos Congelados reciben +20 % de daño de todo<br>_híbrido: Glaciar + Fractura_ |  |
| 2 | i6 | Polvo de Diamante | ○ pasiva | mecánica | 1 | i2 o i3 | Al congelar a un enemigo, tu siguiente Lanza de Hielo o Nova no cuesta maná<br>_híbrido: Fractura + Tormenta_ |  |
| 2 | i7 | Tormenta Creciente | ○ pasiva | mecánica | 2 | i3 | Rango 2: La Tormenta Glacial dura 10 s (antes 8 s) y crece un 10 % cada segundo |  |
| 3 | i8 | Prisión: Amplia o Profunda | ⬡ elección | mecánica | 1 | i4 o i5 | **A · ○ Prisión Amplia**: La Prisión de Hielo atrapa a todos a 6 m (antes 4 m) _(contra grupos)_<br>**B · ○ Prisión Profunda**: La Prisión de Hielo atrapa a un solo enemigo 3 s y le hace +80 % _(contra jefes)_ | A, contra grupos: congelas a toda la manada a la vez. B, contra jefes y élites. Decide qué Glaciar juegas |
| 3 | i9 | Lanza: Larga o del Invierno | ⬡ elección | mecánica | 1 | i5 o i6 | **A · ○ Lanza Larga**: La Lanza de Hielo llega a 18 m (antes 12 m) y ralentiza un 30 % a todos los que atraviesa _(contra grupos)_<br>**B · ○ Lanza del Invierno**: Contra Congelados o Ateridos, la Lanza hace el cuádruple (antes el triple) _(contra jefes)_ | A, contra grupos en fila. B, contra jefes: el golpe grande de la Fractura |
| 3 | i10 | Tormenta: Viva o Fría | ⬡ elección | mecánica | 1 | i6 o i7 | **A · ○ Ventisca Viva**: Mientras dura, la Tormenta Glacial suelta una Nova de Hielo cada 2 s _(contra grupos)_<br>**B · ○ Frío Sostenido**: La Tormenta hace +60 % al enemigo con más capas _(contra jefes)_ | A, contra grupos: capas para todos. B, contra jefes. Decide qué Tormenta juegas |
| 4 | i11 | Sangre Fría | ○ pasiva | número | 2 | i8 | Rango 2: Matar a un Congelado te cura un 4 % y te da 6 de maná |  |
| 4 | i12 | Astillas | ○ pasiva | mecánica | 2 | i8 o i9 | Rango 2: Cada crítico de Hielo recarga 1 s de la Lanza y de la Prisión |  |
| 4 | i13 | Frío Intenso | ○ pasiva | número | 2 | i9 o i10 | Rango 2: La Tormenta Glacial y la Nova hacen +30 % de daño |  |
| 4 | i14 | Suelo Helado | ○ pasiva | mecánica | 1 | i10 | La Prisión de Hielo deja el suelo helado 4 s: ralentiza un 40 % y pone 1 capa por segundo |  |
| 5 | i15 | Piel o Cristal | ⬡ elección | mecánica | 1 | i11 o i12 | **A · ○ Piel de Invierno**: Recibes un 15 % menos de daño de enemigos con capas _(supervivencia)_<br>**B · ○ Cristal Protector**: Congelar a un enemigo a 4 m te da un escudo del 5 % de tu vida (una vez cada 3 s) _(supervivencia)_ | A, contra grupos que te rodean. B, contra élites que pegan fuerte |
| 5 | i16 | Invierno Profundo | ○ pasiva | mecánica | 2 | i12 o i13 | Rango 2: Por cada enemigo Congelado a 10 m, tu Hielo hace +10 % (hasta 5 enemigos)<br>_híbrido: Los tres estilos (por las congelaciones)_ |  |
| 5 | i17 | Remolino | ○ pasiva | mecánica | 2 | i13 o i14 | Rango 2: Al terminar el Paso de Escarcha, sueltas una Nova de Hielo al 100 % |  |
| 6 | i18 | Congelación en Cadena | ○ pasiva | mecánica | 2 | i15 | Rango 2: Cuando muere un Congelado, se congelan 2 enemigos a 4 m |  |
| 6 | i19 | Ruptura | ○ pasiva | mecánica | 2 | i15 o i16 | Rango 2: La Lanza hace añicos a un Congelado: +50 % de daño, le quita la congelación y le deja 3 capas |  |
| 6 | i20 | Expansión Glacial | ○ pasiva | número | 2 | i16 o i17 | Rango 2: Todas tus áreas de Hielo son un 30 % más grandes |  |
| 6 | i21 | Ojo Frío | ○ pasiva | mecánica | 1 | i17 | Al acabar, la Tormenta Glacial estalla (200 %) y congela a todos los que tengan 3 o más capas |  |
| 7 | i22 | Glaciar | ○ pasiva | mecánica | 3 | i18 | Rango 3: Al congelar a un enemigo, los que están a 3 m ganan 3 capas |  |
| 7 | i23 | Esquirlas | ○ pasiva | mecánica | 3 | i19 | Rango 3: Hacer añicos a un enemigo suelta 4 esquirlas que hacen el 50 % a los cercanos |  |
| 7 | i24 | Tormenta Perpetua | ○ pasiva | mecánica | 3 | i21 | Rango 3: Cada enemigo que congelas dentro de la Tormenta la alarga 1,5 s (hasta +6 s) |  |
| 8 | i25 | Era Glacial | ○ **FINAL** | mecánica | 3 | i22 | Rango 3: Al congelar a un enemigo, se congelan todos los que tengan capas a 5 m (una vez cada 6 s). Congelado +1 s<br>_final: Glaciar_ |  |
| 8 | i26 | Cero Absoluto | ○ **FINAL** | mecánica | 3 | i23 | Rango 3: Hacer añicos a un Congelado hace un 300 % extra y recarga la Lanza al instante. Críticos de Hielo +30 %<br>_final: Fractura_ |  |
| 8 | i27 | Invierno Eterno | ○ **FINAL** | mecánica | 3 | i24 | Rango 3: La Tormenta Glacial no se acaba mientras haya un Congelado dentro (hasta 20 s). Tormenta +30 %<br>_final: Tormenta_ |  |
| 9 | i28 | Corazón del Invierno | ○ **ÁPICE** | mecánica | 4 | i25 o i26 o i27 | 1) Congelar a un jefe le llena 20 de Quebranto. 2) Matar a un Congelado te da 10 de maná. 3) Bastan 4 capas para congelar (antes 5). 4) Cada 15 congelaciones, la Tormenta Glacial se lanza sola y gratis. |  |

| Arquetipo | Fantasía | Elección que lo define | Penúltimo → final | Mejor en |
|---|---|---|---|---|
| **Glaciar** | Congelar a toda la manada a la vez | i8 Prisión Amplia (grupos) o Profunda (jefes) | Glaciar → **Era Glacial** | Control de grupos, supervivencia |
| **Fractura** | Congelar y **hacer añicos** con la Lanza | i9 Lanza Larga (grupos) o del Invierno (jefes) | Esquirlas → **Cero Absoluto** | Jefes |
| **Tormenta** | La Tormenta Glacial que no se acaba | i10 Ventisca Viva (grupos) o Frío Sostenido (jefes) | Tormenta Perpetua → **Invierno Eterno** | Grupos con control constante |

Híbridos: **Hielo Quebradizo** (Glaciar + Fractura), **Polvo de Diamante** (Fractura + Tormenta), **Invierno Profundo** (los tres) y **Expansión Glacial**. Ápice: **Corazón del Invierno**.

**Implementación (por nodo):** `i0` mecánica escarcha · existe; `i1` tv.freezeDur · NUEVO (clave); `i2` tv.frostCrit · NUEVO (clave); `i3` mod nova_hielo cdr · existe; `i4` tuning escarcha.decayEvery · tv; `i5` power k_quebradizo · NUEVO (condAdd); `i6` power k_polvo · NUEVO; `i7` mod m_u_tormenta durS + power k_crece; `i8` A: mod k_prision radius · claves · B: power k_prision_profunda · NUEVO; `i9` A: mod k_lanza range + slow · claves · B: power k_lanza_invierno · NUEVO (condAdd); `i10` A: power k_ventisca_viva · NUEVO (onTick) · B: power k_frio_sostenido · NUEVO (condAdd); `i11` tv.frozenKillHeal · NUEVO (clave); `i12` tv.critFrostCdr · NUEVO (copia de critFireCdr); `i13` mod dmg · claves; `i14` campo k_suelo · NUEVO; `i15` A: tv.drVsLayered · NUEVO · B: power k_cristal · NUEVO (g.shield); `i16` power k_invierno · NUEVO (condAdd); `i17` power k_remolino · NUEVO (afterCast); `i18` power k_cadena · NUEVO (onKill); `i19` power k_ruptura · NUEVO; `i20` mod @frost radius · claves; `i21` power k_ojo_frio · NUEVO; `i22` power k_glaciar · NUEVO; `i23` power k_esquirlas · NUEVO; `i24` power k_perpetua · NUEVO; `i25` power k_era_glacial · NUEVO; `i26` power k_cero · NUEVO; `i27` power k_eterno · NUEVO; `i28` power k_corazon_invierno (rangos) · NUEVO.

**Builds (Nv100):**

*«Era Glacial» (Glaciar) · Paragon Escriba Rúnica*
- **Clase (34/34):** Reservas Profundas 2 · Escudo Prismático 3 · Dardo Sifón (B) 1 · Piel de Maná 2 · Aguante Arcano (B) 1 · Escudo de Maná (A) 1 · Barrera Resonante 1 · Canalizador (B) 1 · Intelecto Arcano 2 · Flujo de Maná 2 · Nova Cortante (B) 1 · Pureza Elemental (B) 1 · Barrera Reforzada 2 · Mente Afilada 2 · Onda Expansiva (B) 1 · Ralentizar (A) 1 · Cristal de Barrera 3 · Bastión Arcano 3 · Reflejos Arcanos 2 · Paso Fugaz 1 · Runa de Escarcha (A) 1
- **Crionte (31/31):** Escarcha (gratis) · Frío Penetrante 3 · Escarcha Densa 2 · Hielo Quebradizo 1 · Prisión Amplia (A) 1 · Sangre Fría 2 · Piel de Invierno (A) 1 · Congelación en Cadena 2 · Glaciar 3 · Era Glacial 3 · Corazón del Invierno 4 · Filo Helado 3 · Lanza Larga (A) 1 · Astillas 2 · Invierno Profundo 2 · Viento Cortante 1
- **Paragon:** Escriba Rúnica: Runas (gratis) · Sello Explosivo (B) · Tinta de Maná · Tinta Elemental · Caligrafía Rápida · Doble Sello · Círculo Protector (B) · Palimpsesto · Gran Grimorio · Runa Guardiana (B) · Tinta Duradera — 10/10; quedan fuera Inspiración y Concentración
Rotación: Prisión Amplia en el centro de la manada (2 capas a todos) → Nova (+2) → la manada se congela; **Era Glacial** congela a todo lo que tenga capas a 5 m y **Glaciar** reparte capas al resto. Lanza a los que queden. El Sello de la Escriba (Sello Explosivo) se forma sobre la manada congelada. Bastión Arcano mantiene la Barrera.

*«Invierno Eterno» (Tormenta) · Paragon Invocadora*
- **Clase (34/34):** Intelecto Arcano 2 · Reflejos Arcanos 2 · Onda Expansiva (B) 1 · Paso Fugaz 1 · Ralentizar (A) 1 · Runa de Escarcha (A) 1 · Anclaje Temporal (B) 1 · Escarcha Arcana 1 · Celeridad 2 · Reservas Profundas 2 · Dardo Sifón (B) 1 · Nova Cortante (B) 1 · Flujo de Maná 2 · Mente Afilada 2 · Pureza Elemental (B) 1 · Escarcha Tenaz 1 · Ritmo Arcano 2 · Imagen Arcana 3 · Paso del Vacío 3 · Piel de Maná 2 · Escudo Prismático 2
- **Crionte (31/31):** Escarcha (gratis) · Viento Cortante 3 · Tormenta Creciente 2 · Polvo de Diamante 1 · Ventisca Viva (A) 1 · Frío Intenso 2 · Suelo Helado 1 · Remolino 2 · Ojo Frío 1 · Tormenta Perpetua 3 · Invierno Eterno 3 · Corazón del Invierno 4 · Filo Helado 3 · Lanza Larga (A) 1 · Invierno Profundo 2 · Expansión Glacial 2
- **Paragon:** Invocadora: Familiar Arcano (gratis) · Enjambre (B) · Imitación · Detonar Constructo · Sobrecarga · Eco Elemental · Fragua Rúnica (B) · Hilo de Maná · Legión · Guardián (A) · Vínculo — 10/10; quedan fuera Aprendiz y Constructo Templado
Rotación: Tormenta Glacial al empezar; con **Ventisca Viva** suelta una Nova cada 2 s. Cada Congelado dentro la alarga (Tormenta Perpetua) y, con **Invierno Eterno**, no se acaba mientras haya uno. Paso de Escarcha para recolocar la Tormenta; Remolino suelta otra Nova al llegar. El Enjambre de Familiares dispara Hielo y pone capas.

*«Cero Absoluto» (Fractura) · Paragon Escriba Rúnica*
- **Clase (34/34):** Reservas Profundas 2 · Intelecto Arcano 2 · Dardo Certero (A) 1 · Núcleo Denso (A) 1 · Nova Cortante (B) 1 · Flujo de Maná 2 · Mente Afilada 2 · Armonía Elemental (A) 1 · Barrera Resonante 1 · Ritmo Arcano 2 · Disrupción (B) 1 · Inversión del Tiempo (A) 1 · Escarcha Arcana 1 · Escudo Prismático 3 · Piel de Maná 2 · Mente Clara (B) 1 · Reflejos Arcanos 2 · Torrente de Maná 3 · Archimaga 3 · Celeridad 2
- **Crionte (31/31):** Escarcha (gratis) · Filo Helado 3 · Hielo Quebradizo 1 · Lanza del Invierno (B) 1 · Astillas 2 · Invierno Profundo 2 · Ruptura 2 · Esquirlas 3 · Cero Absoluto 3 · Corazón del Invierno 4 · Frío Penetrante 3 · Escarcha Densa 1 · Prisión Profunda (B) 1 · Cristal Protector (B) 1 · Viento Cortante 3 · Polvo de Diamante 1
- **Paragon:** Escriba Rúnica: Runas (gratis) · Runa de Poder (A) · Tinta Duradera · Tinta de Maná · Caligrafía Rápida · Glosa (A) · Runa Guardiana (B) · Inspiración · Concentración · Gran Grimorio · Palimpsesto — 10/10; quedan fuera Tinta Elemental y Doble Sello
Rotación: Prisión Profunda sobre el jefe (3 s congelado, +80 %) → **Lanza del Invierno**: el cuádruple contra Congelados → **Ruptura** y **Cero Absoluto** lo hacen añicos (+300 %) y recargan la Lanza al instante. Astillas acorta Prisión y Lanza con cada crítico. Runa de Poder: dentro del Sello, +25 %.

*«Escarcha Quebradiza» (híbrida Glaciar + Fractura, sin final) · Paragon Invocadora*
- **Clase (34/34):** Reservas Profundas 2 · Intelecto Arcano 2 · Dardo Certero (A) 1 · Onda Expansiva (B) 1 · Nova Cortante (B) 1 · Flujo de Maná 2 · Mente Afilada 2 · Pureza Elemental (B) 1 · Barrera Resonante 1 · Ritmo Arcano 2 · Ralentizar (A) 1 · Anclaje Temporal (B) 1 · Escarcha Arcana 1 · Escudo Prismático 2 · Piel de Maná 2 · Escudo de Maná (A) 1 · Reflejos Arcanos 2 · Torrente de Maná 3 · Archimaga 3 · Celeridad 2 · Paso Fugaz 1
- **Crionte (31/31):** Escarcha (gratis) · Frío Penetrante 3 · Filo Helado 3 · Escarcha Densa 2 · Hielo Quebradizo 1 · Prisión Amplia (A) 1 · Lanza del Invierno (B) 1 · Sangre Fría 2 · Astillas 2 · Piel de Invierno (A) 1 · Invierno Profundo 2 · Congelación en Cadena 2 · Ruptura 2 · Glaciar 3 · Esquirlas 3 · Viento Cortante 1 · Expansión Glacial 2
- **Paragon:** Invocadora: Familiar Arcano (gratis) · Gran Constructo (A) · Vínculo · Cazador (B) · Sobrecarga · Fragua Rúnica (B) · Imitación · Aprendiz · Constructo Templado · Legión · Hilo de Maná — 10/10; quedan fuera Detonar Constructo y Eco Elemental
Rotación: congela la manada (Prisión Amplia + Nova) y aprovecha **Hielo Quebradizo** (+20 % a los Congelados) con la Lanza del Invierno sobre el élite. Glaciar y Esquirlas al máximo reparten el daño. Dónde brilla: élites con manada.

| Build | Contra jefes | Contra 5 | Peor | Control |
|---|---|---|---|---|
| Era Glacial | 0,82 | 0,95 | 0,82 | **muy alto** |
| Invierno Eterno | 0,85 | **1,00** | 0,85 | alto |
| Cero Absoluto | **1,00** | 0,78 | 0,78 | medio |
| Escarcha Quebradiza (híbrida) | 0,92 | 0,90 | **0,90** | alto |

### 5.3 Arcanista (un objetivo · Cargas Arcanas)

**Fantasía:** maná, críticos y golpes cargados. **Pasiva:** cada impacto del Dardo Arcano da 1 Carga (máx. 4). **Dardo recomendado:** sin variante (el Dardo arcano encaja con Pureza Elemental y con todo su kit arcano).

**Kit:**

| Habilidad | Ranura · Nv | Qué hace | Mejora | Variante I | Variante II |
|---|---|---|---|---|---|
| **Orbe Arcano** | Insignia `3` · 10 | Un orbe lento que atraviesa y rebota 2 veces entre enemigos | Orbe Grande: +30 % de tamaño | **Orbe Veloz** (un objetivo): el doble de rápido, +40 %, sin rebotes | **Orbe Gemelo** (área): 2 orbes en V al 60 % |
| **Sello del Archimago** | Utilidad `2` · 12 | Círculo de 4 m durante 8 s: dentro, tus hechizos cuestan un 30 % menos y ganas 1 Carga cada 2 s | Sello Firme: 8 → 10 s | **Sello Ofensivo** (un objetivo): dentro, críticos +25 % (ya no abarata) | **Sello de Contención** (control): ralentiza un 40 % a quien entra |
| **Rayo** | Principal `DER/2` · 14 | Rayo de 15 m que atraviesa y gasta tus Cargas: +35 % de daño y 5 de maná por Carga | Rayo Largo: 15 → 18 m | **Rayo en Cadena** (área): salta a 3 enemigos (70 % cada salto) | **Haz Concentrado** (un objetivo): canalizado 1,5 s, +80 % |
| **Desgarro Arcano** | Definitiva `4` · 15 | Canalizas 3 s un rayo gigante; te da 1 Carga cada medio segundo | Desgarro Estable: puedes moverte despacio | **Brecha** (área): grieta de 3 m durante 5 s | **Quiebre** (un objetivo): un solo pulso de 900 % |

El **Sello del Archimago** cambió respecto del esbozo («guarda el daño y estalla»), porque repetía la Marca del Cronomante: ahora es una zona de coste y Cargas.

**Barra de mecánica: Cargas Arcanas** (ya existe):

| Generar | Descargar | Pérdida | La alimentan |
|---|---|---|---|
| +1 por impacto del Dardo Arcano (máx. 4) | El Rayo las gasta todas: +35 % de daño y 5 de maná por Carga | Todas, 6 s después de la última | Dardo, Rayo; con talentos, Orbe, Sello y Desgarro |

**Árbol (generado):**

| Fila | Id | Nodo | Forma · tipo | Etiqueta | Rangos | Requiere | Qué hace (al máximo) | Cuál conviene |
|---|---|---|---|---|---|---|---|---|
| 0 | a0 | Cargas Arcanas | ○ clave | mecánica | gratis | gratis | El Dardo te da 1 Carga por impacto (máx. 4; duran 6 s). El Rayo las gasta: +35 % de daño y 5 de maná por Carga |  |
| 1 | a1 | Memoria Arcana | ○ pasiva | número | 3 | a0 | Rango 3: Las Cargas duran 12 s (antes 6 s) |  |
| 1 | a2 | Mente Brillante | ○ pasiva | número | 3 | a0 | Rango 3: +15 % de crítico con 2 o más Cargas |  |
| 1 | a3 | Flujo Constante | ○ pasiva | número | 3 | a0 | Rango 3: El Desgarro Arcano se recarga en 35 s (antes 50 s) |  |
| 2 | a4 | Potencia Acumulada | ○ pasiva | número | 2 | a1 | Rango 2: Cada Carga da +45 % al Rayo (antes +35 %) |  |
| 2 | a5 | Rebote Cargado | ○ pasiva | mecánica | 1 | a1 o a2 | Cada enemigo que toca el Orbe Arcano te da 1 Carga<br>_híbrido: Rayo + Orbe_ |  |
| 2 | a6 | Sello Cargado | ○ pasiva | mecánica | 1 | a2 o a3 | Dentro de tu Sello del Archimago, el Orbe y el Desgarro te dan 1 Carga por golpe<br>_híbrido: Orbe + Grieta_ |  |
| 2 | a7 | Grieta Abierta | ○ pasiva | mecánica | 2 | a3 | Rango 2: Al terminar el Desgarro, la grieta queda 3 s y daña un 40 % por segundo |  |
| 3 | a8 | Rayo: Doble o Recargado | ⬡ elección | mecánica | 1 | a4 o a5 | **A · ○ Rayo Doble**: Un Rayo con 4 Cargas se lanza dos veces; la copia hace el 50 % _(contra jefes)_<br>**B · ○ Rayo Recargado**: Cada enemigo que atraviesa el Rayo te devuelve 1 Carga (hasta 2) _(contra grupos)_ | A, contra jefes: el golpe grande sale dos veces. B, contra grupos en fila. Decide qué Rayo juegas |
| 3 | a9 | Orbe: Cargado o Atrayente | ⬡ elección | mecánica | 1 | a5 o a6 | **A · ○ Orbe Cargado**: El Orbe hace +20 % por cada Carga que tienes, sin gastarlas _(contra jefes)_<br>**B · ○ Orbe Atrayente**: El Orbe arrastra hacia su camino a los enemigos a 3 m _(contra grupos)_ | A, contra jefes. B, contra grupos: los junta para el Rayo. Decide qué Orbe juegas |
| 3 | a10 | Desgarro: Fijo o Voraz | ⬡ elección | mecánica | 1 | a6 o a7 | **A · ○ Desgarro Fijo**: Si no te mueves, el Desgarro hace +8 % cada medio segundo (hasta +48 %) _(contra jefes)_<br>**B · ○ Desgarro Voraz**: Cada enemigo que toca el Desgarro te da 3 de maná, y ganas 1 Carga por segundo _(contra grupos)_ | A, contra jefes quietos. B, contra grupos: sostiene tu maná. Decide qué Grieta juegas |
| 4 | a11 | Precisión Arcana | ○ pasiva | número | 2 | a8 | Rango 2: El Rayo tiene +20 % de crítico |  |
| 4 | a12 | Inercia | ○ pasiva | mecánica | 2 | a8 o a9 | Rango 2: Cada rebote del Orbe recarga 1 s del Rayo |  |
| 4 | a13 | Torrente Arcano | ○ pasiva | número | 2 | a9 o a10 | Rango 2: El Desgarro Arcano y el Orbe hacen +30 % de daño |  |
| 4 | a14 | Maná Inagotable | ○ pasiva | mecánica | 1 | a10 | Mientras canalizas el Desgarro no gastas maná y recuperas un 2 % por segundo |  |
| 5 | a15 | Desplazamiento o Velo | ⬡ elección | mecánica | 1 | a11 o a12 | **A · ○ Desplazamiento**: Un golpe de más del 20 % de tu vida te teletransporta 5 m y no te hace daño. Una vez cada 30 s _(supervivencia)_<br>**B · ○ Velo Arcano**: Con 3 o más Cargas, recibes un 12 % menos de daño _(supervivencia)_ | A, contra golpes grandes de jefe. B, siempre activo contra grupos |
| 5 | a16 | Resonancia | ○ pasiva | mecánica | 2 | a12 o a13 | Rango 2: Con 4 Cargas, no se pierden y tienes +12 % de crítico<br>_híbrido: Los tres estilos (por las Cargas)_ |  |
| 5 | a17 | Sello Viviente | ○ pasiva | mecánica | 2 | a13 o a14 | Rango 2: El Sello del Archimago dura 12 s (antes 8 s) y te sigue |  |
| 6 | a18 | Carga Final | ○ pasiva | mecánica | 2 | a15 | Rango 2: Un Rayo con 4 Cargas te devuelve 2 Cargas |  |
| 6 | a19 | Satélite | ○ pasiva | mecánica | 2 | a15 o a16 | Rango 2: Cada 3.er Orbe deja un orbe pequeño girando a tu alrededor 6 s (40 % por golpe) |  |
| 6 | a20 | Agudeza | ○ pasiva | número | 2 | a16 o a17 | Rango 2: Con 3 o más Cargas, lanzas un 14 % más rápido |  |
| 6 | a21 | Doble Grieta | ○ pasiva | mecánica | 1 | a17 | Si lanzas el Rayo durante el Desgarro, se abre una segunda grieta al 50 % |  |
| 7 | a22 | Cargas Desbordadas | ○ pasiva | mecánica | 3 | a18 | Rango 3: Puedes guardar hasta 7 Cargas (antes 4); las que pasan de 4 dan el doble al Rayo |  |
| 7 | a23 | Orbe Múltiple | ○ pasiva | mecánica | 3 | a19 | Rango 3: Cada 3.er Orbe sale con 3 orbes más pequeños (40 % cada uno) |  |
| 7 | a24 | Fuente de Maná | ○ pasiva | mecánica | 3 | a21 | Rango 3: Mientras canalizas, cada segundo te da 1 Carga y +15 % de daño (hasta 3 veces) |  |
| 8 | a25 | Tormenta de Cargas | ○ **FINAL** | mecánica | 3 | a22 | Rango 3: Al gastar 4 o más Cargas, el Rayo se lanza 3 veces en 1,5 s (100/50/50 %). Rayo +30 %<br>_final: Rayo_ |  |
| 8 | a26 | Constelación | ○ **FINAL** | mecánica | 3 | a23 | Rango 3: Tus Orbes no desaparecen: se quedan 8 s girando a tu alrededor (hasta 3) y disparan al más cercano. Orbe +30 %<br>_final: Orbe_ |  |
| 8 | a27 | Grieta Eterna | ○ **FINAL** | mecánica | 3 | a24 | Rango 3: El Desgarro dura mientras tengas maná (gasta un 3 % por segundo). Desgarro +30 %<br>_final: Grieta_ |  |
| 9 | a28 | Singularidad | ○ **ÁPICE** | mecánica | 4 | a25 o a26 o a27 | 1) Un Rayo con 4 Cargas abre una grieta 3 s en el objetivo (50 % por segundo). 2) Matar a un élite te da 4 Cargas. 3) Las Cargas ya no se pierden. 4) Cada 20 Cargas gastadas, el Desgarro se lanza solo 2 s, gratis. |  |

| Arquetipo | Fantasía | Elección que lo define | Penúltimo → final | Mejor en |
|---|---|---|---|---|
| **Rayo** | Acumular Cargas y descargarlas en un golpe enorme | a8 Rayo Doble (jefes) o Recargado (grupos) | Cargas Desbordadas → **Tormenta de Cargas** | Jefes |
| **Orbe** | Orbes que rebotan, atraen y se quedan girando | a9 Orbe Cargado (jefes) o Atrayente (grupos) | Orbe Múltiple → **Constelación** | Grupos |
| **Grieta** | Canalizar el Desgarro mucho tiempo | a10 Desgarro Fijo (jefes) o Voraz (grupos) | Fuente de Maná → **Grieta Eterna** | Daño sostenido |

Híbridos: **Rebote Cargado** (Rayo + Orbe), **Sello Cargado** (Orbe + Grieta), **Resonancia** (los tres; con 4 Cargas no se pierden) y **Agudeza**. Ápice: **Singularidad**.

**Implementación (por nodo):** `a0` mecánica cargas · existe; `a1` tuning cargas.loseAfter · tv; `a2` tv.chargeCrit · NUEVO (clave); `a3` mod m_u_desgarro cdr · claves; `a4` tuning cargas.dmgPerCharge · tv; `a5` power a_rebote_cargado · NUEVO (onHit); `a6` power a_sello_cargado · NUEVO; `a7` campo a_grieta · NUEVO; `a8` A: power a_rayo_doble · NUEVO (echo del canal) · B: power a_rayo_recargado · NUEVO (afterCast); `a9` A: power a_orbe_cargado · NUEVO (condAdd) · B: power a_orbe_atrae · NUEVO (pull); `a10` A: power a_desgarro_fijo · NUEVO · B: power a_desgarro_voraz · NUEVO; `a11` mod rayo crit · claves; `a12` power a_inercia · NUEVO; `a13` mod dmg · claves; `a14` power a_mana_inagotable · NUEVO; `a15` A: power a_desplazamiento · NUEVO (onDamaged) · B: tv.drCharges · NUEVO; `a16` power a_resonance · existe (rangos); `a17` mod a_sello durS + power a_sello_sigue; `a18` power a_carga_final · NUEVO (afterCast); `a19` power a_satelite · NUEVO; `a20` tv.aspdCharges · NUEVO; `a21` power a_doble_grieta · NUEVO; `a22` tuning cargas.max + condAdd; `a23` power a_orbe_multiple · NUEVO (echo); `a24` power a_fuente · NUEVO; `a25` power a_tormenta_cargas · NUEVO; `a26` power a_constelacion · NUEVO; `a27` power a_grieta_eterna · NUEVO; `a28` power a_singularidad (rangos) · NUEVO.

**Builds (Nv100):**

*«Tormenta de Cargas» (Rayo) · Paragon Cronomante*
- **Clase (34/34):** Reservas Profundas 2 · Intelecto Arcano 2 · Dardo Certero (A) 1 · Núcleo Denso (A) 1 · Nova Cortante (B) 1 · Flujo de Maná 2 · Mente Afilada 2 · Armonía Elemental (A) 1 · Barrera Resonante 1 · Ritmo Arcano 2 · Disrupción (B) 1 · Inversión del Tiempo (A) 1 · Escarcha Arcana 1 · Escudo Prismático 3 · Piel de Maná 2 · Mente Clara (B) 1 · Reflejos Arcanos 2 · Torrente de Maná 3 · Archimaga 3 · Celeridad 2
- **Arcanista (31/31):** Cargas Arcanas (gratis) · Memoria Arcana 3 · Potencia Acumulada 2 · Rebote Cargado 1 · Rayo Doble (A) 1 · Precisión Arcana 2 · Velo Arcano (B) 1 · Carga Final 2 · Cargas Desbordadas 3 · Tormenta de Cargas 3 · Singularidad 4 · Mente Brillante 3 · Orbe Cargado (A) 1 · Inercia 2 · Resonancia 2 · Flujo Constante 1
- **Paragon:** Cronomante: Marca del Tiempo (gratis) · Eco Mayor (A) · Reloj de Arena · Prisa Temporal · Segundos Robados · Presagio (A) · Retroceso (B) · Bucle · Aceleración · Señora del Tiempo · Momento Exacto — 10/10; quedan fuera Paradoja y Grieta Temporal
Rotación: Dardo hasta 4 Cargas (con Memoria Arcana duran 12 s) → **Rayo**: +35 % por Carga (+45 % con Potencia Acumulada). **Rayo Doble** lo repite al 50 % y **Tormenta de Cargas** lo lanza 3 veces. Carga Final devuelve Cargas; Archimaga copia cada 4.ª principal. La Marca del Tiempo repite el 45 % de la ráfaga.

*«Constelación» (Orbe) · Paragon Escriba Rúnica*
- **Clase (34/34):** Intelecto Arcano 2 · Reflejos Arcanos 2 · Onda Expansiva (B) 1 · Paso Fugaz 1 · Ralentizar (A) 1 · Runa de Escarcha (A) 1 · Anclaje Temporal (B) 1 · Escarcha Arcana 1 · Celeridad 2 · Reservas Profundas 2 · Dardo Sifón (B) 1 · Nova Cortante (B) 1 · Flujo de Maná 2 · Mente Afilada 2 · Pureza Elemental (B) 1 · Escarcha Tenaz 1 · Ritmo Arcano 2 · Imagen Arcana 3 · Paso del Vacío 3 · Piel de Maná 2 · Escudo Prismático 2
- **Arcanista (31/31):** Cargas Arcanas (gratis) · Mente Brillante 3 · Rebote Cargado 1 · Orbe Atrayente (B) 1 · Inercia 2 · Resonancia 2 · Satélite 2 · Orbe Múltiple 3 · Constelación 3 · Singularidad 4 · Memoria Arcana 3 · Potencia Acumulada 1 · Rayo Recargado (B) 1 · Desplazamiento (A) 1 · Flujo Constante 3 · Sello Cargado 1
- **Paragon:** Escriba Rúnica: Runas (gratis) · Sello Explosivo (B) · Tinta de Maná · Tinta Elemental · Caligrafía Rápida · Doble Sello · Glosa (A) · Palimpsesto · Gran Grimorio · Runa Guardiana (B) · Tinta Duradera — 10/10; quedan fuera Inspiración y Concentración
Rotación: Orbe Atrayente junta la manada; cada rebote da Carga (Rebote Cargado) y recarga el Rayo (Inercia). Cada 3.er Orbe sale con orbes extra y, con **Constelación**, hasta 3 orbes se quedan girando y disparan. Rayo Recargado en la fila de enemigos.

*«Grieta Eterna» (Grieta) · Paragon Cronomante*
- **Clase (34/34):** Reservas Profundas 2 · Escudo Prismático 3 · Dardo Sifón (B) 1 · Piel de Maná 2 · Aguante Arcano (B) 1 · Escudo de Maná (A) 1 · Barrera Resonante 1 · Canalizador (B) 1 · Intelecto Arcano 2 · Flujo de Maná 2 · Nova Cortante (B) 1 · Pureza Elemental (B) 1 · Barrera Reforzada 2 · Mente Afilada 2 · Onda Expansiva (B) 1 · Ralentizar (A) 1 · Cristal de Barrera 3 · Bastión Arcano 3 · Reflejos Arcanos 2 · Paso Fugaz 1 · Runa de Escarcha (A) 1
- **Arcanista (31/31):** Cargas Arcanas (gratis) · Flujo Constante 3 · Grieta Abierta 2 · Sello Cargado 1 · Desgarro Fijo (A) 1 · Torrente Arcano 2 · Maná Inagotable 1 · Sello Viviente 2 · Doble Grieta 1 · Fuente de Maná 3 · Grieta Eterna 3 · Singularidad 4 · Mente Brillante 3 · Orbe Cargado (A) 1 · Resonancia 2 · Agudeza 2
- **Paragon:** Cronomante: Marca del Tiempo (gratis) · Eco Mayor (A) · Prisa Temporal · Paradoja · Segundos Robados · Grieta Temporal · Presagio (A) · Momento Exacto · Señora del Tiempo · Detener el Tiempo (A) · Reloj de Arena — 10/10; quedan fuera Bucle y Aceleración
Rotación: Sello del Archimago en el suelo → **Desgarro Arcano** quieto (Desgarro Fijo, +48 %) → con **Grieta Eterna** dura mientras tengas maná; Maná Inagotable y Fuente de Maná lo sostienen. Doble Grieta: un Rayo durante el Desgarro abre otra al 50 %. **Detener el Tiempo** (Paragon, ranura `2`) para fijar a los enemigos.

*«Rayo Orbital» (híbrida Rayo + Orbe, sin final) · Paragon Escriba Rúnica*
- **Clase (34/34):** Reservas Profundas 2 · Intelecto Arcano 2 · Dardo Certero (A) 1 · Onda Expansiva (B) 1 · Nova Cortante (B) 1 · Flujo de Maná 2 · Mente Afilada 2 · Pureza Elemental (B) 1 · Barrera Resonante 1 · Ritmo Arcano 2 · Ralentizar (A) 1 · Anclaje Temporal (B) 1 · Escarcha Arcana 1 · Escudo Prismático 2 · Piel de Maná 2 · Escudo de Maná (A) 1 · Reflejos Arcanos 2 · Torrente de Maná 3 · Archimaga 3 · Celeridad 2 · Paso Fugaz 1
- **Arcanista (31/31):** Cargas Arcanas (gratis) · Memoria Arcana 3 · Mente Brillante 3 · Potencia Acumulada 2 · Rebote Cargado 1 · Rayo Doble (A) 1 · Orbe Atrayente (B) 1 · Precisión Arcana 2 · Inercia 2 · Velo Arcano (B) 1 · Resonancia 2 · Carga Final 2 · Satélite 2 · Cargas Desbordadas 3 · Orbe Múltiple 3 · Flujo Constante 1 · Agudeza 2
- **Paragon:** Escriba Rúnica: Runas (gratis) · Runa de Poder (A) · Tinta Duradera · Tinta de Maná · Caligrafía Rápida · Glosa (A) · Runa Guardiana (B) · Inspiración · Concentración · Gran Grimorio · Palimpsesto — 10/10; quedan fuera Tinta Elemental y Doble Sello
Rotación: el Orbe da Cargas a la manada (Rebote Cargado) y el Rayo Doble las descarga en el élite. Cargas Desbordadas y Orbe Múltiple al máximo. Dónde brilla: contenido mixto.

| Build | Contra jefes | Contra 5 | Peor | Sostenido |
|---|---|---|---|---|
| Tormenta de Cargas | **1,00** | 0,75 | 0,75 | medio |
| Constelación | 0,84 | **1,00** | 0,84 | medio |
| Grieta Eterna | 0,94 | 0,86 | 0,86 | **muy alto** |
| Rayo Orbital (híbrida) | 0,92 | 0,91 | **0,91** | medio |

### 5.4 Las tres especializaciones, juntas

| | Piromante | Crionte | Arcanista |
|---|---|---|---|
| Rol | Daño en área | Control | Un objetivo |
| Mecánica | Calor (0–100) | Escarcha (0–5 por enemigo) | Cargas (0–4) |
| Arquetipos (A · B · C) | Brasa · Ignición · Cataclismo | Glaciar · Fractura · Tormenta | Rayo · Orbe · Grieta |
| Finales | Incendio Forestal · Combustión Perpetua · Lluvia de Fuego | Era Glacial · Cero Absoluto · Invierno Eterno | Tormenta de Cargas · Constelación · Grieta Eterna |
| Ápice | Corazón del Sol | Corazón del Invierno | Singularidad |
| Árboles héroe | Cronomante · Invocadora | Invocadora · Escriba Rúnica | Cronomante · Escriba Rúnica |
| Híbrida | Brasa Ardiente | Escarcha Quebradiza | Rayo Orbital |

---

## 6. Builds del Piromante a Nv100 (las del Crionte y el Arcanista están en §5.2 y §5.3)

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

**Rotación.** Estela Ígnea sobre la manada → al terminar, **Meteoro instantáneo** allí → Cráter. Dentro, Bola de Fuego cada ~1 s, que **explota dos veces** y llena el Calor. A 100, Meteoro con Ignición Total: cae 3 veces y, si golpea a 3 o más, se recarga. Las **Marcas del Tiempo** (con Marca Contagiosa) repiten un 30 % de todo ese daño y saltan a los vecinos. Parpadeo con **Paso del Vacío**: la siguiente principal sin recarga y +45 %.
**Final de clase:** Paso del Vacío a Nv69.

### 6.3 «Combustión Perpetua» (Ignición) · Paragon Cronomante

- **Clase (34/34):** Reservas Profundas 2 · Intelecto Arcano 2 · Dardo Certero (A) 1 · Núcleo Denso (A) 1 · Nova Cortante (B) 1 · Flujo de Maná 2 · Mente Afilada 2 · Armonía Elemental (A) 1 · Barrera Resonante 1 · Ritmo Arcano 2 · Disrupción (B) 1 · Inversión del Tiempo (A) 1 · Escarcha Arcana 1 · Escudo Prismático 3 · Piel de Maná 2 · Mente Clara (B) 1 · Reflejos Arcanos 2 · Torrente de Maná 3 · Archimaga 3 · Celeridad 2
- **Piromante (31/31):** Ignición (gratis) · Calor Abrasador 3 · Chispas 1 · Llamarada Avivada (A) 1 · Pirotecnia 2 · Brasero 2 · Ignición Rápida 2 · Combustión 3 · Combustión Perpetua 3 · Corazón del Sol 4 · Brasas 3 · Llama Persistente 1 · Brasa Profunda (B) 1 · Fénix (A) 1 · Mecha Corta 3 · Combustible Volátil 1
- **Paragon:** Cronomante: Marca del Tiempo (gratis) · Eco Mayor (A) · Reloj de Arena · Prisa Temporal · Segundos Robados · Presagio (A) · Retroceso (B) · Bucle · Aceleración · Señora del Tiempo · Momento Exacto — 10/10; quedan fuera Paradoja y Grieta Temporal

**Rotación.** Llena el Calor con Bola (Núcleo Denso) y Dardo Certero. Llamarada Avivada → Ignición Total → **Combustión**: 4,5 s de crítico seguro; cada crítico da Calor y, si llegas a 100, Combustión se alarga y lanza una Bola gratis. Con **Eco Mayor** y **Presagio**, cada Marca del Tiempo repite el 45 % de la ventana: el jefe recibe la Combustión dos veces. Archimaga copia cada 4.ª principal; Inversión del Tiempo en la `2` contra el golpe grande.
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
- Cambiar de árbol héroe es gratis fuera de combate y guarda las elecciones de cada uno.
- **Pausa:** si después bajas de 31/31 en especialización, el Paragon **queda en pausa**: la columna vuelve a gris con «**Paragon en pausa** · Vuelve a gastar tus 31 puntos de especialización (30/31) · Tus N puntos del Paragon se guardan y vuelven a funcionar al recuperar el 31/31». Al quitar el punto sale un aviso suave: «Paragon en pausa: te falta gastar 1 punto de especialización. Tus nodos del Paragon se guardan.». Al volver a gastarlo, se repite la revelación (§10).

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
| **Escriba Rúnica** | Crionte · Arcanista | **Runas:** cada 3.er hechizo escribe una runa; tres runas cerca forman un Sello: dentro haces +15 % y recibes −10 % |

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
| 5 | t12 | Señora del Tiempo | ○ **FINAL** | mecánica | 1 | t10 o t11 | Cada 30 s, tu siguiente principal para el reloj 5 s: las Marcas no terminan y luego repiten el 100 % de lo guardado |  |

### 7.3 Invocadora (Piromante · Crionte)

| Fila | Id | Nodo | Forma · tipo | Etiqueta | Rangos | Requiere | Qué hace (al máximo) | Cuál conviene |
|---|---|---|---|---|---|---|---|---|
| 0 | f0 | Familiar Arcano | ○ clave | mecánica | gratis | gratis | Un Familiar de maná dispara cada 1,5 s (50 % del arma) con tu último elemento: Fuego quema, Hielo frena, Arcano da maná |  |
| 1 | f1 | Vínculo | ○ pasiva | número | 1 | f0 | El Familiar tiene +50 % de vida y cada disparo te da 2 de maná |  |
| 1 | f2 | Uno o Muchos | ⬡ elección | mecánica | 1 | f0 | **A · ○ Gran Constructo**: Un solo Familiar, +80 % de daño; cada 5.º disparo aturde 0,5 s _(contra jefes)_<br>**B · ○ Enjambre**: Tres Familiares pequeños; cada uno hace el 40 % _(contra grupos)_ | A, contra jefes. B, contra grupos (tres blancos a la vez) |
| 1 | f3 | Imitación | ○ pasiva | mecánica | 1 | f0 | Cuando usas tu definitiva, el Familiar lanza una copia al 25 % |  |
| 2 | f4 | Guardián o Cazador | ⬡ elección | mecánica | 1 | f1 o f2 | **A · ○ Guardián**: El Familiar se interpone: recibe el 15 % del daño que te hacen _(supervivencia)_<br>**B · ○ Cazador**: El Familiar persigue al enemigo con más vida; ese enemigo recibe +10 % de daño _(contra jefes)_ | A, para sobrevivir. B, contra jefes |
| 2 | f5 | Sobrecarga | ○ pasiva | número | 1 | f2 | Cada habilidad principal tuya acelera los disparos del Familiar un 30 % durante 3 s |  |
| 2 | f6 | Detonar Constructo | ○ pasiva | mecánica | 1 | f2 o f3 | Si el Familiar cae, estalla (200 % del arma, 4 m) y vuelve a los 5 s |  |
| 3 | f7 | Aprendiz | ○ pasiva | mecánica | 1 | f4 o f5 | El Familiar copia la variante de forja de tu Dardo (por ejemplo, con Saeta Ígnea sus disparos explotan) |  |
| 3 | f8 | Constructo o Fragua | ⬡ elección | mecánica | 1 | f5 | **A · □ Llamar Constructo** (habilidad): Habilidad (ranura 2): un Constructo grande aparece 10 s y obliga a los enemigos a 8 m a atacarlo. Se recarga en 45 s _(supervivencia)_<br>**B · ○ Fragua Rúnica**: El Familiar hace +5 % por cada habilidad distinta que usaste en 8 s (hasta +25 %) _(contra jefes)_ | A, para aguantar grupos grandes (ocupa la ranura 2). B, para hacer daño sin ocupar ranura |
| 3 | f9 | Eco Elemental | ○ pasiva | mecánica | 1 | f5 o f6 | Los disparos del Familiar alimentan tu mecánica: 3 de Calor (Piromante) o 1 capa de Escarcha (Crionte) |  |
| 4 | f10 | Constructo Templado | ○ pasiva | número | 1 | f7 o f8 | El Familiar hace +20 % de daño |  |
| 4 | f11 | Hilo de Maná | ○ pasiva | mecánica | 1 | f8 o f9 | Un hilo de maná te une al Familiar y daña a quien lo cruza (60 % por segundo) |  |
| 5 | f12 | Legión | ○ **FINAL** | mecánica | 1 | f10 o f11 | Cada 25 s, tu Familiar se divide en 3 durante 8 s y todos copian tu siguiente principal al 50 % |  |

### 7.4 Escriba Rúnica (Crionte · Arcanista)

**Mecánica:** cada 3.er hechizo escribe una **runa** en el suelo (8 s). Tres runas cerca forman un **Sello**: dentro haces +15 % y recibes −10 % de daño. Funciona con cualquier elemento (con Tinta Elemental, la runa toma el del hechizo).

| Fila | Id | Nodo | Forma · tipo | Etiqueta | Rangos | Requiere | Qué hace (al máximo) | Cuál conviene |
|---|---|---|---|---|---|---|---|---|
| 0 | e0 | Runas | ○ clave | mecánica | gratis | gratis | Cada 3.er hechizo escribe una runa (8 s). Tres runas cerca forman un Sello: dentro haces +15 % y recibes −10 % de daño |  |
| 1 | e1 | Tinta Duradera | ○ pasiva | número | 1 | e0 | Las runas duran 12 s (antes 8 s) |  |
| 1 | e2 | Poder o Estallido | ⬡ elección | mecánica | 1 | e0 | **A · ○ Runa de Poder**: Dentro del Sello haces +25 % de daño (antes +15 %) _(contra jefes)_<br>**B · ○ Sello Explosivo**: Al formarse, el Sello estalla en su área (150 % del arma) _(contra grupos)_ | A, contra jefes. B, contra grupos |
| 1 | e3 | Tinta de Maná | ○ pasiva | mecánica | 1 | e0 | Pisar una runa tuya te da 5 de maná (una vez por runa) |  |
| 2 | e4 | Palabra o Guarda | ⬡ elección | mecánica | 1 | e1 o e2 | **A · □ Palabra de Poder** (habilidad): Habilidad (ranura 2): escribes al instante 3 runas a tu alrededor. Se recarga en 40 s _(contra jefes)_<br>**B · ○ Runa Guardiana**: Dentro del Sello recibes −20 % de daño (antes −10 %) _(supervivencia)_ | A, para tener el Sello donde y cuando quieres (ocupa la ranura 2). B, para aguantar sin ocupar ranura |
| 2 | e5 | Caligrafía Rápida | ○ pasiva | número | 1 | e2 | Escribes una runa cada 2 hechizos (antes cada 3) |  |
| 2 | e6 | Tinta Elemental | ○ pasiva | mecánica | 1 | e2 o e3 | Las runas toman el elemento del hechizo: Hielo ralentiza 30 %, Arcano da 1 Carga, Fuego quema |  |
| 3 | e7 | Inspiración | ○ pasiva | mecánica | 1 | e4 o e5 | Al formarse un Sello, todos tus enfriamientos bajan 2 s |  |
| 3 | e8 | Glosa o Círculo | ⬡ elección | mecánica | 1 | e5 | **A · ○ Glosa**: Los enemigos dentro del Sello reciben +10 % de daño _(contra jefes)_<br>**B · ○ Círculo Protector**: Tú y tus aliados dentro del Sello recuperáis un 1 % de vida por segundo _(supervivencia)_ | A, para hacer daño. B, para aguantar y para el grupo |
| 3 | e9 | Doble Sello | ○ pasiva | mecánica | 1 | e5 o e6 | Puedes tener 2 Sellos a la vez |  |
| 4 | e10 | Concentración | ○ pasiva | número | 1 | e7 o e8 | Dentro del Sello lanzas un 10 % más rápido |  |
| 4 | e11 | Palimpsesto | ○ pasiva | mecánica | 1 | e8 o e9 | Al acabar, el Sello deja 3 runas nuevas: si sigues ahí, vuelve a formarse |  |
| 5 | e12 | Gran Grimorio | ○ **FINAL** | mecánica | 1 | e10 o e11 | Cada 30 s, tu siguiente Sello es un Grimorio 10 s: dentro, cada hechizo se lanza dos veces (la copia al 40 %) |  |

### 7.5 Tablero de glifos (`PARAGON_BOARD`)

| Hoy | v3 |
|---|---|
| Puntos de tablero desde el Nv20 | **16 puntos del Nv81 al 100** (los niveles 85, 90, 95 y 100 son de clase) |
| Los nodos legendarios conceden poderes | Dan **estadísticas** grandes; los poderes de identidad los da el árbol héroe |
| Tablero 9 × 9 | Se mantiene. Requisito para E4: desde el inicio, el primer nodo legendario a 8–10 casillas, un zócalo de glifo en el camino y el segundo legendario a 10 casillas más. Con 16 puntos se llega a **uno** con su zócalo, nunca a los dos |

### 7.6 Iconos nuevos para Codex

Hoy el mockup usa iconos de reemplazo. Arte crudo en `D:\Proyectos\IntentoRPG-assets` según el pipeline de Codex. Pedidos con el estilo de `assets/talents` (128 y 256 px, fondo oscuro y elemento neutro, en violeta y oro de la Maga):

| Archivo | Qué dibujar |
|---|---|
| `assets/talents/hero-crono.webp` | Emblema del Cronomante: reloj de arena de cristal arcano con arena dorada que sube |
| `assets/talents/hero-invoca.webp` | Emblema de la Invocadora: pequeño constructo de maná (cuerpo de runas flotantes) con ojo brillante |
| `assets/talents/hero-escriba.webp` | Emblema de la Escriba Rúnica: pluma trazando un círculo de tres runas |
| `assets/talents/maga-crono-t0…t12.webp` (13) | Marca del Tiempo (sello de reloj sobre un enemigo), Reloj de Arena, Eco Mayor / Marca Contagiosa, Prisa Temporal, Detener / Retroceder, Segundos Robados, Paradoja, Bucle, Presagio / Memoria, Grieta Temporal, Aceleración, Momento Exacto, Señora del Tiempo |
| `assets/talents/maga-invoca-f0…f12.webp` (13) | Familiar Arcano, Vínculo, Gran Constructo / Enjambre, Imitación, Guardián / Cazador, Sobrecarga, Detonar Constructo, Aprendiz, Constructo / Fragua, Eco Elemental, Constructo Templado, Hilo de Maná, Legión |
| `assets/talents/maga-escriba-e0…e12.webp` (13) | Runas, Tinta Duradera, Runa de Poder / Sello Explosivo, Tinta de Maná, Palabra de Poder / Runa Guardiana, Caligrafía Rápida, Tinta Elemental, Inspiración, Glosa / Círculo Protector, Doble Sello, Concentración, Palimpsesto, Gran Grimorio |
| `assets/talents/maga-crionte-i*.webp` y `maga-arcanista-a*.webp` | Los nodos nuevos del Crionte y del Arcanista hoy reutilizan los iconos viejos de su especialización; pedir los que cambiaron de concepto (Polvo de Diamante, Ruptura, Esquirlas, Era Glacial, Cero Absoluto, Invierno Eterno, Rebote Cargado, Sello Cargado, Satélite, Orbe Múltiple, Tormenta de Cargas, Constelación, Grieta Eterna) |
| Variantes de forja del Crionte y del Arcanista (16) | Celda Lejana, Muralla de Hielo, Paso Doble, Prisión Fugaz, Lanza Pesada, Abanico Gélido, Ventisca Anclada, Granizo, Orbe Veloz, Orbe Gemelo, Sello Ofensivo, Sello de Contención, Rayo en Cadena, Haz Concentrado, Brecha, Quiebre (hoy el mockup usa el arte genérico de su papel) |
| `assets/skills/m_h_detener.webp`, `m_h_constructo.webp` y `m_h_palabra.webp` | Habilidades: Detener el Tiempo (esfera de tiempo congelado) y Llamar Constructo (gólem de maná grande) y Palabra de Poder (tres runas encendidas en círculo) |

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
| **Hexágono** | Elección A/B, partido en dos mitades | Árboles, leyenda, icono del tooltip. Sus opciones se abren **encima** del nodo |

### 9.3 Resto de la UI

| Pieza | Diseño |
|---|---|
| Cabecera | Emblema, «Talentos · Maga Piromante», nivel; Habilidades (T) · Configuración · Guardar · Código · Recomendado · ↶ · Reiniciar · ✕ |
| Columnas | Maga · Paragon · Piromante (2 : 1 : 2), sin scroll horizontal a 1366 y 1920 |
| Cabecera por árbol | «Gastados X / Y», «Nv req.»; en el Paragon, el árbol héroe, «Tablero N/16» y, en gris, «Espec. X/31» |
| **Elección (hexágono)** | Al pasar el ratón, las dos mitades aparecen **encima** del nodo, unidas a él por una flecha; el icono queda libre. Un clic en una mitad elige. **Clic izquierdo en el icono** compra con la última opción (o la A). **Clic derecho en el icono** quita el punto, como en cualquier nodo, aunque ya esté elegida. El flotante no tapa el icono ni le roba los clics; su borde inferior es un puente para que el ratón pase del nodo a las mitades sin cerrarlo |
| **Especialización** | Botón **Cambiar** (con el emblema) abre el selector: tres tarjetas con arte, rol, kit, mecánica y pasiva, y **Elegir**. Cambia kit, barra y forja recomendadas y árbol; guarda el árbol de la anterior. Gratis fuera de combate |
| **Barra de mecánica** | En el libro, bajo el kit de la especialización, con el widget real (`createGaugeHud` en modo demostración): Calor, Escarcha o Cargas |
| Puertas | Línea discontinua con sello y «X/24» en la primera columna libre; ápice con banda «Ápice · 25» |
| Loadouts, código, Recomendado, deshacer | Como en la v2: hasta 10 configuraciones por especialización, código versionado `IRPG2-…`, Recomendado en orden de compra, `Ctrl+Z` |
| Libro | Las habilidades de talento aparecen en el kit base con la etiqueta **TALENTO** o **PARAGON** y su tooltip dice el nodo que la concede |


### 9.4 Nombres de las categorías de habilidad (pedido de la v4)

| Clave (`cat`) | Antes | Ahora | Por qué |
|---|---|---|---|
| `basic` | Básico | **Básica** | Concuerda con «habilidad» |
| `spender` | Gastadora | **Principal** | «Gastadora» sonaba raro. Es la habilidad principal que consume recurso, como «Core» en Diablo 4 |
| `movement` | Movilidad | Movilidad | Bien |
| `defense` | Defensa | Defensa | Bien |
| `utility` | Utilidad | Utilidad | Bien |
| `spec` | Especialización | **Insignia** | «Especialización» ya nombra la elección del Nv10; la habilidad propia de cada especialización es su insignia |
| `ultimate` | Definitiva | Definitiva | Bien |

En los textos: «tu siguiente habilidad principal», «cada 4.ª habilidad principal». El mockup ya usa los nombres nuevos en el tooltip, la ficha, la barra («una segunda principal») y los talentos.

**Para la implementación (E4):** el renombre llega al juego en `js/skill-defs.js` (etiquetas de `CAT_SLOTS` y de las categorías) y en `js/hud-model.js` (`slotView`, libro y tooltips), además de los textos de `js/ui.js` que digan «principal». Las claves internas (`spender`, `spec`) **no cambian**: solo la etiqueta visible. Hay que buscar «astadora» en `js/` y `docs/`.

---

## 10. Motion design

Solo `transform` y `opacity` (más `clip-path` en el arte y `stroke-dashoffset` en las líneas). Curva por defecto `cubic-bezier(.2,.8,.2,1)`.

| Momento | Qué se ve | Duración | Con «reducir movimiento» |
|---|---|---|---|
| Gastar un punto | Pulso, anillo, chispas y líneas hacia los hijos que se abren | 260 / 420 / 500 / 350 ms | Fundido 120 ms |
| Nodo al máximo | Destello dentro del icono | 900 ms | Sin destello |
| Abrir una puerta | El sello se parte; la línea brilla | 480 / 600 ms | Sin animar |
| Elegir (hexágono) | Las dos mitades aparecen sobre el nodo subiendo 10 px (sin cruzarse, para que un clic rápido no caiga en la otra); al elegir, el nodo gira | 180 / 360 ms | Sin desplazamiento ni giro |
| Quitar o deshacer | El nodo se encoge y vuelve | 220 ms | Fundido 120 ms |
| **Revelar el Paragon** (último punto de especialización) | 0 ms: se gasta el punto (pulso y chispas) · 0–420 ms: «31/31» del Piromante late · 250–870 ms: **barrido de luz** desde el borde del Piromante a lo ancho del Paragon · 300–750 ms: el **candado** se levanta, gira y se desvanece · 550–1000 ms: el **velo gris** se funde · 600–1300 ms: el arte se abre en iris · 700 ms + 30 ms por nodo: el árbol sube nodo a nodo · 1100–1500 ms: aparecen las flechas | ≈ 1,6 s en total | Solo el fundido del velo (200 ms) |
| Cambiar de árbol héroe | Los nodos suben escalonados | 340 ms + 30 ms por nodo | Fundido 120 ms |
| Cambiar de especialización | Fundido cruzado del arte de la anterior a la nueva y nodos que bajan | 500 / 380 ms | Fundido 120 ms |
| Paragon en pausa | La columna vuelve a gris (sin animación: es un estado) y sale el aviso suave | 120 ms | Igual |
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
| Seis habilidades de talento para la ranura `2` | Más opciones en la misma ranura | Solo una cabe; las builds nunca eligen dos a la vez |
| Crionte: control sobre jefes | El Congelado no aplica a jefes; el Aterido y el Quebranto sí | Vigilar que Era Glacial no deje a los grupos congelados más de un 40 % del tiempo (rendimientos decrecientes de `applyCC`) |
| Arcanista: Grieta Eterna | Canalizar sin fin con Maná Inagotable | El gasto por segundo (3 %) se calibra para que dure 8–12 s con el maná de Nv100 |

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
| G13 | **Paragon en pausa:** con la especialización por debajo de 31/31, el Paragon no da efecto, conserva sus nodos y vuelve a funcionar al recuperar el 31/31 | Test |
| G14 | **Hexágono:** con el flotante abierto, el punto central del icono es el nodo (`elementFromPoint`); el clic derecho quita el punto aunque haya opción elegida | Test de DOM en el panel + demos `rclick` y `pick` del mockup |
| G15 | **Categorías:** ningún texto visible dice «Gastadora»; las etiquetas salen de `skill-defs.js` | `grep -ri astadora js/` vacío |
| G16 | **Rejilla común:** los árboles de las tres especializaciones tienen las mismas filas, columnas, rangos, requisitos y puertas | Test que compara la forma de los tres árboles |

---

## 14. Plan de implementación por etapas

| Etapa | Archivos (propiedad exclusiva) | Entrega |
|---|---|---|
| **E0 · Diseño restante** | `docs/` | Guerrero y Arquera con la plantilla de §17; iconos de §7.6 por Codex |
| **E1 · Motor** | `js/talents.js` (ritmo `t3earnedAt`, puertas, finales, ápice, Paragon con desbloqueo por especialización), `js/talents-ops.js`, `js/save-schema.js` (v6), `js/game-skills.js` (repeticiones) | G3, G4, G5, G8, G11 |
| **E2 · Datos de la Maga** | `js/talents-maga.js` (clase + 3 especializaciones), `js/powers-maga.js`, `js/skills-maga.js` (kits y forja de las 3), `js/hero-maga.js` (nuevo: 3 árboles héroe) | G1, G2, G7, G16 |
| **E3 · Banco** | `tests/balance-bench.mjs` (loadouts por arquetipo, escenario mixto, curva hasta el 100) | G9 |
| **E4 · Interfaz** | `js/ui-talents.js` (hexágono con flotante arriba, pausa del Paragon, selector), `css/talents.css`, `js/data.js` (`PARAGON_BOARD`), `js/skill-defs.js` y `js/hud-model.js` (categorías: «Principal», «Insignia», «Básica») | G6, G10, G13, G14, G15 |
| **E5 · Cierre** | `tests/test-save-maga2g.mjs`, `MEMORIA.md`, `CLAUDE.md`, `sw.js` | `npm test` en verde, push a las dos ramas |

---

## 15. Mockup, capturas y refutaciones (v4)

### 15.1 Uso

`docs/mockups/skills-ux.html?cls=maga&view=talents`. Parámetros: `&res=1366|1920`, `&lvl=5|10|18|40|60|69|70|80|100`, `&spec=piromante|crionte|arcanista`, `&loadout=` una de las 12 builds (`brasa|cataclismo|ignicion|hibrido|glaciar|tormenta|fractura|hibcrio|rayo|orbe|grieta|hibarca`; la build fija la especialización), `&tipnode=cls:c6|spec:i26|hero:e4`, `&tipskill=rayo`, `&alt=1`, `&rm=1`, `&demo=spend|gate|choice|hover|hoveract|pick|rclick|undo|reveal|swap|spec|specswap|hl|code` y `&t=<ms>`.

Capturas en `C:\Users\juanm\AppData\Local\Temp\claude\D--Proyectos-IntentoRPG\6ead5cf3-f7a8-4c53-8c4f-4d18d352840c\scratchpad\maga-v4\`:

| Captura | Muestra |
|---|---|
| `final_crionte_100_1920.png` | Crionte Nv100 «Era Glacial»: Paragon Escriba Rúnica, árbol del Crionte con arte de fondo |
| `final_arcanista_100_1920.png` | Arcanista Nv100 «Tormenta de Cargas»: Paragon Cronomante |
| `final_crionte_hibrido_1366.png` | Híbrida del Crionte con `Alt` y el tooltip de Invierno Profundo |
| `final_arcanista_eleccion_1366.png` | Hexágono a8 abierto **sobre** el nodo y su tooltip |
| `final_escriba_e4_1920.png` | Escriba Rúnica: Palabra de Poder (cuadrada, HABILIDAD) frente a Runa Guardiana |
| `final_selector_1366.png` | Selector de especialización con las tres tarjetas y «Elegir» |
| `final_libro_crionte_1366.png` · `final_libro_arcanista_1366.png` | Libro con el kit de la especialización, su barra de mecánica real y la barra de habilidades recomendada |
| `final_hex_1_abrir_1366.png` | Hexágono s9 abierto: las mitades encima, el icono libre |
| `final_hex_2_cambiar_1366.png` | Clic en la otra mitad: «el clic cayó en mitad A · Propagación o Brasa Profunda: B → A» |
| `final_hex_3_quitar_1366.png` | Clic derecho en el centro del icono con el flotante abierto: el punto se quita (0/1, «1 libre») y el Paragon queda **en pausa** |

### 15.2 Refutaciones de la v4 (tres rondas)

**Ronda 1** (`r1_*.png`).

| Crítica | Cambio |
|---|---|
| A 1920 la cabecera desbordaba el panel con el botón nuevo de especialización | Botón corto «Cambiar» con el emblema y desplegable de configuración de ancho fijo |
| Al abrir una build de otra especialización desde la URL, la barra seguía siendo la del Piromante y se vaciaban la `3` y la `4` | Al aplicar una build de otra especialización se aplican su barra, su forja y su selección recomendadas |
| «Rayo Amplio» (el doble de ancho) cambiaba la geometría del Rayo: eso es de la forja | Pasa a **Rayo Recargado** (devuelve Cargas por enemigo atravesado) |
| c6 compartía icono con c16 | Icono propio |

**Ronda 2** (prueba del hexágono con eventos reales, `elementFromPoint`).

| Crítica | Cambio |
|---|---|
| (Bloqueante) Un clic rápido en la mitad A podía caer en la B: al abrirse, las mitades salían 38 px desplazadas y se cruzaban | Ahora aparecen en su sitio, subiendo 10 px y sin cruzarse. Verificado: «B → A» |
| El flotante tapaba el icono y el clic derecho no llegaba al nodo | Flotante encima del nodo con puente inferior; el clic derecho en el centro del icono llega al nodo y quita el punto |

**Ronda 3** (finales): sin problemas bloqueantes. Quedan menores: los iconos y el arte de variantes del Crionte y del Arcanista son de reemplazo (§7.6), y la barra de mecánica del libro se ve en su estado inicial (0/5, 0/4) porque el mockup no simula combate.

## 16. Preguntas para el dueño

1. ¿Te sirve «Insignia» para la categoría de la habilidad propia de cada especialización, o prefieres otro nombre («Firma», «Sello»)?
2. ¿El Sello del Archimago como zona de coste y Cargas (propuesta) o prefieres conservar su idea vieja de «guardar el daño y estallar» (que se parecía a la Marca del Cronomante)?

## 17. Plantilla para otras clases (Guerrero y Arquera)

Reglas generales que salen de la Maga. Quien diseñe otra clase debe cumplirlas y entregar las mismas secciones.

### 17.1 Estructura

| Pieza | Regla |
|---|---|
| **Columnas** | Clase · Paragon · Especialización, en ese orden y con los mismos anchos (2 : 1 : 2) |
| **Kit base** | 5 habilidades del Nv1 al 9, que llenan `IZQ`, `DER`, `1` y `2`: un básico, dos principales de estilos distintos, una movilidad y una defensa. Nada fuerte de una especialización en el kit base |
| **Kit de especialización** | 4 habilidades: insignia `3` (Nv10), movilidad o utilidad (Nv12), principal (Nv14) y definitiva `4` (Nv15). Cada una con Mejora y 2 variantes de papel opuesto. Solo existen con su especialización |
| **Pasiva de especialización** | Una sola, que se note y se explique en una frase |
| **Mecánica** | La barra que ya existe en `spec-mechanics.js`, con sus tres textos: generar, descargar y pérdida |
| **Árbol de clase** | 30 nodos, 53 rangos, filas 0–8. Toca el kit base y lo genérico de la clase. Tres caminos a tres finales de **utilidad o ritmo** (el daño grande vive en la especialización). Ningún nodo nombra una habilidad de especialización |
| **Árbol de especialización** | **La misma rejilla para todas:** 29 nodos, 59 rangos, filas 0–9 (ver la tabla del Piromante en §5: fila, columna, rangos y requisitos). Columna izquierda = arquetipo A, centro = B, derecha = C |
| **Arquetipos** | Tres por especialización, cada uno con elección definitoria en la fila 3 (A grupos / B jefes), penúltimo de 3 rangos en la fila 7 y final de 3 rangos en la fila 8. Ápice de 4 rangos en la fila 9 que sirve a los tres |
| **Híbridos** | Fila 2: (2,2) = A + B y (2,4) = B + C. Fila 5: (5,3) = los tres. Una build híbrida sin final debe quedar a ~8–9 % de la mejor en cada escenario |
| **Árboles héroe** | Tres por clase, **temáticos de la clase, no de un elemento ni de una especialización**; cada uno lo comparten 2 especializaciones; 13 nodos (clave gratis, 3 elecciones, capstone); su mecánica funciona con cualquier especialización |

### 17.2 Ritmo y presupuesto (iguales para todas las clases)

| Regla | Valor |
|---|---|
| Nivel máximo | 100 |
| Especialización | Pares 10–70 = 31 puntos; nodo clave gratis al Nv10 |
| Clase | Impares 11–69 + 85/90/95/100 = 34 |
| Paragon | Se abre al tener 31/31 de especialización gastados; clave gratis + 10 puntos (71–80); en pausa si bajas de 31/31 |
| Tablero de glifos | 16 puntos (81–100 salvo los de clase); legendarios con estadísticas, no poderes |
| Puertas | Clase 8 → fila 4, 24 → fila 7 · Especialización 8 → fila 4, 20 → fila 7, 25 → ápice |
| Finales | Uno al máximo cabe (clase 30 a Nv69; especialización 26 a Nv60, ápice completo 30 a Nv68); dos al máximo no caben |

### 17.3 Contenido

| Regla | Detalle |
|---|---|
| Formas | Círculo = pasivo · Cuadrado = activo (concede habilidad) · Hexágono = elección A/B |
| Habilidades de talento | Solo como opción A de una elección (frente a una pasiva B) y solo para la ranura `2`. Máx. 3 en clase y 1 por árbol héroe |
| Etiquetas | Cada nodo es «número» o «mecánica». Filas 3–9: ≥ 60 % mecánica. Un «número» debe ser ≥ +10 % en su eje |
| Textos | Verbo + efecto + número; «antes X» al cambiar un valor; ≤ 120 caracteres; sin siglas (UNI, ÁREA×5, TTD), sin *stagger* (es **Quebranto**), sin *proc* |
| Elecciones | Cada una con «cuál conviene» en palabras: contra jefes / contra grupos / para controlar / para sobrevivir |
| Forja frente a talento | La forja cambia forma, geometría, elemento, rebotes, cargas y ritmo. El talento añade, multiplica, repite o da números. Ningún nombre repetido |
| Categorías | Básica · Principal · Movilidad · Defensa · Utilidad · Insignia · Definitiva |

### 17.4 Entregables por clase

1. Auditoría de la clase actual (activas, quién las toca y conflictos), como §2.
2. Kit base y kits de especialización con forja, como §5.2 y §5.3.
3. Árbol de clase con su revisión por especialización (§4.1).
4. Tres árboles de especialización con arquetipos, híbridos, ápice y tabla de implementación.
5. Tres árboles héroe de la clase.
6. Cuatro builds por especialización (una híbrida), validadas punto a punto, con rotación y estimación.
7. Datos en el mockup (`TALENTS_V2`-equivalente) y selector funcionando; capturas a 1366 y 1920.
8. Criterios G1–G16 adaptados.

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

### A.5 Esbozo de Crionte y Arcanista (superado: ver §5.2 y §5.3)

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
| `bola_fuego` | Bola de Fuego | base · principal · `DER/2` | 2 | 2,2 + **1,0** a 2 m | 18 · 1,5 s · prep. 0,3 s | Esfera ardiente que explota a 2 m | **Salpicadura 3,5 → 1,0** en el kit base. El Piromante la recupera (3,5) con su pasiva |
| `nova_hielo` | Nova de Hielo | base · principal · `DER/2` | **8** (era 14) | 1,4 r 3,3 | 25 · 4 s | Onda gélida que ralentiza 30 % 3 s | Pasa al kit base y se aprende antes |
| `m_parpadeo` | Parpadeo | base · movilidad · `1` | **4** | — | — · **12 s** | Teletransporte de 8 m al cursor; atraviesa enemigos | **Nuevo id** (era `m_t_parpadeo`, talento c3). Enfriamiento 15 → 12 s para competir con Estela (10 s) |
| `m_barrera` | Barrera de Maná | base · defensa · `2` | **6** | — | — · 20 s | Escudo del 60 % del maná máximo durante 8 s | **Nuevo id** (era `m_t_barrera`, talento c2) |
| `p_llamarada` | Llamarada | Piromante · insignia · `3` | 10 | 1,5 cono 7 m 70° | 25 · 8 s · prep. 0,1 s | Cono de fuego que detona las Quemaduras (60 % de lo que les queda) | Pasa al libro (`spec:'piromante'`). Ya no la concede s0. **Gana forja** |
| `m_estela_ignea` | Estela Ígnea | Piromante · movilidad · `1` | 12 | 0,4/s × 3 s | — · 10 s | Desliz de 6 m dejando fuego | Solo con Piromante |
| `meteoro` | Meteoro | Piromante · principal · `DER/2` | 14 | 3,7 r 3 | 40 · 6 s · cae a 0,6 s | Meteoro sobre la zona | Solo con Piromante |
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

