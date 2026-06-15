# INFORME DE EXPANSIÓN Y REDISEÑO — IntentoRPG (Junio 2026)

> **Documento de consultoría de diseño + auditoría de código**
> Proyecto: **IntentoRPG** — ARPG isométrico estilo Diablo 2/4 en JavaScript vanilla + Three.js 0.160, PWA (Vercel), móvil + desktop, guardado en `localStorage`.
> Fecha: **15 de junio de 2026** · Autor: consultoría senior ARPG + auditoría técnica.
> Alcance: auditoría del estado actual (con citas `archivo:línea`) + investigación de mercado 2025‑2026 + propuestas accionables (ramas de clase, pueblo contiguo, rediseño de mascota, remapeo de controles, menú de opciones, hub, backlog priorizado).

---

## 0. Resumen ejecutivo

IntentoRPG es, a junio de 2026, un ARPG sorprendentemente **completo y bien arquitecturado para ser vanilla‑JS sin build step**. Ya tiene los pilares del género: 3 clases con árboles de habilidades por *tiers* y **sinergias** (estilo D2), un sistema de **soportes/gemas de habilidad** (estilo PoE), **rarezas de objeto** con afijos, engarces, gemas, runas, **runewords**, **conjuntos**, **míticos** de doble poder, **Paragon** en tablero 9×9 con glifos engarzables (estilo D4), **bendiciones** permanentes (estilo Last Epoch), **Tormento** (dificultad escalable), **grietas**, **Pináculo** (uber boss), zonas abiertas con respawn, **jefe de mundo**, **goblins del tesoro**, contratos de zona, desafío diario, hardcore, calidad gráfica adaptativa y opciones de accesibilidad. Es una base sólida.

Las **brechas** que este informe ataca, alineadas con lo que la comunidad y los líderes del género consideran clave en 2026:

1. **Diversidad de build a medio/largo plazo limitada por la profundidad de clase.** Cada clase tiene 6 habilidades y un solo "carril". No hay **sub‑especializaciones/ramas** que reconfiguren la identidad de la clase, que es justo lo que mantiene a la gente "experimentando semanas" en D4/PoE2/Last Epoch.
2. **La mascota hace daño** (`entities.js`), lo que la convierte en un DPS pasivo en lugar de un compañero con **identidad de utilidad**. El objetivo de diseño declarado es utilidad, no daño.
3. **El pueblo no es contiguo a una zona open**: hay una "puerta que se cruza caminando" pero técnicamente es un **portal con transición** (`loadWorld`), no un mundo seamless. Salir del pueblo "andando de verdad" a la zona abierta es una mejora de inmersión muy pedida.
4. **Cero remapeo de controles.** Las teclas están **hardcodeadas** (`input.js`). En 2026 el remapeo completo es estándar de accesibilidad (referencia: Game Accessibility Guidelines, TLOU2, GoW Ragnarök).
5. **El menú de opciones es plano** (4 secciones, ~20 ítems en una lista). Funciona, pero no escala a lo que viene (controles, presets, búsqueda).

**Prioridad recomendada (impacto/esfuerzo):** (1) Rediseño de mascota a utilidad — barato y de alta sensación; (2) Remapeo de controles + nuevo menú por categorías — barato‑medio, gran QoL/accesibilidad; (3) Pueblo contiguo a la Cripta — medio, gran inmersión; (4) Ramas de clase — el más caro pero el de mayor retención a largo plazo, abordable por fases.

---

## 1. Auditoría del estado actual

### 1.1 Arquitectura general

- **Hub central:** la clase `Game` en `js/main.js:43` es el orquestador (renderer, escena, cámara isométrica ortográfica, bucle `tick`, carga de mundo, combate, FX). Importa todos los subsistemas (`main.js:4‑21`).
- **Sin build step:** ES modules vía importmap CDN; `three@0.160`. PWA con `sw.js` y `manifest.webmanifest`.
- **Mundos como datos efímeros:** `loadWorld(spec)` (`main.js:357`) destruye y reconstruye el mundo (limpia geometrías/materiales, `main.js:359‑382`). Tipos: `town`, `refuge`, `zone`, `dungeon`. Las zonas tienen **semilla persistente por sesión** (`main.js:386‑391`, `zoneSeeds`) y **niebla de guerra persistente por sesión** (`main.js:444‑446`, `zoneExplored`).
- **Render/estética 2026:** color grading por bioma (`BIOME_GRADE`, `main.js:29‑35`), IBL gratis con `RoomEnvironment` (`main.js:216‑230`), post‑proceso opcional (bloom/AO/outline) con carga perezosa (`main.js:149‑156`), partículas ambientales y de gameplay (`particles.js`, `postfx.js`), sombras de contacto tipo *blob*, *rim light* teñida por bioma.
- **Calidad adaptativa:** `detectDeviceTier()` (`main.js:182`), `applyQuality(0..3)` (`main.js:590`), `monitorFPS()` con histéresis (`main.js:618`) y HUD de rendimiento opcional (`main.js:642`). Esto es un punto fuerte serio para web móvil.
- **Persistencia:** `save()` (`main.js:338`) serializa todo el estado del jugador en `localStorage`, con **3 huecos de guardado** (`slotKey`, `main.js:254`), migración del guardado legacy (`main.js:164‑168`) y export/import por código base64 (`main.js:270‑297`).
- **Módulos auxiliares:** `economy.js` (tienda/transmutación/compra de mascota), `enemy-abilities.js`, `game-endgame.js` (grietas/pináculo/diaria), `input.js`, `ui.js`, `data.js`.

### 1.2 Clases jugables y habilidades (hoy)

Definidas en `data.js:11‑108`. Tres clases, cada una con **6 habilidades** repartidas en 3 *tiers* (desbloqueo por nivel de personaje: `TIER_LEVELS = [1, 6, 12]`, `data.js:5`), **máx. 5 puntos** por habilidad y **sinergias** entre ellas (`synergyBonus`, `data.js:117`).

| Clase | Stat principal | Habilidades (id · tier · tipo) |
|---|---|---|
| **Guerrero** (`data.js:12`) | fue | golpe_brutal (T1 melee), grito_guerra (T1 buff), torbellino (T2 aoe_self), embestida (T2 dash), terremoto (T3 aoe_target), maestria_combate (T3 passive) |
| **Maga** (`data.js:44`) | ene | bola_fuego (T1 proj), nova_hielo (T1 aoe_self), rayo (T2 proj), armadura_helada (T2 buff), meteoro (T3 aoe_target), maestria_arcana (T3 passive) |
| **Arquera** (`data.js:76`) | des | disparo_certero (T1 proj), flecha_multiple (T1 proj), flecha_perforante (T2 proj), agilidad (T2 buff), lluvia_flechas (T3 aoe_target), punteria (T3 passive) |

