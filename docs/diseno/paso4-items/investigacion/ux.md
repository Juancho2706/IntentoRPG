# Investigación UX: inventario y objetos (Paso 4: rework de ítems, inventario y stats)

**Frente:** UX/UI de inventario y objetos en ARPG y MMO de PC, 2024–2026.
**Versión:** v2, 22-oct-2026. Corrige la v1 tras la refutación de dos expertos (itemización de MMO/ARPG y multijugador). Los cambios están en §8, «Refutación y cambios».
**Alcance:** solo lectura del repo, investigación web y este informe. No corrí tests, servidores ni Chrome.

**Marcas de confianza que uso:**
- **[V]**: lo verifiqué abriendo la fuente (WebFetch).
- **[S]**: solo lo vi en el extracto de un buscador. La página daba 403, pedía inicio de sesión o tenía protección anti-bots.
- **[CP]**: conocimiento previo mío, sin URL verificada en esta sesión. Hay que confirmarlo antes de usarlo como argumento.

**Limitaciones:**
- El cupo de WebSearch que comparten todos los agentes de la sesión se agotó dos veces, también durante esta corrección. Después solo abrí URL concretas.
- Icy Veins, Game UI Database, Nexus Mods, poe2wiki y la wiki de Last Epoch devolvieron 403/402 o Anubis. La wiki de Guild Wars 2 estaba en mantenimiento. El artículo de soporte de Blizzard pide iniciar sesión. Lo que cito de ellos es [S].
- No encontré ninguna charla GDC específica sobre la UI del inventario de D4, PoE2 o Last Epoch. Las voces de diseñadores que sí encontré son la UI lead de D4 (Angela Del Priore, 2020), Jay Wilson (D3, 2010), Greg Street (WoW, BlizzCon 2013), Ion Hazzikostas (WoW, sep-2026), Joe Shely (Diablo V, BlizzCon 2026), el blog de diseño de Last Epoch (2020) y las guías de accesibilidad de Xbox.
- No medí el coste de `recompute()` (regla de no cargar la PC). Lo que digo del rendimiento de la simulación por celda hay que medirlo al implementar.

---

## 0. Resumen ejecutivo (v2)

1. **Tendencia 2026:**
   - Diablo 4 añadió un filtro de botín nativo con *Lord of Hatred* (28-abr-2026): hasta 25 reglas, 10 condiciones y exportación como código.
   - D2R añadió pestañas dedicadas con pilas de 99 (feb-2026).
   - Diablo V (BlizzCon, 12-sep-2026) **vuelve a la rejilla con objetos de varias casillas**.
   - Conclusión: el género gestiona el volumen de botín **antes** de la mochila (filtro y pilas) y deja la rejilla para el equipo.
2. **Rejilla:** recomiendo **rejilla 1×1 de 40 casillas grandes** (10×4) y materiales fuera de la mochila. El modelo de datos debería admitir `w×h` para no cerrar la puerta a dos tamaños estilo D3, que quedan como decisión del dueño (§5, R1-1).
3. **Una sola forma de valorar un objeto.** Hoy hay **cuatro** que se contradicen (§1, §3.2): `itemPower` (veredicto y ▲ de la celda), la simulación `_previewEquip` (filas del tooltip), `st.power` (el «⚡ Poder» de la hoja y el texto flotante, que cuenta hallazgo mágico y maná) e `itemValue` del banco de balance. Propuesta: **un modelo de simulación** con el perfil resuelto de habilidades, con dos ejes, **Daño** y **Aguante** (vida efectiva). Ese modelo alimenta el veredicto, el ▲ de la celda, el orden «mejor para mí», el ⚡ Poder y el banco. El hallazgo mágico y el oro quedan fuera del poder.
4. **La vista previa de hoy tiene un efecto secundario:** al pasar el ratón por un objeto con menos vida o recurso, `recompute()` recorta tu vida y tu recurso actuales y no los devuelve (`ui.js:2585-2601` → `entities.js:972-975`). En el cooperativo, la vista previa tiene que ser **pura**.
5. **Tooltip con 3 ejes visibles por pieza** (antes eran unos 10):
   - **Insignia de poder:** el número (ilvl + rangos de mejora; la Calidad se funde aquí) con un anillo que muestra los rangos de mejora hechos.
   - **Rareza:** color + glifo + número de líneas.
   - **Una capa de forja:** la línea ⚒ (vacía = potencial).
   - Como máximo **4 líneas de afijo** (3 al azar + 1 de forja) más el aspecto. Los engarces van como iconos en la fila de la base. El set, los rangos y el origen van en Alt. **≤ 9 filas** en el caso normal.
   - **Un solo indicador por línea** de afijo (5 segmentos: dónde cae la línea entre el mínimo y el máximo posibles para ese ilvl). Reemplaza tanto los pips de tier de `arpg.md` R3 como la barrita de tirada de la v1.
6. **Comparar:** dos deltas en % (**Daño** y **Aguante**), como D4 desde 2.5.0, que muestra la defensa como «porcentaje de la diferencia de Dureza» [V]. Shift muestra el equipado al lado, como WoW [V]. **Sin alarmas rojas de tope en el comparador:** el delta simulado ya refleja lo que se pierde. El tope solo se marca en la ventana de forja, donde es accionable.
7. **Alijo compartido entre 3 héroes:** el ▲ de la celda dice si el objeto mejora a **algún** héroe tuyo (emblema del héroe en la esquina), con un afijo «Atributo principal» que se adapta a quien lo lleva para que no haya afijos muertos al cambiar de manos.
8. **Teclas de PC estándar** (hoy no existen): clic derecho = acción principal; Ctrl+clic = mover a la otra ventana; Espacio = basura; F = favorito; Ctrl+C = copiar el objeto como texto o código.
9. **Botín, filtro y lote:** etiquetas de color en el suelo con Alt para ver todo; filtro en 2 niveles (preajustes y editor de ≤ 25 reglas exportable), con las condiciones «▲ para algún héroe» y «mejora tu Códice»; lote con resumen, **Deshacer** y recompra de 12.
10. **Protecciones visibles:** cofre de jefe «elige 1 de 3» (como la Gran Cámara de WoW, que ofrece hasta 9 y deja reclamar 1 [V]); polvo de aspecto con el que compras en el Códice un aspecto elegido; **marca de agua** por ranura en la barra de mejora (lo que ya alcanzaste en esa ranura sale gratis o barato, como las crestas de WoW [V]).
11. **Cooperativo en navegador:** abrir un panel ya no puede pausar (`main.js:1552`); botín personal e instanciado; «⇄ Intercambiable» en el tooltip; al regalar, el cliente del compañero evalúa el objeto y responde solo «le sirve ▲ / no».
12. **Accesibilidad:** el texto del tooltip mide 11–14 px y la guía de Xbox para PC pide ≥ 18 px a 1080p. Presupuesto de **3 superposiciones** por celda.

---

## 1. Qué hay hoy en IntentoRPG (código)

