# Paso 2g: coherencia de la Maga, v2 (talentos estilo WoW: clase · Paragon · Piromante), documento de diseño

> Estado: **diseño v2**, sin código del juego. Fecha: 2026-10-20. Alcance: la **Maga Piromante completa** (árbol de clase, árbol del Piromante, árboles héroe del Paragon). Crionte y Arcanista quedan esbozados (§7.3 y Anexo A.5).
> Mockup: `docs/mockups/skills-ux.html` (clase Maga, vista Talentos con `N` o `&view=talents`). Pasó **tres rondas de refutación** con capturas y cuadros de animación (§15).
> **Fuente única de datos:** el bloque `TALENTS_V2` / `BUILDS_V2` del mockup. Las tablas de §4, §5, §6 y §7 se **generaron** desde ese bloque (no se copiaron a mano).
> La v1 (commit `993cefc`) **fue rechazada por el dueño**. Lo que sigue vigente de la v1 (auditoría, kit, forja) está en el Anexo A.

## 0. Historial: v1 → v2

| | v1 (rechazada) | v2 (este documento) | Por qué cambió |
|---|---|---|---|
| **Forma** | Dos árboles pequeños (15 + 21 nodos), 20 + 21 puntos | **Tres columnas como WoW:** árbol de CLASE (30 nodos, 31 puntos) · **PARAGON** = árbol héroe (13 nodos, 13 puntos) · árbol del PIROMANTE (29 nodos, 31 puntos) | El dueño pidió árboles grandes «como WoW TWW/Midnight», con decisiones que se sientan |
| **Nodos** | Muchos «+4 %», «+2 % de crítico», «+1 de maná» | **Nada de relleno de +1–3 %.** Cada nodo se nota; cada elección A/B dice **«A gana en X, B gana en Y»** | «Elecciones que valgan la pena» |
| **Activas** | Ningún nodo concedía activas | **Tres** nodos de elección de clase ofrecen una activa (opción A) contra una pasiva (opción B), solo para la ranura `2` | El árbol de clase de WoW tiene utilidad activa. Competir por la `2` **es** la decisión |
| **Árbol de clase** | No tocaba la Bola ni la Nova | Toca el **kit base completo** (Dardo, Bola, Nova, Parpadeo, Barrera) y lo **genérico** (maná, crítico, velocidad de lanzamiento, defensa) | Precisión del dueño (b) |
| **Finales** | Ápice de 3 nodos pequeños | **Una fila de finales muy potentes** por árbol; el presupuesto alcanza para **uno**; dos cuestan casi todo (§3.3) | Precisión (c) |
| **Piromante** | Pasivas de número | **Tres arquetipos reales** (Brasa, Cataclismo, Ignición), cada uno con camino, elección que lo define y final; **nodos híbridos** a media altura; una **build híbrida** viable sin final | Precisiones (d) y (e) |
| **Etiquetas** | — | Cada nodo es **«número»** o **«mecánica»**; en las filas medias y bajas manda «mecánica» (§3.4) | Precisión (f) |
| **Paragon** | Tablero de glifos desde Nv20 | **Árbol héroe** al Nv41–53 (2 por especialización, compartidos); el tablero de glifos pasa a Nv54+ | WoW TWW: talentos héroe |
| **UI** | Panel de dos columnas, poco texto | Tres columnas con cabecera por árbol, arte de fondo, octógonos de elección que se **abren en dos mitades al pasar el ratón**, puertas visibles, loadouts, código, Recomendado, deshacer; **motion design** completo | Pedido de UI/UX y animación |

**Qué NO cambió de la v1** (Anexo A): el modelo de capas (kit base · kit de especialización · talentos · forja), el catálogo del Piromante (Llamarada, Estela Ígnea, Meteoro, Supernova), la pasiva Bola 100 → 350 %, la forja de cada habilidad y la regla «la forja transforma; el talento añade o multiplica».

## 1. Resumen (15 líneas)

1. Talentos en **tres columnas**: Clase (31 puntos, Nv10–40) · **Paragon** (árbol héroe, 13 puntos, Nv41–53) · Piromante (31 puntos, Nv10–40).
2. Un punto de clase y uno de especialización **por nivel** del 10 al 40; el nodo clave del Piromante (Ignición) es gratis.
3. **Puertas por puntos gastados** arriba: clase 8 → fila 4 y 22 → fila 7; Piromante 8 → fila 4, 20 → fila 7 y 25 + Nv35 → ápice.
4. Finales (fila 8) de 3 rangos y **muy potentes**: el presupuesto da para **uno** por árbol con 1–3 puntos de margen; **dos** solo con uno o los dos a rango 1, sacrificando el ápice y casi todo lo híbrido.
5. **Árbol de clase**: el kit base (Dardo, Bola, Nova, Parpadeo, Barrera) y lo genérico. Tres caminos a tres finales: **Bastión Arcano** (defensa), **Archimaga** (arcano: eco de gastadoras) y **Paso del Vacío** (movilidad).
6. Tres elecciones de clase ofrecen una **activa** para la ranura `2` (Bloque de Hielo, Inversión del Tiempo, Contrahechizo) contra una pasiva; si la eliges, aparece en el libro con la etiqueta TALENTO.
7. **Piromante**: tres arquetipos con camino, elección definitoria y final: **Brasa** (Propagación → Incendio Forestal), **Cataclismo** (Meteoro Gemelo → Lluvia de Fuego), **Ignición** (Llamarada Avivada → Combustión Perpetua).
8. Nodos **híbridos** a media altura (Chispas, Combustible Volátil, Brasero, Barrera Resonante, Escarcha Arcana) y penúltimos fuertes (3 rangos) hacen viable una build **sin final**.
9. Cuatro builds de ejemplo con puntos por nodo y rotación (§6); la híbrida «Brasa Ardiente» queda a ≤ 9 % de la mejor en UNI y en ÁREA (estimación, se calibra en E3).
10. Etiquetas: 41 de 59 nodos son «mecánica» en clase + Piromante; en las filas 3–9 son 33 de 41 (80 %).
11. **Paragon** = árbol héroe compartido por dos especializaciones: Piromante elige **Señora del Sol** (con Arcanista) o **Escarcha Ardiente** (con Crionte). El tablero de glifos sigue, desde el Nv54.
12. La **forja transforma** (forma, elemento, ritmo) y el **talento añade o multiplica** (ecos, contagios, ventanas): ningún nodo repite una variante (§8).
13. UI: cabecera por árbol («Gastados X / Y», «Nv req.»), arte de fondo, octógonos de elección que se abren en dos mitades, rangos, flechas, puertas con sello, ápice, tooltips ricos con `Alt`, Paragon bloqueado con vista previa, loadouts, código, Recomendado y deshacer.
14. **Motion**: gastar, abrir puerta, elegir (giro), quitar, deshacer, revelar el Paragon, cambiar de especialización e iluminar por habilidad; solo `transform`/`opacity`, 120–900 ms, con `prefers-reduced-motion`.
15. Implementación en 6 etapas (§14), migración v5 → v6 con respec gratis (§11).

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

## 3. Modelo: columnas, puntos, puertas y presupuesto

### 3.1 Las tres columnas

| Columna | Nodos · puntos | Cuándo | Qué toca |
|---|---|---|---|
| **Maga** (clase) | 30 nodos · 53 rangos · **31 puntos** | 1 punto por nivel, Nv10–40 | Kit base (Dardo, Bola, Nova, Parpadeo, Barrera) y lo genérico: maná, crítico, velocidad de lanzamiento, defensa, control. **Nunca** una habilidad de especialización ni `@spec` |
| **Paragon** (árbol héroe) | 13 nodos · **13 puntos** | 1 punto por nivel, Nv41–53 | La fantasía compartida por dos especializaciones (§7). Bloqueado antes del Nv41 con **vista previa** |
| **Piromante** | 29 nodos · 59 rangos · **31 puntos** (+ Ignición gratis) | 1 punto por nivel, Nv10–40 | Su kit (Llamarada, Estela Ígnea, Meteoro, Supernova), la Bola de Fuego, la Quemadura y el Calor |

Hoy (`js/talents.js`) se gana **un** punto por nivel alternando clase y especialización hasta el Nv50 (20 + 21). La v2 da **dos por nivel** (uno a cada árbol) del 10 al 40: el mismo ritmo que WoW y un árbol lleno al Nv40, con el Paragon como meta del Nv41 en adelante.

### 3.2 Reglas de compra

- **Requisito:** un nodo con flechas entrantes exige **cualquiera** de sus requisitos **al máximo** (como WoW).
- **Puertas:** una fila se abre con los puntos gastados **en las filas de arriba**. Clase: **8 → fila 4**, **22 → fila 7**. Piromante: **8 → fila 4**, **20 → fila 7**, **25 y Nv35 → ápice**.
- **Rangos:** pasivas de número 1–3; elecciones 1; **penúltimos (fila 7) y finales (fila 8): 3**; ápice: 4.
- **Elección:** un octógono con dos mitades; pagar el punto exige elegir una. Cambiar de mitad es gratis fuera de combate.
- **Clic derecho** quita un rango; si deja colgando nodos de abajo, se quitan también (con el aviso «quita también: …»). `Ctrl+Z` deshace.

### 3.3 Presupuesto: cuánto cuesta un final y qué pierdes por dos

Calculado con `check.js` sobre los datos del mockup (camino mínimo con rangos completos, respetando puertas).

| Árbol | Un final **al máximo** | Margen | Dos finales | Qué sacrificas por el segundo |
|---|---|---|---|---|
| **Clase** (31) | **28** puntos (camino de 9 nodos + 22 de puerta) | **3** puntos libres | **30** con **los dos a rango 1** (al máximo serían 34: imposible) | Los dos finales quedan a ⅓ de potencia; los dos penúltimos al máximo son obligatorios; solo queda **1** punto libre: nada de Mente Afilada, Celeridad ni elecciones de defensa fuera del camino |
| **Piromante** (31) | **26** puntos; con el **ápice** completo, **30** | **1** punto libre | **28** con los dos a rango 1 (sin ápice: exige un final al máximo) · o **30** con uno al máximo y otro a rango 1, más **1** rango de ápice | Pierdes **3 de los 4 rangos del ápice** (Ignición Total a 80, Calor por élite, Supernova automática) y todos los nodos híbridos de media altura (Brasero, Pirotecnia, Ola de Calor) |

