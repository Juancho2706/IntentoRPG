# Frente «actual»: auditoría de ítems, inventario y stats (Paso 4) — v2

**Fecha:** 22 de octubre de 2026 · **Rama:** `paso2-impl` (4095ab6) · **Método:** solo lectura del código.
**Versión:** v2, corregida tras la refutación de dos expertos (itemización de MMO y multijugador). Los cambios están en el §11.

No corrí tests, servidores, humo ni Chrome, y no edité el repo. En la v1 hubo una excepción involuntaria: un `node -e "import('./tests/balance-bench.mjs')"` que solo cargó el módulo. El banco tiene la guarda `isMain` (`tests/balance-bench.mjs:741`), así que no simuló nada. En la v2 no ejecuté nada: **todas las cifras nuevas están calculadas a mano desde el código** y llevan la fórmula al lado para que el banco las confirme.

**Límite de la investigación web:** el cupo de `WebSearch` («200 WebSearch calls shared by every agent») se agotó en la v1. En la v2 rindió 2 búsquedas antes de agotarse otra vez. El resto lo leí con `WebFetch` directo (§10). Lo que solo vi en el extracto del buscador va marcado **(vía buscador)**, y lo que es conocimiento general sin URL, **(sin fuente verificada en esta sesión)**.

---

## 0. Resumen ejecutivo

1. **El sistema de ítems es amplio pero plano.** Tiene 5 rarezas, 16 afijos, 15 bases, 6 poderes legendarios, 3 conjuntos de 3 piezas, 6 gemas, 6 runas, 5 palabras rúnicas, charms, reliquias, míticos, Códice, Calidad 0–5, cubo, encantadora, apuesta, tienda y alijo. Vive en `js/items.js` (651 líneas), `js/economy.js` (717) y `js/game-endgame.js`.
2. **Una pieza ya tiene hoy de 10 a 12 ejes de progreso** (§1.11). El tooltip de un legendario normal ocupa **19–28 líneas** con la comparación (§1.12). La v1 de diseño los apilaba en vez de fundirlos; el punto de partida ya está por encima del tope de 3 ejes que propone el revisor.
3. **El vocabulario de stats del Paso 2 va muy por delante del de ítems.** `recompute` maneja **42 claves** (`js/entities.js:755-780`) y los afijos cubren **16**.
4. **Hoy no hay presupuesto por objeto:** todo se suma encima (rareza, ★, Calidad, gemas, palabra rúnica, conjunto). Una misma línea de «% Daño» va de +5 a +29 según rareza, ★ y Calidad (§4.14).
5. **Qué parte del poder viene del equipo** (estimación a mano, §2.1, Guerrero Nv100, hoja sin habilidades):
   - Los **afijos** de un juego de raros ≈ **42 %** del DPS de hoja; de legendarios ≈ **55 %**, y **≈ 61 %** con el poder `furia`.
   - Con el **daño implícito del arma** dentro, el equipo es el **≈ 97 %** (puños 4,5 frente a 59 de un arma rara il40).
   - Una sola **bendición** de grieta 27 (+62 % de daño) aporta **más que todas las líneas de daño** de un juego de raros (+32 %).
6. **Bugs confirmados** (§3):
   - Avaricia da el hallazgo mágico dos veces (+60 en vez de +30).
   - Pasar el ratón por un objeto te recorta la vida y el recurso.
   - Las gemas suben de nivel sin tope (2 gemas baratas = +3 ilvl, gratis).
   - Los glifos caen por encima del rango 10.
   - Las gemas se pierden en silencio al vender, extraer o transmutar.
   - El mítico pierde su 2.º poder al extraerlo.
   - «Maná máximo» agranda la Furia sin tope.
   - «Maná al golpear» muestra +29 y aplica 2.
   - **Nuevo:** hay **tres** medidas de «poder» que se contradicen, y el «+N ⚡ Poder» flotante **salta con cada buff temporal** (Ímpetu, santuarios…), no solo al mejorar el equipo.
   - **Nuevo:** bendiciones, tablón, tienda, apuesta, cubo y encantadora tiran con `Math.random`, fuera del azar con semilla.
7. **Las bendiciones crecen sin tope** con el nivel de grieta, que tampoco tiene tope. El banco «óptimo» asume **grieta 27 al Nv100**, con enemigos de **~26×** la vida de uno de AL 50 (§1.9). Probablemente es optimista.
8. **El tope de ilvl 40 congela el equipo desde el Nv≈58.** Hay números de las dos opciones en el §2.2:
   - **Opción A** (`ILVL_MAX` 50) deja el tramo 70 → 100 un ~15 % más fácil, porque `AREA_LEVEL_LATE` se calibró **con el equipo congelado**. Para compensarlo hay que llevar el Nv100 a AL ≈ 57.
   - **Opción B** deja sin progreso de equipo el tramo **58 → 70**, donde la vida enemiga sube ×1,84. Las capas no transferibles tendrían que cubrirlo.
9. **No hay nivel requerido ni progreso de cuenta.** Solo el alijo es de la cuenta; el Códice, la Calidad, las bendiciones y el Tormento son de cada héroe. Los afijos en % **no tienen dimensión de ilvl**: un il1 puede sacar +13 % de daño, igual que un il40. Por eso una sincronización hacia abajo no podría toparlos sin tablas nuevas (§1.3).
10. **Se puede conservar mucho** (§6):
    - La matemática de combate.
    - El azar con semilla del botín y la versión por objeto (`sv`).
    - Las balizas, el filtro y la bolsa de materiales.
    - Las 641 piezas del fixture.
    - Sobre todo, el vocabulario `fx` de los talentos, que sirve casi tal cual para los aspectos.

---

## 1. Qué existe hoy (inventario con números)

### 1.1 Rarezas y generación (`js/items.js:7-13`, `:166-274`, `:525-563`)

| Rareza | Afijos principales | Secundarios | `statMult` | Peso | Extra |
|---|---|---|---|---|---|
| Normal | 0 | 0 | ×1,0 | 82 | engarce 8 % |
| Mágico | 1–2 | 0 | ×1,1 | 15 | engarce 20 % |
| Raro | 3–4 | 1 | ×1,25 | 2,2 | engarce 35 % (1–2 huecos) |
| Legendario | 4–5 | 1–2 | ×1,5 | 0,3 | 1 poder de 6 + engarce 50 % (2–3 huecos); cae sin identificar |
| Conjunto | 2 fijos por pieza | — | (arma ×1,35) | aparte | cae sin identificar |

- **Afijo superior ★:** un 8 % por línea (salvo en normales); vale ×1,5 (`items.js:227-231`).
- **Bonus de rareza:** `min(2, (piso−1)·0,10) + mf·1,6`. **No toca el peso del normal** (`items.js:166-181`, `:536`).
- **El poder legendario sale uniforme entre 6** (`pick(LEGENDARY_POWERS)`, `items.js:252`), sin sesgo de clase. El `classHint` solo filtra la base de armas y manos izquierdas (`items.js:189-192`).

**Ritmo de legendarios por enemigo común**, calculado con `rollDrops` y `main.js:1235`:

| Contexto | Reparto N/M/R/L | Prob. de objeto | ≈ 1 legendario cada |
|---|---|---|---|
| Piso 21, sin hallazgo mágico | 61,0 / 33,5 / 4,9 / **0,67 %** | 18 % | **~860 comunes** (0,18 × 0,96 × 0,0067) |
| Tormento 10, piso 21 (mf +120, cant. +80) | 48,8 / 43,9 / 6,4 / **0,88 %** | 32,4 % | **~370 comunes** (0,324 × 0,946 × 0,0088) |
| Grieta 10 (piso 36; mf +180, cant. +145) | 44,3 / 47,7 / 7,0 / **0,95 %** | 44,1 % | **~260 comunes** (0,441 × 0,905 × 0,0095), más 1 seguro y 0,6 esperado del jefe de grieta |

- **Élite:** 1 objeto seguro + 30 %.
- **Jefe de piso:** raro o legendario seguro, con P(legendario) = `min(0,6, (0,06+0,015·piso)·(1+mf·0,5))`, que da 37,5 % en el piso 21.
- **Jefe de grieta:** 1 legendario garantizado (`main.js:1285`), además de su `rollDrops`.
- **Conjuntos:** a grieta alta son casi el 10 % de los objetos: `(0,008+0,0015·36)·(1+1,8·0,3)` ≈ 9,5 %.

