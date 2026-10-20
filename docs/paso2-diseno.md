# Paso 2: habilidades, talentos y especializaciones (documento de diseño)

> Estado: **DISEÑO** (sin código del juego). Fecha: 2026‑10‑20. Autor: Claude (diseño de sistemas de combate).
> Insumos: `js/data.js` (CLASSES/SKILL_MODS/SUPPORTS/MASTERIES), `js/main.js` (`castSkillSlot`, `castBasic`, `dealArea`, `onEnemyKilled`), `js/entities.js` (`Player.recompute/rollDamage/takeDamage/basicAttack`, `Enemy.takeDamage/applyStun`), `js/talents.js` (motor WIP), `js/game-mastery.js`, `js/combat-math.js`, `js/save-schema.js`, `js/bindings.js`, `tests/balance-bench.mjs`, los 9 mockups aprobados `IntentoRPG-assets/mockups/Spec-*.dc.html` + `Talentos.dc.html` (Piromante) y la auditoría de habilidades.
> Regla de lectura: cada decisión lleva una línea **«Por qué»**. Las unidades de daño son **WD** (*weapon damage*): 1 WD = un golpe medio de arma × atributo con coeficiente 1, o sea, lo que hoy pega el básico. Todos los números pasan por `combat-math.js`.

---

## 0. Resumen ejecutivo

1. **Kit de 6 ranuras con categoría**: 🖱️Izq básico · 🖱️Der gastadora · `1` movilidad · **`2` flexible (defensa, utilidad o segunda gastadora)** · `3` especialización · `4` definitiva, más la esquiva común (`Mayús`). Cada ranura solo acepta sus categorías.
   *Por qué:* la auditoría mostró que con barra libre nadie elegía movilidad ni defensa y que Maga/Arquera llenaban 5 ranuras con 5 habilidades: no había decisiones. Con categorías, la decisión pasa a ser *qué* movilidad usar y, en la ranura `2`, **supervivencia frente a daño**: es la decisión de build más visible del kit y la que permite a la Maga gestionar dos enfriamientos de gastadora.
2. **Recursos con identidad**: Furia (100, sin regeneración, se gana golpeando **y recibiendo daño**), Maná (pozo grande ≈150–450, regeneración lenta, gastadoras con enfriamiento; es el único recurso que escala con el atributo Energía) y Energía (pozo fijo de 60, regeneración **plana** de 6/s, gastadoras sin enfriamiento).
3. **Catálogo**: 14 habilidades base por clase (3 básicos, 4–5 gastadoras, 2 movilidades, 2–3 defensas o utilidades y 3 definitivas) y **42 habilidades otorgadas por talento** que salen de los mockups. Se eliminan las 5 pasivas compradas y las sinergias. Se rehacen Mandoble, Embate, Torbellino, Hendidura, Salto Devastador, Provocación, Grito de Guerra, Agilidad y las 3 definitivas de cada clase.
4. **Fin de los rangos comprados**: el rango de una habilidad sale del **nivel del héroe**, de los **talentos** (`skillLv`) y, más adelante, del **equipo**. Los 19 puntos de habilidad (Nv2–20) pasan a **desbloquear ramas** (1 punto por mini‑rama). Las habilidades se aprenden solas al llegar a su nivel.
5. **Un único resolvedor puro** `resolveSkill(p, sk)` (`js/skill-resolve.js`) fusiona rango, ramas, soportes por **tags**, talentos (`mod`, `skillLv`, `tv.costRed…`) y produce coeficiente, coste, enfriamiento, radio y efectos. Lo usan el lanzamiento, el banco y los tooltips. Habrá **GCD de 0,2 s** entre gastadoras, *windup* de 80–150 ms en los golpes pesados y **daño sincronizado con el impacto**.
6. **Talentos**: los árboles de los mockups se transcriben a `js/talents-{guerrero,maga,arquera}.js`; `game-mastery.js` se sustituye por `game-talents.js`. El cambio estructural es **uno solo**: el nodo clave gratuito (s0) **otorga la habilidad insignia** de la especialización (ranura 3) desde Nv10, y el nodo s4, que antes la otorgaba, pasa a potenciarla.
7. **Primitivas de rol**: amenaza y provocación, alcance de buffs `self/party/aura`, curas y escudos al «aliado con menos vida», **barra de aturdimiento acumulado (stagger) en jefes** y control con rendimientos decrecientes por categoría.
8. **Banco por rol**: escenarios de un objetivo, área ×5, aguante con defensas activas, aporte de apoyo y tiempo de control. Cada especialización debe ser la mejor de su clase en su métrica de rol, con al menos un 10 % de margen.
9. **Migración**: guardado v3 (kit, ramas, hotbar y soportes, Paso 2b) y v4 (maestría → talentos, Paso 2c). La reespecialización pasa a ser **gratuita fuera de combate**.
10. **Arquitectura de poderes data‑driven** (§9.1): cada poder es una entrada de `POWER_HOOKS` con ganchos tipados (`onHit`, `onKill`, `onDamaged`, `modifyResolve`…), invocados desde un número fijo de puntos del juego. No habrá `if (powers.has(...))` dispersos, y la etapa 2c se reparte con un trabajador por clase sin tocar archivos compartidos.
11. **Dos reglas de sustento y daño**: un único saco **Debilidad** en el objetivo (Vulnerable + debilitamientos, tope ×1,5) y una única **cubeta de sustento** (toda cura disparada por golpes o muertes comparte el tope de 6 % de vida/s del Paso 1A).

---

## 1. Estructura del kit por clase

### 1.1 Ranuras y teclas (solo PC)

| Ranura | Tecla (por defecto) | Categoría (`sk.cat`) | Desbloqueo | Notas |
|---|---|---|---|---|
| `lmb` | Clic izquierdo | `basic` (generador) | Nv1 | Mantener pulsado = repetir (ya existe en `tick`). Sin GCD; lo marca la cadencia. |
| `rmb` | Clic derecho | `spender` (gastadora principal) | Nv2 | GCD 0,2 s. Admite también las gastadoras de especialización (Veredicto Final, Lanza de Hielo, Misiles Arcanos, Disparo Apuntado). |
| `k1` | `1` | `movement` | Nv4 | **Fuera del GCD**: escapar siempre es posible. |
| `k2` | `2` | **flexible**: `defense` / `utility` / `spender` | Nv6 (la opción gastadora, desde Nv8 con la Gastadora B) | GCD 0,2 s. **Decisión de build: supervivencia frente a daño.** No admite la misma habilidad que `rmb`. |
| `k3` | `3` | `spec` | Nv10 (al elegir especialización) | Admite cualquier activa otorgada por el árbol de la especialización activa. Por defecto, la insignia. |
| `k4` | `4` | `ultimate` | Nv15 | GCD 0,2 s. Sin coste de recurso; solo enfriamiento de 45–60 s. |
| esquiva | `Mayús` | común | Nv1 | Recarga 3 s (1,8 s con el poder Ágil) e invulnerable 0,26 s. **Cancela** el *windup* y la canalización en curso. |

- `js/bindings.js` **no cambia de teclas**: `skill1..4` = `Digit1..4`, `dodge` = `Shift` y `primary` = `Espacio` (atacar al más cercano o interactuar). Solo se añade la acción `talents: ['KeyN']` (convención de WoW) y su etiqueta en `BINDABLE_ACTIONS`.
- `assignHotbar(slot, id)` valida que `sk.slots.includes(slot)` y que la habilidad no esté ya en otra ranura. Cada habilidad declara sus ranuras válidas en `slots`, que se derivan de su categoría (`CAT_SLOTS`):
  - básico → `['lmb']`;
  - gastadora → `['rmb','k2']`;
  - gastadora de especialización → `['rmb','k2','k3']`;
  - defensa o utilidad → `['k2']` (las de especialización, `['k2','k3']`);
  - movilidad → `['k1']`;
  - especialización → `['k3']`;
  - definitiva → `['k4']`.
- *Por qué hay categorías:* con 4 teclas más 2 botones, el jugador de PC lee el kit de un vistazo (modelo Lost Ark / WoW). Toda build tiene una movilidad, y el diseño de enemigos puede contar con ello (p. ej. telegrafías que exigen desplazarse).
- *Por qué `k2` es flexible:* con una sola ranura de gastadora, la identidad de la Maga («gestionar enfriamientos») era imposible. Una build de Meteoro, con 7 s de enfriamiento, pasaba ~80 % del tiempo en el básico. La flexibilidad convierte la ranura en la **decisión de build más visible**:
  - con una defensa: aguante (tanques, contenido difícil, Hardcore);
  - con una segunda gastadora: +15–25 % de daño a cambio de depender de la esquiva y la movilidad.
  El banco mide ambas variantes (§7) para que la decisión sea real y no una trampa.

### 1.2 Calendario de desbloqueo (todas las clases)

| Nv | Qué se desbloquea |
|---|---|
| 1 | Básico A (el actual de arma) |
| 2 | Gastadora A |
| 3 | Básico B |
| 4 | Movilidad A |
| 6 | Defensa/utilidad A |
| 8 | Gastadora B (primera vez que `2` puede ser gastadora) y Básico C |
| 10 | **Especialización** (habilidad insignia en `3`) y árbol de talentos |
| 12 | Movilidad B y Defensa/utilidad B |
| 14 | Gastadora C (y D) |
| 15 | Las 3 definitivas (eliges una) |
| 16 | Defensa/utilidad C (si la clase la tiene) |
| 11–50 | Activas de talento (árbol de clase y de especialización) según los puntos gastados |

*Por qué:* el jugador recibe una herramienta nueva por nivel hasta el 16 (curva de aprendizaje de D4) y a partir de ahí la novedad llega por talentos.

### 1.3 Opciones por categoría y clase (resumen; el detalle está en §3)

| Categoría | Guerrero | Maga | Arquera |
|---|---|---|---|
| Básico | Tajo · Mandoble · Embate | Dardo Arcano · Ascua · Toque Gélido | Disparo Rápido · Disparo Disperso · Flecha de Cicuta |
| Gastadora | Torbellino · Hendidura · Martillo de Guerra · Terremoto · Lanza Arrojadiza (+ Veredicto Final) | Bola de Fuego · Rayo · Nova de Hielo · Meteoro (+ Lanza de Hielo, Misiles Arcanos) | Flecha Perforante · Flecha Múltiple · Lluvia de Flechas (+ Disparo Apuntado) |
| Movilidad | Embestida · Salto Devastador · Intervención† · Carga de Escudo† | Paso de Escarcha · Estela Ígnea · Parpadeo† | Paso Veloz · Agilidad · Voltereta† · Salto de Retirada† · Disparo Disuasorio† |
| Defensa/utilidad | Piel de Hierro · Provocación · Grito de Guerra · Segundo Aliento† · Bramido de Guerra† · Martillo de Justicia† | Armadura de Hielo · Onda Repulsora · Barrera de Maná† · Contrahechizo† · Inversión del Tiempo† · Bloque de Hielo† · Muro de Fuego† · Aliento Boreal† | Red de Caza · Bomba de Humo · Disparo Conmocionante† · Flecha Silenciadora† · Flecha Bengala† · Camuflaje† · Señuelo de Paja† · Arpón† |
| Especialización | Remolino Sangriento / Temeridad / Ira Ciega (Berserker) · Grito Desafiante / Muro de Escudos (Guardián) · Aura de Devoción / Veredicto Final (Cruzado) | Llamarada / Combustión (Piromante) · Prisión de Hielo / Ventisca / Lanza de Hielo (Crionte) · Orbe Arcano / Sello del Archimago / Misiles / Evocación (Arcanista) | Disparo Apuntado / Visión Certera (Francotiradora) · Trampa de Cepo / Arpón (Montaraz) · Andanada / Danza de Flechas (Tiradora) |
| Definitiva | Furia Inmortal · Cataclismo · Estandarte de Guerra | Supernova · Tormenta Glacial · Desgarro Arcano | Diluvio de Saetas · Tiro Celestial · Cerco de Zarzas |

† = la otorga un talento (árbol de clase o de especialización). Las activas de talento ocupan su categoría natural; las del árbol de especialización pueden ir también en `3`. Todas las gastadoras de la fila «Gastadora» pueden ir en `rmb` **o** en `2`.

### 1.4 Qué gana cada clase con la ranura `2` flexible

| Clase | Combinación ofensiva (gastadora en `2`) | Combinación defensiva | Por qué es una decisión real |
|---|---|---|---|
| **Maga** | **Piromante**: Bola de Fuego (`rmb`, 1,5 s) + **Meteoro** (`2`, 7 s) + Llamarada (`3`, 8 s): tres enfriamientos que entrelazar con el Calor (Ignición Total abarata el Meteoro). **Crionte**: Nova de Hielo + Lanza de Hielo; congelar y astillar. **Arcanista**: Rayo + Misiles Arcanos (`2`) con Orbe en `3`; la ráfaga entera de Cargas | Armadura de Hielo, Barrera de Maná o Inversión del Tiempo | La Maga es la clase más frágil: llevar dos gastadoras significa vivir de la esquiva y de Parpadeo. Es la build de quien juega bien |
| **Guerrero** | **Berserker**: Hendidura (`rmb`) + Torbellino (`2`); un golpe frontal y un giro, sin defensivo, lo que encaja con Sed (perder vida llena el indicador). **Cruzado**: Veredicto Final (`rmb`) + Martillo de Guerra (`2`), que genera Fervor sin esperar muertes. **Guardián**: Martillo + Terremoto (control), solo para quien juega solo en dificultad baja | Piel de Hierro, Segundo Aliento, Bramido o Provocación | La Furia por daño recibido premia al que se expone: la combinación ofensiva del Berserker es su fantasía, y la del Guardián es una trampa intencionada (su métrica de rol se mide con defensa) |
| **Arquera** | **Tiradora**: Flecha Múltiple (`rmb`) + Lluvia de Flechas (`2`); hordas a dos niveles. **Francotiradora**: Flecha Perforante (`rmb`) + Disparo Apuntado (`2`), y deja `3` para Visión Certera. **Montaraz**: Lluvia de Flechas con Abrojos en `2` + Trampa en `3` | Bomba de Humo, Red de Caza, Camuflaje o Disparo Conmocionante | La Energía no da para gastar dos gastadoras sin pausa, así que la ofensiva exige más ritmo. La Francotiradora libera `3` para su buff de 90 s, otra forma de ráfaga |

Reglas del lanzamiento: las dos gastadoras comparten el GCD de 0,2 s y cada una conserva su enfriamiento. **No hay una tercera gastadora**: `k3` solo admite las gastadoras de *especialización*.
*Por qué:* así la ranura de especialización sigue siendo identitaria.

---

## 2. Recursos con identidad

