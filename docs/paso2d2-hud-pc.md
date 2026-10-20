# Paso 2d.2: HUD de PC y barras de mecánica por especialización (documento de diseño)

> Estado: **diseño** (sin código del juego). Fecha: 2026-10-20. **Revisión v2** (tras la revisión del coordinador): zona de mecánica de 520×72, nuevas siluetas para Berserker, Piromante y Tiradora, comprobación de solapes dentro de cada widget (`?measure=1`) y assets de las tandas A y B actualizados (§9).
> Mockup navegable: [`docs/mockups/hud-pc.html`](mockups/hud-pc.html). Ábrelo en Chrome con `file:///`; usa los assets de `D:\Proyectos\IntentoRPG-assets\web\`.
> Insumos: `docs/paso2-diseno.md` §1.1 y §2, `js/spec-mechanics.js`, `js/talents-*.js`, `index.html`, `css/style.css`, `js/ui.js`, `js/hud-model.js`, `js/ui-talents.js`, los mockups `HUD.dc.html`, `Talentos.dc.html` y `Spec-*.dc.html`, y `IntentoRPG-assets/STYLE.md`.

## 0. Resumen

**Pedido del dueño:** cada especialización tiene su propia barra de mecánica sobre la barra de acciones, y esa barra explica cómo funciona la mecánica. El HUD actual, pensado para móvil, se rehace para PC (ratón y teclado). La misma barra se ve en el menú de talentos.

**Qué propone este documento:**

1. **HUD de PC al estilo D4/D3.**
   - Un *dock* centrado abajo: orbe de vida, la barra de 6 ranuras con la esquiva y las 2 pociones, y el orbe de recurso.
   - Justo encima, la **zona de mecánica** (520×72 px a 1080p).
   - Las esquinas tienen un uso fijo: placa del héroe, objetivo o jefe, minimapa con misión, botín, avisos y micromenú con los iconos `menu_*`.
   - Todo escala con una sola variable `--s` (1 a 1080p, 0,8 a 768p).
   - Se eliminan el joystick, los botones táctiles redondos, el menú hamburguesa, los avisos de «toca» y las *media queries* de móvil.
2. **Nueve barras distintas en forma**, con una gramática común: tamaño fijo, número a la derecha, anillo de tiempo en el mismo sitio, 5 estados y tooltip de 3 líneas.

   | Especialización | Forma de la barra |
   |---|---|
   | Berserker | dos venas curvas que desembocan en un corazón central que se hincha y gotea |
   | Guardián | muralla de 5 escudos |
   | Cruzado | halo con 3 soles |
   | Piromante | brasero cuyas 10 llamas crecen en altura (corona de hoguera) y se vuelven ceniza al enfriarse |
   | Crionte | 5 cristales del enemigo bajo el cursor |
   | Arcanista | anillo de 4 runas |
   | Francotiradora | retícula que se cierra |
   | Montaraz | cepos armados y medallón de Presa |
   | Tiradora | rosa de los vientos que gira más rápido y se llena de 5 plumas |

3. **Un único widget** (`js/ui-gauges.js` + `defineGaugeView`) que se monta en el HUD (en vivo) y en el panel de talentos (en modo demostración, con los nodos que lo potencian resaltados).
4. **Pedido al núcleo:** `gaugeView` v2 añade contadores de eventos `seq`, `tMax`, `decayIn`, `ready` y un objeto `x` por indicador (§3.10).
5. **45 assets para Codex** en 3 tandas (18 + 15 + 12) y un plan en 4 etapas con trabajadores sin archivos compartidos.
6. **Refutación** (§8): 9 debilidades reales. Ya están corregidas en este documento y en el mockup.

---

## 0.1 Investigación (octubre de 2026)

| # | Fuente | Qué se toma |
|---|---|---|
| 1 | [Blizzard, «Midnight: Get up to Speed with User Interface Updates»](https://worldofwarcraft.blizzard.com/news/24223311) | El **Personal Resource Display** pasa de *nameplate* flotante a **elemento fijo del HUD** («so it can't be hidden behind other elements»), que se puede mover, escalar y hacer transparente en Edit Mode. Se añaden avisos de jefe integrados y una barra de lanzamiento resaltada para lo peligroso. **Tomamos:** la barra de mecánica es un elemento **fijo** del HUD (no flota sobre el personaje), con escala y opacidad regulables. Un aviso crítico del jefe va en un *banner* bajo su marco. |
| 2 | [Warcraft Wiki, «Personal Resource Display»](https://warcraft.wiki.gg/wiki/Personal_Resource_Display) | El PRD agrupa vida, recurso primario, recurso secundario y absorciones en un solo bloque. **Tomamos:** vida, recurso y mecánica forman un **bloque único** alrededor de la barra de acciones, para que la vista no salte entre esquinas. |
| 3 | [Counterpoint (addon para Midnight)](https://www.curseforge.com/wow/addons/counterpoint-combo-points-class-resources) y [Resource Architect](https://www.curseforge.com/wow/addons/resource-architect-resource-bar) | Los jugadores piden **marcas por punto** (23 estilos) y **perfiles por especialización**: la queja es que la UI por defecto pinta igual todos los recursos secundarios. **Tomamos:** una forma **distinta por especialización**, con unidades discretas (escudo, sol, runa, cepo) cuando el recurso es entero. |
| 4 | [PureDiablo, «Combo Points» (D4, Pícaro)](https://www.purediablo.com/diablo4/Combo_Points) y [d4guides, clases (temporada 14)](https://d4guides.gg/en/database/classes) | En D4 los puntos de combo del Pícaro se ven **encima de la barra de experiencia**, junto a las ranuras. Cada clase tiene su mecánica (Arsenal, Libro de los Muertos, Salón de los Espíritus, Bendiciones de Espíritu). **Tomamos:** la posición «justo encima de la barra» y que la mecánica se aprende en un menú propio. Nosotros lo hacemos en el panel de talentos. |
| 5 | [Gfinity, «PoE2: How do Power Charges work»](https://www.gfinityesports.com/article/path-of-exile-2-how-do-power-charges-work) y [Sportskeeda, Infusiones en PoE2](https://sportskeeda.com/mmo/path-exile-2-how-get-use-infuse-weapon) | En PoE2 las cargas (Aguante, Frenesí, Poder) duran 15 s, se renuevan al ganar otra y se ven como **orbes alrededor del personaje** y como iconos con contador; las Infusiones se ligan a un elemento. **Tomamos:** el **anillo de caducidad** (Cargas Arcanas: «se pierden a los 6 s») y la idea de que una carga «a punto de caducar» avise antes de perderse (grieta del Bastión). |
| 6 | [PoE2 Wiki, «Infernal Flame» (Infernalista)](https://www.poe2wiki.net/wiki/Low_Infernal_Flame) | Una barra que **se llena gastando**, **decae a los 2 s sin ganar** y **castiga al desbordarse**, con umbrales que dan beneficios. **Tomamos:** el estado «enfriamiento» como estado visual propio (el brasero del Calor «se enfría» tras 3 s) y los umbrales con forma (no solo color). |
| 7 | [Maxroll, «Lost Ark Class Overview»](https://maxroll.gg/lost-ark/resources/class-overview) y [GamerEmpire, «Identity Skills»](https://gamerempire.net/lost-ark-what-are-identity-skills/) | El **medidor de identidad** está entre las habilidades y los consumibles, abajo al centro. Cada clase lo usa distinto: transformarse (Reaper, Destroyer), potenciar un golpe (Battle Master, burbujas que se gastan por cantidad) o buffs por nivel de llenado (Blaster). **Tomamos:** la identidad visual por clase en el mismo hueco fijo y la tipología «llenar → descargar automática» (Sed, Impulso) frente a «acumular → gastar con una habilidad» (Fervor, Cargas, Bastión). |
| 8 | [Sportskeeda, «Ward en Last Epoch»](https://sportskeeda.com/mmo/what-ward-work-last-epoch) | Last Epoch muestra la Guarda como un **tinte azulado sobre el orbe de vida** con el número arriba. **Tomamos:** los escudos (Barrera de Maná, Muro de Escudos) se ven sobre el **orbe de vida** como capa y número; no ocupan otra barra. |
| 9 | [Universidad de Bonn, «Toward Minimalist HUDs?» (2026)](https://bonndoc.ulb.uni-bonn.de/xmlui/handle/20.500.11811/14207?show=full) | Estudio longitudinal de 30 nominados a GOTY (2014–2025), incluidos ARPG: **tendencia clara al HUD minimalista** y contextual, asociada a más inmersión y preferencia. **Tomamos:** el desvanecimiento fuera de combate, el modo limpio y que lo contextual (recoger, interactuar) aparezca **solo** cuando aplica. |
| 10 | [Bugnet, «How to design a readable HUD»](https://bugnet.io/blog/how-to-design-a-readable-hud) | Jerarquía visual clara, mostrar lo necesario cuando hace falta y no tapar la acción. **Tomamos:** la regla de los 3 niveles de lectura del §3.0: número, forma y estado, y tooltip. |

---

## 1. Auditoría del HUD actual

Archivos: `index.html` (HUD en líneas 160–245), `css/style.css` (bloques «HUD», «joystick», «móvil», «táctil», buffs, modo limpio), `js/ui.js` (`updateHUD`, `renderBuffs`, `updateSpecGauge`, `updateBossFrame`), `js/input.js` (joystick), `js/main.js` (`applyAccessibility` / `isTouch`).

| Elemento | Problema en PC | Acción |
|---|---|---|
| `#joy-zone`, `#joy-hint`, `#joystick`, `#joy-knob` (HTML y CSS) y el joystick de `input.js` (líneas 61–94) | El juego es solo PC. Además, **`isTouch` (`main.js:675`) da verdadero en portátiles con pantalla táctil** (`maxTouchPoints > 0`), así que `body.touch` muestra el joystick y oculta la ayuda de PC a un jugador de teclado | **Quitar** (HTML, CSS, `input.js`, `isTouch`, `body.touch`) |
| `#rotate-prompt` («Gira tu dispositivo») y su `@media (orientation: portrait) and (pointer: coarse)` | Nunca aplica en PC | **Quitar** |
| `#action-cluster`: `#btn-attack` 68 px, `#btn-dodge` 54 px, `#btn-grab` 54 px (redondos, `:active scale`) | Son botones de pulgar. En PC esas acciones son teclas (Espacio, Mayús, F) y los botones tapan el mundo abajo a la derecha | **Quitar** el grupo. La esquiva pasa a **ranura pequeña de la barra** con `⇧` y su enfriamiento. Recoger e interactuar pasan a un **aviso contextual** («`F` Recoger · Báculo Glacial») encima de la zona de mecánica |
| `.pot-btn` 52 px flotantes a `bottom:120px` junto a los orbes | Tamaño de dedo. Flotan separados de la barra | **Mover** dentro del dock: ranuras de 44 px con `Q` y `E` y contador |
| `#hud-menu` con un `☰` (`#btn-menu-toggle`) que despliega una rejilla 2×N | Patrón móvil: en PC el jugador espera un **micromenú siempre visible** con atajos | **Quitar** el ☰. **Micromenú** fijo abajo a la derecha (10 botones de 38 px con `menu_*` y su tecla) |
| `#hud-info` (pastillas Nv, oro y zona bajo el minimapa) | Tres datos sueltos en pastillas grandes. La zona queda lejos del minimapa y el oro no hace falta en combate | **Redistribuir**: nivel y especialización en la **placa** de arriba a la izquierda, zona bajo el minimapa, oro sobre el micromenú |
| `#minimap` 140 px cuadrado con borde CSS (96 px en `max-width:700px`) | Pequeño para 1080p. No usa `ui_marco_minimapa` (es redondo) | **Redimensionar** a círculo de 200 px dentro del marco `ui_marco_minimapa` de 236 px |
| `#hud-objectives` / `#quest-tracker` con `max-width:46vw` y `white-space:nowrap` con elipsis | El `vw` móvil corta las misiones en monitores anchos. La elipsis oculta el objetivo | **Redimensionar** a 300 px fijos (×`--s`), varias líneas y alineado a la derecha bajo la zona |
| `.orb` 96 px (64 px táctil, colocados *arriba* en `pointer: coarse`) y `#orb-hp-fill` animado por `height` | Pequeños para 1080p. Animar `height` provoca *layout*. **Orbe de Furia rojo junto al de vida rojo** (Guerrero) | **Redimensionar** a 136 px con marco. El relleno se anima con `transform: scaleY`. La Furia pasa a carmesí oscuro con textura, icono `res_furia` y rótulo «FURIA» (§8, R3) |
| `#buff-bar` encima de la barra, círculos de 44 px, `pointerdown` que abre una ficha (táctil) y `top:112px` en `max-width:520px` | Son tamaños táctiles y compiten con la zona de mecánica. Mezcla beneficios y perjuicios | **Mover** a **alas**: beneficios sobre el orbe de vida y perjuicios (borde rojo) sobre el orbe de recurso. Cuadros de 34 px con anillo de tiempo. **Tooltip al pasar el ratón** |
| `#spec-gauge` (barra genérica segmentada con `sg-fill` por `width`) | Es la misma barra para las 9 especializaciones (lo contrario de lo pedido). El relleno por `width` provoca *layout*. No explica nada | **Sustituir** por el widget de `ui-gauges.js` (§3, §6) en la misma zona |
| `#boss-frame` (vida, stagger y estados) | Bien ubicado (arriba al centro), pero sin marco y sin el objetivo de élite o normal al pasar el ratón | **Mantener y ampliar**: marco `hud_objetivo_marco`, 640 px, y variante de élite o de enemigo bajo el cursor |
| `#messages` (centro, `top:14%`, `width:92%`) | Mezcla avisos críticos con mensajes de sistema; el 92 % de ancho es de móvil | **Dividir**: *banner* crítico bajo el marco del jefe; **registro de sistema** abajo a la izquierda (360 px, se desvanece) que luego será el chat cooperativo |
| No hay registro de botín ni de XP (todo va en texto flotante) | En ARPG de PC se espera un registro lateral | **Añadir** un registro a la derecha sobre el micromenú (6 líneas, color por rareza, se desvanece a los 6 s) |
| `#xp-bar` `min(48vw, 420px)` | Ancho en `vw`; no alinea con la barra | **Redimensionar** al ancho de la barra de acciones, 6 px |
| `.sk-key` de 10 px en la esquina, `IZQ`/`DER` | Atajos poco visibles | **Mantener y mejorar**: `kbd` legible abajo a la izquierda de cada ranura y un glifo de ratón para clic izquierdo y derecho |
| `@media (max-width:700px)`, `(max-height:640px)`, `(pointer: coarse)`, `(max-width:520px)`, `(max-width:420px)` del HUD (líneas 909–975, 1573, 1858, 2090) | Ocultan o recolocan el HUD por ancho de móvil. A 1366×768 ya no aplican, pero a 1280×720 con zoom sí, y rompen el dock | **Quitar** las del HUD. La escala la da `--s` (§2.3) |
| `--safe-b: env(safe-area-inset-bottom)` en orbes, pociones y dock | Margen de *notch* | **Quitar** |
| `backdrop-filter: blur(...)` en `#hud-info`, `#quest-tracker`, `#zone-contracts` y `#menu-btns` (5 usos) | Sobre un canvas WebGL que cambia cada frame, **obliga a recomponer y desenfocar cada frame** | **Quitar** en el HUD (fondo opaco degradado). Se permite en paneles que pausan |
| `touch-action: none`, `-webkit-tap-highlight-color`, `user-scalable=no`, `maximum-scale=1` y metas `apple-mobile-web-app-*` | Herencia de móvil | **Quitar** `touch-action` y el *tap highlight* del HUD. Las metas pueden quedarse (no molestan); `user-scalable` se quita |
| Textos «toca …»: `ui.js` 12 apariciones (p. ej. «toca para comparar/equipar», «Toca un engarce activo», «Toca una región conectada»), `index.html` 5 («Toca un objeto…», Paragon), `ui-talents.js` 1 y `.hint-touch` en la selección de clase | Vocabulario de móvil | **Reescribir**: «clic», «clic derecho», «pasa el ratón». Fuera `.hint-touch` y la opción «Joystick a la derecha (zurdo)» de Opciones (`ui.js:1293`) |
| `.panel` `width:min(94vw, 480px)` | Paneles estrechos de móvil en 1080p (el inventario ya tiene su variante de escritorio) | **Redimensionar** (fuera del alcance del HUD; se anota para 2e): ancho base 560–880 px por panel |
| `#btn-clean-hud` dentro del menú | Correcto como función | **Mantener** como opción y atajo `Z` (el sistema de `bindings.js` asocia códigos sueltos, sin combinaciones) |
| `--hud-scale` (`main.js:678`) | Solo escala los controles táctiles | **Reutilizar** como multiplicador de `--s` (opción «Escala del HUD 70–150 %») |
| Brújula `#compass`, `#flourish`, `#pause-indic`, `#damage-flash`, `#low-hp-vignette` | Correctos en PC | **Mantener**. La brújula añade a la **Presa** del Montaraz cuando está fuera de pantalla |