### 1.2 Afijos: los 16 de `AFFIX_POOL` (`items.js:43-61`), valores de un raro

**Escalado:**
- Los afijos planos (`hp`, `mp`, `arm`, `lph`, `mph`, `thorns`) se multiplican por `G(il) = 1,065^(il−1)`: G(20) = 3,31 y G(40) = 11,66.
- Los atributos se multiplican por `1 + 0,12·(il−1)`: ×3,28 en il20 y ×5,68 en il40.
- **Los porcentajes (`flat: true`) no escalan con el ilvl** (`combat-math.js:147-150`). Un raro il1 y uno il40 tiran el mismo +5–13 % de daño. Para el diseño importa por dos razones: el % no da sensación de progreso al subir de nivel, y no hay tabla por ilvl con la que topar en una sincronización (§1.3).
- Encima va el ×1,25 del raro.

**Pool:** 12 principales y 4 secundarios. Un raro saca 3–4 de 12, así que **P(un stat concreto en una pieza) ≈ 29 %**; en un legendario es 4–5 de 12, ≈ 37,5 %.

| Afijo | Base | il1 | il20 | il40 | Nota |
|---|---|---|---|---|---|
| Fuerza / Destreza / Vitalidad / Energía | 1–3 | 1–4 | 4–13 | **8–21** | El principal es su **propio multiplicador** (+1 %/punto, `combat-math.js:75`) |
| Vida | 5–12 | 6–15 | 21–50 | **73–175** | La vida base del Guerrero Nv50 sin equipo es ≈457 |
| Maná máx. | 4–10 | 5–13 | 16–41 | **59–146** | Su valor real cambia con la clase (tabla de abajo) |
| Armadura | 3–8 | 4–10 | 13–33 | 44–116 | K(área 40) = 700 → 50 % de reducción con 700 de armadura |
| % Daño | 4–10 | 5–13 | 5–13 | 5–13 | No escala |
| % Crítico | 2–5 | 3–6 | 3–6 | 3–6 | Tope del 60 % |
| % Vel. de movimiento | 4–8 | 5–10 | = | = | Tope del 50 % |
| % Vel. de ataque | 4–9 | 5–11 | = | = | Tope del 100 %; **solo acelera el básico** (`game-skills.js:1594`, `:2160`) |
| % Hallazgo mágico | 5–12 | 6–15 | = | = | Ocupa presupuesto de combate |
| Vida al golpear (sec.) | 1–3 | 1–4 | 4–13 | 15–44 | Va por la cubeta de sustento (6 % de la vida/s) |
| Maná al golpear (sec.) | 1–2 | 1–3 | 4–9 | 15–29 | **Topado en 2** (`CAPS.mph`) |
| % Reducción de enfriamiento (sec.) | 3–7 | 4–9 | = | = | Tope del 50 % |
| Espinas (sec.) | 2–5 | 3–6 | 9–21 | 29–73 | Solo cuerpo a cuerpo |

**Afijos muertos o trampa según la clase** (`entities.js:920-935`, `resources.js:39-44`):
- La **Fuerza** no hace nada en la Maga ni en la Arquera.
- La **Energía** solo agranda el Maná: no hace nada en el Guerrero ni en la Arquera.
- La **Destreza** sirve a todos (+0,15 % de crítico y +0,3 de armadura por punto), pero como principal solo en la Arquera.
- `STAT_DESC` miente en las tres clases (`data.js:603-608`). Dice «Fuerza: aumenta el daño físico» y «Energía: … el daño de hechizos», y ninguna de las dos hace eso fuera de su clase.

**«Maná máx.» il40 de un raro** (media ≈ 102):

| Clase | Pozo sin el afijo | Con +102 | Valor real |
|---|---|---|---|
| Guerrero (Furia) | 100 | **202** | +102 %, sin tope, en contra del diseño de «pozo fijo» (`combat-math.js:53-57`) |
| Maga (Maná, Nv50, Ene ≈ 79) | 100 + 2·79 + 3·49 = 405 | 507 | +25 % |
| Arquera (Energía) | 60 | **80** | solo cuentan 20 (`itemCap`); el **80 %** del afijo se pierde |

### 1.3 Bases, ranuras y nivel requerido (`items.js:15-40`, `:205-219`)

- **Ranuras:** hay 12 (`weapon`, `offhand`, `helm`, `shoulders`, `chest`, `gloves`, `belt`, `pants`, `boots`, `amulet`, `ring`, `ring2`).
- **Todas las ranuras tienen el mismo presupuesto de afijos:** 3–4 en un raro, y el arma también. **El arma además lleva el daño implícito**, que multiplica todas las habilidades («arma × coef», `combat-math.js:10`), así que hoy cuenta dos veces. `itemPower` pondera el daño del arma ×2 (`ui.js:2551`) y el banco ×6 (`bench-core.mjs:75`).
- **Bases:** 15 grupos de nombres. **El tipo de base es solo cosmético:** no hay velocidad ni implícito por base.
- **Arma:** `lo = 3·G·rareza·U(0,85–1,15)` y `hi = lo·U(1,5–1,9)`. La tirada de la base **no se ve** en el tooltip.

  | Arma il40 | Daño medio |
  |---|---|
  | Puños (sin arma) | 4,5 (Guerrero) |
  | Rara | ≈ 59 |
  | Legendaria | ≈ 71 |
  | Legendaria de Calidad 5 | ≈ 92 |

  Entre la peor y la mejor rara del mismo ilvl hay ×1,56 de daño.
- **Armadura:** `2·G·rareza`, con estos multiplicadores por pieza:

  | Pieza | Multiplicador |
  |---|---|
  | Pecho | ×1,5 |
  | Mano izquierda | ×1,3 |
  | Cinturón y guantes | ×0,7 |
  | Joyería | sin armadura |

- **El escudo se detecta por texto:** icono «🛡️» o nombre con «escudo» (`entities.js:43-45`). De eso depende el bloqueo innato del Guardián (`entities.js:873`).
- **No hay requisito de nivel ni de clase para equipar** (`economy.js:158-173`; no existe ningún `reqLevel` en `js/`). Con el alijo compartido, un héroe Nv1 puede equiparse un il40.
- **Fórmula disponible para un nivel requerido «blando»**, sin bloquear el objeto (lo pide la objeción M6/nivel requerido):

  `ilvl efectivo = mín(ilvl, itemLevel(areaLevelForHero(Nv)) + k)`

  | Nv del héroe | 1 | 10 | 20 | 30 | 40 | 50 | 55 | ≥ 58 |
  |---|---|---|---|---|---|---|---|---|
  | AL del héroe (`combat-math.js:557-562`) | 1 | 9 | 19 | 25 | 30 | 36 | 38 | 40 |
  | Tope con k = 3 | 4 | 12 | 22 | 28 | 33 | 39 | 40 | 40 |

  - Con k = 3 no frena el juego normal: la Cripta del Nv1 es el piso 3.
  - Sí frena a quien baja muy por encima de su nivel, al estilo del level sync de FFXIV: «its attributes are capped according to the target item level» (§10).
  - **Problema:** los % no tienen escala por ilvl (§1.2), así que hoy solo se pueden reescalar arma, armadura, planos y atributos. Topar los % exige una tabla de techo por ilvl, que el frente de diseño tiene que crear.
- **Arte:** emoji en la UI (`ui.js:2431`). Hay iconos `eq_*` para 10 de las 12 ranuras; hombreras y pantalones no tienen (`hud-model.js:123-126`).

### 1.4 Legendarios, reliquias, míticos y Códice

- **Poderes:** 6 en `LEGENDARY_POWERS` (`items.js:95-102`), registrados en `powers-common.js:98-147`.

  | Poder | Efecto |
  |---|---|
  | `furia` | [×] 1,15 con vida > 80 % |
  | `festin` | 6 % de la vida al matar, por la cubeta |
  | `volatil` | Explosión del 50 % del golpe medio |
  | `multidisparo` | +1 proyectil |
  | `agil` | Esquiva −1,2 s |
  | `avaricia` | Hallazgo mágico +30 y oro ×1,5 |

  `powers` es un `Set`: **dos piezas con el mismo poder no se suman** (`entities.js:805`).