| Tema | Estado actual | Dónde |
|---|---|---|
| Mochila | 32 casillas 1×1 (8×4), celda mín. 38 px; icono = **emoji** (`item.icon`) | `js/ui.js:2484`, `css/style.css:187-191, 685-688`, `js/ui.js:2431` |
| Límite | 32 escrito a mano en ≥ 11 sitios (9 comprobaciones de «lleno» + 2 bucles de pintado) | `js/main.js:1443, 1503, 1692`, `js/economy.js:45, 61, 179, 230, 300`, `js/game-world-flow.js:44` |
| Alijo | Compartido entre héroes, **24 casillas** (8×3), sin pestañas; clic = mover | `js/ui.js:1988`, `js/main.js:1492` |
| Materiales | Bolsa aparte con pilas visuales (`×N`), tope `MAX_MATERIALS=60` | `js/ui.js:2500-2529`, MEMORIA.md:102 |
| Equipo | 12 ranuras (incl. 2 anillos, `offhand` por clase) | `js/items.js:16-20` |
| Rarezas | normal `#e8e6e0`, mágico `#6f8cff`, raro `#ffd24a`, legendario `#ff8c2e`, conjunto `#4ade80`, con glifo de rareza en la celda | `js/items.js:7-13`, `js/ui.js:2426-2428` |
| Insignias por celda | ★ favorito, nº de engarces libres, glifo de rareza, ? sin identificar, ▲ mejora (hasta 5) | `js/ui.js:2410-2433, 2487-2488` |
| Interacción | Pointer Events: arrastrar (umbral 8 px) o clic, que abre un *popup* con botones. **Solo botón izquierdo**: sin clic derecho, Ctrl+clic ni Shift+clic | `js/ui.js:294-354`, `2689-2804` |
| Tooltip (hover) | Nombre + rareza/ranura/Nv + líneas de stats + bloque de comparación siempre visible, con el veredicto **al final**; ancho 280 px; fuentes 11–14 px | `js/ui.js:2664-2675`, `css/style.css:238-258, 477-484` |
| **Valoración: 4 fuentes** | (1) `itemPower`: pesos fijos iguales para todas las clases (`crit:3, dmgPct:1.5, mf:0.4…`); decide el veredicto ⬆/↔/⬇, el ▲ de la celda y **qué anillo se reemplaza**. (2) `_charDPS` + `_previewEquip`: filas DPS/Vida/Armadura del tooltip. (3) `st.power`: daño medio ×1,4 + vida ×0,08 + armadura ×0,25 + **maxMP ×0,03 + hallazgo mágico ×0,1** + …; lanza «+N ⚡ Poder» flotante y se ve en la hoja. (4) `itemValue` del banco (pesos propios) | (1) `js/ui.js:2548-2573, 2591, 2612, 2617`; (2) `js/ui.js:2577-2601, 2626`; (3) `js/entities.js:963-971`, `js/ui.js:670-672, 2899`; (4) `tests/helpers/bench-core.mjs:72` |
| **Vista previa con efecto secundario** | `_previewEquip` equipa en el `Player` **real**, llama a `recompute()` y restaura. `recompute()` recorta `hp` y `mp` al nuevo máximo y, al restaurar, no los devuelve: pasar el ratón por un objeto con menos vida te quita vida actual | `js/ui.js:2585-2601` → `js/entities.js:972-975` |
| Lote | «Vender morralla» (normal+mágico sin ★, **sin confirmación ni deshacer**), ordenar, favorito ★ que protege de venta y cubo | `js/economy.js:592-626, 190, 213` |
| Filtro de loot | Umbral único de rareza (Todo/Mágico+/Raro+/Legendario). Oculta malla, pilar y halo del suelo y no autorrecoge | `js/ui.js:2065-2066`, `js/main.js:699-701, 1680-1697` |
| Recogida | **Automática al pisar** si pasa el filtro y hay hueco; tecla F para recoger; **sin etiquetas de nombre en el suelo** | `js/main.js:1686-1697`, INFORME_EXPANSION_2026.md:91 |
| Alt | Ya se usa (mantenido) para tooltips del HUD en combate; `preventDefault` solo en *keydown* | `js/input.js:7, 36-38, 60-61, 104-110` |
| Pausa | **Cualquier panel abierto pausa la simulación** | `js/main.js:1552, 1896` |
| Accesibilidad | Movimiento reducido, texto grande, modo daltónico (paleta segura), escala del HUD | `js/ui.js:2059-2072`, `css/style.css:486-508` |
| Piezas para el modelo único | `expectedMitigation(stats, al)` ya da la fracción de daño que entra (bloqueo × armadura × resistencia × RD × daño recibido). Aguante = `maxHP / expectedMitigation`. `resolveSkill` ya da el perfil de cada habilidad | `js/combat-math.js:518-523`, `js/skill-resolve.js` |

Lo que ya está bien y conviene conservar: glifo de rareza además del color, la idea de comparar por simulación, favoritos que protegen, pilas visuales de materiales y alijo compartido.

---

## 2. Referencias con números (2024–2026)

| Juego | Mochila | Alijo | Comparar / detalle | Lote y marcas | Filtro |
|---|---|---|---|---|---|
| **Diablo 4** | 33 casillas 1×1 [S/CP] | Pestañas de 50; 4–6 pestañas según temporada [S] | Por defecto solo marca mayor/menor poder. «Advanced Tooltip Compare» con **Shift**, apagado por defecto [V]. [+] aditivo / [×] multiplicativo y rangos [V]. **2.5.0 (dic-2025):** la diferencia de armadura o resistencia se muestra como **% de la diferencia de Dureza**; la Dureza sale en la ventana de stats y cada nivel de Tormento recomienda una Dureza; se corrige un DPS que se mostraba distinto entre pestañas [V] | Favorito: no se vende ni desguaza. Basura y favorito con **Espacio**. «Vender basura» solo en la pestaña activa (1.2.0) [V]. «Desguazar todo» se lleva todo menos favoritos, **sin confirmar** (S4) [V] | Nativo desde 28-abr-2026: **1–25 reglas**, 10 condiciones, de arriba abajo, exportar como código; solo equipo [V] |
| **PoE2** | 5×12 = 60, tamaños tipo «tetris» [S]; **sin autoordenar** [S] | 10 tipos de pestaña; *quad* 576; divisas 5000 por tipo [S]; afinidades con Ctrl+clic [S] | **Alt** = «Advanced Mod Descriptions»: prefijos y sufijos, rangos y tier (PoE1 3.1.2) [V] | — | Archivo `.filter` externo (NeverSink/FilterBlade) [S] |
| **Last Epoch** | Rejilla con tamaños [CP] | Shift+clic enruta por prioridad (1.1.7) [S]; búsqueda con **macros, regex y expresiones** (1.2.3, may-2025) [V] | Tiers T1–T7; mod comunitario de tiers por color [S] | — | Nativo: **75 reglas**, mostrar/ocultar/recolorear/enfatizar, condiciones de afijo, tier, clase, nivel dinámico [V] |
| **D2R** | 10×4 con tamaños [CP] | Compartido 10×10 por pestaña, +2 pestañas; **4 pestañas dedicadas** (materiales en **lista**, gemas, runas, consumibles) con **pilas de 99** (feb-2026) [V] | Tooltip con ilvl y rango de tier del afijo (3.0) [S, vía arpg.md] | — | «Loot Filter Configurator» para gemas y runas [V] |
| **WoW** | Mochila 16 + bolsas; la búsqueda **oscurece** lo que no coincide [V] | Banco de Banda: **5 pestañas × 98**; clic derecho deposita por tipo (11.0) [V] | Por defecto, el tooltip muestra solo el objeto; **Shift** muestra el equipado (CVar `alwaysCompareItems`, jul-2026) [V]. **Sin flecha de mejora nativa en bolsas:** la ponen addons con la regla «ilvl mayor que lo equipado» [S] | Moneda sobre lo gris [V]; **recompra de 12** que se vacía al salir o cambiar de zona [V] | Por addons (Baganator) [S] |
| **WoW (mejora)** | — | — | Pistas de mejora de 6 rangos (Aventurero → Mito, 20 crestas por rango, sin piedras de valor en Midnight) [V]. **Marca de agua por ranura:** los rangos por debajo de lo que ya alcanzaste en esa ranura cuestan 0 crestas [V]; descuento de cuenta del 50 % en piedras [V]; crestas a nivel de Banda tras un logro [S] | **Gran Cámara:** hasta 9 objetos por semana, reclamas 1 [V] | — |
| **FFXIV** | — | — | Sincronización de nivel: el ilvl se topa según el nivel, las subestadísticas se topan por tipo de pieza (no se escalan hacia arriba) y la materia se ignora [V]. El valor en rojo al pasar el tope sale en la ventana de engarce [V, verificado por el experto] | — | — |
| **Guild Wars 2** | — | — | Combinaciones de stats con nombre (prefijo) [CP]; el equipo legendario cambia de combinación gratis fuera de combate con «Customize» [S] | — | — |
| **Diablo 3** | 10×6 [CP] con **dos tamaños**, «no odd shapes» (Jay Wilson, 2010) [V] | — | — | — | — |
| **Diablo V** (2029) | **Rejilla con objetos de varias casillas** confirmada en BlizzCon 2026 (12-sep) [V] | — | — | — | — |

---

## 3. Hallazgos por tema

### 3.1 Rejilla 1×1, tamaños o lista

**Contra los tamaños:**
- La UI lead de D4 (2020) explicó que no volvieron a los tamaños para no «interrumpir el juego con bolsillos de gestión de inventario». En la misma entrada contó que añadieron una **señal secundaria de rareza en el borde** y bajaron el brillo y la saturación del fondo de los iconos.
- El estilo de icono «pictórico» no se leía en tamaño pequeño; pasaron a iconos basados en el modelo 3D [V].

**Punto medio:** D3 probó iconos 1:1 para armas y armaduras, pero «no se sentían sólidos y reales», así que usó **dos tamaños** y ninguna forma rara [V].

**A favor de los tamaños:**
- Diablo V vuelve a la rejilla con varias casillas (2026) [V].
- La razón que se le atribuye: decidir qué cargar «devuelve una decisión al saqueo» [S].
- outof.games resume los argumentos a favor (fricción contra el acaparamiento, forma reconocible) y en contra (reordenar cada ~10 minutos) [V].

**Implicaciones para nosotros:**
- **El cooperativo sin pausa** castiga cada segundo de Tetris.
- PoE2 no tiene autoordenar [S]: el *bin-packing* es difícil de hacer bien.
- Los iconos actuales son emoji: los tamaños **exigen arte por base** con proporción 1×2, 2×3, etc.
- Los **charms** de mochila (`makeCharm`, MEMORIA.md:101) compiten por espacio. Si el Talismán llega (después de E4b, según la refutación), tendrán su propio panel.

### 3.2 Comparar contra lo equipado

- **Patrón dominante:** un delta resumido siempre visible y la comparación completa bajo una tecla.
  - D4: Shift y la opción avanzada [V].
  - WoW: por defecto el tooltip muestra solo el objeto y **Shift** muestra el equipado al lado (artículo de jul-2026 sobre `alwaysCompareItems`) [V].