---

## 2. Layout PC objetivo

### 2.1 Principios

- **Seis anclas**: arriba-izquierda, arriba-centro, arriba-derecha, abajo-izquierda, abajo-centro (dock) y abajo-derecha, más el registro de botín a la derecha. Cada bloque escala desde su esquina: `transform-origin` en la esquina y `scale(var(--s))`.
- **Columna de identidad.** El centro inferior es solo para tu personaje. De abajo arriba van la XP, la barra de acciones, la **mecánica** y el aviso contextual. Nada más entra en esa columna (§8, R8).
- **El mundo se ve.** El área libre central mide ≥ 1080×640 px a 1080p y ≥ 760×430 px a 768p.

### 2.2 Posiciones (medidas en el mockup con `?measure=1`, sin solapes en ninguna resolución)

Formato: `x, y, ancho × alto` en px de pantalla. A 1366×768, `--s = 0,8`.

| Bloque | 1920×1080 | 1366×768 | Contenido |
|---|---|---|---|
| Placa del héroe (arriba-izq.) | 19, 17 · 230×66 | 15, 14 · 184×53 | Emblema de la especialización (52 px), «Nv 42 · Crionte», clase y Tormento. Debajo, reserva para marcos de grupo (cooperativo) |
| Marco del objetivo/jefe (arriba-centro) | 640, 15 · 640×149 | 427, 12 · 512×119 | Nombre y rango, vida (22 px con número y %), **stagger** (10 px), estados `st_*` |
| *Banner* crítico | 711, 170 · ≈500×38 | 484, 136 · ≈400×30 | «¡El Señor del Osario prepara…!» (aviso de jefe, punto 1 de §0.1) |
| Minimapa (arriba-der.) | 1665, 15 · 236×236 | 1162, 12 · 189×189 | Círculo de 200 px dentro de `ui_marco_minimapa`, marcadores `mk_*`. Debajo: zona, Tormento, reloj y `M` |
| Misión activa | 1601, 301 · 300×69 | 1111, 241 · 240×55 | Título y objetivos con progreso (y contratos de zona debajo) |
| Registro de botín/XP (der.) | 1581, 806 · 320×123 | 1095, 549 · 256×98 | Últimas 6 entradas, color por rareza, se desvanece a los 6 s |
| Oro y materiales | 1466, 993 · 437×18 | 1175, 664 · 178×14 | `mat_oro`, `mat_fragmento` |
| Micromenú (abajo-der.) | 1466, 1017 · 437×50 (1×10) | 1175, 683 · 178×74 (2×5) | Botones `menu_*` de 38 px con tecla: Personaje `C`, Inventario `I`, Habilidades `T`, Talentos `N`, Paragon `P`, Mapa `M`, Misiones `J`, Colección `K`, Guía `H`, Opciones `Esc`. Insignia roja si hay puntos |
| Registro de sistema (abajo-izq.) | 19, 978 · 360×88 | 15, 686 · 288×70 | Mensajes de sistema; luego, chat |
| Orbe de vida | 522, 935 · 136×136 | 333, 652 · 109×109 | Capa de escudo y Guarda (Barrera, Muro) como tinte y número |
| Beneficios (ala izq.) | 522, 887 · 170×34 | 333, 613 · 136×27 | Cuadros de 34 px con anillo de tiempo, 4 por fila sobre el orbe; las filas crecen hacia arriba (`wrap-reverse`) |
| Aviso contextual | 833, 873 · ≈254×26 | 581, 602 · ≈204×21 | «`F` Recoger · …», «`Espacio` Hablar con…» (solo cuando aplica) |
| **Zona de mecánica** | **700, 905 · 520×72** | **475, 628 · 416×58** | El widget de la especialización (§3): etiqueta de 16 px y cuerpo de 56 px |
| Barra de acciones | 670, 983 · 580×72 | 451, 690 · 464×58 | `Q` · `1` `2` `3` `4` · `IZQ` `DER` · `⇧` esquiva · `E`. Ranuras de 56 px y pociones o esquiva de 44 px |
| XP | bajo la barra, 580×6 | 464×5 | Línea dorada |
| Perjuicios (ala der.) | 1228, 887 · 170×34 | 897, 613 · 136×27 | Borde rojo; crecen hacia arriba |
| Orbe de recurso | 1262, 935 · 136×136 | 925, 652 · 109×109 | Color e icono por recurso (`res_*`); Furia diferenciada (R3) |
| *Zona de combate* (reservada) | 422, 238 · 1075×605 | 301, 169 · 765×430 | 56 % × 56 % de la pantalla, centrada en el héroe: **ningún bloque del HUD entra** (lo comprueba `?measure=1`) |

**Holguras con la zona de 520×72.**
- La mecánica queda a 8 px de cada ala: las alas miden 170 px y van sobre los orbes.
- El aviso «Recoger» va encima de la mecánica sin tocarla.
- El borde superior del aviso (873 px a 1080p; 602 px a 768p) queda por debajo de la zona de combate (843 px; 599 px).
- `?measure=1` informa `"solapes":[]` en ambas resoluciones.

**Orden de la barra.** El orden es `1 2 3 4 | IZQ DER`, el de D4, con los botones del ratón a la derecha, junto a la mano que los usa. `fitsSlot` y las teclas no cambian. Solo cambia el orden visual de `refreshHotbar` (hoy `lmb, rmb, k1…k4`).

**Atajos visibles.**
- Cada ranura lleva su tecla (`kbd`) abajo a la izquierda. `IZQ` y `DER` llevan un glifo de ratón con el botón resaltado.
- Las pociones muestran `Q`/`E` y el contador; la esquiva, `⇧` y su barrido de enfriamiento.
- El micromenú muestra la tecla en cada botón y en su `title`.
- El tooltip de la mecánica termina con «Más detalle en Talentos `N`».

### 2.3 Escala

`--s = clamp(0.8, min(innerWidth/1920, innerHeight/1080), 1.25) × settings.hudScale`. Se recalcula en `resize`. Debajo de 1600 px de ancho, el micromenú pasa a 2×5. A `--s = 0,8`, las ranuras miden 45 px y los textos más pequeños, 9 px (límite de legibilidad aceptado; el tooltip conserva 12,5 px).

### 2.4 Mockup

`docs/mockups/hud-pc.html` tiene tres secciones:
1. El HUD a pantalla completa, con selector de resolución, especialización y estado, simulación de deuteranopía y movimiento reducido.
2. La galería de las 9 barras en modo demostración.
3. El bloque «Mecánica única» del panel de talentos.