- **Probabilidad de un poder concreto:** 1/6 por legendario, sin protección contra la mala suerte (no hay ningún contador de «pity» en `js/`).
- **Reliquias** (`items.js:323-345`): 4 amuletos de jefe con poder y stats fijos escalados. Caen con un 12 %·(1+mf) (`main.js:1243`).
- **Míticos** (`items.js:487-498`): legendarios con 2 poderes de los 6 y afijos ×1,4. Solo los suelta el Pináculo.
- **Códice** (`game-endgame.js:95-134`): es **de cada héroe**, no de la cuenta.
  - Extraer consume el objeto y guarda el poder.
  - Grabar cuesta `(300+40·il)·(1+0,25·calidad)` oro (1900 en il40) y convierte **cualquier** objeto, blancos incluidos, en «legendario».

### 1.5 Conjuntos, gemas, runas, palabras rúnicas y charms

- **Conjuntos** (`items.js:64-92`, `:297-320`):
  - 3 conjuntos de 3 piezas con bonos **fijos que no escalan con el ilvl**. El Lobo de 3 piezas da +30 de vida (~3 % en el Nv50) y +12 % de velocidad de ataque.
  - Caen **sin pista de clase**.
  - Probabilidad: `0,008 + 0,0015·piso` (4 % en el piso 21; ~10 % en grieta alta, §1.1).
- **Gemas** (`items.js:277-294`): 6, con escala lineal `base·(1+0,2·(il−1))`. Un rubí il40 da 70 de vida.
  - Fundir 3 iguales da **ilvl = máx. + 3, sin tope y gratis** (`economy.js:326-331`).
- **Runas** (`items.js:348-355`): 6, con stats planos mínimos, ponderadas 30/25/20/12/8/5.
- **Palabras rúnicas** (`items.js:357-363`): 5, con orden exacto y stat **fijo**. Bastión da +20 de armadura y +25 de vida, cuando K(área 40) = 700. Los stats de las runas **se suman** a los de la palabra.
- **Charms** (`items.js:413-431`):
  - Escalan con la fórmula lineal vieja `1+0,15·(il−1)`.
  - Cuentan **todos** los de la mochila, **sin tope** (`entities.js:789-791`).
  - Caen con un 1,2 %·(1+mf).
- **Engarce:**
  - Tope: arma y pecho 3, joyería 1, el resto 2 (`items.js:579-583`).
  - Abrir un hueco cuesta 1 objeto + 2 gemas + `400·(huecos+1)·(1+0,05·il)` oro.
  - **No existe desengarzar.**

### 1.6 Artesanía y economía (`economy.js`)

| Servicio | Regla | Coste en il40 |
|---|---|---|
| Calidad | 0–5, +6 % por rango a armadura, afijos y arma (`entities.js:798-801`, `:915`); el Tormento T la regala hasta ⌊T/2⌋ (`combat-math.js:133`) | Σ = **7200 oro** de 0 a 5 |
| Encantadora | Borra **un afijo AL AZAR** y tira otro (`items.js:390-403`) | 3200, 4800, 6400… (+50 % por uso) |
| Cubo | 3 de una rareza → 1 de la siguiente; 3 legendarios → reforja | 104 / 390 / 2080 / 3900 oro |
| Apuesta | 70 % mágico, 22 % raro, 8 % legendario, ilvl = Nv·0,8 | 40 + 12·Nv (~8000 oro por legendario en el Nv50) |
| Tienda | 4–7 objetos identificados, ilvl = Nv·0,8, cada 5 min | valor × 4 |
| Venta | `(5+4·il)·statMult·(1+0,5·nAfijos)`: legendario il40 ≈ 804 | — |

- **Ingreso:** `makeGold(40)` ≈ 169 por montón y 55 % por común, es decir, **≈93 de oro por común**. La Calidad 5 equivale a ~77 comunes.
- **Ningún servicio usa el azar con semilla:**
  - Tienda, apuesta, cubo y encantadora llaman a `generateItem` o `rerollAffix` sin `rng`, así que tiran con `Math.random` (`items.js:154`; `economy.js:20, 31, 347, 355, 419`).
  - Las bendiciones y el tablón de recompensas también (`game-endgame.js:26, 141`).
  - Va contra la regla de `CLAUDE.md` («`Math.random` solo para FX/UI») y pesa para la escalera (§7).

### 1.7 Inventario, alijo, filtro, comparador y progreso de cuenta

| Contenedor | Capacidad | Ámbito | Cómo funciona |
|---|---|---|---|
| Mochila | **32** | héroe | Lista plana sin tamaños. El 32 está **escrito a mano en 10 sitios** |
| Bolsa de materiales | 60 huecos (`materials.js:14`) | héroe | Las gemas apilan, pero **la clave de pila incluye el ilvl** (`materials.js:20`) |
| Alijo | **24** huecos | **cuenta** (los 3 héroes) | `localStorage['intentorpg_stash']`, sin versión; **importar una partida lo pisa** (`main.js:344`) |
| Cubo | 3 | héroe | — |

- **Lo único de cuenta** en `localStorage` es el alijo, las opciones y el registro diario (`main.js:85, 105, 326`).
- **Son de cada héroe:** el Códice, la Calidad, las bendiciones, el Tormento, el tablero y los glifos (`save-schema.js:57`).
- No hay ninguna base para una «marca de agua» de cuenta: habría que crear un almacén nuevo con versión.
- **Filtro de botín:** umbral por rareza (`main.js:699-702`, `:1680-1698`) y etiquetas en el suelo (`main.js:2088-2103`).
- **Comparador** (`ui.js:2546-2661`). Mezcla **tres medidas de poder** distintas (bug 3.13).

### 1.8 Cómo entran los stats (`Player.recompute`, `entities.js:747-976`)

**Orden de suma:**
1. Charms.
2. Equipo identificado: armadura × calidad, afijos × calidad, gemas, runas, palabra rúnica y poderes.
3. Tablero.
4. Glifos.
5. Conjuntos.
6. Buffs.
7. Bendiciones.
8. Collar.
9. Talentos (`aggregateTalents` + `talentExtra`).
10. Innatas.
11. Era.
12. Poderes de talento y de forja.
13. `firePower('stats')`.

**`addStats` descarta en silencio las claves desconocidas** (`entities.js:782-786`). Por eso hoy un afijo `gaugeMax:coto` o `skillLv` no haría nada.

**Sacos de combate** (`combat-math.js`):
- `daño = arma × coef × (1+Σ aditivo) × (1+principal·0,01) × CRIT 1,5 × DEB (tope 1,5) × Π[×]`.
- **El `addPct` de habilidad (talentos, forja, soportes) entra en el mismo saco aditivo que el «% Daño» del equipo y lo diluye.**
- El saco [×] admite **como máximo 3 activos de ≤ ×1,3**; hoy solo hay 2 registros (`furia`, `m_berserk`).
- **Topes:** crítico 60, reducción de enfriamiento 50, vel. de ataque 100, movimiento 50, armadura 75, resistencias 70, reducción de daño 50, bloqueo 40, curación 50 y recurso al golpear 2.

### 1.9 Otras fuentes de stats que compiten con el equipo

| Fuente | Qué aporta |
|---|---|
| Tablero (`paragon-board.js`) | Abre en el Nv81 con 16 puntos: 1 legendario de stats (+10 % daño y +2 % crítico en el Guerrero; +6/+6 en la Arquera) y 2 zócalos |
| Glifos | `rango·per + adyacentes·adj + familia·famAdj`; `g_dmg` r10 ≈ 15–21 % |
| **Bendiciones** | `base + per·nivel de grieta`, **sin tope**, y la grieta tampoco tiene tope: cada jefe suelta la llave L+1 (`main.js:1286`) |
| Era | Hasta +15 % de daño o +12 % de crítico; «Bastión» da +80 de vida y +30 de armadura **sin escalar** (`data.js:419-427`) |
| Collar | Oro, hallazgo mágico o velocidad |
| Talentos | Pocos stats genéricos (crítico +10, vel. de ataque +14, daño +12 en la Arquera…); la mayoría van como `mod`/`tv`/[×] por habilidad |

**Valor de cada bendición según el nivel de grieta (L)**, con `data.js:583-597`. La grieta L usa el piso `16+2L` (`main.js:484`), así que la grieta 17 equivale al AL 50 del Nv100.

