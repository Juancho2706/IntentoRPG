# Objeciones de gravedad ALTA que el corrector no vio · Ítems

**Total:** 13.
Texto íntegro de cada experto (de `refutaciones/*.json`). Id = ronda/experto/problema.

## INV-B-1 · Investigación · experto B (investigacion-2.json, problemas[0])

- **Dónde:** arpg.md §1 (fila «Rareza al caer»: «0,12 legendarios por cada 100 muertes») y §3.9; actual.md §0.5, §1.1, §4.2 («Los blancos no sirven ni de base») y §9 R1. Código: js/economy.js:251-254 y 336-358; js/main.js:1284-1285; js/items.js:557-559
- **Problema:** La escasez de legendarios se calcula solo con lo que cae al matar, y eso no es el ritmo real.
- El cubo sube de rareza en cadena pagando solo oro: 3 normales → mágico (104 de oro con il40), 3 mágicos → raro (390), 3 raros → legendario (2080). Si los 3 comparten ranura, el resultado sale de esa ranura, así que hay legendarios dirigidos.
- A máxima profundidad, con la mezcla real de caídas (61/33,5/4,9/0,67), la cadena da ≈1 legendario cada ~70 comunes, unas 12 veces la tasa de caída (≈1 cada ~860). Cuesta ≈60 de oro por común frente a ≈93 de ingreso.
- Encima, cada grieta completada garantiza un legendario y el jefe da un 37,5 % en el piso 21.
- La conclusión de actual.md («el 61 % son blancos inútiles») es falsa: los blancos son la materia prima del legendario.
- tests/loot-regression.mjs solo mide caídas por piso, así que no detectaría nada de esto.
- **Arreglo propuesto:** 1. Antes de fijar rarezas, medir la tasa EFECTIVA de cada fuente: caída, cubo, grietas, jefes, apuesta y tienda.
2. En el rework, quitar la subida de rareza en cadena desde blancos. La receta raro → legendario debe pedir un material escaso además del oro, como el Cubo de D4 LoH (1 raro + 1 Polvo Primordial Puro + 10 Polvo Primordial en bruto).
3. Añadir a loot-regression un caso con «cubo óptimo» que falle si los legendarios por hora superan el objetivo.
- **Fuente:** https://maxroll.gg/d4/resources/horadric-cube (actualizada el 14-oct-2026: «Upgrade to Legendary: 1 Rare item, 1 Pure Primordial Dust, 10 Raw Primordial Dust»), más el código citado.

## INV-B-2 · Investigación · experto B (investigacion-2.json, problemas[1])

- **Dónde:** arpg.md §6 M3 y M4 y §7.10 («el ladder valida carreras por semilla», `origen: {reino, partida}`). Código: js/main.js:1545 y 1574 (dt = getDelta, hit-stop ×0,02) y :1231-1233 (stream 'loot' consumido en el orden de las muertes); js/entities.js:2616-2695 y 2982 (Math.random en la IA de deambular, el temporizador de pensar y la probabilidad de ataque a distancia); js/game-zone-life.js:47-86 y 159
- **Problema:** Repetir la semilla para validar el ladder exige una simulación determinista, y hoy no lo es:
- El paso de tiempo es variable.
- La IA enemiga, los respawns y el tipo de goblin usan Math.random.
- El botín sale de un stream secuencial que depende del orden de las muertes.
- Las funciones Math (pow, sin…) pueden dar resultados distintos según el motor JS, porque la especificación solo pide una aproximación.

Además, `origen` es un campo más de localStorage: cualquiera lo edita, así que no prueba nada.
- **Arreglo propuesto:** 1. **Ladder:** personajes y botín en un servidor autoritativo. El servidor tira el botín y el cliente nunca exporta objetos al ladder. Cabe en el plan gratuito de Cloudflare Workers: Durable Objects con SQLite, 100 000 peticiones al día.
2. **`origen`:** solo vale si lo firma el servidor (HMAC).
3. **Cooperativo entre amigos:** RNG por contador, con clave (semillaMundo, uidEnemigo, idJugador), en vez de un stream secuencial. Así cada cliente tira su botín personal igual sin depender del orden.
4. Si algún día se quiere repetición, primero un paso de simulación fijo y la grabación de entradas.
- **Fuente:** https://developers.rune.ai/blog/making-js-deterministic-for-fun-and-glory/ (25-jul-2024): una diferencia de 0,001 diverge y ellos redondean Math.* con fround. https://bugs.webkit.org/show_bug.cgi?id=150403: Chrome y Safari dan valores distintos en Math.pow. https://developers.cloudflare.com/changelog/2025-04-07-durable-objects-free-tier/. Salmon et al., «Parallel Random Numbers: As Easy as 1, 2, 3», SC11 (2011), sobre RNG por contador.

