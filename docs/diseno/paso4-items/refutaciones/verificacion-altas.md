# Verificación · 13 objeciones altas · Ítems (Paso 4, v4.1)

**Fecha:** 22-oct-2026. **Verificador:** experto en itemización de ARPG (D2/D3/D4, PoE 1/2, Last Epoch, Grim Dawn) y de MMORPG (WoW, FFXIV, Lost Ark, GW2).
**Qué se comparó:** cada objeción, leída entera en `altas-no-vistas.md`, contra `paso4-items-diseno.md` v4.1 (no contra la trazabilidad), contra `calc-r2.mjs`/`out-r2.txt` y `calc-r2-econ.mjs`/`out-r2-econ.txt`, y contra el código de `paso2-impl` (4095ab6, solo lectura). No corrí nada pesado ni rehíce el modelo: las cuentas nuevas son sumas a mano sobre números del código que cito.

## Resultado

| Id | Veredicto | En una línea |
|---|---|---|
| INV-B-1 | **INSUFICIENTE** | El cubo se va, pero Grabar sobre un Raro es una subida de rareza pagada solo con oro: `test99` e IT7 fallan tal como están escritos |
| INV-B-2 | DISCREPANCIA ACEPTADA | La autoridad de la escalera es del Paso 6 (F2 «de honor», F3 verificada con build fija), aprobado por el dueño |
| INV-B-3 | DISCREPANCIA ACEPTADA | MVP cerrado y criterio de entrada; las palabras rúnicas siguen fuera por P4-D7 (falta poner la recomendación en §14) |
| R1-B-1 | OK | `mainGear` lineal y simétrico; el problema existe hoy (`entities.js:917,935`) |
| R1-B-2 | **INSUFICIENTE** | La tabla de crítico omite el crítico condicional de 5 especializaciones y los nodos mágicos del tablero: 4 pasan de 60 |
| R1-B-3 | **INSUFICIENTE** | `GEAR_K` 1,69 y la tabla del arma están bien, pero el +56 % del típico del Nv70 frente a hoy no tiene regla que lo vea |
| R1-B-4 | OK | ⚡ con referencia fija y w por rol; una regla; ejemplos comprobados |
| R1-B-5 | OK | Unidad en ⚡, IT6/IT6b; nota menor sobre la lista «fuera de banda» |
| R1-B-6 | OK | §4.13 con fuentes, sumideros y horas; los números cuadran con `out-r2-econ.txt` |
| R2-B-1 | OK | El valor depende solo del ◆; 8,59 = 8,59 |
| R2-B-2 | OK | 6 ranuras con aspecto y «V» en habilidades distintas; nota menor sobre qué es «la configuración recomendada» |
| R2-B-3 | OK | Una moneda en la Herrería, Afinar, ⌊T/4⌋, gemas ≤ Talladas, sin marca de agua |
| R2-B-4 | **INSUFICIENTE** | El potencial no proyecta Afinar: en el final del juego vuelve el fallo (a) que la objeción pedía arreglar |

**Pasan 9** (7 OK y 2 discrepancias aceptadas) · **fallan 4** (INSUFICIENTE) · 0 discrepancias rechazadas.
La trazabilidad decía «4 corregidas y 9 ya resueltas»: de las 4 corregidas, 2 no alcanzan (INV-B-1, R1-B-2); de las 9 «ya resueltas», 2 tampoco (R1-B-3, R2-B-4).

---

## Detalle por objeción

### INV-B-1 · Tasa efectiva de legendarios (cubo en cadena) — **INSUFICIENTE**

**Qué pedía:** (1) medir la tasa efectiva de cada fuente; (2) quitar la subida de rareza en cadena desde blancos y que **Raro → Legendario pida un material escaso además del oro**; (3) un caso «cubo óptimo» en el banco.

**Qué hay:** el cubo se va (§4.8) y §12.3 vigila `cubeCost|transmute` [V: `economy.js:251-254, 336-358`; `main.js:1284-1285`]. IT7 mide la tasa por fuente con la política óptima de conversión (punto 1 y 3 ✔). §4.11 dice que «no queda ninguna subida de rareza pagada solo con oro», porque Grabar solo copia aspectos que ya están en el Códice.