**Sinergias actuales** (D2‑style): p.ej. torbellino recibe +5%/punto de golpe_brutal (`data.js:29`); rayo +5%/punto de bola_fuego (`data.js:62`). Es un buen germen, pero **lineal**: no hay bifurcaciones ni exclusión mutua.

**Soportes de habilidad** (estilo gemas de soporte PoE), `data.js:363‑402`: 12 soportes (Amplificado, Multiproyectil, Perforante, Expansivo, Gélido, Encadenado, Concentrado, Eco, Sangrado, Veneno, Sangre Fría, Sobrecarga), con `tag` `pro`/`tradeoff`. Hasta **2 por habilidad**. Es el sistema con más potencial de "build diversity" ya presente.

### 1.3 Progresión

- **Niveles:** `xpForLevel = 80·level^1.5` (`data.js:7`). Niveles 1‑20 → **+5 puntos de stat y +1 de habilidad** por nivel; nivel 21+ → **+1 punto Paragon** (`entities.js:516‑540`, según auditoría).
- **Atributos:** fue/des/vit/ene; derivados en `Player.recompute()` (`entities.js:310‑403`): HP, daño, crítico (cap 75%), armadura, velocidades, y secundarios (vida/maná al golpear, espinas, CDR cap 50%).
- **Paragon:** tablero 9×9 (`PARAGON_BOARD`, `data.js:447‑486`) con nodos start/minor/magic/rare/legendary + **engarces (◇)** para **glifos**; los legendarios dan poderes únicos (Furia, Festín, Vendaval, etc.). El poder de glifo escala con su rango y con nodos adyacentes activos (`entities.js:356`).
- **Bendiciones** (`BLESSINGS`, `data.js:427‑441`): 8 permanentes en 4 categorías (Ofensiva/Defensiva/Celeridad/Fortuna); se equipa **una por categoría**; valor escala con el nivel de grieta (`blessingValue`, `data.js:439`). Estilo Last Epoch.
- **Tormento:** dificultad global seleccionable hasta 10 en la Estatua del Mundo (`main.js:416‑425`), sube vida/daño enemigo y rareza/cantidad de botín.
- **Pináculo:** uber boss (`UBER_BOSS`, `data.js:227`) invocado con Fragmentos; suelta míticos.

### 1.4 Loot, rarezas y crafteo

- **Rarezas** (`items.js:6‑12`): normal/mágico/raro/legendario/conjunto, con rango de afijos y `statMult`. Afijos "mayores" (★) +50% valor.
- **Generación:** `generateItem(ilvl,…)` (`items.js:129‑216`), afijos primarios/secundarios escalados por ilvl y rareza; **engarces** por probabilidad según rareza; **gemas** (6 tipos), **runas** (6) y **runewords** (5: Filo, Bastión, Zancada, Tormenta, Coloso); **sets** (3); **míticos** de doble poder (`makeMythic`, `items.js:422`); **relics** de jefe; **glifos**; **fragmentos** y **llaves de grieta**.
- **Drop:** `rollDrops(floor, opts)` (`items.js:455`) con escalado de rareza por piso + *magic find*, bonus de jefe garantizado, set chance.

> **Diagnóstico loot:** profundo y bien estratificado. La pega no es de sistemas sino de **legibilidad de progreso** (saber por qué un drop es mejor) y de **identidad de build** (los afijos no empujan hacia arquetipos concretos). Se trata en §3 y §4.

### 1.5 Mundo: pueblo, mazmorras, zonas open, portales

- **Pueblo** (`world.js:354‑547`): grid 36×36; NPCs/servicios — Curandero (`~440`), Mercader/tienda (`~454`), Encantadora (reforja afijos, `~496`), Capitán de la Guardia (misiones diarias, `~502`), Alijo compartido (`~481`), Estatua del Mundo (Tormento + Códice, `~523`). Spawn al sur (`world.js:539`).
- **Salida del pueblo:** **puerta `gate_zone` al norte** con `auto:true` hacia el bioma **Cripta** (`world.js:467‑471`). Al cruzar el borde se dispara una **transición** (no es seamless): `loadWorld` reconstruye la zona. El README ya lo describe como "el pueblo conecta con la Cripta por puertas que se cruzan caminando" (`README.md:28`) — pero técnicamente es un teleport encubierto.
- **Otros accesos:** portal del Desafío Diario (`~509`), Waypoint (`~516`), y desde la zona, mazmorras instanciadas (`zone_dungeon`) y portal de retorno (`portal_town`).
- **Zonas open** (`zones.js:14‑331`): grid 120×120, terreno por autómata celular + flood‑fill, 4 biomas (`ZONE_LIST`, `data.js:405‑410`), respawn gradual (`main.js:861`), jefe de mundo con territorio/leash (`main.js:931`), goblins del tesoro de 3 tipos (`main.js:953`), obelisco de evento (`main.js:459‑471`), contratos de zona.
- **Mazmorras** (`world.js:552‑838`): salas procedurales, altares de pacto, waypoints cada 5 pisos, jefe por bioma.
- **Refugio** (`world.js:843‑938`): segundo pueblo desbloqueable en piso 16.

### 1.6 La mascota ("Lobo de caza") — estado actual

- **Clase `Pet`** en `entities.js:1498‑1575`; modelo lobo (`makeWolfModel`, `entities.js:1471`). Precio `PET_PRICE = 500` (`data.js:356`); compra en `economy.js:73‑82` (`buyPet`), persistida como `{ level: 1 }` y respawneada en `main.js:323` / `spawnPet` (`main.js:~1439`).
- **Comportamiento (resumen verificado):**
  - **Hace daño:** en `update()` busca objetivo (el del jugador o el enemigo más cercano al **dueño**) y, en rango ≤1.5, ejecuta `target.takeDamage(dmg, false)` con `dmg = 3 + (dmgMin+dmgMax)/2 · 0.45`, cooldown 1.1 s (`entities.js:1542‑1554`). El README lo confirma: "mascota… que te sigue y **ataca a tus enemigos**" (`README.md:66`).
  - **Recoge loot:** `nearestLoot()` auto‑recoge oro, pociones y gemas/runas si el saco de materiales no está lleno (`entities.js:1509‑1520`); recogida al acercarse (`entities.js:1556‑1564`).
  - **Sigue al dueño** con colisión y teleport de seguridad si se aleja >12 (`entities.js:1567‑1572`, `1528`).
- **Sin progresión real:** se guarda `{level:1}` pero **nunca sube de nivel ni se mejora**; un solo modelo (lobo).

> **Diagnóstico mascota:** viola el objetivo de diseño (utilidad, no DPS). Como DPS pasivo es además difícil de balancear (escala con el daño del jugador). Su faceta buena (recolección) es exactamente la dirección correcta. Rediseño en §6.

### 1.7 Controles y remapeo