## INV-B-3 · Investigación · experto B (investigacion-2.json, problemas[2])

- **Dónde:** arpg.md §4 R6 y §7 puntos 5–7 (Reforjar + Templar + Calidad con remate + Sello + Códice con rango + Talismán + Cubo + runas y palabras rúnicas + gemas)
- **Problema:** La v1 importa casi toda la pila de crafteo de D4 (unas 9 capas) a un proyecto de un solo dueño, sin comercio, que pide «visual y poco texto».
- D4 llegó ahí en 2 años de temporadas, y en la T11 tuvo que quitar capas: fuera la durabilidad del templado y la obra maestra se redujo a Calidad.
- PoE2 0.5 recortó el determinismo en la cima.
- Cada capa es interfaz, textos, guardado, migración, banco y tests. No hay criterio de qué entra en el Paso 4.
- **Arreglo propuesto:** 1. Fijar un MVP de 3 capas:
   - Reforjar dirigido, con bloqueo.
   - Calidad con remate.
   - Códice con rango.
2. El filtro de botín va aparte.
3. Templado, Sello y Talismán pasan al backlog. Cada uno entra solo si el banco de botín muestra un hueco de progresión que esa capa cubra.
4. Las palabras rúnicas quedan como única capa «D2».
- **Fuente:** https://www.icy-veins.com/d4/news/huge-diablo-4-vendor-crafting-changes-in-season-11/ (vía buscador). https://news.blizzard.com/en-gb/article/24077223/galvanize-your-legend-in-season-4-loot-reborn (durabilidad del templado). https://kami-labs.fr/en/path-of-exile-2/poe2-patch-0-5-return-of-the-ancients-notes-complet-en/ (Recombinador desactivado; monedas Mayores y Perfectas más raras). Preferencia del dueño.

## R1-B-1 · Diseño ronda 1 · experto B (ronda1-b.json, problemas[0])

- **Dónde:** §0 punto 4, P4-D5, §4.4 (Principal), §5; código: entities.js:917-920 y 935, resources.js:8-12 y 39-51, data.js:82/93/104 (mainStat)
- **Problema:** El «Principal adaptable» no vale lo mismo en cada clase. La línea se resuelve en a.fue, a.des o a.ene, y esos atributos tienen efectos secundarios distintos. Destreza (Arquera): +0,15 % de crítico y +0,3 de armadura por punto. Energía (Maga): +2 de maná máximo y +2 % de regeneración por punto. Fuerza (Guerrero): nada más. Con el equipo óptimo (≈159 de Principal en 5 ranuras con ★), la Maga regenera ×(1+0,02·(79+159)) ≈ ×5,8, frente a ×2,6 sin equipo. Eso recrea el «recurso casi infinito» que el comentario de combat-math.js (REGEN_PER_ENE) dice haber arreglado, y deja muertas sus líneas % Coste y % Recurso. La Arquera recibe +24 de crítico gratis (ver el problema siguiente). Es justo lo que WoW quitó en Warlords of Draenor por la misma razón.
- **Arreglo propuesto:** Opción mínima (recomendada para el Paso 4): el Principal del equipo va a un acumulador propio, `mainGear`, que solo entra en mainStatMult y no se suma a a.des ni a a.ene. Opción completa (WoD): quitar el crítico y la armadura de la Destreza y la regeneración de la Energía, compensando con crítico base para la Arquera y regeneración base para la Maga. Añadir una prueba: el mismo objeto da el mismo Δ de mainMult en las 3 clases, y ningún otro stat cambia.
- **Fuente:** Notas de WoD (alfa y beta 2014): «Agility and Intellect also provide Critical chance… whereas Strength does not. In order to achieve better balance, we've removed the Critical Strike chance increase from Agility and Intellect». https://www.wowhead.com/news/warlords-of-draenor-beta-patch-notes-august-27-and-class-blue-tweets-242843 · código citado

## R1-B-2 · Diseño ronda 1 · experto B (ronda1-b.json, problemas[1])

