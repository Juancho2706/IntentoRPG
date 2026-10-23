# Investigación ARPG: itemización 2025–2026 para el Paso 4 (ítems, inventario y stats)

- **Frente:** «arpg» (investigador). **Fecha:** 22 de octubre de 2026. **Versión:** v2, corregida tras la refutación externa (dos expertos: itemización de MMO/ARPG y multijugador en navegador). Lo que cambió está en la §10 «Refutación y cambios».
- **Alcance:** Diablo IV (Loot Reborn → T11 → Lord of Hatred → T14–T15), Path of Exile 2, Last Epoch, Diablo II Resurrected, Grim Dawn, Torchlight Infinite, Diablo III (Loot 2.0, como lección), y MMO (WoW Midnight, FFXIV, Lost Ark y Guild Wars 2) para el presupuesto de stats y el progreso de cuenta.
- **Método:** lectura del código (solo lectura) y búsqueda web. Cada dato lleva su URL o `archivo:línea`. No corrí tests, servidores, humo, Chrome ni scripts de Node.
- **Marcas de confianza:**
  - **[V]** lo verifiqué abriendo la fuente (WebFetch) en esta sesión o en la anterior.
  - **[S]** solo lo vi en el extracto del buscador (la página dio 403/404 o estaba caída).
  - **[memoria]** conocimiento previo sin URL verificada: no usarlo como argumento hasta confirmarlo.
- **Límites:** el cupo de WebSearch de la sesión se agotó dos veces (la última, a mitad de esta corrección). La wiki de Guild Wars 2 estaba en mantenimiento, y Mobalytics, Massively OP y la Diablo Wiki dieron 403.

---

## 0. Resumen ejecutivo (v2)

1. **Tres ejes visibles por pieza, ni uno más.** La v1 apilaba unos 10 (ilvl, rareza, tier, tirada, ★, Calidad, templado, sello, aspecto, engarces, set). Hazzikostas (director de WoW, 13-sep-2026) da como alarma el momento en que «every piece of gear starts to look like a spreadsheet» [V]. WoW quitó la reforja porque había «too much modification needed to be done every time you get a new piece of gear» [V]. **v2:** ◆ Nivel de objeto (ilvl + rangos de mejora), rareza (cuántas líneas y si trae aspecto) y **una** línea forjada.
2. **El presupuesto es un techo, no un reparto.** En WoW los bonos de set y de engarce no cuentan para el presupuesto [V]. En FFXIV cada subestadística tiene un techo por pieza y el engarce rellena hasta él [V]. **v2:** lo que cae llena ~70–85 % del techo; forjar y mejorar suman hasta el techo y nunca restan.
3. **Primero, cuánto poder viene del equipo.** Sin una cuota objetivo (propuesta: 40–50 % al final del juego), ni el presupuesto por ranura ni la calibración E4b tienen contra qué medirse. Hoy las bendiciones crecen sin tope (`js/data.js:593-597`) y compiten con los afijos.
4. **Atributo principal adaptable (WoW), no botín inteligente (D3).** En WoW el principal de la armadura «will change based on the spec of the character wearing it» [V]. Con el alijo compartido y los regalos en el cooperativo, eso evita afijos muertos cuando el objeto cambia de manos.
5. **Nada de topes en rojo.** Los rendimientos decrecientes de WoW son suaves e invisibles. El rojo de FFXIV solo aparece en la ventana de engarce [V]. **v2:** los pools se diseñan para que el equipo solo no llegue a los `CAPS`, y el comparador enseña el delta real de la simulación.
6. **Una sola valoración.** Hoy hay tres (`itemPower`, `_charDPS` y `st.power`) que se contradicen, y el «⚡ Poder» premia el hallazgo mágico. **v2:** la simulación alimenta el veredicto, el ▲, el orden «mejor para mí» y el ⚡ Poder.
7. **Progreso de cuenta y protección contra la mala suerte.** WoW abarata las mejoras de una ranura según la pieza de más nivel de **cualquier** personaje de la cuenta [S, soporte oficial de Blizzard]. La Gran Cámara deja elegir 1 de hasta 9 objetos [V]. **v2:** marca de agua por ranura y por cuenta, Códice de cuenta, «polvo de aspecto» y cofre de jefe con «elige 1 de 3».
8. **Nivel requerido por escalado, no por bloqueo.** NO efectivo = mín(NO, NO máximo de tu nivel + 2). El mismo mecanismo sirve para el cooperativo con niveles distintos y para el ladder (sincronización de FFXIV [V]).
9. **D4 sigue siendo la referencia, pero con datos al día:**
   - Los legendarios tienen 4 afijos desde la T11 [V]. El «5.º afijo» de la v1 no tenía fuente y lo quité.
   - La Calidad llega a 25, con +1 % por rango y un remate de +50 % a un afijo al azar [V].
   - En la T14 (30-jun-2026) Blizzard tuvo que **devolver líneas fijas a los únicos** tras «overwhelmingly negative feedback». Los Míticos pasaron a ser «tiradas al máximo» [V].
10. **Multijugador en navegador:** botín personal, regalos solo dentro del grupo y del botín de esa partida (WoW: se puede dar «as long as it is also not an Item level upgrade for yourself» [V]), sin comercio, `origen` en cada objeto, formato compacto y un ladder que valida carreras por semilla.

---

## 1. Estado actual de IntentoRPG (lo que hay que rehacer), con referencias

| Tema | Hoy | Problema | Ref. |
|---|---|---|---|
| Rarezas | normal (0 afijos), mágico (1–2), raro (3–4 + 1 secundario), legendario (4–5 + 1–2 secundarios + poder), conjunto | Un legendario llega a **7 afijos + poder + hasta 3 engarces + calidad**: unas 11 líneas | `js/items.js:7-13`, `:236-245` |
| Rareza como multiplicador | `statMult` 1,0 / 1,1 / 1,25 / 1,5 sobre el arma, la armadura **y** cada afijo | El legendario gana en todo: más líneas, más valor por línea y poder. El raro solo sirve de relleno | `js/items.js:7-13`, `:210-226` |
| Afijos | 16 stats en **cualquier ranura** | Sin identidad de ranura | `js/items.js:43-61` |
| Atributos | Los 4 atributos tiran igual para todas las clases | Afijos muertos según la clase; el banco ya vio el sesgo de `itemValue` | `MEMORIA.md:350` |
| Mayor ★ | 8 % por afijo en cualquier rareza ≥ mágico, ×1,5 | Pierde rareza y no se nota | `js/items.js:227-231` |
| Recurso | `mph` topado a 2 (`CAPS.mph`); «Maná máximo» agranda la **Furia** sin tope | Los afijos de recurso planos valen distinto en cada clase | `js/combat-math.js:53-57`, `js/resources.js:39-44` |
| Resistencias | Existen con tope del 70 %, pero ningún afijo las da **y casi ningún enemigo hace daño elemental** | Si entran al pool, serían afijos muertos | `js/combat-math.js:486-491`, actual.md §5 |
| Valoración | **Tres fuentes:** `itemPower` (pesos fijos), `_charDPS` (hoja) y `st.power` (suma `mf×0,1` y `maxMP×0,03` y lanza «+N ⚡ Poder») | Se contradicen; el ⚡ Poder premia el hallazgo mágico | `js/ui.js:2548-2560`, `js/entities.js:962-971`, `js/ui.js:670-672` |
| Bendiciones | `base + per·nivel de grieta`, **sin tope** (grieta 30: b_crit +34 %, b_dmg +68 %) | Compiten con los afijos (crítico 3–6 %) | `js/data.js:583-597` |
| Requisito de nivel | No existe | Con el alijo compartido, un Nv1 lleva il40 | `js/economy.js:158-173` |
| Poderes legendarios | 6 genéricos | No hablan con habilidades ni especializaciones | `js/items.js:95-102` |
| Códice | Por **héroe** (`codex` en los campos del guardado del jugador); extraer consume el objeto | No hay progreso de cuenta para 3 héroes con alijo compartido | `js/save-schema.js:57`, `js/game-endgame.js:95-130` |
| Calidad | 0–5, +6 % por rango al arma, la armadura y los afijos; el Tormento la regala hasta ⌊T/2⌋ | Encaminada, pero es un eje más en cada pieza | `js/entities.js:798-801`, `js/combat-math.js:133` |
| Nivel de objeto | `ILVL_MAX = 40`; arma = 3·G(ilvl) | El AL llega a 40 en el **Nv58**, a 47 en el Nv70 y a 50 en el Nv100. Desde el Nv58 el equipo se congela y la vida enemiga sube ×2,38 | `js/combat-math.js:138-143`, `:548-562` |
| Rareza al caer | Pesos 82/15/2,2/0,3; ≈1 legendario cada ~860 comunes en el piso 21 | Casi todo es basura blanca o azul | `js/items.js:166-181`, actual.md §1.1 |
| Inventario | 32 casillas; bolsa de materiales (60); alijo de 24 | Sin pestañas ni búsqueda | `js/economy.js:45` |
| Ganchos del Paso 2 | `stats.skillLv` reservado (tope práctico +2 de equipo); aspectos por variante; poderes `v_*` con `state` | Ya está decidido que el ítem hable con las habilidades | `docs/paso2-diseno.md:274-275`, `docs/paso2f-habilidades-ux.md:824-826` |