Parámetros de URL para capturas: `?res=1366&spec=piromante&state=active&only=screen&guide=0`, `&tip=1` (tooltip) y `&measure=1` (vuelca las cajas y los solapes en `<pre id="measure">`).

---

## 3. Las 9 barras de mecánica

### 3.0 Gramática común (lo que NO cambia entre especializaciones)

| Regla | Valor |
|---|---|
| Huella | **520×72 px** a 1080p (×`--s`: 416×58 a 768p), centrada sobre la barra. Nunca crece: los estados cambian dentro de la huella. Ningún elemento del cuerpo puede salirse del widget, pisar la etiqueta ni pisar el número o el anillo (`?measure=1` → `solapesWidget`, en los 5 estados) |
| Estructura | Fila 1 (16 px): `NOMBRE · ESPECIALIZACIÓN` en versalitas del color de la especialización, más un **subtítulo de estado** («Sed Saciada · 5,6 s»). Fila 2 (56 px): **cuerpo** propio a la izquierda (≈414 px útiles), **número** tabular (18 px, 800) y **anillo de tiempo** de 36 px a la derecha, siempre en el mismo sitio |
| Silueta | **Ninguna barra es un rectángulo que se rellena de izquierda a derecha.** Cada especialización tiene una figura propia (venas con corazón, muralla, halo, hoguera, cristales, anillo rúnico, retícula, cepos con medallón, rosa de los vientos). La prueba de las siluetas en gris (criterio A5) lo verifica |
| Estados | `idle` (vacío: cuerpo al 55 % de opacidad) · `building` (llenando) · `full` (umbral o listo: destello único de 600 ms del contorno) · `active` (descarga o ventana: el anillo de tiempo aparece) · `decay` (enfriamiento o pérdida: patrón propio de cada forma, nunca solo color). Montaraz añade `prey` (equivale a `active`) |
| Tres niveles de lectura | 1) **número** (siempre); 2) **forma y estado** (silueta llena o vacía, anillo); 3) **tooltip** al pasar el ratón fuera de combate o con `Alt` |
| Color | El de la especialización según `STYLE.md` (no el de `def.color`, que hoy difiere; §3.10). Un estado se expresa siempre con **forma más texto**, además del color (R3) |
| Ritmo | Datos a **10 Hz** (`updateHUD`). Los **bucles** (`@keyframes`) animan solo `transform` y `opacity` (R4). Los rellenos usan `transform: scaleX/scaleY` con `transition: 100ms linear`. En trazos SVG pequeños (las venas de la Sed) usan `stroke-dashoffset`, que cambia como mucho 10 veces por segundo y repinta ≈400×56 px |
| Fuera de combate | Tras 5 s sin combate (`p.sinceCombat`), opacidad 40 % y bucles parados. Vuelve al 100 % en 150 ms al primer golpe (R2) |
| Movimiento reducido | `settings.reduceMotion` o `prefers-reduced-motion`: sin bucles ni destellos de escala. Los cambios de estado se marcan con un contorno estático de 300 ms |
| Ratón | `pointer-events: none` en combate, para no tragarse clics al mundo. Fuera de combate, o con `Alt` pulsado, recibe el *hover* y muestra el tooltip (R7) |
| Tooltip | Marco `ui_tooltip`, 360 px. Título; **2–3 líneas** («Qué es», «Gana», «Descarga»); línea **Ahora** con valor, estado y tiempo; pie «Más detalle en Talentos `N`». El texto sale de `explain(gaugeTuning())`, así que los números nunca se desfasan |
| Sonido | Opcional, desactivable con la categoría «Mecánica» del volumen. Solo en `full` y `spent`, con los tonos de `sfx.js` (`hit, crit, ice, fire, bolt, holy, trap, chain, skill, uiclick, …`) y como mucho 1 tono cada 400 ms |
| Ranura enlazada | Si `view.ready` lista habilidades, sus ranuras de la barra laten con el color de la especialización (Ignición Total → Bola de Fuego y Meteoro; Veredicto listo → su ranura) |

Cada subsección siguiente describe la forma de una especialización: datos (los de hoy y los que **faltan**), estados, animaciones, sonido y tooltip.

---

### 3.1 Berserker · **Sed**: las venas y el corazón (v2)

- **Qué representa.** La figura es **«~♥~»**: **dos venas curvas** de carne y hierro que serpentean desde los extremos del cuerpo y **desembocan en un corazón central** de 46 px. No es una barra recta.
  - La sangre **fluye desde los extremos hacia el corazón**, a la vez por las dos venas: es un trazo SVG con `pathLength=100` y `stroke-dashoffset = 100 − valor`.
  - El **corazón se hincha** con la Sed: `scale` de 0,78 a 1,08.
  - Un **pulso de luz** recorre las venas. Su ritmo se acelera en 3 tramos: 1,4 s · 0,9 s · 0,55 s (<34 · <67 · ≥67).
  - Con la vida por debajo del 40 % (`m_berserk` activo), el corazón se enciende, late y tiene halo.
  - A 100 el corazón **se desborda**: late, tiene halo y **gotea** 3 gotas bajo él. Aparecen el anillo de 6 s y «Sed Saciada».
  - Con Sangre Hirviente (s14), las venas pasan a ámbar y el rótulo dice «Desenfreno».
- **Datos que consume:** `value`, `max`, `state`, `label` («Sed Saciada»), `t`.
- **Faltan:** `tMax` (6, o 8 con Desenfreno), `x.low` (vida < 40 %), `x.frenzyT`/`x.frenzyMax` (poder `g_desenfreno`), `decayIn` (s hasta que empiece la pérdida fuera de combate: `after − sinceCombat`), `seq.full`.

| Estado | Visual |
|---|---|
| idle | Venas vacías (interior oscuro) y corazón pequeño y apagado |
| building | Sangre avanzando hacia el centro, corazón creciendo y pulso con el ritmo del tramo; número 0–100 |
| full / active | Corazón al máximo latiendo, halo y goteo; anillo de 6 s; subtítulo «Sed Saciada · 5,6 s» |
| decay | Fuera de combate el pulso se para y la sangre se retira de los extremos hacia el centro; subtítulo «−8/s» |

- **Animaciones:**
  - pulso: `opacity` del trazo claro, en bucle según el tramo;
  - latido: `scale 1→1,14`, 0,5 s;
  - goteo: 3 gotas con `translateY` de 1 s, desfasadas 0,33 s;
  - hinchazón del corazón: `transform` con transición de 100 ms;
  - destello de umbral: 600 ms.
- **Tamaño:** cuerpo completo (≈414×56); el corazón de 46 px va centrado.
- **Sonido:** `hurt` (grave) al saciarse y `crit` al entrar en Desenfreno.
- **Tooltip:** «Perder vida y desangrar enemigos llena tu Sed. A 100: **Sed Saciada** 6 s (+25 % de daño aunque tengas la vida alta). / Gana: +1 por 1 % de vida perdida, +2 por tic de Sangrado (máx. 10/s). / Pierde: −8/s tras 4 s fuera de combate».

### 3.2 Guardián · **Bastión**: la muralla de 5 escudos

- **Qué representa.**
  - Una **fila de 5 escudos de cometa** (34×41) separados 8 px, como almenas.
  - Un bloqueo encaja un escudo **de golpe** (`scale 1.35→1`, 250 ms).
  - La carga que se perderá a continuación muestra una **grieta** que crece con `decayIn` (6 s → 0).
  - Al usar **Muro de Escudos**, los escudos se **juntan** (`gap` 7→0) en un muro brillante, con el rótulo «−40 % daño» y el anillo de 8 s.
  - Con Muralla Viviente (s17), un texto a la derecha da la reducción vigente («−10 %»).
- **Datos que consume:** `value`, `max`.
- **Faltan:** `decayIn` y `decayEvery` (6), `x.drPct` (2 × cargas × rango de s17), `x.wallT`/`x.wallMax`/`x.wallDr` (poder de `g_t_muro`), `seq.gain` (para encajar el escudo) y `seq.spent`.

| Estado | Visual |
|---|---|
| idle | 5 contornos de piedra |
| building | Escudos encendidos de izquierda a derecha |
| full | 5 escudos y destello; con s17, «−10 %» |
| active | Muro unido, anillo de 8 s y «−40 % daño» |
| decay | Grieta progresiva en el último escudo (opacidad = 1 − decayIn/6) |

- **Animaciones:** encaje (`scale`), unión del muro (`gap` + `transform`, 250 ms) y grieta (opacidad).
- **Sonido:** `equip` (metálico) al ganar y `hit` grave al levantar el Muro.
- **Tooltip:** «Cada bloqueo te da una carga de Bastión (máx. 5). **Muro de Escudos** las gasta: −10 % de daño recibido por carga durante 8 s. / Gana: bloqueo +1, Grito Desafiante +2 (s4). / Pierde: 1 carga cada 6 s sin ganar».

### 3.3 Cruzado · **Fervor**: el halo con tres soles

- **Qué representa.**
  - Un **arco de halo** (220×56) con **3 joyas-sol** romboidales en el arco.
  - Junto al halo, **3 cuentas pequeñas** marcan los impactos de Martillo (0–2 de 3): así el jugador ve que el tercero da Fervor.
  - A 3, detrás del halo **giran rayos de luz** (`rotate`, 9 s) y el texto dice «Veredicto Final listo». La ranura de Veredicto late (`ready`).
  - En **Ascensión** (x3), el halo queda fijo y encendido con el anillo de 10 s y «no se gasta».
- **Datos que consume:** `value`, `max`.
- **Faltan:** `x.hammerHits` (ya existe en `st.hammerHits`, falta exponerlo), `x.hammerNeed` (3), `x.ascT`/`x.ascMax`, `ready: ['g_t_veredicto']` cuando `value ≥ 3`, `seq.spent`.

| Estado | Visual |
|---|---|
| idle | Halo apagado |
| building | 1–2 soles y las cuentas del Martillo |
| full | 3 soles, rayos girando, texto y ranura latiendo |
| active | Ascensión: anillo de 10 s y «no se gasta» |
| decay | (sin pérdida) |

- **Animaciones:** encendido del sol (`scale` y `opacity`, 200 ms), rayos (`rotate`) y destello al gastar (los 3 soles se apagan en cascada, 80 ms cada uno).
- **Sonido:** `holy` a 3 de Fervor y `holy` más grave al gastar.
- **Tooltip:** «Cada muerte (Juicio) y cada 3 impactos de Martillo de Guerra te dan 1 de Fervor (máx. 3). **Veredicto Final** gasta 3: 300 % del arma en cono y cura al grupo. / Ascensión (x3): 10 s sin gastar Fervor».

### 3.4 Piromante · **Calor**: el brasero (v2)

- **Qué representa.** Un **brasero de forja**: un cuenco de hierro bajo y ancho (300×16, con patas cortas) con **10 llamas** encima. Su silueta es una **corona de hoguera**: las llamas centrales son más altas (factor de corona `0,55 + 0,45·sin`) y tienen alturas desiguales fijas.
  - **Todas las llamas crecen a la vez en altura** con el Calor (`scaleY` de 0,14 a 1 × corona). No se encienden de izquierda a derecha.
  - El color sube por tramos de temperatura: brasa roja, naranja, amarillo y, en Ignición, blanco.
  - Bajo cada llama hay una **brasa** en el borde del cuenco, cuyo brillo crece con el Calor.
  - **Enfriamiento** (3 s sin golpes de Fuego): las llamas se vuelven **ceniza gris** y bajan, las brasas se apagan a gris y el subtítulo dice «se enfría: −10/s». Es el estado `decay`, legible sin color.
  - A 100: **Ignición Total**. Las 10 llamas suben a su altura máxima en blanco, una **columna central** más alta y ancha se alza sobre el brasero, el subtítulo dice «Ignición Total» y las ranuras de Bola de Fuego y Meteoro laten.
  - **Combustión** muestra una insignia «×2» y el anillo de 10 s.