- **D4 2.5.0 (dic-2025) hizo justo lo que proponemos para la defensa:**
  - La diferencia de armadura o resistencia ya no se muestra cruda, sino «as percentage of Toughness difference».
  - La Dureza se ve en la ventana de stats y cada Tormento recomienda una Dureza [V].
  - Lección: la defensa se compara en **% de un único número de aguante**, no en «+40 armadura».
- **Un mismo número calculado de dos formas es un bug visible:** las notas de 2.5.0 corrigen un DPS «inconsistently displayed» entre la pestaña de obra maestra y otra vista [V].
- **WoW no trae flecha de mejora nativa en las bolsas.** La ponen addons con la regla «ilvl mayor que lo equipado» [S]. Es legible, pero no conoce la build. Nosotros ya simulamos y podemos hacerlo mejor.
- **Riesgo documentado:**
  - El marcador verde de D4 puede engañar, porque más daño bruto no siempre es más daño real si la build depende de multiplicadores [S].
  - El poder del objeto de D4 tiene umbrales; subir justo por debajo de uno da ~10 de poder [S].
- **Nuestro problema real: cuatro fuentes de «poder»** (§1):
  1. `itemPower` decide el veredicto, el ▲ de la celda y **qué anillo se compara**. No conoce la clase: un anillo con +175 de vida le gana a uno con +6 % de crítico y +13 % de daño (`actual.md` §3.11).
  2. La simulación (`_previewEquip`) da las filas DPS/Vida/Armadura. Un objeto puede salir «⬆ Mejora» con DPS ▼.
  3. `st.power` lanza el flotante «+N ⚡ Poder». Premia equiparse **hallazgo mágico** (×0,1) o **«maná»** (×0,03; en el Guerrero es Furia) e ignora resistencias, RD, rangos de habilidad y multiplicadores [×].
  4. `itemValue` del banco tiene sus propios pesos, con el sesgo de atributos que ya vio MEMORIA.md:350.
- **La vista previa no es pura** (`ui.js:2585-2601`): recorta vida y recurso al pasar el ratón (§1). Con red, además, mutaría el estado sincronizado del héroe.
- **Puntos ciegos de `_charDPS`:** usa daño medio × crítico ÷ tiempo de ataque. No ve +rango de habilidad, CDR, coeficientes de habilidad (`resolveSkill`), aspectos que cambian una variante ni los multiplicadores [×]. Lo que el modelo no vea hay que **declararlo** con «?» de «efecto no medido», no con un veredicto falso.
- **Anillos:** hoy se compara solo con «el que se reemplazaría», elegido por `itemPower` (`js/ui.js:2609-2613`). Recomiendo simular los dos reemplazos, mostrar el mejor por defecto y los dos con Shift.

### 3.3 Tooltip legible: 3 ejes por pieza y un indicador por línea

- **Por qué menos ejes:**
  - Greg Street (BlizzCon 2013) quitó la reforja y redujo encantamientos y engarces porque los jugadores sentían «too much modification needed to be done every time you get a new piece of gear» [V].
  - D4 2.5.0: «affix values have been increased, and ranges have been narrowed» [V]. Menos rango, menos que leer.
  - La v1 sumaba ilvl, rareza, tier, tirada, Mayor, Calidad, templado, sello, aspecto con rango, engarces y set: unos 10 ejes por pieza, ×12 ranuras ×3 héroes.
- **Los 3 ejes visibles por pieza:**
  1. **Insignia de poder**: un número, el ilvl más los rangos de mejora (la Calidad se funde aquí), como el ilvl de las pistas de mejora de WoW (cada rango sube el número) [V]. Lleva un **anillo** fino: la parte llena son los rangos de mejora hechos y la vacía, lo que aún puedes subir. Es la señal de «hueco hasta el techo» sin números.
  2. **Rareza**: color + glifo de forma + cuántas líneas trae. Si el diseño quita el multiplicador por rareza (`statMult`), la rareza se lee solo por esto.
  3. **Una capa de forja**: la 4.ª línea ⚒. Si está vacía, se ve como hueco punteado «◌»: es potencial, no un número.
- **Un solo indicador por línea de afijo:**
  - 5 segmentos ▰▰▰▱▱ que dicen **dónde cae la línea entre el mínimo y el máximo posibles para ese ilvl** (del mínimo del tier más bajo al máximo del más alto).
  - Si el diseño elige tiers sin tirada dentro del tier (pasos discretos), cada segmento **es** un tier y el indicador coincide con los pasos.
  - El afijo Mayor ★ se dibuja como el indicador lleno en oro con ★ al final, no como otro eje.
  - Reemplaza los pips de tier de `arpg.md` R3 y la barrita de tirada de la v1 de este informe, que se contradecían.
  - Hay demanda: un mod comunitario de Last Epoch añade tiers por color y «letras de grado» [S]. Usar color para el tier choca con la rareza, así que va por **forma y segmentos**.
- **Capa Alt (detalle):**
  - PoE (3.1.2): con Alt separa prefijos y sufijos y muestra **rangos y tier**. Aviso de GGG: el tier se numera sobre todas las bases, lo que confunde [V]. Por eso nosotros lo numeramos **por base**.
  - D4: [+] aditivo y [×] multiplicativo [V]. Encaja con `combat-math`, que separa el saco aditivo de ≤ 3 multiplicadores.
  - En Alt van también: la palabra de rareza y la ranura, el desglose del número de poder, el rango del aspecto frente al de tu Códice, el set, el nivel requerido y el origen o intercambio.
- **Jerarquía:** primero lo que cambia la decisión (veredicto), después la base, los afijos y el aspecto. Hoy el veredicto va **al final** (`js/ui.js:2670-2672`).
- **Presupuesto de filas (cifra única para los dos informes):**
  - **≤ 4 líneas de afijo** (3 al azar + 1 de forja) **+ el aspecto** (1–2 filas).
  - Engarces como iconos en la fila de la base.
  - Set, rangos y detalle en Alt.
  - Sin pie de ayuda con las teclas (solo las primeras veces, como consejo).
  - Total: **≤ 9 filas** en el caso normal y 10 si el aspecto ocupa 2 y el objeto es intercambiable.
- **Atributo principal adaptable:** el tooltip muestra el atributo ya resuelto para el héroe que mira («Fuerza +62» en el Guerrero, «Destreza +62» en la Arquera). Alt aclara «se adapta a la clase». Lo mismo con el recurso: «−8 % coste» con el icono del recurso de tu clase.

### 3.4 Ayuda visual de mejora en la mochila

- Hoy: halo verde + ▲ (`inv-upgrade`) calculado con `itemPower`. D4 marca mayor o menor poder del objeto [V].
- **Problema de saturación:**
  - Un hilo del foro de D4 (7-jul-2024) lista hasta 9 superposiciones posibles en un icono, todas sobre fondos parecidos, y se pide un interruptor [V].
- Nosotros ya llegamos a 5. **Presupuesto propuesto: 3 superposiciones.**
  1. Borde y fondo de rareza + glifo de forma.
  2. Esquina superior izquierda: un solo estado, por prioridad nuevo • > favorito ★ > basura ✕.
  3. Esquina inferior derecha: ▲ verde si mejora al héroe activo; **emblema pequeño del héroe** si solo mejora a otro de tus héroes; nada si no mejora a nadie.
- Engarces y afijo Mayor pasan al tooltip.
- **Umbral del ▲:** que no salga por mejoras de ruido. Propuesta de partida: ▲ si el objeto sube el poder del héroe ≥ 1 % sin bajar el otro eje más de 1 %. Hay que calibrarlo con E4b. Como referencia de escala, Hazzikostas (sep-2026) dice que un objeto necesita «at least like a 10 to 15 percent increase in power» frente al anterior para que se note [V]; eso es poder del objeto, no del personaje.

### 3.5 Alijo y pestañas

- **Capacidades de referencia:** D4, pestañas de 50 [S]; D2R, 10×10 por pestaña [V]; WoW, 5×98 [V]. Nuestro alijo de 24 es pequeño.
- **Enrutado automático:** PoE2, afinidad + Ctrl+clic [S]; Last Epoch, prioridad de pestaña + Shift+clic [S]; WoW, clic derecho deposita según el tipo [V].
- **Materiales en lista con pilas de 99** (D2R, 2026) [V]. D4 apiló las brújulas (99) y sacó gemas y aspectos del inventario porque llenaban el alijo [V]. Nuestra bolsa de materiales con tope 60 **entradas** debería pasar a **pila por tipo**.
- **Alijo compartido entre 3 héroes («mejor para»):**
  - El valor de un objeto depende de quién lo lleve. El chip de búsqueda «▲ Mejora» marca lo que mejora a **algún** héroe tuyo, con su emblema.
  - El atributo principal adaptable (§3.3) evita que un objeto quede muerto al pasar a otra clase. Es la regla de WoW desde 2013: «The primary stat on an item will change based on the spec of the character wearing it» [V].
  - Simular para los héroes que no están activos exige cargar su build. Hay que hacerlo solo al abrir el alijo, con caché (§3.11).