- **Dónde:** §4.4 «Comprobación de topes», §0 punto 5, IT3, O5
- **Problema:** La tabla de topes solo suma las líneas de % Crítico y deja fuera tres cosas. (a) El crítico de la Destreza: el equipo óptimo da 25×1,5×4,25 ≈ 159 de Principal, que son +23,9 de crítico en la Arquera. (b) El crítico base de la clase y el de los atributos: con el reparto del banco (bench-core.mjs:179, 60 % al principal), la Arquera tiene Des 77, o sea 5+11,6 = 16,6. (c) Talentos y tablero. Solo con el equipo, la Arquera llega a 23,9+29,9 = 53,8 de crítico (90 % del tope de 60, cuando la regla IT3 promete ≤ 60 %). En una build real pasa de 70: las líneas de crítico quedan muertas en la Arquera, lo contrario de O5. La vida al golpear tampoco está en la tabla: se aplica una vez por impacto (entities.js:989-993) y entra en una cubeta topada al 6 % de la vida por segundo. Con 1–2 líneas se satura y se ofrece en 5 ranuras.
- **Arreglo propuesto:** Rehacer la comprobación por clase y con la build típica: crítico base + atributos + talentos + tablero + equipo, con un margen (crítico total ≤ 55 con el perfil óptimo). Añadir la vida al golpear frente a LEECH_CAP_PER_SEC × vida máxima × impactos por segundo. Si no se cumple, aplicar rendimientos decrecientes suaves por encima de ~40 % (modelo de WoW: sin penalización hasta el 30 % y peldaños después) en vez de un tope duro que deja líneas muertas. Y sacar «Vida al golpear» de 2 de sus 5 pools.
- **Fuente:** Icy Veins, prioridad de stats 12.0.5 (mar-2026): sin penalización 0–30 %, luego peldaños; «not hard caps». https://www.icy-veins.com/wow/demonology-warlock-pve-dps-stat-priority · entities.js:920, combat-math.js:74

## R1-B-3 · Diseño ronda 1 · experto B (ronda1-b.json, problemas[2])

- **Dónde:** §4.1 (implícito del arma «medio = 3·G(NO)·1,35»), §10 «Impacto esperado», mockup weaponAvg
- **Problema:** El 1,35 no compensa la retirada de statMult. Hoy el arma ya tiene ese 1,35 dentro: lo = 3·G·statMult·(0,85–1,15) y hi = lo·(1,5–1,9) (items.js:210-213), y el combate usa la media (lo+hi)/2 ≈ 1,35·lo (entities.js:914-916). Hoy la media es 3·G·1,25·1,35 = 5,06·G para un raro y 3·G·1,5·1,35 = 6,08·G para un legendario; la nueva es 3·G·1,35 = 4,05·G. A NO 45 da 64,7 de media frente a 80,9 del raro y 97,0 del legendario: el típico pierde un 20 % y el óptimo un 33 % del arma. El documento dice +8 % y −10 %. El impacto de §10 está mal, y E4 arrancaría con una diferencia de 25 puntos sin saberlo. §10 tampoco estima el Aguante: con las bases de §4.4, la vida y la armadura del equipo típico ya dan ≈ 60 % de la vida efectiva, por encima de la banda O6 de 40–50 %.
- **Arreglo propuesto:** Si «medio» es la media, GEAR_K ≈ 1,69 conserva al raro, y ≈ 1,85 queda «entre el raro y el legendario» como pretende el texto. La otra salida es definir 1,35 como el mínimo (lo) y conservar hi = lo×1,5–1,9. Rehacer §10 con la fórmula del código e incluir el Aguante (vida, armadura frente a K = 60·G(AL) y reducción de daño) en Nv50, 70 y 100.
- **Fuente:** items.js:210-213; entities.js:914-916; mockup index.html (weaponAvg, GEAR_K = 1.35); cálculo propio: 3·G(45) = 47,9

## R1-B-4 · Diseño ronda 1 · experto B (ronda1-b.json, problemas[3])