- **Datos que consume:** `value`, `state = active` (Ignición), `label`.
- **Faltan:** `decayIn` (= `coolIn`, `after − (simT − last)`), `x.cooling` (perdiendo ahora), `x.combT`/`x.combMax` (`p_combustion`), `x.mult` (2), `ready: ['bola_fuego', 'meteoro']` (sale de `TUNING.calor.skills`), `seq.full` y `seq.spent`.

| Estado | Visual |
|---|---|
| idle | Brasero frío: sin llamas y brasas apagadas |
| building | Hoguera que crece en altura; color por tramo y parpadeo de las llamas |
| full = active | 10 llamas blancas a la altura máxima, columna central y ranuras enlazadas |
| decay | Llamas de ceniza que bajan, brasas grises y «se enfría» |
| Combustión | «×2» y anillo |

- **Animaciones:**
  - altura de las llamas: `transform: scaleY` con transición de 100 ms;
  - parpadeo: `scaleX` + `skewX` en `steps(2)`, 0,4 s, con las llamas impares desfasadas;
  - columna de Ignición: `transform` y `opacity`, 200 ms;
  - color por clase: como mucho 1 cambio por tramo; las 10 llamas comparten clase.
- **Tamaño:** brasero de 300×56 a la izquierda del cuerpo y la insignia «×2» a su lado.
- **Sonido:** `fire` en Ignición Total.
- **Tooltip:** «Cada golpe de Fuego suma 5 de Calor (una vez por instante). A 100: **Ignición Total**: la siguiente Bola de Fuego o Meteoro cuesta 0 y es crítico seguro. / Pierde: −10/s tras 3 s sin golpes de Fuego».

### 3.5 Crionte · **Escarcha**: cinco cristales con nombre propio (por enemigo)

- **Qué representa.**
  - Una **etiqueta del enemigo** (nombre, con ♛ si es jefe) y **5 cristales hexagonales** con sus capas.
  - A la derecha, un **contador de grupo**: «❄ 2 congelados» o «6 con capas».
  - Al llegar a 5 capas, los cristales **estallan** (`shatter` de 600 ms) con el texto «¡Congelado!». En un jefe, el estado `active` muestra «Aterido · 4 s» con su anillo.
- **A qué enemigo mira (R1).** Por este orden: **el enemigo bajo el cursor**, luego **el jefe en combate** y luego el **más escarchado** (lo que hace hoy `gaugeView`). Mostrar solo el máximo engañaría al jugador que apunta a otro.
- **Mundo.** Una tira de **5 rombos** de 7 px sobre la barra de vida, solo para **élites, jefes y el enemigo bajo el cursor**, para que 60 enemigos no lleven 60 tiras. Lee `gaugeValue(p, 'escarcha', e)`, que es puro.
- **Datos que consume:** `value`, `max`, `enemy`.
- **Faltan:**
  - `gaugeView(p, { target })`, con el objetivo que elige la UI;
  - `x.enemyName`, `x.boss`;
  - `x.layered` (enemigos con al menos 1 capa) y `x.frozen` (congelados ahora: `e.ccKind === 'freeze'` o equivalente);
  - `x.numbT` (Aterido del jefe) y `tMax` (4);
  - `decayIn` del objetivo (2 s por escalón);
  - `seq.full` (cuenta las congelaciones de todos los enemigos).

| Estado | Visual |
|---|---|
| idle | Sin objetivo con capas: etiqueta «—» y engastes vacíos |
| building | Cristales encendidos y contador |
| full | Estallido, «¡Congelado!» y el contador «❄ n» sube |
| active | Jefe Aterido: anillo de 4 s, ♛ y halo de hielo |
| decay | El último cristal se escarcha y pierde brillo según `decayIn/2` |

- **Animaciones:** estallido (`scale` + `rotate` + `opacity`, 600 ms) y, si el asset existe, esquirlas `fx_esquirla_hielo` en aditivo (4 sprites, `transform`).
- **Sonido:** `ice` al congelar y `chain` agudo al astillar (s9).
- **Tooltip:** «Cada golpe de Escarcha suma una capa al **enemigo**. A 5: **Congelado** 1,5 s; un jefe queda **Aterido** 4 s y recibe 25 de aturdimiento. / Gana: +1 por golpe, Nova +2 (+1 por rango de s11). / Pierde: 1 capa cada 2 s. / Se muestra el enemigo bajo el cursor».

### 3.6 Arcanista · **Cargas Arcanas**: las cuatro runas en órbita

- **Qué representa.**
  - Un **anillo rúnico** de 44 px (54 px con el arco de caducidad) con **4 runas en los puntos cardinales** y un **núcleo** que se enciende con 4 Cargas.
  - Alrededor, un **arco de caducidad** (conic) que se vacía de 6 s a 0 desde la última ganancia: es la regla que más sorprende.
  - A la derecha, un **texto de previsión** con el daño y el maná del próximo Rayo («Rayo **+140 %** · +20 maná»).
  - Al lanzar Rayo, las runas **colapsan al centro** (450 ms).
  - Con Resonancia (s14) aparece la etiqueta «RESONANCIA» y el arco queda lleno, porque las Cargas no caducan.
- **Datos que consume:** `value`, `max`.
- **Faltan:** `decayIn` (= `loseIn`, `loseAfter − (simT − last)`), `x.loseAfter` (6), `x.bonusPct` (35 × n), `x.manaBack` (5 × n), `x.resonance` (s14 activo y 4 Cargas), `ready: ['rayo']` con n ≥ 1, `seq.spent`.

| Estado | Visual |
|---|---|
| idle | Runas apagadas; texto «Dardo Arcano: +1 Carga» |
| building | Runas y arco de caducidad |
| full | Núcleo encendido, Rayo latiendo y destello |
| active | Resonancia |
| decay | Arco por debajo de 2 s: parpadeo del arco, no de las runas |

- **Animaciones:** encendido de runa (200 ms), colapso (`left/top` → centro con `opacity`, 450 ms) y arco (conic, a 10 Hz).
- **Sonido:** `bolt` al descargar con 4 Cargas.
- **Tooltip:** «Dardo Arcano suma Cargas Arcanas (máx. 4). **Rayo** las consume todas: +35 % de daño por carga y +5 de maná por carga. / Pierde: todas a los 6 s sin ganar (salvo Resonancia)».

### 3.7 Francotiradora · **Concentración**: la retícula que se cierra

- **Qué representa.**
  - Una **retícula de mira** de 40 px con **4 esquineras** que se acercan al centro según el valor (desplazamiento 6 px → 0; caja máxima de 52 px).
  - Al lado, un **hilo de llenado** fino y el texto «+12,0 % crít» (0,15 % por punto).
  - **Moviéndote**, la retícula **tiembla** (2 px, `steps(2)`) y aparece «MOVIÉNDOTE» en coral. El estado de pérdida se lee sin color.
  - A 100 se enciende el **punto rojo** central. Con Aliento del Cazador (s4), la ranura de Disparo Apuntado late.
  - **Visión Certera** muestra su anillo de 12 s y el temblor desaparece.
- **Datos que consume:** `value`, `max`.
- **Faltan:** `x.moving` (`p.moving`), `x.critPct` (valor × 0,15), `x.visionT`/`x.visionMax` (`a_t_vision` o el poder que corresponda), `ready: ['a_t_apuntado']` si s4 y valor ≥ 100, `seq.full`.

| Estado | Visual |
|---|---|
| idle | Retícula abierta |
| building | Esquineras cerrándose |
| full | Punto rojo y destello |
| active | Visión Certera |
| decay | Temblor y «MOVIÉNDOTE» |

- **Animaciones:** esquineras (`transform`, 100 ms lineal) y temblor (`transform`).
- **Sonido:** `uiclick` seco al fijar (100).
- **Tooltip:** «Quieta ganas Concentración (+20/s) y moviéndote la pierdes (−25/s). Cada punto da +0,15 % de crítico (+15 % a 100). / Con Aliento del Cazador, a 100 Disparo Apuntado es instantáneo y gasta 50».

### 3.8 Montaraz · **Coto de Caza**: cepos armados y medallón de Presa

- **Qué representa.**
  - **3 ranuras de cepo** (42×40), o **4** con Coto Cerrado (s14): la 4.ª aparece al activar el nodo.
  - Un cepo **armado** se ve con fauces de acero abiertas y brillo verde; uno **desarmado**, como huella tallada.
  - La siguiente carga de Trampa de Cepo **se recarga** con un barrido conic en la primera ranura libre.
  - A la derecha, el **medallón de Presa** (🦌 hasta que exista el asset) con su nombre. Cuando hay Presa toma el estado `prey`, con el anillo de 15 s y «Presa · Bestia Alfa».
- **Mundo.** Un **anillo de espinas** verde en el suelo bajo la Presa (decal aditivo). La brújula la señala si sale de pantalla.
- **Datos que consume:** `value` (trampas armadas), `max`, `state = prey`, `label`, `t`.
- **Faltan:** `tMax` (15), `x.preyName`, `x.preyHpPct`, `x.trapCharges` y `x.trapCdFrac` (de la habilidad `a_t_cepo`: cargas listas y fracción de recarga; hoy solo se pueden calcular desde la UI con `slotView`), `x.preyTrapped` (x3), `seq.spent` (una trampa se dispara).

| Estado | Visual |
|---|---|
| idle | Huellas vacías y medallón apagado |
| building | Cepos armados y barrido de recarga |
| full | Todas armadas |
| prey | Medallón encendido, anillo de 15 s y nombre |
| decay | (la Presa caduca: anillo bajo 3 s y nombre en gris) |

- **Animaciones:** armado (`scale 0.8→1` y apertura de fauces con 2 *frames* de sprite) y disparo (sacudida `translateX` de 150 ms).
- **Sonido:** `trap` al armar y al cerrarse.
- **Tooltip:** «El valor son tus trampas armadas (máx. 3; 4 con Coto Cerrado). El primer élite o jefe que golpeas es tu **Presa** 15 s y cuenta como élite para tus bonificaciones. / Trampa de Cepo: 1 carga, 8 s por carga».

### 3.9 Tiradora · **Impulso**: la rosa de los vientos (v2)

- **Qué representa.** Una **rosa de los vientos** de 56 px (estrella de 4 puntas con gema central) con **5 plumas** dispuestas radialmente, a 72° entre sí, que hacen de aspas.
  - Cada 20 de Impulso **se llena una pluma** (media pluma en tramos parciales). Las plumas se llenan alrededor del círculo, no en fila.
  - **En movimiento la rosa gira**, y más rápido cuanto más Impulso tiene: 3 s, 1,6 s y 0,8 s por vuelta (<34 · <67 · ≥67).
  - **Quieta**, la rosa **se detiene** y aparece «¡MUÉVETE!»: el estado «no gano» se lee por el movimiento y por el texto.
  - A su derecha, dos líneas: «2 de 5 plumas» y «+3 por disparo en movimiento».
  - A 100: **Vendaval**. La rosa gira a 0,4 s por vuelta, las plumas pasan a blanco viento, un **anillo de ráfaga** discontinuo gira en sentido contrario, aparece el anillo de 6 s y la ranura de Flecha Múltiple late. El texto cambia a «Vendaval: +25 % vel. de ataque · +1 proyectil a Flecha Múltiple».
  - Vendaval Perpetuo (s14) recarga el anillo con cada muerte (+0,5 s).
