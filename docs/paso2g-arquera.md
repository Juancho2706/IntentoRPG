# Paso 2g: Arquera (talentos estilo WoW), documento de diseño · etapa 1 de 2

> Estado: **diseño, etapa 1 de 2**, sin código del juego. Fecha: 2026-10-21. Molde: la Maga v4 aprobada (`docs/paso2g-maga-coherencia.md`, plantilla de §17).
> **Etapa 1 (este documento, completa):** investigación, auditoría, modelo de capas y verbos, kit base, árbol de clase, **Tiradora Veloz completa** (kit con forja, pasiva, mecánica, árbol de 29 nodos y 2 builds, una híbrida), datos del mockup y capturas.
> **Etapa 2 (pendiente, otro agente):** Francotiradora y Montaraz, los tres árboles héroe y las builds restantes. Las secciones correspondientes llevan «pendiente (etapa 2)» y §16 dice qué decisiones tiene que respetar.
> Mockup: `docs/mockups/skills-ux.html?cls=arquera&view=talents` (abrir como `file:///`). **Fuente única de datos:** `docs/mockups/data/talents-v2-arquera.js`. Las tablas de §6 y §7 se **generan** con `node docs/mockups/data/validar-talentos.mjs arquera --tablas`.

## 0. Qué entra en cada etapa

| Pieza | Etapa 1 (hecha) | Etapa 2 (pendiente) |
|---|---|---|
| Investigación, auditoría, capas y verbos | §2–§4 | Ampliar si hace falta para sus especializaciones |
| Kit base (5) y sus 3 habilidades de talento de clase | §5 | — |
| Árbol de clase (30 nodos, 53 rangos) | §6, con su revisión por especialización | Confirmar §6.1 con los kits nuevos |
| Tiradora Veloz | §7.0 completa | Builds «Vaivén Eterno» y «Galerna Infinita» (§8.4) |
| Francotiradora · Montaraz | Esqueleto válido (barra del juego, textos actuales) | Kit, pasiva, mecánica, árbol, 4 builds cada una (§7.1, §7.2) |
| Árboles héroe (3) | Esqueletos vacíos con su reparto provisional | Los tres completos (§9) y los `heroNodes` de todas las builds |
| Datos del mockup | `talents-v2-arquera.js`: `estado:'diseño'` | Rellenar `tree.spec.francotiradora`, `tree.spec.montaraz`, `tree.hero[].nodes`, `builds`, `defaultBuild` |

**Validación de la etapa 1:** el validador oficial (`validar-talentos.mjs arquera`) da **0 errores de la etapa 1** y 20 que son exactamente las piezas de la etapa 2 (árboles vacíos de Francotiradora, Montaraz y héroe; kits vacíos; faltan 2 builds de la Tiradora, los `heroNodes` y las 8 builds de las otras dos). Detalle en §14.

## 1. Resumen (15 líneas)

1. Mismo ritmo y presupuesto que la Maga (`TV2.REGLAS`): Nv100; especialización 31, clase 34, Paragon 1 + 10, tablero 16. Ningún árbol se completa.
2. **Kit base de la Arquera (Nv1–8):** Disparo Rápido, Flecha Perforante (línea), Paso Veloz, Bomba de Humo y Lluvia de Flechas (zona con aviso; baja del Nv14 al 8).
3. **Disparo Disperso y Flecha de Cicuta dejan de ser habilidades:** pasan a ser las dos variantes de forja de Disparo Rápido (área y un objetivo).
4. **Flecha Múltiple y Diluvio de Saetas pasan a ser solo de la Tiradora**; Tiro Celestial, Cerco de Zarzas y Red de Caza quedan para la etapa 2 (Francotiradora y Montaraz).
5. **Árbol de clase:** izquierda Defensa (Bomba de Humo) · centro Ritmo (básica, principales y Energía) · derecha Movilidad (Paso Veloz). Finales: **Manto de Niebla**, **Danza del Arco** y **Sombra Gemela**.
6. La clase introduce dos verbos para las tres: **distancia** (c6: A Bocajarro o Tiro Lejano) y **alternar** básica y principal (Compás → Danza del Arco).
7. Tres habilidades de talento de clase, todas para la ranura `2`: **Camuflaje** (c11A), **Agilidad** (c17A) y **Flecha Bengala** (c22A).
8. **Tiradora Veloz** (daño en área · Impulso): su verbo principal es **disparar en movimiento**. Quieta no gana Impulso y, nuevo, lo pierde.
9. Kit de la Tiradora: **Andanada** (salto atrás disparando y **relanzar** hacia delante en 2 s), **Carrera del Viento** (**mantener**: corres más rápido y disparas sola), **Flecha Múltiple** y **Diluvio de Saetas** (la nube **te sigue**).
10. Pasiva **Tercera Flecha**: cada 3.er Disparo Rápido lanza 2 flechas más (**secuencia**).
11. Arquetipos: **Abanico** (más flechas, contra grupos), **Vaivén** (Andanada en bucle durante el Vendaval, contra jefes) y **Galerna** (correr en círculo dejando ciclones).
12. Finales: **Tormenta de Plumas**, **Vaivén Eterno** y **Galerna Infinita**; ápice **Ojo del Huracán**.
13. Dos builds validadas punto a punto hasta el Nv100: **Tormenta de Plumas** (Abanico) y **Viento Cruzado** (híbrida Abanico + Vaivén, a ~8 % de la mejor en cada escenario).
14. Motor: tres **tipos genéricos nuevos** (relanzar, canal que acelera con disparo automático y secuencia del básico) y la pérdida del Impulso; `cargar y soltar` queda descrito para la Francotiradora (§11.2).
15. §16 deja a la etapa 2 los verbos ya ocupados, los nombres reservados, los ids y los pendientes.

---

## 2. Investigación (consultada el 2026-10-21)

Se suma a la de la Maga (su §2 y su Anexo A.1). Lo pedido esta vez es sobre **verbos de entrada y movimiento**: mantener, cargar y soltar, relanzar y moverse disparando.