- **Teclas hardcodeadas** en `input.js:33‑51`: **I/B** inventario, **T** habilidades, **C** personaje, **Q** poción HP, **E** poción MP, **Space** acción primaria, **Shift** esquiva, **F** recoger loot, **Esc** cerrar, **1‑4** habilidades de hotbar. Movimiento **WASD/flechas** (`input.js:96‑104`). Ratón/táctil: clic mover/atacar, joystick virtual en mitad izquierda con transformación isométrica (`input.js:55‑94`).
- **No existe remapeo.** No hay capa de configuración entre tecla física y acción; los `e.code` se comparan directamente. (Brecha de accesibilidad confirmada.) Diseño en §7.

### 1.8 Menú de opciones actual

`UI.renderSettings()` (`ui.js:846‑948`). Estructura **plana** en 4 secciones, ~20 ítems:
- **Audio:** Sonido, Música.
- **Gráficos:** Calidad (auto/0‑3), Postproceso/bloom, AO, Contorno, Sacudida de cámara, Vibración, Ajuste dinámico, Mostrar FPS.
- **Accesibilidad:** Movimiento reducido, Texto grande, Daltónico, Brillo (slider), Filtro de loot.
- **Copia de seguridad:** exportar/importar código.

Persiste en `game.settings` + `saveSettings()`. **Sin categoría de Controles, sin presets, sin búsqueda, sin gameplay/HUD.** Rediseño en §8.

### 1.9 Fortalezas y debilidades (síntesis)

**Fortalezas:** arquitectura modular limpia; calidad gráfica adaptativa real; loot muy estratificado; Paragon + bendiciones + soportes ya dan techo de build; endgame variado (grietas/diaria/pináculo/jefe de mundo/goblins/contratos); accesibilidad básica presente; estética 2026 (grading, IBL, bloom, partículas) tolerante a fallos.

**Debilidades:** clases poco ramificadas (poca identidad/diversidad de build a largo plazo); mascota = DPS sin identidad; transición pueblo↔zona no seamless; cero remapeo; menú plano que no escala; legibilidad de progreso mejorable; pocos servicios de ciudad frente al estándar del género (falta herrero/joyero/coleccionista); navegación fragmentada entre paneles de personaje/habilidades/paragon.

---

## 2. Qué engancha a los jugadores de ARPG (2025‑2026) y cómo reforzarlo aquí

Síntesis de la investigación (fuentes en §11). Lo que la comunidad y la prensa de 2026 repiten:

1. **Diseño "endgame‑first".** En los líderes (D4, PoE2, Last Epoch) la campaña es la introducción; el juego real empieza al nivel máximo, con *loops* de endgame **estratificados** (en D4: The Pit → materiales de Masterworking; Boss Ladder → míticos; Infernal Hordes → currency). Last Epoch S4 ("Shattered Omens") añade arenas de oleadas contenidas con recompensa por rendimiento. → **IntentoRPG ya tiene** grietas/pináculo/diaria/jefe de mundo/contratos; el siguiente paso es **darles una moneda/material de progreso claro** y un *gate* de poder visible (ver §4).
2. **"Número sube" y dopamina del botín.** El mejor *hit* de dopamina del género es un drop satisfactorio (Diablo 3 forums; estudios de *dopamine loops*). → Reforzar **feedback de drop** (haz de luz por rareza, sonido por rareza, "tier‑up" del personaje), y **comparadores claros** (mejor/peor que lo equipado).
3. **Game feel / impact feel.** El estudio académico de *impact feedback* (Lin et al., 2022, arXiv 2208.06155) identifica **hit‑stop, coherencia de sonido y control de cámara** como los factores que más influyen en la sensación de impacto. → IntentoRPG ya tiene hit‑stop (`vfx.js hitStopMs`), trauma‑shake (`main.js:673`) y vibración. Conviene **escalar el feedback por magnitud del golpe** (crítico, élite, jefe) y reforzar audio por evento.
4. **Diversidad de build = retención.** "La temporada actual ha sido una de las más atractivas por variedad de builds; la gente experimenta semanas más de lo normal." La flexibilidad (PoE2 "dual specialization"; Last Epoch puente entre accesibilidad y profundidad) es el motor de rejugabilidad. → **Aquí está el mayor déficit de IntentoRPG.** Lo resolvemos con **ramas de clase** (§3).
5. **Progresión corto/medio/largo:** corto = oleada/sala limpia y un drop; medio = subir de nivel, completar un contrato, una grieta; largo = Paragon/bendiciones/ramas/conjuntos completos, escalar Tormento. → Mapear cada *loop* a una recompensa **legible** (ver §10, métricas).
6. **Temporadas/ligas.** Aunque IntentoRPG es offline‑local, se puede emular con **"Eras"/temporadas locales**: un modificador semanal (semilla de mundo + reto + cosmético) que renueve el *why come back today*. (Backlog, largo plazo.)

**Anti‑patrones a evitar (lo que aburre):** TTK inflado por dificultad sin que suba tu poder (ya mitigado al bajar Tormento a +1 piso, `main.js:421`); CC encadenable (ya evitado: solo *slow*, `data.js:274‑295`); "mapping" monótono sin micro‑objetivos (mitigado por contratos/eventos); builds de un solo carril (el problema a resolver).

---

## 3. Propuesta: Ramas / árboles de clase (sub‑especializaciones)

### 3.1 Patrones del género y elección de modelo

| Juego | Modelo | Esencia | Aplicabilidad a vanilla‑JS |
|---|---|---|---|
| **Diablo 2** | Árboles de skills + sinergias + hard points | Inversión irreversible empuja a especializar; sinergias hacen "subir números" | Alta — ya hay sinergias (`data.js:117`) |
| **Diablo 4** | Skill tree + **Paragon boards** + aspectos | El árbol modifica comportamiento; el poder viene de items/paragon | Alta — ya hay Paragon + poderes legendarios |
| **Path of Exile** | Passive tree gigante + gemas de soporte | Combinatoria extrema; "4D checkers" | Parcial — demasiado para vanilla; **pero las gemas de soporte ya existen** |
| **Last Epoch** | **Skill specialization trees** (un árbol por habilidad) + masteries de clase | Puente accesible↔profundo; cada habilidad se reconfigura | **Ideal** — encaja con el modelo de habilidades + soportes ya presente |

**Recomendación:** modelo híbrido **Last Epoch (masteries) + D4 (aspectos de comportamiento)**, ligero y data‑driven. Dos capas:

- **Capa A — Maestrías de clase (ramas):** cada clase elige **1 de 3 maestrías** alrededor del nivel 12 (cuando hoy se desbloquea el tier 3). La maestría es una **identidad de build**: define un recurso/mecánica, da pasivas exclusivas y desbloquea 2‑3 habilidades nuevas o transformaciones de las existentes. Es **reespecializable** por oro (gold sink) pero con coste creciente, para que la decisión pese.
- **Capa B — Aspectos de habilidad:** ampliar el sistema de soportes con **"aspectos"** que **transforman** una habilidad (no solo +daño). Reutiliza la infraestructura de `SUPPORTS` (`data.js:363`) — solo añade soportes de tipo `transform`.