| | **Furia** (Guerrero) | **Maná** (Maga) | **Energía** (Arquera) |
|---|---|---|---|
| Máximo | **100** fijo (+talentos/equipo planos) | **100 + 2·Energía(atrib.) + 3·(nivel−1)** → ≈145 en Nv1, ≈260 en Nv50 sin equipo, 350–450 con equipo | **60** fijo (+6/rango de Carcaj Profundo; equipo hasta +20). **No** escala con ningún atributo |
| Al empezar o cargar | 0 | lleno | lleno |
| Regeneración pasiva | **0** | **2,5/s** × (1 + Energía·0,02) ≈ 3,6/s en Nv1 (`combat-math.resourceRegen`) | **6/s plana** + stat `energyRegen` (talentos y equipo, tope +4/s). **No** usa el atributo Energía |
| Generación por básico | Tajo **+10** (+2 por objetivo extra, máx. +16) · Mandoble **+14** · Embate **+7** (+2/extra, máx. +15). Solo al acertar | **+3** (Toque Gélido +4). «Casi no genera» | **+5** al acertar |
| Generación por daño recibido | **+1 por cada 2 % de vida máx. perdida** (tras mitigar), tope 12/s | — | — |
| Pérdida | tras **4 s** sin golpear ni recibir daño: **−12/s** | — | — |
| Coste típico de gastadora | 20–35 (sin enfriamiento) | 18–40 **con enfriamiento** de 1,5–7 s | 20–30 (sin enfriamiento; Lluvia de Flechas con 4 s) |
| Coste de utilidad o especialización | 0–30 | 20–35 | 10–25 |
| Definitivas | 0 (solo enfriamiento) | 0 | 0 |
| Poción de recurso (`E`) | +40 Furia | +45 % del maná | +100 % de la Energía |

**Por qué cada uno:**
- *Furia*: el guerrero se gana el combate en primera línea. Que el daño recibido genere recurso hace que el tanque tenga más recurso cuanto más le pegan (fantasía de Guardián) y castiga el «kiteo» melee. La pérdida fuera de combate impide almacenarla.
- *Maná*: ahora es un **pozo de ráfaga**. La Maga abre con 6–8 hechizos y luego administra. El límite real lo ponen los enfriamientos cortos de sus gastadoras (gestionar enfriamientos es su identidad), no esperar a que se rellene una barra. Que el básico casi no genere evita el bucle «dardo, bola, dardo» de hoy.
- *Energía*: un **pozo chico que vuelve rápido** da ritmo de ráfagas cortas (gastar 3, respirar 2 s). Regeneración plana y máximo fijo: ni el máximo ni la regeneración leen el atributo Energía. Así se deshace la confusión de nombres y la equivalencia Maná ≈ Energía que señaló la auditoría.
- **Atributo Energía**: **solo** tiene efecto de recurso en la Maga (máximo y regeneración de Maná). `resources.js` llama `resourceRegen(base, ene)` con `ene` solo si `res.id === 'mana'`; si no, con 0. Para el Guerrero y la Arquera el atributo no aporta recurso, y la ficha lo indica con una nota gris («sin efecto en tu clase»). Darle un uso a ese atributo en esas clases queda para el paso de itemización y atributos.
  *Por qué:* es coherente y simple. Hoy un punto de Energía da recurso a las tres clases y eso, justamente, igualaba Maná y Energía.

**Objetivo de sostenido** (rotación base sin especialización, contra un objetivo): **1,7–2,0 WD/s en las tres clases (±10 %)**. Fracción de acciones que son gastadoras: Guerrero ≈ 20–30 % (sube si recibe daño), Maga ≈ 45 % los primeros 18 s y ≈ 30 % después, Arquera ≈ 25–30 %. Con una segunda gastadora en `2`, el objetivo es **+15–25 %** sobre esa cifra (la Maga, más cerca del +25 %, porque su límite eran los enfriamientos y no el recurso). El banco lo verifica (§7).

**Mecánicas propias de cada especialización** (indicador secundario sobre la barra de habilidades, como `CALOR · PIROMANTE` en el mockup del HUD). Viven en `js/spec-mechanics.js` (puro):

| Especialización | Indicador | Cómo se llena | Qué hace |
|---|---|---|---|
| Berserker | **Sed** 0–100 | +1 por 1 % de vida perdida · +2 por tic de Sangrado (máx. 10/s) · +4 por enemigo golpeado por Remolino (nodo s4, máx. 20 por uso) · +2 por crítico (Instinto Asesino) | Al llegar a 100: **Sed Saciada** 6 s, que activa el multiplicador `m_berserk` ×1,25 aunque tengas la vida alta; luego vuelve a 0. Con Sangre Hirviente (s14): **Desenfreno** 8 s (+30 % de velocidad de ataque y +1 % de vida por golpe; es cura al golpear y pasa por la cubeta de sustento, §6.1). Baja −8/s tras 4 s fuera de combate |
| Guardián | **Bastión** 0–5 cargas | +1 por bloqueo · +2 por Grito Desafiante (s4) · +1 si Martillo golpea a 3 o más (s7) | −2 % de daño recibido por carga (s17). Muro de Escudos las gasta. Se pierde 1 carga cada 6 s sin ganar ninguna |
| Cruzado | **Fervor** 0–3 | +1 por muerte con Juicio · +1 cada 3 impactos de Martillo de Guerra · +15 %/rango por impacto (s12) · +1 al lanzar Aura de Devoción (s4) | Veredicto Final gasta 3. Ascensión (x3) hace que no se gaste |
| Piromante | **Calor** 0–100 | +5 por golpe de Fuego que aplica Quemadura · +25 por Llamarada (s4) · ×2 durante Combustión | A 100: **Ignición Total**: la siguiente Bola de Fuego o Meteoro cuesta 0 y es crítico seguro; vuelve a 0. Baja −10/s tras 3 s |
| Crionte | **Escarcha** 0–5 capas **por enemigo** | +1 por golpe de Escarcha · Nova +2 (+1/rango de s11) · Ventisca +1/s · Aliento Boreal +3 | A 5 capas: **Congelado** 1,5 s (control duro con rendimientos decrecientes; en jefes: **Aterido** 4 s = −30 % de movimiento y −15 % de velocidad de ataque, y suma 25 de stagger). Las capas caen 1 cada 2 s |
| Arcanista | **Cargas Arcanas** 0–4 | Dardo +1 por impacto · Orbe +1 por enemigo (máx. 2, s4) · Sello +4 | Rayo las consume todas: **+35 % de daño aditivo por carga** y devuelve 5 de maná por carga. Se pierden 6 s después de la última ganancia (salvo con Resonancia) |
| Francotiradora | **Concentración** 0–100 | +20/s quieta (+20 %/rango con s2) · moverse: −25/s | +0,15 % de crítico por punto (+15 % a 100). A 100, Disparo Apuntado es instantáneo (s4) y gasta 50 |
| Montaraz | **Coto de Caza**: trampas armadas (máx. 3, o 4 con s14) y Presa | Trampa de Cepo: 1 carga (2 con s4), recarga de 8 s por carga · Presa = primer élite o jefe golpeado, 15 s | Las trampas son entidades en el suelo. Presa: revelada, +10 %/rango de daño (s15) |
| Tiradora | **Impulso** 0–100 | +3 por disparo hecho **en movimiento** · +20 por Andanada (s4) · +30 por Salto de Retirada | A 100: **Vendaval** 6 s (+25 % de velocidad de ataque, +1 proyectil a Flecha Múltiple, disparar no frena); luego vuelve a 0 |

*Por qué un indicador por especialización:* es la lección de las especializaciones de WoW y de D4 Lord of Hatred. El recurso de clase es igual para todos (Furia/Maná/Energía) y la especialización añade **un ritmo propio** sin reemplazarlo.

---

## 3. Catálogo completo de habilidades

### 3.0 Convenciones de las tablas

- **Coef.** = coeficiente en WD por objetivo y por uso (en `combat-math.hitDamage`), con rango 1. «×N» indica objetivos o tics.
- **Escalado por rango**: `coef × (1 + 0,10·(rango−1))`; los buffs, escudos y curas crecen +6 %/rango; los enfriamientos no escalan.
- **Tags** (vocabulario cerrado): de categoría `basic spender movement defense utility spec ultimate`; de entrega `melee proj area cone line channel aura zone trap mark summon shout buff shield heal`; de alcance `ally`; de control `cc taunt interrupt`; de elemento `physical fire frost arcane holy nature`; extra `dot`. El elemento sustituye a `SKILL_ELEM` de `talents.js` (pasa a vivir en `sk.elem`).
- **Windup** = tiempo previo al impacto, cancelable con la esquiva. **Bloqueo** = tiempo de animación en que no se puede lanzar otra cosa (la esquiva sí).
- **CC**: la duración es nominal (antes de rendimientos decrecientes); «Int.» indica si la habilidad del **jugador** se interrumpe al recibir un golpe de más del 10 % de la vida máxima.
- **Presupuesto**: básico ≈1 WD/s · gastadora ≈2,2–3 WD por uso · insignia de especialización ≈4–6 WD por uso · **definitiva ≈20–22 WD por uso (≈10× una gastadora)**. Las habilidades de área reparten ≈65–75 % por objetivo respecto a su equivalente de un objetivo.
- Estado: **C** se conserva · **R** se rehace · **N** es nueva · **T** la otorga un talento (es nueva).

### 3.1 GUERRERO (Furia, `physical` salvo indicación)

| id | Nombre | Est. | Ranura | Tags | Coste / Gen. | Enfr. | Coef. | Efecto · CC | Windup / bloqueo | Specs | VFX / SFX |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `g_tajo` | Tajo | C | lmb | basic melee area | **+10** (+2/extra) | cadencia 1,0 s | 1,0 objetivo + 0,5 adyacentes (≤2 m) | — | 0 / 0,6× cadencia | Guardián | `basicCleave` / `hit` |
| `g_mandoble` | Mandoble | R | lmb | basic melee | **+14** | cadencia ×1,5 | **1,5** | Golpe único. *Antes 2,12 WD/s gratis; ahora 1,0 WD/s* | **120 ms** | Berserker (c5A, s6B, s7) | `meleeHit` grande / `hit`+`crit` |
| `g_embate` | Embate | R | lmb | basic melee area | **+7** (+2/extra, máx. 15) | cadencia ×1,1 | 0,6 × todos en r 2,5 | — | 0 | hordas; c5B | anillo / `hit` |
| `torbellino` | Torbellino | R | rmb/k2 | spender melee area | 25 | — | **1,6** × todos r 2,9 | Giro instantáneo | 0 / 0,3 s | Berserker (s3, s10, s16), c9 | aura de giro / `dash` |
| `g_hendidura` | Hendidura | R | rmb/k2 | spender melee cone | 30 | — | **2,6** cono 120° 4,5 m | Golpe frontal pesado (ya no es otro Torbellino) | **120 ms** | Berserker (s3, s10) | arco rojo / `hit` |
| `g_martillo` | Martillo de Guerra | R | rmb/k2 | spender melee area | 30 | — | **2,4** r 3 delante (alcance 2,5) | Genera Fervor (1 cada 3 impactos) o Bastión (s7) | **150 ms** | Guardián, Cruzado | onda + polvo / `hit` grave |
| `terremoto` | Terremoto | R | rmb/k2 | spender line cc | 35 | 6 s | **3,0** en línea 8×2 m | Aturde **0,75 s** a los no jefes; en jefes suma 20 de stagger | **150 ms** | Guardián (s10) | grieta en el suelo / temblor |
| `g_lanza` | Lanza Arrojadiza | C | rmb/k2 | spender proj | 20 | — | **1,9** perforante | Opción a distancia para voladores o lanzadores | 0 / 0,3 s | todas | `shoot` |
| `embestida` | Embestida | C | k1 | movement melee area | gen **+12** si golpea | 8 s | 1,2 r 1,9 al llegar | Embiste 7 m | 0 / 0,25 s | Berserker, c11 | estela / `dash` |
| `g_salto` | Salto Devastador | R | k1 | movement area cc | — | 12 s | **1,8** r 3,2 | **Ahora sí te mueve** (8 m al cursor, 0,45 s en el aire, intocable). Ralentiza 40 % 2 s | 0 / 0,45 s | Berserker, Guardián, c11 | caída + anillo / `hit` grave |
| `g_piel` | Piel de Hierro | N | k2 | defense buff | — | 25 s | — | **−30 % de daño recibido** (saco `dr`, tope 50) 6 s; inmune a ralentizaciones | 0 | todas (Nv6) | brillo metálico / `equip` |
| `g_provocacion` | Provocación | R | k2 | utility taunt cc | gen +15 | 8 s | — | **Provoca de verdad** a 1 enemigo (15 m) 4 s; ese enemigo te hace −15 % de daño | 0 | Guardián (s6B «Reto»), cooperativo | grito + marca / `levelup` grave |
| `grito_guerra` | Grito de Guerra | R | k2 | utility shout buff ally | **+30 Furia** al instante | 20 s | — | Grupo a 15 m: +10 % de daño (aditivo) 8 s | 0 | Berserker, Cruzado | onda dorada / `levelup` |
| `g_t_aliento` | Segundo Aliento | T (c2) | k2 | defense heal | consume toda la Furia | 30 s | — | Cura 1 % de vida por cada 3 de Furia (100 → 33 %) | 0 | todas | curación roja / `potion` |
| `g_t_intervencion` | Intervención | T (c3) | k1 | movement ally shield | — | 20 s | — | Salta a un aliado (o 8 m al cursor); escudo del 15 % de tu vida a ambos durante 6 s | 0 / 0,4 s | Guardián, Cruzado | salto + domo / `dash` |
| `g_t_bramido` | Bramido de Guerra | T (c12A) | k2 | defense shout ally | — | 45 s | — | Grupo a 15 m: +15 % de vida máx. y cura ese 15 %, 10 s | 0 | Guardián | onda roja / `levelup` |
| `g_t_remolino` | Remolino Sangriento | T (**s0** Berserker) | k3 | spec melee area dot | 30 | 6 s | 0,45 × 10 tics en 3 s (**4,5**/objetivo) + Sangrado | Te mueves a velocidad normal; +4 Sed por enemigo (s4) | 0 | **Berserker (insignia)** | torbellino rojo + gotas / `dash` |
| `g_t_temeridad` | Temeridad | T (s9) | k3 | spec buff | — | 90 s | — | 10 s: +25 % de crítico, Sed ×2, **+10 % de daño recibido** | 0 | Berserker | aura carmesí / `crit` |
| `g_t_ira_ciega` | Ira Ciega | T (s13B) | k3/k2 | spec buff | 10 % de la vida actual | 60 s | — | 6 s: +30 % de daño (aditivo) e imparable (inmune a control) | 0 | Berserker | ojos rojos / `hurt` |
| `g_t_desafio` | Grito Desafiante | T (**s0** Guardián) | k3 | spec shout taunt cc area | gen +20 | 12 s | — | **Provoca** a todos a 10 m durante 4 s; +2 Bastión (s4) | 0 | **Guardián (insignia)** | onda azul / grito |
| `g_t_muro` | Muro de Escudos | T (s9) | k3/k2 | spec defense | gasta todo el Bastión | 25 s | — | −10 % de daño por carga durante 8 s (máx. −50 %, saco `dr`); Venganza (x2) devuelve un % | 0 | Guardián | domo de escudos / `equip` |
| `g_t_carga` | Carga de Escudo | T (s13B) | k1 | movement cc | — | 14 s | 1,0 | Cargas 8 m arrastrando enemigos y los aturdes 1,5 s | 0 / 0,35 s | Guardián | estela azul / `dash` |
| `g_t_devocion` | Aura de Devoción | T (**s0** Cruzado) | k3 | spec aura heal ally holy | — | 30 s | — | Grupo a 15 m durante 8 s: **2 % de vida/s** y +30 de armadura; +1 Fervor (s4) | 0 | **Cruzado (insignia)** | círculo sagrado / campana (nuevo `holy`) |
| `g_t_veredicto` | Veredicto Final | T (s9) | rmb/k2/k3 | spec spender cone holy heal | **3 Fervor** | — | **3,0** cono 6 m | Cura al grupo el 25 % del daño hecho (+10 %/rango de Gracia) | **120 ms** | Cruzado | martillo de luz / `crit` |
| `g_t_justicia` | Martillo de Justicia | T (s13B) | k2 | utility proj cc holy | — | 15 s | 1,2 | Aturde 3 s (jefes: 1,5 s **y** +30 de stagger) | 0 | Cruzado | martillo arrojado / `hit` |
| `g_u_furia` | Furia Inmortal | R | k4 | ultimate buff | — | **60 s** | ≈ **12–14 WD** equivalentes | 10 s: gastadoras a coste 0, +30 % de velocidad de ataque, imparable | 0 | Berserker | aura de fuego / rugido |
| `g_u_cataclismo` | Cataclismo | R | k4 | ultimate area holy | — | **50 s** | 6 impactos × **3,5** en 3 s, r 3 (**21 WD** en el centro) | Telegrafía de 0,4 s por impacto | 150 ms | Cruzado (s16) | meteoros de luz / `fire` grave |
| `g_u_estandarte` | Estandarte de Guerra | R | k4 | ultimate aura ally | — | **55 s** | ≈ 8 WD solo + defensa | Estandarte r 8 durante 12 s: grupo +20 % de daño (aditivo), `dr` +15, +5 Furia/s | 0 | Guardián, Cruzado (s10) | estandarte / `levelup` |

