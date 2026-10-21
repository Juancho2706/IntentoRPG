# Paso 2g: talentos y kits del Guerrero (etapa 1 de 2), documento de diseño

> Estado: **diseño, etapa 1 de 2**, sin código del juego. Fecha: 2026-10-21. Molde: la Maga v4 aprobada (`docs/paso2g-maga-coherencia.md`, §17 «Plantilla para otras clases»).
> **Hecho en esta etapa:** investigación, auditoría, modelo de capas, kit base, árbol de clase, **Berserker completo** (kit con forja, pasiva, barra Sed, árbol de 29 nodos y 2 builds validadas, una híbrida), verbos de entrada y movimiento, datos del mockup y capturas.
> **Pendiente (etapa 2):** Guardián y Cruzado, los tres árboles héroe y las builds restantes (§16 dice lo que la etapa 2 debe respetar).
> Mockup: `docs/mockups/skills-ux.html?cls=guerrero&view=talents` (abrir como `file:///`). Datos: `docs/mockups/data/talents-v2-guerrero.js` (fuente única: las tablas de §6 y §7 se **generan** con `validar-talentos.mjs guerrero --tablas`).

## 0. Historial y estado

| Versión | Qué es | Qué dijo el dueño |
|---|---|---|
| Maga v4 (`d75e7ed`, `d8dd49c`) | El molde: 3 columnas, Nv100, Paragon en gris hasta 31/31, formas, textos | Aprobada |
| **Guerrero, etapa 1** | Kit base, árbol de clase y **Berserker** con la misma rejilla y reglas; verbos de entrada nuevos | — (para revisar mientras se hace la etapa 2) |
| Guerrero, etapa 2 | Guardián, Cruzado, árboles héroe, builds restantes | — |

**Pedido nuevo del dueño en este paso:** «hay que ponerle creatividad» a los verbos de entrada y movimiento: que no todo sea «aprieto y sale» (§5).

## 1. Resumen (15 líneas)

1. Mismo ritmo, presupuesto y rejillas que la Maga (`TV2.REGLAS`): clase 34 puntos (30 nodos, 53 rangos), especialización 31 (29 nodos, 59 rangos), Paragon 1 + 10, tablero de glifos 16. Ningún árbol se completa.
2. **Kit base del Guerrero (Nv1–8):** Tajo (básica), Hendidura (principal en cono, con preparación), Embestida (movilidad), Piel de Hierro (defensa) y Lanza Arrojadiza (principal a distancia).
3. De las **28 activas de hoy** quedan 23 en el diseño final: 5 de base, 3 de talento de clase, 4 por especialización y 1 por árbol héroe (§3).
4. **Berserker** (daño, barra Sed): Remolino Sangriento (insignia), Salto Devastador (movilidad), Rajar (principal) y Furia Inmortal (definitiva), cada una con Mejora y 2 variantes.
5. Sus **verbos**: canalizar sin dejar de moverte (Remolino), relanzar dentro de una ventana (Salto en cadena), combo de 3 con un 3.er golpe distinto y con preparación (Rajar) y una ventana de riesgo con la vida (Furia Inmortal: la vida no baja del 1 %).
6. **Arquetipos del Berserker:** **Hemorragia** (girar y desangrar; Danza Carmesí), **Verdugo** (el combo y el remate; Golpe de Gracia) y **Estampida** (saltar de manada en manada; Estampida Sin Fin). Ápice: Corazón Indomable.
7. **Pasiva:** «Al borde»: con menos del 40 % de vida (o con la Sed Saciada) haces +25 % de daño. **Barra:** la Sed de siempre (`spec-mechanics.js`), con sus tres textos.
8. **Árbol de clase:** tres caminos (Defensa con Piel de Hierro, Armas con la Furia y las principales, Movilidad con **tu movilidad**) y tres finales de ritmo: Inquebrantable, Señor de la Guerra y Asalto Total.
9. Los nodos de movilidad de la clase hablan de **«tu movilidad»** (la habilidad de la ranura 1), no de la Embestida: así no quedan muertos cuando una especialización trae su propia movilidad (fallo que sí tiene la Maga: §15).
10. El nodo c9 cambia el verbo **preparación** de toda la clase: golpes más lentos y pesados (Quebranto) o la mitad de preparación y moviéndote.
11. Tres habilidades de talento de clase, todas para la ranura `2`: Segundo Aliento (c11), Grito de Guerra (c17) e Intervención (c22).
12. **Builds validadas punto a punto** hasta el Nv100: «Estampida Sin Fin» (Estampida, final de clase Asalto Total) y «Sangre y Acero» (híbrida Hemorragia + Verdugo, sin final, clase Señor de la Guerra).
13. Validador: 0 errores propios de la etapa 1; quedan 20 errores, todos de lo pendiente (árboles vacíos del Guardián, del Cruzado y héroe, sus kits y builds) (§15.3).
14. Tres rondas de refutación con capturas a 1366 y 1920 (§15).
15. §16 deja a la etapa 2 los verbos reservados (plantado y postura para el Guardián; cargar y soltar para el Cruzado), los nombres ocupados y los huecos.

---

## 2. Investigación (consultada el 2026-10-21)

Se suma a la de la Maga (sus §2 y Anexo A.1, que siguen vigentes para el árbol estilo WoW). Aquí, lo que cambia para el Guerrero: **verbos de entrada** y referencias de guerreros.