**Coste por final (camino mínimo):**

| Final | Camino | Puntos hasta el final al máximo |
|---|---|---|
| c28 **Bastión Arcano** | c1 → c5 → c8 → c11 → c15 → c19 → c22 → c25 → c28 | 28 |
| c29 **Archimaga** | c2 → c6 → c10 → c14 → c17 → c20 → c23 → c26 → c29 | 28 |
| c30 **Paso del Vacío** | c2 → c6 → c10 → c14 → c17 → c20 → c24 → c27 → c30 | 28 |
| s25 **Incendio Forestal** | s0 → s1 → s5 → s8 → s11 → s15 → s18 → s22 → s25 | 26 |
| s26 **Combustión Perpetua** | s0 → s1 → s5 → s8 → s11 → s15 → s19 → s23 → s26 | 26 |
| s27 **Lluvia de Fuego** | s0 → s2 → s6 → s10 → s14 → s17 → s21 → s24 → s27 | 26 |
| s28 **Corazón del Sol** (ápice) | cualquier final al máximo + 25 arriba + Nv35 | +4 |

**Por qué un final a rango 1 vale poco:** cada final escala fuerte por rango (por ejemplo, Archimaga: la segunda gastadora sale al 40 / 60 / 80 %; Paso del Vacío: +15 / +30 / +45 %). Un rango sirve para «probar» el final, no para jugarlo.

### 3.4 Etiquetas «número» y «mecánica»

- **Número:** sube un valor de algo que ya haces (+30 % de maná, −30 % de enfriamiento de la Bola). Se permite solo si **se nota** (≥ +10 % en su eje, o un cambio de ritmo visible).
- **Mecánica:** cambia **qué haces o cuándo** (un eco, un contagio, una ventana, un disparador, una activa).

| Árbol | Filas 0–2 | Filas 3–6 | Filas 7–9 |
|---|---|---|---|
| Clase | 4 mecánica / 6 número | **9 / 5** | **6 / 0** |
| Piromante | 4 / 4 | **11 / 3** | **7 / 0** |
| Paragon | — | — | Señora del Sol 10 de 13 mecánica · Escarcha Ardiente 12 de 13 |

Las filas de arriba son la «entrada» (números claros para los primeros niveles); de la fila 3 hacia abajo manda la mecánica.

---

## 4. Árbol de clase de la Maga (30 nodos)

Tabla generada del mockup. «Requiere» = cualquiera de esos nodos al máximo. Las opciones de elección muestran su papel entre corchetes.

| Fila | Id | Nodo | Tipo | Etiqueta | Rangos | Requiere | Efecto (al máximo) | Gana en |
|---|---|---|---|---|---|---|---|---|
| 0 | c1 | Reservas Profundas | pasiva | número | 2 | — | r2: +30 % de maná máximo |  |
| 0 | c2 | Intelecto Arcano | pasiva | número | 2 | — | r2: +12 % de daño de hechizos |  |
| 0 | c3 | Reflejos Arcanos | pasiva | número | 2 | — | r2: Parpadeo: −4 s de enfriamiento |  |
| 1 | c4 | Escudo Prismático | pasiva | número | 3 | c1 | r3: −24 % de daño recibido con la Barrera activa |  |
| 1 | c5 | Dardo: Certero o Sifón | elección | mecánica | 1 | c1 o c2 | **A·Dardo Certero**: Cada 4.º Dardo Arcano es crítico seguro [UNI]<br>**B·Dardo Sifón**: Si el Dardo mata: +6 de maná y −1 s a tus gastadoras [ÁREA×5] | A gana en UNI (un crítico seguro cada 4,4 s). B gana en ÁREA×5 (con la manada muriendo, ≈1 gastadora extra cada 8 s) |
| 1 | c6 | Bola: Núcleo u Onda | elección | número | 1 | c2 o c3 | **A·Núcleo Denso**: Bola de Fuego: +30 % de daño del impacto directo [UNI]<br>**B·Onda Expansiva**: Bola de Fuego: +35 % de daño de la explosión [ÁREA×5] | A gana en UNI. B gana en ÁREA×5 (la explosión es la mayor parte del daño contra 5) |
| 1 | c7 | Paso Fugaz | pasiva | mecánica | 1 | c3 | Tras Parpadeo: +30 % de velocidad de movimiento 3 s |  |
| 2 | c8 | Piel de Maná | pasiva | número | 2 | c4 o c5 | r2: Con más del 50 % de maná: −16 % de daño recibido |  |
| 2 | c9 | Nova: Congelante o Cortante | elección | mecánica | 1 | c5 o c6 | **A·Nova Congelante**: Nova de Hielo congela 1 s a los que no son jefes (1 vez cada 8 s) [CONTROL]<br>**B·Nova Cortante**: Nova de Hielo: +40 % de daño; ralentiza 1 s menos [ÁREA×5] | A gana en CONTROL y TTD+ (8–12 % del tiempo con control duro). B gana en ÁREA×5 |
| 2 | c10 | Ralentizar o Disrupción | elección | mecánica | 1 | c6 o c7 | **A·Ralentizar**: Cada 8 s, tu siguiente hechizo ralentiza un 50 % durante 4 s [CONTROL]<br>**B·Disrupción**: Cada 10 s, tu siguiente Dardo interrumpe y silencia 3 s (jefes: +20 de stagger) [UNI] | A gana en CONTROL y TTD+ contra manadas. B gana contra jefes con lanzamientos (+2 Quebrantados/min) y élites hechiceros |
| 3 | c11 | Bloque de Hielo o Aguante | elección | mecánica | 1 | c8 | **A·Bloque de Hielo** (ACTIVA): ACTIVA (ranura 2): inmune 4 s, sin moverte; 90 s [TTD+]<br>**B·Aguante Arcano**: Un golpe letal te deja con 1 de vida y una Barrera gratis (cada 120 s) [TTD+] | A gana contra golpes anunciados (jefes) si la pones en la 2. B gana sin ocupar ranura (deja la 2 para una gastadora): mejor UNI con seguro |
| 3 | c12 | Flujo de Maná | pasiva | número | 2 | c8 o c9 | r2: +4 de maná al golpear |  |
| 3 | c13 | Mente Afilada | pasiva | número | 2 | c9 o c10 | r2: +10 % de probabilidad de crítico |  |
| 3 | c14 | Parpadeo: Runa o Reparo | elección | mecánica | 1 | c10 | **A·Runa de Escarcha**: Al salir de Parpadeo dejas una runa: ralentiza un 50 % 3 s [CONTROL]<br>**B·Parpadeo Reparador**: Parpadeo te cura un 8 % y quita las ralentizaciones [TTD+] | A gana en CONTROL (escapar de cuerpo a cuerpo). B gana en TTD+ |
| 4 | c15 | Escudo de Maná o Mente Clara | elección | mecánica | 1 | c11 o c12 | **A·Escudo de Maná**: El 20 % del daño que recibes lo paga tu maná [TTD+]<br>**B·Mente Clara**: +30 % de regeneración de maná; a maná lleno, +10 % de daño [UNI] | A gana en TTD+ (+15–20 %). B gana en UNI (+6–8 %: más gastadoras) |
| 4 | c16 | Armonía o Pureza Elemental | clave | mecánica | 1 | c12 o c13 | **A·Armonía Elemental**: Cambiar de elemento entre hechizos: +8 % de daño 5 s (hasta ×3) [UNI]<br>**B·Pureza Elemental**: 3 hechizos seguidos del mismo elemento: +15 % de daño de ese elemento 6 s [ÁREA×5] | A gana con kits mezclados (Dardo arcano + Fuego + Nova): +16–24 %. B gana con kits puros (Saeta Ígnea + Fuego): +15 % casi permanente. Une el árbol con la FORJA |
| 4 | c17 | Inversión o Anclaje | elección | mecánica | 1 | c13 o c14 | **A·Inversión del Tiempo** (ACTIVA): ACTIVA (ranura 2): vuelves a tu vida y lugar de hace 5 s; 60 s [TTD+]<br>**B·Anclaje Temporal**: Al bajar del 30 %: −30 % de daño recibido y +50 % de velocidad 4 s (60 s) [TTD+] | A gana contra picos de daño (jefes). B gana contra manadas (daño constante) y sin ocupar ranura |
| 5 | c18 | Barrera Reforzada | pasiva | número | 2 | c15 | r2: La Barrera de Maná absorbe un 50 % más |  |
| 5 | c19 | Barrera Resonante | pasiva | mecánica | 1 | c15 o c16 | Con la Barrera activa, cada Dardo devuelve 2 de maná y la refuerza un 2 % de vida<br>_híbrido: Defensa + Arcano_ |  |
| 5 | c20 | Escarcha Arcana | pasiva | mecánica | 1 | c16 o c17 | Tus críticos ralentizan un 30 % 2 s; contra ralentizados, tus Dardos tienen +15 % de crítico<br>_híbrido: Arcano + Control_ |  |
| 5 | c21 | Escarcha Tenaz | pasiva | número | 1 | c17 | Tus ralentizaciones duran +2 s |  |
| 6 | c22 | Contrahechizo o Canalizador | elección | mecánica | 1 | c18 o c19 | **A·Contrahechizo** (ACTIVA): ACTIVA (ranura 2): interrumpe a 12 m y silencia 3 s; 18 s [CONTROL]<br>**B·Canalizador**: Hechizos de más de 20 de maná: −20 % de coste [UNI] | A gana en grupo y contra lanzadores. B gana en UNI (+5–7 %) |
| 6 | c23 | Ritmo Arcano | pasiva | mecánica | 2 | c19 o c20 | r2: Los críticos del Dardo bajan 1 s el enfriamiento de Parpadeo y Barrera |  |
| 6 | c24 | Celeridad | pasiva | número | 2 | c20 o c21 | r2: +14 % de velocidad de lanzamiento |  |
| 7 | c25 | Cristal de Barrera | pasiva | mecánica | 3 | c22 | r3: Al romperse, la Barrera estalla: empuja 3 m, ralentiza 40 % 2 s y te devuelve un 30 % de maná |  |
| 7 | c26 | Torrente de Maná | pasiva | mecánica | 3 | c23 | r3: Gastar 60 de maná en 3 s te da Sobrecarga 4 s: +28 % de daño |  |
| 7 | c27 | Imagen Arcana | pasiva | mecánica | 3 | c24 | r3: Parpadeo deja una imagen 5 s que provoca a los enemigos a 6 m |  |
| 8 | c28 | Bastión Arcano | **FINAL** | mecánica | 3 | c25 | r3: La Barrera no caduca: dura hasta romperse y se recarga 20 s después. Mientras aguanta, tus hechizos cuestan un 30 % menos<br>_final: Defensa_ |  |
| 8 | c29 | Archimaga | **FINAL** | mecánica | 3 | c26 | r3: Cada 4.ª gastadora se lanza dos veces (la segunda al 80 %) sin coste<br>_final: Arcano_ |  |
| 8 | c30 | Paso del Vacío | **FINAL** | mecánica | 3 | c27 | r3: Tras Parpadeo, tu siguiente gastadora no gasta enfriamiento y hace +45 %<br>_final: Movilidad_ |  |