| Fuente (fecha) | Juego | Qué dice | Qué tomamos |
|---|---|---|---|
| [poe2wiki: Channelled](https://www.poe2wiki.net/wiki/Channelled) (sin fecha; wiki viva en 2026) | PoE 2 | Las canalizaciones que se sueltan tienen una ventana de **Perfect Timing**: un destello rojo avisa de que se abrió y soltar dentro da más daño o efectos | La ventana de soltado perfecto **se ve y se oye** (§11.2, `charge`) |
| [outof.games: Snipe](https://outof.games/realms/poe2/skills/snipe/) (sin fecha) | PoE 2 | Snipe soltado a tiempo hace explotar la flecha y consume el Congelado | Para la Francotiradora (etapa 2): el soltado perfecto **cambia** el disparo, no solo suma daño |
| [poe2wiki: Window of Opportunity](https://www.poe2wiki.net/wiki/Window_Of_Opportunity) (sin fecha) | PoE 2 | Un soporte acorta la ventana un 35 % y sube un 35 % el daño del soltado perfecto | Un nodo puede **estrechar** la ventana a cambio de más premio (riesgo frente a recompensa) |
| [Fextralife: Snipe](https://lostark.wiki.fextralife.com/Snipe) · [Charged Shot](https://lostark.wiki.fextralife.com/Charged+Shot) (sin fecha) | Lost Ark | Mantener para apuntar y soltar; la **zona perfecta** multiplica el daño ×4. El disparo cargado tiene etapas y empuja desde la etapa 1 | Etapas de carga con efecto propio y zona perfecta para la Francotiradora |
| [Fextralife: controles de Hades II](https://hades2.wiki.fextralife.com/Controls) · [Maxroll: guía de inicio](https://maxroll.gg/hades-2/guides/hades-2-beginners-guide) (sin fecha) | Hades II | Movimientos Omega: **mantener** el botón carga la versión fuerte (cuesta Magia y te deja expuesto). **Dash-Strike**: atacar justo después del dash. Mantener el dash = correr sin invulnerabilidad | Andanada = golpe que te desplaza; **Carrera del Viento** = mantener para correr, a cambio de no esquivar |
| [PureDiablo: Rapid Fire](https://www.purediablo.com/diablo4/Rogue_Skills) (sin fecha) · [DiabloBytes: tier list (2026-05-20, parche 3.0.2)](https://diablobytes.com/diablo-iv/builds/rogue-tier-list/) | Diablo 4 | Rapid Fire: 5 flechas seguidas y cada una más crítica; Penetrating Shot sigue arriba en 2026 | La **secuencia** (cada flecha distinta) vive en el básico de la Tiradora; la Flecha Perforante sigue en el kit base |
| [Wowhead: Shadow Shot](https://www.wowhead.com/diablo-4/skill/377137) (sin fecha; variante de Lord of Hatred) | Diablo 4 | Variante de Penetrating Shot que invoca 2 sombras que disparan contigo al 60 % | **Sombra Gemela** (final de clase): la sombra repite solo las principales, 3 s, para no doblar todo el daño |
| [Icy Veins: lista de hechizos de Puntería](https://www.icy-veins.com/wow/marksmanship-hunter-pve-dps-spell-summary) (Midnight temporada 1, 2026) | WoW Midnight | Disparo Apuntado vuelve a **2,5 s** de lanzamiento (1,5 s con Disparo Certero); los talentos Apex «Take Aim» lo hacen crítico siempre | La Francotiradora es la **plantada** (preparación larga, premio grande); la Tiradora, lo contrario |
| [Archon: árboles de Puntería y Bestias](https://www.archon.gg/wow/builds/marksmanship/hunter/raid/talents/normal/all-bosses) (Midnight, parches 12.0.5–12.0.7, 2026) | WoW Midnight | El cazador tiene 3 árboles héroe (Dark Ranger, Sentinel, Pack Leader), cada uno compartido por 2 especializaciones; uno domina en cada especialización (69–93 % de uso) | Árboles héroe **temáticos de la clase** y con pesos parecidos: que ninguno sea obligatorio (§9) |
| [Icy Veins: Marksman (Last Epoch 1.0)](https://www.icy-veins.com/last-epoch/marksman-overview) · [Maxroll: Hail of Arrows](https://maxroll.gg/last-epoch/build-guides/hail-of-arrows-marksman-guide) | Last Epoch | Detonating Arrow se clava y **explota a los 0,6 s**; la Bomba de Humo crea sombras que potencian la siguiente lluvia | **Emboscada** (salir del humo da críticos); «marcar y detonar» se reserva al Montaraz |

**Lagunas.** Ninguna fuente da la duración exacta de la ventana de Perfect Timing de PoE 2; la de §11.2 (0,2 s) es diseño propio. Las fichas de Lost Ark son anteriores a 2026 (los números pueden haber cambiado; se usa el patrón, no los valores). No encontré datos públicos de cuántos jugadores usan cada verbo.

**Lecciones aplicadas.**
- Cada verbo trae su **feedback**: barra de carga, anillo de ventana, destello y sonido.
- **Riesgo a cambio de premio:** mantener te deja expuesta, el tiempo justo pega más y la ventana estrecha pega más todavía.
- Moverse forma parte del golpe (salto con disparo); no es solo escapar.
- Las especializaciones **no comparten su verbo principal**.

---

## 3. Auditoría de la Arquera actual (juego a 2026-10-21)

### 3.1 Activas (27) y quién las toca

Hoy hay 13 habilidades en el libro (para las tres especializaciones) y 14 que conceden nodos de talento.

| Habilidad (hoy) | Origen | Quién la toca hoy | Problema | En la v2 |
|---|---|---|---|---|
| Disparo Rápido | libro, básica Nv1 | ramas 2f | — | Kit base (básica). Pasiva de la Tiradora |
| Disparo Disperso | libro, básica Nv3 | — | Tres básicas compiten por `IZQ` | **Variante I** de Disparo Rápido |
| Flecha de Cicuta | libro, básica Nv8 | Montaraz s1 | Ídem | **Variante II** de Disparo Rápido |
| Flecha Perforante | libro, principal Nv2 | Franco s3, Montaraz s10 | — | Kit base (principal en línea) |
| Flecha Múltiple | libro, principal Nv8 | **clase c9**, Tiradora s3/s6/s7/s12/s15, Vendaval, Montaraz s5 | Lo fuerte de la Tiradora está en el libro de las tres y en el árbol de clase | **Kit de la Tiradora** (Nv14) |
| Lluvia de Flechas | libro, principal Nv14 | clase c9, Tiradora s10/s12, Montaraz s3 | — | Kit base (zona), **Nv8** |
| Paso Veloz | libro, movilidad Nv4 | — | Compite con Agilidad y con 3 movilidades de talento | Kit base (movilidad) |
| Agilidad | libro, movilidad Nv12 | clase c11, Tiradora s5 | — | **Habilidad de talento de clase** (c17A, ranura `2`) |
| Red de Caza | libro, utilidad Nv6 | — | Control de Montaraz para todas | Etapa 2 (probable Montaraz) |
| Bomba de Humo | libro, defensa Nv12 | — | — | Kit base (defensa), **Nv6** |
| Diluvio de Saetas | libro, definitiva Nv15 | Tiradora s16 | Tres definitivas para todas | **Definitiva de la Tiradora** (te sigue) |
| Tiro Celestial | libro, definitiva Nv15 | — | Ídem | Etapa 2 (probable Francotiradora) |
| Cerco de Zarzas | libro, definitiva Nv15 | — | Ídem | Etapa 2 (probable Montaraz) |
| Voltereta | clase c2 | c7 Cuero Curtido | Nodo y habilidad con el mismo nombre | Sale: su idea vive en Paso Veloz y en Tras la Rodada (c27) |
| Disparo Conmocionante | clase c3 | — | Activa de relleno (ralentizar) | Sale: **Flecha Roma** (c10A, pasiva) |
| Flecha Silenciadora | clase c5A | — | — | Sale: **Flecha Silbante** (c10B, pasiva) |
| Flecha Bengala | clase c12A | — | «Revela invisibles» que no existen | **c22A** (ranura `2`), sin «revelar» |
| Camuflaje | clase c12B | — | — | **c11A** (ranura `2`) |
| Disparo Apuntado | Franco s0 (clave) | Franco s4, s6, s10, s12, s14, s17, x1–x3 | Insignia concedida por el nodo clave | Etapa 2 (al libro) |
| Visión Certera | Franco s9 | — | Activa dentro del árbol de especialización; nodo y habilidad con el mismo nombre | Etapa 2 |
| Disparo Disuasorio | Franco s13A | — | — | Etapa 2 |
| Trampa de Cepo | Montaraz s0 (clave) | Montaraz s4, s6, s12, s14, s16, x1–x3 | Insignia concedida por el nodo clave | Etapa 2 (al libro) |
| Arpón | Montaraz s9 | Montaraz s12 | Activa dentro del árbol | Etapa 2 |
| Señuelo de Paja | Montaraz s13A | — | — | Etapa 2 |
| Andanada | Tiradora s0 (clave) | Tiradora s4, s7, s15 | Insignia concedida por el nodo clave | **Insignia de la Tiradora** en el libro, con relanzamiento |
| Danza de Flechas | Tiradora s9 | — | Activa dentro del árbol | Sale: su idea (canalizar corriendo) es **Carrera del Viento** |
| Salto de Retirada | Tiradora s13A | — | — | Sale: pasa a **Retirada Instintiva** (v15B, automática) |

### 3.2 Conflictos

| Conflicto | Ejemplo | Cómo se resuelve |
|---|---|---|
| La clase toca lo fuerte de una especialización | c9 «Flechas Templadas» sube Flecha Múltiple; c11 alarga Agilidad | El árbol de clase solo toca el kit base (G1) |
| Insignias concedidas por el nodo clave y activas dentro del árbol de especialización | Andanada, Disparo Apuntado, Trampa de Cepo; Danza, Visión Certera, Arpón | El kit va al **libro**; los árboles son pasivos |
| Tres definitivas para todas | Diluvio, Tiro Celestial, Cerco | Una por especialización |
| Nombres repetidos | «Voltereta», «Visión Certera» (nodo y habilidad); «Ojo de Halcón» (c4 y variante 2f de Agilidad); «Andanada» y «Andanada Final» (variante 2f del Diluvio); «Constelación» (variante 2f del Tiro Celestial y final del Arcanista) | Nombres únicos en la clase y comprobados contra la Maga y el Guerrero (§14) |
| Nodos que no hacen nada | Tiradora s2 «Disparar ya no te frena» (ya pasa siempre); Montaraz s2 «Ves el rastro de tu Presa» | Fuera |
| Relleno de +2 % | Tiradora s1 (+2 %/rango), s17 (+2 %/rango); clase c8 (+2 %/rango) | Cada número es ≥ +10 % en su eje o es mecánica |
| El Impulso no se pierde | Quedarse quieta no castiga a la Tiradora | Pierde 10 por segundo tras 2 s quieta (§7.0) |
| Pasiva del Montaraz = la del Crionte | «+25 % de Quebranto a los jefes» | Etapa 2 la cambia (§16) |
| Casi todo es «aprieto y sale» | Solo Tiro Celestial se relanza, Disparo Apuntado prepara 1 s y Danza canaliza | Vocabulario de verbos (§4.3) |

---

## 4. Modelo de capas y verbos

### 4.1 Capas

| Capa | Qué es | Qué contiene |
|---|---|---|
| **Kit base de la Arquera** | Lo que sabe toda Arquera desde el Nv1 | Disparo Rápido (1), Flecha Perforante (2), Paso Veloz (4), Bomba de Humo (6), Lluvia de Flechas (8) |
| **Kit de especialización** | Llega al elegirla (Nv10) y por nivel; solo existe con ella | Tiradora: Andanada (`3`, Nv10), Carrera del Viento (`1`, Nv12), Flecha Múltiple (`DER/2`, Nv14), Diluvio de Saetas (`4`, Nv15). Francotiradora y Montaraz: etapa 2 |
| **Talentos** | Clase · Paragon · Especialización | §6, §9, §7. Habilidades de talento solo en c11A, c17A y c22A (clase) y en 1 por árbol héroe |
| **Forja** | Mejora + 2 variantes por habilidad | Transforma; el talento no la repite (§10) |

Ranuras de la Tiradora: `IZQ` Disparo Rápido (Disparo Disperso ★) · `DER` Flecha Múltiple · `1` Carrera del Viento **o** Paso Veloz (con su rama de clase) · `2` flexible (Bomba de Humo, Lluvia, Perforante o la habilidad de clase elegida) · `3` Andanada · `4` Diluvio de Saetas.

**Decisión de diseño visible:** la ranura `1` obliga a elegir entre la **Carrera del Viento** (de la especialización; la potencia su columna C) y el **Paso Veloz** (del kit base; lo potencia la columna derecha del árbol de clase, con Sombra Gemela). Las dos builds de §8 toman caminos distintos.

### 4.2 Calendario Nv1–15 (la especialización se elige al Nv10)

| Nv | Kit base | Tiradora | Francotiradora | Montaraz | Talentos |
|---|---|---|---|---|---|
| 1 | Disparo Rápido | | | | — |
| 2 | Flecha Perforante | | | | — |
| 4 | Paso Veloz | | | | — |
| 6 | Bomba de Humo | | | | — |
| 8 | Lluvia de Flechas | | | | — |
| **10** | | Andanada (`3`) · pasiva Tercera Flecha | etapa 2 | etapa 2 | Nodo clave gratis + 1.er punto de especialización |
| 11 | | | | | 1.er punto de clase |
| 12 | | Carrera del Viento (`1`) | | | |
| 14 | | Flecha Múltiple (`DER/2`) | | | |
| 15 | | Diluvio de Saetas (`4`) | | | |

Las habilidades de talento de clase llegan cuando su nodo se puede comprar: **Camuflaje ≈ Nv21**, **Agilidad ≈ Nv27**, **Flecha Bengala ≈ Nv31** (mismo cálculo que la Maga).

### 4.3 Verbos de entrada y movimiento (pedido del dueño)

| Verbo | Qué es | Referencia (§2) | Motor hoy (`game-skills.js`) | Falta | Verbo principal de |
|---|---|---|---|---|---|
| **Moverse disparando** (kiteo) | Bonus por disparar en movimiento | D4, Hades | `p.moving` ✓ (Impulso, Concentración) | Pérdida del Impulso quieta | **Tiradora** |
| **Mantener para cargar y soltar** | Más daño o alcance cuanto más cargas; ventana de soltado perfecto que se ve y se oye | PoE 2 Perfect Timing, Lost Ark Snipe | `windup` fijo (no se mantiene) | **Tipo genérico `charge`** (§11.2) | Francotiradora (propuesta, etapa 2) |
| **Canalizar mientras mantienes** | Chorro o ráfaga mientras aprietas; moverte lento, quieta o (nuevo) más rápido | D4 Rapid Fire, Hades (correr) | `startChannel` con `hold` ✓; el canal no cambia la velocidad | Claves `moveMul`, `autoShot`, `drainPerSec`, `onRelease` | — (Tiradora lo usa en la Carrera) |
| **Preparación interrumpible** frente a instantáneo | Preparar y que la esquiva lo cancele | WoW Disparo Apuntado 2,5 s | `windup` ✓ | Opcional: frenar al preparar (`castMoveMul`) | — (Tiro de Precisión; Francotiradora) |
| **Plantado contra en movimiento** | Bonus por no moverte frente a bonus por moverte | — | `p.moving` ✓ | — | Tiradora (en movimiento) · Francotiradora (plantada) |
| **Golpe que te desplaza** | Salto, voltereta o embestida que dispara | Hades Dash-Strike | comportamientos a medida (`a_paso`, `a_t_salto`) | — | — (Andanada) |
| **Relanzar dentro de una ventana** | Segunda pulsación; tiempo justo | Tiro Celestial actual | solo a medida (`a_celeste`) | **Tipo genérico `recast`** | — (Andanada) |
| **Secuencia** | El 3.er golpe es distinto | D4 (combo) | no | **Clave genérica `seq`** del básico | — (pasiva Tercera Flecha) |
| **Marcar y detonar después** | La marca estalla luego | Last Epoch Detonating Arrow | `mark` ✓ | — | Montaraz (propuesta, etapa 2) |
| **Colocar trampas o zonas** | Preparar el terreno | — | `trap`, `zone` ✓ | — | Montaraz (propuesta, etapa 2) |
| **Posición** | Distancia o flanco | — | — | `condAdd` por distancia | Clase (c6) |
| **Zona que te sigue** | La nube va contigo | — | campos fijos; `aura` | Clave `follow` en la lluvia | — (Diluvio) |

**Reglas.** Cada especialización usa **al menos 3 verbos distintos** en su kit y su árbol tiene nodos que **modifican** esos verbos, no solo números. Las tres **no comparten su verbo principal**: Tiradora = moverse disparando; Francotiradora = cargar y soltar plantada (propuesta); Montaraz = colocar y detonar (propuesta).

### 4.4 Ritmo, puertas y presupuesto (iguales a la Maga)

Valores de `TV2.REGLAS` (la Maga, §3). Lo que mide el validador con los árboles de la Arquera:

| Árbol | Nodos · rangos | Puntos a Nv100 | Un final al máximo | Dos finales | Puertas |
|---|---|---|---|---|---|
| Clase | 30 · 53 | 34 (64 %) | 30 puntos → **Nv69** (los tres) | 36 > 34: imposible | 8 → fila 4 (Nv25) · 24 → fila 7 (Nv57) |
| Tiradora | 29 · 59 | 31 (53 %) | 26 → **Nv60**; con el ápice completo, 30 → **Nv68** | 32 > 31: imposible | 8 → fila 4 (Nv24) · 20 → fila 7 (Nv48) · 25 → ápice (Nv58) |

---

## 5. Kit base de la Arquera (5 habilidades, Nv1–8)

Mejora a Nv+3 y variantes a Nv+6 (como en 2f). `WD` = daño del arma.

| Habilidad | Ranura · Nv | Qué hace | Mejora | Variante I | Variante II |
|---|---|---|---|---|---|
| **Disparo Rápido** (`a_disparo`) | Básica `IZQ` · 1 | Una flecha veloz (100 %). Cada acierto te devuelve 5 de Energía | **Mano Rápida**: un 10 % más rápido | **Disparo Disperso** (área): 3 flechas en 25° (45 % cada una). Absorbe a Disparo Disperso | **Flecha de Cicuta** (un objetivo): Naturaleza, 70 % y veneno del 50 % en 4 s que se suma. Absorbe a Flecha de Cicuta |
| **Flecha Perforante** (`flecha_perforante`) | Principal `DER/2` · 2 | Flecha pesada (240 %) que atraviesa en línea. 26 de Energía | **Astil de Fresno**: +2 m y +20 % de velocidad | **Flecha Explosiva** (área): no atraviesa; explota en 3 m al 80 % | **Tiro de Precisión** (un objetivo): preparas 0,35 s (la esquiva la cancela), +45 % |
| **Paso Veloz** (`a_paso`) | Movilidad `1` · 4 | Ruedas 6 m y +20 % de velocidad de ataque 3 s. Se recarga en 9 s | **Ágil**: el bonus dura 4 s | **Rodar y Disparar** (un objetivo): al rodar, un Disparo Rápido gratis al 150 % | **Doble Rodada** (movilidad): 2 cargas, sin el bonus |
| **Bomba de Humo** (`a_humo`) | Defensa `2` · **6** (antes 12) | Nube de 4 m, 8 s: dentro, −50 % de daño recibido; los enemigos, cegados, pegan −30 %. Se recarga en 16 s | **Humo Espeso**: radio 5 m | **Humo Venenoso** (área): veneno del 40 % por segundo dentro | **Estallido de Humo** (control): al lanzarla empuja 3 m y ralentiza un 40 % 2 s |
| **Lluvia de Flechas** (`lluvia_flechas`) | Principal `DER/2` · **8** (antes 14) | Tras 0,3 s de aviso, 4 oleadas en 3 m (60 % cada una). 30 de Energía, 4 s | **Cielo Plomizo**: 5 oleadas | **Aguacero** (un objetivo): radio 2 m, en 0,8 s, +40 % | **Cortina** (supervivencia): dentro, los enemigos pegan −15 % y fallan la mitad de sus proyectiles |

Dos principales de estilos distintos: **Perforante** (instantánea, en línea) y **Lluvia** (zona diferida con aviso). Nada fuerte de una especialización: la Múltiple, el Diluvio, el Tiro Celestial y el Cerco salen del kit base.

**Habilidades de talento de clase** (solo en la ranura `2`; sin forja):

| Habilidad | Nodo | Qué hace | Se recarga |
|---|---|---|---|
| **Camuflaje** (`a_t_camuflaje`, defensa) | c11A | Invisible 4 s; los enemigos te pierden y tu primer disparo al salir es crítico | 30 s |
| **Agilidad** (`agilidad`, utilidad) | c17A | 6 s: +30 % de velocidad, +15 % de velocidad de ataque e inmune a ralentizaciones | 16 s |
| **Flecha Bengala** (`a_t_bengala`, utilidad) | c22A | Bengala de 10 m durante 8 s: los enemigos dentro reciben un 10 % más de daño de todo el grupo | 30 s |

---

## 6. Árbol de clase de la Arquera (30 nodos, 53 rangos)

Generada de los datos. ○ pasiva · ⬡ elección · □ opción que concede una habilidad. «Requiere» = cualquiera de esos nodos al máximo.

| Fila | Id | Nodo | Forma · tipo | Etiqueta | Rangos | Requiere | Qué hace (al máximo) | Cuál conviene |
|---|---|---|---|---|---|---|---|---|
| 0 | c1 | Carcaj Profundo | ○ pasiva | número | 2 | — | Rango 2: +20 de Energía máxima (antes 60) |  |
| 0 | c2 | Pulso Firme | ○ pasiva | número | 2 | — | Rango 2: Todas tus flechas hacen +12 % de daño |  |
| 0 | c3 | Paso de Gacela | ○ pasiva | número | 2 | — | Rango 2: Paso Veloz se recarga en 6 s (antes 9 s) |  |
| 1 | c4 | Bomba Rápida | ○ pasiva | número | 3 | c1 | Rango 3: La Bomba de Humo se recarga en 10 s (antes 16 s) |  |
| 1 | c5 | Disparo: Fijo o Saqueo | ⬡ elección | mecánica | 1 | c1 o c2 | **A · ○ Puntería Fija**: Cada 4.º Disparo Rápido al mismo enemigo es crítico seguro _(contra jefes)_<br>**B · ○ Flecha Saqueadora**: Si Disparo Rápido mata, recuperas 8 de Energía _(contra grupos)_ | A, contra jefes: un crítico seguro cada ~3 s. B, contra grupos: como mueren muchos, ≈ una habilidad principal extra cada 3 muertes |
| 1 | c6 | Distancia: Bocajarro o Lejos | ⬡ elección | mecánica | 1 | c2 o c3 | **A · ○ A Bocajarro**: A menos de 5 m, tus flechas hacen +15 % de daño y empujan 1 m al enemigo _(contra grupos)_<br>**B · ○ Tiro Lejano**: A más de 10 m, tus flechas hacen +20 % de daño _(contra jefes)_ | A, contra grupos que te alcanzan: el empuje te da aire para seguir kiteando. B, contra jefes, si sabes mantener la distancia. Sirve igual a las tres |
| 1 | c7 | Paso Limpio | ○ pasiva | mecánica | 1 | c3 | Paso Veloz te quita las ralentizaciones y las inmovilizaciones |  |
| 2 | c8 | Difícil de Alcanzar | ○ pasiva | número | 2 | c4 o c5 | Rango 2: Mientras te mueves, recibes un 12 % menos de daño |  |
| 2 | c9 | Perforante: Lastrada o Diamante | ⬡ elección | mecánica | 1 | c5 o c6 | **A · ○ Flecha Lastrada**: Flecha Perforante ralentiza un 40 % durante 3 s a todos los que atraviesa _(control)_<br>**B · ○ Punta de Diamante**: Flecha Perforante hace +40 % al primer enemigo que toca _(contra jefes)_ | A, para controlar grupos en fila y escapar de ellos. B, contra jefes y élites |
| 2 | c10 | Roma o Silbante | ⬡ elección | mecánica | 1 | c6 o c7 | **A · ○ Flecha Roma**: Cada 8 s, tu siguiente disparo ralentiza un 50 % durante 4 s _(control)_<br>**B · ○ Flecha Silbante**: Cada 10 s, tu siguiente disparo corta el hechizo del enemigo y lo deja mudo 3 s _(contra jefes)_ | A, contra grupos que te persiguen. B, contra jefes y élites que lanzan hechizos (además les llena 20 de Quebranto) |
| 3 | c11 | Camuflaje o Instinto | ⬡ elección | mecánica | 1 | c8 | **A · □ Camuflaje** (habilidad): Habilidad (ranura 2): invisible 4 s; los enemigos te pierden y tu primer disparo es crítico. Se recarga en 30 s _(supervivencia)_<br>**B · ○ Instinto de Supervivencia**: Un golpe que te mataría te deja con 1 de vida y suelta una Bomba de Humo gratis. Una vez cada 120 s _(supervivencia)_ | A, contra golpes de jefe que se ven venir y para cambiar de sitio (ocupa la ranura 2). B, siempre activo y sin ocupar ranura |
| 3 | c12 | Respiración Pausada | ○ pasiva | número | 2 | c8 o c9 | Rango 2: Recuperas Energía un 30 % más rápido |  |
| 3 | c13 | Ojo de Halcón | ○ pasiva | número | 2 | c9 o c10 | Rango 2: +10 % de probabilidad de crítico |  |
| 3 | c14 | Paso: Abrojos o Sanador | ⬡ elección | mecánica | 1 | c10 | **A · ○ Paso de Abrojos**: Donde empieza tu Paso Veloz quedan abrojos 3 s que ralentizan un 50 % _(control)_<br>**B · ○ Paso Sanador**: Paso Veloz te cura un 6 % de la vida _(supervivencia)_ | A, para escapar de enemigos cuerpo a cuerpo. B, para aguantar peleas largas |
| 4 | c15 | Adrenalina o Calma Letal | ⬡ elección | mecánica | 1 | c11 o c12 | **A · ○ Adrenalina**: Al bajar del 50 % de vida recuperas 30 de Energía y recibes un 20 % menos 4 s. Una vez cada 30 s _(supervivencia)_<br>**B · ○ Calma Letal**: Con más de 40 de Energía, haces +10 % de daño _(contra jefes)_ | A, para sobrevivir a golpes fuertes (+12–15 % de aguante). B, para hacer daño (+6–8 %) |
| 4 | c16 | Presión o Barrido | ⬡ elección | mecánica | 1 | c12 o c13 | **A · ○ Presión Constante**: Cada disparo al mismo enemigo te da +4 % de daño contra él (hasta +20 %); se pierde al cambiar de blanco _(contra jefes)_<br>**B · ○ Barrido de Caza**: Cada enemigo distinto que golpeas en 2 s te da +3 % de velocidad de ataque (hasta +15 %) _(contra grupos)_ | A, contra jefes: +20 % casi siempre. B, contra grupos: +15 % de velocidad de ataque con 5 enemigos a tiro |
| 4 | c17 | Agilidad o Huida | ⬡ elección | mecánica | 1 | c13 o c14 | **A · □ Agilidad** (habilidad): Habilidad (ranura 2): 6 s con +30 % de velocidad, +15 % de ataque e inmune a ralentizaciones. Se recarga en 16 s _(supervivencia)_<br>**B · ○ Huida Desesperada**: Al bajar del 30 % de vida: +40 % de velocidad y un 20 % menos de daño 4 s. Una vez cada 60 s _(supervivencia)_ | A, para escapar o perseguir a voluntad (ocupa la ranura 2). B, contra el daño constante de un grupo, sin ocupar ranura |
| 5 | c18 | Humo Denso | ○ pasiva | número | 2 | c15 | Rango 2: La Bomba de Humo dura 12 s (antes 8 s) |  |
| 5 | c19 | Tiro desde la Niebla | ○ pasiva | mecánica | 1 | c15 o c16 | Dentro de tu Bomba de Humo, cada Disparo Rápido te da 3 de Energía y alarga el humo 0,3 s (hasta +4 s)<br>_híbrido: Defensa + Básica_ |  |
| 5 | c20 | Lluvia en Retirada | ○ pasiva | mecánica | 1 | c16 o c17 | Paso Veloz deja caer una Lluvia de Flechas gratis al 50 % donde empezaste a rodar<br>_híbrido: Movilidad + Principal_ |  |
| 5 | c21 | Piernas de Corredora | ○ pasiva | número | 1 | c17 | Te mueves un 10 % más rápido |  |
| 6 | c22 | Bengala o Economía | ⬡ elección | mecánica | 1 | c18 o c19 | **A · □ Flecha Bengala** (habilidad): Habilidad (ranura 2): bengala de 10 m 8 s; los enemigos dentro reciben +10 % de daño. Se recarga en 30 s _(contra grupos)_<br>**B · ○ Economía Letal**: Las habilidades que cuestan más de 20 de Energía cuestan un 20 % menos _(contra jefes)_ | A, en grupo: todo el grupo pega +10 % dentro (ocupa la ranura 2). B, para hacer daño en solitario (+5–7 %) |
| 6 | c23 | Recarga en Marcha | ○ pasiva | mecánica | 2 | c19 o c20 | Rango 2: Cada habilidad principal que lanzas recarga 0,6 s de Paso Veloz y de la Bomba de Humo |  |
| 6 | c24 | Cadencia | ○ pasiva | número | 2 | c20 o c21 | Rango 2: Disparas un 14 % más rápido |  |
| 7 | c25 | Emboscada | ○ pasiva | mecánica | 3 | c22 | Rango 3: Al salir de tu Bomba de Humo o al acabarse, tus 4 siguientes disparos son críticos seguros |  |
| 7 | c26 | Compás | ○ pasiva | mecánica | 3 | c23 | Rango 3: Alternar básica y principal te da un Compás (hasta 5): +6 % de daño cada uno. Se pierden a los 3 s |  |
| 7 | c27 | Tras la Rodada | ○ pasiva | mecánica | 3 | c24 | Rango 3: Tras Paso Veloz, tu siguiente habilidad principal no cuesta Energía y hace +30 % |  |
| 8 | c28 | Manto de Niebla | ○ **FINAL** | mecánica | 3 | c25 | Rango 3: Tu Bomba de Humo te sigue. Tú y tus aliados dentro recuperan un 3 % de vida por segundo<br>_final: Defensa_ |  |
| 8 | c29 | Danza del Arco | ○ **FINAL** | mecánica | 3 | c26 | Rango 3: Con 5 Compases, tu siguiente principal es gratis, crítica y hace +60 %; los Compases vuelven a 0<br>_final: Ritmo_ |  |
| 8 | c30 | Sombra Gemela | ○ **FINAL** | mecánica | 3 | c27 | Rango 3: Paso Veloz deja una sombra tuya 3 s que repite tus habilidades principales al 60 %<br>_final: Movilidad_ |  |

**Tres finales (utilidad o ritmo; el daño grande vive en la especialización):**
- **Manto de Niebla** (izquierda, Defensa): la Bomba de Humo **te sigue** y cura a quien está dentro. Convierte el humo en una zona que kitea contigo y en apoyo de grupo.
- **Danza del Arco** (centro, Ritmo): al **alternar** básica y principal juntas Compases; con 5, la siguiente principal sale gratis, crítica y +60 %.
- **Sombra Gemela** (derecha, Movilidad): Paso Veloz deja una sombra 3 s que repite tus principales al 30–60 %.

**Verbos que añade la clase:** **distancia** (c6 Bocajarro o Lejano), **alternar** (c26 Compás → c29), **entrar y salir del humo** (c25 Emboscada) y **rodar** (c3, c7, c14, c20, c27, c30).

**Implementación (por nodo):** `c1` stats.mp · existe; `c2` stats.dmgPct · existe; `c3` mod a_paso cdr · existe; `c4` mod a_humo cdr · existe; `c5` A: power a_punteria_fija · NUEVO · B: power a_saqueo · NUEVO (onKill); `c6` A: power a_bocajarro · NUEVO (condAdd por distancia + empuje) · B: power a_tiro_lejano · NUEVO; `c7` mod a_paso cleanse · clave existente; `c8` tv.drMoving · existe; `c9` A: mod flecha_perforante slow · claves · B: power a_punta_diamante · NUEVO; `c10` A: power a_flecha_roma · NUEVO (lógica de a_t_conmocion) · B: power a_silbante · NUEVO (lógica de a_t_silencio; interrumpir = 20 de Quebranto); `c11` A: activa a_t_camuflaje · existe · B: power a_instinto · NUEVO (onLethal); `c12` stats regen de Energía · existe; `c13` stats.crit · existe; `c14` A: power a_paso_abrojos · NUEVO (campo) · B: power a_rodada_cura · NUEVO (g.heal); `c15` A: power a_adrenalina · NUEVO · B: tv.highManaDmg (umbral 40) · existe; `c16` A: power a_presion · NUEVO · B: power a_barrido · NUEVO; `c17` A: activa agilidad · existe · B: power a_huida · NUEVO; `c18` mod a_humo durS · existe; `c19` power a_tiro_niebla · NUEVO; `c20` power a_lluvia_retirada · NUEVO (eco de la Lluvia ×0,5); `c21` stats.spdPct · existe; `c22` A: activa a_t_bengala · existe (pasa a Debilidad 10 %) · B: tv.costRedBig · existe; `c23` power a_recarga_marcha · NUEVO; `c24` stats.aspdPct · existe; `c25` power a_emboscada · NUEVO; `c26` power a_compas · NUEVO; `c27` power a_tras_rodada · NUEVO; `c28` power a_manto · NUEVO (campo que sigue al dueño + g.heal a los aliados dentro); `c29` power a_danza_arco · NUEVO; `c30` power a_sombra · NUEVO (eco de las principales).

### 6.1 Revisión: ¿sirve igual a las tres especializaciones?

| Rama · nodo | Tiradora | Francotiradora (etapa 2, previsto) | Montaraz (etapa 2, previsto) | Veredicto |
|---|---|---|---|---|
| c5 Disparo (Fijo o Saqueo) | Saqueo en grupos; Fijo en la híbrida | Fijo (un objetivo) | Saqueo (manadas controladas) | Sirve a las tres: la básica es de todas |
| c6 Distancia (Bocajarro o Lejos) | Bocajarro (los que la alcanzan; el empuje la deja seguir kiteando) | Lejano natural | Bocajarro junto a sus trampas | **Elección real por especialización**, no obligatoria |
| c9 Perforante, c20 Lluvia en Retirada | Opcionales (la Tiradora usa Múltiple) | Perforante en la ranura `2` | Lluvia en la ranura `2` | Tocan el kit base, que sigue en el libro de las tres |
| c11, c15, c17, c22 (supervivencia, economía, habilidades) | Igual | Igual | Igual | Genéricos |
| c16 Presión o Barrido | Barrido | Presión | Presión contra la Presa | Sirve a las tres |
| c23 Recarga en Marcha | Por **habilidad principal lanzada** (v1 contaba flechas y regalaba recargas a la Tiradora: §14) | Igual | Igual | Corregido en la ronda 1 |
| Finales: Manto de Niebla, Danza del Arco, Sombra Gemela | Danza del Arco (Abanico), Sombra Gemela (híbrida) | Previsto: Danza del Arco o Sombra Gemela | Previsto: **Manto de Niebla** (control y apoyo) | Ninguna build de la etapa 1 usa Manto de Niebla: la etapa 2 debe usarlo (§16) |

Ningún nodo de clase nombra una habilidad de especialización (G1, lo comprueba el validador).

---

## 7. Especializaciones (29 nodos cada una, misma rejilla)

### 7.0 Tiradora Veloz (daño en área · Impulso)

**Fantasía:** nunca se detiene. Dispara corriendo, salta hacia atrás disparando, vuelve hacia delante y la lluvia la sigue. **Rol:** daño en área (el de hoy; en 2e su objetivo es ÁREA×5 ≥ 1,2 veces la media).

**Pasiva: Tercera Flecha.** Cada 3.er Disparo Rápido lanza **2 flechas más** en abanico de 30° (60 % cada una). Con Disparo Disperso, el tercero son 3 + 2 flechas. Sin la Tiradora, Disparo Rápido vuelve a ser una sola flecha. Es el verbo **secuencia** en la tecla que más se pulsa.

**Verbos de su kit (5):**

| Verbo | Dónde | Nodos que lo **modifican** |
|---|---|---|
| **Moverse disparando** (principal) | Impulso: solo se gana en movimiento y se pierde quieta | v15A Piel de Brisa, v16, v20; clase c8 |
| **Golpe que te desplaza + relanzar** | Andanada: salto atrás disparando; 2.ª pulsación en 2 s, salto adelante | v5 (cuenta para la secuencia), v9A **tiempo justo** (último medio segundo), v9B **un relanzamiento más**, v12, v19, v26 (**sin recarga** en el Vendaval) |
| **Mantener (canal que acelera)** | Carrera del Viento: mientras aprietas, corres un 40 % más rápido y disparas sola | v6 y v14 (**al soltar**), v7 (dura más), v10A (anillos) / v10B (rampa), v17, v21, v24 (deja ciclones), v27 (**sin límite**) |
| **Secuencia** | Pasiva Tercera Flecha; Flecha Múltiple seguida | v5, v8 (A: más flechas · B: crítico seguro), v22 (cada Múltiple a menos de 3 s suma flechas), v25 (la 3.ª sale en círculo) |
| **Zona que te sigue** | Diluvio de Saetas | v21 (descarga el doble de rápido si corres), v17, ápice 4 |

**Kit (libro; forja con Mejora a Nv+3 y variantes a Nv+6):**

| Habilidad | Ranura · Nv | Qué hace | Mejora | Variante I | Variante II |
|---|---|---|---|---|---|
| **Andanada** (`a_t_andanada`) | Insignia `3` · 10 | Saltas 4 m atrás y disparas 10 flechas en 120° (55 % cada una). En 2 s, **pulsa otra vez**: saltas adelante y repites. 25 de Energía, 8 s | **Arco Ancho**: 150° | **Andanada Cerrada** (un objetivo): 30° y +3 m; más flechas sobre el mismo enemigo | **Andanada Repulsora** (control): las flechas empujan 2 m y ralentizan un 30 % 2 s; −15 % |
| **Carrera del Viento** (`a_v_carrera`, NUEVA) | Movilidad `1` · 12 | **Mantén pulsado:** corres un 40 % más rápido hasta 4 s y disparas sola al más cercano cada 0,4 s (45 %). 10 s | **Galope**: un 55 % más rápido | **Carrera Certera** (un objetivo): cada 0,6 s al de más vida, +70 % | **Carrera Esquiva** (supervivencia): el 40 % de los proyectiles enemigos te fallan; −30 % |
| **Flecha Múltiple** (`flecha_multiple`) | Principal `DER/2` · 14 | 5 flechas en 50° (39 % cada una). No te frena: úsala corriendo. 22 de Energía | **Alcance Largo**: 10 → 13 m | **Abanico Abierto** (área): 7 flechas en 90° (33 % cada una) | **Haz Cerrado** (un objetivo): 3 flechas en 10° que atraviesan (55 % cada una) |
| **Diluvio de Saetas** (`a_u_diluvio`) | Definitiva `4` · 15 | Una nube **te sigue** 6 s y cada 0,5 s descarga en 4 m a tu alrededor (170 % por oleada: 2040 % en total; hoy 2184 %). 50 s | **Nube Ancha**: 5 m | **Diluvio Anclado** (área): fijo donde apuntas, 6 m | **Saetas Pesadas** (un objetivo): 4 saetas de 500 % sobre tu objetivo en 2 s |

**Barra de mecánica: Impulso** (ya existe en `spec-mechanics.js`; se ve en el libro con el widget real de la rosa de los vientos):

| Generar | Descargar | Pérdida | La alimentan |
|---|---|---|---|
| +3 por cada acierto **mientras te mueves** (como mucho uno cada 0,15 s). Quieta no ganas | A 100: **Vendaval** 6 s: +25 % de velocidad de ataque y +1 flecha a Flecha Múltiple | **NUEVO:** quieta más de 2 s, −10 por segundo. Al acabar el Vendaval vuelve a 0 | Disparo Rápido en movimiento, Flecha Múltiple, Andanada (los saltos cuentan como movimiento), Carrera del Viento |

**Árbol (generado):**

| Fila | Id | Nodo | Forma · tipo | Etiqueta | Rangos | Requiere | Qué hace (al máximo) | Cuál conviene |
|---|---|---|---|---|---|---|---|---|
| 0 | v0 | Impulso | ○ clave | mecánica | gratis | gratis | Cada acierto en movimiento te da 3 de Impulso. A 100: Vendaval 6 s, +25 % de velocidad de ataque y +1 flecha a Múltiple |  |
| 1 | v1 | Astiles Ligeros | ○ pasiva | número | 3 | v0 | Rango 3: Flecha Múltiple cuesta 16 de Energía (antes 22) |  |
| 1 | v2 | Vendaval Largo | ○ pasiva | número | 3 | v0 | Rango 3: El Vendaval dura 9 s (antes 6 s) |  |
| 1 | v3 | Aire Fresco | ○ pasiva | número | 3 | v0 | Rango 3: Carrera del Viento se recarga en 7 s (antes 10 s) |  |
| 2 | v4 | Puntas Templadas | ○ pasiva | número | 2 | v1 | Rango 2: Flecha Múltiple y tu disparo triple hacen +30 % de daño |  |
| 2 | v5 | Remate Triple | ○ pasiva | mecánica | 1 | v1 o v2 | Tras cada Andanada, tu siguiente Disparo Rápido sale triple, sin esperar al 3.º<br>_híbrido: Abanico + Vaivén_ |  |
| 2 | v6 | Soltar y Disparar | ○ pasiva | mecánica | 1 | v2 o v3 | Al soltar o acabar Carrera del Viento disparas una Andanada gratis al 60 %, sin saltar<br>_híbrido: Vaivén + Galerna_ |  |
| 2 | v7 | Fondo de Corredora | ○ pasiva | mecánica | 2 | v3 | Rango 2: Carrera del Viento dura hasta 6 s (antes 4 s) y te hace inmune a las ralentizaciones |  |
| 3 | v8 | Triple: Abierto o Clavado | ⬡ elección | mecánica | 1 | v4 o v5 | **A · ○ Triple Abierto**: Tu disparo triple lanza 4 flechas extra (antes 2) en un abanico de 60° _(contra grupos)_<br>**B · ○ Triple Clavado**: Tu disparo triple es crítico seguro y hace +30 % de daño _(contra jefes)_ | A, contra grupos: el doble de flechas extra cada 3 disparos. B, contra jefes: un crítico seguro cada 3 disparos. Decide qué Abanico juegas |
| 3 | v9 | Andanada: Último Instante o Ida y Vuelta | ⬡ elección | mecánica | 1 | v5 o v6 | **A · ○ Último Instante**: Si relanzas Andanada en su último medio segundo, la segunda hace +80 % y te da 20 de Impulso _(contra jefes)_<br>**B · ○ Ida y Vuelta**: Puedes relanzar Andanada dos veces (antes una): atrás, adelante y atrás de nuevo; la tercera al 70 % _(contra grupos)_ | A, contra jefes: si aciertas el momento, +40 % de media y el Vendaval antes. B, contra grupos: barres tres sitios por uso. Decide qué Vaivén juegas |
| 3 | v10 | Carrera: Rueda o Blanco Fijo | ⬡ elección | mecánica | 1 | v6 o v7 | **A · ○ Rueda de Flechas**: Mientras corres con Carrera, cada segundo sueltas un anillo de 8 flechas a tu alrededor (40 % cada una) _(contra grupos)_<br>**B · ○ Blanco Fijo**: Si Carrera dispara al mismo enemigo, cada flecha seguida hace +10 % (hasta +60 %) _(contra jefes)_ | A, contra grupos que te persiguen. B, contra jefes: a los 2,4 s de carrera ya pega +60 %. Decide qué Galerna juegas |
| 4 | v11 | Mano Llena | ○ pasiva | número | 2 | v8 | Rango 2: Flecha Múltiple dispara 7 flechas (antes 5) |  |
| 4 | v12 | Salto Impulsivo | ○ pasiva | mecánica | 2 | v8 o v9 | Rango 2: Cada salto de Andanada te da 16 de Impulso |  |
| 4 | v13 | Saetas Afiladas | ○ pasiva | número | 2 | v9 o v10 | Rango 2: Carrera del Viento y Diluvio de Saetas hacen +30 % de daño |  |
| 4 | v14 | Vacío de Aire | ○ pasiva | mecánica | 1 | v10 | Al soltar o acabar Carrera del Viento, atraes 2 m a los enemigos a 5 m; a los jefes les llena 15 de Quebranto |  |
| 5 | v15 | Piel de Brisa o Retirada | ⬡ elección | mecánica | 1 | v11 o v12 | **A · ○ Piel de Brisa**: Durante el Vendaval recibes un 20 % menos de daño _(supervivencia)_<br>**B · ○ Retirada Instintiva**: Si te golpean cuerpo a cuerpo, saltas 4 m atrás y ganas 15 de Impulso. Una vez cada 8 s _(supervivencia)_ | A, contra grupos: el Vendaval está puesto casi la mitad del tiempo. B, contra élites cuerpo a cuerpo que te alcanzan |
| 5 | v16 | Viento en las Plumas | ○ pasiva | mecánica | 2 | v12 o v13 | Rango 2: Con 50 o más de Impulso: Múltiple y Andanada +20 %, y Carrera dispara un 30 % más rápido<br>_híbrido: Los tres estilos (por el Impulso)_ |  |
| 5 | v17 | Nube de Paso | ○ pasiva | mecánica | 2 | v13 o v14 | Rango 2: Cada segundo de Carrera del Viento recarga 2 s del Diluvio de Saetas |  |
| 6 | v18 | Flechas Perdidas | ○ pasiva | mecánica | 2 | v15 | Rango 2: Si Flecha Múltiple mata, suelta 3 flechas hacia enemigos cercanos (50 % cada una) |  |
| 6 | v19 | Vendaval Encadenado | ○ pasiva | mecánica | 2 | v15 o v16 | Rango 2: Cada relanzamiento de Andanada alarga el Vendaval 1 s (hasta +4 s) |  |
| 6 | v20 | Pies Ligeros | ○ pasiva | número | 2 | v16 o v17 | Rango 2: Te mueves un 16 % más rápido |  |
| 6 | v21 | Nube Fiel | ○ pasiva | mecánica | 1 | v17 | Mientras corres con Carrera, el Diluvio de Saetas descarga cada 0,25 s (antes 0,5 s) |  |
| 7 | v22 | Ráfaga Creciente | ○ pasiva | mecánica | 3 | v18 | Rango 3: Cada Flecha Múltiple a menos de 3 s de otra dispara 1 flecha más (hasta +4) |  |
| 7 | v23 | Golpe de Apertura | ○ pasiva | mecánica | 3 | v19 | Rango 3: Al empezar el Vendaval, tus 4 siguientes Andanadas o Flechas Múltiples son críticas seguras |  |
| 7 | v24 | Ciclones | ○ pasiva | mecánica | 3 | v21 | Rango 3: Mientras corres con Carrera, cada 1 s dejas un ciclón 4 s que dispara cada 0,5 s al más cercano (40 %) |  |
| 8 | v25 | Tormenta de Plumas | ○ **FINAL** | mecánica | 3 | v22 | Rango 3: Cada 3.ª Flecha Múltiple sale además en círculo: 12 flechas más al 60 %. Múltiple +30 %<br>_final: Abanico_ |  |
| 8 | v26 | Vaivén Eterno | ○ **FINAL** | mecánica | 3 | v23 | Rango 3: Durante el Vendaval, Andanada no se recarga: al cerrar su ventana puedes lanzarla otra vez. Andanada +30 %<br>_final: Vaivén_ |  |
| 8 | v27 | Galerna Infinita | ○ **FINAL** | mecánica | 3 | v24 | Rango 3: Carrera del Viento dura mientras la mantengas (gasta 10 de Energía por segundo). Carrera +30 %<br>_final: Galerna_ |  |
| 9 | v28 | Ojo del Huracán | ○ **ÁPICE** | mecánica | 4 | v25 o v26 o v27 | 1) El Vendaval también te da +20 % de velocidad de movimiento. 2) Matar a un élite te da 50 de Impulso. 3) El Vendaval salta a 80 de Impulso (antes 100). 4) Cada 3 Vendavales, el Diluvio de Saetas se lanza solo y gratis. |  |

**Los tres arquetipos:**

| Arquetipo | Fantasía | Elección que lo define (fila 3) | Penúltimo → final | Mejor en |
|---|---|---|---|---|
| **Abanico** (A) | Cada vez más flechas: la tercera, la Múltiple seguida, las que sueltan las muertes | v8 **Triple Abierto** (grupos) o Triple Clavado (jefes) | Ráfaga Creciente → **Tormenta de Plumas** | Grupos |
| **Vaivén** (B) | Andanada atrás y adelante sin parar mientras dura el Vendaval | v9 **Último Instante** (jefes: tiempo justo) o Ida y Vuelta (grupos: tres saltos) | Golpe de Apertura → **Vaivén Eterno** | Jefes |
| **Galerna** (C) | Correr en círculo con la Carrera: anillos, ciclones y la nube detrás | v10 **Rueda de Flechas** (grupos) o Blanco Fijo (jefes) | Ciclones → **Galerna Infinita** | Grupos que persiguen, daño sostenido |

Híbridos: **Remate Triple** (Abanico + Vaivén: Andanada carga el disparo triple), **Soltar y Disparar** (Vaivén + Galerna: soltar la Carrera dispara una Andanada), **Viento en las Plumas** (los tres, por el Impulso) y **Pies Ligeros** (común). Ápice: **Ojo del Huracán** (sirve a los tres porque todos viven del Vendaval).

**Implementación (por nodo):** `v0` mecánica impulso · existe (+ pérdida quieta NUEVA) y pasiva Tercera Flecha: power t_tercera · NUEVO (`seq` del básico); `v1` mod flecha_multiple cost · existe; `v2` tv.galeT · NUEVO (clave); `v3` mod a_v_carrera cdr · claves; `v4` mod flecha_multiple dmg + rango de t_tercera · claves; `v5` power t_remate_triple · NUEVO (afterCast deja el contador de la secuencia en 2); `v6` power t_soltar · NUEVO (onRelease del canal + eco de Andanada ×0,6 sin salto); `v7` mod a_v_carrera channelT + slowImmune · claves; `v8` A: opción de t_tercera (4 flechas extra) · B: power t_triple_clavado · NUEVO; `v9` A: power t_ultimo_instante · NUEVO (lee la ventana de `recast`) · B: mod a_t_andanada recast.max +1 · clave NUEVA; `v10` A: power t_rueda · NUEVO (tic del canal) · B: power t_blanco_fijo · NUEVO (condAdd por objetivo); `v11` mod flecha_multiple proj · existe; `v12` power t_salto_impulsivo · NUEVO (sustituye a t_andanada_impulsiva); `v13` mod dmg · claves; `v14` power t_vacio_aire · NUEVO (onRelease: atraer + Quebranto); `v15` A: power t_piel_brisa · NUEVO (condDr con el Vendaval) · B: power t_retirada · NUEVO (④ onDamaged; lógica de a_t_salto); `v16` power t_viento_plumas · NUEVO (condAdd con gaugeValue); `v17` power t_nube_paso · NUEVO; `v18` power t_flechas_perdidas · NUEVO (onKill + fireProjectile); `v19` power t_vendaval_encadenado · NUEVO (sustituye a t_galechain); `v20` stats.spdPct · existe; `v21` power t_nube_fiel · NUEVO; `v22` power t_rafaga_creciente · NUEVO (modifyResolve proj con contador); `v23` power t_apertura · NUEVO (⑩ onGauge full + forceCrit); `v24` power t_ciclones · NUEVO (campo `t_ciclon` que dispara); `v25` power t_tormenta_plumas · NUEVO; `v26` power t_vaiven · NUEVO; `v27` power t_galerna · NUEVO (canal sin fin con coste por tic); `v28` power t_ojo_huracan (rangos) · NUEVO (sustituye a t_eyestorm).

### 7.1 Francotiradora (un objetivo · Concentración) — pendiente (etapa 2)

En el mockup: esqueleto (rejilla en gris, «En diseño»; tarjeta con ESBOZO; barra con el kit base). Dirección recomendada (no vinculante) en §16.

### 7.2 Montaraz (control · Coto de Caza) — pendiente (etapa 2)

Ídem. Su pasiva actual (+25 % de Quebranto) repite la del Crionte: hay que cambiarla (§16).

### 7.3 Las tres especializaciones, juntas (se completa en la etapa 2)

| | Tiradora Veloz | Francotiradora | Montaraz |
|---|---|---|---|
| Rol | Daño en área | Un objetivo (pendiente) | Control (pendiente) |
| Mecánica | Impulso (0–100) | Concentración (0–100) | Coto de Caza (0–3 trampas + Presa) |
| Verbo principal | **Moverse disparando** | Cargar y soltar, plantada (propuesta) | Colocar y detonar (propuesta) |
| Arquetipos (A · B · C) | Abanico · Vaivén · Galerna | pendiente | pendiente |
| Finales | Tormenta de Plumas · Vaivén Eterno · Galerna Infinita | pendiente | pendiente |
| Ápice | Ojo del Huracán | pendiente | pendiente |
| Árboles héroe | h1 · h2 (provisional) | h1 · h3 | h2 · h3 |
| Híbrida | Viento Cruzado | pendiente | pendiente |

---

## 8. Builds de la Tiradora a Nv100

Validadas **comprando punto a punto en el orden de la build** (cada punto al primer nodo comprable de la lista), con el mismo algoritmo del validador. Están en el mockup (**Configuración** y **Recomendado**). Los puntos de cada build van solo a habilidades de **su barra** (comprobado a mano; §14, ronda 2). El Paragon (`heroNodes`) es de la etapa 2. Las cifras de «mejor en» son **estimaciones de diseño**; se calibran en E3.

### 8.1 «Tormenta de Plumas» (Abanico) · Paragon pendiente (h2)

- **Clase (34/34):** Carcaj Profundo 2 · Pulso Firme 2 · Flecha Saqueadora (B) 1 · A Bocajarro (A) 1 · Flecha Roma (A) 1 · Ojo de Halcón 2 · Difícil de Alcanzar 2 · Respiración Pausada 2 · Instinto de Supervivencia (B) 1 · Barrido de Caza (B) 1 · Tiro desde la Niebla 1 · Recarga en Marcha 2 · Huida Desesperada (B) 1 · Piernas de Corredora 1 · Bomba Rápida 3 · Calma Letal (B) 1 · Humo Denso 2 · Compás 3 · Danza del Arco 3 · Cadencia 2
- **Tiradora Veloz (31/31):** Impulso (gratis) · Astiles Ligeros 3 · Puntas Templadas 2 · Remate Triple 1 · Triple Abierto (A) 1 · Mano Llena 2 · Piel de Brisa (A) 1 · Flechas Perdidas 2 · Ráfaga Creciente 3 · Tormenta de Plumas 3 · Ojo del Huracán 4 · Vendaval Largo 3 · Ida y Vuelta (B) 1 · Salto Impulsivo 2 · Viento en las Plumas 2 · Aire Fresco 1
- **Paragon:** pendiente (etapa 2) · árbol h2 (provisional)

**Barra:** `IZQ` Disparo Rápido (Disparo Disperso) · `DER` Flecha Múltiple (Abanico Abierto) · `1` Carrera del Viento · `2` Bomba de Humo · `3` Andanada (Repulsora) · `4` Diluvio de Saetas.

**Rotación.** Kitea en círculo alrededor de la manada: Disparo Rápido con Disparo Disperso y, cada 3.º, el disparo triple con 7 flechas (3 + 4 de Triple Abierto). Flecha Múltiple en cuanto haya Energía: cada una a menos de 3 s de otra suma flechas (**Ráfaga Creciente**, hasta +4) y la 3.ª sale además en círculo (**Tormenta de Plumas**). Las muertes sueltan flechas (Flechas Perdidas). Al alternar básica y principal juntas Compases: con 5, Múltiple gratis, crítica y +60 % (**Danza del Arco**). Andanada (Ida y Vuelta) cuando te alcanzan; el Diluvio al empezar; la Carrera para recolocarte, que además llena el Impulso. Con Vendaval, +1 flecha a la Múltiple y Piel de Brisa.
**Hitos:** Tormenta de Plumas al Nv60, ápice completo al Nv68, final de clase **Danza del Arco al Nv69**.

### 8.2 «Viento Cruzado» (híbrida Abanico + Vaivén, sin final) · Paragon pendiente (h1)

- **Clase (34/34):** Pulso Firme 2 · Paso de Gacela 2 · A Bocajarro (A) 1 · Paso Limpio 1 · Flecha Silbante (B) 1 · Paso de Abrojos (A) 1 · Agilidad (A) 1 · Lluvia en Retirada 1 · Cadencia 2 · Puntería Fija (A) 1 · Difícil de Alcanzar 2 · Respiración Pausada 2 · Ojo de Halcón 2 · Presión Constante (A) 1 · Piernas de Corredora 1 · Recarga en Marcha 2 · Carcaj Profundo 2 · Tras la Rodada 3 · Sombra Gemela 3 · Instinto de Supervivencia (B) 1 · Calma Letal (B) 1 · Compás 1
- **Tiradora Veloz (31/31):** Impulso (gratis) · Astiles Ligeros 3 · Vendaval Largo 3 · Puntas Templadas 2 · Remate Triple 1 · Triple Abierto (A) 1 · Último Instante (A) 1 · Mano Llena 2 · Salto Impulsivo 2 · Retirada Instintiva (B) 1 · Viento en las Plumas 2 · Flechas Perdidas 2 · Vendaval Encadenado 2 · Ráfaga Creciente 3 · Golpe de Apertura 3 · Saetas Afiladas 1 · Pies Ligeros 2
- **Paragon:** pendiente (etapa 2) · árbol h1 (provisional)

**Barra:** `IZQ` Disparo Rápido (Disperso) · `DER` Flecha Múltiple · `1` **Paso Veloz** (Rodar y Disparar) · `2` **Agilidad** (c17A) · `3` Andanada (Cerrada) · `4` Diluvio de Saetas.

**Rotación.** Contra el élite: Andanada y relanzar en su **último medio segundo** (Último Instante: +80 % y 20 de Impulso). Al llenar el Impulso, **Golpe de Apertura**: 4 críticos seguros en Andanadas o Múltiples; cada relanzamiento alarga el Vendaval (Vendaval Encadenado). Contra la manada: Múltiple encadenada (Ráfaga Creciente). Paso Veloz deja la **Sombra Gemela**, que repite tus principales, y la siguiente principal sale gratis (Tras la Rodada). Agilidad en la `2` para perseguir o escapar.
**Dónde brilla:** contenido mixto (élites con manada, recompensas, Pesadillas). **Hitos:** Golpe de Apertura al Nv64; final de clase **Sombra Gemela al Nv69**.

### 8.3 Comparación (estimación de diseño; el dueño acepta la híbrida a ~8–10 %)

| Build | Contra jefes | Contra 5 | Peor de los dos | Control | Supervivencia |
|---|---|---|---|---|---|
| Tormenta de Plumas (Abanico) | 0,84 | **1,00** | 0,84 | medio (Flecha Roma, Bocajarro empuja) | media (Piel de Brisa, Instinto, Huida, humo) |
| **Viento Cruzado (híbrida)** | 0,92 | 0,91 | **0,91** | bajo-medio (Paso de Abrojos) | media (Retirada Instintiva, Agilidad) |
| Vaivén Eterno (etapa 2, objetivo) | **1,00** | 0,80 | 0,80 | bajo | media-baja |
| Galerna Infinita (etapa 2, objetivo) | 0,88 | 0,95 | 0,88 | medio (Vacío de Aire) | alta (Carrera Esquiva, siempre en movimiento) |

La híbrida queda a **8 %** de la mejor contra jefes y a **9 %** contra grupos. Ninguna build es la mejor en todo.

### 8.4 Builds pendientes (etapa 2)

- **«Vaivén Eterno»** (Vaivén): v2, v5, v9A, v12, v15, v19, v23, **v26** y ápice; final de clase sugerido: **Manto de Niebla** (para que lo use alguna build) o Sombra Gemela.
- **«Galerna Infinita»** (Galerna): v3, v7, v10A, v13, v14, v17, v21, v24, **v27** y ápice; Carrera en la `1`.
- El Paragon de las cuatro (`heroNodes`, `heroCh`), con los árboles héroe de §9.

---

## 9. Paragon: árboles héroe de la Arquera — pendiente (etapa 2)

Reglas iguales a la Maga (§7.1 de su documento): se abre con la especialización 31/31, clave gratis + 10 puntos (Nv71–80), queda en pausa si bajas de 31, temáticos de la **clase**, 13 nodos (clave, 3 elecciones, capstone), máximo 1 habilidad de talento por árbol. En los datos hay tres esqueletos vacíos: **h1** Tiradora + Francotiradora, **h2** Tiradora + Montaraz y **h3** Francotiradora + Montaraz (reparto provisional; la etapa 2 puede cambiarlo).

**Ideas (no vinculantes) para la etapa 2.** Que su mecánica funcione con cualquier especialización y que ninguna copie un verbo principal:

| Idea | Mecánica clave (una frase) | Por qué es de la clase |
|---|---|---|
| **Halconera** | Un halcón marca al enemigo que golpeas y cae en picado cada 6 s (150 %); los marcados reciben +8 % | Compañero de caza, como la Invocadora de la Maga |
| **Carcaj Encantado** | Cada 10 s tu siguiente disparo lleva una punta especial que rota: fuego (quema), hielo (frena), veneno (se suma) | El carcaj es de toda arquera; da variedad sin tocar la forja |
| **Errante del Viento** | Cada 15 m recorridos guardas una ráfaga (máx. 3): tu siguiente principal suelta 1 flecha extra por ráfaga | Movimiento de clase; cuidado: no debe premiar solo a la Tiradora (que cuente también la Carrera, los saltos y las trampas) |
| ~~Sombras~~ | — | Evitar: choca con **Sombra Gemela** (c30) |

---

## 10. Forja y talentos: sin repetición

**Regla (Maga, Anexo A.4):** la forja **transforma** (forma, geometría, elemento, ritmo, cargas); el talento **añade, multiplica o repite**.

| Habilidad | Variantes | Talentos que la tocan | Cómo conviven |
|---|---|---|---|
| Disparo Rápido | Disparo Disperso · Flecha de Cicuta | Pasiva Tercera Flecha, v4, v5, v8; c5, c19 | La variante da la forma (3 flechas o veneno); la pasiva **añade** 2 flechas al 3.º (con Disperso, 3 + 2) |
| Flecha Perforante | Flecha Explosiva · Tiro de Precisión | c9 | Lastrada añade ralentización; Diamante suma al primero |
| Paso Veloz | Rodar y Disparar · Doble Rodada | c3, c7, c14, c20, c27, c30 | Con Doble Rodada, cada carga dispara Tras la Rodada y deja Sombra (la sombra no se apila: 1 a la vez) |
| Bomba de Humo | Humo Venenoso · Estallido de Humo | c4, c18, c19, c25, c28 | Manto de Niebla mueve el humo; la variante cambia lo que hace dentro |
| Lluvia de Flechas | Aguacero · Cortina | c20 | Lluvia en Retirada repite la Lluvia al 50 % con su variante |
| Andanada | Andanada Cerrada · Andanada Repulsora | v5, v6, v9, v12, v16, v19, v23, v26 | La variante da el ángulo o el empuje; los talentos tocan la **ventana** (tiempo justo, relanzamientos, sin recarga) |
| Carrera del Viento | Carrera Certera · Carrera Esquiva | v3, v6, v7, v10, v13, v14, v16, v17, v21, v24, v27 | La variante cambia blanco y cadencia (o esquiva); los talentos **añaden** anillos, ciclones, rampa, duración y lo que pasa al soltar |
| Flecha Múltiple | Abanico Abierto · Haz Cerrado | v1, v4, v11, v16, v18, v22, v23, v25 | Mano Llena y Ráfaga Creciente suman flechas al abanico de la variante; Tormenta de Plumas **añade** un círculo |
| Diluvio de Saetas | Diluvio Anclado · Saetas Pesadas | v13, v17, v21, v28 | Con Diluvio Anclado, Nube Fiel acelera las descargas aunque la nube no te siga |

**Nombres:** ningún nodo comparte nombre con una variante o una habilidad de la clase, ni con la Maga o el Guerrero (comprobado con un script; §14). Prohibido para la etapa 2: los de §16.3.

---

## 11. Implementación

### 11.1 Archivos

| Archivo | Qué cambia |
|---|---|
| `js/skills-arquera.js` | **Kit base:** `a_disparo`, `flecha_perforante`, `a_paso`, `a_humo` (req 12 → 6), `lluvia_flechas` (req 14 → 8). **Forja** (`variants`): `a_disparo` I = Disparo Disperso (absorbe `a_disperso`), II = Flecha de Cicuta (absorbe `a_cicuta`). **Tiradora** (`spec:'tiradora'`): `a_t_andanada` (pasa de talento a kit, con `recast`), `a_v_carrera` (NUEVA: `type:'channel'`, `hold`, `moveMul:1.4`, `autoShot`), `flecha_multiple` (req 8 → 14), `a_u_diluvio` (`follow:true`, 12 oleadas de 1,7). **Salen del libro:** `a_disperso`, `a_cicuta`, `agilidad` (pasa a talento). **Etapa 2:** `a_red`, `a_u_celeste`, `a_u_zarzas` |
| `js/talents-arquera.js` | `ARQUERA_TALENTS.cls` = c1–c30 nuevos; `tiradora` = v0–v28 (ids nuevos `v*`); Francotiradora y Montaraz en la etapa 2. `ARQUERA_TALENT_SKILLS` = `a_t_camuflaje`, `agilidad` (`cat:'utility'`), `a_t_bengala` (+ 1 por árbol héroe). **Salen:** `a_t_voltereta`, `a_t_conmocion`, `a_t_silencio`, `a_t_danza`, `a_t_salto` |
| `js/powers-arquera.js` | Los poderes NUEVOS de §6 y §7.0 (`impl`). **Se retiran:** `a_tailwind`, `t_viento_cola`, `t_corona`, `t_rebote`, `t_slipstream`, `t_infinite`; **se sustituyen:** `t_andanada_impulsiva` → `t_salto_impulsivo`, `t_galechain` → `t_vendaval_encadenado`, `t_eyestorm` → `t_ojo_huracan`. Se conserva `a_camuflaje` |
| `js/spec-mechanics.js` | Impulso: **pérdida quieta** (`idleAfter: 2`, `idleRate: 10`) y `tv.galeT` (Vendaval Largo). Texto de `impulsoExplain` y de los nodos en `js/ui-gauges-arquera.js` |
| `js/game-skills.js` | Tres tipos o claves genéricos nuevos (§11.2) |
| `js/hud-model.js` · `js/ui.js` | Feedback de verbos en la ranura (§11.2) |
| `js/save-schema.js` | Migración (§11.3) |

### 11.2 Tipos genéricos nuevos (motor) y su feedback de interfaz

| Tipo o clave | Claves | Comportamiento | Feedback (ranura · cursor · sonido) | Lo usa |
|---|---|---|---|---|
| **`recast`** (relanzar) | `recast:{ window:2, max:1, perfectLast:0.5 }` | Tras lanzar, la misma tecla abre una ventana de `window` s para `max` relanzamientos; el enfriamiento cuenta desde el primero (como `a_celeste` hoy, pero genérico). `perfectLast`: los últimos 0,5 s son «tiempo justo» | Anillo que se vacía alrededor de la ranura; número de relanzamientos; en los últimos 0,5 s el anillo se vuelve **dorado** y suena un «tic» | Andanada (v9, v19, v26); Tiro Celestial (etapa 2) |
| **`channel` + `moveMul`, `autoShot`, `drainPerSec`, `onRelease`** | `moveMul:1.4` (velocidad mientras canalizas; < 1 = lenta), `autoShot:{ every:0.4, coef:0.45, target:'nearest'\|'maxHp' }`, `drainPerSec` (Energía por segundo, para la canalización sin fin), `onRelease` (gancho al soltar o al acabar) | La canalización con `hold` ya existe; esto le añade velocidad y disparos automáticos | Barra de canal en la ranura `1` que se vacía; estela de viento detrás de la heroína; al soltar, destello breve («soltar» es un verbo: v6, v14) | Carrera del Viento |
| **`seq`** (secuencia del básico) | `seq:{ every:3, extra:{ count:2, spread:30, coef:0.6 } }` | Contador de básicos; en el N-ésimo añade proyectiles | 3 pips bajo la ranura `IZQ`; el 3.º brilla cuando el siguiente disparo es el triple; sonido de cuerda más grave en ese disparo | Pasiva Tercera Flecha (v5, v8) |
| **`follow`** en las lluvias | `follow:true` | La zona de `rain()` se recentra en la heroína en cada oleada | Círculo que se desliza con ella | Diluvio de Saetas |
| **`charge`** (cargar y soltar; **propuesta para la etapa 2**) | `charge:{ min:0.3, max:1.5, perfect:[1.1, 1.3], perfectMul:1.5, stages:[…], moveMul:0.3 }` | Mantener carga; soltar dispara con el multiplicador de la etapa; dentro de `perfect`, el soltado perfecto | Barra de carga **junto al cursor** con la ventana perfecta marcada; destello blanco y sonido de cuerda tensa al entrar en la ventana; «¡Perfecto!» al acertar | Francotiradora (verbo principal propuesto); Cruzado del Guerrero (martillo cargado) |
| `castMoveMul` (opcional) | Velocidad al preparar o canalizar | Hoy nadie frena al preparar; si se quiere el eje «plantada», preparar podría frenar al 50 % | Icono de pies en la ranura | Francotiradora (decide la etapa 2) |

### 11.3 Migración de guardados (con la de la Maga: v5 → v6, o v6 → v7 si la Maga ya ocupó la v6)

1. Todos los árboles de la Arquera son nuevos → se **liberan** todos los puntos y se recalculan con el ritmo común; se aplica el **Recomendado** de su especialización (Tiradora: «Tormenta de Plumas»; las otras dos, el suyo de la etapa 2) con el aviso «Migrado: revisa tus talentos».
2. Barra: `a_disperso` → `a_disparo` con la variante I; `a_cicuta` → `a_disparo` con la variante II; `a_t_voltereta`, `a_t_salto` → `a_paso`; `a_t_danza` → `a_v_carrera` (Tiradora) o `a_paso`; `agilidad` en la `1` → `a_paso` (Agilidad solo vuelve si se elige c17A); `a_t_conmocion`, `a_t_silencio` → `a_humo`; `flecha_multiple`, `a_t_andanada` y `a_u_diluvio` sin Tiradora → la ranura cae al kit base (o se vacía la `3`/`4`).
3. Forja: las variantes 2f que cambian de concepto (Ojo Fijo, Flecha Partida, Lluvia Arqueada, Puntas de Espino, Diluvio Itinerante, Andanada Final…) vuelven a «sin elegir»; la Mejora se conserva si existe.
4. Soportes engarzados en habilidades que salen vuelven a `knownSupports`.
5. Aviso único: «Los talentos de la Arquera se rehicieron hasta el nivel 100. Te aplicamos el Recomendado; revísalo con N».
6. Test `tests/test-save-arquera2g.mjs`: Nv5, 10, 18, 40, 69, 70, 80 y 100 de cada especialización; idempotente; Maga y Guerrero intactos.

---

## 12. Banco de balance: impacto y riesgos

| Cambio | Efecto esperado | Calibración |
|---|---|---|
| Flecha Múltiple solo de la Tiradora; Lluvia al Nv8 | Francotiradora y Montaraz pierden su segunda principal de área | La etapa 2 les da su principal de Nv14 |
| Pasiva Tercera Flecha | +40 % de daño del básico (2 × 60 % cada 3 disparos) | Que el básico no supere el 35 % del daño total de la Tiradora |
| Pérdida del Impulso quieta | Castiga quedarse quieta (es el objetivo) | Que el Vendaval siga cerca del 40–50 % del tiempo kiteando |
| Galerna Infinita + Nube de Paso + Ojo del Huracán 4 | El Diluvio puede bajar a ~17 s de recarga | La definitiva no debe pasar del 20 % del daño (regla de 2e) |
| Vaivén Eterno | Andanada sin recarga durante el Vendaval (6–13 s) | Una Andanada relanzada no genera otra fuera de su ventana; tope de 3 impactos por objetivo y lanzamiento |
| Manto de Niebla con Bomba Rápida y Humo Denso | El humo puede estar siempre puesto (−50 % recibido, −30 % de los enemigos, cura) | Pasa por los topes de defensa (CAPS); si el TTD+ pasa de 2,5 veces la media, el humo que te sigue reduce un 30 % (no 50 %) |
| Sombra Gemela | +15–20 % con Paso Veloz cada 6 s | La sombra no repite ecos ni a sí misma; 1 a la vez |
| Ecos (Lluvia en Retirada, Soltar y Disparar, Sombra Gemela) | Riesgo de que se multipliquen | Un eco no genera otro (regla de la Maga) |

**Riesgos.** (1) La Tiradora puede depender demasiado de moverse en salas pequeñas: la Carrera y los saltos la sacan de ahí. (2) El relanzamiento con tiempo justo exige destreza: Ida y Vuelta es la opción sin precisión. (3) Mantener la tecla `1` mientras mueves con WASD: probar la ergonomía en E4 (alternativa: pulsar una vez para empezar y otra para soltar).

---

## 13. Criterios de aceptación (comprobables), adaptados

| # | Criterio | Cómo se comprueba |
|---|---|---|
| G1 | Ningún nodo de clase toca o nombra una habilidad de especialización (Andanada, Carrera del Viento, Flecha Múltiple, Diluvio de Saetas y las de la etapa 2) | Validador + `test-arquera-coherencia` |
| G2 | Solo c11A, c17A, c22A y 1 opción A por árbol héroe conceden habilidades; todas caben solo en la `2` | Test con `fitsSlot` |
| G3 | Ritmo: ningún árbol se completa (clase < 53, especialización < 59, Paragon < 13, tablero < 81) | Test |
| G4 | Presupuesto: un final al máximo cabe (clase Nv69, especialización Nv60, con ápice Nv68); dos no | Validador (§4.4) |
| G5 | Paragon sin efecto mientras la especialización no esté 31/31; clave gratis al abrirse | Test |
| G6 | Formas: círculo, hexágono y cuadrado según el tipo | `?talentscheck=1` + capturas |
| G7 | Textos ≤ 120 caracteres, sin siglas, sin *stagger*, *proc* ni «c/u»; cada elección con «cuál conviene» | Validador + `validar-etapa1.mjs` |
| G8 | Las builds son legales comprando punto a punto (34/31/1+10) | Validador |
| G8b | **Nuevo:** los puntos de una build van a habilidades de su barra | Test con la barra de cada build |
| G9 | Banco: Abanico gana contra grupos, Vaivén contra jefes; la híbrida ≥ 0,90 de la mejor en los dos; la Tiradora mantiene ÁREA×5 ≥ 1,2·M | `balance-bench --seeds 5` |
| G10 | Motion con solo `transform`, `opacity`, `clip-path` y `stroke-dashoffset`; respeta «reducir movimiento» | Revisión de CSS |
| G11 | Migración correcta e idempotente | `test-save-arquera2g` |
| G12 | `npm test` en verde | `npm test` |
| G13 | Paragon en pausa con la especialización por debajo de 31/31 | Test |
| G14 | Hexágono: el clic derecho en el icono quita el punto con el flotante abierto | Demos `rclick` y `pick` (§14) |
| G15 | Categorías visibles: Básica · Principal · Movilidad · Defensa · Utilidad · Insignia · Definitiva | `grep -ri astadora js/` vacío |
| G16 | Rejilla común: las tres especializaciones tienen la misma forma | Validador |
| G17 | **Nuevo, verbos:** cada especialización usa ≥ 3 verbos en su kit, no comparten el principal y cada verbo tiene su feedback (anillo de `recast`, barra de canal, pips de `seq`, barra de `charge`) | Test de `hud-model` (`slotView`) + capturas |

---

## 14. Mockup, validación, capturas y refutaciones

### 14.1 Uso

`docs/mockups/skills-ux.html?cls=arquera&view=talents` (como `file:///`). Parámetros: `&spec=tiradora|francotiradora|montaraz`, `&lvl=5|10|40|69|100`, `&loadout=plumas|cruzado`, `&tipnode=cls:c6|spec:v9`, `&tipskill=a_v_carrera`, `&alt=1`, `&demo=spec|rclick|pick|…` y `&res=1366|1920`.

### 14.2 Validación

- `node docs/mockups/data/validar-talentos.mjs arquera`: **20 errores, todos de la etapa 2** (árboles vacíos de Francotiradora, Montaraz y los 3 héroe; sus kits; 2 de 4 builds de la Tiradora; `heroNodes` de las 2; builds y `defaultBuild` de las otras dos) y 3 avisos de finales sin build (Vaivén Eterno, Galerna Infinita y Manto de Niebla). Clase y Tiradora: rejillas, presupuesto, puertas, etiquetas (clase 75 % de mecánica en filas 3–9; Tiradora 86 %), textos, G1, kit y builds, **sin errores**.
- `validar-etapa1.mjs` (scratchpad): corre el validador oficial sin tocarlo, separa los errores por etapa y añade nombres repetidos con la Maga y el Guerrero, siglas y largo de las líneas del libro → **ETAPA 1 EN VERDE**. Texto más largo: v0 con 119 caracteres.
- `--estructura`: OK. La Maga sigue en regla.

### 14.3 Capturas

En `C:\Users\juanm\AppData\Local\Temp\claude\D--Proyectos-IntentoRPG\6ead5cf3-f7a8-4c53-8c4f-4d18d352840c\scratchpad\talentos-arquera\`, cada una a 1366 y 1920 (`final_<vista>_<ancho>.png`):

| Vista | Muestra |
|---|---|
| `final_tal_tiradora_100` | Tiradora Nv100 con «Tormenta de Plumas»: clase · Paragon «En diseño» · Tiradora con su arte |
| `final_tal_hibrida_alt` | «Viento Cruzado» con `Alt` y el tooltip de Viento en las Plumas (híbrido de los tres) |
| `final_tal_eleccion_v9` · `final_tal_eleccion_c6` · `final_tal_activa_c11` | Hexágonos abiertos **encima** del icono: Andanada (Último Instante o Ida y Vuelta), Distancia y Camuflaje (cuadrado, HABILIDAD) |
| `final_demo_rclick` · `final_demo_pick` | Clic derecho en v9 con el flotante abierto: quita el punto y deja el Paragon **en pausa**; clic en la otra mitad de v8 |
| `final_tal_paragon_gris_69` · `final_tal_nv40` · `final_tal_nv10` | Paragon en gris (30/31), progreso a Nv40 y Nv10 (clave gratis + 1.er punto) |
| `final_tal_francotiradora_100` · `final_tal_montaraz_100` | Esqueletos: rejilla obligatoria en gris, «En diseño» |
| `final_selector` | Selector con la fila «Clase» y las tres tarjetas (Francotiradora y Montaraz con ESBOZO) |
| `final_libro_tiradora` · `final_libro_tip_andanada` · `final_libro_tip_carrera` · `final_libro_nv5` | Libro: kit base, kit de la Tiradora, pasiva, barra de Impulso real, forja de Flecha Múltiple y tooltips |

### 14.4 Refutaciones (tres rondas)

**Ronda 1** (diseño y capturas `r1_*`).

| Crítica | Cambio |
|---|---|
| Nombres repetidos dentro de la clase: nueve con «Viento», tres «Ritmo», tres «Carcaj», dos «Instinto», cinco «Rod…» | Renombrados (Vendaval Largo, Fondo de Corredora, Saetas Afiladas, Vacío de Aire, Piel de Brisa, Pies Ligeros, Blanco Fijo, Mano Llena, Remate Triple, Recarga en Marcha…) |
| c23 contaba **flechas**: la Tiradora (muchas flechas) recargaba Paso Veloz y humo sin parar; la clase no servía igual a las tres | Cuenta **habilidades principales lanzadas** y recarga 0,3/0,6 s |
| Las builds compraban nodos de habilidades que no llevan en la barra (Paso Veloz con la Carrera en la `1`, Bomba de Humo sin humo, Aire Fresco sin Carrera) | Órdenes rehechos; nuevo criterio G8b |
| La pasiva «sale triple» era ambigua con Disparo Disperso | «2 flechas más» (con Disperso, 3 + 2) |
| «Al soltar la Carrera» no cubría que se acabe sola; Tiro desde la Niebla alargaba el humo sin tope | «Al soltar o acabar»; tope de +4 s |

**Ronda 2.**

| Crítica | Cambio |
|---|---|
| v9: **Ida y Vuelta dominaba** a Último Instante también contra jefes (3 Andanadas frente a 2 con +60 % en la segunda) | Último Instante +80 % y 20 de Impulso; la 3.ª de Ida y Vuelta al 70 %. Contra jefes, A da 2,8 y el Vendaval antes; B da 2,7 pero barre tres sitios |
| **Sombra Gemela** repetía todos los disparos 4 s con Paso cada 6 s (≈ +43 %): muy por encima de los otros finales | 3 s y solo las principales al 30/45/60 % (≈ +15–20 %) |
| Ciclones no decía cada cuánto disparan; el Diluvio «a 4 m de ti» era ambiguo | «Dispara cada 0,5 s»; «descarga en 4 m a tu alrededor» |
| Las dos builds compraban c9 (Flecha Perforante) sin llevarla | Reordenadas; la híbrida volvió a cerrar Sombra Gemela al Nv69 |
| Textos de la Bengala («el enemigo recibe +10 % del grupo») y de Agilidad («inmune a ralentizar») | Reescritos |

**Ronda 3** (choques con las otras clases y capturas `r2_*`).

| Crítica | Cambio |
|---|---|
| Casi repetidos con el Guerrero: Segundo Aire / **Segundo Aliento**, Zancada Larga / **Zancada**, Cuero Curtido / **Curtido**, Ritmo de Caza / **Ritmo de Combate** | Huida Desesperada, Galope, Difícil de Alcanzar, **Danza del Arco** |
| Calcos de la Maga en nodos del mismo papel: «Reflejos…» (c3), «…Reparador» (c14B) | Paso de Gacela, Paso Sanador |
| «Esquiva en Carrera» (c8) chocaba con la variante «Carrera Esquiva» | Difícil de Alcanzar |
| Interfaz | Sin desbordes a 1366 ni a 1920; el flotante del hexágono aparece encima del icono; el clic derecho y la elección funcionan con v8/v9; el Paragon en gris y en pausa se ve bien con los árboles héroe vacíos |

**Preguntas de la plantilla:**
- ¿Alguna elección es claramente superior? Corregida v9; las demás llevan su «cuál conviene» con contenido distinto.
- ¿Hay relleno? Los nodos de número son ≥ +10 % en su eje (clase 5 de 20 en filas 3–8; Tiradora 3 de 21).
- ¿Nombres repetidos? Ninguno exacto con la forja, la Maga o el Guerrero.
- ¿Textos > 120 o siglas? No (máximo 119).
- ¿Las 3 especializaciones se juegan distinto? La Tiradora tiene su verbo principal; §16 reserva los otros dos.
- ¿El Guardián funciona como tanque? No aplica a la Arquera, que no tiene tanque. Manto de Niebla es apoyo (cura en zona), no provocación.
- ¿La interfaz se desborda? No.

---

## 15. Iconos y arte para Codex

Hoy el mockup reutiliza iconos viejos (el validador no avisa de ninguno porque todos existen). Arte crudo en `D:\Proyectos\IntentoRPG-assets` según el pipeline de Codex. Estilo de `assets/talents` (128 y 256 px, fondo oscuro). Paleta: clase en ámbar y verde bosque; Tiradora en turquesa y oro.

**Ojo con los nombres:** `talents/arquera-clase-c1…c15.webp` ya existen con el significado **viejo** (los usa el juego de hoy). Los nuevos van con prefijo propio para no pisarlos; al integrar, el `icon` de cada nodo apunta a ellos.

| Archivo | Qué dibujar |
|---|---|
| `talents/arquera-v2-clase-c1…c30.webp` (30) | Carcaj Profundo, Pulso Firme, Paso de Gacela, Bomba Rápida, Puntería Fija / Flecha Saqueadora, A Bocajarro / Tiro Lejano (dos distancias: flecha corta y flecha larga), Paso Limpio, Difícil de Alcanzar, Flecha Lastrada / Punta de Diamante, Flecha Roma / Flecha Silbante, Camuflaje / Instinto de Supervivencia, Respiración Pausada, Ojo de Halcón, Paso de Abrojos / Paso Sanador, Adrenalina / Calma Letal, Presión Constante / Barrido de Caza, Agilidad / Huida Desesperada, Humo Denso, Tiro desde la Niebla, Lluvia en Retirada, Piernas de Corredora, Flecha Bengala / Economía Letal, Recarga en Marcha, Cadencia, Emboscada (silueta saliendo del humo), Compás (metrónomo con flechas), Tras la Rodada, **Manto de Niebla** (arquera dentro de una nube que la sigue), **Danza del Arco** (arco girando con cinco marcas), **Sombra Gemela** (arquera y su sombra disparando juntas) |
| `talents/arquera-tiradora-v0…v28.webp` (29; los ids `v*` no pisan nada) | Impulso (rosa de los vientos), Astiles Ligeros, Vendaval Largo, Aire Fresco, Puntas Templadas, Remate Triple, Soltar y Disparar, Fondo de Corredora, Triple Abierto / Triple Clavado, Último Instante / Ida y Vuelta (reloj de arena con una flecha), Rueda de Flechas / Blanco Fijo, Mano Llena, Salto Impulsivo, Saetas Afiladas, Vacío de Aire, Piel de Brisa / Retirada Instintiva, Viento en las Plumas, Nube de Paso, Flechas Perdidas, Vendaval Encadenado, Pies Ligeros, Nube Fiel, Ráfaga Creciente, Golpe de Apertura, Ciclones, **Tormenta de Plumas** (círculo de flechas), **Vaivén Eterno** (dos arcos de salto que se cruzan), **Galerna Infinita** (estela de viento sin fin), **Ojo del Huracán** (ápice) |
| `icons256/a_t_andanada.webp` · `icons256/a_v_carrera.webp` | Habilidades: Andanada (arquera saltando hacia atrás con un abanico de flechas) y Carrera del Viento (arquera corriendo; las flechas salen solas del carcaj). Hoy usan `tiradora-s4` y `tiradora-s9`, que se parecen demasiado |
| `icons256/a_t_camuflaje.webp` · `icons256/a_t_bengala.webp` | Camuflaje (silueta que se funde con hojas) y Flecha Bengala (flecha con llama dorada sobre un círculo de luz); hoy comparten el icono de c12/c15 viejos |
| `forge/v_<id>_i.webp` y `_ii.webp` (18) | Variantes del kit base y de la Tiradora: Disparo Disperso, Flecha de Cicuta, Flecha Explosiva, Tiro de Precisión, Rodar y Disparar, Doble Rodada, Humo Venenoso, Estallido de Humo, Aguacero, Cortina, Andanada Cerrada, Andanada Repulsora, Carrera Certera, Carrera Esquiva, Abanico Abierto, Haz Cerrado, Diluvio Anclado, Saetas Pesadas (hoy, el arte genérico de su papel) |
| Árboles héroe | Etapa 2 (3 emblemas y 39 nodos) |

---

## 16. Para la etapa 2: decisiones que hay que respetar e ideas

### 16.1 Verbos ya ocupados por la Tiradora

| Verbo | Cómo lo usa la Tiradora | Qué puede hacer la etapa 2 |
|---|---|---|
| **Moverse disparando** (principal) | Impulso, Piel de Brisa, Viento en las Plumas | **No** puede ser el principal de otra. La Francotiradora debería ser lo contrario: **plantada** |
| **Mantener para canalizar corriendo** | Carrera del Viento | Otra puede canalizar, pero **quieta o lenta** (`moveMul` < 1) |
| **Relanzar con tiempo justo** | Andanada (Último Instante, Ida y Vuelta, Vaivén Eterno) | Si la Francotiradora conserva el Tiro Celestial (3 haces relanzables), que cada haz **se cargue** (`charge`), no que se relance a tiempo |
| **Secuencia del 3.er disparo** | Pasiva Tercera Flecha | No repetir «cada 3.er básico» en otra pasiva |
| **Zona que te sigue** | Diluvio de Saetas | El Montaraz coloca zonas **fijas** |
| **Salto atrás que dispara** | Andanada; Retirada Instintiva (v15B) | El Disparo Disuasorio de la Francotiradora (empuje propio de 8 m) es parecido: o se cambia o se convierte en un empuje al enemigo |

### 16.2 Dirección recomendada (no vinculante)

- **Francotiradora (un objetivo, Concentración):** verbo principal **mantener para tensar y soltar** con ventana perfecta (`charge`, §11.2), **plantada**. Insignia = Disparo Apuntado con carga (hoy preparación fija de 1 s). Verbos secundarios: preparación interrumpible, **marca de punto débil** que el siguiente disparo aprovecha (sin detonar: eso es del Montaraz) y posición (distancia, ya en c6B). Definitiva probable: Tiro Celestial con haces cargados.
- **Montaraz (control, Coto de Caza):** verbo principal **colocar y detonar** (trampas que se arman y estallan o atrapan; marca de Presa). Secundarios: arrastrar (Arpón), zona fija (Cerco de Zarzas), Red de Caza. **Pasiva nueva**: la actual (+25 % de Quebranto) es la del Crionte.
- **Roles:** los del juego (Francotiradora un objetivo, Montaraz control). La Arquera no tiene tanque.

### 16.3 Nombres reservados (no usar en la etapa 2)

Habilidades y variantes: Disparo Rápido, Mano Rápida, Disparo Disperso, Flecha de Cicuta, Flecha Perforante, Astil de Fresno, Flecha Explosiva, Tiro de Precisión, Paso Veloz, Ágil, Rodar y Disparar, Doble Rodada, Bomba de Humo, Humo Espeso, Humo Venenoso, Estallido de Humo, Lluvia de Flechas, Cielo Plomizo, Aguacero, Cortina, Camuflaje, Agilidad, Flecha Bengala, Andanada, Arco Ancho, Andanada Cerrada, Andanada Repulsora, Carrera del Viento, Galope, Carrera Certera, Carrera Esquiva, Flecha Múltiple, Alcance Largo, Abanico Abierto, Haz Cerrado, Diluvio de Saetas, Nube Ancha, Diluvio Anclado, Saetas Pesadas. Nodos: los 30 de clase y los 29 de la Tiradora (§6 y §7.0), y la pasiva Tercera Flecha. Tampoco «Sombra…» (choca con Sombra Gemela) ni «Ritmo…» (lo usan la Maga y el Guerrero).

### 16.4 Datos y contrato

- Prefijos libres: Francotiradora **`f`** (f0–f28), Montaraz **`m`** (m0–m28), árboles héroe **`q`**, **`w`** e **`y`** (los `h1`–`h3` son ids de árbol, no de nodo). Solo la clase empieza por `c`.
- No mover habilidades del kit base a un kit de especialización (romperían G1 y los nodos de clase c3–c30).
- Rellenar `tree.spec.francotiradora`, `tree.spec.montaraz`, `tree.hero[].nodes`, sus `specs` (quitar `sketch`), `mech`, `innate`, `specBar`, `reco`, `builds` (4 por especialización), `defaultBuild`, y los `heroNodes`/`heroCh` de `plumas` y `cruzado`.
- Alguna build debe usar el final de clase **Manto de Niebla** (el validador avisa).
- Las ideas de árbol héroe están en §9.

### 16.5 Notas para el integrador del contrato (no se tocó el HTML ni el validador)

1. El validador completo no sabe validar **por etapas**: hoy se usa `validar-etapa1.mjs`, que clasifica sus errores. Propuesta: `--solo <spec>` o `--etapa`.
2. El contrato no tiene un campo para el **verbo** de una habilidad (mantener, relanzar, secuencia, cargar). Propuesta: `verb:'hold'|'recast'|'seq'|'charge'` opcional, para que el libro pinte el chip y la barra de carga o el anillo de ventana en su tooltip.
3. El validador no comprueba que los puntos de una build vayan a habilidades de su barra (G8b); se revisó a mano.

---

## 17. Preguntas para el dueño

1. ¿Aprobás que **Flecha Múltiple** y el **Diluvio de Saetas** sean solo de la Tiradora y que la **Lluvia de Flechas** pase al kit base (Nv8)?
2. ¿El **Impulso se pierde** si estás quieta más de 2 s (hoy no se pierde)?
3. ¿Aprobás los tipos genéricos nuevos **relanzar**, **canal que acelera con disparo automático** y **secuencia del básico**, y la propuesta **cargar y soltar** para la Francotiradora?
4. ¿La pasiva de la Tiradora es **Tercera Flecha** (cada 3.er disparo, 2 flechas más) o preferís un bonus plano en movimiento (+15 % de daño)?
5. **Danza de Flechas** y **Salto de Retirada** dejan de ser habilidades (sus ideas viven en Carrera del Viento y en Retirada Instintiva). ¿De acuerdo?
6. ¿El reparto provisional de los árboles héroe (h1 Tiradora + Francotiradora, h2 Tiradora + Montaraz, h3 Francotiradora + Montaraz) y la idea de temas (Halconera, Carcaj Encantado, Errante del Viento) van por buen camino para la etapa 2?