**Por qué no alcanza:**
1. **Grabar sobre un Raro es justo «Raro → Legendario pagando solo oro»** (§4.9: «Aspecto del Códice → Raro (pasa a Legendario) · oro 1 500·rango»). El aspecto del Códice no se consume, así que, con el Códice lleno, cada Raro de una ranura con aspecto es un legendario dirigido, con **tu** aspecto y a **tu mejor rango**, por 1 500–7 500 de oro. Es más dirigido que el cubo que se quiso quitar. El punto (2) del experto no se adoptó y el documento no lo declara como discrepancia.
2. **Las reglas nuevas fallan por construcción:**
   - `test99` afirma «ninguna receta sube rareza pagando solo oro»: Grabar la viola.
   - IT7 pone el grabado en la lista de fuentes y exige que ninguna fuente pagada con oro dé más de **0,5 × matar en legendarios por ranura y hora**. Con §4.13: matando caen ≈ 6,8 Raros por ranura y hora (8 por grieta × 8,5 ÷ 10) y ≈ 3,7 legendarios por ranura con aspecto. Grabar todos los Raros de una ranura da ≈ 6,8 por hora a 1 500·r: **≈ 1,8 × matar** con aspectos r1, y ≈ 0,8 × con r5 aunque el oro lo limite (130 000/h ÷ 7 500 ≈ 17 grabados/h entre 6 ranuras). En los dos casos > 0,5.
3. La frase de §4.11 («la escasez que se mide es la de aspectos y rangos nuevos») es una postura válida, la de D4 (en D4 el Ocultista graba aspectos del Códice sobre Raros, y el aspecto no se gasta [S]), pero entonces O1, IT7 y `test99` deben decir eso mismo, y hoy dicen otra cosa.

**Arreglo (concreto):**
- **(a) Obligatorio, coherencia de reglas:**
  - IT7: «ninguna fuente pagada con oro da más de 0,5 × matar en **bases Raro+ por ranura y hora**; **la apuesta**, además, ≤ 0,5 × matar en legendarios por ranura y hora; **el grabado queda fuera de esa cuota** porque solo copia un aspecto que ya está en el Códice; ninguna fuente da **aspectos o rangos nuevos** por hora fuera de la meta».
  - `test99`: cambiar «ninguna receta sube rareza pagando solo oro» por «ninguna receta pagada con oro **crea un aspecto o un rango** que no esté en el Códice, ni sube Común → Mágico → Raro; Grabar exige un aspecto del Códice y una ranura con aspecto». El grep de §12.3 se queda.
  - §4.11 y O1: escribir la consecuencia: tras ≈ 10–12 h (los 6 aspectos de la build a r5) un legendario que cae vale su Polvo y su aspecto o rango **si es nuevo**; la persecución pasa a la base (◆, líneas y pasos), los Únicos y los Míticos.
- **(b) Elegir una y escribirla en §4.11:**
  - **(b1) Discrepancia declarada:** no se pide material escaso al grabar en un Raro. Razón: no crea poder nuevo (copia el Códice) y es el modelo del Ocultista de D4. Fuente: Fextralife, *Occultist* («imprint a Legendary Aspect onto a Rare or Legendary item»).
  - **(b2) Recomendada, si el dueño quiere que el naranja siga contando:** grabar sobre un **Raro** cuesta 1 500·r de oro **+ 5 de Polvo** (lo que da desguazar un legendario); reemplazar el aspecto de un Legendario sigue en solo oro. Es la idea del Cubo de D4 LoH (Raro + Polvo Primordial) sin su azar. Añadirlo a los sumideros de Polvo de §4.13; la regla «Polvo sin topar antes de la hora 20» se cumple con más holgura.

### INV-B-2 · Determinismo y autoridad de la escalera — **DISCREPANCIA ACEPTADA**

**Qué hay:** `origen` solo informativo, y firmado por el servidor (HMAC) si algún día hiciera falta; `killLootRng` por contador (hash de la clave, sin depender del orden de las muertes); el alcance del determinismo queda limitado a crafteo, apuesta y botín por muerte, y **ninguna regla valida una carrera por semilla** (§8, R19). Las citas del código son correctas: stream `'loot'` en el orden de las muertes (`main.js:1231-1233`), paso variable (`main.js:1545`).

**Discrepancia (punto 1, servidor que tira el botín):** se sostiene. El Paso 6, aprobado por el dueño, fija **F2 «de honor»** (el servidor da la semilla y mide el tiempo; el cliente simula) y **F3 verificada con build fija** (el DO re-simula con matemática determinista); el modelo A, con el héroe solo en el servidor, es F4 (`paso6-multijugador-diseno.md:739-756`). Con build fija, los ítems no entran en el ranking verificado, así que el Paso 4 no tiene por qué ser autoritativo.