- **Temporadas y ladder:** en D2R el alijo de ladder está separado y lo no retirado se pierde al empezar la temporada siguiente a la próxima [S]. Hay que diseñarlo pronto si llega el ladder.

### 3.6 Ordenar, buscar, filtrar

- **Ordenar:** ya existe (`economy.js:607`: tipo → rareza → ranura → ilvl). Falta «Mejor para mí», que sale del **mismo modelo** que el veredicto, y «Nuevos primero».
- **Buscar:**
  - WoW oscurece lo que no coincide en vez de esconderlo y conserva la posición [V].
  - D4 filtra el alijo por poder del objeto (1.4.0) [V].
  - Last Epoch tiene macros (`T6+`, `prefixes2`) [V], pero es para expertos.
  - Para nosotros: caja de texto + **chips** (Arma · Joyería · Legendario+ · ▲ Mejora · Nuevo · Intercambiable) y oscurecer lo que no coincide.

### 3.7 Filtro de botín, etiquetas y recogida

- **Diseño de Last Epoch (blog oficial, 2020):** ser «accesible para nuevos» y preciso para veteranos; exportar e importar; interruptor por regla para depurar [V].
- **Ejecución:**
  - Last Epoch: 75 reglas, recolorear y enfatizar [V].
  - D4: 25 reglas, 10 condiciones, entre ellas «mejora tu Códice» y nº de afijos mayores [V].
- **Lo oculto no desaparece:** en D4 sigue cayendo y se puede recoger, solo no se ve en el suelo ni en el minimapa [V]. Eso permite «Alt = ver todo».
- **Propuesta en dos niveles:**
  - Nivel 1, **preajustes visuales**: «Todo», «Útil para mí» (mi clase + nivel ≥ mío − 5 + mágico+), «Solo mejoras ▲», «Raro+», «Legendario+».
  - Nivel 2, **editor de ≤ 25 reglas** con condiciones: rareza, ranura o tipo, nivel relativo, «▲ para el héroe activo», «▲ para algún héroe», «mejora tu Códice», afijo Mayor, afijos TODOS o ALGUNO.
  - Acciones: ocultar, color de etiqueta, sonido, icono en el minimapa, **autorrecoger sí/no**.
  - Exportar como código, reutilizando la idea del código de build `irpg2` (`tests/test79-codigo-irpg2.mjs`).
  - Ojo: «▲ en el suelo» exige simular cada objeto al caer. Con caché por objeto y solo para el héroe activo, es un cálculo por drop, no por fotograma.
- **Etiquetas en el suelo** (hoy no existen):
  - Nombre corto con color y glifo para lo que pasa el filtro.
  - **Alt mantenido** muestra todas, incluidas las ocultas.
  - Clic en la etiqueta = recoger.
  - Pool fijo a 10 Hz como `js/world-marks.js`, con tope de etiquetas visibles (p. ej., 30) y apilado anti-solape.
- **Autorrecogida:** mantenerla para oro, pociones y materiales. Para el equipo, que la decida la regla del filtro; por defecto, raro+ o ▲.

### 3.8 Venta y desguace en lote, favoritos, basura

- **D4:** favorito = no se vende ni se desguaza (1.2.0) [V]. En Season 4, «Desguazar todo» se llevó únicos y legendarios **sin confirmación** y hubo jugadores que perdieron 2–3 únicos [V].
- **WoW:** recompra de **12** objetos [V].
- **Propuesta:**
  - **Basura** marcada a mano (Espacio) o por regla del filtro.
  - «Vender o desguazar marcados» abre un **resumen**: «14 objetos: 10 normales, 4 mágicos → 37 materiales / 412 oro».
  - Después, aviso con **Deshacer (10 s)** y recompra de los últimos 12 en el mercader durante la sesión.
  - Legendario+ **nunca** entra en el lote salvo que se marque a mano. Al desguazarlo, el resumen muestra el **polvo de aspecto** que da (§3.14).
  - Hoy `sellJunk` vende sin confirmación (`economy.js:592-605`).

### 3.9 Objetos nuevos

- Ya hay «novedad» en habilidades (`ui-skills.js:185`), pero no en objetos. En WoW hay brillo de «nuevo» en bolsas [CP] y addons con categoría «Recientes» [S].
- **Propuesta:** punto • hasta pasar el ratón; orden «Nuevos primero»; contador opcional en el botón de la mochila del HUD.

### 3.10 Accesibilidad

| Guía | Requisito | Nuestro estado |
|---|---|---|
| XAG 101 [V] | Texto por defecto en **PC ≥ 18 px de alto** a 1080p; escalable al **200 %** sin perder contenido; nunca scroll en dos ejes | Tooltip: 11 px (sub), 12–13 px (comparación), 14 px (stats). Hay «Texto grande», pero el valor por defecto queda corto |
| XAG 102 [V] | Contraste **4,5:1**, **3:1** (texto grande ≥ 36 px en PC), **7:1** en alto contraste; opción de **fondo sólido** | Tooltip con textura `ui_tooltip.webp`: medir el contraste sobre el punto más claro |
| XAG 103 [V] | El color nunca es el único canal; colores configurables («p. ej., resaltado de objeto raro») | Glifo de rareza ✔; ▲▼ con forma ✔; paleta configurable ✘ |
| GAG «colour alone» [V] | Nivel básico; rojo-verde afecta a ~8–10 % de los hombres | Verde de conjunto `#4ade80` frente al naranja legendario `#ff8c2e`: par de riesgo para la deuteranopia, verificar con un simulador |
| WAI-ARIA Grid [V] | `grid`, `row`, `gridcell`; flechas, Inicio/Fin, una sola parada de Tab | Rejilla de `div` sin roles ni navegación por teclado |

- El anillo de la insignia de poder y los 5 segmentos son formas pequeñas. Con «Texto grande», el anillo pasa a texto «+3» junto al número y los segmentos crecen con `--s`.
- D4 tiene lector de pantalla incluso en la búsqueda del alijo (1.4.0) [V]. No es nuestro objetivo inmediato, pero los roles ARIA son baratos en el DOM.

### 3.11 Navegador: detalles técnicos que afectan la UX

- **Vista previa pura:** el modelo único debe calcular «stats si equipo X» **sin tocar** el `Player` vivo. Dos opciones para el frente de diseño:
  - una función pura `previewStats(player, slot, item)` que calcule en un objeto aparte;
  - o, como mínimo, guardar y restaurar `hp`/`mp` alrededor del `recompute()`.
  - La primera sirve también al banco (cuarta fuente) y a los tests headless.
- **Coste del ▲ por celda:** con 40 casillas de mochila, 50 por pestaña de alijo y 3 héroes son hasta ~270 simulaciones.
  - Calcular de forma diferida: solo lo visible, unas pocas por fotograma o en `requestIdleCallback`.
  - Caché por `(uid del objeto, hash del equipo, hash de talentos y barra)`, invalidada al equipar o cambiar de build.
  - Para los otros héroes, solo al abrir el alijo.
  - No medí el coste de `recompute()`: medirlo al implementar.
- **Clic derecho:** `contextmenu` + `preventDefault` en los paneles de inventario, alijo y tienda.
- **Alt:**
  - Hoy se hace `preventDefault` solo en *keydown* (`input.js:38`).
  - En Windows, soltar Alt puede llevar el foco al menú del navegador (barra de menús en Firefox) [CP; la página de soporte de Mozilla no cargó].
  - Hay que **verificarlo** y, si pasa, añadir `preventDefault` en *keyup*. El remapeo ya existe (`bindings.js`).
- **Ctrl+F:** capturarlo solo con el alijo abierto (Last Epoch usa Ctrl+F para su búsqueda [V]).
- **Ctrl+C:** `navigator.clipboard.writeText` exige contexto seguro (HTTPS; Vercel lo es) y puede lanzar `NotAllowedError` [V, MDN]. Llamarlo dentro del manejador de la tecla (gesto del usuario) y con la pestaña enfocada [CP].
- **Renders del DOM:** hoy se regenera toda la rejilla con `innerHTML` en cada cambio. Con 40–60 celdas está bien, pero en el cooperativo no hay que repintar por cada mensaje de red. Mejor diferenciar por `uid`.
- **Arte:** los emoji dependen del sistema y desentonan con el marco `assets/chrome`. Hay que pasar a iconos pintados por base (pipeline de Codex). Siguiendo la lección de D4, silueta fuerte probada a 48 px.

### 3.12 Cooperativo (multijugador en navegador)

- **Pausa:** el juego **se pausa con cualquier panel** (`main.js:1552, 1896`). Lennart Nacke (2023) plantea la decisión explícita: detener, ralentizar o continuar el mundo al abrir el menú [V]. En el cooperativo solo cabe «continuar», así que las acciones rápidas (clic derecho, Ctrl+clic, Espacio, F) dejan de ser un lujo.
- **Reparto del botín:**
  - D4: botín **personal** por jugador [S].
  - PoE2: *Free for all*, *Short allocation* y *Permanent allocation*, que elige el líder; el oro siempre es por jugador [S].
  - **Recomendación:** botín personal e instanciado por defecto. Sin carreras de recogida en la red y sin etiquetas ajenas en tu pantalla.