> Por qué este modelo: **reutiliza** sinergias, soportes y Paragon ya implementados; es **100% data‑driven** (se define en `data.js`, se interpreta en `entities.js recompute()` / cast), y escala por fases sin reescribir el motor.

### 3.2 Diseño concreto por clase (ejemplos de nodos)

Cada maestría: **1 mecánica núcleo + ~6 nodos** (3 menores +stats/efecto, 2 notables que cambian comportamiento, 1 capstone). Coste: puntos de **maestría** (1 nuevo punto cada 2 niveles desde el 12, o reusar puntos de habilidad sobrantes).

#### GUERRERO

- **Rama 1 — Berserker (Furia):** recurso *Furia* que se acumula al golpear y se gasta en habilidades.
  - Menores: +daño por pila de Furia; +vel. ataque con Furia alta; vida al matar.
  - Notables: *Torbellino* se canaliza moviéndote (no estacionario); *Embestida* deja un rastro de fuego.
  - **Capstone "Sed de Batalla":** con vida <40%, +35% daño y +20% robo de vida. (Empareja con el poder Paragon "furia" existente, `data.js:455`.)
- **Rama 2 — Guardián (Baluarte):** tanque/espinas.
  - Menores: +armadura por enemigo cercano; *Grito de Guerra* otorga escudo; +espinas.
  - Notables: *Terremoto* aturde (slow fuerte breve, sin stun encadenable); reflejar % del daño recibido.
  - **Capstone "Muro Inquebrantable":** al recibir un golpe letal, sobrevives con 1 HP y ganas inmunidad 1.5 s (cooldown largo).
- **Rama 3 — Cruzado (Sagrado):** daño elemental sagrado + buffs de área.
  - Menores: convierte parte del daño físico en sagrado; auras que dañan; +radio de buffs.
  - Notables: *Grito de Guerra* se vuelve un aura persistente; *Golpe Brutal* libera una onda sagrada.
  - **Capstone "Juicio":** los enemigos marcados explotan al morir.

#### MAGA

- **Rama 1 — Piromante:** todo gira en torno a quemar/ignición.
  - Menores: +daño a enemigos ardiendo; *Bola de Fuego* deja charco; quemaduras se propagan.
  - Notables: *Meteoro* invoca 2 meteoros menores; *Nova de Hielo* se convierte en Nova de Fuego.
  - **Capstone "Conflagración":** matar a un enemigo ardiendo desata una explosión en cadena.
- **Rama 2 — Crionte (Hielo/Control):** congelar y romper.
  - Menores: +daño a congelados; *Rayo* aplica escarcha; +duración de slow.
  - Notables: *Armadura Helada* refleja una Nova al recibir golpes; congelar acumula "fractura" (daño diferido).
  - **Capstone "Cero Absoluto":** enemigos por debajo de % de vida y congelados se astillan (muerte instantánea, no jefes). Sinergia directa con el soporte **Sangre Fría** (`data.js:396`).
- **Rama 3 — Arcanista (Rayo/Maná):** sostenibilidad y cadenas.
  - Menores: +daño según maná actual; *Rayo* rebota; coste de maná reducido.
  - Notables: *Bola de Fuego* se vuelve orbe arcano teledirigido; recuperar maná al crítico.
  - **Capstone "Sobrecarga Arcana":** al llenar el maná, el siguiente hechizo es gratis y crítico garantizado.

#### ARQUERA

- **Rama 1 — Francotiradora (Precisión):** golpes únicos enormes.
  - Menores: +crítico a distancia; +daño al primer golpe; *Disparo Certero* perfora.
  - Notables: *Flecha Perforante* gana daño por enemigo atravesado; marcar objetivo (daño aumentado).
  - **Capstone "Tiro Mortal":** contra enemigos a vida alta, +100% daño crítico.
- **Rama 2 — Montaraz (Trampas/Mascota‑sinergia):** control de zona.
  - Menores: *Lluvia de Flechas* deja terreno dañino; +duración de buffs; trampas que ralentizan.
  - Notables: *Flecha Múltiple* dispara en círculo; colocar una torreta‑estaca temporal.
  - **Capstone "Cacería":** los enemigos marcados por tu mascota (ver §6) reciben +daño tuyo.
- **Rama 3 — Tiradora Veloz (Cadencia):** DPS sostenido.
  - Menores: +vel. ataque al moverte; *Agilidad* dura más; recarga de esquiva más rápida.
  - Notables: cada 5.º disparo es triple; *Disparo Certero* se vuelve automático en ráfaga.
  - **Capstone "Tormenta de Flechas":** mantener el ataque acumula cadencia hasta x2.

### 3.3 Modelo de datos (data‑driven, sin tocar el motor de render)

```js
// data.js — nuevo
export const MASTERIES = {
  guerrero: [
    { id: 'berserker', name: 'Berserker', icon: '🔥', resource: 'furia',
      nodes: [
        { id: 'b1', type:'minor', stats:{ dmgPct:[3,2] } },
        { id: 'b2', type:'notable', mod:{ skill:'torbellino', behavior:'mobile' } },
        { id: 'bC', type:'capstone', power:'furia_capstone',
          desc:'Vida <40%: +35% daño, +20% robo de vida' },
      ] },
    /* guardian, cruzado … */
  ],
  /* maga, arquera … */
};
```

- **Aplicación:** `Player.recompute()` (`entities.js:310`) ya agrega stats de fuentes múltiples; añadir un bucle que sume los `stats` de nodos de maestría activos. Los `mod`/`behavior`/`power` se leen en el momento del *cast* (donde hoy se aplican soportes) — patrón idéntico al de `SUPPORTS`.
- **Persistencia:** añadir `p.mastery = { id, nodes:{}, points }` al objeto de `save()` (`main.js:341‑352`). Migración trivial: ausencia ⇒ sin maestría elegida.
- **UI:** nueva pestaña "Maestría" dentro del panel de habilidades (reutiliza el render de tablero de Paragon).

### 3.4 Plan por fases

1. **Fase 1 (MVP):** solo los **capstones** como elección única por clase (3 opciones), reusando `LEGENDARY_POWERS`. Bajo esfuerzo, alta sensación de identidad.
2. **Fase 2:** nodos menores/notables + recurso (Furia) y reespecialización por oro.
3. **Fase 3:** soportes de tipo `transform` (aspectos de habilidad) y sinergias cruzadas entre maestría y conjuntos.

---

## 4. Reforzar el "número sube" y la legibilidad del progreso

Acciones concretas y baratas que multiplican la sensación sin sistemas nuevos:

- **Feedback de drop por rareza:** ya hay glifos de rareza en etiquetas (`RGLYPH`, `main.js:37`). Añadir **haz de luz vertical** (cilindro emisivo aditivo) y **sonido distinto** por rareza; *screen flash* sutil en legendario+.
- **Comparador inline:** en tooltips del inventario, marcar ▲/▼ por stat frente a lo equipado, y un veredicto "⬆ Mejora / ⬇ Peor / ↔ Lateral".
- **Hitos de poder:** una barra de "Poder del héroe" (suma ponderada de stats) que sube visiblemente al equipar; "+N poder" flotante.
- **Recompensa legible por loop:** que cada loop dé una **moneda de progreso** clara: grietas → rango de glifo (ya), Pináculo → mítico (ya), contratos → llave de grieta (ya). Falta **mostrarlo como meta** (HUD de objetivo del loop activo).
- **Impact feel escalado:** hit‑stop y shake mayores en crítico/élite/jefe (escalar `addShake`/`hitStopMs` por daño relativo a la vida del objetivo).

---

## 5. Propuesta: Pueblo contiguo a una zona open (salir caminando, sin portal)

### 5.1 Objetivo y referencia de diseño

Que el jugador **salga del pueblo caminando** y entre en la Cripta **sin pantalla de transición** — el pueblo como **zona segura adyacente** a la primera región. La tendencia 2026 (Borderlands 4, Crimson Desert) va hacia mundos *seamless* que disuelven el patrón "hub‑and‑spoke" con teleports. Para un ARPG ligero, el objetivo realista es un **"seamless hub"**: pueblo + primera zona en **un único mundo** con frontera natural (puente/muralla/portón abierto), no streaming infinito.

> Importante: hoy ya hay "puerta caminando" pero con `loadWorld` por detrás (`world.js:467‑471`, `main.js:474‑485`). La propuesta es eliminar esa transición **para el par pueblo↔Cripta**.

### 5.2 Diseño espacial

- **Mundo unificado "Pueblo + Cripta de las Afueras":** un solo grid que contiene, de sur a norte:
  - **Recinto seguro (pueblo):** murallas, NPCs y servicios; sin spawns hostiles; un **portón abierto** al norte (arco, sin disco de portal).
  - **Franja de transición:** camino con vallas/ruinas que insinúan peligro; primeros enemigos suaves a partir de cierta `z`.
  - **Tierras de la Cripta:** la zona open actual (puede seguir siendo procedural por semilla, pero anclada al norte del recinto).
- **Zona segura por geometría, no por mundo:** el "pueblo" deja de ser un *tipo de mundo* y pasa a ser una **región** marcada dentro del grid (`safeZone: {x0,z0,x1,z1}`). Dentro: no spawn, regen pasiva, música de pueblo.

### 5.3 Implicaciones técnicas (paso a paso)

1. **`world.js` — nuevo `buildTownGate()` / extender `buildZone`:** construir el recinto del pueblo como **prefab insertado** en la esquina sur del grid de la Cripta (reutilizar las mallas de NPCs/casas/decoración de `buildTown`). Marcar `world.safeZone` y `world.npcs` con sus posiciones reales.
2. **`zones.js` — anclar terreno:** reservar la franja sur (primeras N filas) como suelo garantizado transitable y libre de enemigos (excluir de los *packs* de `zones.js:296‑318`); colocar el portón en la frontera.
3. **`main.js loadWorld`:** para este mundo, **no** disparar transición al cruzar el portón (quitar `auto:true` del par pueblo↔Cripta). La música y el ambiente cambian por **posición** del jugador (cruzó `safeZone.z1` → fundir música de pueblo→Cripta, encender/atenuar `playerLight`, niebla, etc.). Esto sustituye el actual cambio en `loadWorld:486‑505` por uno **gradual por frame** en `tick`.
4. **Spawns y respawn:** en `zoneTick` (`main.js:861`) excluir `safeZone` de `randomZoneCell` (añadir un filtro en `randomZoneCellFrom`, `main.js:843`) para que nunca aparezca nada dentro del pueblo.
5. **Servicios:** los NPCs/Estatua/Alijo se interactúan igual (`currentInteract`), pero viven dentro del mismo `world.interactables`.
6. **Salidas alternativas se mantienen como portales:** mazmorras instanciadas, refugio, diaria y **otras** regiones (Hielo/Infierno/Abismo) siguen por waypoint/portal (no tiene sentido hacer todo seamless). Solo **pueblo↔Cripta** es contiguo.
7. **Minimapa/niebla:** la niebla de guerra del pueblo se revela entera; la de la Cripta se descubre al avanzar (ya existe `zoneExplored`, `main.js:444‑446`).

### 5.4 Migración

- **Compatibilidad de guardado:** el guardado no almacena el mundo (se regenera), así que **no hay migración de datos**. Solo cambia la **lógica de carga inicial**: `startGame` hoy hace `loadWorld({type:'town'})` (`main.js:325`) → pasaría a `loadWorld({type:'townzone', biome:'Cripta'})`.
- **Riesgo:** que el grid 120×120 + prefab de pueblo suba el coste de carga/draw calls en móvil. Mitigación: **instanciar** muros/casas/árboles (InstancedMesh) — ya se usa instancing para muros (`world.js:387‑395`); extenderlo. (Ver §9; objetivo <50 draw calls en móvil.)
- **Rollback:** mantener `buildTown()` y el flag por config para volver al modelo con portal si surge un problema en producción.

---

## 6. Rediseño del minipet: de DPS a compañero de UTILIDAD

### 6.1 Principio

**Quitar el daño.** El estudio del género (Lost Ark, Ashes of Creation, Last Epoch, Dungeon Siege) muestra que la **identidad memorable** de un pet sano viene de **utilidad y comodidad**, no de DPS: auto‑loot, buffs, marcaje, "stash móvil". Last Epoch incluso ha evitado el auto‑loot por miedo a trivializar — IntentoRPG puede ofrecerlo como **comodidad de calidad de vida** sin romper economía si filtra por rareza/umbral.

### 6.2 Cambio inmediato (Fase 1, trivial)

- En `entities.js:1542‑1554`, **eliminar** `target.takeDamage(...)` y el `atkCd`/`lunge` de ataque. Mantener únicamente el seguimiento y `nearestLoot`/recogida. El lobo deja de combatir; trota junto a ti y recoge.
- Actualizar copy del README (`README.md:66`) y del mercader.

### 6.3 Utilidades priorizadas (de mayor a menor valor/coste)