- **Datos que consume:** `value`, `state`, `label`, `t`.
- **Faltan:** `x.moving`, `tMax` (6), `x.galeExt` (segundos extra acumulados de s14), `ready: ['flecha_multiple']` durante el Vendaval, `seq.full`.

| Estado | Visual |
|---|---|
| idle | Rosa quieta, plumas apagadas y «¡MUÉVETE!» |
| building | Plumas llenándose alrededor; giro más rápido por tramo; se detiene si te paras |
| full = active | Vendaval: giro rápido, plumas blancas, anillo de ráfaga y anillo de 6 s |
| decay | (no pierde; quieta = rosa detenida y «¡MUÉVETE!») |

- **Animaciones:**
  - giro: `rotate` en bucle; la duración cambia por clase de tramo; `animation-play-state` la pausa al quedarte quieta;
  - anillo de ráfaga: `rotate` inverso de 1,2 s;
  - llenado de pluma: `fill`, 150 ms;
  - la rosa ocupa un cuadrado fijo de 56 px, así que el giro no cambia su caja.
- **Tamaño:** rosa de 56×56 a la izquierda del cuerpo, más el texto.
- **Sonido:** `dash` al entrar en Vendaval.
- **Tooltip:** «Cada disparo hecho **en movimiento** suma 3 de Impulso. A 100: **Vendaval** 6 s: +25 % de velocidad de ataque y +1 proyectil a Flecha Múltiple. / Andanada Impulsiva (s4): +20».

---

### 3.10 Pedido consolidado al núcleo: `gaugeView` v2 (`js/spec-mechanics.js`)

Hoy `gaugeView(p)` devuelve `{ id, name, value, max, color, state, label?, t?, enemy? }`. La v2 es compatible hacia atrás (solo añade campos):

```js
gaugeView(p, opts = {}) → {
  id, name, value, max, color, state, label?, t?, enemy?,   // como hoy
  tMax?,        // duración total del estado activo o de la ventana (para el anillo)
  decayIn?,     // s hasta la próxima pérdida: escalón (every), inicio (after) o caducidad total (all); null si no pierde o está en hold
  decaying?,    // true si está perdiendo ahora mismo
  hold?,        // true si un estado activo congela la pérdida (def.hold)
  seq,          // { gain, full, spent, empty }: contadores MONÓTONOS por indicador, incrementados en fireGauge
                //   (por enemigo: suma global). La UI detecta eventos comparando con la vista anterior:
                //   destellos y sonidos sin callbacks ni colas, a 10 Hz
  ready?,       // [skillId]: habilidades que la mecánica deja listas o potenciadas AHORA (resalte de ranura)
  x,            // extra por indicador (abajo); siempre un objeto
}
// opts.target: enemigo que la UI quiere ver (Escarcha; elige: bajo el cursor > jefe en combate > máx.)
```

| Indicador | Campos `x` que faltan | Origen |
|---|---|---|
| sed | `low` (vida < 40 %), `frenzyT`, `frenzyMax` | `p.hp/p.stats.maxHP`, poder `g_desenfreno` (2c.1) |
| bastion | `drPct`, `wallT`, `wallMax`, `wallDr` | s17 (`g_muralla_viva`), `g_t_muro` |
| fervor | `hammerHits`, `hammerNeed`, `ascT`, `ascMax` | `st.hammerHits`, `TUNING.fervor.hammerHits`, `g_ascension` |
| calor | `cooling`, `combT`, `combMax`, `mult` | `tickDecay`, `p_combustion` |
| escarcha | `enemyName`, `boss`, `layered`, `frozen`, `numbT` | `g.enemies`, `e.numbT`, CC de congelación |
| cargas | `loseAfter`, `bonusPct`, `manaBack`, `resonance` | `TUNING.cargas`, `a_resonance` |
| concentracion | `moving`, `critPct`, `visionT`, `visionMax` | `p.moving`, `TUNING.concentracion.critPerPoint`, Visión Certera |
| coto | `preyName`, `preyHpPct`, `trapCharges`, `trapCdFrac`, `preyTrapped` | `st.prey`, cargas de `a_t_cepo`, `m_greathunt` |
| impulso | `moving`, `galeExt` | `p.moving`, `t_galechain` |

**Otros dos pedidos al núcleo:**

1. **Colores canónicos.** `def.color` difiere de la paleta de `STYLE.md`, que es la que usan el panel de talentos y los retratos:

   | Especialización | `def.color` hoy | `STYLE.md` |
   |---|---|---|
   | Tiradora | `#a8d88a` | `#66d7c7` |
   | Crionte | `#8fd3ff` | `#74cdf2` |
   | Piromante | `#ff7a3a` | `#ff8a3d` |
   | Arcanista | `#b98cff` | `#b996ff` |
   | Francotiradora | `#e9d27a` | `#ead86e` |

   Se adopta `STYLE.md` en `def.color`.
2. **Única fuente de texto.** `SPEC_INFO` de `js/ui-talents.js` contiene mecánicas que **no existen** en `spec-mechanics.js` (Anexo A): Calor «Bola de Fuego +12 · Meteoro instantáneo», Cargas «+12 % de daño, +25 % de coste, implosionan», Impulso «+4 por flecha · Voltereta +15 · quieta 1,5 s cae a la mitad · abanico», Concentración «Disparo Rápido +5 · Sangre Fría», Bastión «espinas se duplican» y Montaraz «la Presa activa todas las trampas». La explicación pasa a `explain(gaugeTuning())` de cada renderizador (§6). `SPEC_INFO` conserva solo el color, el fondo, el borde y el rol.

---

## 4. Menú de talentos: el bloque «Mecánica única» usa el mismo widget

Hoy (`ui-talents.js:224–230`) el bloque tiene el título, un párrafo de `SPEC_INFO`, una barra decorativa `.tp-gauge` y tres columnas. En el diseño compacto de 1366×768 la barra y las columnas se ocultan (`talents.css:412–413`).

**Diseño** (sección 3 del mockup):

1. **Cabecera**: «MECÁNICA ÚNICA · ESCARCHA» y «Solo Crionte», como hoy.
2. **Texto**: `explain().text` (2 líneas, números de `gaugeTuning()`).
3. **El widget real**: `createGaugeHud(host, { mode: 'demo', id })`, a 520×72 (0,8 en compacto, **nunca oculto**).
   - Reproduce en bucle la línea de tiempo `demo` del renderizador (10–13 s): vacío → llenando → umbral → descarga → pérdida.
   - Los valores son sintéticos y salen del mismo contrato de vista (§3.10), así que también validan los renderizadores.
4. **Subtítulo** de la fase en curso (`frame.cap`): «Nova de Hielo: +2 capas a todos (+1 por rango de Escarcha Contagiosa)».
5. **Píldoras de nodos** (icono del nodo y su id) que esa línea de tiempo menciona (`frame.nodes`). La fase en curso **enciende** sus nodos en las píldoras **y en el árbol** (clase `.tp-node.is-mech-hint`: contorno del color de la especialización con un latido de 1,2 s).
   - **Pasar el ratón por una píldora** salta la demostración a la fase que la explica.
   - **Pasar el ratón por un nodo del árbol** que potencia la mecánica (mapa `nodes` del renderizador) hace lo mismo y muestra en el detalle «Potencia tu Escarcha: …».
6. **Columnas** Generar / Descargar / Pérdida desde `explain().cols`. En compacto se colapsan en una línea.
7. **Controles**:
   - «▶ Demostración» (por defecto);
   - «◉ Mi estado», que monta el widget en modo `live` con `gaugeView(p)` (útil para ver en el pueblo cómo te queda con tus rangos; vacío, explica «se llena en combate»);
   - «↺ Repetir».

**Formato de la demo** (contrato de `defineGaugeView(id, { demo })`), como lo implementa el mockup:

```js
demo: [
  { t: 0,   value: 0, state: 'idle', cap: 'Ningún enemigo tiene capas.', tag: 'idle', nodes: [] },
  { t: 2,   value: 3, fire: 'gain', x: { layered: 6 }, cap: 'Nova de Hielo: +2 capas…', nodes: ['s11'], tag: 'building' },
  { t: 3.4, value: 5, state: 'full', fire: 'full', x: { frozen: 1 }, cap: '¡5 capas: Congelado 1,5 s!', nodes: ['s0', 's9'], tag: 'full' },
  { t: 5.6, value: 5, state: 'active', label: 'Aterido', t2: 4, tMax: 4, ease: 1, … , tag: 'active' },
  { t: 13, end: 1 },
]
// los campos se fusionan hacia delante; `ease` interpola value/t2/decayIn hasta el siguiente fotograma;
// `fire` incrementa seq[ev] (destellos); `tag` marca el fotograma representativo de cada estado (capturas y tests)
```

**Primera vez** (R6): al elegir especialización (Nv10) se abre el panel en esta sección con la demostración en marcha. En el HUD, una **marca de guía** de un solo uso apunta a la zona de mecánica: «Esta es tu Escarcha. Golpea con Escarcha para sumar capas · `N` para verla en Talentos». Se descarta con un clic o a los 12 s.

---

## 5. Assets para Codex

**Flujo** (el de `IntentoRPG-assets/prompts/`):
- Los prompts van a `prompts/gauges-<tanda>.txt` y se ejecutan con `codex exec --skip-git-repo-check -s workspace-write -c model_reasoning_effort="low" -i <ref> - < prompts/gauges-<tanda>.txt`. Con `-i`, el prompt va por stdin.
- Los crudos van a `raw/gauges/*.png` y luego a `web/gauges/` y `web/hud/` en webp, al tamaño final (2× para HiDPI), con `optimize.py` (PIL).
- Se verifican duplicados por md5 tras cada tanda paralela (en la tanda anterior hubo 11 archivos cruzados).
- Al repo van a `assets/gauges/` y `assets/hud/` en la etapa E2.

**Regla de oro (R9):** Codex genera **iconos, medallones, marcos y texturas de 64 px o más**. Las formas estructurales que se animan (el trazo de las venas, la altura de las llamas, el giro de la rosa, la retícula y los anillos) se dibujan con CSS/SVG y usan el asset solo como «piel». Si un asset falla al cargar, queda el CSS del mockup (`onerror` → clase `no-art`).

**Cabecera común de cada tanda** (se pega al inicio de cada `.txt`):

> Lee STYLE.md en la carpeta actual y síguela al pie de la letra: dark fantasy pintado a mano, claroscuro de maestros antiguos, NO fotorrealista, diseños 100 % originales, sin logos ni piezas reconocibles de otras marcas. Paleta de la UI: fondo #0d0b10, paneles #15111a, dorado #e8c06a. Usa tu herramienta de generación de imágenes, UNA llamada por imagen. Tras cada imagen, cópiala desde C:\Users\juanm\.codex\generated_images (la más reciente de esta sesión) a la ruta indicada, como PNG.
>
> Son PIEZAS DE INTERFAZ, no iconos de habilidad: vista frontal plana, sin perspectiva, centradas, con un 6 % de margen libre; sin texto, sin números, sin letras, sin marca de agua. Deben leerse reducidas a 1/4.
> - «TRANSPARENTE» = PNG con canal alfa real y fondo totalmente transparente, sin sombra proyectada fuera de la silueta.
> - «ADITIVO» = sobre negro puro #000000, sin alfa (se mezcla en modo screen/additive).
> - «MOSAICO» = textura opaca repetible sin costuras en el eje indicado.
>
> Genera primero la n.º 1 y úsala como referencia de estilo, grosor de línea, metal envejecido y luz para todas las demás. Al terminar responde solo con la lista de rutas creadas. No modifiques nada más.

Referencia `-i` por tanda: A = `web/ui/res_furia.webp` y `web/chrome/ui_marco_minimapa.webp`; B = `web/ui/st_escarcha.webp` y `web/vfx/fx_llama.webp`; C = `web/chrome/ui_marco_minimapa.webp` y `web/chrome/ui_marco_panel.webp`.