**Eliminadas**: `g_p_fuerza`, `g_p_coraza`, `g_p_sed` (pasivas compradas; su función pasa a los talentos c1, c4 y c10). *Por qué:* una pasiva de «+X %» en la barra de habilidades es un punto de relleno; en el árbol de talentos es una decisión entre nodos.

### 3.2 MAGA (Maná; `arcane` salvo indicación)

| id | Nombre | Est. | Ranura | Tags | Coste / Gen. | Enfr. | Coef. | Efecto · CC | Windup / bloqueo | Specs | VFX / SFX |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `m_dardo` | Dardo Arcano | C | lmb | basic proj | **+3** | cadencia 1,1 s | 1,0 | +1 Carga Arcana (Arcanista). Con Carámbanos (Crionte s7) pasa a Escarcha y suma 1 capa | 0 | Arcanista, Crionte | dardo violeta / `bolt` |
| `m_ascua` | Ascua | N | lmb | basic proj area fire | **+3** | 1,1 s | 0,75 + 0,3 salpicadura r 1,5 | Aplica Quemadura con Ignición (s0) | 0 | Piromante | ascua / `fire` |
| `m_toque` | Toque Gélido | N | lmb | basic cone frost cc | **+4** | 1,1 s | 0,7 × todos en cono 70° 4 m | Ralentiza 20 % 1,5 s; +1 capa | 0 | Crionte | vaho helado / `ice` |
| `bola_fuego` | Bola de Fuego | C | rmb/k2 | spender proj area fire | 18 | **1,5 s** | **2,2** + 1,0 r 2 | Explota al impactar (daño en el impacto, no al lanzar) | lanzamiento 0,3 s | Piromante (s2) | bola + estallido / `fire` |
| `rayo` | Rayo | C | rmb/k2 | spender proj arcane | 20 | **2,2 s** | **2,8** perforante | Consume Cargas: +35 % aditivo y +5 de maná por carga | 0 / 0,3 s | Arcanista (s2, s10, x1) | `spawnBeam` / `bolt` |
| `nova_hielo` | Nova de Hielo | C | rmb/k2 | spender area frost cc | 25 | **4 s** (antes 6) | 1,4 r 3,3 | +2 capas; ralentiza 30 % 3 s | 0 | Crionte (s2, s6, s11, s16, x1) | anillo de hielo / `ice` |
| `meteoro` | Meteoro | C | rmb/k2 | spender area fire | 40 | **7 s** | **5,0** r 3 | **Impacta a 0,6 s** (el daño llega con la bola, no antes); charco con Pira (s7) | telegrafía 0,6 s | Piromante (s7, s10) | caída + cráter / `fire` |
| `k_lanza` | Lanza de Hielo | T (s9 Crionte) | rmb/k2/k3 | spec spender proj frost | 22 | 6 s | **2,5** perforante | ×3 a los Congelados y los astilla; estallido de 3 m | 0 | Crionte | lanza cristalina / `ice` |
| `a_misiles` | Misiles Arcanos | T (s6A Arcanista) | rmb/k2/k3 | spec spender channel | 30 | — | 6 × **0,7** en 2 s (4,2) | +1 % de maná por misil. **Int.** | canalización 2 s | Arcanista | misiles / `bolt` ×6 |
| `m_paso_escarcha` | Paso de Escarcha | N | k1 | movement frost | — | 10 s | — | Desliza 6 m; estela de 3 s que ralentiza 40 % y suma 1 capa | 0 / 0,2 s | Crionte | estela helada / `dash` |
| `m_estela_ignea` | Estela Ígnea | N | k1 | movement fire zone | — | 10 s | 0,4/s durante 3 s | Desliza 6 m dejando fuego | 0 / 0,2 s | Piromante | estela de fuego / `dash` |
| `m_t_parpadeo` | Parpadeo | T (c3) | k1 | movement | — | 15 s | — | Teletransporte de 8 m al cursor (instantáneo; atraviesa enemigos, no muros) | 0 | todas | destello / `portal` |
| `m_armadura` | Armadura de Hielo | N | k2 | defense shield frost | — | 20 s | — | Escudo del 20 % de la vida máx. 6 s; quien te golpea cuerpo a cuerpo gana 1 capa | 0 | todas (Nv6) | coraza / `ice` |
| `m_onda` | Onda Repulsora | N | k2 | utility area cc | 15 | 12 s | 0,8 r 4 | Empuja 5 m y aturde 0,5 s | 0 | todas | onda / `portal` |
| `m_t_barrera` | Barrera de Maná | T (c2) | k2 | defense shield | — | 30 s | — | Escudo = **30 % del maná máximo**, 8 s | 0 | Arcanista | burbuja / `potion` |
| `m_t_contrahechizo` | Contrahechizo | T (c5A) | k2 | utility interrupt | — | 18 s | — | Interrumpe al lanzador y lo silencia 3 s (12 m); en jefes, +20 de stagger | 0 | cooperativo | runa / `error` invertido |
| `m_t_inversion` | Inversión del Tiempo | T (c12A) | k2 | defense | — | 60 s | — | Vuelves a tu vida y posición de hace 5 s | 0 | todas | reloj / `portal` |
| `m_t_bloque` | Bloque de Hielo | T (c12B) | k2 | defense | — | 90 s | — | Inmune 4 s; no puedes moverte ni atacar (cancelable) | 0 | todas | bloque / `ice` |
| `p_llamarada` | Llamarada | T (**s0** Piromante) | k3 | spec cone fire | 25 | 8 s | 1,5 cono 7 m | Detona las Quemaduras: 60 % de su daño restante (**100 %** con s4) y +25 Calor (s4) | 100 ms | **Piromante (insignia)** | cono de fuego / `fire` |
| `p_combustion` | Combustión | T (s9) | k3 | spec buff fire | — | 90 s | — | 10 s: el Fuego siempre es crítico y el Calor se duplica | 0 | Piromante | llamas en el cuerpo / `fire` |
| `p_muro_fuego` | Muro de Fuego | T (s13B) | k2/k3 | utility zone fire | 20 | 18 s | 0,6/s | Línea de 8 m, 5 s; **bloquea el paso** a los no jefes | 0 | Piromante | muro / `fire` |
| `k_prision` | Prisión de Hielo | T (**s0** Crionte) | k3 | spec area cc frost | 30 | 20 s | 0,8 r 4 | 5 capas → Congelados **2 s** (3 s con s4); jefes: Aterido + 20 de stagger (35 con s4) | 120 ms | **Crionte (insignia)** | cúpula de hielo / `ice` grave |
| `k_ventisca` | Ventisca | T (s6A) | k3 | spec zone frost cc | 35 | 15 s | 0,3/s durante 6 s, r 5 | +1 capa/s a todo lo que esté dentro | 0 | Crionte | tormenta / viento |
| `k_aliento` | Aliento Boreal | T (s13B) | k2/k3 | utility cone cc frost | 20 | 12 s | 1,0 cono 6 m | Empuja 4 m y suma +3 capas | 0 | Crionte | aliento / `ice` |
| `a_orbe` | Orbe Arcano | T (**s0** Arcanista) | k3 | spec proj arcane | 20 | 8 s | **2,0** por impacto, atraviesa y rebota 2 veces | +1 Carga por enemigo (máx. 2, s4) | 0 | **Arcanista (insignia)** | orbe lento / zumbido |
| `a_sello` | Sello del Archimago | T (s9) | k3 | spec mark | — | 45 s | — | Marca 8 s; guarda el 25 % del daño que recibe y **estalla** con todo; +4 Cargas | 0 | Arcanista | runa sobre el objetivo / `crit` |
| `a_evocacion` | Evocación | T (s13A) | k2/k3 | utility channel | — | 60 s | — | Canaliza 3 s y recupera el 60 % del maná. **Int.** | canalización 3 s | Arcanista | espiral / `potion` |
| `m_u_supernova` | Supernova | R | k4 | ultimate area fire | — | **50 s** | **14** r 5 + Quemadura 6 (**20 WD**) | Telegrafía 0,5 s | 150 ms | Piromante (s10, s16, x3) | estrella / `fire` grave |
| `m_u_tormenta` | Tormenta Glacial | N | k4 | ultimate zone frost cc | — | **55 s** | 0,6 cada 0,5 s durante 8 s (**9,6**) + control | Te sigue (r 6); +2 capas/s → congelación continua (con rendimientos decrecientes); su valor es de control | 0 | Crionte | ventisca / viento + `ice` |
| `m_u_desgarro` | Desgarro Arcano | N | k4 | ultimate channel arcane | — | **45 s** | **6,5/s** × 3 s (**19,5**) a un objetivo | Imparable; al terminar, +4 Cargas | canalización 3 s | Arcanista | rayo gigante / `bolt` continuo |

**Eliminada**: `m_p_arcano` (pasiva). *Por qué Rayo y Bola de Fuego conservan enfriamiento:* los mockups lo referencian (s2 de Piromante y de Arcanista) y la gestión de enfriamientos es la identidad de la Maga frente al «gasta y espera» de la Arquera.

### 3.3 ARQUERA (Energía; `physical` salvo indicación)