---

## 2. Panorama por juego (2025–2026), con números y fuentes

### 2.1 Diablo IV: Loot Reborn (T4, 2024) → T11 (dic-2025) → Lord of Hatred (abr-2026) → T14–T15

**Temporada 4, «Loot Reborn» (mayo de 2024)** [V]: https://news.blizzard.com/en-gb/article/24077223/galvanize-your-legend-in-season-4-loot-reborn
- Legendarios con **3** afijos y raros con **2**. Los condicionales se cambian por bases simples.
- **Afijo Mayor:** «1,5× más potente», solo en Ancestrales, con sonido, icono y aspecto propios.
- **Templado** con 6 categorías y **obra maestra**. Menos drops, más valiosos. El **Códice** guarda los aspectos para siempre.

**Temporada 11 (2.5.0, diciembre de 2025)**, notas oficiales [V]: https://news.blizzard.com/en-us/article/24244466/diablo-iv-patch-notes
- «Legendary Items have an additional Affix for a total of 4.» Los raros pasan a «1 Temper».
- «Upgrading an affix to a Greater Affix can now also occur on non-ancestral items.» **El Mayor ya no es exclusivo de los Ancestrales.**
- «To sanctify an item, it only needs to have an item power of 750 or higher in Torment difficulties.»
- «Affix ranges have been adjusted across the board.» Según el resumen del buscador, los rangos se estrecharon y los valores subieron [S].
- «Maximum quality is now 25, up from 20.» Esto resuelve la duda de la v1: 20 era el PTR y 25 el valor final.
- «Indestructible affix replaced by adding 5-25 Quality ranks.»
- Motivo del templado dirigido: estropear objetos con el templado al azar «se sentía castigador» [S, Icy Veins con 403].

**Obra maestra en Lord of Hatred** (Maxroll, actualizada el 23-may-2026) [V]: https://maxroll.gg/d4/resources/masterworking-guide
- 25 rangos de «+1% per rank, up to +25% in total» al daño base, la armadura, la resistencia y **todos** los afijos.
- Cada mejora da hasta 5 rangos al azar.
- Al rango 25, un **remate** de **+50 % a un afijo al azar** (puede caer en el templado), que se puede re-tirar pagando 10 M de oro.
- Coste de 0 a 25: 7,25–11,25 M de oro y 492–1366 de Obducita.

**Lord of Hatred (expansión, 28-abr-2026)**, artículo oficial [V]: https://news.blizzard.com/en-us/article/24267729/prepare-for-the-reckoning-lord-of-hatred-draws-near
- Filtro de botín nativo, **Cubo Horádrico** («add, remove, and reroll affixes») y **Talismán** con «up to 6 Charm slots». Los amuletos no únicos con el mismo afijo acumulan su bono.
- «Uniques will have fewer affixes which are inherently fixed.»
- Los comunes, mágicos y raros de Tormento aptos para Ancestral pueden «even contain Greater Affixes». El filtro distingue «1-4 Greater Affixes».
- «Más de 200 aspectos rehechos para tener más impacto»; muchas pasivas salen del árbol y van a aspectos y únicos.
- Los multiplicadores de daño «se acumulan de forma aditiva entre sí».
- **El artículo no da un número de afijos para los legendarios.** El «5.º afijo potente» que puse en la v1 no tiene fuente; queda retirado.
- Topes de poder 850 (no ancestral) y 900 (ancestral) [S, d4guides.gg].

**Parche 3.0.x** [V]: https://news.blizzard.com/en-us/article/24271857/diablo-iv-patch-notes-3-0
- Las gemas de arma pasan a ser multiplicadores por elemento.
- El 2 piezas del set Storm Shepherd **baja de 75 % a 40 %**.

**Cubo Horádrico (Maxroll)** [V]: https://maxroll.gg/d4/resources/horadric-cube
- La Transfiguración bloquea el objeto. El **Prisma Entrópico** quita los resultados malos: un camino seguro con techo menor.
- Recetas «3 iguales → 1», único → Mítico y Prismas de afinado por categoría.

**Temporada 14, «Death Awakening» (30-jun-2026)**, DiabloBytes (23-jun-2026) [V]: https://www.diablobytes.com/diablo-iv/news/2026-06-23-after-upsetting-everyone-by-threatening-to-ruin-diablo/
- El plan original quitaba a los únicos todas sus líneas fijas («stripped Uniques of their guaranteed stats, replacing them entirely with random rolls»). Tras una semana de pruebas con «overwhelmingly negative feedback», Blizzard lo revirtió.
- Resultado: «two guaranteed stats per Unique that align with its thematic identity»; el resto al azar, con una línea secundaria intercambiable.
- **Míticos:** «automatically roll maximum stat values whether they drop or are crafted».
- Los Míticos caen menos y los Sellos Míticos más [S, OpenCritic y TweakTown].