| Bendición | L 5 | L 10 | L 17 | **L 27** (banco, Nv100) | Comparación con el equipo il40 |
|---|---|---|---|---|---|
| `b_dmg` % daño | 18 | 28 | 42 | **62** | Las líneas de daño de un juego de raros suman ≈ 32 |
| `b_crit` % crítico | 9 | 14 | 21 | **31** | Las de crítico suman ≈ 16; el tope es 60 |
| `b_hp` vida | 90 | 150 | 234 | **354** | ≈ 3 líneas de vida de un raro (≈ 124 c/u) |
| `b_arm` armadura | 45 | 75 | 117 | 177 | K(AL 50) = 1314 |
| `b_aspd` % vel. de ataque | 16 | 26 | 40 | 60 | Tope 100 |
| `b_cdr` % enfriamiento | 10 | 15 | 22 | 32 | Tope 50 |
| `b_lph` vida al golpear | 7 | 12 | 19 | 29 | Línea il40: 15–44 |

- **El banco «óptimo» asume `tier = round((Nv−20)/3)`**, es decir, L 27 al Nv100 (`bench-core.mjs:217`). Una grieta 27 usa el piso 70. Su vida enemiga es `(G(70)/G(50))^1,38 × (1 + 0,3 + 0,12·27)` ≈ 5,7 × 4,54 ≈ **26×** la de un enemigo AL 50, cinco veces el ×5 del Tormento 10. **La hipótesis es probablemente optimista** y conviene revisarla en E4b.
- **Un crítico «muerto» ya hoy, en la Arquera Nv100:** 5 + 0,15·77 (Des) + 10 (talento) + 6 (tablero) + 31 (`b_crit` L 27) = **63,6 > 60**. Todo el crítico del equipo se pierde, y eso pasa **sin ningún afijo**. El exceso lo crean las bendiciones, no el equipo.
- **Las ofertas de bendición se barajan con `Math.random`** (`game-endgame.js:141`), no con semilla.

### 1.10 Guardado

- Los objetos se guardan **enteros en JSON**, con campos derivados (`name`, `value`, `icon`, `power.desc`, `runeword.stats`) y estado de interfaz (`fav`, `unidentified`).
- `SAVE_VERSION = 5` (`save-schema.js:36`), aunque `CLAUDE.md` dice 4. Cada objeto lleva `sv = 2` (`items.js:631-651`).
- **El alijo no tiene versión** y se reescala al cargar (`main.js:1478-1482`).
- **El `uid` es un contador local** (`items.js:117-141`).

### 1.11 Ejes de progreso por pieza, hoy (objeción de los «10 ejes»)

Esto es lo que el jugador tiene que evaluar en cada objeto que cae, con el código de hoy:

| # | Eje | ¿Se ve? | Dónde |
|---|---|---|---|
| 1 | ilvl | Sí («Nv. 40») | `ui.js:2671` |
| 2 | Rareza (×1–1,5 y nº de líneas) | Sí (color) | `items.js:7-13` |
| 3 | Tirada de la base (arma ×0,85–1,15 y amplitud 1,5–1,9; armadura ×0,85–1,15) | **No** | `items.js:205-219` |
| 4 | Qué afijos salen (3–4 de 12 + 1–2 de 4) | Sí | `items.js:234-245` |
| 5 | Tirada de cada afijo (mín.–máx.) | **No hay indicador** | `items.js:223-224` |
| 6 | ★ superior (8 % por línea) | Sí | `items.js:227-231` |
| 7 | Calidad 0–5 | Sí | `items.js:596` |
| 8 | Engarces (0–3) y su contenido (gema con ilvl propio o runa) | Sí | `items.js:608-612` |
| 9 | Palabra rúnica | Sí | `items.js:614-618` |
| 10 | Poder legendario (y 2.º del mítico) | Sí | `items.js:598-599` |
| 11 | Conjunto | En la ventana | `ui.js:2700+` |
| 12 | Identificado o no | Sí | `economy.js:694-716` |

**Conclusión:** hoy ya hay **10–12 ejes**, y dos de ellos son invisibles. La objeción se queda corta: la v1 de diseño **añadía** 4–5 ejes (tier, rango de aspecto, templado, sello, talismán) a una base que ya pasa de 10. Fundir capas es **reducir desde lo que hay**, no solo evitar añadir.

### 1.12 Cuántas líneas tiene hoy el tooltip

Está en `showItemTooltip` (`ui.js:2664-2674`), `itemStatLines` (`items.js:585-621`) y `buildCompare` (`ui.js:2603-2661`).

| Bloque | Raro il40 | Legendario il40 | Mítico engarzado |
|---|---|---|---|
| Nombre y subtítulo | 2 | 2 | 2 |
| Calidad, mítico y poderes | 0–1 | 1–2 | 4 |
| Daño o armadura | 1 | 1 | 1 |
| Afijos | 4–5 | **5–7** | 6–7 |
| Engarces y gemas | 0–3 | 0–4 | 4 |
| Comparación (veredicto, 3 filas, «Frente a», diferencias) | 8–12 | 9–13 | 9–13 |
| **Total** | **15–24** | **19–28** | **≈ 30** |

Cualquier objetivo de «≤ 9 líneas» o «≤ 4 afijos + aspecto» parte de **dividir por 2–3** lo que se ve hoy.

---

## 2. Curvas: equipo, enemigos y cuota de poder

| | il / área 1 | 20 | 40 | 50 (Nv100) |
|---|---|---|---|---|
| G (arma, armadura, planos) | 1 | 3,31 | 11,66 | 21,88 (11,66 con el tope de 40) |
| Vida enemiga G^1,38 | 1 | 5,2 | 29,6 | 70,4 |
| Daño enemigo G^0,85 (× 1,5) | 1 | 2,8 | 8,1 | 13,8 |
| K de armadura (60·G) | 60 | 199 | 700 | 1314 |

- **El área llega a 40 en el Nv≈58** (`combat-math.js:557-562`).
- **Del Nv58 al 100** el equipo solo mejora por Calidad y rareza, mientras la vida enemiga sube ×2,38 y el daño ×1,71.
- **La armadura relativa cae:** 700 de armadura = 50 % en AL 40, pero 35 % en AL 50. Eso es ×1,30 de daño recibido solo por la armadura.
- **Ya está previsto:** `docs/paso2-implementacion.md:673, :719` dejan «ILVL > 40, afijos, aspectos» para el Paso 4.

### 2.1 Qué parte del poder viene hoy del equipo (objeción de la «cuota»)

Es una **estimación a mano** con las fórmulas de `recompute` y `generateItem`. Vale para el **DPS de hoja** de un Guerrero Nv100 (AL 50, il40), con el valor esperado de un juego de 12 piezas. **Supuestos:**
- Atributos repartidos como en el banco: Fue 75 y Vit 54 (`bench-core.mjs:178-180`).
- Tablero +10 % de daño y +2 % de crítico; glifo `g_dmg` ≈ +18 %.
- Talento Golpes Precisos +10 % de crítico.
- Sin Era ni buffs.

| Factor | Sin afijos | + raros (esperado) | + legendarios (esperado) |
|---|---|---|---|
| Saco aditivo | 1 + 0,28 | + 0,32 → **×1,25** | + 0,49 → ×1,38 |
| Principal (Fue) | 1,75 | + 52 → **×1,30** | + 80 → ×1,46 |
| Crítico (×(1 + c·0,5)) | 18,5 % | + 16 → **×1,07** | + 25 → ×1,11 |
| **Total de afijos** | ×1 | **×1,74 ≈ 42 % del DPS** | **×2,24 ≈ 55 %** (con `furia` ×1,15: ≈ 61 %) |
| Con `b_dmg` L 27 (+62) en el saco | — | ×1,63 ≈ 38 % | — |

- **Vida:** sin equipo, 45 + 4·54 + 4·99 = 657. Un juego de raros suma ≈ 451 de vida + 52 de Vit (·4) ≈ +658: **≈ 50 % de la vida**, y ≈ 39 % con `b_hp` L 27. La armadura viene casi entera del equipo (Des·0,3 ≈ 3).
- **Con el daño implícito del arma**, el equipo es el ≈ 97 % (puños 4,5 frente a 59). Por eso **la «cuota» tiene que nombrar su métrica**. Propongo dos:
  1. **Cuota de afijos:** con las bases fijas.
  2. **Cuota de base:** la del ilvl, que sigue a la curva de enemigos.
