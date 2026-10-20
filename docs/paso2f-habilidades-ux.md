# Paso 2f: libro de habilidades y forja (Mejora + 2 Variantes), documento de diseño

> **Nota (Paso 2g):** para la **Maga**, el catálogo de §2.7 queda sustituido por `docs/paso2g-maga-coherencia.md` Anexo A.7 (catálogo y forja; los talentos v2 están en sus §4–§7). Ascua, Toque Gélido, Armadura de Hielo y Onda Repulsora pasan a ser variantes. Parpadeo, Barrera de Maná y Llamarada pasan al libro con forja. La variante «Fénix» de Estela Ígnea pasa a «Muro de Llamas».

> Estado: **diseño** (no toca código del juego). Fecha: 2026-10-20. Mockup: `docs/mockups/skills-ux.html`, que pasó dos refutaciones con capturas (§4.3).
> Insumos: `docs/paso2-diseno.md` (§1, §3, §3.4, §4 y §7), `js/skill-defs.js`, `js/skills-<clase>.js`, `js/skill-resolve.js`, `js/ui.js` (`renderSkills`, `renderSkillFocus`, `renderBookBar` y `hotbarSlotChooser`), `js/hud-model.js`, las capturas del libro actual y el banco de balance.

## 0. Resumen

**Lo que pidió el dueño.** Los talentos funcionan. El libro de habilidades y sus «ramas», en cambio, piden demasiados clics y demasiado texto, y las ramas (Ofensiva, Ímpetu y Transformación) están mal hechas. Pidió un modelo como el de D4: una mejora más dos variantes por habilidad, con más imagen y el detalle al pasar el ratón.

**Qué encontramos (§1).**
- Hoy hay **387 opciones de rama** (144 del Guerrero, 126 de la Maga y 117 de la Arquera). Solo existen 24–36 nombres distintos por clase y suman unas 2.900 palabras de texto.
- Elegir una opción por primera vez cuesta **4 clics**, contando la confirmación. Configurar la barra completa con sus ramas cuesta **≈40**.
- El banco (Nv50, canal real, una opción cada vez) confirma el problema:
  - **Trampas que no hacen nada:** Atravesar en Flecha Perforante, Masacre en Hendidura, Sediento en DPS, Estela y Amplio en Piel de Hierro, y 6 de las 9 opciones de cada defensa, con +0 % de TTD+.
  - **Obligatorias:** Quebrantar da +18–20 % en casi todo. Furibundo da +42–73 % en el Guerrero y la Arquera, pero 0 % en la Maga. Estela en Hendidura da +53 % UNI y +79 % ÁREA.
  - **Planas e invisibles:** Brutal, Quirúrgico, Vorágine, Doble y Frenético se mueven dentro de ±6 %.

**El modelo nuevo: la forja (§2).**
- Cada una de las 43 habilidades base tiene **1 Mejora automática** (se activa sola al nivel de la habilidad + 3) y **2 Variantes** (se abren al nivel + 6).
- Las variantes cambian **cómo** se usa la habilidad: forma, elemento o papel. Cada una debe ganar en un escenario del banco (UNI, ÁREA×5, CONTROL o AGUANTE).
- **Desaparecen los puntos de habilidad y la confirmación.** Cambiar de variante es gratis fuera de combate.
- El catálogo completo (129 entradas) está en §2.7. De ellas, 32 usan solo el vocabulario actual, 48 sobrescriben parámetros del tipo genérico, 24 son poderes propios y 7 son comportamientos.

**La UX nueva (§3).**
- El libro es un **panel propio (tecla T)**, con el mismo estilo que el de talentos (N).
- A la izquierda va un libro de iconos por categoría. A la derecha, la forja de la habilidad elegida: Mejora y luego dos tarjetas de variante.
- Abajo está la barra de 6 ranuras, con arrastre y con la tecla 1–4 sobre una habilidad.
- **Elegir una variante cuesta 2 clics; equipar, 1 gesto; ver qué hace algo, 0** (tooltip rico; con Alt, el detalle).
- El texto visible por defecto es el nombre más una línea.

**Vista de talentos en el mockup (§3.8).**
- El mockup abre también el **panel de talentos real**, ya aprobado (`js/ui-talents.js` + barras `ui-gauges*`), con datos reales: `N` lo abre y `T` vuelve al libro.
- Encima se aplica la regla de poco texto (las columnas de la mecánica pasan al tooltip) y se conectan las dos vistas:
  - al cambiar de especialización sale un aviso de lo que cambia en el libro;
  - el tooltip de la forja lista los talentos que tocan la habilidad, y el de un nodo, las habilidades que toca.
- Nota para la pasada de VFX: un **aura de pasivas por especialización** (§3.9).

**Entregables.**
- **95 imágenes para Codex** en 4 tandas de 24/24/24/23 (§5): 86 iconos de variante y 9 piezas de UI.
- Un plan de 5 etapas con trabajadores sin archivos compartidos, una migración de guardado v4→v5 y criterios de aceptación verificables (§6).
- Una refutación del propio diseño con 8 puntos y sus correcciones (§7).

## 0.1 Investigación (octubre de 2026)