**Nota (no bloquea):** `paso6` línea 110 sigue diciendo «la grieta se puede reproducir» solo por `killLootRng`. El diseñador lo anotó; hay que avisarle a ese diseño.

### INV-B-3 · Pila de crafteo — **DISCREPANCIA ACEPTADA**

**Qué hay:** MVP cerrado en §4.9: mejora con remate ★ (= «Calidad con remate»), re-tirada de una línea elegida que desde la primera se bloquea a esa línea (= «Reforjar dirigido con bloqueo»), grabado del Códice con rango y **Afinar**. Templado, sellos, Talismán, cubo y encantadora, fuera; criterio de entrada medido por `loot-bench` (§12.4, R18). Afinar es la 4.ª capa, pero la propuso el mismo experto (R2-B-3, punto 2). El engarce ◇ sustituye a gemas y huecos y no suma una capa. El filtro va aparte (E3).

**Discrepancia (palabras rúnicas como única capa «D2»):** aceptada. P4-D7 está aprobada y hay una razón estructural que el documento no escribe: con **un solo ◇ por pieza y el tope duro de 4 líneas** (§4.3), una palabra rúnica necesita bases con varios huecos, que es un eje nuevo. Entra, si acaso, por §12.4 después de E4b.

**Ajuste menor:** la «Pregunta nueva de la v4.1» de §14 no trae recomendación. Como el dueño respondió «acepto todas las recomendaciones», conviene escribirla: «Recomendado: se van (incompatibles con el ◇ único y el tope de 4 líneas)».

### R1-B-1 · Principal adaptable asimétrico — **OK**

`mainGear` solo entra en `mainMult` (§4.4, P4-D5, §5), el Principal solo está en el arma y los guantes, y `test93` afirma el mismo Δ de `mainMult` en las 3 clases. `mainStatMult` es lineal (`combat-math.js:161`), así que el Δ absoluto es el mismo en las tres. El problema existe hoy: `critRaw = 5 + a.des·0,15` y `arm = item.arm + a.des·0,3` leen el atributo con equipo (`entities.js:917, 935`). Que el crítico de la Destreza **de nivel** se quede es una decisión de clase (E4b, §12.4).

### R1-B-2 · Topes con todas las fuentes — **INSUFICIENTE**

**Qué pedía:** el crítico por clase y con la build típica (base + atributos + **talentos** + **tablero** + equipo), ≤ 55 con el óptimo; si no se cumple, rendimientos decrecientes en vez de un tope que deja líneas muertas; y la vida al golpear frente a la cubeta.

**Qué hay:** la tabla por clase con c13 a rango 2 (+10) [V: `talents-*.js` c13, builds con `c13: 2`], Eras de crítico bajadas a +7, IT3 con talentos, tablero y Era, y la vida al golpear frente a la cubeta (14 % con una línea). **La parte de la vida al golpear está bien:** se aplica una vez por área, no por enemigo (`game-skills.js:1250`), así que no se multiplica en grupos.

**Por qué no alcanza:** la tabla solo suma `stats.crit`, pero la tirada usa `critChance(critRaw, cb)` con **`cb` = crítico condicional** de las claves `tv` y los poderes `condCrit` (`entities.js:1031-1038`; tope 60 tras todo, `combat-math.js:45, 169`). Esas fuentes están **en todas las builds recomendadas** de 5 especializaciones, y además el tablero está mal contado:

| Fuente omitida | Valor | Código |
|---|---|---|
| Tablero: 3 nodos mágicos del brazo ofensivo (+1 cada uno) | Guerrero **7** (no 4) · Maga **9** (no 6) · Arquera 12 (estos sí se contaron) | `paragon-board.js:24,29,33,38,53` |
| Francotiradora: Concentración llena (innata) | +15 (0,15 por punto) | `mech-arquera.js:28,118` |
| Piromante: Calor Abrasador, s2 r3, en todas sus builds | +15 contra objetivos en llamas | `talents-maga.js:145` |
| Crionte: Filo Helado, i2 r3, en todas sus builds | +15 contra ≥ 3 capas | `talents-maga.js:211`; `powers-maga.js:195` |
| Arcanista: Resonancia, a16 r2, en sus 2 builds | +12 con 4 Cargas | `talents-maga.js:311`; `mech-maga.js:42` |
| Guerrero: Desequilibrio, c20, en la build del Berserker | +10 en gastadoras contra ralentizados | `talents-guerrero.js:95`; `powers-guerrero.js:83,1131` |
| Maga: Escarcha Arcana, c20, en 3 de 4 builds del Crionte y en la del Rayo | +15 al Dardo contra ralentizados | `talents-maga.js:107`; `powers-maga.js:151,1510` |