- **Intercambio:**
  - D3: los legendarios se pasan **solo a quienes estaban en la partida**, hasta **2 h** después [S].
  - Razón de Blizzard para un sistema similar en WoW Classic: equilibrio «entre ahorrar tiempo y minimizar el abuso» [S].
  - D4: la etiqueta **«Account Bound»** en el tooltip decide si un objeto es comerciable [S].
  - En el tooltip, una fila con icono: «⇄ 1 h 52 min» (intercambiable con tu grupo) o «🔒» (ligado).
- **Regalar sabiendo si le sirve:** tu cliente no tiene la build del compañero. Al elegir «Regalar a…», su cliente simula el objeto con su propio modelo y responde solo «▲ / ↔ / ▼». Es un mensaje pequeño y no expone su equipo. Arrastrar el objeto al retrato del compañero en el marco de grupo = regalar.
- **Sincronización de nivel:** si el multijugador sincroniza al héroe de nivel alto hacia abajo (FFXIV topa el ilvl y las subestadísticas e ignora la materia [V]), la insignia de poder muestra el **valor efectivo** con ⇣ (§3.13). El veredicto usa ese valor, así que sigue siendo verdad dentro de la sesión.
- **Compartir:** Ctrl+C copia el objeto como texto o código (convención de PoE [CP]). Servirá para el chat del cooperativo y para el ladder.

### 3.13 Número de poder, nivel efectivo y escalado (nuevo en la v2)

- **Qué número se ve y qué responde:**
  - La **insignia de poder** responde «¿qué tan avanzada está esta pieza?». Es el ilvl de WoW o el poder del objeto de D4: legible y sube con cada mejora.
  - El **veredicto** responde «¿me sirve a mí?» y sale de la simulación.
  - Pueden discrepar (412 ▼). En WoW pasa y la comunidad usa simuladores. Aquí el veredicto va justo debajo del nombre para que mande él, y Alt explica por qué.
- **Nivel requerido sin bloquear:** si el diseño adopta «ilvl efectivo = mín(ilvl, ilvlMáx(nivel del héroe) + k)» (propuesta de la refutación):
  - La insignia muestra el **número efectivo** en tono apagado con una flechita ⇣. Alt muestra «412 → 380 a tu nivel».
  - No hace falta una línea roja de «Nivel requerido»: el objeto se usa, rinde menos y crece contigo. Cuando subes de nivel, la insignia sube sola.
  - FFXIV hace lo mismo en la sincronización: topa el ilvl y las subestadísticas en lugar de prohibir la pieza [V]. La página no dice cómo lo enseña; la flechita ⇣ es propuesta nuestra.
- **Poder del héroe (⚡):**
  - Mantener **un** número porque el dueño ya tiene el flotante «+N ⚡ Poder» y es la sensación de «número sube».
  - Que salga del **mismo modelo** que el veredicto: una combinación de Daño y Aguante (p. ej., media geométrica normalizada). Así un ▲ siempre sube el ⚡ y el hallazgo mágico nunca lo hace.
  - La hoja del personaje muestra debajo los dos componentes, **Daño** y **Aguante**, como hace D4 con DPS y Dureza [V].

### 3.14 Protecciones contra la mala suerte y mejora sin pérdida: cómo se ven (nuevo en la v2)

- **«Elige 1 de 3»** en el cofre del jefe de grieta (propuesta de la refutación; la Gran Cámara de WoW ofrece hasta 9 y deja reclamar 1 [V]):
  - Tres cartas lado a lado, cada una con el tooltip compacto y su veredicto. Shift compara con lo equipado.
  - Un clic elige. Las otras dos se convierten en materiales y se dice cuántos.
- **Polvo de aspecto** (propuesta de la refutación):
  - En el resumen de desguace, el legendario muestra el polvo que da.
  - En el Códice, los aspectos que te faltan se ven como cartas en silueta con su coste en polvo y un botón «Comprar (rango 1)». Los rangos altos siguen saliendo solo del botín.
  - El filtro destaca «mejora tu Códice».
- **Marca de agua por ranura** (propuesta de la refutación, modelo de WoW):
  - En WoW, los rangos por debajo de lo que ya alcanzaste en esa ranura cuestan 0 crestas [V], hay un descuento de cuenta del 50 % en piedras [V] y las crestas son de Banda tras un logro [S].
  - UX: la barra de rangos de la ventana de mejora lleva una **muesca ▮** en la marca de agua de la cuenta para esa ranura. Los rangos por debajo muestran la moneda tachada (gratis) o «⅓». Sin texto adicional.
  - Así se ve la regla «lo que no se transfiere tiene que ser barato» sin explicarla.

### 3.15 Topes: dónde se muestran (nuevo en la v2)

- **En el comparador, no.**
  - Los rendimientos decrecientes de WoW son suaves e invisibles en el tooltip [S, citado por el experto].
  - Al quitar golpe y pericia en 2013, Blizzard dijo que «didn't feel like a bonus» [V].
  - Pintar en rojo los `CAPS` empuja a microgestionar. El delta simulado ya muestra que un +crítico por encima del tope vale ≈ 0.
- **En la ventana de forja, sí.**
  - FFXIV muestra el valor en rojo en la ventana de engarce, que es donde decides [V, verificado por el experto].
  - Al elegir qué línea añadir o templar, cada opción muestra su delta simulado (▲ +3 % daño). Si se perdería por el tope o por la banda suave, sale «≈ 0» con un icono ⊘. No hay alarma, solo la información donde se actúa.

---

## 4. Propuesta concreta para el diseño (v2)

**Rejilla:**
- Mochila 1×1 **10×4 = 40**, celdas de **52 px a 1080p** (escalan con `--s`).
- Materiales, gemas, runas y llaves en una pestaña aparte **en lista con pilas de 99**.
- Charms con tope o bolsa propia hasta que se decida el Talismán (después de E4b).
- Alijo compartido con pestañas de **50 (10×5)**: 2 al inicio y más con oro hasta 8. Cada pestaña lleva nombre, icono, color y **afinidad**.

**Teclas y ratón (con el panel abierto):**

| Entrada | Acción |
|---|---|
| Pasar el ratón | Tooltip compacto con veredicto |
| **Alt** mantenido | Detalle: rareza y ranura en palabras, rangos [mín–máx], tier, [+] o [×], desglose del poder, set, origen. En el mundo: todas las etiquetas |
| **Shift** mantenido | Equipado al lado (los dos anillos) |
| Clic izquierdo | Arrastrar (como ahora). Clic sin arrastre = menú de acciones (como ahora) |
| **Clic derecho** | Acción principal según el contexto: equipar / guardar en el alijo / vender en la tienda / al cubo |
| **Ctrl+clic** | Mover a la otra ventana abierta (enrutado por afinidad) |
| **Espacio** | Marcar o desmarcar basura ✕ |
| **F** | Favorito ★ (protege de todo lote) |
| **Ctrl+C** | Copiar objeto (texto + código) |

**Tooltip compacto** (≤ 9 filas; 300–340 px; texto ≥ 16 px CSS, 18–20 con «Texto grande»):

```
◆ Hoja del Ocaso                 ⚔  ⟮412⟯◔   ← glifo + nombre (color de rareza) · icono de ranura · insignia de poder con anillo de mejora
▲ Daño +8,4 %    ▼ Aguante −2,1 %    ?      ← veredicto de la simulación (? = efecto no medido)
⚔ 112–168 · 1,30/s                ◇ ◆       ← base + engarces como iconos (◇ libre, ◆ ocupado)
• Crítico +14 %                ▰▰▰▰▰★       ← ≤ 3 afijos al azar, un indicador por línea (★ = Mayor)
• Fuerza +62                   ▰▰▱▱▱        ← «Atributo principal» ya resuelto para tu clase
• Vel. de ataque +9 %          ▰▰▰▱▱
⚒ ◌                                         ← línea de forja: vacía = potencial
◈ Tajo deja 3 brasas · Brasas               ← aspecto (1–2 filas) + glifo de la variante que pide
⇄ 1 h 52 min                                ← solo si aplica (cooperativo)
```

**Con Alt**, la cabecera pasa a «Legendario · Arma 1 mano · Poder 412 = ilvl 40 + 3 mejoras · escala desde Nv 38» y cada afijo a `Crítico +14 %  [9–15] T5/5 [+] ★×1,5`. El aspecto añade «rango 7 (tu Códice: 6)». Debajo, el set si lo hay y el origen.