**Tres finales, tres maneras de jugar la Maga** (para cualquier especialización):

| Final | Camino (rama) | Cambia el juego así | Mejor con |
|---|---|---|---|
| **Bastión Arcano** | Izquierda: defensa (Escudo Prismático, Piel de Maná, Bloque/Aguante, Escudo de Maná, Barrera Resonante, Cristal de Barrera) | La Barrera deja de ser un botón de pánico: está **siempre puesta** y abarata un 30 % tus hechizos | Builds de contacto (Brasa), Hardcore, jefes Pináculo |
| **Archimaga** | Centro: arcano (Dardo, Flujo de Maná, Mente Afilada, Torrente de Maná) | **Cada 4.ª gastadora se lanza dos veces** sin coste: duplica tus golpes grandes | Ignición y la híbrida (más gastadoras = más Calor y críticos) |
| **Paso del Vacío** | Derecha: movilidad (Reflejos, Paso Fugaz, Runa/Reparo, Celeridad, Imagen Arcana) | Parpadeo se vuelve **ofensivo**: tras él, la siguiente gastadora no gasta enfriamiento y hace +45 % | Cataclismo (Parpadeo → Meteoro dentro del cráter) |

**Activas de clase (solo como opción A, solo ranura `2`).**

| Nodo | A (activa) | B (pasiva) | Gana en |
|---|---|---|---|
| c11 | **Bloque de Hielo**: inmune 4 s sin moverte · 90 s | Aguante Arcano: un golpe letal te deja con 1 de vida y una Barrera (120 s) | A contra golpes anunciados de jefe · B sin ocupar la `2` |
| c17 | **Inversión del Tiempo**: vuelves a tu vida y lugar de hace 5 s · 60 s | Anclaje Temporal: bajo el 30 %, −30 % de daño y +50 % de velocidad 4 s | A contra picos · B contra daño constante |
| c22 | **Contrahechizo**: interrumpe a 12 m y silencia 3 s · 18 s | Canalizador: hechizos de > 20 de maná, −20 % de coste | A en grupo y contra lanzadores · B en UNI (+5–7 %) |

Si eliges la A, la activa aparece en el **libro** (kit base) con la etiqueta **TALENTO** y «Activa de clase (talento c11) · ranura 2». Si cambias a B, sale del libro y de la barra (la `2` vuelve a la Barrera de Maná).

**Implementación (por nodo):** `c1` stats.mpPct · existe; `c2` mod @all dmg · existe; `c3` mod m_parpadeo cdr · existe; `c4` tv.barrierDr · existe; `c5` A: power m_dardo_certero · NUEVO · B: power m_dardo_sifon · NUEVO; `c6` A: mod bola_fuego dmgDirect · NUEVO (clave) · B: mod bola_fuego splashPct · NUEVO (clave); `c7` power m_paso_fugaz · NUEVO (afterCast + addBuff); `c8` tv.drHighMana · existe; `c9` A: power m_nova_congelante · NUEVO (applyCC freeze) · B: mod nova_hielo dmg/slow · claves existentes; `c10` A: power m_ralentizar · existe · B: power m_disrupcion · NUEVO (lógica de m_t_contrahechizo); `c11` A: activa m_t_bloque · existe · B: power m_aguante · NUEVO (onLethal); `c12` stats.mph · existe; `c13` stats.crit · existe; `c14` A: power m_runa · NUEVO (spawnField zona) · B: power m_parpadeo_cura · NUEVO (g.heal); `c15` A: power m_escudo_mana · NUEVO (④ onDamaged) · B: stats regen + tv.highManaDmg · existe; `c16` A: power m_armonia · NUEVO · B: power m_pureza · NUEVO; `c17` A: activa m_t_inversion · existe · B: power m_anclaje · NUEVO (onDamaged); `c18` mod m_barrera shieldManaPct · claves; `c19` power m_barrera_resonante · NUEVO; `c20` power m_escarcha_arcana · NUEVO; `c21` mod @all slow +2 · claves; `c22` A: activa m_t_contrahechizo · existe · B: tv.costRedBig · existe; `c23` tv.dartCritCdr · NUEVO; `c24` stats.aspdPct · existe; `c25` power m_cristal · NUEVO (onShieldBreak); `c26` power m_torrente · NUEVO (⑪ onResource); `c27` power m_imagen · NUEVO (g.forceTarget); `c28` power m_bastion · NUEVO; `c29` power m_archimaga · NUEVO (eco por el canal); `c30` power m_vacio · NUEVO.

---

## 5. Árbol del Piromante (29 nodos)

