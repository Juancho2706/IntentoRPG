# Paso 2g: talentos y kits del Guerrero (etapas 1 y 2), documento de diseño

> Estado: **diseño completo (etapas 1 y 2)**, sin código del juego. Fecha: 2026-10-21. Molde: la Maga v4 aprobada (`docs/paso2g-maga-coherencia.md`, §17 «Plantilla para otras clases»).
> **Etapa 1:** investigación, auditoría, modelo de capas, kit base, árbol de clase y **Berserker** (kit, pasiva, barra Sed, árbol de 29 nodos), verbos de entrada y movimiento.
> **Etapa 2:** **Guardián** (tanque · Bastión · verbo principal: plantado y posturas) y **Cruzado** (martillo sagrado con apoyo · Fervor · verbo principal: cargar y soltar), los tres **árboles héroe** (Titán, Gladiador, Caudillo), las **12 builds** (4 por especialización, una híbrida en cada una) con su Paragon, y las decisiones del dueño aplicadas (§17).
> **Corrección de la etapa 2 (§19):** el juicio de los jueces encontró bucles que rompían el Fervor, el Bastión, la Guardia Total y la Vanguardia, capas de defensa que el tope anulaba y finales que a rango 1 daban todo su mecanismo. Están corregidos en los datos y en este documento; §19 tiene la tabla de hallazgo, decisión y cambio.
> **Decisiones del orquestador (2026-10-21, §17.2):** las 7 preguntas quedaron respondidas. Cambios de diseño: la ventana perfecta tiene una base de **0,25 s** (antes 0,2 s), y el aumento de tope del Guardián queda declarado como **stat de su especialización** (los topes globales no cambian). Ningún id cambió.
> **Rejuicio de balance, ronda 2 (§20):** un juez independiente encontró 1 bloqueante (Vítores sin tope: la inmortalidad del Berserker volvía por el Gladiador), 3 altos (Asalto Total sin tope, Corazón Indomable 3 encadenado con Negación de la Muerte y la Piel de Hierro puesta casi siempre) y varios medios. Todo corregido en los datos y aquí, con un **suelo para las definitivas** (los talentos no bajan su recarga más de un 30 %) y la **recarga de Piel de Hierro que empieza al acabar**. Ningún id cambió.
> **Rejuicio de balance, ronda 3 (§21):** el juez confirmó los 11 arreglos de la ronda 2 y pasó 3 altos, todos del área: el daño de las zonas sagradas se sumaba (y Tierra Santa lo alargaba hasta 20 s, con Vigilia devolviendo el Sendero cada ~2,6 s), Estallido de Luz crecía con N² y Carga Reparadora se multiplicaba por los relanzamientos del Salto. Corregidos: las **zonas sagradas no se suman**, el Sendero **no baja de 4 s**, **un estallido por enemigo y lanzamiento** y Carga Reparadora **una vez cada 6 s** por `p.sustain()`. Ningún id cambió.
> Mockup: `docs/mockups/skills-ux.html?cls=guerrero&view=talents` (abrir como `file:///`). Datos: `docs/mockups/data/talents-v2-guerrero.js` (fuente única: las tablas de §6, §7 y §9 y las listas de las builds se **generan** con `validar-talentos.mjs guerrero --tablas`). Validador oficial: **en verde, 0 errores y 0 avisos** (§15.5).

## 0. Historial y estado

| Versión | Qué es | Qué dijo el dueño |
|---|---|---|
| Maga v4 (`d75e7ed`, `d8dd49c`) | El molde: 3 columnas, Nv100, Paragon en gris hasta 31/31, formas, textos | Aprobada |
| Guerrero, etapa 1 | Kit base, árbol de clase y **Berserker** con la misma rejilla y reglas; verbos de entrada nuevos | Decisiones delegadas (§17.1): Furia Inmortal, kit base, Piel de Hierro, «tu movilidad», nombres de los héroes y verbos principales |
| Guerrero, etapa 2 | **Guardián**, **Cruzado**, árboles héroe, las 10 builds que faltaban y el Paragon de las 12 | — (pasó al juicio) |
| **Guerrero, corrección de la etapa 2** | Juicio de los jueces aplicado (§19): 2 bloqueantes, 4 altos y 9 medios; 1 hallazgo aplicado a medias con su motivo | — (para revisar) |
| **Guerrero, decisiones del orquestador** | Respuestas a las 7 preguntas de §17.2: ventana perfecta de 0,25 s, tope propio del Guardián como stat de especialización, finales que escalan solo en el Guerrero; el resto se confirma como está | Decidido por delegación del dueño (§17.2) |
| **Guerrero, rejuicio de balance (ronda 2)** | Juez independiente (puntaje 6): 1 bloqueante, 3 altos y 7 medios (el último llegó cortado). Aplicados todos, el cortado con la lectura más probable (§20) | — (para revisar) |
| **Guerrero, rejuicio de balance (ronda 3)** | Juez de verificación: los 11 arreglos de la ronda 2 cierran sus bucles; 3 altos nuevos en el área (zonas sagradas, Estallido de Luz y Carga Reparadora), sin bloqueantes. Aplicados los tres; una parte (Persecución) no, con su motivo (§21) | — (listo para E1 según el juez) |

**Pedido del dueño que atraviesa las dos etapas:** «hay que ponerle creatividad» a los verbos de entrada y movimiento: que no todo sea «aprieto y sale» (§5).

## 1. Resumen (15 líneas)

1. Mismo ritmo, presupuesto y rejillas que la Maga (`TV2.REGLAS`): clase 34 puntos (30 nodos, 53 rangos), especialización 31 (29 nodos, 59 rangos), Paragon 1 + 10, tablero de glifos 16. Ningún árbol se completa.
2. **Kit base (Nv1–8):** Tajo, Hendidura (con preparación), Embestida, Piel de Hierro (8 s y −40 %; su recarga empieza al acabar) y Lanza Arrojadiza. De las 28 activas de hoy quedan **23** (§3).
3. **Tres verbos principales que no se pisan:** Berserker = **encadenar en marcha**; Guardián = **plantado y posturas**; Cruzado = **cargar y soltar** con ventana perfecta. Cada especialización usa además 2–3 verbos secundarios (§5).
4. **Berserker** (daño · Sed): Remolino Sangriento, Salto Devastador, Rajar y Furia Inmortal (la vida no baja del 1 %; Frenesí recupera la velocidad). Arquetipos: Hemorragia · Verdugo · Estampida.
5. **Guardián** (tanque · Bastión): **Cambio de Guardia** (dos posturas, Muralla y Ariete), **Carga de Escudo** (avance lento e imparable que arrastra y provoca), **Terremoto** (réplicas si estás plantado) y **Ciudadela** (te clavas 8 s: −40 % para ti y tu grupo y todos te atacan).
6. **El Guardián recupera el aguante** que perdió el kit base en su **pasiva**: Piel de Hierro vuelve a 12 s y −50 %, con +15 % de bloqueo y triple amenaza, y **un aumento de tope solo suyo** (reducción de daño hasta el 65 % y bloqueo hasta el 50 %), declarado como stat de su especialización, para que las capas de defensa no se anulen (§19.2). Los topes globales de `combat-math.js` (50 y 40 %) no cambian para nadie más (§17.2). El kit de especialización no trae otra defensa.
7. **Bastión rehecho:** se llena bloqueando y **plantado**; caminar lo vacía; con 5 cargas, el cambio de postura lo **descarga** (escudo para ti y el aliado más herido, u onda de 300 %) y luego pasa **5 s sin llenarse**.
8. **Cruzado** (apoyo con martillo · Fervor): **Juicio** (marca; tu siguiente principal la detona), **Sendero de Luz** (destello que deja un sendero que cura), **Martillo de Guerra** (mantén, carga y suelta en el destello) y **Cataclismo** (también se carga).
9. **El Cruzado no es un sanador puro:** su pasiva convierte el 10 % de su daño sagrado en curación del aliado con menos vida (hasta un 1 % de su vida por segundo); el Veredicto (Martillo a 3 de Fervor, como mucho 1 de Fervor por lanzamiento) cura un 6 % y los escudos van al más herido. Presupuesto de cura en §19.3.
10. **Arquetipos:** Guardián = Guardia · Sismo · Vanguardia; Cruzado = Sentencia · Veredicto · Santuario. Cada uno con su elección de la fila 3 (grupos o jefes), penúltimo, final y un ápice común (Inexpugnable, Aureola).
11. **Árboles héroe:** **Titán** (Berserker · Guardián: la Furia gastada carga un Golpe de Titán que sacude el suelo), **Gladiador** (Berserker · Cruzado: el duelo contra un Rival, armas arrojadizas y contraataques tras esquivar) y **Caudillo** (Guardián · Cruzado: un Pendón que se clava solo y manda sobre el grupo). Cada uno con una habilidad para la ranura `2`.
12. **12 builds validadas punto a punto** hasta el Nv100 (34/31/1 + 10), una híbrida por especialización a un 6–10 % de la mejor en cada escenario; los tres finales de clase y los nueve de especialización los usa alguna build. **Los finales escalan su mecanismo por rango** (no solo un +X % plano): dos finales a rango 1 ya no dominan a la híbrida (§8.4).
13. **Validador oficial en verde** (0 errores, 0 avisos) y comprobador propio en verde: 0 nombres repetidos con la Maga y la Arquera, 432 textos ≤ 120 caracteres, sin siglas, sin voseo ni «vosotros», G1 y G17 (§15.5).
14. **Tres rondas de refutación** en la etapa 2 con capturas a 1366 y 1920 (§15.4) y, después, el **juicio de los jueces** (§19): bucles de Fervor y Bastión cerrados, Guardia Total con recarga propia, Vanguardia con suelo de 4 s, topes de defensa del Guardián, Gladiador útil contra jefes y Titán más bajo. El **rejuicio de balance** (§20) cerró los bucles que quedaban: definitivas con suelo del 70 %, Asalto Total y el Gladiador con tope, salvaciones cada 60 s y la Piel de Hierro puesta ~35–60 % del tiempo. La **ronda 3** (§21) cerró los del área: las zonas sagradas no se suman, el Sendero no baja de 4 s, un estallido de luz por enemigo y lanzamiento, y Carga Reparadora una vez cada 6 s.
15. §17 aplica las decisiones del dueño y las del orquestador, que **respondieron las 7 preguntas** (ventana perfecta de 0,25 s, tope propio del Guardián y el resto confirmado); §18 lista lo que el mockup y el validador necesitan del integrador; §19, §20 y §21 justifican cada corrección.

---

## 2. Investigación (consultada el 2026-10-21)

Se suma a la de la Maga (sus §2 y Anexo A.1, que siguen vigentes para el árbol estilo WoW).

### 2.1 Etapa 1: verbos de entrada y el Berserker