**Reglas del veredicto** (fuente única: la simulación):
- Ejes: **Daño** (la rotación con el perfil resuelto de las habilidades de la barra) y **Aguante** (`maxHP / expectedMitigation(stats, AL)`). Los dos se muestran en % del valor actual.
- ▲ si un eje sube ≥ umbral y el otro no baja más del umbral (propuesta de partida: 1 %; calibrar con E4b).
- ▼ si ninguno sube. ↔ si uno sube y el otro baja más del umbral.
- «?» si el objeto tiene efectos que el modelo no mide (procs, comportamientos).
- Fuera del veredicto: hallazgo mágico, oro y velocidad de movimiento. Se ven como líneas, pero no cuentan como poder.
- El mismo modelo da el ▲ de la celda, «Mejor para mí», «▲ para algún héroe», el ⚡ Poder y el `itemValue` del banco.
- Vista previa **pura** (§3.11).

**Celda de la mochila:** 3 superposiciones (§3.4), con el ▲ verde para el héroe activo o el emblema del héroe al que mejora.

**Hoja del personaje:** ⚡ Poder del mismo modelo y, debajo, Daño y Aguante. El flotante «+N ⚡ Poder» solo sale cuando ese número sube.

**Ventana de forja:** cada opción con su delta simulado; «≈ 0 ⊘» si el tope se la come; barra de rangos con la muesca de la marca de agua.

**Cofre «elige 1 de 3»:** tres cartas con tooltip compacto, Shift compara, un clic elige.

---

## 5. Refutación de la v0 (dos rondas, antes de la revisión externa)

### Ronda 1: experto en itemización ARPG (Diablo, PoE, Last Epoch)

**R1-1. «La rejilla 1×1 mata el sabor de D2; hasta Diablo V vuelve a los tamaños».**
- A favor de la objeción: Diablo V confirmado en BlizzCon 2026 [V]; argumentos de fricción y forma [V].
- En contra: la lección de D4 sobre la gestión que corta el juego [V]; D3 resolvió la «solidez» con dos tamaños [V]; PoE2 no autoordena [S]; el cooperativo no tendrá pausa; hacen falta iconos por base.
- **Resolución:** se mantiene 1×1, con `w,h` en los datos desde ya. Si el dueño quiere el sabor de D2, la variante es **D3: 1×1 joyería y gemas, 1×2 lo demás**, con autoordenar trivial. Queda como **pregunta al dueño**.

**R1-2. «Un único ▲ siempre miente: depende de la build».**
- Evidencia: el aviso sobre los marcadores verdes de D4 [S]; nuestra doble fuente.
- **Resolución (actualizada en la v2):** dos ejes (Daño y Aguante) desde la simulación, «?» cuando hay efectos no medidos y `itemPower` desaparece. En la v2 se añaden las otras dos fuentes (`st.power` e `itemValue`) y la vista previa pura.

**R1-3. «Mostrar rangos y tiers por defecto sobrecarga; esconderlos frustra al experto».**
- Evidencia: PoE y D4 lo ponen detrás de Alt u opción [V].
- **Resolución (actualizada en la v2):** capa Alt y, por defecto, **un único indicador de 5 segmentos** por línea (§3.3). Tier numerado **por base**.

**R1-4. «25 reglas es demasiado para un jugador casual; 4 preajustes es poco para un veterano».**
- Evidencia: el objetivo de Last Epoch de servir a los dos [V]; D4 llega a 25 reglas [V].
- **Resolución:** dos niveles. Los preajustes van en el Paso 4; el editor puede ir después. Exportar como código desde el inicio.

### Ronda 2: experto en MMO y multijugador + navegador + accesibilidad

**R2-1. «Si el mundo sigue en el cooperativo, abrir el inventario en combate te mata».**
- **Resolución:** en solitario, pausar es un ajuste opcional activado por defecto. En el cooperativo no se pausa. Atajos rápidos, inventario anclado a la derecha y aviso de daño visible con el panel abierto.

**R2-2. «El botín compartido genera peleas y carreras de red».**
- **Resolución:** botín personal por defecto; los modos de asignación quedan para el futuro. El oro siempre es por jugador.

**R2-3. «El lote es la mayor fuente de pérdidas irrecuperables».**
- **Resolución:** resumen + Deshacer + recompra de 12. Legendario+ fuera del lote (§3.8).

**R2-4. «Alt y Ctrl+F son del navegador».**
- **Resolución:** capturarlos solo en contexto; verificar Alt en Chrome y Firefox con `preventDefault` en keydown y keyup; remapeo. Sigue siendo **[CP]**.

**R2-5. «Las etiquetas del DOM sobre 3D con mucho botín y 4 jugadores tiran el FPS».**
- **Resolución:** pool fijo a 10 Hz como `world-marks.js` y tope de etiquetas visibles. Con botín personal solo se ven las tuyas.

**R2-6. «Tus fuentes de 11–14 px incumplen la accesibilidad».**
- **Resolución:** valor por defecto del tooltip ≥ 16 px CSS, medir la altura real de Cinzel, fondo sólido opcional (XAG 102) y paleta de rareza configurable (XAG 103).

---

## 6. Preguntas para el dueño (cortas)

1. **¿Rejilla 1×1 (D4) o dos tamaños (D3)?** La rejilla completa estilo D2/PoE no la recomiendo con el cooperativo.
2. **¿Pausar al abrir paneles en solitario?** En el cooperativo no se podrá.
3. **¿Botín personal en el cooperativo?** Recomendado: sí.
4. **¿El equipo se recoge solo al pisarlo, o solo lo que marque el filtro?**
5. **¿Iconos pintados por base?** Requiere tanda de arte (Codex) con refutación de arte.
6. **¿Un solo ⚡ Poder (Daño y Aguante combinados) o dos números a la vista?** Recomiendo uno, con los dos debajo en la hoja.

---

## 7. Fuentes