- **Matiz del saco:** el `addPct` de habilidad diluye el «% Daño». Con los soportes y la forja, la cuota real de afijos en combate será **menor** que la de hoja. La velocidad de ataque (+28 % esperado) solo cuenta en el básico.
- **Protocolo para el banco** (sin código nuevo de combate): añadir a `buildHero` un perfil `gear: 'desnudo'`, con las mismas bases, `affixes = {}`, sin poder, sin gemas y con Calidad 0. Después medir DPS y TTK de `desnudo`, `tipico` y `optimo` en el Nv20, 50, 70 y 100 y en T0, T5 y T10. La cuota es `1 − DPS(desnudo)/DPS(perfil)`.
- **Conclusión:** la cuota de partida que propone el revisor (40–50 % al final del juego) **ya se cumple hoy con raros**. Lo que está roto no es la cuota, sino:
  - que una bendición sin tope valga más que todas las líneas de daño juntas;
  - que el legendario la suba a ~60 %;
  - que nada de eso crezca del Nv58 al 100.

### 2.2 Opción A (`ILVL_MAX` 50) frente a B (40 + capas)

La objeción llegó truncada en el informe del revisor. Estos son los números del código. La curva tiene **dos tramos** (`combat-math.js:557-562`): del Nv58 al 70 el área sube 0,55 por nivel (AL 40 → 47), y del 70 al 100, 0,1 por nivel (AL 47 → 50).

| Tramo | Enemigos | A: `ILVL_MAX` 50 (il = AL) | B: tope en 40 (hoy) |
|---|---|---|---|
| **Nv58 → 70** (AL 40 → 47) | vida ×1,84, daño ×1,46 | equipo ×1,55 (G); armadura relativa estable en 50 % | equipo ×1; **la armadura relativa cae del 50 al 39 %** |
| **Nv70 → 100** (AL 47 → 50) | vida ×1,30, daño ×1,17 | héroe ×1,27 (talentos y tablero) × 1,21 (equipo) = **×1,53**; el TTK baja a ×0,85 | héroe ×1,27; **TTK plano**: así se calibró |

- **El problema de A:** `AREA_LEVEL_LATE` se estiró **a propósito** para el equipo congelado. El comentario dice: «el equipo ya está en ILVL_MAX… La curva se estira lo justo para medir» (`combat-math.js:548-556`).
  - Con A, el tramo 70 → 100 queda **~15 % más fácil**.
  - Por cada nivel de área, los enemigos le sacan ×1,024 al equipo (1,065^1,38 frente a 1,065). Para recuperar el TTK plano hacen falta ≈ 7 niveles de área más: **Nv100 → AL ≈ 57**, es decir, ≈ 0,33 por nivel desde el 70 e `ILVL_MAX` acompañando. La otra salida es subir `hpExp`.
  - No es solo subir un número: hay que mover tres constantes y volver a medir.
- **El problema de B:** el hueco está en **58 → 70**. Ahí la vida enemiga sube ×1,84 y el equipo no crece. Ese ×1,8, menos lo que den los talentos de ese tramo (el banco puede medirlo), tiene que salir de la Calidad (hoy ×1,3 como mucho), de los tiers y de los aspectos. Todo eso es **inversión que no pasa a la pieza siguiente**, y choca con la regla del revisor («barata frente a la frecuencia de drops»).
- **Mi lectura:** encaja mejor con «3 ejes por pieza» una variante **A′**: ilvl = AL hasta el final, `AREA_LEVEL_LATE` re-estirado (≈ 0,33 → AL e ilvl 57 en el Nv100) y **un solo eje de Calidad barato**. Es una decisión del dueño (pregunta 5 de arpg.md) y se cierra con E4b.

---

## 3. Qué está roto (bugs confirmados en el código)

| # | Bug | Dónde | Cómo se reproduce | Gravedad |
|---|---|---|---|---|
| 3.1 | **Avaricia suma el hallazgo mágico dos veces:** +30 al afijo `mf` y `stats: () => ({ mf: 30 })` | `items.js:254`, `game-endgame.js:129`, `powers-common.js:106-108` | Legendario «de la Avaricia» → +60, o +69 con Calidad 5 | Media |
| 3.2 | **La comparación por hover recorta la vida y el recurso.** `_previewEquip` hace `recompute()` con el objeto puesto y `recompute` hace `hp = min(hp, maxHP)` | `ui.js:2585-2601`, `entities.js:972-975`; en cada `pointerenter` (`ui.js:302`) | Vida llena + hover sobre un anillo con menos vida → pierdes la diferencia. Son 2 `recompute` por hover | Media |
| 3.3 | **Las gemas suben de nivel sin tope y gratis** | `economy.js:326-331`, `items.js:286-294` | Rubí il40 + 2 rubíes il1 → il43, y así hasta il100 | Alta para el balance |
| 3.4 | **Los glifos caen por encima del rango 10** | `items.js:461-469`, `main.js:1272, 1288` frente a `:1292` | Grieta 15 → glifo rango 15 | Media |
| 3.5 | **Gemas y runas destruidas en silencio** al vender, «vender morralla», extraer o transmutar | `economy.js:186-196, 592-605, 336-358`, `game-endgame.js:96-112` | Vender una pieza con 3 rubíes il40 | Media |
| 3.6 | **«Maná máximo» agranda la Furia sin tope** (`100 + bonus`) y en la Arquera se pierde el 80 % (tabla del §1.2) | `resources.js:39-44`; contradice `combat-math.js:53-57` | Guerrero il40 con 3 afijos de maná: Furia ≈ 400 | Media |
| 3.7 | **«Maná al golpear» muestra el valor crudo y aplica 2** | `items.js:58`, `combat-math.js:57`, `entities.js:941` | El tooltip il40 dice +29 y aplica +2 | Baja, pero engaña |
| 3.8 | **El mítico pierde su 2.º poder al extraerlo** | `game-endgame.js:96-112` | — | Baja |
| 3.9 | **La marca ★ queda huérfana tras la encantadora** | `items.js:390-403` | — | Cosmético |
| 3.10 | **La reforja de legendarios no tiene botón** (solo funciona arrastrando) | `ui.js:2768`, `:2269`, `economy.js:209-218` | — | Baja |
| 3.11 | **El veredicto del comparador engaña:** `itemPower` no conoce la clase y pondera la vida igual que el daño | `ui.js:2548-2559` | Anillo +175 de vida «▲ Mejora» frente a uno +6 % crít. y +13 % daño | Media para la experiencia |
| 3.12 | **Los textos de poder quedan congelados en el guardado** | `items.js:96-101` frente a `powers-common.js:99-147`; `items.js:597-598` | 76 piezas del fixture con textos viejos | Baja |
| **3.13** | **Tres medidas de «poder» que se contradicen:**<br>(a) `itemPower`: pesos fijos, `mf` 0,4. Decide el veredicto y el ▲ de la celda (`ui.js:2487-2488, 2548, 2562-2573`).<br>(b) `_charDPS`: la hoja, para las filas DPS/Vida/Armadura (`ui.js:2577-2580`).<br>(c) `st.power`: `dmgAvg·1,4 + vida·0,08 + arm·0,25 + **maxMP·0,03 + mf·0,1** + lph·0,6 + espinas·0,3 + cdr·0,6`. Es el «⚡ Poder» de la ficha (`entities.js:965-971`, `ui.js:2899`) | — | Avaricia (bug 3.1) o un afijo «Maná» en el Guerrero **suben el ⚡ Poder**, mientras resistencias, reducción de daño, rangos y [×] no cuentan. El ▲ de la celda puede contradecir la fila «DPS ▼» del mismo tooltip | Media |
| **3.14** | **El «+N ⚡ Poder» flotante salta con buffs temporales.** `updateHUD` compara `stats.power` a 10 Hz, y `addBuff` hace `recompute` | `ui.js:670-672`, `entities.js:1182-1191`, `:834` | Cada acumulación de Ímpetu, Guardia Viva o Desenfreno (`powers-guerrero.js:1237, 1974, 2411`) y cada santuario (`main.js:2001, 2017`) pintan «+N ⚡ Poder» en pleno combate. El refuerzo de «el número sube» se gasta en ruido | Media para la experiencia |
| **3.15** | **Azar sin semilla en sistemas de progreso:** bendiciones, tablón, tienda, apuesta, cubo y encantadora | `game-endgame.js:26, 141`; `economy.js:20, 31, 347, 355, 419`; `items.js:154` | No reproducible para la escalera; contradice `CLAUDE.md` | Baja hoy, alta para la escalera |

