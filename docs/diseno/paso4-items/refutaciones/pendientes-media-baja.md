# Objeciones media/baja y faltantes que el corrector no vio (170)

Id = ronda-experto-(P problema | F faltante)número. Texto íntegro salvo la fuente (está en `*.json`).

### INV-A-P16 · media
- Dónde: arpg.md R9 y v1.11 (Opción A, ILVL_MAX 50, frente a B)
- Problema: La opción A se plantea solo como algo de calibración y falta el criterio de MMO. (a) Un objeto tiene que dar al menos 10–15 % más de poder para que se note («we need at least like a 10 to 15 percent increase in power», Hazzikostas); con G = 1,065 por ilvl, eso son ~2 ilvl. (b) La curva de área se aplanó a propósito desde el Nv70 (AL 47 en el 70 y 50 en el 100; combat-math.js:552-565) porque el ilvl está topado: la opción A solo añade +7 ilvl entre el Nv58 y el 70 y +3 (≈ +21 % en valores planos) entre el 70 y el 100. (c) GW2 mantiene un techo fijo con progresión horizontal («no gear treadmill»; ascendido = solo +12,5 % sobre exótico).
- Arreglo propuesto: Elegir B con «pistas de mejora» que sigan subiendo el número de poder visible, y usar el umbral del 10–15 % para el tamaño de cada salto: un tier, o rangos de Calidad agrupados de 2 o 3. El ladder estacional ya reinicia la cinta de equipo cada temporada.

### INV-A-P17 · media
- Dónde: arpg.md §6 M5 y v1.10; ux.md §3.12 (botín personal como si fuera consenso)
- Problema: WoW volvió al botín de grupo como modo por defecto en las bandas, y en su botín personal solo se puede intercambiar lo que «not an Item level upgrade for yourself». Ningún informe fija cuánto botín recibe cada jugador en grupo: si cada uno se lleva una tirada completa por muerte y el grupo mata N veces más rápido, el botín por hora y por jugador se multiplica por ~N.
- Arreglo propuesto: Mantener el botín personal en el cooperativo de 2–4 (como D3 y D4). En ladder, regla contra el embudo: «se puede regalar si no es mejora para ti y el otro estaba presente, hasta 2 h». Fijar en E4b el factor de botín por tamaño de grupo (WoW: número de objetos «based on group size»).

### INV-A-P18 · media
- Dónde: arpg.md §6 M4 y M7 (el ladder valida «repitiendo la semilla»; formato compacto)
- Problema: La semilla sola no reproduce una carrera: el orden en que se consume el stream depende de las muertes y de las entradas del jugador (actual.md §9 lo reconoce). Además G() usa Math.pow, y la precisión de Math «es implementation-dependent… different browsers can give a different result». Dos clientes pueden redondear distinto un afijo que cae justo en la frontera de .5.
- Arreglo propuesto: El formato compacto guarda valores ya cuantizados ([id de afijo, tier, paso entero]) y nunca derivados en coma flotante. La generación usa una tabla de G precalculada con enteros. El ladder valida por registro de entradas o con autoridad de servidor, no solo por semilla.

### INV-A-P19 · media
- Dónde: arpg.md R5 y v1.5 (45 + 10 aspectos que modifican variantes)
- Problema: No está definida la frontera entre talentos (que en el Paso 2 ya modifican variantes y forja) y aspectos. Lord of Hatred TRASLADÓ pasivas del árbol a los aspectos, no las duplicó. Unos 55 aspectos más únicos y míticos por especialización son mucho contenido para un solo dueño, y cada uno exige cobertura en el banco y en test65a.
- Arreglo propuesto: Regla escrita: el talento elige un comportamiento; el aspecto potencia o da rango a un comportamiento ya elegido, o es la alternativa del mismo nodo; prohibido que un aspecto repita un nodo. Empezar con 2–3 por especialización y 6–8 genéricos (≈ 25–30) y ampliar después de calibrar.

### INV-A-P20 · media
- Dónde: arpg.md R2 (pool por ranura pero no por clase)
- Problema: Filtrar por ranura no impide que una línea sea inútil para quien la lleva: maná para el Guerrero, reducción de enfriamiento en una build sin enfriamientos, espinas en la Maga o la Arquera a distancia. En WoW los secundarios rinden para todas las especializaciones con pesos parecidos («no stat is so bad that it should be completely avoided»).
- Arreglo propuesto: Regla de diseño comprobada en el banco: ninguna línea del pool vale menos del 50 % de la mejor línea para ninguna de las 9 especializaciones que pueden recibirla. El botín inteligente filtra líneas, no solo bases.

### INV-A-P21 · baja
- Dónde: arpg.md §2.1, §3.4 y R6 (datos de D4)
- Problema: Hay datos de D4 desactualizados o sin fuente. (a) «El remate convierte un afijo en Mayor» y «Calidad 20 o 25, por confirmar»: en LoH (Maxroll, 23-may-2026) son 25 rangos de +1 % a daño base, armadura, resistencias Y afijos, y el remate da +50 % a un afijo al azar, re-tirable sin límite (10 M de oro). actual.md ya tenía esa fuente, así que los informes se contradicen. (b) El «5.º afijo potente en LoH» no tiene fuente: la nota oficial de LoH no lo menciona y la 2.5.0 confirma 4 afijos en legendarios. (c) No recoge que la 2.5.0 «narrowed» los rangos.
- Arreglo propuesto: Corregir la tabla §3.4 y el §2.1: legendario D4 = 4 afijos (2.5.0), LoH = templado, remate de +50 % re-tirable y Cubo. Quitar el 5.º afijo o citarlo. Usar el estrechamiento de rangos como argumento para tiers sin tirada interna.

### INV-A-P22 · baja
- Dónde: arpg.md E4 y v1.7 (sets → Talismán, solo bonos aditivos)
- Problema: Quitarle al set todo lo que no sea un bono aditivo (+X % de daño) le quita identidad. En los MMO, los sets de tier de WoW son el principal portador de identidad de especialización (2/4 piezas que cambian la mecánica) y su bono va fuera del presupuesto de stats. Lo de Storm Shepherd fue un problema de magnitud, no de forma.
- Arreglo propuesto: Si hay sets: un bono de 2 piezas aditivo y un bono de 3 o 4 piezas que modifica el indicador de la especialización (gaugeGain:<id>, gaugeMax:<id>), con las piezas del set pagando ~10–15 % de su presupuesto (como Grim Dawn).

### INV-A-P23 · baja
- Dónde: arpg.md R2 (velocidad de movimiento y hallazgo mágico dentro del presupuesto)
- Problema: Las utilidades compiten con el daño y la vida y se vuelven afijos trampa. WoW las sacó como «terciarias» (velocidad, robo de vida, evasión), que «do not count towards the item budget».
- Arreglo propuesto: Velocidad de movimiento, hallazgo mágico y oro como línea terciaria fuera del presupuesto: rara, pequeña y nunca en lugar de una línea de combate.

### INV-A-P24 · baja
- Dónde: actual.md §9 ronda 1 («la inflación de oro solo importa con comercio o ladder»)
- Problema: Desde los MMO, también importa en solitario: si sobra oro, el oro deja de marcar el ritmo del crafteo. Hoy llevar una pieza a Calidad 5 cuesta lo que dan ~77 comunes; D4 pide 7,25–11,25 M de oro más materiales por pieza.
- Arreglo propuesto: Modelo de fuentes y sumideros con un objetivo de «horas de juego para llevar una pieza al máximo», más un material de crafteo ligado a la dificultad (Tormento), no solo oro.

### INV-A-P25 · baja
- Dónde: arpg.md R4 y v1.7 («amuletos» para los charms)
- Problema: Choque de nombres: «amuletos» de mochila frente a la ranura «Amuleto». Para un dueño que quiere poco texto, el mismo nombre para dos cosas confunde.
- Arreglo propuesto: Llamar «dijes» o «abalorios» a los charms en todo el diseño.

### INV-A-P26 · baja
- Dónde: arpg.md §2.7, §2.8 y R7 (citas [memoria] usadas como parámetros)
- Problema: El 85 % del botín inteligente de D3 y los pesos de WoW se usan como valores de diseño sin verificar. Los pesos de WoW los comprobé y son casi correctos; el 85 % sigue sin fuente.
- Arreglo propuesto: Presentar el 85 % como parámetro propio que se calibra en el banco, no como evidencia.

### INV-A-F1 · faltante
- Guild Wars 2, que el encargo pedía, no aparece en ningún informe. Tres patrones encajan: (1) combinaciones de stats con nombre (Berserker = Potencia/Precisión/Ferocidad), donde un nombre y un icono dicen 3 stats, ideal para «poco texto»; (2) un techo de poder fijo con progresión horizontal («In Guild Wars 2 there is no gear treadmill»; ascendido = +12,5 % sobre exótico); (3) el legendario como comodidad (cambio de stats gratis), no como más poder. Propuesta: que los raros tiren un «perfil con nombre» filtrado por clase más 1 línea al azar, y que el mítico permita cambiar de perfil gratis. Fuente: https://metabattle.com/wiki/Guide:How_to_Gear_a_Character

### INV-A-F2 · faltante
- Cuota objetivo de poder del equipo frente a talentos, tablero, bendiciones (sin tope), Era y collar en cada hito. Es el paso previo a cualquier presupuesto por ranura y a E4b.

### INV-A-F3 · faltante
- Ritmo objetivo de mejoras por fase (mejoras por hora en la subida de nivel, al final del juego y para el objeto que se persigue) y el umbral de «mejora que se nota» del 10–15 % (Hazzikostas), que debería fijar el tamaño de tiers y rangos.

### INV-A-F4 · faltante
- Protección contra la mala suerte o un camino determinista para aspectos y únicos: polvo de aspecto canjeable, «elige 1 de 3» en el jefe, como la Gran Cámara de WoW.

### INV-A-F5 · faltante
- Nivel requerido o ilvl efectivo topado por el nivel del héroe, para el alijo compartido, el cooperativo con niveles distintos y el ladder.

### INV-A-F6 · faltante
- Progreso de mejora a nivel de cuenta (marca de agua por ranura, como el descuento Warband de WoW) para 3 héroes con alijo compartido.

### INV-A-F7 · faltante
- Coste en equipo de cambiar de especialización (9 especializaciones): conjuntos de equipo guardados, aspectos intercambiables gratis desde el Códice en el pueblo y únicos por clase antes que por especialización.

### INV-A-F8 · faltante
- Qué stats escalan con el ilvl en el sistema nuevo de tiers: hoy los % no escalan y los planos siguen G. Si los tiers suben los %, el saco aditivo crece y desplaza la calibración.

### INV-A-F9 · faltante
- Factor de botín por tamaño de grupo en el cooperativo, y regla contra el embudo en los regalos del ladder («no es mejora para ti», presente, 2 h).

### INV-A-F10 · faltante
- Modelo de fuentes y sumideros de oro y materiales, con horas objetivo para llevar una pieza al máximo.

### INV-A-F11 · faltante
- Formato canónico con valores enteros cuantizados (sin coma flotante derivada) para que dos navegadores o un validador generen y comprueben exactamente el mismo objeto.

### INV-A-F12 · faltante
- Apariencia o transmog separada de los stats para cuando haya cooperativo (los demás te ven). Baja prioridad mientras los iconos sean emoji y haya un solo modelo de héroe.

### INV-B-P4 · media
- Dónde: arpg.md §4 R6.3, §6 M2 y §7.6 («Calidad 0–10 sobre la base, no los afijos»; «traspaso del 100 % hasta el 5»). Código: js/items.js:22 (ARMOR_SLOTS sin anillos ni amuleto) y js/combat-math.js:133 (Tormento: calidad = ⌊T/2⌋, hasta 5)
- Problema: Hay tres fallos en la propuesta de Calidad:
- **Se apoya en un dato desactualizado:** en el D4 actual (LoH) la Calidad tiene 25 rangos de +1 % sobre daño base, armadura, resistencia **y todos los afijos**. El remate da +50 % a un afijo al azar y esa posición se puede re-tirar.
- **Deja la joyería sin uso:** anillos y amuleto no tienen base, así que la Calidad no les daría nada en 3 de las 12 ranuras.
- **Choca con el Tormento:** el Tormento ya regala calidad 5 en T10, así que la mitad de la escala sale gratis y el traspaso del 100 % hasta el 5 sobra.
- Arreglo propuesto: 1. Que la Calidad escale base y afijos, como hoy hace `q` en `recompute`, o definir una base para la joyería.
2. Decidir UNA de estas dos opciones:
   - el Tormento deja de regalar Calidad y pasa a dar probabilidad de ★ o de «Ancestral»;
   - se elimina el traspaso.