| id | Nombre | Est. | Ranura | Tags | Coste / Gen. | Enfr. | Coef. | Efecto · CC | Windup / bloqueo | Specs | VFX / SFX |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `a_disparo` | Disparo Rápido | C | lmb | basic proj | **+5** | cadencia 0,9 s | 1,0 | — | 0 | Francotiradora | flecha / `shoot` |
| `a_disperso` | Disparo Disperso | N | lmb | basic proj area | **+5** | 0,9 s | 3 × 0,45 en 25° | — | 0 | Tiradora | 3 flechas / `shoot` |
| `a_cicuta` | Flecha de Cicuta | N | lmb | basic proj nature dot | **+5** | 0,9 s | 0,7 + Veneno 0,5 en 4 s | — | 0 | Montaraz | flecha verde / `shoot` |
| `flecha_perforante` | Flecha Perforante | R | rmb/k2 | spender proj | 20 | — (antes 3 s) | **2,2** perforante | — | 0 / 0,35 s | Francotiradora (s3), Montaraz (s10), c9 | flecha pesada / `shoot` grave |
| `flecha_multiple` | Flecha Múltiple | R | rmb/k2 | spender proj area | 22 | — (antes 2,5 s) | 5 × **0,7** en 50° (≈1,5 a un objetivo pegado) | — | 0 / 0,35 s | Tiradora (s3, s6, s7, s15), Montaraz (s5) | abanico / `shoot` ×3 |
| `lluvia_flechas` | Lluvia de Flechas | C | rmb/k2 | spender area | 30 | **4 s** | **3,0** total en 1,5 s, r 3 | Abrojos con Montaraz s3 | telegrafía 0,3 s | Tiradora (s10), Montaraz (s3) | lluvia / `shoot` |
| `a_t_apuntado` | Disparo Apuntado | T (**s0** Francotiradora) | rmb/k2/k3 | spec spender proj | 30 | 6 s | **3,8** perforante | Carga 1 s (cancelable; **instantáneo** con Concentración 100 y s4) | carga 1 s | **Francotiradora (insignia)** | rayo de luz / `crit` |
| `a_paso` | Paso Veloz | N | k1 | movement | — | 9 s | — | Rueda 6 m en la dirección de movimiento; +20 % de velocidad de ataque 3 s | 0 / 0,2 s | todas (Nv4) | polvo / `dash` |
| `agilidad` | Agilidad | R | k1 | movement buff | — | 16 s | — | 6 s: +30 % de velocidad de movimiento, +15 % de velocidad de ataque e inmune a ralentizaciones | 0 | Tiradora (s5), c11 | viento / `dash` |
| `a_t_voltereta` | Voltereta | T (c2) | k1 | movement | — | 12 s | — | 6 m hacia atrás; el siguiente disparo no cuesta Energía | 0 / 0,25 s | todas | voltereta / `dash` |
| `a_t_salto` | Salto de Retirada | T (s13A) | k1 | movement proj | — | 12 s | 5 × 0,6 | 7 m hacia atrás y 5 flechas al caer; +30 Impulso | 0 / 0,4 s | Tiradora | salto / `shoot` |
| `a_t_disuasorio` | Disparo Disuasorio | T (s13A) | k1 | movement proj cc | — | 12 s | 1,2 | Te empuja 8 m hacia atrás y aturde 1 s al objetivo | 0 | Francotiradora | estampido / `hit` |
| `a_red` | Red de Caza | N | k2 | utility cc | 10 | 14 s | — | Red r 2,5 a 9 m: **inmoviliza 2 s** (jefes: +15 de stagger) | 0 | Montaraz y todas (Nv6) | red / `shoot` |
| `a_humo` | Bomba de Humo | N | k2 | defense zone | — | 22 s | — | Nube r 4 durante 4 s: −40 % de daño recibido dentro; los proyectiles enemigos fallan el 50 % | 0 | todas (Nv12) | humo / `dash` |
| `a_t_conmocion` | Disparo Conmocionante | T (c3) | k2 | utility proj cc | 10 | 6 s | 1,0 | Ralentiza 50 % 4 s | 0 | Montaraz | flecha roma / `hit` |
| `a_t_silencio` | Flecha Silenciadora | T (c5A) | k2 | utility interrupt | — | 18 s | 0,8 | Interrumpe y silencia 3 s; en jefes, +20 de stagger | 0 | cooperativo | flecha violeta / `shoot` |
| `a_t_bengala` | Flecha Bengala | T (c12A) | k2 | utility zone ally | — | 30 s | — | Revela invisibles a 10 m durante 8 s; dentro, el grupo hace +8 % de daño (aditivo) | 0 | apoyo de grupo | bengala / `shoot` |
| `a_t_camuflaje` | Camuflaje | T (c12B) | k2 | defense | — | 30 s | — | Invisible 4 s (los enemigos pierden el objetivo); el primer disparo al salir es crítico seguro | 0 | Francotiradora | desvanecer / `portal` |
| `a_t_cepo` | Trampa de Cepo | T (**s0** Montaraz) | k3 | spec trap cc nature | 10 | 1 carga (2 con s4), 8 s por carga | Veneno **1,5** en 5 s | Inmoviliza 2 s; hasta 3 armadas (4 con s14) | 0 | **Montaraz (insignia)** | cepo / clac metálico |
| `a_t_arpon` | Arpón | T (s9) | k3/k2 | spec proj cc | 15 | 10 s | 1,2 | Atrae 6 m hacia tu trampa más cercana; ralentiza 60 % 3 s | 0 | Montaraz | cadena / `hit` |
| `a_t_senuelo` | Señuelo de Paja | T (s13A) | k2/k3 | utility summon taunt | — | 25 s | 2,0 al estallar (r 3) | **Provoca** a los enemigos a 8 m durante 5 s | 0 | Montaraz | muñeco / `chest` |
| `a_t_andanada` | Andanada | T (**s0** Tiradora) | k3 | spec proj area movement | 25 | 6 s | 12 × **0,6** en 120° | Retrocedes 3 m; +20 Impulso (s4) | 0 / 0,35 s | **Tiradora (insignia)** | abanico + retroceso / `shoot` ×4 |
| `a_t_danza` | Danza de Flechas | T (s9) | k3 | spec area channel movement | 20 | 25 s | 16 × 0,5 en 4 s alrededor | Corres sin frenarte; inmune a ralentizaciones | 0 | Tiradora | espiral / `shoot` continuo |
| `a_t_vision` | Visión Certera | T (s9) | k3 | spec buff | — | 90 s | — | 12 s: moverse no vacía la Concentración, +25 % de velocidad de ataque y Disparo Apuntado se recarga un 50 % más rápido | 0 | Francotiradora | ojo dorado / `crit` |
| `a_u_diluvio` | Diluvio de Saetas | R | k4 | ultimate area | — | **50 s** | **20 WD** por objetivo en 4 s, r 5 | Telegrafía | 150 ms | Tiradora (s16) | diluvio / `shoot` masivo |
| `a_u_celeste` | Tiro Celestial | N | k4 | ultimate proj | — | **50 s** | 3 disparos × **7,0** perforantes en 8 s (**21**) | Cada disparo, a voluntad (reutilizar la tecla) | carga 0,3 s | Francotiradora | haz celeste / `crit` |
| `a_u_zarzas` | Cerco de Zarzas | N | k4 | ultimate zone cc nature | — | **55 s** | Veneno 1,0/s × 8 s (8) + control | Anillo r 7 durante 8 s: cruzarlo **inmoviliza 1,5 s**; dentro, +15 % de daño recibido (saco Debilidad) | 0 | Montaraz | zarzas / crujido |

**Eliminada**: `a_p_punteria` (pasiva). Francotiradora s12 «+1 a Puntería» pasa a «+1 a Disparo Apuntado».

### 3.4 Ramas (`SKILL_MODS`) de las habilidades nuevas

- Las habilidades que **se conservan** mantienen sus ids de rama (`<id>_o/_f/_v`) para que la migración no las pierda.
- Las nuevas usan los constructores existentes: `dmgMods` (daño), `buffMods` (buffs) y uno nuevo, **`utilMods(id)`**, para movilidad y defensa con tres ramas: **Potencia** (+35 % de escudo, cura o distancia), **Recarga** (−25 % de enfriamiento) y **Variante** (deja zona, otorga velocidad o purga control).
- Las activas **de talento no tienen ramas**: sus modificadores vienen de su propio árbol (`mod`).
  *Por qué:* evita que el mismo nodo se pague dos veces y mantiene acotado el presupuesto de 19 puntos.

---

## 4. Sistema de modificación: un único resolvedor

### 4.1 Rangos y puntos (decisión)

- **Se quitan los rangos comprados** (`learnSkill` desaparece). La habilidad se **aprende sola** al llegar a su nivel (`sk.req`).
- **Rango** = `rangoBase(nivel, req) + talentos.skillLv[id] + stats.skillLv[id]` (equipo, reservado para el Paso 4 de itemización).
  - `rangoBase = clamp(1 + ⌊(nivel − req)/8⌋, 1, 5)`. Las activas de talento usan `req = 10`, lo que unifica el `talentSkillBase` de `talents.js`.
  - Tope práctico: 5 de base + 2 de talento + 2 de equipo = **9** (+80 % de coeficiente).
- **Puntos de habilidad**: siguen siendo 19 (1 por nivel de Nv2 a Nv20) y **solo desbloquean mini‑ramas** (1 punto por rama; luego se cambia de opción gratis, como hoy). Con 5 ranuras con ramas × 3 = 15 ramas, sobran 4 para experimentar con habilidades alternativas.
- **Recalibración obligatoria**: el banco del Paso 1A daba al héroe «típico» **rangos comprados** (rotación con puntos repartidos por `ROT`) y sinergias. El rango por nivel y la desaparición de sinergias cambian el daño de cada habilidad. Por eso la **etapa 2b no se cierra hasta que `balance-bench` vuelve a estar en verde con sus objetivos del Paso 1A**, y la recalibración se hace **solo sobre los coeficientes, costes y enfriamientos del catálogo §3** (`skills-*.js`). **No se tocan** `ENEMY_CURVE`, `bossHpMult`, `eliteHpMult` ni `tormentMods`, que quedan congeladas desde el Paso 1A. El cierre incluye una **tabla antes/después** en `MEMORIA.md` (TTK común/élite/jefe y TTD por clase y nivel, típico y óptimo), como la del Paso 1A.
- **Las sinergias se eliminan**: dependían de comprar rangos de otras habilidades; los talentos `mod`/`elem` cumplen ese papel.
- **Reespecializar ramas y talentos es gratis fuera de combate** (tras 5 s sin daño o en un campamento). Se eliminan `respecCost` y `masteryRespecCost`.
- *Por qué:* la auditoría encontró 19 puntos para más de 129 rangos, con los rangos 2–5 como trampa (+18 % por punto frente a una rama que cambia la habilidad). Que el rango venga del nivel garantiza que ninguna habilidad «se quede atrás». Los puntos se gastan en decisiones cualitativas (estilo D4 Lord of Hatred, donde las mejoras cambian tags y comportamiento) y el árbol de talentos cubre lo cuantitativo. La reespecialización gratuita sigue el modelo de WoW Midnight: experimentar es parte del juego, no un castigo en oro.

### 4.2 `resolveSkill(p, sk)` (nuevo `js/skill-resolve.js`, puro)

```js
// Entrada: héroe (stats ya recalculados + p.talentAgg de aggregateTalents) y la habilidad.
// Salida: perfil COMPLETO del lanzamiento, cacheado en p.resolved[sk.id] (se invalida en recompute()).
resolveSkill(p, sk) → {
  id, rank, tags:Set, elem, cat, slots,
  coef,            // sk.coef × (1+0,10(rango−1)) × eco
  addPct,          // saco ADITIVO propio: ramas.dmg + talentos.mod.dmg + elem% + soportes (Amplificado/Concentrado/Sobrecarga)
  critBonus,       // ramas + soportes (Certero) + talentos.mod.crit (se topa al tirar)
  cost,            // sk.cost × Π costeSoportes × (1 − costRed/100) × (1 + mod.cost/100); costRedBig si sk.cost > umbral
  cd, gcd:true|false, windup, lockT, impactDelay,
  radiusMul, proj, pierce, chain, slow, slowPct, stun, root, vuln, dot, dotMul, zone, zoneDur,
  echo, execute, cdhit, critCdr, lifesteal, gen, buffMul, durMul, durS, coldblood, onHitPowers:[]
}
```

Orden de fusión (de lo más específico a lo más general, todo **aditivo** dentro de su clave):
1. Definición base (`sk`).
2. Ramas elegidas (`SKILL_MODS`, `aggregateSkillMods`).
3. Talentos: `agg.mods[sk.id]` (incluye `@elem`, `@all` y el nuevo `@spec`, que se expande al elemento de la especialización) + `agg.skillLv`.
4. Soportes: cada soporte se traduce a un `mod` mediante una tabla `SUPPORT_MOD` (sustituye a los `has('x')` dispersos de `castSkillSlot`).
5. Valores globales del héroe: `stats.cdr` y `tv.costRed`/`costRedBig`.
6. Topes de `combat-math` (CDR 50, crítico 60 al tirar).

Quién lo consume:
- `castSkillSlot` (que pasa a un mixin nuevo, `js/game-skills.js`, para adelgazar `main.js`).
- `Player.basicAttack`: el básico es una habilidad más, con `cat:'basic'`.
- `tests/balance-bench.mjs` (deja de duplicar la lógica de soportes).
- Los tooltips de la UI (muestran el número final, no el base).

### 4.3 Soportes por tags

Se sustituye `types:[…]` por `requires` y `forbids` sobre tags:

| Soporte | Requiere | Excluye | Nota |
|---|---|---|---|
| Amplificado, Sobrecarga, Certero, Gélido, Sangre Fría | daño (coef > 0) | `ultimate` (Sobrecarga también `basic`) | aditivo / crítico |
| Multiproyectil, Perforante, Encadenado | `proj` | `channel` | |
| Expansivo, Concentrado | `area` \| `cone` \| `zone` | | |
| Eco | daño | `channel` `ultimate` `movement` | un Meteoro con eco era el mejor DPS: se mantiene en gastadoras |
| Sed de Sangre, Veneno | daño y (`melee` \| `proj` \| `area`) | | |
| Persistente | `buff` \| `dot` \| `aura` \| `zone` \| `shield` | | |
| Eficiente | coste > 0 | | |
| Raudo | enfriamiento > 0 | `ultimate` | |

Huecos de engarce: `lmb` 1; `rmb`, `k1`, `k2` y `k3` 2; `k4` 1. Los soportes van **con la habilidad**, no con la ranura: una gastadora movida de `rmb` a `2` conserva los suyos. Al migrar, un soporte que deja de ser compatible se **desengarza** (sigue en `knownSupports`).
*Por qué tags:* es el modelo de PoE2. El soporte declara qué necesita y cualquier habilidad nueva (las 42 de talento) es compatible sin tocar la lista de soportes.

### 4.4 GCD, windup e impacto sincronizado

- **GCD 0,2 s** compartido por `rmb`, `k2`, `k3` y `k4` (`p.gcdT`). No afecta al básico (lo marca la cadencia), ni a `k1` (movilidad), ni a la esquiva.
  *Por qué:* hoy todo es instantáneo y sin GCD, así que cuatro teclas en 0,05 s vuelcan la ráfaga entera. 0,2 s no se nota al jugar, pero elimina los macros.
- **Windup** de 80–150 ms en los golpes pesados (columna de §3). El daño se programa con `this.timers.schedule(windup, …)`; si el héroe esquiva antes, el golpe se cancela y **no se cobra el coste** (contrato de cancelación de animación).
- **Impacto**: las habilidades de área en el suelo aplican el daño **cuando llega el VFX** (`impactDelay`: caída 0,23 s y Meteoro 0,6 s). Hoy ocurre al revés: el daño se aplica en el instante y el FX llega después.
- **Proyectiles**: tiran el daño **al impactar** (`Projectile` recibe `rollAt: (target) => p.rollDamage(..., target)`), lo que permite bonos condicionados al objetivo (§5.3).
- **Canalizaciones** (`channel`): tics por el planificador; se interrumpen al recibir un golpe de más del 10 % de la vida (salvo si son imparables), con la esquiva o al soltar la tecla.
- **SFX**: se cablean los sonidos sin usar `fire`, `ice` y `bolt` (columna VFX/SFX) y se añaden `holy`, `trap` y `chain` a `sfx.js`.

---

## 5. Talentos conectados

### 5.1 Archivos y formato

`js/talents-guerrero.js`, `js/talents-maga.js` y `js/talents-arquera.js` exportan:

```js
export const GUERRERO_TALENTS = {
  cls:   { name: 'Guerrero', nodes:[…15 nodos c1..c15…], preset:[['c1',2],…] },
  specs: [ { id:'berserker', name:'Berserker', role:'dps', icon:'specs/berserker.webp', emblem:'emblems/berserker.webp',
             mechanic:'sed', innate:{…}, nodes:[…21 nodos s0..s17,x1..x3…], preset:[…] }, …3 ],
  skills:[ …definiciones de las activas `grant` (§3) con kind 'talent'… ],
};
```

- Los nodos se **transcriben literalmente** de `TREES.cls/spec` de cada mockup: id, name, t, r, c, max, req, free, fx, opts y d.
- Ajustes de forma al transcribir: `d` → `d(r)` cuando el texto depende del rango; `opts[].d` → `opts[].desc` (`talents.js` lee `desc`). El `preset` sale de `PRESET`/`RECOMMENDED` del mockup.
- Icono de cada nodo: `assets/talents/<clase>-<spec|clase>-<id>.webp`.
- Los ids de especialización son los de las maestrías: `berserker`, `guardian`, `cruzado`, `piromante`, `crionte`, `arcanista`, `francotiradora`, `montaraz`, `tiradora`.
  *Por qué:* así `normalizeTalents(raw, classId, legacyMasteryId)` migra sin tabla de equivalencias.

### 5.2 Ajustes a los árboles (respetando el diseño)