**Bugs de documentación:**
- MEMORIA dice que `PENDING_E4B` tiene 98 o 92 entradas: el código tiene **95**. `PENDING_FORGE` tiene **96** (MEMORIA dice 94, 95 o 97).
- `CLAUDE.md` dice que `SAVE_VERSION` es 4: es 5.
- `INFORME_EXPANSION_2026.md` §1.3–1.4 dice que el crítico topa en 75 (es 60), que el Paragon abre en el Nv21 (es el Nv81) y que el tablero da poderes (ya no).
- `STAT_DESC` (`data.js:603-608`) dice que Fuerza y Energía suben el daño de todas las clases; no es así (§1.2).

---

## 4. Qué sobra o no rinde (diseño)

1. **Afijos sin presupuesto ni identidad:** 16 genéricos, 1–2 de 12 muertos según la clase, y el hallazgo mágico compitiendo con el combate. D4 sacó los afijos de botín y los condicionales en la T4 (fuente 1).
2. **Mucho relleno:** el 44–61 % del botín es blanco sin uso, y el 94 % es «morralla» (§1.1). Meta de D4 T4: «Drop fewer items, with each one more likely to be valuable» (fuente 1).
3. **El legendario siempre gana al raro.** Del mismo ilvl lleva ≈ 6 líneas de ×1,5 frente a 4,5 de ×1,25: **≈ ×1,6 de presupuesto de afijos**, más el poder, más engarces (50 % frente a 35 %) y ×1,2 de arma. El raro solo gana con ★ y suerte. Hay que **elegir un solo eje** (más líneas *o* más valor por línea), como pide la objeción de la rareza.
4. **El Códice le quita valor al legendario:** extraer + grabar en cualquier objeto, y 3 raros = 1 legendario en el cubo (2080 oro).
5. **6 poderes para 9 especializaciones**, 2 de ellos de utilidad. Ninguno toca habilidades, variantes ni mecánicas.
6. **Conjuntos, runas y palabras rúnicas no escalan**, y los conjuntos no respetan la clase.
7. **Charms sin tope:** con 25 charms il40, ≈ +700 de vida, comparable a todo el equipo. En D2 el límite era la cuadrícula **(sin fuente verificada en esta sesión)**.
8. **La identificación es un clic gratis** (`economy.js:694-716`).
9. **La encantadora borra un afijo al azar.** En D4 eliges qué afijo cambias **(sin fuente verificada en esta sesión)**. El templado de D4 suma 1 afijo con 3 cargas (fuente 2).
10. **La Calidad 0–5 es barata y el Tormento la regala** (T10 = Calidad 5). En D4 Lord of Hatred, según maxroll (actualizada el 23-may-2026 y releída hoy, fuente 3):
    - 25 rangos de +1 %, y cada mejora puede dar hasta 5 rangos de golpe.
    - Al llegar al 25, el **remate** da +50 % a un afijo al azar, que puede ser el templado.
    - El remate **se puede volver a tirar sin límite** por 10 M de oro + Obducite. En la práctica es un remate dirigido con coste.
    - El remate de la v1 de diseño («al azar como D4») hay que corregirlo con esto. La wiki de Fandom dice lo contrario («no longer increases affix value»), sin fecha; me quedo con maxroll.
11. **Capacidades cortas:** 32 en la mochila, 24 en el alijo y la bolsa partida por ilvl.
12. **El tipo de base no importa.**
13. **No hay requisitos de nivel ni de clase** (§1.3, fórmula propuesta).
14. **No hay presupuesto: todo se suma encima.** El caso extremo de una línea de «% Daño» en il40:

    | Raro común | Legendario | ★ | Calidad 5 |
    |---|---|---|---|
    | 5–13 | ×1,5 | ×1,5 | ×1,3 |

    El techo es **≈ 29 % en una sola línea**, frente a ≈ 9 de media en un raro: **×3 dentro de la misma línea**. Gemas, runas, palabra rúnica y conjunto van **encima** de eso. Esto apoya la objeción del «presupuesto como techo»: hoy no hay techo de ningún tipo.
15. **Resistencias:** existen la capa (tope 70) y las 4 claves, pero el único daño elemental contra el héroe son 2 peligros de fuego (`entities.js:2728`, `main.js:1670`). Ninguna habilidad enemiga pasa `element`. Un afijo de resistencia hoy estaría **muerto**.

---

## 5. Choques con el Paso 2 y ganchos que dejó

| Tema | Estado | Archivo |
|---|---|---|
| **Rango de habilidad por equipo** | `skillRank = base + talentos.skillLv + stats.skillLv`, con tope práctico 9. **Nadie produce `stats.skillLv`** | `skill-resolve.js:68-75`, `docs/paso2-diseno.md:274` |
| **Aspectos por variante** | Diseñados; las variantes `i`/`ii` tienen ids estables y los poderes `v_*` tienen `state` | `docs/paso2f-habilidades-ux.md:824-826` |
| **Vocabulario reutilizable** | `computeAgg.apply` (`stats`, `tv`, `skillLv`, `elem`, `mod` con selectores, `power`, `powerRank`) + `talentExtra` en `recompute` | `talents.js:508-531`, `entities.js:851-861` |
| **Daño por elemento** | Las 9 especializaciones son de elemento; los ítems no dan nada | `talents.js:522-523` |
| **26 claves sin afijo** | `critDmg`, `dr`, `block`, 4 resistencias, `dodgeCdr`, `energyRegen`, `healPct`, `costPct`, `resGainPct`, `regenPct`… | `entities.js:755-780` |
| **Recurso: qué clave vale igual para las 3 clases** | `costPct` sí (abarata todas las habilidades con coste). **`resGainPct` no:** solo multiplica lo **generado** (`gainResource`, `resources.js:92-95`), no la regeneración pasiva (`tickResource` usa `regenPct`, `:69`). Vale entero en el Guerrero (Furia 100 % generada) y poco en la Maga y la Arquera, que viven de la regeneración | `resources.js:52-99` |
| **Defensa elemental dormida** | §4.15 | `combat-math.js:486-491` |
| **Indicadores de especialización** | `gaugeMax:<id>` y `gaugeGain:<id>` se leen de `powerStats` y buffs, no de `item` | `spec-mechanics.js:195-208` |
| **Saco [×]** | 3 plazas, 2 ocupadas: hay sitio para aspectos multiplicativos | `combat-math.js:228-247` |
| **Atajo del Guardián** | El escudo se detecta por emoji o nombre | `entities.js:43-45, 873` |
| **Topes de innata** | `drCapAdd` y `blockCapAdd` no pueden venir de ítems (por diseño) | `entities.js:41` |
| **Rendimiento** | `recompute` corre en cada `addBuff` (y en cada hover, por 3.2) | `talents.js:559-563` |
| **Banco** | `gearProfile` e `itemValue` dependen de los 16 afijos. `GEAR_KEYS` incluye `critDmg`, que nunca sale. El óptimo fija `furia`, `volatil` y `multidisparo` (`bench-core.mjs:196`) y las bendiciones con L = (Nv−20)/3 (`:217`). `PENDING_E4B` tiene 95 entradas | `tests/helpers/bench-core.mjs:67-120, 185-220` |

---

## 6. Qué conservar (y reutilizar)

1. **`combat-math.js` entero:** sacos, topes, `G`, `ILVL_MAX` como mecanismo, `tormentMods`, defensa en capas y cubeta de sustento.
2. **El azar con semilla del botín** (`withItemRng`, el stream `loot`, `rollDrops({ rng })`), `syncItemUids` y la versión por objeto (`sv`). Hay que **extenderlo** a la economía y a las bendiciones (3.15).
3. **La presentación del botín:** balizas, halo, sonidos, etiquetas, `#hud-loot`, el filtro, favoritos, «vender morralla», ordenar, arrastrar y la bolsa con pilas.
4. **El comparador por simulación** (`_previewEquip`). Hay que arreglar 3.2, unificar las tres medidas (3.13) con el perfil resuelto de habilidades y sacar el hallazgo mágico y el oro del «poder».
5. **El concepto del Códice** (fuente 1), pasado a la **cuenta**.
6. **El vocabulario `fx` de los talentos y `talentExtra`** como canal de entrada de los aspectos.
7. **Las regresiones como arnés:** `loot-regression.mjs`, `test38`, `test16`, `test19`, `test22`, `test23`, `test27`, `test37`, `test41`, `test24`, `test20` y `test9`, más el corpus de 641 objetos, 225 gemas, 173 glifos y 76 poderes del fixture.