| Fuente (fecha) | Qué dice | Qué tomamos |
|---|---|---|
| [poe2wiki: Perfect Timing](https://www.poe2wiki.net/wiki/Perfectly_Timing) · [Window of Opportunity](https://www.poe2wiki.net/wiki/Window_Of_Opportunity) · [Perfect Strike](https://www.poe2wiki.net/wiki/Perfect_Strike) (wiki viva, consultada 2026-10-21; explicador de [ipsnews, 2025-02-08](https://ipsnews.net/business/2025/02/08/path-of-exile-2-perfect-timing-explainedwhat-is-perfect-timing/?amp=1)) | PoE 2: las canalizaciones que se sueltan tienen una ventana «Perfect Timing»; se ve como un **destello rojo** alrededor del personaje; soltar dentro da más daño o efectos (Perfect Strike lanza una onda de fuego). Un soporte acorta la ventana un 35 % a cambio de +35 % de daño | Verbo **cargar y soltar con ventana perfecta**, con destello y sonido. Lo reservamos para el Cruzado (§16): el Berserker no lo usa |
| [ProGameGuides: PoE 2 0.5 (2026-05-08)](https://progameguides.com/?p=886082) | La ventana perfecta sigue en el parche 0.5 | Es un verbo vigente en 2026, no una moda pasada |
| [Upcomer: el combate de Lost Ark (2022-02-06)](https://upcomer.com/lost-arks-combat-system-explained) · [fextralife: Hell Blade](https://lostark.wiki.fextralife.com/Hell+Blade) y [Mobalytics: Berserker](https://mobalytics.gg/blog/lost-ark/lostark-berserker-guide-builds-engravings-tips/) (páginas vivas sin fecha; consultadas 2026-10-21) | Lost Ark separa **normal, punto, combo (relanzar en una ventana), mantener (sigue mientras mantienes) y cargar** (cuanto más cargas, más fuerte). La Hoja Infernal del Berserker: mantienes, sueltas en la «zona perfecta» y sale un remate | **Relanzar dentro de una ventana** (Salto Devastador) y **soltar como remate** (Estallido Rojo al soltar el Remolino) |
| [Maxroll: Mayhem Berserker (Lost Ark)](https://maxroll.gg/lost-ark/build-guides/mayhem-berserker-raid-guide) · [Icy Veins: Mayhem](https://www.icy-veins.com/lost-ark/mayhem-berserker-warrior-build-guide) (guías vivas sin fecha visible; consultadas 2026-10-21) | El Berserker «Mayhem» vive con la vida bloqueada al 25 % a cambio de su modo de ráfaga | La fantasía **«al borde»**: la pasiva (+25 % con menos del 40 %) y Furia Inmortal (la vida no baja del 1 %) |
| [Icy Veins: el rework de árboles de Lord of Hatred (previo al lanzamiento del 2026-04-28)](https://www.icy-veins.com/d4/news/massive-skill-tree-rework-coming-in-diablo-4-lord-of-hatred/) · [BlizzardWatch (2026-04-27)](https://blizzardwatch.com/2026/04/27/class-play-diablo-4-lord-hatred/) · [DiabloBytes: Whirlwind (2026-05)](https://www.diablobytes.com/diablo-iv/builds/whirlwind-barbarian/) | D4 2026: fuera las pasivas, cada habilidad tiene modificadores; el **Torbellino canalizado** sigue siendo la build estrella del Bárbaro | El Torbellino es **del Berserker** (Remolino Sangriento) y se canaliza en marcha; la forja cambia su forma (anclado o atrayente) |
| [warcraft.wiki: Demolish](https://warcraft.wiki.gg/wiki/Demolish) · [Colossal Might](https://warcraft.wiki.gg/wiki/Colossal_Might) (wiki viva; consultada 2026-10-21) | WoW (Coloso): Demolish es una canalización de golpes que te hace inmune a aturdimientos y quita un 10 % de daño; sus cargas las dan otras habilidades | Canalizar = momento de poder **e** imparable: Marcha Imparable (c7) y Giro Firme (Mejora del Remolino) |
| [Icy Veins: Guerrero Furia en Midnight](https://www.icy-veins.com/wow/fury-warrior-midnight-guide) · [Icy Veins: Armas](https://www.icy-veins.com/wow/arms-warrior-midnight-guide) (páginas vivas de la alfa de Midnight, 2025–2026) · [foro EU: feedback de Guerreros](https://eu.forums.blizzard.com/en/wow/t/feedback-warriors/590303) · [Skill Capped: Furia en el parche 12.1 (2026-08)](https://www.skill-capped.com/wowarticles/guides/fury-warrior-pvp-guide/midnight-changes/) | Midnight poda el árbol de clase del Guerrero: tenía demasiados enfriamientos de daño y poca utilidad de grupo (Avatar y Thunderous Roar salen de la clase) | Los finales de clase son de **ritmo o utilidad**, no de daño; las ráfagas de daño viven en la especialización |
| [Archon: Fury (Midnight, parches 12.0.5–12.1, 2026)](https://www.archon.gg/wow/builds/fury/warrior/raid/talents/normal/midnight-falls) · [Method: Fury](https://www.method.gg/guides/fury-warrior/talents) | En 2026 Slayer y Mountain Thane se reparten las peleas: Slayer en casi todas, Mountain Thane en algunas | Ninguna opción domina en todo: cada A/B dice dónde gana (§6, §7) |
| [Maxroll: Hades II, guía básica](https://maxroll.gg/hades-2/guides/hades-2-beginners-guide) · [fextralife: combate de Hades II](https://hades2.wiki.fextralife.com/Combat) (guías vivas sin fecha; consultadas 2026-10-21) | Hades II: mantener el botón **carga la versión Omega** de un ataque (gasta Magia); el **ataque tras el impulso** es un golpe propio | «Tras tu movilidad, el siguiente golpe es otro»: Caída Brutal (b6) y Asalto Total (c30) |
| [Foro de Last Epoch: Forge Guard y Rive (parche 1.0.1)](https://forum.lastepoch.com/t/my-current-build/67304) · [notas de Harbingers of Ruin](https://forum.lastepoch.com/t/last-epoch-harbingers-of-ruin-patch-notes/71790/8) (sin fecha visible; consultadas 2026-10-21) | Last Epoch: Rive es un **combo de 3** cuyo 3.er golpe tiene sus propios nodos (crítico doblado, más daño) | **Rajar**: 3 golpes con el 3.º distinto, y nodos que solo tocan el 3.º (b9, b19, b23, b26) |

**Lagunas.** No encontré la ventana exacta (en segundos) de Perfect Timing ni números de Lord of Hatred para Salto y Carga; el detalle de PoE 2 sale de la wiki (sin fecha de revisión visible). Los números de este documento son **propuestas de diseño** que calibra E3.

**Lecciones aplicadas.** (1) Un verbo por arquetipo, y nodos que **cambian el verbo**, no solo números. (2) Soltar, relanzar y el 3.er golpe tienen **feedback** (destello, sonido, pips en la ranura). (3) La forja cambia la forma; el talento cambia cómo se usa y cuánto rinde.

---

## 3. Auditoría del Guerrero actual y modelo de capas

### 3.1 Las 28 activas de hoy y quién las toca

Hoy el Guerrero tiene **16 habilidades en el libro** (las tres especializaciones comparten el mismo libro) y **12 activas de talento**.

| Activa de hoy | Tipo | Quién la toca hoy | Problema | Destino en el diseño |
|---|---|---|---|---|
| Tajo | Básico | Clase c6, Guardián s12 | — | **Kit base** (única básica) |
| Mandoble | Básico | Clase c5A, Berserker s6B, s7 | Tres básicos que se pisan | Sale. Su golpe pesado lo hereda la etapa 2 si lo quiere |
| Embate | Básico | Clase c5B | Igual | Sale: lo absorbe la variante **Siega** del Tajo |
| Torbellino | Principal | Clase c9, Berserker s3, s10, s16 | Choca con el Remolino Sangriento (dos «giros») | Sale: se funde con el **Remolino Sangriento** del Berserker |
| Hendidura | Principal | Clase c9, Berserker s3, s10 | — | **Kit base** (Nv2, con preparación 0,25 s) |
| Martillo de Guerra | Principal | Clase c9, Guardián s7, s12, Cruzado s6A, s7 y su Fervor | Motor de dos especializaciones a la vez | **Etapa 2** (propuesta: principal del Cruzado) |
| Terremoto | Principal | Guardián s10 | — | **Etapa 2** (propuesta: Guardián) |
| Lanza Arrojadiza | Principal | — | Nadie la tocaba | **Kit base** (Nv8): la principal a distancia |
| Embestida | Movilidad | Clase c11 | — | **Kit base** |
| Salto Devastador | Movilidad | Clase c11 | — | **Berserker** (movilidad que se relanza) |
| Piel de Hierro | Defensa | — | 12 s/−50 % por el Guardián de 2e | **Kit base** (8 s/−40 %; §11) |
| Provocación | Utilidad | Guardián s6B | Provocar es del tanque | **Etapa 2** (Guardián) |
| Grito de Guerra | Utilidad | — | — | **Habilidad de talento de clase** (c17A) |
| Furia Inmortal | Definitiva | — | Sin dueño | **Berserker** (definitiva rehecha) |
| Cataclismo | Definitiva | Cruzado s1, s16 | Sagrada en el libro de todos | **Etapa 2** (Cruzado) |
| Estandarte de Guerra | Definitiva | Cruzado s10 | — | **Etapa 2** (Guardián, Cruzado o un árbol héroe) |
| Segundo Aliento | Talento c2 | — | — | **Clase c11A** |
| Intervención | Talento c3 (ranura 1) | — | Competía con la movilidad | **Clase c22A**, ahora en la ranura `2` |
| Bramido de Guerra | Talento c12A | — | — | **Etapa 2** (Cruzado o Caudillo) |
| Remolino Sangriento | Insignia (la daba s0) | Berserker s4, s6A, s12 | La insignia la concedía un nodo | **Berserker**: insignia en el libro |
| Temeridad | Talento s9 | s12 | Activa a mitad del árbol | Sale: su idea (Sed más rápida a cambio de riesgo) vive en Furia Inmortal y en el ápice |
| Ira Ciega | Talento s13B | — | Otra ventana de daño más | Sale: idem |
| Grito Desafiante | Insignia (s0) | Guardián s4, s6A | Igual que el Remolino | **Etapa 2** (insignia del Guardián) |
| Muro de Escudos | Talento s9 | Guardián x1–x3 | Activa a mitad del árbol | **Etapa 2** |
| Carga de Escudo | Talento s13B | — | — | **Etapa 2** (movilidad del Guardián) |
| Aura de Devoción | Insignia (s0) | Cruzado s4, s14 | Igual que el Remolino | **Etapa 2** (insignia del Cruzado) |
| Veredicto Final | Talento s9 | Cruzado s16, s17 | Activa a mitad del árbol | **Etapa 2** |
| Martillo de Justicia | Talento s13B | — | Texto con «stagger» | **Etapa 2** |

### 3.2 Conflictos de la clase de hoy

| Conflicto | Ejemplo | Cómo se resuelve |
|---|---|---|
| Lo fuerte de una especialización está en el libro de todas | Cataclismo (sagrado) y Furia Inmortal para cualquier Guerrero | Kit por especialización (§3.3) |
| Activas concedidas a mitad de un árbol de especialización | Temeridad, Muro de Escudos, Veredicto Final | Solo opción A de una elección de clase o de árbol héroe, y solo para la ranura `2` |
| Nombres repetidos | «Sed de Batalla» (nodo s0 y variante de Furia Inmortal), «Bastión» (barra y variante de Piel de Hierro), «Juicio» (nodo s0 y variante de Cataclismo), «Frenesí» (nodo s2 y variante), «Desafío» (variante y Desafío Firme), «Impacto Sísmico» (variante y nodo de la Maga), «Grieta Abierta» (variante y nodo de la Maga) | Renombrados (§10): Sed Voraz, Inamovible, Caída Atronadora… |
| Ápice en cadena de tres nodos | x1 → x2 → x3 | Un ápice de 4 rangos (b28) |
| Siglas y anglicismos | «+30 de stagger», «Apex I» | Quebranto, Ápice |
| Rol del Cruzado como apoyo puro | Bramido, Aura y curas en el mismo árbol | Etapa 2: apoyo con martillo, no sanador puro |

### 3.3 Modelo de capas (como la Maga)

| Capa | Qué es | Contenido |
|---|---|---|
| **Kit base del Guerrero** | Lo que sabe todo Guerrero desde el Nv1 | Tajo (1), Hendidura (2), Embestida (4), Piel de Hierro (6), Lanza Arrojadiza (8) |
| **Kit de especialización** | Llega al elegirla (Nv10) y por nivel | Berserker: Remolino Sangriento (insignia `3`, Nv10), Salto Devastador (`1`, Nv12), Rajar (`DER/2`, Nv14), Furia Inmortal (`4`, Nv15). Guardián y Cruzado: etapa 2 |
| **Talentos** | Clase · Paragon · Especialización | §6, §9 y §7. Habilidades de talento: c11A, c17A y c22A (clase) y una por árbol héroe (etapa 2) |
| **Forja** | Mejora (Nv+3) y 2 variantes (Nv+6) | Transforma (forma, geometría, ritmo); el talento añade, multiplica o cambia cómo se usa el verbo (§10) |

Total al final: 5 de base + 3 de clase + 12 de especialización + 3 de héroe = **23 activas** (hoy 28), igual que la Maga.

**Calendario Nv1–15:**

| Nv | Kit base | Berserker | Talentos |
|---|---|---|---|
| 1 | Tajo | | — |
| 2 | Hendidura | | — |
| 4 | Embestida | | — |
| 6 | Piel de Hierro | | — |
| 8 | Lanza Arrojadiza | | — |
| **10** | | Remolino Sangriento (`3`) | Sed de Batalla gratis + 1.er punto de especialización |
| 11 | | | 1.er punto de clase |
| 12 | | Salto Devastador (`1`) | |
| 14 | | Rajar (`DER/2`) | |
| 15 | | Furia Inmortal (`4`) | |

Las habilidades de talento de clase llegan cuando su nodo se puede comprar: Segundo Aliento ≈ Nv21, Grito de Guerra ≈ Nv27, Intervención ≈ Nv31 (los mismos huecos que la Maga).

**Ritmo y presupuesto:** idénticos a la Maga (§3 de su documento y `TV2.REGLAS`). Comprobado por el validador sobre los datos del Guerrero:

| Árbol | Puertas (comprando todo seguido) | Un final al máximo | Dos finales |
|---|---|---|---|
| Clase | 8 → fila 4 (Nv25) · 24 → fila 7 (Nv57) | 30 puntos (Nv69) | 36 > 34: imposible |
| Berserker | 8 → fila 4 (Nv24) · 20 → fila 7 (Nv48) · 25 → ápice (Nv58) | 26 (Nv60); con el ápice completo, 30 (Nv68) | 32 > 31: imposible |

---

## 4. Kit base (Nv1–8) con su forja

| Habilidad | Ranura · Nv | Qué hace | Mejora (Nv+3) | Variante I (Nv+6) | Variante II (Nv+6) |
|---|---|---|---|---|---|
| **Tajo** | Básica `IZQ` · 1 | Cortas al objetivo y al que está pegado a él (50 %). Te da 10 de Furia, +2 por cada enemigo extra | Filo Ancho: salpicadura 50 → 65 % y alcance 2 → 2,5 m | **Desgarro** (un objetivo): sangra el 60 % del golpe en 3 s | **Siega** (área): barrido de 3 m al 75 % (absorbe al Embate) |
| **Hendidura** | Principal `DER/2` · 2 | Cono de 120° y 4,5 m (290 %); **se prepara 0,25 s** y la esquiva la cancela sin gastar Furia | Arco Amplio: cono 120 → 150° | **Rompefilas** (un objetivo): +45 % si golpea a uno solo | **Grieta** (área): deja una grieta 2 s (40 %/s), solo una |
| **Embestida** | Movilidad `1` · 4 | Embistes 7 m y golpeas al llegar (120 % a 1,9 m); si golpeas, +12 de Furia | Carga Fiera: alcance 9 m y +4 de Furia | **Carnero** (control): arrastras y aturdes 0,5 s | **Doble Carga** (movilidad): 2 cargas |
| **Piel de Hierro** | Defensa `2` · 6 | 8 s con un 40 % menos de daño; no te pueden ralentizar | Acero Templado: te curas el 8 % al activarla | **Espinas** (área): devuelves el 40 % del daño cuerpo a cuerpo | **Inamovible** (aguante): 10 s e imparable; se recarga en 25 s |
| **Lanza Arrojadiza** | Principal `DER/2` · 8 | Atraviesa a todos en 11 m (190 %): tu respuesta a voladores y lanzadores | Punta de Arpón: ralentiza un 30 % 2 s | **Arpón** (control): arrastras 4 m al primero (+30 %) | **Jabalinas** (área): 3 lanzas al 70 % |

Dos principales **de estilos distintos**: cuerpo a cuerpo con preparación (Hendidura) y a distancia instantánea (Lanza). Nada fuerte de una especialización: el giro, el combo, los martillos y la provocación son de las especializaciones.

---

## 5. Verbos de entrada y movimiento (pedido nuevo)

### 5.1 Vocabulario

| Verbo | Cómo se juega | Feedback | ¿Lo soporta hoy `game-skills.js`? |
|---|---|---|---|
| Pulsar | Sale al instante | — | Sí |
| **Preparación interrumpible** | Un instante de carga; la esquiva la cancela sin coste | Barra corta junto al personaje | Sí (`windup`); los nodos que la cambian necesitan claves nuevas (`windupAdd`, `windupMult`, `windupMove`) |
| **Canalizar mientras mantienes** | Sigue mientras mantienes; soltar lo corta | Aro que se consume | Sí (`startChannel`, `hold`); moverse mientras canalizas: `moveFree` (lo usa hoy el Remolino); **soltar con efecto**: `onEnd` con `inst.released` (nuevo) |
| **Cargar y soltar** con ventana perfecta | Mantienes para cargar; al soltar, más daño o alcance; soltar en la ventana da un extra | Barra de carga en la ranura y junto al cursor; destello y sonido en la ventana | **No: nuevo tipo genérico `charge`** (§11.4). Reservado para el Cruzado (§16) |
| **Relanzar dentro de una ventana** | La 2.ª pulsación en N s repite con otro efecto | Pips de usos restantes y aro de la ventana en la ranura | **No: clave nueva `recast`** |
| **Combo de 3** | Cada pulsación avanza un paso; el 3.º es distinto | 3 pips en la ranura; el 3.º brilla cuando toca | **No: nuevo tipo genérico `combo`** |
| Plantado frente a en marcha | Bonus por no moverte o por moverte | Icono de estado | Parcial (`drFocus` y la Concentración miran el movimiento) |
| Movimiento rápido y lento | Carga, salto, voltereta frente a avance pesado imparable | — | Sí (`dash`, `leap`); avance lento imparable: etapa 2 |
| Marcas, zonas, posición, posturas | Marca que se detona, trampa, por la espalda, dos posturas | — | Marcas y zonas sí; **postura: nuevo tipo `stance`** (etapa 2) |

### 5.2 Reparto en el Guerrero (cada especialización con su verbo principal)

| Especialización | Verbo principal | Otros verbos del kit | Estado |
|---|---|---|---|
| **Berserker** | **Encadenar en marcha**: relanzar el Salto y avanzar el combo sin parar | Canalizar en marcha (Remolino; soltar lo detona con Estallido Rojo), combo de 3 con preparación en el 3.º (Rajar), ventana de riesgo (Furia Inmortal) | Hecho |
| Guardián | **Plantado** (y posturas que se alternan) | Avance pesado imparable, provocación | Propuesta para la etapa 2 |
| Cruzado | **Cargar y soltar** con ventana perfecta (martillo) | Marcas que se detonan (Juicio), consagrar zonas | Propuesta para la etapa 2 |

**Nodos del Berserker que cambian sus verbos (no solo números):**

| Verbo | Nodos | Qué cambian |
|---|---|---|
| Canalizar en marcha (Remolino) | b18 Avidez, b22 Estallido Rojo, b25 Danza Carmesí | Te da Furia al girar; **soltar** detona los Sangrados; el giro no se acaba mientras toques a alguien que sangra |
| Relanzar (Salto) | b10 Cadena (5 saltos) o Aplastante, b17 Sin Suelo, b21 Caída Sangrienta, b24 Ímpetu, b27 Estampida Sin Fin | Más saltos; cada salto suma poder; el último desangra; la cadena se reinicia si el último golpea a 3 |
| Combo de 3 (Rajar) | b5 Reabrir, b6 Caída Brutal, b9 Onda o Remate, b19 Último Trago, b23 Verdugo, b26 Golpe de Gracia | Saltar al 3.er golpe tras caer; el 3.º suelta una onda o es crítico seguro; el 3.º golpea dos veces |
| Ventana de riesgo (Furia Inmortal) | b15 Negación de la Muerte, b17 Sin Suelo, b28 Corazón Indomable (rangos 3 y 4) | Sobrevivir a un golpe letal con la Sed llena; saltar sin recarga mientras dura; la definitiva se lanza sola cada 3 Sed Saciadas |
| Preparación (toda la clase) | c9 Golpe Pesado o Sin Pausa | Preparación +0,3 s con +40 % y Quebranto, o la mitad y moviéndote |
| Movilidad (toda la clase) | c7, c14, c27, c30 | Imparable al moverte; al llegar ralentizas o intimidas; tras moverte, la siguiente principal es gratis |

---

## 6. Árbol de clase del Guerrero (30 nodos)

Generada de los datos. ○ pasiva · ⬡ elección · □ opción que concede una habilidad. «Requiere» = cualquiera de esos nodos al máximo. Izquierda = **Defensa** (Piel de Hierro), centro = **Armas** (Furia y principales), derecha = **Movilidad** («tu movilidad»: la habilidad de la ranura `1`).

| Fila | Id | Nodo | Forma · tipo | Etiqueta | Rangos | Requiere | Qué hace (al máximo) | Cuál conviene |
|---|---|---|---|---|---|---|---|---|
| 0 | c1 | Constitución | ○ pasiva | número | 2 | — | Rango 2: +12 % de vida máxima |  |
| 0 | c2 | Fuerza Bruta | ○ pasiva | número | 2 | — | Rango 2: Todos tus golpes hacen +12 % de daño |  |
| 0 | c3 | Avance Implacable | ○ pasiva | número | 2 | — | Rango 2: Tu habilidad de movilidad se recarga un 24 % más rápido |  |
| 1 | c4 | Curtido | ○ pasiva | número | 3 | c1 | Rango 3: Piel de Hierro dura 11 s (antes 8 s) |  |
| 1 | c5 | Tajo: Firme o Voraz | ⬡ elección | mecánica | 1 | c1 o c2 | **A · ○ Tajo Firme**: Contra élites y jefes, cada Tajo te da 15 de Furia (antes 10) _(contra jefes)_<br>**B · ○ Tajo Voraz**: Si el Tajo mata, tu siguiente habilidad principal cuesta la mitad de Furia _(contra grupos)_ | A, contra jefes: con un solo blanco el Tajo no suma enemigos extra y así no te falta Furia. B, contra grupos: cada muerte abarata la siguiente principal |
| 1 | c6 | Principal: Ensañamiento o Sin Cuartel | ⬡ elección | mecánica | 1 | c2 o c3 | **A · ○ Ensañamiento**: Tus habilidades principales hacen +25 % al enemigo con más vida de los que golpean _(contra jefes)_<br>**B · ○ Sin Cuartel**: Tus habilidades principales hacen +5 % por cada enemigo que golpean (hasta +25 %) _(contra grupos)_ | A, contra jefes: el golpe grande va al que más aguanta. B, contra grupos: con 5 enemigos, +25 % a todas tus principales. Sirve igual a las tres especializaciones |
| 1 | c7 | Marcha Imparable | ○ pasiva | mecánica | 1 | c3 | Mientras usas tu movilidad y 1 s después eres imparable: nada te aturde ni te frena |  |
| 2 | c8 | Determinación | ○ pasiva | número | 2 | c4 o c5 | Rango 2: Con más de 50 de Furia, recibes un 16 % menos de daño |  |
| 2 | c9 | Preparación: Pesada o Sin Pausa | ⬡ elección | mecánica | 1 | c5 o c6 | **A · ○ Golpe Pesado**: Tus golpes con preparación tardan 0,3 s más, hacen +40 % y a los jefes les llenan 15 de Quebranto _(contra jefes)_<br>**B · ○ Sin Pausa**: Tus golpes con preparación tardan la mitad y puedes moverte mientras los preparas _(contra grupos)_ | A, contra jefes: más daño y Quebranto si aguantas la preparación (la esquiva la cancela). B, contra grupos: golpeas antes y sin pararte. Vale para la Hendidura y cualquier golpe que se prepare |
| 2 | c10 | Derribo o Silenciar | ⬡ elección | mecánica | 1 | c6 o c7 | **A · ○ Derribo**: Cada 8 s, tu siguiente golpe derriba 1 s (a los jefes no: les llena 20 de Quebranto) _(control)_<br>**B · ○ Silenciar**: Cada 10 s, tu siguiente Lanza Arrojadiza corta el hechizo del enemigo y lo deja mudo 3 s _(contra jefes)_ | A, contra grupos que te rodean. B, contra jefes y élites que lanzan hechizos: los cortas a distancia (y les llenas el Quebranto) |
| 3 | c11 | Segundo Aliento o Coraza | ⬡ elección | mecánica | 1 | c8 | **A · □ Segundo Aliento** (habilidad): Habilidad (ranura 2): gastas toda tu Furia y te curas un 1 % por cada 3 de Furia. Se recarga en 30 s _(supervivencia)_<br>**B · ○ Coraza de Hierro**: Al bajar del 30 % de vida, recibes un 30 % menos de daño durante 5 s. Una vez cada 60 s _(supervivencia)_ | A, si eliges cuándo curarte (ocupa la ranura 2): con 100 de Furia, un 33 % de vida. B, siempre activo y sin ocupar ranura |
| 3 | c12 | Furia Creciente | ○ pasiva | número | 2 | c8 o c9 | Rango 2: Generas un 20 % más de Furia |  |
| 3 | c13 | Golpes Precisos | ○ pasiva | número | 2 | c9 o c10 | Rango 2: +10 % de probabilidad de crítico |  |
| 3 | c14 | Movilidad: Polvareda o Reparo | ⬡ elección | mecánica | 1 | c10 | **A · ○ Polvareda**: Al llegar con tu movilidad, ralentizas un 50 % durante 3 s a todos a 3 m _(control)_<br>**B · ○ Carga Reparadora**: Tu movilidad te cura un 6 % de la vida y te quita las ralentizaciones _(supervivencia)_ | A, para encerrar a la manada o escapar de ella. B, para aguantar peleas largas |
| 4 | c15 | Furia Protectora o Desbordante | ⬡ elección | mecánica | 1 | c11 o c12 | **A · ○ Furia Protectora**: El 20 % del daño que recibes lo pagas con Furia en vez de vida _(supervivencia)_<br>**B · ○ Furia Desbordante**: Puedes guardar hasta 130 de Furia (antes 100); por encima de 100, haces +10 % de daño _(contra jefes)_ | A, para sobrevivir (+15–20 % de aguante), aunque gastas menos Furia en daño. B, para hacer daño: guardas Furia para las ráfagas |
| 4 | c16 | Filo Dentado o Contundencia | ⬡ elección | mecánica | 1 | c12 o c13 | **A · ○ Filo Dentado**: Tus Sangrados hacen +25 % de daño y duran 1 s más _(contra jefes)_<br>**B · ○ Contundencia**: Tus aturdimientos y derribos duran un 50 % más; a los jefes les llenan un 30 % más de Quebranto _(control)_ | A, si tu daño sangra (el Tajo con Desgarro y las habilidades que desangran): +25 % a todo ese daño. B, si controlas: más control y más Quebranto. Une el árbol con la forja |
| 4 | c17 | Grito de Guerra o Ira Contenida | ⬡ elección | mecánica | 1 | c13 o c14 | **A · □ Grito de Guerra** (habilidad): Habilidad (ranura 2): ganas 30 de Furia y tu grupo a 15 m hace +10 % de daño 8 s. Se recarga en 20 s _(contra jefes)_<br>**B · ○ Ira Contenida**: Cada 20 s, tu siguiente habilidad principal no cuesta Furia y hace +20 % _(contra jefes)_ | A, en grupo o para abrir una ráfaga (ocupa la ranura 2). B, en solitario y sin ocupar ranura |
| 5 | c18 | Hierro Vivo | ○ pasiva | número | 2 | c15 | Rango 2: Piel de Hierro se recarga en 14 s (antes 20 s) |  |
| 5 | c19 | Temple | ○ pasiva | mecánica | 1 | c15 o c16 | Con Piel de Hierro puesta, cada Tajo te da 3 de Furia más y la alarga 0,25 s (hasta 3 s más)<br>_híbrido: Defensa + Armas_ |  |
| 5 | c20 | Desequilibrio | ○ pasiva | mecánica | 1 | c16 o c17 | Tus críticos ralentizan un 30 % durante 2 s; contra ralentizados, tus principales tienen +10 % de crítico<br>_híbrido: Armas + Control_ |  |
| 5 | c21 | Persecución | ○ pasiva | número | 1 | c17 | Tu movilidad hace +50 % de daño a los enemigos ralentizados o aturdidos |  |
| 6 | c22 | Intervención o Hermandad | ⬡ elección | mecánica | 1 | c18 o c19 | **A · □ Intervención** (habilidad): Habilidad (ranura 2): saltas junto a un aliado (o 8 m) y los dos ganan un escudo del 15 % de tu vida. Se recarga en 20 s _(supervivencia)_<br>**B · ○ Hermandad de Armas**: Tú y tus aliados a 15 m ganan +5 % de daño y +8 % de vida; generas un 5 % más de Furia por aliado _(supervivencia)_ | A, en grupo: proteges a un aliado y te recolocas (ocupa la ranura 2); en solitario, un segundo salto con escudo. B, siempre activo y sin ocupar ranura |
| 6 | c23 | Ritmo de Combate | ○ pasiva | mecánica | 2 | c19 o c20 | Rango 2: Cada crítico del Tajo recarga 1 s de tu movilidad y de Piel de Hierro |  |
| 6 | c24 | Brazo Veloz | ○ pasiva | número | 2 | c20 o c21 | Rango 2: Atacas un 14 % más rápido |  |
| 7 | c25 | Rencor | ○ pasiva | mecánica | 3 | c22 | Rango 3: Al acabar Piel de Hierro, devuelves el 30 % del daño que evitó a los enemigos a 4 m |  |
| 7 | c26 | Desenfreno | ○ pasiva | mecánica | 3 | c23 | Rango 3: Si gastas 80 de Furia en 4 s, haces +28 % de daño durante 4 s |  |
| 7 | c27 | Rugido de Carga | ○ pasiva | mecánica | 3 | c24 | Rango 3: Al llegar con tu movilidad, intimidas a los enemigos a 5 m: hacen un 24 % menos de daño durante 4 s |  |
| 8 | c28 | Inquebrantable | ○ **FINAL** | mecánica | 3 | c25 | Rango 3: Piel de Hierro no caduca: dura hasta 5 golpes y vuelve a los 15 s. Con ella, generas un 30 % más de Furia<br>_final: Defensa_ |  |
| 8 | c29 | Señor de la Guerra | ○ **FINAL** | mecánica | 3 | c26 | Rango 3: Cada 100 de Furia que gastas, tu siguiente principal golpea dos veces: la copia es gratis y hace el 80 %<br>_final: Armas_ |  |
| 8 | c30 | Asalto Total | ○ **FINAL** | mecánica | 3 | c27 | Rango 3: Tras usar tu movilidad, tu siguiente principal no cuesta Furia y hace +45 %; si mata, la movilidad se recarga<br>_final: Movilidad_ |  |

**Tres finales:** **Inquebrantable** (Defensa: Piel de Hierro se queda hasta 5 golpes y da Furia), **Señor de la Guerra** (Armas: cada 100 de Furia gastada, la siguiente principal golpea dos veces) y **Asalto Total** (Movilidad: tras moverte, la siguiente principal es gratis y +45 %, y si mata vuelve la movilidad).

**Etiquetas:** filas 3–9, 15 de 20 «mecánica» (75 %; mínimo 60 %). Cada «número» da ≥ +10 % en su eje.

**Implementación (por nodo):** `c1` stats.hpPct · existe; `c2` mod @all dmg · existe; `c3` mod @movement cdr · existe; `c4` mod g_piel durS · claves; `c5` A: power g_tajo_firme · NUEVO · B: power g_tajo_voraz · NUEVO; `c6` A: power g_ensanamiento · NUEVO · B: power g_sin_cuartel · NUEVO; `c7` mod @movement unstoppable · claves; `c8` tv.drHighFury · NUEVO (copia de drHighMana); `c9` A: mod @windup windupAdd/dmg/stagger · claves NUEVAS · B: mod @windup windupMult/windupMove · claves NUEVAS; `c10` A: power g_derribo · NUEVO · B: power g_silenciar · NUEVO; `c11` A: activa g_t_aliento · existe · B: power g_coraza_hierro · existe; `c12` stats.resGainPct · NUEVO; `c13` stats.crit · existe; `c14` A: power g_polvareda · NUEVO · B: power g_carga_reparadora · NUEVO; `c15` A: power g_furia_protectora · NUEVO · B: resMaxAdd + power g_desbordante · NUEVO; `c16` A: tv.bleedPct + bleedDur · existen · B: tv.ccDurPct + staggerPct · NUEVOS; `c17` A: activa grito_guerra · existe (pasa de base a talento) · B: power g_ira_contenida · NUEVO; `c18` mod g_piel cdr · existe; `c19` power g_temple · NUEVO; `c20` power g_desequilibrio · NUEVO; `c21` power g_persecucion · NUEVO; `c22` A: activa g_t_intervencion · existe (pasa a la ranura 2) · B: power g_aura_hermandad · existe; `c23` tv.basicCritCdr · NUEVO; `c24` stats.aspdPct · existe; `c25` power g_rencor · NUEVO; `c26` power g_ira_gasto · NUEVO (⑪ onResource); `c27` power g_rugido_carga · NUEVO (e.weakenOutgoing); `c28` power g_inquebrantable · NUEVO; `c29` power g_senor_guerra · NUEVO (eco del canal); `c30` power g_asalto_total · NUEVO.

### 6.1 Revisión: ¿sirve igual a las tres especializaciones?

| Rama / nodo | Berserker (hecho) | Guardián (etapa 2, previsto) | Cruzado (etapa 2, previsto) | Veredicto |
|---|---|---|---|---|
| c5 Tajo | El Tajo es la única básica | Igual | Igual | Sirve a las tres |
| c6 Principales | Rajar, Hendidura, Lanza | Su principal | Su principal | Habla de «tus principales»: sirve a las tres |
| c9 Preparación | Hendidura y el 3.er golpe de Rajar | Si su principal se prepara | Ojo: si el martillo es «cargar y soltar», c9 **no** lo toca (§16) | Sirve; la etapa 2 debe dar preparación a alguna habilidad suya |
| c10B Silenciar | Lanza Arrojadiza (kit base) | Igual | Igual | Sirve a las tres |
| c3, c7, c14, c21, c23, c27, c30 Movilidad | **Salto Devastador** en la ranura `1` | Su movilidad | Embestida | **Cambiado en la refutación:** «tu movilidad» en vez de «la Embestida» (§15) |
| c4, c18, c19, c25, c28 Piel de Hierro | Ranura `2` | Ranura `2` (o su defensa de talento) | Ranura `2` | Es el kit base: sirve; la etapa 2 no debe meter otra defensa en el kit de especialización |
| c16 Sangre o control | A (Sangrado) | B (control) | A o B según su forja | **Dependiente del kit a propósito** (como Pureza Elemental en la Maga): une el árbol con la forja |
| Finales | Asalto Total (Estampida) y Señor de la Guerra (híbrida) | Inquebrantable (previsto) | Señor de la Guerra o Asalto Total | Las builds de la etapa 2 deben usar Inquebrantable (hoy aviso del validador) |

Ningún nodo de clase nombra una habilidad de especialización (G1, comprobado por el validador y por `check-etapa1.mjs`).

---

## 7. Especializaciones (29 nodos cada una, misma rejilla)

### 7.1 Berserker (daño cuerpo a cuerpo · Sed)

**Fantasía:** furia desatada: cuanto menos vida te queda, más fuerte golpeas. Giras, saltas y rematas sin parar.
**Pasiva («Al borde»):** con menos del 40 % de vida (o con la Sed Saciada) haces +25 % de daño. Es el ×1,25 de `m_berserk`; Furia Inmortal te deja quedarte ahí.
**Rol:** el que más daño hace del Guerrero (2e: contra un solo objetivo debe hacer al menos un 10 % más que las otras dos); aguante medio que depende de curarse al matar.

**Kit (libro; forja con Mejora a Nv+3 y variantes a Nv+6):**

| Habilidad | Ranura · Nv | Qué hace | Mejora | Variante I | Variante II |
|---|---|---|---|---|---|
| **Remolino Sangriento** | Insignia `3` · 10 | **Mantén** para girar hasta 3 s **sin dejar de moverte**: golpeas a 2,9 m 4 veces por segundo (45 %) y desangras. 30 de Furia, 6 s | Giro Firme: no te pueden ralentizar al girar | **Remolino Anclado** (un objetivo): giras **sin moverte**: radio 2 m y +60 % | **Ciclón** (control): cada giro atrae 1 m a los enemigos a 5 m; −15 % |
| **Salto Devastador** | Movilidad `1` · 12 | Saltas hasta 8 m y golpeas al caer (150 % a 3 m). **Si golpeas, puedes volver a saltar en 2 s (hasta 3 saltos)**. 12 s | Caída Pesada: radio 3 → 4 m | **Caída Atronadora** (control): un solo salto; atraes 2 m y aturdes 0,75 s | **Salto Rasante** (movilidad): 12 m, bajo y rápido (0,25 s en el aire); −20 % |
| **Rajar** | Principal `DER/2` · 14 | **Combo de 3**: tajo, revés y un golpe descendente (320 %) que **se prepara 0,3 s** y desangra. Si paras 2,5 s, vuelve al 1.º. 15 de Furia por golpe | Filo Encadenado: el combo espera 4 s | **Estocada Final** (un objetivo): el 3.º es una estocada de 5 m en línea, +40 % | **Molino** (área): los tres golpes son giros de 2,5 m; −20 % |
| **Furia Inmortal** | Definitiva `4` · 15 | 10 s **imparable**: tu vida **no baja del 1 %** y tus principales no cuestan Furia. Al acabar, te curas un 20 %. 60 s | Sin Freno: dura 12 s | **Sed Voraz** (aguante): robas el 8 % del daño como vida; al acabar no te curas | **Frenesí** (un objetivo): +40 % de velocidad de ataque, pero la vida sí puede bajar del 1 % |

Recomendadas (★ del libro): Tajo **I** (Desgarro: el Sangrado llena la Sed), Remolino **II** (Ciclón) y Furia Inmortal **I** (Sed Voraz). Barra recomendada: `IZQ` Tajo · `DER` Rajar · `1` Salto Devastador · `2` Piel de Hierro · `3` Remolino Sangriento · `4` Furia Inmortal.

**Barra de mecánica: Sed** (ya existe en `spec-mechanics.js`; el libro la dibuja con el widget real):

| Generar | Descargar | Pérdida | La alimentan |
|---|---|---|---|
| +1 por cada 1 % de vida que pierdes y +2 por golpe de Sangrado (como mucho 10 por segundo) | A 100: **Sed Saciada** 6 s: +25 % de daño aunque tengas la vida alta. Después vuelve a 0 | −8 por segundo tras 4 s fuera de combate | Tajo con Desgarro, Remolino Sangriento, el 3.er golpe de Rajar; con talentos, Reabrir (b5), Último Trago (b19), Caída Sangrienta (b21) y el ápice |

**Árbol (generado):**

| Fila | Id | Nodo | Forma · tipo | Etiqueta | Rangos | Requiere | Qué hace (al máximo) | Cuál conviene |
|---|---|---|---|---|---|---|---|---|
| 0 | b0 | Sed de Batalla | ○ clave | mecánica | gratis | gratis | Perder vida y desangrar llenan tu Sed. A 100, Sed Saciada 6 s: +25 % de daño aunque tengas la vida alta |  |
| 1 | b1 | Heridas Abiertas | ○ pasiva | número | 3 | b0 | Rango 3: Tus Sangrados duran 6 s (antes 3 s) |  |
| 1 | b2 | Instinto Asesino | ○ pasiva | número | 3 | b0 | Rango 3: Rajar tiene +15 % de probabilidad de crítico |  |
| 1 | b3 | Zancada | ○ pasiva | número | 3 | b0 | Rango 3: El Salto Devastador se recarga en 7,5 s (antes 12 s) |  |
| 2 | b4 | Sangre Espesa | ○ pasiva | número | 2 | b1 | Rango 2: Tus Sangrados hacen +30 % de daño |  |
| 2 | b5 | Reabrir | ○ pasiva | mecánica | 1 | b1 o b2 | Cada golpe de Rajar a un enemigo que sangra reinicia su Sangrado y te da 3 de Sed<br>_híbrido: Hemorragia + Verdugo_ |  |
| 2 | b6 | Caída Brutal | ○ pasiva | mecánica | 1 | b2 o b3 | Al caer de un Salto Devastador, tu siguiente Rajar empieza por el 3.er golpe<br>_híbrido: Verdugo + Estampida_ |  |
| 2 | b7 | Suelo Roto | ○ pasiva | mecánica | 2 | b3 | Rango 2: Al caer, el Salto Devastador ralentiza un 50 % durante 2 s a los que golpea |  |
| 3 | b8 | Contagio o Desangrar | ⬡ elección | mecánica | 1 | b4 o b5 | **A · ○ Contagio**: Cuando muere un enemigo que sangra, su Sangrado pasa a 2 enemigos a 3 m _(contra grupos)_<br>**B · ○ Desangrar**: Puedes poner hasta 3 Sangrados a la vez en el mismo enemigo _(contra jefes)_ | A, contra grupos: cada muerte desangra a los siguientes. B, contra jefes: hasta ×2,4 de daño de Sangrado. Decide qué Hemorragia juegas |
| 3 | b9 | Rajar: Onda o Certero | ⬡ elección | mecánica | 1 | b5 o b6 | **A · ○ Onda de Choque**: El 3.er golpe de Rajar suelta una onda que hace el 60 % a todos a 4 m _(contra grupos)_<br>**B · ○ Remate Certero**: El 3.er golpe de Rajar es crítico seguro y a los jefes les llena 15 de Quebranto _(contra jefes)_ | A, contra grupos: el remate alcanza a toda la manada. B, contra jefes: un crítico seguro cada 3 golpes y Quebranto. Decide qué Verdugo juegas |
| 3 | b10 | Salto: Cadena o Aplastante | ⬡ elección | mecánica | 1 | b6 o b7 | **A · ○ Salto en Cadena**: Puedes encadenar hasta 5 saltos (antes 3) _(contra grupos)_<br>**B · ○ Salto Aplastante**: Cada salto seguido sobre el mismo enemigo hace un 40 % más que el anterior (hasta +120 %) _(contra jefes)_ | A, contra grupos: saltas de manada en manada. B, contra jefes: tres caídas cada vez más fuertes sobre el mismo. Decide qué Estampida juegas |
| 4 | b11 | Festín de Sangre | ○ pasiva | número | 2 | b8 | Rango 2: Matar a un enemigo que sangra te cura un 4 % de vida y te da 8 de Furia |  |
| 4 | b12 | Ritmo de Matanza | ○ pasiva | mecánica | 2 | b8 o b9 | Rango 2: Cada crítico de Rajar acorta 1 s todas tus recargas |  |
| 4 | b13 | Peso Muerto | ○ pasiva | número | 2 | b9 o b10 | Rango 2: El Salto Devastador hace +40 % de daño |  |
| 4 | b14 | Impacto Aturdidor | ○ pasiva | mecánica | 1 | b10 | Quien sobrevive a la caída del Salto queda aturdido 0,5 s; a los jefes les llena 15 de Quebranto |  |
| 5 | b15 | Negación o Umbral | ⬡ elección | mecánica | 1 | b11 o b12 | **A · ○ Negación de la Muerte**: Un golpe que te mataría te deja con 1 de vida y la Sed llena. Una vez cada 2 min _(supervivencia)_<br>**B · ○ Umbral del Dolor**: Con menos del 40 % de vida, recibes un 15 % menos de daño _(supervivencia)_ | A, donde morir cuesta caro (Hardcore, jefes Pináculo): además te deja con la Sed Saciada. B, contra grupos: aguante siempre que juegas al borde |
| 5 | b16 | Sangre Hirviente | ○ pasiva | mecánica | 2 | b12 o b13 | Rango 2: Con más de 50 de Sed, tus golpes, giros y saltos van un 16 % más rápido<br>_híbrido: Los tres estilos (por la Sed)_ |  |
| 5 | b17 | Sin Suelo | ○ pasiva | mecánica | 2 | b13 o b14 | Rango 2: Durante Furia Inmortal, el Salto Devastador no se recarga y encadena 2 saltos más |  |
| 6 | b18 | Avidez | ○ pasiva | mecánica | 2 | b15 | Rango 2: Mientras giras, cada enemigo que empiezas a desangrar te da 4 de Furia |  |
| 6 | b19 | Último Trago | ○ pasiva | mecánica | 2 | b15 o b16 | Rango 2: El 3.er golpe de Rajar te da 10 de Sed (el doble contra élites y jefes) |  |
| 6 | b20 | Alcance Salvaje | ○ pasiva | número | 2 | b16 o b17 | Rango 2: Tus golpes de área cuerpo a cuerpo son un 30 % más grandes |  |
| 6 | b21 | Caída Sangrienta | ○ pasiva | mecánica | 1 | b17 | El último salto de la cadena desangra a todos los que golpea (el 100 % del golpe en 3 s) |  |
| 7 | b22 | Estallido Rojo | ○ pasiva | mecánica | 3 | b18 | Rango 3: Al soltar el Remolino, los Sangrados a 4 m estallan: hacen de golpe el 65 % de lo que les queda |  |
| 7 | b23 | Verdugo | ○ pasiva | mecánica | 3 | b19 | Rango 3: El 3.er golpe de Rajar hace +9 % por cada 10 % de vida que le falta al objetivo |  |
| 7 | b24 | Ímpetu | ○ pasiva | mecánica | 3 | b21 | Rango 3: Cada salto de la cadena te da +9 % de daño durante 8 s (se suma hasta 5 veces) |  |
| 8 | b25 | Danza Carmesí | ○ **FINAL** | mecánica | 3 | b22 | Rango 3: El Remolino no se acaba mientras toques a alguien que sangra; tras 3 s, cuesta 8 de Furia por segundo. Sangrados +30 %<br>_final: Hemorragia_ |  |
| 8 | b26 | Golpe de Gracia | ○ **FINAL** | mecánica | 3 | b23 | Rango 3: El 3.er golpe de Rajar golpea dos veces: el 2.º hace el 60 % y deja al objetivo Vulnerable 4 s. Rajar +30 %<br>_final: Verdugo_ |  |
| 8 | b27 | Estampida Sin Fin | ○ **FINAL** | mecánica | 3 | b24 | Rango 3: Al acabar la cadena, si el último salto golpeó a 3 o más, el Salto Devastador se recarga al instante. Salto +30 %<br>_final: Estampida_ |  |
| 9 | b28 | Corazón Indomable | ○ **ÁPICE** | mecánica | 4 | b25 o b26 o b27 | 1) Matar a un élite te da 30 de Sed. 2) La Sed Saciada dura 9 s (antes 6 s). 3) Con la Sed Saciada, un golpe que te mataría te deja con 1 de vida (una vez por Sed). 4) Cada 3 Sed Saciadas, Furia Inmortal se lanza sola 5 s, gratis. |  |

**Etiquetas:** filas 3–9, 18 de 21 «mecánica» (86 %).

| Arquetipo | Fantasía | Verbo | Elección que lo define | Penúltimo → final | Mejor en |
|---|---|---|---|---|---|
| **Hemorragia** | Giras entre la manada y todo sangra; sueltas y estalla | Canalizar en marcha y **soltar** | b8 **Contagio** (grupos) o Desangrar (jefes) | Estallido Rojo → **Danza Carmesí** | Grupos y supervivencia |
| **Verdugo** | Tres golpes y el tercero parte en dos | Combo de 3 con preparación en el 3.º | b9 Onda de Choque (grupos) o **Remate Certero** (jefes) | Verdugo → **Golpe de Gracia** | Jefes |
| **Estampida** | Saltas de manada en manada sin tocar el suelo | Relanzar en una ventana | b10 **Salto en Cadena** (grupos) o Aplastante (jefes) | Ímpetu → **Estampida Sin Fin** | Grupos con control |

Nodos que mezclan arquetipos: **Reabrir** (Hemorragia + Verdugo), **Caída Brutal** (Verdugo + Estampida: tras caer, el combo empieza por el remate), **Sangre Hirviente** (los tres, por la Sed) y **Alcance Salvaje** (común). El ápice **Corazón Indomable** (4 rangos) sirve a los tres.

**Implementación (por nodo):** `b0` mecánica sed + power m_berserk · existen (ya no concede activa); `b1` tv.bleedDur · NUEVO (copia de burnDur); `b2` mod g_rajar crit · claves; `b3` mod g_salto cdr · existe; `b4` tv.bleedPct · existe; `b5` power b_reabrir · NUEVO (onHit + replaceDoT + gainGauge); `b6` power b_caida_brutal · NUEVO (afterCast g_salto → paso 3 del combo); `b7` mod g_salto slow · claves; `b8` A: power b_contagio · NUEVO (lógica de p_propagacion) · B: power b_desangrar · NUEVO (lógica de p_acumular); `b9` A: power b_onda_choque · NUEVO · B: power b_remate_certero · NUEVO (forceCrit + addStagger); `b10` A: mod g_salto recastAdd 2 · clave NUEVA · B: power b_salto_aplastante · NUEVO; `b11` tv.bleedKillHeal + bleedKillMana · existen; `b12` tv.critCdrAll · NUEVO; `b13` mod g_salto dmg · existe; `b14` mod g_salto stun + stagger · claves; `b15` A: power g_negacion · existe (+ llena la Sed) · B: tv.drLowHp · NUEVO; `b16` power b_sangre_hirviente · NUEVO (stats con gaugeValue); `b17` power b_sin_suelo · NUEVO (modifyResolve con el buff de Furia Inmortal); `b18` power b_avidez · NUEVO (onHit en el canal); `b19` power b_ultimo_trago · NUEVO; `b20` mod @melee radius · existe; `b21` power b_caida_sangrienta · NUEVO (applyDoT); `b22` power b_estallido_rojo · NUEVO (onEnd del canal + consumeDoT); `b23` power b_verdugo · NUEVO (condAdd por vida que falta); `b24` power b_impetu · NUEVO (buff con pilas); `b25` power b_danza_carmesi · NUEVO (canal sin fin con drainPerSec); `b26` power b_golpe_gracia · NUEVO (eco del paso 3 + Vulnerable); `b27` power b_estampida · NUEVO (al acabar la cadena, resetCd); `b28` power b_corazon_indomable (rangos) · NUEVO.

### 7.2 Guardián (tanque · Bastión): pendiente (etapa 2)

Pendiente (etapa 2). Datos: esqueleto válido (`tree.spec.guardian = []`, metadatos con ESBOZO). Rol que debe mantener: **el tanque** (§16.4).

### 7.3 Cruzado (apoyo con martillo sagrado · Fervor): pendiente (etapa 2)

Pendiente (etapa 2). Datos: esqueleto válido (`tree.spec.cruzado = []`). Rol: apoyo con algo de cura o escudo sobre el aliado con menos vida (`target:'lowest'`), no sanador puro (§16.4).

### 7.4 Las tres especializaciones, juntas (parcial)

| | Berserker | Guardián | Cruzado |
|---|---|---|---|
| Rol | Daño cuerpo a cuerpo | Tanque | Apoyo con martillo |
| Mecánica | Sed (0–100) | Bastión (0–5 cargas) | Fervor (0–3) |
| Verbo principal | Encadenar en marcha | Plantado (propuesta) | Cargar y soltar (propuesta) |
| Arquetipos (A · B · C) | Hemorragia · Verdugo · Estampida | etapa 2 | etapa 2 |
| Finales | Danza Carmesí · Golpe de Gracia · Estampida Sin Fin | etapa 2 | etapa 2 |
| Ápice | Corazón Indomable | etapa 2 | etapa 2 |
| Árboles héroe | Titán · Gladiador (propuesta) | Titán · Caudillo (propuesta) | Gladiador · Caudillo (propuesta) |
| Híbrida | Sangre y Acero | etapa 2 | etapa 2 |

---

## 8. Builds del Berserker a Nv100 (2 de 4 en la etapa 1)

Validadas comprando **punto a punto en el orden de la build** (cada punto al primer nodo de la lista que se pueda comprar), como haría el jugador al subir. Están en el mockup (**Configuración** y **Recomendado**). Las cifras de «mejor en» son **estimaciones de diseño**; se calibran en E3. El Paragon queda vacío hasta que existan los árboles héroe (etapa 2).

### 8.1 «Estampida Sin Fin» (Estampida) · Paragon Titán (etapa 2)

- **Clase (34/34):** Fuerza Bruta 2 · Avance Implacable 2 · Sin Cuartel (B) 1 · Marcha Imparable 1 · Derribo (A) 1 · Polvareda (A) 1 · Ira Contenida (B) 1 · Desequilibrio 1 · Brazo Veloz 2 · Constitución 2 · Tajo Voraz (B) 1 · Sin Pausa (B) 1 · Furia Creciente 2 · Golpes Precisos 2 · Filo Dentado (A) 1 · Persecución 1 · Ritmo de Combate 2 · Rugido de Carga 3 · Asalto Total 3 · Determinación 2 · Curtido 2
- **Berserker (31/31):** Sed de Batalla (gratis) · Zancada 3 · Suelo Roto 2 · Caída Brutal 1 · Salto en Cadena (A) 1 · Peso Muerto 2 · Impacto Aturdidor 1 · Sin Suelo 2 · Caída Sangrienta 1 · Ímpetu 3 · Estampida Sin Fin 3 · Corazón Indomable 4 · Instinto Asesino 3 · Onda de Choque (A) 1 · Sangre Hirviente 2 · Alcance Salvaje 2
- **Paragon:** pendiente (etapa 2)
- **Validación:** clase 34/34 con **Asalto Total al Nv69**; Berserker 31/31 con **Estampida Sin Fin al Nv60** (ápice completo al Nv68).

**Rotación.** Salto Devastador sobre la manada: la caída ralentiza (Suelo Roto) y aturde (Impacto Aturdidor). **Caída Brutal**: el siguiente Rajar empieza por el 3.er golpe, que suelta la **Onda de Choque**. Vuelves a saltar (hasta 5 con Salto en Cadena), y cada salto suma **Ímpetu** (+9 % por salto, hasta 5). El último salto **desangra** a todos (Caída Sangrienta) y llena la Sed. Si golpeó a 3 o más, **Estampida Sin Fin** recarga el Salto al instante. Del árbol de clase: **Asalto Total** hace gratis y +45 % la principal que sigue al salto, y Polvareda y Rugido de Carga controlan y debilitan a la manada al llegar. Furia Inmortal + **Sin Suelo**: 10 s saltando sin recarga.
**Dónde brilla:** grupos y control (Pesadillas, oleadas). Contra jefes rinde menos: el Salto en Cadena necesita blancos nuevos.

### 8.2 «Sangre y Acero» (híbrida Hemorragia + Verdugo, sin final) · Paragon Gladiador (etapa 2)

- **Clase (34/34):** Constitución 2 · Fuerza Bruta 2 · Tajo Firme (A) 1 · Ensañamiento (A) 1 · Golpe Pesado (A) 1 · Furia Creciente 2 · Golpes Precisos 2 · Filo Dentado (A) 1 · Temple 1 · Ritmo de Combate 2 · Silenciar (B) 1 · Ira Contenida (B) 1 · Desequilibrio 1 · Curtido 3 (1 + 2 tardíos) · Determinación 2 · Furia Desbordante (B) 1 · Avance Implacable 2 · Desenfreno 3 · Señor de la Guerra 3 · Brazo Veloz 2
- **Berserker (31/31):** Sed de Batalla (gratis) · Heridas Abiertas 3 · Instinto Asesino 3 · Sangre Espesa 2 · Reabrir 1 · Contagio (A) 1 · Remate Certero (B) 1 · Festín de Sangre 2 · Ritmo de Matanza 2 · Umbral del Dolor (B) 1 · Sangre Hirviente 2 · Avidez 2 · Último Trago 2 · Estallido Rojo 3 · Verdugo 3 · Zancada 1 · Alcance Salvaje 2
- **Paragon:** pendiente (etapa 2)
- **Validación:** clase 34/34 con **Señor de la Guerra al Nv69**; Berserker 31/31 **sin final** (los dos penúltimos al máximo: Estallido Rojo y Verdugo).

**Rotación.** Remolino Sangriento entre la manada: todo sangra (6 s con Heridas Abiertas) y te da Furia (Avidez). **Sueltas** el Remolino en el centro: **Estallido Rojo** hace estallar el 65 % de los Sangrados. Sobre el élite, **Rajar**: cada golpe a quien sangra reinicia su Sangrado (**Reabrir**) y el 3.er golpe, preparado con **Golpe Pesado** (+40 % y Quebranto), es crítico seguro (**Remate Certero**) y hace más cuanta menos vida le queda (**Verdugo**). Cada muerte desangra a los siguientes (Contagio) y te cura (Festín de Sangre). **Señor de la Guerra**: cada 100 de Furia gastada, el siguiente Rajar golpea dos veces.
**Dónde brilla:** contenido mixto (élites con manada, recompensas, Pesadillas). Juega «al borde» con Umbral del Dolor.

### 8.3 Las otras dos (etapa 2)

| Build prevista | Arquetipo | Final de clase sugerido | Nota |
|---|---|---|---|
| «Danza Carmesí» | Hemorragia | **Inquebrantable** (hoy ninguna build lo usa: aviso del validador) | Supervivencia alta: Piel de Hierro que no caduca + curas al matar |
| «Golpe de Gracia» | Verdugo | Señor de la Guerra o Asalto Total | La mejor contra jefes |

### 8.4 Comparación (estimación de diseño; el dueño acepta la híbrida a ~8–10 %)

| Build | Contra jefes | Contra 5 | Peor de los dos | Control | Supervivencia |
|---|---|---|---|---|---|
| Estampida Sin Fin (Estampida) | 0,84 | **1,00** | 0,84 | **alto** (ralentiza, aturde, debilita) | media |
| Sangre y Acero (**híbrida**) | 0,93 | 0,91 | **0,91** | bajo | alta |
| Danza Carmesí (Hemorragia, etapa 2) | 0,86 | 0,97 | 0,86 | medio | **muy alta** |
| Golpe de Gracia (Verdugo, etapa 2) | **1,00** | 0,78 | 0,78 | bajo | baja |

La híbrida queda a un 7–9 % de la mejor en cada escenario (dentro del pedido) y es la que mejor «peor caso» tiene, como en la Maga.

---

## 9. Paragon: árboles héroe del Guerrero (pendiente, etapa 2)

Pendiente (etapa 2). Reglas: §7.1 de la Maga (gris hasta 31/31, clave gratis + 10 puntos, en pausa si bajas de 31). Los datos traen tres esqueletos con la combinación de especializaciones ya fijada y una **propuesta de tema no vinculante**:

| Árbol (id) | Especializaciones | Propuesta de tema (de la clase, no de una especialización) |
|---|---|---|
| **Titán** (`h1`) | Berserker · Guardián | Peso y sacudidas: tus golpes grandes hacen temblar el suelo y llenan el Quebranto |
| **Gladiador** (`h2`) | Berserker · Cruzado | El duelo: armas arrojadizas y contraataques tras esquivar |
| **Caudillo** (`h3`) | Guardián · Cruzado | Estandartes y gritos que mandan sobre el grupo (candidato a recibir Estandarte de Guerra o Bramido de Guerra como su habilidad) |

---

## 10. Forja y talentos: sin repetición

**Regla (Anexo A.4 de la Maga):** la forja **transforma** (forma, geometría, ritmo); el talento **añade, multiplica o cambia cómo se usa el verbo**.

| Habilidad | Variantes | Talentos que la tocan | Cómo conviven |
|---|---|---|---|
| Tajo | Desgarro · Siega | c5, c19, c23 | La variante da el Sangrado o el barrido; los talentos dan Furia y recargas |
| Hendidura | Rompefilas · Grieta | c6, c9 | c9 cambia la **preparación**, no la forma |
| Lanza Arrojadiza | Arpón · Jabalinas | c6, c10B | Silenciar añade un corte de hechizo; no arrastra (eso es el Arpón) |
| Embestida y Salto (movilidad) | Carnero · Doble Carga · Caída Atronadora · Salto Rasante | c3, c7, c14, c21, c23, c27, c30; b3, b6, b7, b10, b13, b14, b17, b21, b24, b27 | **Caída Atronadora quita la cadena** (un solo salto): quien la elija renuncia a la Estampida a cambio de control. La Mejora y Salto Rasante no tocan la cadena |
| Piel de Hierro | Espinas · Inamovible | c4, c18, c19, c25, c28 | Inquebrantable cambia la duración; Espinas devuelve daño mientras dura; Rencor devuelve al acabar (distinto momento) |
| Remolino Sangriento | Remolino Anclado · Ciclón | b8, b18, b22, b25 | **Anclado = plantado** (no te mueves, +60 %); Danza Carmesí alarga el giro en las dos formas |
| Rajar | Estocada Final · Molino | b2, b5, b6, b9, b12, b19, b23, b26 | La variante cambia la geometría de los golpes; los talentos cambian el **3.er golpe** (onda, crítico, doble) |
| Furia Inmortal | Sed Voraz · Frenesí | b17, b28 | **Frenesí quita la inmortalidad** a cambio de velocidad: es la variante de riesgo |

**Nombres:** ninguna repetición dentro del Guerrero ni con la Maga (comprobado con `check-etapa1.mjs`). Renombrados respecto de 2f: «Bastión» (Piel de Hierro II) → **Inamovible** (Bastión es la barra del Guardián); «Sed de Batalla» (Furia Inmortal I) → **Sed Voraz** (Sed de Batalla es el nodo clave); «Impacto Sísmico» (Salto I) → **Caída Atronadora** (nodo de la Maga).

---

## 11. Implementación (E1–E5, como la Maga)

### 11.1 `js/skills-guerrero.js`

| Qué | Cambio |
|---|---|
| Kit base | `g_tajo` (igual), `g_hendidura` (req 8 → **2**, windup 0,12 → **0,25**), `embestida` (igual), `g_piel` (12 s/−50 % → **8 s/−40 %**, 20 s; calibrar en E3 con el Guardián nuevo), `g_lanza` (req 14 → **8**) |
| Salen del libro | `g_mandoble`, `g_embate` (la Siega del Tajo absorbe al Embate), `torbellino` (→ `g_remolino`), `g_martillo`, `terremoto`, `g_provocacion`, `g_u_cataclismo`, `g_u_estandarte` (→ etapa 2); `grito_guerra` pasa a habilidad de talento (c17A) |
| Kit del Berserker (`spec:'berserker'`) | `g_remolino` **nuevo id** (era `g_t_remolino`): `type:'channel'`, `hold:true`, `moveFree:true`, `channelT 3`, `ticks 12`, `coef .45`, `cost 30`, `cd 6`, `dotKind:'bleed'` · `g_salto` (req 12, `spec`, `coef 1.5`, **`recast:{ n:3, win:2, cond:'hit' }`**) · `g_rajar` **nuevo**: `type:'combo'` · `g_u_furia` (`spec`, **`buff:{ minHpPct:1 }`**, `endHealPct 20`; sin +30 % de velocidad) |
| Forja | `GUERRERO_SKILL_FORGE` (formato 2f §2.3) para las 9 habilidades con forja; las variantes con `★` del §4 y §7.1 |

### 11.2 `js/talents-guerrero.js`

- Árbol de clase nuevo (`c1…c30`) y Berserker nuevo (`b0…b28`): **ids nuevos** (prefijo `b`; hoy son `s0…s17`, `x1…x3`). El Guardián y el Cruzado, en la etapa 2.
- `GUERRERO_TALENT_SKILLS`: se quedan `g_t_aliento` (c11A) y `g_t_intervencion` (c22A: `cat:'utility'`, `slots:['k2']`); entra `grito_guerra` (c17A). Salen `g_t_remolino` (al libro como `g_remolino`), `g_t_temeridad` y `g_t_ira_ciega` (sus ideas viven en Furia Inmortal y el ápice); `g_t_bramido`, `g_t_desafio`, `g_t_muro`, `g_t_carga`, `g_t_devocion`, `g_t_veredicto` y `g_t_justicia` quedan para la etapa 2.
- Selectores nuevos en los `mod`: `@movement` (la habilidad de la ranura `1`), `@windup` (habilidades con preparación) y `@melee` (tag `melee`).

### 11.3 `js/powers-guerrero.js`

- **Se conservan:** `m_berserk` (powers-common), `g_coraza_hierro`, `g_aura_hermandad`, `g_negacion` (+ llena la Sed).
- **Salen:** `g_remolino_sediento`, `g_instinto_asesino`, `g_desenfreno` (el id queda libre), `g_carnicero`, `g_matanza_eterna`, `g_crit_furia` y los del Guardián y del Cruzado que la etapa 2 no reutilice.
- **Nuevos (clase):** `g_tajo_firme`, `g_tajo_voraz`, `g_ensanamiento`, `g_sin_cuartel`, `g_derribo`, `g_silenciar`, `g_polvareda`, `g_carga_reparadora`, `g_furia_protectora`, `g_desbordante`, `g_ira_contenida`, `g_temple`, `g_desequilibrio`, `g_persecucion`, `g_rencor`, `g_ira_gasto`, `g_rugido_carga`, `g_inquebrantable`, `g_senor_guerra`, `g_asalto_total`.
- **Nuevos (Berserker, prefijo `b_`):** `b_reabrir`, `b_caida_brutal`, `b_contagio`, `b_desangrar`, `b_onda_choque`, `b_remate_certero`, `b_salto_aplastante`, `b_sangre_hirviente`, `b_sin_suelo`, `b_avidez`, `b_ultimo_trago`, `b_caida_sangrienta`, `b_estallido_rojo`, `b_verdugo`, `b_impetu`, `b_danza_carmesi`, `b_golpe_gracia`, `b_estampida`, `b_corazon_indomable`. Variantes: `v_rompefilas`, `v_carnero`, `v_temple`, `v_espinas`, `v_sed_voraz`.
- Ninguno declara `mult` (test67); los «+X %» van al saco aditivo.

### 11.4 Núcleo (`js/game-skills.js`, `js/skill-defs.js`): tipos y claves nuevos

| Tipo o clave | Para qué | Claves | Feedback de interfaz |
|---|---|---|---|
| **`combo`** (tipo genérico nuevo) | Rajar (3 golpes, el 3.º distinto) | `steps:[{ coef, type, radius, angle, range, windup, dot }]`, `comboWin` (s); estado `p.combo[id] = { step, t }`; `comboStep` lo fijan los poderes (Caída Brutal) | 3 pips en la ranura; el del paso siguiente iluminado; el 3.º en oro y con borde cuando toca; sonido propio del remate |
| **`recast`** (clave nueva) | Salto Devastador (relanzar en 2 s si golpeas) | `recast:{ n, win, cond:'hit' }`, `recastAdd` (b10A); el enfriamiento empieza al acabar la cadena; evento `onChainEnd` para b27 | Pips de saltos restantes sobre la ranura y aro que se vacía con la ventana; destello al reiniciarse (b27) |
| Canal con efecto al soltar | Estallido Rojo (b22) | `onEnd(inst)` con `inst.released` (soltó la tecla) frente a fin natural | Sonido de «suelta» y anillo rojo al soltar |
| Canal sin fin | Danza Carmesí (b25) | `drainPerSec` (coste por segundo tras `channelT`), condición de corte (`stopIf`) | El aro deja de vaciarse y late mientras tocas a alguien que sangra |
| Vida mínima | Furia Inmortal | buff `minHpPct` (la vida no baja de ese %), `endHealPct` | Contorno dorado en la barra de vida mientras dura |
| Preparación | c9 | `windupAdd`, `windupMult`, `windupMove` (mergeMods) | La barra de preparación se alarga o se acorta; con Sin Pausa, el personaje camina mientras carga |
| **`charge`** (tipo genérico nuevo, **para la etapa 2**) | Cargar y soltar (martillo del Cruzado) | `chargeT` (máx.), `minT`, `perfect:[desde, hasta]`, `scale:{ dmg, radius, range }`, `moveWhileCharging` | Barra de carga en la ranura **y** junto al cursor; destello y «clang» al entrar en la ventana perfecta; otro sonido al soltar perfecto |
| **`stance`** (tipo genérico nuevo, **para la etapa 2**) | Posturas que se alternan (Guardián) | `stance:{ a:{…}, b:{…} }`, `swapGcd 0` | El icono de la ranura se da la vuelta; marco del color de la postura |

### 11.5 `js/spec-mechanics.js` y `js/ui-gauges-guerrero.js`

La **Sed no cambia**. `gaugeTuning().sed` suma los números de los talentos que la barra cita (Reabrir 3, Último Trago 5/10, Sed Saciada 9 s del ápice); `explain()` cambia los nodos que nombra (Remolino Sediento y Sangre Hirviente viejos → Reabrir, Último Trago y Sangre Hirviente nueva).

### 11.6 Migración de guardados (con la de la Maga: v5 → v6)

1. Todos los árboles del Guerrero son nuevos → se **liberan** todos los puntos y se recalculan con `t3earnedAt(nivel)`.
2. Se aplica el **Recomendado** de su especialización hasta donde alcancen los puntos («Migrado: revisa tus talentos»). Mientras el Guardián y el Cruzado no tengan árbol (etapa 2), su migración espera: el Guerrero se migra entero cuando acabe la etapa 2.
3. Barra: `torbellino` → `g_hendidura`; `g_mandoble`, `g_embate` → `g_tajo`; `g_t_remolino`, `g_t_temeridad`, `g_t_ira_ciega` → `g_remolino` (`3`); `g_salto` se queda en la `1` si es Berserker (si no, `embestida`); `g_t_intervencion` (`1`) → `embestida`; `g_provocacion`, `g_t_bramido` → `g_piel` (`2`), salvo que el Recomendado elija una habilidad de talento; `grito_guerra` se queda si el Recomendado elige c17A; definitivas: Berserker → `g_u_furia`.
4. Forja: Torbellino I (Vendaval de Acero) → nada; Torbellino II (Ciclón) → Remolino II; Mandoble y Embate → nada; Furia Inmortal I/II se conservan con su nuevo nombre; Piel de Hierro II (Bastión) → Inamovible.
5. Soportes engarzados en habilidades que salen vuelven a `knownSupports`.
6. Aviso único: «Los talentos del Guerrero se rehicieron hasta el nivel 100. Te aplicamos el Recomendado; revísalo con N».
7. Test `tests/test-save-guerrero2g.mjs`: Nv5, 10, 18, 40, 69, 70, 80 y 100 de cada especialización; idempotente; Maga y Arquera intactas.

---

## 12. Banco de balance: impacto y riesgos

| Cambio | Efecto esperado | Calibración |
|---|---|---|
| Furia Inmortal: vida mínima 1 % | Ventana de 10 s sin morir y con +25 % (al borde) | Vigilar que no tape mecánicas de jefe; los golpes «de muerte segura» de jefe la ignoran |
| Remolino en marcha y Danza Carmesí | Giro largo en manadas | `drainPerSec` 8 se calibra para que dure 6–10 s en una manada de 5 |
| Estampida Sin Fin | Cadenas largas en grupos | Tope de 12 saltos por cadena y 1 Asalto Total por cadena |
| Golpe de Gracia + Vulnerable | +20 % al jefe para todo el grupo | Vulnerable no se acumula con otras fuentes |
| Piel de Hierro base 8 s/−40 % | Menos aguante pasivo para todos | El Guardián lo recupera en su kit (etapa 2); `TARGETS` de 2e se revisan |
| Reglas de 2e | El Berserker debe seguir siendo el que más daño hace a un objetivo en la clase, por ≥ 10 % | E3 con `balance-bench --seeds 5` |

**Riesgos.** (1) El Salto con cadena puede ser la mejor movilidad del juego: la cadena exige golpear. (2) Sin el Torbellino de base, el Guardián y el Cruzado pierden un área instantánea: su kit debe traer la suya. (3) Hasta la etapa 2, el mockup enseña dos especializaciones vacías.

---

## 13. Criterios de aceptación (G1–G17, adaptados)

| # | Criterio | Cómo se comprueba | Etapa 1 |
|---|---|---|---|
| G1 | Ningún nodo de clase nombra una habilidad de especialización | Validador + `check-etapa1.mjs` | ✓ |
| G2 | Solo c11A, c17A, c22A (y una opción A por árbol héroe) conceden habilidades; todas a la ranura `2` | Validador (`fitsSlot` en E2) | ✓ en clase |
| G3 | Ritmo: ningún árbol se completa; último punto de especialización al Nv70 | Validador | ✓ |
| G4 | Presupuesto: un final al máximo cabe (clase Nv69, Berserker Nv60, con ápice Nv68); dos no | Validador | ✓ |
| G5 | Paragon sin efecto hasta 31/31 y en pausa si bajas | Mockup (`&lvl=69`) + test en E1 | Mockup ✓; árboles en etapa 2 |
| G6 | Formas: círculo, hexágono, cuadrado | Capturas | ✓ |
| G7 | Textos ≤ 120, sin siglas ni «stagger»/«proc», con «antes X» al cambiar un valor; cada elección con «cuál conviene» | Validador + `check-etapa1.mjs` (186 textos, máx. 120) | ✓ |
| G8 | Builds legales punto a punto (34/31/1+10) | Validador | ✓ clase y Berserker; Paragon en etapa 2 |
| G9 | Banco: cada arquetipo gana su escenario; la híbrida ≥ 0,85 de la mejor | `balance-bench --seeds 5` (E3) | Estimación §8.4 |
| G10 | Motion con transform/opacity; reducir movimiento | El del mockup (sin cambios) | ✓ |
| G11 | Migración correcta e idempotente | `test-save-guerrero2g` | E5 |
| G12 | `npm test` en verde | `npm test` | E5 |
| G13 | Paragon en pausa | Test | E1 |
| G14 | Hexágono: flotante encima; clic derecho quita el punto | Demos `pick` y `rclick` | ✓ (§15) |
| G15 | Categorías: nada dice «Gastadora» | Validador | ✓ |
| G16 | Rejilla común en las tres especializaciones | Validador | Berserker ✓ |
| **G17** | **Verbos:** cada especialización usa ≥ 3 verbos de §5.1, su árbol tiene ≥ 3 nodos mecánicos que modifican cada verbo de su kit y las tres no comparten verbo principal | `check-etapa1.mjs` (cuenta nodos por habilidad tocada) + revisión | Berserker ✓ (Remolino 4, Salto 8, Rajar 7, Furia Inmortal 3) |

---

## 14. Plan de implementación por etapas

| Etapa | Archivos | Entrega |
|---|---|---|
| E0 · Diseño | `docs/` | **Etapa 1 (este documento)** + etapa 2 (Guardián, Cruzado, héroe) |
| E1 · Motor | `js/game-skills.js` (`combo`, `recast`, `charge`, `stance`, canal al soltar, `minHpPct`, claves de preparación), `js/skill-defs.js`, `js/talents.js` (selectores `@movement`, `@windup`, `@melee`) | G3–G5, G8, G13 |
| E2 · Datos | `js/skills-guerrero.js`, `js/talents-guerrero.js`, `js/powers-guerrero.js`, `js/hero-guerrero.js` (nuevo) | G1, G2, G7, G16, G17 |
| E3 · Banco | `tests/balance-bench.mjs` | G9 |
| E4 · Interfaz | `js/ui-talents.js`, `js/hud-model.js` (pips del combo y de la cadena), `js/ui-gauges-guerrero.js` | G6, G10, G14, G15 |
| E5 · Cierre | `tests/test-save-guerrero2g.mjs`, `MEMORIA.md`, `sw.js` | G11, G12 |

---

## 15. Mockup, capturas y refutaciones

### 15.1 Uso

`docs/mockups/skills-ux.html?cls=guerrero&view=talents` (como `file:///`). Parámetros: `&res=1366|1920`, `&lvl=5|10|18|40|60|69|70|80|100`, `&spec=berserker|guardian|cruzado`, `&loadout=estampida|hibrido`, `&tipnode=cls:c11|spec:b9`, `&tipskill=g_rajar`, `&alt=1`, `&demo=spec|pick|rclick|choice|hl|gate|specswap`.

Capturas en `C:\Users\juanm\AppData\Local\Temp\claude\D--Proyectos-IntentoRPG\6ead5cf3-f7a8-4c53-8c4f-4d18d352840c\scratchpad\talentos-guerrero\` (prefijo `final_`, a 1366 y 1920):

| Captura | Muestra |
|---|---|
| `final_berserker_100_*` | Berserker Nv100 «Estampida Sin Fin»: clase con Asalto Total, Paragon «Titán (etapa 2)» en diseño, árbol con el ápice |
| `final_hibrido_alt_*` | Híbrida «Sangre y Acero» con `Alt` y el tooltip de Sangre Hirviente (híbrido de los tres) |
| `final_eleccion_b9_*` | Hexágono b9 abierto **encima** del nodo y su tooltip con «cuál conviene» |
| `final_clase_c11_*` | Elección de clase c11: Segundo Aliento (cuadrado, HABILIDAD) frente a Coraza de Hierro |
| `final_libro_berserker_*` | Libro: kit base, kit del Berserker, barra Sed real y la pasiva |
| `final_selector_*` | Selector con la fila «Clase» y las tres tarjetas (Guardián y Cruzado con ESBOZO) |
| `final_paragon_gris_*` | Nv69: Paragon en gris con los dos árboles héroe propuestos |
| `final_guardian_100_*` · `final_cruzado_100_*` | Las dos especializaciones pendientes: rejilla en gris con «En diseño» |
| `final_clase_c30_*` | Asalto Total con «Toca tu habilidad de movilidad (ranura 1): Embestida · Salto Devastador» |
| `final_pick_*` · `final_rclick_*` | Prueba del hexágono: `pick` (clic en la otra mitad de b10: Salto en Cadena → Aplastante, «Personalizada») y `rclick` (clic derecho en el centro de b9 con el flotante abierto: el punto se quita, 30/31, y el Paragon vuelve a gris) |

### 15.2 Refutaciones (tres rondas)

**Ronda 1 (nombres, con `check-etapa1.mjs`).**

| Crítica | Cambio |
|---|---|
| Tres «Brutal» (c6A, b6, b9A), dos «Certero» (c13, b9B), «Heridas Abiertas» y «Herida Profunda», cuatro «Sangre…», seis «Furia…», siete «Golpe…» y cinco «…de Hierro»: el panel se leía como una lista de sinónimos | Ensañamiento, Golpes Precisos, Desangrar, Avidez, Último Trago, Curtido, Rencor, Ritmo de Combate, Silenciar, Contundencia, Desequilibrio, Sin Pausa, Onda de Choque, Remate Certero, Temple, Ira Contenida, Desenfreno, Sin Suelo, Filo Dentado; variante Inamovible |
| Choques con otras clases o con la barra: «Bastión», «Impacto Sísmico», «Sed de Batalla» como variante | Inamovible, Caída Atronadora, Sed Voraz |

**Ronda 2 (¿alguna elección claramente superior?, ¿relleno?).**

| Crítica | Cambio |
|---|---|
| c9B «Golpe en Marcha» solo daba comodidad (moverse y avanzar 2 m): perdía siempre frente a +40 % | **Sin Pausa**: la preparación tarda la mitad (más golpes por minuto contra grupos) y puedes moverte |
| c27 «Rugido de Carga» obligaba a la manada a atacarte 4 s: para un Berserker de vida baja era una trampa en el camino a Asalto Total | Ahora **intimida**: −24 % de daño de la manada 4 s (sirve a las tres) |
| b27 «sin límite de saltos» dejaba inútil a Salto en Cadena (b10A) al llegar al final | Estampida Sin Fin **recarga** el Salto si el último golpea a 3 o más: más saltos = más opciones de reiniciar |
| Choque de ids de poder: `g_desenfreno` ya existe (Sangre Hirviente vieja) | c26 usa `g_ira_gasto` |

**Ronda 3 (de fondo: ¿la clase sirve a las tres?).**

| Crítica | Cambio |
|---|---|
| (Bloqueante) El camino derecho de la clase nombraba la **Embestida**, pero el Berserker lleva el **Salto Devastador** en la ranura `1`: la build Estampida compraba 7 nodos y el final Asalto Total sin efecto | Los nodos hablan de **«tu movilidad»** (la habilidad de la ranura `1`) con el grupo `movilidad`; Asalto Total cuenta el primer salto de la cadena |
| Lo mismo pasa en la **Maga aprobada**: la build «Lluvia de Fuego» del Piromante lleva Paso del Vacío (final de Parpadeo) con la Estela Ígnea en la `1` | No se toca la Maga (no es de este paso): pregunta al dueño (§17) |
| c9 tocaba solo la Hendidura: si la etapa 2 da otra principal al Guardián y al Cruzado, quedaba muerto | c9 cambia **todos los golpes con preparación** (la Hendidura y el 3.er golpe de Rajar ya la tienen) |
| ¿Se desborda la interfaz? | No a 1366 ni a 1920. Menor: el desplegable de configuración recorta el nombre largo de la híbrida («Híbrido Hemorragia-Verdugo · S…»), como en la Maga; el Paragon en gris deja ver detrás la tarjeta «En diseño» del árbol héroe vacío (desaparece en la etapa 2) |

### 15.3 Validador en la etapa 1

`node docs/mockups/data/validar-talentos.mjs guerrero` → **20 errores, todos de lo pendiente**. El comprobador de la etapa 1 (`C:/Users/juanm/AppData/Local/Temp/claude/D--Proyectos-IntentoRPG/6ead5cf3-f7a8-4c53-8c4f-4d18d352840c/scratchpad/check-etapa1.mjs`, fuera del repo) corre el validador, separa esos 20 y además busca nombres repetidos entre clases, textos largos, siglas y formas de «vosotros»: **en verde** (0 errores propios, 0 nombres repetidos, 186 textos sin problemas, el más largo de 120):

- Árboles vacíos: Guardián, Cruzado, `h1`, `h2`, `h3` (5); presupuesto y finales de los dos árboles vacíos (4); kits vacíos del Guardián y del Cruzado (2).
- Builds: el Berserker tiene 2 de 4 (1); el Guardián y el Cruzado, 0 y sin `defaultBuild` (4); el Paragon de las 2 builds del Berserker está vacío (4).
- Avisos: ninguna build usa Danza Carmesí, Golpe de Gracia ni Inquebrantable (los usarán las builds de la etapa 2).

---

## 16. Para la etapa 2: lo que debe respetar

1. **Verbos ya usados por el Berserker** (no pueden ser el verbo principal de otra): canalizar sin dejar de moverte y soltar con efecto; relanzar dentro de una ventana; combo de 3 con el 3.er golpe distinto; ventana de riesgo con la vida mínima; bonus por encadenar movimiento (Ímpetu). Pueden aparecer como verbo **secundario** si cambian de sentido (p. ej. un Guardián que canaliza **plantado**).
2. **Verbos propuestos para la etapa 2** (cada una con ≥ 3 verbos y nodos que los cambien, G17): **Guardián** = plantado (bonus por no moverte), dos **posturas** que se alternan (tipo `stance`, §11.4), **avance pesado imparable** (movimiento lento) y provocación. **Cruzado** = **cargar y soltar** con ventana perfecta (el martillo; tipo `charge`, §11.4), **marcas que se detonan** (Juicio) y consagrar zonas.
3. **El árbol de clase ya decide por ellos:** «tu movilidad» = la habilidad de la ranura `1` (si su habilidad de Nv12 es de utilidad, se quedan con la Embestida en la `1`); c9 solo toca golpes con **preparación** (`windup`), **no** las cargas de `charge` (si el martillo se carga, que tenga sus propios nodos); c16B Contundencia y c10A Derribo son su control; Piel de Hierro es la defensa de todos: el kit de especialización **no** trae otra defensa.
4. **Roles:** el **Guardián es el tanque** (amenaza ×3, provocación con `g.forceTarget`, reducir el daño de los aliados con `g.damageAlly`/`onAllyDamaged`, Quebranto contra jefes) y debe recuperar el aguante que Piel de Hierro pierde en el kit base (8 s/−40 %). El **Cruzado** es apoyo con martillo sagrado: curas y escudos con `target:'lowest'`, no sanador puro. `talents-v2-comun.js` dice «Apoyo» para el Cruzado: si cambia a otro rol, coordinarlo (archivo común).
5. **Habilidades que salieron del kit base y su destino propuesto:** Martillo de Guerra → principal del Cruzado (cargar y soltar); Terremoto y Provocación → Guardián; Cataclismo → definitiva del Cruzado (sagrada); Estandarte de Guerra → definitiva del Guardián o habilidad del Caudillo; Grito Desafiante, Muro de Escudos y Carga de Escudo → Guardián; Aura de Devoción, Veredicto Final y Martillo de Justicia → Cruzado; Bramido de Guerra → Cruzado o Caudillo; Mandoble → libre.
6. **Ranura `2`:** ya compiten Piel de Hierro y tres habilidades de talento de clase; cada árbol héroe puede añadir una (opción A). La habilidad de Nv12 de una especialización, si es de utilidad, también va a la `2`.
7. **Ids ocupados:** nodos `c1…c30` y `b0…b28`; habilidades `g_tajo`, `g_hendidura`, `embestida`, `g_piel`, `g_lanza`, `g_t_aliento`, `grito_guerra`, `g_t_intervencion`, `g_remolino`, `g_salto`, `g_rajar`, `g_u_furia`; poderes de §11.3. Prefijos libres sugeridos: `d` (Guardián), `z` (Cruzado) y, para los árboles héroe, `t`, `l`, `u` (no `c`).
8. **Nombres ocupados** (no repetir): todos los de §6, §7.1 y §4, más los de la Maga. En especial: Sed de Batalla, Sangre Hirviente, Festín de Sangre, Negación de la Muerte, Umbral del Dolor, Desenfreno, Temple, Rencor, Inquebrantable, Señor de la Guerra, Asalto Total, Coraza de Hierro, Hermandad de Armas, Grito de Guerra, Intervención, Segundo Aliento, Frenesí, Ciclón, Inamovible.
9. **Árboles héroe:** los tres esqueletos ya tienen la combinación fija (`h1` Berserker·Guardián, `h2` Berserker·Cruzado, `h3` Guardián·Cruzado) y una propuesta de tema (§9). Al rellenarlos, completar `heroNodes`/`heroCh` de las builds `estampida` (`h1`) y `hibrido` (`h2`).
10. **Builds pendientes del Berserker:** «Danza Carmesí» (Hemorragia, usar el final de clase **Inquebrantable**) y «Golpe de Gracia» (Verdugo). Los órdenes de la Maga (`brasa`, `ignicion`) son legales en esta rejilla cambiando los ids.
11. **Mockup:** al rellenar, quitar `sketch:true` y los textos «(texto actual del juego)»; la etiqueta de la híbrida se recorta en el desplegable (si molesta, acortar `arch`). Validar con `validar-talentos.mjs guerrero` (debe quedar en 0 errores) y repetir `check-etapa1.mjs` para los nombres entre clases.

## 17. Preguntas para el dueño

1. **Furia Inmortal** cambia de identidad: antes «+30 % de velocidad de ataque e imparable»; ahora «tu vida no baja del 1 %» (la variante Frenesí recupera la velocidad sin la inmortalidad). ¿Te gusta?
2. **Kit base:** la segunda principal es la **Lanza Arrojadiza** (a distancia); el Torbellino se funde con el Remolino del Berserker y el Martillo de Guerra pasa al Cruzado. ¿De acuerdo?
3. **Piel de Hierro** base baja de 12 s/−50 % a 8 s/−40 % (los 12 s venían del Guardián de 2e). ¿Aceptas que el Guardián recupere el aguante en su propio kit?
4. Los nodos de movilidad de la clase hablan de **«tu movilidad»**. En la Maga, la build «Lluvia de Fuego» lleva Paso del Vacío (Parpadeo) con la Estela Ígnea en la `1`: ¿aplicamos la misma regla a la Maga en E2?
5. ¿Te convencen los nombres propuestos de los árboles héroe (**Titán, Gladiador, Caudillo**) como punto de partida de la etapa 2?

---

## Anexo A. Iconos y arte para Codex

Hoy el mockup reutiliza iconos viejos del Guerrero (todos existen: el validador no avisa de ninguno). Pedidos con el estilo de `assets/talents` (128 y 256 px, fondo oscuro; rojo sangre para el Berserker, oro y acero para la clase). **Nombres nuevos** para no pisar los iconos del juego actual (`guerrero-clase-c1…c15` siguen en uso hasta E2):

| Archivo | Qué dibujar |
|---|---|
| `talents/guerrero-berserker-b5.webp` … `b28.webp` (14) | Reabrir (herida que se vuelve a abrir), Caída Brutal (botas cayendo sobre un hacha alzada), Suelo Roto (grieta roja bajo una caída), Rajar: Onda o Certero (hexágono: onda / hoja con destello), Salto: Cadena o Aplastante (tres arcos de salto / caída sobre un yelmo), Sin Suelo (silueta en el aire con aura de furia), Avidez (remolino que bebe gotas), Caída Sangrienta (caída que salpica sangre), Estallido Rojo (remolino que estalla en gotas), Ímpetu (estelas de salto en cadena), Danza Carmesí (remolino infinito de sangre), Golpe de Gracia (hacha doble que baja dos veces), Estampida Sin Fin (cadena de cráteres), Corazón Indomable (corazón de hierro con venas rojas) |
| `talents/guerrero-clase2-c<n>.webp` (16 conceptos nuevos) | c5 Tajo Firme/Voraz, c6 Ensañamiento/Sin Cuartel, c7 Marcha Imparable, c9 Golpe Pesado/Sin Pausa, c10 Derribo/Silenciar, c14 Polvareda/Carga Reparadora, c15 Furia Protectora/Desbordante, c16 Filo Dentado/Contundencia, c19 Temple, c20 Desequilibrio, c25 Rencor, c26 Desenfreno, c27 Rugido de Carga, c28 Inquebrantable, c29 Señor de la Guerra, c30 Asalto Total |
| `icons256/g_remolino.webp` y `icons256/g_rajar.webp` | Remolino Sangriento (hoy usa el del Torbellino) y Rajar (tres tajos en abanico, el 3.º más grueso) |
| `forge/v_g_remolino_i/ii`, `v_g_salto_i/ii`, `v_g_rajar_i/ii`, `v_g_u_furia_i` (7) | Remolino Anclado, Ciclón (puede reutilizar el `v_torbellino_ii` de 2f), Caída Atronadora, Salto Rasante, Estocada Final, Molino, Sed Voraz (el `v_g_u_furia_ii` «Frenesí» de 2f sirve) |
| `forge/v_g_piel_ii.webp` | Inamovible (puede reutilizar el «Bastión» de 2f) |
| Emblemas de los árboles héroe (etapa 2) | Titán, Gladiador, Caudillo |