1. **Auto‑recolección configurable (núcleo).** Ya existe (`nearestLoot`, `entities.js:1509`). Mejorar: respetar el **filtro de loot** del jugador (`settings.lootFilter`, `main.js:65`) y permitir umbral propio ("recoge oro+pociones", "+gemas/runas", "+materiales", "+todo lo que pasa el filtro"). Radio de recolección crece con el nivel del pet.
2. **Imán de oro/orbes.** El pet **atrae** oro y orbes cercanos hacia sí (o hacia el jugador) — sensación muy satisfactoria y barata (interpolación de posición).
3. **Identificar/valorar.** Pasa un objeto sin identificar a identificado tras X s, o muestra el "veredicto" (mejora/peor) sobre el loot del suelo con un icono flotante.
4. **Marcar enemigos (sinergia de build).** El pet **marca** periódicamente al enemigo más peligroso/cercano (élite, jefe, goblin) con un icono; los enemigos marcados pueden recibir +daño si la rama Montaraz lo habilita (§3.2). Da utilidad **sin** que el pet golpee.
5. **Buff de aura.** Pequeño buff de **utilidad** (no DPS puro): +% oro, +% magic find, o +regeneración fuera de combate. Configurable en el "collar" del pet.
6. **Stash móvil / venta.** Acceso al **alijo** o **venta rápida** desde el pet en cualquier sitio (con cooldown), como el "pet ranch"/buhonero de otros ARPG.
7. **Detección.** Señala en el minimapa cofres/santuarios/goblins cercanos (ping).
8. **Recuperación de cadáver / rescate (sabor).** En Hardcore, podría intentar "recoger" una fracción del oro perdido (cosmético/sabor, opcional).

### 6.3.1 Tabla de utilidades

| Utilidad | Valor jugador | Esfuerzo | Riesgo economía | Fase |
|---|---|---|---|---|
| Auto‑loot con filtro | Alto | Bajo (ya existe) | Bajo (respeta filtro) | 1 |
| Imán de oro/orbes | Alto | Bajo | Nulo | 1 |
| Marcar enemigos | Medio‑alto | Medio | Nulo | 2 |
| Buff de aura (utilidad) | Medio | Bajo | Medio (capar) | 2 |
| Identificar/valorar loot | Medio | Medio | Bajo | 2 |
| Stash/venta móvil | Alto | Medio | Medio (cooldown) | 3 |
| Ping de POIs en minimapa | Medio | Bajo | Nulo | 3 |

### 6.4 Progresión del pet

Convertir `{level:1}` (`economy.js:78`) en una estructura real:

```js
p.pet = { level: 1, xp: 0, kind: 'lobo', collar: 'oro', talents: {} };
```

- **Sube de nivel** ganando una fracción de la XP del jugador o al recoger N objetos.
- **Talentos** (1 por nivel del pet, p.ej. cada 3 niveles del héroe): radio de recolección, velocidad, qué auto‑recoge, fuerza del imán, qué buff de aura lleva el "collar".
- **Cosmético/identidad:** desbloquear **variantes** (lobo → halcón que sobrevuela → familiar arcano) que cambian el modelo (`makeWolfModel` → fábrica de modelos) y el sabor del buff. Esto da el "coleccionable" que hoy falta.
- **Mercader:** además de comprar el pet (`buyPet`, `economy.js:73`), vender **collares** (intercambian el buff de aura) y **mejoras de saco**.

---

## 7. Remapeo de controles configurable (PC + móvil)

### 7.1 Principios (2026)

Game Accessibility Guidelines y referentes (TLOU2, GoW Ragnarök, Google Play Games Controls Editor) marcan el estándar: **toda acción rebindable**, presets, y en móvil **reposicionar/redimensionar** controles táctiles e importar/exportar esquemas.

### 7.2 Modelo de datos (persistencia)

```js
// nuevo: capa acción↔tecla, no e.code directos
const DEFAULT_BINDINGS = {
  inventory: ['KeyI','KeyB'], skills:['KeyT'], character:['KeyC'],
  potionHP:['KeyQ'], potionMP:['KeyE'], primary:['Space'],
  dodge:['ShiftLeft','ShiftRight'], grab:['KeyF'], close:['Escape'],
  skill1:['Digit1'], skill2:['Digit2'], skill3:['Digit3'], skill4:['Digit4'],
  moveUp:['KeyW','ArrowUp'], moveDown:['KeyS','ArrowDown'],
  moveLeft:['KeyA','ArrowLeft'], moveRight:['KeyD','ArrowRight'],
};
// settings.bindings = {...DEFAULT_BINDINGS, ...overrides}, persistido en intentorpg_opts
```

- **`input.js` refactor:** sustituir las comparaciones `e.code === 'KeyI'` (`input.js:33‑51`) por una resolución `actionForCode(e.code)` que consulta `settings.bindings`. Una sola tabla inversa `code→action` reconstruida al guardar.
- **Móvil:** persistir **layout táctil** (`settings.touch = { joystickSide, buttonScale, buttons:[{action,x,y,size}] }`). El joystick virtual (`input.js:55‑94`) y los botones de hotbar (HUD) leen este layout. Soportar **modo zurdo** (joystick a la derecha).
- **Import/Export de esquema:** reusar el patrón base64 de `exportSave` (`main.js:270`) para compartir esquemas de control.

### 7.3 UI de remapeo

- Dentro del nuevo menú (§8), categoría **Controles** con dos sub‑vistas: **Teclado/Ratón** y **Táctil**.
- **Teclado:** lista de acciones; clic en "Asignar" → captura la siguiente tecla; detecta y avisa de **conflictos**; botón "Restaurar por defecto" por acción y global.
- **Táctil:** modo edición que muestra los botones reposicionables (drag) y un slider de tamaño; toggle "Joystick a la derecha"; vista previa en vivo.
- **Accesibilidad:** permitir **mantener pulsado** vs *toggle* para esquiva/movimiento; tiempo de *tap* ajustable; "auto‑recoger" como toggle global.

---

## 8. Nuevo menú de opciones (estructura por categorías)

### 8.1 Problemas del actual

`renderSettings` (`ui.js:846‑948`) es una lista vertical de 4 secciones; no hay Controles, ni Gameplay/HUD, ni presets, ni búsqueda. No escalará al añadir remapeo + maestrías + pet.

### 8.2 Estructura propuesta (≤7 categorías, lo recomendado)

1. **Gráficos** — Calidad (auto/Alta/Media/Baja/Mínima), Postproceso/Bloom, AO, Contorno, FPS HUD, Ajuste dinámico, Brillo. **+ Presets de calidad** ("Batería", "Equilibrado", "Calidad") que fijan varios toggles de golpe.
2. **Audio** — Sonido, Música, (futuro: volúmenes maestro/SFX/música separados).
3. **Controles** — Teclado/Ratón (remapeo), Táctil (layout), sensibilidad/joystick, esquiva mantener‑vs‑toggle. (§7)
4. **Interfaz / HUD** — Tamaño de HUD, mostrar daño flotante, comparador de objetos, filtro de loot, etiquetas de suelo, minimapa (tamaño/opacidad).
5. **Jugabilidad** — Auto‑recoger (pet), auto‑usar poción a umbral, dificultad de tutoriales/consejos, confirmaciones de venta.
6. **Accesibilidad** — Movimiento reducido, Texto grande, Daltónico, Alto contraste, Sacudida de cámara, Vibración, **Presets de accesibilidad** (estilo GoW: "Motor", "Visión", "Cognitivo").
7. **Datos / Cuenta** — Exportar/Importar guardado, huecos, borrar partida, (futuro: nube).

**Extras modernos:** **barra de búsqueda** de opciones (filtra por texto); cada opción con **descripción** breve y **valor por defecto** marcado; navegación por teclado/gamepad; recordar la última categoría.