### Tanda A (18 imágenes): Guerrero, Arcanista y Francotiradora

| n.º | Archivo (`raw/gauges/`) | Final (`web/gauges/`, 2×) | Fondo | Prompt |
|---|---|---|---|---|
| 1 | `gz_sed_corazon.png` | 96×96 | TRANSPARENTE | Corazón anatómico de hierro negro forjado y carne viva, visto de frente, con dos arterias cortadas a los lados (izquierda y derecha) por donde entrará la sangre; venas rojas brillando por dentro, rojo sangre #e8634a; silueta compacta y muy clara, legible a 46 px. Es la pieza CENTRAL de la figura. |
| 2 | `gz_sed_venas.png` | 828×112 | TRANSPARENTE | Dos venas orgánicas gruesas de carne oscura y anillos de hierro que serpentean en curvas suaves (como una ola) desde los dos extremos de la imagen hacia el centro, simétricas, con capilares finos y pequeñas espinas; en el CENTRO un hueco vacío del tamaño de un corazón (transparente). El CANAL INTERIOR de cada vena es transparente (por ahí se ve la sangre). Proporción 7,4:1. |
| 3 | `gz_sed_sangre.png` | 512×64 | MOSAICO horizontal | Sangre espesa y brillante vista de lado, con burbujas, vetas oscuras y reflejos húmedos, rojo profundo a carmesí; continua de izquierda a derecha sin costura (se usa como patrón del trazo de las venas). |
| 4 | `gz_sed_saciada.png` | 128×128 | TRANSPARENTE | Icono de estado: corazón de hierro desbordándose, la sangre rebosa por arriba y gotea, con un aura carmesí que arde alrededor; transmite frenesí saciado (Sed Saciada / Desenfreno). |
| 5 | `gz_bastion_escudo.png` | 64×76 | TRANSPARENTE | Escudo de cometa de acero azulado con borde de plata y un umbo central, brillo azul acero #7fb0e8 en el canto; silueta limpia, vista frontal. |
| 6 | `gz_bastion_escudo_vacio.png` | 64×76 | TRANSPARENTE | El mismo escudo de cometa como hueco vacío tallado en piedra oscura: solo contorno biselado, sin metal ni brillo (ranura vacía). |
| 7 | `gz_bastion_grieta.png` | 64×76 | TRANSPARENTE | Superposición de grietas finas de luz blanca azulada con la forma del escudo de cometa; solo las grietas, el resto transparente. |
| 8 | `gz_bastion_muro.png` | 128×128 | TRANSPARENTE | Icono de estado: cinco escudos de cometa solapados formando un muro, con una onda de luz azul acero delante. |
| 9 | `gz_fervor_halo.png` | 680×132 | TRANSPARENTE | Arco de halo sagrado de oro envejecido en semicírculo aplanado (proporción 5:1), con tres engarces romboidales vacíos (centro y dos extremos) y filigrana fina; el interior del arco transparente. |
| 10 | `gz_fervor_sol.png` | 64×64 | TRANSPARENTE | Joya romboidal de luz solar, oro blanco #ecc760 incandescente en el centro, engaste de oro con cuatro puntas cortas. |
| 11 | `gz_fervor_rayos.png` | 256×256 | ADITIVO | Corona de rayos de luz dorada que irradian desde el centro, rayos finos alternando largos y cortos, centro vacío oscuro. |
| 12 | `gz_fervor_ascension.png` | 128×128 | TRANSPARENTE | Icono de estado: par de alas de luz dorada abiertas tras un pequeño sol, plumas luminosas. |
| 13 | `gz_cargas_anillo.png` | 128×128 | TRANSPARENTE | Anillo rúnico de metal oscuro violáceo con cuatro engarces vacíos en los puntos cardinales y runas grabadas tenues entre ellos; el centro del anillo transparente. |
| 14 | `gz_cargas_runa.png` | 48×48 | TRANSPARENTE | Una runa arcana encendida dentro de un rombo, violeta #b996ff a magenta, brillo intenso en el trazo. |
| 15 | `gz_cargas_nucleo.png` | 128×128 | ADITIVO | Núcleo de energía arcana esférico, blanco en el centro y violeta en el borde, con filamentos que giran. |
| 16 | `gz_conc_anillo.png` | 128×128 | TRANSPARENTE | Anillo de mira telescópica de latón envejecido con marcas de graduación finas y cuatro muescas; centro transparente. |
| 17 | `gz_conc_esquinera.png` | 48×48 | TRANSPARENTE | Una esquinera en forma de L de latón con un remache, para la retícula (se rotará por código). |
| 18 | `gz_conc_fijado.png` | 128×128 | TRANSPARENTE | Icono de estado: ojo de halcón dorado #ead86e con la pupila convertida en un punto rojo brillante, plumas alrededor. |

### Tanda B (15 imágenes): Piromante, Crionte, Montaraz y Tiradora

| n.º | Archivo | Final | Fondo | Prompt |
|---|---|---|---|---|
| 1 | `gz_calor_brasero.png` | 600×56 | TRANSPARENTE | Brasero de forja de hierro negro visto de frente: cuenco ancho y bajo (proporción 11:1), borde superior con diez muescas y garras en las esquinas, dos patas cortas; brillo naranja tenue en el canto; el espacio de ENCIMA del cuenco totalmente transparente (de ahí salen las llamas). |
| 2 | `gz_calor_llama.png` | 44×80 | TRANSPARENTE | Una sola lengua de fuego vertical y estilizada, base ancha y punta afilada, naranja #ff8a3d a amarillo con núcleo claro, borde nítido (se escala en altura por código; 10 copias forman la hoguera). Generar alta, proporción 1:1,8. |
| 3 | `gz_calor_llama_blanca.png` | 88×90 | TRANSPARENTE | La misma lengua de fuego en blanco incandescente con borde amarillo pálido, más ancha: la columna central de Ignición Total. |
| 4 | `gz_calor_ignicion.png` | 128×128 | TRANSPARENTE | Icono de estado: brasero de hierro del que se alza una columna de fuego blanco-naranja con chispas (Ignición Total). |
| 5 | `gz_escarcha_cristal.png` | 64×72 | TRANSPARENTE | Cristal de hielo hexagonal vertical, facetado, cian #74cdf2 a blanco, luz interior; silueta hexagonal limpia. |
| 6 | `gz_escarcha_engaste.png` | 64×72 | TRANSPARENTE | Engaste hexagonal vacío de plata escarchada con escarcha en los bordes; el interior transparente. |
| 7 | `gz_escarcha_congelado.png` | 128×128 | TRANSPARENTE | Icono de estado: bloque de hielo con la silueta oscura de una criatura atrapada dentro, grietas luminosas. |
| 8 | `gz_escarcha_aterido.png` | 128×128 | TRANSPARENTE | Icono de estado: corona de jefe de hierro cubierta de escarcha y carámbanos, aliento helado alrededor. |
| 9 | `gz_coto_cepo.png` | 64×64 | TRANSPARENTE | Cepo de caza de acero con las fauces dentadas abiertas, visto de frente, brillo verde bosque #86d47a en los dientes. |
| 10 | `gz_coto_cepo_vacio.png` | 64×64 | TRANSPARENTE | Contorno del mismo cepo tallado en madera oscura, sin metal (ranura vacía). |
| 11 | `gz_coto_presa.png` | 128×128 | TRANSPARENTE | Medallón de caza de bronce con un cráneo de ciervo de gran cornamenta marcado con una runa verde brillante. |
| 12 | `gz_coto_marca_suelo.png` | 256×256 | ADITIVO | Anillo de espinas y zarzas visto desde arriba, verde luminoso sobre negro, para marcar el suelo bajo una presa. |
| 13 | `gz_impulso_rosa.png` | 112×112 | TRANSPARENTE | Rosa de los vientos de bronce envejecido: estrella de cuatro puntas con una gema turquesa #66d7c7 en el centro y un aro fino; SIN plumas (las plumas son otra pieza); simetría perfecta, vista cenital. |
| 14 | `gz_impulso_pluma.png` | 28×56 | TRANSPARENTE | Una pluma alargada y luminosa, turquesa viento con el raquis claro y la punta hacia ARRIBA, vista de frente (se rota 5 veces por código alrededor de la rosa). Generar alta, proporción 1:2. |
| 15 | `gz_impulso_vendaval.png` | 128×128 | TRANSPARENTE | Icono de estado: rosa de los vientos girando dentro de un remolino turquesa, con cinco plumas arrastradas por el viento (Vendaval). |

### Tanda C (12 imágenes): piezas del HUD de PC (`web/hud/`)

| n.º | Archivo | Final | Fondo | Prompt |
|---|---|---|---|---|
| 1 | `hud_orbe_marco_vida.png` | 320×320 | TRANSPARENTE | Marco circular ornamentado para el orbe de vida: anillo de hierro oscuro y oro envejecido con raíces y espinas entrelazadas, una gema roja arriba; centro circular totalmente transparente (el 70 % del diámetro). |
| 2 | `hud_orbe_marco_recurso.png` | 320×320 | TRANSPARENTE | El mismo marco circular, con runas grabadas en lugar de espinas y una gema neutra (gris humo) arriba; centro transparente. |
| 3 | `hud_dock.png` | 1280×160 | TRANSPARENTE | Placa base horizontal para la barra de acciones (proporción 8:1): piedra oscura y cuero con filete de oro envejecido, extremos ornamentados con volutas; pensada como 9-slice (tramo central liso y repetible); el fondo de la placa opaco y oscuro. |
| 4 | `hud_objetivo_marco.png` | 1280×160 | TRANSPARENTE | Marco largo para la barra de vida de un jefe: remates de cuernos y cráneo estilizado en los extremos, filo de oro envejecido; el interior transparente; 9-slice horizontal. |
| 5 | `hud_objetivo_elite.png` | 1024×96 | TRANSPARENTE | Marco sobrio para la barra de un élite: hierro con dos remates de pico, interior transparente; 9-slice. |
| 6 | `hud_liquido_vida.png` | 256×256 | MOSAICO en ambos ejes | Líquido rojo sangre denso visto de frente con remolinos y reflejos, para rellenar un orbe. |
| 7 | `hud_liquido_furia.png` | 256×256 | MOSAICO en ambos ejes | Magma carmesí oscuro con vetas negras y brasas (Furia, distinto de la sangre: más oscuro y con grietas). |
| 8 | `hud_liquido_mana.png` | 256×256 | MOSAICO en ambos ejes | Líquido azul profundo con chispas de luz y vetas arcanas. |
| 9 | `hud_liquido_energia.png` | 256×256 | MOSAICO en ambos ejes | Savia ámbar verdosa luminosa con hojas diminutas en suspensión. |
| 10 | `hud_stagger.png` | 512×32 | MOSAICO horizontal | Cadena dorada tensa vista de lado, eslabones gruesos (relleno de la barra de aturdimiento). |
| 11 | `hud_anillo_tiempo.png` | 128×128 | TRANSPARENTE | Aro fino de bronce con doce muescas, para un anillo de cuenta atrás; centro transparente. |
| 12 | `hud_destello.png` | 256×256 | ADITIVO | Destello de luz en estrella de ocho puntas con halo suave, blanco cálido (efecto de umbral genérico). |

**Total: 45 imágenes** (A 18, B 15, C 12). Coste estimado: unos 45 minutos de Codex con las 3 tandas en paralelo (≈1 min por imagen).

---

## 6. Arquitectura

### 6.1 Módulos