| Fila | Id | Nodo | Tipo | Etiqueta | Rangos | Requiere | Efecto (al máximo) | Gana en |
|---|---|---|---|---|---|---|---|---|
| 0 | s0 | Ignición | clave | mecánica | gratis | gratis | Tus golpes de Fuego queman (60 % en 4 s) y la Bola de Fuego explota al 350 % |  |
| 1 | s1 | Brasas | pasiva | número | 3 | s0 | r3: La Quemadura dura +3 s<br>_arquetipo: brasa_ |  |
| 1 | s2 | Calor Abrasador | pasiva | número | 3 | s0 | r3: +15 % de crítico contra enemigos en llamas<br>_arquetipo: ignicion_ |  |
| 1 | s3 | Mecha Corta | pasiva | número | 3 | s0 | r3: Bola de Fuego: −30 % de enfriamiento<br>_arquetipo: cataclismo_ |  |
| 2 | s4 | Llama Persistente | pasiva | número | 2 | s1 | r2: +30 % de daño de Quemadura<br>_arquetipo: brasa_ |  |
| 2 | s5 | Chispas | pasiva | mecánica | 1 | s1 o s2 | Tus críticos sobre enemigos en llamas renuevan su Quemadura y te dan 5 de Calor<br>_arquetipo: brasa+ignicion · híbrido: Brasa + Ignición_ |  |
| 2 | s6 | Combustible Volátil | pasiva | mecánica | 1 | s2 o s3 | Con Ignición Total, la Bola explota en 4 m y el Meteoro cae al instante<br>_arquetipo: ignicion+cataclismo · híbrido: Ignición + Cataclismo_ |  |
| 2 | s7 | Pira | pasiva | mecánica | 2 | s3 | r2: Meteoro deja un charco de fuego 3 s (40 %/s)<br>_arquetipo: cataclismo_ |  |
| 3 | s8 | Propagación o Brasa Profunda | elección | mecánica | 1 | s4 o s5 | **A·Propagación**: Si muere un enemigo en llamas, su Quemadura salta a 2 cercanos [ÁREA×5]<br>**B·Brasa Profunda**: La Quemadura se acumula hasta 3 veces en el mismo enemigo [UNI]<br>_arquetipo: brasa_ | A gana en ÁREA×5 (la manada que muere enciende a la siguiente). B gana en UNI (×2,2 de daño de Quemadura contra el jefe). DEFINE la Brasa: Incendio o Brasa de Jefe |
| 3 | s9 | Llamarada: Avivada o Voraz | elección | mecánica | 1 | s5 o s6 | **A·Llamarada Avivada**: Llamarada detona el 100 % de las Quemaduras y te da 25 de Calor [UNI]<br>**B·Llamarada Voraz**: Si Llamarada detona 3 o más Quemaduras: −4 s de enfriamiento y 8 de Calor por enemigo [ÁREA×5]<br>_arquetipo: ignicion_ | A gana en UNI (una Ignición Total extra cada ~25 s). B gana en ÁREA×5 (Llamarada cada 4 s y Calor al 100 en 2 lanzamientos) |
| 3 | s10 | Meteoro: Gemelo o Concentrado | elección | mecánica | 1 | s6 o s7 | **A·Meteoro Gemelo**: Cada 3.er Meteoro cae dos veces en el mismo sitio [ÁREA×5]<br>**B·Meteoro Concentrado**: Meteoro: +50 % al enemigo más cercano al centro [UNI]<br>_arquetipo: cataclismo_ | A gana en ÁREA×5 (+33 % de Meteoros). B gana en UNI. DEFINE el Cataclismo: barrido o martillo |
| 4 | s11 | Fuego Interior | pasiva | número | 2 | s8 | r2: Matar a un enemigo en llamas: te curas un 4 % y ganas 6 de maná<br>_arquetipo: brasa_ |  |
| 4 | s12 | Pirotecnia | pasiva | mecánica | 2 | s8 o s9 | r2: Cada crítico de Fuego baja 1 s tus enfriamientos de Fuego<br>_arquetipo: ignicion_ |  |
| 4 | s13 | Ceniza Ardiente | pasiva | número | 2 | s9 o s10 | r2: +30 % de daño de Meteoro y Supernova<br>_arquetipo: cataclismo_ |  |
| 4 | s14 | Impacto Sísmico | pasiva | mecánica | 1 | s10 | Meteoro ralentiza un 50 % 3 s a los que sobreviven y suma 20 de stagger a jefes<br>_arquetipo: cataclismo_ |  |
| 5 | s15 | Fénix o Escudo de Llamas | elección | mecánica | 1 | s11 o s12 | **A·Fénix**: Al morir renaces con el 50 % de vida (cada 2 min) [TTD+]<br>**B·Escudo de Llamas**: Quien te pega cuerpo a cuerpo arde; −10 % de daño recibido [TTD+] | A gana en contenido letal (Hardcore, jefe Pináculo). B gana en TTD+ contra manadas (+12–15 %) |
| 5 | s16 | Brasero | pasiva | mecánica | 2 | s12 o s13 | r2: Con más de 50 de Calor: Quemaduras +35 % y Meteoro +20 %<br>_arquetipo: brasa+ignicion+cataclismo · híbrido: Los tres estilos (por el Calor)_ |  |
| 5 | s17 | Estrellas Fugaces | pasiva | mecánica | 2 | s13 o s14 | r2: Supernova suelta además 5 Meteoros menores (40 %) en 3 s<br>_arquetipo: cataclismo_ |  |
| 6 | s18 | Brasa Errante | pasiva | mecánica | 2 | s15 | r2: Las Quemaduras que saltan conservan su daño y duración; +2 saltos<br>_arquetipo: brasa_ |  |
| 6 | s19 | Ignición Rápida | pasiva | mecánica | 2 | s15 o s16 | r2: Cada golpe de Fuego da 9 de Calor (antes 5)<br>_arquetipo: ignicion_ |  |
| 6 | s20 | Ola de Calor | pasiva | número | 2 | s16 o s17 | r2: +30 % de radio de tu Fuego |  |
| 6 | s21 | Estela Meteórica | pasiva | mecánica | 1 | s17 | Al terminar Estela Ígnea, tu siguiente Meteoro cae allí al instante<br>_arquetipo: cataclismo_ |  |
| 7 | s22 | Brasa Viva | pasiva | mecánica | 3 | s18 | r3: Los enemigos en llamas se contagian: cada 1 s, el 40 % de su Quemadura salta a otro a 2 m<br>_arquetipo: brasa_ |  |
| 7 | s23 | Combustión | pasiva | mecánica | 3 | s19 | r3: Al gastar Ignición Total: 4,5 s en los que tu Fuego es siempre crítico<br>_arquetipo: ignicion_ |  |
| 7 | s24 | Cráter | pasiva | mecánica | 3 | s21 | r3: Meteoro deja un cráter 4 s: dentro reciben +25 % de Fuego y tu Bola explota dos veces<br>_arquetipo: cataclismo_ |  |
| 8 | s25 | Incendio Forestal | **FINAL** | mecánica | 3 | s22 | r3: Las Quemaduras se apilan sin límite de origen (máx. 5) y, al morir un enemigo en llamas, TODAS saltan a todos a 4 m; +40 % de daño de Quemadura<br>_final: Brasa · arquetipo: brasa_ |  |
| 8 | s26 | Combustión Perpetua | **FINAL** | mecánica | 3 | s23 | r3: En Combustión, cada crítico de Fuego da 4 de Calor; si llegas a 100, Combustión se alarga 3 s y lanza una Bola gratis; +30 % de daño crítico de Fuego<br>_final: Ignición · arquetipo: ignicion_ |  |
| 8 | s27 | Lluvia de Fuego | **FINAL** | mecánica | 3 | s24 | r3: Con Ignición Total, el Meteoro cae 3 veces (100/60/60 %) y reinicia su enfriamiento si golpea a 3+; +30 % de daño de Meteoro<br>_final: Cataclismo · arquetipo: cataclismo_ |  |
| 9 | s28 | Corazón del Sol | **ÁPICE** | mecánica | 4 | s25 o s26 o s27 | r4: Ignición Total detona las Quemaduras a 8 m (50 % de lo que les queda) …y matar a un élite te da 25 de Calor …e Ignición Total se activa a 80 de Calor …y cada 20 explosiones o detonaciones lanza Supernova sola y gratis |  |

### 5.1 Los tres arquetipos

| Arquetipo | Fantasía | Camino | Elección que lo define | Penúltimo → final | Gana en |
|---|---|---|---|---|---|
| **Brasa** (propagación / DoT) | El fuego **se contagia** solo: matas uno y arde la manada | s1 Brasas → s4 Llama Persistente / s5 Chispas → **s8** → s11 Fuego Interior → s15 → s18 Brasa Errante → s22 **Brasa Viva** → s25 **Incendio Forestal** | **s8 Propagación (A)** = Incendio para manadas · **Brasa Profunda (B)** = Brasa de jefe (×3 acumulaciones) | Brasa Viva (contagio cada 1 s) → Incendio Forestal (al morir uno, **todas** sus Quemaduras saltan a todos a 4 m) | ÁREA×5 y TTD+ (se cura al matar) |
| **Cataclismo** (Meteoro / estallido) | Golpes enormes y **en el sitio justo**: cráteres y lluvias | s3 Mecha Corta → s7 Pira / s6 Combustible Volátil → **s10** → s13 Ceniza / s14 Impacto Sísmico → s17 Estrellas Fugaces → s21 Estela Meteórica → s24 **Cráter** → s27 **Lluvia de Fuego** | **s10 Meteoro Gemelo (A)** = barrido · **Concentrado (B)** = martillo de jefe | Cráter (dentro: +25 % de Fuego y la Bola explota dos veces) → Lluvia de Fuego (con Ignición Total, el Meteoro cae 3 veces y se reinicia si golpea a 3+) | ÁREA×5 con control (ralentiza, stagger) |
| **Ignición** (combustión / crítico) | **Ventanas** de crítico seguro que se encadenan | s2 Calor Abrasador → s5 Chispas → **s9** → s12 Pirotecnia → s16 Brasero → s19 Ignición Rápida → s23 **Combustión** → s26 **Combustión Perpetua** | **s9 Llamarada Avivada (A)** = una Ignición Total extra cada ~25 s · **Voraz (B)** = Llamarada cada 4 s en manada | Combustión (4,5 s de crítico seguro al gastar Ignición Total) → Combustión Perpetua (en Combustión, los críticos dan Calor; a 100, se alarga 3 s y lanza una Bola gratis) | UNI (jefes) |

**Nodos que mezclan arquetipos** (la puerta a las híbridas): **s5 Chispas** (Brasa + Ignición: los críticos renuevan Quemaduras y dan Calor), **s6 Combustible Volátil** (Ignición + Cataclismo: con Ignición Total, la Bola explota en 4 m y el Meteoro cae al instante), **s16 Brasero** (los tres, por el Calor: > 50 de Calor = Quemaduras +35 % y Meteoro +20 %), **s20 Ola de Calor** (+30 % de radio de todo el Fuego).

**El ápice (s28 Corazón del Sol, 4 rangos)** sirve a los tres: r1 Ignición Total detona las Quemaduras a 8 m · r2 matar un élite da 25 de Calor · r3 Ignición Total a 80 de Calor · r4 cada 20 explosiones o detonaciones, Supernova gratis.

**Implementación (por nodo):** `s0` power p_ignicion · existe (+ modifyResolve de la Bola); `s1` tv.burnDur · existe; `s2` tv.burningCrit · existe; `s3` mod bola_fuego cdr · existe; `s4` tv.burnPct · existe; `s5` power p_chispas · NUEVO; `s6` power p_volatil · NUEVO (modifyResolve con prof.ignition); `s7` mod meteoro zone · existe; `s8` A: power p_propagacion · existe · B: power p_acumular · existe; `s9` A: power p_llamarada_avivada · existe · B: power p_llamarada_voraz · NUEVO; `s10` A: power p_meteoro_gemelo · NUEVO (eco por el canal) · B: power p_meteoro_conc · NUEVO (condAdd); `s11` tv.burnKillHeal + burnKillMana · existen; `s12` tv.critFireCdr · existe; `s13` mod meteoro/supernova dmg · existe; `s14` mod meteoro slow + stagger · claves; `s15` A: power p_fenix · existe · B: power p_escudo_llamas · NUEVO; `s16` power p_brasero · NUEVO (cond con gaugeValue); `s17` power p_estrellas_fugaces · NUEVO; `s18` power p_brasa_errante · NUEVO; `s19` stat gaugeGain:calor · existe; `s20` mod @fire radius · existe; `s21` power p_estela_meteorica · NUEVO; `s22` power p_brasa_viva · NUEVO (onTick); `s23` power p_combustion · existe (+ afterCast con prof.ignition); `s24` power p_crater · NUEVO (campo); `s25` power p_incendio · NUEVO; `s26` power p_perpetua · NUEVO; `s27` power p_lluvia_fuego · NUEVO; `s28` power p_corazon_sol (rangos) · NUEVO sobre el existente.

---

## 6. Builds de ejemplo (puntos por nodo y rotación)

Las cuatro son **legales** (31/31 + 13, validadas con `check.js`) y están en el mockup (selector **Configuración** y botón **Recomendado**). Los números de «gana en» son **estimaciones de diseño** (relativas a la mejor build en cada escenario); se calibran en E3 con `balance-bench`.

### 6.1 «Incendio» (Brasa)