1. **El nodo clave s0 (gratis) otorga la insignia** (`fx.grant`) además de su poder, y **s4 deja de otorgarla y pasa a potenciarla** (1 rango). En cada especialización, s4 recibe la parte del texto del mockup que conecta la habilidad con el indicador de la especialización:

| Especialización | s0 otorga | s4 nuevo (nombre / efecto) |
|---|---|---|
| Berserker | `g_t_remolino` | Remolino Sediento: +4 Sed por enemigo golpeado (máx. 20) |
| Guardián | `g_t_desafio` | Desafío Firme: Grito Desafiante da 2 Bastión |
| Cruzado | `g_t_devocion` | Devoción Ferviente: +1 Fervor al lanzar y +10 % de curación |
| Piromante | `p_llamarada` | Llamarada Avivada: detona el 100 % (en vez del 60 %) y +25 Calor |
| Crionte | `k_prision` | Prisión Profunda: Congelado 3 s (en vez de 2) y 35 de stagger (en vez de 20) |
| Arcanista | `a_orbe` | Orbe Resonante: +1 Carga por enemigo golpeado (máx. 2) |
| Francotiradora | `a_t_apuntado` | Aliento del Cazador: instantáneo con Concentración 100 |
| Montaraz | `a_t_cepo` | Cepo Doble: 2.ª carga |
| Tiradora | `a_t_andanada` | Andanada Impulsiva: +20 Impulso |

   *Por qué:* la ranura 3 necesita contenido desde Nv10. Con el árbol tal cual, s4 exige s1 o s2 al máximo, lo que retrasa la insignia hasta Nv16 (puntos de especialización en Nv10, 12, 14, 16).
2. **Multiplicadores de los nodos clave** al tope de `registerMultiplier` (≤ ×1,3):
   - Sed de Batalla (vida < 40 % **o Sed Saciada**): ×1,25.
   - Tiro Mortal (crítico contra objetivos con > 60 %): **×1,30**.
   - Cacería (ralentizado o inmovilizado): **×1,20**; se **elimina el `tv.slowedDmg 25`** duplicado de Montaraz s0.
   - Los textos del mockup («+40 %», «+50 %», «+25 %») se ajustan.
   *Por qué:* hay como mucho tres multiplicadores [×] activos y cada uno ≤ ×1,3, por el Paso 1A.
3. **Correcciones de vocabulario** (el mockup reutilizó claves con otra unidad):

| Nodo | Mockup | Corregido | Motivo |
|---|---|---|---|
| Francotiradora s10 | `mod.cdhit: 0.4` | `mod.critCdr: 0.4` (s por crítico) | `cdhit` ya significa «umbral de impactos» (Masacre) |
| Montaraz s3 | `zone:2, slow:30` | `zone:1, zoneDur:2, slowPct:30` | `slow` está en segundos |
| Montaraz s5 | `slow:10` | `slowPct:10, slow:3` | idem |
| Montaraz s6B | `radius:3` (m) | `radius:100` (% → 3 m sobre la base de 1,5) | `radius` es un % |
| Montaraz s6A, s16 | `stun` | `root` | inmovilizar ≠ aturdir (rendimientos decrecientes distintos) |
| Montaraz s17 | `mod.a_t_cepo.vuln:10` | `tv.rootedWeak:10` | `vuln` está en segundos; es un debuff de grupo |
| Clase Arquera c11 / Tiradora s5 | `agilidad.dur:1` | `durS:1` | `dur` es un % |
| Clase Arquera c14 / clase Maga c14 | `costRed` con umbral | `costRedBig:{pct:15, over:15|20}` | Disciplina de Combate (c6 Guerrero) es incondicional |
| Francotiradora s12 | `a_p_punteria` | `a_t_apuntado` | pasiva eliminada |
| Crionte s0 | `m_shatter` (hoy: ralentizado < 18 %) | `m_shatter` = **Congelado** < `shatterPct` (15) | escarcha de 5 capas del mockup |

4. **Árbol de clase de la Maga y especialización Piromante**: el mockup (`Talentos.dc.html` y el árbol de clase de Spec‑Arcanista/Crionte) **no trae `fx`**. Se definen así, siguiendo su texto:
   - **Clase Maga**:

| Nodo | `fx` |
|---|---|
| c1 | `mod:{'@all':{dmg:4}}` |
| c2 | `grant:'m_t_barrera'` |
| c3 | `grant:'m_t_parpadeo'` |
| c4 | `stats:{crit:2}` |
| c5A | `grant:'m_t_contrahechizo'` |
| c5B | `power:'m_ralentizar'` (cada 8 s, el siguiente hechizo ralentiza 50 % 4 s) |
| c6 | `stats:{mpPct:8}` (stat nuevo) |
| c7 | `tv:{barrierDr:10}` |
| c8 | `stats:{cdr:4}` |
| c9 | `skillLv:{'@spec':1}` |
| c10 | `stats:{mph:1}` |
| c11 | `stats:{aspdPct:4}` |
| c12A | `grant:'m_t_inversion'` |
| c12B | `grant:'m_t_bloque'` |
| c13 | `tv:{eliteDmg:5}`, `stats:{xpPct:6}` |
| c14 | `tv:{costRedBig:{pct:15, over:20}}` |
| c15 | `power:'m_aura_intelecto'` |

   - **Piromante**:

| Nodo | `fx` |
|---|---|
| s0 | `power:'p_ignicion'`, `grant:'p_llamarada'` |
| s1 | `elem:{fire:5}` |
| s2 | `mod:{bola_fuego:{cdr:10}}` |
| s3 | `tv:{burnDur:1}` |
| s4 | `power:'p_llamarada_avivada'` |
| s5 | `tv:{burningCrit:4}` |
| s6A | `power:'p_propagacion'` |
| s6B | `power:'p_acumular'` |
| s7 | `mod:{meteoro:{zone:1, zoneDur:1.5}}` |
| s8 | `tv:{burnKillHeal:2}` |
| s9 | `grant:'p_combustion'` |
| s10 | `mod:{meteoro:{dmg:10}, m_u_supernova:{dmg:10}}` |
| s11 | `tv:{burnPct:15}` |
| s12 | `tv:{critFireCdr:0.5}` |
| s13A | `power:'p_fenix'` |
| s13B | `grant:'p_muro_fuego'` |
| s14 | `power:'m_conflag'` |
| s15 | `tv:{burnKillMana:3}` |
| s16 | `tv:{supernovaBurn:50}` |
| s17 | `mod:{'@fire':{radius:20}}` |
| x1 | `power:'p_corazon_sol'` (`burnExplode` 40 %) |
| x2 | `tv:{explodedDmg:15}` |
| x3 | `power:'p_nova_solar'` |

5. **Pasivas innatas por especialización** (`spec.innate`; no son nodos, se aplican siempre que la especialización está activa):
   - Guardián: `block:15` con escudo, amenaza ×3, +10 % de vida.
   - Cruzado: +15 % de curación realizada.
   - Crionte y Montaraz: +25 % de stagger contra jefes.
   - El resto, nada.
   *Por qué:* las especializaciones de rol de WoW tienen su línea base. Sin bloqueo, el Bastión del Guardián no tiene de dónde salir y la amenaza no distingue al tanque.

### 5.3 Claves `tv`, `power` y `grant` que necesitan código nuevo (lista exhaustiva)

`talents.js` agrega, pero **nada consume todavía** sus salidas. **Todo poder se implementa como una entrada `PowerDef` del registro de §9.1**; las siglas de abajo corresponden a los puntos de despacho ①–⑩ de §9.1.2 (R=①, RS=②, RD=③, ET=④, OH=⑤, OK=⑥, CS=⑦, PT=⑧, PU=⑨; ENT = registro de campos). Hooks:
- **R** = `Player.recompute`
- **RS** = `resolveSkill`
- **RD** = `Player.rollDamage(…, target)` → nuevo `condAddPct(target)`
- **ET** = `Enemy.takeDamage`
- **OH** = nuevo `Game.onPlayerHit(e, dealt, ctx)` (punto único por impacto: indicadores de especialización y procs)
- **PT** = `Player.takeDamage`
- **OK** = `Game.onEnemyKilled`
- **CS** = `castSkillSlot` / `game-skills.js`
- **PU** = `Player.update`
- **ENT** = entidades de suelo (trampas, campos, estandarte, martillos orbitales) mediante el genérico `groundZones` → `fieldEntities`

**Sacos de `combat-math`:**
- **A** = ADITIVO (incluye `critDmg`)
- **×** = Π[×] (`registerMultiplier`)
- **DEB** = **Debilidad**: es **el mismo saco** que el Vulnerable del Paso 1A, renombrado y ampliado. No hay un multiplicador aparte.
  - Fórmula: `DEB = min(1,5; 1 + (V + Σd)/100)`.
  - `V` = 20 si el objetivo está Vulnerable (bandera, no se acumula); el estado Quebrantado aplica Vulnerable y no suma por separado.
  - `Σd` = suma **aditiva** de los debilitamientos activos sobre el objetivo, por fuente única: Sentencia +20, Glaciación +8/rango, Espinas Venenosas +10/rango, Singularidad +15 por acumulación (máx. 2), Cerco de Zarzas +15, Punto Débil 0 (da crítico, no Debilidad).
  - Tope total: **×1,5**.
  - En `combat-math`: `VULN_MULT` se sustituye por `weaknessMult(v, sumDebuffs)`, con `WEAKNESS_CAP = 1.5`. `Enemy.takeDamage` lo aplica donde hoy aplica `VULN_MULT`.
  - *Por qué:* un segundo saco multiplicativo reabriría la inflación que cerró el Paso 1A (×1,2 × ×1,5 = ×1,8). Con un solo saco con tope, el ejemplo peor de Montaraz (V 20 + Espinas 20 + Zarzas 15 = 55) queda en ×1,5.
- **DR** = reducción de daño (tope 50)
- **DoT** = multiplicador interno del DoT
- **—** = no es daño

**Claves `tv`:**

| Clave | Hook | Saco | Notas |
|---|---|---|---|
| `eliteDmg` | RD | A | élite, campeón o jefe; la Presa del Montaraz cuenta como élite |
| `slowedDmg` | RD | A | ralentizado o Congelado |
| `highHpDmg` | RD | A | objetivo > 60 % |
| `lowHpDmg` | RD | A | objetivo < 35 % |
| `highManaDmg` | RD | A | maná > 70 % |
| `explodedDmg` | RD | A | objetivo marcado por Corazón del Sol |
| `infiniteDmg` | RD | A | durante Ráfaga Infinita |
| `critDmg` | R | A | `stats.critDmg` ya existe |
| `weakCritDmg` | RD | A | solo en crítico y con Punto Débil |
| `burningCrit` | RD | crítico | prob. contra enemigos en llamas |
| `dmgReduc` | R (incondicionales) / PT (condicionales: Piel de Maná > 50 %, Pellejo de Oso contra ralentizados, Esquiva Felina en movimiento, Posición Elevada con Concentración > 50, Cuero Curtido tras Voltereta) | DR | |
| `barrierDr` | PT | DR | con Barrera activa |
| `costRed`, `costRedBig` | RS | — | |
| `bleedPct`, `poisonPct`, `burnPct`, `dotPct` | perfil central de DoT (`dotProfile`) | DoT | |
| `dotDur`, `burnDur` | `dotProfile` | — | +s con el mismo daño por segundo |
| `killHeal`, `burnKillHeal` | OK | — | % de vida por **sustento** (cubeta compartida, §6.1). Cruzado: también a los aliados (`g_luz_sanadora`) |
| `manaOnKill`, `burnKillMana` | OK | — | recurso de clase |
| `executePct` | ET | — / A | no jefes: remate; élites y jefes: +40 % aditivo bajo el umbral |
| `shatterPct` | ET | — | astillar Congelados |
| `fervorChance` | OH | — | Martillo |
| `verdictHeal` | CS | — | Veredicto |
| `frostLayers` | OH | — | capas extra de Nova |
| `fieldVuln` | ET | DEB | dentro del campo helado |
| `rootedWeak` | ET | DEB | inmovilizados |
| `focusRate`, `focusEnergy` | PU | — | Concentración |
| `galeHeal` | PU | — | al llenar el Impulso |
| `clarityPct` | CS | — | Rayo gratis |
| `arcChargePct` | OH | — | Carga por salto |
| `webDmg` | ENT | — | proc sin Π |
| `critFireCdr` | OH | — | Pirotecnia |
| `supernovaBurn` | CS | DoT | |

**Poderes**: 61 en los mockups más 9 de Maga y Piromante.
- **Multiplicadores ×**: `m_berserk`, `m_deadeye`, `m_hunt` (ya existen en `MULT_POWERS`; se ajustan los valores).
- **R** (estadísticas, auras y banderas):
  - Auras de clase `g_aura_hermandad`, `m_aura_intelecto` y `a_aura_halcon`. En solitario dan su parte propia; cada una es un buff `aura` con radio 15. La parte de recurso de Hermandad, +5 % de Furia por aliado, es 0 en solitario.
  - Escarcha: `k_frost_armor`, `k_numb`.
  - Otros: `f_perch`, `a_manaskin`, `g_muralla_viva`, `g_mano_sanadora`, `a_tailwind`, `t_slipstream`, `m_warden`.
- **ET**: `m_shatter`, `f_overpen`, `a_singularity` (DEB +15 ×2), `g_sentencia` (DEB +20 contra élites y jefes), `f_weakspot` (crítico +15 para el grupo), `a_sello` (acumula el 25 %).
- **OH**:
  - Arcano: `m_overload`, `a_chain_crit`, `a_arc_charge`, `a_overvolt`, `a_resonance`, `a_clarity`.
  - Escarcha: `k_icicle_dart`, `k_nova_push`.
  - Fuego: `p_ignicion`, `p_acumular`, `p_llamarada_avivada`.
  - Otros: `g_crit_furia`, `f_patience` (A, hasta 20), `t_infinite`, `t_eyestorm`.
- **PT**:
  - `m_aegis` (+`g_juramento`: recarga de 20 s), `g_coraza_hierro`, `g_negacion`, `p_fenix`.
  - `g_vinculo` (cooperativo: redirige el 20 % del daño de los aliados), `g_represalia`, `g_intercesion` (cooperativo), `g_bastion_eterno`.
- **OK**:
  - Estallidos: `m_judgment`, `m_conflag`, `p_propagacion`, `p_corazon_sol`, `p_nova_solar`.
  - Cadenas de muertes: `g_carnicero`, `g_matanza_eterna`, `t_galechain`.
  - Escarcha: `k_shatter_chain`, `k_ice_tomb`, `k_ice_age`.
  - Grupo: `g_luz_sanadora`.
- **CS / PU**:
  - Furia: `g_desenfreno`.
  - Cruzado: `g_luz_alba`, `g_ascension`, `g_estandarte_grupo`.
  - Otros: `m_ralentizar`, `multidisparo` (ya existe).