**Temporada 15, «Hell's Legacy» (15-sep-2026)** [S, MP1st, Mobalytics (403) y allthings.how]:
- **Astillas de Alma:** te equipas hasta 3 de 8, cada una con una ventaja y un **inconveniente demoníaco**.
- 9 únicos «Legacy» (Stone of Jordan, Messerschmidt's Reaver…) vuelven al botín.
- Crafteo de Míticos **determinista**.
- La re-tirada Horádrica de amuletos y sellos ya no toca sus bonos de set.

> **Lectura del diseño (v2):** la dirección estable de D4 es (a) afijos simples, (b) un remate visible, (c) templado **dirigido**, (d) Calidad con remate, (e) aspectos que llevan las pasivas y (f) filtro nativo. Hay **dos lecciones nuevas** de 2026. Primera: **la identidad del único se protege con líneas fijas**; aleatorizarlo todo provocó una revuelta. Segunda: la persecución final ya no es «más líneas», sino **tiradas al máximo** (el Mítico), un techo fijo y conocido. Además, **D4 tiene ya unas 7 capas** (afijos, Mayor, templado, Calidad con remate, Santificación/Transfiguración, Talismán y Astillas): justo lo que IntentoRPG **no** debe copiar entero.

### 2.2 Path of Exile 2

**Base del sistema (Maxroll)** [V]: https://maxroll.gg/poe2/resources/path-of-exile-2-crafting-overview
- Mágico: 1 prefijo + 1 sufijo. Raro: hasta 3 + 3.
- El pool depende de la base y los tiers se desbloquean por **nivel de objeto**.
- Orbes, Esencias (un mod **elegido**), Augurios, Vaal (corrompe y **bloquea**) y Fracturar.

**Parche 0.5.0 «Return of the Ancients» (29-may-2026)** [V]: https://kami-labs.fr/en/path-of-exile-2/poe2-patch-0-5-return-of-the-ancients-notes-complet-en/
- Monedas Mayores y Perfectas **más raras**; adiós al Recombinador.
- La velocidad de lanzamiento en joyería ya no comparte pool con focos y varitas: **pools por ranura**.
- Los «+niveles de habilidad» bajan: a dos manos de +7 a +5, a una mano de +5 a +4 y en el carcaj de +2 a +1.
- Una sola Esencia por objeto [S, Mobalytics].

**Estado a octubre de 2026** [S, Massively OP del 28-ago-2026, 403]: la liga «Forbidden Rites» empezó el 4-sep-2026 y la 1.0 llega el 11-dic-2026.

> **Lectura:** PoE2 recorta el determinismo en la cima y modera los «+nivel de habilidad», la palanca más fuerte. Los pools son **por ranura**.

### 2.3 Last Epoch (la T5 empezó el 1-oct-2026, dato verificado por la refutación)

**Forja (Maxroll)** [V]: https://maxroll.gg/last-epoch/resources/beginner-crafting-guide
- **Potencial de Forja:** un presupuesto **limitado** por objeto. T1–T5 se craftean; T6–T7 solo caen en **Exaltados**.
- Glifos y runas acotan el azar; el éxito crítico abarata.

**Potencial Legendario y Voluntad del Tejedor** [V]: https://maxroll.gg/last-epoch/resources/weavers-will-uniques. El único absorbe afijos de un Exaltado (LP) o sube de nivel matando (Voluntad del Tejedor).

**Filtro de botín** [V]: https://maxroll.gg/last-epoch/resources/loot-filter-guide. Hasta 75 reglas, condiciones por tier y nivel dinámico.

**Facciones** (desarrolladores) [V]: https://forum.lastepoch.com/t/trade-development-update-introducing-merchants-guild-and-circle-of-fortune-factions/51994
- **Círculo de la Fortuna:** sin comercio, Profecías que **apuntan** a objetos que eliges.
- **Gremio de Mercaderes:** con comercio.
- Una fuente nueva de objetos «llevaría a un aumento drástico del poder del jugador».
- En grupo, lo que cae se puede regalar a los compañeros, y lo regalado **no se puede vender**.

### 2.4 Diablo II Resurrected (y Reign of the Warlock, 2026)

- **Generación clásica** [V]: https://wiki.projectdiablo2.com/wiki/Item_Affixes. Raro con 3–6 afijos según el ilvl, **grupos exclusivos** y pesos.
- **Palabras rúnicas** [V]: https://us.forums.blizzard.com/en/d2r/t/how-do-we-fix-runewords/107172. «Rompieron la itemización» porque la runa conserva su stat y la palabra suma encima.
- **Parche 3.0** [V]: https://www.diablobytes.com/d2-resurrected/news/patch-notes-3-0/
  - Filtro nativo con sonido e icono en el minimapa.
  - El **tooltip enseña el nivel del objeto y el rango de tier**.
  - Pestañas de materiales que se ordenan solas.

### 2.5 Grim Dawn [V]: https://www.grimdawn.com/guide/items/the-hunt-for-loot
- Raros con efectos exóticos pero números no mayores que un mágico.
- **Monster Infrequents:** un monstruo concreto suelta un objeto concreto, y eso permite farmear con objetivo.
- «+2 a una habilidad» y habilidades concedidas.
- **Sets con stats base más bajos.**

### 2.6 Torchlight Infinite [S]: https://maxroll.gg/torchlight-infinite/resources/gear-corrosion-guide (hoy 404)
- La corrosión tiene ~70 % de estropear el objeto y lo liga a la cuenta.

### 2.7 Diablo III, Loot 2.0 (2014), como lección
- Menos objetos y mejores, con rangos más estrechos [S].
- **Botín inteligente:** el objeto **cae** con el principal de tu clase [S]: https://di.diablowiki.net/Loot_2.0 (403).
- [memoria] Botín inteligente del ~85 % en legendarios y sets.
- Motivo de quitar la casa de subastas: «muy poca fricción» [S].
- **Ojo (corrección de la v1):** esto **no** es lo mismo que el principal de WoW, que **se adapta** a quien lleva la pieza (§2.8). Con el alijo compartido, el modelo D3 vuelve a crear afijos muertos al pasar el objeto a otro héroe.

### 2.8 MMO: presupuesto, progresión y cuenta

**World of Warcraft**
- **Presupuesto de stats** [V]: https://warcraft.wiki.gg/wiki/Stat_budget
  - Pesos de ranura de la armadura: cabeza, pecho y piernas **1,00**; hombros, pies, manos y cintura **0,75**; muñecas y capa **0,5625**.
  - Calidad en la armadura: azul = 1,1 × verde; épico = 1,25 × azul.
  - Un engarce cuenta como «an "expected gem"», pero los bonos de engarce «don't count toward the stat budget», y tampoco los bonos de set.
  - **Matiz:** la página está marcada como desactualizada (datos de TBC a Cataclysm, última edición en oct-2023) y **no da** pesos para cuello, anillos, abalorios ni armas. Los valores ~0,55 de joyería, 0,70 de abalorios y ×1,3 de dos manos de la refutación quedan como [S].
- **BlizzCon 2013 / Warlords of Draenor** [V]: https://www.engadget.com/2013-11-09-blizzcon-2013-huge-changes-coming-to-itemization.html
  - «The primary stat on an item will change based on the spec of the character wearing it.»
  - «Reforging is gone!» porque «there is too much modification needed to be done every time you get a new piece of gear».
  - «Hit and expertise are gone»: no se sentían como un bonus.
  - Las terciarias «do not count towards the item budget».
- **Rendimientos decrecientes de los secundarios:**
  - Shadowlands [V]: https://blizzardwatch.com/2020/08/21/shadowlands-secondary-stats-scale/. Sin penalización hasta el 25 %, peldaños del 10 al 40 % después y tope del 106 % desde el equipo. El artículo no dice que se vean en el tooltip.
  - En Midnight los peldaños empiezan en el 30 % y el tope sube al 126 % [S, Wowhead de mar-2026].
  - **Corrección de la v1:** son suaves e invisibles, no «topes visibles».
- **Resistencias** [V]: https://warcraft.wiki.gg/wiki/Resistance. Se quitaron del jugador en el **parche 5.0.4** (28-ago-2012). La frase «highly situational» describe su uso en PvE; la página no da el motivo de la retirada (matiz en la §10).
- **Pistas de mejora (Midnight):**
  - Temporada 1 [V]: https://blizzardwatch.com/2026/03/02/upgrade-gear-midnight-no-valorstones-required. 5 pistas (Aventurero → Mito), cada una con rangos **1 a 6** sobre ~13 ilvl; 20 Dawncrests por rango y un tope semanal de 100.
  - Temporada 2 [S]: Campeón 292–308, Héroe 305–321 y Mito 318–334 (https://www.method.gg/guides/all-midnight-season-2-upgrade-tracks-and-item-levels).
  - **Subir de rango sube el número del objeto:** un solo eje visible.
- **Descuento de la Banda Guerrera (cuenta)** [S, soporte oficial]: https://us.support.blizzard.com/en/article/336964
  - El descuento «is decided by the character in your Warband with the highest item level in that gear slot».
  - Lo recibido por intercambio cuenta «only after the trade timer expires».
- **Gran Cámara** [V]: https://warcraft.wiki.gg/wiki/Great_Vault. Hasta 9 objetos por semana según la actividad; «only one item may be claimed», o en su lugar fichas.
- **Botín personal** [V]: https://warcraft.wiki.gg/wiki/Personal_loot
  - Se puede dar a cualquiera del grupo «as long as it is also not an Item level upgrade for yourself».
  - Blizzard pone «bad luck protection» en algunos drops para que nadie se quede sin verlos nunca (ejemplo: Fyr'alath).
- **Hazzikostas, 13-sep-2026** [V]: https://butwhytho.net/2026/09/world-of-warcraft-midnight-interview-2/
  - «every piece of gear starts to look like a spreadsheet» como señal para simplificar.
  - «we need at least like a 10 to 15 percent increase in power for an item to feel like it's making a difference».
  - «People have a visceral attachment to a certain item level number.»

**FFXIV** [V]: https://ffxiv.consolegameswiki.com/wiki/Materia
- Cada pieza tiene un techo por subestadística (ej.: «at most +110 of any one substat» en un pecho de ilvl 300), «handled separately for each substat».
- Lo normal son 2 subestadísticas, «one of those substats already at the maximum».
- El valor se pone **en rojo solo en la ventana de engarce**.
- **Sincronización de nivel:** el equipo por encima del máximo del contenido se **escala hacia abajo** y su engarce se desactiva.

**Lost Ark** [V]: https://www.playlostark.com/en-gb/news/articles/lost-ark-academy-progression. Traspaso del afinado a la pieza nueva, «so no progress is lost», por «a small fee of silver».

### 2.9 Guild Wars 2 (nuevo en la v2; lo pedía el encargo)

- **Sin cinta de correr de equipo:** Mike O'Brien (cofundador de ArenaNet, 27-nov-2012) buscaba «gradual stat progression without being a gear treadmill game». Chris Whiteside prometió «zero grind and a very low power curve» [V]: https://shacknews.com/article/76799/guild-wars-2-team-addresses-gear-grind-complaints
- **Techo fijo:** el Ascendido es el máximo de stats y el Legendario **iguala** al Ascendido; no lo supera [S]: https://wiki.guildwars2.com/wiki/Stat_change (la wiki estaba en mantenimiento).
- **Cambio de stats gratis:** el equipo Legendario cambia sus stats «at any time while out of combat at no cost». En el Ascendido el cambio destruye las mejoras [S, misma página].
- **Combinaciones con nombre** [memoria; la wiki estaba caída]:
  - Los stats vienen en paquetes con nombre (p. ej., «Berserker's»: Potencia mayor + Precisión y Ferocidad menores).
  - El jugador elige un **perfil**, no tres líneas sueltas.
- **Armería Legendaria** [memoria, 2021]: los legendarios pasan a ser de cuenta y los usan todos los personajes a la vez.

> **Lectura:** GW2 demuestra que un techo **fijo y alcanzable**, más progreso horizontal y de cuenta, aguanta años y facilita el cooperativo, porque los amigos acaban con los mismos stats máximos. Para IntentoRPG eso apoya (a) un `ILVL_MAX` que deje de crecer en el Nv70 (§7.7), (b) un Mítico de cuenta con cambio libre de líneas y (c) leer las líneas por **perfil** (glifo de categoría dominante) en vez de por número.

---

## 3. Patrones transversales (corregidos)

### 3.1 Qué hace emocionante el botín
1. **Escasez con señal:** sonido e icono (D4) y el pilar y el halo que ya existen en IntentoRPG.
2. **Un objetivo que se persiga, con suelo garantizado:**
   - Persecución: MI de Grim Dawn, Profecías de Last Epoch y únicos con nombre.
   - Suelo garantizado: Gran Cámara, protección contra la mala suerte de WoW y aspectos de mazmorra de D4 [S].
3. **Que cambie cómo juegas:** aspectos que llevan las pasivas (D4 LoH).
4. **Un techo lejano pero fijo y conocido:** el Mítico «al máximo» de D4 S14 y el Legendario de GW2.
5. **Identidad protegida:** el único conserva sus líneas fijas (D4 S14).

### 3.2 Legibilidad (visual, poco texto)
- **Un solo número por pieza** que sube al mejorarla: las pistas de WoW y el «visceral attachment» al nivel de objeto.
- **Un solo indicador por línea:** 5 segmentos para la calidad de la tirada y ★ para el remate. Lo demás, con Alt (PoE y D4).
- **Glifo de categoría** por línea (las categorías de templado de D4) y lectura por **perfil** (GW2).
- **Valor real, no alarma:** el comparador enseña el delta de la simulación. Nada en rojo; el rojo de FFXIV vive solo en su ventana de engarce.

### 3.3 Cómo se evita la sopa de stats
1. Quitar condicionales y stats de relleno (D4 T4). **También el hallazgo mágico** como afijo, que D4 S4 sacó del equipo.
2. **Pool por ranura** y **grupos exclusivos** (PoE2 0.5 y D2).
3. **Principal adaptable** (WoW) en lugar de 4 atributos.
4. **Techos por ranura** que el equipo solo no puede pasar: lo justo para no llegar a los `CAPS`, sin topes visibles.
5. **Tope de líneas**, contando lo crafteado: D4 subió de 3 a 4 y añadió capas porque nadie fijó uno.

### 3.4 Cuántos afijos (comparativa corregida)

| Juego | Mágico | Raro | Legendario / Único | Extra de crafteo |
|---|---|---|---|---|
| D2 | 1–2 | 3–6 | Único fijo | Palabra rúnica |
| D4 T4 | — | 2 | 3 + aspecto | 2 templados, obra maestra |
| D4 T11 | — | — | **4** + aspecto [V] | 1 templado, Calidad 25, Santificación |
| D4 LoH → S14 | — | — | 4 + aspecto; único con **2 fijas** + al azar (+1 intercambiable) [V] | Cubo, Transfiguración, Talismán; Mítico = tiradas al máximo |
| PoE2 | 1+1 | 3+3 | Único fijo | Corrupción, runas |
| Last Epoch | 1–2 | hasta 4 | Exaltado T6–T7; único + LP | 5.ª ranura sellada |
| FFXIV | — | — | 2 subestadísticas (1 al techo) | engarce hasta el techo |
| GW2 | — | — | combinación con nombre, stats fijos | cambio libre en el Legendario |

Patrón: **3–4 líneas** en lo que cae, **1 elegida** al craftear y **un poder** que define la build. Y un techo conocido.

### 3.5 Rareza
- O la rareza escala el valor de cada línea (WoW: épico = 1,25 × azul, **sin** más líneas), o fija cuántas líneas y si hay aspecto (D4, con el valor según el poder del objeto). **Las dos cosas a la vez**, como hoy en IntentoRPG, hacen que el legendario lo domine todo.

### 3.6 Nivel de objeto, poder y nivel requerido
- PoE2 y D2: el ilvl decide qué tiers pueden salir.
- D4: bandas de poder (850/900).
- WoW: pistas de 6 rangos (1/6 a 6/6) cuyo número sube con cada rango.
- FFXIV: sincronización hacia abajo.
- IntentoRPG: multiplicador continuo G con tope 40 y **sin nivel requerido**.

### 3.7 Poder por ranura
- **El arma manda**, pero su daño es un implícito del ilvl, **fuera** del presupuesto de afijos. Si no, se cuenta dos veces, porque daño = arma × coef (`js/combat-math.js:10`).
- Pesos de armadura de WoW verificados (1,00 / 0,75 / 0,5625). El resto, propuesta (§7.2).

### 3.8 El ítem y las habilidades
- D4 LoH lleva las pasivas a los aspectos.
- PoE2 modera los «+nivel».
- Grim Dawn da «+N a una habilidad».
- En IntentoRPG ya está decidido que el aspecto modifique una variante y lo diga en el tooltip.

### 3.9 Crafteo
- Orden clásico: base → ajuste dirigido → mejora lineal con remate → sello opcional.
- **Corrección v2:** para un juego de un solo dueño, sin comercio y con 3 héroes, **una capa dirigida** más la mejora (dentro del número) bastan. El sello y el Talismán son capas 5–7 de D4 y quedan para después de E4b.
- **Regla de inversión:** lo que no se transfiere al cambiar de pieza tiene que salir barato frente a la frecuencia de drops de esa ranura. Lo caro vive en la cuenta: Códice y marca de agua.

### 3.10 Multijugador (botín y comercio)
- **Botín personal** (D4 [S]; WoW [V]).
- **Regalar solo dentro del grupo** lo que cayó en esa partida y no te mejora (WoW [V]; Last Epoch [V]).
- El comercio dispara el poder (Last Epoch [V]).
- En el navegador, con guardado local, nada de lo comerciable es de fiar.

---

## 4. Recomendaciones v0 (antes de refutar; **superadas por la §7**)

> Se conservan para la trazabilidad. Lo tachado en la §5, §6 y §10 ya no vale.

- **R1:** tope de 6 líneas; Mágico 2, Raro 3–4, Legendario 3 + aspecto, Único 2–3 fijos, Mítico = Único + ★. → **v2:** 4 líneas + aspecto (§7.3).
- **R2:** 6 categorías con resistencias y recurso plano; atributo «inteligente» al estilo D3. → **v2:** sin resistencias, recurso solo en % y principal adaptable al estilo WoW (§7.4).
- **R3:** tiers T1–T5 con pips y ★ solo en Ancestral. → **v2:** sin tiers; un indicador de 5 pasos (§7.4).
- **R4:** 10 o 12 ranuras; amuletos de mochila → Talismán. → El Talismán queda **pospuesto** (§7.9).
- **R5:** ~45 aspectos por especialización + 10 genéricos, en el Códice con rango. → Se mantiene, con Códice de cuenta y protección contra la mala suerte (§7.8).
- **R6:** 4 capas (reforjar, templar, Calidad con traspaso, sello). → **v2:** una sola capa más la mejora dentro del número (§7.5 y §7.9).
- **R7:** botín inteligente (D3), menos blancos y filtro. → Botín sesgado solo para los **aspectos**; el principal se adapta (§7.4).
- **R8:** pestañas y **tope en rojo**. → Sin rojo (§7.4).
- **R9:** `ILVL_MAX` 50 (A) o 40 (B). → **v2:** opción C, 47 (§7.7).

## 5. Primera refutación interna: experta en itemización de ARPG (v1)

> Revisión que hice yo adoptando ese papel; **no es una persona real**. La columna «Estado v2» dice qué sobrevivió a la refutación externa.

| # | Objeción | Respuesta en la v1 | Estado v2 |
|---|---|---|---|
| E1 | «D4 vuelve a inflar los afijos» | Presupuesto de poder además del de líneas; lo añadido **reparte** | **Retirado.** Lo añadido suma hasta un **techo** (§10, objeción 2) |
| E2 | «El crafteo dirigido resuelve el juego» (PoE2 0.5) | La cima queda aleatoria | Se mantiene: los pasos de la línea forjada salen al azar |
| E3 | «Los aspectos por variante fragmentan el botín» | Sesgo por clase y especialización | Se mantiene, **más** protección contra la mala suerte (§7.8) |
| E4 | «Los sets se vuelven obligatorios» (Storm Shepherd 75 → 40 %) | Sets solo en el Talismán | Talismán **pospuesto** |
| E5 | «Las palabras rúnicas eclipsan» | Pierden el stat de las runas | Pospuesto con el Talismán |
| E6 | «El sello que estropea frustra» | Nunca destruye | Sello **pospuesto** |
| E7 | «Demasiado texto» | Glifo + pips + valor | Corregido: un solo indicador (§7.4) |
| E8 | «+rangos de habilidad, la palanca más rota» | Tope +2, ≤ +1 por pieza, 3 ranuras | Se mantiene |

## 6. Segunda refutación interna: MMO y multijugador en navegador (v1)

| # | Objeción | Respuesta en la v1 | Estado v2 |
|---|---|---|---|
| M1 | «Sin presupuesto por ranura, se malgastan stats» | Pesos 100/85/70/60 y tope en rojo | **Corregido:** pesos de WoW, techo y sin rojo (§7.2 y §7.4) |
| M2 | «Perder la Calidad frena el cambio» | Traspaso Lost Ark 100 % / 50 % | **Sustituido** por la marca de agua de cuenta (§7.5) |
| M3 | «Todo lo comerciable es falsificable» | Sin comercio; regalo en grupo; `origen` | Se mantiene |
| M4 | «El ladder debe validar carreras» | Semilla de la carrera | Se mantiene |
| M5 | «El botín compartido genera peleas» | Botín personal | Se mantiene, ahora con fuente [V] |
| M6 | «Nv20 con Nv80 rompe el ilvl» | Sincronización (frente multijugador) | **Absorbido** por el NO efectivo (§7.6) |
| M7 | «El tamaño del guardado y la red» | Formato compacto | Se mantiene, más simple sin tiers (§7.10) |
| M8 | «El comercio recalibra todo» | Curva sin comercio | Se mantiene |

---

## 7. Propuesta v2 (lo que pasa al frente de diseño)

### 7.0 Cinco reglas de fondo
1. **Tres ejes visibles por pieza:**
   - **◆ NO** (Nivel de Objeto = ilvl + rango de mejora).
   - **Rareza** (cuántas líneas y si trae aspecto).
   - **◇ una línea forjada.**
   - Lo demás (★, engarces, aspecto) es una **marca dentro** de esos ejes, no un eje nuevo.
2. **El presupuesto es un techo.** Techo por ranura × NO, por stat y total. Lo que cae llena ~70–85 %. Forjar y mejorar **suman** hasta el techo, nunca restan.
3. **Cuota de poder del equipo** fijada y medida (§7.1). De ahí salen los techos.
4. **Regla de inversión:** lo que se pierde al cambiar de pieza sale barato. Lo caro (aspectos y rango máximo por ranura) vive en la **cuenta**.
5. **Una sola valoración:** la simulación con el perfil resuelto de habilidades alimenta el veredicto, el ▲ de la celda, el orden «mejor para mí» y el ⚡ Poder. Hallazgo mágico y oro, fuera del poder.

### 7.1 Cuota de poder del equipo (nuevo)

**Medida:** cuota = 1 − valor(referencia) / valor(equipado).
- La **referencia** es arma y armadura **blancas** del NO del hito, rango 0, sin líneas, sin aspectos y sin gemas. El daño del arma es el andamio de toda la fórmula y no cuenta como progreso del equipo.
- Se mide en `balance-bench` para el DPS y para la vida efectiva (con las capas de `combat-math`), con los perfiles «típico» y «óptimo».

| Hito | DPS que pone el equipo | Vida efectiva que pone el equipo | Quién pone el resto |
|---|---|---|---|
| Nv20 | 25–35 % | 25–35 % | nivel, talentos y especialización |
| Nv50 | 35–45 % | 35–45 % | talentos y forja de habilidades |
| Nv70 · T1 | 40–50 % | 40–50 % | + bendiciones (con tope) |
| Nv100 · T5 | 45–55 % | 40–50 % | + tablero de glifos y Era |
| Nv100 · T10 | 45–55 % | 40–50 % | igual; lo que cambia es la mejora, la ★ y el rango de los aspectos |

- Son **propuestas de partida**; ningún juego publica su cuota. La refutación sugirió 40–50 % al final, y lo subo a 45–55 % en DPS porque el aspecto vive en el equipo.
- **Bendiciones:** nivel de bendición con tope (propuesta: 10, o sea b_dmg ≤ 28 % y b_cdr ≤ 15 %). Además, **b_crit pasa a daño crítico** para no competir con el crítico del equipo. Hoy, con grieta 30, b_crit da +34 % (`js/data.js:583-597`).

### 7.2 Ranuras y pesos (corregido)

| Ranura | Peso del techo de líneas | Implícito (fuera del techo) | Fuente |
|---|---|---|---|
| Casco, pecho, pantalones | 1,00 | armadura | WoW [V] |
| Hombreras, guantes, cinturón, botas | 0,75 | armadura | WoW [V] |
| Mano izquierda | 0,75 | armadura o bloqueo | propuesta |
| Arma | 0,75 | **daño de arma por NO** | propuesta (separa el implícito para no contarlo dos veces) |
| Amuleto | 0,70 (como un abalorio) | — | WoW [S] |
| Anillos | 0,5625 | — | WoW (muñeca y capa [V]; joyería [S]) |

- El techo total por ranura se deriva de la cuota (§7.1): techo(ranura, NO) = peso × B(NO), con B calibrado en E4b.
- **Gemas dentro del techo**, como el «expected gem» de WoW [V]. Los engarces se muestran como iconos en la línea de la base.
- La pregunta de **12 o 10 ranuras** sigue abierta (§8).

### 7.3 Rarezas (una sola palanca: líneas y aspecto; sin multiplicador)

| Rareza | Líneas al azar | Línea forjada ◇ | Aspecto o poder | Papel |
|---|---|---|---|---|
| Normal | 0 | sí | — | base con engarces |
| Mágico | 1–2 | sí | — | relleno de nivelación |
| Raro | 3 | sí | grabable (pasa a legendario) | **base del legendario a medida** (D4) |
| Legendario | 3 | sí | 1 aspecto | lo normal en el final del juego |
| Único | **2 fijas** + 1 al azar | sí | poder propio | persecución con nombre (D4 S14 [V]) |
| Mítico | las del único, **todas al paso 5** | sí | poder propio | techo fijo; ~1 por especialización (D4 S14 «maximum stat values» [V]) |

- **Tope duro: 4 líneas** (3 + 1 ◇) más el bloque de aspecto o poder. Coincide con el tooltip de ≤ 9 líneas de ux.md (§7.10).
- **`statMult` desaparece.** El arma, la armadura y las líneas dependen solo del NO y del paso de la tirada.
  - **Aviso para E4b:** hoy el arma legendaria rinde ×1,5 sobre la blanca y ×1,2 sobre la rara (`js/items.js:210-211`). Quitarlo baja un 33 % el daño de arma del perfil óptimo, y hay que compensarlo en `weaponBase` o en el NO.
- **Mítico de cuenta (idea de GW2, pregunta al dueño):** su línea al azar se puede cambiar gratis fuera de combate.

### 7.4 Afijos

- **Categorías con glifo:**
  - **Ofensivo:** daño %, crítico, daño crítico, vel. de ataque, daño de un elemento.
  - **Defensivo:** vida, Vitalidad, armadura, bloqueo (solo escudo).
  - **Movilidad:** vel. de movimiento (solo botas y amuleto), recarga de la esquiva.
  - **Recurso:** **solo %**, con las claves `costPct` y `resGainPct` que ya existen.
  - **Habilidad:** +1 rango a una habilidad o categoría (`stats.skillLv`), solo en arma, amuleto y mano izquierda; tope +2 de equipo y ≤ +1 por pieza.
- **Atributo principal adaptable:** una línea «Principal» que `recompute` resuelve según la clase de quien la lleva (Fuerza, Destreza o Energía). Así ya ningún objeto queda muerto al pasar entre héroes. **La joyería no lleva principal**, como en WoW. Esto también arregla el sesgo de `itemValue` del banco.
- **Fuera del pool:**
  - **Resistencias**, hasta que haya daño elemental enemigo con peso medido. Cuando entren, una sola línea «Resistencia a todo» o un implícito por ranura.
  - **«+Recurso máximo».** Además, arreglar `resourceMax` para que la Furia no crezca con `mp` (`js/resources.js:43`).
  - **Hallazgo mágico** (va al collar, a las bendiciones de Fortuna y al Tormento).
- **Pools por ranura y grupos exclusivos** (PoE2 0.5 y D2).
- **Valor de una línea:** rango estrecho por NO (D4 2.5.0) en **5 pasos discretos**. Todos los valores escalan con el NO, también los %, con una curva más suave (propuesta: ×(0,4 + 0,6·NO/NOmáx)). Así funciona el escalado hacia abajo de la §7.6.
- **Un solo indicador por línea:** ▰▰▰▱▱ = paso 1–5. **★ = paso 6**, ×1,5 del paso 5, que solo llega por drop de Tormento alto o por el remate de la mejora.
  - Con Alt: `[mín–máx]` del NO, el valor exacto y [+] o [×].
  - **No hay tiers T1–T5** que convivan con la barrita (contradicción de la v1 con ux.md, resuelta).
- **Topes sin rojo:** los techos se diseñan para que **el equipo solo** no pase de ~60 % de cada `CAP` (crítico ≤ 35 de 60, enfriamiento ≤ 30 de 50, movimiento ≤ 25 de 50). Si el banco muestra que se apila, se añade una **banda suave**: el 50 % del exceso del equipo cuenta, al estilo de los peldaños invisibles de WoW. El comparador solo enseña el delta real.

### 7.5 ◆ NO y mejora (la Calidad se funde en el número)

- **NO = ilvl + rango de mejora (0–5).**
  - Cada rango da +6 % al arma, la armadura y las líneas, igual que la Calidad de hoy (`js/entities.js:798-801`). En el tooltip solo se ve que el número sube: ◆ 44 → ◆ 45.
  - Es el modelo de las pistas de WoW, «1/6 → 6/6» [V].
- **Tormento:** el botín cae con mejora ⌊T/2⌋, como hoy (`js/combat-math.js:133`).
- **Remate al rango 5:** ★ en una línea al azar, re-tirable con oro (D4 LoH [V]).
- **Saltos de contenido ≥ +2 NO** (≈ +13 % con G = 1,065). Hazzikostas: «at least like a 10 to 15 percent increase in power for an item to feel like it's making a difference» [V].
- **Marca de agua de cuenta** (sustituye al traspaso de Lost Ark):
  - Subir una pieza nueva hasta el NO más alto que ya alcanzaste en esa ranura, con **cualquier** héroe, cuesta 1/3.
  - No se consume nada (Banda Guerrera de WoW [S, soporte oficial]).
  - Lo **regalado** cuenta para la marca solo cuando vence su ventana de regalo (misma fuente).

### 7.6 Nivel requerido por escalado (nuevo)

- **NO efectivo = mín(NO, NOmáx(nivel) + 2)**, con NOmáx(nivel) = `itemLevel(areaLevelForHero(nivel))`.
  - El objeto **se escala hacia abajo**; no se bloquea.
  - El tooltip lo dice con un glifo: «◆ 45 → 38».
- El mismo mecanismo sirve para:
  - **El alijo compartido:** un Nv1 ya no lleva un il40 a pleno rendimiento.
  - **El cooperativo con niveles distintos:** cada uno escala a su nivel, y si juegas contenido inferior, al del contenido (FFXIV [V]).
  - **El ladder.**

### 7.7 `ILVL_MAX`: opción C = 47 (R9 resuelta con números del código)

- **Datos** (`js/combat-math.js:548-562`):
  - El AL es 40 en el Nv58, 47 en el Nv70 y 50 en el Nv100.
  - La vida enemiga crece con G^1,38: ×1,84 de AL 40 a 47 y ×1,30 de 47 a 50, ×2,38 en total.
- **Objetivo de la §7.1:** la mitad del crecimiento del Nv58 al 100 la pone el equipo. Eso exige √2,38 ≈ ×1,54.

| Opción | Crecimiento del daño de arma del Nv58 al 100 | Frente a ×1,54 |
|---|---|---|
| A: `ILVL_MAX` 50 | G^10 = ×1,88 | **se pasa** (×1,22 de más) |
| B: 40 + mejora | ×1,30 (solo los 5 rangos, que ya cuentan hoy) | **se queda corto** |
| **C: `ILVL_MAX` 47** (= AL del Nv70) | G^7 = **×1,55** | **cuadra** |

- Con C, el equipo crece en NO hasta el Nv70. Del 70 al 100 el progreso pasa a ser **horizontal**: rango de los aspectos, ★, Míticos, tablero de glifos y mejoras. El banco ya midió ×1,27 de DPS del 70 al 100 sin equipo nuevo, frente a ×1,30 de vida enemiga.
- Es el «techo fijo» de GW2 aplicado al tramo final.
- **Límite:** el cálculo supone DPS ∝ daño de arma y no incluye la vida efectiva. Hay que confirmarlo en E4b junto con la compensación del `statMult` (§7.3).

### 7.8 Aspectos y protección contra la mala suerte

- **Catálogo:** ~45 por especialización (4–6 cada una) + ~10 genéricos. Cada uno modifica **una variante o indicador** y muestra el glifo de la variante.
- **Códice de cuenta**, ordenado por clase (hoy es por héroe: `js/save-schema.js:57`). Los aspectos se guardan con rango y se graban en raros.
- **Sesgo:** el ~85 % de los aspectos son de tu clase [memoria, D3] y la mitad de esos, de tu especialización activa.
- **Problema medido** (el cálculo de la refutación es correcto):
  - Con ~1 legendario cada ~860 comunes, un aspecto concreto sale en 0,85 × 0,5 × 1/5 ≈ **8,5 %** de los legendarios: ~12 de media, unas 10 000 muertes.
  - Peor aún, la cola: tras 30 legendarios, el **7 %** de los jugadores sigue sin él (0,915^30).
- **Arreglo:**
  1. **Polvo de aspecto:** extraer un aspecto que ya tienes a ese rango o más deja polvo. Con 5 duplicados compras en el Códice un aspecto **elegido** de tu clase **a rango 1**. Los rangos altos siguen saliendo solo del botín, así que la persecución sigue viva.
  2. **Cofre del jefe de grieta: elige 1 de 3** aspectos de tu clase (Gran Cámara [V]).
  3. **Jefes de zona con su aspecto propio**, que lo desbloquean la primera vez (aspectos de mazmorra de D4 [S] y MI de Grim Dawn [V]).
- **Resultado:** un aspecto concreto cuesta como mucho ~5 legendarios, frente a una media de 12 sin tope.

### 7.9 Crafteo: una sola capa ahora; el resto, después de E4b

- **Forja** (una mesa y una moneda):
  - (a) **Línea forjada ◇:** la eliges de una receta por categoría. El paso sale al azar y se puede volver a elegir con un coste creciente con tope.
  - (b) **Cambiar una línea al azar:** eliges cuál, ves 2 opciones o te quedas con la actual. Sustituye a `rerollAffix`, que hoy borra una al azar (`js/items.js:390-403`).
- **Mejora:** forma parte del NO (§7.5).
- **Pospuestos a después de la calibración E4b:**
  - El **sello**.
  - El **Talismán y los sets**.
  - Rehacer las **palabras rúnicas**.
  - Cada uno añade un eje, y D4 ya muestra a dónde lleva eso (§2.1).

### 7.10 Tooltip y formato (alineados con ux.md)

Tooltip compacto de 9 líneas:
```
◆ Hoja del Ocaso                 ◆45
Legendario · Arma · ◯◯
▲ +8 % daño   ▼ −2 % vida   ?
⚔ 112–168
• +62 Principal        ▰▰▰▰▱
• +9 % vel. ataque     ▰▰▰▱▱
★ +14 % crítico        ▰▰▰▰▰★
◇ +11 % daño crítico   ▰▰▱▱▱
◈ Tajo deja 3 brasas · rango 3
```

- Con Alt: rangos, valor exacto y [+] o [×]. El set y la procedencia, también con Alt.
- **Formato compacto** (guardado, red y ladder): `[base, ilvl, rareza, mejora, [[id,paso]×3], [idForja,paso], [aspecto,rango], gemas, origen]`.
  - Sin tiers ni textos: nombres y descripciones se derivan del catálogo.
  - Resuelve además el problema de los textos de poder congelados (actual.md 3.12).

### 7.11 Botín e inventario
- Menos blancos.
- Filtro con presets Ligero, Medio y Estricto, más la regla «mejora tu Códice».
- **▲ solo si la simulación sube** el DPS o la vida efectiva sin bajar la otra más de X %. Con «?» cuando hay efectos no medidos (ux.md).
- **⚡ Poder** = simulación, sin `mf` ni `maxMP` (`js/entities.js:962-971`).
- Casillas uniformes y pestañas de gemas, runas y materiales con pilas.

### 7.12 Multijugador en navegador
- **Botín personal instanciado:** cada cliente tira el suyo con el stream `loot` bifurcado por jugador.
- **Regalos:**
  - Solo dentro del grupo y del botín de esa partida.
  - Solo si **no** mejora a quien lo recibió (regla de WoW [V]).
  - Con una ventana corta (D3: 2 h [S]).
  - Lo regalado no se vende (Last Epoch [V]) y cuenta para la marca de agua solo al cerrarse la ventana.
- **Sin comercio.** La curva de drops se calibra para jugar solo y en grupo.
- **`origen: {reino, partida}`** en cada objeto. Un objeto local **nunca** entra al reino del ladder; el ladder tiene su propio Códice y su propia marca de agua.
- **NO efectivo** (§7.6) para la sincronización.
- **El ladder valida carreras** repitiendo la semilla. El objeto aporta su formato compacto.

---

## 8. Preguntas abiertas para el dueño (cortas)

1. ¿**12 o 10 ranuras**? (D4 no tiene hombreras ni cinturón.)
2. ¿`ILVL_MAX` **47** (C, recomendado), 50 (A) o 40 (B)?
3. ¿Quitamos el **hallazgo mágico** de los afijos? (D4 lo hizo en la T4.)
4. ¿**Mítico de cuenta** con cambio libre de su línea al azar (GW2)?
5. ¿Mantienes el ritual de **identificar** los legendarios?
6. **Sello, Talismán y palabras rúnicas:** ¿después de E4b o nunca?
7. ¿Habrá **comercio** algún día? La propuesta asume que no.

---

## 9. Fuentes (URL → lo que saqué)

**Diablo IV**
- https://news.blizzard.com/en-gb/article/24077223/galvanize-your-legend-in-season-4-loot-reborn [V] → T4: 3/2 afijos, Mayor ×1,5, templado, obra maestra, Códice.
- https://news.blizzard.com/en-us/article/24244466/diablo-iv-patch-notes [V] → 2.5.0: legendarios con 4 afijos, raro con 1 templado, Mayor en no ancestrales, Santificación desde 750 de poder, rangos ajustados, Calidad máx. 25, Indestructible → 5–25 de Calidad.
- https://maxroll.gg/d4/resources/masterworking-guide [V, 23-may-2026] → LoH: 25 rangos de +1 %, hasta 5 por mejora, remate de +50 % a un afijo al azar, costes.
- https://news.blizzard.com/en-us/article/24267729/prepare-for-the-reckoning-lord-of-hatred-draws-near [V] → filtro, Cubo, Talismán (6 amuletos), únicos con afijos fijos, Mayores en drops de Tormento, 200 aspectos, pasivas a los aspectos; sin número de afijos de legendario.
- https://news.blizzard.com/en-us/article/24271857/diablo-iv-patch-notes-3-0 [V] → gemas por elemento; Storm Shepherd 75 → 40 %.
- https://maxroll.gg/d4/resources/horadric-cube [V] → recetas del Cubo, Transfiguración, Prisma Entrópico.
- https://www.diablobytes.com/diablo-iv/news/2026-06-23-after-upsetting-everyone-by-threatening-to-ruin-diablo/ [V] → S14: reversión de los únicos al azar, 2 líneas fijas, Míticos al máximo.
- https://d4guides.gg/en/guides/diablo-4-lord-of-hatred-uebersicht [S] → topes 850/900, únicos al azar en LoH.
- https://opencritic.com/news/34201/diablo-4-season-14-makes-big-mythic-changes-that-weren-t-mentioned-in-the-patch-notes [S] → Míticos menos frecuentes, más Sellos Míticos.
- https://mp1st.com/title-updates-and-patches/diablo-4-update-2-18-unleashed-season-of-hells-legacy-september-15 y https://mobalytics.gg/diablo-4/news/season-15-patch-notes-rundown [S, 403] → S15: Astillas de Alma, únicos Legacy, Míticos deterministas.
- https://www.icy-veins.com/d4/guides/legendary-aspects-codex-of-power-guide/ y https://www.ggrecon.com/guides/diablo-4-codex-of-power/ [S] → aspectos de mazmorra desbloqueados en el Códice; el Códice sube con mejores tiradas.
- https://diablo4.wiki.fextralife.com/Talismans_System_Guide [V] → Talismán.
- https://maxroll.gg/d4/resources/loot-filter [V] → filtro y presets.
- https://us.forums.blizzard.com/en/d4/t/lets-discuss-itemization/79584 [V] → «los objetos llueven».

**Path of Exile 2**
- https://maxroll.gg/poe2/resources/path-of-exile-2-crafting-overview [V] → base del crafteo.
- https://kami-labs.fr/en/path-of-exile-2/poe2-patch-0-5-return-of-the-ancients-notes-complet-en/ [V] → 0.5: monedas más raras, pools por ranura, +nivel de habilidad recortado.
- https://mobalytics.gg/poe-2/guides/talisman-craft [S] → una Esencia por objeto.
- https://massivelyop.com/2026/08/28/path-of-exile-2-previews-september-4s-forbidden-rites-league-and-1-0s-new-duelist-class/ [S, 403] → Forbidden Rites el 4-sep; 1.0 el 11-dic-2026.

**Last Epoch**
- https://maxroll.gg/last-epoch/resources/beginner-crafting-guide [V], https://maxroll.gg/last-epoch/resources/weavers-will-uniques [V] y https://maxroll.gg/last-epoch/resources/loot-filter-guide [V].
- https://forum.lastepoch.com/t/trade-development-update-introducing-merchants-guild-and-circle-of-fortune-factions/51994 [V] → facciones, regalos en grupo, lo regalado no se vende.

**Diablo II / D2R, Grim Dawn, TLI, D3**
- https://wiki.projectdiablo2.com/wiki/Item_Affixes [V], https://us.forums.blizzard.com/en/d2r/t/how-do-we-fix-runewords/107172 [V] y https://www.diablobytes.com/d2-resurrected/news/patch-notes-3-0/ [V].
- https://www.grimdawn.com/guide/items/the-hunt-for-loot [V].
- https://maxroll.gg/torchlight-infinite/resources/gear-corrosion-guide [S, 404].
- https://di.diablowiki.net/Loot_2.0 [S, 403] y https://blizzplanet.substack.com/p/diablo-iii-pc-auction-house-removal-announced [S].

**MMO**
- https://warcraft.wiki.gg/wiki/Stat_budget [V] → pesos de armadura 1,00/0,75/0,5625, calidad, engarce como «expected gem», sets fuera del presupuesto; página desactualizada.
- https://www.engadget.com/2013-11-09-blizzcon-2013-huge-changes-coming-to-itemization.html [V] → principal según la especialización, adiós a la reforja (y su motivo), golpe y pericia, terciarias fuera del presupuesto.
- https://butwhytho.net/2026/09/world-of-warcraft-midnight-interview-2/ [V, 13-sep-2026] → Hazzikostas: hoja de cálculo, 10–15 %, apego al número.
- https://blizzardwatch.com/2026/03/02/upgrade-gear-midnight-no-valorstones-required [V] → pistas de 6 rangos y Dawncrests.
- https://www.method.gg/guides/all-midnight-season-2-upgrade-tracks-and-item-levels [S] → pistas de la T2.
- https://us.support.blizzard.com/en/article/336964 [S] → descuento de la Banda Guerrera por ranura; lo intercambiado cuenta al vencer el plazo.
- https://warcraft.wiki.gg/wiki/Great_Vault [V] → hasta 9 objetos, solo 1 se reclama.
- https://warcraft.wiki.gg/wiki/Personal_loot [V] → regalo si no te mejora; protección contra la mala suerte.
- https://warcraft.wiki.gg/wiki/Resistance [V] → retiradas en 5.0.4; «highly situational» describe su uso en PvE.
- https://blizzardwatch.com/2020/08/21/shadowlands-secondary-stats-scale/ [V] → peldaños del 25 % y tope del 106 % (Shadowlands).
- https://www.wowhead.com/tw/guide/diminishing-returns-on-secondary-stats-in-world-of-warcraft [S] → peldaños del 30 % y tope del 126 % (mar-2026).
- https://ffxiv.consolegameswiki.com/wiki/Materia [V] → techo por subestadística, rojo en la ventana de engarce, sincronización hacia abajo.
- https://www.playlostark.com/en-gb/news/articles/lost-ark-academy-progression [V] → traspaso «so no progress is lost».
- https://shacknews.com/article/76799/guild-wars-2-team-addresses-gear-grind-complaints [V, 27-nov-2012] → «without being a gear treadmill game»; «zero grind and a very low power curve».
- https://wiki.guildwars2.com/wiki/Stat_change [S; la wiki estaba en mantenimiento] → cambio de stats del Legendario gratis fuera de combate; el Legendario iguala al Ascendido.

**Código de IntentoRPG (solo lectura)**
- `js/items.js:7-13` (rarezas y `statMult`), `:43-61` (afijos), `:95-102` (poderes), `:186` (tope de ilvl), `:210-245` (generación), `:390-403` (re-tirar al azar).
- `js/combat-math.js:10` (fórmula), `:44-58` (`CAPS`), `:123-135` (Tormento), `:138-150` (ilvl y escalas), `:548-562` (AL por nivel).
- `js/entities.js:798-801` (calidad), `:962-971` (`st.power`).
- `js/resources.js:39-44` (`resourceMax`).
- `js/data.js:583-597` (bendiciones).
- `js/game-endgame.js:95-130` (Códice).
- `js/save-schema.js:57` (`codex` por héroe).
- `js/economy.js:158-173` (equipar sin requisitos).
- `js/ui.js:670-672, 2548-2560` (⚡ Poder e `itemPower`).
- `tests/helpers/bench-core.mjs:168-200` (perfil de equipo del banco; usa `statMult` y calidad por Tormento).
- `docs/paso2-diseno.md:274-275` y `docs/paso2f-habilidades-ux.md:824-826`.

---

## 10. Refutación y cambios

**Quién refutó:** dos expertos externos revisaron todo el frente (actual.md, ux.md y este informe). Uno era de itemización de MMO/ARPG y otro de multijugador en navegador. Su texto me llegó **cortado** a mitad de la objeción sobre la opción A/B del `ILVL_MAX`, así que respondo a lo que se lee y resuelvo esa objeción con datos del código (§7.7).

| # | Objeción del experto | Veredicto | Qué cambió | Fuente nueva o comprobada |
|---|---|---|---|---|
| 1 | La v1 apila unos 10 ejes por pieza; «every piece of gear starts to look like a spreadsheet» | **Aceptada** | 3 ejes visibles: ◆ NO (ilvl + mejora; la Calidad se funde), rareza y ◇ línea forjada. Sin tiers. Sello y Talismán pospuestos. Regla de inversión escrita (§7.0) | butwhytho.net [V]; Engadget 2013 [V]; D4 2.5.0 [V] |
| 2 | «Lo que se añade reparte el presupuesto»: ningún MMO lo hace, el jugador lo vive como pérdida | **Aceptada; retiro E1** | Presupuesto = **techo** por ranura × NO, por stat y total; lo que cae llena 70–85 %; forjar suma | Stat budget de WoW [V] (sets y bonos de engarce fuera); Materia de FFXIV [V] |
| 3 | Falta la cuota de poder del equipo; las bendiciones no tienen tope | **Aceptada** | Tabla de la §7.1 con una medida exacta (referencia en blanco) y tope de bendiciones; b_crit → daño crítico | `js/data.js:583-597`; bench-core (perfil de equipo) |
| 4 | Mezcla el botín inteligente de D3 con el principal adaptable de WoW | **Aceptada** | Línea «Principal» que resuelve `recompute` según la clase; joyería sin principal; el sesgo de botín queda solo para los aspectos | Engadget 2013 [V]: «will change based on the spec» |
| 5 | WoW no tiene «topes visibles»; el rojo en el comparador empuja a microgestionar | **Aceptada** | Sin rojo; techos para que el equipo solo no llegue a los `CAPS`; banda suave solo si el banco muestra que se apila; el comparador enseña el delta real | BlizzardWatch 2020 [V]; Materia de FFXIV [V] (rojo solo en el engarce) |
| 6 | Resistencias en el pool = afijos muertos; WoW las quitó en 5.0.4 | **Aceptada, con un matiz** | Fuera del pool hasta que haya daño elemental. **Matiz:** según la wiki, «highly situational» describe su uso en PvE y no es el motivo oficial de la retirada; las notas de 5.0.4 no dan uno. La conclusión se sostiene igual por la lección de golpe y pericia | warcraft.wiki.gg/wiki/Resistance [V] |
| 7 | Los afijos de recurso planos valen distinto en cada clase | **Aceptada** | Solo `costPct` y `resGainPct`; nada de «+recurso máximo»; arreglar `resourceMax` de la Furia | `js/resources.js:39-44` |
| 8 | Tres fuentes de «poder» que se contradicen | **Aceptada** | Una sola valoración por simulación para el veredicto, el ▲, el orden y el ⚡ Poder; `mf` y `maxMP` fuera | `js/entities.js:962-971`, `js/ui.js:670-672, 2548-2560` |
| 9 | No hay nivel requerido | **Aceptada** | NO efectivo con escalado hacia abajo (§7.6); el mismo mecanismo sirve para el cooperativo y el ladder | Materia y sincronización de FFXIV [V] |
| 10 | Los aspectos no tienen protección contra la mala suerte | **Aceptada; recalculé y la cifra es correcta** (8,5 %, ~12 legendarios; cola del 7 % tras 30) | Polvo → aspecto elegido a rango 1; elige 1 de 3 en el jefe de grieta; jefes de zona con aspecto propio | Gran Cámara [V]; botín personal de WoW [V]; Códice de D4 [S] |
| 11 | El traspaso Lost Ark no sirve para 3 héroes | **Aceptada** | Marca de agua de cuenta por ranura (coste 1/3, sin consumir nada). La cita de Lost Ark es correcta [V], pero se descarta el modelo | soporte de Blizzard 336964 [S] |
| 12 | Pesos 100/85/70/60 inventados; el arma se cuenta dos veces | **Aceptada, con un matiz** | Pesos de WoW y daño de arma como implícito fuera del techo. **Matiz:** la página de WoW solo verifica los pesos de armadura (1,00/0,75/0,5625) y está marcada como desactualizada; joyería 0,55, abalorio 0,70 y dos manos ×1,3 quedan como [S] | Stat budget de WoW [V] |
| 13 | Pips de tier frente a barrita de tirada | **Aceptada** | Un solo indicador de 5 pasos; ★ = paso 6; sin tiers | ux.md §3.3 y §4 |
| 14 | 6 líneas frente a un tooltip de ≤ 9 | **Aceptada** | 4 líneas (3 + ◇) + aspecto; engarces como iconos; tooltip de 9 líneas (§7.10) | ux.md §4 |
| 15 | No se decide si la rareza multiplica | **Aceptada** | `statMult` desaparece: la rareza solo fija líneas y aspecto (modelo D4). Aviso de −33 % de daño de arma para compensar en E4b | `js/items.js:7-13, 210-226` |
| 16 | Opción A/B del `ILVL_MAX` (texto cortado) | **Resuelta con una tercera opción** | **C = 47**, el AL del Nv70: G^7 = ×1,55 frente al ×1,54 que pide una cuota del 50 %. A se pasa (×1,88) y B se queda corta (×1,30) | `js/combat-math.js:548-562` |
| 17 | Falta Guild Wars 2 | **Aceptada** | §2.9 nueva: techo fijo, cambio de stats gratis, combinaciones con nombre y Armería de cuenta → Mítico de cuenta y `ILVL_MAX` fijo desde el Nv70 | Shacknews 2012 [V]; wiki de GW2 [S] (caída) |
| 18 | Datos de D4 desactualizados y «5.º afijo» sin fuente | **Aceptada** | Quité el 5.º afijo. Añadí 4 afijos (T11), Calidad 25 y remate +50 % (LoH), Mayor en no ancestrales (2.5.0), revuelta de los únicos (S14) y Astillas de Alma (S15) | Notas 2.5.0 [V]; Maxroll (may-2026) [V]; DiabloBytes [V] |

**Dónde no di la razón del todo:**
- **Banda suave del 50 % del exceso (objeción 5):** la dejo como **último recurso**. Es una regla invisible más en `combat-math`. Diseñar los techos para que el equipo solo no llegue al tope consigue lo mismo sin otra fórmula, y la simulación del comparador ya refleja el tope real.
- **Cuota del 40–50 % (objeción 3):** propongo **45–55 % en DPS** al final, porque en la v2 el aspecto (que lleva pasivas, al estilo D4 LoH) vive en el equipo. La vida efectiva queda en 40–50 %.

**Contra-chequeo de la v2 (riesgos nuevos que introduce):**
1. **Quitar `statMult`** hace que raro y legendario rindan igual salvo por el aspecto. Es deliberado (el raro es la base del legendario a medida), pero obliga a recalibrar el arma en E4b.
2. **Escalar los % con el NO** cambia la sensación al subir de nivel: los % bajos al principio. Es el modelo de D4 y es necesario para el escalado hacia abajo.
3. **El polvo de aspecto** podría trivializar la persecución. Por eso solo compra el **rango 1**.
4. **El cálculo de la opción C** solo cubre el DPS y supone DPS ∝ arma. La vida efectiva (armadura con K = 60·G y vida por G) hay que medirla en el banco antes de fijar 47.
5. **La regla de regalo de WoW** («no te mejora») exige saber qué mejora a quién. En el cooperativo se resuelve con la misma simulación de la §7.11, ejecutada en el cliente de quien lo recibió.