**Óptimo del Nv100, en su estado normal de juego** (base 5 + Destreza de nivel + c13 10 + tablero corregido + anillos 9,3):

| Especialización | Sin Era | Con Era +7 | Habilidad principal |
|---|---|---|---|
| Berserker | 32,8 | 39,8 | Rajar contra ralentizados (+10 +15): **57,8** · con Era **64,8** |
| Piromante | 49,8 | **56,8** | — |
| Crionte | 49,8 | **56,8** | Dardo contra ralentizados: **64,8** |
| Arcanista | 46,8 | 53,8 | Rayo (+20): **66,8** · con Era **73,8** |
| Francotiradora | **62,8** | **69,8** | — |

Cuatro especializaciones pasan de 60 en su habilidad o estado principal, la Francotiradora **sin Era**, y tres incumplen el «global ≤ 55». Es lo que anunciaba el experto («en una build real pasa de 70»). Las frases del documento que afirman lo contrario son falsas: §0 p.6 («ninguna clase pasa del 48 % … ni del 55 %»), §4.4 («el anillo no muere»), P4-D21 e IT3. Bajar las Eras a +7 no arregla nada de esto.

**Arreglo (concreto):**
1. **Rehacer la tabla de topes por especialización (9 filas)** con las fuentes de arriba en su estado normal (Concentración llena, 4 Cargas, ≥ 3 capas, objetivo en llamas o ralentizado), más el crítico de una habilidad y la Era. Corregir el tablero a G 7 / M 9 / A 12 en `calc-r2.mjs` (`CLS.board`) y en §4.4.
2. **Activar ya el plan B, en el contrato de E0.1** (`combat-math.js`, de W1): **el crítico por encima de 60 no se pierde, se convierte en daño crítico**, ≈ +2 % por punto sobrante (equivalencia en el borde: con c = 60 % y Σ[+] ≈ 100 %, 1 punto de crítico ≈ 1,9 puntos de daño crítico). Constante `CRIT_OVERFLOW_CD`, que E4 mide. Así ninguna línea de crítico muere, ninguna especialización de hoy pierde DPS (el sobrante hoy no da nada) y vale para fuentes futuras (R20). Alternativa, la que propuso el experto: rendimientos decrecientes `c ≤ 45 → c; si no, 45 + 0,5·(c − 45)`, con el tope 60 en c = 75 (el peor caso, 73,8, queda en 59,4). Esta baja el DPS de hoy de la Francotiradora y del Arcanista.
3. **IT3 nuevo:** «con el óptimo y todas las fuentes en estado normal, por especialización, cada línea de crítico conserva ≥ 80 % de su Δ⚡ marginal», medido en la tirada (`critChance(critRaw, cb)` con `condCrit`, `tv` y `verbStats`), no en `stats.crit`. `valuation.js` y `calc-r2.mjs` usan la misma función.
4. **Las Eras vuelven a +12/+10** (sin el sobrante perdido no hace falta tocarlas). E2b deja de tocar `data.js` y se quitan del alcance la fila de §4.12, la aserción «Eras de crítico ≤ 7» de `test99` y la fila de `data.js` de §12.2.
5. **Rehacer IT6** con el crítico por especialización. La afinidad «daño crítico» se extenderá a las especializaciones con crítico condicional (no solo a la Arquera), y hay que corregir la frase «Guerrero y Maga sin afinidad (0,94–0,95)».

### R1-B-3 · `GEAR_K` y el impacto en §10 — **INSUFICIENTE**

**Qué hay (bien):** `GEAR_K = 1,69` sobre la media, y la tabla del arma de §10 es correcta. La comprobé con `items.js:210-213` (lo = 3·G·statMult·(0,85–1,15), hi = lo·(1,5–1,9), media ≈ 1,35·lo) y la calidad del arma ×(1 + 0,06·q) (`entities.js:911`): 45,9 / 62,9 / 91,9 / 125,8. El Aguante aparece como cuotas y la vida típica del Nv70 = hoy.