- **ENT**: `g_martillo_bendito` y `g_martillos_juicio` (martillos orbitales), `k_eternal_winter` (campo helado), `m_thornweb`, `m_extratrap`, `m_greathunt` (red y trampas), `g_venganza` (onda al terminar Muro).

**`grant`**: 42 activas (§3, estado **T**). Se registran en `CLASSES[cid].skills` con `kind:'talent'` (ya lo hace `talents.js`). `aggregateTalents().grants` alimenta `p.unlockedSkills`, que valida `assignHotbar`. Si se retira el nodo, la habilidad se desengarza de la barra.

**Stats nuevas en `recompute`**: `mpPct`, `xpPct`, `threatMult`, `healPct` (tope +50, `CAPS.heal`), `staggerPct`, `skillLv`, `energyRegen` (tope +4/s).

### 5.4 Reemplazo de MASTERIES y game‑mastery.js

- `js/game-mastery.js` → **`js/game-talents.js`** (mixin `talentMethods`):
  - Métodos: `chooseSpec(id)`, `addTalentRank(which, id)`, `removeTalentRank`, `chooseTalentOption(id, 'A'|'B')`, `applyTalentPreset(which)`, `resetTalentTree(which)`, `switchSpec(id)` (gratis fuera de combate; los rangos de cada especialización se conservan en `talents.sp[specId]`) y `exportTalentCode` / `importTalentCode` (prefijo `IRPG1-<clase>-<spec>-`, como en el mockup).
  - Hay que actualizar `test43-mixins` (sin colisiones de nombre).
- `Player.recompute` sustituye el bloque de maestría por `this.talentAgg = aggregateTalents(this)`. Después: `addStats(agg.stats)`, `critDmg` y `dr` incondicionales desde `agg.tv`, `this.powers ∪ agg.powers`, `this.tv = agg.tv`, `innate` y `this.resolved = {}`.
- `data.js` elimina `MASTERIES`, `findMastery` y `MASTERY_START_LEVEL` en cuanto la migración v4 está en marcha. La migración solo necesita el id de texto. `SYSTEMS_GUIDE` cambia «Maestrías» por «Talentos y especialización (Nv10)».
- **Puntos** (verificado en `talents.js`):
  - Especialización: niveles pares 10–50 (**21**) + ⌈hazañas/2⌉. Clase: impares 11–49 (**20**) + ⌊hazañas/2⌋. Hazañas: hasta 6 (2 bastiones + 4 tandas de 3 jefes únicos).
  - En total, **1 punto por nivel de Nv10 a Nv50 (41) + hasta 6 = 47**.
  - Lo que se puede gastar en cada árbol: clase 26, especialización 35 sin contar la clave gratuita. Siempre hay elecciones.
  - El ápice (fila 8: 17 puntos gastados + Nv40) llega a **Nv42 sin hazañas** o a Nv40 con al menos una hazaña.
  - **No se mezclan con los puntos de habilidad** (ramas, Nv2–20): de Nv10 a Nv20 conviven ambos sistemas, lo que es intencional porque es la fase de construir la build.

---

## 6. Primitivas de rol: solitario hoy, cooperativo mañana

Todo se modela **sobre una lista de aliados** que hoy contiene solo al jugador: `Game.allies()` → `[player]` y, en el futuro, los jugadores remotos.
*Por qué:* si el código de un aura o una cura nace pensando en «grupo», el cooperativo será añadir entidades a una lista, no reescribir habilidades.

| Primitiva | Diseño | En solitario |
|---|---|---|
| **Amenaza** | `Enemy.threat: Map(fuente → valor)`. Daño ×1, curación ×0,5 (repartida entre los enemigos en combate), × `threatMult` (Guardián ×3). El objetivo es la fuente con más amenaza; para cambiar de objetivo, la nueva debe superar el 110 % (cuerpo a cuerpo) o el 130 % (a distancia) de la actual | Sin efecto (una sola fuente), salvo el **Señuelo**, que es una fuente |
| **Provocación** | `Enemy.forceTarget(src, t)`: objetivo forzado durante `t` y amenaza = máx. + 10 %. Los jefes **sí** se pueden provocar; sin rendimientos decrecientes | Provocación: el enemigo provocado te hace −15 %. Grito Desafiante: agrupa a la manada sobre ti, útil para el AoE |
| **Alcance de los buffs** | `addBuff(id, stats, dur, {scope:'self'\|'party'\|'aura', radius})`. Con `party` se aplica al lanzarlo a los aliados en el radio; con `aura` se reevalúa cada 0,5 s mientras dure la fuente (estandarte, auras de clase) | Todo cae sobre ti |
| **Curas y escudos** | `Game.heal(amount, {target:'lowest'\|'self'\|'all', radius})` y `Game.shield(…)`. «Lowest» elige al aliado con menor % de vida en el radio. Escudos: `p.shields=[{amt,t,src}]`, que se consumen **después** de mitigar y antes de la vida. Hay dos familias con reglas distintas (§6.1): **sustento** (con tope por segundo) y **curación de habilidad** (escala con `healPct`) | Tú. El banco cuenta la curación efectiva (sin el exceso) |
| **Stagger de jefes** | `Enemy.stagger` 0–100 (solo jefes, uber y jefes de mundo). El control **no se pierde**: suma stagger (aturdir 30 por s nominal, congelar 25, inmovilizar 15 por s, empujar 10, interrumpir 20, ralentizar ≥30 % 4/s, Prisión 20/35). A 100 → **Quebrantado 4 s**: aturdimiento real (ignora la resistencia) y **Vulnerable** (saco Debilidad; no se suma a otro Vulnerable). Luego 15 s bloqueado (barra gris). Barra visible bajo la vida del jefe | Es lo que hace que Crionte y Montaraz sirvan contra jefes (hoy el aturdimiento contra jefes es ×0,35 con resistencia, desde el Paso 0) |
| **Control con rendimientos decrecientes** | Se generaliza `stunDR` a tres canales: **duro** (aturdir, congelar, empujar; +0,35 por aplicación), **inmovilizar** (+0,25) e **interrumpir** (sin rendimientos, pero los lanzadores tienen 6 s de inmunidad tras silenciarlos). Decaen 0,12/s; inmunes a partir de 0,9. **Ralentizar**: no acumula (gana el más fuerte), tope 70 % (jefes ×0,5). Los élites tienen rendimientos decrecientes normales; los jefes solo stagger | Evita el bloqueo permanente de manadas con Ventisca y Prisión |
| **Interrupción** | Las habilidades de `enemy-abilities.js` con lanzamiento visible declaran `interruptible:true` y `castT`. Contrahechizo y Flecha Silenciadora las cancelan | Lanzadores de grieta y jefes con canalización |
| **Imparable** | `p.unstoppableT`: inmune a control y a interrupciones de canalización | Furia Inmortal, Ira Ciega, Desgarro Arcano |

### 6.1 Curación: cubeta de sustento frente a curación de habilidad

Toda curación pasa por una de **dos** funciones, y nunca se escribe `hp +=` directamente fuera de ellas.

**A) Sustento** (`p.sustain(amount, src)`): toda curación **disparada por un impacto o una muerte propios**. Comparte **una sola cubeta** por receptor, la del robo de vida del Paso 1A (`leechRefill`/`leechTake`): **tope de 6 % de la vida máx. por segundo**, sumando todas las fuentes. **No** escala con `healPct`.

| Fuente | Tipo |
|---|---|
| Robo de vida de ramas (Sediento) y de talentos | % del daño infligido |
| Vida al golpear `lph` (equipo, gemas, Sangre de Guerrero c10, Mano Sanadora s3) | plano por golpe. **Entra en la cubeta**; el Paso 1A la dejaba fuera. Cambio intencional para que la regla sea única |
| Desenfreno (Berserker): +1 % por golpe | por golpe |
| Veredicto Final: cura el 25 % (+10 %/rango) del daño hecho | por impacto (a cada aliado, contra **su** cubeta) |
| Martillo Bendito: +1 % a los aliados por golpe | por impacto, a aliados |
| Maestro de Armas, Sobrecarga Arcana, Manantial y otros efectos «de maná al golpear» | **no** son curación (son recurso; no usan la cubeta) |
| Curas al matar: Festín (6 %), Festín de Sangre, Recuperación, Luz Sanadora, Fuego Interior (`killHeal`, `burnKillHeal`) | por muerte: también **pasan por la cubeta** (con manadas, la cura al matar se acumulaba sin límite) |
| Segundo Aliento del Impulso (Tiradora s11, `galeHeal`) | proc de indicador: cubeta |

**B) Curación de habilidad o aura** (`game.heal(amount, opts)` / `game.shield(amount, opts)`): la lanza **una acción deliberada** con enfriamiento. **No** usa la cubeta; **escala con `healPct`**, con **tope de +50 %** (`CAPS.heal = 50` en `combat-math`).

| Fuente | Tipo |
|---|---|
| Aura de Devoción (2 %/s), Bramido de Guerra, Segundo Aliento (Furia → vida), Guardabosques (trampas, 3 %/s) | curación de habilidad o aura |
| Pociones | curación de habilidad (escalan con `healPct`) |
| Escudos: Intervención, Armadura de Hielo, Barrera de Maná, Bastión Eterno | escudos (escalan con `healPct`) |
| Inversión del Tiempo, Fénix, Negación de la Muerte, Muro Inquebrantable | **restauraciones** (fijan la vida a un valor); no escalan ni usan la cubeta |

Fuentes de `healPct`: innata del Cruzado +15, nodos futuros de talento o equipo. Tope +50.
*Por qué:* el sustento ofensivo es lo que rompió el equilibrio en D3 y PoE. Con un solo tope por segundo, añadir otra fuente diversifica la build, pero no apila. La curación deliberada es la herramienta del apoyo, así que puede crecer con `healPct`, pero con tope para que el Cruzado no haga inmortal al grupo.

---

## 7. Objetivos de balance por rol (banco)

### 7.1 Escenarios nuevos en `tests/balance-bench.mjs`

| Escenario | Qué mide | Modelo |
|---|---|---|
| **UNI** | DPS contra un objetivo | Jefe de 90 s de vida, 60 s de simulación; con GCD, windup, cadencia y recurso reales |
| **ÁREA×5** | DPS total contra 5 enemigos agrupados (r 3) | Las habilidades de área golpean a todos, los proyectiles según abanico y perforación, las cadenas a N |
| **TTD+** | Aguante con defensas activas | Manada (campeón + 4 comunes) sin pausa; el héroe usa su defensa al enfriarse; cuentan escudos, curas, `dr`, bloqueo, Bastión y Furia por daño |
| **APOYO** | Aporte al grupo | 2 aliados fantasma con DPS = media y vida = media. Aporte = (DPS extra de los aliados por buffs y Debilidad) / DPS de un aliado + curación y escudos efectivos en % de vida/s del grupo |
| **CONTROL** | Tiempo de control | Contra 5 comunes: % del tiempo con control duro o inmovilizados y % con ralentización ≥30 %. Contra jefe: Quebrantados por minuto |

Builds: héroe **típico** Nv50 (raros, sin soportes) **por especialización**, con el `preset` del mockup y **dos configuraciones de la ranura `2`** (`LOADOUT_SPEC`):

| Especialización | `rmb` | `2` ofensiva | `2` defensiva | `3` |
|---|---|---|---|---|
| Berserker | Hendidura | Torbellino | Piel de Hierro | Remolino Sangriento |
| Guardián | Martillo de Guerra | Terremoto | Piel de Hierro | Grito Desafiante |
| Cruzado | Veredicto Final | Martillo de Guerra | Bramido de Guerra | Aura de Devoción |
| Piromante | Bola de Fuego | Meteoro | Armadura de Hielo | Llamarada |
| Crionte | Nova de Hielo | Lanza de Hielo | Armadura de Hielo | Prisión de Hielo |
| Arcanista | Rayo | Misiles Arcanos | Barrera de Maná | Orbe Arcano |
| Francotiradora | Flecha Perforante | Disparo Apuntado | Bomba de Humo | Visión Certera |
| Montaraz | Flecha Múltiple | Lluvia de Flechas | Red de Caza | Trampa de Cepo |
| Tiradora | Flecha Múltiple | Lluvia de Flechas | Bomba de Humo | Andanada |

**Rotación `ROT_SPEC`** (prioridad, una acción cada vez que el bloqueo lo permite):
1. Defensa en `2` si la vida < 50 % (variante defensiva).
2. Gasto del indicador lleno (Veredicto, Ignición Total, Muro con 5 Bastión…).
3. Insignia de especialización.
4. Gastadora de `2` con enfriamiento (variante ofensiva).
5. Gastadora de `rmb`.
6. Básico.

La definitiva se usa al enfriarse.

**Qué variante se usa en cada escenario**:
- UNI, ÁREA×5, APOYO y CONTROL: la **ofensiva**.
- TTD+: la **defensiva** (la defensa se usa al enfriarse o con vida < 50 %).
- El Guardián se mide en **todos** los escenarios con la defensiva, porque es la que define su rol.
- `--report` imprime ambas variantes en UNI y TTD+ para ver el intercambio.

### 7.2 Objetivos (Nv50 típico, T0)

M = media de las 9 especializaciones en esa métrica.

| Especialización | Rol | Métrica principal (debe ser **la mejor de su clase** por ≥10 %) | Suelos (que nadie quede inservible) |
|---|---|---|---|
| Berserker | Daño cuerpo a cuerpo | UNI ≥ **1,10·M** y ÁREA×5 ≥ 1,0·M | TTD+ ≥ 0,9·M |
| Guardián | **Tanque** | TTD+ ≥ **2,0·M** y ≥ 1,8× la siguiente especialización de Guerrero | UNI ≥ 0,70·M; jefe ≤ 130 s |
| Cruzado | **Apoyo** | APOYO ≥ **25 %** del DPS de un aliado + ≥ **1,5 % de vida/s** de curación al grupo | UNI ≥ 0,80·M; TTD+ ≥ 1,3·M |
| Piromante | Daño en área | ÁREA×5 ≥ **1,20·M** | UNI ≥ 0,85·M |
| Crionte | **Control** | CONTROL: ≥ **50 %** del tiempo con ralentización, ≥ **20 %** con control duro, ≥ **2 Quebrantados/min** | ÁREA×5 ≥ 0,90·M; UNI ≥ 0,85·M |
| Arcanista | Daño a un objetivo | UNI ≥ **1,15·M** | ÁREA×5 ≥ 0,75·M |
| Francotiradora | Daño a un objetivo | UNI ≥ **1,15·M** | ÁREA×5 ≥ 0,70·M; TTD+ ≥ 0,85·M |
| Montaraz | **Control** | CONTROL: ≥ **40 %** inmovilizados o ralentizados, ≥ **2 Quebrantados/min** | ÁREA×5 ≥ 0,90·M |
| Tiradora | Daño en área | ÁREA×5 ≥ **1,20·M** | UNI ≥ 0,85·M |