---

## 7. Implicaciones para el multijugador en navegador

1. **Los objetos no son de fiar.** Viven en `localStorage`, la exportación es base64 sin firma (`main.js:322-349`) y no hay validación. «It would be trivially easy to hack the client» (fuente 4, 2010, sigue vigente como principio).
2. **El `uid` es un contador local:** hace falta un id global (semilla + índice o UUID).
3. **El botín se genera con el hallazgo mágico y la clase del jugador local** (`main.js:1235`), y el stream `loot` es del mundo. Con 2 clientes, el orden de consumo diverge. Hace falta **un stream por jugador** o un único dueño que tire el botín.
4. **La economía y las bendiciones tiran sin semilla** (3.15). Para validar una carrera de escalera por repetición, también tienen que ir por streams (`economy`, `blessing`).
5. **Formato canónico compacto:** base + ids de afijo + tiradas + semilla, y todo lo demás derivado.
6. **Progreso de cuenta:** hoy solo existe el alijo, y **importar lo pisa**. Un Códice o una «marca de agua» de cuenta necesitan un almacén versionado nuevo. En WoW el descuento de mejora es de la Warband y lo fija «the character in your Warband with the highest item level in that gear slot» **(vía buscador; el artículo de soporte de Blizzard pide iniciar sesión)**.
7. **Sincronización de niveles:** la fórmula del §1.3 sirve también para el cooperativo con niveles distintos. Los % sin tabla por ilvl son el hueco (FFXIV: «Substats … will not be scaled up», se topan por ranura; fuente 6).
8. **Autoridad barata para la escalera (2026):** los Durable Objects de Cloudflare están en el **plan gratuito** con SQLite (100 000 peticiones al día, 5 GB) y tienen hibernación de WebSocket. Sirven para validar carreras sin coste en un proyecto no comercial (fuente 7). No es de este frente decidirlo; lo dejo como dato.

---

## 8. Riesgos de migración

- **Cuatro almacenes distintos:**
  - Héroe: `MIGRATIONS[5]`.
  - Alijo: sin versión, se reescala en `loadStash`.
  - Copias `.bak-v4`.
  - Tienda en memoria.
- **Datos congelados:** textos de poder y stats de palabra rúnica.
- **Las gemas il > 40 de 3.3 pueden existir ya:** la migración debe topar o convertir.
- **Charms apilados:** avisar con `LOAD_NOTICES` si se topan.
- **Bendiciones ya ganadas por encima de un tope nuevo:** guardan `value` congelado (`game-endgame.js:160`). La migración tiene que recalcular desde `id` y `tier`.

---

## 9. Refutaciones internas de la v1 (dos rondas)

Las hice yo adoptando el papel de cada experto; no son revisores externos. Las conservo porque siguen vigentes.

### Ronda 1: experto en itemización de ARPG

- **«¿Avaricia ×2 es un bug o una decisión?»** El +30 del afijo era la forma de mostrar el poder, y el poder añadió su propio `stats` en 2b.0 (`docs/paso2-diseno.md:791`). → **Regresión probable.**
- **«¿El principal domina?»** Rinde **~2×** más por afijo que el % de daño en el final del juego, sin «dominar». En la v2 lo afino con números: §2.1 da ×1,30 contra ×1,25 de las líneas de daño de un juego de raros.
- **«¿61 % de blancos está mal?»** En D2 los blancos son base **(sin fuente verificada en esta sesión)**; aquí no sirven. → **Se mantiene.**
- **«¿Los charms son un exploit?»** Sin tamaños no hay trueque de espacio. → **Riesgo alto.**
- **«¿Es caro el oro?»** Solo es un problema si hay comercio o escalera. → **Reformulado.**

### Ronda 2: experto en multijugador en navegador

- **«¿Autoridad siempre?»** → **Por niveles:** cooperativo de confianza frente a escalera validada.
- **«¿Basta el botín con semilla?»** → **Stream por jugador** o un único dueño.
- **«¿Importan los textos guardados?»** → **Sí:** forma canónica.

---

## 10. Fuentes

### Web

1. https://maxroll.gg/d4/resources/season-of-loot-reborn-guide (6-ago-2024; histórica, D4 T4)
   - «Drop fewer items, with each one more likely to be valuable».
   - «Conditional affixes were replaced with flat bonuses».
   - El Códice guarda la mejor versión de cada aspecto.
2. https://maxroll.gg/d4/resources/tempering-guide (23-may-2026)
   - 1 afijo templado, 3–5 opciones y 3 cargas.
3. https://maxroll.gg/d4/resources/masterworking-guide (23-may-2026, «Updated for Lord of Hatred»; **releída el 22-oct-2026**)
   - 25 rangos de +1 %, con «up to 5 Quality ranks at once».
   - Remate «+50% bonus to a random affix», que puede caer en el templado.
   - Repetir el remate «indefinitely», por 10 M de oro + Obducite.
   - Total de 7,25–11,25 M de oro y 492–1366 de Obducite.
   - Contraste: https://diablo.fandom.com/wiki/Masterworking **(vía buscador)** dice que la obra maestra «no longer increases an item's affix value». Lo descarto porque maxroll es más reciente y más concreta.
4. https://gafferongames.com/post/what_every_programmer_needs_to_know_about_game_networking/ (2010; principio clásico)
   - «The Server Is The Man».
   - «trivially easy to hack the client».
5. https://warcraft.wiki.gg/wiki/Great_Vault (Midnight T2, retoques hasta el 26-ago-2026; leída hoy)
   - «up to 9 random pieces of gear», de las que eliges 1.
   - Si no te sirve ninguna, cambias por fichas.
   - La página **no** menciona protección contra la mala suerte.
6. https://ffxiv.consolegameswiki.com/wiki/Level_Sync (leída hoy)
   - «its attributes are capped according to the target item level».
   - Las subestadísticas «will not be scaled up».
   - Topes por tipo de ranura.
   - Las materias se ignoran al sincronizar hacia abajo.
7. https://developers.cloudflare.com/durable-objects/platform/pricing/ (leída hoy)
   - Plan gratuito solo con SQLite: 100 000 peticiones al día, 13 000 GB-s, 5 GB.
   - Facturación del almacenamiento desde enero de 2026.
   - Hibernación de WebSocket.
8. https://us.support.blizzard.com/en/article/336964 **(vía buscador; redirige a inicio de sesión)**
   - Descuento de mejora de la Warband según la pieza de más ilvl por ranura.
   - Las fichas de cresta, solo tras un logro.
9. https://news.blizzard.com/en-us/article/24244466/diablo-iv-patch-notes (leída hoy)
   - La última entrada visible es la 2.5.3 (28-ene-2026), sin cambios de itemización.
   - No pude ver las notas de la 2.5.0 que cita el revisor.

**Intentos fallidos:**
- `poewiki.net` (anti-bot), `lastepoch.fandom.com` (402), `lastepochtools.com` (403) y páginas de maxroll de Last Epoch y D2 (404).
- En la v2, dos búsquedas (Last Epoch fuera de línea y autoridad en navegador) chocaron con el cupo agotado.

### Código (solo lectura)