| Fuente (fecha) | Qué dice | Qué tomamos |
|---|---|---|
| [poe2wiki: Perfect Timing](https://www.poe2wiki.net/wiki/Perfectly_Timing) · [Window of Opportunity](https://www.poe2wiki.net/wiki/Window_Of_Opportunity) · [Perfect Strike](https://www.poe2wiki.net/wiki/Perfect_Strike) (wiki viva, consultada 2026-10-21; explicador de [ipsnews, 2025-02-08](https://ipsnews.net/business/2025/02/08/path-of-exile-2-perfect-timing-explainedwhat-is-perfect-timing/?amp=1)) | PoE 2: las canalizaciones que se sueltan tienen una ventana «Perfect Timing»; se ve como un **destello rojo** alrededor del personaje; soltar dentro da más daño o efectos (Perfect Strike lanza una onda de fuego). Un soporte acorta la ventana un 35 % a cambio de +35 % de daño | Verbo **cargar y soltar con ventana perfecta**, con destello y sonido: el del **Cruzado** (§7.3) |
| [ProGameGuides: PoE 2 0.5 (2026-05-08)](https://progameguides.com/?p=886082) | La ventana perfecta sigue en el parche 0.5 | Es un verbo vigente en 2026, no una moda pasada |
| [Upcomer: el combate de Lost Ark (2022-02-06)](https://upcomer.com/lost-arks-combat-system-explained) · [fextralife: Hell Blade](https://lostark.wiki.fextralife.com/Hell+Blade) y [Mobalytics: Berserker](https://mobalytics.gg/blog/lost-ark/lostark-berserker-guide-builds-engravings-tips/) (páginas vivas sin fecha; consultadas 2026-10-21) | Lost Ark separa **normal, punto, combo (relanzar en una ventana), mantener (sigue mientras mantienes) y cargar** (cuanto más cargas, más fuerte). La Hoja Infernal del Berserker: mantienes, sueltas en la «zona perfecta» y sale un remate | **Relanzar dentro de una ventana** (Salto Devastador) y **soltar como remate** (Estallido Rojo al soltar el Remolino) |
| [Maxroll: Mayhem Berserker (Lost Ark)](https://maxroll.gg/lost-ark/build-guides/mayhem-berserker-raid-guide) · [Icy Veins: Mayhem](https://www.icy-veins.com/lost-ark/mayhem-berserker-warrior-build-guide) (guías vivas sin fecha visible; consultadas 2026-10-21) | El Berserker «Mayhem» vive con la vida bloqueada al 25 % a cambio de su modo de ráfaga | La fantasía **«al borde»**: la pasiva (+25 % con menos del 40 %) y Furia Inmortal (la vida no baja del 1 %) |
| [Icy Veins: el rework de árboles de Lord of Hatred (previo al lanzamiento del 2026-04-28)](https://www.icy-veins.com/d4/news/massive-skill-tree-rework-coming-in-diablo-4-lord-of-hatred/) · [BlizzardWatch (2026-04-27)](https://blizzardwatch.com/2026/04/27/class-play-diablo-4-lord-hatred/) · [DiabloBytes: Whirlwind (2026-05)](https://www.diablobytes.com/diablo-iv/builds/whirlwind-barbarian/) | D4 2026: fuera las pasivas, cada habilidad tiene modificadores; el **Torbellino canalizado** sigue siendo la build estrella del Bárbaro | El Torbellino es **del Berserker** (Remolino Sangriento) y se canaliza en marcha; la forja cambia su forma (anclado o atrayente) |
| [warcraft.wiki: Demolish](https://warcraft.wiki.gg/wiki/Demolish) · [Colossal Might](https://warcraft.wiki.gg/wiki/Colossal_Might) (wiki viva; consultada 2026-10-21) | WoW (Coloso): Demolish es una canalización de golpes que te hace inmune a aturdimientos y quita un 10 % de daño; sus cargas las dan otras habilidades | Canalizar = momento de poder **e** imparable: Marcha Imparable (c7) y Giro Firme (Mejora del Remolino) |
| [Icy Veins: Guerrero Furia en Midnight](https://www.icy-veins.com/wow/fury-warrior-midnight-guide) · [Icy Veins: Armas](https://www.icy-veins.com/wow/arms-warrior-midnight-guide) (páginas vivas de la alfa de Midnight, 2025–2026) · [foro EU: feedback de Guerreros](https://eu.forums.blizzard.com/en/wow/t/feedback-warriors/590303) · [Skill Capped: Furia en el parche 12.1 (2026-08)](https://www.skill-capped.com/wowarticles/guides/fury-warrior-pvp-guide/midnight-changes/) | Midnight poda el árbol de clase del Guerrero: tenía demasiados enfriamientos de daño y poca utilidad de grupo (Avatar y Thunderous Roar salen de la clase) | Los finales de clase son de **ritmo o utilidad**, no de daño; las ráfagas de daño viven en la especialización |
| [Archon: Fury (Midnight, parches 12.0.5–12.1, 2026)](https://www.archon.gg/wow/builds/fury/warrior/raid/talents/normal/midnight-falls) · [Method: Fury](https://www.method.gg/guides/fury-warrior/talents) | En 2026 Slayer y Mountain Thane se reparten las peleas: Slayer en casi todas, Mountain Thane en algunas | Ninguna opción domina en todo: cada A/B dice dónde gana (§6, §7) |
| [Maxroll: Hades II, guía básica](https://maxroll.gg/hades-2/guides/hades-2-beginners-guide) · [fextralife: combate de Hades II](https://hades2.wiki.fextralife.com/Combat) (guías vivas sin fecha; consultadas 2026-10-21) | Hades II: mantener el botón **carga la versión Omega** de un ataque (gasta Magia); el **ataque tras el impulso** es un golpe propio | «Tras tu movilidad, el siguiente golpe es otro»: Caída Brutal (b6), Asalto Total (c30) y Pisotón (d6) |
| [Foro de Last Epoch: Forge Guard y Rive (parche 1.0.1)](https://forum.lastepoch.com/t/my-current-build/67304) · [notas de Harbingers of Ruin](https://forum.lastepoch.com/t/last-epoch-harbingers-of-ruin-patch-notes/71790/8) (sin fecha visible; consultadas 2026-10-21) | Last Epoch: Rive es un **combo de 3** cuyo 3.er golpe tiene sus propios nodos (crítico doblado, más daño) | **Rajar**: 3 golpes con el 3.º distinto, y nodos que solo tocan el 3.º (b9, b19, b23, b26) |

### 2.2 Etapa 2: Guardián, Cruzado y árboles héroe

| Fuente (fecha) | Qué dice | Qué tomamos |
|---|---|---|
| [Method: Protection Warrior, estilo y rotación (marzo de 2026, parche 12.0.1)](https://www.method.gg/guides/protection-warrior/playstyle-and-rotation) · [Icy Veins: Protection Warrior (Midnight, temporada 1)](https://www.icy-veins.com/wow/protection-warrior-pve-tank-spec-builds-talents) · [warcraft.wiki: No Stranger to Pain (Midnight 12.1, 2026-08-11)](https://warcraft.wiki.gg/wiki/No_Stranger_to_Pain) | WoW Midnight: Shield Block es defensa **y** ataque (+30 % al Golpe de Escudo); Ignore Pain se gasta para no desbordar la ira; en 12.1, Ignore Pain pasa de evitar el 20 al 30 % | El aguante del tanque sale de **gastar bien**: el Bastión se descarga al cambiar de postura (escudo u onda) y la defensa también sube el daño (Fuerza del Bastión, Guardia Viva) |
| [Icy Veins: Combat Readiness Gunlancer (Lost Ark)](https://www.icy-veins.com/lost-ark/combat-readiness-gunlancer-guide) · [Invenglobal: guía del Gunlancer](https://www.invenglobal.com/lostark/articles/16630/lost-ark-gunlancer-guide-best-skills-build-engravings-and-leveling) (guías vivas sin fecha de parche; consultadas 2026-10-21) | Lost Ark: el Gunlancer vive en **Defensive Stance**, una postura que se enciende y se apaga con su propia barra; Battlefield Shield escuda al grupo y le **redirige** el daño | Verbo **posturas que se alternan** (Cambio de Guardia) y **redirigir el daño de los aliados** hacia el tanque (Vínculo de Escudo, Guardia Compartida) |
| [poe2wiki: Active block](https://www.poe2wiki.net/wiki/Active_block) · [Mobalytics: bloqueo en PoE 2 (2025-12-23)](https://mobalytics.gg/poe-2/guides/block) · [Maxroll: supervivencia en PoE 2](https://maxroll.gg/poe2/resources/path-of-exile-2-survival-guide) · [Deltias: Titán de PoE 2](https://deltiasgaming.com/?p=91157) | PoE 2: alzar el escudo bloquea todo lo frontal (algo más de 120°) hasta que se llena el aturdimiento pesado; el Titán es aturdir y golpes contra el suelo | **Plantado** con bloqueo frontal (Pie Firme, Proa Blindada) y el árbol héroe **Titán** (golpes que sacuden y llenan el Quebranto) |
| [Icy Veins: Hammer en Monster Hunter Wilds](https://www.icy-veins.com/monster-hunter-wilds/hammer-guide) · [Kiranico: Great Sword](https://mhworld.kiranico.com/guide/great-sword) · [PCGamesN: Great Sword en Wilds](https://www.pcgamesn.com/monster-hunter-wilds/great-sword) (guías vivas; consultadas 2026-10-21) | MH Wilds: el martillo tiene **4 niveles de carga** (cada nivel es otro golpe) y en Wilds **puedes caminar mientras cargas**; la gran espada avisa el nivel 3 con un destello rojo y pierdes la carga si te golpean o esquivas | **Martillo de Guerra**: el golpe crece con la carga, el destello marca la ventana perfecta, caminas al 50 % mientras cargas y la esquiva cancela la carga sin coste |
| [Icy Veins: Destroyer (Lost Ark)](https://www.icy-veins.com/lost-ark/destroyer-guide) · [Lost Ark Academy: Destroyer](https://www.playlostark.com/news/articles/lost-ark-academy-destroyer-class) | El Destroyer carga hasta 3 **Núcleos de Gravedad** con unas habilidades y los gasta con otras: más daño y un escudo según los núcleos | **Fervor 0–3**: lo llenan las sueltas perfectas y las detonaciones, y lo gasta el **Veredicto** (daño y cura) |
| [Icy Veins: Juramentos del Paladín (Diablo 4)](https://www.icy-veins.com/d4/news/diablo-4-paladin-oaths-breakdown-of-the-new-class-mechanic/) · [Playnews: el Paladín en la temporada 14 (2026)](https://www.playnews.gg/en/guides/diablo-4-season-14-the-3-paladin-builds-that-still-hold-up-and-why-the-class-has-neither-s-tier-nor-a-tier) · [Gameluster: builds de Lord of Hatred (2026)](https://gameluster.com/best-diablo-4-lord-of-hatred-builds-for-every-clas/) | D4 (2025–2026): el Paladín reparte Juramentos: Juggernaut (escudo y aguante), Judicator (martillos sagrados), Disciple (auras y apoyo); en 2026 el Martillo Bendito sigue jugándose | El escudo y el aguante son del **Guardián**; el martillo sagrado con un poco de apoyo, del **Cruzado**. Nadie es sanador puro |
| [warcraft.wiki: Sacred Weapon](https://warcraft.wiki.gg/wiki/Sacred_Weapon) · [Method: Protection Paladin](https://method.gg/guides/protection-paladin/talents) (Midnight 12.0.5–12.1, 2026) | El árbol héroe Lightsmith alterna un **escudo que crece** sobre un objetivo (Holy Bulwark) y un arma que cura o daña a los cercanos | Apoyo **dirigido**: escudos y curas al aliado con menos vida (Refugio, Absolución, Veredicto, descarga del Bastión) en vez de curas de área sin objetivo |
| [warcraft.wiki: Slayer's Dominance (12.1, 2026-08)](https://warcraft.wiki.gg/wiki/Slayer%27s_Dominance) · [warcraft.wiki: Avatar of the Storm](https://warcraft.wiki.gg/wiki/Avatar_of_the_Storm) · [warcraft.wiki: Thunder Blast (cambios de 2026)](https://warcraft.wiki.gg/wiki/Thunder_Blast) | Los árboles héroe del Guerrero en Midnight: Slayer (golpes que preparan la ejecución), Mountain Thane (truenos), Colossus (golpes enormes y canalizados) | **Titán** = Coloso sin canal (la Furia gastada carga un golpe de gigante); **Gladiador** = duelo contra un Rival; **Caudillo** = estandartes (no truenos: lo sagrado ya es del Cruzado) |
| [neonsect: Last Epoch temporada 5 (parche 1.5, 2026-10-01)](https://neonsect.com/last-epoch/last-epoch-season-5-classes-guide/) | Last Epoch 1.5: el Paladín suma Radiant Lance y Symbols of Hope pasa a ser solo suyo; la curación de Judgement baja un 75 % | El «paladín» de 2026 es un híbrido de daño y apoyo, y las curas fuertes se recortan: el Cruzado cura golpeando |

**Lagunas.** No encontré la duración exacta de ninguna ventana perfecta (ni PoE 2 ni MH Wilds la publican): la base es de **0,25 s** (decisión del plan de implementación, §17.2: un término medio entre 0,2 y 0,3 s para tolerar la latencia de la web) y E3 la calibra. No encontré guías actuales de builds Juggernaut con martillo en Diablo 4; descarté una fuente de baja fiabilidad (AccountShark) sobre costes de ira. Los números de este documento son **propuestas de diseño**.

**Lecciones aplicadas.** (1) Un verbo por arquetipo, y nodos que **cambian el verbo**, no solo números. (2) Soltar, relanzar, el 3.er golpe, el cambio de postura y la ventana perfecta tienen **feedback** (destello, sonido, pips o marco en la ranura). (3) La forja cambia la forma; el talento cambia cómo se usa y cuánto rinde. (4) El tanque y el apoyo **también golpean**: su defensa y su cura salen de jugar bien su verbo.

---

## 3. Auditoría del Guerrero actual y modelo de capas

### 3.1 Las 28 activas de hoy y su destino

Hoy el Guerrero tiene **16 habilidades en el libro** (las tres especializaciones comparten el mismo libro) y **12 activas de talento**.

| Activa de hoy | Tipo | Quién la toca hoy | Problema | Destino en el diseño |
|---|---|---|---|---|
| Tajo | Básico | Clase c6, Guardián s12 | — | **Kit base** (única básica) |
| Mandoble | Básico | Clase c5A, Berserker s6B, s7 | Tres básicos que se pisan | Sale (su arte se reutiliza en Golpe de Gracia) |
| Embate | Básico | Clase c5B | Igual | Sale: lo absorbe la variante **Siega** del Tajo |
| Torbellino | Principal | Clase c9, Berserker s3, s10, s16 | Choca con el Remolino Sangriento (dos «giros») | Se funde con el **Remolino Sangriento** del Berserker |
| Hendidura | Principal | Clase c9, Berserker s3, s10 | — | **Kit base** (Nv2, con preparación 0,25 s) |
| Martillo de Guerra | Principal | Clase c9, Guardián s7, s12, Cruzado s6A, s7 y su Fervor | Motor de dos especializaciones a la vez | **Cruzado**: su principal, ahora de **cargar y soltar** |
| Terremoto | Principal | Guardián s10 | — | **Guardián**: su principal (preparación + réplicas si estás plantado) |
| Lanza Arrojadiza | Principal | — | Nadie la tocaba | **Kit base** (Nv8): la principal a distancia |
| Embestida | Movilidad | Clase c11 | — | **Kit base** |
| Salto Devastador | Movilidad | Clase c11 | — | **Berserker** (movilidad que se relanza) |
| Piel de Hierro | Defensa | — | 12 s/−50 % por el Guardián de 2e | **Kit base** (8 s/−40 %); el Guardián recupera 12 s/−50 % en su pasiva |
| Provocación | Utilidad | Guardián s6B | Provocar es del tanque, pero ocupaba la ranura 2 | Sale como botón: la provocación vive en la **Carga de Escudo**, Barrido de Escudo, Cabeza de Puente y la Ciudadela |
| Grito de Guerra | Utilidad | — | — | **Habilidad de talento de clase** (c17A) |
| Furia Inmortal | Definitiva | — | Sin dueño | **Berserker** (definitiva rehecha) |
| Cataclismo | Definitiva | Cruzado s1, s16 | Sagrada en el libro de todos | **Cruzado**: su definitiva, también de cargar y soltar |
| Estandarte de Guerra | Definitiva | Cruzado s10 | — | **Caudillo**: el Pendón automático y la habilidad «Estandarte de Guerra» (ranura 2) |
| Segundo Aliento | Talento c2 | — | — | **Clase c11A** |
| Intervención | Talento c3 (ranura 1) | — | Competía con la movilidad | **Clase c22A**, ahora en la ranura `2` |
| Bramido de Guerra | Talento c12A | — | — | Sale; su idea (grito que controla) vive en **Bramido de Titán** (Titán t4A) |
| Remolino Sangriento | Insignia (la daba s0) | Berserker s4, s6A, s12 | La insignia la concedía un nodo | **Berserker**: insignia en el libro |
| Temeridad | Talento s9 | s12 | Activa a mitad del árbol | Sale: su idea vive en Furia Inmortal y en el ápice |
| Ira Ciega | Talento s13B | — | Otra ventana de daño más | Sale: ídem |
| Grito Desafiante | Insignia (s0) | Guardián s4, s6A | Igual que el Remolino | Sale: la provocación en área es el **Barrido de Escudo** (d8A) y Cabeza de Puente (d27) |
| Muro de Escudos | Talento s9 | Guardián x1–x3 | Activa a mitad del árbol | Sale: su idea (gastar el Bastión en defensa) es la **descarga del Bastión** al cambiar a Muralla |
| Carga de Escudo | Talento s13B | — | — | **Guardián**: su movilidad (avance lento e imparable) |
| Aura de Devoción | Insignia (s0) | Cruzado s4, s14 | Igual que el Remolino | Sale: el aura es el **Pendón** del Caudillo y las zonas sagradas del Santuario |
| Veredicto Final | Talento s9 | Cruzado s16, s17 | Activa a mitad del árbol | Sale como botón: el **Veredicto** es el Martillo de Guerra a 3 de Fervor |
| Martillo de Justicia | Talento s13B | — | Texto con «stagger» | Sale: el **Juicio** es el martillo que se arroja (insignia del Cruzado) |

### 3.2 Conflictos de la clase de hoy

| Conflicto | Ejemplo | Cómo se resuelve |
|---|---|---|
| Lo fuerte de una especialización está en el libro de todas | Cataclismo (sagrado) y Furia Inmortal para cualquier Guerrero | Kit por especialización (§3.3) |
| Activas concedidas a mitad de un árbol de especialización | Temeridad, Muro de Escudos, Veredicto Final | Solo opción A de una elección de clase o de árbol héroe, y solo para la ranura `2` |
| Nombres repetidos | «Sed de Batalla», «Bastión», «Juicio», «Frenesí», «Desafío», «Impacto Sísmico», «Grieta Abierta» | Renombrados (§10); en la etapa 2, además, «Marca Duradera», «Galope» y «Cielo Abierto» chocaban con la Arquera |
| Ápice en cadena de tres nodos | x1 → x2 → x3 | Un ápice de 4 rangos (b28, d28, z28) |
| Siglas y anglicismos | «+30 de stagger», «Apex I» | Quebranto, Ápice |
| Rol del Cruzado como apoyo puro | Bramido, Aura y curas en el mismo árbol | Apoyo con martillo: cura golpeando (pasiva, Veredicto) y protege al más herido |
| El tanque no tenía verbo propio | Bloquear era pasivo (15 % de bloqueo) y el Muro de Escudos, un botón más | Plantado y posturas: el Guardián decide cuándo quedarse quieto y cuándo cambiar |

### 3.3 Modelo de capas (como la Maga)

| Capa | Qué es | Contenido |
|---|---|---|
| **Kit base del Guerrero** | Lo que sabe todo Guerrero desde el Nv1 | Tajo (1), Hendidura (2), Embestida (4), Piel de Hierro (6), Lanza Arrojadiza (8) |
| **Kit de especialización** | Llega al elegirla (Nv10) y por nivel | Berserker: Remolino Sangriento, Salto Devastador, Rajar, Furia Inmortal · Guardián: Cambio de Guardia, Carga de Escudo, Terremoto, Ciudadela · Cruzado: Juicio, Sendero de Luz, Martillo de Guerra, Cataclismo |
| **Talentos** | Clase · Paragon · Especialización | §6, §9 y §7. Habilidades de talento: c11A, c17A y c22A (clase) y una por árbol héroe (t4A, l4A, u4A) |
| **Forja** | Mejora (Nv+3) y 2 variantes (Nv+6) | Transforma (forma, geometría, ritmo); el talento añade, multiplica o cambia cómo se usa el verbo (§10) |

Total al final: 5 de base + 3 de clase + 12 de especialización + 3 de héroe = **23 activas** (hoy 28), igual que la Maga.

**Calendario Nv1–15:**

| Nv | Kit base | Berserker | Guardián | Cruzado | Talentos |
|---|---|---|---|---|---|
| 1 | Tajo | | | | — |
| 2 | Hendidura | | | | — |
| 4 | Embestida | | | | — |
| 6 | Piel de Hierro | | | | — |
| 8 | Lanza Arrojadiza | | | | — |
| **10** | | Remolino Sangriento (`3`) | Cambio de Guardia (`3`) | Juicio (`3`) | Nodo clave gratis + 1.er punto de especialización |
| 11 | | | | | 1.er punto de clase |
| 12 | | Salto Devastador (`1`) | Carga de Escudo (`1`) | Sendero de Luz (`1`) | |
| 14 | | Rajar (`DER/2`) | Terremoto (`DER/2`) | Martillo de Guerra (`DER/2`) | |
| 15 | | Furia Inmortal (`4`) | Ciudadela (`4`) | Cataclismo (`4`) | |

Las habilidades de talento de clase llegan cuando su nodo se puede comprar: Segundo Aliento ≈ Nv21, Grito de Guerra ≈ Nv27, Intervención ≈ Nv31; las de los árboles héroe, al Nv72 (fila 2 del Paragon).

**Ritmo y presupuesto:** idénticos a la Maga. Comprobado por el validador sobre los datos del Guerrero:

| Árbol | Puertas (comprando todo seguido) | Un final al máximo | Dos finales |
|---|---|---|---|
| Clase | 8 → fila 4 (Nv25) · 24 → fila 7 (Nv57) | 30 puntos (Nv69) | 36 > 34: imposible |
| Berserker, Guardián y Cruzado | 8 → fila 4 (Nv24) · 20 → fila 7 (Nv48) · 25 → ápice (Nv58) | 26 (Nv60); con el ápice completo, 30 (Nv68) | 32 > 31: imposible |

---

## 4. Kit base (Nv1–8) con su forja

| Habilidad | Ranura · Nv | Qué hace | Mejora (Nv+3) | Variante I (Nv+6) | Variante II (Nv+6) |
|---|---|---|---|---|---|
| **Tajo** | Básica `IZQ` · 1 | Cortas al objetivo y al que está pegado a él (50 %). Te da 10 de Furia, +2 por cada enemigo extra | Filo Ancho: salpicadura 50 → 65 % y alcance 2 → 2,5 m | **Desgarro** (un objetivo): sangra el 60 % del golpe en 3 s | **Siega** (área): barrido de 3 m al 75 % (absorbe al Embate) |
| **Hendidura** | Principal `DER/2` · 2 | Cono de 120° y 4,5 m (290 %); **se prepara 0,25 s** y la esquiva la cancela sin gastar Furia | Arco Amplio: cono 120 → 150° | **Rompefilas** (un objetivo): +45 % si golpea a uno solo | **Grieta** (área): deja una grieta 2 s (40 %/s), solo una |
| **Embestida** | Movilidad `1` · 4 | Embistes 7 m y golpeas al llegar (120 % a 1,9 m); si golpeas, +12 de Furia | Carga Fiera: alcance 9 m y +4 de Furia | **Carnero** (control): arrastras y aturdes 0,5 s | **Doble Carga** (movilidad): 2 cargas |
| **Piel de Hierro** | Defensa `2` · 6 | 8 s con un 40 % menos de daño; no te pueden ralentizar. **La recarga (20 s) empieza al acabar** (rejuicio, §20). **Con el Guardián: 12 s y −50 %** (chip dorado en la forja) | Acero Templado: te curas el 8 % al activarla | **Espinas** (área): devuelves el 40 % del daño cuerpo a cuerpo | **Inamovible** (aguante): 10 s e imparable; se recarga en 25 s |
| **Lanza Arrojadiza** | Principal `DER/2` · 8 | Atraviesa a todos en 11 m (190 %): tu respuesta a voladores y lanzadores | Punta de Arpón: ralentiza un 30 % 2 s | **Arpón** (control): arrastras 4 m al primero (+30 %) | **Jabalinas** (área): 3 lanzas al 70 % |

Dos principales **de estilos distintos**: cuerpo a cuerpo con preparación (Hendidura) y a distancia instantánea (Lanza). Nada fuerte de una especialización: el giro, el combo, las posturas, los martillos y la provocación son de las especializaciones.

---

## 5. Verbos de entrada y movimiento

### 5.1 Vocabulario

| Verbo | Cómo se juega | Feedback | ¿Lo soporta hoy `game-skills.js`? |
|---|---|---|---|
| Pulsar | Sale al instante | — | Sí |
| **Preparación interrumpible** | Un instante de carga; la esquiva la cancela sin coste | Barra corta junto al personaje | Sí (`windup`); los nodos que la cambian necesitan claves nuevas (`windupAdd`, `windupMult`, `windupMove`) |
| **Canalizar mientras mantienes** | Sigue mientras mantienes; soltar lo corta | Aro que se consume | Sí (`startChannel`, `hold`, `moveFree`); **soltar con efecto**: `onEnd` con `inst.released` (nuevo) |
| **Cargar y soltar** con ventana perfecta | Mantienes para cargar; al soltar, más daño o radio; soltar en la ventana da un extra | Barra de carga en la ranura y junto al cursor; **destello** y «clang» en la ventana | **No: nuevo tipo genérico `charge`** (§11.4). Verbo principal del **Cruzado** |
| **Relanzar dentro de una ventana** | La 2.ª pulsación en N s repite con otro efecto | Pips de usos restantes y aro de la ventana en la ranura | **No: clave nueva `recast`** |
| **Combo de 3** | Cada pulsación avanza un paso; el 3.º es distinto | 3 pips en la ranura; el 3.º brilla cuando toca | **No: nuevo tipo genérico `combo`** |
| **Plantado** frente a en marcha | Bonus por no moverte (1 s sin caminar ni usar movilidad) o por moverte | Icono de estado «Plantado» y anillo bajo los pies | Parcial (`drFocus` y la Concentración miran el movimiento); **estado `p.planted`** nuevo (§11.4). Verbo principal del **Guardián** |
| **Posturas que se alternan** | Un botón cambia entre dos modos con efectos distintos; cambiar tiene premio | El icono de la ranura se da la vuelta y el marco toma el color de la postura | **No: nuevo tipo genérico `stance`** (§11.4). Verbo principal del **Guardián** |
| Movimiento rápido y lento | Carga, salto, destello frente a avance pesado imparable | — | Sí (`dash`, `leap`); avance lento imparable: `dashT` largo + `unstoppable` + arrastre |
| Marcas, zonas, posición | Marca que se detona, zona que cura o daña | Marca sobre el enemigo; borde de la zona | Marcas y zonas sí (DoT y campos); **detonar** una marca con el siguiente golpe: clave `mark.detonate` nueva |

### 5.2 Reparto (cada especialización con su verbo principal)

| Especialización | Verbo principal | Otros verbos del kit | Feedback propio |
|---|---|---|---|
| **Berserker** | **Encadenar en marcha**: relanzar el Salto y avanzar el combo sin parar | Canalizar en marcha (Remolino; soltar lo detona), combo de 3 con preparación en el 3.º (Rajar), ventana de riesgo (Furia Inmortal) | Pips de la cadena y del combo |
| **Guardián** | **Plantado y posturas**: quedarte quieto llena el Bastión y potencia el Terremoto; cambiar de postura lo descarga | Avance lento e imparable que arrastra (Carga de Escudo), provocación (forceTarget), preparación (Terremoto), plantado extremo (Ciudadela: no te mueves) | Anillo de «Plantado», marco azul (Muralla) o rojo (Ariete) en la ranura `3` |
| **Cruzado** | **Cargar y soltar** con ventana perfecta (Martillo de Guerra y Cataclismo) | Marcas que se detonan (Juicio), zonas sagradas (Sendero, Cataclismo, Golpe Consagrado), movimiento rápido (destello del Sendero), preparación (Juicio) | Barra de carga con destello, marca dorada sobre el enemigo |

**Nodos que cambian los verbos (no solo números):**

| Especialización · verbo | Nodos | Qué cambian |
|---|---|---|
| Berserker · canalizar en marcha | b18, b22, b25 | Te da Furia al girar; **soltar** detona los Sangrados; el giro sigue mientras toques a alguien que sangra (hasta 6/10/20 s según el rango) |
| Berserker · relanzar | b10, b17, b21, b24, b27 | Más saltos; cada salto suma poder; el último desangra; la cadena se recarga si el último golpea a 3 (como mucho 2 veces seguidas) |
| Berserker · combo de 3 | b5, b6, b9, b19, b23, b26 | Saltar al 3.er golpe tras caer; el 3.º suelta una onda o es crítico seguro; el 3.º golpea dos veces |
| Berserker · ventana de riesgo | b15, b17, b28 | Sobrevivir a un golpe letal (Negación te deja con media Sed; con la Sed Saciada, como mucho una vez cada 60 s); saltar sin recarga; la definitiva se lanza sola |
| Guardián · posturas | d5, d8, d18, d22, d25 (+ forja A/B) | Cada cambio golpea y provoca **o** da un crítico seguro; en Muralla absorbes el daño de tus aliados; cada cambio suma poder y te cura; **tres cambios seguidos te dan las dos posturas a la vez** (Guardia Total, con su propia recarga de 15 s) |
| Guardián · plantado | d0, d9, d19, d26, d6, d27; c9B | Plantado llena el Bastión, el Terremoto suelta más réplicas (o un epicentro), sueltas réplicas gratis cada 3 s, cada 3.er Terremoto se repite; **llegar con la Carga cuenta como plantado** (Pisotón) y te planta (Cabeza de Puente); con Sin Pausa, prepararte caminando no rompe el plantado |
| Guardián · avance lento | d3, d10, d13, d14, d17, d21, d24, d27 (+ forja: Carga Veloz lo vuelve rápido) | Arrastrar más ancho o chocar con un élite, bloquear de frente mientras avanzas y los golpes que siguen al llegar, recarga por enemigo arrastrado (nunca por debajo de 4 s), escudo al grupo al llegar (cada 10 s) |
| Guardián · provocación | d7, d8A, d27, Ciudadela | Provocación más larga, provocar al cambiar de postura, provocar a 8 m al plantarte |
| Cruzado · cargar y soltar | z5, z6, z12, z19, z23, z26, z28 (+ forja M); c9 | Soltar perfecto **marca** o **consagra** el suelo; la ventana se alarga (0,25 → 0,45 s); cada perfecto seguido suma (y fallar lo reinicia); cada perfecto llama un martillo del cielo; la ventana empieza antes; Golpe Pesado premia la suelta perfecta y Sin Pausa deja cargar sin frenarte |
| Cruzado · marcas | z1, z4, z5, z8, z18, z22, z25 | La detonación estalla en área (cada enemigo, un estallido por lanzamiento) o dura el doble en jefes; cada detonación cura al más herido (cada 2 s) y marca a otros; **una marca se detona 2 o 3 veces** (Tribunal, según el rango) |
| Cruzado · zonas | z6, z13, z17, z21, z24, z27 | Zonas más grandes, quitan daño, recargan el Sendero (nunca por debajo de 4 s), potencian si estás dentro y **duran mientras estés dentro** (Tierra Santa: hasta 8/14/20 s). **Las zonas sagradas no se suman** (ronda 3, §21): cada enemigo recibe el daño de la más fuerte |
| Toda la clase · preparación y carga | c9 | Preparación +0,3 s con +40 % y Quebranto (y +25 % a la suelta perfecta), o la mitad, moviéndote y sin romper el plantado (y cargar no te frena): Hendidura, 3.er golpe de Rajar, **Terremoto**, **Juicio**, **Martillo** y **Cataclismo** |
| Toda la clase · movilidad | c3, c7, c14, c21, c23, c27, c30 | Imparable al moverte; al llegar ralentizas, te curas (cada 6 s) o intimidas; tras moverte, la siguiente principal es gratis (y si mata, la movilidad recupera media recarga, como mucho cada 6 s). Con una movilidad que se relanza, esos efectos cuentan el primer uso de la cadena (§21) |

---

## 6. Árbol de clase del Guerrero (30 nodos)

Generada de los datos. ○ pasiva · ⬡ elección · □ opción que concede una habilidad. «Requiere» = cualquiera de esos nodos al máximo. Izquierda = **Defensa** (Piel de Hierro), centro = **Armas** (Furia y principales), derecha = **Movilidad** («tu movilidad»: la habilidad de la ranura `1`).

| Fila | Id | Nodo | Forma · tipo | Etiqueta | Rangos | Requiere | Qué hace (al máximo) | Cuál conviene |
|---|---|---|---|---|---|---|---|---|
| 0 | c1 | Constitución | ○ pasiva | número | 2 | — | Rango 2: +12 % de vida máxima |  |
| 0 | c2 | Fuerza Bruta | ○ pasiva | número | 2 | — | Rango 2: Todos tus golpes hacen +12 % de daño |  |
| 0 | c3 | Avance Implacable | ○ pasiva | número | 2 | — | Rango 2: Tu habilidad de movilidad se recarga un 24 % más rápido |  |
| 1 | c4 | Curtido | ○ pasiva | número | 3 | c1 | Rango 3: Piel de Hierro dura 3 s más (8 → 11 s; con el Guardián, 12 → 15 s) |  |
| 1 | c5 | Tajo: Firme o Voraz | ⬡ elección | mecánica | 1 | c1 o c2 | **A · ○ Tajo Firme**: Contra élites y jefes, cada Tajo te da 15 de Furia (antes 10) _(contra jefes)_<br>**B · ○ Tajo Voraz**: Si el Tajo mata, tu siguiente habilidad principal cuesta la mitad de Furia _(contra grupos)_ | A, contra jefes: con un solo blanco el Tajo no suma enemigos extra y así no te falta Furia. B, contra grupos: cada muerte abarata la siguiente principal |
| 1 | c6 | Principal: Ensañamiento o Sin Cuartel | ⬡ elección | mecánica | 1 | c2 o c3 | **A · ○ Ensañamiento**: Tus habilidades principales hacen +25 % al enemigo con más vida de los que golpean _(contra jefes)_<br>**B · ○ Sin Cuartel**: Tus habilidades principales hacen +5 % por cada enemigo que golpean (hasta +25 %) _(contra grupos)_ | A, contra jefes: el golpe grande va al que más aguanta. B, contra grupos: con 5 enemigos, +25 % a todas tus principales. Sirve igual a las tres especializaciones |
| 1 | c7 | Marcha Imparable | ○ pasiva | mecánica | 1 | c3 | Mientras usas tu movilidad y 1 s después eres imparable: nada te aturde ni te frena |  |
| 2 | c8 | Determinación | ○ pasiva | número | 2 | c4 o c5 | Rango 2: Con más de 50 de Furia, recibes un 16 % menos de daño |  |
| 2 | c9 | Preparación: Pesada o Sin Pausa | ⬡ elección | mecánica | 1 | c5 o c6 | **A · ○ Golpe Pesado**: Tus golpes con preparación tardan 0,3 s más y hacen +40 %; tus sueltas perfectas, +25 %. A los jefes, 15 de Quebranto _(contra jefes)_<br>**B · ○ Sin Pausa**: Tus golpes con preparación tardan la mitad y te mueves al prepararlos sin dejar de estar plantado. Cargar no te frena _(contra grupos)_ | A, contra jefes: más daño y Quebranto si aguantas la preparación o sueltas en el destello. B, contra grupos: golpeas antes y sin pararte, también al cargar |
| 2 | c10 | Derribo o Silenciar | ⬡ elección | mecánica | 1 | c6 o c7 | **A · ○ Derribo**: Cada 8 s, tu siguiente golpe derriba 1 s (a los jefes no: les llena 20 de Quebranto) _(control)_<br>**B · ○ Silenciar**: Cada 10 s, tu siguiente Lanza Arrojadiza corta el hechizo del enemigo y lo deja mudo 3 s _(contra jefes)_ | A, contra grupos que te rodean. B, contra jefes y élites que lanzan hechizos: los cortas a distancia (y les llenas el Quebranto) |
| 3 | c11 | Segundo Aliento o Coraza | ⬡ elección | mecánica | 1 | c8 | **A · □ Segundo Aliento** (habilidad): Habilidad (ranura 2): gastas tu Furia y te curas un 1 % por cada 3. Si no la pones, sale con Piel de Hierro al 50 % _(supervivencia)_<br>**B · ○ Coraza de Hierro**: Al bajar del 30 % de vida, recibes un 30 % menos de daño durante 5 s. Una vez cada 60 s _(supervivencia)_ | A: en la ranura 2 eliges cuándo curarte (100 de Furia, un 33 %); sin ponerla, cada Piel de Hierro gasta media Furia y cura la mitad. B, siempre activo (en el Guardián casi no suma: su reducción ya toca el tope) |
| 3 | c12 | Furia Creciente | ○ pasiva | número | 2 | c8 o c9 | Rango 2: Generas un 20 % más de Furia |  |
| 3 | c13 | Golpes Precisos | ○ pasiva | número | 2 | c9 o c10 | Rango 2: +10 % de probabilidad de crítico |  |
| 3 | c14 | Movilidad: Polvareda o Reparo | ⬡ elección | mecánica | 1 | c10 | **A · ○ Polvareda**: Al llegar con tu movilidad, ralentizas un 50 % durante 3 s a todos a 3 m _(control)_<br>**B · ○ Carga Reparadora**: Tu movilidad te quita las ralentizaciones y te cura un 6 % de la vida (una vez cada 6 s) _(supervivencia)_ | A, para encerrar a la manada o escapar de ella. B, para aguantar peleas largas |
| 4 | c15 | Furia Protectora o Desbordante | ⬡ elección | mecánica | 1 | c11 o c12 | **A · ○ Furia Protectora**: El 20 % del daño que recibes lo pagas con Furia: 1 de Furia por cada 0,5 % de tu vida _(supervivencia)_<br>**B · ○ Furia Desbordante**: Puedes guardar hasta 130 de Furia (antes 100); por encima de 100, haces +10 % de daño _(contra jefes)_ | A, para sobrevivir (+15–20 % de aguante), aunque gastas menos Furia en daño (y la que pagas así no cuenta como gastada). B, para hacer daño: guardas Furia para las ráfagas |
| 4 | c16 | Filo Dentado o Contundencia | ⬡ elección | mecánica | 1 | c12 o c13 | **A · ○ Filo Dentado**: Tus Sangrados hacen +25 % de daño y duran 1 s más _(contra jefes)_<br>**B · ○ Contundencia**: Tus aturdimientos y derribos duran un 50 % más; a los jefes les llenan un 30 % más de Quebranto _(control)_ | A, si tu daño sangra (el Tajo con Desgarro y las habilidades que desangran): +25 % a todo ese daño. B, si controlas: más control y más Quebranto. Une el árbol con la forja |
| 4 | c17 | Grito de Guerra o Ira Contenida | ⬡ elección | mecánica | 1 | c13 o c14 | **A · □ Grito de Guerra** (habilidad): Habilidad (ranura 2): +30 de Furia y +10 % de daño al grupo 8 s. Si no la pones, sale con Piel de Hierro al 50 % _(contra jefes)_<br>**B · ○ Ira Contenida**: Cada 20 s, tu siguiente habilidad principal no cuesta Furia y hace +20 % _(contra jefes)_ | A: en la ranura 2 abre una ráfaga de grupo; sin ponerla, cada Piel de Hierro te da 15 de Furia y +5 % al grupo. B, en solitario: más daño propio y sin ocupar ranura |
| 5 | c18 | Hierro Vivo | ○ pasiva | número | 2 | c15 | Rango 2: Piel de Hierro se recarga en 14 s (antes 20 s) |  |
| 5 | c19 | Temple | ○ pasiva | mecánica | 1 | c15 o c16 | Con Piel de Hierro puesta, cada Tajo te da 3 de Furia más y la alarga 0,25 s (hasta 3 s más)<br>_híbrido: Defensa + Armas_ |  |
| 5 | c20 | Desequilibrio | ○ pasiva | mecánica | 1 | c16 o c17 | Tus críticos ralentizan un 30 % durante 2 s; contra ralentizados, tus principales tienen +10 % de crítico<br>_híbrido: Armas + Control_ |  |
| 5 | c21 | Persecución | ○ pasiva | número | 1 | c17 | Tu movilidad hace +50 % de daño a los enemigos ralentizados o aturdidos |  |
| 6 | c22 | Intervención o Hermandad | ⬡ elección | mecánica | 1 | c18 o c19 | **A · □ Intervención** (habilidad): Habilidad (ranura 2): saltas a un aliado: escudo del 15 % a los dos. Si no la pones, sale con Piel de Hierro al 50 % _(supervivencia)_<br>**B · ○ Hermandad de Armas**: Tú y tus aliados a 15 m ganan +5 % de daño y +8 % de vida; generas un 5 % más de Furia por aliado _(supervivencia)_ | A: en la ranura 2 saltas a proteger a un aliado; sin ponerla, cada Piel de Hierro da un escudo del 8 % a ti y al aliado más cercano. B, siempre activo y sin ocupar ranura |
| 6 | c23 | Ritmo de Combate | ○ pasiva | mecánica | 2 | c19 o c20 | Rango 2: Cada crítico del Tajo recarga 1 s de tu movilidad y de Piel de Hierro |  |
| 6 | c24 | Brazo Veloz | ○ pasiva | número | 2 | c20 o c21 | Rango 2: Atacas un 14 % más rápido |  |
| 7 | c25 | Rencor | ○ pasiva | mecánica | 3 | c22 | Rango 3: Al acabar Piel de Hierro, devuelves el 30 % del daño que evitó a los enemigos a 4 m |  |
| 7 | c26 | Desenfreno | ○ pasiva | mecánica | 3 | c23 | Rango 3: Si gastas 80 de Furia en 4 s, haces +28 % de daño durante 4 s |  |
| 7 | c27 | Rugido de Carga | ○ pasiva | mecánica | 3 | c24 | Rango 3: Al llegar con tu movilidad, intimidas a los enemigos a 5 m: hacen un 24 % menos de daño durante 4 s |  |
| 8 | c28 | Inquebrantable | ○ **FINAL** | mecánica | 3 | c25 | Rango 3: Piel de Hierro dura hasta que evita daño por un 70 % de tu vida; vuelve en 15 s. Con ella, generas un 30 % más de Furia<br>_final: Defensa_ |  |
| 8 | c29 | Señor de la Guerra | ○ **FINAL** | mecánica | 3 | c26 | Rango 3: Cada 100 de Furia gastada, tu siguiente principal sale dos veces: la copia, gratis y al 80 %, no activa otros efectos<br>_final: Armas_ |  |
| 8 | c30 | Asalto Total | ○ **FINAL** | mecánica | 3 | c27 | Rango 3: Tras tu movilidad, la siguiente principal es gratis y +45 %; si mata, tu movilidad recupera media recarga (cada 6 s)<br>_final: Movilidad_ |  |

**Tres finales:** **Inquebrantable** (Defensa: Piel de Hierro no caduca por tiempo; dura hasta evitar daño por un 40/55/70 % de tu vida y da Furia), **Señor de la Guerra** (Armas: cada 100 de Furia gastada, la siguiente principal sale dos veces; la copia no activa otros efectos) y **Asalto Total** (Movilidad: tras moverte, la siguiente principal es gratis y +45 %, y si mata, la movilidad recupera media recarga, como mucho cada 6 s).

**Furia gastada (rejuicio, §20):** Desenfreno (c26), Señor de la Guerra (c29) y el Golpe de Titán (t0) solo cuentan la Furia que pagan tus habilidades. La que pagas con Furia Protectora (1 de Furia por cada 0,5 % de vida), la que gasta Segundo Aliento y el drenaje de Danza Carmesí **no cuentan**: un tanque no pega más por recibir más golpes.

**Las tres habilidades de talento de clase (rejuicio, §20):** Segundo Aliento (c11A), Grito de Guerra (c17A) e Intervención (c22A) ya no compiten con Piel de Hierro por la ranura `2`. **Si no las pones en la barra, salen con cada Piel de Hierro al 50 %** (respetando su propia recarga): Segundo Aliento gasta la mitad de tu Furia y cura un 1 % por cada 3 gastados (1 % por cada 6 de la que tenías); Grito de Guerra da 15 de Furia y +5 % al grupo 8 s; Intervención, sin salto, da un escudo del 8 % de tu vida a ti y al aliado más cercano. En la barra rinden al 100 %. La elección queda en «pasivo siempre (B) frente a ráfaga con la Piel (A)».

**Etiquetas:** filas 3–9, 15 de 20 «mecánica» (75 %; mínimo 60 %). Cada «número» da ≥ +10 % en su eje.

**Implementación (por nodo):** `c1` stats.hpPct · existe; `c2` mod @all dmg · existe; `c3` mod @movement cdr · existe (Embestida 8 → 6 s; Salto Devastador 12 → 9 s; Carga de Escudo y Sendero de Luz 10 → 7,6 s); `c4` mod g_piel durS · claves; `c5` A: power g_tajo_firme · NUEVO (onHit + gainResource) · B: power g_tajo_voraz · NUEVO (onKill + buff spenderCostPct −50); `c6` A: power g_ensanamiento · NUEVO (condAdd @spender) · B: power g_sin_cuartel · NUEVO (modifyResolve por hits del lanzamiento); `c7` mod @movement unstoppable + 1 s · claves; `c8` tv.drHighFury · NUEVO (copia de drHighMana); `c9` A: mod @windup windupAdd .3 · dmg +40 · stagger 15 + mod @charge perfectDmg 25 · stagger 15 · claves NUEVAS (corrección de la etapa 2: c9 también toca las cargas) · B: mod @windup windupMult .5 · windupMove · keepPlanted + mod @charge moveWhileCharging 1 · claves NUEVAS; `c10` A: power g_derribo · NUEVO (onCast + applyCC knock) · B: power g_silenciar · NUEVO (interrupt; +20 de Quebranto a jefes); `c11` A: activa g_t_aliento · existe; si no está en la barra, Piel de Hierro la lanza al 50 % (gasta la mitad de tu Furia y cura 1 % por cada 3 gastados; respeta su recarga de 30 s; esa Furia no cuenta como gastada) · B: power g_coraza_hierro · existe; `c12` stats.resGainPct · NUEVO (clave); `c13` stats.crit · existe; `c14` A: power g_polvareda · NUEVO (afterCast @movement + applyCC slow; con movilidades que se relanzan, cuenta el primer uso de la cadena) · B: power g_carga_reparadora · NUEVO (afterCast @movement + cura por p.sustain() + cleanse; icd 6 en la cura; con movilidades que se relanzan, cuenta el primer uso de la cadena; antes g.heal sin icd: ~15 saltos por ciclo en Estampida ≈ 5 %/s fuera de la cubeta); `c15` A: power g_furia_protectora · NUEVO (④ onDamaged: 1 de Furia por cada 0,5 % de la vida máxima; sin Furia, pagas con vida; esa Furia no cuenta como gastada para c26, c29 ni t0) · B: stats resMaxAdd 30 + power g_desbordante · NUEVO; `c16` A: tv.bleedPct 25 + tv.bleedDur 1 · existen · B: tv.ccDurPct 50 + tv.staggerPct 30 · NUEVOS (claves); `c17` A: activa grito_guerra · existe (pasa de base a talento); si no está en la barra, Piel de Hierro la lanza al 50 % (+15 de Furia y +5 % al grupo a 15 m 8 s; respeta su recarga de 20 s) · B: power g_ira_contenida · NUEVO (icd 20 + condAdd); `c18` mod g_piel cdr · existe; `c19` power g_temple · NUEVO (onHit + extendBuff); `c20` power g_desequilibrio · NUEVO (onHit + condCrit); `c21` power g_persecucion · NUEVO (condAdd @movement; vale en cada salto de la cadena: es el daño del golpe, como Peso Muerto, no un efecto al llegar); `c22` A: activa g_t_intervencion · existe (pasa de la 1 a la 2); si no está en la barra, Piel de Hierro la lanza al 50 % (sin salto: escudo del 8 % de tu vida a ti y al aliado más cercano; respeta su recarga de 20 s) · B: power g_aura_hermandad · existe; `c23` tv.basicCritCdr · NUEVO (copia de dartCritCdr); `c24` stats.aspdPct · existe; `c25` power g_rencor · NUEVO (cuenta el daño evitado; onBuffEnd); `c26` power g_ira_gasto · NUEVO (⑪ onResource; solo cuenta la Furia pagada por habilidades: no cuentan Furia Protectora, Segundo Aliento ni el drenaje de Danza Carmesí; el id g_desenfreno ya es de Sangre Hirviente y sale); `c27` power g_rugido_carga · NUEVO (e.weakenOutgoing; con movilidades que se relanzan, cuenta el primer uso de la cadena); `c28` power g_inquebrantable · NUEVO (presupuesto de daño evitado: 40/55/70 % de la vida máxima; sin caducidad por tiempo; la recarga de 15 s empieza al romperse; el mecanismo escala por rango; antes 3/4/5 golpes, que una manada rompía en ~1 s); `c29` power g_senor_guerra · NUEVO (echo del canal; solo cuenta la Furia pagada por habilidades: no cuentan Furia Protectora, Segundo Aliento ni el drenaje de Danza Carmesí; con cargar y soltar, la copia sale con la misma carga; la copia es echo:true: no cuenta como suelta perfecta ni como lanzamiento, no da Fervor, no gasta el Golpe de Titán ni suma al 3.er Terremoto de Montaña Viva); `c30` power g_asalto_total · NUEVO (afterCast @movement + onKill cdReduce del 50 % de la recarga restante, icd 6; antes resetCd sin tope; respeta el suelo de 4 s de d17 y el del Sendero (z21) y cuenta como recarga «seguida» de b27; con movilidades que se relanzan, cuenta el primer uso de la cadena, como c14 y c27).

### 6.1 Revisión: ¿sirve igual a las tres especializaciones? (hecha con los kits reales)

| Rama / nodo | Berserker | Guardián | Cruzado | Veredicto |
|---|---|---|---|---|
| c5 Tajo | El Tajo es la única básica | Igual | Igual (además, 3 Tajos = 1 de Fervor) | Sirve a las tres |
| c6 Principales | Rajar, Hendidura, Lanza | Terremoto | Martillo de Guerra | Habla de «tus principales»: sirve a las tres |
| c9 Preparación | Hendidura y el 3.er golpe de Rajar | **Terremoto** (0,4 s): Golpe Pesado lo deja en 0,7 s con +40 % y Quebranto. **Sin Pausa** te deja moverte al prepararlo **sin romper el plantado** (antes lo rompía y solo servía la A) | **Juicio** (0,3 s) **y las cargas**: Golpe Pesado da +25 % a cada suelta perfecta del Martillo y del Cataclismo; Sin Pausa deja cargar caminando a velocidad normal | **Cambiado en la corrección (§19):** con solo el Juicio (120 % cada 8 s), c9 daba ~1 % al Cruzado; ahora toca las cargas y A y B rinden en las tres |
| c10B Silenciar | Lanza Arrojadiza (kit base) | Igual | Igual | Sirve a las tres |
| c3, c7, c14, c21, c23, c27, c30 Movilidad | Salto Devastador | Carga de Escudo (lenta; con Pisotón, el Terremoto siguiente sale instantáneo, plantado y gratis, pero sin el +% de Asalto Total) | Sendero de Luz (Asalto Total: el siguiente Martillo, gratis y +45 %; el Sendero no baja de 4 s, §21) | «Tu movilidad»: sin nodos muertos. **Ronda 3 (§21):** con el Salto, que se relanza, Polvareda, Carga Reparadora, Rugido de Carga y Asalto Total cuentan el primer salto de la cadena; Persecución, cada salto |
| c4, c18, c19, c25, c28 Piel de Hierro | Ranura `2` | Ranura `2`, con su pasiva (12 s y −50 %) | Ranura `2` | **Rejuicio (§20):** su recarga empieza al acabar, para todos. **Cambiado en la etapa 2:** Curtido decía «(antes 8 s)», falso con el Guardián; ahora dice «3 s más (8 → 11 s; con el Guardián, 12 → 15 s)» |
| c16 Sangre o control | A (Sangrado) | B (Contundencia: derribos y Quebranto) | B | Dependiente del kit a propósito |
| c11A, c17A, c22A (ranura 2) | En la barra o, sin ponerlas, con la Piel al 50 % | Igual; Segundo Aliento gana a la Coraza (reducción que el tope del Guardián ya llena): lo eligen Guardia Total y Roca y Escudo | Grito de Guerra al 50 % con cada Piel: lo elige Tierra Santa | **Cambiado en el rejuicio (§20):** antes ninguna build elegía la A; ninguna build saca la Piel de Hierro de la barra |
| Finales | Asalto Total (Estampida), Señor de la Guerra (Verdugo, híbrida), Inquebrantable (Danza Carmesí) | Inquebrantable (Guardia, híbrida), Señor de la Guerra (Sismo), Asalto Total (Vanguardia) | Inquebrantable (Tribunal), Señor de la Guerra (Veredicto, híbrida), Asalto Total (Santuario) | Cada final de clase lo usan builds de las tres especializaciones |

Ningún nodo de clase nombra una habilidad de especialización (G1, comprobado por el validador y por el comprobador de la etapa 2).

---

## 7. Especializaciones (29 nodos cada una, misma rejilla)

### 7.1 Berserker (daño cuerpo a cuerpo · Sed)

**Fantasía:** furia desatada: cuanto menos vida te queda, más fuerte golpeas. Giras, saltas y rematas sin parar.
**Pasiva («Al borde»):** con menos del 40 % de vida (o con la Sed Saciada) haces +25 % de daño. Es el ×1,25 de `m_berserk`; Furia Inmortal te deja quedarte ahí.
**Rol:** el que más daño hace del Guerrero (2e: contra un solo objetivo, al menos un 10 % más que las otras dos; §8.4); aguante medio que depende de curarse al matar.

**Kit (libro; forja con Mejora a Nv+3 y variantes a Nv+6):**

| Habilidad | Ranura · Nv | Qué hace | Mejora | Variante I | Variante II |
|---|---|---|---|---|---|
| **Remolino Sangriento** | Insignia `3` · 10 | **Mantén** para girar hasta 3 s **sin dejar de moverte**: golpeas a 2,9 m 4 veces por segundo (45 %) y desangras. 30 de Furia, 6 s | Giro Firme: no te pueden ralentizar al girar | **Remolino Anclado** (un objetivo): giras **sin moverte**: radio 2 m y +60 % | **Ciclón** (control): cada giro atrae 1 m a los enemigos a 5 m; −15 % |
| **Salto Devastador** | Movilidad `1` · 12 | Saltas hasta 8 m y golpeas al caer (150 % a 3 m). **Si golpeas, puedes volver a saltar en 2 s (hasta 3 saltos)**. 12 s | Caída Pesada: radio 3 → 4 m | **Caída Atronadora** (control): un solo salto; atraes 2 m y aturdes 0,75 s | **Salto Rasante** (movilidad): 12 m, bajo y rápido (0,25 s en el aire); −20 % |
| **Rajar** | Principal `DER/2` · 14 | **Combo de 3**: tajo, revés y un golpe descendente (320 %) que **se prepara 0,3 s** y desangra. Si paras 2,5 s, vuelve al 1.º. 15 de Furia por golpe | Filo Encadenado: el combo espera 4 s | **Estocada Final** (un objetivo): el 3.º es una estocada de 5 m en línea, +40 % | **Molino** (área): los tres golpes son giros de 2,5 m; −20 % |
| **Furia Inmortal** | Definitiva `4` · 15 | 10 s **imparable**: tu vida **no baja del 1 %** y tus principales no cuestan Furia. Al acabar, te curas un 20 %. 60 s | Sin Freno: dura 12 s | **Sed Voraz** (aguante): robas el 8 % del daño como vida; al acabar no te curas | **Frenesí** (un objetivo): +40 % de velocidad de ataque, pero la vida sí puede bajar del 1 % |

Recomendadas (★ del libro): Tajo **I** (Desgarro), Remolino **II** (Ciclón) y Furia Inmortal **I** (Sed Voraz). Barra recomendada: `IZQ` Tajo · `DER` Rajar · `1` Salto Devastador · `2` Piel de Hierro · `3` Remolino Sangriento · `4` Furia Inmortal.

**Barra de mecánica: Sed** (ya existe en `spec-mechanics.js`):

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
| 4 | b12 | Ritmo de Matanza | ○ pasiva | mecánica | 2 | b8 o b9 | Rango 2: Cada crítico de Rajar acorta 1 s tus recargas, salvo la definitiva y Piel de Hierro (una vez cada 1,5 s) |  |
| 4 | b13 | Peso Muerto | ○ pasiva | número | 2 | b9 o b10 | Rango 2: El Salto Devastador hace +40 % de daño |  |
| 4 | b14 | Impacto Aturdidor | ○ pasiva | mecánica | 1 | b10 | Quien sobrevive a la caída del Salto queda aturdido 0,5 s (cada enemigo, una vez cada 4 s); a los jefes, 15 de Quebranto |  |
| 5 | b15 | Negación o Umbral | ⬡ elección | mecánica | 1 | b11 o b12 | **A · ○ Negación de la Muerte**: Un golpe que te mataría te deja con 1 de vida y la Sed en 50. Una vez cada 2 min _(supervivencia)_<br>**B · ○ Umbral del Dolor**: Con menos del 40 % de vida, recibes un 15 % menos de daño _(supervivencia)_ | A, donde morir cuesta caro (Hardcore, jefes Pináculo): además te deja con media Sed. B, contra grupos: aguante siempre que juegas al borde |
| 5 | b16 | Sangre Hirviente | ○ pasiva | mecánica | 2 | b12 o b13 | Rango 2: Con más de 50 de Sed, tus golpes, giros y saltos van un 16 % más rápido<br>_híbrido: Los tres estilos (por la Sed)_ |  |
| 5 | b17 | Sin Suelo | ○ pasiva | mecánica | 2 | b13 o b14 | Rango 2: Durante Furia Inmortal, el Salto Devastador no se recarga y encadena 2 saltos más |  |
| 6 | b18 | Avidez | ○ pasiva | mecánica | 2 | b15 | Rango 2: Mientras giras, cada enemigo que empiezas a desangrar te da 4 de Furia |  |
| 6 | b19 | Último Trago | ○ pasiva | mecánica | 2 | b15 o b16 | Rango 2: El 3.er golpe de Rajar te da 10 de Sed (el doble contra élites y jefes) |  |
| 6 | b20 | Alcance Salvaje | ○ pasiva | número | 2 | b16 o b17 | Rango 2: Tus golpes de área cuerpo a cuerpo son un 30 % más grandes |  |
| 6 | b21 | Caída Sangrienta | ○ pasiva | mecánica | 1 | b17 | El último salto de la cadena desangra a todos los que golpea (el 100 % del golpe en 3 s) |  |
| 7 | b22 | Estallido Rojo | ○ pasiva | mecánica | 3 | b18 | Rango 3: Al soltar el Remolino, los Sangrados a 4 m estallan: hacen de golpe el 65 % de lo que les queda |  |
| 7 | b23 | Verdugo | ○ pasiva | mecánica | 3 | b19 | Rango 3: El 3.er golpe de Rajar hace +9 % por cada 10 % de vida que le falta al objetivo |  |
| 7 | b24 | Ímpetu | ○ pasiva | mecánica | 3 | b21 | Rango 3: Cada salto de la cadena te da +9 % de daño durante 8 s (se suma hasta 5 veces) |  |
| 8 | b25 | Danza Carmesí | ○ **FINAL** | mecánica | 3 | b22 | Rango 3: El Remolino sigue mientras toques a alguien que sangra (hasta 20 s), a 8 de Furia por segundo tras 3 s. Sangrados +30 %<br>_final: Hemorragia_ |  |
| 8 | b26 | Golpe de Gracia | ○ **FINAL** | mecánica | 3 | b23 | Rango 3: El 3.er golpe de Rajar golpea dos veces: el 2.º hace el 60 % y deja al objetivo Vulnerable 4 s. Rajar +30 %<br>_final: Verdugo_ |  |
| 8 | b27 | Estampida Sin Fin | ○ **FINAL** | mecánica | 3 | b24 | Rango 3: Si el último salto de la cadena golpea a 3 o más, el Salto se recarga al instante (como mucho 2 seguidas). Salto +30 %<br>_final: Estampida_ |  |
| 9 | b28 | Corazón Indomable | ○ **ÁPICE** | mecánica | 4 | b25 o b26 o b27 | 1) Matar a un élite te da 30 de Sed. 2) La Sed Saciada dura 9 s (antes 6 s). 3) Con la Sed Saciada, un golpe que te mataría te deja con 1 de vida (como mucho una vez cada 60 s). 4) Cada 3 Sed Saciadas, Furia Inmortal se lanza sola 5 s, gratis (como mucho una vez cada 90 s). |  |

**Etiquetas:** filas 3–9, 18 de 21 «mecánica» (86 %).

| Arquetipo | Fantasía | Verbo | Elección que lo define | Penúltimo → final | Mejor en |
|---|---|---|---|---|---|
| **Hemorragia** | Giras entre la manada y todo sangra; sueltas y estalla | Canalizar en marcha y **soltar** | b8 **Contagio** (grupos) o Desangrar (jefes) | Estallido Rojo → **Danza Carmesí** | Grupos y supervivencia |
| **Verdugo** | Tres golpes y el tercero parte en dos | Combo de 3 con preparación en el 3.º | b9 Onda de Choque (grupos) o **Remate Certero** (jefes) | Verdugo → **Golpe de Gracia** | Jefes |
| **Estampida** | Saltas de manada en manada sin tocar el suelo | Relanzar en una ventana | b10 **Salto en Cadena** (grupos) o Aplastante (jefes) | Ímpetu → **Estampida Sin Fin** | Grupos con control |

Nodos que mezclan arquetipos: **Reabrir** (Hemorragia + Verdugo), **Caída Brutal** (Verdugo + Estampida), **Sangre Hirviente** (los tres, por la Sed) y **Alcance Salvaje** (común). El ápice **Corazón Indomable** (4 rangos) sirve a los tres.

**Finales por rango (corrección §19):** el mecanismo crece con cada rango, así que un final a rango 1 se prueba pero no se juega: Danza Carmesí sigue girando hasta 6/10/20 s; Golpe de Gracia copia al 30/45/60 % y deja Vulnerable 2/3/4 s; Estampida Sin Fin recupera 4 s, 8 s o toda la recarga (como mucho 2 veces seguidas). Ritmo de Matanza ya no acorta la definitiva y la Furia Inmortal gratis del ápice llega como mucho una vez cada 90 s. **Rejuicio (§20):** Ritmo de Matanza tampoco acorta Piel de Hierro y actúa como mucho una vez cada 1,5 s; Corazón Indomable 3 salva como mucho una vez cada 60 s y Negación de la Muerte deja la Sed en 50 (antes la llenaba y disparaba otra salvación). Furia Inmortal no baja de 42 s de recarga (suelo de las definitivas).

**Implementación (por nodo):** `b0` mecánica sed + power m_berserk · existen (ya no concede activa: el Remolino está en el libro); `b1` tv.bleedDur · NUEVO (copia de burnDur); `b2` mod g_rajar crit · claves; `b3` mod g_salto cdr · existe; `b4` tv.bleedPct · existe; `b5` power g_b_reabrir · NUEVO (onHit + replaceDoT + gainGauge); `b6` power g_b_caida_brutal · NUEVO (afterCast g_salto → comboStep 3); `b7` mod g_salto slow 2 · slowPct · claves; `b8` A: power g_b_contagio · NUEVO (onKill; lógica de p_propagacion) · B: power g_b_desangrar · NUEVO (lógica de p_acumular); `b9` A: power g_b_onda_choque · NUEVO (afterCast step 3 + dealArea) · B: power g_b_remate_certero · NUEVO (onCast forceCrit step 3 + addStagger); `b10` A: mod g_salto recastAdd 2 · clave NUEVA · B: power g_b_salto_aplastante · NUEVO (condAdd por cadena); `b11` tv.bleedKillHeal + bleedKillMana · existen; `b12` tv.critCdrAll · NUEVO (como critFireCdr, sobre todas menos @ultimate y g_piel; icd 1,5: ≤ 0,67 s/s); `b13` mod g_salto dmg · existe; `b14` mod g_salto stun .5 + stagger 15 · claves; icd 4 por enemigo (además de los rendimientos decrecientes de applyCC); `b15` A: power g_negacion · existe (+ deja la Sed en 50: no la llena, para no encadenar con la salvación de Corazón Indomable 3) · B: tv.drLowHp · NUEVO (clave); `b16` power g_b_sangre_hirviente · NUEVO (stats con gaugeValue); `b17` power g_b_sin_suelo · NUEVO (modifyResolve con el buff g_u_furia); `b18` power g_b_avidez · NUEVO (onHit en el canal); `b19` power g_b_ultimo_trago · NUEVO (gainGauge sed); `b20` mod @melee radius · existe; `b21` power g_b_caida_sangrienta · NUEVO (afterCast último salto + applyDoT); `b22` power g_b_estallido_rojo · NUEVO (onEnd del canal + consumeDoT); `b23` power g_b_verdugo · NUEVO (condAdd por vida que falta); `b24` power g_b_impetu · NUEVO (addBuff con pilas); `b25` power g_b_danza_carmesi · NUEVO (canal con drainPerSec y tope por rango: 6/10/20 s); `b26` power g_b_golpe_gracia · NUEVO (echo del paso 3 al 30/45/60 % + vuln 1/2,5/4 s: con un 3.er golpe cada ~2,7 s, Vulnerable el 37/93/100 % del tiempo); `b27` power g_b_estampida · NUEVO (onChainEnd + cdReduce 4/8 s o resetCd; como mucho 2 reinicios seguidos: la 3.ª cadena espera la recarga normal; cuentan también los de otros poderes: la media recarga de Asalto Total es una «seguida»); `b28` power g_b_corazon_indomable (rangos) · NUEVO (rango 3: icd 60, antes una vez por Sed; rango 4: icd 90).

### 7.2 Guardián (tanque · Bastión)

**Fantasía:** la muralla viviente. Te plantas delante del grupo, alternas la guardia cerrada y el golpe de ariete, provocas a la manada y absorbes el daño de tus aliados.
**Pasiva («Escudo del Guardián»):** Piel de Hierro dura **12 s y quita un 50 %** (antes 8 s y 40 %); **solo para el Guardián, la reducción de daño llega al 65 % y el bloqueo al 50 %**; +15 % de bloqueo con escudo y triple amenaza. Es la decisión del dueño: el tanque recupera aquí el aguante que perdió el kit base, sin traer otra defensa a la ranura `2`. Los topes más altos son la corrección de §19.2: sin ellos, la Piel sola llenaba el saco de reducción y Muralla, el Bastión o el Pendón no valían nada.
**Decisión del orquestador (§17.2): un tope propio, no uno global.** `CAPS.dr` (50) y `CAPS.block` (40) de `combat-math.js` **no se suben**: las otras ocho especializaciones siguen con 50 y 40 %. El aumento es un **stat de especialización** de la pasiva innata del Guardián (`drCapAdd 15` y `blockCapAdd 10` en su `spec.innate`, §11.2 y §11.4): solo cuenta mientras el Guardián es tu especialización activa, y ningún nodo, objeto, Paragon ni bendición da esas claves.
**Rol:** el tanque. Provoca con `g.forceTarget` (Carga de Escudo, Barrido de Escudo, Cabeza de Puente, Ciudadela), reduce el daño de los aliados (Guardia Compartida, Vínculo de Escudo con `onAllyDamaged` y `g.damageAlly`, Escolta, Ciudadela, descarga del Bastión), llena el **Quebranto** de los jefes (Epicentro, Choque Frontal, Arrollador, Martinete) y castiga al jefe ya **Quebrantado** (Cambio Certero, Réplica Honda).

**Capas de defensa del Guardián (corrección §19.2, con los topes de `combat-math.js`):**

| Capa | Tope | Qué la llena | Cuándo se nota |
|---|---|---|---|
| Bloqueo: probabilidad | 50 % (Guardián; 40 % el resto) | Pasiva +15, Muralla +10 (Guardia Total +13), escudo equipado | Siempre que llevas escudo |
| Bloqueo: cuánto para | 50 % → 80 % (Escudo Alzado) → 90 % (Aguante de Roca con 5 cargas; **un bloqueo nunca para todo el golpe**, rejuicio §20) | d1 y d15B; Escudo por Delante y Proa Blindada dan **bloqueos seguros** (fuera del tope) | Contra golpes grandes y en la Carga |
| Saco de reducción | 65 % (Guardián; 50 % el resto) | Piel 50, Muralla 15, Bastión 4 por carga, Determinación 16, Pendón 8–16, Ciudadela 40 | Con la Piel puesta, Piel + Muralla tocan el techo; sin ella (≈ 40–50 % del tiempo, porque **su recarga empieza al acabar**, §20), Muralla + Bastión + Determinación ≈ 51 % y el Pendón todavía suma |
| Vida, curas y escudos | Cubeta de `p.sustain()` (6 %/s) para las curas propias | Corpulencia, Guardia Viva (cura al cambiar), descarga del Bastión, Escolta, Relevo, Segundo Aliento con la Piel | Siempre: no compiten con el tope |

**Tiempo con la Piel de Hierro puesta (rejuicio, §20):** su recarga empieza **al acabar**, así que las reducciones (Hierro Vivo, Tambor de Guerra, Inexpugnable 3, Ritmo de Combate) solo acortan el tiempo sin ella. Guardia Total y Roca y Escudo (Curtido 3, Hierro Vivo 2, Inquebrantable 3): ~15–17 s puesta y 14–15 s quitada (**≈ 50–55 %**). Montaña Viva (Tambor de Guerra) y Cabeza de Puente (Inexpugnable 3 y Ritmo de Combate): ~15 s puesta y ~10 s quitada (**≈ 60 %**). Las builds de daño: ~11–14 s puesta y 14–20 s quitada (**≈ 35–45 %**). Antes de la regla, el Guardián la tenía puesta casi el 100 % del tiempo y el Berserker de daño el 85–100 %.

**Aguante estimado (rejuicio, §20: ahora con el bloqueo).** Daño recibido = (1 − reducción) × (1 − probabilidad de bloqueo × lo que para). La media de las otras especializaciones queda en ≈ 0,75 × 0,95 ≈ **0,71** (≈ 25 % de reducción media y ~5 % de daño bloqueado). Guardia Total: reducción media ≈ 58 % (65 % con la Piel, ≈ 51 % sin ella) y bloqueo ≈ 47 % × 84 % (80 %, y 90 % con 5 cargas) ≈ 40 %: 0,42 × 0,60 ≈ **0,25**, es decir, **×0,35 de la media y ≈ ×2,85 de vida efectiva**. La cifra anterior (×0,35) no contaba el bloqueo: con la Piel siempre puesta y el bloqueo total de Aguante de Roca, el Guardián llegaba a ≈ ×3,4, por encima del ×3 de §12. Montaña Viva y Cabeza de Puente quedan en ≈ ×2,4 (menos bloqueo y sin Pendón, con más escudos).

**Kit (libro; forja con Mejora a Nv+3 y variantes a Nv+6):**

| Habilidad | Ranura · Nv | Qué hace | Mejora | Variante I | Variante II |
|---|---|---|---|---|---|
| **Cambio de Guardia** | Insignia `3` · 10 | **Dos posturas que se alternan:** **Muralla** (−15 % de daño recibido y +10 % de bloqueo) y **Ariete** (+15 % de daño). Cambiar no gasta el tiempo global y se recarga en 3 s | Guardia Ligera: se recarga en 1,5 s | **Guardia Compartida** (apoyo): tus aliados a 6 m reciben la mitad de tu postura | **Guardia Opresiva** (control): la postura pesa sobre los enemigos a 5 m: Muralla les quita un 10 % de daño; Ariete los frena un 20 % |
| **Carga de Escudo** | Movilidad `1` · 12 | **Avance lento e imparable:** 8 m en 1 s con el escudo por delante; arrastras a los que encuentras y, al llegar, **te atacan a ti 3 s** (provocación). 10 s | Avance Largo: 10 m en el mismo tiempo | **Arrollador** (control): al llegar derribas 1 s (a los jefes, 20 de Quebranto) | **Carga Veloz** (movilidad): **rápida**, 12 m en 0,3 s, sin arrastrar ni provocar |
| **Terremoto** | Principal `DER/2` · 14 | **Te preparas 0,4 s** y golpeas el suelo: 220 % a 5 m. **Plantado** (1 s sin moverte), suelta 2 réplicas al 50 %. 30 de Furia | Suelo Partido: radio 5 → 6 m | **Martinete** (un objetivo): un punto a 3 m, radio 2,5 m, +60 % y 20 de Quebranto | **Falla** (área): el suelo se abre en línea 10 m; −20 % y ralentiza un 40 % 2 s |
| **Ciudadela** | Definitiva `4` · 15 | **Te clavas** 8 s y no te mueves: tú y tus aliados a 6 m reciben −40 %; los enemigos a 10 m te atacan a ti. 90 s | Muros Altos: dura 10 s | **Ciudadela Andante** (movilidad): puedes moverte al 50 %; la reducción baja a −25 % | **Empalizada** (área): quien te golpea recibe el 60 % de tu arma (una vez por segundo) |

Recomendadas (★): Tajo **II** (Siega, amenaza en área), Piel de Hierro **II** (Inamovible), Cambio de Guardia **I** (Guardia Compartida), Carga de Escudo **I** (Arrollador) y Ciudadela **II** (Empalizada). Barra: `IZQ` Tajo · `DER` Terremoto · `1` Carga de Escudo · `2` Piel de Hierro · `3` Cambio de Guardia · `4` Ciudadela.

**Verbos del kit:** posturas que se alternan (Cambio de Guardia) y plantado (Bastión, Terremoto, Ciudadela) son el verbo principal; avance lento e imparable (Carga de Escudo, que la forja puede volver rápido), provocación y preparación (Terremoto) son los secundarios.

**Barra de mecánica: Bastión** (la que ya existe en `spec-mechanics.js`, rehecha):

| Generar | Descargar | Pérdida | La alimentan |
|---|---|---|---|
| +1 carga por bloqueo y +1 cada 2 s **plantado** (sin moverte) en combate (máx. 5) | Cada carga: −4 % de daño recibido (5: −20 %). **Con 5, cambiar de postura las gasta:** a Muralla, escudo del 20 % de tu vida para ti y el aliado más herido; a Ariete, onda de 300 % a 5 m (a los jefes, 30 de Quebranto). **Tras descargar, 5 s sin llenarse** (corrección §19.1) | **Caminando** pierdes 1 carga cada 2 s (la Carga de Escudo no la gasta) | Cambio de Guardia, Terremoto (Echar Raíces), Ciudadela (Guarnición, no en la gratis); con talentos, Proa Blindada (d21), Cabeza de Puente (d27, cada 10 s) y el ápice |

Ritmo de descarga: con 5 enemigos provocados y ~40 % de bloqueo (≈ 2 bloqueos por segundo) el Bastión se llena en ~2,5 s, pero el bloqueo de 5 s tras descargar deja **una descarga cada ~7,5 s como máximo** (antes, cada ~3 s).

**Árbol (generado):**

| Fila | Id | Nodo | Forma · tipo | Etiqueta | Rangos | Requiere | Qué hace (al máximo) | Cuál conviene |
|---|---|---|---|---|---|---|---|---|
| 0 | d0 | Pie Firme | ○ clave | mecánica | gratis | gratis | Bloquear y quedarte plantado llenan tu Bastión (5 cargas): cada carga te quita un 4 % del daño que recibes |  |
| 1 | d1 | Escudo Alzado | ○ pasiva | número | 3 | d0 | Rango 3: Tus bloqueos paran un 80 % del golpe (antes 50 %) |  |
| 1 | d2 | Puño Telúrico | ○ pasiva | número | 3 | d0 | Rango 3: El Terremoto hace +30 % de daño |  |
| 1 | d3 | Paso Pesado | ○ pasiva | número | 3 | d0 | Rango 3: La Carga de Escudo se recarga en 7 s (antes 10 s) |  |
| 2 | d4 | Contragolpe | ○ pasiva | mecánica | 2 | d1 | Rango 2: Al bloquear, devuelves un golpe de escudo del 80 % (una vez por segundo) |  |
| 2 | d5 | Echar Raíces | ○ pasiva | mecánica | 1 | d1 o d2 | En Muralla, cada Terremoto te da 1 carga de Bastión (2 si golpea a 3 o más)<br>_híbrido: Guardia + Sismo_ |  |
| 2 | d6 | Pisotón | ○ pasiva | mecánica | 1 | d2 o d3 | Tras la Carga de Escudo, tu siguiente Terremoto no se prepara y cuenta como plantado (sin el bonus de Asalto Total)<br>_híbrido: Sismo + Vanguardia_ |  |
| 2 | d7 | Mirada Desafiante | ○ pasiva | número | 2 | d3 | Rango 2: Los que provoca la Carga de Escudo te atacan 5 s (antes 3 s) |  |
| 3 | d8 | Cambio: Barrido o Certero | ⬡ elección | mecánica | 1 | d4 o d5 | **A · ○ Barrido de Escudo**: Al cambiar de postura, golpeas con el escudo a todos a 4 m (120 %) y los provocas 2 s (una vez cada 3 s) _(contra grupos)_<br>**B · ○ Cambio Certero**: Al cambiar de postura, tu siguiente golpe es crítico seguro; contra un jefe Quebrantado, además hace +30 % _(contra jefes)_ | A, contra grupos: cada cambio es un golpe en área que además provoca. B, contra jefes: un crítico en cada cambio, más fuerte con el jefe Quebrantado. Decide qué Guardia juegas |
| 3 | d9 | Terremoto: Réplicas o Epicentro | ⬡ elección | mecánica | 1 | d5 o d6 | **A · ○ Réplicas**: Plantado, el Terremoto suelta 4 réplicas (antes 2) que se abren hasta 8 m _(contra grupos)_<br>**B · ○ Epicentro**: Plantado, el Terremoto hace +50 % en el centro (2 m) y a los jefes les llena 20 de Quebranto _(contra jefes)_ | A, contra grupos: las réplicas llegan a toda la sala. B, contra jefes: el golpe del centro les rompe la guardia antes. Decide qué Sismo juegas |
| 3 | d10 | Carga: Arrastre o Choque | ⬡ elección | mecánica | 1 | d6 o d7 | **A · ○ Gran Arrastre**: La Carga de Escudo arrastra a todos a 3 m de tu camino (antes 1,5 m) y los junta delante de ti _(contra grupos)_<br>**B · ○ Choque Frontal**: Si la Carga de Escudo choca con un élite o un jefe, te paras, haces +60 % y le llenas 25 de Quebranto _(contra jefes)_ | A, contra grupos: juntas a la manada para el Terremoto. B, contra jefes: la carga se vuelve un golpe que les rompe la guardia. Decide qué Vanguardia juegas |
| 4 | d11 | Corpulencia | ○ pasiva | número | 2 | d8 | Rango 2: +16 % de vida máxima |  |
| 4 | d12 | Tambor de Guerra | ○ pasiva | mecánica | 2 | d8 o d9 | Rango 2: Cada enemigo que golpea el Terremoto acorta 1 s la recarga de Piel de Hierro (hasta 2 s por Terremoto) |  |
| 4 | d13 | Escudo por Delante | ○ pasiva | mecánica | 2 | d9 o d10 | Rango 2: Al llegar con la Carga de Escudo, bloqueas seguro los 4 golpes siguientes (durante 4 s) |  |
| 4 | d14 | Guardia Rota | ○ pasiva | mecánica | 1 | d10 | Los que arrastra la Carga de Escudo quedan Vulnerables 3 s: reciben más daño de todo tu grupo |  |
| 5 | d15 | Última Línea o Roca | ⬡ elección | mecánica | 1 | d11 o d12 | **A · ○ Última Línea**: Un golpe que te mataría te deja con un 10 % de vida y lanza la Ciudadela 3 s, gratis. Una vez cada 2 min _(supervivencia)_<br>**B · ○ Aguante de Roca**: Con 5 cargas de Bastión, nada te derriba ni te aturde y tus bloqueos paran un 10 % más (hasta el 90 %) _(supervivencia)_ | A, contra golpes de jefe que matan (Pináculo, Hardcore): la Ciudadela te salva a ti y al grupo. B, contra grupos: mientras mantengas las 5 cargas, nada te tumba y cada bloqueo para hasta el 90 % |
| 5 | d16 | Fuerza del Bastión | ○ pasiva | mecánica | 2 | d12 o d13 | Rango 2: Cada carga de Bastión te da +4 % de daño (5 cargas: +20 %)<br>_híbrido: Los tres estilos (por el Bastión)_ |  |
| 5 | d17 | Avalancha | ○ pasiva | mecánica | 2 | d13 o d14 | Rango 2: Cada enemigo que arrastra la Carga de Escudo le quita 1 s a su recarga (hasta 2 s); nunca baja de 4 s |  |
| 6 | d18 | Vínculo de Escudo | ○ pasiva | mecánica | 2 | d15 | Rango 2: En Muralla, recibes tú el 20 % del daño que sufren tus aliados a 8 m |  |
| 6 | d19 | Tierra Viva | ○ pasiva | mecánica | 2 | d15 o d16 | Rango 2: Plantado, cada 3 s sueltas una réplica gratis a 5 m (60 %) |  |
| 6 | d20 | Guarnición | ○ pasiva | mecánica | 2 | d16 o d17 | Rango 2: Dentro de tu Ciudadela, tus aliados hacen +10 % de daño y ganas 1 carga de Bastión por segundo (no en la gratis) |  |
| 6 | d21 | Proa Blindada | ○ pasiva | mecánica | 1 | d17 | Durante la Carga de Escudo bloqueas todo lo que viene de frente; cada bloqueo te da 1 carga de Bastión |  |
| 7 | d22 | Guardia Viva | ○ pasiva | mecánica | 3 | d18 | Rango 3: Cada cambio de postura te da +9 % de daño 8 s (se suma hasta 3 veces) y te cura un 3 % de la vida |  |
| 7 | d23 | Réplica Honda | ○ pasiva | mecánica | 3 | d19 | Rango 3: Las réplicas del Terremoto hacen +30 % (el doble contra jefes Quebrantados) |  |
| 7 | d24 | Escolta | ○ pasiva | mecánica | 3 | d21 | Rango 3: Al llegar con la Carga de Escudo, das un escudo del 12 % de tu vida a ti y a tus aliados a 6 m (una vez cada 10 s) |  |
| 8 | d25 | Guardia Total | ○ **FINAL** | mecánica | 3 | d22 | Rango 3: Tras 3 cambios de postura en 8 s, tienes Muralla y Ariete a la vez 6 s; vuelve a los 15 s. Posturas +30 %<br>_final: Guardia_ |  |
| 8 | d26 | Montaña Viva | ○ **FINAL** | mecánica | 3 | d23 | Rango 3: Plantado, cada 3.er Terremoto se repite gratis al 100 % y sus réplicas aturden 0,5 s (los jefes no). Terremoto +30 %<br>_final: Sismo_ |  |
| 8 | d27 | Cabeza de Puente | ○ **FINAL** | mecánica | 3 | d24 | Rango 3: Al acabar la Carga te plantas: +5 cargas de Bastión (cada 10 s) y los enemigos a 8 m te atacan 4 s. Carga +30 %<br>_final: Vanguardia_ |  |
| 9 | d28 | Inexpugnable | ○ **ÁPICE** | mecánica | 4 | d25 o d26 o d27 | 1) Matar a un élite te llena el Bastión. 2) El Bastión guarda 7 cargas (antes 5). 3) Descargar el Bastión acorta 6 s la recarga de Piel de Hierro. 4) Cada 3 descargas, la Ciudadela se lanza sola 4 s, gratis (como mucho una vez cada 45 s). |  |

**Etiquetas:** filas 3–9, 20 de 21 «mecánica» (95 %; Escudo por Delante pasó a «mecánica» al dar bloqueos seguros).

| Arquetipo | Fantasía | Verbo | Elección que lo define | Penúltimo → final | Mejor en |
|---|---|---|---|---|---|
| **Guardia** | El maestro de la guardia: cada cambio de postura es un arma | Posturas que se alternan | d8 **Barrido de Escudo** (grupos: golpea y provoca) o Cambio Certero (jefes: crítico, más fuerte con el jefe Quebrantado) | Guardia Viva → **Guardia Total** (las dos posturas a la vez 3/4,5/6 s; vuelve a los 15 s) | Aguante y grupos |
| **Sismo** | Plantado, el suelo tiembla a tu alrededor | Plantado + preparación | d9 Réplicas (grupos) o **Epicentro** (jefes) | Réplica Honda → **Montaña Viva** (repite al 50/75/100 %) | Jefes (Quebranto y daño al Quebrantado) |
| **Vanguardia** | La punta de lanza: avanzas despacio, arrastras a la manada y te plantas | Avance lento e imparable + provocación | d10 **Gran Arrastre** (grupos) o Choque Frontal (jefes) | Escolta → **Cabeza de Puente** (+2/3/5 cargas cada 10 s) | Grupos, control y amenaza |

Nodos que mezclan arquetipos: **Echar Raíces** (Guardia + Sismo: en Muralla, el Terremoto da Bastión), **Pisotón** (Sismo + Vanguardia: tras la Carga, el Terremoto sale sin preparación y cuenta como plantado, sin sumar el bonus de Asalto Total), **Fuerza del Bastión** (los tres, por el Bastión) y **Guarnición** (común: la Ciudadela). El ápice **Inexpugnable** (4 rangos) sirve a los tres; su rango 3 acorta 6 s la Piel de Hierro (antes la recargaba al instante; desde el rejuicio, solo mientras se recarga, que empieza al acabar) y el 4 lanza la Ciudadela gratis como mucho una vez cada 45 s.

**Implementación (por nodo):** `d0` mecánica bastion rehecha (plantedEvery 2, moveLossEvery 2, drPerCharge 4, descarga al cambiar de postura) · NUEVO; m_aegis sale; `d1` stats.blockPower · NUEVO (combat-math: BLOCK_REDUCTION + blockPower/100; antes +15 % de bloqueo, que chocaba con CAPS.block); `d2` mod terremoto dmg · existe; `d3` mod g_carga_escudo cdr · existe; `d4` power g_d_contragolpe · NUEVO (④ onDamaged blocked, icd 1); `d5` power g_d_raices · NUEVO (afterCast + gainGauge); `d6` power g_d_pisoton · NUEVO (afterCast → windup 0 + planted; si ese Terremoto lleva Asalto Total, sale gratis pero sin su +%); `d7` mod g_carga_escudo tauntDur · claves (g.forceTarget); `d8` A: power g_d_barrido · NUEVO (afterCast g_guardia + dealArea + forceTarget; icd 3) · B: power g_d_cambio_certero · NUEVO (afterCast g_guardia → forceCrit; condAdd 30 contra Quebrantados; ya no llena Quebranto); `d9` A: mod terremoto aftershocks +2 · claves · B: power g_d_epicentro · NUEVO (condAdd + addStagger); `d10` A: mod g_carga_escudo dragWidth 3 · claves · B: power g_d_choque · NUEVO (onHit élite → stop + addStagger); `d11` stats.hpPct · existe; `d12` power g_d_tambor · NUEVO (onHit → cdReduce g_piel; tope r s por lanzamiento, antes 3 s; solo mientras la Piel se recarga, que empieza al acabar); `d13` power g_d_escudo_delante · NUEVO (afterCast: bloqueos seguros, fuera de CAPS.block; antes −20 % que el tope de reducción anulaba); `d14` power g_d_guardia_rota · NUEVO (vuln 3 s); `d15` A: power g_d_ultima_linea · NUEVO (onLethal + lanza g_u_ciudadela 3 s) · B: power g_d_roca · NUEVO (inmune a control + blockPower +10 con gaugeValue 5; blockPower con tope 90: un bloqueo nunca para todo el golpe; antes «todo el golpe»); `d16` power g_d_fuerza_bastion · NUEVO (stats con gaugeValue); `d17` power g_d_avalancha · NUEVO (afterCast cdReduce, tope r s; suelo de 4 s tras todas las reducciones y reinicios, también los de otros poderes: un resetCd o la media recarga de Asalto Total respetan el suelo); `d18` power g_d_vinculo · NUEVO (⑫ onAllyDamaged + g.damageAlly; lógica de g_vinculo); `d19` power g_d_tierra_viva · NUEVO (onTick si p.planted); `d20` power g_d_guarnicion · NUEVO (aura del buff g_u_ciudadela; sin cargas en la Ciudadela gratis de Inexpugnable 4 y Última Línea; respeta el bloqueo de 5 s tras descargar); `d21` power g_d_proa · NUEVO (bloqueo frontal durante el avance); `d22` power g_d_guardia_viva · NUEVO (afterCast g_guardia + addBuff con pilas + cura por p.sustain(); antes −2/4/6 % de daño recibido, que el tope de reducción anulaba); `d23` power g_d_replica_honda · NUEVO (condAdd; ×2 contra Quebrantados; ya no llena Quebranto); `d24` power g_d_escolta · NUEVO (g.shield sobre g.allies(); icd 10); `d25` power g_d_guardia_total · NUEVO (cuenta cambios; stanceBoth 3/4,5/6 s; icd 15 desde que se activa; los cambios hechos durante Guardia Total no cuentan); `d26` power g_d_montana_viva · NUEVO (contador + eco ×0,5/0,75/1 + applyCC stun; el eco es echo:true: no cuenta para el contador ni gasta el Golpe de Titán); `d27` power g_d_cabeza_puente · NUEVO (afterCast gainGauge 2/3/5 con icd 10 + forceTarget); `d28` power g_d_inexpugnable (rangos) · NUEVO (rango 3: cdReduce g_piel 6, solo mientras se recarga; rango 4: icd 45 y Ciudadela gratis aparte del suelo de las definitivas).

### 7.3 Cruzado (apoyo con martillo sagrado · Fervor)

**Fantasía:** el martillo de la fe. Cargas el golpe, lo sueltas en el destello justo, marcas a los culpables y dejas tierra santa donde pisa tu grupo.
**Pasiva («Martillo Piadoso»):** el **10 % del daño sagrado** que haces cura al aliado con menos vida a 15 m (si vas solo, a ti), **hasta un 1 % de su vida por segundo**. No es un sanador puro: **cura golpeando**. Ese tope es de la corrección (§19.3): `g.heal` no pasa por `p.sustain()`, así que cada cura del Cruzado lleva su propio límite en el texto. **Rejuicio (§20):** además, las curas de zona (el sendero y Tierra Santa) comparten una **cubeta propia de 4 %/s por receptor**, y la cura del sendero no se suma entre senderos. **Ronda 3 (§21):** el **daño** de las zonas sagradas (sendero, suelos de Golpe Consagrado y el suelo del Cataclismo) tampoco se suma: cada enemigo recibe solo el de la más fuerte; Golpe Consagrado deja como mucho 2 suelos y los altares no se suman.
**Rol:** apoyo con martillo (la etiqueta «Apoyo» de `talents-v2-comun.js` se mantiene; §17.2). Curas y escudos al aliado con menos vida (`target:'lowest'` sobre `g.allies()`): pasiva, Veredicto, Refugio, Absolución, Escolta de Luz, Milagro. Su daño es el segundo de la clase.

**Kit (libro; forja con Mejora a Nv+3 y variantes a Nv+6):**

| Habilidad | Ranura · Nv | Qué hace | Mejora | Variante I | Variante II |
|---|---|---|---|---|---|
| **Juicio** | Insignia `3` · 10 | **Te preparas 0,3 s** y lanzas un martillo de luz a 12 m (120 % a 3 m) que **marca** 8 s. **Tu siguiente principal detona la marca**: +100 % a ese enemigo. 20 de Furia, 8 s | Juicio Amplio: radio 3 → 4 m | **Sentencia** (un objetivo): marca a uno solo 12 s: recibe un 15 % más de daño de todo el grupo | **Tres Juicios** (área): 3 martillos en abanico al 60 %; cada uno marca |
| **Sendero de Luz** | Movilidad `1` · 12 | **Destello rápido** de 8 m; dejas un sendero sagrado 4 s que daña un 30 % y cura un 2 % por segundo a tus aliados (**no se suma**: ni su daño ni su cura, §21). 10 s; con talentos, **nunca baja de 4 s** | Huella de Luz: el sendero dura 6 s | **Escolta de Luz** (apoyo): si atraviesas a un aliado, le das un escudo del 12 % de tu vida (**una vez cada 6 s por aliado**) | **Destello Doble** (movilidad): 2 cargas; el sendero dura 2 s |
| **Martillo de Guerra** | Principal `DER/2` · 14 | **Mantén para cargar** (hasta 1,2 s; caminas al 50 %) **y suelta**: 140 → 380 % a 3–5 m. **Soltar en la ventana perfecta** (0,9–1,15 s: 0,25 s que acaban antes de la suelta automática, con destello y «clang»): +25 % y 1 de Fervor. La esquiva cancela la carga sin coste. 25 de Furia | Mano Ágil: carga completa en 0,9 s (la ventana se adelanta igual) | **Martillo Arrojado** (un objetivo): al soltar, lo lanzas a 12 m: +40 % y sin área; vuelve a tu mano | **Onda Sagrada** (área): al soltar, el golpe sigue en una onda de 8 m (60 %) |
| **Cataclismo** | Definitiva `4` · 15 | **Mantén hasta 2 s y suelta**: la luz cae en la mira (500 → 1200 % a 6 m) y consagra el suelo 6 s. Ventana perfecta: +3 de Fervor. 60 s | Columna Ancha: radio 6 → 7,5 m | **Rayo del Cielo** (un objetivo): un rayo de 2 m, +80 % y 40 de Quebranto | **Amanecer** (apoyo): −40 % de daño, pero curas un 30 % a tus aliados a 8 m y les das un escudo del 10 % |

Recomendadas (★): Juicio **II** (Tres Juicios), Sendero de Luz **I** (Escolta de Luz), Martillo de Guerra **II** (Onda Sagrada) y Cataclismo **I** (Rayo del Cielo). Barra: `IZQ` Tajo · `DER` Martillo de Guerra · `1` Sendero de Luz · `2` Piel de Hierro · `3` Juicio · `4` Cataclismo.

**Verbos del kit:** cargar y soltar con ventana perfecta (Martillo y Cataclismo) es el verbo principal; marcas que se detonan (Juicio, con preparación), zonas sagradas y movimiento rápido (Sendero) son los secundarios.

**Barra de mecánica: Fervor** (la que ya existe en `spec-mechanics.js`, rehecha):

| Generar | Descargar | Pérdida | La alimentan |
|---|---|---|---|
| +1 al soltar en la ventana perfecta **o** al detonar marcas de Juicio: **como mucho 1 por lanzamiento** (Cataclismo perfecto: +3) y +1 cada 3 Tajos (para que nunca falte contra un jefe) | **A 3: Veredicto.** Tu siguiente Martillo de Guerra sale cargado al instante: +50 % y cura al aliado más herido un 6 %. **El Veredicto no cuenta como suelta perfecta ni da Fervor** | No se pierde con el tiempo; fuera de combate, −1 cada 10 s | Martillo de Guerra, Juicio, Cataclismo y Tajo; con talentos, Sello del Martillo (z5), Edicto (z22), Tribunal (z25) y el ápice (las marcas aseguran el Fervor aunque falles la ventana) |

Ritmo del Veredicto (corrección §19.1): tres Martillos que dan Fervor y el cuarto es el Veredicto, **uno cada ~4,5 s** en cualquier build; antes, con +1 por cada detonación, contra 5 marcados cada Martillo era un Veredicto.

**Árbol (generado):**

| Fila | Id | Nodo | Forma · tipo | Etiqueta | Rangos | Requiere | Qué hace (al máximo) | Cuál conviene |
|---|---|---|---|---|---|---|---|---|
| 0 | z0 | Voto Sagrado | ○ clave | mecánica | gratis | gratis | Una suelta perfecta o detonar marcas te da 1 de Fervor por lanzamiento. A 3, tu siguiente Martillo es un Veredicto |  |
| 1 | z1 | Peso de la Ley | ○ pasiva | número | 3 | z0 | Rango 3: Detonar una marca de Juicio hace +45 % de daño |  |
| 1 | z2 | Devoción | ○ pasiva | número | 3 | z0 | Rango 3: El Martillo de Guerra hace +30 % de daño |  |
| 1 | z3 | Ligereza | ○ pasiva | número | 3 | z0 | Rango 3: El Sendero de Luz se recarga en 7 s (antes 10 s) |  |
| 2 | z4 | Marca Indeleble | ○ pasiva | número | 2 | z1 | Rango 2: Las marcas de Juicio duran 16 s (antes 8 s) |  |
| 2 | z5 | Sello del Martillo | ○ pasiva | mecánica | 1 | z1 o z2 | Soltar el Martillo de Guerra en la ventana perfecta marca con Juicio a todos los que golpea<br>_híbrido: Sentencia + Veredicto_ |  |
| 2 | z6 | Golpe Consagrado | ○ pasiva | mecánica | 1 | z2 o z3 | Soltar en la ventana perfecta consagra 4 s el suelo donde cae el Martillo (40 % por segundo; 2 a la vez, no se suman)<br>_híbrido: Veredicto + Santuario_ |  |
| 2 | z7 | Sendero Bendito | ○ pasiva | mecánica | 2 | z3 | Rango 2: En tu sendero, tus aliados se curan un 3 % por segundo (antes 2 %; no se suma) y van un 20 % más rápido |  |
| 3 | z8 | Juicio: Estallido o Condena | ⬡ elección | mecánica | 1 | z4 o z5 | **A · ○ Estallido de Luz**: Detonar una marca hace estallar el 50 % del golpe a todos a 3 m (cada enemigo, un estallido por lanzamiento) _(contra grupos)_<br>**B · ○ Condena**: Las marcas en élites y jefes duran el doble y, al detonarlas, les llenas 15 de Quebranto _(contra jefes)_ | A, contra grupos: cada detonación alcanza a la manada. B, contra jefes: la marca aguanta y cada detonación les rompe la guardia. Decide qué Sentencia juegas |
| 3 | z9 | Veredicto: Generoso o Pesado | ⬡ elección | mecánica | 1 | z5 o z6 | **A · ○ Veredicto Generoso**: El Veredicto golpea a 8 m (antes 5 m) y además cura un 3 % a tus otros aliados a 8 m _(contra grupos)_<br>**B · ○ Veredicto Pesado**: El Veredicto hace +80 % al objetivo principal y a los jefes les llena 25 de Quebranto _(contra jefes)_ | A, contra grupos y en grupo: el golpe y la cura llegan a todos. B, contra jefes: el Veredicto es tu golpe más grande. Decide qué Veredicto juegas |
| 3 | z10 | Sendero: Ardiente o Refugio | ⬡ elección | mecánica | 1 | z6 o z7 | **A · ○ Senda Ardiente**: El sendero hace el 60 % por segundo (antes 30 %; no se suma) y ralentiza un 30 % a quien lo pisa _(contra grupos)_<br>**B · ○ Refugio**: El aliado con menos vida en tu sendero gana un escudo del 10 % de tu vida (una vez cada 6 s) _(supervivencia)_ | A, contra grupos: el sendero quema y frena a la manada. B, en grupo o contra jefes que pegan fuerte: proteges al más herido. Decide qué Santuario juegas |
| 4 | z11 | Juicio Presto | ○ pasiva | número | 2 | z8 | Rango 2: Juicio se recarga en 6 s (antes 8 s) |  |
| 4 | z12 | Liturgia | ○ pasiva | mecánica | 2 | z8 o z9 | Rango 2: Cada suelta perfecta acorta 1 s tus recargas, salvo la definitiva y Piel de Hierro (como mucho cada 2 s) |  |
| 4 | z13 | Tierra Bendita | ○ pasiva | número | 2 | z9 o z10 | Rango 2: Tus zonas sagradas son un 30 % más grandes y duran 2 s más |  |
| 4 | z14 | Altar de Campaña | ○ pasiva | mecánica | 1 | z10 | Al llegar con el Sendero de Luz, levantas un altar 6 s: tus aliados a 4 m hacen +10 % de daño (no se suma) |  |
| 5 | z15 | Milagro o Luz Protectora | ⬡ elección | mecánica | 1 | z11 o z12 | **A · ○ Milagro**: Un golpe que mataría a un aliado o a ti lo deja con un 20 % de vida. Una vez cada 2 min _(supervivencia)_<br>**B · ○ Luz Protectora**: Cada Veredicto te da un escudo del 10 % de tu vida durante 6 s _(supervivencia)_ | A, en grupo y donde morir cuesta caro: salvas a quien iba a caer. B, en solitario: aguante constante con cada Veredicto |
| 5 | z16 | Ardor | ○ pasiva | mecánica | 2 | z12 o z13 | Rango 2: Tus golpes sagrados hacen +8 % por cada punto de Fervor (3 de Fervor: +24 %)<br>_híbrido: Los tres estilos (por el Fervor)_ |  |
| 5 | z17 | Velo Sagrado | ○ pasiva | mecánica | 2 | z13 o z14 | Rango 2: Tú y tus aliados dentro de tus zonas sagradas reciben un 10 % menos de daño |  |
| 6 | z18 | Absolución | ○ pasiva | mecánica | 2 | z15 | Rango 2: Cada detonación de Juicio cura al aliado con menos vida un 2 % de su vida (una vez cada 2 s) |  |
| 6 | z19 | Fe Serena | ○ pasiva | mecánica | 2 | z15 o z16 | Rango 2: La ventana perfecta dura 0,45 s (antes 0,25 s) |  |
| 6 | z20 | Gracia del Cielo | ○ pasiva | mecánica | 2 | z16 o z17 | Rango 2: Cada Veredicto acorta 4 s la recarga del Cataclismo (nunca baja de 42 s) |  |
| 6 | z21 | Vigilia | ○ pasiva | mecánica | 1 | z17 | Mientras estás en tu zona sagrada, el Sendero de Luz se recarga el doble de rápido (nunca baja de 4 s) |  |
| 7 | z22 | Edicto | ○ pasiva | mecánica | 3 | z18 | Rango 3: Al detonar una marca, marcas a 3 enemigos a 5 m |  |
| 7 | z23 | Racha de Fe | ○ pasiva | mecánica | 3 | z19 | Rango 3: Cada suelta perfecta seguida suma +12 % al Martillo (hasta 5 veces); fallar la ventana lo reinicia |  |
| 7 | z24 | Peregrino | ○ pasiva | mecánica | 3 | z21 | Rango 3: Mientras estás en tu zona sagrada, haces +12 % de daño y recibes un 9 % menos |  |
| 8 | z25 | Tribunal | ○ **FINAL** | mecánica | 3 | z22 | Rango 3: Detonar una marca no la gasta: se detona 3 veces (la 2.ª y la 3.ª al 80 %) y la última salta a 2 enemigos<br>_final: Sentencia_ |  |
| 8 | z26 | Martillo Celestial | ○ **FINAL** | mecánica | 3 | z23 | Rango 3: Cada suelta perfecta llama un martillo del cielo sobre el objetivo: repite el 60 % del golpe. Martillo +30 %<br>_final: Veredicto_ |  |
| 8 | z27 | Tierra Santa | ○ **FINAL** | mecánica | 3 | z24 | Rango 3: Tus zonas sagradas, que no se suman, duran mientras estés dentro (hasta 20 s) y curan al más herido un 1 % por segundo<br>_final: Santuario_ |  |
| 9 | z28 | Aureola | ○ **ÁPICE** | mecánica | 4 | z25 o z26 o z27 | 1) Matar a un élite te llena el Fervor. 2) El Veredicto cura al aliado más herido un 10 % (antes 6 %). 3) La ventana perfecta empieza 0,15 s antes. 4) Cada 8 Veredictos, cae sobre tu objetivo un Cataclismo al 50 %, gratis (como mucho uno cada 30 s). |  |

**Etiquetas:** filas 3–9, 19 de 21 «mecánica» (90 %).

| Arquetipo | Fantasía | Verbo | Elección que lo define | Penúltimo → final | Mejor en |
|---|---|---|---|---|---|
| **Sentencia** | Marcas a los culpables y cada golpe los juzga | Marcas que se detonan | z8 **Estallido de Luz** (grupos) o Condena (jefes) | Edicto → **Tribunal** (una marca se detona 2/2/3 veces; repeticiones al 40/60/80 %) | Grupos |
| **Veredicto** | El golpe perfecto: cargas, sueltas en el destello y el cielo responde | Cargar y soltar con ventana perfecta | z9 Veredicto Generoso (grupos) o **Veredicto Pesado** (jefes) | Racha de Fe → **Martillo Celestial** (eco al 30/45/60 %) | Jefes |
| **Santuario** | Tierra santa bajo los pies de tu grupo | Zonas sagradas + movimiento rápido | z10 Senda Ardiente (grupos) o **Refugio** (proteger) | Peregrino → **Tierra Santa** (zonas hasta 8/14/20 s) | Apoyo y peleas largas |

Nodos que mezclan arquetipos: **Sello del Martillo** (Sentencia + Veredicto: soltar perfecto marca), **Golpe Consagrado** (Veredicto + Santuario: soltar perfecto consagra el suelo), **Ardor** (los tres, por el Fervor) y **Gracia del Cielo** (común: la definitiva, ahora 2/4 s por Veredicto). El ápice **Aureola** (4 rangos) sirve a los tres; su rango 4 deja caer un Cataclismo al 50 % cada 8 Veredictos, como mucho uno cada 30 s. Liturgia ya no acorta la definitiva; en el rejuicio (§20), tampoco Piel de Hierro, y actúa como mucho una vez cada 2 s (≤ 0,5 s por segundo, antes ~0,9). Gracia del Cielo respeta el suelo de las definitivas: el Cataclismo no baja de 42 s.

**Implementación (por nodo):** `z0` mecánica fervor rehecha (perPerfect, perDetonate, perCastMax 1, Veredicto sin Fervor ni suelta perfecta) · NUEVO; `z1` mod g_juicio detonatePct · claves; `z2` mod g_martillo dmg · existe; `z3` mod g_sendero cdr · existe; `z4` mod g_juicio markDur · claves; `z5` power g_z_sello_martillo · NUEVO (onCast perfect → marca); `z6` power g_z_golpe_consagrado · NUEVO (campo z_suelo; como mucho 2 a la vez: el 3.º quita el más viejo, también con Tierra Santa; el daño de las zonas sagradas no se suma: cada enemigo recibe solo el de la más fuerte; antes, con Tierra Santa, 5–10 suelos de 40 %/s sumados); `z7` mod g_sendero zoneHeal + power g_z_sendero_veloz · NUEVO (la cura no se suma entre senderos: como mucho 3 %/s por aliado; entra en la cubeta de zona del Cruzado, 4 %/s por receptor); `z8` A: power g_z_estallido_luz · NUEVO (dealArea; cada enemigo recibe como mucho un estallido por lanzamiento, el de la marca más fuerte: crece con N y no con N²; antes, N marcas × N enemigos) · B: power g_z_condena · NUEVO (markDur ×2 + addStagger); `z9` A: power g_z_veredicto_generoso · NUEVO (radio 8; g.heal 3 % al resto del grupo a 8 m; el más herido sigue con el 6/10 %) · B: power g_z_veredicto_pesado · NUEVO (condAdd + addStagger); `z10` A: mod g_sendero zoneCoef + slow · claves (el daño del sendero no se suma entre senderos ni con otras zonas sagradas: vale la más fuerte) · B: power g_z_refugio · NUEVO (g.shield, target lowest); `z11` mod g_juicio cdr · existe; `z12` tv.perfectCdrAll · NUEVO (como critCdrAll, sin @ultimate ni g_piel; icd 2: ≤ 0,5 s/s, antes ~0,9 s/s); `z13` mod @holyZone radius + zoneDur · claves; `z14` power g_z_altar · NUEVO (campo con aura; los altares no se suman: +10 % como mucho aunque haya 2 puestos); `z15` A: power g_z_milagro · NUEVO (onLethal + ⑫ onAllyLethal) · B: power g_z_luz_protectora · NUEVO (g.shield); `z16` power g_z_ardor · NUEVO (stats con gaugeValue); `z17` power g_z_velo · NUEVO (condDr en zona); `z18` power g_z_absolucion · NUEVO (g.heal, target lowest; icd 2); `z19` mod @charge perfectWin +0,1 s por rango (base 0,25 s: 0,35/0,45 s) · clave NUEVA; `z20` power g_z_gracia · NUEVO (cdReduce; antes 3/6 s; respeta el suelo de las definitivas: 70 % de su base, 42 s); `z21` power g_z_vigilia · NUEVO (cdRate ×2 en zona; suelo de 4 s del Sendero, con o sin Vigilia, tras todas las reducciones y reinicios: Ligereza, c3, Disciplina, Ritmo de Combate y la media recarga de Asalto Total; como el de la Carga, d17; antes ~2,2–2,6 s); `z22` power g_z_edicto · NUEVO (marca a vecinos); `z23` power g_z_racha · NUEVO (pilas; se reinicia al fallar la ventana); `z24` power g_z_peregrino · NUEVO (condAdd + condDr en zona); `z25` power g_z_tribunal · NUEVO (markUses 2/2/3; repeticiones ×0,4/0,6/0,8; las repeticiones no dan Fervor: el tope es 1 por lanzamiento); `z26` power g_z_martillo_celestial · NUEVO (eco del golpe ×0,3/0,45/0,6; echo:true); `z27` power g_z_tierra_santa · NUEVO (campos con stopIf y tope 8/14/20 s; las zonas sagradas no se suman: cada enemigo recibe solo el daño de la más fuerte y la cura de 1 %/s tampoco se suma; Golpe Consagrado, 2 suelos como mucho; cubeta de zona del Cruzado: sendero + Tierra Santa ≤ 4 %/s por receptor); `z28` power g_z_aureola (rangos) · NUEVO (rango 4: eco de g_u_cataclismo a carga completa ×0,5, icd 30; no da Fervor).

### 7.4 Las tres especializaciones, juntas

| | Berserker | Guardián | Cruzado |
|---|---|---|---|
| Rol | Daño cuerpo a cuerpo | Tanque | Apoyo con martillo (cura golpeando) |
| Mecánica | Sed (0–100) | Bastión (0–5 cargas) | Fervor (0–3) |
| Verbo principal | Encadenar en marcha | Plantado y posturas | Cargar y soltar |
| Pasiva | Al borde: +25 % con menos del 40 % de vida | Escudo del Guardián: Piel de Hierro 12 s y −50 %; topes propios de reducción 65 % y de bloqueo 50 % (los globales no cambian) | Martillo Piadoso: el 10 % del daño sagrado cura al más herido (hasta 1 % por segundo) |
| Arquetipos (A · B · C) | Hemorragia · Verdugo · Estampida | Guardia · Sismo · Vanguardia | Sentencia · Veredicto · Santuario |
| Finales | Danza Carmesí · Golpe de Gracia · Estampida Sin Fin | Guardia Total · Montaña Viva · Cabeza de Puente | Tribunal · Martillo Celestial · Tierra Santa |
| Ápice | Corazón Indomable | Inexpugnable | Aureola |
| Árboles héroe | Titán · Gladiador | Titán · Caudillo | Gladiador · Caudillo |
| Híbrida | Sangre y Acero | Roca y Escudo | Luz y Martillo |

---

## 8. Builds a Nv100 (12: 4 por especialización, una híbrida en cada una)

Validadas comprando **punto a punto en el orden de la build** (cada punto al primer nodo de la lista que se pueda comprar), como haría el jugador al subir. Están en el mockup (**Configuración** y **Recomendado**). Las listas se generan de los datos. Las cifras de «mejor en» son **estimaciones de diseño**; se calibran en E3.

### 8.1 Berserker

*«Estampida Sin Fin» (Estampida) · Paragon Titán*
- **Clase (34/34):** Fuerza Bruta 2 · Avance Implacable 2 · Sin Cuartel (B) 1 · Marcha Imparable 1 · Derribo (A) 1 · Polvareda (A) 1 · Ira Contenida (B) 1 · Desequilibrio 1 · Brazo Veloz 2 · Constitución 2 · Tajo Voraz (B) 1 · Sin Pausa (B) 1 · Furia Creciente 2 · Golpes Precisos 2 · Filo Dentado (A) 1 · Persecución 1 · Ritmo de Combate 2 · Rugido de Carga 3 · Asalto Total 3 · Determinación 2 · Curtido 2
- **Berserker (31/31):** Sed de Batalla (gratis) · Zancada 3 · Suelo Roto 2 · Caída Brutal 1 · Salto en Cadena (A) 1 · Peso Muerto 2 · Impacto Aturdidor 1 · Sin Suelo 2 · Caída Sangrienta 1 · Ímpetu 3 · Estampida Sin Fin 3 · Corazón Indomable 4 · Instinto Asesino 3 · Onda de Choque (A) 1 · Sangre Hirviente 2 · Alcance Salvaje 2
- **Paragon:** Titán: Golpe de Titán (gratis) · Sacudida Amplia (A) · Aplomo · Eco Pétreo · Ira Acumulada · Temblor · Derrumbe (A) · Peso Acumulado · Coloso Despierto · Bramido de Titán (A) · Talla de Gigante

**Rotación.** Salto Devastador sobre la manada: la caída ralentiza (Suelo Roto) y aturde (Impacto Aturdidor). **Caída Brutal**: el siguiente Rajar empieza por el 3.er golpe, que suelta la **Onda de Choque**. Vuelves a saltar (hasta 5 con Salto en Cadena) y cada salto suma **Ímpetu**. El último salto **desangra** a todos (Caída Sangrienta). Si golpeó a 3 o más, **Estampida Sin Fin** recarga el Salto al instante, como mucho 2 veces seguidas (unas 3 cadenas, ~15 saltos; luego, la recarga normal). Impacto Aturdidor aturde a cada enemigo como mucho una vez cada 4 s. Clase: **Asalto Total** hace gratis y +45 % la principal que sigue al salto y, si mata, el Salto recupera media recarga (como mucho cada 6 s; cuenta como una de las 2 seguidas de Estampida Sin Fin); Polvareda y Rugido de Carga controlan al llegar del primer salto de cada cadena (§21; Suelo Roto ya ralentiza en cada caída). Titán: el **Golpe de Titán** (+40 %) llega cada 50 de Furia (Ira Acumulada) con la sacudida a 7 m (Sacudida Amplia); **Bramido de Titán** ocupa la ranura `2` (sale la Piel de Hierro: es la build de control). Furia Inmortal + **Sin Suelo**: 10 s saltando sin recarga.
**Dónde brilla:** grupos y control. Contra jefes rinde menos: el Salto en Cadena necesita blancos nuevos.

*«Sangre y Acero» (híbrida Hemorragia + Verdugo, sin final) · Paragon Gladiador*
- **Clase (34/34):** Constitución 2 · Fuerza Bruta 2 · Tajo Firme (A) 1 · Ensañamiento (A) 1 · Golpe Pesado (A) 1 · Furia Creciente 2 · Golpes Precisos 2 · Filo Dentado (A) 1 · Temple 1 · Ritmo de Combate 2 · Silenciar (B) 1 · Ira Contenida (B) 1 · Desequilibrio 1 · Curtido 3 · Determinación 2 · Furia Desbordante (B) 1 · Avance Implacable 2 · Desenfreno 3 · Señor de la Guerra 3 · Brazo Veloz 2
- **Berserker (31/31):** Sed de Batalla (gratis) · Heridas Abiertas 3 · Instinto Asesino 3 · Sangre Espesa 2 · Reabrir 1 · Contagio (A) 1 · Remate Certero (B) 1 · Festín de Sangre 2 · Ritmo de Matanza 2 · Umbral del Dolor (B) 1 · Sangre Hirviente 2 · Avidez 2 · Último Trago 2 · Estallido Rojo 3 · Verdugo 3 · Zancada 1 · Alcance Salvaje 2
- **Paragon:** Gladiador: Rival (gratis) · Duelo a Muerte (B) · Ovación · Tiro de Arena · Gloria · Pulgar Abajo (B) · Contraataque (B) · Sangre en la Arena · Campeón · Triunfo · Vítores

**Rotación.** Remolino Sangriento entre la manada: todo sangra (6 s) y te da Furia (Avidez). **Sueltas** el Remolino en el centro: **Estallido Rojo**. Sobre el élite, **Rajar**: **Reabrir** reinicia los Sangrados; el 3.er golpe, con **Golpe Pesado**, es crítico seguro (**Remate Certero**) y hace más cuanta menos vida le queda (**Verdugo**). **Señor de la Guerra** duplica un Rajar cada 100 de Furia. Gladiador: el élite es tu Rival (**Duelo a Muerte**, +30 %; **Pulgar Abajo** por debajo del 30 %) y **Contraataque** premia la esquiva.
**Dónde brilla:** contenido mixto (élites con manada).

*«Danza Carmesí» (Hemorragia) · Paragon Gladiador*
- **Clase (34/34):** Constitución 2 · Curtido 3 · Tajo Voraz (B) 1 · Determinación 2 · Coraza de Hierro (B) 1 · Furia Protectora (A) 1 · Temple 1 · Hermandad de Armas (B) 1 · Fuerza Bruta 2 · Furia Creciente 2 · Sin Pausa (B) 1 · Filo Dentado (A) 1 · Hierro Vivo 2 · Golpes Precisos 2 · Sin Cuartel (B) 1 · Derribo (A) 1 · Rencor 3 · Inquebrantable 3 · Avance Implacable 2 · Marcha Imparable 1 · Carga Reparadora (B) 1
- **Berserker (31/31):** Sed de Batalla (gratis) · Heridas Abiertas 3 · Sangre Espesa 2 · Reabrir 1 · Contagio (A) 1 · Festín de Sangre 2 · Umbral del Dolor (B) 1 · Avidez 2 · Estallido Rojo 3 · Danza Carmesí 3 · Corazón Indomable 4 · Instinto Asesino 3 · Onda de Choque (A) 1 · Ritmo de Matanza 2 · Sangre Hirviente 2 · Zancada 1
- **Paragon:** Gladiador: Rival (gratis) · Muchos Rivales (A) · Tiro de Arena · Retirada Táctica · Gloria · Finta · Clamor del Público (A) · Vítores · Triunfo · Contraataque (B) · Ovación

**Rotación.** Entras con el Remolino (Ciclón: atrae a la manada) y **no lo sueltas**: con **Danza Carmesí** el giro no se acaba mientras toques a alguien que sangra (8 de Furia por segundo tras 3 s); **Avidez** y **Festín de Sangre** pagan esa Furia y te curan; **Contagio** lleva los Sangrados a los siguientes. Cuando la manada cae, sueltas: **Estallido Rojo**. Clase: **Inquebrantable** deja la Piel de Hierro puesta hasta que evita daño por un 70 % de tu vida (contra la manada, ~10–15 s) y te da +30 % de Furia (más giro); Furia Protectora y Coraza de Hierro completan el aguante. Gladiador: **Muchos Rivales** (3 a la vez, +10 %), **Clamor del Público** (cada Rival que muere asusta a los cercanos) y **Triunfo** (10–15 s, como mucho cada 35 s). Desde el rejuicio (§20), **Vítores** solo acorta Furia Inmortal con Rivales élite o al Quebrantar (6 s, cada 15 s), **Tiro de Arena** lanza como mucho una Lanza cada 4 s y **Ovación** cura un 2 % por Rival normal (cada 2 s): la manada ya no encadena la inmortalidad.
**Dónde brilla:** grupos densos; la supervivencia más alta del Berserker.

*«Golpe de Gracia» (Verdugo) · Paragon Titán*
- **Clase (34/34):** Constitución 2 · Fuerza Bruta 2 · Tajo Firme (A) 1 · Ensañamiento (A) 1 · Golpe Pesado (A) 1 · Furia Creciente 2 · Golpes Precisos 2 · Contundencia (B) 1 · Temple 1 · Ritmo de Combate 2 · Silenciar (B) 1 · Ira Contenida (B) 1 · Desequilibrio 1 · Curtido 3 · Determinación 2 · Furia Desbordante (B) 1 · Avance Implacable 2 · Desenfreno 3 · Señor de la Guerra 3 · Brazo Veloz 2
- **Berserker (31/31):** Sed de Batalla (gratis) · Instinto Asesino 3 · Reabrir 1 · Remate Certero (B) 1 · Ritmo de Matanza 2 · Sangre Hirviente 2 · Último Trago 2 · Verdugo 3 · Golpe de Gracia 3 · Corazón Indomable 4 · Heridas Abiertas 3 · Sangre Espesa 1 · Desangrar (B) 1 · Negación de la Muerte (A) 1 · Zancada 3 · Caída Brutal 1
- **Paragon:** Titán: Golpe de Titán (gratis) · Aplastar (B) · Talla de Gigante · Aplomo · Ira Acumulada · Mole (B) · Piel de Montaña (B) · Quiebrahuesos · Músculo de Gigante · Coloso Despierto · Peso Acumulado

**Rotación.** Salto sobre el jefe: **Caída Brutal** deja el siguiente Rajar en el 3.er golpe. Ese golpe se prepara (Golpe Pesado: +40 % y Quebranto), es crítico seguro (**Remate Certero**), con **Contundencia** llena un 30 % más de Quebranto y, con **Golpe de Gracia**, golpea dos veces y deja al jefe Vulnerable 4 s (+20 % para todo el grupo). **Desangrar** acumula 3 Sangrados; **Verdugo** remata. **Señor de la Guerra** duplica un Rajar cada 100 de Furia. Titán: **Aplastar** (+80 % y 25 de Quebranto), **Mole** (hasta +40 %) y **Quiebrahuesos** (+15 % al jefe Quebrantado).
**Dónde brilla:** jefes; la mejor de la clase contra un objetivo.

### 8.2 Guardián

*«Guardia Total» (Guardia) · Paragon Caudillo*
- **Clase (34/34):** Constitución 2 · Curtido 3 · Tajo Voraz (B) 1 · Determinación 2 · Segundo Aliento (A) 1 · Furia Protectora (A) 1 · Temple 1 · Hermandad de Armas (B) 1 · Fuerza Bruta 2 · Furia Creciente 2 · Golpe Pesado (A) 1 · Contundencia (B) 1 · Hierro Vivo 2 · Golpes Precisos 2 · Sin Cuartel (B) 1 · Derribo (A) 1 · Rencor 3 · Inquebrantable 3 · Avance Implacable 2 · Marcha Imparable 1 · Carga Reparadora (B) 1
- **Guardián (31/31):** Pie Firme (gratis) · Escudo Alzado 3 · Contragolpe 2 · Echar Raíces 1 · Barrido de Escudo (A) 1 · Corpulencia 2 · Aguante de Roca (B) 1 · Vínculo de Escudo 2 · Guardia Viva 3 · Guardia Total 3 · Inexpugnable 4 · Puño Telúrico 3 · Réplicas (A) 1 · Tambor de Guerra 2 · Fuerza del Bastión 2 · Paso Pesado 1
- **Paragon:** Caudillo: Pendón (gratis) · Pendón de Defensa (B) · Asta Alta · Abanderado (B) · Clarín · Desbandada (A) · Arenga · Línea de Batalla · Disciplina · Gran Estandarte · Relevo

**Rotación.** Te plantas en **Muralla** delante del grupo: bloqueas (Escudo Alzado: cada bloqueo para el 80 %), devuelves golpes (**Contragolpe**) y el Bastión se llena. **Cambias a Ariete y vuelves**: cada cambio es un **Barrido de Escudo** (120 % a 4 m y provoca 2 s, como mucho cada 3 s) y suma **Guardia Viva** (+9 % de daño hasta 3 veces y te cura un 3 %). Tres cambios en 8 s: **Guardia Total**, Muralla y Ariete a la vez 6 s; **vuelve a los 15 s** y los cambios hechos mientras dura no cuentan, así que el momento de abrirla es una decisión (antes de la descarga, o cuando entra el golpe fuerte del jefe). Con 5 cargas, el cambio a Muralla **descarga** el Bastión: escudo del 20 % para ti y el aliado más herido; luego, 5 s sin llenarse. **Vínculo de Escudo** te pasa el 20 % del daño de tus aliados; **Aguante de Roca** (5 cargas): nada te derriba y tus bloqueos paran hasta el 90 %. Clase: **Inquebrantable** (Piel de Hierro, ya 12 s/−50 % por la pasiva, dura hasta evitar daño por un 70 % de tu vida y vuelve a los 15 s) y **Segundo Aliento**, que sin ocupar la ranura `2` sale con cada Piel al 50 % (gasta media Furia y cura); el ápice acorta 6 s la recarga de la Piel en cada descarga. Caudillo: **Pendón de Defensa** (−16 %, que cabe bajo el tope de 65 % del Guardián), **Abanderado** (el Pendón te sigue) y **Desbandada**.
**Dónde brilla:** tanque de grupo y de manadas (Pesadillas en grupo, oleadas); el más duro de la clase.

*«Montaña Viva» (Sismo) · Paragon Titán*
- **Clase (34/34):** Constitución 2 · Fuerza Bruta 2 · Tajo Firme (A) 1 · Ensañamiento (A) 1 · Golpe Pesado (A) 1 · Furia Creciente 2 · Golpes Precisos 2 · Contundencia (B) 1 · Temple 1 · Ritmo de Combate 2 · Silenciar (B) 1 · Ira Contenida (B) 1 · Desequilibrio 1 · Curtido 3 · Determinación 2 · Furia Protectora (A) 1 · Avance Implacable 2 · Desenfreno 3 · Señor de la Guerra 3 · Brazo Veloz 2
- **Guardián (31/31):** Pie Firme (gratis) · Puño Telúrico 3 · Echar Raíces 1 · Epicentro (B) 1 · Tambor de Guerra 2 · Fuerza del Bastión 2 · Tierra Viva 2 · Réplica Honda 3 · Montaña Viva 3 · Inexpugnable 4 · Escudo Alzado 3 · Contragolpe 1 · Cambio Certero (B) 1 · Última Línea (A) 1 · Paso Pesado 3 · Pisotón 1
- **Paragon:** Titán: Golpe de Titán (gratis) · Aplastar (B) · Talla de Gigante · Piel de Montaña (B) · Ira Acumulada · Quiebrahuesos · Mole (B) · Músculo de Gigante · Temblor · Peso Acumulado · Coloso Despierto

**Rotación.** Plantado frente al jefe. **Terremoto** (0,7 s de preparación con Golpe Pesado: +40 % y Quebranto) con **Epicentro** (+50 % al centro y 20 de Quebranto) y dos réplicas que con **Réplica Honda** hacen +30 %, **el doble contra el jefe Quebrantado**. Cada 3.er Terremoto **se repite gratis** al 100 % y sus réplicas aturden a los que no son jefes (**Montaña Viva**); **Tierra Viva** suelta una réplica gratis cada 3 s mientras sigas plantado. **Cambio Certero**: cada cambio de postura deja un crítico seguro, +30 % si el jefe está Quebrantado; **Tambor de Guerra** baja la Piel de Hierro (hasta 2 s por Terremoto, mientras se recarga: ~15 s puesta y ~10 s quitada). Clase: **Señor de la Guerra** duplica un Terremoto cada 100 de Furia (la copia no cuenta para Montaña Viva ni gasta el Golpe de Titán). Titán: **Aplastar** (+80 %), **Mole**, **Quiebrahuesos** y **Piel de Montaña**; un Golpe de Titán cada 50 de Furia (casi cada 2 Terremotos).
**Ritmo del Quebranto (con el bloqueo real de 15 s):** Golpe Pesado (19,5 con Contundencia), Epicentro (26) y Aplastar (32,5 cada ~1,7 Terremotos) llenan ~65 por Terremoto: el jefe se rompe a los ~5 s de acabar cada bloqueo, **unas 3 roturas por minuto (el máximo es 3,2)**. Lo que antes se perdía después de romper (Réplica Honda, Cambio Certero, Montaña Viva) ahora paga **durante** los 4 s de Quebranto, con Quiebrahuesos.
**Dónde brilla:** jefes: el que más rápido los Quebranta y el que más castiga al jefe Quebrantado; el tanque que más daño hace a un objetivo (0,70 del Berserker).

*«Cabeza de Puente» (Vanguardia) · Paragon Titán*
- **Clase (34/34):** Fuerza Bruta 2 · Avance Implacable 2 · Sin Cuartel (B) 1 · Marcha Imparable 1 · Derribo (A) 1 · Polvareda (A) 1 · Ira Contenida (B) 1 · Desequilibrio 1 · Brazo Veloz 2 · Constitución 2 · Tajo Voraz (B) 1 · Golpe Pesado (A) 1 · Furia Creciente 2 · Golpes Precisos 2 · Contundencia (B) 1 · Persecución 1 · Ritmo de Combate 2 · Rugido de Carga 3 · Asalto Total 3 · Determinación 2 · Curtido 2
- **Guardián (31/31):** Pie Firme (gratis) · Paso Pesado 3 · Mirada Desafiante 2 · Pisotón 1 · Gran Arrastre (A) 1 · Escudo por Delante 2 · Guardia Rota 1 · Avalancha 2 · Proa Blindada 1 · Escolta 3 · Cabeza de Puente 3 · Inexpugnable 4 · Puño Telúrico 3 · Réplicas (A) 1 · Fuerza del Bastión 2 · Guarnición 2
- **Paragon:** Titán: Golpe de Titán (gratis) · Sacudida Amplia (A) · Aplomo · Eco Pétreo · Ira Acumulada · Temblor · Derrumbe (A) · Peso Acumulado · Coloso Despierto · Piel de Montaña (B) · Talla de Gigante

**Rotación.** **Carga de Escudo** a través de la manada: **Gran Arrastre** (3 m a cada lado), **Proa Blindada** (bloqueas de frente y ganas Bastión), los arrastrados quedan Vulnerables (**Guardia Rota**). Al llegar: **Escolta** (escudo del 12 % a ti y a tu grupo, como mucho cada 10 s), **Escudo por Delante** (bloqueas seguro los 4 golpes siguientes) y **Cabeza de Puente**: te plantas, ganas 5 cargas de Bastión (cada 10 s) y todo lo que hay a 8 m te ataca 4 s. Cambias de postura para descargar. **Pisotón**: el Terremoto siguiente sale sin preparación y cuenta como plantado; **Asalto Total** lo hace gratis, pero su +45 % no se suma con Pisotón. Titán: **Sacudida Amplia**, **Derrumbe** y **Piel de Montaña**.
**Ritmo de la Carga (recalculado):** Paso Pesado 3 (−30 %) y Avance Implacable 2 (−24 %) chocan con el tope de recarga del 50 %: 10 → 5 s. **Avalancha** resta 1 s por enemigo arrastrado (hasta 2 s) y **nunca baja de 4 s**: una Carga cada ~4–5 s con el avance de 1 s (antes, ~1 s entre Cargas). Desde el rejuicio (§20), la media recarga de Asalto Total (como mucho cada 6 s) también respeta ese suelo. Por Carga: un Terremoto instantáneo de Pisotón, 1 escudo de grupo cada 10 s (≈ 1,2 % de vida por segundo) y 1 llenado de Bastión cada 10 s.
**Dónde brilla:** grupos, control y amenaza: junta a la manada para el grupo.

*«Roca y Escudo» (híbrida Guardia + Sismo, sin final) · Paragon Caudillo*
- **Clase (34/34):** Constitución 2 · Curtido 3 · Tajo Firme (A) 1 · Determinación 2 · Segundo Aliento (A) 1 · Furia Protectora (A) 1 · Temple 1 · Hermandad de Armas (B) 1 · Fuerza Bruta 2 · Furia Creciente 2 · Golpe Pesado (A) 1 · Contundencia (B) 1 · Hierro Vivo 2 · Golpes Precisos 2 · Ensañamiento (A) 1 · Silenciar (B) 1 · Rencor 3 · Inquebrantable 3 · Avance Implacable 2 · Marcha Imparable 1 · Carga Reparadora (B) 1
- **Guardián (31/31):** Pie Firme (gratis) · Escudo Alzado 3 · Puño Telúrico 3 · Contragolpe 2 · Echar Raíces 1 · Cambio Certero (B) 1 · Epicentro (B) 1 · Corpulencia 2 · Tambor de Guerra 2 · Aguante de Roca (B) 1 · Fuerza del Bastión 2 · Vínculo de Escudo 2 · Tierra Viva 2 · Guardia Viva 3 · Réplica Honda 3 · Paso Pesado 1 · Guarnición 2
- **Paragon:** Caudillo: Pendón (gratis) · Pendón de Defensa (B) · Asta Alta · Arenga · Clarín · Orden de Ataque (B) · Abanderado (B) · Línea de Batalla · Disciplina · Gran Estandarte · Relevo

**Rotación.** Plantado: **Echar Raíces** (en Muralla, cada Terremoto da Bastión), **Epicentro** y **Cambio Certero** contra el élite; **Guardia Viva** y **Réplica Honda** al máximo (los dos penúltimos); **Vínculo de Escudo** y **Tierra Viva**. Sin final: a cambio, buen aguante **y** buen Quebranto. Clase: **Segundo Aliento** con cada Piel de Hierro (al 50 %, sin ocupar la ranura `2`). Caudillo: **Pendón de Defensa**, **Orden de Ataque** (+15 % del grupo al enemigo con más vida) y **Abanderado**.
**Dónde brilla:** contenido mixto; el «peor caso» más alto del Guardián.

### 8.3 Cruzado

*«Tribunal» (Sentencia) · Paragon Caudillo*
- **Clase (34/34):** Constitución 2 · Curtido 3 · Tajo Voraz (B) 1 · Determinación 2 · Coraza de Hierro (B) 1 · Furia Protectora (A) 1 · Temple 1 · Hermandad de Armas (B) 1 · Fuerza Bruta 2 · Furia Creciente 2 · Sin Pausa (B) 1 · Contundencia (B) 1 · Hierro Vivo 2 · Golpes Precisos 2 · Sin Cuartel (B) 1 · Derribo (A) 1 · Rencor 3 · Inquebrantable 3 · Avance Implacable 2 · Marcha Imparable 1 · Carga Reparadora (B) 1
- **Cruzado (31/31):** Voto Sagrado (gratis) · Peso de la Ley 3 · Marca Indeleble 2 · Sello del Martillo 1 · Estallido de Luz (A) 1 · Juicio Presto 2 · Milagro (A) 1 · Absolución 2 · Edicto 3 · Tribunal 3 · Aureola 4 · Devoción 3 · Veredicto Generoso (A) 1 · Liturgia 2 · Ardor 2 · Ligereza 1
- **Paragon:** Caudillo: Pendón (gratis) · Pendón de Asalto (A) · Arenga · Tropel · Clarín · Doble Asta · Orden de Ataque (B) · Relevo · Gran Estandarte · Abanderado (B) · Asta Alta

**Rotación.** **Juicio** (Tres Juicios; con **Sin Pausa** se prepara en 0,15 s y caminando) marca a la manada. Cargas el Martillo y lo sueltas en el destello: **Sello del Martillo** marca a todos los que golpea; el siguiente golpe **detona**: **Estallido de Luz** (50 % a 3 m; cada enemigo recibe un solo estallido por lanzamiento, aunque haya varias marcas cerca), **Edicto** marca a 3 más y, con **Tribunal**, cada marca se detona 3 veces (la 2.ª y la 3.ª al 80 %) y la última salta a 2 enemigos. **Absolución** cura al más herido un 2 % como mucho cada 2 s y las detonaciones aseguran **1 de Fervor por lanzamiento** (no 1 por marca): a 3, **Veredicto Generoso** golpea a 8 m, cura un 10 % al más herido (con la Aureola) y un 3 % al resto. **Milagro** salva a quien iba a caer. Clase: **Inquebrantable**. Caudillo: **Pendón de Asalto** (+16 %), **Orden de Ataque**, **Doble Asta** (el Pendón dura 20 s: siempre hay uno) y **Relevo**.
**Dónde brilla:** grupos: la mejor del Cruzado contra 5, con apoyo medio de verdad (§19.3).

*«Martillo Celestial» (Veredicto) · Paragon Gladiador*
- **Clase (34/34):** Constitución 2 · Fuerza Bruta 2 · Tajo Firme (A) 1 · Ensañamiento (A) 1 · Golpe Pesado (A) 1 · Furia Creciente 2 · Golpes Precisos 2 · Contundencia (B) 1 · Temple 1 · Ritmo de Combate 2 · Silenciar (B) 1 · Ira Contenida (B) 1 · Desequilibrio 1 · Curtido 3 · Determinación 2 · Furia Desbordante (B) 1 · Avance Implacable 2 · Desenfreno 3 · Señor de la Guerra 3 · Brazo Veloz 2
- **Cruzado (31/31):** Voto Sagrado (gratis) · Devoción 3 · Sello del Martillo 1 · Veredicto Pesado (B) 1 · Liturgia 2 · Ardor 2 · Fe Serena 2 · Racha de Fe 3 · Martillo Celestial 3 · Aureola 4 · Peso de la Ley 3 · Marca Indeleble 1 · Condena (B) 1 · Luz Protectora (B) 1 · Ligereza 3 · Golpe Consagrado 1
- **Paragon:** Gladiador: Rival (gratis) · Duelo a Muerte (B) · Ovación · Desafío de Arena (A) · Gloria · Pulgar Abajo (B) · Finta · Sangre en la Arena · Campeón · Vítores · Triunfo

**Rotación.** **Juicio** (Sentencia: +15 % del grupo al jefe 12 s, el doble con **Condena**; Golpe Pesado le da +40 % y Quebranto). Cargas el Martillo (Martillo Arrojado) y sueltas en la ventana, que con **Fe Serena** dura 0,45 s: +25 % y Fervor; **Racha de Fe** suma +12 % por cada perfecto seguido (hasta 5) y **fallar la reinicia**; **Martillo Celestial** repite el 60 % de cada perfecto desde el cielo; **Liturgia** acorta 1 s las demás recargas, como mucho cada 2 s (no el Cataclismo ni la Piel de Hierro). A 3 de Fervor, **Veredicto Pesado** (+50 % y +80 %, 25 de Quebranto) y **Luz Protectora** (escudo del 10 %). Clase: **Señor de la Guerra** duplica un Martillo cada 100 de Furia (la copia sale con la misma carga, pero no cuenta como suelta perfecta ni da Fervor). Gladiador: **Duelo a Muerte**, **Desafío de Arena** (ranura `2`: encierras al jefe 8 s con +20 %), **Pulgar Abajo**, **Campeón** y **Finta** (en lugar de Tiro de Arena); contra el jefe, **Gloria** sube con cada 20 % de vida que pierde y **Ovación**, **Vítores** y **Triunfo** se activan al Quebrantarlo.
**Dónde brilla:** jefes; el segundo mejor daño a un objetivo de la clase.

*«Tierra Santa» (Santuario) · Paragon Caudillo*
- **Clase (34/34):** Fuerza Bruta 2 · Avance Implacable 2 · Sin Cuartel (B) 1 · Marcha Imparable 1 · Derribo (A) 1 · Carga Reparadora (B) 1 · Grito de Guerra (A) 1 · Desequilibrio 1 · Brazo Veloz 2 · Constitución 2 · Tajo Voraz (B) 1 · Sin Pausa (B) 1 · Furia Creciente 2 · Golpes Precisos 2 · Contundencia (B) 1 · Persecución 1 · Ritmo de Combate 2 · Rugido de Carga 3 · Asalto Total 3 · Determinación 2 · Curtido 2
- **Cruzado (31/31):** Voto Sagrado (gratis) · Ligereza 3 · Sendero Bendito 2 · Golpe Consagrado 1 · Refugio (B) 1 · Tierra Bendita 2 · Altar de Campaña 1 · Velo Sagrado 2 · Vigilia 1 · Peregrino 3 · Tierra Santa 3 · Aureola 4 · Devoción 3 · Veredicto Generoso (A) 1 · Ardor 2 · Gracia del Cielo 2
- **Paragon:** Caudillo: Pendón (gratis) · Pendón de Defensa (B) · Asta Alta · Estandarte de Guerra (A) · Clarín · Línea de Batalla · Desbandada (A) · Disciplina · Doble Asta · Relevo · Gran Estandarte

**Rotación.** **Sendero de Luz** a través del grupo: **Escolta de Luz** escuda a quien atraviesas (una vez cada 6 s por aliado), el sendero cura un 3 % por segundo sin sumarse entre senderos y acelera (**Sendero Bendito**), **Refugio** escuda al más herido y al llegar levantas un **Altar de Campaña** (+10 % de daño; dos altares no se suman). Sueltas el Martillo perfecto: **Golpe Consagrado** deja más tierra santa (2 suelos como mucho). Dentro de tus zonas, **Velo Sagrado**, **Peregrino** (+12 % y −9 %) y **Vigilia** (el Sendero vuelve el doble de rápido, **nunca por debajo de 4 s**); con **Tierra Santa** las zonas duran mientras estés dentro (hasta 20 s) y curan al más herido un 1 % por segundo. **Las zonas no se suman** (§21): cada enemigo recibe el daño de la más fuerte (un suelo de 40 %/s, no 5–10) y cada aliado, una sola cura de zona. **Gracia del Cielo**: cada Veredicto acorta el Cataclismo 4 s (nunca por debajo de 42 s). Las curas de zona comparten una cubeta de 4 %/s por aliado. Clase: **Asalto Total** (tras el Sendero, el Martillo gratis y +45 %: con un Sendero cada 4 s, ~1 de cada 3 Martillos; si mata, media recarga del Sendero, cada 6 s), **Carga Reparadora** (6 %, una vez cada 6 s, por `p.sustain()`) y **Grito de Guerra**, que sale con cada Piel de Hierro al 50 %; en esta build no sale, porque la ranura `2` es del Estandarte (§18, nota 16). Caudillo: **Estandarte de Guerra** en la ranura `2` (pones el Pendón donde pelea el grupo), **Desbandada**, **Doble Asta** y **Relevo**.
**Dónde brilla:** en grupo y en peleas largas; el mejor apoyo de la clase. En solitario aguanta mucho y hace menos daño.

*«Luz y Martillo» (híbrida Sentencia + Veredicto, sin final) · Paragon Gladiador*
- **Clase (34/34):** Constitución 2 · Fuerza Bruta 2 · Tajo Firme (A) 1 · Sin Cuartel (B) 1 · Sin Pausa (B) 1 · Furia Creciente 2 · Golpes Precisos 2 · Contundencia (B) 1 · Temple 1 · Ritmo de Combate 2 · Derribo (A) 1 · Ira Contenida (B) 1 · Desequilibrio 1 · Curtido 3 · Determinación 2 · Furia Protectora (A) 1 · Avance Implacable 2 · Desenfreno 3 · Señor de la Guerra 3 · Brazo Veloz 2
- **Cruzado (31/31):** Voto Sagrado (gratis) · Peso de la Ley 3 · Devoción 3 · Marca Indeleble 2 · Sello del Martillo 1 · Estallido de Luz (A) 1 · Veredicto Pesado (B) 1 · Juicio Presto 2 · Liturgia 2 · Luz Protectora (B) 1 · Ardor 2 · Absolución 2 · Fe Serena 2 · Edicto 3 · Racha de Fe 3 · Ligereza 1 · Gracia del Cielo 2
- **Paragon:** Gladiador: Rival (gratis) · Muchos Rivales (A) · Ovación · Tiro de Arena · Gloria · Pulgar Abajo (B) · Contraataque (B) · Sangre en la Arena · Campeón · Triunfo · Vítores

**Rotación.** Soltar perfecto marca (**Sello del Martillo**) y el siguiente golpe detona (**Estallido de Luz**, un estallido por enemigo y lanzamiento); **Edicto** y **Racha de Fe** al máximo (los dos penúltimos); **Fe Serena**, **Absolución** y **Veredicto Pesado** contra el élite. Sin final. Gladiador: **Muchos Rivales**, **Pulgar Abajo**, **Contraataque** y **Tiro de Arena** (al nombrar Rival le arrojas una Lanza gratis, como mucho cada 4 s). Con Gracia del Cielo y Vítores, el Cataclismo no baja de 42 s.
**Dónde brilla:** contenido mixto; el «peor caso» más alto del Cruzado.

### 8.4 Comparación (estimación de diseño; el dueño acepta la híbrida a ~8–10 %)

**Berserker** (1,00 = la mejor de la especialización en ese escenario):

| Build | Contra jefes | Contra 5 | Peor de los dos | Control | Supervivencia |
|---|---|---|---|---|---|
| Estampida Sin Fin (Estampida) | 0,84 | **1,00** | 0,84 | **alto** | media |
| Danza Carmesí (Hemorragia) | 0,86 | 0,95 | 0,86 | medio | **muy alta** |
| Golpe de Gracia (Verdugo) | **1,00** | 0,78 | 0,78 | bajo | baja |
| Sangre y Acero (**híbrida**) | 0,92 | 0,91 | **0,91** | bajo | alta |
| _Variante: Sangre y Acero con Danza Carmesí 1 y Golpe de Gracia 1 (sin Alcance Salvaje)_ | _0,93_ | _0,90_ | _0,90_ | bajo | alta |

**Guardián** (el tanque se mide también por el aguante, ya con los topes reales de §7.2):

| Build | Aguante | Contra jefes | Contra 5 | Peor de los tres | Control y amenaza |
|---|---|---|---|---|---|
| Guardia Total (Guardia) | **1,00** | 0,86 | 0,90 | 0,86 | alta (provoca al cambiar) |
| Montaña Viva (Sismo) | 0,84 | **1,00** | 0,84 | 0,84 | media (Quebranto muy alto) |
| Cabeza de Puente (Vanguardia) | 0,85 | 0,80 | **1,00** | 0,80 | **muy alta** (arrastra y provoca a 8 m) |
| Roca y Escudo (**híbrida**) | 0,94 | 0,92 | 0,90 | **0,90** | media |
| _Variante: Roca y Escudo con Guardia Total 1 y Montaña Viva 1 (sin Guarnición)_ | _0,93_ | _0,93_ | _0,89_ | _0,89_ | media |

**Cruzado** (el apoyo se mide también por lo que cura y escuda al grupo; cifras de cura en §19.3):

| Build | Contra jefes | Contra 5 | Peor de los dos | Apoyo al grupo |
|---|---|---|---|---|
| Tribunal (Sentencia) | 0,84 | **1,00** | 0,84 | medio |
| Martillo Celestial (Veredicto) | **1,00** | 0,80 | 0,80 | bajo |
| Tierra Santa (Santuario) | 0,81 | 0,90 | 0,81 | **muy alto** |
| Luz y Martillo (**híbrida**) | 0,92 | 0,90 | **0,90** | medio |
| _Variante: Luz y Martillo con Tribunal 1 y Martillo Celestial 1 (sin Gracia del Cielo)_ | _0,93_ | _0,91_ | _0,91_ | medio |

Cada híbrida queda a un 6–10 % de la mejor en cada escenario y tiene el mejor «peor caso» de su especialización, como en la Maga.

**Qué cambió en el rejuicio (§20).** Los bucles que encontró el juez (Vítores, Triunfo, Tiro de Arena y Asalto Total sin tope, la Piel de Hierro siempre puesta) **no estaban en estas estimaciones**: eran comportamientos no previstos, así que cerrarlos no baja las cifras de diseño, solo las acerca a lo que dará el banco. Cambian las cifras que dependían de valores previstos: **Danza Carmesí** contra 5 (0,98 → 0,95: Triunfo ~35–45 % del tiempo y una Lanza de Tiro de Arena cada 4 s como mucho); el **aguante** de Montaña Viva (0,88 → 0,84) y de Cabeza de Puente (0,90 → 0,85), que tenían la Piel de Hierro casi siempre puesta y ahora la tienen ~60 % (Guardia Total y Roca y Escudo pierden lo mismo en términos absolutos, pero el bloqueo y el Pendón de Defensa los sostienen); **Liturgia** (≤ 0,5 s por segundo) baja ~3 % a Tribunal, Martillo Celestial y Luz y Martillo, que se mantienen entre sí; **Tierra Santa** no lleva Liturgia y cambia Ira Contenida por Grito de Guerra (−1,5 %), así que sube un punto respecto de Tribunal; **Luz y Martillo** pierde además ~1 % del Gladiador en grupos. La supervivencia del Berserker se mide con «no morir» ≤ 34 % del tiempo en el peor caso (§12).

**Qué cambió en la ronda 3 (§21).** Solo **Tierra Santa**, recalculada con **Vigilia siempre activa** (con Golpe Consagrado y Tierra Santa siempre estás en una zona): 0,83/0,93 → **0,81/0,90**. Cuentas: sin suelo, el Sendero volvería cada 10 × 0,5 (tope de recarga: Ligereza 30 % + Avance Implacable 24 %) ÷ 1,12 (Disciplina) ÷ 2 (Vigilia) ≈ 2,2 s; con el suelo, cada **4 s** (la estimación anterior suponía ~3,5 s). Asalto Total pasa de ~37 a ~33 % de los Martillos (uno cada ~1,3 s): −0,6 %; el golpe del Sendero, −0,5 %; el daño del sendero ya no se suma encima del suelo de 40 %/s: −0,5 %; y el Grito de Guerra no sale en esta build (la ranura `2` es del Estandarte; antes contaba +1,3 %). Total ≈ −2,9 %. Los suelos sumados (5–10 de 40 %/s, hasta ~400 %/s por enemigo) y el Sendero cada ~2,2 s **nunca estuvieron en la estimación**: eran el bucle que el juez midió por encima de 1,0. Tribunal, Martillo Celestial y Luz y Martillo no cambian: sus cifras ya suponían un estallido por enemigo y un solo suelo de Golpe Consagrado (§21).

**Dos finales a rango 1 (corrección §19, hallazgo 5).** Las tres variantes en cursiva son legales (comprobadas con el validador sobre una copia de los datos: 34/34, 31/31 «sin final» y Paragon 1 + 10). Antes de la corrección, cada final daba su mecanismo entero a rango 1, así que la variante sumaba los dos mecanismos por 2 puntos y superaba a la híbrida y, en contenido mixto, a las puras. Ahora el mecanismo escala por rango (a rango 1 vale ~⅓ del rango 3) y la variante queda **a ±2 % de la híbrida y por debajo de cada pura en su escenario**: es otra forma de jugar la híbrida, no la mejor. El banco (E3) debe medirla; §18 pide al validador que la avise.

**Entre especializaciones** (regla 2e: el Berserker hace contra un objetivo al menos un 10 % más que las otras dos; topes del juicio: Guardián ≤ 0,70 contra un objetivo y ≤ 0,75 contra 5, Cruzado sin la build de apoyo ≤ 0,82):

| Contra un jefe (respecto de Golpe de Gracia) | Contra 5 (respecto de Estampida Sin Fin) |
|---|---|
| Berserker 1,00 · Cruzado (Martillo Celestial) 0,80 · Guardián (Montaña Viva) 0,70 | Berserker 1,00 · Cruzado (Tribunal) 0,78 · Guardián (Cabeza de Puente) 0,75 |

Qué bajó y por qué: el **Guardián** pierde un tercio del Golpe de Titán (+60 → +40 %), el +45 % de Asalto Total sobre el Terremoto de Pisotón, la Carga cada ~1 s y el Quebranto que no se aprovechaba (Montaña Viva 0,78 → 0,70; Cabeza de Puente 0,80 → 0,75). El **Cruzado** pasa de un Veredicto por Martillo (contra 5) a uno cada cuatro, Tribunal repite al 80 % sin el +30 % plano, Liturgia no acorta el Cataclismo y la Aureola 4 es un Cataclismo al 50 % cada 30 s como mucho (Martillo Celestial 0,88 → 0,82; Tribunal 0,92 → 0,80). Hoy, en el banco (Nv50, 5 semillas), el Guardián hace contra un objetivo ×0,77 de la media y el Berserker ×1,22 (cociente 0,63): el diseño sube al tanque a 0,70 sin superar el ×3 de aguante, y E3 lo comprueba con `--seeds 5`. **Rejuicio (§20):** el Cruzado baja un poco más por Liturgia (como mucho cada 2 s): Martillo Celestial 0,82 → 0,80 y Tribunal 0,80 → 0,78. El Guardián no cambia de daño (Peso Acumulado solo acorta la Ciudadela) y su aguante con el bloqueo queda en ≈ ×2,85 de vida efectiva como máximo (§7.2). **Ronda 3 (§21):** con un estallido por enemigo y lanzamiento, el área del Cruzado crece con el número de enemigos (N) y no con N²: Tribunal se queda en 0,78 del Berserker contra 5 y E3 lo mide también **contra 10**, donde ambos deberían rendir ≈ ×2 respecto de 5 (sin el tope, la Sentencia rendía ×3,4 de 5 a 10 y pasaba a Estampida).

---

## 9. Paragon: árboles héroe del Guerrero

### 9.1 Reglas

Las de la Maga (§7.1 de su documento): se abre con la especialización **31/31 gastada**; su nodo clave es gratis y luego **10 puntos** (Nv71–80) para 12 nodos (siempre quedan 2 fuera); en gris hasta entonces y **en pausa** si bajas de 31/31. Cada especialización está en 2 árboles; cada árbol lo comparten 2 especializaciones y su mecánica funciona con las dos. Máximo una habilidad de talento por árbol (opción A de la elección de la fila 2, ranura `2`).

| Árbol (id) | Especializaciones | Mecánica (con cualquiera de las dos) | Habilidad (t4A · l4A · u4A) |
|---|---|---|---|
| **Titán** (`h1`) | Berserker · Guardián | **Golpe de Titán:** cada 60 de Furia gastada, tu siguiente principal hace +40 % y sacude el suelo a 4 m (50 %); a los jefes, 15 de Quebranto. Las copias y repeticiones gratis no lo gastan | **Bramido de Titán:** aturdes 1,5 s a 6 m y tu siguiente principal es de Titán (30 s) |
| **Gladiador** (`h2`) | Berserker · Cruzado | **Rival:** tu primer golpe nombra Rival al enemigo 10 s: le haces +15 %; si muere, ganas 20 de Furia y el Rival pasa al más cercano. Contra jefes, la Gloria sube con cada 20 % de vida que pierde y Ovación, Vítores y Triunfo se activan al Quebrantarlo | **Desafío de Arena:** encierras a tu Rival contigo en un círculo de 6 m 8 s; le haces +20 % (40 s) |
| **Caudillo** (`h3`) | Guardián · Cruzado | **Pendón:** cada 15 s clavas un Pendón donde estás (12 s, el 80 % del tiempo): tú y tus aliados a 8 m hacen +8 % de daño y reciben un 8 % menos | **Estandarte de Guerra:** clavas al instante un Pendón en la mira (a 15 m), aparte del automático (30 s) |

**Equilibrio entre árboles héroe (corrección §19):** la diferencia entre los dos árboles de una misma especialización, en su escenario, debe quedar **≤ 10 %**. Antes, el Titán daba al Guardián ~+30–50 % de daño (Golpe de Titán +60 %, Aplastar +120 %, Mole hasta +60 %) y el Caudillo ~+15 % (el Pendón solo estaba puesto la mitad del tiempo). Ahora: Titán ≈ +20–25 % (Golpe +40 %, Aplastar +80 %, Mole hasta +40 %) y Caudillo ≈ +15–18 % de daño (Pendón al 80 % del tiempo; con Doble Asta, siempre; Disciplina 12 %) **más** su aguante de grupo. Para el Cruzado, el Gladiador ya vale contra jefes (Gloria por vida perdida y premios al Quebrantar). **Rejuicio (§20):** en grupos, con Muchos Rivales, todo se encadenaba por la muerte de un Rival (Triunfo permanente, una Lanza gratis por cada Rival nombrado, una cura del 10 % por muerte y 4 s de definitiva por muerte) y el Gladiador pasaba al Titán en más del 10 %. Ahora Triunfo dura 10–15 s como mucho cada 35 s, Tiro de Arena actúa cada 4 s, Ovación cura un 10 % solo por Rival élite o al Quebrantar (2 % por Rival normal, cada 2 s) y Vítores acorta 6 s solo por Rival élite o al Quebrantar (cada 15 s): Gladiador ≈ Titán ± 5 % en grupos. Peso Acumulado (Titán) baja a 1 s por Golpe de Titán.

**Por qué estos temas:** los tres leen algo que tienen **todas** las especializaciones del Guerrero: la Furia gastada (Titán), el primer enemigo que golpeas, la Lanza Arrojadiza del kit base (que el Gladiador arroja solo: no hace falta tenerla en la barra) y la esquiva (Gladiador), y un estandarte que se clava solo (Caudillo). Ninguno toca la forma de una habilidad: el Golpe de Titán es la **siguiente** principal, el Rival es un blanco y el Pendón es otra zona. Con cada especialización encajan distinto: el Titán premia al Berserker que gasta mucho y al Guardián del Sismo (más Quebranto); el Gladiador da al Cruzado un blanco para sus marcas y al Berserker un duelo; el Caudillo planta su Pendón donde el Guardián se planta y donde el Cruzado consagra.

### 9.2 Titán (Berserker · Guardián)

| Fila | Id | Nodo | Forma · tipo | Etiqueta | Rangos | Requiere | Qué hace (al máximo) | Cuál conviene |
|---|---|---|---|---|---|---|---|---|
| 0 | t0 | Golpe de Titán | ○ clave | mecánica | gratis | gratis | Cada 60 de Furia gastada, tu siguiente principal hace +40 % y sacude el suelo a 4 m (50 %); a los jefes, 15 de Quebranto |  |
| 1 | t1 | Talla de Gigante | ○ pasiva | número | 1 | t0 | Eres un 10 % más grande: +10 % de alcance cuerpo a cuerpo y +8 % de vida máxima |  |
| 1 | t2 | Sacudida o Aplastar | ⬡ elección | mecánica | 1 | t0 | **A · ○ Sacudida Amplia**: La sacudida del Golpe de Titán llega a 7 m (antes 4 m) y ralentiza un 30 % durante 2 s _(contra grupos)_<br>**B · ○ Aplastar**: El Golpe de Titán hace +80 % (antes +40 %) y a los jefes les llena 25 de Quebranto (antes 15) _(contra jefes)_ | A, contra grupos: cada Golpe de Titán alcanza y frena a la manada. B, contra jefes: un golpe enorme que les rompe la guardia |
| 1 | t3 | Aplomo | ○ pasiva | mecánica | 1 | t0 | Tras un Golpe de Titán, nada te derriba, aturde ni ralentiza durante 3 s |  |
| 2 | t4 | Bramido o Piel de Montaña | ⬡ elección | mecánica | 1 | t1 o t2 | **A · □ Bramido de Titán** (habilidad): Habilidad (ranura 2): aturdes 1,5 s a los enemigos a 6 m y tu siguiente principal es de Titán. Se recarga en 30 s _(control)_<br>**B · ○ Piel de Montaña**: Cada Golpe de Titán te da un escudo del 8 % de tu vida durante 5 s _(supervivencia)_ | A, para controlar grupos y adelantar el golpe grande (ocupa la ranura 2). B, para aguantar sin ocupar ranura |
| 2 | t5 | Ira Acumulada | ○ pasiva | número | 1 | t2 | El Golpe de Titán llega cada 50 de Furia gastada (antes 60) |  |
| 2 | t6 | Eco Pétreo | ○ pasiva | mecánica | 1 | t2 o t3 | La sacudida se repite 1 s después al 50 % |  |
| 3 | t7 | Quiebrahuesos | ○ pasiva | mecánica | 1 | t4 o t5 | Los jefes Quebrantados reciben +15 % de tu daño mientras dura el Quebranto |  |
| 3 | t8 | Derrumbe o Mole | ⬡ elección | mecánica | 1 | t5 | **A · ○ Derrumbe**: Si el Golpe de Titán mata, el enemigo estalla: 100 % a todos a 3 m _(contra grupos)_<br>**B · ○ Mole**: Cada Golpe de Titán seguido sobre el mismo enemigo hace +20 % más (hasta +40 %) _(contra jefes)_ | A, contra grupos: cada muerte encadena estallidos. B, contra jefes: cada golpe de gigante pega más fuerte |
| 3 | t9 | Temblor | ○ pasiva | mecánica | 1 | t5 o t6 | Los alcanzados por la sacudida hacen un 10 % menos de daño durante 4 s |  |
| 4 | t10 | Músculo de Gigante | ○ pasiva | número | 1 | t7 o t8 | Tus habilidades principales hacen +12 % de daño |  |
| 4 | t11 | Peso Acumulado | ○ pasiva | mecánica | 1 | t8 o t9 | Cada Golpe de Titán acorta 1 s la recarga de tu definitiva |  |
| 5 | t12 | Coloso Despierto | ○ **FINAL** | mecánica | 1 | t10 o t11 | Cada 30 s, tu siguiente Golpe de Titán te hace gigante 8 s: todos tus golpes sacuden el suelo (al 50 %) |  |

### 9.3 Gladiador (Berserker · Cruzado)

| Fila | Id | Nodo | Forma · tipo | Etiqueta | Rangos | Requiere | Qué hace (al máximo) | Cuál conviene |
|---|---|---|---|---|---|---|---|---|
| 0 | l0 | Rival | ○ clave | mecánica | gratis | gratis | Tu primer golpe nombra Rival al enemigo 10 s: le haces +15 %. Si muere, ganas 20 de Furia y el Rival pasa al más cercano |  |
| 1 | l1 | Ovación | ○ pasiva | número | 1 | l0 | Matar a un Rival élite o Quebrantar a tu Rival te cura un 10 %; un Rival normal, un 2 % (una vez cada 2 s) |  |
| 1 | l2 | Rivales o Duelo | ⬡ elección | mecánica | 1 | l0 | **A · ○ Muchos Rivales**: Tienes 3 Rivales a la vez, a +10 % cada uno (antes 1 a +15 %) _(contra grupos)_<br>**B · ○ Duelo a Muerte**: Tu Rival recibe +30 % (antes +15 %), pero solo cambia cuando muere _(contra jefes)_ | A, contra grupos: tres blancos marcados a la vez. B, contra jefes y élites: el duelo largo paga el doble |
| 1 | l3 | Tiro de Arena | ○ pasiva | mecánica | 1 | l0 | Al nombrar un Rival, le arrojas gratis una Lanza Arrojadiza que lo ralentiza un 40 % 3 s (una vez cada 4 s) |  |
| 2 | l4 | Desafío o Contraataque | ⬡ elección | mecánica | 1 | l1 o l2 | **A · □ Desafío de Arena** (habilidad): Habilidad (ranura 2): encierras a tu Rival contigo en un círculo de 6 m 8 s; le haces +20 %. Se recarga en 40 s _(contra jefes)_<br>**B · ○ Contraataque**: Tras esquivar, tu siguiente golpe en 2 s hace +60 % y te cura un 5 % _(supervivencia)_ | A, contra jefes y élites que huyen o llaman ayuda (ocupa la ranura 2). B, para jugar con la esquiva sin ocupar ranura |
| 2 | l5 | Gloria | ○ pasiva | mecánica | 1 | l2 | Cada Rival que matas y cada 20 % de vida que pierde tu Rival te dan 1 de Gloria (hasta 5): +4 % de daño cada una |  |
| 2 | l6 | Retirada Táctica | ○ pasiva | mecánica | 1 | l2 o l3 | Al esquivar, arrojas gratis una Lanza Arrojadiza a tu Rival (+30 %), una vez cada 6 s |  |
| 3 | l7 | Sangre en la Arena | ○ pasiva | mecánica | 1 | l4 o l5 | Cada punto de Gloria da a tus críticos +5 % de daño (5 de Gloria: +25 %) |  |
| 3 | l8 | Público o Pulgar | ⬡ elección | mecánica | 1 | l5 | **A · ○ Clamor del Público**: Matar a un Rival asusta a los enemigos a 6 m: huyen 2 s (los jefes no: les llena 20 de Quebranto) _(control)_<br>**B · ○ Pulgar Abajo**: Tu Rival con menos del 30 % de vida recibe +40 % de daño _(contra jefes)_ | A, para controlar grupos: cada muerte abre hueco. B, contra jefes: rematas antes |
| 3 | l9 | Finta | ○ pasiva | mecánica | 1 | l5 o l6 | Esquivar a menos de 3 m de tu Rival acorta 2 s la recarga de tu movilidad |  |
| 4 | l10 | Campeón | ○ pasiva | número | 1 | l7 o l8 | Contra tu Rival, tienes +10 % de probabilidad de crítico |  |
| 4 | l11 | Vítores | ○ pasiva | mecánica | 1 | l8 o l9 | Matar a un Rival élite o Quebrantar a tu Rival acorta 6 s la recarga de tu definitiva (como mucho una vez cada 15 s) |  |
| 5 | l12 | Triunfo | ○ **FINAL** | mecánica | 1 | l10 o l11 | Rival Quebrantado o 5 de Gloria (cada 35 s): 10 s de +25 % de daño y principales a media Furia; matar, +1 s (hasta 15 s) |  |

### 9.4 Caudillo (Guardián · Cruzado)

| Fila | Id | Nodo | Forma · tipo | Etiqueta | Rangos | Requiere | Qué hace (al máximo) | Cuál conviene |
|---|---|---|---|---|---|---|---|---|
| 0 | u0 | Pendón | ○ clave | mecánica | gratis | gratis | Cada 15 s clavas un Pendón donde estás (12 s): tú y tus aliados a 8 m hacen +8 % de daño y reciben un 8 % menos |  |
| 1 | u1 | Asta Alta | ○ pasiva | número | 1 | u0 | El Pendón alcanza 12 m (antes 8 m) |  |
| 1 | u2 | Pendón: Asalto o Defensa | ⬡ elección | mecánica | 1 | u0 | **A · ○ Pendón de Asalto**: El Pendón da +16 % de daño (antes +8 %) _(contra jefes)_<br>**B · ○ Pendón de Defensa**: El Pendón quita un 16 % del daño recibido (antes 8 %) _(supervivencia)_ | A, para hacer daño (sobre todo en ráfagas contra jefes). B, para aguantar contra grupos y golpes fuertes |
| 1 | u3 | Arenga | ○ pasiva | mecánica | 1 | u0 | Al clavar un Pendón, tú y tus aliados a 8 m recuperan un 5 % de la vida |  |
| 2 | u4 | Estandarte o Abanderado | ⬡ elección | mecánica | 1 | u1 o u2 | **A · □ Estandarte de Guerra** (habilidad): Habilidad (ranura 2): clavas al instante un Pendón en la mira (a 15 m), aparte del automático. Se recarga en 30 s _(contra jefes)_<br>**B · ○ Abanderado**: Llevas el Pendón a la espalda: te sigue y siempre estás dentro _(supervivencia)_ | A, para poner el Pendón donde pelea el grupo (ocupa la ranura 2). B, si te mueves mucho y no quieres ocupar ranura |
| 2 | u5 | Clarín | ○ pasiva | mecánica | 1 | u2 | Cada vez que clavas un Pendón, ganas 20 de Furia |  |
| 2 | u6 | Tropel | ○ pasiva | mecánica | 1 | u2 o u3 | Dentro del Pendón, tú y tus aliados se mueven un 15 % más rápido |  |
| 3 | u7 | Línea de Batalla | ○ pasiva | mecánica | 1 | u4 o u5 | Los enemigos dentro del Pendón hacen un 10 % menos de daño |  |
| 3 | u8 | Desbandada u Orden | ⬡ elección | mecánica | 1 | u5 | **A · ○ Desbandada**: Al clavar un Pendón, los enemigos a 8 m huyen 2 s (los jefes no: les llenas 20 de Quebranto) _(control)_<br>**B · ○ Orden de Ataque**: Al clavar un Pendón, el enemigo con más vida a 15 m recibe +15 % de daño de todo el grupo durante 10 s _(contra jefes)_ | A, para controlar grupos y dar respiro. B, contra jefes: todo el grupo pega más al mismo |
| 3 | u9 | Doble Asta | ○ pasiva | mecánica | 1 | u5 o u6 | Tu Pendón dura 20 s (antes 12 s): siempre tienes uno clavado; dos a la vez no se suman |  |
| 4 | u10 | Disciplina | ○ pasiva | número | 1 | u7 o u8 | Dentro del Pendón, tus habilidades se recargan un 12 % más rápido |  |
| 4 | u11 | Relevo | ○ pasiva | mecánica | 1 | u8 o u9 | Al acabar un Pendón, tú y tus aliados a 8 m ganan un escudo del 10 % de su vida |  |
| 5 | u12 | Gran Estandarte | ○ **FINAL** | mecánica | 1 | u10 o u11 | Cada 40 s, tu siguiente Pendón es un Gran Estandarte 15 s: el doble de grande y de efecto |  |

**Implementación de los árboles héroe (por nodo):**

**Titán:** `t0` power g_ti_golpe_titan · NUEVO (⑪ onResource cuenta Furia gastada; solo la pagada por habilidades: no cuentan Furia Protectora, Segundo Aliento ni el drenaje de Danza Carmesí; antes +60 %; las copias y repeticiones gratis, echo:true, no lo gastan); `t1` stats.hpPct + mod @melee range · claves; `t2` A: mod g_ti_golpe_titan radius 7 + slow · claves · B: tv.titanPct 80 + titanStagger 25 · claves; `t3` power g_ti_aplomo · NUEVO (buff imparable 3 s); `t4` A: activa g_h_bramido · B: power g_ti_piel_montana · NUEVO (g.shield); `t5` tuning titán every 50 · clave; `t6` power g_ti_eco_petreo · NUEVO (timers: repite la sacudida); `t7` power g_ti_quiebrahuesos · NUEVO (condAdd contra Quebrantados); `t8` A: power g_ti_derrumbe · NUEVO (onKill + dealArea) · B: power g_ti_mole · NUEVO (pilas por blanco; tope 2); `t9` power g_ti_temblor · NUEVO (e.weakenOutgoing); `t10` mod @spender dmg · existe; `t11` power g_ti_peso · NUEVO (cdReduce @ultimate 1 s, antes 2 s; respeta el suelo de las definitivas: 70 % de su base); `t12` power g_ti_coloso · NUEVO (icd 30 + buff de 8 s).

**Gladiador:** `l0` power g_gl_rival · NUEVO (marca de duelo; onKill la pasa); `l1` tv.rivalKillHeal · NUEVO (10 % por Rival élite o jefe, o al Quebrantarlo; 2 % por Rival normal con icd 2; por la cubeta de p.sustain()); `l2` A: power g_gl_rivales · NUEVO (3 marcas de Rival) · B: power g_gl_duelo · NUEVO; `l3` power g_gl_tiro_arena · NUEVO (al nombrar Rival: eco de g_lanza gratis contra él + slow; icd 4: una Lanza que mata ya no encadena otra; no hace falta la Lanza en la barra); `l4` A: activa g_h_desafio · B: power g_gl_contraataque · NUEVO (tras la esquiva); `l5` power g_gl_gloria · NUEVO (pilas por muerte y por cada 20 % de vida del Rival; se borran fuera de combate); `l6` power g_gl_retirada · NUEVO (tras la esquiva: eco de g_lanza gratis contra el Rival, icd 6; no hace falta la Lanza en la barra); `l7` power g_gl_sangre_arena · NUEVO (daño de crítico por pila de Gloria); `l8` A: power g_gl_clamor · NUEVO (miedo + addStagger a jefes) · B: power g_gl_pulgar · NUEVO (condAdd con menos del 30 %); `l9` power g_gl_finta · NUEVO (cdReduce @movement); `l10` power g_gl_campeon · NUEVO (condCrit contra el Rival); `l11` power g_gl_vitores · NUEVO (cdReduce @ultimate 6 s, icd 15; solo Rival élite o jefe, o al Quebrantarlo; antes 4 s por cada Rival sin tope; respeta el suelo de las definitivas); `l12` power g_gl_triunfo · NUEVO (buff con 5 de Gloria o al Quebrantar al Rival; matar +1 s hasta 15 s; icd 35 desde que se activa = 15 s como mucho y 20 s de espera; antes +2 s por muerte sin tope).

**Caudillo:** `u0` power g_cau_pendon · NUEVO (campo con aura; icd 15, dura 12 s: 80 % del tiempo; antes 10 s cada 20 s); `u1` tuning pendón radius 12 · clave; `u2` A: tuning pendón dmgPct 16 · clave · B: tuning pendón drPct 16 · clave; `u3` power g_cau_arenga · NUEVO (g.heal sobre g.allies()); `u4` A: activa g_h_estandarte · B: power g_cau_abanderado · NUEVO (el campo sigue al jugador); `u5` power g_cau_clarin · NUEVO (gainResource 20); `u6` aura del Pendón moveSpd 15 · clave; `u7` aura del Pendón e.weakenOutgoing 10 · clave; `u8` A: power g_cau_desbandada · NUEVO (miedo + addStagger a jefes) · B: power g_cau_orden · NUEVO (vuln al de más vida); `u9` tuning pendón durS 20 · clave (antes «2 Pendones a la vez», que sin Estandarte de Guerra no hacía nada); `u10` aura del Pendón cdr 12 · clave (antes 10: con el 80 % del tiempo, ~10 % efectivo); `u11` power g_cau_relevo · NUEVO (fin del campo + g.shield); `u12` power g_cau_gran_estandarte · NUEVO (icd 40).

**Uso en las builds:** Titán (Estampida Sin Fin, Golpe de Gracia, Montaña Viva, Cabeza de Puente), Gladiador (Sangre y Acero, Danza Carmesí, Martillo Celestial, Luz y Martillo), Caudillo (Guardia Total, Roca y Escudo, Tribunal, Tierra Santa). Las tres habilidades de talento las usa al menos una build (Bramido: Estampida Sin Fin; Desafío de Arena: Martillo Celestial; Estandarte de Guerra: Tierra Santa).

---

## 10. Forja y talentos: sin repetición

**Regla (Anexo A.4 de la Maga):** la forja **transforma** (forma, geometría, ritmo); el talento **añade, multiplica o cambia cómo se usa el verbo**.

| Habilidad | Variantes | Talentos que la tocan | Cómo conviven |
|---|---|---|---|
| Tajo | Desgarro · Siega | c5, c19, c23 | La variante da el Sangrado o el barrido; los talentos dan Furia y recargas |
| Hendidura | Rompefilas · Grieta | c6, c9 | c9 cambia la **preparación**, no la forma |
| Lanza Arrojadiza | Arpón · Jabalinas | c6, c10B, l3, l6 | Silenciar corta hechizos; el Gladiador la arroja sola contra su Rival (al nombrarlo y al esquivar), aunque no esté en la barra |
| Embestida y Salto (movilidad) | Carnero · Doble Carga · Caída Atronadora · Salto Rasante | c3, c7, c14, c21, c23, c27, c30; b3, b6, b7, b10, b13, b14, b17, b21, b24, b27 | **Caída Atronadora quita la cadena**: renuncias a la Estampida a cambio de control |
| Piel de Hierro | Espinas · Inamovible | c4, c18, c19, c25, c28, d12, d28 | Inquebrantable cambia la duración por un presupuesto de daño evitado (40/55/70 % de tu vida); Espinas devuelve daño mientras dura; Rencor, al acabar. La pasiva del Guardián cambia su base (12 s, −50 %). Su recarga empieza al acabar y ni Ritmo de Matanza ni Liturgia la tocan (§20) |
| Remolino Sangriento | Remolino Anclado · Ciclón | b8, b18, b22, b25 | **Anclado = plantado** sin ser verbo del Guardián: es la forma, no un bonus por estar quieto |
| Rajar | Estocada Final · Molino | b2, b5, b6, b9, b12, b19, b23, b26 | La variante cambia la geometría; los talentos cambian el **3.er golpe** |
| Furia Inmortal | Sed Voraz · Frenesí | b15, b17, b28 | **Frenesí quita la inmortalidad** a cambio de velocidad |
| **Cambio de Guardia** | Guardia Compartida · Guardia Opresiva | d5, d8, d18, d22, d25 | La forja decide **a quién** llega la postura (aliados o enemigos); los talentos premian **cambiar** (golpe, crítico, pilas, las dos a la vez) |
| **Carga de Escudo** | Arrollador · Carga Veloz | d3, d6, d7, d10, d13, d14, d17, d21, d24, d27; c3, c7, c14, c30 | **Carga Veloz la vuelve rápida y sin provocar**: quien la elija renuncia a la Vanguardia (Cabeza de Puente sigue funcionando, pero ya no arrastra) |
| **Terremoto** | Martinete · Falla | d2, d5, d6, d9, d12, d19, d23, d26; c6, c9 | La forja cambia dónde golpea (un punto, una línea); los talentos cambian las **réplicas** y el plantado |
| **Ciudadela** | Ciudadela Andante · Empalizada | d15, d20, d28 | **Ciudadela Andante deja de ser plantada** (−25 %): la opción para quien no quiere quedarse quieto |
| **Juicio** | Sentencia · Tres Juicios | z1, z4, z5, z8, z11, z18, z22, z25; c9 | La forja decide cuántos marca; los talentos cambian la **detonación** |
| **Sendero de Luz** | Escolta de Luz · Destello Doble | z3, z7, z10, z13, z14, z17, z21, z24, z27; c3, c14, c30 | La forja cambia el uso (proteger a un aliado o moverte dos veces); los talentos, el **sendero** como zona |
| **Martillo de Guerra** | Martillo Arrojado · Onda Sagrada | z2, z5, z6, z9, z12, z15, z19, z23, z26; c6, c9 | La forja cambia la forma del golpe al soltar; los talentos cambian **la ventana perfecta** (más ancha, en racha, con eco, más fuerte con Golpe Pesado) y Sin Pausa deja cargar sin frenarte |
| **Cataclismo** | Rayo del Cielo · Amanecer | z13, z17, z19, z20, z24, z27, z28; c9 | **Amanecer** lo vuelve cura de grupo; la ventana perfecta también vale aquí (Fe Serena, Golpe Pesado) |

**Nombres:** ninguna repetición dentro del Guerrero ni con la Maga ni con la Arquera (comprobador de la etapa 2, §15.5). Renombrados en la etapa 2: «Marca Duradera» → **Marca Indeleble**, «Galope» → **Tropel**, «Cielo Abierto» → **Columna Ancha** (chocaban con la forja de la Arquera); y, para no repetir raíces, «Fuerza Telúrica» → **Puño Telúrico**, «Raíces de Hierro» → **Echar Raíces**, «Proa de Hierro» → **Proa Blindada**, «Tierra Temblorosa» → **Temblor**, «Furia Pesada» → **Ira Acumulada**, «Cadencia Pesada» → **Peso Acumulado**, «Veredicto Abierto» → **Veredicto Generoso**.

---

## 11. Implementación (E1–E5, como la Maga)

### 11.1 `js/skills-guerrero.js`

| Qué | Cambio |
|---|---|
| Kit base | `g_tajo` (igual), `g_hendidura` (req 8 → **2**, windup 0,12 → **0,25**), `embestida` (igual), `g_piel` (12 s/−50 % → **8 s/−40 %**, 20 s; `innate:{ guardian }` → 12 s/−50 %; **`cdOnEnd:true`**: la recarga empieza al acabar, rejuicio §20), `g_lanza` (req 14 → **8**) |
| Salen del libro | `g_mandoble`, `g_embate`, `torbellino` (→ `g_remolino`), `g_provocacion`, `g_u_estandarte` (→ Caudillo); `grito_guerra` pasa a habilidad de talento (c17A) |
| Kit del Berserker (`spec:'berserker'`) | `g_remolino` (canal en marcha), `g_salto` (`recast:{ n:3, win:2, cond:'hit' }`), `g_rajar` (`type:'combo'`), `g_u_furia` (`buff:{ minHpPct:1 }`, `endHealPct 20`) |
| Kit del Guardián (`spec:'guardian'`) | `g_guardia` **nuevo**: `type:'stance'`, `stance:{ a:{ id:'muralla', drPct:15, blockPct:10 }, b:{ id:'ariete', dmgPct:15 } }`, `swapCd 3`, `swapGcd 0` · `g_carga_escudo` **nuevo id** (era `g_t_carga`): `dash` lento (`dashT 1`, `range 8`), `unstoppable`, `drag:true`, `taunt 3` (`g.forceTarget`), `cd 10` · `terremoto` (req 14, `spec`, `windup .4`, `radius 5`, `coef 2.2`, `cost 30`, **`aftershocks:{ n:2, coef:.5, needPlanted:1 }`**) · `g_u_ciudadela` **nuevo**: buff `root`, `drPct 40` (aura 6 m), `taunt 10` cada 1 s, `durS 8`, `cd 90` |
| Kit del Cruzado (`spec:'cruzado'`) | `g_juicio` **nuevo**: proyectil 12 m, `windup .3`, `radius 3`, `coef 1.2`, **`mark:{ id:'juicio', dur:8, detonate:{ by:'@spender', pct:100 } }`**, `cost 20`, `cd 8` · `g_sendero` **nuevo**: `dash` rápido 8 m + campo de sendero 4 s (`coef .3`/s, `healPct 2`/s a aliados) · `g_martillo` (req 14, `spec`, **`type:'charge'`**, `chargeT 1.2`, `minT .15`, `perfect:[.9, 1.15]` (0,25 s, §17.2), `scale:{ coef:[1.4, 3.8], radius:[3, 5] }`, `moveWhileCharging .5`, `perfectBonus:{ dmgPct:25, gauge:{ fervor:1 } }`, `cost 25`) · `g_u_cataclismo` (`spec`, **`type:'charge'`**, `chargeT 2`, `perfect:[1.7, 1.95]` (los mismos 0,25 s, antes de la suelta automática), `scale:{ coef:[5, 12] }`, `radius 6`, campo 6 s, `perfectBonus:{ gauge:{ fervor:3 } }`, `cd 60`) |
| Forja | `GUERRERO_SKILL_FORGE` (formato 2f §2.3) para las 17 habilidades con forja; las variantes con `★` de §4 y §7 |

### 11.2 `js/talents-guerrero.js` y `js/hero-guerrero.js` (nuevo)

- Árboles nuevos: clase `c1…c30`, Berserker `b0…b28`, Guardián `d0…d28`, Cruzado `z0…z28` (**ids nuevos**; hoy son `s0…s17`, `x1…x3`).
- Árboles héroe en `js/hero-guerrero.js`: Titán `t0…t12`, Gladiador `l0…l12`, Caudillo `u0…u12`.
- `GUERRERO_TALENT_SKILLS`: se quedan `g_t_aliento` (c11A) y `g_t_intervencion` (c22A, `slots:['k2']`); entra `grito_guerra` (c17A); entran `g_h_bramido` (t4A), `g_h_desafio` (l4A) y `g_h_estandarte` (u4A), todas de la ranura `2`. Salen `g_t_remolino`, `g_t_temeridad`, `g_t_ira_ciega`, `g_t_bramido`, `g_t_desafio`, `g_t_muro`, `g_t_carga` (→ kit), `g_t_devocion`, `g_t_veredicto` y `g_t_justicia`.
- Selectores nuevos en los `mod`: `@movement` (ranura `1`), `@windup`, `@melee`, `@charge` (habilidades de cargar y soltar) y `@holyZone` (zonas sagradas del Cruzado).
- **Pasiva del Guardián (decisión §17.2):** su `spec.innate` (hoy `{ block:15, threatMult:3, hpPct:5 }`) suma `drCapAdd:15` y `blockCapAdd:10`. Es el único sitio que da esas dos claves: `CAPS` no cambia y, con otra especialización activa, los topes vuelven a 50 y 40 %.

### 11.3 `js/powers-guerrero.js`

- **Prefijo:** `test65a` exige que los poderes propios del Guerrero empiecen por `g_` (`OWN_PREFIX.guerrero = /^g_…/`). Por eso los poderes nuevos son `g_b_*` (Berserker; la etapa 1 los llamaba `b_*`, corregido en esta etapa), `g_d_*` (Guardián), `g_z_*` (Cruzado), `g_ti_*`, `g_gl_*` y `g_cau_*` (árboles héroe). Los de las variantes de forja siguen como `v_*`.
- **Se conservan:** `m_berserk` (powers-common), `g_coraza_hierro`, `g_aura_hermandad`, `g_negacion` (+ llena la Sed); la lógica de `g_vinculo` pasa a `g_d_vinculo` (d18).
- **Salen:** `g_remolino_sediento`, `g_instinto_asesino`, `g_desenfreno`, `g_carnicero`, `g_matanza_eterna`, `g_crit_furia`, `m_aegis` (Muro Inquebrantable), `g_desafio_firme`, `g_martillo_pesado`, `g_reto`, `g_juramento`, `g_muralla_viva`, `g_represalia`, `g_venganza`, `g_bastion_eterno`, `g_mano_sanadora`, `g_devocion_ferviente`, `g_consagracion`, `g_sentencia`, `g_luz_sanadora`, `g_estandarte_grupo`, `g_intercesion`, `g_luz_alba`, `g_martillo_bendito`, `g_martillos_juicio` y `g_ascension`.
- **Nuevos (clase):** los 20 de §6 (`g_tajo_firme` … `g_asalto_total`).
- **Nuevos (especializaciones y héroe):** los que lista «Implementación (por nodo)» de §6, §7 y §9. Variantes: `v_rompefilas`, `v_carnero`, `v_temple`, `v_espinas`, `v_sed_voraz`, `v_empalizada`, `v_escolta_luz`.
- **Cambio de postura:** es un lanzamiento de `g_guardia`; los poderes lo leen en **③ afterCast** con esa habilidad (no hace falta un gancho nuevo). La descarga del Bastión es parte de la mecánica.
- **Copias y repeticiones (corrección §19):** la copia de Señor de la Guerra, la repetición de Montaña Viva, el martillo de Martillo Celestial, el Cataclismo gratis de la Aureola y las lanzas del Gladiador salen con `echo:true`. Un lanzamiento `echo` **no** cuenta como suelta perfecta ni como lanzamiento para otros poderes: no da Fervor, no gasta ni carga el Golpe de Titán, no suma al contador del 3.er Terremoto y no dispara `onPerfect`.
- **Topes por lanzamiento:** Fervor (`perCastMax 1`), Absolución (`icd 2`), Barrido de Escudo (`icd 3`), Escolta y Cabeza de Puente (`icd 10`), Impacto Aturdidor (`icd 4` por enemigo), Guardia Total (`icd 15` desde que se activa), Inexpugnable 4 (`icd 45`), Corazón Indomable 4 (`icd 90`), Aureola 4 (`icd 30`). **Rejuicio (§20):** Asalto Total (`icd 6`, media recarga), Corazón Indomable 3 (`icd 60`), Ritmo de Matanza (`icd 1.5`), Liturgia (`icd 2`), Escolta de Luz (`icd 6` por aliado), Tiro de Arena (`icd 4`), Ovación con Rival normal (`icd 2`, por `p.sustain()`), Vítores (`icd 15`) y Triunfo (`icd 35` desde que se activa; dura 10–15 s). **Ronda 3 (§21):** Carga Reparadora (`icd 6` en la cura, por `p.sustain()`), Estallido de Luz (cada enemigo, como mucho un estallido por lanzamiento) y Golpe Consagrado (2 suelos a la vez como mucho).
- **Zonas sagradas que no se suman (ronda 3, §21):** el daño de las zonas sagradas del Cruzado (sendero, suelos de Golpe Consagrado y suelo del Cataclismo) no se suma: cada enemigo recibe, por segundo, solo el de la más fuerte que pisa. La cura ya no se sumaba (§20); los altares de Altar de Campaña tampoco se suman. Con Tierra Santa y el Caudillo, el Cruzado puede juntar ~11–12 campos (2 suelos, 3–4 senderos, 2 altares, el Cataclismo y hasta 3 Pendones), justo en el tope de 12 por dueño (`FIELD_CAP_PER_OWNER`, que quita el más viejo): antes de los 2 suelos, ~20 (§18, nota 17).
- **Suelo de las definitivas (rejuicio, §20):** entre todos los talentos (Vítores, Peso Acumulado, Gracia del Cielo, Disciplina), la recarga efectiva de una definitiva **no baja del 70 % de su base**: Furia Inmortal ≥ 42 s, Cataclismo ≥ 42 s, Ciudadela ≥ 63 s. Se implementa en `cdReduce` y en `cdRate` sobre `@ultimate`: cada recarga lleva la cuenta de lo reducido y no pasa del 30 %. Los lanzamientos gratis (Corazón Indomable 4, Inexpugnable 4, Aureola 4) van aparte, con su propio `icd`. Con esto, «no morir» con Furia Inmortal queda en ≤ 12/42 + 5/90 ≈ **34 %** del tiempo en el peor caso y ~25 % en la build típica.
- **Furia gastada (rejuicio, §20):** `onResource` marca el origen del gasto; Desenfreno (c26), Señor de la Guerra (c29) y el Golpe de Titán (t0) solo cuentan la Furia **pagada por habilidades**. No cuentan Furia Protectora (c15A: 1 de Furia por cada 0,5 % de la vida), Segundo Aliento ni el drenaje de Danza Carmesí.
- **Reinicios de la movilidad (rejuicio, §20):** un `resetCd` o un `cdReduce` de otro poder (Asalto Total, Finta, Ritmo de Combate) respeta el suelo de 4 s de la Carga de Escudo (d17) y, en el Salto, cuenta como recarga «seguida» para el tope de 2 de Estampida Sin Fin (b27). **Ronda 3 (§21):** el Sendero de Luz tiene el mismo suelo de 4 s, con o sin Vigilia (z21), tras Ligereza, Avance Implacable, Disciplina, Vigilia, Ritmo de Combate y la media recarga de Asalto Total. Con movilidades que se relanzan (el Salto), los efectos de «tu movilidad» —Polvareda, Carga Reparadora (c14), Rugido de Carga (c27) y Asalto Total (c30)— cuentan solo el primer uso de la cadena; Persecución (c21) vale en cada salto porque es el daño del golpe, como Peso Muerto.
- **Habilidades de talento de clase fuera de la barra (rejuicio, §20):** si `g_t_aliento`, `grito_guerra` o `g_t_intervencion` están concedidas (c11A, c17A, c22A) pero no en la barra, el `afterCast` de `g_piel` las lanza al 50 % (`scale .5`, sin salto en Intervención) si su recarga está lista. En la barra rinden al 100 %.
- Ninguno declara `mult` (test67); los «+X %» van al saco aditivo.

### 11.4 Núcleo (`js/game-skills.js`, `js/skill-defs.js`): tipos y claves nuevos

| Tipo o clave | Para qué | Claves | Feedback de interfaz |
|---|---|---|---|
| **`combo`** (tipo genérico nuevo) | Rajar | `steps:[…]`, `comboWin`; estado `p.combo[id]`; `comboStep` (Caída Brutal) | 3 pips en la ranura; el 3.º en oro cuando toca |
| **`recast`** (clave nueva) | Salto Devastador | `recast:{ n, win, cond:'hit' }`, `recastAdd`; evento `onChainEnd` | Pips de saltos restantes y aro de la ventana |
| Canal con efecto al soltar | Estallido Rojo (b22) | `onEnd(inst)` con `inst.released` | Sonido de «suelta» y anillo rojo |
| Canal sin fin | Danza Carmesí (b25) | `drainPerSec`, `stopIf` | El aro late mientras dura |
| Vida mínima | Furia Inmortal | buff `minHpPct`, `endHealPct` | Contorno dorado en la barra de vida |
| Recarga al acabar | Piel de Hierro (rejuicio §20) | `cdOnEnd:true`: la recarga no corre mientras el buff dura; los `cdReduce` solo cuentan durante la recarga | La ranura muestra «puesta» y luego la cuenta atrás |
| Presupuesto de daño evitado | Inquebrantable (c28) | buff `absorbBudgetPct` (40/55/70 % de la vida máxima): suma el daño que la Piel evitó y la rompe al llegar; sin `durS` | Barra fina sobre la vida que se vacía al evitar daño |
| Suelo de las definitivas | Vítores, Peso Acumulado, Gracia del Cielo, Disciplina | `ultCdFloor .7` sobre `@ultimate` (cada recarga, como mucho −30 % por talentos) | — |
| Preparación | c9, Terremoto, Juicio | `windupAdd`, `windupMult`, `windupMove`, `keepPlanted` (Sin Pausa) | La barra de preparación se alarga o se acorta |
| Bloqueo | Escudo Alzado, Aguante de Roca, Escudo por Delante | stat `blockPower` (lo que para un bloqueo: 50 % + blockPower, **tope 90**, rejuicio §20) y `forcedBlocks` (bloqueos seguros fuera de `CAPS.block`) | Chispa azul en el escudo; contador de bloqueos seguros sobre la barra de vida |
| Topes por especialización | Pasiva del Guardián | Stats de especialización `drCapAdd 15` y `blockCapAdd 10` (en `spec.innate` del Guardián) que `damageReduction` y `mitigate` suman a `CAPS.dr` y `CAPS.block` solo para quien los tiene. **`CAPS` no se toca** (decisión §17.2) | — |
| **`charge`** (tipo genérico nuevo) | Martillo de Guerra y Cataclismo (Cruzado) | `chargeT`, `minT`, `perfect:[desde, hasta]`, `perfectWin` (Fe Serena), `perfectDmg` (Golpe Pesado), `scale:{ coef, radius }`, `moveWhileCharging` (Sin Pausa: 1), `perfectBonus`; la esquiva cancela sin coste; evento `onPerfect` para z5, z6, z12, z23, z26 (no lo disparan los lanzamientos `echo` ni el Veredicto) | Barra de carga en la ranura **y** junto al cursor; **destello** y «clang» al entrar en la ventana; otro sonido al soltar perfecto; la racha (z23) en pips |
| **`stance`** (tipo genérico nuevo) | Cambio de Guardia (Guardián) | `stance:{ a:{…}, b:{…} }`, `swapCd`, `swapGcd 0`, `stanceBoth` (Guardia Total) | El icono de la ranura se da la vuelta; marco azul (Muralla) o rojo (Ariete) |
| **Plantado** (estado nuevo) | Bastión, Terremoto, Tierra Viva, Montaña Viva | `p.planted` = 1 s sin caminar ni usar movilidad; `needPlanted` en las habilidades; `planted:true` lo fuerza (Pisotón, Cabeza de Puente) | Anillo bajo los pies cuando estás plantado |
| Avance lento | Carga de Escudo | `dashT` largo + `unstoppable` + `drag` + `taunt` | Estela de polvo; los arrastrados se pegan al escudo |
| **Marca que se detona** | Juicio | `mark:{ id, dur, detonate:{ by, pct } }`, `markUses` (Tribunal) | Marca dorada sobre el enemigo y destello al detonar |

### 11.5 `js/spec-mechanics.js` y `js/ui-gauges-guerrero.js`

- **Sed:** no cambia; `gaugeTuning().sed` suma los números que la barra cita (Reabrir 3, Último Trago 5/10, Sed Saciada 9 s del ápice).
- **Bastión (rehecho):** `bastion:{ max:5, perBlock:1, plantedEvery:2, moveLossEvery:2, drPerCharge:4, lockAfterBurst:5, burst:{ shieldPct:20, coef:3, stagger:30 } }`; `decay` pasa de «1 cada 6 s sin ganar» a «1 cada 2 s caminando»; la descarga se dispara en el `afterCast` de `g_guardia` con 5 cargas y deja el Bastión **5 s sin llenarse** (la barra lo enseña en gris con la cuenta atrás). `viewX` deja de leer `g_muralla_viva` y `g_t_muro` y enseña la postura (Muralla o Ariete) y si estás plantado.
- **Fervor (rehecho):** `fervor:{ max:3, perPerfect:1, perDetonate:1, perCastMax:1, basicHits:3, verdict:{ dmgPct:50, healPct:6, noGain:true }, decayOOC:10 }`; se quita el «+1 por muerte» y «+1 cada 3 impactos de Martillo»; `ready` pasa de `g_t_veredicto` a `g_martillo` (Veredicto listo). El Veredicto no da Fervor ni cuenta como suelta perfecta.
- **Cura del Cruzado:** la pasiva lleva su propia cubeta (`healCapPct 1` por segundo y por receptor), porque `g.heal` va por `healSkill` y no por `p.sustain()`. **Rejuicio (§20):** las curas de zona (sendero y Tierra Santa) comparten otra cubeta, `zoneHealCapPct 4` por segundo y por receptor, y la cura del sendero no se suma entre senderos (como mucho 3 %/s). **Ronda 3 (§21):** el daño de zona tampoco se suma (por enemigo, el de la zona sagrada más fuerte, `zoneDmgNoStack`); Carga Reparadora (c14B) es una cura propia del Guerrero y va por `p.sustain()`, no por `g.heal`.
- `explain()` de las tres barras cambia los nodos que nombra (ver los textos de `mech` en los datos).

### 11.6 Migración de guardados (con la de la Maga: v5 → v6)

1. Todos los árboles del Guerrero son nuevos → se **liberan** todos los puntos (clase, especialización y Paragon) y se recalculan con `t3earnedAt(nivel)`.
2. Se aplica el **Recomendado** de su especialización (`defaultBuild`: Estampida Sin Fin, Guardia Total, Martillo Celestial) hasta donde alcancen los puntos («Migrado: revisa tus talentos»).
3. Barra: `torbellino` → `g_hendidura`; `g_mandoble`, `g_embate` → `g_tajo`; `g_t_remolino`, `g_t_temeridad`, `g_t_ira_ciega` → `g_remolino` (`3`, Berserker); `g_martillo` se queda en `DER` si es Cruzado (si no, `g_hendidura`); `terremoto` se queda si es Guardián (si no, `g_hendidura`); `g_salto` → `1` si es Berserker; `g_t_carga` → `g_carga_escudo` (`1`) si es Guardián; `g_t_intervencion` (`1`) → la movilidad de su especialización; `g_provocacion`, `g_t_bramido`, `g_t_desafio`, `g_t_muro`, `g_t_devocion`, `g_t_veredicto`, `g_t_justicia` → `g_piel` (`2`) salvo que el Recomendado elija una habilidad de talento; insignia (`3`): `g_remolino`, `g_guardia` o `g_juicio`; definitivas: `g_u_furia`, `g_u_ciudadela` o `g_u_cataclismo` según la especialización (`g_u_estandarte` → la de su especialización).
4. Forja: Torbellino II (Ciclón) → Remolino II; Furia Inmortal I/II se conservan con su nuevo nombre; Piel de Hierro II (Bastión) → Inamovible; Martillo, Terremoto y Cataclismo pierden la variante (cambian de forma).
5. Soportes engarzados en habilidades que salen vuelven a `knownSupports`.
6. Aviso único: «Los talentos del Guerrero se rehicieron hasta el nivel 100. Te aplicamos el Recomendado; revísalo con N».
7. Test `tests/test-save-guerrero2g.mjs`: Nv5, 10, 18, 40, 69, 70, 80 y 100 de cada especialización; idempotente; Maga y Arquera intactas.

---

## 12. Banco de balance: impacto y riesgos

| Cambio | Efecto esperado | Calibración |
|---|---|---|
| Furia Inmortal: vida mínima 1 % | Ventana de 10 s sin morir y con +25 % | Los golpes «de muerte segura» de jefe la ignoran |
| Remolino en marcha y Danza Carmesí | Giro largo en manadas | `drainPerSec` 8 para que dure 6–10 s en una manada de 5 |
| Estampida Sin Fin | Cadenas largas en grupos | **En el texto:** como mucho 2 recargas seguidas (unas 3 cadenas, ~15 saltos), contando las de otros poderes (rejuicio: la media recarga de Asalto Total es una «seguida»); 1 Asalto Total por cadena; Impacto Aturdidor, una vez cada 4 s por enemigo |
| **Asalto Total** (rejuicio) | «Si mata, la movilidad se recarga» sin tope: contra enemigos que mueren de un golpe, movilidad → principal gratis +45 % → muerte → movilidad… y esquivaba el tope de b27 y el suelo de d17 | Si mata, la movilidad **recupera media recarga, como mucho cada 6 s**; respeta el suelo de 4 s de la Carga y cuenta como «seguida» en Estampida Sin Fin |
| Golpe de Gracia + Vulnerable | +20 % al jefe para todo el grupo | Vulnerable no se acumula con Guardia Rota ni con Sentencia; a rango 1, 1 s (≈ 37 % del tiempo) |
| Furia Inmortal sin morir | Ritmo de Matanza la bajaba de 60 a ~37 s y el ápice añadía otra gratis: «no morir» ~35 % del tiempo. En el rejuicio: Vítores (4 s por Rival muerto, sin tope) con Muchos Rivales la dejaba en ~14 s (~80 % del tiempo) y Peso Acumulado, en ~35 s | Ritmo de Matanza ya no toca la definitiva; la gratis del ápice, como mucho cada 90 s. **Rejuicio:** Vítores 6 s solo por Rival élite o al Quebrantar, cada 15 s; Peso Acumulado 1 s; **suelo de las definitivas** (≥ 70 % de su base: Furia Inmortal ≥ 42 s). «No morir» ≤ 12/42 + 5/90 ≈ **34 %** en el peor caso y ~25 % en la build típica |
| Salvaciones del Berserker (rejuicio) | Corazón Indomable 3 salvaba una vez por Sed (una cada ~14–19 s) y Negación de la Muerte llenaba la Sed y disparaba otra: dos seguidas | Corazón Indomable 3 **como mucho una vez cada 60 s**; Negación deja la Sed en 50. Salvarse: ≤ 1 vez cada 60 s más 1 cada 120 s |
| Piel de Hierro base 8 s/−40 % | Menos aguante para el Berserker y el Cruzado | El Guardián lo recupera en su pasiva (12 s/−50 %); `TARGETS` de 2e se revisan |
| **Capas de defensa del Guardián** | Muralla −15 %, Bastión −20 %, Piel −50 %, Pendón, Ciudadela −40 %: con el tope genérico del 50 %, la Piel sola lo llenaba y lo demás valía 0 | Topes propios del Guardián (stat de su especialización; los globales no cambian): reducción 65 % y bloqueo 50 %; tres nodos de reducción pasan a bloqueo o cura (§7.2). El banco mide la vida efectiva con 5 enemigos, **con el bloqueo**: **≤ ×3 de la media** (estimado ≈ ×2,85 en Guardia Total, §7.2). **Adelantado en el rejuicio (§20), para todos:** la recarga de la Piel empieza al acabar y Ritmo de Matanza y Liturgia no la tocan: puesta ≈ 50–60 % en el Guardián y ≈ 35–45 % en las builds de daño (antes ~100 % y 85–100 %); un bloqueo para como mucho el 90 % |
| **Bastión** | Una descarga cada ~3 s con 5 enemigos | 5 s sin llenarse tras descargar: una cada ~7,5 s como máximo; Inexpugnable 3 acorta la Piel 6 s (no la recarga), Inexpugnable 4 cada 45 s como mucho, Guarnición sin cargas en la Ciudadela gratis |
| **Posturas** | Con la recarga de 3 s, Guardia Total se renovaba sola cada 3 s | Guardia Total con recarga propia de 15 s y sin contar los cambios hechos mientras dura: como mucho 6 de cada 15 s (40 %) |
| **Vanguardia** | Carga cada ~1 s: escudos de grupo y Bastión sin parar | Suelo de 4 s para la Carga; Escolta y Cabeza de Puente cada 10 s; Pisotón no suma el +% de Asalto Total |
| **Ventana perfecta** | Con Fe Serena y la Mejora, demasiado fácil; sin ellas, frustrante | 0,25 s de base (decisión del plan de implementación, §17.2) y 0,45 s con Fe Serena; el banco simula un jugador que acierta el 60 % (y el 90 % con Fe Serena) |
| **Tribunal** (detonar 2–3 veces) | Mucho daño en área diferido | **En el texto:** 2/2/3 detonaciones con las repeticiones al 40/60/80 %; las repeticiones no dan Fervor |
| **Estallido de Luz** (ronda 3) | Por marca: con la manada marcada (Sello, Edicto 3, Tres Juicios y Tribunal, que no gasta la marca), N detonaciones × N enemigos: daño ∝ N² | **En el texto:** cada enemigo, un estallido por lanzamiento. Con un golpe H y la detonación a ×2,45: N × (2,45 + 1,22) H ≈ 18H contra 5 y ≈ 37H contra 10 (antes ≈ 43H y ≈ 147H). **E3 mide contra 5 y contra 10** |
| **Zonas sagradas** (ronda 3) | Con Tierra Santa, los suelos de Golpe Consagrado (uno por suelta perfecta) vivían hasta 20 s y se sumaban: 5–10 suelos de 40 %/s por enemigo (≈ 200–400 %/s), más que el propio Martillo; Senda Ardiente, igual | **En el texto:** las zonas sagradas no se suman (daño ni cura: vale la más fuerte), Golpe Consagrado deja 2 suelos como mucho y los altares no se suman. Campos del Cruzado: ~11–12, en el tope de 12 por dueño |
| **Vigilia y «tu movilidad»** (ronda 3) | Siempre dentro de una zona, Vigilia dejaba el Sendero en ~2,2–2,6 s: Asalto Total en ~58 % de los Martillos, y Carga Reparadora, Altar y Rugido de Carga cada ~2,5 s. Con el Salto, Carga Reparadora curaba en cada salto (~15 por ciclo en Estampida: ≈ 5 %/s fuera de `p.sustain()`) | El Sendero **nunca baja de 4 s** (como la Carga, d17): Asalto Total en ~1 de cada 3 Martillos. **Carga Reparadora una vez cada 6 s**, por `p.sustain()` (≤ 1 %/s). Con movilidades que se relanzan, c14, c27 y c30 cuentan el primer uso de la cadena |
| **Cura del Cruzado** | Contra 5 marcados, ~20–30 % de vida por segundo al grupo (Veredicto en cada Martillo, Absolución ×5) | Fervor: 1 por lanzamiento; Veredicto 6 % (Aureola: 10 %); pasiva hasta 1 %/s; Absolución cada 2 s; presupuesto completo en §19.3. Objetivo: la build de apoyo ~1,5–2 %/s al grupo y las demás por debajo. **Rejuicio:** Tierra Santa curaba más del doble (sendero sumado, Escolta de Luz sin enfriamiento): cura del sendero sin sumarse (≤ 3 %/s), Escolta de Luz cada 6 s por aliado y **cubeta de zona de 4 %/s por receptor**; objetivo de Tierra Santa: **4–5 %/s con escudos** (§19.3) |
| **Definitivas** | Liturgia, Gracia del Cielo y la Aureola dejaban el Cataclismo cada ~10 s | Liturgia no la toca; Gracia del Cielo 2/4 s por Veredicto; Aureola 4 al 50 % y cada 30 s como mucho. `ultShare` del Cruzado: 12–15 % (máximo 22 %). **Rejuicio:** con Vítores y Gracia del Cielo, el Cataclismo de Luz y Martillo pasaba del 22 %; ahora **ninguna definitiva baja del 70 % de su base** (Cataclismo ≥ 42 s, Ciudadela ≥ 63 s) y Liturgia actúa como mucho cada 2 s (≤ 0,5 s/s) |
| **Gladiador en grupos** (rejuicio) | Con Muchos Rivales todo se encadenaba por la muerte de un Rival: Triunfo permanente, una Lanza gratis por Rival nombrado, 10 % de cura por muerte (~6 %/s) | Triunfo 10–15 s, como mucho cada 35 s (≈ 30–43 % del tiempo); Tiro de Arena cada 4 s; Ovación 10 % por Rival élite o al Quebrantar, 2 % por Rival normal cada 2 s (por `p.sustain()`). Gladiador ≈ Titán ± 5 % en grupos (§9.1: ≤ 10 %) |
| **Quebranto del Sismo** | ~6 nodos que llenaban Quebranto de más con el bloqueo de 15 s | La mitad pasa a premiar al jefe Quebrantado (Réplica Honda, Cambio Certero, Montaña Viva); el banco mide roturas por minuto (máximo 3,2) |
| Reglas de 2e | El Berserker, el que más daño hace a un objetivo (≥ 10 %) | E3 con `balance-bench --seeds 5`; topes del juicio: Guardián ≤ 0,70 y ≤ 0,75 del Berserker; Cruzado ≤ 0,82 |

**Riesgos.** (1) El Salto con cadena puede ser la mejor movilidad del juego. (2) El Guardián de Vanguardia puede juntar demasiados enemigos para el resto del grupo (la provocación de 8 m lo compensa). (3) Cargar y soltar en un juego de ratón: mantener el botón derecho mientras apuntas exige que la barra de carga se vea junto al cursor (E4).

---

## 13. Criterios de aceptación (G1–G17, adaptados)

| # | Criterio | Cómo se comprueba | Diseño (etapas 1 y 2) |
|---|---|---|---|
| G1 | Ningún nodo de clase nombra una habilidad de especialización | Validador + comprobador de la etapa 2 | ✓ |
| G2 | Solo c11A, c17A, c22A y una opción A por árbol héroe conceden habilidades; todas a la ranura `2` | Validador (`fitsSlot` en E2) | ✓ (t4A, l4A, u4A) |
| G3 | Ritmo: ningún árbol se completa; último punto de especialización al Nv70 | Validador | ✓ |
| G4 | Presupuesto: un final al máximo cabe; dos no; **dos a rango 1 no superan a la híbrida** | Validador + revisión de las variantes (§8.4) | ✓ en los 4 árboles; las 3 variantes de dos finales a rango 1, a ±2 % de su híbrida |
| G5 | Paragon sin efecto hasta 31/31 y en pausa si bajas | Mockup (`&lvl=69`) + test en E1 | Mockup ✓ (captura `e2_paragon_gris`) |
| G6 | Formas: círculo, hexágono, cuadrado | Capturas | ✓ |
| G7 | Textos ≤ 120, sin siglas ni «stagger»/«proc», con «antes X» al cambiar un valor; cada elección con «cuál conviene» | Validador + comprobador (432 textos, máx. 120) | ✓ |
| G8 | Builds legales punto a punto (34/31/1 + 10) | Validador | ✓ las 12 |
| G9 | Banco: cada arquetipo gana su escenario; la híbrida ≥ 0,90 de la mejor | `balance-bench --seeds 5` (E3) | Estimación §8.4 |
| G10 | Motion con transform/opacity; reducir movimiento | El del mockup | ✓ |
| G11 | Migración correcta e idempotente | `test-save-guerrero2g` | E5 |
| G12 | `npm test` en verde | `npm test` | E5 |
| G13 | Paragon en pausa | Test | E1 |
| G14 | Hexágono: flotante encima; clic derecho quita el punto | Demos `pick` y `rclick` | ✓ |
| G15 | Categorías: nada dice «Gastadora» | Validador | ✓ |
| G16 | Rejilla común en las tres especializaciones | Validador | ✓ las tres |
| **G17** | **Verbos:** ≥ 3 verbos por especialización, ≥ 3 nodos mecánicos que tocan cada habilidad del kit y verbo principal distinto | Comprobador (nodos por habilidad tocada) + revisión | ✓ Berserker (Remolino 4, Salto 8, Rajar 7, Furia Inmortal 3) · Guardián (Cambio de Guardia 5, Carga de Escudo 8, Terremoto 7, Ciudadela 3) · Cruzado (Juicio 5, Sendero 7, Martillo 8, Cataclismo 6) |
| **G18** | **Sin bucles:** ningún recurso o recarga se realimenta sin tope (Fervor, Bastión, posturas, Carga, definitivas, curas) | Revisión de §19, §20 y §21 + banco (E3) | ✓ en el diseño: cada bucle señalado por el juicio y por las rondas 2 y 3 del rejuicio tiene un tope escrito en el texto del nodo (o, si no cabe en 120 caracteres, en su `impl` y en §11.3: suelo de las definitivas, Furia gastada, reinicios de la movilidad) |

---

## 14. Plan de implementación por etapas

| Etapa | Archivos | Entrega |
|---|---|---|
| E0 · Diseño | `docs/` | **Etapas 1 y 2 (este documento)** |
| E1 · Motor | `js/game-skills.js` (`combo`, `recast`, `charge`, `stance`, plantado, marcas que se detonan, canal al soltar, `minHpPct`, claves de preparación), `js/skill-defs.js`, `js/talents.js` (selectores `@movement`, `@windup`, `@melee`, `@charge`, `@holyZone`) | G3–G5, G8, G13 |
| E2 · Datos | `js/skills-guerrero.js`, `js/talents-guerrero.js`, `js/powers-guerrero.js`, `js/hero-guerrero.js` (nuevo) | G1, G2, G7, G16, G17 |
| E3 · Banco | `tests/balance-bench.mjs` (posturas, plantado, ventana perfecta con acierto simulado) | G9 |
| E4 · Interfaz | `js/ui-talents.js`, `js/hud-model.js` (pips del combo y de la cadena, barra de carga junto al cursor, marco de postura, anillo de plantado), `js/ui-gauges-guerrero.js` (Bastión y Fervor rehechos) | G6, G10, G14, G15 |
| E5 · Cierre | `tests/test-save-guerrero2g.mjs`, `MEMORIA.md`, `sw.js` | G11, G12 |

---

## 15. Mockup, capturas y refutaciones

### 15.1 Uso

`docs/mockups/skills-ux.html?cls=guerrero&view=talents` (como `file:///`). Parámetros: `&res=1366|1920`, `&lvl=5|10|18|40|60|69|70|80|100`, `&spec=berserker|guardian|cruzado`, `&loadout=estampida|hibrido|danza|gracia|guardia|sismo|vanguardia|hibguard|tribunal|celestial|santa|hibcruz`, `&tipnode=cls:c11|spec:d8|hero:t4`, `&tipskill=g_martillo`, `&alt=1`, `&demo=spec|pick|rclick|choice|hoveract|hl|gate|specswap`.

### 15.2 Capturas

En `C:\Users\juanm\AppData\Local\Temp\claude\D--Proyectos-IntentoRPG\6ead5cf3-f7a8-4c53-8c4f-4d18d352840c\scratchpad\talentos-guerrero\`, todas a 1366 y 1920. Las de la etapa 1 llevan el prefijo `final_` (siguen valiendo para el Berserker y la clase); las de la etapa 2, el prefijo **`e2_`**:

| Captura (`e2_…_1366` y `_1920`) | Muestra |
|---|---|
| `e2_guardian_100` | Guardián Nv100 «Guardia Total»: clase con Inquebrantable, Paragon Caudillo 10/10 y el árbol con Guardia Total y el ápice |
| `e2_cruzado_100` | Cruzado Nv100 «Martillo Celestial»: clase con Señor de la Guerra, Paragon Gladiador y el árbol con Martillo Celestial |
| `e2_berserker_danza_100` · `e2_berserker_gracia_100` | Las dos builds del Berserker que faltaban, con su Paragon (Gladiador y Titán) |
| `e2_vanguardia_100` · `e2_santa_100` | Cabeza de Puente (Titán) y Tierra Santa (Caudillo) |
| `e2_libro_guardian` · `e2_libro_cruzado` | Libro: kit base, kit de la especialización, barra real y la pasiva (chip «Piel de Hierro: 12 s y −50 %» en el Guardián) |
| `e2_eleccion_d8` · `e2_eleccion_z9` | Hexágonos abiertos **encima** del nodo con su tooltip y «cuál conviene» |
| `e2_heroe_t4` · `e2_heroe_u4` | Elecciones del Paragon con la opción que concede habilidad (cuadrado, HABILIDAD): Bramido de Titán y Estandarte de Guerra |
| `e2_tipskill_martillo` · `e2_tipskill_guardia` | Forja del Martillo de Guerra (cargar y soltar) y de Cambio de Guardia (posturas) |
| `e2_selector` | Selector con la fila «Clase» y las tres tarjetas sin ESBOZO |
| `e2_paragon_gris` | Nv69 (Cruzado 30/31): Paragon en gris con Gladiador y Caudillo y su nodo clave |
| `e2_hibguard_alt` · `e2_hibcruz_alt` | Las híbridas del Guardián y del Cruzado con `Alt` (etiquetas mecánica y número): sin ápice ni final |

**Corrección de la etapa 2 (§19):** 21 capturas nuevas con el prefijo **`e2fix_`**, a 1366 y 1920 (42 archivos). Las de tooltips de la pasiva y de las barras se tomaron por CDP (`cdp-shot.mjs` con un guion que pasa el ratón por la ficha), porque el mockup no tiene parámetro para ellas.

| Captura (`e2fix_…_1366` y `_1920`) | Muestra | Revisión |
|---|---|---|
| `e2fix_guardian_100` · `e2fix_sismo_100` · `e2fix_tribunal_100` · `e2fix_celestial_100` | Las cuatro builds tocadas por el juicio a Nv100, con su Paragon (Caudillo, Titán, Caudillo, Gladiador con Finta) | 34/34, 31/31 y 10/10; nada se desborda |
| `e2fix_tip_d25` · `e2fix_tip_d25_r1` | Guardia Total a rango 3 («6 s; vuelve a los 15 s. Posturas +30 %») y a rango 0 en la híbrida (el siguiente rango dice «3 s») | El escalado por rango se lee en el tooltip |
| `e2fix_tip_z25` · `e2fix_tip_z25_r1` | Tribunal a rango 3 («3 veces, la 2.ª y la 3.ª al 80 %») y el rango 1 en la híbrida («2 veces, la 2.ª al 40 %») | Ídem |
| `e2fix_tip_b27` · `e2fix_tip_d28` | Estampida Sin Fin con «como mucho 2 seguidas» e Inexpugnable con «acorta 6 s» y «como mucho una vez cada 45 s» | Textos completos, sin cortes |
| `e2fix_tip_d1` | Escudo Alzado: «Tus bloqueos paran un 80 % del golpe (antes 50 %)» | Etiqueta «número», como antes |
| `e2fix_tip_c9` | c9 abierto en el Cruzado: Golpe Pesado (+25 % a las sueltas perfectas) y Sin Pausa (plantado y cargar sin frenarte); «Habilidades que toca» ya incluye Martillo de Guerra y Cataclismo | El hexágono flotante queda encima del nodo |
| `e2fix_tip_l12` · `e2fix_tip_u0` | Triunfo («con 5 de Gloria o al Quebrantar a tu Rival») y el Pendón («cada 15 s… (12 s)») | — |
| `e2fix_libro_guardian` · `e2fix_libro_cruzado` | El libro con la ficha «Pasiva» y la barra real | La barra real sigue con textos de hoy (§18, nota 1) |
| `e2fix_pasiva_guardian` · `e2fix_pasiva_cruzado` | Tooltip de la pasiva: topes 65 % y 50 % del Guardián; tope de 1 %/s de la pasiva del Cruzado | Texto completo |
| `e2fix_mech_bastion` · `e2fix_mech_fervor` | Tooltip de la mecánica: «Tras descargar, 5 s sin llenarse»; «como mucho 1 por lanzamiento» y «El Veredicto no da Fervor» | La columna «Descargar» del Bastión es larga a 1366, pero cabe |

**Después de las decisiones del orquestador (§17.2):** los textos de las dos pasivas y de las barras del Bastión y del Fervor se acortaron a ≤ 120 caracteres con los mismos números (en el Bastión, «Cada carga: −4 %» pasó a «Generar» y «Tras descargar, 5 s sin llenarse», a «Pérdida»). Las capturas `e2fix_pasiva_*` y `e2fix_mech_*` muestran el texto anterior, más largo; no se repitieron porque el texto nuevo es más corto en todas las columnas.
| `e2fix_hibcruz_alt` | Luz y Martillo con `Alt`: sin final ni ápice | — |

Lo que se vio en la revisión y no es de los datos: el tooltip de los finales del mockup dice «dos solo a rango 1, dejando casi todo lo demás», que ya no es exacto (dos a rango 1 cuestan 2 puntos más que los penúltimos; lo que se pierde es potencia, no el resto del árbol). Queda en §18, nota 12.

### 15.3 Refutaciones de la etapa 1 (resumen)

Tres rondas (nombres, opciones claramente superiores, si la clase sirve a las tres): renombres (Inamovible, Caída Atronadora, Sed Voraz…), Sin Pausa y Rugido de Carga rehechos, Estampida Sin Fin con recarga y **«tu movilidad»** en lugar de «la Embestida» en el camino derecho de la clase.

### 15.4 Refutaciones de la etapa 2 (tres rondas)

**Ronda 1 (diseño: ¿algún texto miente?, ¿alguna opción es claramente superior o inútil?).**

| Crítica | Cambio |
|---|---|
| (Bloqueante) **Curtido (c4)** decía «Piel de Hierro dura 11 s (antes 8 s)»: con la pasiva del Guardián la base es 12 s, así que el texto mentía | «Piel de Hierro dura 3 s más (8 → 11 s; con el Guardián, 12 → 15 s)» |
| El **Juicio** solo lo detonaba el Martillo de Guerra (Nv14): del Nv10 al 13 la marca no servía para nada | «Tu siguiente principal la detona»: vale la Hendidura y la Lanza desde el Nv10 |
| **Fuerza del Bastión** daba +30 % de daño a un tanque con 5 cargas: competía con el Berserker | +4 % por carga (5 cargas: +20 %) |
| **Triunfo** (final del Gladiador) «golpea dos veces»: repetía la idea de Señor de la Guerra | Triunfo: +25 % de daño y principales a mitad de coste; cada Rival que matas lo alarga 2 s |
| Tres nombres chocaban con la Arquera (Marca Duradera, Galope, Cielo Abierto) y había raíces repetidas (cuatro «Tierra», seis «Pesado», cinco «Hierro»…) | Marca Indeleble, Tropel, Columna Ancha y los renombres de §10 |
| Icono de copo de nieve para Cambio de Guardia y Guardia Viva (iconos viejos de «Guardia Alta») | Iconos de escudo, muralla de escudos y puño |

**Ronda 2 (las builds y la interfaz, con capturas a 1366 y 1920).**

| Crítica | Cambio |
|---|---|
| (Bloqueante) **c9 quedaba muerto para el Cruzado**: está en su camino central y el Cruzado no tenía ningún golpe con preparación (§16.3 de la etapa 1: c9 no toca las cargas) | El **Juicio se prepara 0,3 s**: c9 lo acelera (Sin Pausa) o lo vuelve pesado (Golpe Pesado), sin romper la regla |
| Tres builds (Cabeza de Puente, Roca y Escudo, Tribunal) elegían la habilidad héroe de la ranura `2` y sacaban de la barra la Piel de Hierro (en el Guardián, tirando su pasiva) | Esas tres eligen la opción pasiva (Piel de Montaña, Abanderado); Golpe de Gracia pasa de Grito de Guerra a Ira Contenida por lo mismo. Las tres habilidades héroe siguen usadas por una build cada una |
| `test65a` exige `g_` en los poderes del Guerrero: los `b_` de la etapa 1 y los `d_`/`z_` nuevos fallarían | Poderes `g_b_*`, `g_d_*`, `g_z_*`, `g_ti_*`, `g_gl_*`, `g_cau_*` (§11.3) |
| El libro dibuja la barra **real** del juego (`ui-gauges-guerrero.js`): el Bastión dice «−5 % de daño (Muralla)» y el Fervor «Veredicto Final listo», textos de hoy | No es de los datos: queda para E4 (§18) |
| El desplegable de configuración recorta el nombre de las híbridas («Híbrido Guardia-Sismo · Roca y…»), como en la Maga | Menor; queda en §18 (ensanchar o poner `title`) |
| ¿Se desborda algo? Tooltips, hexágonos flotantes, Paragon en gris, selector y libro | No, ni a 1366 ni a 1920 |

**Ronda 3 (de fondo: ¿cumple lo que pidió el dueño?).**

| Crítica | Cambio |
|---|---|
| El **Golpe de Titán** caía en «tu siguiente golpe»: con suerte, un Tajo (poco valor y nada de sensación de gigante) | Ahora es «tu siguiente **principal**» (y el Bramido también) |
| **Montaña Viva** era el final más flojo («cada 3.er Terremoto es gratis»): no cambiaba la rotación | «Cada 3.er Terremoto **se repite** gratis»: dos golpes grandes seguidos sin moverte, que premian el plantado |
| ¿El Guardián recupera el aguante sin otra defensa en el kit? | Sí: pasiva (Piel 12 s/−50 %), Muralla, Bastión y la Ciudadela como definitiva; la ranura `2` sigue siendo la Piel de Hierro en sus 4 builds |
| ¿El Cruzado es sanador puro? | No: sus curas salen de golpear (pasiva, Veredicto, Absolución) o de zonas que también dañan; Tierra Santa es la build de apoyo y su daño contra 5 sigue en 0,92 (0,93 tras el rejuicio, §20; 0,90 tras la ronda 3, §21) |
| ¿Comparten verbo principal? | No: encadenar en marcha · plantado y posturas · cargar y soltar. Cargar y soltar aparece solo en el Cruzado; la preparación (Juicio, Terremoto) es secundaria en los dos |
| ¿Los árboles héroe sirven a sus dos especializaciones? ¿El Abanderado (Pendón que te sigue) choca con el plantado del Guardián? | Sí sirven (§9.1). No choca: plantado, el Pendón queda igual a tu alrededor; lo que se pierde es ponerlo donde pelea el grupo, que es la opción A (Estandarte de Guerra) |

### 15.5 Validador y comprobador (al cierre de la corrección de la etapa 2)

- `node docs/mockups/data/validar-talentos.mjs guerrero` → **Todo en regla: 0 errores y 0 avisos** (clase 75 % mecánica; Berserker 86 %, Guardián 95 %, Cruzado 90 %; las 12 builds 34/34 y 31/31 con Paragon 1 + 10; todos los iconos existen).
- Comprobador de la etapa 2 (`check-etapa2.mjs`, en el scratchpad, fuera del repo): 0 nombres repetidos con la Maga y la Arquera, **432 textos** (el más largo, 120), sin siglas, sin voseo ni «vosotros» (datos y documento), G1 sin fallos y G17 con ≥ 3 nodos mecánicos por habilidad del kit en las tres especializaciones.
- Tras las decisiones del orquestador (§17.2): validador oficial otra vez en **0 errores y 0 avisos**; comprobador en verde. Además, las pasivas y los textos de las barras (que el comprobador no miraba) quedan **≤ 120**: antes, 5 pasaban (la descarga del Bastión llegaba a 194), como ya cumplían la Maga y la Arquera.

---

## 16. Lo que la etapa 2 respetó de la etapa 1

| Regla de la etapa 1 (§16 de su versión) | Cómo se cumplió |
|---|---|
| Verbos del Berserker no son el principal de otra | Guardián = plantado y posturas; Cruzado = cargar y soltar. El Remolino Anclado (plantado) es forma de la forja, no un bonus por estar quieto |
| Verbos propuestos (Guardián: plantado, posturas, avance pesado, provocación; Cruzado: cargar y soltar, marcas, zonas) | Todos en los kits, con tipos nuevos `stance` y `charge`, el estado «plantado» y marcas que se detonan (§11.4) |
| El árbol de clase decide por ellos («tu movilidad», c9 solo preparación, c16B, Piel de Hierro para todos) | Carga de Escudo y Sendero de Luz son «tu movilidad»; ningún kit trae otra defensa. **c9 se aparta a propósito de la regla** en la corrección (§19): con solo la preparación del Juicio daba ~1 % al Cruzado, así que ahora también toca las cargas (la suelta perfecta y caminar al cargar) |
| Roles (Guardián tanque; Cruzado apoyo con martillo, no sanador puro) | §7.2 y §7.3; la etiqueta «Apoyo» de `talents-v2-comun.js` no se tocó |
| Destino de las habilidades que salieron | §3.1 (Martillo → Cruzado; Terremoto → Guardián; Cataclismo → Cruzado; Estandarte → Caudillo; Carga de Escudo → Guardián; Provocación, Grito Desafiante, Muro de Escudos, Aura, Veredicto Final y Martillo de Justicia se funden en otras piezas) |
| Ranura `2` | Solo t4A, l4A y u4A añaden habilidad; ninguna build del Guardián saca la Piel de Hierro |
| Ids y prefijos (`d`, `z`; héroe `t`, `l`, `u`) | Usados; ningún id repetido en la clase |
| Nombres ocupados | 0 repetidos (comprobador) |
| Árboles héroe y `heroNodes` | Rellenos los tres y los Paragon de las 12 builds |
| Builds del Berserker que faltaban | Danza Carmesí (con Inquebrantable) y Golpe de Gracia |
| Mockup | Fuera `sketch:true` y los textos «(texto actual del juego)»; validador en 0 errores |

---

## 17. Decisiones del dueño y preguntas

### 17.1 Decisiones delegadas y cómo se aplicaron

| Decisión | Dónde |
|---|---|
| **Furia Inmortal** con su nueva identidad: la vida no baja del 1 % y al acabar te curas un 20 %; **Frenesí** es la variante que recupera la velocidad | §7.1 (kit del Berserker), datos `g_u_furia` |
| La **Lanza Arrojadiza** va en el kit base; el **Torbellino** se funde con el Remolino Sangriento; el **Martillo de Guerra** pasa al Cruzado | §4, §3.1, §7.3 |
| **Piel de Hierro** base de 8 s y −40 %; el **Guardián recupera el aguante en su propio kit** | Pasiva del Guardián: Piel 12 s y −50 % (chip dorado en la forja), Muralla y Bastión |
| Los nodos de movilidad hablan de **«tu movilidad»** (la ranura `1`) | Árbol de clase (§6); Carga de Escudo y Sendero de Luz los reciben (§6.1). Para la Maga, ver §18 |
| **Árboles héroe:** Titán (Berserker y Guardián), Gladiador (Berserker y Cruzado) y Caudillo (Guardián y Cruzado) | §9 |
| **Verbos principales:** Berserker = encadenar en marcha; Guardián = plantado y posturas; Cruzado = cargar y soltar | §5.2 |

### 17.2 Preguntas de la etapa 2 y decisiones del orquestador (2026-10-21)

El orquestador respondió las siete preguntas por delegación del dueño. Dos cambian el diseño (la 2 y la 6); las demás confirman lo que ya estaba.

| # | Pregunta | Decisión | Qué cambió y dónde |
|---|---|---|---|
| 1 | **Bastión:** caminar te quita 1 carga cada 2 s (el castigo del «plantado»). ¿Así, o que al moverte solo deje de llenarse? | **Sí: el Bastión se pierde al caminar** (1 carga cada 2 s; la Carga de Escudo no la gasta) | Nada: ya era el diseño (§7.2, barra `moveLossEvery 2`, §11.5). El texto de la barra se acortó a ≤ 120 sin cambiar números |
| 2 | **Ventana perfecta del Cruzado:** 0,2 s de base. ¿Esa dificultad, o la abrimos a 0,3 s? | **Base de 0,25 s** (decisión ya tomada en el plan de implementación, `docs/paso2-implementacion.md`: término medio entre 0,2 y 0,3 s para tolerar la latencia de la web) | Martillo de Guerra: ventana **0,9–1,15 s** (antes 0,95–1,15 s); con Mano Ágil, 0,6–0,85 s. Cataclismo: 1,7–1,95 s. **Fe Serena (z19): 0,35/0,45 s** (antes 0,3/0,4 s; +0,1 s por rango). El ápice (Aureola 3) sigue adelantando 0,15 s. §2.2, §5.2, §7.3, §8.3, §11.1, §12 y datos (`z19`, forja M del Martillo) |
| 3 | **Rol del Cruzado:** el selector dice «Apoyo» (`talents-v2-comun.js`). ¿Lo cambiamos a «Martillo y apoyo»? | **Sí a «Apoyo»:** la etiqueta se queda como está | Nada: `talents-v2-comun.js` no se toca. El texto ya explica que es apoyo con martillo y que cura golpeando (§7.3) |
| 4 | **Principal del Guardián:** Terremoto (área, preparación y réplicas plantado) en lugar de un Golpe de Escudo de un objetivo | **Sí: Terremoto** es la principal del Guardián | Nada (§7.2) |
| 5 | **Caudillo:** el Estandarte de Guerra pasa a habilidad de la ranura `2` y el Pendón automático es su mecánica | **Sí: Estandarte de Guerra** es la habilidad del Caudillo (u4A) | Nada (§9.4, §3.1) |
| 6 | **Defensa del Guardián (§19.2):** topes más altos (reducción 65 %, bloqueo 50 %) o la Piel en una capa aparte | **Opción a, como tope propio:** `CAPS.dr` 50 y `CAPS.block` 40 **no se suben para todos**. El Guardián recibe un **aumento de tope en su pasiva innata** (reducción hasta 65 % y bloqueo hasta 50 %, solo para él), declarado como **stat de especialización** | Pasiva en los datos: «Solo para ti, la reducción de daño llega al 65 % y el bloqueo al 50 %»; el chip dice «topes 65 y 50 %». `drCapAdd 15` y `blockCapAdd 10` en `spec.innate` del Guardián (§7.2, §11.2, §11.4, §12, §19.2) |
| 7 | **Finales que escalan por rango (§19):** ¿llevamos el patrón del Guerrero a la Maga y la Arquera? | **No por ahora:** el patrón se queda en el Guerrero; la Maga y la Arquera no se tocan | Queda anotado como **posible ajuste de coherencia** entre clases (§18, nota 10) |

### 17.3 Preguntas abiertas

Ninguna del diseño. Lo que queda para el integrador está en §18.

---

## 18. Notas para el integrador

1. **Barras reales en el libro:** el mockup dibuja la barra del juego (`js/ui-gauges-guerrero.js`); hoy el Bastión dice «−5 % de daño (Muralla)» y el Fervor «Veredicto Final listo». En E4, `explain()` y los textos de la barra deben salir de `gaugeTuning()` rehecho (§11.5).
2. **Desplegable de configuración:** recorta los nombres de las híbridas (como en la Maga). Sugerencia: ensancharlo o poner el nombre completo en `title`.
3. **Prefijo de poderes (`test65a`):** los datos ya usan `g_b_*`, `g_d_*`, `g_z_*`, `g_ti_*`, `g_gl_*`, `g_cau_*`; la etapa 1 decía `b_*` en el documento y se corrigió.
4. **«Tu movilidad» en la Maga:** la decisión del dueño (nodos de movilidad que hablan de la ranura `1`) se aplicó al Guerrero; la build «Lluvia de Fuego» de la Maga sigue llevando Paso del Vacío con la Estela Ígnea en la `1` (§15.3 de la etapa 1). No se tocó la Maga: queda para su E2.
5. **Validador:** no comprueba el porcentaje de «mecánica» de los árboles héroe ni que una build no saque de la barra la defensa de su pasiva (aquí se revisó a mano, §15.4). Podría añadirse como aviso.
6. **Tipos nuevos sin pintar en el mockup:** el mockup no anima la barra de carga, la ventana perfecta ni el cambio de postura; el libro solo los describe. Es trabajo de E4 (`hud-model.js`).
7. **Validador: dos finales a rango 1.** Hoy da por buena una build con dos finales a rango 1 (cuesta 28 ≤ 31). Sugerencia: un aviso «dos finales a rango 1» y que `--tablas` liste esa variante junto a la híbrida para que el banco la mida. Las tres variantes del Guerrero se comprobaron a mano con una copia de los datos (§8.4).
8. **Validador: topes de defensa.** Sería útil un aviso cuando la suma de reducciones de una build pasa de `CAPS.dr` (o de su tope por especialización) con la defensa principal puesta: así se ven los nodos que el tope anula.
9. **Motor (E1):** claves que pide la corrección: `drCapAdd` y `blockCapAdd` (topes por especialización en `damageReduction` y `mitigate`; solo las da `spec.innate` del Guardián y `CAPS` no cambia, §17.2), `blockPower` y `forcedBlocks`, `echo:true` en los lanzamientos copiados (no cuentan para otros poderes), `perCastMax` del Fervor, `lockAfterBurst` del Bastión, la cubeta de cura de la pasiva del Cruzado (`healCapPct`) y los `icd` de §11.3.
10. **Maga y Arquera (posible ajuste de coherencia):** tienen el patrón de finales «mecanismo entero a rango 1 + % plano» que el juicio señaló en el Guerrero. El orquestador decidió (§17.2, pregunta 7) que los finales que escalan por rango se quedan en el Guerrero y que la Maga y la Arquera no se tocan ahora. Si el banco (E3) muestra que dos finales a rango 1 dominan a la híbrida en esas clases, este es el ajuste que hay que aplicarles.
11. **El juicio llegó cortado:** el texto se interrumpe en el hallazgo del Berserker («… y Impacto»). Se aplicó lo visible y se completó con la lectura más probable (Impacto Aturdidor encadenando aturdimientos en grupos); si el juez pedía otra cosa, conviene revisarlo.
12. **Tooltip de los finales en el mockup:** dice «dos solo a rango 1, dejando casi todo lo demás». Con los finales que escalan por rango, sería más exacto «dos a rango 1 caben, pero cada uno da ~⅓ de su mecanismo» (texto del HTML, que esta tarea no toca).
13. **El rejuicio también llegó cortado** en su último hallazgo medio («Guardián §7.2 «Aguante estimado» con d15B Aguante de Roca, d1 Escudo Alzado y la pasiva (bloqu…»). Se aplicó la lectura más probable (el aguante no contaba el bloqueo): estimación rehecha con el bloqueo y Aguante de Roca hasta el 90 % (§20, hallazgo 11). Si el juez pedía otra cosa (por ejemplo, tocar Escudo Alzado o el tope de bloqueo del Guardián), conviene revisarlo.
14. **Motor (E1), claves del rejuicio:** `cdOnEnd` (Piel de Hierro: la recarga empieza al acabar), `absorbBudgetPct` (Inquebrantable), `ultCdFloor .7` (suelo de las definitivas en `cdReduce`/`cdRate` sobre `@ultimate`), `zoneHealCapPct 4` (cubeta de zona del Cruzado), tope 90 de `blockPower`, el origen del gasto en `onResource` (solo la Furia pagada por habilidades cuenta como gastada) y las habilidades de talento de clase que salen con `g_piel` al 50 % si no están en la barra (§11.3).
15. **Validador: suelo de las definitivas.** Podría avisar cuando la suma de reducciones de recarga de una definitiva que dan los talentos de una build pasa del 30 %, como los avisos sugeridos en las notas 7 y 8.
16. **Observaciones de la ronda 3 que no eran altos (pendientes, §21.2):** (a) en «Tierra Santa», el Grito de Guerra (c17A) no sale, porque solo sale con Piel de Hierro y la ranura `2` es del Estandarte de Guerra; Ira Contenida (c17B) devolvería ~+2,8 % (0,83/0,93) sin tocar la barra; (b) Intervención (c22A) sigue dominada por Hermandad de Armas; (c) el Guardián de Guardia Total probablemente pasa el ×3 de aguante, porque Furia Protectora (pagar el 20 % del daño con Furia) y los debilitamientos de los enemigos (Línea de Batalla y Guardia Opresiva; en otras builds, Temblor o Rugido de Carga) quedan fuera de su tope de reducción. El juez no los marcó como bloqueantes ni altos; E3 debe medir (c) con el bloqueo y esas capas.
17. **Campos por dueño:** con Tierra Santa y el Caudillo, el Cruzado junta ~11–12 campos (2 suelos de Golpe Consagrado, 3–4 senderos, 2 altares, el Cataclismo y hasta 3 Pendones), en el tope `FIELD_CAP_PER_OWNER = 12` de `js/field-entities.js`, que quita el más viejo. Conviene que E1 no deje que un suelo o un sendero quite un Pendón o el Cataclismo (por ejemplo, un tope por tipo de campo).
18. **Motor (E1), claves de la ronda 3:** daño de zona sagrada que no se suma (`zoneDmgNoStack`: por enemigo y por segundo, la zona más fuerte), `max 2` en los suelos de Golpe Consagrado, suelo de 4 s del Sendero en `cdReduce`/`cdRate`/`resetCd` (como `d17`), `icd 6` y `p.sustain()` en Carga Reparadora, «primer uso de la cadena» para los efectos de `@movement` con `recast` (c14, c27, c30) y un estallido por enemigo y lanzamiento en Estallido de Luz. E3: escenario **contra 10** además de contra 5.

---

## 19. Juicio y correcciones de la etapa 2

El juicio llegó como una lista de 15 hallazgos (puntaje 5): **2 bloqueantes, 4 altos y 9 medios**, sin bajos. Se corrigió todo lo bloqueante y lo alto, y lo medio salvo una parte de un hallazgo (el 7, con su motivo). El texto llegó cortado en el hallazgo 15 (§18, nota 11). Todas las correcciones están en los datos (`talents-v2-guerrero.js`: texto e `impl` de cada nodo), y las tablas de §6, §7 y §9 y las listas de §8 se regeneraron de ellos.

### 19.1 Hallazgo, decisión y cambio

| # | Severidad · dónde | Hallazgo (resumen) | Decisión | Cambio |
|---|---|---|---|---|
| 1 | Bloqueante · Cruzado, build «Tribunal» | +1 de Fervor por cada detonación sin tope: contra 5 marcados, cada Martillo era un Veredicto (y además «cargado al instante»); la Aureola 4 daba un Cataclismo cada ~5–6 s; Absolución ×5 y Veredicto Generoso al 20 % a todos: ~20–30 % de vida por segundo al grupo | **Aplicado**, con un tope algo más estricto que el propuesto | Fervor: **1 por lanzamiento como mucho**, sume suelta perfecta o detonación (Voto Sagrado, barra y `perCastMax 1`). El Veredicto **no da Fervor ni cuenta como suelta perfecta**: uno cada ~4,5 s. Veredicto: cura un 6 % (Aureola 2: 10 %, antes 10 y 20 %). Veredicto Generoso: el más herido sigue con su cura y **el resto, un 3 %**. Absolución: **una vez cada 2 s**. Aureola 4: **cada 8 Veredictos, un Cataclismo al 50 %, como mucho uno cada 30 s**. Tribunal: contra 5, 1,00 en su especialización y 0,80 del Berserker; apoyo «medio» de verdad (§19.3) |
| 2 | Bloqueante · Guardián, Inexpugnable 3–4, Inquebrantable, Guarnición | El Bastión se llenaba en ~2,5 s y se descargaba cada ~3 s; cada descarga recargaba la Piel, escudaba al 20 % y cada 3, una Ciudadela gratis (~44 % del tiempo); Guarnición realimentaba el bucle: grupo inmortal | **Aplicado** | **Tras descargar, el Bastión pasa 5 s sin llenarse** (una descarga cada ~7,5 s como máximo). Inexpugnable 3: la descarga **acorta 6 s** la Piel (antes la recargaba). Inexpugnable 4: **como mucho una vez cada 45 s**. Guarnición: **sin cargas en la Ciudadela gratis**. Tambor de Guerra: hasta 2 s por Terremoto (antes 3). Banco: vida efectiva con 5 enemigos ≤ ×3 de la media (§12) |
| 3 | Alta · Guardián, capas de defensa contra `CAPS.dr` 50 y `CAPS.block` 40 | La Piel (−50 %) llenaba sola el saco de reducción: Muralla, Bastión, Determinación, Aguante de Roca, Guardia Viva, Escudo por Delante y Pendón de Defensa valían 0; el bloqueo llegaba al tope con pasiva + Escudo Alzado + Muralla y d1 quedaba muerto | **Aplicado** (opción a, con lo mejor de la b; ver §19.2) | Pasiva: **reducción hasta el 65 % y bloqueo hasta el 50 %** (solo el Guardián). **Escudo Alzado** pasa a «tus bloqueos paran un 60/70/80 % (antes 50 %)». **Escudo por Delante**: bloqueos seguros (2/4) al llegar. **Aguante de Roca**: con 5 cargas, nada te tumba y **tus bloqueos paran todo el golpe**. **Guardia Viva**: +daño y **te cura un 1/2/3 %** por cambio (antes −2/4/6 % de daño recibido). Tabla de capas en §7.2 y aguante revisado con los topes reales (§8.4) |
| 4 | Alta · Guardián, Vanguardia | La Carga llegaba a ~1 s de recarga (Paso Pesado + Avance Implacable + Avalancha); Escolta escudaba al grupo cada ~2 s; Cabeza de Puente llenaba el Bastión en cada Carga; Pisotón + Asalto Total = Terremoto instantáneo, gratis, plantado y +45 % | **Aplicado** | Avalancha: 1 s por enemigo, **hasta 2 s, y la Carga nunca baja de 4 s**. Escolta y el llenado de Cabeza de Puente: **una vez cada 10 s** (Cabeza de Puente da 2/3/5 cargas por rango). Pisotón: **sin el bonus de Asalto Total** (el Terremoto sale gratis, pero sin el +45 %). Tabla de la Vanguardia recalculada en §8.2 |
| 5 | Alta · los 9 finales de especialización | Cada final daba su mecanismo entero a rango 1; dos finales a rango 1 (2 puntos) dominaban a la híbrida y, en contenido mixto, a las puras | **Aplicado** en los datos; el aviso del validador queda para el integrador (no se puede tocar el validador) | **El mecanismo escala por rango:** Danza Carmesí hasta 6/10/20 s; Golpe de Gracia copia al 30/45/60 % y Vulnerable 1/2,5/4 s; Estampida Sin Fin recupera 4 s / 8 s / toda la recarga; Guardia Total 3/4,5/6 s; Montaña Viva repite al 50/75/100 %; Cabeza de Puente +2/3/5 cargas; Tribunal 2/2/3 detonaciones al 40/60/80 %; Martillo Celestial eco al 30/45/60 %; Tierra Santa hasta 8/14/20 s. En la clase, Inquebrantable dura 3/4/5 golpes. Las tres variantes con dos finales a rango 1 se validaron y entran en §8.4 (a ±2 % de su híbrida) |
| 6 | Alta · Guardián, Guardia Total + Guardia Viva + Barrido | Con la recarga de 3 s, cambiar en 0, 3 y 6 s renovaba Guardia Total para siempre: dos posturas permanentes, Guardia Viva a 3 pilas y un Barrido gratis cada 3 s; cambiar dejaba de ser una decisión | **Aplicado** (las dos opciones propuestas a la vez) | Guardia Total: **vuelve a los 15 s** de activarse y **los cambios hechos mientras dura no cuentan**: como mucho 6 de cada 15 s. Barrido de Escudo: **una vez cada 3 s** (con Guardia Ligera ya no da un barrido cada 1,5 s). Abrir Guardia Total pasa a ser un momento (antes de la descarga o del golpe fuerte del jefe) |
| 7 | Media · Cruzado, Liturgia + Gracia del Cielo + Aureola 4 | Liturgia (~0,85 s/s con Fe Serena), Gracia del Cielo (6 s por Veredicto) y la Aureola 4 dejaban el Cataclismo cada ~10 s: más del 22 % del daño a un objetivo | **Aplicado en parte** | Liturgia **ya no acorta la definitiva**. La Aureola 4 es otra pieza (cada 8 Veredictos, al 50 %, cada 30 s como mucho; no da Fervor). **Gracia del Cielo sigue tocando el Cataclismo** (2/4 s por Veredicto, antes 3/6): es su único efecto y el nodo «común: la definitiva» del árbol; quitárselo lo dejaba muerto. Con el Veredicto cada ~4,5 s, el Cataclismo baja de 60 a ~32 s: `ultShare` estimado 12–15 % (máximo 22 %) |
| 8 | Media · Gladiador contra jefes | Gloria, Sangre en la Arena, Triunfo, Vítores y Ovación dependían de que muriera tu Rival; con Duelo a Muerte, contra un jefe, nunca; Tiro de Arena pedía la Lanza, que no está en la barra del Cruzado (ni del Berserker) | **Aplicado** | **Gloria** también sube con cada 20 % de vida que pierde tu Rival. **Sangre en la Arena**: +5 % de daño de crítico por punto de Gloria. **Ovación** y **Vítores** (4 s) también al Quebrantar al Rival. **Triunfo**: con 5 de Gloria **o al Quebrantar a tu Rival**. **Tiro de Arena** y **Retirada Táctica**: arrojas tú la Lanza gratis (al nombrar Rival y al esquivar, cada 6 s), sin tenerla en la barra. Paragon de «Martillo Celestial»: **Finta** en lugar de Tiro de Arena |
| 9 | Media · árboles héroe, Titán frente a Caudillo | El Golpe de Titán (+60 %, Aplastar +120 %, Mole hasta +60 %) daba ~+30–50 % al Guardián y el Caudillo ~+15 % | **Aplicado** | Golpe de Titán **+40 %**; Aplastar **+80 %** y 25 de Quebranto; Mole **hasta +40 %**. Escrito en el nodo clave y en §11.3: **las copias y repeticiones gratis (`echo`) no gastan el Golpe de Titán**. Diferencia entre árboles de la misma especialización ≤ 10 % (§9.1) |
| 10 | Media · Guardián, Quebranto del Sismo | ~60 de Quebranto por Terremoto con un bloqueo de 15 s tras romper: ~6 nodos casi no rendían después de la primera rotura | **Aplicado** | La mitad de los aportes pasa a **premiar al jefe Quebrantado**: Réplica Honda (+10/20/30 %, el doble al Quebrantado), Cambio Certero (crítico seguro; +30 % al Quebrantado) y Montaña Viva (sus réplicas aturden a los que no son jefes). Se quedan Golpe Pesado, Epicentro, Contundencia y Aplastar. Ritmo: ~3 roturas por minuto (máximo 3,2), en §8.2 |
| 11 | Media · Caudillo, Pendón | El Pendón (10 s cada 20 s) solo estaba el 50 % del tiempo: Línea de Batalla y Disciplina rendían ~5 %; Doble Asta no hacía nada sin Estandarte de Guerra | **Aplicado** | Pendón **cada 15 s y 12 s de duración** (80 % del tiempo). **Doble Asta**: el Pendón dura 20 s (siempre hay uno; dos no se suman). **Disciplina** 12 % (≈ 10 % efectivo). Tribunal ya no pierde el punto de Doble Asta |
| 12 | Media · clase, c9 con el Cruzado y el Guardián | Golpe Pesado solo mejoraba el Juicio (120 % cada 8 s: ~+1 %); Sin Pausa no aportaba; con el Guardián, Sin Pausa rompía el plantado | **Aplicado** (se aparta a propósito de la regla de la etapa 1: «c9 no toca las cargas») | **Golpe Pesado**: además, **+25 % a tus sueltas perfectas**. **Sin Pausa**: te mueves al prepararte **sin dejar de estar plantado** y **cargar no te frena**. §6.1 y §16 lo explican |
| 13 | Media · comparación entre especializaciones contra el banco | Hoy el Guardián hace ×0,77 de la media contra un objetivo y el Berserker ×1,22 (0,63); el diseño ponía al Guardián en 0,78–0,80 sin perder aguante y al Cruzado en 0,88 | **Aplicado** | Topes nuevos en §8.4 y §12: Guardián **0,70** contra un objetivo y **0,75** contra 5; Cruzado sin la build de apoyo **0,82** (Martillo Celestial) y **0,80** (Tribunal). Qué bajó y por qué, en §8.4; E3 lo comprueba con `--seeds 5` |
| 14 | Media · clase, Señor de la Guerra | No decía si la copia contaba como suelta perfecta, como 3.er Terremoto o como «siguiente principal» del Golpe de Titán | **Aplicado** | Texto: «la copia, gratis y al 80 %, **no activa otros efectos**». `impl` y §11.3: lanzamiento `echo` (no da Fervor, no cuenta como suelta perfecta, no gasta el Golpe de Titán ni suma al 3.er Terremoto) |
| 15 | Media · Berserker, Ritmo de Matanza, Corazón Indomable 4, Estampida Sin Fin, Impacto Aturdidor (cortado) | Ritmo de Matanza bajaba Furia Inmortal de 60 a ~37 s y el ápice añadía otra gratis cada ~57 s («no morir» ~35 % del tiempo); Estampida Sin Fin no tenía tope en el texto (los 12 saltos estaban solo en §12); Impacto Aturdidor… (cortado) | **Aplicado** (la parte cortada, con la lectura más probable) | Ritmo de Matanza: **salvo la de tu definitiva**. Corazón Indomable 4: **como mucho una vez cada 90 s** («no morir» ≈ 22 % del tiempo). Estampida Sin Fin: **como mucho 2 recargas seguidas**, en el texto. Impacto Aturdidor: **cada enemigo, una vez cada 4 s** (además de los rendimientos decrecientes de `applyCC`) |

**Lo que no se aplicó y por qué.** Solo una parte del hallazgo 7: Gracia del Cielo sigue acortando el Cataclismo, porque es lo único que hace; se bajó su número y se cortaron las otras dos fuentes (Liturgia y la Aureola), que era donde estaba el bucle. Del hallazgo 5 queda fuera el aviso del validador, porque esta tarea no puede tocarlo (§18, nota 7). Ningún hallazgo pareció equivocado: los números del juicio se comprobaron contra `combat-math.js` (`CAPS.dr` 50, `CAPS.block` 40, Quebranto de 4 s con 15 s de bloqueo) y contra el banco (`apoyoHeal` 1,5 %/s del Cruzado).

### 19.2 Capas de defensa del Guardián: por qué la opción a

| | Opción a (elegida): topes del Guardián más altos | Opción b: la Piel en una capa aparte |
|---|---|---|
| Qué cambia | `drCapAdd 15` y `blockCapAdd 10` en la pasiva; tres nodos de reducción pasan a bloqueo o cura | La Piel del Guardián pasa a `dmgTakenPct` (multiplica sola) y las posturas y el Bastión dan vida o escudos |
| Aguante | Acotado: aunque la Piel quedara siempre puesta, el tope de 65 % deja el daño recibido en ~×0,35 (≈ ×2,9 de vida efectiva) | Piel ×0,5 por encima de un saco de 50 %: hasta ×0,25 o menos, y depende de cuánto tiempo esté puesta la Piel |
| Nodos que el tope anula | Solo con la Piel puesta y en Muralla; sin la Piel, Muralla + Bastión + Determinación ≈ 51 % y el Pendón todavía suma | Muralla + Bastión + Determinación ya llenan el saco de 50 %: el Pendón y cualquier otro seguirían en 0 |
| Riesgo | Si la Piel pasa del 75 % del tiempo, sobra. **Pasó** (el rejuicio midió ~100 % en el Guardián): desde §20, su recarga empieza al acabar, para todos | Bucle Piel → aguante: cualquier recarga de la Piel (Tambor, Inexpugnable) vale el doble |

**Decisión del orquestador (§17.2, pregunta 6):** se confirma la opción a, pero como **aumento de tope propio** de la pasiva innata del Guardián (stat de especialización `drCapAdd 15` y `blockCapAdd 10`). Los topes globales de `combat-math.js` (`CAPS.dr` 50 y `CAPS.block` 40) no se suben para las demás especializaciones.

### 19.3 Presupuesto de cura del Cruzado

Cifras en % de la vida por segundo, **brutas** (antes de la curación que sobra), con un Veredicto cada ~4,5 s y un grupo de 2 aliados, como el escenario de apoyo del banco (`apoyoSim`: cada aliado recibe un 2 % por segundo; el Cruzado debe curar al menos **1,5 %/s**). «Media» = la cura repartida entre los dos aliados.

| Fuente | Antes (contra 5 marcados) | Ahora |
|---|---|---|
| Pasiva Martillo Piadoso | 10 % del daño sagrado, sin tope | Igual, **hasta 1 %/s** por receptor |
| Veredicto | 10 % (Aureola: 20 %) en cada Martillo, a todos con Generoso: ~15 %/s | 6 % (Aureola: 10 %) cada ~4,5 s al más herido: 1,3–2,2 %/s a uno |
| Veredicto Generoso | Toda la cura del Veredicto a todos | +3 % al resto cada ~4,5 s: 0,7 %/s |
| Absolución | 2 % × 5 detonaciones por Martillo: ~7,7 %/s | 2 % cada 2 s como mucho: 1 %/s |
| Tierra Santa | 2 %/s por zona, sumando zonas | 1 %/s, sin sumarse entre zonas |
| Sendero Bendito | 4 %/s | 3 %/s (2,5 % a rango 1) mientras pisan el sendero; **rejuicio:** sin sumarse entre senderos |
| Escolta de Luz (forja del Sendero) | 12 % de escudo en cada pasada, sin enfriamiento (~3,4 %/s) | **Rejuicio:** una vez cada 6 s por aliado (≤ 2 %/s; ~0,9 %/s real) |
| Cubeta de zona del Cruzado | — (sendero y Tierra Santa sin techo común) | **Rejuicio:** 4 %/s por receptor entre las dos |

| Build | Cura media al grupo (bruta) | Lectura |
|---|---|---|
| Tierra Santa | **≈ 4,9 %/s con escudos** (desglose abajo; techo ≈ 6,5 %/s si el grupo no sale del sendero) | **Muy alto:** el único que pasa de sobra el 1,5 %/s del banco |
| Tribunal | ≈ 2,4 %/s (antes ~20–30 %/s) | **Medio:** cumple el mínimo del banco sin superar a Tierra Santa |
| Luz y Martillo | ≈ 1,7 %/s | Medio-bajo |
| Martillo Celestial | ≈ 1,6 %/s (más el escudo propio de Luz Protectora) | **Bajo:** justo por encima del mínimo |

**Tierra Santa, desglose (rejuicio, §20).** Media por aliado en un grupo de 2, bruta y con escudos. Antes del rejuicio, ~10–12 %/s: los senderos se sumaban (con Vigilia y Ligereza 3 vuelve cada ~3,5 s y cada uno dura hasta 20 s) y Escolta de Luz escudaba en cada pasada.

| Fuente | %/s (media) | Tope que la acota |
|---|---|---|
| Sendero (3 %/s; los aliados lo pisan ~40 % del tiempo) | 1,2 | No se suma entre senderos |
| Tierra Santa (1 %/s al más herido) | 0,5 | No se suma entre zonas |
| Escolta de Luz (12 % al atravesar a un aliado) | 0,9 | Una vez cada 6 s por aliado |
| Refugio (10 % al más herido) | 0,8 | Una vez cada 6 s |
| Veredicto Generoso (10 % al más herido y 3 % al otro, un Veredicto cada ~6 s en esta build) | 1,1 | 1 de Fervor por lanzamiento |
| Pasiva Martillo Piadoso | 0,4 | 1 %/s por receptor |
| **Total** | **≈ 4,9** | Objetivo del rejuicio: 4–5 %/s. Techo ≈ 6,5 %/s si el grupo no sale del sendero; la cubeta de zona (4 %/s por receptor) impide que el sendero y Tierra Santa pasen de ahí |

**Ronda 3 (§21):** con Vigilia siempre activa el Sendero vuelve cada **4 s** (su suelo), no cada ~3,5 s ni ~2,2 s: el desglose no cambia, porque la cura del sendero depende de cuánto tiempo lo pisan (no de cuántos hay) y Escolta de Luz y Refugio ya iban cada 6 s. Carga Reparadora (6 % cada 6 s, ≤ 1 %/s) cura solo al Cruzado y va por `p.sustain()`: no entra en este presupuesto.

El Relevo del Caudillo (escudo del 10 % al acabar cada Pendón, ~0,7 %/s) es del árbol héroe y lo tienen igual Guardia Total, Roca y Escudo y Tribunal: no entra en el presupuesto del Cruzado.

### 19.4 Validación y capturas de la corrección

- Validador oficial: **0 errores y 0 avisos** (Guardián 95 % «mecánica» en filas 3–9; las 12 builds legales punto a punto).
- Comprobador de la etapa 2: 0 nombres repetidos, 432 textos ≤ 120 caracteres (el más largo, 120), sin siglas, sin voseo ni «vosotros» en los datos ni en este documento, G1 y G17 en verde.
- Variantes con dos finales a rango 1: las tres legales en una copia de los datos (fuera del repositorio).
- Capturas con el prefijo **`e2fix_`** (a 1366 y 1920), revisadas una a una: ver §15.2.

---

## 20. Rejuicio de balance (ronda 2)

Un juez de balance independiente revisó el diseño ya corregido (puntaje **6**) y pasó 1 hallazgo bloqueante, 3 altos y 7 medios; el último medio llegó cortado («… y la pasiva (bloqu»). Se aplicaron todos: los bloqueantes y altos tal como los propuso el juez, y los medios porque cada uno traía un arreglo concreto de números o de texto. Dos se aplicaron con una forma equivalente (Triunfo y los números de Grito de Guerra, con su motivo) y el cortado, con la lectura más probable. Ningún hallazgo pareció equivocado. Todos los cambios están en los datos (`talents-v2-guerrero.js`: texto e `impl` de cada nodo); las tablas de §6, §7 y §9, las listas de §8 y los párrafos de implementación se regeneraron de ellos.

### 20.1 Hallazgo, decisión y cambio

| # | Severidad · dónde | Hallazgo (resumen) | Decisión | Cambio |
|---|---|---|---|---|
| 1 | **Bloqueante** · Gladiador l11 Vítores + l2A Muchos Rivales; Titán t11 Peso Acumulado; builds Danza Carmesí y Luz y Martillo | Vítores acortaba 4 s la definitiva por cada Rival muerto, sin tope; con Muchos Rivales el Rival pasa al más cercano, así que una manada de 5 que cae en ~6 s daba ~20 s de recarga (~3 s por segundo). Furia Inmortal (12 s cada 60 s) volvía en ~14 s: «no morir», imparable y principales gratis el ~80 % del tiempo. Peso Acumulado (−2 s por Golpe de Titán, uno cada ~3 s) la dejaba en ~35 s. Con Vítores y Gracia del Cielo, el Cataclismo de Luz y Martillo pasaba del `ultShare` máximo del 22 % | **Aplicado** | **Vítores:** «Matar a un Rival élite o Quebrantar a tu Rival acorta 6 s la recarga de tu definitiva (como mucho una vez cada 15 s)». **Peso Acumulado:** 2 → **1 s** por Golpe de Titán. **Regla nueva, suelo de las definitivas** (§11.3, §11.4, §12): entre todos los talentos, la recarga efectiva de una definitiva no baja del **70 % de su base** (Furia Inmortal ≥ 42 s, Cataclismo ≥ 42 s, Ciudadela ≥ 63 s); Gracia del Cielo lo dice en su texto («nunca baja de 42 s»). «No morir» ≤ 12/42 + 5/90 ≈ **34 %** en el peor caso y ~25 % en la build típica |
| 2 | **Alta** · clase c30 Asalto Total; builds Estampida Sin Fin, Cabeza de Puente y Tierra Santa | «Si mata, la movilidad se recarga», sin tope: contra enemigos que mueren de un golpe se cerraba el bucle movilidad → principal gratis +45 % → muerte → movilidad. El reinicio esquivaba el «como mucho 2 seguidas» de Estampida Sin Fin (b27) y el suelo de 4 s de la Carga (d17), y con el Sendero repetía Escolta de Luz, Polvareda, Rugido de Carga y el Altar. La Furia dejaba de importar en grupos | **Aplicado** | c30: «si mata, tu movilidad **recupera media recarga (cada 6 s)**» y `icd 6` en el `impl`. `impl` de b27 y d17 (y §11.3): los reinicios y reducciones de otros poderes **cuentan como «seguida»** en Estampida Sin Fin y **respetan el suelo de 4 s** de la Carga de Escudo |
| 3 | **Alta** · Berserker b28 Corazón Indomable 3 con b15A Negación de la Muerte; build Golpe de Gracia | «Con la Sed Saciada, un golpe que te mataría te deja con 1 de vida (una vez por Sed)»: la Sed se rellena con el Sangrado, Último Trago y Reabrir, así que había una salvación cada ~14–19 s. Negación llenaba la Sed al salvarte, lo que disparaba la Sed Saciada y otra salvación: dos seguidas. «Golpe de Gracia» (supervivencia «baja») quedaba casi inmortal | **Aplicado** | Corazón Indomable 3: «… te deja con 1 de vida (**como mucho una vez cada 60 s**)», `icd 60`. Negación de la Muerte: **deja la Sed en 50** (no la llena). Salvarse: ≤ 1 vez cada 60 s más 1 cada 120 s |
| 4 | **Alta** · Piel de Hierro con Curtido, Hierro Vivo, Ritmo de Combate, Ritmo de Matanza, Liturgia, Tambor de Guerra e Inexpugnable 3; §7.2 y §19.2 | §19.2 suponía la Piel quitada el 40–50 % del tiempo y no pasaba: el Guardián con Curtido 3 y Hierro Vivo 2 (15 s puesta, 14 s de recarga) la tenía el 100 %; Montaña Viva (Tambor, ~0,8 s/s) y Cabeza de Puente (Inexpugnable 3 + Ritmo de Combate, ~0,6 s/s), también. Con Piel 50 + Muralla 15 = 65 % (el tope), el Bastión, Determinación y el Pendón de Defensa volvían a valer 0 y el Pendón de Defensa quedaba dominado por el de Asalto. En el daño, Ritmo de Matanza y Liturgia dejaban la Piel puesta el 85–100 % en builds de supervivencia «baja» | **Aplicado**, para todos (adelanta la calibración de §12) | **La recarga de Piel de Hierro empieza al acabar** (texto del libro, `cdOnEnd`, §4, §11.1 y §11.4): las reducciones solo cuentan mientras se recarga. **Ritmo de Matanza y Liturgia: «salvo la definitiva y Piel de Hierro»**. Resultado: Guardián (Curtido 3 + Hierro Vivo 2) ~15 s puesta y 14 s quitada (≈ 52 %); Sismo y Vanguardia ~15 s y ~10 s (≈ 60 %); builds de daño 11–14 s y 14–20 s (≈ 35–45 %). Tabla de capas y tiempos en §7.2 |
| 5 | Media · clase c28 Inquebrantable; builds Guardia Total, Roca y Escudo, Danza Carmesí y Tribunal | «Dura hasta 5 golpes y vuelve a los 15 s»: 5 enemigos provocados la rompían en ~1 s. En su propio escenario (grupos) rendía menos que la Piel normal y solo daba +30 % de Furia; contra jefes, lo mismo que la base | **Aplicado** | Presupuesto de daño en lugar de golpes: «Piel de Hierro dura **hasta que evita daño por un 40/55/70 % de tu vida**; vuelve en 15 s. Con ella, generas un 10/20/30 % más de Furia» (`absorbBudgetPct`, §11.4). Rinde igual contra muchos golpes pequeños que contra pocos grandes; con la recarga al acabar, la Piel queda en ~45–60 % del tiempo |
| 6 | Media · Gladiador l12 Triunfo, l3 Tiro de Arena y l1 Ovación con l2A (Danza Carmesí, Sangre y Acero, Luz y Martillo) | En grupos todo se encadenaba por la muerte de un Rival: Triunfo («matar, +2 s», sin tope) quedaba permanente; Tiro de Arena lanzaba una Lanza gratis al nombrar Rival, y una Lanza que mata nombra otro: cadena por toda la manada; Ovación curaba un 10 % por Rival muerto (~6 %/s). El Gladiador pasaba al Titán en más del 10 % de §9.1 | **Aplicado** (Triunfo con una forma equivalente) | **Triunfo:** «Rival Quebrantado o 5 de Gloria **(cada 35 s)**: 10 s de +25 % de daño y principales a media Furia; matar, **+1 s (hasta 15 s)**». El texto del juez («después, 20 s sin poder activarse») no cabía en 120 caracteres; «cada 35 s» desde que se activa es lo mismo en el peor caso (15 s + 20 s de espera): ≈ 30–43 % del tiempo. **Tiro de Arena:** una vez cada 4 s. **Ovación:** 10 % por Rival élite o al Quebrantar; 2 % por Rival normal, una vez cada 2 s, por la cubeta de `p.sustain()`. Gladiador ≈ Titán ± 5 % en grupos (§9.1) |
| 7 | Media · clase c15A Furia Protectora y c11A Segundo Aliento frente a la «Furia gastada» (c26, c29, t0); Montaña Viva y Luz y Martillo | Furia Protectora no decía a cuánta vida equivale 1 de Furia ni si esa Furia cuenta como gastada; si contaba, el daño recibido alimentaba Señor de la Guerra, el Golpe de Titán y Desenfreno (un tanque que pega más cuanto más le pegan). Segundo Aliento, igual (100 de Furia de golpe) | **Aplicado** | Furia Protectora: «El 20 % del daño que recibes lo pagas con Furia: **1 de Furia por cada 0,5 % de tu vida**». `impl` de c26, c29 y t0 (y §6, §11.3): **solo cuenta la Furia pagada por habilidades**; no cuentan Furia Protectora, Segundo Aliento ni el drenaje de Danza Carmesí |
| 8 | Media · Cruzado z12 Liturgia (y Berserker b12 Ritmo de Matanza) | Con una suelta perfecta cada ~1,1 s y Fe Serena (90 % de acierto), Liturgia 2 quitaba ~0,9 s por segundo a todo menos la definitiva: casi el doble de cadencia (Juicio 6 → ~3,2 s, Desafío de Arena 40 → ~21 s y la Piel). El nodo de más valor de Veredicto y Sentencia por 2 puntos | **Aplicado** | Liturgia: «Cada suelta perfecta acorta 0,5/1 s tus recargas, salvo la definitiva y Piel de Hierro (**como mucho cada 2 s**)», `icd 2`: ≤ 0,5 s/s. Ritmo de Matanza: lo mismo con «**una vez cada 1,5 s**» (`icd 1.5`) |
| 9 | Media · Cruzado, build Tierra Santa: Escolta de Luz, z7 Sendero Bendito, z21 Vigilia y z27 Tierra Santa | El Sendero volvía en ~3,5 s y cada sendero duraba hasta 20 s; su cura de 3 %/s no decía «no se suma» y se superponía; Escolta de Luz escudaba un 12 % en cada pasada sin enfriamiento (~3,4 %/s). `g.heal` no pasa por `p.sustain()`: el «≈ 5 %/s» de §19.3 era el piso, no el techo; un «no sanador puro» curaba más del doble del daño de prueba del banco | **Aplicado** | Sendero (libro y z7): la cura **no se suma** entre senderos (≤ 3 %/s por aliado). Escolta de Luz: **una vez cada 6 s por aliado** (`icd 6`). **Cubeta de zona del Cruzado: 4 %/s por receptor** (sendero + Tierra Santa; §7.3, §11.5). Tierra Santa ≈ **4,9 %/s con escudos** (objetivo 4–5 %; desglose en §19.3) |
| 10 | Media · clase c11A Segundo Aliento, c17A Grito de Guerra y c22A Intervención | Ninguna de las 12 builds los elegía: la ranura `2` es la Piel de Hierro (de la que viven la pasiva del Guardián y el aguante de todos) y las builds que la sacan prefieren la habilidad del árbol héroe. Las tres A quedaban dominadas por las B | **Aplicado** (números de Grito de Guerra interpretados) | **Si la habilidad no está en la barra, sale con Piel de Hierro al 50 %** (con su propia recarga): Segundo Aliento gasta la mitad de tu Furia y cura 1 % por cada 3 gastados (1 % por cada 6 de la que tenías); Grito de Guerra, +15 de Furia y +5 % al grupo 8 s; Intervención, sin salto, escudo del 8 % a ti y al aliado más cercano. En la barra rinden al 100 %. El juez escribió «Grito de Guerra: +30 de Furia y +10 % al grupo 8 s»: son los valores enteros (en la barra); al 50 %, la mitad, como en las otras dos. **Builds:** Guardia Total y Roca y Escudo eligen Segundo Aliento (la Coraza es reducción y el Guardián ya está en su tope); Tierra Santa elige Grito de Guerra (+5 % al grupo con cada Piel) |
| 11 | Media (**cortado**) · Guardián §7.2 «Aguante estimado» con d15B Aguante de Roca, d1 Escudo Alzado y la pasiva (bloqueo…) | El texto se corta. Lectura más probable: el «≈ ×0,35» solo contaba el saco de reducción; con el bloqueo al 50 % y Escudo Alzado 3 (80 %), y el bloqueo total de Aguante de Roca, el Guardián recibía ≈ 0,35 × 0,59 ≈ 0,21 (≈ ×3,4 de vida efectiva frente a la media), por encima del ×3 de §12 | **Aplicado** con esa lectura | **Aguante de Roca:** «tus bloqueos paran un 10 % más (**hasta el 90 %**)» (antes, todo el golpe); `blockPower` con tope 90. **Aguante recalculado con el bloqueo** (§7.2): Guardia Total ≈ 0,25, **×0,35 de la media (0,71) y ≈ ×2,85 de vida efectiva**; Montaña Viva y Cabeza de Puente ≈ ×2,4. Si el juez pedía otra cosa, conviene revisarlo (§18, nota 13) |

### 20.2 Lo que cambió en las builds y en la comparación

- **Elecciones** (validadas punto a punto): Guardia Total y Roca y Escudo pasan de Coraza de Hierro (c11B) a **Segundo Aliento (c11A)**; Tierra Santa pasa de Ira Contenida (c17B) a **Grito de Guerra (c17A)**. Ninguna build saca la Piel de Hierro de la barra.
- **Comparación (§8.4):** Danza Carmesí contra 5, 0,98 → **0,95**; aguante de Montaña Viva 0,88 → **0,84** y de Cabeza de Puente 0,90 → **0,85**; Tierra Santa 0,82/0,92 → **0,83/0,93**; Luz y Martillo 0,92/0,91 → **0,92/0,90** (su variante, 0,93/0,91). Entre especializaciones: Cruzado contra un jefe 0,82 → **0,80** y contra 5, 0,80 → **0,78**; Guardián sin cambios (0,70 y 0,75). Cada híbrida sigue a un 6–10 % de la mejor en cada escenario y con el mejor «peor caso» de su especialización.
- **Por qué cambian tan poco:** los bucles (Vítores, Triunfo, Tiro de Arena y Asalto Total sin tope, la Piel siempre puesta) no estaban en las estimaciones de diseño; cerrarlos acerca el banco (E3) a esas cifras. Lo que sí cambia sale de valores previstos que bajaron: Liturgia, Triunfo, el tiempo con la Piel y el bloqueo de Aguante de Roca.

### 20.3 Validación

- `node docs/mockups/data/validar-talentos.mjs guerrero` → **Todo en regla: 0 errores y 0 avisos** (las 12 builds 34/34 y 31/31 con Paragon 1 + 10; textos ≤ 120: el más largo de los nuevos, Triunfo, tiene 120).
- Ids de nodos, habilidades y poderes: **ninguno cambió** (tabla al final). Claves nuevas para E1 (no son ids): `cdOnEnd`, `absorbBudgetPct`, `ultCdFloor`, `zoneHealCapPct` y el tope 90 de `blockPower` (§11.4).

---

## 21. Rejuicio de balance (ronda 3)

Un juez de verificación comprobó que los 11 arreglos de la ronda 2 están en los datos y cierran sus bucles («no morir» ≤ 34 %, definitivas con suelo, Vítores ≤ 0,4 s/s, Asalto Total y Corazón Indomable acotados, la Piel puesta ≈ 35–66 %, validador en 0 errores). Pasó **3 altos nuevos o mudados de sitio, todos del área, sin bloqueantes**. Se aplicaron los tres; una parte del tercero (Persecución) no, con su motivo. Los cambios están en los datos (texto e `impl`); las filas de §6 y §7 se regeneraron con `--tablas`.

### 21.1 Hallazgo, decisión y cambio

| # | Severidad · dónde | Hallazgo (resumen) | Decisión | Cambio |
|---|---|---|---|---|
| 1 | **Alta** · Cruzado z6 Golpe Consagrado + z27 Tierra Santa (y z10A, z13, z14, z21); build Tierra Santa | «No se suma» solo tocaba la **cura** de las zonas. Con Tierra Santa, cada suelta perfecta deja un suelo de 40 %/s que vive hasta 20 s: 5–10 suelos sumados (≈ 200–400 %/s por enemigo, más que el Martillo), sin otro tope que los 12 campos del motor; Senda Ardiente, igual. Siempre dentro de una zona, Vigilia deja el Sendero en ~2,2–2,6 s: Asalto Total en casi cada Martillo y los efectos al llegar cada ~2,5 s. La build de apoyo pasaba de 1,0 | **Aplicado**, con «2 a la vez» para z6 y, además, un **suelo de 4 s** para el Sendero, que cierra el bucle de Vigilia (el juez pedía recalcularlo) | z27: «Tus zonas sagradas, **que no se suman**, duran…»; libro del Sendero: «un sendero sagrado **que no se suma**» (daño y cura); z6: «(40 % por segundo; **2 a la vez, no se suman**)»; z10A: «(antes 30 %; **no se suma**)»; z14: «(**no se suma**)»; z21: «(**nunca baja de 4 s**)», suelo que vale con o sin Vigilia, como el de la Carga (d17). Tierra Santa, recalculada con Vigilia siempre activa: **0,81/0,90** (antes 0,83/0,93; cuentas en §8.4) |
| 2 | **Alta** · Cruzado z8A Estallido de Luz (con z5, z22, z25); builds Tribunal y Luz y Martillo | El estallido es por marca: con la manada marcada, cada Martillo detona N marcas y cada una estalla sobre N enemigos. Con un golpe H y la detonación a ×2,45: 5 × 2,45H + 5 × 5 × 1,22H ≈ 43H contra 5 y ≈ 147H contra 10 | **Aplicado** con la primera forma (un estallido por enemigo): conserva el «contra grupos» de la opción A; «un solo estallido por lanzamiento» lo dejaba constante con N y peor que Condena en todo | z8A: «… a todos a 3 m (**cada enemigo, un estallido por lanzamiento**)»: N × (2,45 + 1,22) H ≈ **18H contra 5 y 37H contra 10** (lineal). §8.4 no cambia: ya suponía un estallido por enemigo. **E3 mide también contra 10** (§12, §18 nota 18) |
| 3 | **Alta** · clase c14B Carga Reparadora con el Salto (3–5 saltos, ×3 cadenas con b27) y con el Sendero de Vigilia | Sin `icd` y por `g.heal`, fuera de `p.sustain()`: en Estampida (cambio legal de Polvareda) ~15 saltos por ciclo de ~18 s × 6 % ≈ 5 %/s; Danza Carmesí ≈ 2 %/s; Tierra Santa ≈ 2,3 %/s | **Aplicado**, salvo Persecución (c21) | c14B: «Tu movilidad te quita las ralentizaciones y te cura un 6 % de la vida (**una vez cada 6 s**)», cura por `p.sustain()` (≤ 1 %/s dentro de la cubeta de 6 %/s). La regla de Asalto Total («con movilidades que se relanzan, cuenta el primer uso de la cadena») pasa a c14A, c14B y c27 (`impl` y §11.3) |

### 21.2 Lo que no se aplicó y por qué

- **Persecución (c21) sigue valiendo en cada salto.** No es un efecto «al llegar» ni da recursos: es +50 % al golpe de la movilidad contra ralentizados o aturdidos, como Peso Muerto (+40 %) o el +30 % de Estampida Sin Fin, que también valen en cada salto. Limitarla al primero no cierra ningún bucle y le quita a Estampida Sin Fin ~5 %: en el saco aditivo del Salto (≈ +127 %: Fuerza Bruta 12, Peso Muerto 40, Estampida 30, Ímpetu 45), Persecución pasa de 227 a 277 % (×1,22); quitarla en 4 de cada 5 saltos baja el Salto ~14 %, y el Salto es ~35–40 % del daño de la build.
- **«Tierra Santa no alarga los suelos»** (la alternativa del juez para z6) no se usó: con «no se suman», cuántos suelos haya solo cambia el área cubierta, y «2 a la vez» además acota los campos (~11–12 de 12, §11.3) y vale sin Tierra Santa (Martillo Celestial, con Golpe Consagrado, tenía ~3 suelos de 4 s bajo el jefe: 120 %/s en vez de los 40 %/s de su estimación).
- **El suelo de 4 s le quita valor a Vigilia en Tierra Santa** (4,5 → 4 s, porque Ligereza 3, Avance Implacable 2 y Disciplina ya suman el tope de recarga), pero es un nodo de 1 punto del camino y rinde donde hay menos reducción (con Ligereza 1, 9 → 4,5 s). Un suelo más bajo (3,5 s) dejaba Asalto Total en ~37 % de los Martillos; con 4 s, ~33 %, con el mismo suelo que la Carga de la Vanguardia.
- **Observaciones del veredicto que no eran altos:** el Grito de Guerra (c17A) de Tierra Santa no sale (la ranura `2` es del Estandarte), Intervención (c22A) sigue dominada y el Guardián probablemente pasa el ×3 de aguante (Furia Protectora y los debilitamientos de los enemigos quedan fuera de su tope). No se tocaron builds ni nodos por ellas: quedan en §18, nota 16, y la cifra nueva de Tierra Santa ya cuenta el Grito de Guerra en 0.

### 21.3 Validación

- `node docs/mockups/data/validar-talentos.mjs guerrero`: **0 errores y 0 avisos**. `--todas`: 0 errores; el Guerrero y la Arquera sin avisos y la Maga con 3 avisos de su propio archivo (`reco.crionte` «m_toque», `reco.arcanista` «m_onda» y «m_armadura» no están en su catálogo), que esta tarea no toca. Textos nuevos ≤ 120 (el más largo, Tierra Santa, 118; Golpe Consagrado, 117; el libro del Sendero, 115).
- Ids de nodos, habilidades y poderes: **ninguno cambió**. Cambiaron textos o `impl` de `c14` (A y B), `c21`, `c27`, `c30`, `z6`, `z8` (A), `z10` (A), `z14`, `z21` y `z27`, y el texto del libro de `g_sendero`. Claves nuevas para E1 (no son ids): `zoneDmgNoStack`, el `max 2` de los suelos y el suelo de 4 s del Sendero (§18, nota 18).

---

## Anexo A. Iconos y arte para Codex

Hoy el mockup reutiliza iconos viejos del Guerrero (todos existen: el validador no avisa de ninguno). Pedidos con el estilo de `assets/talents` (128 y 256 px, fondo oscuro; rojo sangre para el Berserker, azul acero para el Guardián, oro y luz para el Cruzado, oro y acero para la clase y los héroes). **Nombres nuevos** para no pisar los iconos del juego actual:

| Archivo | Qué dibujar |
|---|---|
| `talents/guerrero-berserker-b5.webp` … `b28.webp` (14) | Reabrir, Caída Brutal, Suelo Roto, Rajar: Onda o Certero, Salto: Cadena o Aplastante, Sin Suelo, Avidez, Caída Sangrienta, Estallido Rojo, Ímpetu, Danza Carmesí, Golpe de Gracia, Estampida Sin Fin, Corazón Indomable |
| `talents/guerrero-guardian-d0.webp` … `d28.webp` (los conceptos nuevos, ~20) | Pie Firme (bota clavada sobre una losa con 5 escudos), Echar Raíces, Pisotón, Cambio: Barrido o Certero (hexágono: escudo que barre / escudo con destello), Terremoto: Réplicas o Epicentro, Carga: Arrastre o Choque, Guardia Rota, Avalancha, Vínculo de Escudo, Tierra Viva, Guarnición, Proa Blindada, Guardia Viva, Réplica Honda, Escolta, Guardia Total (dos escudos azul y rojo superpuestos), Montaña Viva, Cabeza de Puente (escudo clavado en una brecha), Inexpugnable |
| `talents/guerrero-cruzado-z0.webp` … `z28.webp` (los conceptos nuevos, ~20) | Voto Sagrado, Sello del Martillo, Golpe Consagrado, Juicio: Estallido o Condena, Veredicto: Generoso o Pesado, Sendero: Ardiente o Refugio, Liturgia, Altar de Campaña, Milagro o Luz Protectora, Ardor, Velo Sagrado, Absolución, Fe Serena (martillo con un destello en el instante justo), Edicto, Racha de Fe, Peregrino, Tribunal (tres marcas doradas), Martillo Celestial, Tierra Santa, Aureola |
| `talents/guerrero-h1-t0…t12`, `guerrero-h2-l0…l12`, `guerrero-h3-u0…u12` (39) | Titán (puño de piedra que agrieta el suelo, gigante, montaña), Gladiador (red y tridente, arena, pulgar, laurel), Caudillo (pendón clavado, clarín, asta doble, estandarte grande) |
| `icons256/g_guardia.webp`, `g_carga_escudo.webp`, `g_u_ciudadela.webp`, `g_juicio.webp`, `g_sendero.webp`, `g_h_bramido.webp`, `g_h_desafio.webp`, `g_h_estandarte.webp` | Cambio de Guardia (escudo que gira entre azul y rojo), Carga de Escudo (escudo con polvo detrás, avance pesado), Ciudadela (escudo clavado con muralla de luz alrededor), Juicio (martillo de luz en vuelo con una marca dorada), Sendero de Luz (estela de luz en el suelo), Bramido de Titán, Desafío de Arena (círculo de arena con dos siluetas), Estandarte de Guerra |
| `forge/v_g_guardia_i/ii`, `v_g_carga_escudo_i/ii`, `v_terremoto_i/ii`, `v_g_u_ciudadela_i/ii`, `v_g_juicio_i/ii`, `v_g_sendero_i/ii`, `v_g_martillo_i/ii`, `v_g_u_cataclismo_i/ii` (16) | Guardia Compartida, Guardia Opresiva, Arrollador, Carga Veloz, Martinete, Falla, Ciudadela Andante, Empalizada, Sentencia, Tres Juicios, Escolta de Luz, Destello Doble, Martillo Arrojado, Onda Sagrada, Rayo del Cielo, Amanecer |
| `talents/guerrero-clase2-c<n>.webp` (16) y los del Berserker de la etapa 1 | Ver la lista de la etapa 1 (c5, c6, c7, c9, c10, c14, c15, c16, c19, c20, c25–c30; Remolino y Rajar) |
| Emblemas de los árboles héroe | Titán (puño de piedra), Gladiador (yelmo de arena con laurel), Caudillo (pendón cruzado con un clarín) |

---

## Ids cambiados en el rejuicio

Ninguno. Las decisiones del orquestador (§17.2) cambiaron números y textos (ventana perfecta, `z19`, la forja M del Martillo, las pasivas y las barras), pero no ids de nodos, habilidades ni poderes.

**Rejuicio de balance (ronda 2, §20):** tampoco cambió ningún id. Cambiaron textos, números e `impl` de `c11`, `c15`, `c17`, `c22`, `c26`, `c28`, `c29`, `c30`, `b12`, `b15`, `b27`, `b28`, `d12`, `d15`, `d17`, `d28`, `z7`, `z12`, `z20`, `z27`, `t0`, `t11`, `l1`, `l3`, `l11` y `l12`; el texto del libro de `g_piel` y `g_sendero` y la variante Escolta de Luz (`v_escolta_luz`, `icd 6`); y las elecciones de tres builds (`guardia` y `hibguard`: `c11` A; `santa`: `c17` A).

**Rejuicio de balance (ronda 3, §21):** tampoco cambió ningún id. Cambiaron textos o `impl` de `c14`, `c21`, `c27`, `c30`, `z6`, `z8`, `z10`, `z14`, `z21` y `z27`, y el texto del libro de `g_sendero`; ninguna build cambió.

| Id anterior | Id nuevo | Motivo |
|---|---|---|
| — | — | Ningún id cambió en el rejuicio |