| Fuente | Qué saqué |
|---|---|
| Blizzard, *Diablo IV Quarterly Update, feb-2020* (Angela Del Priore) — https://news.blizzard.com/en-us/article/23308274/diablo-iv-quarterly-updatefebruary-2020 [V] | Sin tamaños para no interrumpir con gestión; señal de rareza secundaria en el borde; fondos menos saturados; iconos basados en el modelo 3D |
| Blizzard, notas de D4 2.5.0 (temporada 11, dic-2025) — https://news.blizzard.com/en-us/article/24244466/diablo-iv-patch-notes [V] | «ranges have been narrowed»; comparación de armadura y resistencia «as percentage of Toughness difference»; Dureza en la ventana de stats y recomendada por Tormento; Calidad máx. 25 (+1 % por punto); DPS mostrado de forma inconsistente entre pestañas (corregido) |
| Engadget, BlizzCon 2013, cambios de itemización de WoW — https://www.engadget.com/2013-11-09-blizzcon-2013-huge-changes-coming-to-itemization.html [V] | «Reforging is gone!»; «too much modification needed to be done every time you get a new piece of gear»; el principal cambia según la especialización de quien lo lleva; terciarias fuera del presupuesto; menos engarces y encantamientos; golpe y pericia «didn't feel like a bonus» |
| But Why Tho?, entrevista a Ion Hazzikostas, 13-sep-2026 — https://butwhytho.net/2026/09/world-of-warcraft-midnight-interview-2/ [V] | «every piece of gear starts to look like a spreadsheet» (sobre el tamaño de los números y la compresión de stats); un objeto necesita «at least like a 10 to 15 percent increase in power» para notarse; apego visceral al número de ilvl |
| Warcraft Tavern, comparación automática en TBC Anniversary, 8-jul-2026 — https://www.warcrafttavern.com/tbc/news/how-to-disable-automatic-item-comparison-tooltips-in-tbc-anniversary/ [V] | Por defecto solo el objeto; Shift muestra la comparación; CVar `alwaysCompareItems` |
| CurseForge, addons de flecha de mejora de WoW (Easy Gear Upgrade, Simple Item Levels, BetterBags Upgrade Glow) — https://www.curseforge.com/wow/addons/easy-gear-upgrade [S] | La flecha de mejora en bolsas la ponen addons, con la regla «ilvl mayor que lo equipado» |
| Blizzard Watch, mejora de equipo en Midnight, 2-mar-2026 — https://blizzardwatch.com/2026/03/02/upgrade-gear-midnight-no-valorstones-required [V] | 5 pistas de 6 rangos; 20 crestas por rango; sin piedras de valor |
| CurseForge, CrestAdvisor — https://www.curseforge.com/wow/addons/crestadvisor [V] | Marca de agua por ranura: «Upgrade at zero crest cost» por debajo de lo ya alcanzado |
| Warcraft Wiki, Item upgrade — https://warcraft.wiki.gg/wiki/Item_upgrade [V] | Descuento de cuenta del 50 % cuando un personaje ya alcanzó ese ilvl en la ranura |
| Blizzard Support, artículo 336964 — https://us.support.blizzard.com/en/article/336964 [S, pide sesión] | Descuento de piedras a nivel de Banda por el personaje con más ilvl en la ranura; crestas de Banda tras logros |
| Warcraft Wiki, Great Vault — https://warcraft.wiki.gg/wiki/Great_Vault [V] | Hasta 9 objetos, se reclama 1; filas de banda, mazmorra y mundo; Midnight T2 |
| Consolegameswiki, FFXIV Level Sync — https://ffxiv.consolegameswiki.com/wiki/Level_Sync [V] | ilvl topado por nivel; subestadísticas topadas por tipo de pieza, no escaladas hacia arriba; materia ignorada |
| Wiki de Guild Wars 2, Stat change / Legendary equipment (extracto del buscador; la wiki estaba en mantenimiento) — https://wiki.guildwars2.com/wiki/Stat_change [S] | Legendario: cambio de combinación gratis fuera de combate con «Customize»; ascendido: Forja Mística |
| MDN, `Clipboard.writeText()` — https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText [V] | Solo en contexto seguro (HTTPS); `NotAllowedError` si no se permite |
| GameBanshee, entrevista a Jay Wilson (D3), 24-ago-2010 — http://www.gamebanshee.com/qykw [V] | «two sizes», «no odd shapes»; iconos 1:1 sin solidez |
| TechTimes, BlizzCon 2026 Diablo V, 13-sep-2026 — https://www.techtimes.com/articles/327441/20260913/diablo-v-forging-the-next-era [V] | Objetos de varias casillas en rejilla; 2029 |
| Canaltech, 14-sep-2026 — https://canaltech.com.br/games/diablo-v-chega-em-2029-e-coloca-jogadores-em-um-mundo-onde-o-vilao-ja-venceu [V] | Inventario en rejilla e itemización basada en Diablo II |
| Power Up Gaming, 16-sep-2026 — https://powerupgaming.co.uk/2026/09/16/diablo-v-is-bringing-back-diablo-ii-style-grid-inventories/ [V, no oficial] | Polearms y petos más grandes; «decidir qué cargar» |
| Den of Geek, 6-jun-2023 — https://www.denofgeek.com/games/diablo-4-best-hidden-setting-compare-gear [V] | D4: por defecto solo mayor o menor poder; Advanced Tooltip Compare con Shift |
| DiabloFilter, guía de daño — https://diablofilter.com/guide/damage-explained-how-damage-really-works-and-how-to-compare-gear [V] | [+] aditivo / [×] multiplicativo |
| MP1st, notas de D4 1.2.0 — https://mp1st.com/news/diablo-4-season-2-patch-notes-for-build-1-2-0-released [V] | Favorito no vendible; basura y favorito en el alijo; «Vender basura» por pestaña |
| Dexerto, notas de D4 1.4.0 — https://www.dexerto.com/diablo/diablo-4-patch-notes-1-4-0-itemization-crafting-2676111/ [V] | Icono de afijo mayor; templado con tirada y rango; alijo filtrable por poder; lector de pantalla |
| Dexerto, «Salvage All», 15-may-2024 — https://www.dexerto.com/diablo/diablo-4-salvage-all-items-change-loot-reborn-2725179 [V] | Desguazar todo sin confirmar; únicos perdidos |
| Mein-MMO, espacio en D4 (dic-2024) — https://mein-mmo.de/en/players-complain-about-lack-of-space-in-diablo-4-blizzard-addresses-criticism-and-reworks-the-items-that-clog-everything-up,1204602/ [V] | Brújulas a 99; gemas a materiales; aspectos al Códice |
| DiabloBytes, filtro de D4 — https://www.diablobytes.com/diablo-iv/lord-of-hatred/loot-filter/ [V] | 1–25 reglas, 10 condiciones; lo oculto sigue cayendo; código; 28-abr-2026 |
| Mein-MMO, filtro de D4, 13-oct-2026 — https://mein-mmo.de/diablo-4-lootfilter-einstellen-anpassen/ [V] | 25 reglas de arriba abajo; un filtro activo; tecla de alternar |
| Icy Veins, alijo en LoH — https://www.icy-veins.com/d4/news/diablo-4-devs-confirm-loot-filter-and-stash-space-improvements [S, 403] | Sin cambios de alijo en *Lord of Hatred* |
| WIUWI, espacio de D4 — https://wiuwi.com/blogs/145956/Storage-space-or-Stash-in-Diablo-4-has-been-a [S] | 33 casillas, pestañas de 50 |
| Foro de D4, 7-jul-2024 — https://us.forums.blizzard.com/en/d4/t/inventory-item-visual-clarity-is-a-growing-issue/177655 [V] | ~9 superposiciones por icono; petición de interruptor |
| Maxroll, filtro de Last Epoch — https://maxroll.gg/last-epoch/resources/loot-filter-guide [V] | 75 reglas; condiciones; de arriba abajo |
| Foro de Last Epoch, Sarno, 8-sep-2020 — https://forum.lastepoch.com/t/loot-filters-in-last-epoch/24302 [V] | Accesible + preciso; exportar; activar o desactivar reglas |
| Maxroll, notas de Last Epoch 1.2.3 (may-2025) — https://maxroll.gg/last-epoch/news/last-epoch-patch-1-2-3-notes [V] | Búsqueda con macros, regex y expresiones |
| Icy Veins, prioridad de pestañas de Last Epoch — https://www.icy-veins.com/last-epoch/news/players-are-just-now-noticing-this-stash-qol-feature-in-last-epoch/ [S, 403] | Shift+clic enruta (1.1.7) |
| GGG, notas de PoE 3.1.2 — https://www.pathofexile.com/forum/view-thread/2075735 [V] | Alt: prefijos y sufijos, rangos, tier; aviso de numeración global |
| poe2wiki, Inventory — https://www.poe2wiki.net/wiki/Inventory [S, Anubis] | Mochila 5×12 |
| Destructoid, PoE2 — https://destructoid.com/?p=974496 [S] | Sin autoordenar |
| Vulkk, pestañas de PoE2, 20-feb-2025 — https://vulkk.com/2025/02/20/path-of-exile-2-stash-tabs-explained [S] | 10 tipos de pestaña |
| Steam, afinidad en PoE2 — https://steamcommunity.com/app/2694490/discussions/0/4628107478026000912 [S] | Afinidad + Ctrl+clic |
| GuildOrder, reparto en grupo de PoE2 — https://guildorder.com/games/poe2/guides/party-mapping-and-loot-rules [S] | FFA / Short / Permanent |
| Gfinity / Maxroll, botín de D4 — https://www.gfinityesports.com/guides/is-diablo-4-loot-shared , https://maxroll.gg/d4/resources/multiplayer [S] | Botín personal; «Account Bound» |
| Diablo Wiki, Legendary trading exception — https://di.diablowiki.net/Legendary_trading_exception [S] | D3: intercambio con presentes, 2 h |
| Warcraft Tavern, intercambio en WoW Classic — https://www.warcrafttavern.com/news/loot-trading-in-wow-classic [S] | Ahorrar tiempo frente a minimizar el abuso |
| DiabloBytes, pestañas de D2R, 11-feb-2026 — https://www.diablobytes.com/d2-resurrected/news/advanced-stash-tabs/ [V] | 4 pestañas dedicadas, pilas de 99, materiales en lista |
| Wccftech, D2R 2.4 — https://wccftech.com/diablo-ii-resurrected-patch-2-4-changes/amp/ [S] | Alijo de ladder separado |
| Warcraft Wiki, Warband Bank / Bag / Buyback — https://warcraft.wiki.gg/wiki/Warband_Bank , https://warcraft.wiki.gg/wiki/Bag , https://warcraft.wiki.gg/wiki/Buyback [V] | 5×98; búsqueda que oscurece; recompra de 12 |
| CurseForge, Baganator — https://www.curseforge.com/wow/addons/baganator [S] | Ordenar, basura, «Recent (Auto)» |
| Out of Games, *Inventory Systems — Lost in the Grid* — https://outof.games/news/6699-inventory-systems-in-games-lost-in-the-grid/ [V] | Pros y contras del «tetris» |
| Xbox Accessibility Guidelines 101/102/103 — https://devdocs.xbox.com/gaming/accessibility/xbox-accessibility-guidelines/101 (y /102, /103) [V] | ≥ 18 px; 200 %; contraste; color nunca único canal |
| Game Accessibility Guidelines — https://gameaccessibilityguidelines.com/ensure-no-essential-information-is-conveyed-by-a-colour-alone/ [V] | 8–10 % de los hombres |
| W3C WAI-ARIA APG, Grid — https://www.w3.org/WAI/ARIA/apg/patterns/grid/ [V] | Roles y teclado de la rejilla |
| Lennart Nacke, Acagamic #52, 21-mar-2023 — https://acagamic.com/newsletter/2023/03/21/how-to-unlock-the-secrets-of-video-game-inventory-ux-design/ [V] | Detener, ralentizar o continuar el mundo |
| Repo | `js/ui.js:294-354, 670-672, 1985-2008, 2410-2497, 2548-2804, 2899`; `js/entities.js:963-975`; `js/combat-math.js:518-523`; `js/economy.js:592-626`; `js/main.js:699-701, 1443, 1492, 1503, 1552, 1680-1697, 1896`; `js/items.js:7-20`; `js/input.js:7, 36-38, 60-61, 104-110`; `css/style.css:187-191, 238-258, 477-484`; `tests/helpers/bench-core.mjs:72`; MEMORIA.md:101-106, 123, 350 |