### 8.3 Mockup textual

```
┌─ OPCIONES ───────────────────────────────  [🔍 buscar opción...] ─┐
│ Gráficos │ Audio │ Controles │ HUD │ Juego │ Accesib. │ Datos     │
├───────────────────────────────────────────────────────────────────┤
│  GRÁFICOS                                                          │
│   Preset:        [ Batería  · (Equilibrado) · Calidad ]           │
│   Calidad:       [ Automática ▾ ]   FPS: 58 · Q: Media            │
│   Postproceso    [✔]   Oclusión amb. [✔]   Contorno [✔]           │
│   Brillo         [▭▭▭▭▭▭▭──] 100%                                 │
│   Ajuste dinámico[✔]   Mostrar FPS [ ]                            │
│  ────────────────────────────────────────────────────────────    │
│  (Controles → ) Inventario:  I / B      [Asignar]  ⟲              │
│                 Habilidad 1: 1          [Asignar]  ⟲              │
│                 Esquiva:     Shift      [Asignar]  ⟲              │
│                 Táctil:      [ Editar disposición ]  Zurdo [ ]    │
│  ────────────────────────────────────────────────────────────    │
│   [ Restaurar por defecto ]                       [ Cerrar ]      │
└───────────────────────────────────────────────────────────────────┘
```

Implementación: refactor de `renderSettings` a un **render por categoría** (objeto `SETTINGS_SCHEMA` data‑driven: `{categoria:[{key,type,label,desc,default,options}]}`), con una pestaña que conmuta el contenido. Esto facilita añadir opciones sin tocar el layout.

---

## 9. Mejoras de ciudad / hub (NPCs, servicios, ambiente)

Estado actual: 5‑6 NPCs (Curandero, Mercader, Encantadora, Capitán, Alijo, Estatua del Mundo). Frente al estándar del género, faltan servicios y "vida".

**Servicios a añadir (prioridad):**
- **Herrero:** reparar (si se añade durabilidad — opcional), **mejorar** (Masterworking estilo D4: +stats por niveles, gold/material sink claro), y **engarzar/desengarzar** (hoy el engarce se hace en el cubo de inventario; centralizarlo da legibilidad).
- **Joyero/Cubo dedicado:** transmutación de gemas/runas (subir de calidad), recetas de cubo visibles (hoy la transmutación vive en `economy.js`/inventario sin NPC).
- **Coleccionista/Bestiario:** NPC que muestra el Códice (sets, poderes, bestiario) ya existente, dándole un lugar físico.
- **Tablón de contratos:** físico en el pueblo (hoy los contratos son por zona); refuerza el *loop* diario.
- **Buhonero del pet:** vende collares/mejoras del pet (§6.4).

**Ambiente / vida (game feel del hub):**
- NPCs ambientales que caminan, hogueras con chispas (ya hay flicker de antorchas, `main.js:509‑514`), sonido ambiente de pueblo, ciclo de iluminación cálida.
- **Hitos visibles:** estatuas/decoración que cambian al subir Tormento o completar el Pináculo ("el pueblo reacciona a tu poder").
- **Señalización:** carteles/iconos flotantes sobre cada servicio (ya hay labels), y un **mapa del pueblo** en el minimapa con nombres de servicio.

---

## 10. Backlog priorizado

Escala: Impacto/Esfuerzo/Riesgo = Bajo/Medio/Alto.

| # | Feature | Impacto | Esfuerzo | Riesgo | Dependencias | Horizonte |
|---|---|---|---|---|---|---|
| 1 | **Pet: quitar daño** (utilidad pura) | Alto | Bajo | Bajo | — | Corto |
| 2 | **Pet: auto‑loot con filtro + imán de oro** | Alto | Bajo | Bajo | #1 | Corto |
| 3 | **Feedback de drop** (haz/sonido por rareza) | Alto | Bajo | Bajo | — | Corto |
| 4 | **Comparador de objetos inline** (▲▼) | Alto | Medio | Bajo | — | Corto |
| 5 | **Remapeo teclado** (capa acción↔tecla) | Alto | Medio | Medio | refactor `input.js` | Corto |
| 6 | **Menú de opciones por categorías** (schema) | Medio‑Alto | Medio | Bajo | — | Corto |
| 7 | **Remapeo táctil** (layout, zurdo) | Medio‑Alto | Medio | Medio | #5, #6 | Medio |
| 8 | **Pet: progresión + talentos + collares** | Medio‑Alto | Medio | Bajo | #1,#2 | Medio |
| 9 | **Pet: marcar enemigos** (sinergia build) | Medio | Medio | Bajo | #8 | Medio |
| 10 | **Maestrías de clase — Fase 1 (capstones)** | **Muy alto** | Medio | Medio | `data.js`/`recompute` | Medio |
| 11 | **Pueblo↔Cripta contiguo (seamless hub)** | Alto | Medio‑Alto | Medio | instancing world | Medio |
| 12 | **Herrero (Masterworking) + servicios hub** | Alto | Medio | Medio | UI engarce | Medio |
| 13 | **Maestrías — Fase 2/3 (nodos + aspectos)** | **Muy alto** | Alto | Medio | #10 | Largo |
| 14 | **Presets de calidad y de accesibilidad** | Medio | Bajo | Bajo | #6 | Medio |
| 15 | **HUD de objetivo del loop activo + "Poder del héroe"** | Medio‑Alto | Medio | Bajo | #4 | Medio |
| 16 | **"Eras"/temporadas locales** (reto semanal) | Alto (retención) | Alto | Medio | endgame | Largo |
| 17 | **Three.js: instancing agresivo + draw calls <50 móvil** | Medio | Medio | Bajo | — | Medio |
| 18 | **OffscreenCanvas / Web Worker render** | Medio | Alto | Alto | arquitectura | Largo |

**Camino recomendado:** #1‑#4 (una iteración de "sensación"), luego #5‑#6 (QoL/accesibilidad), luego #10 + #11 (identidad e inmersión), y #13/#16 como apuestas de retención a largo plazo.

---

## 11. Fuentes y referencias (consultadas el 15‑jun‑2026)

> Algunas búsquedas devolvieron principalmente comparativas comerciales; se priorizó la síntesis verificable. La consulta directa a MMOPIXEL devolvió **HTTP 403** vía fetch automatizado, por lo que su contenido se sintetiza desde el resumen del buscador (no del cuerpo completo); se marca como tal.