- Clase (31/31): Reservas Profundas 2 · Escudo Prismático 3 · Dardo Sifón (B) 1 · Piel de Maná 2 · Aguante Arcano (B) 1 · Escudo de Maná (A) 1 · Barrera Resonante 1 · Canalizador (B) 1 · Cristal de Barrera 3 · Bastión Arcano 3 · Intelecto Arcano 2 · Flujo de Maná 2 · Nova Cortante (B) 1 · Pureza Elemental (B) 1 · Barrera Reforzada 2 · Mente Afilada 2 · Reflejos Arcanos 1 · Onda Expansiva (B) 1 · Ralentizar (A) 1
- Piromante (31/31): Ignición (gratis) · Brasas 3 · Llama Persistente 2 · Chispas 1 · Propagación (A) 1 · Fuego Interior 2 · Escudo de Llamas (B) 1 · Brasa Errante 2 · Brasa Viva 3 · Incendio Forestal 3 · Corazón del Sol 4 · Calor Abrasador 3 · Llamarada Voraz (B) 1 · Pirotecnia 2 · Brasero 2 · Mecha Corta 1
- Paragon: Escarcha Ardiente 13/13 (elecciones Choque Amplio, Niebla Térmica, Desequilibrio)

**Rotación.** Abre con Dardo (Saeta Ígnea) o Bola (Racimo) **en la manada**, no en el objetivo: lo que importa es encender a muchos. Llamarada **Voraz** en cuanto 3+ arden: detona, baja 4 s su enfriamiento y te llena el Calor. Con Ignición Total, Bola gratis al centro. Desde ahí, **matar es tu rotación**: cada muerte salta las Quemaduras (Propagación + Brasa Errante + Incendio Forestal) y te cura (Fuego Interior). Supernova en las manadas grandes. Bastión Arcano mantiene la Barrera siempre puesta mientras peleas de cerca.
**Cambia respecto del kit pelado:** dejas de apuntar; eliges **dónde empieza** el fuego.

### 6.2 «Lluvia de Fuego» (Cataclismo)

- Clase (31/31): Intelecto Arcano 2 · Reflejos Arcanos 2 · Onda Expansiva (B) 1 · Paso Fugaz 1 · Ralentizar (A) 1 · Runa de Escarcha (A) 1 · Anclaje Temporal (B) 1 · Escarcha Arcana 1 · Celeridad 2 · Imagen Arcana 3 · Paso del Vacío 3 · Reservas Profundas 2 · Dardo Sifón (B) 1 · Nova Cortante (B) 1 · Flujo de Maná 2 · Mente Afilada 2 · Pureza Elemental (B) 1 · Escarcha Tenaz 1 · Ritmo Arcano 2 · Piel de Maná 1
- Piromante (31/31): Ignición (gratis) · Mecha Corta 3 · Pira 2 · Combustible Volátil 1 · Meteoro Gemelo (A) 1 · Ceniza Ardiente 2 · Impacto Sísmico 1 · Estrellas Fugaces 2 · Estela Meteórica 1 · Cráter 3 · Lluvia de Fuego 3 · Corazón del Sol 4 · Calor Abrasador 3 · Llamarada Voraz (B) 1 · Brasero 2 · Ola de Calor 2
- Paragon: Señora del Sol 13/13 (elecciones Sol Gemelo, Escudo Solar, Corona Ígnea)

**Rotación.** Estela Ígnea por encima de la manada → al terminar, **Meteoro instantáneo** allí (Estela Meteórica) → Cráter. Dentro del cráter, Bola de Fuego (Mecha Corta: cada ~1 s) que **explota dos veces** y llena el Calor. A 100, Meteoro con Ignición Total: **cae 3 veces** y, si golpea a 3+, se reinicia. Parpadeo (Paso del Vacío) → la siguiente gastadora sin enfriamiento y +45 %: guárdalo para otro Meteoro. Supernova suelta Estrellas Fugaces. Impacto Sísmico ralentiza a los que sobreviven y suma stagger.
**Cambia:** juegas por **posición**: llevas a la manada al cráter.

### 6.3 «Combustión Perpetua» (Ignición)

- Clase (31/31): Reservas Profundas 2 · Intelecto Arcano 2 · Dardo Certero (A) 1 · Núcleo Denso (A) 1 · Nova Cortante (B) 1 · Flujo de Maná 2 · Mente Afilada 2 · Armonía Elemental (A) 1 · Barrera Resonante 1 · Ritmo Arcano 2 · Torrente de Maná 3 · Archimaga 3 · Disrupción (B) 1 · Inversión del Tiempo (A) 1 · Escarcha Arcana 1 · Escudo Prismático 2 · Piel de Maná 2 · Mente Clara (B) 1 · Reflejos Arcanos 2
- Piromante (31/31): Ignición (gratis) · Calor Abrasador 3 · Chispas 1 · Llamarada Avivada (A) 1 · Pirotecnia 2 · Brasero 2 · Ignición Rápida 2 · Combustión 3 · Combustión Perpetua 3 · Corazón del Sol 4 · Brasas 3 · Llama Persistente 1 · Brasa Profunda (B) 1 · Fénix (A) 1 · Mecha Corta 3 · Combustible Volátil 1
- Paragon: Señora del Sol 13/13 (elecciones Sol Concentrado, Escudo Solar, Corona Ígnea)

**Rotación.** Llena el Calor con Bola (Núcleo Denso) y Dardo Certero (un crítico seguro cada 4.º). Llamarada **Avivada** detona y da 25 de Calor → Ignición Total → **Combustión** 4,5 s: todo crítico. Dentro, cada crítico de Fuego da 4 de Calor; si llegas a 100, Combustión se alarga 3 s y lanza una Bola gratis: **la rotación es mantener la cadena**. Pirotecnia baja enfriamientos con cada crítico; Archimaga duplica cada 4.ª gastadora. Inversión del Tiempo en la `2` contra el golpe grande del jefe.
**Cambia:** ritmo de **ventanas**: preparas 6–8 s y descargas 5–12 s.

### 6.4 «Brasa Ardiente» (híbrida Brasa + Ignición, **sin final**)

- Clase (31/31): Reservas Profundas 2 · Intelecto Arcano 2 · Dardo Certero (A) 1 · Onda Expansiva (B) 1 · Nova Cortante (B) 1 · Flujo de Maná 2 · Mente Afilada 2 · Pureza Elemental (B) 1 · Barrera Resonante 1 · Ritmo Arcano 2 · Torrente de Maná 3 · Archimaga 3 · Ralentizar (A) 1 · Anclaje Temporal (B) 1 · Escarcha Arcana 1 · Escudo Prismático 2 · Piel de Maná 2 · Escudo de Maná (A) 1 · Reflejos Arcanos 2
- Piromante (31/31): Ignición (gratis) · Brasas 3 · Calor Abrasador 3 · Llama Persistente 2 · Chispas 1 · Propagación (A) 1 · Llamarada Avivada (A) 1 · Fuego Interior 2 · Pirotecnia 2 · Escudo de Llamas (B) 1 · Brasero 2 · Brasa Errante 2 · Ignición Rápida 2 · Brasa Viva 3 · Combustión 3 · Mecha Corta 1 · Ola de Calor 2
- Paragon: Escarcha Ardiente 13/13 (elecciones Choque Profundo, Ebullición, Equilibrio)

**Rotación.** Enciende la manada (Bola Onda Expansiva + Saeta Ígnea) y deja que **Brasa Viva** contagie. Los críticos sobre enemigos en llamas renuevan Quemaduras y dan Calor (**Chispas**); Ignición Rápida (9 de Calor por golpe) y Brasero (> 50 de Calor) suben todo a la vez. Ignición Total → **Combustión**: 4,5 s de críticos que, con Chispas, **renuevan todas las Quemaduras** de la manada. Llamarada Avivada detona en el pico de la ventana. En el Paragon, Escarcha Ardiente con Choque Profundo y Equilibrio: alterna Nova de Hielo (desde la `2`) con Fuego para Choques.
**Dónde brilla:** contenido **mixto** (élites con manada, recompensas, Pesadillas): ni el jefe solo ni la manada sola.
**Por qué es viable sin final:** sus 31 puntos compran **dos penúltimos al máximo** (Brasa Viva y Combustión), los tres híbridos (Chispas, Brasero, Ola de Calor) y las dos elecciones de arquetipo. Le falta el +15–20 % del final, pero suma dos motores a la vez.

### 6.5 Comparación (estimación de diseño)

| Build | UNI (jefe) | ÁREA×5 | Peor de los dos | TTD+ | Control |
|---|---|---|---|---|---|
| Incendio (Brasa) | 0,86 | **1,00** | 0,86 | alto | medio |
| Lluvia de Fuego (Cataclismo) | 0,90 | 0,96 | 0,90 | medio | **alto** |
| Combustión Perpetua (Ignición) | **1,00** | 0,80 | 0,80 | medio-bajo | bajo |
| **Brasa Ardiente (híbrida)** | 0,92 | 0,91 | **0,91** | medio-alto | medio |

- La híbrida queda a **8 %** de la mejor en UNI y a **9 %** en ÁREA: dentro del 10–15 % pedido, y es la que tiene **el mejor peor caso**.
- *Cómo se estimó:* el final aporta 15–20 % del daño de su arquetipo; cada penúltimo al máximo, 8–10 %; los híbridos, 3–6 % cada uno. Se calibra en E3 (G8).

---

## 7. Paragon: árboles héroe y tablero de glifos

### 7.1 Reglas

- **Nv41–53: 13 puntos**, uno por nivel. Cada nodo tiene 1 rango: con 13 puntos se compra el árbol entero, **la decisión está en el árbol y en las elecciones** (como TWW).
- **Dos árboles por especialización, cada árbol compartido por dos especializaciones** (como TWW):

| Árbol héroe | Especializaciones | Fantasía |
|---|---|---|
| **Señora del Sol** | Piromante · Arcanista | Soles arcanos que orbitan y castigan |
| **Escarcha Ardiente** | Piromante · Crionte | Choque térmico: el fuego y el hielo se rompen entre sí |
| **Tejehechizos** (esbozo) | Crionte · Arcanista | Astillas arcanas que se clavan y estallan |