**Por qué no alcanza:** la objeción era que «E4 arrancaría con una diferencia sin saberlo». Ahora la diferencia es **mayor y conocida, pero nada la vigila**: el arma típica del Nv70 sube **+56 %** frente a hoy (`ILVL_MAX` 40 → 47; hoy el equipo se queda en il40 desde el Nv58, `combat-math.js:138` y el comentario de :550-553) y el óptimo **+33 %**. IT1–IT7 son todas **relativas** (cuotas frente a blancos que llevan el mismo implícito, ritmos, paridades): pasarían con un +56 % de DPS. Y E4 «solo ajusta constantes de ítems hasta que IT1–IT7 queden en banda». El salto le llegaría a E4b como sorpresa. Además, §10 no da el **DPS total ni el Aguante total frente a hoy** en los Nv50, 70 y 100, como pedía el experto: solo el arma y la vida del Nv70.

**Arreglo (concreto):**
1. §10: añadir la tabla **«frente a hoy»** con el DPS total y el Aguante total (vida, armadura frente a K = 60·G(AL), RD) del típico y del óptimo en los **Nv50, 58, 70 y 100**, con `calc-r2.mjs` más un perfil «hoy» (il ≤ 40, statMult 1,25/1,5, calidad, afijos actuales).
2. Regla **IT0 (anclaje)** en E4, antes del rebase de `PENDING_E4B`: «el típico del Nv50 = hoy ±10 % en DPS y Aguante; del Nv58 al 70 el TTK de un élite de su AL queda en la banda del banco de hoy ±15 %».
3. Decidir y escribir en P4-D2 y R5 quién absorbe el ×1,55 del arma entre el Nv58 y el 70 (lo que IT2 pide). Opciones: (a) es intencional (hoy el héroe se queda atrás de G(AL) entre 58 y 70) y E4b recalibra clases con un número declarado; (b) se compensa en la curva de vida enemiga de AL 40–47. Sin esto, la decisión aprobada (`ILVL_MAX` = 47) tiene un efecto de balance que no se le explicó al dueño.

### R1-B-4 · ⚡ y veredicto — **OK**

⚡ = 100·(D/D₁)^w·(A/A₁)^(1−w) con referencia fija (desnudo Nv1) y w por rol (0,6 / 0,55 / 0,5 / 0,45), y **una sola regla** con g = Δ⚡ para la celda, el tooltip, el orden y el ⚡ (§6, P4-D17, `test95`). Rehíce los ejemplos: +27,6/−3,2 → +14,2 % (▲▲); −2,2/+9,2 → +2,2 % (▲); +10/−7 → +2,9 % (↔); +1/−1 → +0,2 % (≈); el de la v3, +31,5/−6,3 → +14,8 % (▲▲). Las condiciones de ▲ y ↔ son complementarias con g ≥ T. El «◆ medio» está en el muñeco.

### R1-B-5 · Unidad de presupuesto — **OK**

La unidad es «una línea al paso 5 y ◆52», con paridad medida en ⚡ (IT6 por clase y eje; IT6b por pool). La Amatista solo encaja en el arma y los guantes, y las gemas de una ranura quedan a ±20 %. La tabla de IT6 del Nv70 sale de `out-r2.txt` (la reproduje comparando cada línea con la mediana de su eje: Principal 1,08, Vida al golpear 1,18, etc.).
**Nota menor (no bloquea):** la lista «fuera de banda» de §4.4 omite la Vida al golpear en el Nv50 (1,24–1,26 en las 3 clases) y en el Nv100 del Guerrero (1,23). Tras el arreglo de R1-B-2, la tabla de daño crítico cambia.

### R1-B-6 · Economía y horas — **OK**

§4.13 trae las fuentes y sumideros por hora, metas en horas (2–4 / 12–20 / 40–60 h), el precio de la apuesta atado a matar e IT7. Los números cuadran con `out-r2-econ.txt`: mejora de todo el equipo 176 605 (1,4 h), Afinar 38,1 h, techo 41,5 h, apuesta 27 957, Polvo 1 650 (10 h) y Perfectas 7,1–9,5 h. La contradicción del grabado con IT7 está en INV-B-1.

### R2-B-1 · El ◆ ordena — **OK**