- **Dónde:** §6 (⚡ Poder y veredicto), P4-D17, test95 («▲ ⇒ ⚡ sube»), mockup verdict()
- **Problema:** Hay dos fallos. (a) La regla del ▲ («un eje sube ≥ 1 % y el otro no baja más de 1 %») no implica que el ⚡ suba: con +1 % de Daño y −1 % de Aguante, √(1,01·0,99) = 0,99995, así que el ⚡ baja. Pasa lo contrario con el tooltip de §0 (+8,4 % / −1,2 %): sale ↔, pero el ⚡ sube un 3,5 %. Lo prometido en test95 es falso. (b) Con ⚡ = 100·√(D/D₀·A/A₀), donde ₀ es el héroe desnudo de tu nivel, el nivel y los talentos se cancelan (están en el numerador y el denominador). Al subir de nivel con el mismo equipo, el arma blanca de referencia mejora y el ⚡ baja. El ⚡ deja de reforzar «el número sube», que era su razón de ser (comentario de entities.js:961-962). El peso 50/50 de Daño y Aguante también aconseja mal al Guardián frente al Berserker.
- **Arreglo propuesto:** (a) ▲ ⇔ (1+dD)·(1+dA) ≥ 1+umbral, con los dos deltas a la vista. ↔ solo si el ⚡ sube y un eje baja más de un 3 %. Una sola regla para la celda, el tooltip y el ⚡. (b) Referencia fija por clase (héroe desnudo Nv1, o una constante) para que el ⚡ crezca con el nivel, los talentos y el equipo. Para el progreso del equipo, mostrar en el muñeco el «◆ medio» del equipo, que es el número que WoW usa por el «visceral attachment». Exponente por rol: ⚡ = D^w·A^(1−w), con w = 0,6 para DPS y 0,45 para el Guardián.
- **Fuente:** Hazzikostas (13-sep-2026): «People have a visceral attachment to a certain item level number» https://butwhytho.net/2026/09/world-of-warcraft-midnight-interview-2/ · mockup index.html (función verdict, T = 0.01) · entities.js:961-971

## R1-B-5 · Diseño ronda 1 · experto B (ronda1-b.json, problemas[4])

- **Dónde:** Principio 2 («presupuesto como techo»), §0 punto 5, §4.4 (columna «Base»), §4.5 (gemas)
- **Problema:** El «techo» no tiene unidad. Cada línea trae una base a peso 1 (25 de Principal, 12 % de Daño, 6 % de Crítico, 223 de Vida…), pero nada demuestra que valgan lo mismo, y «lo que cae llena ~65–80 % del techo» no se puede calcular. Con los números del código, el Principal es un multiplicador aparte, mientras el % Daño se diluye en el saco aditivo (Σ ≈ 2,0–2,5 con forja y soportes). En un Guerrero Nv70 típico, una línea de Principal (+23) vale ≈ +9 % de DPS, frente a ≈ +4–5 % del % Daño y ≈ +4 % del % Crítico: unas 2 veces más. Consecuencias: el Principal es obligatorio en las 5 ranuras, la Amatista se lleva el ◇ en todas las piezas donde cabe (elegir gema deja de ser una decisión) y el % Daño queda como «línea de relleno». WoW pone precio a cada stat (StatMod: Stamina 2/3, armadura 1/14), y los procs se cuentan como «aumento × tiempo activo».
- **Arreglo propuesto:** Definir la unidad de presupuesto con el modelo único (§6): el Δ⚡ marginal de cada línea con el perfil típico, por clase, en Nv50 y Nv70. Fijar cada base para que una línea al paso 3, en su ranura mediana, quede a ±20 % de la mediana de su categoría en las 3 clases. Añadir la regla IT6 del banco con esa paridad. Expresar el techo como Σ unidades = peso × B(NO), y medir el «65–80 %» en esas unidades.
- **Fuente:** WoW Stat budget (marcada como desactualizada, pero el principio vale): «Stamina has a StatMod of 2/3»; «Stat cooldowns and procs count as the increase multiplied by expected uptime» https://warcraft.wiki.gg/wiki/Stat_budget · combat-math.js:214-219 (hitDamage)

## R1-B-6 · Diseño ronda 1 · experto B (ronda1-b.json, problemas[5])