- **Objetos:** `js/items.js:7-61, 64-102, 117-141, 150-160, 166-274, 277-345, 348-431, 455-498, 525-563, 572-621, 631-651`
- **Economía:** `js/economy.js:13-72, 155-196, 207-447, 590-716`
- **Endgame:** `js/game-endgame.js:15-35, 95-165`
- **Jugador:** `js/entities.js:41-45, 509-539, 747-976, 1182-1191, 2728`
- **Combate:** `js/combat-math.js:40-100, 125-160, 221-247, 476-523, 548-562`
- **Recursos:** `js/resources.js:1-110`
- **Habilidades:** `js/skill-resolve.js:56-75`; `js/game-skills.js:1594, 2160`
- **Talentos:** `js/talents.js:62-87, 425-563`; `js/talents-*.js` (nodos con `fx.stats`)
- **Poderes:** `js/powers-common.js:96-147`; `js/powers-guerrero.js:1237, 1974, 2411, 2460-2470`
- **Datos:** `js/data.js:78-112, 248-258, 401-427, 479-532, 562-608`
- **Tablero:** `js/paragon-board.js:1-89`
- **Materiales:** `js/materials.js:14-43`
- **Guardado:** `js/save-schema.js:36-73, 342-396`
- **Juego:** `js/main.js:37, 85, 105, 322-349, 468-520, 699-702, 1229-1322, 1335-1508, 1670, 1672-1698, 2001-2017, 2088-2103`
- **Interfaz:** `js/ui.js:294-309, 655-680, 1981-2008, 2259-2284, 2410-2805, 2890-2905, 2970-2991`
- **Modelo del HUD:** `js/hud-model.js:123-131`
- **Bancos:** `tests/balance-bench.mjs:62-94, 132-287, 741`; `tests/helpers/bench-core.mjs:60-235`
- **Documentos:** `MEMORIA.md:189-191, 318, 350-353`; `docs/paso2-diseno.md:274, 791`; `docs/paso2f-habilidades-ux.md:824-826`; `docs/paso2-implementacion.md:673, 719`; `INFORME_EXPANSION_2026.md:52-67`

---

## 11. Refutación y cambios (v1 → v2)

Los dos expertos refutaron el frente completo. Esta tabla recoge **solo las objeciones que tocan mi frente** (el estado del código) y qué cambié.

| # | Objeción del revisor | Veredicto | Qué cambié en este informe |
|---|---|---|---|
| 1 | La v1 apila unos 10 ejes por pieza | **Aceptada y reforzada** | Nuevo §1.11: **hoy ya hay 10–12 ejes** (2 invisibles). Nuevo §1.12: el tooltip de hoy tiene 19–28 líneas en un legendario. Fundir capas es reducir desde lo que existe |
| 2 | El presupuesto tiene que ser un techo, no un reparto | **Aceptada (dato)** | §4.14: hoy no hay presupuesto; una sola línea de daño va de 5 a 29 (×3) y gemas, palabra rúnica y conjunto van encima |
| 3 | Falta la cuota de poder del equipo; bendiciones sin tope | **Aceptada con matiz** | Nuevo §2.1 con estimación a mano y protocolo `gear: 'desnudo'` para el banco. **Matiz:** la cuota de afijos ya es ≈ 42 % con raros y ≈ 55–61 % con legendarios, así que el 40–50 % propuesto ya se cumple. Lo roto es la bendición sin tope, el salto del legendario y la falta de crecimiento del 58 al 100. §1.9: tabla de bendiciones y **el banco asume grieta 27, ~26× la vida de AL 50** |
| 4 | Principal adaptable, no el «inteligente» de D3 | **Aceptada (dato)** | §1.2: con el pool de 12, P(principal) ≈ 29 % por pieza; Fuerza y Energía muertas fuera de su clase; Destreza útil para todos; `STAT_DESC` miente (bug de documentación) |
| 5 | Rendimientos suaves de WoW, no topes en rojo | **No es de mi frente (dato)** | §1.9: el exceso de crítico de hoy (Arquera 63,6 > 60) **lo crean las bendiciones, sin un solo afijo**. Hay que limitar las fuentes ajenas al equipo antes de discutir cómo enseñar el tope |
| 6 | Sin resistencias hasta que haya daño elemental | **Aceptada** | §4.15: confirmado, solo 2 peligros de fuego; ninguna habilidad enemiga pasa `element` |
| 7 | Solo afijos de recurso en % (`costPct`, `resGainPct`), que «valen igual» | **Aceptada a medias; discrepo en `resGainPct`** | §5: `resGainPct` solo multiplica lo generado (`resources.js:92-95`), no la regeneración (`:69`). Vale entero en el Guerrero y poco en Maga y Arquera. **Propuesta:** `costPct` como único afijo universal, o una clave nueva que sume a la generación **y** a la regeneración. §1.2: tabla del valor real de «Maná máx.» por clase |
| 8 | Hay tres fuentes de «poder», no dos | **Aceptada** | Nuevo bug 3.13 (tres medidas) y **nuevo bug 3.14**: el «+N ⚡ Poder» salta con buffs temporales y santuarios |
| 9 | Falta el nivel requerido | **Aceptada** | §1.3: fórmula `mín(ilvl, itemLevel(AL(Nv)) + k)` con tabla para k = 3. **Hueco nuevo:** los % no tienen escala por ilvl y no se pueden topar sin tabla |
| 10 | Sin protección contra la mala suerte: ~10 000 muertes por aspecto | **Aceptada; matizo la cifra** | §1.1: 10 000 es el peor caso (piso 21 sin hallazgo mágico, 1/860). En Tormento 10 sale 1/370 y en grieta 10, 1/260, más 1,6 legendarios por jefe de grieta (1 seguro + 0,6 esperado). Unos 12 legendarios son ≈ 3100 comunes, o unas 5–7 grietas de nivel 10 contando jefes y comunes (estimación: supone ~100–150 comunes por grieta, que no medí). **La protección sigue haciendo falta, con menos urgencia.** Dato: hoy el poder es uniforme 1/6 y no hay contador. Verifiqué la Gran Cámara (Midnight T2, 2026): elegir 1 de hasta 9, sin protección explícita |
| 11 | «Marca de agua» de cuenta en vez de traspaso | **Aceptada (dato)** | §1.7 y §7.6: hoy **solo el alijo** es de la cuenta; Códice, Calidad, bendiciones y Tormento son por héroe, e importar pisa el alijo. Hace falta un almacén de cuenta con versión |
| 12 | Pesos por ranura inventados; el arma cuenta dos veces | **Aceptada (dato)** | §1.3: hoy todas las ranuras tienen el mismo presupuesto de afijos y el arma suma además el implícito; `itemPower` lo pondera ×2 y el banco ×6 |
| 13 | Pips frente a barrita | **No es de mi frente (dato)** | §1.11: hoy no hay **ningún** indicador de tirada, ni de base ni de afijo |
| 14 | 6 líneas frente a ≤ 9 de tooltip | **Aceptada (dato)** | §1.12: hoy un legendario tiene 5–7 líneas de afijo y 19–28 en total |
| 15 | La rareza como multiplicador | **Aceptada (dato)** | §4.3: el legendario lleva ≈ ×1,6 de presupuesto de afijos sobre el raro, más poder y engarces; hay que elegir un solo eje |
| 16 | Opción A frente a B (objeción truncada) | **Respondida con números** | Nuevo §2.2, por tramos. A deja el 70 → 100 un ~15 % más fácil y hay que re-estirar `AREA_LEVEL_LATE` (Nv100 → AL ≈ 57). B deja sin equipo el 58 → 70 (vida ×1,84), que tendrían que cubrir las capas no transferibles. Propongo la variante **A′** |
| 17 | Datos de D4 desactualizados (remate de LoH) | **Aceptada** | §4.10 y fuente 3, releída hoy: el remate es al azar pero **se puede repetir sin límite** (10 M de oro), da hasta 5 rangos por mejora y puede caer en el templado |

**Hallazgos nuevos de la v2 que no venían de la refutación:**
- Bug 3.15: azar sin semilla en bendiciones y economía.
- Riesgo de migración de bendiciones con `value` congelado.
- Grieta sin tope.
- Conjuntos al ~10 % de los objetos en grieta alta.
- La velocidad de ataque solo acelera el básico.
- Dato de Cloudflare 2026 para la autoridad de la escalera.

**Puntos débiles de la v2** (para que el próximo revisor ataque aquí):
1. **La cuota del §2.1 es de hoja.** Ignora el `addPct` de habilidad, que diluye el «% Daño», y el reparto real de afijos del perfil «típico» del banco, que se queda con el mejor de 3. Solo el perfil `desnudo` del banco la confirma.
2. **El §2.2 toma el ×1,27 del 70 al 100 del comentario de `combat-math.js`.** No lo medí, y bajo A también cambiarían las builds óptimas.
3. **Los ritmos de legendarios del §1.1 son por enemigo común.** No conté cuántos comunes tiene una grieta ni cuánto tarda; las «5–7 grietas» son una estimación.
4. **No medí si los buffs del Guerrero disparan el «+N ⚡ Poder» en cada acumulación** (3.14). Lo deduzco de `addBuff → recompute` y de la comparación a 10 Hz de `updateHUD`, que no tiene filtro. Se confirma en 1 minuto de juego.