- Cambiar de árbol héroe es gratis fuera de combate y conserva las elecciones de cada uno.
- Antes del Nv41 la columna se ve **bloqueada** con un candado, «Se desbloquea al nivel 41», y las **dos tarjetas de vista previa** de su especialización.
- Las opciones que dependen de la especialización (Corona Ígnea / Arcana, Termoclina) **se adaptan** a la especialización activa.

### 7.2 Señora del Sol (Piromante · Arcanista)

| Fila | Id | Nodo | Tipo | Etiqueta | Rangos | Requiere | Efecto (al máximo) | Gana en |
|---|---|---|---|---|---|---|---|---|
| 0 | h0 | Sol Arcano | clave | mecánica | 1 | — | Cada 3 gastadoras invocas un Sol Arcano: orbita 8 s y dispara 40 % del arma cada 1 s (Fuego y Arcano) |  |
| 1 | h1 | Fulgor | pasiva | número | 1 | h0 | El Sol Arcano dura +4 s |  |
| 1 | h2 | Sol Gemelo o Concentrado | elección | mecánica | 1 | h0 | **A·Sol Gemelo**: Hasta 2 Soles a la vez [ÁREA×5]<br>**B·Sol Concentrado**: El Sol dispara siempre a tu objetivo: +50 % [UNI] | A gana en ÁREA×5. B gana en UNI |
| 1 | h3 | Llamarada Solar | pasiva | mecánica | 1 | h0 | Tus críticos aceleran los disparos del Sol un 50 % 2 s |  |
| 2 | h4 | Viento o Escudo Solar | elección | mecánica | 1 | h1 o h2 | **A·Viento Solar**: Invocar un Sol empuja 2 m a los cercanos [CONTROL]<br>**B·Escudo Solar**: Invocar un Sol te da un escudo del 8 % de vida [TTD+] | A gana en CONTROL. B gana en TTD+ |
| 2 | h5 | Alimento Estelar | pasiva | número | 1 | h2 | Cada disparo del Sol te devuelve 2 de maná |  |
| 2 | h6 | Mancha Solar | pasiva | mecánica | 1 | h2 o h3 | Los golpeados por el Sol reciben +10 % de daño de Fuego y Arcano 3 s |  |
| 3 | h7 | Eclipse | pasiva | mecánica | 1 | h4 o h5 | Cada 4.º Sol nace como Eclipse: dura el doble y dispara a 2 objetivos |  |
| 3 | h8 | Corona Ígnea o Arcana | elección | mecánica | 1 | h5 | **A·Corona Ígnea**: Los disparos del Sol aplican Quemadura y dan 3 de Calor [ÁREA×5]<br>**B·Corona Arcana**: Cada 3 disparos del Sol: 1 Carga Arcana [UNI] | A gana con Piromante. B gana con Arcanista (la opción se adapta a la especialización) |
| 3 | h9 | Órbita Ancha | pasiva | mecánica | 1 | h5 o h6 | El Sol orbita a 4 m y cada disparo golpea a 2 enemigos |  |
| 4 | h10 | Solsticio | pasiva | número | 1 | h7 o h8 | +12 % de daño mientras tengas un Sol activo |  |
| 4 | h11 | Llamada del Sol | pasiva | mecánica | 1 | h8 o h9 | Tu definitiva invoca 2 Soles al instante |  |
| 5 | h12 | Corona del Sol | **FINAL** | mecánica | 1 | h10 o h11 | Con 2 Soles o un Eclipse, tus gastadoras hacen +25 % y cada Sol que termina estalla con el 200 % |  |

### 7.3 Escarcha Ardiente (Piromante · Crionte)

| Fila | Id | Nodo | Tipo | Etiqueta | Rangos | Requiere | Efecto (al máximo) | Gana en |
|---|---|---|---|---|---|---|---|---|
| 0 | k0 | Choque Térmico | clave | mecánica | 1 | — | Golpear con Fuego a un ralentizado (o con Hielo a uno en llamas) provoca un Choque: 120 % en 2 m (cada 4 s por enemigo) |  |
| 1 | k1 | Vapor | pasiva | mecánica | 1 | k0 | El Choque ralentiza un 30 % 2 s (prepara el siguiente) |  |
| 1 | k2 | Choque Amplio o Profundo | elección | mecánica | 1 | k0 | **A·Choque Amplio**: Radio del Choque 2 → 3,5 m [ÁREA×5]<br>**B·Choque Profundo**: +60 % al objetivo principal [UNI] | A gana en ÁREA×5. B gana en UNI |
| 1 | k3 | Termoclina | pasiva | mecánica | 1 | k0 | Cada Choque te da 10 de Calor (Piromante) o 1 capa de Escarcha (Crionte) |  |
| 2 | k4 | Niebla o Ebullición | elección | mecánica | 1 | k1 o k2 | **A·Niebla Térmica**: Tras un Choque: −15 % de daño recibido 3 s [TTD+]<br>**B·Ebullición**: Tras un Choque: +15 % de velocidad de lanzamiento 3 s [UNI] | A gana en TTD+. B gana en UNI |
| 2 | k5 | Hielo Ardiente | pasiva | mecánica | 1 | k2 | Nova de Hielo también aplica Quemadura (40 %): con Piromante, la Nova provoca Choques sola |  |
| 2 | k6 | Fuego Helado | pasiva | mecánica | 1 | k2 o k3 | Tus Quemaduras ralentizan un 15 % |  |
| 3 | k7 | Choque en Cadena | pasiva | mecánica | 1 | k4 o k5 | Un Choque que mata provoca otro en el enemigo más cercano |  |
| 3 | k8 | Equilibrio o Desequilibrio | elección | mecánica | 1 | k5 | **A·Equilibrio**: Alternar Fuego y Hielo: +10 % de daño [UNI]<br>**B·Desequilibrio**: Tras 3 hechizos de un elemento, el siguiente del otro provoca un Choque seguro [ÁREA×5] | A gana en UNI. B gana en ÁREA×5 |
| 3 | k9 | Cristal Fundido | pasiva | mecánica | 1 | k5 o k6 | Los Congelados que mueren por Fuego estallan con el 80 % |  |
| 4 | k10 | Punto de Rocío | pasiva | número | 1 | k7 o k8 | Nova de Hielo: −25 % de enfriamiento |  |
| 4 | k11 | Térmica | pasiva | mecánica | 1 | k8 o k9 | +5 % de crítico por cada Choque en los últimos 5 s (máx. 15 %) |  |
| 5 | k12 | Equilibrio Térmico | **FINAL** | mecánica | 1 | k10 o k11 | Cada 10 Choques: 6 s en los que todos tus golpes son de Fuego Y de Hielo a la vez (Calor, Quemadura, ralentización y capas) |  |

### 7.4 Convivencia con el tablero de glifos (`PARAGON_BOARD`)

| Hoy | v2 |
|---|---|
| Puntos de tablero desde el Nv20 (`level − 20`) | **Nv41–53: árbol héroe.** El tablero de glifos empieza en el **Nv54** (`level − 53`) |
| Los nodos legendarios del tablero conceden **poderes** | Los nodos legendarios dan **estadísticas** grandes (el poder de identidad lo da el árbol héroe). Así no hay dos sistemas que concedan poderes |
| Glifos y su nivel | Sin cambios |

*Por qué así:* el árbol héroe es **identidad** (cambia cómo juegas); el tablero es **progreso infinito** (números). Si el tablero siguiera dando poderes, competiría con el árbol héroe y se repetiría el problema de la v1 («dos capas que se pelean»).

---

## 8. Forja y talentos: sin repetición

**Regla (Anexo A.4):** la forja **transforma** (forma, geometría, elemento, ritmo, papel); el talento **añade o multiplica** (números que se notan, efectos añadidos, ecos, contagios, ventanas, sinergias).

| Habilidad | Variantes de forja (2f) | Talentos que la tocan | Cómo conviven |
|---|---|---|---|
| Bola de Fuego | Pirodardo (UNI) · Racimo (ÁREA) | c6 Núcleo/Onda (número), s3 Mecha Corta, s6 Combustible Volátil, s24 Cráter (explota dos veces) | La variante decide **la forma**; el talento **suma** daño o repite la explosión. Cráter + Racimo = dos explosiones, cada una con sus brasas |
| Meteoro | Lluvia de Meteoritos (3 meteoritos) · Meteoro Ancestral (UNI) | s7 Pira, s10 Gemelo/Concentrado, s13, s14, s21, s27 Lluvia de Fuego | Gemelo y Lluvia de Fuego **repiten el lanzamiento** (ecos al 100/60/60 %), no cambian su forma: con Lluvia de Meteoritos, cada eco trae sus 3 meteoritos |
| Llamarada | Lanza de Llamas (UNI) · Erupción (ÁREA) | s9 Avivada/Voraz | La variante da la forma (cono, anillo); el talento cambia **qué detona** |
| Estela Ígnea | Senda de Llamas · Muro de Llamas | s21 Estela Meteórica | El talento **añade** un Meteoro al final; la forma del rastro es de la forja |
| Supernova | Sol Errante · Colapso | s13, s17 Estrellas Fugaces | Estrellas Fugaces **añade** meteoros menores sin cambiar la onda |
| Dardo Arcano | Saeta Ígnea · Saeta Gélida | c5 Certero/Sifón, c19, c20, c23 | Ninguno cambia elemento ni forma |
| Nova de Hielo | Corazón de Hielo · Nova Fracturante | c9 Congelante/Cortante, k5, k10 | Congelante **añade** un congelamiento; Cortante es número |
| Parpadeo | Doble Parpadeo · Parpadeo Disruptor | c3, c7, c14, c27, c30 | Runa / Imagen / Paso del Vacío **añaden** al salir; las cargas y el empuje son de la forja |
| Barrera de Maná | Barrera Gélida · Coraza Arcana | c4, c15, c18, c19, c25, c28 | Bastión cambia su **duración y economía**, no su forma; Cristal añade una explosión al romperse |