- **Dónde:** §4.9, §4.10, §4.11, §1 (objetivos O1–O8), §10 (loot-bench)
- **Problema:** No hay modelo económico ni tiempos. Hay costes (mejorar 0→5: 120 de Esencia y ≈ 12 600 de oro por pieza a NO 47; re-tirada de 1500·1,5ⁿ, que llega a ≈ 17 000; remate a 5000; grabar a r5: 50 de Polvo, o sea 10 legendarios desguazados), pero faltan los ingresos. No se dice el oro por hora, el tamaño de los montones de Esencia, el Polvo de las 2 cartas del cofre ni el precio de la apuesta («pagas oro»). Sin eso no se puede comprobar la regla de inversión ni el «≤ 5 legendarios por aspecto»: comprar a r1 (25) + grabarlo (10) son 35 de Polvo = 7 legendarios, y el Polvo compite con el grabado a r5. Tampoco se puede descartar que la apuesta (18 % de legendario) acabe siendo la mejor fuente de legendarios. El loot-bench solo mide legendarios, aspectos y Esencia. Ningún objetivo está en horas, que es como un MMO controla la cinta de correr. WoW Midnight frena la mejora con Dawncrests y un tope semanal.
- **Arreglo propuesto:** Añadir un §4.13 «Economía» con una tabla de fuentes y sumideros por hora (oro, Esencia, Polvo, gemas por grado) medidos por el loot-bench. Fijar objetivos en horas: build funcional (todas las ranuras con aspecto r1), build completa (los aspectos de la barra a r5), techo (★ + Mítico). Precio de la apuesta atado a la tasa de legendarios (nunca más legendarios por hora que matando). Que la regla IT de ritmo afirme esas bandas.
- **Fuente:** Blizzard Watch, Midnight T1: 20 Dawncrests por rango y tope semanal de 100 https://blizzardwatch.com/2026/03/02/upgrade-gear-midnight-no-valorstones-required (citado [V] en arpg.md §2.8)

## R2-B-1 · Diseño ronda 2 · experto B (ronda2-b.json, problemas[0])

- **Dónde:** §4.2 (fórmula de valor de línea), P4-D4, §0 y §2.1 («◆ es el número que ves y el que ordena»), §6 («◆ medio»), mockup `lineVal` (index.html:721)
- **Problema:** El rango multiplica ×1,065^r, pero el ilvl mueve las líneas % (0,4+0,6·il/52) y el Principal (lineal) casi en plano. Dos piezas con el mismo ◆ no valen lo mismo en 13 de las 17 líneas (todas menos Vida, Armadura, Vida al golpear y el implícito). Con las fórmulas del documento, una línea % con ◆47 = il42 r5 vale 0,94 del tope, y con ◆47 = il47 r0 vale 0,73 (+29 % a favor de la primera). En el Principal la diferencia es +24 %. Además ◆47 (il42 r5: 0,94) supera a ◆50 (il47 r3: 0,88): un ◆ menor es mejor. El documento lo justifica con «es la letra pequeña que acepta WoW», pero en WoW subir de rango sube el ilvl y todos los stats salen de ese ilvl: dos piezas con el mismo ilvl tienen el mismo potencial.
- **Arreglo propuesto:** Que el valor dependa solo del ◆: valor = tope × s_tipo(◆)/s_tipo(52) × peso × f(paso). Las líneas planas siguen con G; las % y el Principal pasan a una curva geométrica suave, por ejemplo 1,035^(◆−52): de r0 a r5 suben +19 % las % y +37 % las planas, y en il1 una línea vale ≈ 17 % del tope. Añade una prueba: dos piezas con el mismo ◆, las mismas líneas y los mismos pasos dan el mismo valor. Si el dueño quiere +37 % también en las %, usa 1,065 por ◆ y acepta que las % sean chicas en los niveles bajos. La salida mínima es dejar de llamar al ◆ «el número que ordena» y ordenar solo por g.
- **Fuente:** https://warcraft.wiki.gg/wiki/Item_level («items with equal ilvl are meant to be of roughly equal potential use») · https://blizzardwatch.com/2026/03/02/upgrade-gear-midnight-no-valorstones-required («ilvl and stats increasing each tier») · cálculo con §4.2/§4.4 y el `lineVal` del mockup

## R2-B-2 · Diseño ronda 2 · experto B (ronda2-b.json, problemas[1])