3. Fijar el máximo de Calidad con el banco, no copiando el 10.

### INV-B-P5 · media
- Dónde: arpg.md §0.1, §2.1 (Lord of Hatred), tabla §3.4 («D4 LoH: 4 + 5.º afijo potente; únicos con menos afijos y fijos») y la fila T11 «Calidad 20–25»
- Problema: El estado de D4 está desactualizado o sin fuente en tres puntos:
- **«5.º afijo en LoH»:** no aparece en el anuncio oficial. Lo más probable es que sea el resultado «Bonus Transfiguration Affix» (~35 %) del Cubo, no una propiedad de lo que cae.
- **«Únicos con menos afijos y fijos»:** es lo que se anunció antes del lanzamiento. En la T13 los únicos salieron con afijos aleatorios, hubo muchas quejas y la T14 puso «All Unique items now have 2 guaranteed affixes».
- **Calidad máxima:** hoy es 25, no 20.

Además, el informe no cubre la T14 ni la T15, cuando las T14 y T15 aportan justo la lección que necesita R1.
- Arreglo propuesto: 1. Corregir la tabla §3.4: el 5.º afijo es un resultado del Cubo y la Calidad máxima es 25.
2. Citar la T14 como evidencia a favor de «Único con 2 fijos + 1–2 aleatorios», y explicar POR QUÉ: los únicos aleatorios se sintieron «dependientes del azar» y llenaban el alijo.
3. Revalidar el párrafo «Estado a octubre de 2026».

### INV-B-P6 · media
- Dónde: arpg.md §4 R2 y §7.3 («Defensivo: resistencias, por fin con fuente»). Código: js/entities.js:757; js/combat-math.js:486-491
- Problema: Las resistencias tendrían fuente en el equipo, pero casi ningún enemigo hace daño elemental: según actual.md §5, solo los peligros de fuego. Un afijo de resistencia sería justo el «afijo trampa» que la investigación quiere eliminar.
- Arreglo propuesto: Elegir una de dos opciones:
- añadir daño elemental enemigo en el mismo paso (afijos de élite, tipos de jefe) y calibrarlo en E4b;
- no ofrecer resistencias hasta que haya daño elemental.

Mientras tanto, el comparador las marca como «?» (efecto no medido).

### INV-B-P7 · media
- Dónde: arpg.md §4 R7 y §6 E3 («Botín inteligente: ~85 % de armas y manos izquierdas de tu clase»). Código: js/items.js:189-192; js/main.js:1235 (`cls: p.classId`)
- Problema: La propuesta empeora lo que ya hay:
- **Armas y manos izquierdas:** hoy ya salen al 100 % de tu clase, así que bajarlas al 85 % sería un retroceso.
- **Lo que falta de verdad:**
  - el botín inteligente en los AFIJOS: atributo principal y +rango solo de habilidades que conoces;
  - en los conjuntos, porque `generateSetItem` no recibe la clase.
- **El 85 % de D3:** sale de una wiki comunitaria («el 15 % para otra clase»), no de Blizzard.
- Arreglo propuesto: 1. Mantener el 100 % en armas y manos izquierdas.
2. Aplicar el botín inteligente a afijos y conjuntos (85–90 %).
3. Dejar el 10–15 % restante a propósito para los otros héroes del alijo compartido, y decirlo en el diseño.

### INV-B-P8 · media
- Dónde: arpg.md §4 R1 y R5 (raro 3–4 afijos + aspecto grabado como camino principal). Código: js/items.js:212-215 (`statMult` de la rareza en el daño de arma y la armadura) y js/game-endgame.js:127-129 (`imprintAspect` cambia la rareza sin tocar los stats)
- Problema: Hoy la rareza multiplica el PODER BASE: ×1,25 el raro y ×1,5 el legendario en el daño de arma.
- Con el modelo «raro con buenos afijos + aspecto grabado», un arma grabada nunca alcanza a una legendaria caída.
- Grabar un blanco lo convierte en «legendario» con 0 afijos y el ×1,0.
- La tirada de base es muy ancha: ×1,56 entre el peor y el mejor raro del mismo ilvl, y el arma es 1 WD de todo el daño.
- Arreglo propuesto: 1. Poder base solo por ilvl (y por «Ancestral» si se adopta). La rareza decide cuántas líneas, no multiplicadores.
2. Estrechar la tirada de base, como hizo Loot 2.0 con los «rangos más estrechos».
3. Grabar no cambia la base; cambia el nombre o color y añade el aspecto.

### INV-B-P9 · media
- Dónde: arpg.md §3.5 y §4 R1 («Normal = base para runas y templado»). Código: js/items.js:24-40 (el tipo de base es cosmético) y js/entities.js:43-45 (escudo detectado por emoji o nombre)
- Problema: «Blanco = base de crafteo» no significa nada si las bases no se diferencian. Hoy una Daga y un Hacha de Guerra tiran igual: sin velocidad, sin implícito, sin bloqueo. La innata del Guardián depende de reconocer el escudo por texto.
- Arreglo propuesto: Tabla de bases con `type` y un implícito por familia:
- arma: velocidad y rango de daño;
- escudo: bloqueo;
- foco y carcaj: recurso o proyectil.

Con eso hay bases «superiores» que vale la pena recoger en blanco, y el escudo se detecta por `type`.

### INV-B-P10 · media
- Dónde: arpg.md §4 R2 y §7.3 («Atributo principal inteligente + Vitalidad»). Código: js/data.js:82, 93 y 104; js/entities.js:920 y 935; js/resources.js:41 y 50
- Problema: Unificar el afijo en «Atributo principal» amplifica una asimetría que ya existe:
- **Guerrero (Fuerza):** solo da daño.
- **Maga (Energía):** da daño, maná máximo y regeneración.
- **Arquera (Destreza):** da daño, +0,15 de crítico por punto y +0,3 de armadura por punto.

El mismo afijo valdría distinto por clase, y el banco ya tropezó con la valoración de atributos (MEMORIA.md:350).
- Arreglo propuesto: 1. Antes de unificar el afijo, normalizar los secundarios: quitar crítico y armadura a la Destreza, o dar un secundario equivalente a cada principal.
2. Medir el valor por punto en cada clase con el banco.

### INV-B-P11 · media
- Dónde: arpg.md §4 R5 (unos 55 aspectos) y §2.1 (gemas de arma como multiplicadores, D4 3.0.1). Código: js/combat-math.js:71 (MAX_MULT_ACTIVE = 3) y :221-247
- Problema: El saco [×] solo cuenta los 3 multiplicadores mayores activos. Si los aspectos o las gemas de arma registran [×], el 4.º se descarta en silencio y el jugador pierde poder sin enterarse. D4 LoH tuvo el mismo problema de escalado y lo resolvió haciendo que los multiplicadores se sumen entre sí.
- Arreglo propuesto: 1. Regla de diseño:
   - los aspectos nunca usan [×]: van por mecánica o al saco aditivo;
   - el [×] queda para el mítico y los nodos clave.
2. Si hay más de 3 [×] activos, mostrarlo en el comparador y en la ficha.
3. Que un test cuente los [×] posibles por especialización con el equipo de máximo nivel.

### INV-B-P12 · media
- Dónde: ux.md §0.6, §1 (fila «Recogida»: «sin etiquetas de nombre en el suelo») y §3.7. Contradice a actual.md §1.7
- Problema: Error de código: las etiquetas en el suelo YA existen.
- `syncWorldLabels` (js/main.js:2088-2103) pinta nombre, glifo de rareza e icono para lo que pasa el filtro, con clic para recoger.
- MEMORIA.md:424 dice que se resolvieron en el Paso 2d.2.
- ux.md se apoya en INFORME_EXPANSION_2026.md:91, que está desactualizado.

La propuesta presupuesta como nuevo algo que solo hay que extender.
- Arreglo propuesto: Rehacer §1 y §3.7. El trabajo es extender lo que hay:
- filtro por regla en vez de solo por rareza;
- Alt para ver todas las etiquetas, incluidas las ocultas;
- tope de etiquetas visibles y apilado anti-solape.

Marcar INFORME_EXPANSION_2026 como fuente no fiable para el estado actual.

### INV-B-P13 · media
- Dónde: ux.md §0.5, §4 (tabla de teclas: Shift = comparar, Espacio = basura, F = favorito) y §5 R2-1. Código: js/bindings.js:18-20
- Problema: Las teclas propuestas ya tienen función en combate:
- Espacio = acción principal.
- Shift = esquiva.
- F = recoger.

En el cooperativo sin pausa hay dos salidas y las dos son malas:
- si el panel captura las teclas, no puedes esquivar con el inventario abierto, que es justo el riesgo de R2-1;
- si no las captura, se disparan las dos acciones a la vez.
- Arreglo propuesto: 1. Shift para comparar solo mientras el cursor está sobre un objeto y sin consumir la esquiva.
2. Basura y favorito en teclas que no se usan en combate (p. ej., X y Z con el cursor sobre un objeto) o en el clic central.
3. Una tabla de prioridad por contexto, comprobada en `bindings.js`.

### INV-B-P14 · media
- Dónde: ux.md §0.3, §3.2 y §4 («la simulación, única fuente del ▲»); actual.md bug 3.2. Código: js/ui.js:2585-2601 y js/entities.js:972-975
- Problema: Hacer de `_previewEquip` la única fuente del ▲ multiplica dos defectos:
- **Recorta vida y recurso:** `recompute` deja `hp` y `mp` en el máximo nuevo y nadie los restaura.
- **Coste:** son 2 `recompute` por objeto, con 40 celdas por repintado.

Además, `recompute` vuelve a montar poderes e índices de ganchos: es un efecto lateral en mitad de la partida, peor en el cooperativo sin pausa.
- Arreglo propuesto: 1. Una función pura `statsWith(player, overrides)` que no toque `hp`, `mp`, `powers`, `gauges` ni estado.
2. Caché por (uid, firma de build), invalidada al equipar o cambiar talentos.
3. Arreglar el bug 3.2 antes del Paso 4.

### INV-B-P15 · baja
- Dónde: arpg.md §5 E8 y §7.3 («los +rangos de habilidad son la palanca más rota», tope +2 y ≤ +1 por pieza en 3 ranuras). Código: js/combat-math.js:465-467; docs/paso2-diseno.md:274
- Problema: Se importa el riesgo de PoE2 sin medirlo en este motor.
- Aquí +1 rango = +10 % lineal de coeficiente: pasar de rango 7 a 9 es ×1,125 en UNA habilidad.
- Un % de daño del mismo presupuesto rinde parecido sobre todas las habilidades.
- Con las restricciones propuestas, el afijo podría quedar en «trampa».
- Arreglo propuesto: 1. Medir con el banco el valor de +1 rango por habilidad y especialización.
2. Tasar el afijo dentro del presupuesto de la ranura.
3. Solo tirarlo para habilidades que conoces (botín inteligente).

### INV-B-P16 · baja
- Dónde: arpg.md §4 R6.1 y §7.6 (Reforjar: «eliges qué afijo cambiar, 2 opciones»)
- Problema: Falta la restricción clave del encantamiento de D4: una vez reforjado un afijo, solo ese se puede volver a tirar en ese objeto. Sin ella, y sin comercio, cada pieza acaba siendo perfecta a base de oro y se pierde la persecución.
- Arreglo propuesto: 1. Un solo afijo reforjable por objeto, marcado con un candado visual.
2. Coste creciente con tope.
3. Nunca puede crear un ★.

### INV-B-P17 · baja
- Dónde: arpg.md §2.4 («Generación clásica» de D2: reparto 3/4/5/6 por ilvl; «la base coincide con el juego original»)
- Problema: La tabla de afijos por ilvl (con 6 afijos al 100 % desde el ilvl 85) es de Project Diablo 2, un mod, y no del juego base. La propia página dice que lista los cambios de PD2 respecto al original.
- Arreglo propuesto: Citarla como PD2, o sustituirla por Arreat Summit. No usarla como precedente de D2.

