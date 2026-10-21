# Paso 2g: Arquera (talentos estilo WoW), documento de diseño

> Estado: **diseño completo (etapas 1 y 2), corregido tras el juicio de la etapa 2** (§18), sin código del juego. Fecha: 2026-10-21. Molde: la Maga v4 aprobada (`docs/paso2g-maga-coherencia.md`, plantilla de §17).
> **Etapa 1:** investigación, auditoría, modelo de capas y verbos, kit base, árbol de clase y la Tiradora Veloz completa.
> **Etapa 2:** la Francotiradora y el Montaraz completos (kit con forja, pasiva, mecánica, árbol de 29 nodos y 4 builds cada una), los tres árboles héroe de la clase, las dos builds que le faltaban a la Tiradora y el Paragon (`heroNodes`) de las 12 builds. Aplica las decisiones del dueño delegadas para esta etapa (§17).
> Mockup: `docs/mockups/skills-ux.html?cls=arquera&view=talents` (abrir como `file:///`). **Fuente única de datos:** `docs/mockups/data/talents-v2-arquera.js`. Las tablas de §6, §7 y §9 y las listas de §8 se **generan** con `node docs/mockups/data/validar-talentos.mjs arquera --tablas`.

## 0. Qué entra en cada etapa

| Pieza | Etapa 1 | Etapa 2 |
|---|---|---|
| Investigación, auditoría, capas y verbos | §2–§4 | §2.1 (fuentes nuevas), §3 y §4 actualizados con los kits nuevos |
| Kit base (5) y sus 3 habilidades de talento de clase | §5 | Red de Caza pasa a variante de Trampa de Cepo (§5) |
| Árbol de clase (30 nodos, 53 rangos) | §6 | §6.1 confirmado con los kits de las tres especializaciones |
| Tiradora Veloz | §7.0 y builds «Tormenta de Plumas» y «Viento Cruzado» | Builds «Vaivén Eterno» y «Galerna Infinita» (§8.3, §8.4) |
| Francotiradora · Montaraz | Esqueleto | **Completos** (§7.1, §7.2, §8.6, §8.7) |
| Árboles héroe (3) | Esqueletos vacíos | **Errante del Viento, Carcaj Encantado y Halconera** (§9) y el Paragon de las 12 builds |
| Datos del mockup | `talents-v2-arquera.js`, `estado:'diseño'` | Mismo archivo, completo (`estado:'diseño'` hasta que el dueño lo apruebe) |

**Validación final:** el validador oficial (`validar-talentos.mjs arquera`) da **0 errores y 0 avisos** sobre la clase completa (§14.2).

**Corrección de la etapa 2:** tres jueces independientes revisaron la etapa 2. Sus 18 hallazgos, la decisión sobre cada uno y el cambio hecho están en **§18**. Las estimaciones de balance se rehicieron con un **modelo absoluto en %WD/s** con los supuestos escritos (§12.1); al hacerlo aparecieron desequilibrios que las tablas normalizadas escondían, y también se corrigieron.

## 1. Resumen (15 líneas)

1. Mismo ritmo y presupuesto que la Maga (`TV2.REGLAS`): Nv100; especialización 31, clase 34, Paragon 1 + 10, tablero 16. Ningún árbol se completa.
2. **Kit base (Nv1–8):** Disparo Rápido, Flecha Perforante, Paso Veloz, Bomba de Humo y Lluvia de Flechas. Disparo Disperso y Flecha de Cicuta son variantes de Disparo Rápido; Red de Caza, de Trampa de Cepo.
3. **Árbol de clase** (Defensa · Ritmo · Movilidad), con finales **Manto de Niebla**, **Danza del Arco** y **Sombra Gemela**, y tres habilidades de clase para la ranura `2`.
4. **Cada especialización tiene su verbo principal y no lo comparte:** Tiradora = moverse disparando · Francotiradora = cargar y soltar, plantada · Montaraz = colocar y detonar.
5. **Tiradora Veloz** (daño en área · Impulso): Andanada (relanzar), Carrera del Viento (mantener), Flecha Múltiple y Diluvio de Saetas; pasiva Tercera Flecha. Arquetipos Abanico · Vaivén · Galerna.
6. **Francotiradora** (un objetivo · Concentración): **Disparo Apuntado** (tensas hasta 1,5 s; la ventana dorada da +50 % y crítico), **Rodilla en Tierra** (postura), **Tiro Rastreador** (Punto Débil) y **Tiro Celestial** (3 haces que se tensan). Pasiva **Cuerda Tensa**: Disparo Rápido se puede tensar (hasta 1 s: +60 %; el perfecto da crítico seguro).
7. **Concentración:** quieta +15 por segundo y +15 por perfecto de Disparo Apuntado o de un haz (del básico, +3); a 100, **Calma Absoluta** 5 s (perfecto desde media carga) y después 7 s de **Respiro** sin ganar. Moverte la vacía.
8. Arquetipos de la Francotiradora: **Perforación** (grupos en fila) · **Punto Débil** (jefes) · **Vigía** (sostenido, de rodillas). Finales **Línea Mortal**, **Disparo Imposible** y **Atalaya Eterna**; ápice **Ojo Inmóvil**.
9. **Montaraz** (control · Coto de Caza): **Trampa de Cepo**, **Salto de Acecho** (saltas a tu trampa y estalla), **Flecha Detonante** y **Cerco de Zarzas**. Pasiva **nueva**, **Cebo de Caza** (tus trampas atraen), en lugar del +25 % de Quebranto que repetía al Crionte.
10. **Coto de Caza:** hasta 3 trampas; si estallan 3 a la vez, **Batida** (+15 % de daño recibido 6 s, una cada 12 s). Cada enemigo recibe como mucho 2 estallidos por detonación. Arquetipos **Campo Minado** · **Presa** · **Zarzal**; finales **Tierra Arrasada**, **Gran Cacería** y **Bosque Vivo**; ápice **Corazón del Bosque**.
11. **Árboles héroe de la clase:** **Errante del Viento** (Tiradora + Francotiradora: Ráfagas), **Carcaj Encantado** (Tiradora + Montaraz: puntas de Fuego, Hielo y Rayo) y **Halconera** (Francotiradora + Montaraz: un halcón que marca y cae en picado).
12. **12 builds** validadas punto a punto (4 por especialización, una híbrida en cada una), todas con su Paragon de 10 nodos. Cada final de clase y de especialización lo usa al menos una build. **Modelo absoluto** (§12.1): la Tiradora manda en área, la Francotiradora contra jefes y el Montaraz en control; ninguna build es la mejor en todo.
13. Motor: se aprueban como propuesta relanzar, la Carrera (canal con `moveMul`, `autoShot` y `onRelease`), `seq` y **`charge`**. La etapa 2 añade `stance` (postura), `lure` (cebo) y `detonate` (§11.2).
14. **Validador oficial en verde** sobre la clase completa: 0 errores y 0 avisos. Comprobación propia (nombres con otras clases, G8b, textos, voseo): 0 y 0, también tras la corrección.
15. Capturas `e2_*` y, tras la corrección, `e2fix_*` a 1366 y 1920 (§14.4), tres rondas de refutación (§14.6), el juicio de la etapa 2 con sus correcciones (§18) y preguntas abiertas para el dueño (§17.2).

---

## 2. Investigación (consultada el 2026-10-21)

Se suma a la de la Maga (su §2 y su Anexo A.1). Lo pedido esta vez es sobre **verbos de entrada y movimiento**: mantener, cargar y soltar, relanzar y moverse disparando.