- **Dónde:** §4.6 «Cobertura del peor caso (Crionte)», regla 7, O2 y O3, tabla de 36 aspectos; js/skills-maga.js:825-827, js/skills-guerrero.js:490-492
- **Problema:** Lanza Pesada (`k_lanza_i`) y Abanico Gélido (`k_lanza_ii`) son variantes excluyentes de la misma habilidad, igual que Estocada Final (`g_rajar_i`) y Molino (`g_rajar_ii`). La asignación del ejemplo (arma con Lanza Pesada y guantes con Abanico Helado) no puede estar activa a la vez: la prueba de cobertura del documento es falsa. En la práctica, Berserker y Crionte tienen 3 aspectos propios, no 4 (O2). Rehecha con una sola variante, la asignación existe, pero es forzada. El Crionte mete en 10 ranuras sus 13 aspectos útiles, incluidos rellenos como Maná Templado o Parpadeo Ligero en el pecho. El Berserker queda igual, con «del Vendaval» (+1 proyectil) muerto para un personaje cuerpo a cuerpo. No hay decisión de build por aspectos: el BiS sale por eliminación y cada legendario de tu clase es «el que te falta» o va al desguace. Como referencia, D4 rehízo más de 200 aspectos repartidos entre sus clases.
- **Arreglo propuesto:** (1) Corrige el ejemplo. Haz que `test-aspects-cobertura` corra el emparejamiento para cada configuración de variantes (como mínimo, la barra recomendada y la alternativa), nunca mezclando variantes excluyentes. (2) Regla nueva: los dos «V» de una especialización no pueden ser variantes de la misma habilidad; si lo son, cuentan como uno para O2. (3) Da elección real con una de dos opciones: al menos 6 aspectos por especialización y 6 de clase, con 3 o más candidatos útiles por ranura en cada configuración; o bajar las ranuras con aspecto a unas 6 (arma, mano izquierda, guantes, amuleto y los 2 anillos) y dejar casco, pecho, cinturón y botas como piezas de stats más Únicos. La segunda opción también reduce el volumen de contenido (R7).
- **Fuente:** Código: js/skills-maga.js:825-827, js/skills-guerrero.js:490-492 · Blizzard, Lord of Hatred («more than 200 aspects reworked», citado en arpg.md §2.1): https://news.blizzard.com/en-us/article/24267729/prepare-for-the-reckoning-lord-of-hatred-draws-near

## R2-B-3 · Diseño ronda 2 · experto B (ronda2-b.json, problemas[2])