**Sin verificar [CP]** (confirmar antes de citar como hecho):
- WoW: brillo de «nuevo» en bolsas; texto exacto «Upgrade Level: Héroe 2/6» en el tooltip.
- PoE: Ctrl+C para copiar el objeto.
- Last Epoch: rejilla con tamaños.
- Guild Wars 2: combinaciones con nombre (p. ej., *Berserker's* = Potencia, Precisión y Ferocidad).
- Firefox y Chrome: foco del menú al soltar Alt.
- Chrome y Safari: `writeText` exige gesto del usuario o pestaña enfocada.

---

## 8. Refutación y cambios (v2)

Dos expertos (itemización de MMO/ARPG y multijugador) refutaron el frente completo. Abajo, lo que tocaba a este informe, qué cambié y dónde discrepo.

### 8.1 Objeciones aceptadas y cambios

| # | Objeción del experto | Cambio en este informe | Dónde |
|---|---|---|---|
| X1 | La v1 apila ~10 ejes de progreso por pieza; tope de 3 ejes visibles | Tooltip rehecho con 3 ejes: insignia de poder (ilvl + rangos, Calidad fundida, anillo de mejora), rareza (color + glifo + nº de líneas) y la línea de forja ⚒. Evidencia propia verificada: Greg Street 2013 («too much modification…») y D4 2.5.0 («ranges have been narrowed») | §0.5, §3.3, §4 |
| X2 | Pips de tier (arpg R3) frente a barrita de tirada (ux v1): dos indicadores distintos | **Un único indicador de 5 segmentos** por línea: posición entre el mínimo y el máximo posibles para ese ilvl; si los tiers son discretos, cada segmento es un tier. El Mayor ★ es el indicador lleno en oro. El desglose va en Alt | §3.3, §4, §5 R1-3 |
| X3 | Presupuestos de líneas que no cuadran (6 + aspecto frente a ≤ 9 filas; la maqueta ya usaba 10) | Cifra única: **≤ 4 líneas de afijo (3 + 1 de forja) + aspecto**; engarces como iconos en la fila de la base; set y detalle en Alt; sin pie de teclas; ≤ 9 filas | §3.3, §4 |
| X4 | Tres fuentes de «poder» que se contradicen (`itemPower`, `_charDPS`, `st.power`) | Confirmado en el código y ampliado: son **cuatro** (también `itemValue` del banco). Un solo modelo de simulación (Daño + Aguante) alimenta veredicto, ▲, orden, ⚡ Poder y banco; hallazgo mágico y oro fuera | §0.3, §1, §3.2, §3.13, §4 |
| X5 | El hover recorta vida y recurso (auditoría de `actual.md`) | Corregí la v1, que decía «equipar en copia» (era falso: muta el `Player` real). Propuesta de vista previa pura y coste diferido con caché | §0.4, §1, §3.11 |
| X6 | No pintar en rojo los `CAPS` en el comparador (los rendimientos decrecientes de WoW son invisibles) | Aceptado: el comparador muestra el delta simulado. El tope solo aparece en la ventana de forja («≈ 0 ⊘»), como el rojo de FFXIV en el engarce | §3.15, §4 |
| X7 | El presupuesto es un techo; el comparador debería mostrar el «hueco hasta el techo» de forma visual | Aceptado sin añadir un eje: el anillo vacío de la insignia y la línea ⚒ vacía son el hueco | §3.3, §4 |
| X8 | Atributo principal que se adapta a quien lo lleva (WoW), no botín inteligente de D3 | Tooltip con el atributo ya resuelto para el héroe que mira; Alt dice «se adapta»; el alijo compartido marca «▲ para algún héroe» | §3.3, §3.5 |
| X9 | Nivel requerido / ilvl efectivo que escala hacia abajo | Insignia con el número efectivo, tono apagado y ⇣; Alt con los dos valores; sin línea roja de «Nivel requerido»; el veredicto usa el efectivo | §3.13, §3.12 |
| X10 | Protección contra la mala suerte de aspectos (polvo, «elige 1 de 3») | Diseño visual del cofre de 3 cartas, del polvo en el resumen de desguace y de las cartas en silueta del Códice | §3.14, §4 |
| X11 | Marca de agua de Calidad por ranura y cuenta (WoW), no traspaso estilo Lost Ark | Muesca ▮ en la barra de rangos y moneda tachada o «⅓» por debajo. Verifiqué la mecánica: rangos a 0 crestas por debajo de la marca (CrestAdvisor) y 50 % de descuento de cuenta (Warcraft Wiki) | §3.14 |
| X12 | Resistencias y afijos de recurso planos crean afijos muertos | Sin efecto directo en la UX salvo uno: el recurso se muestra en % con el icono del recurso de tu clase, igual para las tres | §3.3 |
| X13 | Rareza como multiplicador (`statMult`) sin decidir | No es decisión de UX. Anoto la consecuencia: si la rareza solo fija líneas y aspecto, se lee por color, glifo y nº de líneas, y el tooltip no necesita la palabra «Legendario» (va en Alt) | §3.3 |

### 8.2 Dónde discrepo (con fuente)

- **D1. La cita de Hazzikostas no habla de ejes.** El experto usa «every piece of gear starts to look like a spreadsheet» como prueba de que hay demasiados ejes por pieza. En la entrevista (13-sep-2026), la frase habla de **cuándo toca comprimir los números** (el tamaño de las cifras), no del número de sistemas por pieza [V]. La conclusión sigue en pie, pero por otra fuente: Greg Street en 2013, «too much modification needed to be done every time you get a new piece of gear» [V]. En este informe uso esa.
- **D2. «Remove a penalty» no es la cita de 2013.** El artículo de Engadget dice que golpe y pericia se quitaban porque «didn't feel like a bonus» [V]. La idea es la misma y la lección (no mostrar topes como alarma) se mantiene.
- **D3. Conservo un ⚡ Poder único en lugar de dos números.** El experto pide que el ⚡ salga del modelo único y lo acepto. Pero no lo cambio por «Daño + Aguante» a la vista en el HUD: el dueño quiere poco texto y ya tiene el flotante de número que sube. D4 enseña DPS y Dureza por separado, pero dentro de la ventana de stats [V]. Por eso el ⚡ combina los dos y la hoja los desglosa. Queda como pregunta al dueño (§6.6).
- **D4. El número de poder del objeto puede contradecir al veredicto, y está bien.** El experto pide que el número de poder «coincida con el veredicto». Si el número es ilvl + rangos (su propia propuesta X1), no puede coincidir siempre: dos piezas del mismo ilvl valen distinto según la build. En WoW pasa lo mismo y la flecha de mejora en bolsas la ponen addons por ilvl [S]. Lo que tiene que coincidir es **todo lo que dice «mejor»** (veredicto, ▲, orden, ⚡). El número del objeto dice «avance» y no «mejor para ti». Así lo separo en §3.13.

### 8.3 Ronda 3: refutación interna de lo nuevo de la v2

> Revisión que hago yo adoptando cada papel. No son personas reales.

**R3-1. Diseñador de itemización de MMO: «Con un umbral del 1 %, el ▲ parpadea al cambiar de talentos y la mochila entera cambia de color».**
- Evidencia: el ▲ de WoW por ilvl (addons) es estable porque no mira la build [S].
- **Resolución:** es deseable que el ▲ siga a la build (es la razón de simular), pero el recálculo se hace al cerrar el panel de talentos, no a cada clic. El umbral se calibra con E4b.

**R3-2. Experto en multijugador en navegador: «Simular para tus 3 héroes y para regalar a un compañero es mucha CPU y tráfico».**
- **Resolución:** solo el héroe activo en la mochila; los demás, al abrir el alijo, de forma diferida y con caché. Al regalar, un único mensaje «▲/↔/▼» desde el cliente del compañero. No medí el coste de `recompute()`: queda como tarea de implementación con presupuesto (p. ej., ≤ 2 ms por fotograma para las simulaciones).

**R3-3. Accesibilidad: «Anillo + segmentos + ★ + ⚒ + ⇣ son muchas formas pequeñas».**
- Evidencia: XAG 101/103 [V].
- **Resolución:** cada forma tiene su equivalente de texto en Alt; con «Texto grande» el anillo pasa a «+3» y los segmentos crecen con `--s`. En la celda solo hay 3 superposiciones (§3.4); el resto vive en el tooltip.

**R3-4. Experto en ARPG: «Sin la palabra “Legendario” en el tooltip, el nuevo no sabe qué tiene».**
- Evidencia: D4 cambió los fondos y añadió señal de rareza en el borde, pero mantiene el nombre de la rareza [V, entrada de 2020].
- **Resolución parcial:** el color y el glifo bastan para el veterano. Para el nuevo, la palabra aparece en Alt y en el tooltip durante las primeras horas (mismo sistema de consejos que oculta el pie de teclas). Si el dueño prefiere verla siempre, cuesta media fila: se añade a la fila 1 tras el nombre.