| Fuente (fecha) | Juego | Qué dice | Qué tomamos |
|---|---|---|---|
| [poe2wiki: Channelled](https://www.poe2wiki.net/wiki/Channelled) (sin fecha; wiki viva en 2026) | PoE 2 | Las canalizaciones que se sueltan tienen una ventana de **Perfect Timing**: un destello rojo avisa de que se abrió y soltar dentro da más daño o efectos | La ventana de soltado perfecto **se ve y se oye** (§11.2, `charge`) |
| [outof.games: Snipe](https://outof.games/realms/poe2/skills/snipe/) (sin fecha) | PoE 2 | Snipe soltado a tiempo hace explotar la flecha y consume el Congelado | El soltado perfecto **cambia** el disparo, no solo suma daño |
| [poe2wiki: Window of Opportunity](https://www.poe2wiki.net/wiki/Window_Of_Opportunity) (sin fecha) | PoE 2 | Un soporte acorta la ventana un 35 % y sube un 35 % el daño del soltado perfecto | Un nodo puede **estrechar** la ventana a cambio de más premio (riesgo frente a recompensa) |
| [Fextralife: Snipe](https://lostark.wiki.fextralife.com/Snipe) · [Charged Shot](https://lostark.wiki.fextralife.com/Charged+Shot) (sin fecha) | Lost Ark | Mantener para apuntar y soltar; la **zona perfecta** multiplica el daño ×4. El disparo cargado tiene etapas y empuja desde la etapa 1 | Etapas de carga con efecto propio y zona perfecta para la Francotiradora |
| [Fextralife: controles de Hades II](https://hades2.wiki.fextralife.com/Controls) · [Maxroll: guía de inicio](https://maxroll.gg/hades-2/guides/hades-2-beginners-guide) (sin fecha) | Hades II | Movimientos Omega: **mantener** el botón carga la versión fuerte (cuesta Magia y te deja expuesto). **Dash-Strike**: atacar justo después del dash. Mantener el dash = correr sin invulnerabilidad | Andanada = golpe que te desplaza; **Carrera del Viento** = mantener para correr, a cambio de no esquivar |
| [PureDiablo: Rapid Fire](https://www.purediablo.com/diablo4/Rogue_Skills) (sin fecha) · [DiabloBytes: tier list (2026-05-20, parche 3.0.2)](https://diablobytes.com/diablo-iv/builds/rogue-tier-list/) | Diablo 4 | Rapid Fire: 5 flechas seguidas y cada una más crítica; Penetrating Shot sigue arriba en 2026 | La **secuencia** (cada flecha distinta) vive en el básico de la Tiradora; la Flecha Perforante sigue en el kit base |
| [Wowhead: Shadow Shot](https://www.wowhead.com/diablo-4/skill/377137) (sin fecha; variante de Lord of Hatred) | Diablo 4 | Variante de Penetrating Shot que invoca 2 sombras que disparan contigo al 60 % | **Sombra Gemela** (final de clase): la sombra repite solo las principales, 3 s, para no doblar todo el daño |
| [Icy Veins: lista de hechizos de Puntería](https://www.icy-veins.com/wow/marksmanship-hunter-pve-dps-spell-summary) (Midnight temporada 1, 2026) | WoW Midnight | Disparo Apuntado vuelve a **2,5 s** de lanzamiento (1,5 s con Disparo Certero); los talentos Apex «Take Aim» lo hacen crítico siempre | La Francotiradora es la **plantada** (preparación larga, premio grande); la Tiradora, lo contrario |
| [Archon: árboles de Puntería y Bestias](https://www.archon.gg/wow/builds/marksmanship/hunter/raid/talents/normal/all-bosses) (Midnight, parches 12.0.5–12.0.7, 2026) | WoW Midnight | El cazador tiene 3 árboles héroe (Dark Ranger, Sentinel, Pack Leader), cada uno compartido por 2 especializaciones; uno domina en cada especialización (69–93 % de uso) | Árboles héroe **temáticos de la clase** y con pesos parecidos: que ninguno sea obligatorio (§9) |
| [Icy Veins: Marksman (Last Epoch 1.0)](https://www.icy-veins.com/last-epoch/marksman-overview) · [Maxroll: Hail of Arrows](https://maxroll.gg/last-epoch/build-guides/hail-of-arrows-marksman-guide) | Last Epoch | Detonating Arrow se clava y **explota a los 0,6 s**; la Bomba de Humo crea sombras que potencian la siguiente lluvia | **Emboscada** (salir del humo da críticos); «colocar y detonar» se reserva al Montaraz |

**Lagunas (etapa 1).** Ninguna fuente da la duración exacta de la ventana de Perfect Timing de PoE 2; la de §11.2 es diseño propio. Las fichas de Lost Ark son anteriores a 2026 (los números pueden haber cambiado; se usa el patrón, no los valores). No encontré datos públicos de cuántos jugadores usan cada verbo.

**Lecciones aplicadas.**
- Cada verbo trae su **feedback**: barra de carga, anillo de ventana, destello y sonido.
- **Riesgo a cambio de premio:** mantener te deja expuesta, el tiempo justo pega más y la ventana estrecha pega más todavía.
- Moverse forma parte del golpe (salto con disparo); no es solo escapar.
- Las especializaciones **no comparten su verbo principal**.

### 2.1 Investigación de la etapa 2 (Francotiradora, Montaraz y árboles héroe; consultada el 2026-10-21)

Búsquedas hechas con el año en curso («… 2026»). Varias páginas bloquearon la descarga (Icy Veins, Mobalytics y la wiki de PoE 2 respondieron 403 o un muro anti-robots), así que algunas filas se apoyan en el resumen del buscador: lo marco con «(resumen)».

| Fuente (fecha) | Juego | Qué dice | Qué tomamos |
|---|---|---|---|
| [poe2wiki: Perfect Timing](https://www.poe2wiki.net/wiki/Perfect_Timing) · [PoE Toolbox: Snipe](https://poexile.tools/gems/Snipe) · [poe2vault: Snipe](https://www.poe2vault.com/skills/snipe) (sin fecha; resumen) | PoE 2 | Soltar Snipe en la ventana hace estallar la flecha y consume el Congelado; la calidad agranda la ventana hasta un 20 % | **Francotiradora:** el soltado perfecto cambia el disparo (Estela Explosiva, Disparo Imposible) y hay nodos que **ensanchan** la ventana (Pulso Quieto, Lectura del Blanco) |
| [Mobalytics: Snipe Deadeye de Korbyn](https://mobalytics.gg/poe-2/builds/spiral-volley-deadeye-korbyn) (2025; resumen) | PoE 2 | Afirma que el soltado perfecto de Snipe da crítico seguro | El perfecto da **crítico seguro** además del +50 % (una sola regla para las tres habilidades que se tensan) |
| [Icy Veins: guía del arco de Monster Hunter Wilds](https://icy-veins.com/monster-hunter-wilds/bow-guide) (sin fecha; resumen) | MH Wilds | El arco tiene **3 niveles de carga**; esquivar mientras cargas sube el nivel; la mira se ilumina en la **distancia crítica** | Niveles de carga con daño propio (150 · 300 · 450 %); la distancia crítica ya vive en la clase (c6 Tiro Lejano) |
| [Icy Veins: Puntería JcJ, Midnight T1](https://www.icy-veins.com/wow/marksmanship-hunter-pvp-guide) (cambios del 2026-03-17) · [Wowhead: Puntería, 12.0.5](https://www.wowhead.com/tw/guide/classes/hunter/marksmanship/overview-pve-dps) (2026-03-24) | WoW Midnight | Disparo Apuntado de 2,5 s (1,5 s con Disparo Certero); los talentos «Take Aim» lo hacen crítico siempre | Disparo Apuntado se tensa hasta 1,5 s; con **Rodilla en Tierra** y **Calma Absoluta** se tensa más rápido; el ápice alarga la Calma |
| [Soporte oficial de Last Epoch: Explosive Trap](https://support.lastepoch.com/hc/en-us/articles/46363019656859) (sin fecha; resumen) | Last Epoch | Al detonar una Explosive Trap, las demás estallan **una tras otra**; los enemigos rápidos la pisan al instante; máximo 6 | **Detonación en Cadena** (variante de Flecha Detonante) y **Metralla**; tope de 3 trampas en el Coto |
| [Icy Veins: Falconer (Last Epoch 1.0)](https://www.icy-veins.com/last-epoch/falconer-overview) (2024) | Last Epoch | Las trampas se arman en 0,4 s y estallan solas a los 30 s | Trampa de Cepo: se arma en 0,5 s y se desarma a los 30 s |
| [PC Gamer: build de Mercenario](https://pcgamer.com/games/rpg/path-of-exile-2-mercenary-build) (sin fecha) · [Mobalytics: Detonator](https://mobalytics.gg/poe-2/guides/detonator) (2026-08-31; resumen) | PoE 2 | Explosive Shot hace estallar las granadas antes de tiempo; la mecha larga es su punto débil; las habilidades «detonadoras» llevan su etiqueta | **Flecha Detonante**: una principal cuyo papel es hacer estallar tu propio terreno (tipo `detonate`, §11.2) |
| [Foro de Blizzard: notas de alfa de Midnight, Supervivencia](https://us.forums.blizzard.com/en/wow/t/midnight-alpha-development-notes-survival/2176395) (2025) · [hotfix del 2026-09-10](https://us.forums.blizzard.com/en/wow/t/2336376/122) | WoW Midnight | El daño en área de Supervivencia viene de **explosivos** (Wildfire Bomb) con muchos talentos propios | El Montaraz hace daño **con** sus trampas (Batida, Pólvora Negra, Tierra Arrasada), no solo controla |
| [Icy Veins: Poison Trap (Diablo 4)](https://icy-veins.com/d4/guides/poison-trap-rogue-build) (resumen) · [dlcompare: temporada 14](https://www.dlcompare.com/gaming-news/diablo-4-season-14-has-a-clear-winner-and-it-is-the-rogue) · [Mobalytics: Death Trap T16](https://mobalytics.gg/diablo-4/profile/m1py/builds/layout-draft-s16) (2026-09; resumen) | Diablo 4 | Poison Trap quedó «no viable» y las trampas pasaron a ser utilidad; Death Trap (que atrae y estalla) es de lo más fuerte en 2026 | Si la trampa solo sirve de apoyo, no se juega: el Montaraz **atrae** (Cebo de Caza) y **estalla** (Flecha Detonante, Batida) |
| [RPGamer: Titan Quest II añade la maestría Forja](https://rpgamer.com/2025/11/titan-quest-ii-to-add-forge-mastery/) (2025-11) | Titan Quest II | La maestría coloca artilugios (Blade Trap) y **atrae a los enemigos hacia ellos** | Pasiva **Cebo de Caza**: los enemigos normales caminan hacia tus trampas |
| [Archon: Supervivencia y Puntería, Midnight 12.0.5–12.1](https://www.archon.gg/wow/builds/survival/hunter/raid/talents/heroic/explorers) (2026) | WoW Midnight | Uso de árboles héroe: Pack Leader 85–93 % en Bestias y Supervivencia; Sentinel 70–88 % según el jefe | Los tres árboles héroe deben pesar parecido: objetivo ≤ 5 % de diferencia entre los dos de cada especialización (§12) |
| [Foro de Blizzard: «We need to discuss Hunter Hero Talents»](https://us.forums.blizzard.com/en/wow/t/we-need-to-discuss-hunter-hero-talents/1749459) (sin fecha) | WoW | Opinión «casi unánime»: los árboles héroe del cazador tienen poco impacto | Cada árbol héroe **cambia la rotación** (Ráfagas que guardas y sueltas, puntas que rotan, un halcón que marca) |
| [Icy Veins: la pícara en Lord of Hatred](https://wp-prod.icy-veins.com/rogue-gets-new-options-in-diablo-4-lord-of-hatred/) (2026) | Diablo 4 | Cada habilidad activa tiene ramas de mejora y variantes extra | Confirma la forja con variantes de papel opuesto (§10) |

**Lagunas (etapa 2).** No pude abrir las páginas de Icy Veins, Mobalytics ni la wiki de PoE 2 (bloqueo de la descarga); sus filas usan el resumen del buscador y no verifiqué los números exactos (ventana de Snipe, cargas del arco de Wilds). No encontré notas de 2026 sobre Explosive Trap de Last Epoch ni sobre Hunting de Titan Quest II. Ninguna fuente da cuánto tarda un jugador medio en acertar una ventana de 0,2 s: el valor de §11.2 es de diseño y se calibra en E4.

**Lecciones de la etapa 2.**
- **El premio del soltado perfecto es siempre el mismo** (+50 % y crítico) en las tres habilidades que se tensan; los nodos cambian la ventana o lo que pasa después.
- **Una trampa que solo controla no se juega** (Poison Trap de D4): el Montaraz atrae, encierra y hace estallar, y su descarga (Batida) es daño para todo el grupo.
- **Los árboles héroe tienen que notarse** (queja del foro de WoW) y pesar parecido (Archon): cada uno añade un recurso o un compañero con su propia decisión.

---

## 3. Auditoría de la Arquera actual (juego a 2026-10-21)

### 3.1 Activas (27) y quién las toca

Hoy hay 13 habilidades en el libro (para las tres especializaciones) y 14 que conceden nodos de talento.

| Habilidad (hoy) | Origen | Quién la toca hoy | Problema | En la v2 |
|---|---|---|---|---|
| Disparo Rápido | libro, básica Nv1 | ramas 2f | — | Kit base (básica). Pasivas de la Tiradora (Tercera Flecha) y de la Francotiradora (Cuerda Tensa) |
| Disparo Disperso | libro, básica Nv3 | — | Tres básicas compiten por `IZQ` | **Variante I** de Disparo Rápido |
| Flecha de Cicuta | libro, básica Nv8 | Montaraz s1 | Ídem | **Variante II** de Disparo Rápido |
| Flecha Perforante | libro, principal Nv2 | Franco s3, Montaraz s10 | — | Kit base (principal en línea) |
| Flecha Múltiple | libro, principal Nv8 | **clase c9**, Tiradora s3/s6/s7/s12/s15, Vendaval, Montaraz s5 | Lo fuerte de la Tiradora está en el libro de las tres y en el árbol de clase | **Kit de la Tiradora** (Nv14) |
| Lluvia de Flechas | libro, principal Nv14 | clase c9, Tiradora s10/s12, Montaraz s3 | — | Kit base (zona), **Nv8** |
| Paso Veloz | libro, movilidad Nv4 | — | Compite con Agilidad y con 3 movilidades de talento | Kit base (movilidad) |
| Agilidad | libro, movilidad Nv12 | clase c11, Tiradora s5 | — | **Habilidad de talento de clase** (c17A, ranura `2`) |
| Red de Caza | libro, utilidad Nv6 | — | Control de Montaraz para todas | **Variante II de Trampa de Cepo** (la red sale al pisar el cepo) |
| Bomba de Humo | libro, defensa Nv12 | — | — | Kit base (defensa), **Nv6** |
| Diluvio de Saetas | libro, definitiva Nv15 | Tiradora s16 | Tres definitivas para todas | **Definitiva de la Tiradora** (te sigue) |
| Tiro Celestial | libro, definitiva Nv15 | — | Ídem | **Definitiva de la Francotiradora**: 3 haces que **se tensan** (no se relanzan a tiempo) |
| Cerco de Zarzas | libro, definitiva Nv15 | — | Ídem | **Definitiva del Montaraz**, colocada donde apuntas |
| Voltereta | clase c2 | c7 Cuero Curtido | Nodo y habilidad con el mismo nombre | Sale: su idea vive en Paso Veloz y en Tras la Rodada (c27) |
| Disparo Conmocionante | clase c3 | — | Activa de relleno (ralentizar) | Sale: **Flecha Roma** (c10A, pasiva) |
| Flecha Silenciadora | clase c5A | — | — | Sale: **Flecha Silbante** (c10B, pasiva) |
| Flecha Bengala | clase c12A | — | «Revela invisibles» que no existen | **c22A** (ranura `2`), sin «revelar» |
| Camuflaje | clase c12B | — | — | **c11A** (ranura `2`) |
| Disparo Apuntado | Franco s0 (clave) | Franco s4, s6, s10, s12, s14, s17, x1–x3 | Insignia concedida por el nodo clave; preparación fija de 1 s | **Insignia de la Francotiradora** en el libro, ahora **se tensa** (`charge`) |
| Visión Certera | Franco s9 | — | Activa dentro del árbol; nodo y habilidad con el mismo nombre | Sale: su idea (moverte sin vaciar la Concentración) vive en **Rodilla en Tierra** |
| Disparo Disuasorio | Franco s13A | — | Te empuja 8 m atrás: copia el salto de la Andanada (§16.1) | Sale: el empuje vive en A Bocajarro (c6A) |
| Trampa de Cepo | Montaraz s0 (clave) | Montaraz s4, s6, s12, s14, s16, x1–x3 | Insignia concedida por el nodo clave | **Insignia del Montaraz** en el libro |
| Arpón | Montaraz s9 | Montaraz s12 | Activa dentro del árbol; el Guerrero ya usa «Arpón» | **Variante II de Flecha Detonante** (Flecha de Garfio) |
| Señuelo de Paja | Montaraz s13A | — | — | **Variante II de Cerco de Zarzas** (Señuelo de Zarzas) |
| Andanada | Tiradora s0 (clave) | Tiradora s4, s7, s15 | Insignia concedida por el nodo clave | **Insignia de la Tiradora** en el libro, con relanzamiento |
| Danza de Flechas | Tiradora s9 | — | Activa dentro del árbol | Sale: su idea (canalizar corriendo) es **Carrera del Viento** |
| Salto de Retirada | Tiradora s13A | — | — | Sale: pasa a **Retirada Instintiva** (v15B, automática) |

### 3.2 Conflictos

| Conflicto | Ejemplo | Cómo se resuelve |
|---|---|---|
| La clase toca lo fuerte de una especialización | c9 «Flechas Templadas» sube Flecha Múltiple; c11 alarga Agilidad | El árbol de clase solo toca el kit base (G1) |
| Insignias concedidas por el nodo clave y activas dentro del árbol de especialización | Andanada, Disparo Apuntado, Trampa de Cepo; Danza, Visión Certera, Arpón | El kit va al **libro**; los árboles son pasivos |
| Tres definitivas para todas | Diluvio, Tiro Celestial, Cerco | Una por especialización |
| Nombres repetidos | «Voltereta», «Visión Certera» (nodo y habilidad); «Ojo de Halcón» (c4 y variante 2f de Agilidad); «Andanada» y «Andanada Final»; «Constelación»; «Arpón» (Montaraz y Guerrero) | Nombres únicos en la clase y comprobados contra la Maga y el Guerrero (§14) |
| Nodos que no hacen nada | Tiradora s2 «Disparar ya no te frena»; Montaraz s2 «Ves el rastro de tu Presa» | Fuera |
| Relleno de +2 % | Tiradora s1, s17; clase c8; Franco s7 «Letalidad» (+5 %/rango) | Cada número es ≥ +10 % en su eje o es mecánica |
| El Impulso no se pierde | Quedarse quieta no castiga a la Tiradora | Pierde 10 por segundo tras 2 s quieta (§7.0) |
| Pasiva del Montaraz = la del Crionte | «+25 % de Quebranto a los jefes» | **Resuelto:** pasiva nueva **Cebo de Caza** (§7.2) |
| Casi todo es «aprieto y sale» | Solo Tiro Celestial se relanza, Disparo Apuntado prepara 1 s y Danza canaliza | Vocabulario de verbos (§4.3): cada especialización usa ≥ 3 |

---

## 4. Modelo de capas y verbos

### 4.1 Capas

| Capa | Qué es | Qué contiene |
|---|---|---|
| **Kit base de la Arquera** | Lo que sabe toda Arquera desde el Nv1 | Disparo Rápido (1), Flecha Perforante (2), Paso Veloz (4), Bomba de Humo (6), Lluvia de Flechas (8) |
| **Kit de especialización** | Llega al elegirla (Nv10) y por nivel; solo existe con ella | **Tiradora:** Andanada (`3`, Nv10), Carrera del Viento (`1`, Nv12), Flecha Múltiple (`DER/2`, Nv14), Diluvio de Saetas (`4`, Nv15). **Francotiradora:** Disparo Apuntado (`3`), Rodilla en Tierra (`2`, utilidad), Tiro Rastreador (`DER/2`), Tiro Celestial (`4`). **Montaraz:** Trampa de Cepo (`3`), Salto de Acecho (`1`, movilidad), Flecha Detonante (`DER/2`), Cerco de Zarzas (`4`) |
| **Talentos** | Clase · Paragon · Especialización | §6, §9, §7. Habilidades de talento solo en c11A, c17A y c22A (clase) y en q4A, w4A e y4A (una por árbol héroe) |
| **Forja** | Mejora + 2 variantes por habilidad | Transforma; el talento no la repite (§10) |

**Ranuras de cada especialización** (las de su build recomendada; ★ = variante recomendada):

| Ranura | Tiradora | Francotiradora | Montaraz |
|---|---|---|---|
| `IZQ` | Disparo Rápido (Disparo Disperso ★) | Disparo Rápido, **tensable** (Flecha de Cicuta ★) | Disparo Rápido (Flecha de Cicuta ★) |
| `DER` | Flecha Múltiple | Tiro Rastreador o Flecha Perforante | Flecha Detonante |
| `1` | Carrera del Viento **o** Paso Veloz | Paso Veloz | Salto de Acecho **o** Paso Veloz |
| `2` | Flexible (Bomba de Humo, Lluvia, Perforante, habilidad de clase) | **Rodilla en Tierra** o Bomba de Humo (o una activa de clase o héroe) | Bomba de Humo (o Lluvia, o una activa) |
| `3` | Andanada | Disparo Apuntado | Trampa de Cepo |
| `4` | Diluvio de Saetas | Tiro Celestial | Cerco de Zarzas |

**Decisiones visibles por especialización.** Tiradora: la ranura `1` enfrenta la **Carrera del Viento** (su columna C) con el **Paso Veloz** (la columna derecha de la clase). Francotiradora: la ranura `2` enfrenta la **postura** (Rodilla en Tierra, columna C) con la **defensa** (Bomba de Humo) o una activa. Montaraz: la ranura `1` enfrenta **saltar a tus trampas** (Salto de Acecho) con **rodar libre** (Paso Veloz, con Sombra Gemela).

### 4.2 Calendario Nv1–15 (la especialización se elige al Nv10)

| Nv | Kit base | Tiradora | Francotiradora | Montaraz | Talentos |
|---|---|---|---|---|---|
| 1 | Disparo Rápido | | | | — |
| 2 | Flecha Perforante | | | | — |
| 4 | Paso Veloz | | | | — |
| 6 | Bomba de Humo | | | | — |
| 8 | Lluvia de Flechas | | | | — |
| **10** | | Andanada (`3`) · pasiva Tercera Flecha | Disparo Apuntado (`3`) · pasiva Cuerda Tensa | Trampa de Cepo (`3`) · pasiva Cebo de Caza | Nodo clave gratis + 1.er punto de especialización |
| 11 | | | | | 1.er punto de clase |
| 12 | | Carrera del Viento (`1`) | Rodilla en Tierra (`2`) | Salto de Acecho (`1`) | |
| 14 | | Flecha Múltiple (`DER/2`) | Tiro Rastreador (`DER/2`) | Flecha Detonante (`DER/2`) | |
| 15 | | Diluvio de Saetas (`4`) | Tiro Celestial (`4`) | Cerco de Zarzas (`4`) | |

Las habilidades de talento de clase llegan cuando su nodo se puede comprar: **Camuflaje ≈ Nv21**, **Agilidad ≈ Nv27**, **Flecha Bengala ≈ Nv31**. Las de árbol héroe (Torbellino, Desborde de Puntas, Llamada del Halcón), **≈ Nv72**, como las de la Maga.

### 4.3 Verbos de entrada y movimiento (pedido del dueño)

| Verbo | Qué es | Referencia (§2) | Motor hoy (`game-skills.js`) | Falta | Lo usa |
|---|---|---|---|---|---|
| **Moverse disparando** (kiteo) | Bonus por disparar en movimiento | D4, Hades | `p.moving` ✓ (Impulso, Concentración) | Pérdida del Impulso quieta | **Tiradora (principal)** |
| **Mantener para cargar y soltar** | Más daño cuanto más cargas; ventana de soltado perfecto que se ve y se oye | PoE 2 Perfect Timing, Lost Ark, MH Wilds | `windup` fijo (no se mantiene) | **Tipo genérico `charge`** (§11.2) | **Francotiradora (principal)**: Disparo Apuntado, Cuerda Tensa, Tiro Celestial |
| **Canalizar mientras mantienes** | Ráfaga mientras aprietas; moverte lento, quieta o más rápido | D4 Rapid Fire, Hades (correr) | `startChannel` con `hold` ✓ | `moveMul`, `autoShot`, `drainPerSec`, `onRelease` | Tiradora (Carrera del Viento) |
| **Preparación interrumpible** | Preparar y que la esquiva lo cancele | WoW Disparo Apuntado | `windup` ✓ | — | Tiro de Precisión (kit base); rodar cancela cualquier tensado |
| **Plantado contra en movimiento** | Bonus por no moverte frente a bonus por moverte | WoW Midnight | `p.moving` ✓ | — | Tiradora (en movimiento) · Francotiradora (plantada: Concentración, Quietud) |
| **Postura** | Activas un modo con reglas propias hasta que lo dejas | Lost Ark (posturas), MH Wilds (enfoque) | no | **Tipo genérico `stance`** (§11.2) | Francotiradora (Rodilla en Tierra) |
| **Movimiento lento a cambio de algo** | Te mueves despacio sin perder lo acumulado | — | `p.applySlow` (solo enemigos) | `stance.moveMul` | Francotiradora (Rodilla en Tierra) |
| **Golpe que te desplaza** | Salto o rodada que dispara | Hades Dash-Strike | a medida (`a_paso`, `a_t_salto`) | — | Tiradora (Andanada) · Montaraz (Salto de Acecho estalla al llegar) |
| **Relanzar dentro de una ventana** | Segunda pulsación; tiempo justo | Tiro Celestial de hoy | solo a medida (`a_celeste`) | **Tipo genérico `recast`** | Tiradora (Andanada) |
| **Secuencia** | El 3.er golpe es distinto | D4 (combo) | no | **Clave genérica `seq`** | Tiradora (Tercera Flecha) |
| **Marcar y aprovechar** (sin detonar) | La marca premia el siguiente golpe | WoW (Hunter's Mark) | `mark` ✓ | `firstCharged` | Francotiradora (Punto Débil) · Montaraz (Presa) |
| **Colocar trampas o zonas y detonarlas** | Preparar el terreno y hacerlo estallar | Last Epoch, PoE 2 (detonadores), D4 Death Trap | `trap`, `zone` ✓ | **`detonate`** (§11.2) | **Montaraz (principal)** |
| **Atraer y arrastrar** | Los enemigos van hacia tu terreno | Titan Quest II, D4 Death Trap | `pull` en proyectiles | **`lure`** en las trampas (§11.2) | Montaraz (Cebo de Caza, Flecha de Garfio, Gran Cacería) |
| **Posición** | Distancia o flanco | MH Wilds (distancia crítica) | — | `condAdd` por distancia | Clase (c6) · Francotiradora (Vista Larga) |
| **Zona que te sigue** | La nube va contigo | — | campos fijos; `aura` | Clave `follow` | Tiradora (Diluvio) · clase (Manto de Niebla) |

**Verbos por especialización** (regla del dueño: ≥ 3 verbos, el principal no se comparte y el árbol tiene nodos que **modifican** esos verbos):

| | Tiradora Veloz | Francotiradora | Montaraz |
|---|---|---|---|
| **Verbo principal** | Moverse disparando | **Cargar y soltar** con ventana dorada, **plantada** | **Colocar y detonar** trampas y zonas |
| Otros verbos | Relanzar, mantener (canal que acelera), secuencia, zona que te sigue | Postura, movimiento lento sin perder la Concentración, marcar y aprovechar | Atraer y arrastrar, saltar a tu trampa, zonas fijas, marca de Presa |
| Nodos que modifican el principal | v15A, v16, v20, v28 | f2, f3, f6, f12, f16, f24, f25, f26 (ventana, rapidez, premio, carga instantánea) | m8A, m11, m18, m22, m24, m25, m26, m27 (cuántas, cómo estallan, dónde saltan) |
| Nodos que modifican los otros | v5, v6, v9, v10, v14, v19, v21, v22, v26, v27 | f7, f10, f13, f21, f27 (postura) · f5, f9, f19, f23 (marca) | m5, m9, m12, m19, m23 (Presa) · m14, m17, m21, m27 (zonas) · m18 (salto) |
| Feedback | Rosa de los vientos (Impulso), estela | Barra de carga junto al cursor con la ventana dorada, destello y «¡Perfecto!»; candado en la Concentración de rodillas | Contador de 3 trampas, hilos verdes del cebo, anillo de la Batida |

### 4.4 Ritmo, puertas y presupuesto (iguales a la Maga)

Valores de `TV2.REGLAS` (la Maga, §3). Lo que mide el validador con los árboles de la Arquera:

| Árbol | Nodos · rangos | Puntos a Nv100 | Un final al máximo | Dos finales | Puertas |
|---|---|---|---|---|---|
| Clase | 30 · 53 | 34 (64 %) | 30 puntos → **Nv69** (los tres) | 36 > 34: imposible | 8 → fila 4 (Nv25) · 24 → fila 7 (Nv57) |
| Tiradora · Francotiradora · Montaraz (cada uno) | 29 · 59 | 31 (53 %) | 26 → **Nv60** (los nueve finales); con el ápice completo, 30 → **Nv68** | 32 > 31: imposible | 8 → fila 4 (Nv24) · 20 → fila 7 (Nv48) · 25 → ápice (Nv58) |
| Paragon (cada árbol héroe) | 13 · 13 | Clave + 10 (Nv71–80) | Final (capstone) con 10 puntos en cualquier camino legal | — | Se abre con la especialización 31/31 |

---

## 5. Kit base de la Arquera (5 habilidades, Nv1–8)

Mejora a Nv+3 y variantes a Nv+6 (como en 2f). `WD` = daño del arma.

| Habilidad | Ranura · Nv | Qué hace | Mejora | Variante I | Variante II |
|---|---|---|---|---|---|
| **Disparo Rápido** (`a_disparo`) | Básica `IZQ` · 1 | Una flecha veloz (100 %). Cada acierto te devuelve 5 de Energía | **Mano Rápida**: un 10 % más rápido | **Disparo Disperso** (área): 3 flechas en 25° (45 % cada una). Absorbe a Disparo Disperso | **Flecha de Cicuta** (un objetivo): Naturaleza, 70 % y veneno del 50 % en 4 s que se suma. Absorbe a Flecha de Cicuta |
| **Flecha Perforante** (`flecha_perforante`) | Principal `DER/2` · 2 | Flecha pesada (240 %) que atraviesa en línea. 26 de Energía | **Astil de Fresno**: +2 m y +20 % de velocidad | **Flecha Explosiva** (área): no atraviesa; explota en 3 m al 80 % | **Tiro de Precisión** (un objetivo): preparas 0,35 s (la esquiva la cancela), +45 % |
| **Paso Veloz** (`a_paso`) | Movilidad `1` · 4 | Ruedas 6 m y +20 % de velocidad de ataque 3 s. Se recarga en 9 s | **Ágil**: el bonus dura 4 s | **Rodar y Disparar** (un objetivo): al rodar, un Disparo Rápido gratis al 150 % | **Doble Rodada** (movilidad): 2 cargas, sin el bonus |
| **Bomba de Humo** (`a_humo`) | Defensa `2` · **6** (antes 12) | Nube de 4 m, 8 s: dentro, −50 % de daño recibido; los enemigos, cegados, pegan −30 %. Se recarga en 16 s, **contados desde que se disipa** (dos humos tuyos no se solapan) | **Humo Espeso**: radio 5 m | **Humo Venenoso** (área): veneno del 40 % por segundo dentro | **Estallido de Humo** (control): al lanzarla empuja 3 m y ralentiza un 40 % 2 s |
| **Lluvia de Flechas** (`lluvia_flechas`) | Principal `DER/2` · **8** (antes 14) | Tras 0,3 s de aviso, 4 oleadas en 3 m (60 % cada una). 30 de Energía, 4 s | **Cielo Plomizo**: 5 oleadas | **Aguacero** (un objetivo): radio 2 m, en 0,8 s, +40 % | **Cortina** (supervivencia): dentro, los enemigos pegan −15 % y fallan la mitad de sus proyectiles |

Dos principales de estilos distintos: **Perforante** (instantánea, en línea) y **Lluvia** (zona diferida con aviso). Nada fuerte de una especialización: la Múltiple, el Diluvio, el Tiro Celestial y el Cerco salen del kit base. **Red de Caza** (hoy utilidad del libro de las tres) pasa a ser la variante II de **Trampa de Cepo** del Montaraz: el control de grupo de la red es suyo.

**Habilidades de talento de clase** (solo en la ranura `2`; sin forja):

| Habilidad | Nodo | Qué hace | Se recarga |
|---|---|---|---|
| **Camuflaje** (`a_t_camuflaje`, defensa) | c11A | Invisible 4 s; los enemigos te pierden, **Paso Veloz se recarga** y tu primer disparo al salir es crítico | 30 s |
| **Agilidad** (`agilidad`, utilidad) | c17A | 6 s: +30 % de velocidad, +15 % de velocidad de ataque e inmune a ralentizaciones | 16 s |
| **Flecha Bengala** (`a_t_bengala`, utilidad) | c22A | Bengala de 10 m durante 8 s: los enemigos dentro reciben un **15 %** más de daño de todo el grupo y pegan un **15 %** menos | 30 s |

---

## 6. Árbol de clase de la Arquera (30 nodos, 53 rangos)

Generada de los datos. ○ pasiva · ⬡ elección · □ opción que concede una habilidad. «Requiere» = cualquiera de esos nodos al máximo.

| Fila | Id | Nodo | Forma · tipo | Etiqueta | Rangos | Requiere | Qué hace (al máximo) | Cuál conviene |
|---|---|---|---|---|---|---|---|---|
| 0 | c1 | Carcaj Profundo | ○ pasiva | número | 2 | — | Rango 2: +20 de Energía máxima (antes 60) |  |
| 0 | c2 | Pulso Firme | ○ pasiva | número | 2 | — | Rango 2: Todas tus flechas hacen +12 % de daño |  |
| 0 | c3 | Paso de Gacela | ○ pasiva | número | 2 | — | Rango 2: Paso Veloz se recarga en 6 s (antes 9 s) |  |
| 1 | c4 | Bomba Rápida | ○ pasiva | número | 3 | c1 | Rango 3: La Bomba de Humo se recarga en 10 s (antes 16 s) |  |
| 1 | c5 | Disparo: Fijo o Saqueo | ⬡ elección | mecánica | 1 | c1 o c2 | **A · ○ Puntería Fija**: Cada 4.º Disparo Rápido al mismo enemigo es crítico seguro _(contra jefes)_<br>**B · ○ Flecha Saqueadora**: Si Disparo Rápido mata, recuperas 8 de Energía _(contra grupos)_ | A, contra jefes: un crítico seguro cada ~3 s. B, contra grupos: como mueren muchos, ≈ una habilidad principal extra cada 3 muertes |
| 1 | c6 | Distancia: Bocajarro o Lejos | ⬡ elección | mecánica | 1 | c2 o c3 | **A · ○ A Bocajarro**: A menos de 5 m, tus flechas hacen +15 % de daño y empujan 1 m al enemigo _(contra grupos)_<br>**B · ○ Tiro Lejano**: A más de 10 m, tus flechas hacen +20 % de daño _(contra jefes)_ | A, contra grupos que te alcanzan: el empuje te da aire para seguir kiteando. B, contra jefes, si sabes mantener la distancia. Sirve igual a las tres |
| 1 | c7 | Paso Limpio | ○ pasiva | mecánica | 1 | c3 | Paso Veloz te quita las ralentizaciones y las inmovilizaciones |  |
| 2 | c8 | Difícil de Alcanzar | ○ pasiva | número | 2 | c4 o c5 | Rango 2: Mientras te mueves, recibes un 12 % menos de daño |  |
| 2 | c9 | Perforante: Lastrada o Diamante | ⬡ elección | mecánica | 1 | c5 o c6 | **A · ○ Flecha Lastrada**: Flecha Perforante ralentiza un 40 % durante 3 s a todos los que atraviesa _(control)_<br>**B · ○ Punta de Diamante**: Flecha Perforante hace +40 % al primer enemigo que toca _(contra jefes)_ | A, para controlar grupos en fila y escapar de ellos. B, contra jefes y élites |
| 2 | c10 | Roma o Silbante | ⬡ elección | mecánica | 1 | c6 o c7 | **A · ○ Flecha Roma**: Cada 8 s, tu siguiente disparo ralentiza un 50 % durante 4 s _(control)_<br>**B · ○ Flecha Silbante**: Cada 10 s, tu siguiente disparo corta el hechizo del enemigo y lo deja mudo 3 s _(contra jefes)_ | A, contra grupos que te persiguen. B, contra jefes y élites que lanzan hechizos (además les llena 20 de Quebranto) |
| 3 | c11 | Camuflaje o Instinto | ⬡ elección | mecánica | 1 | c8 | **A · □ Camuflaje** (habilidad): Habilidad (ranura 2): invisible 4 s; te pierden, Paso Veloz se recarga y tu primer disparo es crítico. 30 s _(supervivencia)_<br>**B · ○ Instinto de Supervivencia**: Un golpe que te mataría te deja con 1 de vida y suelta una Bomba de Humo gratis. Una vez cada 180 s _(supervivencia)_ | A, contra golpes de jefe que se ven venir: esquivas y vuelves a rodar (ocupa la ranura 2). B, un seguro cada 3 minutos sin ocupar ranura |
| 3 | c12 | Respiración Pausada | ○ pasiva | número | 2 | c8 o c9 | Rango 2: Recuperas Energía un 30 % más rápido |  |
| 3 | c13 | Ojo de Halcón | ○ pasiva | número | 2 | c9 o c10 | Rango 2: +10 % de probabilidad de crítico |  |
| 3 | c14 | Paso: Abrojos o Sanador | ⬡ elección | mecánica | 1 | c10 | **A · ○ Paso de Abrojos**: Donde empieza tu Paso Veloz quedan abrojos 3 s que ralentizan un 50 % _(control)_<br>**B · ○ Paso Sanador**: Paso Veloz te cura un 6 % de la vida _(supervivencia)_ | A, para escapar de enemigos cuerpo a cuerpo. B, para aguantar peleas largas |
| 4 | c15 | Adrenalina o Calma Letal | ⬡ elección | mecánica | 1 | c11 o c12 | **A · ○ Adrenalina**: Al bajar del 50 % de vida recuperas 30 de Energía y recibes un 20 % menos 4 s. Una vez cada 30 s _(supervivencia)_<br>**B · ○ Calma Letal**: Con más de 40 de Energía, haces +10 % de daño _(contra jefes)_ | A, para sobrevivir a golpes fuertes (+12–15 % de aguante). B, para hacer daño (+6–8 %) |
| 4 | c16 | Presión o Barrido | ⬡ elección | mecánica | 1 | c12 o c13 | **A · ○ Presión Constante**: Cada disparo al mismo enemigo te da +4 % de daño contra él (hasta +20 %); se pierde al cambiar de blanco _(contra jefes)_<br>**B · ○ Barrido de Caza**: Cada enemigo distinto que golpeas en 2 s te da +3 % de velocidad de ataque (hasta +15 %) _(contra grupos)_ | A, contra jefes: +20 % casi siempre. B, contra grupos: +15 % de velocidad de ataque con 5 enemigos a tiro |
| 4 | c17 | Agilidad o Huida | ⬡ elección | mecánica | 1 | c13 o c14 | **A · □ Agilidad** (habilidad): Habilidad (ranura 2): 6 s con +30 % de velocidad, +15 % de ataque e inmune a ralentizaciones. Se recarga en 16 s _(supervivencia)_<br>**B · ○ Huida Desesperada**: Al bajar del 30 % de vida: +40 % de velocidad y un 20 % menos de daño 4 s. Una vez cada 60 s _(supervivencia)_ | A, para escapar o perseguir a voluntad (ocupa la ranura 2). B, contra el daño constante de un grupo, sin ocupar ranura |
| 5 | c18 | Humo Denso | ○ pasiva | número | 2 | c15 | Rango 2: La Bomba de Humo dura 10 s (antes 8 s) |  |
| 5 | c19 | Tiro desde la Niebla | ○ pasiva | mecánica | 1 | c15 o c16 | Dentro de tu Bomba de Humo, cada Disparo Rápido te da 3 de Energía y alarga el humo 0,3 s (hasta +2 s)<br>_híbrido: Defensa + Básica_ |  |
| 5 | c20 | Lluvia en Retirada | ○ pasiva | mecánica | 1 | c16 o c17 | Paso Veloz deja caer una Lluvia de Flechas gratis al 30 % donde empezaste a rodar<br>_híbrido: Movilidad + Principal_ |  |
| 5 | c21 | Piernas de Corredora | ○ pasiva | número | 1 | c17 | Te mueves un 10 % más rápido |  |
| 6 | c22 | Bengala o Economía | ⬡ elección | mecánica | 1 | c18 o c19 | **A · □ Flecha Bengala** (habilidad): Habilidad (ranura 2): bengala de 10 m 8 s; dentro reciben +15 % de daño y pegan un 15 % menos. 30 s _(contra grupos)_<br>**B · ○ Economía Letal**: Las habilidades que cuestan más de 20 de Energía cuestan un 20 % menos _(contra jefes)_ | A, en grupo: todos pegan +15 % dentro y recibes menos (ocupa la ranura 2). B, para hacer daño en solitario (+5–7 %) |
| 6 | c23 | Recarga en Marcha | ○ pasiva | mecánica | 2 | c19 o c20 | Rango 2: Cada habilidad principal que lanzas recarga 0,6 s de Paso Veloz y de la Bomba de Humo |  |
| 6 | c24 | Cadencia | ○ pasiva | número | 2 | c20 o c21 | Rango 2: Disparas un 14 % más rápido |  |
| 7 | c25 | Emboscada | ○ pasiva | mecánica | 3 | c22 | Rango 3: Al salir de tu Bomba de Humo o al acabarse, tus 4 siguientes disparos son críticos seguros |  |
| 7 | c26 | Compás | ○ pasiva | mecánica | 3 | c23 | Rango 3: Alternar básica y principal te da un Compás (hasta 5): +6 % de daño cada uno. Se pierden a los 3 s |  |
| 7 | c27 | Tras la Rodada | ○ pasiva | mecánica | 3 | c24 | Rango 3: Tras Paso Veloz, tu siguiente habilidad principal no cuesta Energía y hace +30 % |  |
| 8 | c28 | Manto de Niebla | ○ **FINAL** | mecánica | 3 | c25 | Rango 3: Tu Bomba de Humo te sigue; dentro recibes un 25 % menos (antes 50 %) y el grupo recupera un 0,75 % de vida por segundo<br>_final: Defensa_ |  |
| 8 | c29 | Danza del Arco | ○ **FINAL** | mecánica | 3 | c26 | Rango 3: Con 5 Compases, tu siguiente principal es gratis, crítica y hace +60 %; los Compases vuelven a 0<br>_final: Ritmo_ |  |
| 8 | c30 | Sombra Gemela | ○ **FINAL** | mecánica | 3 | c27 | Rango 3: Paso Veloz deja una sombra tuya 3 s que repite tus habilidades principales al 60 %<br>_final: Movilidad_ |  |

**Tres finales (utilidad o ritmo; el daño grande vive en la especialización):**
- **Manto de Niebla** (izquierda, Defensa): la Bomba de Humo **te sigue** y cura a quien está dentro (0,25/0,5/0,75 % por segundo); dentro de ese humo se recibe un 25 % menos (el fijo, 50 %) y su ceguera no se suma a la de otro humo. Convierte el humo en una zona que kitea contigo y en apoyo de grupo, sin volverte inmortal (§12.2).
- **Danza del Arco** (centro, Ritmo): al **alternar** básica y principal juntas Compases; con 5, la siguiente principal sale gratis, crítica y +60 %.
- **Sombra Gemela** (derecha, Movilidad): Paso Veloz deja una sombra 3 s que repite tus principales al 30–60 %.

**Verbos que añade la clase:** **distancia** (c6 Bocajarro o Lejano), **alternar** (c26 Compás → c29), **entrar y salir del humo** (c25 Emboscada) y **rodar** (c3, c7, c14, c20, c27, c30).

**Implementación (por nodo):** `c1` stats.mp · existe; `c2` stats.dmgPct · existe; `c3` mod a_paso cdr · existe; `c4` mod a_humo cdr · existe; `c5` A: power a_punteria_fija · NUEVO · B: power a_saqueo · NUEVO (onKill); `c6` A: power a_bocajarro · NUEVO (condAdd por distancia + empuje) · B: power a_tiro_lejano · NUEVO; `c7` mod a_paso cleanse · clave existente; `c8` tv.drMoving · existe; `c9` A: mod flecha_perforante slow · claves · B: power a_punta_diamante · NUEVO; `c10` A: power a_flecha_roma · NUEVO (lógica de a_t_conmocion) · B: power a_silbante · NUEVO (lógica de a_t_silencio; interrumpir = 20 de Quebranto); `c11` A: activa a_t_camuflaje · existe (+ recarga Paso Veloz) · B: power a_instinto · NUEVO (onLethal, cada 180 s); `c12` stats regen de Energía · existe; `c13` stats.crit · existe; `c14` A: power a_paso_abrojos · NUEVO (campo) · B: power a_rodada_cura · NUEVO (g.heal); `c15` A: power a_adrenalina · NUEVO · B: tv.highManaDmg (umbral 40) · existe; `c16` A: power a_presion · NUEVO · B: power a_barrido · NUEVO; `c17` A: activa agilidad · existe · B: power a_huida · NUEVO; `c18` mod a_humo durS · existe; `c19` power a_tiro_niebla · NUEVO; `c20` power a_lluvia_retirada · NUEVO (eco de la Lluvia ×0,3); `c21` stats.spdPct · existe; `c22` A: activa a_t_bengala · existe (pasa a Debilidad 15 % y debilita un 15 %) · B: tv.costRedBig · existe; `c23` power a_recarga_marcha · NUEVO; `c24` stats.aspdPct · existe; `c25` power a_emboscada · NUEVO; `c26` power a_compas · NUEVO; `c27` power a_tras_rodada · NUEVO; `c28` power a_manto · NUEVO (campo que sigue al dueño con dr 25 + g.heal a los aliados dentro); `c29` power a_danza_arco · NUEVO; `c30` power a_sombra · NUEVO (eco de las principales).

### 6.1 Revisión con los kits de las tres especializaciones (confirmada en la etapa 2)

| Rama · nodo | Tiradora | Francotiradora | Montaraz | Veredicto |
|---|---|---|---|---|
| c5 Disparo (Fijo o Saqueo) | Saqueo (Tormenta de Plumas, Galerna Infinita); Fijo (Vaivén Eterno, Viento Cruzado) | **Fijo** en las cuatro (un objetivo; Cuerda Tensa) | Saqueo (Tierra Arrasada, Bosque Vivo); Fijo (Gran Cacería, Espinas de Caza) | Sirve a las tres: la básica es de todas |
| c6 Distancia (Bocajarro o Lejos) | **Bocajarro** (los que la alcanzan; el empuje la deja seguir kiteando) | **Tiro Lejano** en las cuatro | **Bocajarro** en las cuatro (pelea junto a sus trampas) | **Elección real por especialización**: ninguna build cruza su distancia natural |
| c9 Perforante · c20 Lluvia en Retirada | c20 en Viento Cruzado | c9B en Atalaya Eterna (Perforante en `DER`); c20 en las que llevan Paso Veloz | c20 en Gran Cacería (Paso Veloz) | Tocan el kit base, que sigue en el libro de las tres |
| c11, c15, c17, c22 (supervivencia, economía, habilidades) | Agilidad (c17A) en Viento Cruzado; el resto, opciones B | Opciones B en las cuatro (la ranura `2` es la postura o la activa héroe Torbellino) | c11B, c17B y c22B (la ranura `2` es el humo, o la **Llamada del Halcón** en Gran Cacería); c15 A o B según la build | Genéricos; las activas compiten con la ranura `2` de cada kit. Tras el juicio se subieron (§18, hallazgo 11): cada especialización tiene al menos una build con una activa de clase o de héroe |
| c16 Presión o Barrido | Barrido (grupos) o Presión (jefes) | Presión (Punto Débil, Vigía); Barrido (Perforación, Pulso de Hierro) | Presión (Presa, Zarzal, híbrida); Barrido (Campo Minado) | Sirve a las tres |
| c23 Recarga en Marcha | Cuenta habilidades principales lanzadas (corregido en la etapa 1) | Igual (Tiro Rastreador) | Igual (Flecha Detonante) | Igual para las tres |
| Finales | Danza del Arco (Tormenta de Plumas, Vaivén Eterno), Sombra Gemela (Viento Cruzado), **Manto de Niebla** (Galerna Infinita) | Danza del Arco (Línea Mortal, Atalaya Eterna), Sombra Gemela (Disparo Imposible, Pulso de Hierro) | **Manto de Niebla** (Bosque Vivo), Danza del Arco (Tierra Arrasada, Espinas de Caza), Sombra Gemela (Gran Cacería) | Los tres finales los usan builds de al menos dos especializaciones |

Ningún nodo de clase nombra una habilidad de especialización (G1, lo comprueba el validador con los 12 nombres de los tres kits).

---

## 7. Especializaciones (29 nodos cada una, misma rejilla)

### 7.0 Tiradora Veloz (daño en área · Impulso)

**Fantasía:** nunca se detiene. Dispara corriendo, salta hacia atrás disparando, vuelve hacia delante y la lluvia la sigue. **Rol:** daño en área (el de hoy; en 2e su objetivo es ÁREA×5 ≥ 1,2 veces la media).

**Pasiva: Tercera Flecha.** Cada 3.er Disparo Rápido lanza **2 flechas más** en abanico de 30° (60 % cada una). Con Disparo Disperso, el tercero son 3 + 2 flechas. Sin la Tiradora, Disparo Rápido vuelve a ser una sola flecha. Es el verbo **secuencia** en la tecla que más se pulsa.

**Verbos de su kit (5):**

| Verbo | Dónde | Nodos que lo **modifican** |
|---|---|---|
| **Moverse disparando** (principal) | Impulso: solo se gana en movimiento y se pierde quieta | v15A Piel de Brisa, v16, v20; clase c8 |
| **Golpe que te desplaza + relanzar** | Andanada: salto atrás disparando; 2.ª pulsación en 2 s, salto adelante | v5 (cuenta para la secuencia), v9A **tiempo justo** (último medio segundo), v9B **un relanzamiento más**, v12, v19, v26 (en el Vendaval vuelve **sin recarga y a mitad de coste**: 1, 2 o sin límite de veces) |
| **Mantener (canal que acelera)** | Carrera del Viento: mientras aprietas, corres un 40 % más rápido y disparas sola | v6 y v14 (**al soltar**), v7 (dura más), v10A (anillos) / v10B (rampa), v17, v21 (sus 6 primeros segundos), v24 (deja ciclones), v27 (**prórroga** de 2 s, 4 s o sin límite, con un coste de Energía que crece cada segundo) |
| **Secuencia** | Pasiva Tercera Flecha; Flecha Múltiple seguida | v5, v8 (A: más flechas · B: crítico seguro), v22 (cada Múltiple a menos de 3 s suma flechas), v25 (la 3.ª sale en círculo) |
| **Zona que te sigue** | Diluvio de Saetas | v21 (descarga cada 0,4 s en los 6 primeros segundos de Carrera), v17, ápice 4 |

**Kit (libro; forja con Mejora a Nv+3 y variantes a Nv+6):**

| Habilidad | Ranura · Nv | Qué hace | Mejora | Variante I | Variante II |
|---|---|---|---|---|---|
| **Andanada** (`a_t_andanada`) | Insignia `3` · 10 | Saltas 4 m atrás y disparas 10 flechas en 120° (**45 %** cada una). En 2 s, **pulsa otra vez**: saltas adelante y repites. 25 de Energía, 8 s | **Arco Ancho**: 150° | **Andanada Cerrada** (un objetivo): 30° y +3 m; **hasta 3 flechas de cada salto** al mismo enemigo (el abanico normal deja ~1–2) | **Andanada Repulsora** (control): las flechas empujan 2 m y ralentizan un 30 % 2 s; −15 % |
| **Carrera del Viento** (`a_v_carrera`, NUEVA) | Movilidad `1` · 12 | **Mantén pulsado:** corres un 40 % más rápido hasta 4 s y disparas sola al más cercano cada 0,4 s (45 %). 10 s | **Galope**: un 55 % más rápido | **Carrera Certera** (un objetivo): cada 0,6 s al de más vida, +70 % | **Carrera Esquiva** (supervivencia): el 40 % de los proyectiles enemigos te fallan; −30 % |
| **Flecha Múltiple** (`flecha_multiple`) | Principal `DER/2` · 14 | 5 flechas en 50° (**45 %** cada una). No te frena: úsala corriendo. 22 de Energía | **Alcance Largo**: 10 → 13 m | **Abanico Abierto** (área): 7 flechas en 90° (**38 %** cada una) | **Haz Cerrado** (un objetivo): 3 flechas en 10° que atraviesan (55 % cada una) |
| **Diluvio de Saetas** (`a_u_diluvio`) | Definitiva `4` · 15 | Una nube **te sigue** 6 s y cada 0,5 s descarga en 4 m a tu alrededor (170 % por oleada: 2040 % en total; hoy 2184 %). 50 s | **Nube Ancha**: 5 m | **Diluvio Anclado** (área): fijo donde apuntas, 6 m | **Saetas Pesadas** (un objetivo): 4 saetas de **600 %** sobre tu objetivo en 2 s |

**Barra de mecánica: Impulso** (ya existe en `spec-mechanics.js`; se ve en el libro con el widget real de la rosa de los vientos):

| Generar | Descargar | Pérdida | La alimentan |
|---|---|---|---|
| +3 por cada acierto **mientras te mueves** (como mucho uno cada 0,15 s). Quieta no ganas | A 100: **Vendaval** 6 s: +25 % de velocidad de ataque y +1 flecha a Flecha Múltiple | **NUEVO (aprobado):** quieta más de 2 s, −10 por segundo. Al acabar el Vendaval vuelve a 0 | Disparo Rápido en movimiento, Flecha Múltiple, Andanada (los saltos cuentan como movimiento), Carrera del Viento |

**Árbol (generado):**

| Fila | Id | Nodo | Forma · tipo | Etiqueta | Rangos | Requiere | Qué hace (al máximo) | Cuál conviene |
|---|---|---|---|---|---|---|---|---|
| 0 | v0 | Impulso | ○ clave | mecánica | gratis | gratis | Cada acierto en movimiento te da 3 de Impulso. A 100: Vendaval 6 s, +25 % de velocidad de ataque y +1 flecha a Múltiple |  |
| 1 | v1 | Astiles Ligeros | ○ pasiva | número | 3 | v0 | Rango 3: Flecha Múltiple cuesta 16 de Energía (antes 22) |  |
| 1 | v2 | Vendaval Largo | ○ pasiva | número | 3 | v0 | Rango 3: El Vendaval dura 9 s (antes 6 s) |  |
| 1 | v3 | Aire Fresco | ○ pasiva | número | 3 | v0 | Rango 3: Carrera del Viento se recarga en 7 s (antes 10 s) |  |
| 2 | v4 | Puntas Templadas | ○ pasiva | número | 2 | v1 | Rango 2: Flecha Múltiple y tu disparo triple hacen +40 % de daño |  |
| 2 | v5 | Remate Triple | ○ pasiva | mecánica | 1 | v1 o v2 | Tras una Andanada, tu siguiente Disparo Rápido sale triple sin esperar al 3.º (una vez cada 4 s)<br>_híbrido: Abanico + Vaivén_ |  |
| 2 | v6 | Soltar y Disparar | ○ pasiva | mecánica | 1 | v2 o v3 | Al soltar o acabar Carrera del Viento disparas una Andanada gratis al 60 %, sin saltar<br>_híbrido: Vaivén + Galerna_ |  |
| 2 | v7 | Fondo de Corredora | ○ pasiva | mecánica | 2 | v3 | Rango 2: Carrera del Viento dura hasta 6 s (antes 4 s) y te hace inmune a las ralentizaciones |  |
| 3 | v8 | Triple: Abierto o Clavado | ⬡ elección | mecánica | 1 | v4 o v5 | **A · ○ Triple Abierto**: Tu disparo triple lanza 4 flechas extra (antes 2) en un abanico de 60° _(contra grupos)_<br>**B · ○ Triple Clavado**: Tu disparo triple es crítico seguro y hace +20 % de daño _(contra jefes)_ | A, contra grupos: el doble de flechas extra cada 3 disparos. B, contra jefes: un crítico seguro cada 3 disparos. Decide qué Abanico juegas |
| 3 | v9 | Andanada: Último Instante o Ida y Vuelta | ⬡ elección | mecánica | 1 | v5 o v6 | **A · ○ Último Instante**: Si relanzas Andanada en su último medio segundo, la segunda hace +40 % y te da 20 de Impulso _(contra jefes)_<br>**B · ○ Ida y Vuelta**: Puedes relanzar Andanada dos veces (antes una): atrás, adelante y atrás de nuevo; la tercera al 70 % _(contra grupos)_ | A, contra jefes: si aciertas el momento, +20 % de media y el Vendaval antes. B, contra grupos: barres tres sitios por uso. Decide qué Vaivén juegas |
| 3 | v10 | Carrera: Rueda o Blanco Fijo | ⬡ elección | mecánica | 1 | v6 o v7 | **A · ○ Rueda de Flechas**: Mientras corres con Carrera, cada segundo sueltas un anillo de 8 flechas a tu alrededor (40 % cada una) _(contra grupos)_<br>**B · ○ Blanco Fijo**: Si Carrera dispara al mismo enemigo, cada flecha seguida hace +10 % (hasta +60 %) _(contra jefes)_ | A, contra grupos que te persiguen. B, contra jefes: a los 2,4 s de carrera ya pega +60 %. Decide qué Galerna juegas |
| 4 | v11 | Mano Llena | ○ pasiva | número | 2 | v8 | Rango 2: Flecha Múltiple dispara 7 flechas (antes 5) |  |
| 4 | v12 | Salto Impulsivo | ○ pasiva | mecánica | 2 | v8 o v9 | Rango 2: Cada salto de Andanada te da 16 de Impulso |  |
| 4 | v13 | Saetas Afiladas | ○ pasiva | número | 2 | v9 o v10 | Rango 2: Carrera del Viento y Diluvio de Saetas hacen +30 % de daño |  |
| 4 | v14 | Vacío de Aire | ○ pasiva | mecánica | 1 | v10 | Al soltar o acabar Carrera del Viento, atraes 2 m a los enemigos a 5 m; a los jefes les llena 15 de Quebranto |  |
| 5 | v15 | Piel de Brisa o Retirada | ⬡ elección | mecánica | 1 | v11 o v12 | **A · ○ Piel de Brisa**: Durante el Vendaval recibes un 20 % menos de daño _(supervivencia)_<br>**B · ○ Retirada Instintiva**: Si te golpean cuerpo a cuerpo, saltas 4 m atrás y ganas 15 de Impulso. Una vez cada 8 s _(supervivencia)_ | A, contra grupos: el Vendaval está puesto casi la mitad del tiempo. B, contra élites cuerpo a cuerpo que te alcanzan |
| 5 | v16 | Viento en las Plumas | ○ pasiva | mecánica | 2 | v12 o v13 | Rango 2: Con 50 o más de Impulso: Múltiple y Andanada +20 %, y Carrera dispara un 30 % más rápido<br>_híbrido: Los tres estilos (por el Impulso)_ |  |
| 5 | v17 | Nube de Paso | ○ pasiva | mecánica | 2 | v13 o v14 | Rango 2: En los 6 primeros segundos de Carrera del Viento, cada segundo recarga 1 s del Diluvio de Saetas |  |
| 6 | v18 | Flechas Perdidas | ○ pasiva | mecánica | 2 | v15 | Rango 2: Si Flecha Múltiple mata, suelta 3 flechas hacia enemigos cercanos (50 % cada una) |  |
| 6 | v19 | Vendaval Encadenado | ○ pasiva | mecánica | 2 | v15 o v16 | Rango 2: Cada relanzamiento de Andanada alarga el Vendaval 1 s (hasta +4 s) |  |
| 6 | v20 | Pies Ligeros | ○ pasiva | número | 2 | v16 o v17 | Rango 2: Te mueves un 16 % más rápido |  |
| 6 | v21 | Nube Fiel | ○ pasiva | mecánica | 1 | v17 | En los 6 primeros segundos de Carrera del Viento, el Diluvio de Saetas descarga cada 0,4 s (antes 0,5 s) |  |
| 7 | v22 | Ráfaga Creciente | ○ pasiva | mecánica | 3 | v18 | Rango 3: Cada Flecha Múltiple a menos de 3 s de otra dispara 1 flecha más (hasta +4) |  |
| 7 | v23 | Golpe de Apertura | ○ pasiva | mecánica | 3 | v19 | Rango 3: Al empezar el Vendaval, tus 4 siguientes Andanadas o Flechas Múltiples son críticas seguras |  |
| 7 | v24 | Ciclones | ○ pasiva | mecánica | 3 | v21 | Rango 3: Mientras corres con Carrera, cada 1 s dejas un ciclón 4 s que dispara cada 0,5 s al más cercano (35 %; 3 vivos) |  |
| 8 | v25 | Tormenta de Plumas | ○ **FINAL** | mecánica | 3 | v22 | Rango 3: Cada 3.ª Flecha Múltiple sale además en círculo: 12 flechas más al 60 %<br>_final: Abanico_ |  |
| 8 | v26 | Vaivén Eterno | ○ **FINAL** | mecánica | 3 | v23 | Rango 3: Durante el Vendaval, al cerrar su ventana Andanada vuelve sin recarga y a mitad de coste (sin límite)<br>_final: Vaivén_ |  |
| 8 | v27 | Galerna Infinita | ○ **FINAL** | mecánica | 3 | v24 | Rango 3: Carrera del Viento dura lo que la mantengas; el tiempo extra gasta 10 de Energía por segundo y sube 3 cada segundo<br>_final: Galerna_ |  |
| 9 | v28 | Ojo del Huracán | ○ **ÁPICE** | mecánica | 4 | v25 o v26 o v27 | 1) El Vendaval también te da +20 % de velocidad de movimiento. 2) Matar a un élite te da 50 de Impulso. 3) El Vendaval salta a 80 de Impulso (antes 100). 4) Cada Vendaval recarga 4 s del Diluvio de Saetas. |  |

**Los tres arquetipos:**

| Arquetipo | Fantasía | Elección que lo define (fila 3) | Penúltimo → final | Mejor en |
|---|---|---|---|---|
| **Abanico** (A) | Cada vez más flechas: la tercera, la Múltiple seguida, las que sueltan las muertes | v8 **Triple Abierto** (grupos) o Triple Clavado (jefes) | Ráfaga Creciente → **Tormenta de Plumas** | Grupos |
| **Vaivén** (B) | Andanada atrás y adelante sin parar mientras dura el Vendaval | v9 **Último Instante** (jefes: tiempo justo) o Ida y Vuelta (grupos: tres saltos) | Golpe de Apertura → **Vaivén Eterno** | Jefes |
| **Galerna** (C) | Correr en círculo con la Carrera: anillos, ciclones y la nube detrás | v10 **Rueda de Flechas** (grupos) o Blanco Fijo (jefes) | Ciclones → **Galerna Infinita** | Grupos que persiguen, daño sostenido |

Híbridos: **Remate Triple** (Abanico + Vaivén: Andanada carga el disparo triple), **Soltar y Disparar** (Vaivén + Galerna: soltar la Carrera dispara una Andanada), **Viento en las Plumas** (los tres, por el Impulso) y **Pies Ligeros** (común). Ápice: **Ojo del Huracán** (sirve a los tres porque todos viven del Vendaval).

**Implementación (por nodo):** `v0` mecánica impulso · existe (+ pérdida quieta NUEVA) y pasiva Tercera Flecha: power t_tercera · NUEVO (`seq` del básico); `v1` mod flecha_multiple cost · existe; `v2` tv.galeT · NUEVO (clave); `v3` mod a_v_carrera cdr · claves; `v4` mod flecha_multiple dmg + rango de t_tercera · claves; `v5` power t_remate_triple · NUEVO (afterCast deja el contador de la secuencia en 2); `v6` power t_soltar · NUEVO (onRelease del canal + eco de Andanada ×0,6 sin salto); `v7` mod a_v_carrera channelT + slowImmune · claves; `v8` A: opción de t_tercera (4 flechas extra) · B: power t_triple_clavado · NUEVO; `v9` A: power t_ultimo_instante · NUEVO (lee la ventana de `recast`) · B: mod a_t_andanada recast.max +1 · clave NUEVA; `v10` A: power t_rueda · NUEVO (tic del canal) · B: power t_blanco_fijo · NUEVO (condAdd por objetivo); `v11` mod flecha_multiple proj · existe; `v12` power t_salto_impulsivo · NUEVO (sustituye a t_andanada_impulsiva); `v13` mod dmg · claves; `v14` power t_vacio_aire · NUEVO (onRelease: atraer + Quebranto); `v15` A: power t_piel_brisa · NUEVO (condDr con el Vendaval) · B: power t_retirada · NUEVO (④ onDamaged; lógica de a_t_salto); `v16` power t_viento_plumas · NUEVO (condAdd con gaugeValue); `v17` power t_nube_paso · NUEVO (solo los 6 primeros segundos de cada Carrera); `v18` power t_flechas_perdidas · NUEVO (onKill + fireProjectile); `v19` power t_vendaval_encadenado · NUEVO (sustituye a t_galechain); `v20` stats.spdPct · existe; `v21` power t_nube_fiel · NUEVO (ídem; la prórroga de Galerna Infinita no cuenta); `v22` power t_rafaga_creciente · NUEVO (modifyResolve proj con contador); `v23` power t_apertura · NUEVO (⑩ onGauge full + forceCrit); `v24` power t_ciclones · NUEVO (campo `t_ciclon` que dispara; 3 vivos como mucho); `v25` power t_tormenta_plumas · NUEVO; `v26` power t_vaiven · NUEVO (usos por Vendaval 1/2/∞, coste ×0,5); `v27` power t_galerna · NUEVO (prórroga de 2/4/∞ s; coste 10 + 3·t de Energía por segundo); `v28` power t_ojo_huracan (rangos) · NUEVO (sustituye a t_eyestorm).

### 7.1 Francotiradora (un objetivo · Concentración)

**Fantasía:** plantada, tensa la cuerda y suelta en el instante justo: un disparo, una baja. **Rol:** un objetivo (el de hoy; en 2e, el daño a jefes).

**Pasiva: Cuerda Tensa.** **Mantén Disparo Rápido** para tensarlo hasta 1 s: hasta **+60 %** (no atraviesa). Soltarlo en su último 0,2 s es **perfecto**: crítico seguro, **sin** el +50 % de las otras dos. Con Disparo Disperso, las 3 flechas se tensan juntas y el +60 % se reparte (+20 % cada una). El tensado del básico solo lo acelera la velocidad de ataque (no los nodos de tensado, la postura ni la Calma): tensar pega un poco más que pulsar y asegura el crítico, pero da menos Energía por segundo y te frena. Tocar sin mantener sigue siendo el Disparo Rápido de siempre (Energía rápida). Sin la Francotiradora, Disparo Rápido no se puede tensar. Es el verbo principal en la tecla que más se pulsa, igual que la Tercera Flecha de la Tiradora.

**Reglas del tensado (las tres habilidades que se tensan):** moverte mientras tensas va al 60 % de tu velocidad y gasta Concentración; **rodar cancela** el tensado (sin coste); soltar antes del mínimo (0,3 s) no dispara. **Soltado perfecto de Disparo Apuntado o de un haz = +50 % de daño y crítico seguro**, y da 15 de Concentración (una ganancia por segundo como mucho); el del básico, solo crítico y 3 de Concentración. La velocidad de tensado (Tensado Rápido, Cuerda Ligera, Serenidad, Rodilla en Tierra, Calma Absoluta) solo acelera a **Disparo Apuntado y los haces**, y la ventana se escala con ella. El premio del perfecto va al disparo, no a lo que deja (estela, estallido, saetas paralelas, rebote).

**Verbos de su kit (4):**

| Verbo | Dónde | Nodos que lo **modifican** |
|---|---|---|
| **Cargar y soltar con ventana dorada** (principal) | Disparo Apuntado (hasta 1,5 s), Cuerda Tensa (0,8 s), Tiro Celestial (0,8 s por haz) | f2 (premio), f3 (rapidez), f6 y f12 (**ventana más ancha**), f16, f24 (**carga instantánea**), f25 (a carga completa, un haz), f26 (el perfecto se repite) |
| **Plantada** | Concentración: se gana quieta y se pierde al moverte | f15A Quietud, f16 Serenidad, ápice f28; clase c6B |
| **Postura y movimiento lento** | Rodilla en Tierra: tensas más rápido y puedes moverte despacio sin perder la Concentración | f6, f7, f10, f13, f21, f24, f27 (**la postura no se acaba**) |
| **Marcar y aprovechar** | Tiro Rastreador abre un Punto Débil: el primer tensado contra él es perfecto | f5 (un perfecto que atraviesa marca), f9 (la marca salta o pega el doble), f12, f19, f23, f26 |

**Kit (libro; forja con Mejora a Nv+3 y variantes a Nv+6):**

| Habilidad | Ranura · Nv | Qué hace | Mejora | Variante I | Variante II |
|---|---|---|---|---|---|
| **Disparo Apuntado** (`a_t_apuntado`, pasa de talento a kit) | Insignia `3` · 10 | **Mantén para tensar** hasta 1,5 s y suelta: de **80 a 250 %** y atraviesa. Ventana dorada (1,15–1,35 s): +50 % y crítico. 30 de Energía, 4 s | **Tensado Rápido**: un 15 % más rápido (1,3 s) | **Tres Saetas** (área): a carga completa, 3 saetas en 20° que atraviesan (**40 %** cada una) | **Tiro Pesado** (un objetivo): tensas hasta 2,5 s, hasta **300 %**; no atraviesa |
| **Rodilla en Tierra** (`a_f_rodilla`, NUEVA) | Utilidad `2` · 12 | **Postura** 8 s: Disparo Apuntado y los haces se tensan un 40 % más rápido y moverte no gasta Concentración, pero vas un 50 % más lenta. Pulsa otra vez o rueda para levantarte. 14 s | **Rodilla Firme**: se tensan un 50 % más rápido | **Puesto Fijo** (un objetivo): no te mueves; Apuntado y los haces, el doble de rápido y +15 % | **Parapeto** (supervivencia): −30 % de daño recibido y la mitad de los proyectiles te fallan |
| **Tiro Rastreador** (`a_f_rastreador`, NUEVA) | Principal `DER/2` · 14 | Una flecha (140 %) que abre un **Punto Débil** 8 s: tu **primer** tensado contra él es perfecto y +30 % (**uno por enemigo cada 8 s**, aunque lo vuelvas a marcar; el de la Sombra Gemela marca, pero no da el perfecto). 20 de Energía | **Marca Duradera**: 12 s | **Rastreo Múltiple** (área): marca a 3 enemigos a 4 m; dura 6 s | **Grillete** (control): el marcado va un 50 % más lento; a un jefe, 20 de Quebranto |
| **Tiro Celestial** (`a_u_celeste`) | Definitiva `4` · 15 | Durante 8 s **tensas** hasta 3 haces celestes (0,8 s cada uno): **400 %** y atraviesan. Perfecto: +50 % y crítico. 50 s | **Cielo Abierto**: 10 s para dispararlos | **Lluvia Estelar** (área): cada haz cae del cielo donde apuntas, 4 m (**150 %**) | **Haz Único** (un objetivo): un solo haz de hasta 3 s: hasta **1000 %** |

**Barra de mecánica: Concentración** (ya existe en `spec-mechanics.js`; se ve en el libro con el widget real del juego):

| Generar | Descargar | Pérdida | La alimentan |
|---|---|---|---|
| Quieta: **+15 por segundo** (hoy +20). **NUEVO:** +15 por cada perfecto de Disparo Apuntado o de un haz y +3 por el del básico (una ganancia por segundo como mucho). Cada punto da +0,15 % de crítico (como hoy) | **NUEVO:** a 100, **Calma Absoluta** 5 s: es perfecto **todo tensado a media carga o más** y Apuntado y los haces se tensan un 50 % más rápido | Moverte: −25 por segundo (como hoy); **de rodillas, nada**. Al acabar la Calma vuelve a 0 y **no sube durante 7 s (Respiro)** | Disparo Rápido tensado (poco), Disparo Apuntado, Tiro Rastreador (el perfecto gratis), Rodilla en Tierra, Tiro Celestial |

**Árbol (generado):**

| Fila | Id | Nodo | Forma · tipo | Etiqueta | Rangos | Requiere | Qué hace (al máximo) | Cuál conviene |
|---|---|---|---|---|---|---|---|---|
| 0 | f0 | Mira Serena | ○ clave | mecánica | gratis | gratis | Quieta, +15 de Concentración por segundo; cada perfecto de Disparo Apuntado o de un haz, +15. A 100: Calma Absoluta 5 s |  |
| 1 | f1 | Punta de Barrena | ○ pasiva | número | 3 | f0 | Rango 3: Disparo Apuntado hace +30 % de daño y llega 6 m más lejos |  |
| 1 | f2 | Ojo Paciente | ○ pasiva | número | 3 | f0 | Rango 3: Un soltado perfecto de Disparo Apuntado o de un haz hace +65 % de daño (antes +50 %) |  |
| 1 | f3 | Cuerda Ligera | ○ pasiva | número | 3 | f0 | Rango 3: Disparo Apuntado y los haces de Tiro Celestial se tensan un 24 % más rápido |  |
| 2 | f4 | Sobrepenetración | ○ pasiva | mecánica | 2 | f1 | Rango 2: Disparo Apuntado hace +20 % más por cada enemigo que ya atravesó (hasta 4) |  |
| 2 | f5 | Línea de Mira | ○ pasiva | mecánica | 1 | f1 o f2 | Un soltado perfecto que atraviesa deja un Punto Débil de 4 s en cada enemigo que toca<br>_híbrido: Perforación + Punto Débil_ |  |
| 2 | f6 | Pulso Quieto | ○ pasiva | mecánica | 1 | f2 o f3 | En Rodilla en Tierra, la ventana dorada de tus disparos tensados es un 50 % más ancha<br>_híbrido: Punto Débil + Vigía_ |  |
| 2 | f7 | Guardia Larga | ○ pasiva | número | 2 | f3 | Rango 2: Rodilla en Tierra dura 12 s (antes 8 s) |  |
| 3 | f8 | Saeta: Estela o Doble Impacto | ⬡ elección | mecánica | 1 | f4 o f5 | **A · ○ Estela Explosiva**: Un soltado perfecto de Disparo Apuntado deja su línea cargada: estalla a los 0,5 s (30 %) _(contra grupos)_<br>**B · ○ Doble Impacto**: Si Disparo Apuntado no atraviesa a nadie más, rebota en el blanco y lo golpea otra vez al 30 % _(contra jefes)_ | A, contra grupos en fila: cada soltado perfecto barre la línea dos veces. B, contra jefes solos: un 30 % más si no hay nadie detrás. Decide qué Perforación juegas |
| 3 | f9 | Marca: Saltarina o Vital | ⬡ elección | mecánica | 1 | f5 o f6 | **A · ○ Marca Saltarina**: Si el marcado muere, el Punto Débil salta al enemigo más cercano con el tiempo que le quedaba _(contra grupos)_<br>**B · ○ Punto Vital**: Contra tu Punto Débil, el soltado perfecto hace +35 % más y le llena 15 de Quebranto _(contra jefes)_ | A, contra grupos de élites: la marca no se pierde al matar. B, contra jefes: más premio y Quebranto. Decide qué Punto Débil juegas |
| 3 | f10 | Vigía: Salva o Paciencia | ⬡ elección | mecánica | 1 | f6 o f7 | **A · ○ Salva de Vigía**: En Rodilla en Tierra, cada soltado a carga completa dispara 2 saetas más a enemigos cercanos (40 % cada una) _(contra grupos)_<br>**B · ○ Paciencia de Vigía**: En Rodilla en Tierra, cada disparo tensado seguido al mismo enemigo hace +10 % (hasta +50 %) _(contra jefes)_ | A, contra grupos que se acercan. B, contra jefes: +50 % desde el 5.º disparo seguido. Decide qué Vigía juegas |
| 4 | f11 | Fila Rota | ○ pasiva | mecánica | 2 | f8 | Rango 2: Cada enemigo que mata Disparo Apuntado te devuelve 8 de Energía y 10 de Concentración |  |
| 4 | f12 | Lectura del Blanco | ○ pasiva | mecánica | 2 | f8 o f9 | Rango 2: Contra tu Punto Débil, la ventana dorada dura un 50 % más |  |
| 4 | f13 | Puntería de Vigía | ○ pasiva | número | 2 | f9 o f10 | Rango 2: En Rodilla en Tierra, tus disparos tensados hacen +30 % de daño |  |
| 4 | f14 | Estrella Fija | ○ pasiva | mecánica | 1 | f10 | Cada soltado perfecto de Disparo Apuntado recarga 1,5 s de Tiro Celestial |  |
| 5 | f15 | Quietud o Nervios | ⬡ elección | mecánica | 1 | f11 o f12 | **A · ○ Quietud**: Quieta más de 1 s, recibes un 15 % menos de daño _(supervivencia)_<br>**B · ○ Nervios de Acero**: Si te golpean mientras tensas, ganas un escudo del 8 % de tu vida. Una vez cada 6 s _(supervivencia)_ | A, contra grupos que disparan de lejos, si sabes quedarte quieta. B, contra élites cuerpo a cuerpo que te golpean mientras tensas |
| 5 | f16 | Serenidad | ○ pasiva | mecánica | 2 | f12 o f13 | Rango 2: Con 50 o más de Concentración, Disparo Apuntado y los haces se tensan un 20 % más rápido y hacen +20 %<br>_híbrido: Los tres estilos (por la Concentración)_ |  |
| 5 | f17 | Haces Gemelos | ○ pasiva | mecánica | 2 | f13 o f14 | Rango 2: Cada haz de Tiro Celestial dispara otro detrás, al 30 % |  |
| 6 | f18 | Rebote Certero | ○ pasiva | mecánica | 2 | f15 | Rango 2: Disparo Apuntado rebota en el primer muro y vuelve por su línea al 20 % |  |
| 6 | f19 | Herida Expuesta | ○ pasiva | mecánica | 2 | f15 o f16 | Rango 2: Mientras tiene tu Punto Débil, el enemigo recibe +12 % de daño de todo el grupo |  |
| 6 | f20 | Vista Larga | ○ pasiva | número | 2 | f16 o f17 | Rango 2: Tus disparos tensados alcanzan 4 m más y hacen +12 % a más de 10 m |  |
| 6 | f21 | Firmamento | ○ pasiva | mecánica | 1 | f17 | En Rodilla en Tierra, Tiro Celestial se recarga un 50 % más rápido |  |
| 7 | f22 | Saetas Paralelas | ○ pasiva | mecánica | 3 | f18 | Rango 3: Cada soltado perfecto de Disparo Apuntado suelta 3 saetas más en paralelo, a 1 m (20 %) |  |
| 7 | f23 | Herida sobre Herida | ○ pasiva | mecánica | 3 | f19 | Rango 3: Cada soltado perfecto a tu Punto Débil le deja una Herida (hasta 5): tus tensados le hacen +6 % por cada una |  |
| 7 | f24 | Ojo Entrenado | ○ pasiva | mecánica | 3 | f21 | Rango 3: Cada 4 s en Rodilla en Tierra, tu siguiente Disparo Apuntado sale al instante y a carga completa |  |
| 8 | f25 | Línea Mortal | ○ **FINAL** | mecánica | 3 | f22 | Rango 3: A carga completa, Disparo Apuntado (o su saeta central) es un haz de 30 m que estalla en toda su línea (20 %)<br>_final: Perforación_ |  |
| 8 | f26 | Disparo Imposible | ○ **FINAL** | mecánica | 3 | f23 | Rango 3: Un soltado perfecto de Disparo Apuntado a tu Punto Débil sale dos veces: la 2.ª al 50 %, crítica y con 20 de Quebranto<br>_final: Punto Débil_ |  |
| 8 | f27 | Atalaya Eterna | ○ **FINAL** | mecánica | 3 | f24 | Rango 3: Rodilla en Tierra dura hasta que te levantes; cada 5 s en ella, un haz celeste gratis (200 %)<br>_final: Vigía_ |  |
| 9 | f28 | Ojo Inmóvil | ○ **ÁPICE** | mecánica | 4 | f25 o f26 o f27 | 1) La Calma Absoluta dura 8 s (antes 5 s). 2) Matar a un élite te da 50 de Concentración. 3) La Calma Absoluta salta a 80 de Concentración (antes 100). 4) Cada Calma Absoluta recarga 5 s de Tiro Celestial. |  |

**Los tres arquetipos:**

| Arquetipo | Fantasía | Elección que lo define (fila 3) | Penúltimo → final | Mejor en |
|---|---|---|---|---|
| **Perforación** (A) | Una saeta que atraviesa la fila entera, rebota y estalla en toda su línea | f8 **Estela Explosiva** (grupos) o Doble Impacto (jefes) | Saetas Paralelas → **Línea Mortal** | Grupos en fila, pasillos |
| **Punto Débil** (B) | Marcar al jefe, leerlo y meterle soltados perfectos que se repiten | f9 Marca Saltarina (grupos de élites) o **Punto Vital** (jefes) | Herida sobre Herida → **Disparo Imposible** | Jefes |
| **Vigía** (C) | De rodillas sin moverse: tensados instantáneos y haces celestes que caen solos | f10 **Salva de Vigía** (grupos) o Paciencia de Vigía (jefes) | Ojo Entrenado → **Atalaya Eterna** | Daño sostenido; peleas largas en un sitio |

Híbridos: **Línea de Mira** (Perforación + Punto Débil: un perfecto que atraviesa marca a todos), **Pulso Quieto** (Punto Débil + Vigía: de rodillas, la ventana es un 50 % más ancha), **Serenidad** (los tres, por la Concentración) y **Vista Larga** (común). Ápice: **Ojo Inmóvil** (sirve a los tres porque todos viven de la Calma Absoluta).

**Implementación (por nodo):** `f0` mecánica concentracion · existe (gainPerSec 20 → 15; perfectGain 15/3 con una ganancia por segundo, Calma Absoluta y Respiro de 7 s NUEVOS) y pasiva Cuerda Tensa: tipo `charge` en a_disparo · NUEVO; `f1` mod a_t_apuntado dmg + range · claves; `f2` tv.perfectMul · NUEVO (clave del tipo `charge`); `f3` tv.chargeSpeed · NUEVO; `f4` power f_sobrepenetracion · NUEVO (sustituye a f_overpen); `f5` power f_linea_mira · NUEVO (onHit si cast.perfect: marca 4 s); `f6` power f_pulso_quieto · NUEVO (charge.perfect ×1,5 con la postura); `f7` mod a_f_rodilla dur · claves; `f8` A: power f_estela · NUEVO (campo en línea con retardo) · B: power f_doble_impacto · NUEVO; `f9` A: power f_marca_saltarina · NUEVO (onKill) · B: power f_punto_vital · NUEVO (condAdd + addStagger); `f10` A: power f_salva · NUEVO · B: power f_paciencia · NUEVO (sustituye a f_patience); `f11` power f_fila_rota · NUEVO (onKill); `f12` power f_lectura · NUEVO; `f13` power f_punteria_vigia · NUEVO (condAdd con la postura); `f14` power f_estrella_fija · NUEVO (solo los perfectos de Disparo Apuntado); `f15` A: tv.drStill · NUEVO (espejo de drMoving) · B: power f_nervios · NUEVO (④ onDamaged + g.shield); `f16` power f_serenidad · NUEVO (condAdd con gaugeValue); `f17` power f_haces_gemelos · NUEVO (eco del haz); `f18` power f_rebote · NUEVO; `f19` power f_herida_expuesta · NUEVO (applyWeakness mientras dura la marca); `f20` mod range + condAdd por distancia · claves; `f21` power f_firmamento · NUEVO; `f22` power f_paralelas · NUEVO; `f23` power f_heridas · NUEVO (stacks por objetivo); `f24` power f_ojo_entrenado · NUEVO (charge.instant); `f25` power f_linea_mortal · NUEVO; `f26` power f_disparo_imposible · NUEVO (sustituye a f_impossible; solo Disparo Apuntado, un doble por segundo como mucho, la 2.ª no da Herida ni Concentración); `f27` power f_atalaya · NUEVO (postura de 20/30/∞ s + un haz de a_u_celeste ×0,5 cada 5 s); `f28` power f_ojo_inmovil (rangos) · NUEVO (sustituye a f_weakspot).

### 7.2 Montaraz (control · Coto de Caza)

**Fantasía:** prepara el terreno. Coloca cepos, la presa camina hacia ellos, salta sobre uno y hace estallar el resto. **Rol:** control (el de hoy; en 2e, el control de grupo y el Quebranto de los jefes).

**Pasiva nueva: Cebo de Caza** (sustituye al +25 % de Quebranto, que repetía la del Crionte). Tus trampas armadas atraen: los enemigos normales a 6 m caminan hacia ellas; los élites, a 3 m; los jefes, no. Es el verbo **atraer** al servicio del principal: colocar el terreno y que la presa lo pise.

**Verbos de su kit (5):**

| Verbo | Dónde | Nodos que lo **modifican** |
|---|---|---|
| **Colocar y detonar** (principal) | Trampa de Cepo (hasta 3, se arman en 0,5 s); Flecha Detonante las hace estallar; Batida si estallan 3 a la vez | m8A (**tres cepos por carga**), m11, m18, m22 (la flecha **siembra** cepos), m24, m25 (cada estallido siembra), m26 (**las trampas saltan** alrededor de la Presa) |
| **Atraer y arrastrar** | Cebo de Caza; Flecha de Garfio (variante II) | m26; ápice 1 (las trampas ralentizan a 3 m) |
| **Movimiento rápido a tu terreno** | Salto de Acecho: saltas a tu trampa y estalla al llegar | m18 (recarga el salto), forja (Acecho Enredador, Doble Acecho) |
| **Zonas fijas** | Cerco de Zarzas (donde apuntas) y los zarzales | m6, m14, m17, m21, m24, m27 (**tres zarzales forman un Cerco**) |
| **Marca de Presa** | Presa: el primer élite o jefe que golpeas, 15 s | m2, m5, m9 (varias Presas o Presa Herida), m12, m19, m23 |

**Kit (libro; forja con Mejora a Nv+3 y variantes a Nv+6):**

| Habilidad | Ranura · Nv | Qué hace | Mejora | Variante I | Variante II |
|---|---|---|---|---|---|
| **Trampa de Cepo** (`a_t_cepo`, pasa de talento a kit) | Insignia `3` · 10 | **Colocas** un cepo (hasta 3; se arma en 0,5 s): inmoviliza 2 s y envenena (60 % en 5 s). A un jefe lo ralentiza y le llena Quebranto. 2 cargas, 8 s; 10 de Energía | **Muelles Firmes**: se arma en 0,2 s | **Mina de Espinas** (área): no inmoviliza; al pisarla estalla en 3 m (**100 %**) | **Red de Caza** (control): lanza una red de 3 m que inmoviliza 2,5 s (absorbe a Red de Caza) |
| **Salto de Acecho** (`a_m_acecho`, NUEVA) | Movilidad `1` · 12 | Saltas a tu trampa más cercana al cursor (hasta 15 m) y **la haces estallar** al llegar (**100 %**). Sin trampas, 6 m. 10 s (con Rearme Rápido, nunca menos de 5 s) | **Acecho Lejano**: 20 m | **Acecho Enredador** (control): no la gastas; inmovilizas 1,5 s a 3 m | **Doble Acecho** (movilidad): 2 cargas; el estallido, −30 % |
| **Flecha Detonante** (`a_m_detonante`, NUEVA) | Principal `DER/2` · 14 | Una flecha que estalla en 3 m (**80 %**) y **hace estallar** las trampas tuyas que alcanza (**100 %** cada una; **como mucho 2 estallidos por enemigo y detonación**). 24 de Energía | **Pólvora Fina**: 4 m | **Detonación en Cadena** (área): cada trampa que estalla hace estallar las tuyas a 6 m | **Flecha de Garfio** (control): no estalla; arrastra 6 m al enemigo hacia tu trampa más cercana (absorbe al Arpón) |
| **Cerco de Zarzas** (`a_u_zarzas`) | Definitiva `4` · 15 | Anillo de zarzas de 7 m **donde apuntas**, 8 s: cruzarlo inmoviliza 1,5 s; dentro, veneno (100 % por segundo); **al cerrarse estalla (300 %)**. **45 s** (antes 55 s) | **Espinas Duraderas**: 10 s | **Jaula de Espinas** (un objetivo): 3 m alrededor de uno; no sale y el veneno hace +60 % | **Señuelo de Zarzas** (supervivencia): un señuelo atrae 6 s a los enemigos a 10 m (absorbe al Señuelo de Paja) |

**Barra de mecánica: Coto de Caza** (ya existe en `spec-mechanics.js`: trampas armadas y Presa):

| Generar | Descargar | Pérdida | La alimentan |
|---|---|---|---|
| Cada trampa armada suma 1 (hasta 3, como hoy; los 3 cepos de un Racimo cuentan como una). **Presa:** el primer élite o jefe que golpeas, 15 s (como hoy) | **NUEVO:** si estallan 3 trampas a la vez (en 1 s), **Batida**: los alcanzados y tu Presa reciben **+15 %** de daño de todo el grupo 6 s; **una Batida cada 12 s** como mucho | Una trampa sin pisar se desarma a los 30 s. La Presa se pierde a los 15 s sin golpearla | Trampa de Cepo, Flecha Detonante (detona), Salto de Acecho (detona), Cerco de Zarzas |

**Árbol (generado):**

| Fila | Id | Nodo | Forma · tipo | Etiqueta | Rangos | Requiere | Qué hace (al máximo) | Cuál conviene |
|---|---|---|---|---|---|---|---|---|
| 0 | m0 | Coto de Caza | ○ clave | mecánica | gratis | gratis | Cada trampa armada suma 1 al Coto (hasta 3). Si estallan 3 a la vez, Batida: +15 % de daño recibido 6 s (cada 12 s) |  |
| 1 | m1 | Muelles Ligeros | ○ pasiva | número | 3 | m0 | Rango 3: Trampa de Cepo recupera una carga en 5 s (antes 8 s) |  |
| 1 | m2 | Olfato de Presa | ○ pasiva | número | 3 | m0 | Rango 3: Haces +12 % de daño a tu Presa |  |
| 1 | m3 | Raíz Rápida | ○ pasiva | número | 3 | m0 | Rango 3: Cerco de Zarzas se recarga en 36 s (antes 45 s) |  |
| 2 | m4 | Pólvora Negra | ○ pasiva | número | 2 | m1 | Rango 2: Tus trampas y Flecha Detonante hacen +30 % de daño |  |
| 2 | m5 | Presa Atrapada | ○ pasiva | mecánica | 1 | m1 o m2 | Una trampa que atrapa a tu Presa estalla también (60 %) y te devuelve una carga de Trampa de Cepo<br>_híbrido: Campo Minado + Presa_ |  |
| 2 | m6 | Cerco a la Presa | ○ pasiva | mecánica | 1 | m2 o m3 | Flecha Detonante sobre tu Presa le deja debajo un zarzal de 2 m 4 s que la ralentiza un 40 %<br>_híbrido: Presa + Zarzal_ |  |
| 2 | m7 | Raíces Profundas | ○ pasiva | número | 2 | m3 | Rango 2: Cruzar el Cerco de Zarzas inmoviliza 2,5 s (antes 1,5 s) |  |
| 3 | m8 | Cepo: Racimo o Reforzado | ⬡ elección | mecánica | 1 | m4 o m5 | **A · ○ Racimo de Cepos**: Trampa de Cepo coloca 3 cepos en triángulo (35 % cada uno); en el Coto cuentan como una trampa _(contra grupos)_<br>**B · ○ Cepo Reforzado**: Si atrapa a un élite o a un jefe, el cepo estalla 3 veces (30 % cada una) _(contra jefes)_ | A, contra grupos: tres cepos por carga para cubrir el suelo. B, contra jefes: cada cepo pega tres veces. Decide qué Campo Minado juegas |
| 3 | m9 | Presa: Manada o Herida | ⬡ elección | mecánica | 1 | m5 o m6 | **A · ○ Presas en Manada**: Tienes hasta 3 Presas: tu primer élite y los 2 primeros enemigos que pisen una trampa _(contra grupos)_<br>**B · ○ Presa Herida**: Tu Presa recibe +10 % de daño de todo el grupo y cada trampa que pisa le llena 25 de Quebranto _(contra jefes)_ | A, contra grupos con varios élites. B, contra jefes: +10 % para todo el grupo y Quebranto. Decide qué Presa juegas |
| 3 | m10 | Zarzal: Creciente o Asfixiante | ⬡ elección | mecánica | 1 | m6 o m7 | **A · ○ Zarzal Creciente**: Cerco de Zarzas crece 1 m por segundo (hasta 12 m) y atrapa a los que alcanza _(contra grupos)_<br>**B · ○ Zarzal Asfixiante**: Dentro del Cerco, el veneno al enemigo con más vida sube un 15 % cada segundo (hasta +90 %) _(contra jefes)_ | A, contra grupos que llegan desde lejos. B, contra jefes que se quedan dentro. Decide qué Zarzal juegas |
| 4 | m11 | Metralla | ○ pasiva | mecánica | 2 | m8 | Rango 2: Cada cepo de Trampa de Cepo que estalla suelta 4 púas a enemigos cercanos (20 % cada una) |  |
| 4 | m12 | Acoso | ○ pasiva | mecánica | 2 | m8 o m9 | Rango 2: Cada trampa que pisa tu Presa le llena 30 de Quebranto (si es un élite, la ralentiza un 30 % 3 s) |  |
| 4 | m13 | Espino Venenoso | ○ pasiva | número | 2 | m9 o m10 | Rango 2: El veneno de tus zarzas y de tus cepos hace +30 % |  |
| 4 | m14 | Semillas de Zarza | ○ pasiva | mecánica | 1 | m10 | Flecha Detonante deja un zarzal de 2 m durante 4 s donde estalla: ralentiza un 40 % |  |
| 5 | m15 | Huida o Guarida | ⬡ elección | mecánica | 1 | m11 o m12 | **A · ○ Cepo de Huida**: Al bajar del 50 % de vida, sueltas a tus pies un cepo gratis que inmoviliza 3 s a todos a 4 m. Una vez cada 30 s _(supervivencia)_<br>**B · ○ Guarida**: A 4 m de tus trampas armadas, recibes un 15 % menos de daño _(supervivencia)_ | A, contra grupos cuerpo a cuerpo que te alcanzan. B, para pelear junto a tus trampas sin moverte |
| 5 | m16 | Coto Cerrado | ○ pasiva | mecánica | 2 | m12 o m13 | Rango 2: Con 2 o más trampas armadas, haces +12 % de daño y tus zarzales duran 2 s más<br>_híbrido: Los tres estilos (por el Coto)_ |  |
| 5 | m17 | Zarzas Trepadoras | ○ pasiva | mecánica | 2 | m13 o m14 | Rango 2: Cada enemigo que inmoviliza el Cerco de Zarzas lo alarga 1 s (hasta +4 s) |  |
| 6 | m18 | Rearme Rápido | ○ pasiva | mecánica | 2 | m15 | Rango 2: Cada detonación que hace estallar un cepo tuyo recarga 2 s del Cepo y del Salto de Acecho (este no baja de 5 s) |  |
| 6 | m19 | Rastro Fresco | ○ pasiva | mecánica | 2 | m15 o m16 | Rango 2: Al morir tu Presa, el enemigo más fuerte a 10 m pasa a ser tu Presa y ganas 20 de Energía |  |
| 6 | m20 | Ojo de Trampera | ○ pasiva | número | 2 | m16 o m17 | Rango 2: Tus trampas y zarzales duran un 50 % más |  |
| 6 | m21 | Rebrote | ○ pasiva | mecánica | 1 | m17 | Al acabarse, el Cerco de Zarzas deja 3 zarzales de 2 m durante 6 s que ralentizan un 40 % |  |
| 7 | m22 | Campo Sembrado | ○ pasiva | mecánica | 3 | m18 | Rango 3: Flecha Detonante deja 3 cepos armados donde cae (al 35 %; no gasta cargas) |  |
| 7 | m23 | Batida Mayor | ○ pasiva | mecánica | 3 | m19 | Rango 3: La Batida dura 9 s (antes 6 s) y a tu Presa le llena 30 de Quebranto |  |
| 7 | m24 | Siembra de Espinas | ○ pasiva | mecánica | 3 | m21 | Rango 3: Cada cepo que atrapa o estalla deja un zarzal de 2 m durante 8 s que ralentiza un 40 % |  |
| 8 | m25 | Tierra Arrasada | ○ **FINAL** | mecánica | 3 | m22 | Rango 3: Cada cepo de Trampa de Cepo que estalla siembra 3 cepos pequeños a 3 m (30 %; esos no siembran; hasta 6)<br>_final: Campo Minado_ |  |
| 8 | m26 | Gran Cacería | ○ **FINAL** | mecánica | 3 | m23 | Rango 3: Si tu Presa pisa una trampa, todas tus trampas saltan a su alrededor y se rearman (una vez cada 6 s)<br>_final: Presa_ |  |
| 8 | m27 | Bosque Vivo | ○ **FINAL** | mecánica | 3 | m24 | Rango 3: Si 3 zarzales tuyos se tocan, forman un Cerco de Zarzas gratis de 4 s (una vez cada 8 s)<br>_final: Zarzal_ |  |
| 9 | m28 | Corazón del Bosque | ○ **ÁPICE** | mecánica | 4 | m25 o m26 o m27 | 1) Tus trampas armadas ralentizan un 30 % a 3 m. 2) Matar a un élite coloca un cepo gratis donde cae. 3) La Batida salta con 2 trampas (antes 3). 4) Cada 12 trampas que estallan, Cerco de Zarzas se lanza solo y gratis. |  |

**Los tres arquetipos:**

| Arquetipo | Fantasía | Elección que lo define (fila 3) | Penúltimo → final | Mejor en |
|---|---|---|---|---|
| **Campo Minado** (A) | Un suelo lleno de cepos que estallan en cadena y se siembran solos | m8 **Racimo de Cepos** (grupos) o Cepo Reforzado (jefes) | Campo Sembrado → **Tierra Arrasada** | Grupos (daño y control) |
| **Presa** (B) | Cazar a un solo enemigo: sus trampas, su Quebranto y una Batida enorme | m9 Presas en Manada (grupos) o **Presa Herida** (jefes) | Batida Mayor → **Gran Cacería** | Jefes (Quebranto y Debilidad para el grupo) |
| **Zarzal** (C) | Zarzales fijos que se juntan y forman Cercos gratis | m10 **Zarzal Creciente** (grupos) o Zarzal Asfixiante (jefes) | Siembra de Espinas → **Bosque Vivo** | Control constante |

Híbridos: **Presa Atrapada** (Campo Minado + Presa: la trampa que atrapa a la Presa estalla y devuelve una carga), **Cerco a la Presa** (Presa + Zarzal: un zarzal bajo la Presa), **Coto Cerrado** (los tres, por el Coto) y **Ojo de Trampera** (común). Ápice: **Corazón del Bosque** (sirve a los tres porque todos viven de la Batida y del Coto).

**Implementación (por nodo):** `m0` mecánica coto · existe (+ Batida NUEVA) y pasiva Cebo de Caza: power m_cebo · NUEVO (sustituye a `innate:{ staggerPct:25 }`); `m1` mod a_t_cepo cdr · existe; `m2` tv.preyDmg · existe; `m3` mod a_u_zarzas cdr · claves; `m4` mod dmg · claves; `m5` power m_presa_atrapada · NUEVO; `m6` power m_cerco_presa · NUEVO (campo `m_zarzal`); `m7` mod a_u_zarzas crossRoot · claves; `m8` A: power m_racimo · NUEVO · B: power m_cepo_reforzado · NUEVO; `m9` A: power m_manada · NUEVO (coto.preyMax 3) · B: power m_presa_herida · NUEVO (applyWeakness + addStagger); `m10` A: power m_creciente · NUEVO · B: power m_asfixiante · NUEVO; `m11` power m_metralla · NUEVO (solo los cepos de Trampa de Cepo); `m12` power m_acoso · NUEVO (Quebranto a la Presa; ralentiza a un élite; ya no da Debilidad); `m13` tv.poisonPct · existe; `m14` power m_semillas · NUEVO; `m15` A: power m_cepo_huida · NUEVO (④ onDamaged) · B: power m_guarida · NUEVO (condDr); `m16` power m_coto_cerrado · NUEVO (condAdd con gaugeValue); `m17` power m_trepadoras · NUEVO; `m18` power m_rearme · NUEVO (por detonación, no por trampa: recarga cepo y salto; el salto no baja de 5 s); `m19` power m_rastro · NUEVO (onKill); `m20` tv.fieldDur · claves; `m21` power m_rebrote · NUEVO; `m22` power m_campo_sembrado · NUEVO; `m23` tv.batidaDur + tv.batidaPreyStagger · NUEVO (claves de la mecánica coto; ya no sube la Debilidad); `m24` power m_siembra · NUEVO; `m25` power m_tierra_arrasada · NUEVO (solo siembran los cepos de carga; 6 pequeños como mucho); `m26` power m_gran_caceria · NUEVO (sustituye a m_greathunt); `m27` power m_bosque_vivo · NUEVO (eco de a_u_zarzas de 4 s); `m28` power m_corazon_bosque (rangos) · NUEVO (sustituye a m_thornweb).

### 7.3 Las tres especializaciones, juntas

| | Tiradora Veloz | Francotiradora | Montaraz |
|---|---|---|---|
| Rol | Daño en área | Un objetivo | Control |
| Mecánica | Impulso (0–100) | Concentración (0–100) | Coto de Caza (0–3 trampas + Presa) |
| Descarga | Vendaval | Calma Absoluta | Batida |
| Pasiva | Tercera Flecha (secuencia en el básico) | Cuerda Tensa (el básico se tensa) | Cebo de Caza (las trampas atraen) |
| Verbo principal | **Moverse disparando** | **Cargar y soltar, plantada** | **Colocar y detonar** |
| Arquetipos (A · B · C) | Abanico · Vaivén · Galerna | Perforación · Punto Débil · Vigía | Campo Minado · Presa · Zarzal |
| Finales | Tormenta de Plumas · Vaivén Eterno · Galerna Infinita | Línea Mortal · Disparo Imposible · Atalaya Eterna | Tierra Arrasada · Gran Cacería · Bosque Vivo |
| Ápice | Ojo del Huracán | Ojo Inmóvil | Corazón del Bosque |
| Árboles héroe | Errante del Viento · Carcaj Encantado | Errante del Viento · Halconera | Carcaj Encantado · Halconera |
| Híbrida | Viento Cruzado | Pulso de Hierro | Espinas de Caza |

---

## 8. Builds a Nv100 (12: cuatro por especialización, una híbrida en cada una)

Validadas **comprando punto a punto en el orden de la build** (cada punto al primer nodo comprable de la lista), con el mismo algoritmo del validador. Están en el mockup (**Configuración** y **Recomendado**). Los puntos de cada build van solo a habilidades de **su barra** (G8b; lo comprueba `check-e2fix.mjs`, §14.2). Las comparaciones salen del **modelo absoluto de §12.1** (%WD/s con los supuestos escritos), no de metas; se calibran en E3. Recomendadas: Tiradora «Tormenta de Plumas», Francotiradora «Disparo Imposible», Montaraz «Bosque Vivo».

### 8.1 «Tormenta de Plumas» (Abanico) · Paragon Carcaj Encantado

- **Clase (34/34):** Carcaj Profundo 2 · Pulso Firme 2 · Flecha Saqueadora (B) 1 · A Bocajarro (A) 1 · Flecha Roma (A) 1 · Ojo de Halcón 2 · Difícil de Alcanzar 2 · Respiración Pausada 2 · Instinto de Supervivencia (B) 1 · Barrido de Caza (B) 1 · Tiro desde la Niebla 1 · Recarga en Marcha 2 · Huida Desesperada (B) 1 · Piernas de Corredora 1 · Bomba Rápida 3 · Calma Letal (B) 1 · Humo Denso 2 · Compás 3 · Danza del Arco 3 · Cadencia 2
- **Tiradora Veloz (31/31):** Impulso (gratis) · Astiles Ligeros 3 · Puntas Templadas 2 · Remate Triple 1 · Triple Abierto (A) 1 · Mano Llena 2 · Piel de Brisa (A) 1 · Flechas Perdidas 2 · Ráfaga Creciente 3 · Tormenta de Plumas 3 · Ojo del Huracán 4 · Vendaval Largo 3 · Ida y Vuelta (B) 1 · Salto Impulsivo 2 · Viento en las Plumas 2 · Aire Fresco 1
- **Paragon:** Carcaj Encantado: Puntas Encantadas (gratis) · Punta Repartida (B) · Trampa Encantada · Hielo Hondo · Fuego Prendido · Puntas Afines · Chispa Saltarina (A) · Punta Viva · Lluvia Encantada · Punta Curativa (B) · Encantamiento Rápido

**Barra:** `IZQ` Disparo Rápido (Disparo Disperso) · `DER` Flecha Múltiple (Abanico Abierto) · `1` Carrera del Viento · `2` Bomba de Humo · `3` Andanada (Repulsora) · `4` Diluvio de Saetas.

**Rotación.** Kitea en círculo alrededor de la manada: Disparo Rápido con Disparo Disperso y, cada 3.º, el disparo triple con 7 flechas (3 + 4 de Triple Abierto). Flecha Múltiple en cuanto haya Energía: cada una a menos de 3 s de otra suma flechas (**Ráfaga Creciente**, hasta +4) y la 3.ª sale además en círculo (**Tormenta de Plumas**). Las muertes sueltan flechas (Flechas Perdidas). Al alternar básica y principal juntas Compases: con 5, Múltiple gratis, crítica y +60 % (**Danza del Arco**). Andanada (Ida y Vuelta) cuando te alcanzan; el Diluvio al empezar; la Carrera para recolocarte, que además llena el Impulso. Con Vendaval, +1 flecha a la Múltiple y Piel de Brisa. **Paragon:** con **Punta Repartida**, las flechas de la Múltiple llevan la punta encantada al 30 % (una por enemigo y segundo); Trampa Encantada la pone también en el Diluvio. **Modelo (§12.1):** la mejor contra grupos de toda la clase (2646 %WD/s); contra un jefe, 0,62 de Vaivén Eterno.
**Hitos:** Tormenta de Plumas al Nv60, ápice completo al Nv68, final de clase **Danza del Arco al Nv69**.

### 8.2 «Viento Cruzado» (híbrida Abanico + Vaivén, sin final) · Paragon Errante del Viento

- **Clase (34/34):** Pulso Firme 2 · Paso de Gacela 2 · A Bocajarro (A) 1 · Paso Limpio 1 · Flecha Silbante (B) 1 · Paso de Abrojos (A) 1 · Agilidad (A) 1 · Lluvia en Retirada 1 · Cadencia 2 · Puntería Fija (A) 1 · Difícil de Alcanzar 2 · Respiración Pausada 2 · Ojo de Halcón 2 · Presión Constante (A) 1 · Piernas de Corredora 1 · Recarga en Marcha 2 · Carcaj Profundo 2 · Tras la Rodada 3 · Sombra Gemela 3 · Instinto de Supervivencia (B) 1 · Calma Letal (B) 1 · Compás 1
- **Tiradora Veloz (31/31):** Impulso (gratis) · Astiles Ligeros 3 · Vendaval Largo 3 · Puntas Templadas 2 · Remate Triple 1 · Triple Abierto (A) 1 · Último Instante (A) 1 · Mano Llena 2 · Salto Impulsivo 2 · Retirada Instintiva (B) 1 · Viento en las Plumas 2 · Flechas Perdidas 2 · Vendaval Encadenado 2 · Ráfaga Creciente 3 · Golpe de Apertura 3 · Saetas Afiladas 1 · Pies Ligeros 2
- **Paragon:** Errante del Viento: Ráfagas (gratis) · Viento a Favor (A) · Plumas de Aire · Empuje del Aire · Aire Afilado · Aire Pesado · Ojo de la Racha (A) · Silbido · Rosa de los Vientos · Corriente Protectora (B) · Brisa Constante

**Barra:** `IZQ` Disparo Rápido (Disperso) · `DER` Flecha Múltiple · `1` **Paso Veloz** (Rodar y Disparar) · `2` **Agilidad** (c17A) · `3` Andanada (Cerrada) · `4` Diluvio de Saetas.

**Rotación.** Contra el élite: Andanada y relanzar en su **último medio segundo** (Último Instante: +40 % y 20 de Impulso). Al llenar el Impulso, **Golpe de Apertura**: 4 críticos seguros en Andanadas o Múltiples; cada relanzamiento alarga el Vendaval (Vendaval Encadenado). Contra la manada: Múltiple encadenada (Ráfaga Creciente). Paso Veloz deja la **Sombra Gemela**, que repite tus principales, y la siguiente principal sale gratis (Tras la Rodada). Agilidad en la `2` para perseguir o escapar. **Paragon:** **Viento a Favor**: cada rodada y cada salto de la Andanada te dan Ráfagas, que salen con la siguiente Múltiple.
**Dónde brilla:** contenido mixto (élites con manada, recompensas, Pesadillas): en la media de los dos escenarios queda a un 2 % de la mejor, sin ser la mejor en ninguno (§8.5). **Hitos:** Golpe de Apertura al Nv64; final de clase **Sombra Gemela al Nv69**.

### 8.3 «Vaivén Eterno» (Vaivén) · Paragon Errante del Viento

- **Clase (34/34):** Carcaj Profundo 2 · Pulso Firme 2 · Puntería Fija (A) 1 · A Bocajarro (A) 1 · Flecha Silbante (B) 1 · Ojo de Halcón 2 · Difícil de Alcanzar 2 · Respiración Pausada 2 · Instinto de Supervivencia (B) 1 · Presión Constante (A) 1 · Tiro desde la Niebla 1 · Recarga en Marcha 2 · Huida Desesperada (B) 1 · Piernas de Corredora 1 · Bomba Rápida 3 · Calma Letal (B) 1 · Humo Denso 2 · Compás 3 · Danza del Arco 3 · Cadencia 2
- **Tiradora Veloz (31/31):** Impulso (gratis) · Vendaval Largo 3 · Remate Triple 1 · Último Instante (A) 1 · Salto Impulsivo 2 · Viento en las Plumas 2 · Vendaval Encadenado 2 · Golpe de Apertura 3 · Vaivén Eterno 3 · Ojo del Huracán 4 · Astiles Ligeros 3 · Puntas Templadas 1 · Triple Clavado (B) 1 · Piel de Brisa (A) 1 · Aire Fresco 3 · Soltar y Disparar 1
- **Paragon:** Errante del Viento: Ráfagas (gratis) · Viento a Favor (A) · Brisa Constante · Plumas de Aire · Aire Afilado · Ojo de la Racha (A) · Corriente Protectora (B) · Rachas · Tormenta Guardada · Rosa de los Vientos · Silbido

**Barra:** `IZQ` Disparo Rápido (Disparo Disperso) · `DER` Flecha Múltiple (Haz Cerrado) · `1` Carrera del Viento · `2` Bomba de Humo · `3` Andanada (Andanada Cerrada) · `4` Diluvio de Saetas (Saetas Pesadas).

**Rotación.** Contra el jefe: Andanada y relanzar en el último medio segundo (**Último Instante**: +40 % y 20 de Impulso); cada salto da 16 más (Salto Impulsivo), así que el Vendaval llega pronto. Al empezar el Vendaval, **Golpe de Apertura** (4 críticos seguros) y **Vaivén Eterno**: mientras dura, al cerrarse su ventana la Andanada vuelve sin recarga y **a mitad de coste** (12,5 de Energía), así que encadenas un vaivén cada ~2 s; cada relanzamiento alarga el Vendaval (Vendaval Encadenado, hasta +4 s). Con **Andanada Cerrada**, cada salto deja como mucho 3 flechas en el mismo enemigo. Entre Andanadas, Disparo Rápido y Haz Cerrado alternos para los Compases (**Danza del Arco**); el triple sale crítico (Triple Clavado). Soltar la Carrera dispara una Andanada gratis sin saltar (Soltar y Disparar). **Paragon:** **Viento a Favor** (los saltos dan Ráfagas) y **Ojo de la Racha** (las flechas de viento van al de más vida, +40 % a jefes).
**Hitos:** Vaivén Eterno al Nv60, ápice completo al Nv68, **Danza del Arco al Nv69**.

### 8.4 «Galerna Infinita» (Galerna) · Paragon Carcaj Encantado

- **Clase (34/34):** Carcaj Profundo 2 · Bomba Rápida 3 · Flecha Saqueadora (B) 1 · Difícil de Alcanzar 2 · Instinto de Supervivencia (B) 1 · Adrenalina (A) 1 · Tiro desde la Niebla 1 · Economía Letal (B) 1 · Pulso Firme 2 · Respiración Pausada 2 · A Bocajarro (A) 1 · Flecha Roma (A) 1 · Barrido de Caza (B) 1 · Humo Denso 2 · Ojo de Halcón 2 · Huida Desesperada (B) 1 · Emboscada 3 · Manto de Niebla 3 · Piernas de Corredora 1 · Cadencia 2 · Recarga en Marcha 1
- **Tiradora Veloz (31/31):** Impulso (gratis) · Aire Fresco 3 · Fondo de Corredora 2 · Soltar y Disparar 1 · Rueda de Flechas (A) 1 · Saetas Afiladas 2 · Vacío de Aire 1 · Nube de Paso 2 · Nube Fiel 1 · Ciclones 3 · Galerna Infinita 3 · Ojo del Huracán 4 · Vendaval Largo 3 · Ida y Vuelta (B) 1 · Viento en las Plumas 2 · Pies Ligeros 2
- **Paragon:** Carcaj Encantado: Puntas Encantadas (gratis) · Punta Repartida (B) · Encantamiento Rápido · Trampa Encantada · Fuego Prendido · Chispa Saltarina (A) · Punta Curativa (B) · Trenza de Puntas · Encantamiento Hondo · Lluvia Encantada · Punta Viva

**Barra:** `IZQ` Disparo Rápido (Disparo Disperso) · `DER` Flecha Múltiple (Abanico Abierto) · `1` Carrera del Viento (**Galope**; ya no Carrera Esquiva) · `2` Bomba de Humo (Humo Espeso) · `3` Andanada (Repulsora) · `4` Diluvio de Saetas.

**Rotación.** Diluvio y mantener la Carrera: corres en círculo alrededor de la manada; cada segundo sueltas un anillo de 8 flechas (**Rueda de Flechas**) y dejas un ciclón detrás (**Ciclones**, 3 vivos como mucho). La nube del Diluvio te sigue y, en los 6 primeros segundos de cada Carrera, descarga cada 0,4 s (Nube Fiel) y se recarga 1 s por segundo (Nube de Paso). Con **Galerna Infinita** la Carrera no se acaba sola, pero pasada su duración gasta 10 de Energía por segundo y 3 más cada segundo: con la Energía llena son ~6,5 s más (~12,5 s en total); después, 7 s de recarga y vuelves a cargar Energía con Disperso y la Múltiple (Economía Letal abarata la Andanada y la Múltiple, que cuestan más de 20; el gasto de la Carrera no). Al soltar: una Andanada gratis (Soltar y Disparar) y Vacío de Aire junta a la manada. **Manto de Niebla**: la Bomba de Humo te sigue (dentro, −25 %) y cura al grupo un 0,75 % por segundo; se recarga al disiparse, así que cubre ~la mitad del tiempo. **Paragon:** **Punta Repartida**: los disparos de la Carrera y los anillos llevan la punta encantada (al 30 %, una por enemigo y segundo).
**Hitos:** Galerna Infinita al Nv60, ápice completo al Nv68, **Manto de Niebla al Nv69**.

### 8.5 Comparación de la Tiradora (modelo de §12.1; frente a la mejor de la especialización)

| Build | Contra jefes | Contra 5 | Peor de los dos | Contenido mixto (media) | Control | Aguante (TTD+, ×M) |
|---|---|---|---|---|---|---|
| Tormenta de Plumas (Abanico) | 0,62 | **1,00** | 0,62 | 0,81 | medio (Flecha Roma, Bocajarro empuja) | ×1,33 (humo, Piel de Brisa, Punta Curativa) |
| Vaivén Eterno (Vaivén) | **1,00** | 0,80 | 0,80 | **0,90** | bajo (Flecha Silbante) | ×1,19 (humo, Piel de Brisa) |
| Galerna Infinita (Galerna) | 0,84 | 0,93 | **0,84** | 0,89 | medio (Vacío de Aire, Flecha Roma) | ×1,35 (Manto de Niebla) |
| **Viento Cruzado (híbrida)** | 0,84 | 0,92 | **0,84** | 0,88 | bajo-medio (Paso de Abrojos) | ×0,94 (Retirada Instintiva, Agilidad) |

La híbrida queda a un **16 %** de la mejor contra jefes, a un **8 %** contra grupos y a un **2 %** en contenido mixto, **sin ser la mejor en ninguno**: en mixto la gana Vaivén Eterno y la equilibrada (Galerna) la iguala en el peor de los dos con más aguante (hallazgo 18, §18). Ninguna build es la mejor en todo.

### 8.6 Francotiradora

#### «Línea Mortal» (Perforación) · Paragon Errante del Viento

- **Clase (34/34):** Carcaj Profundo 2 · Pulso Firme 2 · Puntería Fija (A) 1 · Tiro Lejano (B) 1 · Flecha Roma (A) 1 · Ojo de Halcón 2 · Difícil de Alcanzar 2 · Respiración Pausada 2 · Instinto de Supervivencia (B) 1 · Barrido de Caza (B) 1 · Paso de Gacela 2 · Paso Limpio 1 · Paso de Abrojos (A) 1 · Huida Desesperada (B) 1 · Lluvia en Retirada 1 · Recarga en Marcha 2 · Calma Letal (B) 1 · Compás 3 · Danza del Arco 3 · Piernas de Corredora 1 · Cadencia 2 · Tras la Rodada 1
- **Francotiradora (31/31):** Mira Serena (gratis) · Punta de Barrena 3 · Sobrepenetración 2 · Línea de Mira 1 · Estela Explosiva (A) 1 · Fila Rota 2 · Quietud (A) 1 · Rebote Certero 2 · Saetas Paralelas 3 · Línea Mortal 3 · Ojo Inmóvil 4 · Ojo Paciente 3 · Marca Saltarina (A) 1 · Lectura del Blanco 2 · Serenidad 2 · Cuerda Ligera 1
- **Paragon:** Errante del Viento: Ráfagas (gratis) · Aire Quieto (B) · Plumas de Aire · Empuje del Aire · Aire Afilado · Aire Pesado · Abanico de Aire (B) · Silbido · Rosa de los Vientos · Torbellino (A) · Brisa Constante

**Barra:** `IZQ` Disparo Rápido (Flecha de Cicuta) · `DER` Tiro Rastreador (Rastreo Múltiple) · `1` Paso Veloz · `2` **Torbellino** (q4A, árbol héroe) · `3` Disparo Apuntado (Tres Saetas) · `4` Tiro Celestial (Lluvia Estelar).

**Rotación.** Rastreo Múltiple marca a 3 enemigos de la fila → Disparo Apuntado a carga completa en la ventana dorada: atraviesa la fila (+20 % por enemigo, Sobrepenetración), el perfecto deja un Punto Débil en todos los que toca (Línea de Mira) y la línea estalla a los 0,5 s (Estela Explosiva). Con **Línea Mortal**, a carga completa es un haz de 30 m que estalla en toda su línea; Saetas Paralelas añade 3 saetas y Rebote Certero lo devuelve desde el muro. Las muertes devuelven Energía y Concentración (Fila Rota). Torbellino levanta a la manada y te da 3 Ráfagas (Aire Quieto: de pie, una cada 2 s), que salen en abanico (Abanico de Aire). Alterna Disparo Rápido y Tiro Rastreador para la **Danza del Arco**.
**Hitos:** Línea Mortal al Nv60, ápice al Nv68, Danza del Arco al Nv69.

#### «Disparo Imposible» (Punto Débil) · Paragon Halconera · **Recomendada**

- **Clase (34/34):** Pulso Firme 2 · Paso de Gacela 2 · Tiro Lejano (B) 1 · Paso Limpio 1 · Flecha Silbante (B) 1 · Paso Sanador (B) 1 · Huida Desesperada (B) 1 · Piernas de Corredora 1 · Cadencia 2 · Carcaj Profundo 2 · Puntería Fija (A) 1 · Difícil de Alcanzar 2 · Respiración Pausada 2 · Ojo de Halcón 2 · Presión Constante (A) 1 · Calma Letal (B) 1 · Instinto de Supervivencia (B) 1 · Tras la Rodada 3 · Sombra Gemela 3 · Lluvia en Retirada 1 · Recarga en Marcha 2 · Compás 1
- **Francotiradora (31/31):** Mira Serena (gratis) · Ojo Paciente 3 · Línea de Mira 1 · Punto Vital (B) 1 · Lectura del Blanco 2 · Serenidad 2 · Herida Expuesta 2 · Herida sobre Herida 3 · Disparo Imposible 3 · Ojo Inmóvil 4 · Punta de Barrena 3 · Sobrepenetración 1 · Doble Impacto (B) 1 · Nervios de Acero (B) 1 · Cuerda Ligera 3 · Pulso Quieto 1
- **Paragon:** Halconera: Halcón Cazador (gratis) · Picado Hondo (A) · Alas Rápidas · Presa Señalada · Garras Afiladas · Halcón Peregrino (B) · Alas Protectoras (B) · Cetrería · Ojo Compartido · Cielo de Halcones · Halcón Fiel

**Barra:** `IZQ` Disparo Rápido (Flecha de Cicuta) · `DER` Tiro Rastreador (Grillete) · `1` Paso Veloz · `2` Rodilla en Tierra (Puesto Fijo) · `3` Disparo Apuntado (Tiro Pesado) · `4` Tiro Celestial (Haz Único).

**Rotación.** Tiro Rastreador abre el Punto Débil (Grillete: lento y 20 de Quebranto) → Rodilla en Tierra (Puesto Fijo; con Pulso Quieto, la ventana es un 50 % más ancha) → Disparo Apuntado con Tiro Pesado (hasta 2,5 s, 300 %): el primero contra cada marcado es perfecto gratis una vez cada 8 s (+30 %, y +35 % más con **Punto Vital**). **Disparo Imposible:** cada perfecto de Disparo Apuntado contra el marcado sale dos veces; la segunda (al 35 %) es crítica y llena 20 de Quebranto (un doble por segundo como mucho). Herida sobre Herida apila +6 % por Herida (hasta 5) y Herida Expuesta hace que todo el grupo le pegue +12 %. La **Calma Absoluta** (5 s; 8 s con el ápice; perfecto desde media carga) es la ventana para el Haz Único; después vienen 7 s de Respiro. El halcón cae con **Picado Hondo** y su marca cuenta como Punto Débil (Presa Señalada). Paso Veloz deja la **Sombra Gemela**, que repite Tiro Rastreador (marca, pero no da el perfecto gratis).
**Hitos:** Disparo Imposible al Nv60, ápice al Nv68, Sombra Gemela al Nv69.

#### «Atalaya Eterna» (Vigía) · Paragon Errante del Viento

- **Clase (34/34):** Carcaj Profundo 2 · Pulso Firme 2 · Puntería Fija (A) 1 · Tiro Lejano (B) 1 · Punta de Diamante (B) 1 · Respiración Pausada 2 · Ojo de Halcón 2 · Presión Constante (A) 1 · Flecha Silbante (B) 1 · Huida Desesperada (B) 1 · Lluvia en Retirada 1 · Recarga en Marcha 2 · Difícil de Alcanzar 2 · Calma Letal (B) 1 · Paso de Gacela 2 · Instinto de Supervivencia (B) 1 · Paso Limpio 1 · Compás 3 · Danza del Arco 3 · Paso de Abrojos (A) 1 · Piernas de Corredora 1 · Cadencia 2
- **Francotiradora (31/31):** Mira Serena (gratis) · Cuerda Ligera 3 · Guardia Larga 2 · Pulso Quieto 1 · Salva de Vigía (A) 1 · Puntería de Vigía 2 · Estrella Fija 1 · Haces Gemelos 2 · Firmamento 1 · Ojo Entrenado 3 · Atalaya Eterna 3 · Ojo Inmóvil 4 · Ojo Paciente 3 · Línea de Mira 1 · Serenidad 2 · Vista Larga 2
- **Paragon:** Errante del Viento: Ráfagas (gratis) · Aire Quieto (B) · Brisa Constante · Plumas de Aire · Aire Afilado · Ojo de la Racha (A) · Corriente Protectora (B) · Rachas · Tormenta Guardada · Rosa de los Vientos · Silbido

**Barra:** `IZQ` Disparo Rápido · `DER` Flecha Perforante (Tiro de Precisión) · `1` Paso Veloz · `2` Rodilla en Tierra (Rodilla Firme) · `3` Disparo Apuntado (**Tensado Rápido**: un solo haz que atraviesa; antes Tres Saetas) · `4` Tiro Celestial.

**Rotación.** Ponte de rodillas y no te levantes: **Atalaya Eterna** hace que la postura no se acabe y suelta un haz celeste gratis cada 5 s (200 %). Cada 4 s, un Disparo Apuntado sale al instante y a carga completa (**Ojo Entrenado**); cada soltado completo dispara 2 saetas más (Salva de Vigía, 40 %). De rodillas, Tiro Celestial se recarga un 50 % más rápido (Firmamento), cada perfecto de Apuntado le quita 1,5 s (Estrella Fija) y cada haz repite otro al 30 % (Haces Gemelos): la definitiva queda en el 21 % del daño contra un jefe. Aguanta poco (×0,78): con **Parapeto** en vez de Rodilla Firme sube a ~×1,1. Flecha Perforante con Punta de Diamante para alternar los Compases. **Paragon:** **Aire Quieto**: de pie o de rodillas, una Ráfaga cada 2 s.
**Hitos:** Atalaya Eterna al Nv60, ápice al Nv68, Danza del Arco al Nv69.

#### «Pulso de Hierro» (híbrida Perforación + Punto Débil, sin final) · Paragon Halconera

- **Clase (34/34):** Pulso Firme 2 · Paso de Gacela 2 · Tiro Lejano (B) 1 · Paso Limpio 1 · Flecha Roma (A) 1 · Paso de Abrojos (A) 1 · Huida Desesperada (B) 1 · Piernas de Corredora 1 · Cadencia 2 · Carcaj Profundo 2 · Puntería Fija (A) 1 · Difícil de Alcanzar 2 · Respiración Pausada 2 · Ojo de Halcón 2 · Presión Constante (A) 1 · Calma Letal (B) 1 · Instinto de Supervivencia (B) 1 · Tras la Rodada 3 · Sombra Gemela 3 · Lluvia en Retirada 1 · Recarga en Marcha 2 · Compás 1
- **Francotiradora (31/31):** Mira Serena (gratis) · Punta de Barrena 3 · Ojo Paciente 3 · Sobrepenetración 2 · Línea de Mira 1 · Doble Impacto (B) 1 · Punto Vital (B) 1 · Fila Rota 2 · Lectura del Blanco 2 · Nervios de Acero (B) 1 · Serenidad 2 · Rebote Certero 2 · Herida Expuesta 2 · Saetas Paralelas 3 · Herida sobre Herida 3 · Cuerda Ligera 1 · Vista Larga 2
- **Paragon:** Halconera: Halcón Cazador (gratis) · Picado Hondo (A) · Presa Señalada · Grito del Halcón · Garras Afiladas · Plumas Cortantes · Halcón Peregrino (B) · Halcón Fiel · Cielo de Halcones · Alas Protectoras (B) · Alas Rápidas

**Barra:** `IZQ` Disparo Rápido (Flecha de Cicuta) · `DER` Tiro Rastreador (Rastreo Múltiple) · `1` Paso Veloz · `2` Rodilla en Tierra (Parapeto) · `3` Disparo Apuntado · `4` Tiro Celestial.

**Rotación.** Los dos penúltimos al máximo (**Saetas Paralelas** y **Herida sobre Herida**) sin final. Contra la fila: Rastreo Múltiple y un perfecto que atraviesa (Línea de Mira + Saetas Paralelas). Contra el élite: **Punto Vital**, **Doble Impacto** y las Heridas; Presión Constante sube el daño al mismo blanco. **Dónde brilla:** élites con manada, recompensas, Pesadillas (en mixto, a un 10 % de la mejor).

**Comparación de la Francotiradora** (modelo de §12.1):

| Build | Contra jefes | Contra 5 | Peor de los dos | Contenido mixto (media) | Control | Aguante (TTD+, ×M) |
|---|---|---|---|---|---|---|
| Línea Mortal (Perforación) | 0,59 | **1,00** | 0,59 | 0,80 | medio (Torbellino, Flecha Roma) | ×0,93 (Quietud) |
| Disparo Imposible (Punto Débil) | **1,00** | 0,63 | 0,63 | 0,82 | medio (Grillete, Quebranto) | ×1,36 (Paso Sanador, Nervios de Acero) |
| Atalaya Eterna (Vigía) | 0,91 | 0,90 | **0,90** | **0,91** | bajo | ×0,78 (quieta, sin humo; ×1,1 con Parapeto) |
| **Pulso de Hierro (híbrida)** | 0,79 | 0,84 | 0,79 | 0,82 | bajo-medio | ×1,31 (Parapeto, Nervios de Acero) |

La híbrida queda a un **21 %** contra jefes, a un **16 %** contra grupos y a un **10 %** en contenido mixto; la equilibrada (Atalaya) la supera en los tres. La regla de la plantilla («híbrida a ~8–9 % en cada escenario») choca con el hallazgo 18 y con finales que valen la pena: se decide en §17.2.

### 8.7 Montaraz

#### «Tierra Arrasada» (Campo Minado) · Paragon Carcaj Encantado

- **Clase (34/34):** Carcaj Profundo 2 · Pulso Firme 2 · Flecha Saqueadora (B) 1 · A Bocajarro (A) 1 · Flecha Roma (A) 1 · Ojo de Halcón 2 · Difícil de Alcanzar 2 · Respiración Pausada 2 · Instinto de Supervivencia (B) 1 · Barrido de Caza (B) 1 · Tiro desde la Niebla 1 · Recarga en Marcha 2 · Huida Desesperada (B) 1 · Piernas de Corredora 1 · Bomba Rápida 3 · Adrenalina (A) 1 · Humo Denso 2 · Compás 3 · Danza del Arco 3 · Cadencia 2
- **Montaraz (31/31):** Coto de Caza (gratis) · Muelles Ligeros 3 · Pólvora Negra 2 · Presa Atrapada 1 · Racimo de Cepos (A) 1 · Metralla 2 · Cepo de Huida (A) 1 · Rearme Rápido 2 · Campo Sembrado 3 · Tierra Arrasada 3 · Corazón del Bosque 4 · Olfato de Presa 3 · Presas en Manada (A) 1 · Acoso 2 · Coto Cerrado 2 · Raíz Rápida 1
- **Paragon:** Carcaj Encantado: Puntas Encantadas (gratis) · Punta Repartida (B) · Trampa Encantada · Hielo Hondo · Fuego Prendido · Puntas Afines · Chispa Saltarina (A) · Punta Viva · Lluvia Encantada · Punta Curativa (B) · Encantamiento Rápido

**Barra:** `IZQ` Disparo Rápido (Disparo Disperso) · `DER` Flecha Detonante (Detonación en Cadena) · `1` Salto de Acecho (Doble Acecho) · `2` Bomba de Humo (Humo Venenoso) · `3` Trampa de Cepo (Mina de Espinas) · `4` Cerco de Zarzas.

**Rotación.** **Racimo de Cepos**: cada carga coloca 3 minas al 35 % (en el Coto cuentan como una); el Cebo de Caza trae a la manada hasta ellas. Flecha Detonante las hace estallar a la vez (80 % y 100 % por mina, como mucho 2 estallidos por enemigo) → con 3 trampas de verdad, **Batida** (+15 % para todo el grupo, una cada 12 s). Los cepos de carga sueltan púas al estallar (Metralla) y cada detonación recarga 2 s del cepo y del salto (Rearme Rápido); con **Tierra Arrasada**, cada cepo de carga siembra 3 cepos pequeños (hasta 6), y Campo Sembrado deja 3 cepos al 35 % donde cae la flecha: el campo **cubre** más suelo y controla, pero no multiplica el daño sobre un mismo enemigo. Salto de Acecho para caer sobre una mina y detonarla (nunca más de uno cada 5 s). **Paragon:** **Trampa Encantada**: tus cepos llevan la punta encantada (Punta Repartida).
**Hitos:** Tierra Arrasada al Nv60, ápice al Nv68, Danza del Arco al Nv69.

#### «Gran Cacería» (Presa) · Paragon Halconera

- **Clase (34/34):** Pulso Firme 2 · Paso de Gacela 2 · A Bocajarro (A) 1 · Paso Limpio 1 · Flecha Silbante (B) 1 · Paso de Abrojos (A) 1 · Huida Desesperada (B) 1 · Piernas de Corredora 1 · Cadencia 2 · Carcaj Profundo 2 · Puntería Fija (A) 1 · Difícil de Alcanzar 2 · Respiración Pausada 2 · Ojo de Halcón 2 · Presión Constante (A) 1 · Calma Letal (B) 1 · Instinto de Supervivencia (B) 1 · Tras la Rodada 3 · Sombra Gemela 3 · Lluvia en Retirada 1 · Recarga en Marcha 2 · Compás 1
- **Montaraz (31/31):** Coto de Caza (gratis) · Olfato de Presa 3 · Presa Atrapada 1 · Presa Herida (B) 1 · Acoso 2 · Coto Cerrado 2 · Rastro Fresco 2 · Batida Mayor 3 · Gran Cacería 3 · Corazón del Bosque 4 · Muelles Ligeros 3 · Pólvora Negra 1 · Cepo Reforzado (B) 1 · Guarida (B) 1 · Raíz Rápida 3 · Cerco a la Presa 1
- **Paragon:** Halconera: Halcón Cazador (gratis) · Picado Hondo (A) · Alas Rápidas · Presa Señalada · Garras Afiladas · Halcón Peregrino (B) · Llamada del Halcón (A) · Cetrería · Ojo Compartido · Cielo de Halcones · Halcón Fiel

**Barra:** `IZQ` Disparo Rápido (Flecha de Cicuta) · `DER` Flecha Detonante (Detonación en Cadena) · `1` Paso Veloz (Rodar y Disparar) · `2` **Llamada del Halcón** (y4A, árbol héroe; antes Bomba de Humo) · `3` Trampa de Cepo · `4` Cerco de Zarzas (Jaula de Espinas).

**Rotación.** El jefe es tu Presa (y la marca del halcón también cuenta, Presa Señalada). Cepos bajo él: Cepo Reforzado estalla 3 veces (30 %); **Presa Herida** (+10 % para todo el grupo y 25 de Quebranto por trampa) y **Acoso** (30 de Quebranto más por trampa). **Gran Cacería:** al pisar una trampa, todas tus trampas saltan a su alrededor y se rearman (una vez cada 6 s) → Flecha Detonante → **Batida Mayor** (la Batida dura 9 s y le llena 30 de Quebranto). **Llamada del Halcón** cada 30 s: 6 s de ataques, ceguera y 30 de Quebranto. Jaula de Espinas lo encierra. Paso Veloz deja la **Sombra Gemela**, que repite Flecha Detonante. Es la que más Quebrantos saca de la clase: ~2,6 por minuto, cerca del techo del juego (~3,2: 4 s Quebrantado y 15 s bloqueado, §12.2).
**Hitos:** Gran Cacería al Nv60, ápice al Nv68, Sombra Gemela al Nv69.

#### «Bosque Vivo» (Zarzal) · Paragon Carcaj Encantado · **Recomendada**

- **Clase (34/34):** Carcaj Profundo 2 · Bomba Rápida 3 · Flecha Saqueadora (B) 1 · Difícil de Alcanzar 2 · Instinto de Supervivencia (B) 1 · Adrenalina (A) 1 · Tiro desde la Niebla 1 · Economía Letal (B) 1 · Pulso Firme 2 · Respiración Pausada 2 · A Bocajarro (A) 1 · Flecha Roma (A) 1 · Presión Constante (A) 1 · Humo Denso 2 · Ojo de Halcón 2 · Huida Desesperada (B) 1 · Emboscada 3 · Manto de Niebla 3 · Piernas de Corredora 1 · Cadencia 2 · Recarga en Marcha 1
- **Montaraz (31/31):** Coto de Caza (gratis) · Raíz Rápida 3 · Raíces Profundas 2 · Cerco a la Presa 1 · Zarzal Creciente (A) 1 · Espino Venenoso 2 · Semillas de Zarza 1 · Zarzas Trepadoras 2 · Rebrote 1 · Siembra de Espinas 3 · Bosque Vivo 3 · Corazón del Bosque 4 · Olfato de Presa 3 · Presas en Manada (A) 1 · Coto Cerrado 2 · Ojo de Trampera 2
- **Paragon:** Carcaj Encantado: Puntas Encantadas (gratis) · Punta Mayor (A) · Encantamiento Rápido · Trampa Encantada · Fuego Prendido · Hielo Mordiente (B) · Punta Curativa (B) · Trenza de Puntas · Encantamiento Hondo · Lluvia Encantada · Punta Viva

**Barra:** `IZQ` Disparo Rápido (Flecha de Cicuta) · `DER` Flecha Detonante (Pólvora Fina) · `1` Salto de Acecho (Acecho Enredador) · `2` Bomba de Humo (Humo Venenoso) · `3` Trampa de Cepo (Red de Caza) · `4` Cerco de Zarzas.

**Rotación.** Flecha Detonante deja un zarzal donde estalla (Semillas de Zarza); cada cepo que atrapa deja otro (Siembra de Espinas); el Cerco de Zarzas crece hasta 12 m (Zarzal Creciente) y al acabar deja 3 más (Rebrote). Con **Bosque Vivo**, 3 zarzales que se tocan forman un Cerco gratis de 4 s: control casi constante sobre la manada. **Manto de Niebla**: el humo te sigue (dentro, −25 %) y cura al grupo dentro. **Paragon:** Trampa Encantada (las zonas llevan la punta) y **Punta Mayor**.
**Hitos:** Bosque Vivo al Nv60, ápice al Nv68, Manto de Niebla al Nv69.

#### «Espinas de Caza» (híbrida Presa + Zarzal, sin final) · Paragon Halconera

- **Clase (34/34):** Carcaj Profundo 2 · Pulso Firme 2 · Puntería Fija (A) 1 · A Bocajarro (A) 1 · Flecha Silbante (B) 1 · Ojo de Halcón 2 · Difícil de Alcanzar 2 · Respiración Pausada 2 · Instinto de Supervivencia (B) 1 · Presión Constante (A) 1 · Tiro desde la Niebla 1 · Recarga en Marcha 2 · Huida Desesperada (B) 1 · Piernas de Corredora 1 · Bomba Rápida 3 · Calma Letal (B) 1 · Humo Denso 2 · Compás 3 · Danza del Arco 3 · Cadencia 2
- **Montaraz (31/31):** Coto de Caza (gratis) · Olfato de Presa 3 · Raíz Rápida 3 · Cerco a la Presa 1 · Raíces Profundas 2 · Presa Herida (B) 1 · Zarzal Asfixiante (B) 1 · Acoso 2 · Espino Venenoso 2 · Coto Cerrado 2 · Zarzas Trepadoras 2 · Rastro Fresco 2 · Rebrote 1 · Batida Mayor 3 · Siembra de Espinas 3 · Semillas de Zarza 1 · Ojo de Trampera 2
- **Paragon:** Halconera: Halcón Cazador (gratis) · Picado Hondo (A) · Presa Señalada · Grito del Halcón · Garras Afiladas · Plumas Cortantes · Bandada (A) · Halcón Fiel · Cielo de Halcones · Alas Protectoras (B) · Alas Rápidas

**Barra:** `IZQ` Disparo Rápido (Flecha de Cicuta) · `DER` Flecha Detonante · `1` Salto de Acecho · `2` Bomba de Humo · `3` Trampa de Cepo (Red de Caza) · `4` Cerco de Zarzas.

**Rotación.** Los penúltimos **Batida Mayor** y **Siembra de Espinas** al máximo, sin final. La Presa queda dentro del Cerco (Zarzal Asfixiante: el veneno sube cada segundo) y los zarzales controlan a la manada. **Dónde brilla:** élites con manada y jefes con adds.

**Comparación del Montaraz** (modelo de §12.1; el rol es el control, así que se mide también su control):

| Build | Contra jefes | Contra 5 | Peor de los dos | Contenido mixto (media) | Control (5 comunes · jefe) | Aguante (TTD+, ×M) |
|---|---|---|---|---|---|---|
| Tierra Arrasada (Campo Minado) | 0,46 | **1,00** | 0,46 | 0,73 | lentos ~55 % · ~1,8 Quebrantos/min | ×1,35 (humo, Cepo de Huida) |
| Gran Cacería (Presa) | **1,00** | 0,80 | **0,80** | **0,90** | lentos ~45 % · **~2,6 Quebrantos/min** | ×0,87 (Guarida) |
| Bosque Vivo (Zarzal) | 0,63 | 0,99 | 0,63 | 0,81 | **lentos ~85 %, inmovilizados ~45 %** · ~2,1/min | ×1,40 (Manto de Niebla) |
| **Espinas de Caza (híbrida)** | 0,71 | 0,88 | 0,71 | 0,80 | lentos ~70 % · ~2,4/min | ×1,20 |

La híbrida queda a un **29 %** contra jefes, a un **12 %** contra grupos y a un **11 %** en contenido mixto; Gran Cacería la supera en mixto. **Bosque Vivo** es la equilibrada del control, no del daño: su jefe es bajo (0,63) y lo paga con el mejor control de la clase. El Montaraz (Tierra Arrasada, 2408 %WD/s) hace en área un **91 %** de la Tiradora (2646), no más (hallazgo 5).

### 8.8 Paragon de cada build

| Build | Árbol héroe | Elecciones | Quedan fuera | Por qué |
|---|---|---|---|---|
| Tormenta de Plumas | Carcaj Encantado | Punta Repartida · Punta Curativa · Chispa Saltarina | Trenza de Puntas, Encantamiento Hondo | Muchas flechas por disparo: la punta repartida rinde más |
| Vaivén Eterno | Errante del Viento | Viento a Favor · Corriente Protectora · Ojo de la Racha | Empuje del Aire, Aire Pesado | Los saltos dan Ráfagas; Ojo de la Racha contra jefes |
| Galerna Infinita | Carcaj Encantado | Punta Repartida · Punta Curativa · Chispa Saltarina | Hielo Hondo, Puntas Afines | Los disparos automáticos llevan la punta |
| Viento Cruzado | Errante del Viento | Viento a Favor · Corriente Protectora · Ojo de la Racha | Rachas, Tormenta Guardada | Rodar y saltar dan Ráfagas |
| Línea Mortal | Errante del Viento | Aire Quieto · **Torbellino** · Abanico de Aire | Rachas, Tormenta Guardada | De pie gana Ráfagas; Torbellino ocupa la ranura `2` |
| Disparo Imposible | Halconera | Picado Hondo · Alas Protectoras · Halcón Peregrino | Grito del Halcón, Plumas Cortantes | La marca del halcón es su Punto Débil |
| Atalaya Eterna | Errante del Viento | Aire Quieto · Corriente Protectora · Ojo de la Racha | Empuje del Aire, Aire Pesado | De rodillas, una Ráfaga cada 2 s |
| Pulso de Hierro | Halconera | Picado Hondo · Alas Protectoras · Halcón Peregrino | Cetrería, Ojo Compartido | Marca y Grito contra élites; Plumas Cortantes contra la manada |
| Tierra Arrasada | Carcaj Encantado | Punta Repartida · Punta Curativa · Chispa Saltarina | Trenza de Puntas, Encantamiento Hondo | Sus cepos llevan la punta (Trampa Encantada) |
| Gran Cacería | Halconera | Picado Hondo · **Llamada del Halcón** · Halcón Peregrino | Grito del Halcón, Plumas Cortantes | El halcón marca a la Presa; la Llamada (ranura `2`) pone ceguera y 30 de Quebranto |
| Bosque Vivo | Carcaj Encantado | Punta Mayor · Punta Curativa · Hielo Mordiente | Hielo Hondo, Puntas Afines | Sus zonas llevan la punta; Hielo Mordiente contra jefes |
| Espinas de Caza | Halconera | Picado Hondo · Alas Protectoras · Bandada | Cetrería, Ojo Compartido | Un picado de jefe y la bandada contra la manada (antes Vuelo Rasante: híbrida más equilibrada) |

---

## 9. Paragon: árboles héroe de la Arquera

### 9.1 Reglas

Iguales a la Maga (§7.1 de su documento): se abre con la especialización **31/31 gastada**, clave gratis + **10 puntos** (Nv71–80) para 12 nodos (siempre quedan 2 fuera), queda **en pausa** si bajas de 31, temáticos de la **clase** (no de una especialización), 13 nodos (clave, 3 elecciones y final), **máximo 1 habilidad de talento por árbol** (opción A de una elección, ranura `2`). Cambiar de árbol héroe es gratis fuera de combate.

| Árbol héroe | Especializaciones | Mecánica clave (con cualquier especialización) | Por qué es de la clase |
|---|---|---|---|
| **Errante del Viento** (`h1`, ids `q`) | Tiradora · Francotiradora | **Ráfagas:** cada 4 s guardas una (hasta 3); tu siguiente principal o insignia suelta 1 flecha de viento (60 %) por cada una | La arquera que lee el viento. Se gana **por tiempo**: la elección q2 premia moverte (Tiradora) **o** quedarte quieta (Francotiradora), así no premia solo a una |
| **Carcaj Encantado** (`h2`, ids `w`) | Tiradora · Montaraz | **Puntas encantadas:** cada 6 s tu siguiente flecha lleva una punta que rota: Fuego (quema 200 %), Hielo (frena 40 %) o Rayo (80 %, salta a 3). Una punta por enemigo cada 1 s; la quemadura se renueva, no se suma | El carcaj es de toda arquera. Trampa Encantada (w3) lleva las puntas a las trampas, zonas y lluvias del Montaraz y de la Tiradora |
| **Halconera** (`h3`, ids `y`) | Francotiradora · Montaraz | **Halcón cazador:** cada 6 s cae en picado sobre tu blanco (100 %) y lo marca 6 s (+8 % de tus flechas) | Compañero de caza. Presa Señalada (y3) hace que su marca cuente como el Punto Débil o la Presa |

**Peso parecido** (lección de Archon, §2.1): el aporte de cada árbol completo es +10–15 % y, en cada especialización, la diferencia entre sus dos árboles es ≤ 5 puntos. Con el modelo de §12.1 (parte del daño total que pone el árbol, media de jefe y 5 enemigos en las builds que lo usan): **Tiradora** Errante del Viento 13,5 % · Carcaj Encantado 10 %; **Francotiradora** Errante 12 % · Halconera 9 %; **Montaraz** Carcaj 14 % · Halconera 12 %. Para llegar ahí, tras el juicio la Halconera bajó (picado 150 → 100 %, Cetrería cada 10 s, Cielo de Halcones 4 s, Peregrino +40 % en vez de crítico, Ojo Compartido pasa a mecánica) y el Carcaj subió con topes (una punta cada 6 s y más fuerte, pero una por enemigo y segundo). Cada especialización usa **sus dos árboles** en sus cuatro builds (§8.8).

**Activas de árbol héroe** (opción A; ranura `2`; ≈ Nv72; sin forja): **Torbellino** (q4A: levanta 1,5 s a 4 m y da 3 Ráfagas; 40 s), **Desborde de Puntas** (w4A: 6 disparos con las tres puntas; **30 s**) y **Llamada del Halcón** (y4A: el halcón ataca 6 s al 40 % cada 0,5 s, ciega y llena **30 de Quebranto**; **30 s**). «Línea Mortal» usa Torbellino y «Gran Cacería», la Llamada del Halcón.

### 9.2 Errante del Viento (Tiradora · Francotiradora)

| Fila | Id | Nodo | Forma · tipo | Etiqueta | Rangos | Requiere | Qué hace (al máximo) | Cuál conviene |
|---|---|---|---|---|---|---|---|---|
| 0 | q0 | Ráfagas | ○ clave | mecánica | gratis | gratis | Cada 4 s ganas una Ráfaga (hasta 3). Tu siguiente principal o insignia suelta 1 flecha de viento por Ráfaga (60 %) |  |
| 1 | q1 | Brisa Constante | ○ pasiva | número | 1 | q0 | Ganas una Ráfaga cada 3 s (antes 4 s) |  |
| 1 | q2 | Favor o Calma | ⬡ elección | mecánica | 1 | q0 | **A · ○ Viento a Favor**: Cada 15 m que recorres (rodando o saltando también) te dan una Ráfaga más _(contra grupos)_<br>**B · ○ Aire Quieto**: Quieta, ganas una Ráfaga cada 2 s (antes 4 s) _(contra jefes)_ | A, si juegas en movimiento, contra grupos. B, si juegas plantada, contra jefes |
| 1 | q3 | Plumas de Aire | ○ pasiva | mecánica | 1 | q0 | Las flechas de viento atraviesan a 2 enemigos |  |
| 2 | q4 | Torbellino o Corriente | ⬡ elección | mecánica | 1 | q1 o q2 | **A · □ Torbellino** (habilidad): Habilidad (ranura 2): un torbellino de 4 m levanta 1,5 s a los enemigos y te da 3 Ráfagas. Se recarga en 40 s _(control)_<br>**B · ○ Corriente Protectora**: Con 3 Ráfagas guardadas, recibes un 15 % menos de daño _(supervivencia)_ | A, para controlar grupos y tener Ráfagas a voluntad (ocupa la ranura 2). B, para sobrevivir sin ocupar ranura |
| 2 | q5 | Aire Afilado | ○ pasiva | número | 1 | q2 | Las flechas de viento hacen +30 % de daño |  |
| 2 | q6 | Empuje del Aire | ○ pasiva | mecánica | 1 | q2 o q3 | Gastar 3 Ráfagas a la vez te da 15 de tu mecánica (Impulso o Concentración) |  |
| 3 | q7 | Rachas | ○ pasiva | mecánica | 1 | q4 o q5 | Gastar 3 Ráfagas a la vez recarga 2 s de tu insignia |  |
| 3 | q8 | Certero o Abierto | ⬡ elección | mecánica | 1 | q5 | **A · ○ Ojo de la Racha**: Las flechas de viento buscan al enemigo con más vida y hacen +25 % a élites y jefes _(contra jefes)_<br>**B · ○ Abanico de Aire**: Las flechas de viento salen en abanico y atraviesan a 3 enemigos _(contra grupos)_ | A, contra jefes. B, contra grupos |
| 3 | q9 | Aire Pesado | ○ pasiva | mecánica | 1 | q5 o q6 | Las flechas de viento ralentizan un 30 % durante 2 s |  |
| 4 | q10 | Tormenta Guardada | ○ pasiva | número | 1 | q7 o q8 | Puedes guardar hasta 5 Ráfagas (antes 3) |  |
| 4 | q11 | Silbido | ○ pasiva | mecánica | 1 | q8 o q9 | Si una flecha de viento hace crítico, te devuelve una Ráfaga (una vez por lanzamiento) |  |
| 5 | q12 | Rosa de los Vientos | ○ **FINAL** | mecánica | 1 | q10 o q11 | Cada 25 s, el viento ruge 6 s: ganas una Ráfaga por segundo y las flechas de viento hacen +50 % |  |

### 9.3 Carcaj Encantado (Tiradora · Montaraz)

| Fila | Id | Nodo | Forma · tipo | Etiqueta | Rangos | Requiere | Qué hace (al máximo) | Cuál conviene |
|---|---|---|---|---|---|---|---|---|
| 0 | w0 | Puntas Encantadas | ○ clave | mecánica | gratis | gratis | Cada 6 s tu siguiente flecha lleva una punta que rota: Fuego (quema 200 %), Hielo (frena 40 %) o Rayo (80 %, salta a 3) |  |
| 1 | w1 | Encantamiento Rápido | ○ pasiva | número | 1 | w0 | Una punta encantada cada 4 s (antes 6 s) |  |
| 1 | w2 | Punta: Mayor o Repartida | ⬡ elección | mecánica | 1 | w0 | **A · ○ Punta Mayor**: La punta encantada hace +40 % y su efecto dura el doble _(contra jefes)_<br>**B · ○ Punta Repartida**: Todas las flechas de ese disparo llevan la punta (al 30 %; una por enemigo) _(contra grupos)_ | A, contra jefes. B, contra grupos: en un disparo de varias flechas, todas la llevan |
| 1 | w3 | Trampa Encantada | ○ pasiva | mecánica | 1 | w0 | Tus trampas, zonas y lluvias también toman la punta encantada al colocarlas |  |
| 2 | w4 | Desborde o Bálsamo | ⬡ elección | mecánica | 1 | w1 o w2 | **A · □ Desborde de Puntas** (habilidad): Habilidad (ranura 2): tus 6 siguientes disparos llevan las tres puntas a la vez. Se recarga en 30 s _(contra grupos)_<br>**B · ○ Punta Curativa**: Cada punta encantada que golpea te cura un 2 % de la vida _(supervivencia)_ | A, para un estallido de daño a voluntad (ocupa la ranura 2). B, para aguantar sin ocupar ranura |
| 2 | w5 | Fuego Prendido | ○ pasiva | número | 1 | w2 | La punta de Fuego quema un 50 % más |  |
| 2 | w6 | Hielo Hondo | ○ pasiva | mecánica | 1 | w2 o w3 | La punta de Hielo inmoviliza 1 s a los enemigos normales |  |
| 3 | w7 | Trenza de Puntas | ○ pasiva | mecánica | 1 | w4 o w5 | Tras Fuego, Hielo y Rayo seguidos, tu siguiente flecha estalla en 4 m (150 %) |  |
| 3 | w8 | Rayo o Escarcha | ⬡ elección | mecánica | 1 | w5 | **A · ○ Chispa Saltarina**: La punta de Rayo salta a 6 enemigos (antes 3) _(contra grupos)_<br>**B · ○ Hielo Mordiente**: Los enemigos con la punta de Hielo reciben +15 % de tus flechas durante 4 s _(contra jefes)_ | A, contra grupos. B, contra jefes |
| 3 | w9 | Puntas Afines | ○ pasiva | mecánica | 1 | w5 o w6 | Cada punta encantada te da 8 de Impulso (Tiradora) o recarga 1 s de Trampa de Cepo (Montaraz) |  |
| 4 | w10 | Encantamiento Hondo | ○ pasiva | número | 1 | w7 o w8 | Las puntas encantadas hacen +25 % de daño |  |
| 4 | w11 | Punta Viva | ○ pasiva | mecánica | 1 | w8 o w9 | Si una punta encantada mata, la siguiente llega al instante |  |
| 5 | w12 | Lluvia Encantada | ○ **FINAL** | mecánica | 1 | w10 o w11 | Cada 30 s, durante 6 s, tus flechas llevan una punta encantada (al 30 %; una por enemigo cada 1 s) |  |

### 9.4 Halconera (Francotiradora · Montaraz)

| Fila | Id | Nodo | Forma · tipo | Etiqueta | Rangos | Requiere | Qué hace (al máximo) | Cuál conviene |
|---|---|---|---|---|---|---|---|---|
| 0 | y0 | Halcón Cazador | ○ clave | mecánica | gratis | gratis | Un halcón cae en picado cada 6 s sobre tu blanco (100 %) y lo marca 6 s: recibe +8 % de tus flechas |  |
| 1 | y1 | Alas Rápidas | ○ pasiva | número | 1 | y0 | El halcón cae en picado cada 5 s (antes 6 s) |  |
| 1 | y2 | Picado: Hondo o Rasante | ⬡ elección | mecánica | 1 | y0 | **A · ○ Picado Hondo**: El picado hace +40 % y a un jefe le llena 15 de Quebranto _(contra jefes)_<br>**B · ○ Vuelo Rasante**: El picado barre una línea de 8 m y golpea a todos (70 %) _(contra grupos)_ | A, contra jefes. B, contra grupos |
| 1 | y3 | Presa Señalada | ○ pasiva | mecánica | 1 | y0 | La marca del halcón cuenta como tu Punto Débil (sin el perfecto gratis) o como tu Presa (Montaraz) |  |
| 2 | y4 | Llamada o Alas | ⬡ elección | mecánica | 1 | y1 o y2 | **A · □ Llamada del Halcón** (habilidad): Habilidad (ranura 2): el halcón ataca a tu blanco 6 s (40 % cada 0,5 s), lo ciega y le llena 30 de Quebranto. 30 s _(contra jefes)_<br>**B · ○ Alas Protectoras**: Al bajar del 40 % de vida, el halcón te cubre: recibes un 30 % menos de daño 4 s. Una vez cada 60 s _(supervivencia)_ | A, contra jefes: daño, ceguera y Quebranto a voluntad (ocupa la ranura 2). B, para sobrevivir sin ocupar ranura |
| 2 | y5 | Garras Afiladas | ○ pasiva | número | 1 | y2 | El halcón hace +25 % de daño |  |
| 2 | y6 | Grito del Halcón | ○ pasiva | mecánica | 1 | y2 o y3 | El picado corta el hechizo del blanco y lo deja mudo 2 s |  |
| 3 | y7 | Cetrería | ○ pasiva | mecánica | 1 | y4 o y5 | Golpear al marcado con tu principal o tu insignia hace caer al halcón al instante (una vez cada 10 s) |  |
| 3 | y8 | Bandada o Peregrino | ⬡ elección | mecánica | 1 | y5 | **A · ○ Bandada**: Dos halcones más pequeños caen sobre otros enemigos (60 % cada uno) _(contra grupos)_<br>**B · ○ Halcón Peregrino**: El picado contra un élite o un jefe hace +40 % _(contra jefes)_ | A, contra grupos. B, contra jefes |
| 3 | y9 | Plumas Cortantes | ○ pasiva | mecánica | 1 | y5 o y6 | El picado suelta 4 plumas a enemigos cercanos (40 % cada una) |  |
| 4 | y10 | Ojo Compartido | ○ pasiva | mecánica | 1 | y7 o y8 | La marca del halcón dura 12 s (antes 6 s) y no se pierde al marcar a otro: varios marcados a la vez |  |
| 4 | y11 | Halcón Fiel | ○ pasiva | mecánica | 1 | y8 o y9 | Si el marcado muere, el halcón marca al siguiente y cae en picado gratis |  |
| 5 | y12 | Cielo de Halcones | ○ **FINAL** | mecánica | 1 | y10 o y11 | Cada 30 s, durante 4 s, el halcón cae en picado cada segundo y cada picado marca a otro enemigo |  |

**Implementación de los árboles héroe:** `q0` power q_rafagas · NUEVO (contador por tiempo; afterCast de principal o insignia: N proyectiles que buscan); `q2` A: tv.windMove (Ráfaga cada 10 m, rodar y saltar cuentan) · B: tv.windStill; `q4` A: activa a_h_torbellino · NUEVA (zona que levanta = applyCC knockup; a jefes, Quebranto); `w0` power w_puntas · NUEVO (onCast cada 6 s; rota fire/frost/lightning; reutiliza los DoT y CC genéricos; una punta por enemigo cada 1 s y la quemadura se renueva); `w3` el campo o la trampa copia la punta al colocarse; `w4` A: activa a_h_puntas · NUEVA (buff de 6 cargas); `y0` power y_halcon · NUEVO (aliado sin vida, como Sombra Gemela; el picado es un eco con marca `y_marca`); `y3` la marca del halcón alimenta f_punto_debil (sin el perfecto gratis) o la Presa del coto; `y4` A: activa a_h_halcon · NUEVA. Los ecos (flecha de viento, picado, punta) **no generan otros ecos** (regla de la Maga).

---

## 10. Forja y talentos: sin repetición

**Regla (Maga, Anexo A.4):** la forja **transforma** (forma, geometría, elemento, ritmo, cargas); el talento **añade, multiplica o repite**.

| Habilidad | Variantes | Talentos que la tocan | Cómo conviven |
|---|---|---|---|
| Disparo Rápido | Disparo Disperso · Flecha de Cicuta | Pasivas Tercera Flecha y Cuerda Tensa, v4, v5, v8; c5, c19 | La variante da la forma (3 flechas o veneno); la pasiva **añade** flechas al 3.º (Tiradora) o el tensado (Francotiradora: con Disperso, las 3 flechas se tensan juntas y el +60 % se reparte, +20 % cada una) |
| Flecha Perforante | Flecha Explosiva · Tiro de Precisión | c9 | Lastrada añade ralentización; Diamante suma al primero |
| Paso Veloz | Rodar y Disparar · Doble Rodada | c3, c7, c14, c20, c27, c30 | Con Doble Rodada, cada carga dispara Tras la Rodada y deja Sombra (la sombra no se apila: 1 a la vez) |
| Bomba de Humo | Humo Venenoso · Estallido de Humo | c4, c18, c19, c25, c28 | Manto de Niebla mueve el humo; la variante cambia lo que hace dentro |
| Lluvia de Flechas | Aguacero · Cortina | c20 | Lluvia en Retirada repite la Lluvia al 50 % con su variante |
| Andanada | Andanada Cerrada · Andanada Repulsora | v5, v6, v9, v12, v16, v19, v23, v26 | La variante da el ángulo o el empuje; los talentos tocan la **ventana** (tiempo justo, relanzamientos, sin recarga) |
| Carrera del Viento | Carrera Certera · Carrera Esquiva | v3, v6, v7, v10, v13, v14, v16, v17, v21, v24, v27 | La variante cambia blanco y cadencia (o esquiva); los talentos **añaden** anillos, ciclones, rampa, duración y lo que pasa al soltar |
| Flecha Múltiple | Abanico Abierto · Haz Cerrado | v1, v4, v11, v16, v18, v22, v23, v25 | Mano Llena y Ráfaga Creciente suman flechas al abanico de la variante; Tormenta de Plumas **añade** un círculo |
| Diluvio de Saetas | Diluvio Anclado · Saetas Pesadas | v13, v17, v21, v28 | Con Diluvio Anclado, Nube Fiel acelera las descargas aunque la nube no te siga |
| **Disparo Apuntado** | Tres Saetas · Tiro Pesado | f1, f2, f4, f5, f8, f11, f12, f16, f18, f22–f26 | La variante cambia **cuántas saetas** o **cuánto tensas**; los talentos tocan la ventana, el premio y lo que pasa al atravesar. Con Tiro Pesado (no atraviesa), los nodos de Perforación no rinden: el libro lo avisa con la ★ |
| **Rodilla en Tierra** | Puesto Fijo · Parapeto | f6, f7, f10, f13, f21, f24, f27 | La variante decide si te quedas clavada o te proteges; los talentos alargan la postura y premian no levantarte |
| **Tiro Rastreador** | Rastreo Múltiple · Grillete | f5, f9, f12, f19, f23, f26 | La variante cambia a cuántos marca o qué control pone; los talentos premian el Punto Débil |
| **Tiro Celestial** | Lluvia Estelar · Haz Único | f2, f3, f14, f17, f21, f27, f28 | Haces Gemelos **repite** cada haz (con Haz Único, el único); Atalaya Eterna suelta haces gratis al 50 % con la variante elegida |
| **Trampa de Cepo** | Mina de Espinas · Red de Caza | m1, m4, m5, m8, m11, m12, m18, m22, m24, m25, m26 | Racimo de Cepos **multiplica** la variante: tres minas o tres redes (al 35 %); Tierra Arrasada siembra cepos pequeños de la misma variante. Cada enemigo recibe como mucho 2 estallidos por detonación: más cepos cubren más suelo, no multiplican el daño sobre uno |
| **Salto de Acecho** | Acecho Enredador · Doble Acecho | m18 | La variante decide si gastas la trampa o tienes dos saltos; Rearme Rápido lo recarga con cada detonación (nunca por debajo de 5 s) |
| **Flecha Detonante** | Detonación en Cadena · Flecha de Garfio | m4, m6, m14, m22 | La variante cambia **cómo** estalla (en cadena) o la vuelve un garfio que no estalla; los talentos **añaden** zarzales y cepos donde cae. Con Flecha de Garfio no hay Batida por la flecha: la build Presa usa Detonación en Cadena |
| **Cerco de Zarzas** | Jaula de Espinas · Señuelo de Zarzas | m3, m7, m10, m13, m17, m21, m27, m28 | Zarzal Creciente hace crecer el anillo base; con Jaula de Espinas (3 m sobre uno) no crece: ninguna build los junta. Bosque Vivo forma Cercos de la variante elegida |

**Nombres:** ningún nodo comparte nombre con una variante o una habilidad de la clase, ni con la Maga o el Guerrero (comprobado con `check-e2.mjs`; §14.2). En la etapa 2 se renombró «Aplomo» (el Guerrero lo usa) a **Quietud**, y la build híbrida del Montaraz pasó de «Acoso del Zarzal» a **Espinas de Caza** (chocaba con el nodo Acoso).

---

## 11. Implementación

### 11.1 Archivos

| Archivo | Qué cambia |
|---|---|
| `js/skills-arquera.js` | **Kit base:** `a_disparo`, `flecha_perforante`, `a_paso`, `a_humo` (req 12 → 6), `lluvia_flechas` (req 14 → 8). **Forja** (`variants`): `a_disparo` I = Disparo Disperso (absorbe `a_disperso`), II = Flecha de Cicuta (absorbe `a_cicuta`). **Tiradora** (`spec:'tiradora'`): `a_t_andanada` (pasa de talento a kit, con `recast`), `a_v_carrera` (NUEVA: `type:'channel'`, `hold`, `moveMul:1.4`, `autoShot`), `flecha_multiple` (req 8 → 14), `a_u_diluvio` (`follow:true`, 12 oleadas de 1,7). **Francotiradora** (`spec:'francotiradora'`): `a_t_apuntado` (pasa de talento a kit, `charge`), `a_f_rodilla` (NUEVA, `stance`), `a_f_rastreador` (NUEVA, `mark` con `firstCharged`), `a_u_celeste` (ventana de 8 s + `charge` por haz). **Montaraz** (`spec:'montaraz'`): `a_t_cepo` (pasa de talento a kit, `trap` + `lure`; II absorbe `a_red`), `a_m_acecho` (NUEVA: salto a la trampa + `detonate`), `a_m_detonante` (NUEVA, `detonate`; II absorbe `a_t_arpon`), `a_u_zarzas` (`at:'target'`; II absorbe `a_t_senuelo`). **Salen del libro:** `a_disperso`, `a_cicuta`, `agilidad` (pasa a talento), `a_red` (pasa a variante) |
| `js/talents-arquera.js` | `ARQUERA_TALENTS.cls` = c1–c30 nuevos; `tiradora` = v0–v28, `francotiradora` = f0–f28, `montaraz` = m0–m28 (ids nuevos, no pisan los `s*`/`x*` de hoy); árboles héroe `h1`–`h3` (q, w, y) con la estructura de la Maga. `ARQUERA_TALENT_SKILLS` = `a_t_camuflaje`, `agilidad` (`cat:'utility'`), `a_t_bengala`, `a_h_torbellino`, `a_h_puntas`, `a_h_halcon`. **Salen:** `a_t_voltereta`, `a_t_conmocion`, `a_t_silencio`, `a_t_danza`, `a_t_salto`, `a_t_vision`, `a_t_disuasorio`, `a_t_arpon` y `a_t_senuelo` (sus ideas viven en variantes o nodos, §3.1). El `innate:{ staggerPct:25 }` del Montaraz desaparece |
| `js/powers-arquera.js` | Los poderes NUEVOS de §6, §7 y §9 (`impl`). **Se retiran:** `a_tailwind`, `t_viento_cola`, `t_corona`, `t_rebote`, `t_slipstream`, `t_infinite`, `m_deadeye`, `f_aliento_cazador`, `f_herida_abierta`, `f_acechador`, `m_hunt`, `m_abrojos`, `m_cepo_doble`, `m_cepo_hierro`, `m_mina` (pasa a la variante Mina de Espinas), `m_lazo`, `m_ponzona`, `m_warden`, `m_extratrap`; **se sustituyen:** `t_andanada_impulsiva` → `t_salto_impulsivo`, `t_galechain` → `t_vendaval_encadenado`, `t_eyestorm` → `t_ojo_huracan`, `f_overpen` → `f_sobrepenetracion`, `f_patience` → `f_paciencia`, `f_impossible` → `f_disparo_imposible`, `f_weakspot` → `f_ojo_inmovil`, `m_greathunt` → `m_gran_caceria`, `m_thornweb` → `m_corazon_bosque`. Se conserva `a_camuflaje` |
| `js/spec-mechanics.js` | **Impulso:** pérdida quieta (`idleAfter: 2`, `idleRate: 10`) y `tv.galeT`. **Concentración:** `gainPerSec` 20 → 15, `perfectGain: 15` solo para Disparo Apuntado y los haces y `basicPerfectGain: 3` (NUEVOS; una ganancia por segundo como mucho), **Calma Absoluta** (`calmT: 5`, perfecto desde media carga, `chargeMul: 1.5` en Apuntado y haces; vuelve a 0) y **Respiro** (`calmLock: 7`, sin ganar), sin pérdida de rodillas (`keepInStance`). **Coto:** **Batida** (3 estallidos en 1 s → `dmgTaken: 15`, 6 s, `icd: 12`; `tv.batidaDur`, `tv.batidaPreyStagger`), un Racimo cuenta como una trampa, `preyMax` (Presas en Manada) |
| `js/ui-gauges-arquera.js` | Textos de `explain` y la demo de las tres barras: hoy el widget de Concentración enseña «Tiro Fijado» y «Apuntado al instante» (el nodo viejo s4) y el del Coto «Cepo: recarga» (§16.2) |
| `js/game-skills.js` | Tipos o claves genéricos nuevos (§11.2) |
| `js/field-entities.js` | Campo `m_zarzal` (2 m, ralentiza 40 %) para m6, m14, m21, m24 y m27; la estela de f8A |
| `js/hud-model.js` · `js/ui.js` | Feedback de los verbos en la ranura y junto al cursor (§11.2) |
| `js/save-schema.js` | Migración (§11.3) |

### 11.2 Tipos genéricos nuevos (motor) y su feedback de interfaz

Los cuatro primeros se **aprueban como propuesta** (decisión del dueño delegada, §17.1). Los tres últimos los añade la etapa 2.

| Tipo o clave | Claves | Comportamiento | Feedback (ranura · cursor · sonido) | Lo usa |
|---|---|---|---|---|
| **`recast`** (relanzar) | `recast:{ window:2, max:1, perfectLast:0.5 }` | Tras lanzar, la misma tecla abre una ventana de `window` s para `max` relanzamientos; el enfriamiento cuenta desde el primero. `perfectLast`: los últimos 0,5 s son «tiempo justo» | Anillo que se vacía alrededor de la ranura; número de relanzamientos; en los últimos 0,5 s el anillo se vuelve **dorado** y suena un «tic» | Andanada (v9, v19, v26); la ventana de Tiro Celestial (sin tiempo justo) |
| **`channel` + `moveMul`, `autoShot`, `drainPerSec`, `onRelease`** (Carrera) | `moveMul:1.4`, `autoShot:{ every:0.4, coef:0.45, target:'nearest'\|'maxHp' }`, `drainPerSec`, `onRelease` | La canalización con `hold` ya existe; esto le añade velocidad y disparos automáticos | Barra de canal en la ranura `1`; estela de viento; destello al soltar | Carrera del Viento |
| **`seq`** (secuencia del básico) | `seq:{ every:3, extra:{ count:2, spread:30, coef:0.6 } }` | Contador de básicos; en el N-ésimo añade proyectiles | 3 pips bajo la ranura `IZQ`; el 3.º brilla; cuerda más grave | Tercera Flecha (v5, v8) |
| **`charge`** (cargar y soltar) | `charge:{ min:0.3, max:1.5, coefAt:[[0.3,0.8],[0.8,1.6],[1.5,2.5]], perfect:[1.15,1.35], perfectMul:1.5, perfectCrit:true, moveMul:0.6, cancelOnDodge:true, fullCount }` · básico: `charge:{ max:1, perfect:[0.8,1], coefAdd:0.6, perfectMul:1, perfectCrit:true, speedFrom:'aspd', splitAdd:true }` · Tiro Celestial: `charge:{ max:0.8, perfect:[0.65,0.8] }` por haz | Mantener carga; soltar dispara con el coeficiente de la etapa; dentro de `perfect`, el soltado perfecto (+50 % y crítico y +15 de Concentración; el básico, solo crítico y +3). La ventana se escala con la velocidad de tensado (`chargeSpeed`, postura, Calma), que **no** toca al básico (`speedFrom:'aspd'`). `splitAdd`: con varias flechas, el `coefAdd` se reparte. `charge.instant` (f24) dispara a carga completa sin esperar | Barra de carga **junto al cursor** con la ventana dorada marcada; destello blanco y cuerda tensa al entrar en la ventana; «¡Perfecto!» al acertar. Con Calma Absoluta, toda la barra es dorada | **Francotiradora** (verbo principal); Cruzado del Guerrero (martillo cargado) |
| **`stance`** (postura) | `stance:{ dur:8, chargeMul:1.4, moveMul:0.5, keepGauge:'concentracion', endOnDodge:true, recastEnds:true }` | Modo con reglas propias hasta que acaba, la vuelves a pulsar o ruedas. `dur:Infinity` con Atalaya Eterna | Icono de rodilla en la ranura `2` con su tiempo; aro dorado a los pies de la heroína; candado sobre la barra de Concentración (no baja) | Rodilla en Tierra (f6, f7, f10, f13, f21, f24, f27) |
| **`lure`** (cebo de las trampas) | `lure:{ radius:6, eliteRadius:3, boss:false, speedMul:0.8 }` en el tipo `trap` | Los enemigos que no están en combate cercano caminan hacia la trampa armada más cercana | Hilos verdes desde la trampa hacia los atraídos; el contador del Coto parpadea | Cebo de Caza (pasiva del Montaraz) |
| **`detonate`** | `detonate:{ radius:3, coef:1, chain:0, perTarget:2 }` en un impacto o al llegar de un salto | Hace estallar las trampas propias en el radio (cada una con su variante); cada enemigo recibe como mucho `perTarget` estallidos por detonación; si estallan 3 en 1 s, el Coto lanza la **Batida** (una cada 12 s) | Las trampas alcanzadas parpadean en rojo 0,1 s antes de estallar; anillo de la Batida y sonido de cuerno de caza | Flecha Detonante, Salto de Acecho, Detonación en Cadena (`chain:6`) |
| `follow` en las lluvias | `follow:true` | La zona de `rain()` se recentra en la heroína en cada oleada | Círculo que se desliza con ella | Diluvio de Saetas |

### 11.3 Migración de guardados (con la de la Maga: v5 → v6, o v6 → v7 si la Maga ya ocupó la v6)

1. Todos los árboles de la Arquera son nuevos → se **liberan** todos los puntos y se recalculan con el ritmo común; se aplica el **Recomendado** de su especialización (Tiradora: «Tormenta de Plumas»; Francotiradora: «Disparo Imposible»; Montaraz: «Bosque Vivo»), con su Paragon si llega al Nv71, y el aviso «Migrado: revisa tus talentos».
2. Barra: `a_disperso` → `a_disparo` con la variante I; `a_cicuta` → `a_disparo` con la variante II; `a_t_voltereta`, `a_t_salto`, `a_t_disuasorio` → `a_paso`; `a_t_danza` → `a_v_carrera` (Tiradora) o `a_paso`; `agilidad` en la `1` → `a_paso`; `a_t_conmocion`, `a_t_silencio` → `a_humo`; `a_t_vision` → `a_f_rodilla` (Francotiradora) o `a_humo`; `a_red` → `a_t_cepo` con la variante II (Montaraz) o `a_humo`; `a_t_arpon` → `a_m_detonante` con la variante II (Montaraz) o se vacía; `a_t_senuelo` → `a_humo`. Las habilidades de kit de otra especialización (`flecha_multiple`, `a_t_andanada`, `a_u_diluvio`, `a_t_apuntado`, `a_u_celeste`, `a_t_cepo`, `a_u_zarzas`…) caen al kit base o vacían la `3`/`4`.
3. Forja: las variantes 2f que cambian de concepto vuelven a «sin elegir»; la Mejora se conserva si existe.
4. Soportes engarzados en habilidades que salen vuelven a `knownSupports`.
5. Aviso único: «Los talentos de la Arquera se rehicieron hasta el nivel 100. Te aplicamos el Recomendado; revísalo con N».
6. Test `tests/test-save-arquera2g.mjs`: Nv5, 10, 18, 40, 69, 70, 80 y 100 de cada especialización; idempotente; Maga y Guerrero intactos.

---

## 12. Banco de balance: modelo absoluto, impacto y riesgos

Tras el juicio de la etapa 2, las comparaciones dejan de ser metas normalizadas: salen de un **modelo de papel absoluto** (§12.1) con los supuestos escritos y **los mismos números que los datos**. Script: `modelo-e2fix.mjs` (scratchpad de la corrección; `--det` desglosa cada build por fuente y `--md` saca la tabla de §12.1). No sustituye al banco: en E3 se calibra con `node tests/balance-bench.mjs --report --seeds 5`.

| Cambio | Efecto esperado | Calibración (tras el juicio) |
|---|---|---|
| Flecha Múltiple solo de la Tiradora; Lluvia al Nv8 | Francotiradora y Montaraz pierden su segunda principal de área | Tienen la suya de Nv14 (Tiro Rastreador, Flecha Detonante) |
| Pasiva Tercera Flecha | +40 % de daño del básico (2 × 60 % cada 3 disparos) | El básico pone el 25–26 % del daño de la Tiradora contra un jefe (6 % en Galerna): bajo el 35 % |
| Pérdida del Impulso quieta | Castiga quedarse quieta (es el objetivo) | Que el Vendaval siga cerca del 50–60 % del tiempo kiteando |
| **Galerna Infinita** (v27) | La Carrera no se acaba sola, pero pasada su duración gasta 10 de Energía por segundo y 3 más cada segundo: ~6,5 s extra con 80 de Energía (~12,5 s en total) y luego 7 s de recarga. Nube de Paso (1 s por segundo) y Nube Fiel (cada 0,4 s) solo en los 6 primeros segundos de cada Carrera; Ciclones, 3 vivos; Economía Letal no abarata la Carrera | Diluvio: 16 % del daño contra un jefe y 26 % contra 5 (§12.3). Recarga efectiva del Diluvio ~32 s (antes ~17 s) |
| **Vaivén Eterno** (v26) | Durante el Vendaval, la Andanada vuelve sin recarga y a mitad de coste (1 vez, 2 veces o sin límite por rango); Último Instante +40 % (antes +80 %); Andanada Cerrada: 3 flechas por enemigo y salto | La mejor de la Tiradora contra un jefe (1566 %WD/s); Diluvio 11 %. Un relanzamiento no genera otra Andanada fuera de su ventana |
| **Manto de Niebla** (c28) | El humo te sigue; dentro, −25 % (antes −50 %) y cura 0,25 % de vida por rango y segundo. La Bomba se recarga **al disiparse**, así que no se solapa; la ceguera no se suma | Aguante (TTD+) ×1,35–1,40 de la media, bajo el ×1,5 pedido; humo puesto ~52 % del tiempo |
| Sombra Gemela | +15–20 % con Paso Veloz cada 6 s; repite Tiro Rastreador sin el perfecto gratis | La sombra no repite ecos ni a sí misma; 1 a la vez |
| **Cuerda Tensa** (pasiva) | El básico tensado hace hasta +60 % (antes +150 %); el perfecto da crítico seguro, no +50 %; con Disperso, el extra se reparte entre las flechas | El básico pone el 20–38 % del daño de la Francotiradora contra un jefe (Línea Mortal, 38 %: §12.3) |
| **Calma Absoluta** (f0, mecánica) | +15 de Concentración solo por perfecto de Disparo Apuntado o de un haz (uno por segundo); el básico, +3; tras la Calma, 7 s de Respiro sin ganar; en la Calma es perfecto lo tensado a media carga o más | Uso ~28 % sin el ápice y ~41 % con él (≤ 45 %); techo ~53 % con muertes de élite (§12.2) |
| **Disparo Imposible** (f26) | Solo Disparo Apuntado; la segunda sale al 15/25/35 % (antes al 100 %), crítica y con 20 de Quebranto; un doble por segundo | La mejor de la clase contra un jefe (1953 %WD/s, +10 % sobre el Arcanista: es el papel de la Francotiradora). Definitiva 12 % |
| **Atalaya Eterna** (f27) + Firmamento + Estrella Fija + Haces Gemelos | Haz gratis de 200 % cada 5 s (antes cada 4 s); Firmamento ×1,5 (antes ×2); Estrella Fija, 1,5 s y solo con Disparo Apuntado; Haces Gemelos al 15/30 % | Definitiva 21 % contra un jefe (12–22 %). Aguanta poco (§12.3) |
| Tiro Rastreador | Perfecto gratis una vez por blanco cada 8 s | La Sombra Gemela y la marca del halcón marcan, pero sin el perfecto gratis |
| **Cebo de Caza** + Batida | Batida +15 % (antes +20 %), una cada 12 s; un Racimo cuenta como una trampa; cada enemigo recibe como mucho 2 estallidos por detonación | Debilidad dentro del tope del juego (§12.2); el cebo no mueve a enemigos que ya pelean cuerpo a cuerpo |
| Acoso · Batida Mayor · Presa Herida | Acoso y Batida Mayor llenan **Quebranto** (ya no dan Debilidad); Presa Herida +10 % (antes +20 %) | Gran Cacería ~2,6 Quebrantos por minuto, cerca del techo del juego (§12.2) |
| **Rearme Rápido** (m18) y Salto de Acecho | Recarga 1–2 s **por detonación** (antes, por trampa); los cepos pequeños y sembrados no cuentan; el Salto no baja de 5 s | Sin bucle de salto y cepo (hallazgo 5, §18) |
| **Tierra Arrasada** (m25) | Solo siembran los cepos de Trampa de Cepo: 1–3 pequeños (30 %) por cepo, hasta 6 a la vez; los pequeños no siembran; Metralla solo de cepos de carga | Contra 5: 2408 %WD/s, el 91 % de la Tiradora (2646), no más |
| Bosque Vivo + Rebrote + Siembra de Espinas | Un Cerco gratis cada 8 s | Un solo Cerco gratis vivo; los jefes solo suman Quebranto (no se inmovilizan) |
| **Cerco de Zarzas** | Recarga 45 s (antes 55 s); dentro, veneno de 100 % por segundo; al cerrarse, 300 % | La definitiva del Montaraz pone el 9–14 % contra un jefe y el 12–22 % contra 5 |
| **Árboles héroe** | +9–14 % cada uno (§9.1) | En cada especialización, diferencia ≤ 5 puntos (3,5 · 3 · 2); los ecos (flecha de viento, picado, punta) no generan ecos |
| Carcaj Encantado | Punta cada 6 s (4 s con Encantamiento Rápido); Punta Repartida y Lluvia Encantada al 30 %; una punta por enemigo cada 1 s; la quemadura se renueva, no se suma | Sin multiplicar puntas con Flecha Múltiple ni con el Diluvio |
| Ecos (Lluvia en Retirada, Soltar y Disparar, Sombra Gemela, haz gratis, picado) | Riesgo de que se multipliquen | Un eco no genera otro (regla de la Maga) |

### 12.1 Modelo absoluto (%WD/s, Nv100)

**Supuestos** (todos en el script; cambiar uno cambia toda la tabla):

- **Unidad:** % del daño del arma por segundo (%WD/s). Cada fuente = coeficiente × impactos por uso × usos por segundo, y pasa por las capas de `js/combat-math.js`: saco aditivo (1 + **1,20 del equipo** + talentos), crítico **×1,5** con **25 %** de probabilidad (5 base + 10 de Ojo de Halcón + 10 del equipo; tope 60 %) y Debilidad (tope ×1,5). El modelo **no supone Vulnerable**.
- **Ritmo:** 1,5 acciones por segundo sin velocidad de ataque. **Energía:** 6 por segundo × 1,3 (Respiración Pausada) = 7,8; máximo 80 (Carcaj Profundo); 5 por impacto de Disparo Rápido (con Disperso, 12,5 contra un jefe y 15 contra 5).
- **Topes:** como mucho 3 impactos de un mismo lanzamiento sobre un enemigo (regla de la Maga); 2 estallidos de trampa por enemigo y detonación.
- **Escenarios:** «jefe» = un objetivo quieto, con la Presa, el Punto Débil o la marca puestos si la build los usa; «5» = cinco enemigos juntos (atraídos por el Cebo o por Vacío de Aire si la build los tiene; en fila para Línea Mortal). Sin desplazamientos ni muertes: el modelo no satura como el ÁREA del banco.
- **Proyección ×M:** la media de las tres recomendadas se iguala a la media de la Arquera de hoy en el banco (`MEMORIA.md`, matriz Nv50: jefe 0,98 = (0,90 + 1,21 + 0,83) / 3; 5 enemigos 1,04 = (1,27 + 0,89 + 0,96) / 3). Es una proyección, no una medida.
- **Aguante (TTD+):** tiempo hasta perder el 50 % de la vida contra 3 élites y 4 comunes cuerpo a cuerpo; sin defensas, una Arquera tarda 9 s; M = 12,5 s (media del banco). El humo está puesto ~52 % del tiempo (Bomba Rápida y Humo Denso; se recarga al disiparse).

| Especialización · build | Jefe (%WD/s) | 5 enemigos (%WD/s) | Frente a la mejor de su especialización (jefe · 5) | Proyección ×M (jefe · 5) | Definitiva (jefe) | Básico (jefe) | Árbol héroe (jefe · 5) |
|---|---|---|---|---|---|---|---|
| Tiradora · Tormenta de Plumas | 970 | 2646 | 0,62 · 1,00 | 0,71 · 1,25 | 15 % | 26 % | 5 % · 10 % |
| Tiradora · Vaivén Eterno | 1566 | 2106 | 1,00 · 0,80 | 1,14 · 1,00 | 11 % | 25 % | 15 % · 11 % |
| Tiradora · Galerna Infinita | 1318 | 2471 | 0,84 · 0,93 | 0,96 · 1,17 | 16 % | 6 % | 7 % · 18 % |
| Tiradora · Viento Cruzado | 1319 | 2433 | 0,84 · 0,92 | 0,96 · 1,15 | 10 % | 25 % | 16 % · 12 % |
| Francotiradora · Línea Mortal | 1154 | 2511 | 0,59 · 1,00 | 0,84 · 1,19 | 5 % | 38 % | 16 % · 11 % |
| Francotiradora · Disparo Imposible | 1953 | 1581 | 1,00 · 0,63 | 1,42 · 0,75 | 12 % | 27 % | 11 % · 10 % |
| Francotiradora · Atalaya Eterna | 1780 | 2251 | 0,91 · 0,90 | 1,29 · 1,06 | 21 % | 20 % | 12 % · 9 % |
| Francotiradora · Pulso de Hierro | 1546 | 2102 | 0,79 · 0,84 | 1,12 · 0,99 | 10 % | 35 % | 7 % · 7 % |
| Montaraz · Tierra Arrasada | 806 | 2408 | 0,46 · 1,00 | 0,59 · 1,14 | 9 % | 44 % | 6 % · 8 % |
| Montaraz · Gran Cacería | 1766 | 1925 | 1,00 · 0,80 | 1,28 · 0,91 | 11 % | 31 % | 18 % · 12 % |
| Montaraz · Bosque Vivo | 1120 | 2375 | 0,63 · 0,99 | 0,81 · 1,12 | 12 % | 38 % | 20 % · 23 % |
| Montaraz · Espinas de Caza | 1258 | 2124 | 0,71 · 0,88 | 0,91 · 1,00 | 14 % | 41 % | 7 % · 12 % |

**Comparación con la Maga** (mismas unidades: el ×M de hoy de cada especialización en el banco, Nv50, pasado a %WD/s con la misma ancla: jefe × 1348 / 0,98; 5 enemigos × 2201 / 1,04):

| | Contra un jefe (%WD/s) | Contra 5 (%WD/s) |
|---|---|---|
| Piromante (×0,94 · ×1,28) | 1293 | **2709** |
| Crionte (×0,93 · ×0,97) | 1279 | 2053 |
| Arcanista (×1,29 · ×0,87) | **1774** | 1841 |
| Tiradora: mejor build | 1566 (Vaivén Eterno) | **2646** (Tormenta de Plumas) |
| Francotiradora: mejor build | **1953** (Disparo Imposible) | 2511 (Línea Mortal, en fila) |
| Montaraz: mejor build | 1766 (Gran Cacería) | 2408 (Tierra Arrasada) |
| Media de las 3 recomendadas | 1348 | 2201 |

**Lectura.** (1) En área, la Tiradora queda un 2 % por debajo del Piromante y por encima de la Francotiradora (0,95) y del Montaraz (0,91). (2) Contra un jefe, la Francotiradora supera en un 10 % al Arcanista: es su papel. (3) El Montaraz es la especialización de control: su build de jefe (Gran Cacería) iguala al Arcanista y su recomendada (Bosque Vivo) queda en 1120 contra un jefe, pero con el mejor control y aguante de la clase. (4) Ninguna build es la mejor en jefe y en grupos a la vez. (5) Al rehacer el modelo en absoluto, la Francotiradora y el Montaraz salían **2 a 4 veces** por encima de la Tiradora (las tablas normalizadas lo escondían): los recortes están en §18.

### 12.2 Cuentas del juicio: Calma, Galerna, Debilidad, control y aguante

- **Calma Absoluta.** Llenar 100: quieta +15 por segundo, perfectos de Disparo Apuntado y haces ~+4 por segundo (uno cada ~4 s, +15) y básicos ~+2 → ~5 s. Ciclo = 5 s de llenado + 5 s de Calma + 7 s de Respiro ≈ 17 s → **~28–30 %** del tiempo. Con el ápice (8 s de Calma, salta a 80) ≈ 20 s → **~41 %**. Con muertes de élite (+50 cada una, ápice 2) llega a **~53 %** en grupos; contra un jefe no hay muertes. Antes del juicio, el básico perfecto (+15 cada 0,7 s) la encadenaba sin pausa.
- **Galerna Infinita.** Coste extra: 10, 13, 16, 19, 22… por segundo → 80 de Energía duran 5 s, y con la regeneración (7,8 por segundo) ~6,5 s. Carrera de ~12,5 s + 7 s de recarga → corres el ~64 % del tiempo. El Diluvio se recarga ~1,6 veces más rápido (Nube de Paso 6 s por Carrera y Ojo del Huracán 4 s por Vendaval): recarga efectiva ~32 s.
- **Debilidad** (`js/combat-math.js`): `DEB = min(WEAKNESS_CAP 1,5; 1 + (Vulnerable 20 + Σ Debilidades) / 100)`. Fuentes de la Arquera: Batida 15 (una cada 12 s; con Batida Mayor dura 9 s), Presa Herida 10, Flecha Bengala 15 y Herida Expuesta 12. El máximo de una Arquera sola (Montaraz con Bengala) es 15 + 10 + 15 = 40; con Vulnerable, 60 → **topado en 50** (×1,5). Acoso y Batida Mayor ya no suman Debilidad (dan Quebranto), así que dos Arqueras o una Arquera con un Crionte ya no se pasan del tope solo con nodos.
- **Quebranto** (`STAGGER_MAX` 100; Quebrantado 4 s y bloqueado 15 s después): el techo del juego es ~3,2 por minuto. Gran Cacería llena la barra en ~4 s (cada trampa que pisa la Presa: 25 de Presa Herida + 30 de Acoso; Batida Mayor 30; Llamada del Halcón 30) → **~2,6 por minuto**. Espinas de Caza ~2,4; Bosque Vivo ~2,1; Tierra Arrasada ~1,8.
- **Control contra 5** (estimación de diseño, sin modelo; se mide en E3 con la fila CONTROL del banco, que hoy da al Montaraz 0 / 13 / 52 % y al Crionte 29 / 29 / 73 %): Bosque Vivo, enemigos lentos ~85 % del tiempo e inmovilizados ~45 % (Cerco gratis de 4 s cada ~8 s y zarzales); Espinas de Caza ~70 % lentos; Tierra Arrasada ~55 % (las trampas armadas frenan con el ápice); Gran Cacería ~45 %.
- **Aguante (TTD+, ×M):** Bosque Vivo 1,40 · Disparo Imposible 1,36 · Galerna 1,35 · Tierra Arrasada 1,35 · Tormenta de Plumas 1,33 · Pulso de Hierro 1,31 · Espinas de Caza 1,20 · Vaivén Eterno 1,19 · Viento Cruzado 0,94 · Línea Mortal 0,93 · Gran Cacería 0,87 · Atalaya Eterna 0,78. Nadie pasa de ×1,5 (el humo perpetuo de antes llegaba a ×2,5).

### 12.3 Riesgos que quedan (vigilar en E3)

1. **Atalaya Eterna aguanta poco** (×0,78; el banco pide ≥ 0,85 a la Francotiradora): con **Parapeto** en vez de Rodilla Firme sube a ~×1,1 y pierde ~4 % de daño. Si E3 lo confirma, la build pasa a Parapeto.
2. **Definitiva contra 5** por encima del 22 %: Galerna 26 % y Atalaya 24 % (contra un jefe, 16 % y 21 %). La regla de 2e se mide contra el jefe; si el banco la mide también en área, Nube Fiel pasa a 0,45 s.
3. **Definitiva baja contra un jefe** en builds de área: Línea Mortal 5 %, Tierra Arrasada 9 %, Viento Cruzado y Pulso de Hierro 10 %, Vaivén Eterno 11 % (es la de jefe de la Tiradora: en el borde).
4. **Básico por encima del 35 %**: Línea Mortal 38 % contra un jefe, y el Montaraz entero (31–44 %; Flecha de Cicuta). El Montaraz no tenía regla de básico; si el banco se la pone, Cicuta baja y Flecha Detonante sube.
5. **Línea Mortal en fila ideal**: contra 5 en fila hace el 95 % de la Tiradora; en grupos sin alinear, ~60 % de eso. Si en E3 pasa de 0,90 de la Tiradora, Saetas Paralelas baja.
6. **Gran Cacería** iguala al Arcanista contra un jefe siendo de control (pregunta al dueño, §17.2).
7. **Híbridas por escenario**: en jefe o en grupos quedan a 8–29 % de la mejor (en mixto, a 2–11 %). Pregunta al dueño (§17.2).
8. La Tiradora puede depender demasiado de moverse en salas pequeñas: la Carrera y los saltos la sacan de ahí.
9. El relanzamiento y la ventana dorada exigen destreza: Ida y Vuelta, Pulso Quieto y Lectura del Blanco son las opciones de menos precisión, y la Calma Absoluta da perfectos desde media carga.
10. Mantener teclas mientras mueves con WASD (Carrera, tensar): probar la ergonomía en E4 (alternativa: pulsar para empezar y otra vez para soltar).
11. El cebo puede hacer el juego demasiado fácil en mazmorras estrechas: su radio baja a 4 m si E4 lo pide.

---

## 13. Criterios de aceptación (comprobables), adaptados

| # | Criterio | Cómo se comprueba |
|---|---|---|
| G1 | Ningún nodo de clase toca o nombra una habilidad de especialización (las 12 de los tres kits) | Validador + `test-arquera-coherencia` |
| G2 | Solo c11A, c17A, c22A, q4A, w4A e y4A conceden habilidades; todas caben solo en la `2` | Validador + test con `fitsSlot` |
| G3 | Ritmo: ningún árbol se completa (clase < 53, especialización < 59, Paragon < 13, tablero < 81) | Validador |
| G4 | Presupuesto: un final al máximo cabe (clase Nv69, especialización Nv60, con ápice Nv68); dos no | Validador (§4.4) |
| G5 | Paragon sin efecto mientras la especialización no esté 31/31; clave gratis al abrirse | Test |
| G6 | Formas: círculo, hexágono y cuadrado según el tipo | `?talentscheck=1` + capturas |
| G7 | Textos ≤ 120 caracteres, sin siglas, sin *stagger*, *proc* ni «c/u»; cada elección con «cuál conviene» | Validador + `check-e2fix.mjs` |
| G8 | Las 12 builds son legales comprando punto a punto (34/31/1+10) | Validador |
| G8b | Los puntos de una build van a habilidades de su barra | `check-e2fix.mjs` (barra de cada build) |
| G9 | Banco: en cada especialización un arquetipo gana contra grupos y otro contra jefes; la híbrida **no es la mejor** contra jefes, contra grupos ni en contenido mixto, y en mixto queda a ~10 % de la mejor (modelo: 2, 10 y 11 %). La regla por escenario queda para el dueño (§17.2) | Modelo de §12.1 + `balance-bench --seeds 5` |
| G10 | Motion con solo `transform`, `opacity`, `clip-path` y `stroke-dashoffset`; respeta «reducir movimiento» | Revisión de CSS |
| G11 | Migración correcta e idempotente | `test-save-arquera2g` |
| G12 | `npm test` en verde | `npm test` |
| G13 | Paragon en pausa con la especialización por debajo de 31/31 | Test |
| G14 | Hexágono: el clic derecho en el icono quita el punto con el flotante abierto | Demos `rclick` y `pick` (§14) |
| G15 | Categorías visibles: Básica · Principal · Movilidad · Defensa · Utilidad · Insignia · Definitiva | `grep -ri astadora js/` vacío |
| G16 | Rejilla común: las tres especializaciones tienen la misma forma | Validador |
| G17 | **Verbos:** cada especialización usa ≥ 3 verbos en su kit, no comparten el principal (moverse disparando · cargar y soltar · colocar y detonar) y cada verbo tiene su feedback (anillo de `recast`, barra de canal, pips de `seq`, barra de `charge`, aro de `stance`, hilos de `lure`, anillo de la Batida) | Test de `hud-model` (`slotView`) + capturas |
| G18 | **Paragon:** 3 árboles temáticos de la clase; cada especialización en 2; cada build con 10 nodos; aporte +9–14 % y diferencia ≤ 5 puntos entre los dos árboles de cada especialización (modelo: 3,5 · 3 · 2) | Validador + modelo de §12.1 + banco |
| G19 | **Topes del juicio:** Calma Absoluta ≤ 45 % del tiempo con el ápice; definitiva 12–22 % contra un jefe en las builds de jefe y las equilibradas; aguante ≤ ×1,5 de la media; Debilidad dentro de `WEAKNESS_CAP`; ninguna recarga en bucle (Rearme por detonación, Salto ≥ 5 s, Andanada a mitad de coste) | Modelo de §12.1–§12.2 + banco (E3) |

---

## 14. Mockup, validación, capturas y refutaciones

### 14.1 Uso

`docs/mockups/skills-ux.html?cls=arquera&view=talents` (como `file:///`). Parámetros: `&spec=tiradora|francotiradora|montaraz`, `&lvl=5|10|40|69|100`, `&loadout=plumas|vaiven|galerna|cruzado|perforacion|puntodebil|vigia|pulso|campo|caceria|zarzal|espinas`, `&tipnode=cls:c6|spec:f9|hero:q4`, `&tipskill=a_t_apuntado`, `&alt=1`, `&demo=spec|rclick|pick|…` y `&res=1366|1920`.

### 14.2 Validación

- **Tras la corrección de la etapa 2** (§18): `validar-talentos.mjs arquera` → **Todo en regla, 0 errores y 0 avisos** (mismos porcentajes de mecánica: 75 %, 86 %, 90 % y 90 %; los nueve finales a Nv60, con ápice a Nv68; las 12 builds legales, Gran Cacería con Llamada del Halcón). `--todas` → Maga (sus 3 avisos de siempre), Guerrero y Arquera en regla. `check-e2fix.mjs` (scratchpad, `…\scratchpad\talentos-arquera\check-e2fix.mjs`; barra de Gran Cacería con `a_h_halcon` en la `2`) → **0 errores y 0 avisos**; textos más largos: v0, f0 y w0 con 119 caracteres; del libro, Bomba de Humo y Rodilla en Tierra con 118. Voseo: ninguno en los datos ni en el documento.
- Etapa 2 (antes del juicio): `node docs/mockups/data/validar-talentos.mjs arquera`: **Todo en regla, 0 errores y 0 avisos.** Clase 30/53 (75 % de mecánica en filas 3–9), Tiradora, Francotiradora y Montaraz 29/59 (86 %, 90 % y 90 %), los nueve finales a Nv60 y con ápice a Nv68, dos finales imposibles, los tres árboles héroe de 13 nodos, las 12 builds 34/34 · 31/31 · 1 + 10 en orden legal, cada final de clase y de especialización usado por alguna build, y todos los iconos existen.
- `node docs/mockups/data/validar-talentos.mjs --todas`: Maga, Guerrero y Arquera en regla (los 3 avisos de la Maga son suyos: `reco` con habilidades que no están en su catálogo).
- `check-e2.mjs` (scratchpad, `…\scratchpad\e2\check-e2.mjs`): corre aparte del validador oficial (que no se tocó) y comprueba nombres repetidos con la Maga y el Guerrero, textos del libro, la mecánica y la pasiva (≤ 120, sin siglas ni «pendiente»), y **G8b** con la barra de cada build (incluidas las activas de clase y de héroe en la ranura `2`) → **0 errores y 0 avisos**. Texto más largo de la etapa 2: y4A con 117 caracteres; del libro, Andanada con 114.
- `voseo.mjs` (scratchpad): ninguna forma de voseo ni de segunda persona del plural en los datos ni en este documento.

### 14.3 Capturas de la etapa 1

En `C:\Users\juanm\AppData\Local\Temp\claude\D--Proyectos-IntentoRPG\6ead5cf3-f7a8-4c53-8c4f-4d18d352840c\scratchpad\talentos-arquera\`, cada una a 1366 y 1920 (`final_<vista>_<ancho>.png`): Tiradora Nv100, híbrida con `Alt`, hexágonos v9, c6 y c11, demos de clic derecho y elección, Paragon en gris, Nv40 y Nv10, selector y libro de la Tiradora. Las de Francotiradora y Montaraz de esa etapa muestran los esqueletos (superados).

### 14.4 Capturas de la etapa 2

Misma carpeta, prefijo **`e2_`**, cada una a 1366 y 1920 (`e2_<vista>_<ancho>.png`; script `capturas-e2.ps1`):

| Vista | Muestra |
|---|---|
| `e2_tal_francotiradora_100` · `e2_tal_montaraz_100` | Las dos especializaciones nuevas a Nv100 con su build recomendada (Disparo Imposible + Halconera; Bosque Vivo + Carcaj Encantado) |
| `e2_tal_vaiven_100` · `e2_tal_galerna_100` · `e2_tal_vigia_100` · `e2_tal_tiradora_100` | Builds nuevas de la Tiradora (Vaivén Eterno con Danza del Arco; Galerna Infinita con Manto de Niebla) y la Vigía de la Francotiradora |
| `e2_tal_pulso_alt` · `e2_tal_espinas_alt` | Las híbridas con `Alt` y el tooltip del híbrido de los tres (Serenidad, Coto Cerrado) |
| `e2_tal_eleccion_f9` · `e2_tal_eleccion_m8` · `e2_tal_apice_f28` | Hexágonos abiertos encima del icono y el ápice |
| `e2_tal_perforacion_heroe_q4` · `e2_tal_campo_heroe_w4` · `e2_tal_caceria_heroe_y8` | Los tres árboles héroe con un hexágono abierto (q4 con la activa Torbellino en cuadrado) |
| `e2_tal_paragon_gris_69_franco` · `e2_tal_paragon_gris_69_montaraz` · `e2_tal_montaraz_nv40` | Paragon en gris con las tarjetas de sus dos árboles héroe; progreso a Nv40 |
| `e2_selector` | Selector con las tres tarjetas completas (sin ESBOZO) |
| `e2_libro_francotiradora` · `e2_libro_montaraz` · `e2_libro_tip_apuntado` · `e2_libro_tip_rodilla` · `e2_libro_tip_cepo` · `e2_libro_tip_detonante` · `e2_libro_tip_acecho` | Libro: kits nuevos, pasivas, barras de mecánica reales, forja y tooltips |

**Tras la corrección de la etapa 2** (§18): las mismas 25 vistas y 13 nuevas con prefijo **`e2fix_`** (`e2fix_<vista>_<ancho>.png`, 1366 y 1920; 76 archivos). Revisadas a ojo las 13 nuevas (a 1366 y, varias, a 1920) y una muestra de las demás: sin desbordes, tooltips dentro de la ventana y textos nuevos a la vista. Quedan a la vista dos cosas que no son de esta corrección: el widget real del Coto aún dice «Cepo: recarga» (§16.2, 4) y el chip «Daño» del libro multiplica el coeficiente por el rango (Disparo Apuntado 350 % a rango 5).

| Vista nueva | Muestra |
|---|---|
| `e2fix_tal_vaiven_v26` · `e2fix_tal_galerna_v27` | Vaivén Eterno a mitad de coste («sin límite» a rango 3) y Galerna con el coste creciente |
| `e2fix_tal_imposible_f26` · `e2fix_tal_vigia_f27` | La 2.ª de Disparo Imposible al 35 % y Atalaya Eterna con el haz de 200 % cada 5 s |
| `e2fix_tal_campo_m18` · `e2fix_tal_zarzal_c28` | Rearme Rápido por detonación (Salto ≥ 5 s) y Manto de Niebla (−25 %, antes 50 %) |
| `e2fix_tal_caceria_heroe_y4` · `e2fix_tal_puntodebil_heroe_y10` | Gran Cacería con Llamada del Halcón elegida (ceguera y 30 de Quebranto) y Ojo Compartido como mecánica |
| `e2fix_libro_tip_disparo_franco` · `e2fix_libro_tip_rastreador` · `e2fix_libro_tip_carrera` · `e2fix_libro_tip_andanada` · `e2fix_libro_tip_zarzas` | Libro: Disparo Apuntado (80–250 %, Tiro Pesado 300 %), Tiro Rastreador (un perfecto cada 8 s), Carrera, Andanada (45 %) y Cerco de Zarzas (45 s, 100 %/s, 300 %) |

### 14.5 Refutaciones de la etapa 1 (tres rondas)

**Ronda 1** (diseño y capturas `r1_*`).

| Crítica | Cambio |
|---|---|
| Nombres repetidos dentro de la clase: nueve con «Viento», tres «Ritmo», tres «Carcaj», dos «Instinto», cinco «Rod…» | Renombrados (Vendaval Largo, Fondo de Corredora, Saetas Afiladas, Vacío de Aire, Piel de Brisa, Pies Ligeros, Blanco Fijo, Mano Llena, Remate Triple, Recarga en Marcha…) |
| c23 contaba **flechas**: la Tiradora recargaba Paso Veloz y humo sin parar | Cuenta **habilidades principales lanzadas** y recarga 0,3/0,6 s |
| Las builds compraban nodos de habilidades que no llevan en la barra | Órdenes rehechos; nuevo criterio G8b |
| La pasiva «sale triple» era ambigua con Disparo Disperso | «2 flechas más» (con Disperso, 3 + 2) |
| «Al soltar la Carrera» no cubría que se acabe sola; Tiro desde la Niebla alargaba el humo sin tope | «Al soltar o acabar»; tope de +4 s |

**Ronda 2.**

| Crítica | Cambio |
|---|---|
| v9: **Ida y Vuelta dominaba** a Último Instante también contra jefes | Último Instante +80 % y 20 de Impulso; la 3.ª de Ida y Vuelta al 70 % (el juicio de la etapa 2 lo bajó a +40 %, §18) |
| **Sombra Gemela** repetía todos los disparos 4 s con Paso cada 6 s (≈ +43 %) | 3 s y solo las principales al 30/45/60 % (≈ +15–20 %) |
| Ciclones no decía cada cuánto disparan; el Diluvio «a 4 m de ti» era ambiguo | «Dispara cada 0,5 s»; «descarga en 4 m a tu alrededor» |
| Las dos builds compraban c9 (Flecha Perforante) sin llevarla | Reordenadas |
| Textos de la Bengala y de Agilidad | Reescritos |

**Ronda 3** (choques con las otras clases y capturas `r2_*`).

| Crítica | Cambio |
|---|---|
| Casi repetidos con el Guerrero: Segundo Aire / Segundo Aliento, Zancada Larga / Zancada, Cuero Curtido / Curtido, Ritmo de Caza / Ritmo de Combate | Huida Desesperada, Galope, Difícil de Alcanzar, Danza del Arco |
| Calcos de la Maga en nodos del mismo papel | Paso de Gacela, Paso Sanador |
| «Esquiva en Carrera» (c8) chocaba con la variante «Carrera Esquiva» | Difícil de Alcanzar |
| Interfaz | Sin desbordes a 1366 ni a 1920 |

### 14.6 Refutaciones de la etapa 2 (tres rondas)

**Ronda 1** (diseño, antes de las capturas).

| Crítica | Cambio |
|---|---|
| **Presa Atrapada** (m5) decía «no se gasta»: un élite inmovilizado encima volvía a pisar el cepo al soltarse (inmovilización perpetua) | Estalla y **te devuelve una carga** de Trampa de Cepo |
| El **soltado perfecto** daba premios distintos: el básico, solo crítico; Tiro Celestial, solo +50 % | Una sola regla para las tres: **+50 % y crítico** (y 15 de Concentración) |
| Tiro Rastreador no aclaraba si el perfecto gratis valía para un disparo o para los 8 s (con Disparo Imposible, todo dispararía doble) | «Tu **primer** disparo tensado contra él es perfecto»; el Punto Débil dura 8 s para los nodos |
| **Presa Señalada** (y3) regalaba el perfecto gratis cada 6 s y dejaba sin uso a Tiro Rastreador | La marca del halcón cuenta como Punto Débil **sin el perfecto gratis** |
| «Aplomo» ya existe en el Guerrero (t3) | **Quietud** |

**Ronda 2** (balance e interfaz, capturas `e2_r1_*`).

| Crítica | Cambio |
|---|---|
| En el libro, Red de Caza decía «(absorbe a Red de Caza)» dentro de su propio texto; igual Flecha de Garfio y Señuelo de Zarzas | «Absorbe a…» pasa al detalle técnico (`k`, con `Alt`) |
| Errante del Viento daba a la Francotiradora ~+45 % (3 flechas al 80 % por Disparo Apuntado) frente a ~+35 % de la Halconera | Flechas de viento al **60 %** |
| Carcaj Encantado quedaba por debajo de los otros dos | La quemadura de la punta de Fuego sube de 120 % a **150 %** |
| La build híbrida del Montaraz se llamaba «Acoso del Zarzal», como el nodo Acoso | **Espinas de Caza** |
| Ningún nodo modificaba **Salto de Acecho** (el verbo «movimiento rápido» del Montaraz quedaba sin árbol) | **Rearme Rápido** (m18) recarga también el salto |

**Ronda 3** (verbos, otras clases e interfaz final, capturas `e2_*`).

| Crítica | Cambio o conclusión |
|---|---|
| ¿Comparten verbo principal? La Tiradora relanza la Andanada y el Tiro Celestial tiene una ventana de 8 s | El Tiro Celestial no premia el tiempo de la segunda pulsación: cada haz **se tensa** (§16.1); el verbo es cargar y soltar |
| ¿El Montaraz «marca y detona» como la idea de la etapa 1? La marca es la Presa y lo que se detona son las **trampas** | Verbo principal: **colocar y detonar** el terreno; la Presa es un verbo secundario |
| ¿Algún árbol héroe premia solo a una especialización? Errante del Viento (viento = moverse) | Las Ráfagas se ganan **por tiempo**; q2 elige moverte (A) o quedarte quieta (B) |
| El widget real de Concentración (del juego) enseña textos viejos: «Tiro Fijado» y «Apuntado al instante» | No se puede tocar desde aquí: nota para el integrador (§16.2) |
| Interfaz | Sin desbordes a 1366 ni a 1920; selector sin ESBOZO; los tres Paragon en gris enseñan sus dos árboles; los hexágonos héroe se abren encima del icono |

**Preguntas de la plantilla (etapa 2):**
- ¿Alguna elección es claramente superior? Cada fila 3 tiene una opción contra grupos y otra contra jefes con su «cuál conviene»; f9 y m9 cambian de verdad la forma de jugar (marca que salta frente a premio doble; varias Presas frente a una).
- ¿Hay relleno? Los nodos de número son ≥ +10 % en su eje (Francotiradora 2 de 21 en filas 3–9; Montaraz 2 de 21).
- ¿Nombres repetidos? Ninguno exacto dentro de la clase, con la forja, la Maga o el Guerrero (`check-e2.mjs`).
- ¿Textos > 120 o siglas? No (máximo 117).
- ¿Las 3 especializaciones se juegan distinto? Sí: corre, se planta o prepara el terreno (§7.3).
- ¿La interfaz se desborda? No.

---

## 15. Iconos y arte para Codex

Hoy el mockup reutiliza iconos viejos (el validador no avisa de ninguno porque todos existen). Arte crudo en `D:\Proyectos\IntentoRPG-assets` según el pipeline de Codex. Estilo de `assets/talents` (128 y 256 px, fondo oscuro). Paleta: clase en ámbar y verde bosque; Tiradora en turquesa y oro; Francotiradora en oro y negro; Montaraz en verde musgo y hierro.

**Ojo con los nombres:** `talents/arquera-clase-c1…c15.webp`, `arquera-francotiradora-s0…s17/x1…x3` y `arquera-montaraz-s0…s17/x1…x3` ya existen con el significado **viejo** (los usa el juego de hoy). Los nuevos van con prefijo o id propio para no pisarlos; al integrar, el `icon` de cada nodo apunta a ellos.

| Archivo | Qué dibujar |
|---|---|
| `talents/arquera-v2-clase-c1…c30.webp` (30) | Los 30 nodos de clase (lista de la etapa 1): destacan **Manto de Niebla** (arquera dentro de una nube que la sigue), **Danza del Arco** (arco girando con cinco marcas) y **Sombra Gemela** (arquera y su sombra disparando juntas) |
| `talents/arquera-tiradora-v0…v28.webp` (29) | Los nodos de la Tiradora: destacan **Impulso** (rosa de los vientos), **Tormenta de Plumas**, **Vaivén Eterno**, **Galerna Infinita** y **Ojo del Huracán** |
| `talents/arquera-francotiradora-f0…f28.webp` (29; los ids `f*` no pisan los `s*`) | Mira Serena (ojo dorado en calma), Punta de Barrena, Ojo Paciente, Cuerda Ligera, Sobrepenetración, Línea de Mira, Pulso Quieto, Guardia Larga, Estela Explosiva / Doble Impacto, Marca Saltarina / Punto Vital, Salva de Vigía / Paciencia de Vigía, Fila Rota, Lectura del Blanco, Puntería de Vigía, Estrella Fija, Quietud / Nervios de Acero, Serenidad, Haces Gemelos, Rebote Certero, Herida Expuesta, Vista Larga, Firmamento, Saetas Paralelas, Herida sobre Herida, Ojo Entrenado, **Línea Mortal** (haz que cruza una fila), **Disparo Imposible** (dos flechas sobre la misma diana), **Atalaya Eterna** (arquera de rodillas bajo haces que caen), **Ojo Inmóvil** (ápice) |
| `talents/arquera-montaraz-m0…m28.webp` (29) | Coto de Caza (tres cepos en un claro), Muelles Ligeros, Olfato de Presa, Raíz Rápida, Pólvora Negra, Presa Atrapada, Cerco a la Presa, Raíces Profundas, Racimo de Cepos / Cepo Reforzado, Presas en Manada / Presa Herida, Zarzal Creciente / Zarzal Asfixiante, Metralla, Acoso, Espino Venenoso, Semillas de Zarza, Cepo de Huida / Guarida, Coto Cerrado, Zarzas Trepadoras, Rearme Rápido, Rastro Fresco, Ojo de Trampera, Rebrote, Campo Sembrado, Batida Mayor, Siembra de Espinas, **Tierra Arrasada** (suelo sembrado de cepos que estallan), **Gran Cacería** (cepos saltando alrededor de una bestia), **Bosque Vivo** (zarzales que se unen en un anillo), **Corazón del Bosque** (ápice) |
| `talents/hero-errante.webp` · `hero-carcaj.webp` · `hero-halconera.webp` (3) + `talents/arquera-h1-q0…q12`, `-h2-w0…w12`, `-h3-y0…y12` (39) | Emblemas: rosa de los vientos con una pluma; carcaj con tres puntas de Fuego, Hielo y Rayo; halcón en picado sobre un guante. Nodos: los de §9 |
| `icons256/a_t_apuntado.webp` · `a_f_rodilla.webp` · `a_f_rastreador.webp` · `a_t_cepo.webp` · `a_m_acecho.webp` · `a_m_detonante.webp` | Habilidades: arquera tensando un arco largo con la cuerda dorada; arquera de rodillas con el arco cruzado; flecha que deja una diana luminosa; cepo de hierro abierto; arquera saltando sobre un cepo que estalla; flecha con mecha encendida. Hoy usan `a_p_punteria` e iconos de nodos viejos |
| `icons256/a_h_torbellino.webp` · `a_h_puntas.webp` · `a_h_halcon.webp` | Activas héroe: torbellino que levanta hojas; carcaj desbordado de puntas de colores; halcón atacando con las garras abiertas |
| `forge/v_<id>_i.webp` y `_ii.webp` (34) | Variantes del kit base y de los tres kits: las 18 de la etapa 1 y Tres Saetas, Tiro Pesado, Puesto Fijo, Parapeto, Rastreo Múltiple, Grillete, Lluvia Estelar, Haz Único, Mina de Espinas, Red de Caza, Acecho Enredador, Doble Acecho, Detonación en Cadena, Flecha de Garfio, Jaula de Espinas, Señuelo de Zarzas (hoy, el arte genérico de su papel) |

---

## 16. Lo que la etapa 2 respetó de la etapa 1, y notas para el integrador

### 16.1 Decisiones de la etapa 1 (§16 de entonces) y cómo se cumplieron

| Pedido de la etapa 1 | Cómo quedó |
|---|---|
| **Moverse disparando** no puede ser el principal de otra; la Francotiradora, **plantada** | Francotiradora: la Concentración se gana quieta y se pierde al moverte; postura Rodilla en Tierra |
| Otra puede canalizar, pero **quieta o lenta** (`moveMul` < 1) | Tensar mueve al 60 %; de rodillas, al 50 % |
| Si se conserva el Tiro Celestial, que cada haz **se cargue**, no que se relance a tiempo | Cada haz se tensa 0,8 s con su ventana dorada; la ventana de 8 s no tiene «tiempo justo» |
| No repetir «cada 3.er básico» en otra pasiva | Cuerda Tensa (tensar) y Cebo de Caza (atraer): ninguna cuenta disparos |
| El Montaraz coloca zonas **fijas** | Cerco de Zarzas donde apuntas y zarzales fijos; nada lo sigue |
| El Disparo Disuasorio se parece al salto de la Andanada | Sale; su empuje vive en A Bocajarro (c6A) |
| Pasiva **nueva** del Montaraz | **Cebo de Caza** |
| Nombres reservados (§16.3 de la etapa 1), sin «Sombra…» ni «Ritmo…» | Respetados (comprobado con `check-e2.mjs`) |
| Prefijos `f`, `m`, `q`, `w`, `y`; solo la clase empieza por `c` | Respetados |
| No mover habilidades del kit base | Respetado |
| Alguna build debe usar **Manto de Niebla** | Galerna Infinita (Tiradora) y Bosque Vivo (Montaraz) |

### 16.2 Notas para el integrador (no se tocaron el HTML, el validador ni el juego)

1. **Validar por etapas:** ya no hace falta (la clase está completa y el validador oficial pasa).
2. El contrato no tiene un campo para el **verbo** de una habilidad. Propuesta: `verb:'hold'|'recast'|'seq'|'charge'|'stance'|'trap'|'detonate'` opcional, para que el libro pinte el chip y la barra de carga, el anillo de ventana o el aro de postura en su tooltip.
3. El validador no comprueba que los puntos de una build vayan a habilidades de **su barra** (G8b): lo hace `check-e2.mjs` con barras escritas a mano. Propuesta: campo `bar` opcional en la build (`{ lmb, rmb, k1, k2, k3, k4 }`) para que el validador lo compruebe y el mockup la aplique con la build.
4. El **widget real** de Concentración del juego (`js/ui-gauges-arquera.js`) enseña en su demo «Tiro Fijado» y «Apuntado al instante» (el nodo viejo s4), y el del Coto «Cepo: recarga». Al implementar, su `demo` y su `explain` deben decir **Calma Absoluta** y **Batida**.
5. El nombre de la mecánica «**Concentración**» (del juego) coincide con el nodo e10 de la Escriba Rúnica de la Maga. No es un error del validador (no compara entre clases ni nombres de mecánica), pero conviene decidir si se renombra uno de los dos.
6. Las builds reutilizan órdenes de clase con constantes (`CLS_DANZA_HUMO`, `CLS_MANTO`, `CLS_SOMBRA`, `CLS_DANZA_PASO`, `CLS_DANZA_PERF`) copiadas con `{ ... }` antes de `normBuild` (que es idempotente y no comparte estado entre builds).
7. Las tres activas de árbol héroe llevan `hero:true` y `req:72`, igual que las de la Maga.
8. **Claves nuevas de los tipos genéricos** tras el juicio: `charge` del básico (`max:1`, `coefAdd:0.6`, `perfectMul:1`, `perfectCrit:true`, `speedFrom:'aspd'`, `splitAdd:true` con Disperso); `detonate.perTarget:2`; mecánica `concentracion` con `perfectGain:15` (solo Disparo Apuntado y haces, uno por segundo), `basicPerfectGain:3`, `calmT:5`, `calmLock:7` y perfecto desde media carga en la Calma; `coto` con `batidaIcd:12` y Racimo = 1. El `explain` de cada barra (§16.2, 4) debe salir de estos números.
9. **Topes por enemigo:** las puntas encantadas (una por enemigo cada 1 s), Punta Repartida y Lluvia Encantada necesitan un `icd` **por enemigo**; si `definePower({ icd })` solo es global, hace falta una variante por objetivo.
10. **Finales por rango:** el validador no avisa si un final cambia de comportamiento a rango 1 sin escalar (hallazgo 13). Propuesta: aviso cuando el texto de un final no depende de `r`.
11. **Modelo absoluto:** `modelo-e2fix.mjs` (scratchpad) lleva los supuestos (`SUP`) y los números de diseño (`K`) que usan los datos. Al implementar, los `K` deben coincidir con `skills-arquera.js` y `powers-arquera.js`, y el banco (`balance-bench --report`) sustituye al modelo; si el banco usa una sola build por especialización (`LOADOUT`), ver §17.2, 8.
12. **Builds con activa de héroe:** Gran Cacería lleva Llamada del Halcón (`a_h_halcon`) en la ranura `2`; con el campo `bar` propuesto en la nota 3, el mockup la pondría solo al aplicar la build.

---

## 17. Decisiones del dueño

### 17.1 Resueltas (delegadas para la etapa 2, 2026-10-21)

1. **Flecha Múltiple** y el **Diluvio de Saetas** son solo de la Tiradora; la **Lluvia de Flechas** pasa al kit base (Nv8). → Aplicado (§4.1, §5).
2. El **Impulso se pierde** si estás quieta más de 2 s (−10 por segundo). → Aplicado (§7.0).
3. Se aprueban como propuesta los tipos genéricos **relanzar**, **Carrera** (canal con `moveMul`, `autoShot` y `onRelease`), **`seq`** y **cargar y soltar** (`charge`) para la Francotiradora. → §11.2.
4. La pasiva de la Tiradora es **Tercera Flecha**. → §7.0.
5. Danza de Flechas y Salto de Retirada se funden en **Carrera del Viento** y **Retirada Instintiva**; Disparo Disperso y Flecha de Cicuta pasan a ser variantes de Disparo Rápido. → §3.1, §5.
6. Árboles héroe: h1 Tiradora + Francotiradora, h2 Tiradora + Montaraz, h3 Francotiradora + Montaraz, con temas de la clase. → **Errante del Viento**, **Carcaj Encantado** y **Halconera** (§9). Se mejoraron los temas sugeridos: Errante del Viento se gana por tiempo para no premiar solo a la Tiradora, y cada árbol cayó en la pareja con la que mejor encaja (el viento, para las dos que tiran de lejos; el carcaj, para las que disparan más proyectiles y colocan trampas; el halcón, para las que marcan presas).

### 17.2 Preguntas abiertas para el dueño

1. ¿Te convence que la pasiva de la Francotiradora sea **tensar el Disparo Rápido** (Cuerda Tensa), o prefieres un efecto siempre activo (crítico contra enemigos sanos, como el Tiro Mortal de hoy)?
2. La pasiva nueva del Montaraz, **Cebo de Caza** (las trampas atraen a los enemigos normales a 6 m), ¿es el control que quieres, o prefieres una más de apoyo (los enemigos cerca de tus trampas reciben +15 % de daño)?
3. Para la Francotiradora, ¿te quedas con **Rodilla en Tierra** (postura en la ranura `2`) o prefieres un movimiento propio en la ranura `1` (un gancho que te impulsa 10 m sin perder la Concentración)?
4. ¿**Red de Caza**, el **Arpón** y el **Señuelo de Paja** como variantes de forja (de Trampa de Cepo, Flecha Detonante y Cerco de Zarzas) te parecen bien, o alguno debe seguir siendo una habilidad propia?
5. ¿El **Tiro Celestial** conserva la ventana de 8 s para tensar 3 haces, o prefieres que los 3 salgan seguidos de una sola tensada larga?
6. ¿Apruebas los tres tipos genéricos nuevos de la etapa 2: **postura** (`stance`), **cebo** de las trampas (`lure`) y **detonar** (`detonate`)?
7. **Regla de la híbrida** (juicio de la etapa 2): con finales que valen la pena, la híbrida no puede quedar a ~8–10 % de la mejor **en cada escenario** y a la vez no ser la mejor en contenido mixto (hallazgo 18). Se aplicó: nunca la mejor y a 2–11 % en mixto; en jefe o en grupos queda a 8–29 %. ¿Te sirve así, o prefieres medirla por escenario (y entonces las equilibradas bajan)?
8. ¿Qué build usa el banco (`LOADOUT`) para la Tiradora? La recomendada, Tormenta de Plumas, proyecta ×0,71 contra un jefe (el banco pide ~0,90); Vaivén Eterno, ×1,14.
9. **Gran Cacería** (Montaraz, control) iguala al Arcanista contra un jefe (0,90 de la Francotiradora). ¿Está bien que el control tenga una build de jefe así de fuerte, o la bajamos a ~0,80 (como Vaivén Eterno)?
10. **Atalaya Eterna** aguanta ×0,78 (el banco pide ≥ 0,85 a la Francotiradora). ¿La recomendamos con Parapeto (~×1,1, −4 % de daño) en lugar de Rodilla Firme?

---

## 18. Juicio y correcciones de la etapa 2

Tres jueces independientes revisaron la etapa 2 y dejaron **18 hallazgos** (2 bloqueantes, 7 altos, 6 medios y 3 bajos). Se corrigieron todos; dos con un matiz que se explica. Fuente de los cambios: `talents-v2-arquera.js` (los datos) y este documento; las cifras salen del modelo absoluto de §12.1. Las tablas de §6, §7 y §9 y las listas de §8 se regeneraron con el validador.

| # | Hallazgo (severidad) | Decisión | Cambio |
|---|---|---|---|
| 1 | Concentración en bucle: cada perfecto del básico daba +15 y la Calma Absoluta se encadenaba (bloqueante) | Aplicado | +15 solo por perfecto de Disparo Apuntado o de un haz, uno por segundo; el básico, +3. Tras la Calma, 7 s de **Respiro** sin ganar. En la Calma, perfecto solo lo tensado a media carga o más. Uso ~28 %, ~41 % con el ápice (≤ 45 %). f0, f2 (Ojo Paciente +55/60/65 %, antes +65/80/95 %), f3, f16, f24 y la mecánica |
| 2 | Galerna Infinita sin fin y Diluvio casi permanente (bloqueante) | Aplicado, con **coste creciente** en vez de un tope fijo | Pasada su duración, la Carrera gasta 10 de Energía por segundo y sube 3 cada segundo (~12,5 s con 80 de Energía; luego 7 s de recarga). Nube de Paso (0,5 s por rango y segundo; antes 1–2 s) y Nube Fiel (0,4 s; antes 0,25 s) solo en los 6 primeros segundos de cada Carrera, así que no se suman a la Galerna. Ciclones: 3 vivos. %WD/s rehecho: 1318 · 2471 (§12.1). v17, v21, v24, v27; la build usa Galope |
| 3 | Estrella Fija + Firmamento + Haces Gemelos: Tiro Celestial casi sin recarga (alto) | Aplicado | Solo los perfectos de **Disparo Apuntado** recargan, 1,5 s (antes cualquier perfecto, 2 s). Firmamento ×1,5 (antes ×2). Haces Gemelos 15/30 % (antes 25/50 %). Haz de Atalaya 200 % cada 5 s (antes 350 % cada 4 s). Definitiva de Atalaya: 21 % contra un jefe. f14, f17, f21, f27 |
| 4 | Cuerda Tensa: el básico tensado era otra insignia (+150 %, atravesaba, +50 % si perfecto) (alto) | Aplicado | Hasta **+60 %** en 1 s, sin atravesar; el perfecto da crítico seguro, no +50 %; con Disperso el extra se reparte. Básico: 20–38 % del daño de la Francotiradora. Pasiva y §7.1 |
| 5 | Montaraz: Rearme Rápido y Salto de Acecho en bucle (alto) | Aplicado; **la premisa era inexacta** | El Salto ya tenía 10 s de recarga y no se recargaba solo al aterrizar: el bucle venía de recargar **por trampa** con Racimo y cepos sembrados. Ahora recarga por **detonación**; los cepos pequeños y sembrados no cuentan; el Salto no baja de 5 s; un Racimo cuenta como una trampa; 2 estallidos por enemigo y detonación. Tabla Montaraz frente a Tiradora: en área, 0,91 (§8.7, §12.1). m8A (Racimo 35 %, antes 50 %), m18, m25 y la mecánica |
| 6 | La Debilidad se pasaba del tope (alto) | Aplicado | Acoso (antes +5 % por trampa, hasta 5) y Batida Mayor (antes +50 %) llenan **Quebranto**; Batida +15 % (antes +20 %), Presa Herida +10 % (antes +20 %). Tope real escrito: `WEAKNESS_CAP` ×1,5 con Vulnerable (+20) dentro (§12.2). m0, m9B, m12, m23 |
| 7 | Árboles héroe desparejos: Halconera muy por encima de Errante del Viento (alto) | Aplicado | Halconera: picado 100 % (antes 150 %), Cetrería una vez cada 10 s (antes 3 s), Cielo de Halcones 4 s (antes 8 s), Peregrino +40 % (antes crítico seguro), Ojo Compartido sin daño (alarga la marca). Carcaj: punta cada 6 s (antes 8 s), Fuego 200 %, Rayo 80 %, una por enemigo cada 1 s. Errante: Viento a Favor cada 15 m (antes 10 m). Aporte 9–14 %; diferencia por especialización 3,5 · 3 · 2 puntos (§9.1) |
| 8 | Humo perpetuo con Manto de Niebla (alto) | Aplicado | La Bomba de Humo se recarga **al disiparse** (no se solapa); Manto −25 % dentro (antes −50 %) y cura 0,25 % por rango (antes 1 % por rango); la ceguera no se suma; Tiro desde la Niebla, hasta +2 s. Aguante ×1,35–1,40 (≤ ×1,5). a_humo, c18, c19, c28 |
| 9 | Tablas normalizadas que esconden el nivel real; Cerco de Zarzas flojo (alto) | Aplicado | Modelo absoluto en %WD/s con supuestos escritos y comparación con Piromante, Crionte y Arcanista (§12.1). Cerco de Zarzas: 45 s (antes 55 s), veneno 100 % por segundo y 300 % al cerrarse. Al hacerlo, la Francotiradora y el Montaraz salían 2–4 veces por encima de la Tiradora: recortes abajo |
| 10 | Vaivén Eterno: Andanada sin tope ni coste (medio) | Aplicado | Vuelve a **mitad de coste** y 1 vez, 2 veces o sin límite según el rango; Andanada Cerrada, 3 flechas por enemigo y salto; Último Instante +40 % (antes +80 %). v9A, v26 y la Andanada |
| 11 | Activas dominadas por las pasivas (medio) | Aplicado | Camuflaje también recarga Paso Veloz (Instinto pasa a 180 s); Bengala +15 % y los de dentro pegan un 15 % menos (antes +10 %); Desborde de Puntas 30 s (antes 45 s); Llamada del Halcón 30 s (antes 40 s) con ceguera y 30 de Quebranto. Cada especialización tiene una build con activa: Viento Cruzado (Agilidad), Línea Mortal (Torbellino) y Gran Cacería (Llamada del Halcón, que reemplaza a la Bomba de Humo en su barra) |
| 12 | Tiro Rastreador renovaba el perfecto gratis (medio) | Aplicado | Un perfecto gratis por blanco cada 8 s; la Sombra Gemela y la marca del halcón marcan sin el perfecto gratis. Tiro Rastreador e y3 |
| 13 | Finales «todo o nada» desde el rango 1 (medio) | Aplicado | Escalan por rango: Vaivén Eterno (1 vez · 2 veces · sin límite), Galerna Infinita (2 s · 4 s · sin fin), Atalaya Eterna (20 s · 30 s · sin fin), Disparo Imposible (15 · 25 · 35 %), Tierra Arrasada (1 · 2 · 3 cepos), Gran Cacería (cada 12 · 9 · 6 s), Bosque Vivo (2 · 3 · 4 s), Tormenta de Plumas (6 · 9 · 12 flechas), Línea Mortal (10 · 15 · 20 %) |
| 14 | Punta Repartida y Lluvia Encantada multiplicaban puntas (medio) | Aplicado | Al 30 % (antes 40 % y 50 %), una punta por enemigo cada 1 s; la quemadura se renueva, no se suma. w0, w2B, w12 |
| 15 | Batida en cada detonación con Racimo de Cepos (medio) | Aplicado | Batida una vez cada 12 s; un Racimo cuenta como una trampa en el Coto. m0, m8A y la mecánica |
| 16 | Economía Letal: el documento le atribuía abaratar la Galerna (bajo) | Aplicado | El nodo no cambia («las que cuestan más de 20, un 20 % menos»); el documento ya no dice que abarata la Carrera: solo la Andanada (25) y Flecha Múltiple (22). §8.4 |
| 17 | Ojo Compartido sumaba +7 puntos de daño (bajo) | Aplicado como **mecánica** | La marca dura 12 s (antes 6 s) y no se pierde al marcar a otro: varios marcados a la vez, sin daño extra. y10 |
| 18 | Híbridas: las mejores en «peor de los dos» y dominaban el contenido mixto (bajo; texto truncado) | Aplicado según lo legible | Ninguna híbrida es la mejor contra jefes, contra grupos ni en contenido mixto (a 2, 10 y 11 % de la mejor en mixto); en «peor de los dos», la Tiradora híbrida empata con la equilibrada (Galerna), que aguanta más. Coste: por escenario quedan a 8–29 %, fuera del ~8–10 % de la plantilla. Lo decide el dueño (§17.2, 7) |

**Otros cambios que pidió el modelo absoluto** (subir a la Tiradora, que es la de área, y bajar a la Francotiradora y al Montaraz, que salían por encima; la Francotiradora queda a +10 % del Arcanista contra un jefe):

- **Tiradora:** Andanada 45 % (antes 55 %; con Vaivén Eterno relanza más), Flecha Múltiple 45 % (antes 39 %), Abanico Abierto 38 % (antes 33 %), Saetas Pesadas 600 %, Puntas Templadas +20 % por rango (antes +15 %), Remate Triple una vez cada 4 s, Tormenta de Plumas 6/9/12 flechas.
- **Francotiradora:** Disparo Apuntado de 80 a 250 %; Tiro Pesado hasta 300 %; Tres Saetas 40 %; Tiro Celestial 400 % por haz, Lluvia Estelar 150 % y Haz Único 1000 %; Estela Explosiva y Doble Impacto 30 %; Punto Vital +35 % y 15 de Quebranto; Salva de Vigía 40 %; Rebote Certero 10 % por rango; Saetas Paralelas 20 %; Herida sobre Herida +2 % por rango y Herida.
- **Montaraz:** Mina de Espinas 100 %; Salto de Acecho 100 % (antes 150 %); Flecha Detonante 80 % y 100 % por trampa; Olfato de Presa +4 % por rango; Raíz Rápida desde 45 s; Presa Atrapada 60 %; Cepo Reforzado 3 × 30 %; Metralla 20 % y solo de cepos de carga; Coto Cerrado +6 % por rango; Campo Sembrado 35 %.
- **Builds:** Pulso de Hierro toma c16 (A) y f8 (B, Doble Impacto); Gran Cacería, Llamada del Halcón (y4A) en la ranura `2`; Espinas de Caza, Picado Hondo (y2A) en lugar de Vuelo Rasante. Las 12 siguen legales punto a punto (§14.2).

**Lo que no se aplicó tal cual, y por qué.** (1) Hallazgo 2: el tope fijo de 10–12 s se cambió por un **coste creciente**, que da ~12,5 s con la Energía llena pero premia llegar con Energía y castiga encadenar; el efecto es el mismo y la fantasía de «correr mientras puedas» se conserva. (2) Hallazgo 5: la premisa («el Salto se recarga solo tras cada aterrizaje») no era cierta en los datos, pero el bucle existía por otra vía y se cerró. (3) Hallazgo 18: su texto llegó cortado; se aplicó lo legible y la regla por escenario queda como pregunta al dueño. Riesgos que quedan para E3: §12.3.