El valor depende solo del ◆: G para las planas y 1,035^◆ para las % y el Principal (§4.2, P4-D4, `test92`). El modelo da 8,59 = 8,59 y ◆6 = 20,5 % del tope. Es coherente con el ◆ efectivo, la sincronización `mín(◆, NOz + 2)` y la gema sin nivel.

### R2-B-2 · Cobertura de aspectos — **OK**

6 ranuras con aspecto (P4-D25), las dos «V» en habilidades distintas (regla 2) y `test-aspects-cobertura` por configuración con emparejamiento bipartito. Comprobé los ids (`g_rajar_ii` :492, `g_u_furia_ii` :502, `k_lanza_ii` :827, `m_u_tormenta_i` :834), que el Dardo Arcano está en la barra del Crionte (`skills-maga.js:899`, así que «del Vendaval» y Dardo Gemelo son útiles) y que Piel de Hierro está en las 3 barras del Guerrero (`skills-guerrero.js:600-604`). Rehíce a mano los conteos por ranura del Berserker: 6 / 7 / 7 / 12 / 9.
**Nota menor (no bloquea):** ni `FORGE_RECO` ni las builds fijan la variante de Rajar del Berserker ni la de la Lanza del Crionte (`skills-guerrero.js:611`, `skills-maga.js:912`). «Rajar ii» y «Lanza ii» no son «la recomendada» del código. Que el test recorra **todas** las combinaciones de variantes de las 6 habilidades de la barra (≤ 3⁶ = 729 por especialización; es barato). Con Rajar sin variante, el Berserker queda en 11 útiles y ≥ 3 por ranura: sigue cumpliendo.

### R2-B-3 · Economía saturada — **OK**

Están los 7 puntos, adaptados a que la Esencia ya no existe: oro como única moneda de la Herrería (P4-D26); Afinar como sumidero sin tope, que nunca baja (P4-D28); apuesta a ≈ 0,5 × matar por ranura, con Raros a pasos ≤ 3 y sin ★; Tormento ⌊T/4⌋ (con `TORMENT_MAX = 10`, como mucho r2) más pasos 5 y ★ al caer; gemas como mucho Talladas; sin marca de agua, con la regla de WoW citada como es; tope de Polvo de 1 000 e IT7 «oro sin gastar ≤ 2 h». Que la apuesta cobre oro y no Esencia está justificado.

### R2-B-4 · Veredicto a potencial — **INSUFICIENTE**

**Qué hay (bien):** potencial con ⚒ (P4-D29), regla del peor eje, ▲▲, T = p95 del error de IT4, IT4 fuera de ±T y filtros con potencial. Comparar con **tu aspecto regrabado** y no con «el mejor del Códice» es correcto: es igual inversión.

**Por qué no alcanza:** «No se proyecta Afinar (es azar)». Pero Afinar es **el** sumidero del final del juego (38 de las 41,5 h del techo), así que en las horas 20–60 tus piezas estarán afinadas al paso 5 con ★. Lo que cae, proyectado a r5 y ★ media pero con sus pasos al azar (media 3), pierde ≈ 15–20 % solo por los pasos. Como IT6b deja los tipos de línea a ±20 % entre sí, **casi nada saldrá ▲ ni ⚒**, y «Útil para mí» y «Solo ▲» vuelven a esconder las bases que serían BiS tras afinar. Es el fallo (a) de la objeción, reintroducido por la corrección de R2-B-3 (Afinar). Además el argumento es incoherente: la ★ también es azar y sí se proyecta como «★ media»; y Afinar tiene esperanza cerrada (§4.9: «de media 5 tiradas por línea hasta el paso 5»).

**Arreglo (concreto):**
1. Potencial **a igual inversión en Afinar:** cada línea del candidato se proyecta al paso de la línea de tu pieza que ocupa su mismo puesto por valor, si es mayor que el suyo. Coste = esperanza del dado: para llegar al paso q hacen falta 5/(6 − q) tiradas (q = 5 → 5; q = 4 → 2,5), a 3 500·1,3ᵐ × factor desde m = `af` del candidato. Se mantiene «nunca un aspecto que no tienes».
2. La fila ⚒ añade el coste: «⚒ ▲ tras mejorar y afinar · … · afinar 2 líneas ≈ 117 000 oro (0,9 h)». Cabe en la misma fila (≤ 9 + 1).
3. `test95`: caso nuevo «tu pieza 5/5/5★ afinada frente a un candidato con mejor tipo de línea a pasos 3/3/3 → ⚒, con coste de afinar»; `pot.g ≥ g` se sigue cumpliendo. Actualizar el contrato `score().pot` con `steps` proyectados y `cost.afinar`.