### INV-B-P18 · baja
- Dónde: arpg.md §2.4 y §3.2 (D2R 3.0 «tooltip con ilvl y rango de tier»); ux.md §2 (D2R pilas de 99, [V]) y §0.1 (Diablo V «vuelve a la rejilla con objetos de varias casillas», [V])
- Problema: Hay fuentes no oficiales usadas como verificadas:
- **diablobytes.com:** sitio de fans, sin respaldo en las notas oficiales de Blizzard. Su propia página de la 3.0 dice que la sintaxis del filtro «la está documentando la comunidad» y no da tamaños de pila.
- **Diablo V:** la pantalla de inventario de la BlizzCon se presentó como «no es el diseño final».
- Arreglo propuesto: 1. Bajar esos datos a [S].
2. No usarlos como argumento decisivo: ni para la barrita o tier en el tooltip, ni para la pregunta 1×1 frente a tamaños.
3. Buscar las notas oficiales en news.blizzard.com.

### INV-B-P19 · baja
- Dónde: arpg.md §2.3 y §3.10 (facciones de Last Epoch, regalar en grupo, Resonancias)
- Problema: Esas reglas vienen de un post de desarrolladores de febrero de 2023, anterior al 1.0, pero se presentan como estado de 2025–2026. La T5 (1-oct-2026) trae «mejoras importantes a las facciones de objetos».
- Arreglo propuesto: Fechar la fuente y revalidar con las notas de la T5 antes de copiar el modelo de regalo.

### INV-B-P20 · baja
- Dónde: arpg.md §4 R1–R3 y §7 (1 prefijo + 1 sufijo de PoE2, 6 categorías de D4, tiers T1–T5, ★ y pips); ux.md §5 R1-3
- Problema: Se mezclan dos taxonomías (prefijo/sufijo y categorías) y dos convenciones de tier opuestas: en PoE el T1 es el mejor y en Last Epoch el T7 es el mejor. Para un dueño que pide poco texto, prefijo/sufijo no aporta nada.
- Arreglo propuesto: 1. Una sola taxonomía: categoría con glifo de color.
2. Pips sin número por defecto. Con Alt, «nivel n de 5», donde más es mejor.
3. Sin prefijo/sufijo.

### INV-B-P21 · baja
- Dónde: arpg.md §5 E1 y §7.1 («≤ 6 líneas, contando templado y sello»); ux.md §4 (el mockup del tooltip tiene 9 líneas). Código: js/items.js:579-583
- Problema: El presupuesto de líneas no define qué cuenta como línea:
- engarces: hasta 3 en arma y pecho;
- gemas, runa y palabra rúnica;
- Calidad y remate;
- base o implícito.

El mockup de ux.md ya pasa de 6.
- Arreglo propuesto: 1. Definir «línea» con precisión.
2. Decidir si las gemas siguen siendo líneas o pasan a un efecto por arma.
3. Que un test cuente las líneas de un objeto con el máximo de capas.

### INV-B-P22 · baja
- Dónde: actual.md §4.7 y §9 (25 charms ≈ +700 de vida o ≈ +170 de atributos); actual.md §0.2 («42 claves») frente a §1.8 («38 claves»)
- Problema: Las cifras no salen del código:
- **Charms al azar:** 25 charms de il40 dan ≈ +255 de vida y ≈ +60 por atributo (1,4 afijos de un pool de 8, escala ×6,85).
- **Charms elegidos:** si te quedas solo con los de vida, ≈ +1450.
- **Claves de `recompute`:** son 37 claves de equipo + 4 atributos = 41.

La conclusión (los charms necesitan tope) se mantiene, pero el número no es reproducible.
- Arreglo propuesto: Recalcular con una fórmula explícita: el escenario al azar y el escenario elegido. Unificar el conteo de claves.

### INV-B-F1 · faltante
- **Banco de botín** (`tests/loot-bench.mjs`): simular N horas por especialización con todas las fuentes (caída, cubo, grietas, jefes, apuesta, tienda) y fijar objetivos con números: legendarios por hora, tiempo hasta el primer aspecto de tu especialización, cada cuánto llega una mejora por ranura, tiempo hasta completar el Códice y hasta el mejor equipo posible. Hoy loot-regression.mjs solo mide caídas por piso.

### INV-B-F2 · faltante
- **Reescribir el banco de equipo:** el plan para `gearProfile`, `itemValue` y `GEAR_KEYS` (tests/helpers/bench-core.mjs) con el nuevo vocabulario, y un «óptimo» que salga del banco de botín y no de poderes fijados a mano (furia, volatil, multidisparo).