```
js/ui-gauges.js            núcleo UI (lo crea otro agente con la API mínima; aquí se amplía)
js/ui-gauges-guerrero.js   sed · bastion · fervor          ← trabajador Guerrero
js/ui-gauges-maga.js       calor · escarcha · cargas       ← trabajador Maga
js/ui-gauges-arquera.js    concentracion · coto · impulso  ← trabajador Arquera
css/gauges.css             gramática común (§3.0): .gz, .gz-lbl, .gz-num, .gz-ring, estados, ooc, reduce
css/gauges-<clase>.css     formas de cada clase (prefijo .gz-<id>, sin tocar selectores ajenos)
assets/gauges/*.webp       tandas A y B (§5)
assets/hud/*.webp          tanda C
```

**API de `js/ui-gauges.js`.** Amplía la mínima `createGaugeHud(host, { getView }) → { el, update(view), destroy() }`, montada en `#spec-gauge`.

```js
// registro (un renderizador por mecánica; puro en el nivel superior: nada de document al importar)
defineGaugeView(id, {
  mount(body, ctx) → inst,                 // crea el DOM del cuerpo UNA vez; ctx = { asset(name), color, reduceMotion }
  update(inst, view, prev, ctx) → { num, sub? },  // escribe SOLO lo que cambió; prev = vista anterior (seq, state)
  model?(view) → object,                   // lo que update pinta, en datos puros (tests sin DOM)
  demo: Frame[],                           // línea de tiempo (§4)
  explain(T) → { text, cols, tip },        // T = gaugeTuning(); única fuente de texto de la mecánica
  nodes: { [nodeId]: 'cómo la potencia' }, // nodos del árbol de la especialización que la potencian
  sounds?: { full?: sfxName, spent?: sfxName },
  world?: { overhead(e, p) → { n, max } | null }  // marcas sobre enemigos (Escarcha) o suelo (Presa)
});
export function gaugeViewDefs() → { id: def }

createGaugeHud(host, {
  getView,                 // () => gaugeView(p, { target }) en vivo
  mode = 'live',           // 'live' | 'demo'
  id,                      // en demo: qué renderizador
  onEvent?(ev, view),      // 'full' | 'spent' | 'gain' (derivado de seq)
}) → { el, update(view?), play(id), seek(t), setMode(m), destroy() }
```

**Qué hace `ui-gauges.js` (común):**
- el andamiaje (etiqueta, subtítulo, número, anillo);
- cambiar de renderizador cuando cambia `view.id` (cambio de especialización);
- diferenciar `seq` → clase `flash` y sonido con limitador;
- `data-state`;
- el desvanecimiento fuera de combate;
- el tooltip de *hover*, con `Alt` en combate;
- `ready` → `onReady(ids)` para que `ui.js` marque las ranuras;
- el reloj de la demo a 10 Hz;
- un **renderizador genérico** de reserva (la barra segmentada actual) para indicadores nuevos registrados con `defineGauge` sin vista propia.

**Registro por clase.** Cada `ui-gauges-<clase>.js` exporta `GUERRERO_GAUGE_VIEWS = { sed: {...}, bastion: {...}, fervor: {...} }` (lo mismo para `MAGA_` y `ARQUERA_`). `ui-gauges.js` los importa y registra, igual que `data.js` fusiona `skills-<clase>.js`, así que los trabajadores nunca tocan el núcleo.

### 6.2 Qué toca el núcleo para el rework del HUD

| Archivo | Cambios |
|---|---|
| `index.html` | Fuera `#rotate-prompt`, `#joy-*`, `#action-cluster`, `#hud-menu`/`#btn-menu-toggle`, `.pot-btn` sueltos y `.hint-touch`. Nuevo esqueleto: `.cl` por ancla, `#hud-dock` (alas, orbes, `#hud-prompt`, `#spec-gauge`, `#skillbar`, `#xp-bar`), `#hud-plate`, `#target-frame` (amplía `#boss-frame`), `#hud-loot`, `#hud-syslog`, `#hud-micro`. Enlaza `css/gauges*.css` |
| `css/style.css` | Reescribe la sección HUD con `--s` y las anclas. Borra los bloques joystick, móvil y táctil del HUD, `--safe-b` y `backdrop-filter` del HUD. Rellenos por `transform`. Marcos 9-slice con `assets/hud/*` |
| `js/ui.js` | `updateHUD` reparte por bloques: orbes (`scaleY`), dock, alas de beneficios y perjuicios (`renderBuffs` dividido, tooltip *hover*), objetivo o jefe (añade élite y enemigo bajo el cursor), registro de botín (nuevo `logLoot`), registro de sistema (`message` → syslog o banner según prioridad) y micromenú. `updateSpecGauge` → `this.gaugeHud.update(gaugeView(p, { target: this.hoverEnemy }))`. Orden de la barra `k1…k4, lmb, rmb` + esquiva. Textos «toca» → «clic». Fuera la opción del joystick |
| `js/input.js` | Fuera el joystick (líneas 36 y 61–94). `Alt` mantenido → `ui.altHeld` para los tooltips del HUD |
| `js/main.js` | Fuera `isTouch`/`body.touch` y `joy-right`. `--hud-scale` pasa a multiplicador de `--s` |
| `js/hud-model.js` | Funciones puras nuevas: `hudLayout(vw, vh, scale)` → `{ s, microRows }`, `lootLogEntry(item)` → `{ text, rarity }`, `pickGaugeTarget(enemies, hover, pos)`. `gaugeBar` se conserva solo para el renderizador genérico |
| `js/bindings.js` | Acciones nuevas para el micromenú: `paragon: ['KeyP']`, `quests: ['KeyJ']`, `collection: ['KeyK']`, `guide: ['KeyH']`, `cleanHud: ['KeyZ']` (hoy P, J, K, H y Z están libres; `bindings.js` no admite combinaciones, así que `Alt` se lee aparte como tecla mantenida en `input.keys`) |
| `js/spec-mechanics.js` | `gaugeView` v2 (§3.10), contadores `seq` en `fireGauge` y colores de `STYLE.md` |
| `js/ui-talents.js` + `css/talents.css` | Bloque de mecánica con `createGaugeHud` en demo. `SPEC_INFO` sin textos de mecánica. `.tp-node.is-mech-hint`. Compacto sin ocultar el widget |
| `sw.js` | Sube `VERSION`; `ASSETS` += `js/ui-gauges*.js`, `css/gauges*.css`, `assets/gauges/*`, `assets/hud/*` |

---

## 7. Plan de implementación

Trabajadores según la regla del usuario: Opus para implementación guiada, Sonnet para lo mecánico y el jefe (modelo principal) solo para juzgar. **Cada trabajador es dueño exclusivo de sus archivos.**

| Etapa | Trabajador (modelo) | Archivos (exclusivos) | Entrega |
|---|---|---|---|
| **E0** (en paralelo) | W1 «núcleo de indicadores» (Opus) | `js/spec-mechanics.js`, `tests/test72-gaugeview-v2.mjs` | `gaugeView` v2, `seq`, colores; test con el arnés (`h.gaugeView()`) para los 9 |
| | W2 «HUD PC» (Opus) | `index.html`, `css/style.css`, `js/ui.js`, `js/input.js`, `js/main.js`, `js/hud-model.js`, `js/bindings.js`, `tests/test73-hud-pc.mjs` | §1 y §2. Monta `#spec-gauge` con la API de `ui-gauges.js` (con el genérico mientras no haya renderizadores) |
| | W3 «Codex» (orquestado por el jefe) + W3b «optimización» (Sonnet) | `IntentoRPG-assets/prompts/gauges-*.txt`, `raw/gauges`, `web/gauges`, `web/hud` y después `assets/gauges`, `assets/hud` | 45 imágenes; md5 sin duplicados; webp al tamaño final |
| | W4 «ui-gauges núcleo» (Opus) | `js/ui-gauges.js`, `css/gauges.css`, `tests/test74-gauges-registro.mjs`, `tests/visual/gauges.html` | Registro, andamiaje, genérico, demo, tooltip; arnés visual (§7.1). **Se coordina con el agente que crea la API mínima: W4 parte de su versión** |
| **E1** (tras congelar las API de W1 y W4) | W5 Guerrero, W6 Maga, W7 Arquera (Opus) | `js/ui-gauges-<clase>.js`, `css/gauges-<clase>.css`, `tests/test-gauges-<clase>.mjs` | 3 renderizadores por clase con `mount/update/model/demo/explain/nodes/sounds`. Primero CSS puro (el del mockup); la piel con assets, al llegar W3 |
| **E2** | W8 «talentos» (Opus) | `js/ui-talents.js`, `css/talents.css` | §4 |
| | W9 «assets al repo» (Sonnet) | `assets/gauges/*`, `assets/hud/*`, `sw.js` | Copia, `ASSETS` y `VERSION` |
| **E3** | Jefe (juicio) | (ninguno; los arreglos vuelven al MISMO trabajador) + `MEMORIA.md` al cerrar | Capturas, criterios y revisión de diffs |

### 7.1 Criterios de aceptación (verificables)

Capturas con Chrome headless:

```
"C:/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu --hide-scrollbars \
  --virtual-time-budget=3000 --window-size=W,H --screenshot=out.png "<url>"
```

Para leer resultados, `--dump-dom` y `grep` del `<pre id="measure">` (el truco del mockup).

| # | Criterio | Cómo se verifica |
|---|---|---|
| A1 | `npm test` en verde, con `test72`–`test74` y los 3 `test-gauges-<clase>` | `npm test` |
| A2 | **Sin solapes** entre bloques del HUD, ni de ningún bloque con la **zona de combate** central (56 % × 56 %), a 1920×1080, 1600×900, 1366×768 y 1280×720 | `index.html?hudcheck=1` vuelca las cajas y los solapes como `?measure=1` del mockup; `--dump-dom` y `grep` de `"solapes":[]` |
| A2b | **Sin solapes dentro de cada widget** en los 5 estados: ningún elemento del cuerpo se sale del widget ni pisa la etiqueta o el número y el anillo. Se mide con las animaciones paradas | Lo mismo, con `"solapesWidget":[]`. El mockup ya lo cumple para los 9 a 1920 y a 1366 |
| A3 | Los 9 renderizadores registrados con `mount/update/demo/explain/nodes`; cada `demo` tiene fotogramas con `tag` `idle`, `building`, `full` o `active`; los ids de `nodes` existen en `TALENT_TREES` | `test74` |
| A4 | `explain(gaugeTuning())` cita los números de `gaugeTuning()` (p. ej. el texto de Cargas contiene «35 %» y «6 s») | `test-gauges-<clase>` |
| A5 | 45 capturas: 9 especializaciones × 5 estados en `tests/visual/gauges.html?spec=X&state=Y`, revisadas por el jefe; **las 9 siluetas se distinguen en escala de grises** y **ninguna es un rectángulo que se rellena de izquierda a derecha** | Capturas con `filter: grayscale(1)` y contacto 9×5 |
| A6 | Daltonismo: con la matriz de deuteranopía (`?cb=1`), cada estado se distingue por **forma o texto** (no solo por tono) | Capturas `cb=1` de `full` y `active` frente a `building` |
| A7 | Coste: `update()` medio < 0,15 ms y **0 mutaciones del DOM** si la vista no cambia | Arnés visual: 1000 `update` con `performance.now()` y un `MutationObserver` |
| A8 | Los `@keyframes` de `css/gauges*.css` solo animan `transform` y `opacity` (sin `box-shadow`, `filter`, `width`, `height`, `left`, `top` ni `stroke-dashoffset`). La única propiedad no compuesta permitida es la **transición** de `stroke-dashoffset` de las venas de la Sed (a 10 Hz) | `tests/test74` (grep de los `@keyframes` y las `transition`) |
| A9 | Sin herencia móvil: ni `joy-`, ni `body.touch`, ni `pointer: coarse`, ni `rotate-prompt`, ni `safe-area`, ni «toca»/«Toca» en `index.html`, `css/style.css`, `js/ui.js`, `js/input.js` y `js/main.js` | `tests/test73` (lectura de archivos y regex) |
| A10 | Movimiento reducido: con `body.reduce-motion`, `getAnimations()` del HUD = 0 tras 1 s | Arnés visual |
| A11 | Partida real: Crionte Nv20 contra un grupo; la barra muestra al enemigo bajo el cursor; al congelar suenan `ice` y el destello; el jefe muestra Aterido con anillo | Captura de juego con `?debug`, revisión del jefe |
| A12 | Panel de talentos a 1920×1080 y 1366×768: el widget en demo es visible en ambos y pasar el ratón por una píldora resalta el nodo del árbol | Capturas del panel |