| Fuente | Juego | Qué tomamos |
|---|---|---|
| [DiabloBytes: Skill Tree Rework (28-04-2026)](https://www.diablobytes.com/diablo-iv/guides/skill-tree-rework/) | D4 · Lord of Hatred | Base → mejora → rama que cambia la identidad de la habilidad (elemento, tipo de daño o comportamiento). Las mejoras **cambian los tags**, y eso cambia qué bonificaciones le aplican. Al cambiar de sistema hay respec gratis. |
| [DiabloBytes: el árbol nuevo divide a los jugadores (30-04-2026)](https://diablobytes.com/diablo-iv/news/2026-04-30-diablo-4-lord-of-hatreds-allnew-class-skill-trees-divided/) | D4 | Se elogian las elecciones con sentido. Se critica perder la base pasiva fija y depender del botín. **Evitar:** que el poder base dependa del azar. En el modelo nuevo, la Mejora es fija y los talentos siguen siendo la base pasiva. |
| [Shacknews: Lord of Hatred rehace todos los árboles](https://www.shacknews.com/article/147848/diablo-4-lord-of-hatred-skill-trees) | D4 | Ejemplo canónico: la Hidra cambia velocidad o pasa a ser de Hielo, con sinergia de elemento. **Evitar:** variantes de pago. Las nuestras se desbloquean jugando. |
| [Icy Veins: respuesta oficial sobre el árbol de D4](https://www.icy-veins.com/forums/topic/52508-official-response-to-feedback-regarding-the-diablo-4-skill-tree/) | D4 (lanzamiento) | El reclamo central fue la legibilidad: demasiados nodos y conexiones. Tomamos **dos niveles como máximo** de profundidad visible. |
| [PoE Vault: 35 soportes nuevos en 0.4 (12-2025)](https://www.poe-vault.com/poe2/news/poe2-adds-35-new-support-gems-in-the-last-of-the-druids) | PoE2 | Soportes por arquetipo y por niveles. **Evitar:** una avalancha de soportes sin agrupar (≈198). Nuestros 16 soportes se ven como una cuadrícula de iconos en la que los incompatibles salen apagados. |
| [Mobalytics: sistema de gemas de PoE2](https://mobalytics.gg/poe-2/guides/skill-gem-system) | PoE2 | Compatibilidad por tags, con una sola copia de cada soporte por habilidad. Ya lo tenemos (`supportFits`). Tomamos **mostrar la compatibilidad antes de engarzar**. |
| [Upcomer: especialización en Last Epoch](https://upcomer.com/how-to-specialize-in-skills-in-last-epoch) | Last Epoch | Ranuras visibles con su nivel de desbloqueo y opciones válidas iluminadas. Hay nodos que convierten elemento o mecánica. **Evitar:** no explicar los tipos de nodo en el menú. |
| [TheGamer: los tripods de Lost Ark](https://www.thegamer.com/lost-ark-tripod-skill-upgrades-explained/) | Lost Ark | Los niveles de elección se dosifican por rango (4/7/10). El cambio es **gratis e ilimitado**. **Alt** muestra valores alternativos. Se abre con K y se elige en el mismo panel. **Evitar:** bonificaciones de equipo que no se aplican si no elegiste esa rama. |
| [Maxroll: sistema de habilidades de Torchlight Infinite](https://maxroll.gg/torchlight-infinite/getting-started/skill-system-overview) | Torchlight Infinite | Los tags gobiernan los soportes y la escala, y el tooltip **muestra el cambio numérico concreto** (de 3 a 7 flechas). Lo tomamos para el tooltip de variante. |
| [LogRocket: divulgación progresiva](https://blog.logrocket.com/ux-design/progressive-disclosure-ux-types-use-cases) | UX general | Primero lo esencial y el detalle bajo demanda. Tooltip con retardo de 150–300 ms, texto corto y accesible desde el teclado. |

Lagunas: no encontré cambios concretos de interfaz en PoE2 0.3/0.5 ni en Last Epoch o Torchlight Infinite para 2026. Tampoco hay detalle de los tooltips de Lord of Hatred.
**Síntesis:** todos convergen en tres capas: la base, una mejora de poca complejidad y una **elección de variante que cambia la identidad**. Esa elección se comunica con tags dinámicos y tiene un coste de cambio bajo o nulo. Lo que falla en todos es lo mismo: árboles ilegibles y sistemas apilados.

---

## 1. Auditoría del libro y de las ramas actuales

### 1.1 Cuántos clics cuesta lo básico (hoy)

| Tarea | Pasos actuales | Clics | Notas |
|---|---|---|---|
| Abrir el libro | `T` | 1 tecla | — |
| Ver qué hace una habilidad | Leer la tarjeta: descripción completa de 25–35 palabras, números y 3 fichas de rama | 0, pero hay que leer todo | **≈650 palabras visibles a la vez** con 16 tarjetas (captura `04_libro`) |
| Equipar | Arrastrar a la barra · clic derecho en el HUD + elegir | 1 gesto / 2 | Correcto; hay que mantenerlo |
| Ranura 2 flexible | Clic derecho → pestaña «Defensa/utilidad · Gastadora» → elegir | 3 | El concepto se explica con un párrafo |
| Elegir una opción de rama por primera vez | Clic en la tarjeta (foco radial) → clic en la opción → **clic otra vez para confirmar** (1 punto) → «Volver al libro» | **4** | La opción es un emoji sin nombre. Su texto sale en un inspector al pie, lejos del cursor |
| Configurar las 3 ramas de una habilidad | 1 + 3 × 2 + 1 | **8** | Con 5 habilidades con ramas en la barra, **≈40 clics** |
| Engarzar un soporte | `<select>` nativo con hasta 16 líneas de texto | 2 | Lo incompatible sale en gris dentro del desplegable |
| Saber qué rama tienes | Fichas «Ofensiva · Brutal» en la tarjeta o un contador «1/3» | — | Hay que volver a leer la tarjeta |

### 1.2 Cuánto texto hay

| Clase | Habilidades base | Opciones de rama | Nombres distintos | Palabras de opciones | Palabras de descripción base | Palabras de las activas de talento |
|---|---|---|---|---|---|---|
| Guerrero | 16 | 144 | 36 | 1100 | 498 | 329 |
| Maga | 14 | 126 | 24 | 927 | 405 | 457 |
| Arquera | 13 | 117 | 31 | 859 | 369 | 386 |

Cada clase lleva unas **1.500–1.600 palabras** de habilidades base y ramas. El libro muestra la descripción completa de todas las tarjetas a la vez. El foco radial no muestra nombres: hay que pasar el ratón por cada símbolo.

### 1.3 Problemas de diseño de las ramas

1. **Son 3 constructores genéricos aplicados a todo.** `dmgMods`, `buffMods` y `utilMods` reparten las mismas 6 opciones de «Ofensiva/Ímpetu» a 43 habilidades. Solo la tercera rama varía, y casi siempre con las mismas 10 plantillas (`V_*`/`T_*`).
2. **Los nombres son opacos.**
   - **«Ímpetu»** mezcla enfriamiento, robo de vida y recurso, tres cosas sin relación.
   - **«Transformación»** casi nunca transforma: el 70 % de sus opciones son un DoT, Vulnerable o Aturdir con −10 %.
   - **«Potencia»** significa cosas distintas en `buffMods` y en `utilMods`.
3. **Son trampas por construcción.** La opción se diseñó sin mirar la habilidad:
   - Frenético (−30 % de enfriamiento) en habilidades **sin** enfriamiento es un −12 % de daño puro.
   - Masacre en Hendidura, que no tiene enfriamiento, no hace nada.
   - Atravesar en Flecha Perforante, que ya perfora, tampoco.
   - Amplio (+40 % de radio) en Piel de Hierro, un buff personal, no hace nada.
   - Estela en Piel de Hierro: un buff no tiene punto final.
   - Rebote en Tajo, Disparo Rápido o Atravesar: 0 % medido incluso con 5 objetivos. Hay que verificar si el tipo `weapon` aplica `chain`/`pierce`.
4. **Hay opciones globales disfrazadas de locales.** Quebrantar (Vulnerable, ×1,2 a **todo** tu daño) vale +18–20 % de UNI en cualquier habilidad. Es la elección obligada siempre.
5. **El recurso es asimétrico.** Furibundo (+16 al lanzar) duplica la Furia y la Energía (+42–73 %), pero no vale nada para la Maga, cuyo límite son los enfriamientos.
6. **Hay zonas sin límite.** Estela en una gastadora sin enfriamiento crea una zona por lanzamiento (+53 % UNI y +79 % ÁREA en Hendidura).
7. **Los números son planos e invisibles.** Brutal, Quirúrgico, Vorágine, Doble y Frenético se mueven dentro de ±6 % de la rotación. No se notan al jugar y obligan a leer.
8. **Los puntos no son escasos.** Hay 19 puntos para unas 15 ramas útiles (5 ranuras × 3). La «decisión» de gastar es un trámite de 2 clics con confirmación.

### 1.4 Medición con el banco (efecto real de cada opción)

**Método.**
- Héroe **típico Nv50, T0**, de cada clase, con la barra del banco (`LOADOUT`, variante ofensiva).
- Canal real de lanzamiento (`tests/balance-bench.mjs` → `simulateUni`, 60 s contra un jefe) y la rotación del banco.
- **ÁREA×5**: 5 comunes inmóviles de vida infinita agrupados en un radio de ≈1,6 m, cuerpo a cuerpo a 0,3 m y a distancia a 6,2 m, durante 60 s con la misma rotación.
- Se aplica **una sola opción cada vez** y se mide el Δ del DPS de la rotación entera.
- El arnés de ÁREA×5 es provisional (`scratchpad/branch-bench.mjs`) y en la etapa E1b pasa al banco (§6).

**Guerrero** — barra del banco: Tajo · Hendidura · Terremoto · Cataclismo. Base: UNI 2517 DPS, ÁREA×5 12852 DPS. Celda = Δ UNI / Δ ÁREA×5 de la rotación entera.

| Rama · opción | Tajo | Hendidura | Terremoto | Cataclismo |
|---|---|---|---|---|
| Ofensiva · Brutal | +6% / +2% | +11% / +16% | +2% / +2% | +2% / +3% |
| Ofensiva · Quirúrgico | +2% / +3% | +1% / +5% | +3% / +2% | +2% / +2% |
| Ofensiva · Vorágine | −2% / −1% | −4% / −5% | −1% / −1% | −1% / −1% |
| Ímpetu · Frenético | −2% / −1% | −3% / −4% | 0% / 0% | +6% / +7% |
| Ímpetu · Sediento | 0% / 0% | 0% / 0% | 0% / 0% | 0% / 0% |
| Ímpetu · Furibundo | +49% / +34% | +73% / +74% | +8% / +9% | 0% / 0% |
| Transformación · (3.ª/variable) | Desangrar +2% / −1% | Estela +53% / +79% | Estela 0% / +6% | Estela +2% / +2% |
| Transformación · (3.ª/variable) | Quebrantar +18% / +13% | Masacre 0% / 0% | Coloso 0% / +1% | Coloso −6% / −6% |
| Transformación · (3.ª/variable) | Rebote 0% / 0% | Desangrar +15% / +28% | Decapitar −1% / −1% | Decapitar −1% / −1% |

**Maga** — barra del banco: Dardo Arcano · Bola de Fuego · Meteoro · Supernova. Base: UNI 1885 DPS, ÁREA×5 6432 DPS. Celda = Δ UNI / Δ ÁREA×5 de la rotación entera.

| Rama · opción | Dardo Arcano | Bola de Fuego | Meteoro | Supernova |
|---|---|---|---|---|
| Ofensiva · Brutal | +4% / +1% | +6% / +3% | +1% / +1% | 0% / +7% |
| Ofensiva · Quirúrgico | 0% / 0% | +1% / 0% | +1% / 0% | 0% / −1% |
| Ofensiva · (3.ª/variable) | Doble −1% / 0% | Doble −4% / −3% | Vorágine −2% / −3% | Vorágine −1% / −2% |
| Ímpetu · Frenético | −1% / 0% | −3% / −2% | +4% / +3% | +3% / +10% |
| Ímpetu · Sediento | 0% / 0% | 0% / 0% | 0% / 0% | 0% / 0% |
| Ímpetu · Furibundo | 0% / 0% | 0% / 0% | 0% / 0% | 0% / 0% |
| Transformación · Calcinar | +9% / +2% | +23% / +35% | +18% / +46% | +7% / +19% |
| Transformación · Quebrantar | +19% / +5% | +19% / +18% | +20% / +19% | +5% / +5% |
| Transformación · (3.ª/variable) | Tullir +2% / 0% | Conmocionar 0% / −2% | Conmocionar 0% / −3% | Conmocionar +1% / −2% |

**Arquera** — barra del banco: Disparo Rápido · Flecha Perforante · Lluvia de Flechas · Diluvio de Saetas. Base: UNI 2514 DPS, ÁREA×5 5055 DPS. Celda = Δ UNI / Δ ÁREA×5 de la rotación entera.

| Rama · opción | Disparo Rápido | Flecha Perforante | Lluvia de Flechas | Diluvio de Saetas |
|---|---|---|---|---|
| Ofensiva · Brutal | +10% / +4% | +5% / +4% | +6% / +7% | −3% / −7% |
| Ofensiva · Quirúrgico | −3% / −1% | −1% / −1% | −1% / −1% | −1% / −3% |
| Ofensiva · (3.ª/variable) | Doble −3% / −1% | Doble −2% / −1% | Vorágine −1% / −1% | Vorágine −2% / −4% |
| Ímpetu · Frenético | −3% / −1% | −1% / −1% | +1% / −1% | −2% / −3% |
| Ímpetu · Sediento | 0% / 0% | 0% / 0% | 0% / 0% | 0% / 0% |
| Ímpetu · Furibundo | +42% / +42% | +31% / +34% | +14% / +13% | +3% / +4% |
| Transformación · (3.ª/variable) | Emponzoñar +1% / +3% | Atravesar 0% / 0% | Emponzoñar +7% / +8% | Emponzoñar +7% / +18% |
| Transformación · (3.ª/variable) | Quebrantar +19% / +9% | Emponzoñar +11% / +5% | Quebrantar +20% / +13% | Quebrantar +10% / +13% |
| Transformación · (3.ª/variable) | Atravesar 0% / 0% | Quebrantar +20% / +10% | Conmocionar +3% / −1% | Conmocionar +4% / −3% |

**Defensas (TTD+ contra manada, variante defensiva):**

| Opción | Piel de Hierro | Armadura de Hielo | Bomba de Humo |
|---|---|---|---|
| Potencia · Reforzado | 0 % (tope de reducción) | +7 % | 0 % |
| Potencia · Amplio | 0 % | 0 % | 0 % |
| Potencia · Persistente | +12 % | 0 % | +11 % |
| Recarga · Presto / Oportuno | 0 % | 0 % | 0 % |
| Recarga · Tenaz | +5 % | 0 % | +4 % |
| Variante · Estela / Impulso / Purga | 0 % | 0 % | 0 % |

**Lectura:**
- De las 27 opciones de defensa, 21 no cambian el aguante: el TTD+ dura ~10 s, así que el enfriamiento no entra y no hay ralentizaciones que purgar.
- En daño, **Furibundo, Quebrantar y Estela/Calcinar** dominan. **Sediento** (0 % de DPS) solo vale como sustento.
- Hay ≥ 1 opción con 0 % en cada habilidad.

**Veredicto:** el sistema actual no cumple ninguna de las reglas de balance de §7 de `paso2-diseno.md` (ni trampas ni obligatorias). No se puede afinar: hay que rehacerlo.

---

## 2. Rework: la forja (Mejora + 2 Variantes)

### 2.1 Estructura

Cada **habilidad base** (las 43 de `skills-<clase>.js`) tiene tres piezas:

```
Base ─── ◆ Mejora (automática) ───┬── I · Variante  (papel A)
                                  └── II · Variante (papel B)
```

**Mejora.**
- Una sola, lineal y gratis.
- Es un ajuste visible: alcance, radio, coste, retardo o una cualidad pequeña. Un +X % de daño solo, sin más, no sirve.
- No tiene contrapartida y vale +5–15 % en el escenario principal de la habilidad.

**Variantes I y II.**
- Se elige **una o ninguna**.
- Cada una cambia la **forma**, el **elemento** o el **papel**. Ejemplos:
  - Torbellino → Vendaval de Acero, que pasa a ser canalizado.
  - Dardo → Saeta Ígnea o Gélida, que cambia el elemento.
  - Onda Repulsora → Implosión, que atrae en vez de empujar.
- Cada variante declara su **papel** (UNI, ÁREA, CONTROL, AGUANTE, APOYO o MOVILIDAD). El banco comprueba que gane en él (§2.6).
- **Ninguna variante es un buff plano.** Si una variante solo suma números, tiene que cambiar la geometría o el ritmo de la habilidad. Por ejemplo, Aguacero: radio 3 → 2 m, 0,8 s y +40 %.
- **Las activas de talento no tienen forja**: siguen modificándose en su árbol (§3.4 de paso2-diseno).

### 2.2 Desbloqueo, coste y cambio

- **Nivel de la habilidad + 3** → la Mejora se activa sola. Sale un aviso en pantalla y un punto verde en el libro.
- **Nivel de la habilidad + 6** → se abren las dos variantes. La casilla del libro tiene un anillo dorado hasta que eliges una.
- **Sin puntos.** `skillPoints` desaparece. Elegir es 1 clic y no pide confirmación.
- **Cambiar de variante es gratis fuera de combate**, con la regla actual `canRespecFree` (5 s sin daño o en campamento). En combate las variantes y los engarces se ven pero están bloqueados, con un candado y el mensaje «En combate».
- Calendario resultante (Maga). Hay algo nuevo en todos los niveles del 1 al 22 salvo el 13, el 16, el 19 y el 22. En esos niveles, desde el Nv10, se ganan puntos de talento:

| Nv | Novedad | Nv | Novedad |
|---|---|---|---|
| 1 | aprende Dardo | 12 | aprende Estela Ígnea y Onda · variantes de Armadura |
| 2 | aprende Bola de Fuego | 14 | aprende Nova y Meteoro · variantes de Toque y Rayo |
| 3 | aprende Ascua | 15 | 3 definitivas · mejora de Estela y Onda |
| 4 | mejora de Dardo · aprende Paso de Escarcha | 17 | mejora de Nova y Meteoro |
| 5 | mejora de Bola de Fuego | 18 | mejora de las 3 definitivas · variantes de Estela y Onda |
| 6 | mejora de Ascua · aprende Armadura | 20 | variantes de Nova y Meteoro |
| 7 | **variantes de Dardo** | 21 | variantes de las 3 definitivas |
| 8 | aprende Toque y Rayo · **variantes de Bola de Fuego** | | |
| 9–11 | variantes de Ascua → Paso → mejora de Toque y Rayo | | |

El Guerrero y la Arquera tienen el mismo calendario, desplazado según su `req`. Todo queda forjado al **Nv22**: las ramas de hoy acababan en el Nv20, con el último punto.

### 2.3 Formato de datos (lo que escribe cada `skills-<clase>.js`)

```js
// sustituye a <CLASE>_SKILL_MODS. Ids estables: <skillId>_m · <skillId>_i · <skillId>_ii
export const MAGA_SKILL_FORGE = {
  bola_fuego: {
    mejora: { name: 'Núcleo Inestable', icon: 'forge/mejora', line: 'Explosión 2 → 2,6 m.', mod: { radius: 30 } },
    vars: [
      { id: 'bola_fuego_i',  name: 'Pirodardo', role: 'UNI',  icon: 'forge/v_bola_fuego_i',
        line: 'Sin preparación y muy rápida; explosión 40 %.', set: { windup: 0, speed: 22 }, add: { splash: -0.6 } },
      { id: 'bola_fuego_ii', name: 'Racimo',    role: 'AREA', icon: 'forge/v_bola_fuego_ii',
        line: 'Al explotar suelta 3 brasas que estallan (40 % c/u).', power: 'v_racimo' },
    ],
  },
};
```

**Vocabulario.**
- **Claves existentes** de `mergeMods`: `dmg`, `crit`, `radius`, `range`, `proj`, `pierce`, `chain`, `slow`/`slowPct`, `stun`, `root`/`rootAdd`, `vuln`, `dot`, `zone`/`zoneDur`, `cdr`, `cost`, `gen`, `lifesteal`, `buff`, `dur`/`durS`, `execute`, `haste`, `cleanse`, `coldblood`.
- **Claves nuevas de la forja** (todas en `skill-defs.js`):

| Clave | Qué hace | Usos en el catálogo |
|---|---|---|
| `set: { param: valor }` | Sobrescribe parámetros de la **definición** antes de resolver (`type`, `at`, `angle`, `count`, `spread`, `windup`, `impactDelay`, `cadence`, `pierce`, `unstoppable`, `allyRadius`, `weakenPct`, `waves`, `shots`, `pulses`…). Con el tipo genérico, eso es el **cambio de forma barato**. | 48 |
| `add: { param: +n }` | Suma a parámetros de la definición (`cleave`, `impacts`, `waves`, `count`, `stagger`, `genOnHit`, `window`, `hitDot.coef`…) | 17 |
| `elem: 'fire'` | Cambia el elemento y sus tags (`fire` sustituye a `arcane`). Afecta a soportes, talentos `@elem` e indicadores. | 3 |
| `power: 'v_<id>'` | Un poder propio (`definePower`, prefijo `v_`, en `powers-<clase>.js`), solo cuando ningún parámetro basta | 24 |
| `behavior: 'v_<id>'` | Comportamiento a medida (`defineSkillBehavior`) para cambios de forma que el tipo genérico no cubre | 7 |
| `pull: m` · `knock: m` | Atrae o empuja a los golpeados (primitiva nueva `Enemy.displace`, con rendimientos decrecientes de CC; a los jefes, stagger) | 7 · 1 |
| `charges: n` | Cargas de enfriamiento (`p.cds` pasa a admitir `{ t, n }`) | 2 |
| `killReset` | Reinicia el enfriamiento si el golpe mata | 1 |
| `shieldGain: [pct, máx]` | Escudo por enemigo golpeado (`g.shield`) | 1 |

**Recuento.** De las 129 entradas, **32 usan solo claves existentes** y **86 no necesitan código nuevo** (claves existentes más `set`, `add` o `elem`). Las otras **43** piden código: **24 poderes**, **7 comportamientos** (Vendaval de Acero, Martillo Arrojadizo, Desafío, Lluvia de Meteoritos, Lluvia Arqueada, Sol Errante y Diluvio Itinerante) y las primitivas `pull`, `knock`, `charges`, `killReset` y `shieldGain`.

### 2.4 `resolveSkill`: orden nuevo

El paso 2 actual (ramas → `aggregateSkillMods`) pasa a llamarse **forja** y se divide en dos:

1. **Forja de la definición** (`forgeDef(sk, p)`): `def' = { ...sk, ...set }`, más `add` y `elem` (tags recalculados con `normalizeSkillDef`). Así:
   - los **soportes** ven los **tags nuevos** (`supportFits(sup, def')`). Por ejemplo, la Flecha Explosiva deja de aceptar Perforante;
   - los **talentos `@elem`** se expanden con el elemento **nuevo**.
2. **Mods de la forja**: Mejora (si `nivel ≥ req+3`) + variante elegida (si `nivel ≥ req+6`) → `mergeMods`.

Después siguen, sin cambios: talentos → soportes por tags → globales → poderes (`modifyResolve`) → topes. `p.resolved` sigue siendo la caché, y `recompute` la invalida al cambiar de variante. `power` entra en `p.powers` desde `recompute()`, igual que los poderes de talento. Sigue prohibido `powers.has(` fuera de `powers*.js`.

### 2.5 Interacción con talentos y soportes

**Reglas.**
- Los **mods de talento por id** (`mod: { meteoro: {…} }`) se aplican a **las dos variantes**.
- Ninguna variante puede **duplicar** una elección A/B de talento sobre la misma habilidad. Choques evitados a propósito en el catálogo:

| Talento existente | Habilidad | Por eso la variante NO es… | Variantes elegidas |
|---|---|---|---|
| Corona de Flechas / Flechas Rebotadoras (Tiradora) | Flecha Múltiple | 360° ni rebote | Lluvia Arqueada / Puntas de Espino |
| Témpano / Nova Perpetua (Crionte) | Nova de Hielo | empuje ni suelo helado | Corazón de Hielo / Nova Fracturante |
| Pira (Piromante) | Meteoro | charco de fuego | Lluvia de Meteoritos / Meteoro Ancestral |
| Consagración (Cruzado) | Martillo de Guerra | suelo sagrado | Martillo Arrojadizo / Temblor |
| Golpe Conmocionador / Duelista (Berserker) | Mandoble | aturdir ni Vulnerable | Verdugo / Media Luna |
| Arco Voltaico / Carámbanos / Sobretensión (Maga) | Dardo Arcano | rebote, hielo por capas ni perforación | Saeta Ígnea / Saeta Gélida (elemento) |
| Abrojos (Montaraz) | Lluvia de Flechas | ralentizar en el suelo | Aguacero / Cortina |

- **Cambio de elemento:** el tooltip lo avisa con tags tachados y añadidos (p. ej. ~~Arcano~~ **Fuego**). Ejemplo: un Arcanista que elige Saeta Ígnea **deja de generar Cargas Arcanas** con el Dardo. Es la contrapartida a propósito, y la marca «Recomendado» (§3.5) la evita.
- **Soportes:** siguen siendo 1 o 2 engarces por habilidad, con la misma tabla `SUPPORT_MOD`. La compatibilidad se recalcula con los tags forjados. Si al cambiar de variante un soporte deja de encajar, se **desengarza** y vuelve a `knownSupports` (la misma regla que en la migración v3), y sale un aviso.

### 2.6 Reglas de balance y banco

Escenarios del banco (los de §7.1 de `paso2-diseno.md`): **UNI** (60 s contra jefe), **ÁREA×5** (5 comunes agrupados), **CONTROL** (% del tiempo con control duro o ralentización ≥30 %, y Quebrantados por minuto), **TTD+** (manada con defensa) y **APOYO**.

| # | Regla (`node tests/forge-bench.mjs --report`) | Por qué |
|---|---|---|
| F1 | **Ninguna variante es una trampa:** cada una gana a su hermana en su escenario declarado por **≥ 8 %** del aporte de la habilidad | Es la promesa «cada una gana en algún sitio» |
| F2 | **Ninguna es obligatoria:** ninguna variante gana a su hermana en **todos** los escenarios, y ninguna sube la rotación UNI **> +20 %** sobre la base con Mejora | Quebrantar y Furibundo fueron las obligatorias de hoy |
| F3 | **Mejora:** entre +5 % y +15 % en el escenario principal de la habilidad, nunca negativa | Se nota, pero no decide la build |
| F4 | **Sin efectos globales en variantes de daño:** Vulnerable o Debilidad sobre todo tu grupo solo en habilidades de preparación (Red de Caza, Provocación) | Evita «la variante de cualquier habilidad que da +20 % a todo» |
| F5 | **Recurso acotado:** una variante no sube la generación de recurso de la rotación más de un **+25 %** | Furibundo duplicaba la Furia |
| F6 | **Zonas con límite:** una zona por lanzamiento solo si la habilidad tiene enfriamiento ≥ 3 s o `zoneMax:1` | Estela en Hendidura daba +79 % |
| F7 | **Nada que no haga nada:** cada Mejora o variante cambia el perfil de `resolveSkill`, declara un `power`/`behavior` registrado o cambia el resultado del banco en ≥ 1 % (test) | Atravesar, Masacre y Amplio |
| F8 | **Sin variante (base + Mejora)** es válido, pero alguna variante debe superarlo en su escenario | La elección importa |
| F9 | Se mantienen las reglas del Paso 2b.2: la definitiva aporta un 12–22 % de UNI, «solo básico» ≤ 0,6× y el intercambio de la ranura 2 | Lo que ya está en verde no se rompe |

Reparto de papeles en el catálogo (2 variantes × habilidad):

| Clase | UNI | ÁREA | CONTROL | AGUANTE | APOYO | MOVILIDAD |
|---|---|---|---|---|---|---|
| Guerrero | 9 | 8 | 7 | 5 | 1 | 2 |
| Maga | 10 | 8 | 6 | 3 | — | 1 |
| Arquera | 10 | 8 | 5 | 3 | — | — |

### 2.7 Catálogo completo propuesto

Cada celda indica el nombre, la línea que se ve en la tarjeta y, debajo, la implementación (★ = clave nueva de la forja). Los números son **propuestas de partida**: E3 los calibra con el banco según F1–F9. La columna de la Mejora se activa al Nv base + 3 y las variantes al Nv base + 6.
#### Guerrero (16 habilidades base)

| Habilidad (Nv) | Mejora (Nv +3, automática) | Variante I (Nv +6) | Variante II (Nv +6) |
|---|---|---|---|
| Tajo (1) · Básico | **Filo Ancho**: Salpicadura 50 → 65 % y alcance 2 → 2,5 m. <br><sub>`★add{cleave:+.15, cleaveR:+.5}`</sub> | **Desgarro** · _UNI_: El objetivo sangra 60 % en 4 s; salpicadura 30 %. <br><sub>`hitDot bleed .6/4s · ★add{cleave:−.2}`</sub> | **Siega** · _ÁREA_: Barrido de 3 m a todos al 75 %; el principal 85 %. <br><sub>`★set{cleave:.75, cleaveR:3} · dmg −15`</sub> |
| Mandoble (3) · Básico | **Contundente**: +4 Furia al acertar y +50 % de stagger a jefes. <br><sub>`gen +4 · ★add{stagger:+.5}`</sub> | **Verdugo** · _UNI_: +40 % de daño a enemigos bajo el 40 % de vida. <br><sub>`★power v_verdugo (condAdd)`</sub> | **Media Luna** · _ÁREA_: Arco de 180° y 3 m al 110 %. <br><sub>`★set{type:cone, angle:180, radius:3, coef:1.1}`</sub> |
| Embate (8) · Básico | **Inercia**: 10 % más rápido (cadencia 1,1 → 1,0). <br><sub>`★set{cadence:1.0}`</sub> | **Ojo del Huracán** · _CONTROL_: Atrae 1,5 m hacia ti a los golpeados. <br><sub>`★pull 1.5`</sub> | **Coraza de Polvo** · _AGUANTE_: Cada golpeado: −1 % de daño recibido 3 s (máx. 10 %). <br><sub>`★power v_coraza_polvo`</sub> |
| Torbellino (2) · Gastadora | **Giro Firme**: −3 de coste (25 → 22) e inmune a ralentizaciones al girar. <br><sub>`cost −12 · ★set{slowImmune:true}`</sub> | **Vendaval de Acero** · _ÁREA_: Mantén para girar y moverte: 90 % cada 0,5 s, 12 Furia por giro. <br><sub>`★set{type:channel, ticks, move:.7} · behavior v_torbellino_canal`</sub> | **Ciclón** · _CONTROL_: Atrae 2 m y ralentiza 30 % 2 s; −15 % de daño. <br><sub>`★pull 2 · slow 2 · slowPct 30 · dmg −15`</sub> |
| Hendidura (8) · Gastadora | **Arco Amplio**: Cono 120 → 150°. <br><sub>`★set{angle:150}`</sub> | **Rompefilas** · _UNI_: +45 % de daño si golpea a un único enemigo. <br><sub>`★power v_rompefilas (condAdd)`</sub> | **Grieta** · _ÁREA_: Deja una grieta 2 s (40 %/s); solo 1 activa. <br><sub>`zone · zoneDur 2 · ★add{zoneMax:1}`</sub> |
| Martillo de Guerra (8) · Gastadora | **Impacto Hondo**: Alcance 2,5 → 3,5 m y +25 % de stagger. <br><sub>`range +40 · ★add{stagger:+.25}`</sub> | **Martillo Arrojadizo** · _UNI_: Lo lanzas a 9 m (200 %) y vuelve a tu mano. <br><sub>`★set{type:proj, range:9, coef:2.0} · behavior v_martillo_vuelta`</sub> | **Temblor** · _CONTROL_: La onda aturde 0,75 s; −10 % de daño. <br><sub>`stun .75 · dmg −10`</sub> |
| Terremoto (14) · Gastadora | **Falla**: Longitud 8 → 11 m. <br><sub>`range +37`</sub> | **Grieta Abierta** · _ÁREA_: La grieta arde 3 s más (40 %/s). <br><sub>`zone · zoneDur 3`</sub> | **Sacudida Circular** · _CONTROL_: Anillo de 4 m a tu alrededor: aturde 1 s, 80 % del daño. <br><sub>`★set{type:area, at:self, radius:4} · stun 1 · dmg −20`</sub> |
| Lanza Arrojadiza (14) · Gastadora | **Punta de Arpón**: Los golpeados se ralentizan 30 % 2 s. <br><sub>`slow 2 · slowPct 30`</sub> | **Arpón** · _CONTROL_: El primero golpeado es arrastrado 4 m hacia ti (+30 %). <br><sub>`★pull 4 · ★set{pierce:false} · dmg +30`</sub> | **Jabalinas** · _ÁREA_: 3 lanzas en abanico al 70 %. <br><sub>`★set{count:3, spread:.25} · dmg −30`</sub> |
| Embestida (4) · Movilidad | **Carga Fiera**: Alcance 7 → 9 m y +4 Furia si golpea. <br><sub>`range +28 · ★add{genOnHit:4}`</sub> | **Carnero** · _CONTROL_: Arrastras a los del camino y los aturdes 0,5 s. <br><sub>`★power v_carnero · stun .5`</sub> | **Doble Carga** · _MOVILIDAD_: 2 cargas (8 s cada una). <br><sub>`★charges 2`</sub> |
| Salto Devastador (12) · Movilidad | **Caída Pesada**: Radio 3,2 → 4 m. <br><sub>`radius +25`</sub> | **Impacto Sísmico** · _CONTROL_: Al caer atraes 2 m y aturdes 0,75 s. <br><sub>`★pull 2 · stun .75`</sub> | **Asalto Aéreo** · _MOVILIDAD_: −4 s de enfriamiento; se reinicia si matas al caer. <br><sub>`cdr 33 · ★killReset`</sub> |
| Piel de Hierro (6) · Defensa | **Acero Templado**: Al activarla te curas el 8 % de la vida. <br><sub>`★power v_temple (onCast g.heal)`</sub> | **Espinas** · _ÁREA_: Devuelve el 40 % del daño cuerpo a cuerpo recibido. <br><sub>`★power v_espinas (onDamaged)`</sub> | **Bastión** · _AGUANTE_: Dura 8 s y te vuelve imparable; +5 s de enfriamiento. <br><sub>`durS 2 · ★set{unstoppable:true} · cdr −20`</sub> |
| Provocación (16) · Utilidad | **Voz Ronca**: Alcance 15 → 20 m y +5 Furia. <br><sub>`range +33 · gen +5`</sub> | **Desafío** · _APOYO_: Provoca a todos a 6 m a la vez. <br><sub>`★set{radius:6} · behavior v_provoca_area`</sub> | **Humillar** · _UNI_: El provocado recibe +20 % de daño 4 s (no se debilita). <br><sub>`vuln 4 · ★set{weakenPct:0}`</sub> |
| Grito de Guerra (12) · Utilidad | **Eco del Grito**: Dura 8 → 10 s. <br><sub>`durS 2`</sub> | **Grito de Batalla** · _UNI_: +18 % de daño, pero solo para ti. <br><sub>`buff +80 · ★set{allyRadius:0}`</sub> | **Grito Intimidante** · _AGUANTE_: Los enemigos a 8 m pegan −20 % 5 s. <br><sub>`★power v_intimidar (weakenOutgoing)`</sub> |
| Furia Inmortal (15) · Definitiva | **Sin Freno**: Dura 10 → 12 s. <br><sub>`durS 2`</sub> | **Sed de Batalla** · _AGUANTE_: Mientras dura, robas el 8 % del daño como vida. <br><sub>`★power v_sed_batalla (sustain)`</sub> | **Frenesí** · _UNI_: +50 % de velocidad de ataque, pero ya no eres imparable. <br><sub>`buff +67 · ★set{unstoppable:false}`</sub> |
| Cataclismo (15) · Definitiva | **Aviso Breve**: Aviso 0,4 → 0,25 s y +1 impacto (9). <br><sub>`★add{impacts:1} · ★set{teleT:.25}`</sub> | **Juicio** · _UNI_: Todos caen en el mismo punto: radio 2 m, +25 % de daño. <br><sub>`★set{scatter:0} · radius −33 · dmg +25`</sub> | **Lluvia Sagrada** · _ÁREA_: 12 impactos al 70 % en un círculo de 7 m. <br><sub>`★set{impacts:12, scatter:4} · dmg −30`</sub> |
| Estandarte de Guerra (15) · Definitiva | **Asta Firme**: Radio 8 → 10 m. <br><sub>`radius +25`</sub> | **Pendón Carmesí** · _UNI_: +30 % de daño, sin reducción de daño. <br><sub>`buff +50 · ★set{buff.dr:0}`</sub> | **Baluarte** · _AGUANTE_: −30 % de daño recibido y 2 %/s de cura; sin bonus de daño. <br><sub>`★set{buff:{dr:30}} · ★power v_baluarte (heal)`</sub> |

#### Maga (14 habilidades base)

| Habilidad (Nv) | Mejora (Nv +3, automática) | Variante I (Nv +6) | Variante II (Nv +6) |
|---|---|---|---|
| Dardo Arcano (1) · Básico | **Dardo Veloz**: +40 % de velocidad del proyectil y +1 Maná al acertar. <br><sub>`★add{speed:+40%} · gen +1`</sub> | **Saeta Ígnea** · _ÁREA_: Se vuelve de Fuego: quema 40 % en 3 s. <br><sub>`★elem fire · hitDot burn .4/3s`</sub> | **Saeta Gélida** · _CONTROL_: Se vuelve de Hielo: ralentiza 20 % 1,5 s; −10 % daño. <br><sub>`★elem frost · slow 1.5 · slowPct 20 · dmg −10`</sub> |
| Ascua (3) · Básico | **Brasa Viva**: Estallido 1,5 → 2 m. <br><sub>`radius +33`</sub> | **Ascua Saltarina** · _ÁREA_: Rebota a 2 enemigos cercanos al 60 %. <br><sub>`chain 2`</sub> | **Carbón Encendido** · _UNI_: El objetivo arde 60 % en 4 s; estallido 15 %. <br><sub>`hitDot burn .6/4s · ★add{splash:−.15}`</sub> |
| Toque Gélido (8) · Básico | **Aliento Ártico**: Cono 70 → 90°. <br><sub>`★set{angle:90}`</sub> | **Congelación** · _CONTROL_: 3 toques al mismo enemigo lo congelan 1 s. <br><sub>`★power v_congelar (applyCC)`</sub> | **Mordisco Glacial** · _UNI_: +100 de prob. crítica contra ralentizados. <br><sub>`coldblood`</sub> |
| Bola de Fuego (2) · Gastadora | **Núcleo Inestable**: Explosión 2 → 2,6 m. <br><sub>`radius +30`</sub> | **Pirodardo** · _UNI_: Sin preparación y muy rápida; explosión 40 %. <br><sub>`★set{windup:0, speed:22} · ★add{splash:−.6}`</sub> | **Racimo** · _ÁREA_: Al explotar suelta 3 brasas que estallan (40 % c/u). <br><sub>`★power v_racimo (onHit)`</sub> |
| Rayo (8) · Gastadora | **Sobrecarga**: Alcance 13 → 15 m y +10 % de prob. crítica. <br><sub>`range +15 · crit +10`</sub> | **Rayo en Cadena** · _ÁREA_: No perfora: salta a 4 enemigos (−20 % por salto). <br><sub>`★set{pierce:false} · chain 4`</sub> | **Haz Concentrado** · _UNI_: Canaliza 1,5 s: 4 pulsos de 100 %. <br><sub>`★set{type:channel, ticks:4, channelT:1.5, coef:1.0}`</sub> |
| Nova de Hielo (14) · Gastadora | **Escarcha Profunda**: Ralentiza 30 → 40 %. <br><sub>`slowPct 40`</sub> | **Corazón de Hielo** · _AGUANTE_: Escudo del 3 % de vida por golpeado (máx. 15 %). <br><sub>`★shieldGain 3/15`</sub> | **Nova Fracturante** · _UNI_: +40 % de daño a enemigos ya ralentizados. <br><sub>`★power v_fractura (condAdd)`</sub> |
| Meteoro (14) · Gastadora | **Puntería Ígnea**: Cae a los 0,45 s. <br><sub>`★set{impactDelay:.45}`</sub> | **Lluvia de Meteoritos** · _ÁREA_: 3 meteoritos (55 % c/u, 2,2 m) en un área de 5 m. <br><sub>`★set{impacts:3, scatter:2.5} · behavior v_meteoritos`</sub> | **Meteoro Ancestral** · _UNI_: +60 % de daño y aturde 1 s; enfriamiento 6 → 9 s. <br><sub>`dmg +60 · stun 1 · cdr −50`</sub> |
| Paso de Escarcha (4) · Movilidad | **Paso Ligero**: Enfriamiento 10 → 8 s. <br><sub>`cdr 20`</sub> | **Paso Doble** · _MOVILIDAD_: 2 cargas (10 s cada una). <br><sub>`★charges 2`</sub> | **Prisión Fugaz** · _CONTROL_: Quien pisa el hielo queda inmovilizado 1 s. <br><sub>`root 1`</sub> |
| Estela Ígnea (12) · Movilidad | **Rastro Ardiente**: El fuego dura 3 → 4 s. <br><sub>`durS 1`</sub> | **Senda de Llamas** · _ÁREA_: Rastro el doble de ancho (3 m) y 55 %/s. <br><sub>`radius +100 · dmg +37`</sub> | **Fénix** · _AGUANTE_: Te cura el 10 % y te libra de ralentizaciones. <br><sub>`cleanse · ★power v_fenix (heal)`</sub> |
| Armadura de Hielo (6) · Defensa | **Hielo Grueso**: Escudo 20 → 25 %. <br><sub>`buff +25`</sub> | **Armadura Reactiva** · _CONTROL_: Al romperse congela 1,5 s a los cercanos (3 m). <br><sub>`★power v_reactiva (onShieldBreak)`</sub> | **Coraza Arcana** · _UNI_: Mientras aguanta, +15 % de daño de hechizos. <br><sub>`★power v_coraza_arcana (cond)`</sub> |
| Onda Repulsora (12) · Utilidad | **Onda Amplia**: Radio 4 → 5 m. <br><sub>`radius +25`</sub> | **Implosión** · _CONTROL_: Atrae 4 m en vez de empujar. <br><sub>`★set{knock:0} · ★pull 4`</sub> | **Escudo Repulsor** · _AGUANTE_: Tras empujar, −25 % de daño recibido 3 s. <br><sub>`★power v_repulsor (addBuff dr)`</sub> |
| Supernova (15) · Definitiva | **Gravedad Solar**: Atrae 2 m antes de estallar. <br><sub>`★pull 2`</sub> | **Sol Errante** · _ÁREA_: La estrella te sigue 4 s y estalla 4 veces (380 %). <br><sub>`★set{follow:true, pulses:4} · behavior`</sub> | **Colapso** · _UNI_: Una sola onda de 1300 % en 3 m. <br><sub>`★set{pulses:1, radius:3} · ★set{coef:13}`</sub> |
| Tormenta Glacial (15) · Definitiva | **Ojo de la Tormenta**: Radio 6 → 7 m. <br><sub>`radius +17`</sub> | **Ventisca Anclada** · _CONTROL_: Fija en el punto elegido, 8 m; congela a los 4 golpes. <br><sub>`★set{follow:false, radius:8, freezeAt:4}`</sub> | **Granizo** · _UNI_: +50 % de daño, radio 6 → 4 m. <br><sub>`dmg +50 · radius −33`</sub> |
| Desgarro Arcano (15) · Definitiva | **Desgarro Estable**: Dura 3 → 3,5 s. <br><sub>`★add{channelT:.5, ticks:1}`</sub> | **Brecha** · _ÁREA_: Perfora en línea a todos; −25 % de daño. <br><sub>`pierce · dmg −25`</sub> | **Singularidad** · _UNI_: +10 % de daño y +100 % de stagger: quiebra jefes. <br><sub>`dmg +10 · ★add{stagger:+1}`</sub> |

#### Arquera (13 habilidades base)

| Habilidad (Nv) | Mejora (Nv +3, automática) | Variante I (Nv +6) | Variante II (Nv +6) |
|---|---|---|---|
| Disparo Rápido (1) · Básico | **Mano Rápida**: 10 % más rápido. <br><sub>`★set{cadence:.9}`</sub> | **Ojo Fijo** · _UNI_: Cada acierto seguido al mismo objetivo: +5 % crítico (máx. 25 %). <br><sub>`★power v_ojo_fijo (stacks)`</sub> | **Flecha Partida** · _ÁREA_: Al impactar se parte en 2 astillas perforantes (40 %). <br><sub>`★power v_partida (onHit)`</sub> |
| Disparo Disperso (3) · Básico | **Abanico**: 3 → 4 flechas. <br><sub>`★add{count:1}`</sub> | **Ráfaga Cerrada** · _UNI_: Abanico de 8°: todas al mismo objetivo. <br><sub>`★set{spread:.07}`</sub> | **Metralla** · _CONTROL_: Empuja 1 m y ralentiza 20 % 1 s. <br><sub>`★knock 1 · slow 1 · slowPct 20`</sub> |
| Flecha de Cicuta (8) · Básico | **Cicuta Concentrada**: Veneno 50 → 70 %. <br><sub>`★add{hitDot.coef:+.2}`</sub> | **Contagio** · _ÁREA_: Al morir un envenenado, el veneno salta a 2 cercanos. <br><sub>`★power v_contagio (onKill)`</sub> | **Parálisis** · _CONTROL_: 3 capas inmovilizan 1 s (a jefes: stagger). <br><sub>`★power v_paralisis (applyCC root)`</sub> |
| Flecha Perforante (2) · Gastadora | **Astil de Fresno**: +2 m de alcance y +20 % de velocidad. <br><sub>`range +15 · ★add{speed:+20%}`</sub> | **Flecha Explosiva** · _ÁREA_: No perfora: explota en 3 m al 80 %. <br><sub>`★set{pierce:false} · ★set{splash:.8, radius:3}`</sub> | **Tiro de Precisión** · _UNI_: Prepara 0,35 s: +45 % de daño. <br><sub>`★set{windup:.35} · dmg +45`</sub> |
| Flecha Múltiple (8) · Gastadora | **Plumas Equilibradas**: −3 de coste (22 → 19). <br><sub>`cost −14`</sub> | **Lluvia Arqueada** · _ÁREA_: Caen en un círculo de 4 m delante (todas al área). <br><sub>`★set{type:area, at:target, radius:4} · behavior`</sub> | **Puntas de Espino** · _UNI_: Se vuelven de Naturaleza: cada una envenena 30 % en 3 s. <br><sub>`★elem nature · hitDot poison .3/3s`</sub> |
| Lluvia de Flechas (14) · Gastadora | **Cielo Plomizo**: 4 → 5 oleadas. <br><sub>`★add{waves:1}`</sub> | **Aguacero** · _UNI_: Radio 2 m, en 0,8 s y +40 % de daño. <br><sub>`radius −33 · ★set{span:.8} · dmg +40`</sub> | **Cortina** · _AGUANTE_: Dentro, los enemigos pegan −15 % y fallan la mitad de proyectiles. <br><sub>`★set{allyDr:15, projMissPct:50} (zona)`</sub> |
| Paso Veloz (4) · Movilidad | **Ágil**: El bonus dura 3 → 4 s. <br><sub>`durS 1`</sub> | **Rodar y Disparar** · _UNI_: Al rodar disparas un Disparo Rápido gratis al 150 %. <br><sub>`★power v_rodar (afterCast)`</sub> | **Voltereta Trampa** · _CONTROL_: Dejas un abrojo que inmoviliza 1,5 s. <br><sub>`★power v_abrojo (spawnField)`</sub> |
| Agilidad (12) · Movilidad | **Viento a Favor**: Dura 6 → 7 s. <br><sub>`durS 1`</sub> | **Ojo de Halcón** · _UNI_: En vez de velocidad: +15 % de prob. crítica. <br><sub>`★set{buff:{crit:15, aspdPct:15}}`</sub> | **Bruma** · _AGUANTE_: Además, el 30 % de los proyectiles enemigos te fallan. <br><sub>`★power v_bruma (projMiss)`</sub> |
| Red de Caza (6) · Utilidad | **Red Lastrada**: Radio 2,5 → 3 m. <br><sub>`radius +20`</sub> | **Red de Púas** · _UNI_: Los atrapados reciben +20 % de daño 4 s. <br><sub>`vuln 4`</sub> | **Red de Arrastre** · _CONTROL_: Junta a los atrapados en el centro y dura 3 s. <br><sub>`★pull 2 · rootAdd 1`</sub> |
| Bomba de Humo (12) · Defensa | **Humo Denso**: Dura 4 → 5 s. <br><sub>`durS 1`</sub> | **Humo Venenoso** · _ÁREA_: Dentro, los enemigos sufren veneno 40 %/s. <br><sub>`dot poison · ★set{coef:.4}`</sub> | **Desvanecer** · _AGUANTE_: Te vuelves invisible 2 s al lanzarla. <br><sub>`★power v_desvanecer (goInvisible)`</sub> |
| Diluvio de Saetas (15) · Definitiva | **Diluvio Cerrado**: Aviso 0,4 → 0,25 s. <br><sub>`★set{impactDelay:.25}`</sub> | **Diluvio Itinerante** · _ÁREA_: La zona sigue a la mira mientras dura. <br><sub>`★set{follow:"aim"} · behavior`</sub> | **Andanada Final** · _UNI_: 4 oleadas de 420 % en 3 m. <br><sub>`★set{waves:4, radius:3, coef:4.2}`</sub> |
| Tiro Celestial (15) · Definitiva | **Recarga Celeste**: Ventana 8 → 10 s. <br><sub>`★add{window:2}`</sub> | **Constelación** · _ÁREA_: 5 haces de 450 %. <br><sub>`★set{shots:5, coef:4.5}`</sub> | **Disparo Estelar** · _UNI_: 2 haces de 1100 %; carga 0,5 s. <br><sub>`★set{shots:2, coef:11, windup:.5}`</sub> |
| Cerco de Zarzas (15) · Definitiva | **Espinas Largas**: Dura 8 → 10 s. <br><sub>`durS 2`</sub> | **Jardín Espinoso** · _ÁREA_: 9 m, +30 % de veneno; ya no inmoviliza. <br><sub>`radius +28 · dmg +30 · ★set{crossRoot:0}`</sub> | **Jaula** · _CONTROL_: 4,5 m: cruzar inmoviliza 3 s y dentro +25 % de daño recibido. <br><sub>`radius −35 · ★set{crossRoot:3, weakPct:25}`</sub> |

---

## 3. UX nueva

### 3.1 ¿El mismo panel que los talentos (N) o uno propio (T)? → **Propio (T), con el mismo estilo y enlazado**

- **Frecuencia y momento.**
  - La barra y las variantes se tocan **a menudo**: al aprender, al cambiar de contenido (jefe u horda) y al probar.
  - Los talentos se tocan **poco**: al subir de nivel y al reespecializar.
  - Juntarlos obligaría a cargar dos árboles (clase y especialización), 43 forjas y la barra en una sola pantalla. Ya hoy el panel de talentos usa toda la pantalla (captura `07_talentos_N`).
- **Convención de PC.** WoW separa el libro de hechizos de los talentos, y Lost Ark abre las habilidades con K. Mantenemos `T`, que ya es la tecla actual (`bindings.js`), para no romper la memoria muscular.
- **Enlace en vez de fusión.**
  - El botón «Talentos `N`» va en la cabecera.
  - Las activas de talento salen en el libro con la etiqueta TALENTO. Al pulsarlas, la forja dice «se modifica en Talentos» y ofrece un botón para abrirlos.
  - Los nodos de talento que modifican una habilidad muestran su icono en el tooltip.
- **Mismo estilo:** cabecera con emblema, título en Cinzel versalita y subtítulo de estado, tarjetas `#15111a` con borde `#2f2638`, verde = disponible y dorado = elegido o máximo.

### 3.2 Distribución (1560 × 930 a escala 1; `--s` 0,8 a 1366 × 768)

```
┌ [📖] HABILIDADES · MAGA   Nivel 18 · Piromante · Maná · 5 variantes por elegir   [Talentos N] [Recomendado] [✕] ┐
│ ┌ LIBRO ─────────────── 15 de 15 ┐ ┌ FORJA ─────────────────────────────────────────────────────────────┐ │
│ │ BÁSICO        │ MOVILIDAD       │ │ [icono]  BOLA DE FUEGO                                  Rango 3    │ │
│ │ ▣ ▣ ▣         │ ▣ ▣             │ │          Esfera ardiente que explota a 2 m.              ●●●○○     │ │
│ │ GASTADORA                       │ │          [Gastadora · DER o 2] [Daño 264 %] [18] [1,5 s] [Fuego]   │ │
│ │ ▣ ▣ ▣ ▣ ▣                       │ │                                   ╭─── I  [arte] PIRODARDO · UN OBJETIVO │ │
│ │ DEFENSA·UTIL. │ ESPECIALIZACIÓN │ │     MEJORA  ◆ Núcleo Inestable ───┤                                │ │
│ │ ▣ ▣ ▣         │ ◉ (talento)     │ │                                   ╰─── II [arte] RACIMO · ÁREA  [ELEGIDA] │ │
│ │ DEFINITIVA                      │ │ ENGARCES (◎)(◎)                  Cambiar de variante es gratis fuera de combate │ │
│ │ ▣ ▣ ▣                           │ └────────────────────────────────────────────────────────────────────┘ │
│ └─────────────────────────────────┘                                                                        │
│ BARRA  [IZQ][DER][1][2·FLEX][3][4]                         ⇢ arrastra · 1–4 asigna · Alt detalle · T cerrar │
└────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 3.3 Flujo y clics (nuevo frente a hoy)

| Tarea | Nuevo | Clics | Hoy |
|---|---|---|---|
| Ver qué hace una habilidad, Mejora o variante | Pasar el ratón (tooltip a los 160 ms) | **0** | 0, pero leyendo 650 palabras |
| Equipar | Arrastrar a la ranura · tecla `1`–`4` con el ratón encima · clic derecho → a su ranura natural | **1** | 1–2 |
| Ranura 2 | Arrastrar una gastadora **o** una defensa a `2`. Al arrastrar, las ranuras válidas se marcan en verde con ✓ y el resto se apaga | **1** | 3 |
| Elegir variante | Clic en la casilla → clic en la tarjeta de variante. Sin confirmación ni «volver» | **2** | 4 |
| Cambiar de variante | Clic en la otra tarjeta | **1** | 2 + confirmación |
| Configurar 5 habilidades | 5 × 2 | **10** | ≈40 |
| Engarzar un soporte | Clic en el engarce → cuadrícula de iconos (los incompatibles, apagados) → clic | **2** | 2, pero leyendo un `<select>` |
| Navegar sin ratón | `←`/`→` entre habilidades, `Intro` para elegir y `Esc`/`T` para cerrar | — | — |

### 3.4 Tooltip rico (texto solo al pasar el ratón)

Marco `ui_tooltip` (9-slice), 380 px, anclado a la tarjeta y sin tapar a su hermana, retardo de 160 ms y siempre dentro de la pantalla.

| Sobre… | Contenido |
|---|---|
| **Habilidad** | Icono + nombre + «Gastadora · DER o 2 · Rango 3». Una línea. Tabla: **Daño 264 % → 288 %** (siguiente rango en verde) · Coste · Enfriamiento · Genera. «Rango 4 al nivel 26». Estado: «¡Elige una variante!» o «Variante II: Racimo». Pie: «Clic: forja · Arrastra a la barra · Alt detalle». |
| **Mejora** | Nombre · «Mejora de X · automática» · una línea · «✓ Activa» o «Se activa sola al nivel N». |
| **Variante** | Icono de variante + nombre + «Variante II de X» · una línea con sus números · fila de **5 glifos de papel**: el suyo encendido en su color y el de la hermana discontinuo («gana en Área») · tags que cambian (~~Arcano~~ **Fuego**) · estado («Clic: elegir (sustituye a Pirodardo) · gratis», «✓ Elegida», «Bloqueada en combate», «Nv 20»). |
| **Ranura** | La habilidad equipada. En la `2` añade «Ranura flexible: una defensa/utilidad **o** una segunda gastadora». |
| **Con `Alt` mantenido** | Añade los **tags** completos, la fórmula del coeficiente («arma × 2,64 × (1 + Σ aditivos) × atributo × crítico»), el detalle técnico de la variante (sus mods) y los talentos que tocan la habilidad. Es el «tooltip avanzado» de Lost Ark y WoW. |

### 3.5 Estados (todo con imagen y un solo marcador por casilla)

| Estado | Cómo se ve |
|---|---|
| Equipada | Tecla dorada en la esquina (`IZQ`, `DER`, `1`…`4`) |
| Variante elegida | Sello redondo **I** o **II** abajo a la derecha, también en la ranura de la barra |
| Variante por elegir | **Anillo dorado latiendo** en la casilla. La cabecera dice «N variantes por elegir» |
| Novedad (aprendida o Mejora nueva) | Punto verde. Al subir de nivel sale un aviso: «Nivel 18 · Supernova: mejora Gravedad Solar» |
| Bloqueada por nivel | Icono en gris + candado + «Nv 14». La tarjeta de variante lleva la píldora «Nv 20» |
| En combate | Tarjetas y engarces con candado. Pie en ámbar: «En combate: variantes y engarces bloqueados» |
| Activa de talento | Icono redondo + etiqueta TALENTO. Su forja enlaza a `N` |
| «Recomendado» | Aplica las variantes sugeridas para tu especialización (lista por especialización en `talents-<clase>.js`, junto a `clsPreset`) |

### 3.6 La ranura 2 flexible

- Lleva un borde dorado y la etiqueta **FLEX** bajo la ranura.
- Al arrastrar una gastadora se iluminan `DER` y `2`. Al arrastrar una defensa o utilidad, solo `2`.
- El tooltip lo explica en una línea. El selector con pestañas de hoy desaparece: el arrastre ya enseña dónde va cada cosa.

### 3.7 Accesibilidad (solo PC)

- Todo funciona con teclado: `Tab` y flechas entre casillas, `Intro` para abrir y elegir, `1`–`4` asignan la casilla enfocada o bajo el ratón, `Esc`/`T` cierran y `Alt` amplía el tooltip.
- **Contraste:**
  - texto principal `#ede6d6` sobre `#15111a` (≈14:1);
  - texto secundario `#a39a88` (≈6,5:1);
  - la variante no elegida queda al 74 % de opacidad, no al 55 %, para que siga legible a 1366.
- **No solo color:** el papel se reconoce por color + glifo + palabra («ÁREA»). La variante se reconoce por su numeral I/II y el sello ELEGIDA.
- **Tamaños mínimos a 1366 × 768 (`--s` 0,8):** nombre de casilla 10 px, cuerpo 11,2 px y tooltip 11,6 px. Esos 10 px se aceptan solo para el nombre bajo el icono. El resto ≥ 11 px.
- **Texto:** una línea por tarjeta (≤ 70 caracteres) y nombres de casilla de 2 líneas como máximo, sin cortes con «…».

### 3.8 Vista de talentos y su vínculo con el libro

**Qué es.**
- Es el **panel real** de talentos (`createTalentPanel` de `js/ui-talents.js`, con `css/talents.css`, las barras `js/ui-gauges*.js` y `css/gauges-*.css`), con sus datos (`talents-<clase>.js`, `spec-mechanics.js`, `explain(gaugeTuning())`).
- Va empaquetado dentro del mockup con esbuild, sin THREE.
- **No se rediseña:** se ve igual que en el juego (captura `07_talentos_N`): selector de las 3 especializaciones con retrato y emblema (botón «Especialización»), árbol de clase y de especialización con iconos reales, puntos, puertas (6/12 puntos y Apex Nv40), nodo clave gratis, elecciones A/B, barra de mecánica en demo y lista de activas concedidas.
- **Navegación:** «Talentos `N`» en la cabecera del libro (o la tecla `N`) abre los talentos. «Habilidades `T`» es el único botón añadido a la cabecera del panel; con `T`, `Esc` o ✕ se vuelve al libro.
- El héroe del mockup lleva el preset recomendado de su especialización y Nv18.

**Regla de poco texto** (solo donde había párrafos fijos):

| Párrafo de hoy | Ahora |
|---|---|
| Mecánica única: texto + 3 columnas «Generar / Descargar / Pérdida» (~30 palabras) siempre visibles | Queda el texto en **2 líneas** y la barra. Las 3 columnas y el texto completo salen en el **tooltip** al pasar por el texto o por la barra |
| Inspector del nodo a 1366 (diseño compacto): la descripción se cortaba a media línea | Se recorta a 2 líneas con «…». Si el texto supera ~110 caracteres, el **tooltip del nodo** lo trae entero |
| (nuevo) Nodo que toca habilidades | Tooltip compacto: icono, nombre, tipo y rango, más **«Habilidades que toca»** con sus iconos. El inspector del panel ya muestra la descripción y no se repite |

**Vínculo entre las dos vistas.**
1. **Al cambiar de especialización** sale un aviso breve en una tira sobre la leyenda inferior, que no tapa el árbol nuevo:
   - `3` insignia vieja ~~tachada~~ → insignia nueva, con su icono. Pasa a la ranura 3 de la barra.
   - Activas de talento que **entran** (+) o **salen** (−). Las que salen se quitan de la barra.
   - **★ variantes recomendadas** (iconos). En el libro quedan marcadas con una estrella hasta que las eliges, y la tarjeta de variante lleva «★ <especialización>».
   - **▮ barra de mecánica nueva**, más «`T` ver en el libro».
   - El libro reordena las activas de talento en su categoría con la etiqueta TALENTO.
2. **El tooltip de la forja** (habilidad y variante) añade **«Talentos que la tocan»**: icono y nombre de cada nodo de clase o de la especialización activa cuyo `fx.mod` / `skillLv` / `grant` nombra esa habilidad. Los comprados llevan ✓ y el resto sale atenuado.
3. **Al revés:** el tooltip de un nodo lista **«Habilidades que toca»**. Se calcula de los mismos `fx`; los `@elem`/`@spec` quedan fuera para no listar media clase.
4. **«Recomendado» del libro** aplica las variantes recomendadas de la especialización activa. Es la tabla `RECO` del mockup; en el juego, `recoVariants` junto a `clsPreset` en `talents-<clase>.js`.

**Para la implementación** (se suma a E2 de §6):
- `js/hud-model.js` gana `talentLinks(p, skillId)` y `nodeSkills(node)`, puros y con su test, a partir de `nodeFx`.
- El aviso de especialización es `specSwapSummary(pPrev, pNext)` (puro): insignia, entradas, salidas, recomendadas y mecánica. Lo pinta `ui-skills.js`.
- En `ui-talents.js` solo se añaden el botón «Habilidades T», el recorte de `.tp-mech-cols` al tooltip y el gancho `onNodeHover` para el tooltip de habilidades. Lo hace su dueño, sin rediseñar.

### 3.9 Nota para la pasada de VFX (sin implementar): aura de pasivas por especialización

- **El modelo 3D del héroe NO cambia por especialización.** La identidad visual de la especialización la da un **aura alrededor del héroe que reacciona a los procs de sus pasivas**, una por especialización.
- Se alimenta de los mismos eventos que las barras de mecánica: `onGauge` ⑩, `firePower` de las pasivas clave y `gaugeView` a 10 Hz. Ejemplos:

| Especialización | Reposo | Reacciona a… |
|---|---|---|
| Berserker | vaho rojo a ras de suelo | Sed Saciada → venas rojas que laten en el aura |
| Guardián | anillo de acero tenue | cada carga de Bastión → un escudo que orbita |
| Cruzado | motas doradas | Fervor lleno → halo con rayos |
| Piromante | brasas sueltas | **Ignición/Combustión → estallido de brasas** |
| Crionte | escarcha en los pies | **cada capa de Escarcha acumulada → cristales que crecen**; Congelado → destello frío |
| Arcanista | runas en órbita | cada Carga Arcana → una runa más encendida |
| Francotiradora | retícula en el suelo | Concentración máxima → retícula que se cierra |
| Montaraz | hojas que caen | trampa armada → raíces; Presa marcada → destello verde |
| Tiradora | remolino de viento | Impulso → estela que se alarga con la velocidad |

- **Reglas:**
  - Un único sistema de partículas por héroe: `postfx`/`particles` con el pool fijo de `world-marks`.
  - Intensidad acotada para no tapar el combate, y opción de reducirla con «reducir movimiento».
  - Los colores salen de STYLE.md.
  - Se diseña en la pasada de VFX y sonido (memoria «UX habilidades y FX»), no en 2f.

---

## 4. Mockup

### 4.1 Archivo y uso

- `docs/mockups/skills-ux.html`: se abre con doble clic. Usa el arte real con rutas `file:///D:/Proyectos/IntentoRPG-assets/web/…`.
- **Datos:** las 43 forjas del catálogo §2.7 van incrustadas, así que cualquier casilla abre su forja real.
- **Qué se puede hacer:**
  - libro por categorías, forja con Mejora y 2 variantes, y tooltip rico al pasar el ratón;
  - clic para elegir o quitar una variante;
  - arrastrar a la barra (con validación de ranura), tecla `1`–`4` sobre una casilla y clic derecho → ranura natural;
  - engarces con cuadrícula de soportes;
  - interruptores «En combate» y `Alt`, y selector de clase y de resolución.
- **Parámetros:** `?cls=guerrero|maga|arquera &res=1920|1366 &sel=<id> &tip=base|mejora|A|B &drag=<id> &combat=1 &alt=1 &shot=1`. Vista de talentos: `&view=talents`, `&spec=<id>`, `&swap=<id>` (simula el cambio de especialización), `&back=1` (vuelve al libro tras el cambio), `&tipnode=spec:s2` y `&tip2=A|B`.
- **Vista de talentos:**
  - Carga `../../css/talents.css` y los `gauges*.css` del repo, así que el mockup se abre desde `docs/mockups/`. El arte sale de `IntentoRPG-assets/web/`.
  - Como en el juego, el panel elige su diseño completo o compacto según el **tamaño real de la ventana**.
  - La demo de la barra de mecánica anima en tiempo real. Las capturas de talentos se sacan con `--timeout`, no con `--virtual-time-budget`: con tiempo virtual la demo se queda en su primer fotograma.
- **Iconos de variante:** todavía no existen (§5). El mockup usa la **reserva legible** que tendrá el juego si un asset no carga: el icono base virado al color de su papel (la II en espejo) y el glifo grande del papel. Si existe `web/forge/v_<id>_i|ii.webp`, se ve el arte encima.

### 4.2 Capturas finales (Chrome headless, `--headless=new --enable-gpu --use-angle=d3d11`)

Carpeta: `C:\Users\juanm\AppData\Local\Temp\claude\D--Proyectos-IntentoRPG\6ead5cf3-f7a8-4c53-8c4f-4d18d352840c\scratchpad\skills-ux\`

| Captura | Muestra |
|---|---|
| `final_maga_1920.png` | Maga 1920 × 1080: libro, forja de Bola de Fuego con Racimo **elegida** y tooltip de la variante I |
| `final_maga_1366.png` | Lo mismo a 1366 × 768, con tooltip de la variante II |
| `final_guerrero_1920.png` | Torbellino → Vendaval de Acero elegida y tooltip de Ciclón (comparación de papeles) |
| `final_guerrero_1366.png` | Guerrero a 1366 con el tooltip de habilidad (rango actual → siguiente) |
| `final_arquera_1920.png` | Lluvia de Flechas: Mejora activa y variantes bloqueadas («Nv 20»), con el tooltip de la Mejora |
| `final_arquera_drag_1366.png` | Arrastre de Lluvia de Flechas: `DER` y `2` en verde con ✓, y el resto apagado |
| `final_maga_combate_alt_1920.png` | Modo combate (todo bloqueado) con `Alt`: tooltip avanzado |

**Vista de talentos:**

| Captura | Muestra |
|---|---|
| `final_tal_maga_1920.png` | Talentos de la Maga Piromante a 1920: los dos árboles, la mecánica Calor animada y el tooltip del nodo «Combustión Rápida» con **«Habilidades que toca: Bola de Fuego»** |
| `final_tal_guerrero_1366.png` | Talentos del Berserker a 1366 (compacto), con la barra Sed en demo y el tooltip del nodo clave |
| `final_tal_swap_maga_1366.png` | Cambio a Crionte a 1366: tira de aviso (`3` Llamarada → Prisión de Hielo · ★ 5 variantes · ▮ Escarcha · `T`) y la barra Escarcha en demo |
| `final_tal_swap_arquera_1920.png` | Cambio a Montaraz a 1920 (Trampa de Cepo · Coto de Caza) |
| `final_tal_libro_tras_cambio_1920.png` | Vuelta al libro tras el cambio: ★ en las variantes recomendadas, ranura 3 = Prisión de Hielo y tooltip de Saeta Gélida con **«Talentos que la tocan: Carámbanos»** |

Las capturas de cada ronda se conservan como evidencia: `r1_*.png` y `r2_*.png` (libro), y `t1_*.png` y `t2_*.png` (talentos).

### 4.3 Refutaciones del mockup (dos, como pidió el dueño)

**Refutación 1:** crítica de «jugador de D4 que odia el texto» sobre `r1_*.png`.

| Crítica | Cambio |
|---|---|
| Cada casilla tenía 3–4 marcadores diminutos (◆ de Mejora, «!» de pendiente, punto verde y tecla): ruido que hay que descifrar | **Un solo marcador por casilla:** sello I/II si hay variante elegida o anillo dorado latiendo si falta elegir. La Mejora ya no lleva marcador porque es automática |
| Nombres cortados («Dardo Arca…», «Salto Deva…») | Nombres en 2 líneas como máximo, sin «…» |
| **Las variantes I y II tenían el mismo icono que la base**: no se distinguían sin leer | Icono de reserva legible: virado al color del papel, la II en espejo y el glifo grande del papel. El arte definitivo se encarga a Codex (§5) |
| El mismo icono 3 veces (cabecera, nodo «Base» y rombo de Mejora) | Se quita el nodo Base: la cabecera **es** la base. El árbol empieza en la Mejora |
| «MEJORA» tapada por el rombo | La etiqueta va encima del rombo |
| Dos líneas de instrucciones de teclado en la barra | Una línea de teclas: «⇢ arrastra · 1–4 asigna · Alt detalle · T cerrar» |
| Al arrastrar, las ranuras válidas apenas se distinguían | Contorno verde + ✓, y el resto al 35 % |
| La variante no elegida quedaba al 55 % y era ilegible a 1366 | 74 % y menos saturación |
| El tooltip comparaba papeles con 4 barras rotuladas y una leyenda de texto | Una fila de 5 glifos de papel: el suyo encendido y el de la hermana discontinuo, más «gana en Área» |

**Refutación 2:** sobre `r2_*.png`.

| Crítica | Cambio |
|---|---|
| (Bloqueante) Al ensanchar las casillas, la 3.ª saltaba de línea y **«Definitiva» se salía del libro y pisaba la barra** | Columna del libro de 660 px, casillas de 88 px y hueco de 6. El libro recorta y desplaza dentro de su tarjeta y nunca se desborda |
| El tooltip de una variante tapaba la variante hermana, justo la que quieres comparar | El tooltip de variante se ancla **a la izquierda de su tarjeta** (hacia el árbol) |
| Los títulos largos («Vendaval de Acero») se partían en 2 líneas y movían la tarjeta | Tarjeta de 380 px y título en una línea |
| Los glifos apagados del tooltip tenían poco contraste | `#7c7286` sobre borde `#4a3e54` |
| (Encontrado al verificar) En combate, el tooltip de la variante elegida decía «clic para quitarla» | Ahora dice «✓ Elegida · bloqueada en combate». Con `Alt`, el detalle va rotulado «Detalle (Alt)» |

No se hizo una tercera ronda.

**Vista de talentos · refutación 1** (sobre `t1_*.png`)

| Crítica | Cambio |
|---|---|
| El aviso «Nivel 18 · mejora…» del libro se colaba en la vista de talentos y tapaba «Habilidades T» | El aviso del libro se oculta de verdad al cambiar de vista (`[hidden]`) |
| La mecánica tenía ~30 palabras fijas en 3 columnas (Generar / Descargar / Pérdida) además del texto: párrafo permanente | Columnas al **tooltip** (al pasar por el texto o la barra). Quedan 2 líneas, la barra en demo y las píldoras de nodos |
| El tooltip flotante del nodo repetía la misma descripción que el inspector del panel | Tooltip **compacto**: solo nombre, tipo y rango, más «Habilidades que toca». Sin habilidades que mostrar, no hay tooltip |
| El aviso de especialización tenía una fila «±» vacía (no entraba ni salía ninguna activa aparte de la insignia) | La fila solo aparece si hay entradas o salidas |
| La barra de mecánica salía vacía («El brasero está frío», 0) en la captura a 1920 | Las capturas posan la demo en una fase con contenido (`seekNode`) y se toman en tiempo real |

**Vista de talentos · refutación 2** (sobre `t2_*.png`)

| Crítica | Cambio |
|---|---|
| El aviso de especialización, arriba a la derecha, **tapaba el nodo clave y la cabecera del árbol nuevo**, justo lo que el jugador quiere ver tras cambiar | Pasa a una **tira de una línea abajo, sobre la leyenda**: emblema · `3` vieja → nueva · ± · ★ iconos · ▮ mecánica · `T` |
| A 1366 el inspector cortaba la descripción del nodo clave a media línea | Se recorta a 2 líneas con «…», y el tooltip del nodo trae el texto entero cuando es largo |
| (Al verificar) Las activas de talento ahora salen en el libro: con 4 casillas, «Defensa · utilidad» empujaba «Definitiva» fuera del libro a 1366 | «Defensa · utilidad» ocupa todo el ancho y «Especialización» y «Definitiva» comparten fila |

No se hizo una tercera ronda.

---

## 5. Assets para Codex

**Flujo** (el de `IntentoRPG-assets/prompts/`):
- Los prompts van a `prompts/forge-<tanda>.txt` y se ejecutan con `codex exec --skip-git-repo-check -s workspace-write -c model_reasoning_effort="low" -i <ref> - < prompts/forge-<tanda>.txt`.
- Los crudos van a `raw/forge/` y luego a `web/forge/` en webp a 128 y 256 px, con `optimize.py`. Hay que verificar los md5 tras cada tanda en paralelo.
- Al repo van a `assets/forge/`, que **no** se precarga en `sw.js` (es caché de arte en tiempo de ejecución, como `assets/talents`). Los `rol_*` y los `forja_*` sí van a `UI_ASSETS`.

**Cabecera común de cada tanda:**

> Lee STYLE.md en la carpeta actual y síguela al pie de la letra: dark fantasy pintado a mano, claroscuro de maestros antiguos, NO fotorrealista, diseños 100 % originales, sin logos ni piezas reconocibles de otras marcas. Usa tu herramienta de generación de imágenes, UNA llamada por imagen. Tras cada imagen, cópiala desde C:\Users\juanm\.codex\generated_images (la más reciente de esta sesión) a la ruta indicada, como PNG, SIN reescalar ni recortar.
>
> Los iconos de VARIANTE son iconos de habilidad (sección «Iconos de habilidad» de STYLE.md): cuadrado 1:1, UN solo motivo central con silueta muy clara y legible a 48 px, fondo #0d0b10 con viñeta, el brillo del elemento como acento, sin texto, sin marco, sin borde y sin marca de agua. Cada uno es una VARIACIÓN del icono base indicado en la columna «Base» (pásalo con -i): mantén su familia (mismo encuadre, luz lateral, paleta del elemento y nivel de detalle) pero con un motivo distinto, de modo que la Variante I y la II de la misma habilidad se distingan de un vistazo entre sí y respecto de la base.
>
> Las piezas de UI (forja_*, rol_*) son vista frontal plana, centradas, con un 6 % de margen libre; TRANSPARENTE = PNG con canal alfa real. Genera primero la n.º 1 de cada tanda y úsala como referencia de estilo. Al terminar responde solo con la lista de rutas creadas. No modifiques nada más.

**Total: 95 imágenes** (86 iconos de variante, 2 por cada una de las 43 habilidades base, y 9 piezas de UI: el sello de Mejora, los sellos I/II y 6 iconos de papel). Son 4 tandas de 24/24/24/23, ≈95 minutos de Codex en serie u ≈25 con las 4 en paralelo.
### Tanda A (24 imágenes)

Referencia `-i`: `web/icons256/g_tajo.webp` (y el icono base de cada fila, que va en la columna «Base»).

| n.º | Archivo (`raw/forge/`) | Final (`web/forge/`) | Base | Prompt |
|---|---|---|---|---|
| 1 | `v_g_tajo_i.png` | 128×128 y 256×256 | `icons256/g_tajo.webp` | VARIANTE «Desgarro» de Tajo (Guerrero): espada curva que abre un tajo del que brotan gotas de sangre carmesí. |
| 2 | `v_g_tajo_ii.png` | 128×128 y 256×256 | `icons256/g_tajo.webp` | VARIANTE «Siega» de Tajo (Guerrero): arco ancho de acero como una guadaña barriendo polvo y chispas en semicírculo. |
| 3 | `v_g_mandoble_i.png` | 128×128 y 256×256 | `icons256/g_mandoble.webp` | VARIANTE «Verdugo» de Mandoble (Guerrero): hoja de mandoble descendiendo sobre un cráneo agrietado con brillo rojo. |
| 4 | `v_g_mandoble_ii.png` | 128×128 y 256×256 | `icons256/g_mandoble.webp` | VARIANTE «Media Luna» de Mandoble (Guerrero): media luna de acero incandescente trazada por un mandoble. |
| 5 | `v_g_embate_i.png` | 128×128 y 256×256 | `icons256/g_embate.webp` | VARIANTE «Ojo del Huracán» de Embate (Guerrero): remolino de polvo y acero que succiona hacia un centro luminoso. |
| 6 | `v_g_embate_ii.png` | 128×128 y 256×256 | `icons256/g_embate.webp` | VARIANTE «Coraza de Polvo» de Embate (Guerrero): torso de armadura envuelto en un anillo de polvo y piedras girando. |
| 7 | `v_torbellino_i.png` | 128×128 y 256×256 | `icons256/torbellino.webp` | VARIANTE «Vendaval de Acero» de Torbellino (Guerrero): guerrero girando dentro de un tornado de hojas de acero, vista cenital. |
| 8 | `v_torbellino_ii.png` | 128×128 y 256×256 | `icons256/torbellino.webp` | VARIANTE «Ciclón» de Torbellino (Guerrero): espiral de viento gris que arrastra siluetas de enemigos hacia dentro. |
| 9 | `v_g_hendidura_i.png` | 128×128 y 256×256 | `icons256/g_hendidura.webp` | VARIANTE «Rompefilas» de Hendidura (Guerrero): hacha que parte en dos un escudo de torre con estallido de astillas. |
| 10 | `v_g_hendidura_ii.png` | 128×128 y 256×256 | `icons256/g_hendidura.webp` | VARIANTE «Grieta» de Hendidura (Guerrero): tajo de hacha que abre una grieta brillante en el suelo de piedra. |
| 11 | `v_g_martillo_i.png` | 128×128 y 256×256 | `icons256/g_martillo.webp` | VARIANTE «Martillo Arrojadizo» de Martillo de Guerra (Guerrero): martillo de guerra girando en el aire dejando una estela dorada en arco. |
| 12 | `v_g_martillo_ii.png` | 128×128 y 256×256 | `icons256/g_martillo.webp` | VARIANTE «Temblor» de Martillo de Guerra (Guerrero): martillo clavado en el suelo con anillos concéntricos de roca levantándose. |
| 13 | `v_terremoto_i.png` | 128×128 y 256×256 | `icons256/terremoto.webp` | VARIANTE «Grieta Abierta» de Terremoto (Guerrero): falla en la tierra con magma tenue y polvo flotando. |
| 14 | `v_terremoto_ii.png` | 128×128 y 256×256 | `icons256/terremoto.webp` | VARIANTE «Sacudida Circular» de Terremoto (Guerrero): anillo de rocas alzándose en círculo alrededor de un punto central. |
| 15 | `v_g_lanza_i.png` | 128×128 y 256×256 | `icons256/g_lanza.webp` | VARIANTE «Arpón» de Lanza Arrojadiza (Guerrero): arpón con cadena tensa arrastrando hacia el espectador. |
| 16 | `v_g_lanza_ii.png` | 128×128 y 256×256 | `icons256/g_lanza.webp` | VARIANTE «Jabalinas» de Lanza Arrojadiza (Guerrero): tres jabalinas en abanico cortando el aire con estelas blancas. |
| 17 | `v_embestida_i.png` | 128×128 y 256×256 | `icons256/embestida.webp` | VARIANTE «Carnero» de Embestida (Guerrero): hombrera con cuernos de carnero embistiendo entre polvo. |
| 18 | `v_embestida_ii.png` | 128×128 y 256×256 | `icons256/embestida.webp` | VARIANTE «Doble Carga» de Embestida (Guerrero): dos siluetas de carga superpuestas con estelas paralelas. |
| 19 | `v_g_salto_i.png` | 128×128 y 256×256 | `icons256/g_salto.webp` | VARIANTE «Impacto Sísmico» de Salto Devastador (Guerrero): botas cayendo sobre un cráter con escombros succionados al centro. |
| 20 | `v_g_salto_ii.png` | 128×128 y 256×256 | `icons256/g_salto.webp` | VARIANTE «Asalto Aéreo» de Salto Devastador (Guerrero): figura en pleno salto con alas de polvo y un reloj de arena roto. |
| 21 | `v_g_piel_i.png` | 128×128 y 256×256 | `icons256/g_piel.webp` | VARIANTE «Espinas» de Piel de Hierro (Guerrero): brazo acorazado cubierto de púas de hierro con chispas de rebote. |
| 22 | `v_g_piel_ii.png` | 128×128 y 256×256 | `icons256/g_piel.webp` | VARIANTE «Bastión» de Piel de Hierro (Guerrero): yelmo de hierro macizo con un aura azul acero inamovible. |
| 23 | `v_g_provocacion_i.png` | 128×128 y 256×256 | `icons256/g_provocacion.webp` | VARIANTE «Desafío» de Provocación (Guerrero): guerrero rugiendo con ondas rojas en círculo y ojos enemigos girándose. |
| 24 | `v_g_provocacion_ii.png` | 128×128 y 256×256 | `icons256/g_provocacion.webp` | VARIANTE «Humillar» de Provocación (Guerrero): guantelete señalando a un enemigo marcado con una diana rota. |

### Tanda B (24 imágenes)

Referencia `-i`: `web/icons256/grito_guerra.webp` (y el icono base de cada fila, que va en la columna «Base»).

| n.º | Archivo (`raw/forge/`) | Final (`web/forge/`) | Base | Prompt |
|---|---|---|---|---|
| 1 | `v_grito_guerra_i.png` | 128×128 y 256×256 | `icons256/grito_guerra.webp` | VARIANTE «Grito de Batalla» de Grito de Guerra (Guerrero): boca abierta de un casco con fuego rojo saliendo como rugido. |
| 2 | `v_grito_guerra_ii.png` | 128×128 y 256×256 | `icons256/grito_guerra.webp` | VARIANTE «Grito Intimidante» de Grito de Guerra (Guerrero): ondas de sonido oscuras que hacen retroceder sombras con garras. |
| 3 | `v_g_u_furia_i.png` | 128×128 y 256×256 | `icons256/g_u_furia.webp` | VARIANTE «Sed de Batalla» de Furia Inmortal (Guerrero): corazón de hierro rodeado de llamas rojas que absorbe hilos de sangre. |
| 4 | `v_g_u_furia_ii.png` | 128×128 y 256×256 | `icons256/g_u_furia.webp` | VARIANTE «Frenesí» de Furia Inmortal (Guerrero): dos hachas cruzadas vibrando con estelas rojas múltiples. |
| 5 | `v_g_u_cataclismo_i.png` | 128×128 y 256×256 | `icons256/g_u_cataclismo.webp` | VARIANTE «Juicio» de Cataclismo (Guerrero): una sola columna de luz dorada perforando el suelo desde el cielo. |
| 6 | `v_g_u_cataclismo_ii.png` | 128×128 y 256×256 | `icons256/g_u_cataclismo.webp` | VARIANTE «Lluvia Sagrada» de Cataclismo (Guerrero): decenas de pequeñas estrellas doradas cayendo en un círculo amplio. |
| 7 | `v_g_u_estandarte_i.png` | 128×128 y 256×256 | `icons256/g_u_estandarte.webp` | VARIANTE «Pendón Carmesí» de Estandarte de Guerra (Guerrero): estandarte rojo sangre ondeando con un filo dorado. |
| 8 | `v_g_u_estandarte_ii.png` | 128×128 y 256×256 | `icons256/g_u_estandarte.webp` | VARIANTE «Baluarte» de Estandarte de Guerra (Guerrero): estandarte azul acero clavado en un muro de escudos. |
| 9 | `v_m_dardo_i.png` | 128×128 y 256×256 | `icons256/m_dardo.webp` | VARIANTE «Saeta Ígnea» de Dardo Arcano (Maga): dardo de fuego naranja con estela de brasas. |
| 10 | `v_m_dardo_ii.png` | 128×128 y 256×256 | `icons256/m_dardo.webp` | VARIANTE «Saeta Gélida» de Dardo Arcano (Maga): dardo de hielo cristalino con escarcha blanca. |
| 11 | `v_m_ascua_i.png` | 128×128 y 256×256 | `icons256/m_ascua.webp` | VARIANTE «Ascua Saltarina» de Ascua (Maga): brasa rebotando en zigzag dejando chispas. |
| 12 | `v_m_ascua_ii.png` | 128×128 y 256×256 | `icons256/m_ascua.webp` | VARIANTE «Carbón Encendido» de Ascua (Maga): carbón al rojo vivo con grietas incandescentes. |
| 13 | `v_m_toque_i.png` | 128×128 y 256×256 | `icons256/m_toque.webp` | VARIANTE «Congelación» de Toque Gélido (Maga): mano que congela una silueta en un bloque de hielo. |
| 14 | `v_m_toque_ii.png` | 128×128 y 256×256 | `icons256/m_toque.webp` | VARIANTE «Mordisco Glacial» de Toque Gélido (Maga): fauces de hielo con colmillos cristalinos. |
| 15 | `v_bola_fuego_i.png` | 128×128 y 256×256 | `icons256/bola_fuego.webp` | VARIANTE «Pirodardo» de Bola de Fuego (Maga): flecha de fuego comprimida y veloz, estela fina y blanca en el núcleo. |
| 16 | `v_bola_fuego_ii.png` | 128×128 y 256×256 | `icons256/bola_fuego.webp` | VARIANTE «Racimo» de Bola de Fuego (Maga): bola de fuego partiéndose en tres brasas menores. |
| 17 | `v_rayo_i.png` | 128×128 y 256×256 | `icons256/rayo.webp` | VARIANTE «Rayo en Cadena» de Rayo (Maga): rayo violeta saltando entre cuatro puntos. |
| 18 | `v_rayo_ii.png` | 128×128 y 256×256 | `icons256/rayo.webp` | VARIANTE «Haz Concentrado» de Rayo (Maga): haz recto de energía arcana muy concentrado con anillos. |
| 19 | `v_nova_hielo_i.png` | 128×128 y 256×256 | `icons256/nova_hielo.webp` | VARIANTE «Corazón de Hielo» de Nova de Hielo (Maga): corazón de cristal de hielo dentro de una coraza helada. |
| 20 | `v_nova_hielo_ii.png` | 128×128 y 256×256 | `icons256/nova_hielo.webp` | VARIANTE «Nova Fracturante» de Nova de Hielo (Maga): onda de hielo agrietando una silueta congelada. |
| 21 | `v_meteoro_i.png` | 128×128 y 256×256 | `icons256/meteoro.webp` | VARIANTE «Lluvia de Meteoritos» de Meteoro (Maga): tres meteoritos pequeños cayendo en diagonal. |
| 22 | `v_meteoro_ii.png` | 128×128 y 256×256 | `icons256/meteoro.webp` | VARIANTE «Meteoro Ancestral» de Meteoro (Maga): meteoro colosal de roca negra con núcleo de lava. |
| 23 | `v_m_paso_escarcha_i.png` | 128×128 y 256×256 | `icons256/m_paso_escarcha.webp` | VARIANTE «Paso Doble» de Paso de Escarcha (Maga): dos huellas de escarcha luminosas consecutivas. |
| 24 | `v_m_paso_escarcha_ii.png` | 128×128 y 256×256 | `icons256/m_paso_escarcha.webp` | VARIANTE «Prisión Fugaz» de Paso de Escarcha (Maga): pies atrapados por cristales de hielo que brotan del suelo. |

### Tanda C (24 imágenes)

Referencia `-i`: `web/icons256/m_estela_ignea.webp` (y el icono base de cada fila, que va en la columna «Base»).

| n.º | Archivo (`raw/forge/`) | Final (`web/forge/`) | Base | Prompt |
|---|---|---|---|---|
| 1 | `v_m_estela_ignea_i.png` | 128×128 y 256×256 | `icons256/m_estela_ignea.webp` | VARIANTE «Senda de Llamas» de Estela Ígnea (Maga): camino ancho de llamas altas en perspectiva. |
| 2 | `v_m_estela_ignea_ii.png` | 128×128 y 256×256 | `icons256/m_estela_ignea.webp` | VARIANTE «Fénix» de Estela Ígnea (Maga): ave de fuego naciendo de las cenizas. |
| 3 | `v_m_armadura_i.png` | 128×128 y 256×256 | `icons256/m_armadura.webp` | VARIANTE «Armadura Reactiva» de Armadura de Hielo (Maga): coraza de hielo estallando en esquirlas hacia fuera. |
| 4 | `v_m_armadura_ii.png` | 128×128 y 256×256 | `icons256/m_armadura.webp` | VARIANTE «Coraza Arcana» de Armadura de Hielo (Maga): coraza de hielo con runas violeta brillando. |
| 5 | `v_m_onda_i.png` | 128×128 y 256×256 | `icons256/m_onda.webp` | VARIANTE «Implosión» de Onda Repulsora (Maga): esfera arcana que succiona fragmentos hacia su centro. |
| 6 | `v_m_onda_ii.png` | 128×128 y 256×256 | `icons256/m_onda.webp` | VARIANTE «Escudo Repulsor» de Onda Repulsora (Maga): burbuja arcana violeta repeliendo garras. |
| 7 | `v_m_u_supernova_i.png` | 128×128 y 256×256 | `icons256/m_u_supernova.webp` | VARIANTE «Sol Errante» de Supernova (Maga): pequeño sol orbitando sobre la cabeza de una maga. |
| 8 | `v_m_u_supernova_ii.png` | 128×128 y 256×256 | `icons256/m_u_supernova.webp` | VARIANTE «Colapso» de Supernova (Maga): estrella implosionando en un punto blanco cegador. |
| 9 | `v_m_u_tormenta_i.png` | 128×128 y 256×256 | `icons256/m_u_tormenta.webp` | VARIANTE «Ventisca Anclada» de Tormenta Glacial (Maga): remolino de nieve anclado a un cristal clavado en el suelo. |
| 10 | `v_m_u_tormenta_ii.png` | 128×128 y 256×256 | `icons256/m_u_tormenta.webp` | VARIANTE «Granizo» de Tormenta Glacial (Maga): piedras de granizo afiladas cayendo en columna. |
| 11 | `v_m_u_desgarro_i.png` | 128×128 y 256×256 | `icons256/m_u_desgarro.webp` | VARIANTE «Brecha» de Desgarro Arcano (Maga): grieta dimensional violeta abriéndose en línea recta. |
| 12 | `v_m_u_desgarro_ii.png` | 128×128 y 256×256 | `icons256/m_u_desgarro.webp` | VARIANTE «Singularidad» de Desgarro Arcano (Maga): agujero negro violeta con anillo de acreción. |
| 13 | `v_a_disparo_i.png` | 128×128 y 256×256 | `icons256/a_disparo.webp` | VARIANTE «Ojo Fijo» de Disparo Rápido (Arquera): ojo de halcón con una retícula dorada superpuesta. |
| 14 | `v_a_disparo_ii.png` | 128×128 y 256×256 | `icons256/a_disparo.webp` | VARIANTE «Flecha Partida» de Disparo Rápido (Arquera): flecha que se divide en dos al chocar. |
| 15 | `v_a_disperso_i.png` | 128×128 y 256×256 | `icons256/a_disperso.webp` | VARIANTE «Ráfaga Cerrada» de Disparo Disperso (Arquera): tres flechas paralelas muy juntas apuntando al centro. |
| 16 | `v_a_disperso_ii.png` | 128×128 y 256×256 | `icons256/a_disperso.webp` | VARIANTE «Metralla» de Disparo Disperso (Arquera): flechas romas estallando en esquirlas de madera. |
| 17 | `v_a_cicuta_i.png` | 128×128 y 256×256 | `icons256/a_cicuta.webp` | VARIANTE «Contagio» de Flecha de Cicuta (Arquera): calavera verde soltando esporas hacia dos lados. |
| 18 | `v_a_cicuta_ii.png` | 128×128 y 256×256 | `icons256/a_cicuta.webp` | VARIANTE «Parálisis» de Flecha de Cicuta (Arquera): serpiente verde enroscada alrededor de una pierna. |
| 19 | `v_flecha_perforante_i.png` | 128×128 y 256×256 | `icons256/flecha_perforante.webp` | VARIANTE «Flecha Explosiva» de Flecha Perforante (Arquera): punta de flecha con carga de pólvora estallando. |
| 20 | `v_flecha_perforante_ii.png` | 128×128 y 256×256 | `icons256/flecha_perforante.webp` | VARIANTE «Tiro de Precisión» de Flecha Perforante (Arquera): arco tensado al máximo con la flecha brillando en la punta. |
| 21 | `v_flecha_multiple_i.png` | 128×128 y 256×256 | `icons256/flecha_multiple.webp` | VARIANTE «Lluvia Arqueada» de Flecha Múltiple (Arquera): flechas en arco parabólico cayendo sobre un círculo. |
| 22 | `v_flecha_multiple_ii.png` | 128×128 y 256×256 | `icons256/flecha_multiple.webp` | VARIANTE «Puntas de Espino» de Flecha Múltiple (Arquera): flechas con puntas de espino verde goteando veneno. |
| 23 | `v_lluvia_flechas_i.png` | 128×128 y 256×256 | `icons256/lluvia_flechas.webp` | VARIANTE «Aguacero» de Lluvia de Flechas (Arquera): columna densa de flechas cayendo en un punto. |
| 24 | `v_lluvia_flechas_ii.png` | 128×128 y 256×256 | `icons256/lluvia_flechas.webp` | VARIANTE «Cortina» de Lluvia de Flechas (Arquera): muro de flechas clavadas formando una barrera. |

### Tanda D (23 imágenes)

Referencia `-i`: `web/icons256/a_paso.webp` (y el icono base de cada fila, que va en la columna «Base»).

| n.º | Archivo (`raw/forge/`) | Final (`web/forge/`) | Base | Prompt |
|---|---|---|---|---|
| 1 | `v_a_paso_i.png` | 128×128 y 256×256 | `icons256/a_paso.webp` | VARIANTE «Rodar y Disparar» de Paso Veloz (Arquera): arquera rodando mientras dispara una flecha. |
| 2 | `v_a_paso_ii.png` | 128×128 y 256×256 | `icons256/a_paso.webp` | VARIANTE «Voltereta Trampa» de Paso Veloz (Arquera): abrojo de hierro con púas sobre hojas secas. |
| 3 | `v_agilidad_i.png` | 128×128 y 256×256 | `icons256/agilidad.webp` | VARIANTE «Ojo de Halcón» de Agilidad (Arquera): cabeza de halcón con ojo dorado brillante. |
| 4 | `v_agilidad_ii.png` | 128×128 y 256×256 | `icons256/agilidad.webp` | VARIANTE «Bruma» de Agilidad (Arquera): silueta difuminada entre jirones de niebla. |
| 5 | `v_a_red_i.png` | 128×128 y 256×256 | `icons256/a_red.webp` | VARIANTE «Red de Púas» de Red de Caza (Arquera): red de cuerda con púas metálicas y gotas de sangre. |
| 6 | `v_a_red_ii.png` | 128×128 y 256×256 | `icons256/a_red.webp` | VARIANTE «Red de Arrastre» de Red de Caza (Arquera): red cerrándose como un saco sobre varias siluetas. |
| 7 | `v_a_humo_i.png` | 128×128 y 256×256 | `icons256/a_humo.webp` | VARIANTE «Humo Venenoso» de Bomba de Humo (Arquera): nube de humo verde tóxico con burbujas. |
| 8 | `v_a_humo_ii.png` | 128×128 y 256×256 | `icons256/a_humo.webp` | VARIANTE «Desvanecer» de Bomba de Humo (Arquera): capa que se disuelve en humo dejando solo la silueta. |
| 9 | `v_a_u_diluvio_i.png` | 128×128 y 256×256 | `icons256/a_u_diluvio.webp` | VARIANTE «Diluvio Itinerante» de Diluvio de Saetas (Arquera): nube de saetas desplazándose sobre el campo. |
| 10 | `v_a_u_diluvio_ii.png` | 128×128 y 256×256 | `icons256/a_u_diluvio.webp` | VARIANTE «Andanada Final» de Diluvio de Saetas (Arquera): cuatro saetas enormes cayendo en paralelo. |
| 11 | `v_a_u_celeste_i.png` | 128×128 y 256×256 | `icons256/a_u_celeste.webp` | VARIANTE «Constelación» de Tiro Celestial (Arquera): cinco haces de luz azul en abanico como constelación. |
| 12 | `v_a_u_celeste_ii.png` | 128×128 y 256×256 | `icons256/a_u_celeste.webp` | VARIANTE «Disparo Estelar» de Tiro Celestial (Arquera): un haz de luz blanca y azul gigantesco con anillo estelar. |
| 13 | `v_a_u_zarzas_i.png` | 128×128 y 256×256 | `icons256/a_u_zarzas.webp` | VARIANTE «Jardín Espinoso» de Cerco de Zarzas (Arquera): campo amplio de zarzas con flores venenosas. |
| 14 | `v_a_u_zarzas_ii.png` | 128×128 y 256×256 | `icons256/a_u_zarzas.webp` | VARIANTE «Jaula» de Cerco de Zarzas (Arquera): jaula de raíces y espinas cerrándose. |
| 15 | `forja_mejora.png` | 64×64 (2×) | — | TRANSPARENTE. Sello pequeño de mejora: un diamante tallado de oro viejo con una chispa blanca en el centro, como un remache de joyero; se superpone a la esquina de un icono de habilidad. Silueta clara a 20 px. |
| 16 | `forja_sello_i.png` | 64×64 (2×) | — | TRANSPARENTE. Medallón redondo de oro viejo con UNA sola barra vertical en relieve (numeral romano uno sin letras tipográficas, solo una barra grabada), borde de cuerda trenzada. |
| 17 | `forja_sello_ii.png` | 64×64 (2×) | — | TRANSPARENTE. El mismo medallón de oro viejo con DOS barras verticales en relieve (numeral romano dos, solo barras grabadas), borde de cuerda trenzada; idéntico al de una barra salvo las marcas. |
| 18 | `rol_uni.png` | 48×48 (2×) | — | TRANSPARENTE. Icono plano de rol «un objetivo»: una diana de metal envejecido con una sola punta de flecha clavada en el centro; dorado #e8c06a. |
| 19 | `rol_area.png` | 48×48 (2×) | — | TRANSPARENTE. Icono plano de rol «área»: tres ondas concéntricas de explosión que se abren desde un punto; dorado #e8c06a. |
| 20 | `rol_control.png` | 48×48 (2×) | — | TRANSPARENTE. Icono plano de rol «control»: grillete de hierro abierto con una cadena corta; dorado #e8c06a. |
| 21 | `rol_aguante.png` | 48×48 (2×) | — | TRANSPARENTE. Icono plano de rol «aguante»: escudo redondo abollado con un corazón grabado; dorado #e8c06a. |
| 22 | `rol_apoyo.png` | 48×48 (2×) | — | TRANSPARENTE. Icono plano de rol «apoyo»: estandarte pequeño con dos manos entrelazadas grabadas; dorado #e8c06a. |
| 23 | `rol_movilidad.png` | 48×48 (2×) | — | TRANSPARENTE. Icono plano de rol «movilidad»: bota alada estilizada con tres líneas de velocidad; dorado #e8c06a. |

---

## 6. Plan de implementación

Lo orquesta el modelo principal (planifica, juzga los diffs y manda a corregir). Los trabajadores son Opus para implementar y Sonnet para lo mecánico. Ningún archivo lo tocan dos trabajadores a la vez.

| Etapa | Trabajadores (modelo) | Archivos (propiedad exclusiva) | Entrega |
|---|---|---|---|
| **E0 · Núcleo de la forja** (bloquea al resto) | 1 · Opus | `js/skill-defs.js` (vocabulario `set/add/elem/power/behavior/pull/knock/charges/killReset/shieldGain`, `validateForge`), `js/skill-resolve.js` (`forgeDef` + paso 2 nuevo), `js/game-skills.js` (pull/knock con `Enemy.displace`, cargas, killReset, shieldGain), `js/entities.js` (`Enemy.displace`, `cds` con cargas), `js/save-schema.js` (v5), `js/hud-model.js` (`forgeView(p, sk)` puro), `tests/test-forge-core.mjs` | Las ramas antiguas siguen funcionando detrás de `SKILL_MODS` hasta E1. Tests en verde |
| **E1 · Catálogo por clase** (en paralelo) | 3 · Opus (uno por clase) | `js/skills-<clase>.js` (`<CLASE>_SKILL_FORGE` + `LEGACY_FORGE_MAP`), `js/powers-<clase>.js` (poderes `v_*`), `js/fx-skills-<clase>.js` (VFX de los cambios de forma), `tests/test-forge-<clase>.mjs` | 43 forjas, F7 en verde, catálogo validado |
| **E1b · Banco** (en paralelo con E1) | 1 · Opus | `tests/balance-bench.mjs` (ÁREA×5 y CONTROL reales), `tests/forge-bench.mjs` (matriz variante × escenario, F1–F9, `--report`) | Informe de la matriz |
| **E2 · Interfaz** (en paralelo con E1, contra `forgeView`) | 1 · Opus | **`js/ui-skills.js` nuevo** (libro, forja, tooltip, arrastre, engarces; como `ui-talents.js`), `css/skills.css`, `index.html` (marcado del panel). En `js/ui.js` **solo** se sustituyen `renderSkills`/`renderSkillFocus`/`renderBookBar` por una delegación de 10 líneas | El panel del mockup, `?skillscheck=1` (cajas y solapes) |
| **E3 · Arte y calibración** | Codex (4 tandas) + 1 · Sonnet (optimizar y copiar) + 1 · Opus (números) | `IntentoRPG-assets/*`, `assets/forge/`, `sw.js` (`UI_ASSETS` y `VERSION`); los números de `skills-<clase>.js` tras E1 | Iconos en el juego, F1–F9 en verde |
| **E4 · Cierre** | modelo principal (juicio) + 1 · Sonnet | `MEMORIA.md` (Paso 2f ✅), `CLAUDE.md` (mapa), `test43-mixins` si hay mixin, `sw.js` | `npm test` en verde, capturas antes/después, push a las 2 ramas |

**Migración de guardado v4 → v5** (`MIGRATIONS[4]`, idempotente y sobre una copia):
1. `skillForge = {}`. Para cada `skillId` con `skillMods[skillId]`: se toma la opción elegida en la **3.ª rama** (Transformación o Variante) y se traduce con `LEGACY_FORGE_MAP[skillId][optId] → 'i' | 'ii'`. La mantiene cada trabajador de clase. El criterio es el papel: DoT/zona/radio → ÁREA, Vulnerable/ejecutar/perforar → UNI, aturdir/ralentizar → CONTROL. Si no hay correspondencia, `null` (sin variante; la casilla mostrará el anillo de «por elegir»).
2. Se borran `skillMods`, `skillBranches` y `skillPoints` de `PLAYER_SAVE_FIELDS`. Ya no se reembolsa nada porque no hay puntos.
3. `supports`: se recalcula `supportFits` con la definición forjada. Lo que no encaje se desengarza y vuelve a `knownSupports`.
4. Al cargar sale un aviso único: «Las ramas ahora son variantes: elige gratis en el libro (T)».
5. Test `tests/test-save-v5.mjs`: un guardado v4 con ramas de las 3 clases → v5 con las variantes esperadas, sin campos antiguos, idempotente (dos pasadas = mismo resultado) y con la barra intacta.

**Criterios de aceptación (verificables).**

| # | Criterio | Cómo se comprueba |
|---|---|---|
| A1 | Las 43 habilidades base tienen Mejora + 2 variantes, con ids únicos `<id>_m/_i/_ii`, `line` ≤ 70 caracteres y `role` válido | `test-forge-core` (`validateForge`) |
| A2 | Ninguna entrada es un no-op (F7) | `test-forge-<clase>`: el perfil cambia, el poder o comportamiento está registrado, o hay Δ del banco ≥ 1 % |
| A3 | F1–F9 en verde | `node tests/forge-bench.mjs` (afirma) |
| A4 | Elegir variante ≤ 2 clics, equipar ≤ 1 gesto, sin diálogos de confirmación | Test de UI headless con `?dev`: simular clics sobre `ui-skills` y contar eventos hasta que cambia `p.skillForge` |
| A5 | Sin solapes ni desbordes a 1920 × 1080 y 1366 × 768. El tooltip queda siempre dentro de la pantalla y no tapa la tarjeta hermana | `?skillscheck=1` vuelca las cajas (como `?hudcheck=1`) y se comparan las capturas con las del mockup |
| A6 | En combate no se puede cambiar de variante ni de engarce; fuera de combate es gratis | `test-forge-core` con `canRespecFree` |
| A7 | La migración v4→v5 es correcta e idempotente | `test-save-v5` |
| A8 | Assets: cada `icon` de la forja existe en `assets/forge/` y los `rol_*`/`forja_*` están en `UI_ASSETS` | Extensión de `test71` |
| A9 | Sin `powers.has(` fuera de `powers*.js`. Los poderes `v_*` llevan prefijo de clase o `v_` | `test67` / `test65a` |
| A10 | `npm test` en verde y `balance-bench` sin regresiones del Paso 2b.2 | CI local |

---

## 7. Refutación del diseño (y correcciones aplicadas)

1. **Quitar los puntos elimina la decisión de asignar y el premio por nivel.**
   - *Respuesta:* hoy la decisión no existe (19 puntos para ~15 ramas, §1.3.8) y cuesta 2 clics con confirmación. El premio se mantiene con el calendario de §2.2: casi todos los niveles 1–22 traen algo, con aviso y punto verde.
   - *Corrección aplicada:* el Nv8, el 14, el 15 y el 18 concentran 3–5 novedades. El aviso las **agrupa** en una sola tarjeta («Nivel 8: 3 novedades») que abre el libro en la primera, para no tapar el combate con una lluvia de avisos.
2. **Coste de contenido y de balance: 129 entradas, 24 poderes y 7 comportamientos.**
   - *Respuesta:* **86 de las 129 no necesitan código nuevo** (solo claves existentes, `set`, `add` o `elem`). Las 43 restantes necesitan un poder, un comportamiento o una primitiva (`pull`, `charges`…).
   - *Corrección aplicada:*
     - **Alcance por fases.** E1 entrega primero básicos y gastadoras (22 habilidades, 66 entradas). Movilidad, defensa y definitivas entran en una E1′ si E1b muestra que el banco aguanta.
     - **Tope de 3 comportamientos nuevos por clase en v1.** Los que sobren (Sol Errante, Diluvio Itinerante) se sustituyen por `set` (p. ej. Sol Errante → `pulses:4` sin seguimiento) hasta tener tiempo.
3. **Choque con los talentos.** Una variante puede anular el talento en el que alguien invirtió (Abrojos en una Lluvia de 2 m, Calibre Pesado en una Flecha Explosiva).
   - *Corrección aplicada:*
     - La tabla de choques de §2.5 es la regla «ortogonal».
     - Los mods de talento por id se aplican a las dos variantes.
     - El tooltip con `Alt` lista los talentos que tocan la habilidad.
     - F1 se mide **con el preset de talentos de cada especialización**, no en vacío: una variante que solo gana sin talentos es una trampa para quien los tiene.
4. **Carga cognitiva.** Se suman 2 variantes × 6 ranuras + 2 árboles de talento + soportes + especialización + paragon.
   - *Respuesta:* la forja **sustituye** a las ramas (9 opciones → 2) y la Mejora no pide nada.
   - *Corrección aplicada:*
     - El botón **«Recomendado»** aplica las variantes sugeridas para la especialización.
     - Las variantes se abren **de dos en dos**, en el calendario.
     - Las tarjetas de variante muestran el papel con glifo y palabra: se elige por intención («quiero área») sin leer números.
5. **Profundidad para el endgame.** A Nv50 todo está abierto y una elección binaria por habilidad se queda corta.
   - *Corrección aplicada:* se dejan **ganchos**, no sistemas nuevos en 2f.
     - **Paso 4 (objetos):** «aspectos» legendarios que modifican **una variante concreta** (p. ej. «Racimo suelta 5 brasas»). Así se evita el problema de Lost Ark de bonificaciones de equipo que no se aplican si no elegiste esa rama, porque el tooltip del objeto dice qué variante pide.
     - **Los soportes** (2 engarces) siguen siendo la capa de afinado.
     - **Los poderes `v_*`** tienen `state` para que el Paso 4 pueda subirlos de rango.
   - No se añade una tercera variante: rompería F1.
6. **El balance de las variantes que cambian de forma** (Vendaval canalizado, Haz Concentrado, Martillo Arrojadizo) choca con las reglas del canal: GCD, «una acción por frame» y cesión del básico a 🖱️Der.
   - *Corrección aplicada:* toda variante que cambie `type` a `channel` o `proj` pasa por el canal genérico ya probado (`startChannel`, `fireProjectile`). F9 se comprueba **con la variante puesta** para la barra del banco (regla de los dos botones de `simulate(..., { buttons: true })`).
7. **Cambiar de elemento rompe identidades** (el Arcanista que pierde Cargas con Saeta Ígnea).
   - *Respuesta:* es una contrapartida legítima, como la Hidra de Hielo de D4.
   - *Corrección aplicada:*
     - El tooltip muestra los tags tachados y añadidos.
     - «Recomendado» nunca propone una variante que apague el indicador de la especialización activa.
     - Test: para cada especialización, el preset de variantes recomendado conserva la generación de su indicador (`gaugeGain`).
8. **Bajar la potencia total.** Sin Quebrantar ni Furibundo, el héroe óptimo del banco pierde DPS: el «óptimo» de hoy usaba ramas y su preferencia elegía `dmg ≥ 40` y `vuln`.
   - *Corrección aplicada:*
     - E3 recalibra la elección del óptimo en `buildHero`: la mejor variante por escenario según la matriz.
     - Se exige que `ratio` óptimo/típico siga en `[1,3; 15]`.
     - El **típico** del banco pasa a llevar Mejoras: son automáticas, así que el típico Nv50 las tiene. Es un cambio de referencia que se documenta en `MEMORIA.md` con una tabla antes/después, como en el Paso 2b.2.