### INV-B-F3 · faltante
- **Migración de los objetos actuales:** los 641 del fixture más el alijo sin versión. Precedente: D4 LoH convirtió los objetos viejos en «+100 a todos los atributos» y los marcó Legacy (https://news.blizzard.com/en-us/article/24267729/prepare-for-the-reckoning-lord-of-hatred-draws-near). Decidir entre convertir (mapear los 16 afijos a id y tier según su percentil) o «reliquia antigua» que no se mejora. Añadir un aviso en LOAD_NOTICES.

### INV-B-F4 · faltante
- **Tiradas normalizadas en el guardado:** guardar (id, tier, percentil) y no valores absolutos, más una versión de generador `gv`. Así se puede rebalancear sin migrar y sincronizar el nivel en el cooperativo (arpg M6), recalculando el valor con min(ilvl, nivel de la sesión).

### INV-B-F5 · faltante
- **Requisito de nivel para equipar** (f(ilvl)): con el alijo compartido un héroe de Nv1 lleva il40. Afecta a la progresión, al cooperativo y al ladder.

### INV-B-F6 · faltante
- **Ligado por crafteo:** D4 no deja comerciar los objetos con obra maestra, encantados ni míticos (https://maxroll.gg/d4/resources/multiplayer, 26-jun-2026). Aplicarlo a los regalos en grupo: lo crafteado queda ligado y solo se regala lo que cayó tal cual.

### INV-B-F7 · faltante
- **Botín personal determinista:** RNG por contador con clave (semilla, uidEnemigo, idJugador), y escalado del botín por tamaño de grupo (cantidad por jugador adicional), definido ANTES de calibrar.

### INV-B-F8 · faltante
- **Gemas por grado discreto** (p. ej., 5 grados) en vez de ilvl continuo: apilan (hoy la clave de pila incluye el ilvl, js/materials.js:20) y cierran el bug 3.3 de raíz. Decidir también su papel frente al modelo de D4 3.0.1 (gema de arma = multiplicador por elemento) sin pasar el tope de [×]. Hace falta además una receta de desengarce o un aviso antes de destruirlas.

### INV-B-F9 · faltante
- **Farmeo con objetivo y protección contra la mala suerte:** tablas de únicos por jefe (D4), botín exclusivo de un monstruo concreto (Grim Dawn) y Profecías o Rituales (Last Epoch T5), más un contador de piedad para el mítico del Pináculo. La v1 los menciona como patrón pero no los incorpora.

### INV-B-F10 · faltante
- **Economía de materiales y sumideros con números:** qué da el desguace según la rareza, y el coste de cada capa en materiales, no solo en oro. Hoy el oro sobra: la calidad 5 cuesta lo que dan unos 77 comunes, y en D4 el remate cuesta millones más Obducita.

### INV-B-F11 · faltante
- **Afijos de mecánica de especialización** (`gaugeMax:<id>`, `gaugeGain:<id>`) y `skillLv` en objetos: `addStats` descarta en silencio las claves desconocidas (js/entities.js:782-786). Hace falta un canal propio, p. ej. agregar el equipo como `talentExtra` o el vocabulario `fx` de los talentos.

### INV-B-F12 · faltante
- **Hallazgo mágico y oro como afijo:** decidir explícitamente si salen del pool, como en D4 T4, y pasan a Tormento, pactos o el collar de la mascota.

### INV-B-F13 · faltante
- **MVP de aspectos:** unos 55 aspectos (9 especializaciones × 4–6 + 10 genéricos) es una escala parecida a la de los talentos del Paso 2, cada uno con definePower, VFX, test y cobertura en el banco. Empezar con 2 por especialización + 6 genéricos y crecer según el banco.

### INV-B-F14 · faltante
- **Temporadas y ladder:** qué pasa con los objetos al terminar la temporada (pasan al reino eterno, como en D2R) y si habrá objetos o palabras rúnicas solo de temporada.

### INV-B-F15 · faltante
- **Identificación:** recomendación de experto: revelación animada al recoger, sin el clic gratuito que hoy no aporta ninguna decisión. Es mejor que mantener la fricción o quitarla sin más.

### INV-B-F16 · faltante
- **Copiar objeto con Ctrl+C solo para exportar** (texto o código para el chat). Nunca se importa como objeto: sería una vía de falsificación en el cooperativo y en el ladder.

### R1-A-P13 · media
- Dónde: §4.2 (sincronización de contenido) y §8 (fila «Sincronización»)
- Problema: La sincronización solo topa el NO. Los aspectos al rango 5, la ★, el ◇ y los Míticos siguen enteros, y al final del juego son lo que más pesa: un Nv100 sincronizado sigue rompiendo una zona baja en el cooperativo.
- Arreglo propuesto: En sincronización: ◇ desactivado, ★ → paso 5, rango del aspecto ≤ f(nivel de la zona) (p. ej. 1 + ⌊AL/12⌋) y el Mítico rinde como Único. Así lo indica el tooltip con el «⇣».

### R1-A-P14 · media
- Dónde: §10 (reglas IT1 e IT2) y §12 E4
- Problema: El perfil «desnudo» escala con el mismo NO, así que la cuota de IT1 no ve el ×1,55 de subir `ILVL_MAX` a 47. IT2 es G^7 por construcción, una tautología. E4 puede quedar «en banda» con el Nv70 bastante más fuerte que la línea calibrada hoy (TTD contra manada de 6–10 s), y E4b hereda un desajuste grande.
- Arreglo propuesto: Nueva regla IT0 en E4: TTD contra manada y jefe en Nv20, 50, 70 y 100 (T0 y T10) dentro de ±15 % de la línea base actual. Si el cambio es deliberado, que se documente como movimiento de la curva enemiga. IT1 queda como regla de reparto, no de poder absoluto.

### R1-A-P15 · media
- Dónde: §6 (Daño: «Σ coef × impactos»)
- Problema: No se define el escenario: ¿cuántos objetivos? Los aspectos y líneas de conteo (brasas, saltos, flechas, trampas) valen casi 0 contra un jefe y mucho contra una manada. Sin escenario, el veredicto y la regla F10 dan números arbitrarios.
- Arreglo propuesto: Daño = media ponderada de «jefe» (1 objetivo) y «manada de 5», con pesos por defecto 40/60. Con Alt se ven los dos números. La tabla de valor por aspecto del banco usa los mismos escenarios.

### R1-A-P16 · media
- Dónde: §4.1 (pool del arma: «Principal… +1 a tu Principal (gastadora)»), §4.4, §4.5 (Amatista: Principal)
- Problema: Hay dos «Principal» en la misma pieza. La categoría de habilidad gastadora se llama «Principal» (`skill-defs.js:35-38`, decisión G15 del dueño), y la línea de atributo también. El arma ofrece las dos, y la Herrería y la ventana de gemas dirán «Amatista: Principal». Va contra el «poco texto» y la legibilidad.
- Arreglo propuesto: La línea de atributo se muestra siempre resuelta (Fuerza, Destreza o Energía), y en las ventanas genéricas (Herrería, gemas, filtro) se llama «Atributo». La línea de rango lleva el icono de la categoría: «+1 [icono] Principal».

### R1-A-P17 · media
- Dónde: §4.4 («% Vel. de ataque» en 4 pools) y §5 («cadencia del básico»)
- Problema: La velocidad de ataque solo acelera el básico y su carga (`game-skills.js:1594, 2160`). Las habilidades tienen un GCD fijo de 0,2 s (`:785, 855`) y su velocidad es `skillSpeedPct`. En especializaciones de gastadora o de carga (Piromante, Crionte, Francotiradora…) la línea queda media muerta, y está en el arma, los guantes y los 2 anillos.
- Arreglo propuesto: Que la velocidad de ataque acelere también el windup y el canal de todas las habilidades, como en D4. Si no, renombrarla «Vel. del básico» y que la valoración lo diga. Cubrirla en IT6 (paridad).

### R1-A-P18 · media
- Dónde: §7.1 (Materiales: héroe, pilas de 99, incluye Esencia y Polvo), §12 W3 (Polvo en la cuenta), §13 X2 («contadores»)
- Problema: Hay tres definiciones distintas para la Esencia y el Polvo: ¿son objetos en pila del héroe o contadores de cuenta? Además, con costes de 8–40 de Esencia por rango y ingresos de miles, una pila de 99 se llena enseguida.
- Arreglo propuesto: Esencia y Polvo como contadores sin tope (como el oro). Polvo de cuenta, igual que el Códice. Decidir de forma explícita si la Esencia es del héroe o de la cuenta (recomiendo la cuenta, por la regla 3). Las pilas de 99 quedan solo para gemas, glifos y llaves.

### R1-A-P19 · media
- Dónde: Todo el diseño (no aparece): cambio de especialización con 10 piezas
- Problema: No hay conjuntos de equipo. Con 3 especializaciones por clase, talentos con presets y aspectos atados a una especialización, cambiar de especialización obliga a recambiar hasta 10 piezas a mano desde la mochila y el alijo.
- Arreglo propuesto: Armería: presets de equipo (referencias por `uid`) ligados a los presets de talentos y a la barra. Se cambian gratis en el pueblo o fuera de combate. Avisar si una pieza del preset ya no está.

### R1-A-P20 · baja
- Dónde: §9.1 («unos 120 bytes por objeto»)
- Problema: El ejemplo del propio documento ocupa ~230 caracteres, no ~120. Sigue cabiendo (400 objetos ≈ 92 K caracteres), pero la cifra es la mitad de la real y `o: {realm, run}` se repite en cada objeto.
- Arreglo propuesto: Corregir la cifra y codificar el origen como un entero o una cadena corta (p. ej. `o: 0` = local). Medir en test94 el tamaño medio con el fixture de 641 piezas.

### R1-A-P21 · baja
- Dónde: P4-D12 («D4 lo sacó en la T4»)
- Problema: La justificación no tiene fuente y es inexacta: en D4 el hallazgo mágico no era un afijo de equipo (era un afijo de sigilo de Pesadilla). El precedente que sí existe es D3 Loot 2.0.
- Arreglo propuesto: Citar D3 Loot 2.0: se quitó el hallazgo mágico al azar de los objetos y su efecto sobre los legendarios bajó al 10 %. La decisión se mantiene.

### R1-A-P22 · baja
- Dónde: §4.12 (solo se escala la Era) frente a las bendiciones y el tablero
- Problema: Las bendiciones y el tablero siguen con valores planos sin escalar: `b_hp` 150, `b_arm` 75 y `b_lph` 12 en L10 (`data.js:583-597`); tablero +60 de vida y +30 de armadura (`paragon-board.js:24-49`). Frente a líneas de 163–223 de vida en NO 47–52, quedan irrelevantes.
- Arreglo propuesto: Escalar los valores planos de bendiciones y tablero con G(AL), igual que la Era, y revisarlos en IT1.

### R1-A-P23 · baja
- Dónde: §4.9 (re-tirada `hash(seed,'reroll',n)`) y §4.10 (apuesta `hash(cuenta,'apuesta',n)`)
- Problema: Con semillas deterministas se puede «mirar y elegir». La re-tirada no incluye la línea en el hash: tiras una línea, ves las 2 opciones, recargas y re-tiras otra con ese conocimiento. En la apuesta, la rareza de la tirada n no depende de la ranura: ves que la siguiente es Única, recargas y eliges tu mejor ranura.
- Arreglo propuesto: Incluir la línea y la ranura en el hash, y guardar justo después de la acción.

### R1-A-P24 · baja
- Dónde: §15 (verificación del mockup «a 1440 y 400 px») y `preview/captura-2-movil-aspectos.png`
- Problema: Se verificó y capturó a 400 px, el ancho de un celular, aunque el juego es solo para PC (regla del dueño y CLAUDE.md). El esfuerzo no sirve y la captura confunde.
- Arreglo propuesto: Verificar a 1366 y 1920 px, como pide E3, y quitar la captura «móvil» del paquete para el dueño.

### R1-A-P25 · baja
- Dónde: §1 O1 y §4.11 («1 legendario cada ~140 comunes»)
- Problema: «Comunes» se lee como objetos comunes, no como monstruos comunes.
- Arreglo propuesto: Escribir «cada ~140 monstruos comunes».

### R1-A-P26 · baja
- Dónde: §12 E2 y §12.1 (~1 día para el contenido)
- Problema: El plan es optimista: 47 aspectos, 10 Únicos y 9 Míticos con poderes, textos al rango y pruebas con `makeHarness` en ~1 día de E2. Además, los Míticos «definen la build» y necesitan su propio balance.
- Arreglo propuesto: Sacar los Míticos a una ola posterior ya desde el plan, no solo como mitigación del riesgo R7, y dar a E2 unos 2 días con un juicio intermedio.

### R1-A-F1 · faltante
- Probabilidad de cada paso (1–5) de una línea según el NO y el Tormento, y con qué paso salen las 2 opciones de la re-tirada.

### R1-A-F2 · faltante
- Rango con el que cae un aspecto (1–5) según el Tormento, y cuánto se tarda en completar el Códice de una especialización al rango 5 (medido en loot-bench).

### R1-A-F3 · faltante
- Qué pasa con el reparto de atributos (5 puntos por nivel hasta el 20, `progression.js:17`) cuando el equipo da «Principal» adaptable. ¿Se mantienen los 4 atributos? Además, la Vitalidad no convierte igual en las 3 clases (`hpPerVit` 4 / 3 / 3,5), así que el «×4» de la migración solo es exacto en el Guerrero.

### R1-A-F4 · faltante
- Sesgo de las bases de clase (armas y manos izquierdas). Hoy es del 100 % para tu clase (`items.js:188-192`), pero el alijo enseña emblemas de otros héroes. Hay que fijar el porcentaje para otras clases.

### R1-A-F5 · faltante
- Cifras de partida que faltan: tamaño del montón de Esencia, Polvo por carta del cofre (el mockup usa 5), precio de las pestañas del alijo, coste de la apuesta por ranura e ingresos de oro por grieta.

### R1-A-F6 · faltante
- Tabla de jefes de zona → aspecto que desbloquean.

### R1-A-F7 · faltante
- Regla de desguace de lo regalado: ¿da Polvo y entra en el Códice? Si sí, un grupo puede llenar el Códice de otro jugador. Recomiendo que solo dé Esencia.

### R1-A-F8 · faltante
- Presupuesto de poder de los Únicos y los Míticos: el documento limita los aspectos pero no los poderes propios.

### R1-A-F9 · faltante
- Peso del ⚡ por rol: el Guardián valora el Aguante más que el Daño. Con la media geométrica fija, los tanques ven ↔ en sus mejoras reales.

### R1-A-F10 · faltante
- Reglas nuevas del banco: IT0 (TTD absoluto contra la línea base) e IT6 (paridad de líneas por especialización), más F10 por aspecto en dos escenarios (jefe y manada).

### R1-A-F11 · faltante
- Armería: presets de equipo ligados a los presets de talentos.

### R1-A-F12 · faltante
- Un máximo de ★ por pieza y la interacción entre el rango que trae el Tormento y el remate.

### R1-B-P7 · media
- Dónde: §4.4 (escalas), P4-D4 («+1 rango ≈ +1 ilvl»), §4.9 (Mejorar)
- Problema: La mejora solo «sube el número» de verdad en los planos. Con pctScale = 0,4+0,6·NO/52, +1 NO da +1,3 % en una línea de %, +1,9 % en el Principal y +6,5 % en los planos y el arma. Mejorar de r0 a r5 a NO 47 sube +37 % los planos y solo +6,1 % las líneas de %. De il40 a il47 da +55 % frente a +9 %. Los anillos y el amuleto (casi todo %) apenas mejoran con la Herrería: unos 0,2–0,4 % de DPS por los mismos 120 de Esencia y 12 600 de oro. Eso queda muy por debajo del 10–15 % que Hazzikostas da como umbral para que se sienta, y rompe la regla de inversión en la joyería.
- Arreglo propuesto: Que el rango multiplique igual a todas las líneas y al implícito: valor = base × escala_tipo(ilvl) × 1,065^rango (el ◆ sigue siendo ilvl + rango). Alternativa: escalas con la misma pendiente logarítmica en la banda NO 40–52, p. ej. % = máx(0,4; 1,03^(NO−52)), dejando los valores a NO 52 como están para no tocar la tabla de topes. Si no se cambia, el coste de mejorar debe ir en proporción al valor de la ranura.

### R1-B-P8 · media
- Dónde: §4.6 (tabla «Categoría → ranuras» y los 36 ejemplos)
- Problema: Muchas ranuras se quedan sin aspectos. Las categorías copian las de D4 pero sin su categoría «Utilidad» (casco, pecho, botas, guantes y amuleto), y el catálogo por especialización casi no tiene defensivos ni de movilidad. Berserker, Cruzado, Piromante, Crionte y Tiradora tienen 0 aspectos defensivos de especialización. Para ellos, casco, pecho y cinturón solo admiten el defensivo de su clase (1) y un universal; el segundo igual sale «duplicado». Las botas, en 7 de 9 especializaciones, solo admiten «del Viento». En la práctica, 3–4 ranuras quedan «raro para siempre», y «el legendario es lo normal en el final del juego» (§4.3) no se cumple. Por el otro lado, anillos y amuleto se los disputan ofensivos y de mecánica.
- Arreglo propuesto: Añadir una matriz de cobertura aspecto × ranura × especialización con la regla «≥ 1 aspecto útil por categoría y especialización», comprobada en test-aspects-<clase>. Crear la categoría Utilidad (casco, pecho, guantes, botas, amuleto) como en D4, o abrir Mecánica a casco y pecho. Subir a 2 los defensivos de clase.

### R1-B-P9 · media
- Dónde: §4.6 regla 4 frente a la tabla de 36 ejemplos; «Rango 1–5: core no cambia y scale interpola»
- Problema: Varios ejemplos se saltan su propio presupuesto (≤ +15–25 % de la habilidad al rango 5). Racimo Voraz pasa las brasas de 3×40 % = 120 % a 5×55 % = 275 %: unos +70 % a la Bola de Fuego en área (coef 2,2 y explosión, skills-maga.js:37-38, 732). Cadena Larga da +67 % de saltos, Sol Errante +50 % de estallidos y Tercera Andanada +50 %. Además, casi todo el valor está en el `core` (cuentas fijas), así que el aspecto a r1 comprado con Polvo ya da casi todo el efecto. La persecución del rango que §4.10 da por viva («los rangos altos siguen saliendo del botín») se queda vacía, y el «r1 ≈ 70 %» de la tabla es falso.
- Arreglo propuesto: Anotar en cada ejemplo el Δ estimado sobre la habilidad y normalizar: p. ej., Racimo con 4 brasas al 45 %, Cadena con 4 saltos, Sol Errante con 5. Regla de forma: `core` ≤ 40 % del valor del aspecto. Las cuentas discretas se abren por umbral (+1 en r1, +2 en r4), y el resto escala con el número. Que F10 y test-aspects midan el Δ con el arnés.

### R1-B-P10 · media
- Dónde: §6 (Daño = Σ coef × impactos ÷ máx(enfriamiento, GCD); Aguante = vida / mitigación)
- Problema: El modelo único no ve 5 de las 17 líneas. El Daño no tiene en cuenta el recurso, así que % Coste y % Recurso valen 0 y se sobrevalora a las gastadoras limitadas por recurso. El Aguante no incluye el sustento (vida al golpear), la esquiva ni la velocidad de movimiento. Como «Mejor para mí», el filtro «solo ▲», el ▲ de la celda y el banco salen de este modelo, esas líneas nunca darán ▲ y el jugador aprenderá a ignorarlas: líneas muertas de hecho, aunque O5 diga que no hay. El «?» solo cubre los aspectos con power/tv. El mockup lo tapa con pesos inventados (lph/600, 0,2·(coste+recurso)).
- Arreglo propuesto: Daño: lanzamientos por segundo = mín(1/enfriamiento, 1/GCD, (generación + regeneración)/coste) por habilidad de la barra. Aguante: (vida + sustento por segundo × ventana de 5 s, con la cubeta topada) / mitigación, y la esquiva como reducción esperada por su tiempo activo. Las líneas de movilidad, con «?» o con un peso fijo declarado. IT4 debe incluir pares que solo difieran en esas líneas.

### R1-B-P11 · media
- Dónde: §4.2 (sincronización de contenido), §8 (fila Sincronización)
- Problema: La sincronización solo topa el NO. El ◇, el ★ (×1,5), el rango del aspecto (hasta +15–25 % de una habilidad), los +rango y el poder del Mítico siguen enteros. Un Nv100 sincronizado en una zona baja del cooperativo sigue trivializándola, justo lo que M6 quería evitar. FFXIV, que el documento cita, también desactiva la materia (el engarce) durante la sincronización.
- Arreglo propuesto: En la sincronización por zona: ★ → paso 5; ◇ inactivo o con su grado topado a f(zona); rango de aspecto ≤ 1–3 según el nivel de la zona; +rango desactivado; poder mítico activo pero con sus líneas al NO de la zona. Que lo pruebe un test de sincronización.

### R1-B-P12 · media
- Dónde: §7.1, §8 (Confianza: escalera en un reino aparte), §9.2 punto 4 (`intentorpg_account` v1)
- Problema: El almacén de cuenta (Códice, marcas de agua, Polvo, fichas, alijo) no tiene clave de reino. «Ningún objeto local entra nunca en la escalera», pero si el Códice y la marca de agua son de la cuenta, lo hecho en local (o trucado en localStorage) entra en la escalera por el grabado (aspecto a r5 en cualquier raro) y por el ⅓ de la marca. El modelo D2 Open/Closed separa el personaje entero, y D4 reinicia el Códice en cada reino de temporada.
- Arreglo propuesto: `intentorpg_account` con particiones por reino: { local: {...}, ladder:<temporada>: {...} }. Códice, marcas, Polvo, Esencia, gemas y fichas por reino, y la escalera empieza vacía. El formato v1 ya debe nacer con esa clave, aunque solo exista «local».

### R1-B-P13 · media
- Dónde: §4.7 (Míticos: «3 Fragmentos de Pináculo + 1 Único de esa especialización») frente al catálogo de Únicos («2 por clase»)
- Problema: La receta determinista del Mítico pide un Único de la especialización, pero solo hay 2 Únicos por clase para 3 especializaciones (Égida para Guardián/Cruzado, Corona del Fénix para Piromante, Cuerda de la Garza para Francotiradora). Al menos 3 especializaciones no pueden fabricar su Mítico. Tampoco se dice si el Mítico se puede mejorar ni si admite ★ (con sus líneas «al paso 5», un legendario con remate ★ lo supera en esa línea), ni cuántos se pueden llevar a la vez.
- Arreglo propuesto: Catálogo de ≥ 1 Único por especialización (9 + 4 reliquias = 13) o receta «1 Único de tu clase». Regla del Mítico: se mejora como cualquier pieza, su línea libre puede llevar el remate ★ y solo 1 Mítico equipado (como el límite de D4 S14 a los fabricados).

### R1-B-P14 · media
- Dónde: §4.2 («Tormento: el botín cae con rango ⌊T/2⌋»), §4.8 («★ = remate o drop de Tormento alto»), §4.9 (re-tirada)
- Problema: Faltan reglas que mueven el ritmo. (a) En T10 todo cae a r5: el «Mejorar» de la Herrería y la marca de agua quedan muertos en el contenido final, y no se dice si esas piezas traen el remate ★ ni con qué probabilidad cae ★ en el Tormento alto, ni si puede haber varias por pieza. (b) La re-tirada no dice si las 2 opciones vuelven a tirar el paso. Con el precio topado en n = 6 (≈ 17 000 de oro), la re-tirada es ilimitada a precio fijo, y si tira el paso llevas toda línea al paso 5 por oro: la objeción I10 sigue abierta. (c) No hay distribución del rango 1–5 de los aspectos que caen, y de ella depende toda la persecución del Códice.
- Arreglo propuesto: (a) Rango de drop ⌊T/3⌋ (T10 = r3), o el botín de Tormento con r5 y el remate pendiente de hacer en la Herrería; probabilidad de ★ por T en una tabla. (b) La re-tirada cambia el stat y conserva el paso (o pone suelo en el paso viejo −1); tope de 10 re-tiradas por pieza o precio que siga creciendo. (c) Tabla de rangos de drop, p. ej. r1 40 / r2 30 / r3 18 / r4 9 / r5 3 %, desplazada por el Tormento, medida en el loot-bench.

### R1-B-P15 · media
- Dónde: §4.4 (`elemPct` → `spec.elem`), O5
- Problema: «% Daño de tu elemento» no es simétrico y está muerto antes del Nv10. Berserker, Guardián, Tiradora y Francotiradora tienen el elemento 'physical' (talents-guerrero.js:120 y 186; talents-arquera.js:115 y 186): para ellas, la línea cubre casi todo el kit, básico incluido, con una base de 16 frente a 12 de % Daño, así que es estrictamente mejor. En Piromante, Crionte o Arcanista solo cubre las habilidades de su elemento. Sin especialización (Nv < 10, TALENT_RULES.specAt = 10), la línea no hace nada: es una línea muerta en la nivelación y en los alts del alijo.
- Arreglo propuesto: Resolverla como «% Daño de tu especialización» (kit @spec + habilidades del elemento de la especialización), con una base calibrada por la cobertura medida. Antes del Nv10 o sin especialización, que cuente como % Daño. Comprobar la paridad con IT6.

### R1-B-P16 · media
- Dónde: §4.4 (línea «+1 a tu <categoría>», selector `@spec`), §4.1 («+1 a tu Principal (gastadora)»), mockup línea 457
- Problema: (a) Contrato roto: en talents.js:466, `@spec` se expande a TODO el kit de la especialización (3–5 habilidades), no a la categoría Insignia. La categoría es `@insignia` (CAT_ALIAS, talents.js:445-446). «+1 a tu Insignia» con `@spec` daría +1 a todo el kit. (b) Choque de nombres: en el juego, CAT_LABELS.spender = 'Principal' (skill-defs.js:36-38), y el documento llama «Principal» también al atributo. El mockup pinta «+1 a tu Principal» al lado de la línea de atributo. Con poco texto, la ambigüedad confunde.
- Arreglo propuesto: Usar `@insignia` (y `@spender`, `@ultimate`, `@movement`). En el diseño, la Herrería, el filtro y Alt, llamar «Atributo» a la línea de atributo (el tooltip ya lo muestra resuelto: «+16 Fuerza») y dejar «Principal» solo para la categoría de habilidad.

### R1-B-P17 · media
- Dónde: §4.6 (Sed Insaciable `gaugeMax:sed`, Cargas Vivas `gaugeMax:cargas`, Viento a Favor `gaugeGain:impulso`) y la anatomía de defineAspect (agregado con `stats`)
- Problema: Si las claves de indicador van en `stats` del agregado de aspectos, recompute las descarta en silencio: addStats solo suma claves que existen en `a` o en `item` (entities.js:783-786), y gaugeStat() solo lee p.powerStats y los buffs (spec-mechanics.js:196-200). Todos los usos actuales van por el `stats()` de un poder (powers-maga.js:2689, powers-arquera.js:1775). Además, «+20 % de Sed máxima» no encaja: gaugeMax es un valor absoluto.
- Arreglo propuesto: Contrato en §4.6: las claves `gaugeMax:/gaugeGain:/gaugeLoss:` de un aspecto van siempre por un `definePower` con `stats(p)` (prefijo `x<g|m|a>_`) y con valor absoluto. Que test-aspects compruebe que gaugeMax cambia de verdad con el aspecto puesto.

### R1-B-P18 · baja
- Dónde: P4-D1 («el peso de las 2 ranuras retiradas se reparte en el techo, B × 1,23»), §4.4, mockup LINES
- Problema: El ×1,23 no está aplicado en ningún sitio: las bases de §4.4 y del mockup (hp b = 9 → 223 a NO 52) son sin él. Si E4 lo aplica, la tabla de topes falla: crítico 36,8 (> 35), enfriamiento 36,2 (> 30), movimiento 26,8 (> 25). El mockup multiplica también la armadura implícita por GEAR_K, y §4.1 dice «Armadura ×1».
- Arreglo propuesto: Decidir si las bases ya incluyen el reparto. Si no, quitar la frase de P4-D1 o recalcular la tabla de topes con ×1,23. Alinear la armadura implícita entre el documento y el mockup.

### R1-B-P19 · baja
- Dónde: §4.1 («Los pesos de la armadura son los de WoW verificados (1,00 / 0,75 / 0,5625)»)
- Problema: La página citada da esos SlotMod para el VALOR de armadura de cada ranura, está marcada como desactualizada y «accuracy disputed», y no da pesos de stats para el cuello, los anillos ni las armas. Aplicarlos al presupuesto de líneas es una extrapolación, no un dato verificado. En la teoría clásica de WoW, el cuello va con los anillos (0,5625), no con los abalorios (0,70).
- Arreglo propuesto: Marcarlo como [S]/propuesta, y que los pesos salgan del modelo de coste (problema del techo sin unidad), no de WoW.

### R1-B-P20 · baja
- Dónde: §4.2 (NO efectivo en solitario: mín(ilvl, ilvlDeTuNivel + 2) + rango)
- Problema: Como el rango «cuenta siempre», un alt del alijo lleva NO +7 sobre lo que le cae (G^7 = ×1,55 en el arma y los planos) en todos los niveles: la nivelación de los alts se vuelve trivial y el botín de nivelación muere. Es el riesgo de «twink» que la marca de agua ya resuelve de otra forma.
- Arreglo propuesto: NO efectivo en solitario = mín(ilvl + rango, NOdeTuNivel + 3), o que el rango solo cuente a partir del Nv70. El ⅓ de la marca de agua ya hace barato volver a mejorar.

### R1-B-P21 · baja
- Dónde: §9.1 («Unos 120 bytes por objeto»), M9
- Problema: El ejemplo del propio documento, serializado en JSON, ocupa 224 bytes, no 120. Las cuentas siguen cabiendo (400 objetos ≈ 90 KB), pero el número es falso y el formato no lleva versión de catálogo: para repetir una carrera de escalera con el catálogo de su época, la reproducción necesita saber contra qué tablas se generó.
- Arreglo propuesto: Corregir a ~220–250 B (o empaquetar en arrays posicionales si importa). Añadir `cv` (versión de catálogo) y `sv` al objeto compacto.

### R1-B-P22 · baja
- Dónde: §4.2 (marca de agua por ranura), §6 (anillos)
- Problema: No se define la marca de agua de las ranuras dobles (anillo ×2): ¿una sola marca «anillo», o una por ranura? En WoW, el descuento lo fija el héroe con el ilvl más alto «in that gear slot», y las ranuras dobles necesitan su propia regla.
- Arreglo propuesto: Una marca «anillo» igual al NO más bajo de los dos mejores anillos alcanzados (para que un solo anillo alto no abarate los dos), y documentarlo.

### R1-B-P23 · baja
- Dónde: Todo el documento («NO», «◆ NO», filtro «NO ≥ el mío − 5»)
- Problema: En español, «NO» se lee como la negación. En los chips, el filtro y Alt («NO ≥ el mío − 5», «sin NO») se presta a confusión, y el dueño pide poco texto y que se entienda de un vistazo.
- Arreglo propuesto: En la UI, solo el glifo ◆ con el número; en Alt, «Nivel 45». En el documento y el código se puede seguir usando `no`/«NdO».

### R1-B-F1 · faltante
- Modelo de coste por stat (unidad de presupuesto) derivado del ⚡ marginal por clase en Nv50 y Nv70, más la regla IT6 del banco: una línea al paso 3 en ±20 % de la mediana de su categoría en las 3 clases. Sin esto, el «techo» y la elección de gema no tienen sentido.

### R1-B-F2 · faltante
- Desacoplar el Principal del equipo de los efectos secundarios de los atributos (Destreza → crítico y armadura, Energía → maná y regeneración) o retirarlos, como WoW en WoD, y rehacer la tabla de topes por clase con la build típica completa (base + atributos + talentos + tablero + equipo).

### R1-B-F3 · faltante
- §4.13 Economía: fuentes y sumideros por hora (oro, Esencia, Polvo, gemas por grado), precio de la apuesta, Polvo del cofre, tamaño de los montones de Esencia, y objetivos en horas: build funcional, aspectos de la barra a r5, techo con ★ y Mítico. Que el loot-bench mida también oro y Polvo.

### R1-B-F4 · faltante
- Distribución del rango de los aspectos al caer (por Tormento) y probabilidad de ★ en los drops, con el efecto de ⌊T/2⌋ sobre Mejorar y el remate.

### R1-B-F5 · faltante
- Matriz de cobertura aspecto × ranura × especialización, con la categoría Utilidad al estilo de D4 y la regla «≥ 1 aspecto útil por categoría y especialización».

### R1-B-F6 · faltante
- Δ estimado de cada aspecto de ejemplo frente a la regla 4, y la regla de forma core ≤ 40 % del valor, con cuentas discretas que se abren por rango.

### R1-B-F7 · faltante
- Algunos aspectos solo de botín (no grabables) o ligados a Únicos, para que los legendarios sigan interesando cuando el Códice esté completo; D4 los mantiene.

### R1-B-F8 · faltante
- Particionar el almacén de cuenta por reino (local / escalera / temporada) desde la v1 del formato.

### R1-B-F9 · faltante
- Regla completa de sincronización: ★, ◇, rango de aspecto, +rango y poder mítico, no solo el NO.

### R1-B-F10 · faltante
- Un número visible de progreso del equipo (◆ medio del equipo, como el ilvl medio de WoW) separado del ⚡, y un ⚡ con referencia fija que crezca con el nivel y los talentos.

### R1-B-F11 · faltante
- Valoración con recurso, sustento y esquiva en el modelo único, y pares de prueba en IT4 que solo difieran en esas líneas.

### R1-B-F12 · faltante
- Reglas del Mítico: mejora, ★ en su línea libre, límite de 1 equipado y receta que exista para las 9 especializaciones (≥ 1 Único por especialización).

### R1-B-F13 · faltante
- Contrato de las claves de indicador de los aspectos (gaugeMax/gaugeGain/gaugeLoss solo por definePower con stats()) y del selector @insignia.

### R1-B-F14 · faltante
- Rendimientos decrecientes suaves (sin penalización hasta ~30–40 %, peldaños después) como red de seguridad frente a los topes duros que dejan líneas muertas.

### R1-B-F15 · faltante
- Versión de catálogo (`cv`) en el formato compacto, para reproducir carreras de escalera y migraciones futuras.

### R1-B-F16 · faltante
- Estimación del Aguante (vida efectiva) en el «Impacto esperado» de §10 y de su cuota frente a O6; con las bases actuales, el equipo típico ya da ≈ 60 %.

### R2-A-P11 · media
- Dónde: §4.5 «◇ engarce», §4.8 (soportes «materiales en pila»), §7.5
- Problema: Choque de nombres: «engarce» ya es, en el libro de habilidades, el hueco de SOPORTE de cada habilidad (`ui-skills.js`: «Engarces», «Engarce 1», «En combate no puedes cambiar engarces»). El diseño cuidó «Herrería» frente a «forja» (R11), pero no este caso. Además, §4.8 trata los soportes como «materiales en pila», cuando son desbloqueos: `knownSupports`, y al recoger uno repetido no sirve para nada.
- Arreglo propuesto: - Renombra uno de los dos: el del objeto como «Engaste» o «Hueco de gema», o el de la habilidad como «Ranura de soporte».
- Define el soporte repetido: se convierte en 3 de Esencia o 2 de Polvo al recogerlo.
- Saca los soportes de «materiales» en §4.8 y §7.1.

### R2-A-P12 · media
- Dónde: §4.3 glifos de rareza, §6 veredicto, §7.2 celda, mockup
- Problema: Hay glifos con dos o tres significados en la misma celda o el mismo tooltip, justo con un dueño que quiere leer por la forma:
- ▲ = rareza Rara (§4.3) y ▲ = «mejora a tu héroe» (§6 y §7.2: el ▲ verde de la esquina).
- ★ = afijo mayor (§4.4) y ★ = favorito (§7.2; en el mockup, `st fav` ★).
- ✦ = Legendario, el Polvo (mockup: «Polvo ✦ ≈ 165/h»), la variante potenciada del libro (§4.6 regla 3) y la categoría «✦ Habilidad».
En total hay más de 20 símbolos que aprender.
- Arreglo propuesto: Un glifo por significado y una tabla canónica en `item-defs.js` con prueba de unicidad (`test101` falla si se repite un glifo). Por ejemplo:
- Favorito = candado o corazón.
- Raro = rombo hueco, y deja ▲ solo para el veredicto.
- Polvo con su icono `mat_*` en vez de ✦.
- La variante potenciada, con el icono del aspecto.
Recorta la leyenda a las 3 superposiciones de la celda y a lo que sale en Alt.

### R2-A-P13 · media
- Dónde: §4.13 economía y metas en horas
- Problema: Las cuentas de la economía no cuadran entre sí:
(a) **Chispas:** el jefe de grieta en T8+ da 5 % × 8,5 grietas/h = 0,43/h, más que el Pináculo (0,29/h). En T8+ el Mítico sale en ≈ 5,6 h, no en ≈ 13 h; la tabla usa T0 para el botín y T8+ para las fuentes.
(b) **Gemas:** caen ≈ 68/h, de grado 3–4 desde AL40 y de 4–5 en T6+. Las 10 gemas Perfectas salen en ≈ 2 h, pero el diseño las pone en el «techo de 40–60 h».
(c) **Esencia:** ≈ 1 300/h cubren todas las mejoras (≈ 1 000) en menos de 1 h.
(d) La «build completa» cuenta «6 aspectos de tu barra», pero una build usa 10 (uno por ranura).
(e) En T10 el botín cae con rango 5 (⌊T/2⌋): la marca de agua y el sumidero de Esencia desaparecen en el final del juego, y no está dicho si ese r5 trae el remate ★.
(f) Alijo: «2 + hasta 8» pestañas en §7.1 frente a «8 × 50» en §9.1.
- Arreglo propuesto: - Tabla de economía en T0, T4 y T8+.
- Metas con los 10 aspectos.
- Botín de Tormento con rango ≤ 2 (o sin remate), y que el rango pre-hecho no mueva la marca de agua.
- Gemas: o se quitan del techo, o se sube el combinar a 3 → 1 con coste en Esencia por grado.
- IT7 en T0 y en T8.
- Una sola cifra de pestañas.

### R2-A-P14 · media
- Dónde: §4.9 «Re-tirar una línea», tabla «Techo de una pieza en u»
- Problema: No queda claro si la re-tirada puede ofrecer la MISMA línea con otro paso. Si las 2 opciones excluyen la línea actual (como el encantamiento de D4), el paso «+ re-tirada a paso 5» del techo es imposible para la línea que quieres conservar (por ejemplo, crítico al paso 3), y el único camino al paso 5 es el botín. Si no la excluyen, el pool de 5 líneas con 2 ya fijas deja 2–3 candidatas y hay que decir qué pasa.
- Arreglo propuesto: Separa dos acciones:
- **Re-tirar** (otra línea del pool, como hoy).
- **Pulir** (misma línea, nuevo paso de 1 a 5, por Esencia, con semilla y coste creciente; nunca toca la ★).
Si no quieres otra acción, deja que una de las 2 opciones sea siempre la misma línea con un paso nuevo.

### R2-A-P15 · media
- Dónde: §6 regla del veredicto (↔ con pérdida > 3 % en un eje), §0 ejemplo
- Problema: El umbral absoluto del 3 % convierte en ↔ muchas mejoras claras. El ejemplo del propio §0 (Δ⚡ +14,8 %, Daño +31,5 %, Aguante −6,3 %) sale ↔ en un DPS. Como la celda solo enseña ▲, el jugador no ve como mejora un arma un 15 % mejor. Es ruido y contradice «una sola verdad de mejor» (O7).
- Arreglo propuesto: ↔ solo si la pérdida en un eje es mayor que ⅓ de g, o si el eje que baja es el principal del rol (Aguante para el tanque, Apoyo para el apoyo). Así se mantiene «▲ ⇒ Δ⚡ ≥ T» y el ↔ queda para los casos de verdad dudosos. Añade el ejemplo de §0 a la tabla de casos límite de `test95`.

### R2-A-P16 · media
- Dónde: §4.7 Míticos (1 por especialización)
- Problema: Un Mítico por especialización, con un poder «que define la build», es un BiS forzado: todos los Piromantes del final del juego llevan el mismo. Es la queja de 2026 contra D4: tras «Mythic 3.0» (T14), las builds comparten 5–6 piezas clave y hay menos libertad. Lo que sí gustó (la T13: Mítico con tiradas al máximo y fijas) coincide con tu diseño, así que el fallo está en la cantidad, no en la forma.
- Arreglo propuesto: 2 Míticos por especialización, uno por eje (UNI o ÁREA, alineados con las variantes), o 3 por clase con afinidad de especialización. La vía de 4 Chispas te deja elegir cuál. Esto sube R7 (contenido) en 9 piezas: mételas en la ola posterior que ya prevé R7.

### R2-A-P17 · media
- Dónde: §8 «Regalo» (transferencia en dos fases, vuelta a los 30 s)
- Problema: La transferencia en dos fases con vuelta por tiempo puede duplicar: si el acuse del receptor se pierde, o llega a los 30,1 s, el objeto vuelve al emisor y el receptor ya lo tiene. Es el problema de los dos generales: sin coordinador no hay acuerdo garantizado sobre un canal que pierde mensajes. Además, «solo lo que cayó en esa partida» no se puede comprobar, porque el receptor se fía de `origen`.
- Arreglo propuesto: - No liberes nada por tiempo. El objeto queda «en tránsito» en el emisor y «pendiente» en el receptor hasta un mensaje de confirmación; si se corta, se resuelve por uid en el próximo contacto (cola de salida persistente).
- **Prueba de botín:** como el botín es determinista (`killLootRng(semilla, heroId, netId)`), añade al formato `o: { run, netId, idx }`. Así el receptor regenera el objeto y comprueba que coincide; solo se regalan objetos sin modificar.
- Si se acepta el riesgo porque el cooperativo es entre amigos, dilo explícitamente y marca lo regalado como ligado.

### R2-A-P18 · media
- Dónde: §8 y §9 (almacén de cuenta en `localStorage`)
- Problema: El almacén de cuenta pasa a guardar el valor de 40–60 h (Códice, marcas de agua, Polvo, Chispas, alijo), pero sigue en almacenamiento «best-effort»: el navegador puede borrarlo si le falta espacio, y Safari aplica el tope de 7 días al almacenamiento escribible por script en sitios no instalados. El diseño no pide `navigator.storage.persist()`, ni hace copia de la cuenta, ni detecta el borrado. Con la nube recién en F2, una pérdida es total.
- Arreglo propuesto: - Pide `navigator.storage.persist()` en la primera escritura del Códice, dentro de un gesto del jugador; consulta `persisted()`.
- Copia exportable de la cuenta (`IRPGA1`), con aviso cada N horas de juego.
- Al cargar, `rev` y sello de tiempo: si el almacén de cuenta falta pero hay héroes, avisa y ofrece importar la copia.

### R2-A-P19 · baja
- Dónde: §8 «Varias pestañas»
- Problema: El contrato mezcla dos patrones. Un cerrojo por escritura con `rev` deja el cerrojo libre entre escrituras, así que `ifAvailable` no detecta una segunda pestaña. Un cerrojo de líder retenido toda la vida de la pestaña sí la detecta, pero entonces la página no entra en la caché de atrás y adelante (motivo «lock»). No se dice cuál se usa.
- Arreglo propuesto: Especifica las dos cosas:
- **Líder:** `navigator.locks.request('irpg-cuenta:<reino>', { ifAvailable: true }, () => new Promise(() => {}))`. Si no lo obtienes, solo lectura.
- **Escrituras del líder:** compara `rev` dentro de un cerrojo corto `irpg-cuenta-w:<reino>`.
Acepta que no entra en la caché de atrás y adelante, y pon una prueba con un cerrojo falso.

### R2-A-P20 · baja
- Dónde: §4.4 clave nueva `resRatePct`
- Problema: `resRatePct` duplica dos claves que ya existen: `regenPct` (regeneración de Maná y Energía) y `resGainPct` (TODO lo generado, `resources.js:95`; no «solo la Furia», como dice el diseño). Una tercera clave abre dudas de apilado y de topes.
- Arreglo propuesto: Que la línea del equipo sume a `regenPct` y a `resGainPct` (con el tope de ≤ 40 % del equipo sobre esa suma) en vez de crear una clave nueva. Corrige la frase sobre `resGainPct`.

### R2-A-P21 · baja
- Dónde: §4.1 Mano izquierda del Guerrero
- Problema: La única base de mano izquierda del Guerrero es el escudo (implícito: 10 % de bloqueo y armadura ×1,3). Al Berserker (DPS) y al Cruzado (apoyo) les sirve poco, mientras el Foco de la Maga y el Carcaj de la Arquera dan implícitos ofensivos. La ranura con peso 0,75 vale distinto según la especialización.
- Arreglo propuesto: Añade una base ofensiva para el Guerrero (por ejemplo «Hacha de mano»: +6 % de vel. de ataque, o +8 % de Furia generada). El escudo sigue siendo la base del Guardián (su bloqueo innato exige escudo).

### R2-A-P22 · baja
- Dónde: §15 Fuentes, P4-D18, P4-D12, P4-D19
- Problema: Hay datos desactualizados o sin fuente:
- Last Epoch apagó el comercio por la duplicación de oro en la primavera de 2024 (parche 1.1.x, comunicado del 2-abr-2024), no en 2025.
- La T15 de D4 empezó el 15-sep-2026, no en octubre. Y la vía del Joyero da un Mítico AL AZAR de la ranura elegida, así que «tres vías deterministas» exagera.
- «D4 sacó el hallazgo mágico en la T4» no tiene fuente.
- Falta citar a favor la reacción a «Mythic 3.0» (T14), que respalda tu Mítico de tiradas fijas.
- Arreglo propuesto: - Corrige las fechas y los textos.
- Marca [sin fuente] el dato del hallazgo mágico o justifícalo solo con el problema del código (MF dentro del ⚡).
- Añade Mein-MMO e Icy Veins de la T14 y la T15 como precedente.

### R2-A-P23 · baja
- Dónde: Mockup (`mockup/index.html`, vista Ritmo y cabecera)
- Problema: - El mockup enseña ⚡ 5 930 en un Berserker Nv72 con ◆ medio 43,9, pero §6 dice «≈ 1 800 en el Nv70» para el típico. El dueño verá dos escalas distintas.
- En la única captura, la etiqueta «40–60 h» se pisa con la marca de 40 h («4040–60 h») y «≈ 1 300/h» se parte en «≈ 1 / 300/h». Se corrigió sin volver a capturar.
- El modelo del mockup (`evalHero`) es una simplificación propia, distinta de `calc-r1*.mjs`.
- Arreglo propuesto: Alinea el modelo del mockup con `calc-r1d.mjs` (las mismas referencias D₁ y A₁) o pon en §6 los números del mockup. Saca 1 captura por turno de la vista Ritmo tras el arreglo (dentro del cupo de 2).

### R2-A-P24 · baja
- Dónde: §4.7 Únicos, §8 Hardcore, IT4, §4.13 cooperativo
- Problema: Cuatro huecos menores:
(a) 10 Únicos a ≈ 2,5/h se coleccionan en pocas horas: poca persecución con nombre.
(b) No hay regla para el equipo y los aportes al Códice de un héroe Hardcore muerto, ni para cómo se une el Polvo o las Chispas de temporada al reino local.
(c) IT4 incluye pares con Δ casi nulo, donde el ruido de la simulación invierte el signo.
(d) Las metas en horas están medidas en solitario, pero en grupo, con `partyLootMult = 1` y vida < ×n, el botín por hora y jugador sube.
- Arreglo propuesto: (a) 2 Únicos por especialización (18) más las reliquias.
(b) Héroe HC muerto: su equipo se pierde y el Códice HC se queda; al cerrar la temporada, el Polvo y las Chispas se suman y el Códice se une por mejor rango.
(c) IT4 excluye |Δ| < 2 % o usa semillas pareadas.
(d) Declara las metas «en solitario» y mide el factor de grupo en el E10 del Paso 6.

### R2-A-F1 · faltante
- Una tabla de ΔDPS, ΔAguante y ΔTTK TOTALES por perfil (desnudo, típico, óptimo) y nivel (20, 50, 70 y 100) frente al banco actual, y la regla IT8 que la ate. Hoy solo está el arma.

### R2-A-F2 · faltante
- Una decisión explícita de qué manda cuando IT1 (cuota del equipo) y la compensación de vida o IT8 chocan, y qué constante puede tocar B1 en E4 (`ENEMY_CURVE` sí o no).

### R2-A-F3 · faltante
- El eje de Apoyo (curación y escudos a aliados) y la medida del control en `valuation.js`, con una línea `healPct` que solo salga a quien cura.

### R2-A-F4 · faltante
- IT3 y la valoración por habilidad, con soportes y mods de talento, para detectar líneas topadas en una build concreta.

### R2-A-F5 · faltante
- La probabilidad de ★ al caer, la distribución de pasos por Tormento y si el botín de Tormento con rango hecho trae remate.

### R2-A-F6 · faltante
- Una regla y una prueba de apilado aspecto ↔ talento (F11) y topes de `gaugeMax:<id>`.

### R2-A-F7 · faltante
- Una tabla de contratos con el Paso 6 v4: alcance de la sincronización, esquema de nube con `realm` y tabla de cuenta, reino de temporada en F2 (de honor y local), uids que no se reescriben, y que el CRC `cat` del saludo incluya bases, pools, aspectos, Únicos y constantes de ítems.

### R2-A-F8 · faltante
- Una «prueba de botín» en el formato compacto (`o: { run, netId, idx }`) para verificar regalos regenerando el objeto con `killLootRng`.

### R2-A-F9 · faltante
- Persistencia del almacenamiento (`navigator.storage.persist`), copia exportable de la cuenta y detección de borrado.

### R2-A-F10 · faltante
- Versión de catálogo por objeto (`cv`) y qué hace `validateItem` cuando una línea sale de un pool en una versión futura: hoy lo rechazaría y el objeto se perdería en una importación o un regalo.

### R2-A-F11 · faltante
- Dejar reservado en el formato y en el almacén de cuenta un campo para el Talismán que se repensará tras E4b, así no hará falta una migración v7. D4 Lord of Hatred volvió a fundir charms y conjuntos en un solo slot de Talismán.

### R2-A-F12 · faltante
- Qué pasa con los soportes repetidos y con el choque del nombre «engarce».

### R2-A-F13 · faltante
- Metas de ritmo por Tormento (T0, T4 y T8+) y en grupo.

### R2-B-P5 · media
- Dónde: §4.1 (pools), §4.4, P4-D22, §10 (`HP_P4_COMP`); js/data.js:83,94,105; js/progression.js:17; js/combat-math.js:85-93
- Problema: La Vida está en 7 de los 9 pools y el Principal en 6, más el Rubí y la Amatista. Son las líneas que todo el mundo quiere siempre: toda pieza buena acaba siendo Principal + Vida + algo, y las re-tiradas van siempre a lo mismo. Es un impuesto, no una decisión; WoW lo resolvió poniendo el atributo principal y el Aguante como base fija de la armadura y dejando al azar solo las secundarias. Encima, P4-D22 devuelve la vida al héroe por `hpPerLevel`, que es lineal (baseHP + hpPerLevel·(Nv−1), y los atributos paran en el Nv20). El daño enemigo, en cambio, crece G^0,85 por nivel de área: ×2,6 en AL19 y ×11,7 en AL47. Si los ~800 que faltan en el Nv70 van a `hpPerLevel` (≈ +11,6 por nivel), en el Nv20 suman ≈ +220. Ahí sobra, porque la vida del equipo escala con G y en el Nv20 se pierde solo una fracción de esa cantidad; del Nv70 al 100 se queda corta. Además es deuda que E4b tendrá que deshacer.
- Arreglo propuesto: Haz la Vida implícita en las piezas de armadura (casco, pecho, guantes, cinturón, botas y mano izquierda), escalando con G(◆) como la armadura implícita. Cada mejora de ◆ sube la vida (el número «visceral»), la cuota del equipo se mantiene estable en todos los niveles y P4-D22 sobra. La Vida al azar queda solo en la joyería (y en el Rubí). Valora hacer lo mismo con el Principal (implícito en el arma y la mano izquierda) para que las líneas al azar sean decisiones de build. Si mantienes P4-D22, que la compensación tenga forma G (vida de clase × G(AL)^0,85) y que IT1 mida en los Nv20, 30, 50, 70 y 100.

### R2-B-P6 · media
- Dónde: IT6, §4.4 (tabla de paridad: daño crítico +3,6/3,6/5,4 %; Vida +7,0/6,4/6,2 %; topes por clase), §12 E4 («no calibra clases»)
- Problema: El valor del % de daño crítico es proporcional a la probabilidad de crítico, y esa probabilidad es distinta por clase por diseño: 50,5 % la Arquera óptima frente a 32,4 % el Guerrero, y el tablero del Nv81+ abre la brecha (+12 frente a +4). Con una sola base global por línea, E4 solo puede escalar las tres clases a la vez, así que la razón de ~1,5 entre clases no se mueve. Una banda de ±20 % sobre la mediana admite como máximo 1,2/0,8 = 1,5: IT6 queda justo en el borde en el Nv70 y falla en el Nv100. Lo mismo pasa con la Vida (vale ∝ 1/vida de la clase) y con la Esmeralda frente al Topacio. E4 no tiene con qué arreglarlo.
- Arreglo propuesto: IT6 por clase: cada línea a ±20 % de la mediana de su categoría dentro de la clase, en los Nv50, 70 y 100. Entre clases, una regla más ancha (±35 %) o una «afinidad de clase» explícita y aceptada, como las prioridades de stats por especialización de WoW. El veredicto ya la muestra.

### R2-B-P7 · media
- Dónde: §4.4 («1 u ≈ +4 % de Daño ⚔ … ≈ +3 % ✚»), pools de casco, cinturón y botas, O5
- Problema: Las líneas ✚ se miden en el mismo eje (Daño) que las ⚔ y valen menos: Enfriamiento +3,1 %, Coste +2,8 % y Recurso +2,3 %, frente a Principal +4,5 %. Con el ⚡ del documento (w = 0,6), cada línea sube el ⚡ aproximadamente así: Principal +2,7 %, Vida +2,6 %, Enfriamiento +1,9 %, Coste +1,7 % y Recurso +1,4 %. En el casco (Principal, Vida, Armadura, Enfriamiento, Coste), el cinturón y las botas (con Recurso), las ✚ valen entre 0,5 y 0,7 de sus vecinas y siempre se re-tiran. Son líneas trampa, lo mismo que WoD eliminó con el golpe y la pericia, así que O5 («0 líneas muertas») no se cumple. El argumento de que «igualar daba 60 de vida por línea» compara 🛡 con ⚔ y aquí no aplica.
- Arreglo propuesto: Paridad por pool medida en g (⚡): toda línea que comparte pool queda a ±20 % en g para la build mediana de cada clase. Hay dos formas de lograrlo: subir las bases ✚ (≈ ×1,3, revisando el tope de Enfriamiento del equipo) o sacar el Principal de los pools que tienen ✚ (casco y cinturón) para que compitan solo con 🛡. Añádelo a IT6.

### R2-B-P8 · media
- Dónde: §4.4 (% Daño con tope 13 y % Daño de tu elemento con tope 16), mockup `sigma = 60 + t.dmg + t.elem * 0.85`
- Problema: El % de Daño de tu elemento siempre se resuelve al elemento de tu especialización, y en el mockup vale 0,85 del % de Daño con tope 16 frente a 13 (16 × 0,85 = 13,6 ≈ 13). Es el mismo valor con dos nombres y dos números distintos, sin ninguna decisión de por medio. Es sopa de stats (D4 quitó los afijos condicionales en Loot Reborn) y ocupa una de las 17 líneas.
- Arreglo propuesto: Fundir las dos en «% Daño», o cambiar el % de elemento por una línea que obligue a decidir y hable el idioma de los talentos: «+% daño de tus <categoría>» con selector (`@basic`, `@spender`, `@insignia`). Su valor depende de cómo juegas tu barra.

### R2-B-P9 · media
- Dónde: §5 («+2 del equipo; ≤ +1 por pieza»), §4.1 (+1 en el arma con @spender, en la mano izquierda con @insignia y en el amuleto con @ultimate/@movement), mockup `t.rank = Math.min(2, t.rank)`
- Problema: Tres ranuras pueden traer «+1 a tu <categoría>», cada una con un selector distinto, pero el tope es +2 en total: la tercera línea queda muerta. Contradice O5 y el principio 4. Además la línea no escala con el ilvl, el rango ni el paso (no tiene ▰): en los niveles bajos domina y en el final pesa poco.
- Arreglo propuesto: Tope por selector (como mucho +1 por categoría) y sin tope global; o que solo 2 ranuras ofrezcan +1. `test92` debe afirmar que ninguna combinación legal de piezas deja una línea en 0.

### R2-B-P10 · media
- Dónde: §4.1 («pools ≥ 5 para que la re-tirada ofrezca 2 opciones distintas de las 3 que ya hay»), §4.9 (re-tirada), §4.4 (tabla de techo: «+ re-tirada a paso 5»)
- Problema: Si las 2 opciones son siempre líneas que la pieza no tiene, nunca puedes subir el paso de una línea que quieres conservar (por ejemplo, Principal del paso 3 al 5). El escalón «re-tirada a paso 5 = 89 %» de la tabla de techo es inalcanzable por crafteo. Además, en los pools de 5 (casco, pecho, guantes, cinturón, botas y anillos) las 2 opciones son siempre las mismas 2 líneas: la re-tirada solo sortea el paso de líneas que no buscas.
- Arreglo propuesto: Separar dos acciones: «Re-tirar línea» (como está) y «Afinar», que re-tira el paso de una sola línea dentro de su rango, con costes crecientes de Esencia y oro y sin tope de usos (el ★ no se afina). Así el techo es alcanzable y la Esencia gana un sumidero largo (problema 3). Ajusta `validateItem` y el formato (contador de afinados).

### R2-B-P11 · media
- Dónde: §0 (tooltip «+9 Fuerza»), §4.4 (`mainGear`), §9.2 (aviso «tu crítico bajó»), P4-D5
- Problema: A la Arquera el tooltip le dice «+9 Destreza», pero esa Destreza no da crítico ni armadura, y la Destreza que gana por nivel sí. El mismo nombre hace dos cosas según de dónde venga, y el jugador medio no puede deducirlo: la propia migración tiene que avisarlo. WoD lo resolvió cambiando el atributo (la Agilidad dejó de dar crítico), no con dos acumuladores.
- Arreglo propuesto: Mostrar la línea como «+9 Poder», con el icono del atributo de la clase, y en Alt «solo daño». O adelantar a E1 la opción completa: quitar el crítico y la armadura a la Destreza y el maná y la regeneración a la Energía en todas las fuentes, para que el atributo signifique siempre lo mismo.

### R2-B-P12 · media
- Dónde: §4.3 (Raro = ▲), §7.2 (▲ verde «abajo a la derecha»), §7.5 (Códice «▲ r4 · 75 ✧»), mockup `.cell .gl` (abajo a la derecha, línea 119), `.cell .up` (arriba a la derecha, líneas 124 y 849), vista Ritmo («Polvo ✦», «22 ✦»)
- Problema: El glifo del Raro es un triángulo amarillo y la marca de mejora es un triángulo verde, en la misma celda. Amarillo y verde es justo el par que confunde la deuteranopía, y la forma, que XAG 103 pide como canal extra, es la misma. El documento pone la mejora abajo a la derecha; el mockup la pone arriba, con el glifo de rareza abajo: contrato y mockup no coinciden. Además, ▲ también significa «subir rango» en el Códice, ✦ es a la vez Legendario y Polvo, y ◆ ◇ ◈ (NO, engarce y aspecto) son tres rombos casi iguales a 16 px.
- Arreglo propuesto: Un glifo, un significado. Para la rareza, formas que no se usen en otra parte (por ejemplo ● ■ ⬟ ✦ ⬢ ✸, con el Raro como pentágono). La mejora, como chevron con contorno y fondo; el Códice, con «+1»; el Polvo, con su propio icono. Fija en el documento la esquina de cada marca y que el mockup la respete. Prueba la celda con un simulador de deuteranopía.

### R2-B-P13 · media
- Dónde: §4.4 (daño crítico con tope 50 %), §5 (daño crítico al saco aditivo y solo en críticos), §0 («+46,6 % daño crítico» junto a «+7,5 % daño»)
- Problema: La paridad en u obliga a mostrar números con tipos de cambio muy distintos: 13 % de daño, 50 % de daño crítico y 100 de vida valen lo mismo. El jugador medio lee «+46,6 %» como seis veces «+7,5 %», pero aporta pocos puntos de DPS porque va al saco aditivo y solo cuenta en los críticos. D4 hizo esto mismo en la Temporada 2 (afijo de daño crítico solo aditivo) y tuvo que inflar los rangos para compensar. El tooltip pierde credibilidad.
- Arreglo propuesto: Una de dos: que el daño crítico sea un multiplicador propio del crítico (CRIT_MULT 1,5 + la línea, sin pasar por el saco), con números chicos y honestos (tope ~15 %); o que el tooltip muestre el efecto («≈ +4 % de tu daño» en Alt). El número de cada línea debería entenderse por sí solo.

### R2-B-P14 · media
- Dónde: §4.7, §4.6 regla 5 (como mucho un [×] activo), §4.13 (Chispas)
- Problema: El documento pone presupuesto a los aspectos (+15 a 25 %, un solo [×] activo) pero no al poder de un Único ni al poder mítico. Tampoco dice cuántos Míticos puedes llevar a la vez, si su poder exige la especialización ni cómo escala el poder de un Único con el ◆ y el rango. Con 4 Chispas obtienes el Mítico que elijas de tu clase, y como cada clase tiene 3 especializaciones, nada impide llevar 2 o 3 Míticos de la clase en ranuras distintas. Cuando D4 hizo determinista el Mítico, en la Temporada 15, limitó a una sola la pieza fabricada equipada.
- Arreglo propuesto: (1) Como mucho un Mítico equipado. Su poder cuenta como el [×] activo del héroe y exige su especialización; si no la tienes, se ve atenuado con «Pide: Crionte». (2) Presupuesto: el poder de un Único vale como mucho 1,2 veces un aspecto r5 de su ranura; el poder mítico, como mucho +25 a 35 % de la build, declarado en `delta` y medido como F10. (3) Definir cómo escala el poder de un Único con el ◆ y el rango.

### R2-B-P15 · baja
- Dónde: §4.13, meta «Build completa» («6 × (25 + 250) ≈ 1 650 ≈ 10 h»), P4-D14
- Problema: La build usa 10 aspectos, uno por ranura según la regla 7, no 6. Llevar los 10 a r5 cuesta 2 750 de Polvo (≈ 17 h a 165 por hora), no 1 650. La meta de 12 a 20 h todavía cabe, pero el cálculo y el cuello de botella están mal contados.
- Arreglo propuesto: Rehacer la cuenta con 10 aspectos, o explicar qué 6 cuentan y por qué. Que IT7 mida el tiempo hasta tener 10 aspectos útiles en r5.

### R2-B-P16 · baja
- Dónde: §6 (Aguante: «(1 + 0,25·vel.mov) × (1 + 0,5/recarga de la esquiva)»), pool de las botas
- Problema: Los pesos de movimiento y esquiva (`VAL_K`) son declarados, sin medida detrás, y deciden si unas botas con velocidad salen ▲ o ▼. En los ARPG la velocidad en las botas se busca por sensación más que por números. Si el ⚡ la infravalora, el veredicto empuja en contra de lo que siente el jugador, e IT4 no puede validarlo porque la simulación tampoco mide sensación.
- Arreglo propuesto: Que la velocidad de movimiento sea un implícito de las botas (escala con el ◆) y salga del pool; o marcarla con «?» en el veredicto y dejarla fuera de g.

### R2-B-P17 · baja
- Dónde: P4-D2, §4.1, §4.7 y §15, §4.4 (tabla de líneas), §9.1 (`validateItem`)
- Problema: Hay datos y citas que corregir. (a) «G^7 = ×1,55, la mitad del crecimiento de la vida enemiga»: la vida enemiga crece G^(7·1,38) = ×1,84; es +55 % frente a +84 %, no la mitad. (b) «Pesos de WoW verificados (1,00 / 0,75 / 0,5625)»: la página está desactualizada (de TBC a Cataclysm) y no da pesos para anillos ni cuello, así que para los anillos es [S]. (c) «D4 T15 (oct-2026)»: la Temporada 15 empezó hacia el 15-sep-2026. (d) La Esquiva figura con escala «%» cuando son segundos. (e) `validateItem` admite «una ★ salvo Mítico», pero el Mítico tiene «todas al paso 5»: no queda claro si lleva ★.
- Arreglo propuesto: Corregir cada dato, marcar [V] o [S] según la fuente y definir si el Mítico admite ★.

### R2-B-P18 · baja
- Dónde: mockup index.html:1301-1302 (vista Ritmo), reglas @media hasta 760 px, preview/captura-v3-ritmo.png, preview/captura-2-movil-aspectos.png
- Problema: Los miles llevan un espacio ASCII («≈ 130 000», «≈ 1 300») y en la captura se parten en dos renglones: «≈ 1» y abajo «300/h», que se lee como «1 por hora». En la línea de horas, «40 h» se solapa con «40–60 h» y con el «60 h» del final. El documento dice que lo corrigió sin volver a capturar, así que no está verificado. El mockup trae reglas y una captura para móvil en un juego solo de PC. Y el ⚡ 5 930 del Berserker Nv72 del mockup no cuadra con el «≈ 1 800 en el Nv70» del §6.
- Arreglo propuesto: Usar espacio fino no separable (U+202F) y `white-space: nowrap` en las cifras. Hacer una captura de verificación de la vista Ritmo, lanzada por turno. Quitar el @media para móvil. Alinear el ⚡ del texto con lo que da `check-mockup.cjs`.

### R2-B-F1 · faltante
- Ritmo en el cooperativo. Con botín personal por héroe y por muerte, un grupo de 4 saca 4 veces más botín por muerte. Falta definir cuánto sube la vida enemiga por jugador y el multiplicador de botín por jugador, para que IT7 (medido en solitario) siga valiendo en grupo. WoW decide cuántos reciben botín según el tamaño del grupo: https://warcraft.wiki.gg/wiki/Personal_loot

### R2-B-F2 · faltante
- Regla de regalo al estilo WoW: solo puedes regalar lo que no es mejora para ti. Valorar «no si es ▲ para quien regala», o decidir explícitamente que entre amigos no hace falta. Misma fuente: Personal_loot.

### R2-B-F3 · faltante
- Política del techo a futuro. ¿El ILVL_MAX = 47 queda fijo para siempre (estilo GW2) o sube por temporadas (estilo WoW)? ¿Qué pasa con el Códice, los Míticos y las marcas de agua cuando llegue contenido nuevo, y qué reinicia exactamente la escalera?

### R2-B-F4 · faltante
- Tabla de recompensa de ítems por escalón de Tormento: probabilidad de ★ y de paso 5 al caer, Únicos y Míticos por T. Hoy la única recompensa vertical es un rango que se craftea barato.

### R2-B-F5 · faltante
- Saber si una pieza que cae pre-mejorada por el Tormento (r5 en T10) trae ★ o no, y cómo se le pone uno.

### R2-B-F6 · faltante
- Veredicto «a potencial» (mejora hasta la marca de agua, gema movida, aspecto del Códice) y su coste de CPU dentro de R4 (≤ 2 ms por fotograma).

### R2-B-F7 · faltante
- Sumidero terminal de Esencia y de gemas (por ejemplo, la acción «Afinar») y techo de acumulación de monedas, con reglas en IT7 que afirmen que ninguna moneda acumula más de X horas sin uso.

### R2-B-F8 · faltante
- Hardcore: qué pasa con el equipo de un héroe muerto y si el Códice y la marca de agua HC sobreviven. Si sobreviven, el riesgo del modo baja mucho.

### R2-B-F9 · faltante
- Presupuesto y escalado de los poderes de Únicos y Míticos, límite de un Mítico equipado y su relación con el [×] activo.

### R2-B-F10 · faltante
- Prueba de que «el mismo ◆ da el mismo valor por tipo de línea» (problema 1) y prueba de cobertura de aspectos por configuración de variantes (problema 2).

### R2-B-F11 · faltante
- Regla de paridad por pool medida en g (⚡), además de la de categoría, para que ninguna línea de un pool sea trampa frente a sus vecinas.

### R2-B-F12 · faltante
- Telemetría local de botín y monedas por hora (un registro exportable de las partidas del dueño) para contrastar `loot-bench` con el juego real antes de cerrar E4.