**Estado del género / retención / endgame:**
- "State of ARPGs in 2026 — Diablo 4, PoE1, PoE2 and Other ARPGs" — MMOPIXEL — https://www.mmopixel.com/news/state-of-arpgs-in-2026-diablo-4-poe-1-poe-2-and-other-arpgs-march-updates *(fetch 403; resumen vía buscador: diseño endgame‑first, leagues, build variety, Last Epoch S4 "Shattered Omens")*.
- "Last Epoch vs Path of Exile 2 vs Diablo 4: Which ARPG is best 2026?" — Sportskeeda — https://www.sportskeeda.com/mmo/last-epoch-vs-path-exile-2-vs-diablo-4-which-arpg-best-2026
- "ARPGs to Play in 2026 — A Complete Tier List" — Simcookie — https://simcookie.com/2026/04/18/arpgs-to-play-in-2026-a-complete-tier-list/
- "15 Best Dungeon Crawler Games 2026 (loot, build depth, replayability)" — Switchblade Gaming — https://www.switchbladegaming.com/action-rpg/best-dungeon-crawler-games-2026/
- "Upcoming Games All About Loot" — GameRant — https://gamerant.com/upcoming-games-all-about-loot/
- "The ARPG Dopamine Hit of Finding Loot" — Diablo 3 Forums — https://us.forums.blizzard.com/en/d3/t/the-arpg-dopamine-hit-of-finding-loot/66277

**Game feel / impact feedback (académico):**
- Lin et al., "What Features Influence Impact Feel? A Study of Impact Feedback in Action Games" (2022) — arXiv 2208.06155 — https://arxiv.org/abs/2208.06155v1 *(hit‑stop, coherencia de sonido, control de cámara como factores dominantes)*.
- "Dopamine Loops and Player Retention: A Study" — JCOMA — https://jcoma.com/index.php/JCM/article/download/352/192

**Skill trees / especialización:**
- "Ultimate ARPG Guide 2025–2026: Diablo IV, Titan Quest II & More" — Magic Game World — https://www.magicgameworld.com/ultimate-arpg-guide-2025-2026-diablo-iv-titan-quest-ii-more/
- "PoE2 vs Diablo IV: Which ARPG Reigns Supreme in 2025?" — EpicCarry — https://epiccarry.com/blogs/poe-2-vs-diablo-4-breakdown/ *(PoE2 "Dual Specialization"; D4 poder en items/paragon)*.
- "Path of Exile 2 Feels Like the True ARPG Successor to Diablo" — Rolling Stone — https://www.rollingstone.com/culture/rs-gaming/path-of-exile-2-explained-1235195377/

**Seamless hub / mundo abierto:**
- "The Seamless Open World of Borderlands 4" — Game Informer — https://gameinformer.com/preview/2025/06/30/the-seamless-open-world-of-borderlands-4 *(abandono del hub‑and‑spoke por áreas seamless)*.
- "8 Open‑World Games With The Best Level Design" — GameRant — https://gamerant.com/open-world-games-best-level-design/

**Pets / compañeros de utilidad:**
- "Utility Pets — Scavenger/Loot Pet" — Ashes of Creation Forums — https://forums.ashesofcreation.com/discussion/50789/utility-pets-scavenger-loot-pet
- "Pet Ranch Guide" — Lost Ark / Maxroll — https://maxroll.gg/lost-ark/resources/pet-ranch-guide *(auto‑loot con filtros por tier; buffs de stats cambiables)*.
- "About Pets!" — Last Epoch Steam Discussion — https://steamcommunity.com/app/899770/discussions/0/3106899761095079880/ *(debate sobre auto‑loot; preferencia por incentivar recoger)*.

**Remapeo / controles / accesibilidad:**
- "Allow controls to be remapped/reconfigured" — Game Accessibility Guidelines — https://gameaccessibilityguidelines.com/allow-controls-to-be-remapped-reconfigured/
- "Use the Controls Editor" — Google Play Games — https://support.google.com/googleplay/answer/16263766 *(táctil reposicionable/redimensionable; importar esquemas)*.
- "Remapping as one of the keys to gaming accessibility" — reWASD — https://www.rewasd.com/blog/post/remapping-as-a-key-to-gaming-accessibility
- "Google Play Games beta expands control accessibility" — Can I Play That? — https://caniplaythat.com/2025/03/14/google-play-games-beta-on-windows-expands-control-accessibility/

**Menús de opciones / accesibilidad de UI:**
- "Create better game settings options (handy checklist)" — Game Developer — https://www.gamedeveloper.com/design/create-better-game-settings-options-handy-checklist-
- "Creating a Game Menu in 2025: Tips, Tools, and Trends" — Toxigon — https://toxigon.com/creating-a-game-menu-in-2025 *(≤6‑7 ítems por grupo; categorías Display/Graphics/Audio/Controls)*.
- "Game Accessibility Top Ten" — IGDA Game Accessibility SIG — https://igda-gasig.org/how/game-accessibility-top-ten-se/ *(presets de accesibilidad: GoW Ragnarök; remapeo completo: TLOU2)*.
- "Game UI Database — Settings: Menu" — https://www.gameuidatabase.com/index.php?scrn=26

**Three.js / web móvil 2026:**
- "100 Three.js Tips That Actually Improve Performance (2026)" — Utsubo — https://www.utsubo.com/blog/threejs-best-practices-100-tips
- "Three JS Rendering Guide: Master Visuals in 2026" — Rendimension — https://rendimension.com/three-js-rendering/ *(instancing reduce draw calls 90%+)*.
- "Draw Calls: The Silent Killer" — Three.js Roadmap — https://threejsroadmap.com/blog/draw-calls-the-silent-killer *(objetivo <50 draw calls móvil)*.
- "Boosting React Three Fiber Mobile Performance in 2026" — Krapton — https://www.krapton.com/blog/boosting-react-three-fiber-mobile-performance-in-2026-a-deep-dive-d6105c *(OffscreenCanvas/Web Worker; cap pixel ratio; KTX2)*.

---

## 12. Apéndice — mapa rápido de archivos relevantes

| Sistema | Archivo:línea |
|---|---|
| Orquestador / bucle / carga de mundo | `js/main.js:43`, `:357`, `:618` |
| Clases y habilidades | `js/data.js:11`, sinergias `:117` |
| Soportes (gemas de skill) | `js/data.js:363` |
| Paragon + glifos | `js/data.js:447`, `js/entities.js:356` |
| Bendiciones | `js/data.js:427` |
| Progresión jugador / recompute | `js/entities.js:310`, `:516` |
| **Mascota (Pet)** | `js/entities.js:1471`, `:1498`, ataque `:1542`, loot `:1509`; compra `js/economy.js:73`; spawn `js/main.js:323` |
| Loot / rarezas / crafteo | `js/items.js:6`, `:129`, runewords `:299`, mítico `:422`, drops `:455` |
| Pueblo / mazmorra / refugio | `js/world.js:354`, `:552`, `:843`; salida a zona `:467` |
| Zonas open | `js/zones.js:14` |
| **Controles (hardcoded)** | `js/input.js:33`, movimiento `:96`, joystick `:55` |
| **Menú de opciones** | `js/ui.js:846` |
| Calidad adaptativa | `js/main.js:182`, `:590`, `:618` |

---

*Fin del informe. Documento generado para guiar la planificación de producto; ninguna línea de código fuente fue modificada en su elaboración.*