Reglas transversales:
- Se **mantienen los objetivos del Paso 1A** (media de clases: común 0,6–1,5 s, élite 4,5–10,5, jefe 45–90, TTD 6–10). Esos mismos rangos aplican ahora a cada especialización por separado con ±20 %.
- Jefe: la especialización más lenta ≤ **2,0×** la más rápida (hoy se pide ≤2,5× por clase).
- La definitiva aporta el **12–22 %** del daño en UNI. Fuera de ese rango, o es una trampa (como hoy, 0,15 WD/s) o es obligatoria.
- **Básico frente a gastadoras**: en UNI, el DPS de «solo básico» ≤ **0,6×** el de la rotación. La auditoría encontró básicos que superaban a todas las gastadoras.
- Ningún golpe ≥ 25 % de la vida del jefe (se mantiene).
- **Intercambio de la ranura `2`**, para cada especialización salvo el Guardián:
  - la variante ofensiva da **+12–25 %** de UNI sobre la defensiva;
  - la defensiva da **≥ +30 %** de TTD+ sobre la ofensiva.
  Fuera de esos rangos, una de las dos opciones es una trampa y se ajusta.
- Los objetivos de rol de §7.2 (TTD+ ≥ 2,0·M del Guardián, suelos de TTD+) se calculan con la **variante defensiva** de todas las especializaciones. Así el tanque se compara con los demás en igualdad, porque todos llevan una defensa.
- `--report` imprime una matriz de 9 especializaciones × 5 escenarios, con UNI y TTD+ desdoblados por variante.

*Por qué:* cada rol tiene **una** métrica de ganar y suelos para jugar solo. Es la lección de los roles de WoW trasladada a un ARPG en el que, por ahora, se juega solo: el tanque debe poder matar a un jefe, pero ser el que más aguanta con diferencia.

---

## 8. Migración de guardados

Son dos versiones, una por etapa. Cada una es idempotente y opera sobre una copia (contrato de `migrateSave`).

**`MIGRATIONS[2]` (v2→v3, Paso 2b: kit, rangos, ramas, hotbar y soportes)**:
1. `skills`: **se deja de persistir**. Las habilidades conocidas se derivan del nivel y los talentos; el campo se borra.
2. `skillPoints` = `min(nivel,20) − 1` (los puntos ganados en Nv2–20) − ramas conservadas.
   - Se conservan las ramas (`skillBranches` y `skillMods`) de las habilidades que **siguen existiendo con los mismos ids de rama**.
   - Se descartan, con su punto devuelto, las ramas de habilidades eliminadas: `g_p_*`, `m_p_arcano` y `a_p_punteria`.
   *Por qué es justo:* devuelve exactamente lo que se gastó en rangos (que ya no existen) y conserva lo que sigue teniendo sentido.
3. `hotbar` → ranuras con categoría:
   - `lmb`: el básico que hubiera si es `basic`; si no, el de arma.
   - `rmb`: la primera gastadora que hubiera en la barra vieja; si no, la gastadora A.
   - `k1`: Embestida, Salto Devastador o Agilidad si estaban; si no, la movilidad A (Nv ≥ 4).
   - `k2`: Provocación o Grito si estaban; si no, la **segunda gastadora** de la barra vieja (respeta a quien jugaba con dos); si no, la defensa A (Nv ≥ 6).
   - `k4`: la definitiva vieja si estaba; si no, nada.
   - `k3`: nada hasta elegir especialización.
4. `supports`: se desengarzan los incompatibles por tags o de habilidades eliminadas (siguen en `knownSupports`).
5. `skillSystemV = 5`.

**`MIGRATIONS[3]` (v3→v4, Paso 2c: maestría → talentos)**:
1. `talents = normalizeTalents(null, classId, mastery?.id)`: la maestría elegida pasa a ser la especialización y su s0 es gratis.
2. `mastery` se elimina (sale de `PLAYER_SAVE_FIELDS`; `talents` entra). Los puntos de maestría no se convierten porque los de talento se **calculan** por nivel: a Nv50, la maestría daba 20 y los talentos dan 41–47.
3. Si el héroe tiene Nv ≥ 10 y tenía maestría, `hotbar.k3` = insignia de esa especialización.
4. Aviso al cargar (`p.notices.push('talentos')`): «Tu héroe se actualizó al sistema de talentos. La reespecialización es gratis: revisa tu árbol (N)».
5. Compensación: el oro gastado en `respecMastery` no se registra y no se devuelve. La reespecialización gratuita lo hace innecesario.

**Test nuevo**: `test61-migracion-paso2`. Saves v0, v1 y v2 de las tres clases con rangos, ramas, maestría y soportes. Verifica que:
- la suma de puntos es correcta;
- no hay ids huérfanos en la hotbar;
- migrar dos veces da lo mismo;
- un save del Paso 0 (v4 de habilidades) entra sin reembolsos dobles.

---

## 9. Plan de implementación

Principio: **el juego tiene un número fijo de puntos de despacho y todo el comportamiento variable vive en registros data‑driven, en archivos por clase**. Así cada sub‑etapa «núcleo» la hace el jefe, en secuencia y sobre los archivos compartidos, y cada sub‑etapa «por clase» se reparte con un trabajador por clase que **solo toca sus propios archivos**.

### 9.1 Contratos de API

#### 9.1.1 Registro de poderes: `js/powers.js` (puro, sin DOM)

```js
// ---- tipos (JSDoc): firmas EXACTAS que reciben los ganchos ----
/** @typedef {{ dealt:number, raw:number, crit:boolean, skill:string|null, tags:Set<string>,
 *   elem:string|null, proc:boolean, source:string, pos:{x:number,z:number} }} HitInfo */
/** @typedef {{ skill:string|null, tags:Set<string>, crit:boolean, overkill:number,
 *   status:{ frozen:boolean, bleeding:boolean, burning:boolean, poisoned:boolean,
 *            slowed:boolean, rooted:boolean, prey:boolean, weakened:boolean } }} KillInfo */
/** @typedef {{ amount:number, raw:number, element:string, melee:boolean, blocked:boolean,
 *   src:object|null }} DamageTaken      // `amount` es MUTABLE en onDamaged (redirección/absorción) */
/** @typedef {{ sk:object, prof:object, slot:string, target:{x:number,z:number}|null,
 *   enemy:object|null }} CastInfo */
/** @typedef {{ hits:number, dealt:number, killed:number }} CastResult */

export const POWER_HOOKS = {};               // id → PowerDef (congelado tras definir)
export function definePower(id, def) {}      // lanza si el id está repetido o si hay una clave desconocida
export function registerPowers(map) {}       // definePower para cada entrada de un módulo de clase
export function buildHookIndex(p) {}         // p.hookIndex[hook] = [defs activos con ese gancho] (lo llama recompute)
export function firePower(hook, p, ...args) {} // recorre p.hookIndex[hook]; try/catch por poder (un poder roto no tumba el juego)
export function powerState(p, id) {}         // p.powerState[id] (estado volátil, no se guarda)
```

**`PowerDef`**: todas las claves son opcionales; no se admite ninguna fuera de esta tabla.

| Clave | Firma | Punto de despacho | Devuelve / efecto |
|---|---|---|---|
| `stats` | `(p) → {stat: valor}` | ① `recompute` | stats sumadas a su saco |
| `mult` | `{ mult:number≤1,3, when:(c)=>bool }` | al definir → `registerMultiplier(id, …)` | Π[×]; `c = {hpFrac, targetFrac, targetSlowed, crit, p, e}` |
| `modifyResolve` | `(p, sk, prof) → void` | ② `resolveSkill` | muta el perfil (coste, enfriamiento, tags, efectos) |
| `condAdd` | `(p, e, hit) → number` | ③ `rollDamage` | puntos al saco ADITIVO para ese golpe |
| `condCrit` | `(p, e, hit) → number` | ③ `rollDamage` | probabilidad de crítico extra (se topa al tirar) |
| `onCast` | `(g, p, cast:CastInfo) → void\|false` | ⑦ canal de lanzamiento, **antes** de cobrar | `false` cancela el lanzamiento sin coste |
| `afterCast` | `(g, p, cast, res:CastResult) → void` | ⑦ tras el impacto | |
| `onHit` | `(g, p, e, hit:HitInfo) → void` | ⑤ `onPlayerHit` | no se llama si `hit.proc` (salvo con `procs:true`) |
| `onKill` | `(g, p, e, kill:KillInfo) → void` | ⑥ `onEnemyKilled` | |
| `condDr` | `(p, dmg:DamageTaken) → number` | ⑧ `Player.takeDamage`, antes de mitigar | puntos de `dr` temporales para ese golpe |
| `onDamaged` | `(g, p, dmg:DamageTaken) → void` | ⑧ tras mitigar y aplicar escudos | puede reducir `dmg.amount` |
| `onLethal` | `(g, p, dmg) → boolean` | ⑧ si la vida llega a 0 o menos | `true` = sobrevive; gana el primero por `priority` |
| `onTick` | `(g, p, dt) → void` | ⑨ `Player.update`, **a 10 Hz** (dt acumulado) | |
| `onGauge` | `(g, p, id, ev:'gain'\|'full'\|'spent'\|'empty', n) → void` | ⑩ `spec-mechanics` | |
| `icd` | `number` (s) | el despachador | enfriamiento interno; el gancho no se llama mientras dure |
| `priority` | `number` (por defecto 0) | | orden dentro del gancho (mayor = antes) |
| `procs` | `boolean` | | si `true`, `onHit` también recibe golpes de procs |
| `state` | `() → object` | primera consulta | estado inicial por héroe |
| `name`, `desc`, `tags` | metadatos | UI y tests | |

**Reglas del despachador**:
- **Daño originado por un poder** → `dealProcDamage(g, e, amount, {source:'power:<id>', tags})`, con `proc:true`. No aplica Π[×] ni dispara `onHit`, lo que evita cascadas: generaliza la guarda `_killBurst` del Paso 1A.
- **Prohibido** escribir `powers.has(` fuera de `js/powers*.js`. Un test, `test67-sin-powers-has`, lo vigila como `test59` vigila `setTimeout`. Los poderes que ya existen (`festin`, `volatil`, `furia`, `agil`, `multidisparo`, `avaricia`, `m_*`) se migran a `js/powers-common.js` en la etapa 2b.0.
- Los poderes **nunca** tocan directamente `e.stunT`, `e.slowT` ni `p.hp`. Usan las primitivas de §9.1.4.

#### 9.1.2 Puntos fijos de despacho (los **únicos** que llaman a `firePower`)

| # | Punto | Archivo | Ganchos | Argumentos que construye |
|---|---|---|---|---|
| ① | `Player.recompute()` | `entities.js` | `stats`, más `buildHookIndex` | — |
| ② | `resolveSkill(p, sk)` | `skill-resolve.js` | `modifyResolve` | `prof` en curso |
| ③ | `Player.rollDamage(coef, critBonus, addPct, e, hit)` | `entities.js` | `condAdd`, `condCrit` | `hit` parcial (skill, tags, elem) |
| ④ | `Enemy.takeDamage(amount, crit, opts)` | `entities.js` | sin ganchos: aplica **Debilidad** (`e.debuffs`) y **Π[×]** (`MULT_POWERS`) y luego llama a ⑤ | `opts = {skill, tags, elem, proc, source}` |
| ⑤ | `Game.onPlayerHit(e, hit)` | `game-skills.js` | `onHit`, más las ganancias de indicador por tags/elem | `HitInfo` |
| ⑥ | `Game.onEnemyKilled(e)` | `main.js` | `onKill` | `KillInfo` (estado tomado **antes** de limpiar el DoT o el control) |
| ⑦ | Canal de lanzamiento | `game-skills.js` | `onCast`, `afterCast` | `CastInfo`, `CastResult` |
| ⑧ | `Player.takeDamage(amount, al, opts)` | `entities.js` | `condDr` → mitigar → escudos → `onDamaged` → `onLethal` | `DamageTaken` |
| ⑨ | `Player.update(dt)` | `entities.js` | `onTick` (10 Hz) | — |
| ⑩ | `gainGauge` / `spendGauge` | `spec-mechanics.js` | `onGauge` | id, evento, cantidad |

#### 9.1.3 Otros registros (mismo patrón)

| Registro | Archivo | API | Para qué |
|---|---|---|---|
| **Comportamientos de habilidad** | `js/powers.js` | `defineSkillBehavior(id, { cast(g, p, prof, cast) → CastResult, tick?(g, p, inst, dt), end?(g, p, inst) })` | Las ≈15 activas que no encajan en un tipo genérico (Sello, Muro de Escudos, Veredicto, Evocación, Arpón, Señuelo…). `game-skills.js` usa el tipo genérico (`melee`, `proj`, `area`, `cone`, `line`, `leap`, `blink`, `shield`, `taunt`, `zone`, `trap`, `channel`, `buff`) si `sk.behavior` no existe |
| **Entidades de suelo** | `js/field-entities.js` | `defineField(kind, { init(f, opts), tick(g, f, dt), onEnter?(g, f, e), onExit?(g, f, e), onExpire?(g, f), render?(g, f) })`; `g.spawnField(kind, {pos, radius, dur, owner, data}) → f\|null` (tope de 12 por dueño, FIFO); `g.fieldsAt(pos)` | Trampas, red de espinas, campo helado, estandarte, martillos orbitales, muro de fuego, Estela. `render` es opcional y va en try/catch, así que en headless no se dibuja nada |
| **Indicadores de especialización** | `js/spec-mechanics.js` | `defineGauge(id, { max, perEnemy?:bool, decay:{after, rate}, onFull? })`; `gainGauge(p, id, n, e?)`, `spendGauge(p, id, n) → bool`, `gaugeValue(p, id, e?)` | Sed, Bastión, Fervor, Calor, Escarcha (por enemigo), Cargas, Concentración, Impulso; las trampas del Coto se cuentan como campos |
| **Multiplicadores** | `combat-math.js` (ya existe) | solo a través de `PowerDef.mult` | Únicamente los nodos clave de §5.2 y los legendarios actuales. Un test verifica que ningún otro poder declare `mult` |

#### 9.1.4 Primitivas que usan los poderes (en `entities.js` / `game-skills.js`, núcleo)

- `applyCC(e, kind:'stun'|'freeze'|'root'|'knock'|'slow'|'interrupt'|'taunt', dur, src)`: centraliza los rendimientos decrecientes, el stagger de jefes y el estado imparable.
- `applyWeakness(e, id, pct, dur)`: entrada del saco Debilidad; una por id, que se refresca.
- `applyDot(e, kind, base, src)`: usa `dotProfile` (`bleedPct`, `burnDur`…) y el planificador.
- `p.sustain(n, src)`, `g.heal(n, opts)`, `g.shield(n, opts)` (§6.1).
- `dealProcDamage(g, e, amount, opts)`.
- `g.allies(pos?, r?)`, `g.forceTarget(e, src, t)`, `g.addThreat(e, src, n)`.