**Nombres revisados:** ningún nodo comparte nombre con una variante. En la ronda 3 se renombró «Lluvia Ígnea» (s17) a **Estrellas Fugaces** porque convivía con «Lluvia de Fuego» (s27) y la variante «Lluvia de Meteoritos».
**Clave nueva para los ecos:** `echo` en el canal de lanzamiento (`game-skills.js`): repite el impacto con un porcentaje, sin pasar por la forma. La usan c29 Archimaga, s10A, s24 y s27.

---

## 9. UI/UX del panel de talentos

| Pieza | Diseño |
|---|---|
| **Cabecera del panel** | Emblema + «Talentos · Maga Piromante» + «Nivel N · gratis fuera de combate · se aplica al instante». A la derecha: **Habilidades (T)** · **Configuración** (desplegable de loadouts) · **Guardar** · **Código** · **Recomendado** · **↶** (deshacer) · **Reiniciar** · **✕** |
| **Tres columnas** | Maga · Paragon · Piromante. Anchos 2 : 1 : 2. Sin scroll horizontal a 1366 × 768 ni a 1920 × 1080 (escala `--s`) |
| **Cabecera por árbol** | Icono, nombre, «Gastados **X** / Y», «Nv req.». En el Paragon, además, el nombre del árbol héroe y sus pestañas (los dos de tu especialización y el tercero en gris) |
| **Arte de fondo** | Cada columna lleva su arte a 24 % de opacidad: `assets/specs/piromante.webp` (nuevo) en el Piromante, el emblema del árbol héroe en el Paragon y el de la clase en la Maga |
| **Nodos** | Cuadrado (pasiva), **octógono partido** (elección, con pip A/B), cuadrado con borde dorado (final), **rombo** con 4 pips (ápice). Pastilla de rango «2/3». Etiqueta «M» / «N» (mecánica / número) arriba a la izquierda |
| **Flechas** | Líneas con punta; doradas si el requisito está al máximo, verdes si acaban de abrirse, grises si no |
| **Puertas** | Línea discontinua con un **sello** y «9/20» (gastados / necesarios) en la primera columna libre; al abrirse, «✓ 20». El ápice tiene su banda con «Ápice · 25 · Nv35» |
| **Elección** | Al pasar el ratón por un octógono, **se abren las dos mitades lado a lado** (A a la izquierda, B a la derecha) sobre el nodo; **un clic** elige. No hay otro panel |
| **Tooltip rico** | Nombre, tipo, árbol, rango, etiqueta. Efecto del rango actual y del siguiente. En elecciones: las dos opciones con su papel y la caja verde «A gana en … · B gana en …». En finales: banda «FINAL» con su rama. «Habilidades que toca» con iconos. Estado (puerta, requisito, puntos). `Alt`: detalle técnico (id, poder, existe / nuevo) |
| **Paragon bloqueado** | Candado, «Se desbloquea al nivel 41», las dos tarjetas de árbol héroe con su línea y el botón «Simular nivel 41» (vista previa) |
| **Loadouts** | «Configuración»: Recomendados de la especialización (uno por arquetipo + la híbrida) y los guardados del jugador (nombre libre, hasta 10 por especialización). «Guardar» pide nombre |
| **Código** | Ventana con `IRPG2-maga-piromante-<clase>-<especialización>-<héroe>`, **Copiar** e **Importar…**; avisa si la build es de otra versión |
| **Recomendado** | Aplica el loadout recomendado del arquetipo elegido, en el orden en que se compra al subir de nivel |
| **Deshacer** | `↶` o `Ctrl+Z`: vuelve atrás compra a compra; **Reiniciar** pide confirmación |
| **Tira «Tu kit»** | Iconos de tus habilidades al pie. Al pasar por una, **se iluminan los nodos que la tocan** y el resto se atenúa; al pasar por un nodo, se iluminan sus habilidades |
| **Legibilidad** | Nombre del nodo solo en el tooltip (el nodo es icono + rango). Texto mínimo 11 px a 1366 |

---

## 10. Motion design

Todo con `transform` y `opacity` (más `clip-path` en el arte del Paragon y `stroke-dashoffset` en las líneas). Curva por defecto `cubic-bezier(.2,.8,.2,1)` (salida rápida y frenado suave).

| Momento | Qué se ve | Duración · curva | Con «reducir movimiento» |
|---|---|---|---|
| **Gastar un punto** | El nodo late (escala 1 → 1,16 → 1), un anillo dorado se expande, **8 chispas** salen en abanico; las **líneas a sus hijos se dibujan** en verde y los hijos que se abren hacen «unlock» escalonado | Pulso 260 ms · anillo 420 ms · chispas 500 ms · línea 350 ms · hijos 320 ms con 300 ms de retardo | Fundido de 120 ms; sin chispas ni dibujo de líneas |
| **Nodo al máximo** | Destello diagonal dentro del icono | 900 ms `cubic-bezier(.4,0,.2,1)` | Sin destello |
| **Abrir una puerta** | El sello se parte en dos mitades que giran y caen; la línea de la puerta brilla | Sello 480 ms · brillo 600 ms `ease-out` | El sello se oculta sin animar |
| **Elegir (octógono)** | Pasar el ratón: las dos mitades salen del centro hacia los lados. Clic: el nodo **gira** (rotateY 180° → 0) a la opción elegida | Mitades 180 ms · giro 360 ms `cubic-bezier(.4,0,.2,1)` | Aparecen sin desplazarse; sin giro |
| **Quitar / deshacer** | El nodo se encoge (1 → 0,86 → 1) y las líneas vuelven a gris | 220 ms `ease-out` | Fundido 120 ms |
| **No se puede** | Sacudida horizontal de ±4 px | 300 ms `ease-out` | Sin sacudida (solo el tooltip explica) |
| **Revelar el Paragon (Nv41)** | El arte se abre en **iris** desde arriba; pestañas y nodos suben escalonados (30 ms entre nodos); las flechas aparecen al final | Iris 700 ms · nodos 340 ms · flechas 400 ms con 420 ms de retardo | Fundido 120 ms |
| **Cambiar de especialización** | Fundido cruzado del arte de fondo; los nodos del nuevo árbol bajan a su sitio escalonados | Arte 500 ms · nodos 380 ms (200 ms de retardo) · flechas con 380 ms | Fundido 120 ms |
| **Iluminar por habilidad** | Los nodos que la tocan brillan; el resto baja a 35 % | Transición 150 ms | Igual (no es movimiento) |

**Rendimiento:** nada anima `width`, `top`, `left` ni sombras grandes; las chispas son 8 `<i>` por compra que se borran al terminar; `will-change` solo durante la animación. `prefers-reduced-motion: reduce` y la casilla «Reducir movimiento» del juego activan la columna derecha. En el mockup: `&demo=spend|gate|choice|hover|undo|reveal|swap|hl|code` y `&t=<ms>` congela el cuadro.

---

## 11. Migración de guardados (v5 → v6)

Va en `MIGRATIONS[5]` si 2f llega antes (si no, se fusiona con la de 2f). Idempotente y sobre una copia. Incluye los pasos de barra, forja y soportes de la v1 (Anexo A.6), y además:

1. **Talentos:** todos los árboles de la Maga son nuevos → se **liberan todos** los puntos (clase y las tres especializaciones). Los puntos se recalculan: clase = especialización = `clamp(Nv − 9, 0, 31)`; Paragon = `clamp(Nv − 40, 0, 13)`.
2. **Recomendado automático:** si el jugador tenía la Maga con especialización, se le aplica el loadout Recomendado de su especialización **hasta donde le alcancen los puntos**, marcado como «Migrado: revisa tus talentos». Puede deshacerlo con Reiniciar.
3. **Paragon:** `paragon.nodes` se vacía (los glifos vuelven al inventario con su nivel). `paragon.points = max(0, Nv − 53)`. Nuevo campo `talents.hero = { tree: null, nodes: {}, choice: {} }`.
4. **Activas de clase en la barra** (`m_t_bloque`, `m_t_inversion`, `m_t_contrahechizo`): se quitan salvo que el Recomendado elija su nodo A; la `2` vuelve a la Barrera de Maná.
5. **Loadouts:** campo nuevo `talents.loadouts[spec] = [{ name, code }]`, vacío.
6. **Aviso único** (`p.notices.push('maga2g2')`): «Los talentos de la Maga se rehicieron: tres columnas, puntos devueltos. Te aplicamos el Recomendado; revísalo con N».
7. **Test** `tests/test-save-maga2g.mjs`: Nv5, Nv18, Nv40, Nv45 y Nv60 de cada especialización; puntos correctos, idempotente, Guerrero y Arquera intactos.

---

## 12. Banco de balance: impacto y riesgos

`node tests/balance-bench.mjs --report --seeds 5`. Objetivos del Piromante (paso2-diseno §7.2): ÁREA×5 ≥ 1,20·M y UNI ≥ 0,85·M.

| Cambio | Efecto esperado | Calibración |
|---|---|---|
| 62 puntos al Nv40 (hoy 31 al Nv40) y nodos que se notan | **Sube mucho** el poder a Nv25–40 | Los finales usan **multiplicadores registrados** (`registerMultiplier`, máx. 3 activos) o el saco aditivo; la curva de vida de enemigos `G(AL)` se reajusta en E3 si TTD baja de 6 s |
| Finales | +15–20 % del daño de su arquetipo | Rango 3 calibrable por separado (`final.r3`) |
| Árbol héroe (Nv41–53) | +10–15 % | Corona del Sol y Equilibrio Térmico son los dos números a vigilar |
| Activas de clase en la `2` | Cambia el intercambio de la `2` (gastadora frente a defensa) | Exigir ≥ +30 % de TTD+ a la opción defensiva |
| Ecos (Archimaga, Gemelo, Cráter, Lluvia de Fuego) | Riesgo de **multiplicar** entre sí | Ecos no generan ecos; tope de 3 impactos por lanzamiento |
| Híbrida sin final | Debe quedar a ≤ 15 % de la mejor en UNI y en ÁREA | G8 |