---

## Errores altos introducidos por las correcciones

1. **INV-B-1 (v4.1):** `test99` («ninguna receta sube rareza pagando solo oro») e IT7 (grabado como fuente pagada con oro, ≤ 0,5 × matar en legendarios por ranura y hora) **fallan por construcción** con Grabar sobre un Raro (≈ 1,8 × matar con r1; ≈ 0,8 × con r5). Arreglo en INV-B-1.
2. **R2-B-3 → R2-B-4 (v4):** Afinar, introducido para la economía, no entra en el veredicto a potencial. En las horas 20–60 el ⚒ casi no aparece y los filtros vuelven a esconder las mejores bases. Arreglo en R2-B-4.

(La tabla de crítico de la v4.1 da cifras nuevas y falsas, pero es la misma objeción R1-B-2, no un error nuevo.)

## Mirada de MMORPG (WoW, FFXIV, Lost Ark, GW2)

- **Presupuesto por ranura:** pesos 1,0 / 0,75 / 0,70 / 0,5625 con el implícito fuera del techo y el techo en «líneas al paso 5 y ◆52». Es el *stat budget* por ranura de WoW con unidad medida en ⚡ (IT6b); bien. Las armaduras compiten solo entre Aguante y ✚, y la Vida al azar queda en 0,88–0,95 de su pool: ya no es impuesto.
- **ilvl:** el contrato del ◆ es coherente en todo el documento (valor, ◆ efectivo, sincronización, gema sin nivel, implícitos). El único cabo suelto es el salto absoluto frente a hoy (R1-B-3).
- **Crafteo y economía:** precios que crecen (Afinar 1,3ᵐ, ★ 1,5ᵏ, re-tirada 1,5ⁿ) en vez de topes semanales es correcto para un juego local sin comercio (FFXIV y WoW usan topes porque tienen mercado y calendario). El agujero es el grabado (INV-B-1).
- **Tooltip:** ≤ 9 filas + 1 fila ⚒, una marca por línea y Alt para el detalle. El arreglo de R2-B-4 cabe en la fila ⚒. El mockup sigue con el crítico +5 (lo declara la trazabilidad); tras R1-B-2 cambian también los veredictos de los héroes del mockup.

## Fuentes

- Código (`paso2-impl` 4095ab6): `js/entities.js:905-935, 985-995, 1000-1040`; `js/combat-math.js:44-46, 74, 123-138, 161, 169, 385-391, 540-560`; `js/paragon-board.js:21-63`; `js/mech-arquera.js:20-40, 118`; `js/mech-maga.js:37-42`; `js/talents-maga.js:84, 107, 145, 211, 302, 311` y sus `builds`; `js/talents-guerrero.js:72, 95, 133, 317-330`; `js/talents-arquera.js:67`; `js/powers-guerrero.js:83, 1128-1131`; `js/powers-maga.js:151, 195, 1510, 2134, 2610`; `js/items.js:8-12, 210-216, 457`; `js/economy.js:249-254, 334-358`; `js/main.js:1229-1234, 1282-1286, 1543-1546`; `js/data.js:419-427`; `js/game-skills.js:1250`; `js/skills-guerrero.js:490-503, 599-611`; `js/skills-maga.js:820-836, 896-912`.
- `docs/diseno/paso6-multijugador/paso6-multijugador-diseno.md:108-112, 739-756, 830-834` (F2, F3, D4 aprobados).
- Maxroll, *Horadric Cube* de D4 (actualizada el 14-oct-2026): Raro → Legendario = 1 Raro + 1 Pure Primordial Dust + 10 Raw Primordial Dust, «with a random Legendary power». https://maxroll.gg/d4/resources/horadric-cube
- Fextralife, *Occultist* (D4): «imprint a Legendary Aspect onto a Rare or Legendary item … comes with a high cost». https://diablo4.wiki.fextralife.com/Occultist
- Icy Veins, prioridad de stats de WoW 12.0.5 (rendimientos decrecientes por peldaños, «not hard caps»), citada por el experto. https://www.icy-veins.com/wow/demonology-warlock-pve-dps-stat-priority