#### 9.1.5 Cómo se prueba un poder de forma aislada

`tests/helpers/power-harness.mjs`, que se crea en la etapa 2b.0:

```js
import { makeHarness } from './helpers/power-harness.mjs';
const h = makeHarness({ classId: 'guerrero', spec: 'berserker', level: 50,
                        talents: { spec: { s14: 1 } }, seed: 7 });
const e = h.enemy({ hp: 1000, rank: 'elite' });           // Enemy falso con debuffs/applyCC reales
h.gauge('sed', 100);                                       // fuerza el indicador → dispara onGauge('full')
h.hit(e, { skill: 'g_mandoble', crit: true, dealt: 120 }); // pasa por ⑤ con el despachador REAL
h.tick(1.0);                                               // 10 ticks de onTick
assert.ok(h.p.buffs.some(b => b.id === 'g_desenfreno'));
assert.ok(h.sustained() <= 0.06 * h.p.stats.maxHP * 1.0 + 1e-6); // respeta la cubeta
```

- El arnés usa un `Player` real (headless, como el resto de los tests), un `TickScheduler` real, el registro de campos real (sin dibujar), una `ui` falsa que cuenta mensajes, `sfx` y `emitFx` vacíos, y RNG con semilla.
- **Cobertura por clase** (`tests/test-powers-<clase>.mjs`):
  - (a) Todo `power` y todo `grant` referenciado en `talents-<clase>.js` existe en `POWER_HOOKS`, o como comportamiento o tipo genérico de habilidad.
  - (b) Al menos un caso de comportamiento por poder.
  - (c) `definePower` rechaza claves desconocidas.
  - (d) Ningún poder fuera de la lista de nodos clave declara `mult`.

#### 9.1.6 Propiedad de archivos por clase

| Archivo | Dueño | Contenido |
|---|---|---|
| `js/skills-<clase>.js` | trabajador de la clase (2b.1) | catálogo base de §3 + `SKILL_MODS` de la clase (salen de `data.js`) |
| `js/fx-skills-<clase>.js` | trabajador (2b.1) | presets de VFX y SFX de sus habilidades (`fx-skills.js` los fusiona en `SKILL_FX`) |
| `js/talents-<clase>.js` | trabajador (2c.1) | árboles + definiciones de las activas `grant` |
| `js/powers-<clase>.js` | trabajador (2c.1) | `export const <CLASE>_POWERS`, `_BEHAVIORS`, `_FIELDS`, `_GAUGES` |
| `tests/test-skills-<clase>.mjs`, `tests/test-powers-<clase>.mjs` | trabajador | |
| Todo lo demás (`main.js`, `entities.js`, `ui.js`, `combat-math.js`, `powers.js`, `game-skills.js`, `spec-mechanics.js`, `field-entities.js`, `save-schema.js`, `data.js`, `sw.js`) | **jefe** (núcleo) | El núcleo deja creados los **stubs vacíos** de los archivos por clase y sus `import`, así los trabajadores nunca tocan un archivo compartido |

### 9.2 Etapas

Cada etapa cierra con `npm test` en verde, subida de versión de `sw.js` y la actualización de `MEMORIA.md` y `CLAUDE.md`. Tras cada tanda de trabajadores, el jefe hace una **pasada de juicio** (revisa los diffs contra este documento y devuelve lo deficiente al mismo trabajador con comentarios concretos).

**2b.0 · Núcleo de habilidades (jefe, secuencial)**
- **Nuevos**:
  - `js/skill-resolve.js` (resolvedor, `SUPPORT_MOD`, tags, rangos, `CAT_SLOTS`).
  - `js/game-skills.js` (canal de lanzamiento: GCD, windup, `impactDelay`, canalización, tipos genéricos, `onPlayerHit`).
  - `js/resources.js`.
  - `js/powers.js` (registro, despachador, comportamientos) y `js/powers-common.js` (poderes actuales migrados).
  - `js/field-entities.js` (registro + Estela migrada desde `groundZones`).
  - `tests/helpers/power-harness.mjs`.
  - Stubs `skills-<clase>.js` y `fx-skills-<clase>.js`.
- **Tocados**:
  - `entities.js`: puntos ①③④⑧⑨; `Projectile` tira el daño al impactar; `Player` con rangos derivados, `gcdT`, escudos, `sustain` y Furia por daño recibido; `Enemy` con `applyCC`, `applyWeakness` y rendimientos decrecientes por canal.
  - `main.js`: delega en `game-skills.js` y llama a ⑥.
  - `combat-math.js`: Debilidad, cubeta compartida, `CAPS.heal`, `condAddPct`.
  - `data.js`: `SUPPORTS` con `requires`/`forbids`; `CLASSES` importa `skills-<clase>.js`.
  - `bindings.js` (acción `talents`), `save-schema.js` (v3), `sw.js`.
- **Tests**:
  - Reescribir `test53`, `test55` y `test26`.
  - Nuevos: `test61` (migración v3), `test62-resolve-skill`, `test63-recursos`, `test64-gcd-impacto`, `test67-sin-powers-has` y `test68-sustento-debilidad` (cubeta compartida, tope de `healPct`, tope ×1,5).

**2b.1 · Catálogo por clase (3 trabajadores Opus en paralelo, uno por clase)**
- Cada uno escribe `skills-<clase>.js`, `fx-skills-<clase>.js` y `test-skills-<clase>.mjs`: las habilidades **base** de §3 (sin las de talento), sus ramas y su VFX.

**2b.2 · Integración y recalibración (jefe), cierre de 2b**
- Adaptar `balance-bench` a `resolveSkill`: el típico usa los rangos por nivel y el `LOADOUT` defensivo y ofensivo por clase.
- **Recalibrar SOLO coeficientes, costes y enfriamientos de `skills-*.js`** hasta que `balance-bench` vuelva a estar **en verde con los objetivos del Paso 1A**. Las curvas de enemigos (`ENEMY_CURVE`, `bossHpMult`, `eliteHpMult`, `tormentMods`) **quedan congeladas**.
- Tabla **antes/después** en `MEMORIA.md` (TTK común/élite/jefe y TTD por clase y nivel, típico y óptimo).
- Sin esto, 2c no empieza.

**2c.0 · Núcleo de talentos (jefe, secuencial)**
- **Nuevos**:
  - `js/game-talents.js` (mixin).
  - `js/spec-mechanics.js` (registro de indicadores + punto ⑩ + lectura para el HUD).
  - Stubs `talents-<clase>.js` y `powers-<clase>.js` con sus `import` en `talents.js` y `powers.js`.
- **Tocados**:
  - `talents.js`: vocabulario corregido de §5.2, `@spec`, `innate`, `costRedBig`, `durS`, `root`, `slowPct`, `critCdr`.
  - `entities.js`: `recompute` con `aggregateTalents` e `innate`; stagger, amenaza y `forceTarget`.
  - `enemy-abilities.js` (`interruptible`).
  - `data.js`: fuera `MASTERIES`; `SYSTEMS_GUIDE`.
  - `save-schema.js` (v4); borrar `game-mastery.js`.
- **Tests**: `test43-mixins`, `test65-talentos` (puntos, puertas, requisitos, presets, agregación), `test66-roles-primitivas` (provocación, escudo al de menos vida, stagger, rendimientos decrecientes) y `test61` (migración v4).

**2c.1 · Talentos y poderes por clase (3 trabajadores en paralelo)**
- Cada uno escribe `talents-<clase>.js` (transcripción de los mockups con los ajustes de §5.2 y sus activas `grant`), `powers-<clase>.js` (poderes, comportamientos, campos e indicadores de sus 3 especializaciones) y `test-powers-<clase>.mjs` (cobertura de §9.1.5).
- **Sin tocar archivos compartidos.** Los poderes de cooperativo (`g_vinculo`, `g_intercesion`, la parte «aliados» de las auras) se implementan sobre `g.allies()`; en solitario no hacen nada, pero sí tienen test.

**2c.2 · Integración (jefe)**
- Pasada de juicio, `npm test` completo y `balance-bench` sin regresiones del Paso 1A.

**2d · Interfaz (jefe + 1 trabajador)**
- Para poder paralelizar, el panel de talentos va en un módulo nuevo, `js/ui-talents.js`, que `ui.js` importa.
- **Trabajador** (`ui-talents.js` + CSS propio `css/talents.css`): panel de talentos estilo WoW (`#panel-talents`, tecla N).
  - Dos árboles (clase y especialización) en la rejilla `r/c` del mockup, con los sprites `web/talents/*.webp` (atlas `web/sprites/*.webp` + `index.json`), retrato (`web/specs`) y emblema (`web/emblems`).
  - Puertas con mensaje, tooltip con el rango actual y el siguiente, elecciones A/B, «Recomendado», «Reiniciar», «Exportar/Importar código».
  - Pantalla de elección de especialización en Nv10.
- **Jefe** (`ui.js`, `index.html`, `css/style.css`):
  - Libro de habilidades: lista por categoría + foco radial de ramas (`renderSkillFocus`).
  - **Barra de 6 ranuras** con icono de categoría; la ranura `2` muestra un selector de dos pestañas, «Defensa/utilidad» y «Gastadora».
  - Sombra de GCD, indicador de especialización sobre la barra (mockup HUD) y barra de stagger de los jefes.
- **Assets**: copiar de `D:\Proyectos\IntentoRPG-assets\web\` a `assets/`, con caché en tiempo de ejecución por clase (no se precargan los 234 iconos). Las 16 habilidades base nuevas usan temporalmente el sprite del nodo más afín.
- **Tests**: `test49-guia`, `test47-remapeo`.

**2e · Pruebas de rol en el banco (jefe)**
- `tests/balance-bench.mjs`: escenarios UNI, ÁREA×5, TTD+, APOYO y CONTROL; `buildHero(classId, level, build, {spec, loadout})`; `LOADOUT_SPEC`, `ROT_SPEC`, `TARGETS.role` y `TARGETS.k2Tradeoff`; matriz `--report`.
- El ajuste se hace solo en `skills-*.js`, `talents-*.js` y `powers-*.js`. Las curvas de enemigos siguen congeladas.
- Resultados documentados en `MEMORIA.md`.


### 9.3 Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| **Volumen**: más de 70 habilidades nuevas o rehechas y más de 70 poderes | Etapa 2c enorme | Registro data‑driven (§9.1): 10 puntos de despacho fijos y 3 trabajadores en paralelo (2b.1 y 2c.1), cada uno en sus archivos; test de cobertura por clase. Cada clase se puede desplegar cuando su `test-powers-<clase>` está en verde |
| Archivos compartidos `main.js` / `entities.js` / `ui.js` | Conflictos entre trabajadores | Solo los toca el jefe en las sub‑etapas de núcleo (2b.0 y 2c.0), que dejan creados los stubs y los `import` por clase (§9.1.6). `test67` prohíbe `powers.has(` fuera del registro |
| Balance del saco Debilidad ampliado y de las condiciones aditivas | Ráfagas fuera de rango | Un solo saco con tope ×1,5 (no hay segundo multiplicador); el banco lo vigila (golpe ≤ 25 % del jefe) |
| Migración (dos versiones seguidas) | Pérdida de builds | Idempotencia + `test61` con fixtures reales de cada versión |
| Rendimiento: trampas, campos, auras cada 0,5 s y amenaza por enemigo | FPS con 60 enemigos | Amenaza solo si hay más de una fuente; auras reevaluadas a 2 Hz; entidades de suelo con un tope de 12 |
| Mockups de Maga y Piromante sin `fx` | Interpretación propia | Tabla explícita en §5.2; el texto del nodo manda |
| La ranura `2` flexible se vuelve obligatoriamente ofensiva (la defensa sería una trampa) | Se pierde la decisión supervivencia frente a daño | El banco exige que la variante defensiva aguante ≥ +30 % en TTD+ y que la ofensiva no pase de +25 % de DPS (§7.2) |
| Peso de los assets (234 webp de talentos + retratos) | Instalación de la PWA | Caché en tiempo de ejecución por clase |

---

## 10. Investigación (octubre de 2026)

- **D4 Lord of Hatred** (abril de 2026): se rehicieron todos los árboles. Las mejoras de habilidad **cambian tags** (elemento o comportamiento) y se sustituyó la pasiva clave por ramificación. Motivo para que las ramas sean cualitativas y los soportes vayan por tags. [Shacknews](https://www.shacknews.com/article/147848/diablo-4-lord-of-hatred-skill-trees) · [DiabloBytes: rework](https://www.diablobytes.com/diablo-iv/guides/skill-tree-rework/) · [Inven Global](https://www.invenglobal.com/articles/21334/launch-d-1-lord-of-hatred-it-is-correct-to-view-it-as-8-new-classes)
- **WoW Midnight**: talentos de **ápice** de 4 puntos (1 + 2 + 1) al final del árbol de especialización, que coinciden con x1–x3 de los mockups. Cambios libres fuera de combate. Motivo de la reespecialización gratuita y del reparto de puntos. [Warcraft Tavern](https://www.warcrafttavern.com/wow/news/apex-talents-talent-tree-changes-coming-in-world-of-warcraft-midnight/) · [Blizzard](https://worldofwarcraft.blizzard.com/en-us/news/24230699) · [Icy Veins](https://www.icy-veins.com/wow/news/talent-tree-changes-teased-for-midnight-expansion/)
- **PoE2** (0.3–0.5): soportes con niveles; el mismo soporte en varias habilidades; ≈200 soportes compatibles por tags. Motivo de `requires`/`forbids`. [Mobalytics 0.3](https://mobalytics.gg/poe-2/guides/0-3-support-changes) · [poe-vault 0.4](https://www.poe-vault.com/poe2/news/poe2-adds-35-new-support-gems-in-the-last-of-the-druids) · [ProGameGuides](https://progameguides.com/path-of-exile-2/all-skill-and-support-gems-in-poe-2/)
- **Last Epoch** (temporada 5, 2026): 5 habilidades especializadas con un árbol propio cada una, y huecos que se desbloquean por nivel. Motivo del calendario de §1.2 y de que las ramas se paguen por habilidad. [Maxroll](https://maxroll.gg/last-epoch/resources/passives-and-skills) · [Neonsect T5](https://neonsect.com/es/last-epoch/last-epoch-season-5-classes-guide/)

---

## Preguntas abiertas

Ninguna. Todas las decisiones de diseño están tomadas en este documento. Lo único que dependerá del dueño es aprobar el arte de los iconos de las 16 habilidades base nuevas, que se generarán con el canal Codex en la etapa 2d. No bloquea nada: mientras tanto se usan los sprites de nodo existentes.