**Riesgos.**
1. **El árbol de clase pesa más que la especialización** (dos activas fuertes, Archimaga). Mitigación: los finales de clase son de utilidad o de ritmo; el daño grande vive en el Piromante.
2. **Las otras clases quedan con el sistema viejo** hasta su rework: hay que mantener las dos rutas en `talents.js` y en la UI (`classUsesWowTalents(cls)`).
3. **Mover el tablero de glifos al Nv54+** retrasa progreso a quien ya juega Nv40–53. Mitigación: los glifos se conservan y el árbol héroe da más poder que esos puntos de tablero.
4. **Demasiadas decisiones de golpe** al migrar. Mitigación: Recomendado automático y aviso.

---

## 13. Criterios de aceptación (comprobables)

| # | Criterio | Cómo se comprueba |
|---|---|---|
| G1 | Ningún nodo de **clase** toca una habilidad con `spec` ni usa `@spec`; sí puede tocar el kit base | Test `test-maga-coherencia` |
| G2 | Solo c11A, c17A y c22A conceden activas; son de categoría `defense`/`utility` y solo caben en la `2` | Mismo test con `fitsSlot` |
| G3 | **Presupuesto:** un final al máximo cabe con ≥ 1 punto libre; dos finales al máximo no caben; con dos finales el ápice no pasa de rango 1 | Test con el algoritmo de `check.js` sobre `TALENT_TREES` |
| G4 | Cada nodo tiene etiqueta; en filas 3–9, ≥ 60 % «mecánica»; ningún nodo «número» por debajo de +10 % en su eje | Test |
| G5 | Ningún nombre se repite entre habilidades, variantes y nodos; ningún `fx.mod` de talento usa claves de forma (`type`, `elem`, `chain`, `pierce`, `charges`, `at`); los ecos usan `echo` | Test |
| G6 | Cada elección tiene `win` con «A gana en … B gana en …» y papeles distintos | Test |
| G7 | Los 4 loadouts Recomendados son legales (31/31/13) y su código ida y vuelta da lo mismo | Test |
| G8 | Banco: cada arquetipo gana su escenario; la híbrida ≥ 0,85 de la mejor en UNI y en ÁREA y tiene el mejor mínimo | `balance-bench --seeds 5` con escenario mixto |
| G9 | Panel legible a 1366 y 1920 sin scroll horizontal; nodos sin texto de descripción; puertas y rangos no se solapan | `?talentscheck=1` + capturas contra el mockup |
| G10 | Motion: solo `transform`/`opacity`/`clip-path`/`stroke-dashoffset`; ≤ 900 ms; respeta `prefers-reduced-motion` y la casilla del juego | Revisión de CSS + test de clases |
| G11 | Migración correcta e idempotente | `test-save-maga2g` |
| G12 | `test67`, `test65a`, `test43-mixins` y `npm test` en verde | `npm test` |

---

## 14. Plan de implementación por etapas

El modelo principal juzga cada ola; Opus implementa; Sonnet lo mecánico. Un archivo, un trabajador.

| Etapa | Archivos (propiedad exclusiva) | Entrega |
|---|---|---|
| **E0 · Diseño restante** | `docs/` | Crionte y Arcanista con este formato + árbol Tejehechizos. Aprobación del dueño de los tres |
| **E1 · Motor** | `js/talents.js` (dos puntos por nivel, puertas por fila, finales, ápice con nivel, árbol héroe), `js/talents-ops.js`, `js/save-schema.js` (v6), `js/game-skills.js` (`echo`) | Tests G3, G7, G11 |
| **E2 · Datos de la Maga** | `js/talents-maga.js`, `js/powers-maga.js`, `js/skills-maga.js`, `js/hero-maga.js` (nuevo: árboles héroe) | G1, G2, G4, G5, G6 |
| **E3 · Banco** | `tests/balance-bench.mjs` (loadouts por arquetipo, escenario mixto), números de E2 | G8 con informe antes/después |
| **E4 · Interfaz** | `js/ui-talents.js` (tres columnas, octógonos, puertas, loadouts, código, deshacer), `css/talents.css` (motion), `js/data.js` (`PARAGON_BOARD` sin poderes en legendarios) | G9, G10 |
| **E5 · Migración y cierre** | `tests/test-save-maga2g.mjs`, `MEMORIA.md`, `CLAUDE.md`, `sw.js` | `npm test` en verde, push a las dos ramas |

---

## 15. Mockup, capturas y refutaciones

### 15.1 Uso

`docs/mockups/skills-ux.html?cls=maga&view=talents`. Parámetros: `&res=1366|1920`, `&lvl=5|18|32|40|41|53`, `&loadout=brasa|cataclismo|ignicion|hibrido`, `&tipnode=cls:c5|spec:s10|hero:h2`, `&tipskill=bola_fuego`, `&alt=1`, `&rm=1` (reducir movimiento), `&demo=…&t=<ms>`. En la barra de control: nivel y «Reducir movimiento».

Capturas en `C:\Users\juanm\AppData\Local\Temp\claude\D--Proyectos-IntentoRPG\6ead5cf3-f7a8-4c53-8c4f-4d18d352840c\scratchpad\maga-wow\`:

| Captura | Muestra |
|---|---|
| `final_tal_brasa_1920.png` | Build Incendio completa a 1920: tres columnas, Paragon Escarcha Ardiente, ápice |
| `final_tal_cataclismo_eleccion_1366.png` | Elección s10 abierta en dos mitades sobre el nodo y tooltip con «A gana en ÁREA×5… B gana en UNI» |
| `final_tal_hibrido_1920.png` | Híbrida con `Alt`: etiquetas M/N y tooltip de Brasero con «Híbrido · los tres estilos» |
| `final_tal_ignicion_hl_1366.png` | Tooltip de la Bola de Fuego desde «Tu kit»: se iluminan sus nodos en los dos árboles |
| `final_tal_paragon_bloq_1366.png` | Nv40: Paragon bloqueado con candado y las dos tarjetas de vista previa |
| `final_tal_nv18_1920.png` | Nv18: 9/31 por árbol, puertas «9/22» y «9/20», tooltip de elección de clase |
| `final_tal_codigo_1366.png` | Ventana de código para compartir |
| `final_libro_ignicion_1366.png` | Libro con el kit base, el del Piromante y las otras especializaciones |
| `final_espec_nv5_1920.png` | Selector de especialización (Nv5) |
| `motion_<momento>.gif` y `motion_<momento>_cuadros.png` | spend, gate, choice, hover, undo, reveal, swap, hl (cuadros en `frames\<momento>\`) |

### 15.2 Refutaciones de la v2 (tres rondas, críticas como el dueño)

**Ronda 1** (`w1_*.png`, estático).

| Crítica | Cambio |
|---|---|
| La cabecera se partía en dos líneas a 1366 | Botones compactos y «Configuración» como desplegable |
| Los finales quedaban cortados abajo | Márgenes del lienzo por árbol (arriba 26–30, abajo 30–54) |
| La columna Paragon se salía y la leyenda la pisaba | Relleno propio del Paragon y leyenda a la tira inferior |
| La etiqueta del ápice tapaba la pastilla de rango | Etiqueta dentro de la banda del ápice |
| El retrato del árbol héroe era pequeño frente a WoW | Nodo clave grande con pestañas |
| El candado del Paragon salía desplazado | Regla de SVG específica para el candado |
| El Recomendado a Nv18 compraba por filas y dejaba builds raras | Se compra en el **orden de la build** |

**Ronda 2** (cuadros de animación).

| Crítica | Cambio |
|---|---|
| Al revelar el Paragon o cambiar de especialización, se veía el esqueleto de flechas antes que los nodos | Las flechas aparecen al final (`edgeIn` con 380–420 ms de retardo) |
| Las chispas casi no se veían | 8 px, opacidad completa hasta el 55 % del recorrido |
| El destello del nodo al máximo se salía del icono | El destello vive dentro del icono (`overflow: hidden`) |
| La cabecera del Paragon ocupaba 3 líneas | Una línea, «Nv req.» abreviado |

**Ronda 3** (`final_*.png` y GIF de elección). La tercera se usó porque la segunda encontró problemas reales.

| Crítica | Cambio |
|---|---|
| **(Bloqueante)** Las dos mitades de la elección se abrían **desplazadas** del nodo cuando la pantalla estaba escalada (1366 y 1920) | Se posicionan respecto de su contenedor real y su escala; ahora salen centradas sobre el octógono (GIF `motion_hover`) |
| Las etiquetas de puerta («9/20») pisaban la pastilla de rango de la columna 0 | Van en la **primera columna libre** de las dos filas que separan |
| «Lluvia Ígnea», «Lluvia de Fuego» y la variante «Lluvia de Meteoritos» se confundían | s17 pasa a **Estrellas Fugaces** |
| Menores que quedan | En el árbol de clase no hay columna libre en la puerta de la fila 4 (rejilla en panal) y «✓ 8» queda cerca de una pastilla, legible; el tooltip puede tapar parte del árbol a 1366 (sigue al cursor) |

---

## 16. Preguntas para el dueño (antes de E0)

1. ¿Dos puntos por nivel (uno por árbol) del 10 al 40, o mantener uno por nivel hasta el 70 (más lento, como WoW)?
2. ¿El tablero de glifos se mueve al Nv54+ (propuesta) o convive desde el Nv20 con puntos propios?
3. ¿Las tres activas de clase como opción A (propuesta) o ninguna activa en el árbol (v1)?
4. ¿Se acepta que la híbrida quede ~8–9 % por debajo de la mejor en cada escenario a cambio de ser la más estable?

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
| **Talentos (v2)** | Clase · Paragon · Especialización | §4, §7 y §5. Activas solo por c11A / c17A / c22A |
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