---

## 8. Refutación del propio diseño

| # | Debilidad real | Corrección aplicada |
|---|---|---|
| **R1** | **Escarcha con 60 enemigos.** `gaugeView` muestra al enemigo *más* escarchado: con una horda, la barra salta entre enemigos que el jugador ni mira. Los 5 cristales no dicen nada sobre «tu» objetivo. Si se pinta la tira sobre los 60, el mundo se llena de rombos | El objetivo pasa a ser: **bajo el cursor > jefe en combate > máx.** (`opts.target`), con la etiqueta del enemigo y un **contador de grupo** («❄ 2 congelados»). La tira del mundo va **solo** en élites, jefes y el enemigo bajo el cursor (§3.5) |
| **R2** | **Ruido visual.** Nueve formas con latidos, flujos y llamas en bucle permanente, junto a orbes que también ondulan, compiten con la telegrafía de los enemigos, que es lo que mata | Bucles **solo** con valor > 0 y en combate; **fuera de combate, opacidad del 40 %** sin bucles; como mucho **un** bucle por barra; los destellos de umbral son únicos (600 ms), nunca repetidos; la columna de identidad no admite nada más (§2.1, §3.0) |
| **R3** | **Daltonismo.** Con deuteranopía, Berserker (rojo), Cruzado (oro) y Piromante (naranja) se vuelven amarillos casi iguales (comprobado en el mockup con `?cb=1`). Calor «listo» frente a «llenando» era solo color. **El orbe de Furia es rojo como el de vida** | Cada estado se marca con **forma y texto**: «se enfría», «MOVIÉNDOTE», «¡MUÉVETE!», la grieta, el anillo y el subtítulo. Las 9 **siluetas son distintas** (criterio A5 en escala de grises). La Furia pasa a magma oscuro con textura (`hud_liquido_furia`), icono `res_furia` y rótulo «FURIA» |
| **R4** | **Rendimiento.** El primer boceto animaba `box-shadow`/`filter` (latidos con resplandor, `drop-shadow`) y el HUD actual usa `backdrop-filter` sobre el canvas WebGL. Escribir el DOM a 10 Hz en 9 componentes sin diferenciar provoca *layout* | Animaciones **solo de `transform`/`opacity`** (A8); resplandores con un sprite pre-renderizado (`hud_destello`, aditivo) que cambia de opacidad; `contain: layout paint` por barra; `update` diferenciado (A7); **fuera `backdrop-filter`** del HUD; rellenos de los orbes por `scaleY` en vez de `height`. El mockup aún usa `drop-shadow` estático en dos estados: en el juego, sprite |
| **R5** | **Consistencia entre clases.** Nueve widgets a medida pueden ser nueve reglas de lectura: el número en sitios distintos, tiempos en barras o anillos y tamaños que bailan al cambiar de especialización | **Gramática común** (§3.0): huella fija de 520×72, número tabular y anillo de tiempo **siempre a la derecha**, los mismos 5 estados con el mismo destello y el mismo formato de tooltip. Las formas cambian solo **dentro del cuerpo** |
| **R6** | **Curva de aprendizaje.** A Nv10 aparece de golpe una forma nueva sin explicación. El panel de talentos explicaba con textos **erróneos** (Anexo A) | Textos generados desde `gaugeTuning()` (una sola fuente); **demo** en el panel; al elegir especialización, el panel se abre en la mecánica y aparece una **marca de guía** de un uso en el HUD; en `idle`, una pista corta en el subtítulo durante los primeros 10 min con la especialización («Golpea con Escarcha para sumar capas») |
| **R7** | **Clics tragados.** La zona de mecánica (520×72) está sobre el mundo, en la mitad inferior, justo donde se apunta a enemigos que vienen de abajo; con *hover* activo, los clics de ataque se pierden | `pointer-events: none` **en combate**; tooltip fuera de combate o con **`Alt`** (convención de PoE). Las alas de beneficios y perjuicios siguen la misma regla. Solo la barra de acciones y el micromenú capturan clics siempre |
| **R8** | **Alas contra columna.** En el primer diseño los beneficios iban encima de la zona de mecánica (como hoy `#buff-bar`). Con 6 o más beneficios, la fila crecía hacia arriba, tapaba el aviso contextual y empujaba la vista lejos de la mecánica | Beneficios y perjuicios pasan a **alas** sobre los orbes (§2.2); la columna central queda solo para el aviso contextual, la mecánica, la barra y la XP. El mockup ya muestra la versión corregida |
| **R9** | **Assets ilegibles o inconsistentes.** Pedir a Codex piezas de 26 px (cristales, escudos, plumas) da imágenes que, reducidas, se vuelven manchas, y 9 estilos distintos rompen el set. Un marco 9-slice para un tubo es difícil de cortar | Codex genera **≥ 64 px** (finales a 2×); las formas que se animan son CSS/SVG con el asset como piel; cada tanda usa la n.º 1 como referencia y una cabecera común; reserva CSS si falla la carga (el mockup es esa reserva); de 60+ piezas posibles se baja a **45** |

| **R10** (revisión del coordinador, v2) | **Identidad débil en 3 de 9 y widgets apretados.** Berserker (barra recta con corazón), Piromante (10 cajas en fila) y Tiradora (fila de chevrones) se leían las tres como «una barra horizontal», contra el pedido explícito del dueño. A 440×48, el anillo de runas y la retícula pisaban su etiqueta y el arte pintado no tenía sitio | Nuevas siluetas: **venas con corazón central** (la sangre fluye hacia el centro), **brasero con hoguera** que crece en altura y se vuelve ceniza, y **rosa de los vientos** que gira y se llena de plumas. Zona de **520×72**. `?measure=1` comprueba los solapes **dentro** de cada widget en los 5 estados (`solapesWidget`) y contra la zona de combate. Alas de 170 px para no tocar la zona ampliada |

**Qué cambió respecto al primer boceto:**
- Objetivo de la Escarcha (R1).
- Opacidad fuera de combate (R2).
- Textos de estado, orbe de Furia y prueba de siluetas en gris (R3).
- Solo `transform`/`opacity`, fuera `backdrop-filter` y rellenos por `scale` (R4).
- Huella y posiciones fijas del número y del anillo (R5).
- Una sola fuente de texto, demo, guía y pista en `idle` (R6).
- Clics atravesando en combate y `Alt` (R7).
- Beneficios a las alas (R8).
- Las 9 siluetas sin barras horizontales y la zona de 520×72 (R10).
- 45 assets de 64 px o más y reserva CSS (R9).

---

## Anexo A: discrepancias entre `SPEC_INFO` (`ui-talents.js`) y la mecánica real (`spec-mechanics.js`)

| Especialización | Dice el panel | Hace el juego |
|---|---|---|
| Berserker | «Desenfreno automático al llegar a 100» | A 100: **Sed Saciada** 6 s (`m_berserk`); Desenfreno solo con s14 |
| Guardián | «Con 5 cargas tus espinas se duplican» | No existe; s17 da −2 % de daño por carga |
| Cruzado | «Cada Fervor gastado alarga el Aura 1 s» | Es s14 (Luz del Alba), no la base: correcto como talento, no como «Ventana» de la base |
| Piromante | «Bola de Fuego +12 · Meteoro instantáneo y gratis a 100 · Combustión Espontánea» | +5 por golpe de Fuego; a 100 **la siguiente Bola de Fuego o Meteoro** cuesta 0 y es crítico (no instantáneo); el nombre es **Ignición Total** |
| Crionte | «Nova de Hielo y Dardo: +1 capa por golpe» | Nova +2 (+`tv.frostLayers`); Dardo solo con Carámbanos (s7) |
| Arcanista | «+12 % de daño y +25 % de coste por carga · +50 % · implosionan sin maná» | **+35 % aditivo** y +5 de maná por carga; no hay coste extra ni implosión |
| Francotiradora | «Disparo Rápido +5 · Sangre Fría: 4 s moviéndote · Tiro Fijado» | Solo +20/s quieta y −25/s moviéndote; la ventana es **Visión Certera** (s9, 12 s) |
| Montaraz | «La Presa activa todas las trampas · +25 % del grupo 4 s» | Base: Presa = élite o jefe 15 s; el «+15 % del grupo» es el Apex x3 (Gran Cacería), con 6 s |
| Tiradora | «+4 por flecha · Voltereta +15 · abanico de 3 · quieta 1,5 s cae a la mitad» | **+3** por disparo en movimiento; Vendaval = +25 % de velocidad de ataque y +1 proyectil a Flecha Múltiple; no hay caída por quedarse quieta |

Corrección: §3.10, punto 2 (los textos pasan a `explain(gaugeTuning())`), que ejecuta W8 en E2.

---

## 9. Revisión v2: lista final de archivos de las tandas A y B

Cambios respecto a la v1:
- `gz_sed_tubo` pasa a `gz_sed_venas`.
- `gz_calor_parrilla` pasa a `gz_calor_brasero`.
- `gz_calor_brasas` (mosaico) se sustituye por `gz_calor_llama` (transparente, escalable) y `gz_calor_llama_blanca`.
- `gz_impulso_chevron` y `gz_impulso_estela` pasan a `gz_impulso_rosa` y `gz_impulso_pluma`.
- Cambian los prompts de `gz_sed_corazon`, `gz_sed_sangre`, `gz_sed_saciada`, `gz_calor_ignicion` y `gz_impulso_vendaval`.
- La tanda C no cambia.

**Tanda A (18):**
1. `gz_sed_corazon`
2. `gz_sed_venas`
3. `gz_sed_sangre`
4. `gz_sed_saciada`
5. `gz_bastion_escudo`
6. `gz_bastion_escudo_vacio`
7. `gz_bastion_grieta`
8. `gz_bastion_muro`
9. `gz_fervor_halo`
10. `gz_fervor_sol`
11. `gz_fervor_rayos`
12. `gz_fervor_ascension`
13. `gz_cargas_anillo`
14. `gz_cargas_runa`
15. `gz_cargas_nucleo`
16. `gz_conc_anillo`
17. `gz_conc_esquinera`
18. `gz_conc_fijado`

**Tanda B (15):**
1. `gz_calor_brasero`
2. `gz_calor_llama`
3. `gz_calor_llama_blanca`
4. `gz_calor_ignicion`
5. `gz_escarcha_cristal`
6. `gz_escarcha_engaste`
7. `gz_escarcha_congelado`
8. `gz_escarcha_aterido`
9. `gz_coto_cepo`
10. `gz_coto_cepo_vacio`
11. `gz_coto_presa`
12. `gz_coto_marca_suelo`
13. `gz_impulso_rosa`
14. `gz_impulso_pluma`
15. `gz_impulso_vendaval`

(Todos son `.png` en `raw/gauges/` y `.webp` en `web/gauges/` al tamaño final de las tablas del §5.)

**Verificación del mockup v2:** con `?measure=1`, a 1920×1080 y a 1366×768, con `spec` = crionte, berserker, piromante y tiradora, el resultado es `"solapes":[]` y `"solapesWidget":[]` (9 widgets × 5 estados más el del HUD).