- **Dónde:** §4.9, §4.10, §4.11 (rango ⌊T/2⌋ al caer), §4.13 (tabla por hora y metas), IT7, marca de agua (§4.2)
- **Problema:** Los números son del propio documento.
- Mejora: subir las 10 piezas de r0 a r5 con ◆47 cuesta 120 × Σfactor (8,45) ≈ 1 014 de Esencia y ≈ 106 000 de oro, menos de una hora de ingresos (1 300 de Esencia y 130 000 de oro por hora). Después, cada pieza nueva cuesta ⅓, re-tirar cuesta 10 y grabar 5·r. Entran ~1 300 de Esencia por hora y salen menos de 200: sobra entre un 85 y un 90 % durante 40 a 60 horas.
- Esencia y oro se pagan siempre juntos (al mejorar, re-tirar y grabar): son dos contadores para una sola decisión.
- Marca de agua: el ⅓ no frena nada sin topes. En WoW importa porque los emblemas tienen tope semanal; además allí la subida es gratis bajo la marca del personaje y hay un −33 % por umbrales, no un «⅓».
- Tormento: las piezas caen ya con rango ⌊T/2⌋ (r5 en T10), así que el único sumidero se vacía y subir de Tormento no da poder de ítem.
- Gemas: caen 68 por hora y una Perfecta son 9 Talladas, así que las 10 Perfectas salen en unas 2 horas, no en el «techo de 40 a 60 h».
- Apuesta: 130 000 / 2 100 ≈ 61 tiradas por hora, unos 49 Raros por hora en la ranura que eliges. Matando salen ~6,8 Raros por hora y ranura (8 por grieta × 8,5 grietas ÷ 10 ranuras). Es ×7 en bases para grabar, que aquí son la persecución real, y IT7 solo limita los legendarios.
- **Arreglo propuesto:** (1) Que cada moneda tenga de verdad un solo dueño. O se funde la Esencia en el oro (la Herrería cobra oro y Polvo), o la Esencia es la única moneda de la Herrería y el oro queda para el mercader, el alijo y mover el ★.
(2) Un sumidero terminal que crezca: la acción «Afinar» (re-tirar el paso de una línea por Esencia 20·1,5ⁿ, sin tope de usos). También arregla el problema 10.
(3) La apuesta cobra en Esencia (más oro) y entrega solo Legendarios o Únicos, o Raros con pasos de 3 como máximo. IT7 añade la regla «bases útiles por ranura y hora: apuesta ≤ 0,5 × matar».
(4) Tormento: rango al caer ⌊T/4⌋, y que T suba la probabilidad de ★ y de paso 5 al caer, como recompensa vertical por dificultad (D4 lo hace con Míticos y afijos mayores).
(5) Gemas: una cada 2 élites y el grado 5 solo combinando; o sacarlas de la meta de techo.
(6) Quita la marca de agua o haz que la mejora sea un freno real. Si se queda, cita la regla de WoW como es.
(7) Si no hay topes semanales, controla con un techo de acumulación (FFXIV usa 2 000) o con precios que escalen.
- **Fuente:** Cálculo con §4.9 y §4.13 · WoW Midnight: 20 Dawncrests por rango y tope de 100 por semana (https://blizzardwatch.com/2026/03/02/upgrade-gear-midnight-no-valorstones-required); topes retirados como recuperación el 20-may-2026 (https://blizzardwatch.com/2026/05/20/season-1-upgrade-crest-caps-removed-wow-midnight/) · Descuentos: https://icy-veins.com/wow/news/crest-discounts-in-tww-s2 (33 % por personaje) y https://www.curseforge.com/wow/addons/gear-info (0, 10 o 20 emblemas por paso según las marcas) · FFXIV: 450 tomos por semana y 2 000 como máximo (https://ffxiv.consolegameswiki.com/wiki/Allagan_Tomestones) · D3, Kadala como vía dirigida por ranura con fragmentos topados (https://maxroll.gg/d3/resources/using-kadala-efficiently) · D4 LoH, el Tormento sube la probabilidad de Míticos (https://kami-labs.fr/en/diablo-4/objets-mythiques-diablo-4-lord-of-hatred-en/)

## R2-B-4 · Diseño ronda 2 · experto B (ronda2-b.json, problemas[3])

- **Dónde:** §6 (regla única del veredicto), §0 (ejemplo del tooltip), §7.6 (preajustes «Útil para mí» y «Solo ▲»), §7.7 (lotes), IT4, mockup `verdictOf` (VT = 0,01, VLOSS = 0,03)
- **Problema:** (a) En el final del juego tu equipo ya está en r5, con ★, gema y aspecto del Códice en r5, mientras que lo que cae viene en r0–r2 y sin ★. Un guante que cae con Principal, daño crítico y velocidad de ataque al paso 5 y r0 vale 3 × 0,73 = 2,19 u; tu guante al paso 3, r5 y con ★ vale 0,85 + 0,85 + 1,5 = 3,2 u. El veredicto marca ▼ −32 %, aunque mejorado valdría 3,5 u (+9 %). El filtro «Útil para mí» y el desguace por lotes tiran justo las mejores bases. (b) La regla ↔ («un eje baja más de un 3 %») etiqueta como «decides tú» mejoras claras. El ejemplo del §0 da Δ⚡ +14,8 %, justo el rango que Hazzikostas pide para que una pieza se note, y sale ↔. Cuando se cambian líneas casi todo saldrá ↔, y «Solo ▲» lo esconde. (c) T = 1 % es menor que el error esperable del modelo, porque IT4 solo exige acertar el signo: habrá flechas verdes por ruido.
- **Arreglo propuesto:** (a) Veredicto «a potencial». El candidato se evalúa proyectado al rango mín(marca de agua, 5), con tu gema movida y con el mejor aspecto entre el suyo y el que puedes grabar del Códice. La celda marca «▲ tras mejorar» con un mini martillo, el tooltip da el coste y el filtro usa este veredicto. (b) ▲ si g ≥ T y (el peor eje ≥ −3 % o g ≥ 2·|peor eje|); ↔ solo para los casos parejos. Añade «▲▲» para g ≥ 10 %. (c) T igual al percentil 95 del error |g_modelo − g_sim| medido en IT4 (probablemente entre 2 y 3 %); IT4 excluye los pares dentro de ±T.
- **Fuente:** Icy Veins, guía de Top Gear en Raidbots (opciones «Copy and…» para comparar con mejoras y engarces): https://www.icy-veins.com/wow/how-to-use-the-top-gear-feature-of-raidbots · Foro oficial de WoW («sim the item at its highest upgrade level»): https://us.forums.blizzard.com/en/wow/t/gear-upgrade-add-ons-that-deal-with-the-new-system/1592523 · Hazzikostas, 13-sep-2026 (10–15 %), ya citado en el documento
