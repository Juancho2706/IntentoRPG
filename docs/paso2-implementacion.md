# Paso 2 · Plan de implementación de 2f + 2g (forja, verbos, talentos a Nv100, Paragon) para las tres clases

> Estado: **plan** (no toca código del juego). Fecha: 2026-10-21. Autor: arquitecto (modelo principal), con 5 informes de lectura del código (motor de talentos, motor de habilidades, interfaz, pruebas/banco, datos por clase).
> Insumos: `docs/paso2f-habilidades-ux.md` (libro y forja), `docs/paso2g-maga-coherencia.md` (Maga aprobada: §3, §7, §9–§17), `docs/paso2g-guerrero.md` y `docs/paso2g-arquera.md` (etapa 2; contenido provisional, estructura y verbos firmes), `docs/mockups/skills-ux.html`, `docs/mockups/data/*.js` y su contrato `README-talents-v2.md`, `CLAUDE.md`, `MEMORIA.md`.
> **Revisión de completitud** (2026-10-21): 25 huecos en «Crítica y huecos», al final. Las correcciones claras ya están en el cuerpo (D23–D28, E0.6, §2.2, §3.6.1, matriz, §3.11, §3.12, §5, §6, §8); quedan 5 decisiones pendientes.
> **Qué manda.** Este plan fija **contratos, vocabulario, dueños de archivo y orden**. Donde los documentos de diseño se contradicen entre sí (nombres de claves de verbos, versión de guardado, dónde vive cada dato), manda este plan (§0). En **contenido** (qué hace cada nodo o variante, números, textos), mandan los documentos de diseño y los datos del mockup.

---

## 0. Decisiones del arquitecto (zanjan contradicciones de los diseños)

| # | Decisión | Por qué | Sustituye a |
|---|---|---|---|
| D1 | **Una sola migración v4 → v5** (`MIGRATIONS[4]`, `SAVE_VERSION = 5`) que hace forja + talentos + kits de las tres clases | La v5 «solo forja» de 2f no existe en código y nunca existirá: su catálogo intermedio (con Ascua, Torbellino, etc.) no se programa. Encadenar v5 y v6 obligaría a mantener un catálogo que nadie juega | 2f §6 (v4→v5), Maga §11 y Guerrero §11.6 (v5→v6), Arquera §11.3 (v6→v7) |
| D2 | `p.cds[id]` **sigue siendo un número**. Las cargas viven en `p.skCharges[id] = { n, max, nextAt }`. Los poderes reducen enfriamientos solo con `g.reduceCooldown(p, id, s)` | Unos 20 sitios escriben `p.cds` | 2f §2.3 (`cds` como `{ t, n }`) |
| D3 | Forja **global por habilidad**: `p.skillForge[skillId] = 'i' \| 'ii' \| null` (`undefined` = nunca elegida). Al cambiar de especialización, la forja recomendada (`reco`) se aplica **solo** a las habilidades nunca elegidas | Los kits de especialización tienen ids propios; el kit base es común a las tres | Duda abierta de 2g §9.3 |
| D4 | El árbol héroe se guarda **por especialización**: `talents.hero[specId] = { tree, nodes:{ treeId:{…} }, choice:{ treeId:{…} } }` | Dos especializaciones comparten árbol; con un `choice` único se pisarían | Maga §11.3 (`talents.hero` único) |
| D5 | Árboles héroe en **`js/hero-<clase>.js`** (exporta `<CLASE>_HERO`), importado **solo** por `js/talents-<clase>.js` (campo `hero`) | Archivo propio para el trabajo y el gancho de fixtures sigue redirigiendo solo `talents-<clase>.js` | Arquera §11.1 (héroe dentro de talents) |
| D6 | Barra, forja recomendada y barra de reserva por especialización viven en **`js/skills-<clase>.js`** (`<CLASE>_SPEC_BAR`, `<CLASE>_FORGE_RECO`, `<CLASE>_FALLBACK_BAR`); `builds` y `defaultBuild` viven en `js/talents-<clase>.js` | Un solo dueño por dato: barra y forja = catálogo; puntos = talentos | Mockup (`specBar` junto a los talentos) |
| D7 | Kit de especialización = habilidades del **catálogo** con `spec:'<id>'`. Ningún nodo concede la insignia. `isKnown` filtra por `p.talents.spec`. Las 6 activas de talento por clase siguen siendo `kind:'talent'`, `slots:['k2']`, con el `req` del catálogo (21/27/31/72) | Diseño 2g (kits de 4 por especialización) | `specInsignia` / grant de `s0` |
| D8 | Moverse mientras preparas, canalizas o cargas: `moveMul` por habilidad, **por defecto 1** (como hoy: el `castLock` no frena). `0` = plantado. `moveFree` desaparece | No cambiar el tacto de todas las habilidades de golpe | `moveFree`, `moveWhileChannel`, `moveSpd`, `windupMove`, `moveWhileCharging` |
| D9 | **Un solo gancho nuevo**, ⑭ `onSkillEnd(g, p, sk, end)`, para el fin de una cadena de relanzar, un canal, una carga, una postura o un combo. «Perfecto» y «paso» van en `CastInfo`/`HitInfo` y se leen en ③ `afterCast` y ⑤ `onHit` | Menos superficie en `powers.js` | `onChainEnd`, `onRelease`, `onPerfect`, `BEHAVIOR_KEYS.release` |
| D10 | **Vocabulario único de verbos** (§3.6). `charge`, `recast` y `seq` son **claves** (se combinan con cualquier tipo); `combo`, `stance` y `wall` son **tipos** | Los docs usan nombres distintos para lo mismo | Alias listados en §3.6 |
| D11 | Se eliminan las **hazañas** (`featCount`) | Rompen «ningún árbol se completa» y «dos finales no caben» | `talents.js` L140-144 |
| D12 | Tablero de glifos: puntos **derivados** (`earnedAt('board', Nv)`: 16 entre el Nv81 y el 100), legendarios **con estadísticas, sin poderes**; reiniciarlo es **gratis fuera de combate** (como talentos y forja) | Diseño 2g §7.5; coherencia de reinicios | `paragon.points` guardado y respec con oro |
| D13 | `LEVEL_MAX = 100` vive en `js/talents.js` (junto a las reglas de puntos) y lo usa `js/progression.js`. `xpForLevel` no cambia. `skillRank` no cambia (topa en 5); E4 decide si se estira | Una sola fuente; sin ciclos de import | — |
| D14 | Etiquetas visibles por categoría en `CAT_LABELS` (`skill-defs.js`): Básica · Principal · Movilidad · Defensa · Utilidad · Insignia · Definitiva. Las claves internas no cambian | G15 | Textos sueltos en `hud-model.js` y `data.js` |
| D15 | Código de build **`IRPG2`** con firma de versión del árbol y checksum (§3.10). Un `IRPG1` da «código de una versión anterior». El `codeOf` del mockup **no** se toca | El del mockup es ambiguo y sin checksum | `codeOf` del mockup |
| D16 | `MIGRATIONS[3]` (v3→v4) se **congela**: deja de usar el catálogo vivo (`LEGACY_INSIGNIA` estático, copia v1 sin purgar). Luego `MIGRATIONS[4]` rehace los talentos | Con los datos nuevos su salida cambiaría (k3 = `null`) | — |
| D17 | **Sin bandera de función.** Todo vive en la rama `paso2-impl` y se publica junto en E5. Entre E1.5 y E3 la UI del juego puede estar rota en el navegador; los tests no | La migración de guardado va en un solo sentido | — |
| D18 | Guerrero y Arquera: se **congela un commit** de sus datos del mockup antes de su E2. Lo que cambie después entra por el conversor (el test de paridad lo detecta) | Otro agente aún los termina | — |
| D19 | `@spec` = **kit de la especialización activa** (habilidades con `sk.spec`). Prohibido en el árbol de clase (G1). `spec.elem` pasa a ser explícito | El elemento ya no se deduce de la insignia | `specElem` por insignia de `s0` |
| D20 | El estado **plantado** (`p.planted`) lo calcula `Player.update`: 1 s sin caminar ni usar movilidad | Guardián y Francotiradora | — |
| D21 | **Cuarentena de suites**: `tests/pending-2g.json` lista suites que `tests/run.mjs` salta (con aviso y dueño). Al cierre (E5) debe estar **vacía** | Mantener `npm test` en verde en la rama mientras se conmutan datos | — |
| D22 | El chip de verbo del libro se **deriva** de la definición (`skillVerbs(def)` en `skill-defs.js`); no hay campo `verb` a mano | Una sola fuente | Propuesta de la Arquera §16.2.2 |
| D23 | **Exports retirados = stubs `@deprecated`** hasta que su último importador cambie: `SKILL_MODS`, `aggregateSkillMods`, `<CLASE>_SKILL_MODS`, `chooseSkillMod`, `TALENT_START_LEVEL` (= `TALENT_RULES.specAt`), `specInsignia` (→ `null`), `PARAGON_BOARD`, `presetList`/`presetRanks`. C1 los borra en E5 con `grep` vacío | Un `import { X }` de un export que ya no existe rompe el grafo de módulos: el juego **no arranca** (hoy los importan `ui.js`, `entities.js`, `save-schema.js`, `game-skills.js`, `balance-bench` y 8 suites) | «Fuera X» en W1/W2 |
| D24 | **Stubs y registro antes de E1** (E0.6): todo archivo nuevo de §2.1 nace vacío con sus exports de §3 y su ruta en `sw.js` `ASSETS` | `test71` exige que **cada** `js/*.js` y `css/*.css` esté en `sw.js`; y W1 importa de `data.js` lo que crea W2 (`SPEC_BAR`, `FORGE_RECO`): en worktrees paralelos no existiría | Exports vacíos de W2, stubs de W1 |
| D25 | **Colas de W2** también para `combat-math.js` (hasta E4, luego B1), `spec-mechanics.js` (núcleo), `data.js`, `sfx.js` y `fx-skills.js` | Estaban 🔒 sin dueño desde E2 y los necesitan KA/KT (claves `tv` condicionales en `condAddPct`, eventos de verbo en las barras, tonos nuevos) | — |
| D26 | **Feedback de verbos por frame**: `createVerbHud().update(realDt)` lo llama `ui.updateFloats` (cada frame), **no** `updateHUD` (10 Hz). Los **sonidos** de los verbos los emite la simulación (`game-skills.js`) en el instante del borde, con **tonos sintetizados nuevos** en `sfx.js` (datos, no archivos de audio) | A 10 Hz la barra y el aviso llegan hasta 100 ms tarde en una ventana de 200 ms. `sfx.js` no tiene «clang», «tic», cuerda ni cuerno | §7 «solo sonidos existentes» |
| D27 | **Entrada de mantener y soltar** (§3.6.1): `mouseHeld` sale de `e.buttons` (botones acordes); `blur`, abrir un panel o pausar **cancelan sin coste**; el básico tensable repite mientras se mantiene | Con Pointer Events, pulsar 🖱️Der con 🖱️Izq ya pulsado **no** dispara `pointerdown`: el Martillo del Cruzado no cargaría nunca mientras ataca | — |
| D28 | **Ids de poder únicos entre clases.** La Maga (`m_`, `a_`) y la Arquera (`m_`, `a_`) comparten prefijos y `definePower` **lanza** con un id repetido: el conversor (E0.4) extrae los `power <id>` de los `impl` de las tres clases y falla si se repiten; `test78` lo afirma sobre los datos del juego | Un choque solo aparecería al fusionar, con el juego entero caído | — |

---

## 1. Resumen y alcance

### 1.1 Qué se programa

1. **Forja 2f** en las tres clases: cada habilidad con forja tiene Mejora (Nv req+3) y dos Variantes (Nv req+6). Desaparecen `skillPoints`, ramas, `SKILL_MODS` y la confirmación. Cambiar es gratis fuera de combate.
2. **Verbos nuevos** en el motor: cargar y soltar con ventana perfecta, relanzar, combo de 3, secuencia del básico, canal con `moveMul`, disparo automático, drenaje y efecto al soltar, posturas, plantado, trampas con armado/cebo/detonación, muros, zonas que te siguen, atraer/empujar, cargas de enfriamiento, vida mínima.
3. **Kits por especialización** (4 por especialización) en el catálogo, con forja; kit base de 5; 6 activas de talento por clase (solo ranura `2`).
4. **Talentos 2g** a Nv100: árbol de clase (30 nodos), tres de especialización (29 cada uno, misma rejilla), tres árboles héroe (13 cada uno) con apertura a 31/31, nodo clave gratis y pausa; puertas nuevas, finales y ápice por rango; 12 builds por clase con «Recomendado»; configuraciones (10 por especialización); deshacer; código `IRPG2`.
5. **Progresión a Nv100**: tope de nivel, un punto por nivel en un solo sistema, avisos por sistema, tablero de glifos con 16 puntos (Nv81–100).
6. **Interfaz**: panel de talentos v2 (3 columnas), libro con forja (tecla `T`), feedback de verbos en la barra y junto al cursor, categorías renombradas.
7. **Migración** v4 → v5 de las tres clases, **banco** (G9, F1–F9) y **cierre**.

### 1.2 Volumen (de los datos del mockup)

| Por clase | Maga | Guerrero | Arquera |
|---|---|---|---|
| Nodos (clase 30 + especialización 3×29 + héroe 3×13) | 156 | 156 | 156 |
| Elecciones A/B (opciones) | 62 (124) | 62 (124) | 62 (124) |
| Habilidades del catálogo (base 5 + kit 12 + talento 6) | 23 | 23 | 23 |
| Entradas de forja (17 habilidades × 3) | 51 | 51 | 51 |
| Builds | 12 | 12 | 12 |
| Efectos marcados `NUEVO` en `impl` | 88 | 130 | 106 |
| Nodos u opciones sin `impl` (se escriben desde el texto) | 48 | 3 | 45 |
| Estado de los datos | aprobado | diseño (etapa 2) | diseño (etapa 2) |

Total: **468 nodos**, **153 entradas de forja**, **más de 320 efectos nuevos** (poderes, `tv` o `mod` nuevos). El mockup **no trae `fx`**: solo nombre, texto, forma y una nota `impl`. La transcripción estructural es automática (§4); los efectos se escriben a mano.

### 1.3 Lo que ya existe y se reutiliza (no reimplementar)

`resolveSkill` y su caché, el registro de poderes (`definePower`, 13 ganchos), `defineSkillBehavior`, campos (`defineField`), el registro de barras (`defineGauge`, `registerGauges`), el planificador por ticks (`timers.js`), `combat-math.js` (saco aditivo, topes), primitivas de rol (`addStagger`, `forceTarget`, `g.heal`/`g.shield`), el motor actual de puertas/requisitos/agregado (`gateFail`, `reqFail`, `aggregateTalents`, `scaleFx`), `talents-ops` (y su código IRPG1 como base del IRPG2), el armazón del panel `ui-talents.js`, los widgets `ui-gauges*`, `?hudcheck=1` y `?dev` (`window.__game`).

### 1.4 Reglas de trabajo

- **Rama** `paso2-impl` desde `claude/isometric-rpg-game-xmer7p` (HEAD `163dded`). Cada trabajador en su **worktree** (`paso2-impl-<id>`); el orquestador fusiona. Push a `main` y a la rama del proyecto **solo en E5**.
- **Modelos** (regla del dueño): Sonnet para lo mecánico; Opus para implementar; el modelo principal solo orquesta, juzga diffs, resuelve fusiones y decide arquitectura.
- **Juicio tras cada ola**: el orquestador revisa el diff contra este plan; lo deficiente vuelve **al mismo trabajador** con feedback concreto. Reintentos = **workflow nuevo solo con los fallidos** (el resume cachea por prefijo).
- Cada trabajador entrega: `npm test` en verde (con la cuarentena declarada), `node --check` de sus archivos, el humo del nivel de su etapa (§6) y un informe con: archivos tocados, contratos que consumió, peticiones a otros dueños (**nunca edita un archivo ajeno**).
- **Convención 0 (investigar):** la investigación de 2f y 2g (octubre de 2026) cubre esta implementación. Cada trabajador cita la sección que aplica y solo busca en internet si su tarea trae algo no cubierto (p. ej., CDP sin dependencias para el humo).
- Commits con `user.email noreply@anthropic.com` y `user.name Claude`. Sin PRs.
- **No tocar** `docs/paso2g-guerrero.md`, `docs/paso2g-arquera.md` ni `docs/mockups/data/talents-v2-{guerrero,arquera}.js` mientras otro agente los escribe: solo lectura.

---

## 2. Etapas

### 2.0 Mapa de dependencias

```
E0 Preparación ──► E1 Motores (W1 ∥ W2) ──► E1.5 Conmutación ──┬─► E2 por clase: KA1 ─► (KA2 ∥ KT) ──► E4 Banco por clase ──┬─► E5 Migración final y cierre
  P1 ∥ P2 ∥ P3 ∥ P4 ∥ P5                                       └─► E3 Interfaz (U1 ∥ U2 → U3) ───────────────────────────────┘
```

E4 **no** espera a E3: el banco de una clase arranca en cuanto su E2 cierra (la Maga, primero). E3 solo bloquea a E5. Dentro de E2, KT necesita el **kit real** de su clase (ids y verbos) antes de sus trabajos 2 y 3: por eso KA se parte en KA1 (catálogo, kits, barras y tablas legadas) y KA2 (las 51 entradas de forja y sus poderes `v_*`).

| Etapa | Trabajadores en paralelo | Bloquea a | Puede ir en paralelo con |
|---|---|---|---|
| E0 | 5 (P1 Sonnet, P2 Opus, P3 Opus, P4 Opus, P5 Sonnet) | Todo | — |
| E1 | 2 (W1, W2; Opus) | E1.5 | — (E3 puede empezar a maquetar con el contrato §3.12, sin integrar) |
| E1.5 | 1 integrador (Opus) + orquestador | E2, E3 | — |
| E2 | 6 (KA y KT por clase; Opus) | E4 de su clase | E3 |
| E3 | 3 (U1, U2; U3 integra; Opus) | E5 | E2, E4 |
| E4 | 1 (B1) + rondas de calibración de KA/KT | E5 | E3 |
| E5 | M1 (Opus), C1 (Sonnet), orquestador | — | — |

**Motor congelado desde E2:** los cambios a `game-skills.js`, `skill-resolve.js`, `skill-defs.js`, `entities.js`, `field-entities.js`, `powers.js`, `talents.js` y compañía se **piden** al orquestador y los hace el mismo dueño de E1 (W1 o W2) en una **cola única** y secuencial («cola W1» y «cola W2»). La cola W2 cubre también `combat-math.js` (hasta E4), `spec-mechanics.js` (núcleo), `data.js`, `sfx.js` y `fx-skills.js` (D25). Una clave `tv` nueva de una clase **no** pasa por la cola si la consume un poder de su propia clase: se declara en `<CLASE>_TV_KEYS` (`talents-<clase>.js`) y `test78` la acepta; solo las que lee el núcleo (`condAddPct`, `nucleo_tv`, `resolveSkill`, `dotProfile`) van a la cola W2.

### E0 · Preparación (bloquea todo)

| Tarea | Quién | Archivos (dueño exclusivo) | Entrega |
|---|---|---|---|
| E0.1 Congelar contratos | Orquestador | `docs/paso2-implementacion.md`, `tests/run.mjs` (soporte de cuarentena, ~10 líneas), `tests/pending-2g.json` (vacío) | Rama creada; hash de los datos del mockup anotado (Maga ya; Guerrero/Arquera cuando cierre su agente) |
| E0.2 Saves v4 reales | P1 · Sonnet | `tools/make-v4-saves.mjs`, `tests/fixtures/saves-v4-paso2.json`, `tests/fixtures/catalog-v4.json` | Con el **código actual**: 3 clases × Nv {5, 10, 18, 40, 50, 60, 75} × especialización (Nv ≥ 10), con 3.ª rama elegida en 2–3 habilidades, soportes engarzados, activas de talento en `k2`/`k3`, tablero con nodos y glifos engarzados, `paragon.points` y hazañas. Determinista. Además, **volcado del catálogo v4** (`catalog-v4.json`: ids, `cat`, `req`, `kind` y `slots` de cada habilidad; ramas y opciones de `SKILL_MODS`; insignia por especialización; básico de arma por clase): KA y M1 lo necesitan para las tablas legadas cuando `SKILL_MODS` ya no exista. **Se commitea antes de cambiar cualquier código** |
| E0.3 Refactors sin cambio de comportamiento | P2 · Opus | `js/progression.js` (nuevo: `gainXP` y el aviso de subida salen de `entities.js`, que delega), `js/paragon-board.js` (nuevo: `PG_CFG`, `buildParagonBoard`, `PARAGON_BOARDS`; `data.js` los reexporta), `js/mech-<clase>.js` ×3 (nuevos: `gaugeTuning` y `baseGauges` de cada clase; `spec-mechanics.js` los compone e **inyecta** sus helpers como argumento `H` para no crear ciclos), `js/spec-mechanics.js`, `js/entities.js`, `js/data.js`, `sw.js` (solo `ASSETS`) | Diff de puro movimiento; `npm test` igual que antes; `balance-bench --report` idéntico |
| E0.4 Conversor + paridad | P3 · Opus | `tools/convert-v2/*`, `tests/test-v2-paridad.mjs`, `js/talent-text.js` (nuevo: `n1` y `pl`, copia literal de los del mockup) | §4. Genera los borradores de las 3 clases; la paridad se salta las clases cuyo juego aún esté en v1. `talent-text.js` nace aquí porque el conversor comprueba `d(r)` importándolo. Además: `out/power-ids.json` y fallo si dos clases usan el mismo id de poder (D28), y `out/claves-impl.md` con cada clave de `impl`/`k` que no esté en §3.6 (los alias que el mockup aún usa: `perfectDmg`, `perfectMul`, `perfectCdrAll`, `detonatePct`, `chargeMul`, `chargeT`, `aftershocks`…) |
| E0.5 Humo | P4 · Opus | `tools/smoke/*`, `package.json` (script `smoke`) | §6. Nivel `boot` en verde **con el juego actual**; los niveles `panels` y `full` escritos contra el contrato §3.12 (se saltan con aviso si falta el DOM). **Reutiliza** el cliente CDP de `tests/visual/chrome.mjs` (ya lanza Chrome sin ventana y habla CDP sin dependencias). Mide la **línea base** del coste del tick (solo simulación, sin render) con 30 enemigos en el juego actual → `tools/smoke/baseline.json` |
| E0.6 Stubs de contrato y registro | P5 · Sonnet | `sw.js` (`ASSETS`: **todas** las rutas nuevas de §2.1), `js/data.js` (exports vacíos de §3.5 y su fusión), `js/skills-<clase>.js` ×3 (solo `<CLASE>_SKILL_FORGE = {}`, `<CLASE>_SPEC_BAR = {}`, `<CLASE>_FORGE_RECO = {}`, `<CLASE>_FALLBACK_BAR = null`, `<CLASE>_CATALOG_V = 1`), archivos vacíos con cabecera y exports: `js/hero-<clase>.js`, `js/save-legacy-<clase>.js`, `js/powers-forge-<clase>.js`, `js/talents-view.js`, `js/ui-skills.js`, `js/ui-verbs.js`, `css/skills.css`, `css/verbs.css` | D24. Así W1 y W2 compilan contra los mismos nombres desde el primer día y `test71` no se pone en rojo por cada archivo nuevo. Va **después** de E0.3 (comparte `data.js` y `sw.js` con P2) |

**Contratos que deben estar fijados:** todo §3 (este documento).
**Terminado cuando:** fixtures v4 y `catalog-v4.json` commiteados; refactors fusionados con `npm test` verde y `balance-bench --report` sin diferencias; stubs de E0.6 fusionados con `npm test` verde; `node tools/convert-v2/convert.mjs --draft --todas` genera borradores, `pendientes-<clase>.md`, `power-ids.json` sin choques y `claves-impl.md`; `npm run smoke -- --level boot` en verde y `baseline.json` anotado; `tests/pending-2g.json` con **el inventario completo** de suites (§2.2): dueño y etapa de cada una que vaya a romperse.

### E1 · Motores (W1 ∥ W2)

#### W1 · Talentos, progresión, tablero y guardado (Opus)

| Archivos (dueño exclusivo) | Qué hace |
|---|---|
| `js/talents.js` | Reglas comunes (`TALENT_RULES`, `LEVEL_MAX`, `earnedAt`, `pointKindAt`), puertas nuevas, tipos `f`/`x` por rango, árboles héroe (apertura, clave gratis, pausa), ámbitos de rango y elección, `aggregateTalents(p, opts)` ampliado, `talentRank`, selectores (§3.8), builds (`buildRanks` idéntico a `simularBuild`), `normalizeTalents` v2 que valida, `treeSignature`. Fuera: `featCount`, `TALENT_CAP_LEVEL`, `specInsignia`, `talentSkillBase` |
| `js/talent-text.js` (lo crea P3 en E0.4) | Solo si hace falta otro helper puro de texto para los datos (el conversor debe conocerlo) |
| `js/talents-ops.js` | `addRank` con opción explícita y ámbito héroe, `chooseHeroTree`, `applyBuild`, configuraciones, `snapshot`/`restore`, código `IRPG2`, avisos de apertura y pausa |
| `js/game-talents.js` | Métodos nuevos del mixin (§3.4); `onTalentsChanged` con `SPEC_BAR` (D6) y activas de talento solo en `k2` |
| `js/progression.js` | Tope Nv100, sin `paragon.points++` ni `skillPoints += 1`, aviso por `pointKindAt` y aviso de Paragon abierto |
| `js/paragon-board.js`, `js/economy.js` (**dueño único** del archivo en E1) | Tablero nuevo (§3.9), puntos derivados, reinicio gratis fuera de combate. En `economy.js` también **quita `respecSkills`** (reembolsaba ramas y escribía `p.cds = {}`): con la forja no hay nada que reembolsar. W2 no toca `economy.js`; `canRespecFree` queda igual |
| `js/save-schema.js` | `SAVE_VERSION = 5`, `PLAYER_SAVE_FIELDS`, `MIGRATIONS[3]` congelada (D16), `MIGRATIONS[4]` (§3.11) con tablas por clase **inyectadas** desde `save-legacy-<clase>.js`. **También se congelan `MIGRATIONS[0]` y `MIGRATIONS[2]`**: hoy importan `SKILL_MODS`, `CLASSES`, `SUPPORTS` y `weaponBasicOf` del catálogo vivo; pasan a leer constantes estáticas (`LEGACY_WEAPON_BASIC`, ids de `catalog-v4.json`) y [2] conserva `skillMods` en bruto (sin filtrar por `SKILL_MODS`, que desaparece) para que [4] lo traduzca |
| `js/save-legacy-<clase>.js` ×3 (stubs de E0.6 con el formato de §3.11; pasan a KA en E2) | — |
| `tests/fixtures/talents-sample.mjs` (→ v2), `tests/helpers/talents-fixture-hooks.mjs`, `use-talents-fixture.mjs`, `talent-coverage.mjs` | Fixture v2 (rejillas 30/29/13, 2 builds, 2 árboles héroe) |
| Tests nuevos: `test77-talentos-v2.mjs` (G3, G4, G5, G13, `buildRanks`, pausa, apertura a Nv70), `test78-talentos-datos-v2.mjs` (**genérico** sobre todas las clases en v2: rejilla G16, textos G7, G1, G2, builds G8; en E1 corre solo sobre el fixture), `test79-codigo-irpg2.mjs`, `test80-guardado-v5.mjs` (algoritmo con tablas de fixture) | — |
| Tests que reescribe: `test65`, `test70`, `test61` (cadena hasta v5), `test57`, `test35`, `test37`, `test54`, `test12`, `test38`, `test56` (partes de Paragon/talentos), `test68` (la parte de `festin`: el poder sale del tablero pero su `definePower` se conserva) | — |
| Tests que **retira**: `test65a-talentos-datos` (lo sustituyen `test78`, genérico, y `test-talentos-<clase>`: si lo reescribieran los tres KT tendría tres dueños) | — |
| Cuarentena que declara: `test76` (dueño U1), `test75` (lo parte I en E1.5), `test-powers-*`, `test-gauges-*`, `test-skills-*` (si dependen de insignias por `s0`), `balance-bench`, `balance-regression` (dueños en E2/E4) | — |

#### W2 · Habilidades, forja y verbos (Opus)

| Archivos (dueño exclusivo) | Qué hace |
|---|---|
| `js/skill-defs.js` | `CAT_LABELS`; vocabulario de forja (`forgeDef`, `forgeMods`, `forgeLevels`, `validateForge`, `setPath`); `normalizeSkillDef` que **quita** el elemento y los tags de entrega viejos; tipos `combo`, `stance`, `wall`; tags `charge`, `combo`, `recast`, `stance`; validación de las claves de §3.6; `skillVerbs(def)`; regla de las activas de talento (`kind:'talent'` ⇒ `defense\|utility` y `slots:['k2']`). Fuera: `dmgMods/buffMods/utilMods` y `V_*/T_*/O_*` |
| `js/skill-resolve.js` | `isKnown` con `spec` (D7); `forgeState`, `forgedDef` (caché `p.forged`), perfil con `prof.def` y las claves nuevas; `skillReq` de talento = `sk.req`; `validSupports`/`supportFits` sobre la definición forjada |
| `js/game-skills.js` | `castSkillSlot` sobre `prof.def`; relanzar, cargas, combo, carga y soltar, `releaseSkillSlot`, canal ampliado (`moveMul`, `autoShot`, `drainPerSec`, `hold:'toggle'`, `endReason`, `g.extendChannel`), postura, secuencia, `pull`/`knock`, `killReset`, `shieldGain`, `zoneMax`, repeticiones sin cadena (`cast.echo` no repite), `chooseForge` (sustituye a `chooseSkillMod`), `reduceCooldown`, `setComboStep`, `setSeqCount`, ⑭ `onSkillEnd` |
| `js/resources.js` | `drainResource(p, perSec, dt)` |
| `js/powers.js`, `js/powers-common.js` | ⑭ en `HOOK_NAMES`; cabecera con los campos nuevos de `CastInfo`/`HitInfo`; registro de `js/powers-forge-<clase>.js` (stubs); `nucleo_tv` y demás usan `reduceCooldown` |
| `js/field-entities.js` | `armT`, `follow`, `blocks`, `contain`, forma `line`, `onDetonate`, `fieldsOf`, `detonateField`, trampa genérica ampliada (armado, radio de disparo, estallido, consumo, `maxArmed`, `lure`), campo `muro`, campo emisor (dispara desde su posición: Familiar, Halcón, Pendón) |
| `js/entities.js` | `p.skState`, `p.skCharges` (recarga perezosa con `simT`), `setMoveMul`/`clearMoveMul`, `p.planted`, `basicAttack` con `prof.def`, `seq` y carga; `Enemy.displace`, respeto de `blocks`/`contain`/`lure`; buff `minHpPct`/`endHealPct`; `recompute` añade los poderes de la forja, vacía `p.forged` y llama `aggregateTalents(p, { elemOf, kitOf })` (§3.3); constructor con `paragon = { nodes:{}, glyphs:{} }` |
| `js/input.js` | §3.6.1: `keyup` y suelta de botón → `g.releaseSkillSlot(slot)` (por `codeToAction`, respeta el remapeo); `mouseHeld` **derivado de `e.buttons`** en `pointerdown`/`pointermove`/`pointerup` (con un botón ya pulsado, el segundo **no** dispara `pointerdown`; hoy `onPointerUp` además suelta los dos); `mouseHeld` también en el esquema clic-mover; `blur`, `visibilitychange` y `pointercancel` vacían **también** `keys` (hoy no) y llaman `g.cancelHeld('cancel')`; ajuste `holdMode:'hold'\|'toggle'` |
| `js/main.js` (solo el bucle de botones mantenidos y `resetCastState`) | No relanzar mientras `_charging`; `_needsRelease[slot]` tras una suelta automática (salvo `charge.repeat`) |
| `js/data.js` | Fusión de `SKILL_FORGE`, `SPEC_BAR`, `FORGE_RECO`, `FALLBACK_BAR`, `CATALOG_V` por clase (los stubs ya existen: E0.6); `specKitOf(classId, specId)`; `CAT_NODES` («Principales», «Insignia», un grupo por especialización); `SYSTEMS_GUIDE` sin puntos de rama; `SKILL_MODS`/`aggregateSkillMods` pasan a stubs `@deprecated` (D23) |
| `js/sfx.js` | Tonos sintetizados nuevos (D26): `verb_win` (entra en la ventana), `verb_perfect` (suelta perfecta), `verb_miss` (suelta fuera), `verb_tick` (últimos 0,5 s de un relanzamiento), `verb_stance`, `verb_pip` (paso de combo o de secuencia), `verb_hunt` (Batida). Los llama `game-skills.js` en el instante del borde con `this.sfx(...)` |
| `js/combat-math.js` (en E1; cola W2 en E2–E3; B1 en E4) | Lo que los verbos necesitan del cálculo: suelta perfecta (aditivo `perfectPct`, crítico con el `forceCrit` existente), Quebranto de `displace` a jefes, claves condicionales nuevas que lee `condAddPct` (plantado, marcado, detonado) |
| `js/fx-skills.js` | Presets genéricos de los verbos (destello de la ventana, estallido perfecto, aro de relanzar) para que KA solo elija color y escala |
| `tests/fixtures/skills-verbs-sample.mjs` (nuevo) | Habilidades sintéticas con cada verbo (los catálogos reales no traen verbos hasta KA1): las inyecta el arnés |
| `tests/helpers/power-harness.mjs` | `h.press(slot)`, `h.release(slot)`, `h.hold(slot, s)`, `input.held` controlable, `h.walk(dir, s)`/`h.stand(s)`, espía de `sfx` |
| Tests nuevos: `test81-forja-nucleo.mjs` (A1 y F7 **genéricos** sobre las clases con `CATALOG_V = 2`, A6, `forgeDef` con rutas, tags y elemento), `test82-verbos.mjs` (carga: ventana, esquiva sin coste, suelta automática, `forcePerfect`, `repeat` del básico, interrupción por CC o golpe > 10 %, panel o `blur` que cancelan sin coste, otras ranuras bloqueadas durante la carga, sonido en el borde exacto · relanzar: `n`, `cond:'hit'`, `perfectLast`, `cdFrom` · **relanzar + cargar** (Tiro Celestial: cada relanzamiento se tensa) · combo: pasos, `comboWin`, preparación del 3.º · `seq` en `weapon` y `proj` · canal: `moveMul`, `autoShot`, `drainPerSec`, `endReason` · postura (también alternada durante una carga) · cargas con `reduceCooldown` · ecos que no avanzan estado), `test83-campos-2g.mjs` (trampa armada, cebo, detonar, muro, `follow`, `zoneMax`, emisor, `trail`, `at:'ownField'`), `test84-movimiento-cc.mjs` (`moveMul`, plantado, `displace` con rendimientos decrecientes y Quebranto en jefes, `minHpPct`), `test87-sin-cds.mjs` (ningún `p.cds[x] =` fuera de `game-skills.js`/`entities.js`: **entra en cuarentena** con dueños KA-arquera, KT ×3 y W1, porque hoy escriben `p.cds` `skills-arquera.js`, `powers-*.js` y `economy.js`) | — |
| Tests que reescribe: `test53` (ramas → forja), `test62`, `test64`, `test26`, `test27` (soportes con definición forjada), `test49` (guía), `test69`, `test72` si tocan ramas, `test55` (afirma `p.skillPoints`; la parte de estructura del catálogo pasa a KA) | — |

**Contratos fijados antes de E1:** §3.3 (firma de `aggregateTalents(p, { elemOf, kitOf })` y de `normalizeTalents(raw, classId, level)`, que el constructor de `Player` —archivo de W2— llama con el nivel), §3.5, §3.6, §3.7, §3.11 (formato de tablas legadas). W1 y W2 **no comparten archivos**: W1 consume `kitOf`/`elemOf` como parámetros y W2 los pasa desde `recompute`. Lo que W1 necesita del constructor (`skillForge = {}`, `paragon = { nodes, glyphs }`, sin `skillPoints`) está en la fila de `entities.js` de W2. **`aggregateTalents` se memoiza** por una clave de revisión (`talentsRev`, nivel, especialización, forja): `recompute()` corre en **cada** `addBuff` y no debe rehacer 156 nodos por un buff (§5, riesgo 11).

**Terminado cuando (cada uno en su worktree):** sus tests nuevos en verde; `npm test` verde con la cuarentena declarada; W2: el juego actual sigue jugable con los catálogos viejos (humo `boot` en su worktree); W1: `test77`–`test80` verdes sobre el fixture. Juicio del orquestador sobre el diff.

### E1.5 · Integración y conmutación (integrador Opus + orquestador)

| Archivos (dueño exclusivo en esta etapa) | Qué hace |
|---|---|
| Fusión de W1 y W2 | Resolver conflictos (no debería haber: archivos disjuntos) |
| `js/talents-<clase>.js` ×3, `js/hero-<clase>.js` ×3 | `node tools/convert-v2/convert.mjs --write talents --todas`: datos v2 **esqueleto** (estructura, textos, builds y `defaultBuild` exactos; `fx` vacío con `todo` salvo `grant` de activas que ya existan) |
| `js/data.js`, `js/entities.js` | Ajustes de import si hacen falta, sin quitar stubs de D23 (después: cola W2) |
| `js/main.js` | Respaldo único del guardado v4 antes de migrar (`<clave del slot>.bak-v4`, §3.11) |
| `tests/helpers/power-harness.mjs` | `makeHarness({ spec, build, level, talents })` en formato v2 |
| `tests/test43-mixins.mjs` | Métodos nuevos del mixin, `SKILLS_EXPECTED`, `FIELDS_EXPECTED` |
| `tests/test75-gaugeview-v2.mjs` | Se **parte**: sus casos por clase (ids viejos `s4`, `s9`, `g_t_muro`, `g_t_veredicto`, `a_t_vision`…) pasan a `test-gauges-<clase>` (dueño KT de cada clase) y lo genérico queda en `test75`. Así ningún archivo de prueba tiene tres dueños |
| `tests/pending-2g.json` | Revisión: cada suite con dueño (KA/KT/U1/U2/B1/M1) |

**Terminado cuando:** `npm test` verde con la cuarentena listada; `test-v2-paridad` verde en las tres clases (estructura); `test78` verde sobre los datos reales (rejilla, builds legales punto a punto, textos); humo `boot` verde creando héroes Nv1 y Nv10 (con especialización) de las tres clases y **cero errores de módulo** (los stubs de D23 lo garantizan). La afirmación «ranuras `3` y `4` llenas a Nv15» del humo se activa por clase cuando su `CATALOG_V = 2` (KA1): con el esqueleto de E1.5 la insignia aún no existe en el catálogo.

### E2 · Datos por clase (6 trabajadores Opus: KA-<clase> ∥ KT-<clase>)

Orden: si los datos de Guerrero y Arquera ya están congelados (D18), las seis en paralelo; si no, **Maga primero** (KA-maga ∥ KT-maga) y las otras cuatro al congelarse. Dentro de cada clase: **KA1 → (KA2 ∥ KT trabajos 2 y 3)**; el trabajo 1 de KT (clase y héroe) va en paralelo con KA1.

#### KA-<clase> · Catálogo, kits y forja (KA1 y KA2, el mismo trabajador)

| Archivos (dueño exclusivo) | Qué hace |
|---|---|
| `js/skills-<clase>.js` | **KA1:** 23 habilidades: kit base (5), kits por especialización (12, con `spec` y sus verbos de §3.6), activas de talento (6, `kind:'talent'`, `slots:['k2']`, `req` del catálogo); `<CLASE>_SKILL_BEHAVIORS` (primero tipos y claves genéricos de §3.6; un comportamiento nuevo solo si ninguno basta, y se anota en `pendientes-<clase>.md` —el tope de 3 de 2f §7.2 es para la **forja**, no para los kits—); cargas que hoy viven en `powerState` (p. ej. `a_t_cepo`) pasan a `charges` (D2); `<CLASE>_SPEC_BAR`, `<CLASE>_FALLBACK_BAR`; `<CLASE>_CATALOG_V = 2`; fuera las habilidades retiradas (lista de cada doc: Guerrero §11.1, Arquera §11.1, Maga A.6). **KA2:** `<CLASE>_SKILL_FORGE` (51 entradas: nombres, líneas y papeles del borrador; `mod/set/add/mul/elem/tags/power/behavior` desde el `k` del mockup y el doc) y `<CLASE>_FORGE_RECO` |
| `js/fx-skills-<clase>.js` | VFX de los cambios de forma **reutilizando** los existentes y los presets de verbo de `fx-skills.js` (color por elemento, escala) |
| `js/powers-forge-<clase>.js` | Poderes `v_*` de las variantes (ids comprobados contra `power-ids.json`, D28) |
| `js/save-legacy-<clase>.js` | **KA1:** tablas de barra, forja, insignia legada y aviso (§3.11), escritas desde `catalog-v4.json` |
| `tests/test-skills-<clase>.mjs` (reescribe), `tests/test-forge-<clase>.mjs` (nuevo); de `test66-roles-primitivas` y `test55`, la parte que use su kit | — |

**Terminado:** A1, A2/F7, A9 en verde para su clase; `validateSkillDef` sin errores; G2 (`fitsSlot` de las 6 activas = solo `k2`); G17 (≥ 3 verbos por especialización, verbo principal distinto); `reco` nunca apaga la barra de su especialización (2f §7.7); `test87` limpio en sus archivos; las líneas de forja de más de 70 caracteres (A1; hoy Guerrero 12, máx. 110, y Arquera 7, máx. 83) **acortadas** y anotadas en `divergencias.json` para que el dueño las apruebe; sus suites fuera de la cuarentena.

#### KT-<clase> · Talentos, árboles héroe, poderes y mecánica

| Archivos (dueño exclusivo) | Qué hace |
|---|---|
| `js/talents-<clase>.js`, `js/hero-<clase>.js` | `fx` de los 156 nodos y 124 opciones desde su `impl` y el doc; `innate`, `elem`, `mechanic` por especialización; `<CLASE>_TALENT_SKILLS` (las 6) |
| `js/powers-<clase>.js` | Poderes nuevos con el prefijo de su clase (`test78`: Maga `m_\|p_\|k_\|a_`, Guerrero `g_*`, Arquera `a_\|f_\|m_\|t_`; como Maga y Arquera comparten `m_` y `a_`, cada id se comprueba contra `power-ids.json`, D28); los finales y el ápice leen su rango con `talentRank`/`powerRank`; se retiran los listados en cada doc (p. ej. `m_aegis`: KT-guerrero reescribe la parte de `test68` que lo usa); `nodeRank`/`ownRank` desaparecen; los `p.cds[x] =` que queden pasan a `g.reduceCooldown` (`test87`) |
| `js/talents-<clase>.js` (además) | `<CLASE>_TV_KEYS`: claves `tv` nuevas que consume un poder de la propia clase (las que lee el núcleo van a la cola W2) |
| `js/mech-<clase>.js` | Barras: ids de nodo citados, Bastión y Fervor rehechos (Guerrero §11.5), Impulso con pérdida quieta, Concentración con `perfectGain` y Calma Absoluta, Coto con Batida (Arquera §11.1); `talentSkill()` lee del catálogo. Los eventos que necesite del motor (suelta perfecta, estallido de trampa, plantado) los lee de ③/⑤/⑭ o los pide a la cola W2 (núcleo de `spec-mechanics.js`) |
| `js/ui-gauges-<clase>.js`, `css/gauges-<clase>.css` | `explain` y `demo` desde `gaugeTuning()` con los nombres nuevos (Guerrero §18.1: hoy el Bastión dice «−5 % de daño (Muralla)» y el Fervor «Veredicto Final listo»; Arquera §16.2.4: «Tiro Fijado», «Apuntado al instante» y «Cepo: recarga») |
| `tests/test-powers-<clase>.mjs`, `tests/test-gauges-<clase>.mjs` (reescriben; el segundo recibe los casos de su clase de `test75`), `tests/test-talentos-<clase>.mjs` (nuevo: cada nodo con `fx` produce un efecto observable; 0 `todo`) | — |

KT trabaja en **3 trabajos secuenciales** dentro de su worktree: (1) clase + árboles héroe (en paralelo con KA1), (2) especialización 1, (3) especializaciones 2 y 3; los trabajos 2 y 3 **empiezan cuando KA1 de su clase está fusionado** (sus nodos modifican los verbos del kit: relanzar el Salto, la ventana del Martillo, las trampas del Cepo). KA y KT de una clase se coordinan **solo por ids** (fijos en el mockup).

**Terminado:** cobertura 100 % (`talent-coverage`: todo nodo con `fx`, todo `power` registrado), G1, G2, G7, G13 (pausa con efecto real), G16 en verde para su clase; `test-v2-paridad` sin divergencias no declaradas; sus suites fuera de la cuarentena.

### E3 · Interfaz (U1 ∥ U2 ∥ U3; en paralelo con E2)

| Trabajador | Archivos (dueño exclusivo) | Qué hace |
|---|---|---|
| **U1** · Panel de talentos | `js/ui-talents.js` (reescritura; debe seguir importándose sin DOM), `css/talents.css`, `js/talents-view.js` (nuevo, **puro**), `tests/test85-talentos-vista.mjs`, `tests/test76-talentos-mecanica.mjs` (importa `SPEC_INFO`, `mechInfo` y `TALENT_LAYOUTS` de `ui-talents.js`: lo reescribe su dueño), `tests/visual/talents.html` (arnés suelto, como `gauges.html`) | Porta el panel del mockup (`renderTV2`, `drawTree3`, `drawHero`, `heroVeil`, `openChoice`, `fx*`, `demoReveal`): 3 columnas 2:1:2, rejillas 0–6 × 10 filas y héroe 0–2 con `.5`, formas (círculo, hexágono con flotante **encima**, cuadrado), banda del ápice, velo/pausa/revelación del Paragon, selector de especialización y de árbol héroe, Configuración (10, con el nombre completo en `title`: Guerrero §18.2), Guardar, Código, Recomendado, ↶ (`Ctrl+Z`), Reiniciar, motion de 2g §10 con `prefers-reduced-motion`, `?talentscheck=1`. Iconos que falten → marcador (§3.12). Redibuja por **diferencias** (no reconstruye 72 nodos y sus aristas por cada punto) |
| **U2** · Libro, forja y verbos | `js/ui-skills.js`, `css/skills.css`, `js/ui-verbs.js`, `css/verbs.css` (stubs de E0.6), `js/hud-model.js`, `js/world-marks.js` (marcas de mundo de los verbos), `tests/test71-hud-modelo.mjs` y `test73-hud-pc.mjs` (amplía), `tests/test86-libro-forja-vista.mjs`, `tests/visual/verbs.html` y `tests/visual/book.html` (arneses sueltos) | Libro por categoría con `CAT_LABELS`, forja (Mejora + 2 tarjetas), tooltip rico con `Alt` (con «Talentos que la tocan»), arrastre a la barra, `1`–`4` asignan la casilla bajo el ratón, navegación con `←`/`→`/`Intro`/`Esc` (2f §3.3 y §3.7), engarces, «Recomendado» del libro, barra de mecánica en demo bajo el kit; `slotView` ampliado, `forgeView`, `bookView` y los helpers puros de 2f §3.8 (§3.12); feedback de verbos según la tabla de §3.12 (barra de carga en la ranura **y** junto al cursor con ventana dorada, pips, aro de relanzar, marco de postura, anillo de plantado, hilos del cebo, anillo de la Batida), **actualizado por frame** (D26); `?skillscheck=1`. **Primero** entrega `tests/visual/verbs.html` con cada estado y sus capturas a 1366 y 1920: el mockup no dibuja ningún verbo (Guerrero §18.6), así que el orquestador juzga ese arnés antes de integrar |
| **U3** · Integración en la UI | `js/ui.js`, `index.html`, `css/style.css` | Envoltorio `ops` nuevo (§3.4); `T` abre el libro (`ui-skills`) y `N` los talentos; fuera `renderSkillFocus`/`renderBookBar`/ramas, el botón de `respecSkills` y las insignias de `skillPoints`; `verbHud.update(realDt)` desde `updateFloats` (cada frame, D26) y no desde `updateHUD`; abrir cualquier panel llama `g.cancelHeld('panel')`; tablero de glifos (se abre al Nv81, 16 puntos, legendarios con estadísticas); avisos de subida por sistema (agrupados: «Nivel 8: 3 novedades», 2f §7.1, desde `levelUpNews`) y de Paragon abierto/en pausa; aviso de migración; «Solo con <especialización>»; ajuste `holdMode` en Opciones; `<link>` de `skills.css` y `verbs.css` y las raíces DOM que pidan U1/U2 |

**Contratos fijados antes:** §3.4 (ops), §3.12 (fábricas, DOM, modelos de vista y feedback de verbos). U3 arranca con stubs de las fábricas. U1 y U2 prueban en sus arneses de `tests/visual/` (que no dependen de `ui.js`); el humo `panels` corre **después** de fusionar U3.
**Terminado:** G6, G10, G14 (con el humo: `elementFromPoint` y clic derecho), G15 en sus archivos, A4 (clics contados por el humo), A5 (sin solapes a 1920 × 1080 y 1366 × 768), G17 (feedback visible y a tiempo: la marca de la ventana aparece en el mismo frame en que `g._charging` entra en ella); humo `panels` en verde; capturas del juego junto a las del mockup a 1366 y 1920 para el juicio.

### E4 · Banco y calibración

| Trabajador | Archivos (dueño exclusivo) | Qué hace |
|---|---|---|
| **B1** · Opus | `tests/balance-bench.mjs`, `tests/balance-regression.mjs`, `tests/forge-bench.mjs` (nuevo), `js/combat-math.js` | Héroes por build a Nv 50/70/80/100 desde `builds` (barra de `SPEC_BAR`, forja `reco`, árbol héroe, tablero); simulación de verbos (acierto perfecto 60 % / 90 % con Fe Serena o Calma, tiempo plantado, postura, cadenas); escenarios UNI · ÁREA×5 · CONTROL · TTD+ · APOYO; matriz de forja F1–F9; curva de enemigos `G(AL)` y `areaLevelForHero` estiradas hasta el 100 **solo** lo necesario para medir (ILVL igual); fuera `presetList`/`presetRanks` |
| Calibración | KA/KT de cada clase (sus archivos), en rondas | Solo números, guiados por los informes de B1; el orquestador juzga cada ronda |

**Terminado:** G9 (cada arquetipo gana su escenario; híbrida ≥ **0,85** de la mejor en la Maga y ≥ **0,90** en el Guerrero y la Arquera, como fija cada doc) y F1–F9 **afirmados** por los bancos; G18 (diferencia ≤ 5 % entre los dos árboles héroe de cada especialización); reglas de 2e conservadas (p. ej., Berserker ≥ 10 % en UNI); ratio óptimo/típico en [1,3; 15]; tabla antes/después para `MEMORIA.md`. El banco de una clase empieza en cuanto cierra su E2 (no espera a E3). `forge-bench.mjs` vive en `tests/` y por eso **entra en `npm test`** (`run.mjs` corre todo `.mjs` de esa carpeta): su modo sin argumentos afirma F1–F9 con 1 semilla y en menos de 60 s; la matriz completa va con `--report`.

### E5 · Migración final, cierre y publicación

| Trabajador | Archivos | Qué hace |
|---|---|---|
| **M1** · Opus | `js/save-schema.js` (de nuevo dueño), `tests/test-save-2g.mjs` (nuevo) | Pruebas con los saves v4 **reales** de E0.2 más sintéticos de Nv 69/70/80/100: G11/A7, idempotencia (dos pasadas = igual), barra esperada por especialización, glifos devueltos, soportes reengarzados o devueltos, avisos; ajustes del algoritmo si fallan |
| **C1** · Sonnet | `sw.js` (`VERSION`++; `ASSETS` ya trae las rutas desde E0.6: comprueba que **cada** ruta existe, porque `cache.addAll` falla entera con un 404), `MEMORIA.md` (Paso 2f ✅ y 2g ✅, backlog), `CLAUDE.md` (mapa y patrones: verbos, forja, ⑭, archivos nuevos), `tests/pending-2g.json` (vacío), los stubs `@deprecated` de D23 (borrados; `grep` de cada nombre vacío en `js/` y `tests/`) | `grep -ri astadora js/` vacío (G15); `npm test` verde sin cuarentena |
| Orquestador | — | Humo `full`, capturas antes/después, juicio final, fusión a `claude/isometric-rpg-game-xmer7p` y push a `main` |

### 2.1 Matriz de propiedad de archivos

`—` = nadie lo toca · 🔒 = congelado (cambios por la cola del dueño de E1) · `Orq` = orquestador. En E0, P2 y P5 tocan `data.js` y `sw.js` **en serie** (P5 después de fusionar P2).

| Archivo | E0 | E1 | E1.5 | E2 | E3 | E4 | E5 |
|---|---|---|---|---|---|---|---|
| `talents.js`, `talents-ops.js`, `game-talents.js` | — | W1 | I | 🔒 W1 | 🔒 W1 | 🔒 W1 | 🔒 |
| `talent-text.js` | P3 | W1 | I | 🔒 W1 | 🔒 | 🔒 | 🔒 |
| `progression.js`, `paragon-board.js` | P2 | W1 | I | 🔒 W1 | 🔒 W1 | 🔒 | 🔒 |
| `economy.js` (todo el archivo, también `respecSkills`) | — | W1 | I | 🔒 W1 | 🔒 W1 | 🔒 | 🔒 |
| `save-schema.js` | — | W1 | I | 🔒 | 🔒 | 🔒 | M1 |
| `save-legacy-<clase>.js` | P5 (stub) | W1 (formato) | I | KA | 🔒 | 🔒 | M1 |
| `skill-defs.js`, `skill-resolve.js`, `game-skills.js`, `resources.js`, `powers.js`, `powers-common.js`, `field-entities.js` | — | W2 | I | 🔒 W2 | 🔒 W2 | 🔒 W2 | 🔒 |
| `sfx.js`, `fx-skills.js` | — | W2 | I | 🔒 W2 | 🔒 W2 | 🔒 | 🔒 |
| `combat-math.js` | — | W2 | I | 🔒 W2 | 🔒 W2 | B1 | 🔒 |
| `entities.js` | P2 | W2 | I | 🔒 W2 | 🔒 W2 | 🔒 | 🔒 |
| `input.js` | — | W2 | — | 🔒 | 🔒 W2 | 🔒 | 🔒 |
| `main.js` | — | W2 (bucle) | I (respaldo) | 🔒 | 🔒 | 🔒 | 🔒 |
| `data.js` | P2 → P5 (stubs) | W2 | I | 🔒 W2 | 🔒 W2 | 🔒 | 🔒 |
| `spec-mechanics.js` (núcleo) | P2 | — | I | 🔒 W2 | 🔒 W2 | 🔒 W2 | 🔒 |
| `mech-<clase>.js` | P2 | — | — | KT | 🔒 | KT | 🔒 |
| `skills-<clase>.js`, `fx-skills-<clase>.js`, `powers-forge-<clase>.js` | P5 (stubs) | — | — | KA | 🔒 | KA | 🔒 |
| `talents-<clase>.js`, `hero-<clase>.js` | P5 (stub `hero`) | — | I (conversor) | KT | 🔒 | KT | 🔒 |
| `powers-<clase>.js`, `ui-gauges-<clase>.js`, `css/gauges-<clase>.css` | — | — | — | KT | 🔒 | KT | 🔒 |
| `ui-talents.js`, `css/talents.css`, `talents-view.js` | P5 (stub `talents-view`) | — | — | — | U1 | 🔒 | 🔒 |
| `ui-skills.js`, `ui-verbs.js`, `css/skills.css`, `css/verbs.css` | P5 (stubs) | — | — | — | U2 | 🔒 | 🔒 |
| `hud-model.js`, `world-marks.js` | — | — | — | — | U2 | 🔒 | 🔒 |
| `ui.js`, `index.html`, `css/style.css` | — | — | — | — | U3 | 🔒 | 🔒 |
| `ui-gauges.js` (widget común) | — | — | — | — | solo lectura | — | — |
| `tests/balance-bench.mjs`, `balance-regression.mjs`, `forge-bench.mjs` | — | — | I (que compile) | — | — | B1 | 🔒 |
| `tests/helpers/power-harness.mjs`, `tests/fixtures/skills-verbs-sample.mjs` | — | W2 | I | 🔒 | 🔒 | 🔒 | 🔒 |
| `tests/helpers/talent*.mjs`, `tests/fixtures/talents-sample.mjs` | — | W1 | I | 🔒 | 🔒 | 🔒 | 🔒 |
| `tests/fixtures/saves-v4-paso2.json`, `catalog-v4.json` | P1 | — | — | 🔒 | 🔒 | 🔒 | 🔒 |
| `tests/test75-gaugeview-v2.mjs` | — | — | I (lo parte) | KT (su parte, en `test-gauges-<clase>`) | — | — | — |
| `tests/test76-talentos-mecanica.mjs` | — | — | — | — | U1 | — | — |
| `tests/visual/*` (arneses sueltos) | — | — | — | — | U1 (`talents`), U2 (`verbs`, `book`) | — | — |
| `tests/test43-mixins.mjs`, `tests/run.mjs`, `tests/pending-2g.json` | Orq | — | I | Orq | Orq | Orq | C1 |
| `tools/convert-v2/*`, `tests/test-v2-paridad.mjs` | P3 | — | I | Orq | Orq | — | — |
| `tools/smoke/*`, `package.json` | P4 | — | — | Orq | Orq | — | Orq |
| `sw.js` | P2 → P5 (`ASSETS` con todas las rutas nuevas) | — | — | — | — | — | C1 |
| `MEMORIA.md`, `CLAUDE.md` | — | — | — | — | — | — | C1 |
| `docs/**` (diseño y mockup) | solo lectura | | | | | | |

### 2.2 Inventario de suites que se rompen (base de `tests/pending-2g.json`)

`run.mjs` corre **todo** `.mjs` de `tests/` (también `balance-bench`, `balance-regression`, `loot-regression` y los futuros `forge-bench`, `test-v2-paridad`, `test-save-2g`). Lista hecha con `grep` sobre los ids, campos y exports que cambian; E0.1 la vuelca en `pending-2g.json` y toda suite roja que no esté aquí recibe dueño **antes** de fusionar.

| Suite | Por qué se rompe | Dueño · etapa |
|---|---|---|
| `test12`, `test35`, `test37`, `test38`, `test54`, `test56` | `paragon.points`, respec con oro, `PARAGON_BOARD`, umbral Nv20 | W1 · E1 |
| `test57`, `test61` | `SAVE_VERSION`, `skillPoints`/`skillMods`, cadena v3 → v5 | W1 · E1 |
| `test65`, `test70` | `featCount`, `presetList`, ids v1, `IRPG1` | W1 · E1 |
| `test65a` | Datos v1 y lista blanca de `tv` (`TV_53`) | W1 · E1 (se **retira**: `test78`) |
| `test68` | `festin` (tablero) y `m_aegis` (sale en el Guerrero) | W1 (`festin`) · KT-guerrero (`m_aegis`) |
| `test26`, `test27`, `test49`, `test53`, `test62`, `test64`, `test69`, `test72` | Ramas, `SKILL_MODS`, soportes sobre la definición forjada, guía | W2 · E1 |
| `test55` | Afirma `p.skillPoints` y la estructura del catálogo («Gastadora A en Nv2») | W2 (puntos) · KA (catálogo) |
| `test63`, `test74` | Usan el arnés con datos sintéticos: **deberían** seguir verdes; si no, a W2 | W2 · E1 |
| `test66-roles-primitivas` | Arnés a Nv20 con `guardian`/`crionte`: depende de habilidades del kit que cambian | KA-guerrero y KA-maga · E2 |
| `test87-sin-cds` (nuevo) | `p.cds[x] =` en `skills-arquera.js`, `powers-*.js`, `economy.js` | Cuarentena: KA-arquera, KT ×3, W1 |
| `test43` | Métodos nuevos de los mixins | I · E1.5 |
| `test75` | Ids viejos de las tres clases (`s4`, `s9`, `g_t_muro`, `g_t_veredicto`, `a_t_vision`, `a_t_cepo`) | I lo parte en E1.5 · KT su parte en `test-gauges-<clase>` |
| `test76` | Importa `SPEC_INFO`/`mechInfo`/`TALENT_LAYOUTS` de `ui-talents.js` | U1 · E3 |
| `test71`, `test73` | Libro, `slotView`, `sw.js`, `index.html` | U2 · E3 (los archivos nuevos ya están en `sw.js`: E0.6) |
| `test-skills-<clase>` | Catálogo, `<CLASE>_SKILL_MODS`, insignias por `s0` | KA · E2 |
| `test-powers-<clase>`, `test-gauges-<clase>` | Poderes que salen, ids de nodo, textos de barra | KT · E2 |
| `balance-bench`, `balance-regression` | `presetRanks`, `SKILL_MODS`, ramas, nivel 50 | B1 · E4 (cuarentena desde E1) |
| `loot-regression`, `test16` | Legendarios con `furia`/`festin`/`volatil`/`multidisparo`: siguen verdes si sus `definePower` se conservan (§3.9) | — (vigilar) |

---

## 3. Contratos detallados

### 3.1 Datos de talentos en el juego

```js
// js/talents-maga.js — solo datos y textos (sin lógica). Importa SOLO hero-maga.js y talent-text.js.
import { MAGA_HERO } from './hero-maga.js';
import { n1, pl } from './talent-text.js';
export const MAGA_TALENTS = {
  v: 2,
  cls: { name: 'Maga', nodes: [ /* 30: c1…c30 */ ] },
  specs: [
    { id: 'piromante', name: 'Piromante', role: 'dps', roleLabel: 'Daño en área', icon: 'specs/piromante.webp',
      emblem: 'emblems/piromante.webp', mechanic: 'calor', elem: 'fire', prefix: 's',
      innate: { /* fx */ }, innateText: 'Bola de Fuego: explosión 100 → 350 %', line: '…', desc: '…',
      nodes: [ /* 29: s0…s28 */ ] },
    /* crionte (prefix 'i'), arcanista (prefix 'a') */
  ],
  hero: MAGA_HERO,      // [{ id:'crono', name:'Cronomante', specs:['piromante','arcanista'], art, line, key, prefix:'t', nodes:[/* 13: t0…t12 */] }, …]
  builds: { brasa: { sp:'piromante', n:'Incendio', arch:'Brasa', hero:'invoca', heroNodes:[…10], heroCh:{…}, cls:{…}, clsCh:{…}, spec:{…}, specCh:{…} }, /* 12 */ },
  defaultBuild: { piromante: 'brasa', crionte: 'glaciar', arcanista: 'rayo' },
  groups: { fire: { label: 'Toca todo tu Fuego', ids: [ … ] } },
};
export const MAGA_TALENT_SKILLS = [ /* las 6 activas de talento (§3.5) */ ];
```

**Nodo:**

```js
{ id: 'c6', name: 'Principal: Núcleo u Onda', t: 'c', tag: 'mec', r: 1, c: 4, max: 1, req: ['c2', 'c3'],
  touch: ['@spender'], icon: 'talents/maga-clase-c6.webp',
  opts: [ { k: 'A', name: 'Núcleo', desc: '…', role: 'UNI',  fx: { mod: { '@spender': { dmgDirect: 15 } } } },
          { k: 'B', name: 'Onda',   desc: '…', role: 'AREA', fx: { mod: { '@spender': { splashPct: 30 } } } } ],
  win: 'A, contra jefes… B, contra grupos…' },
{ id: 's28', name: 'Corazón del Sol', t: 'x', tag: 'mec', r: 9, c: 3, max: 4, req: ['s25', 's26', 's27'],
  d: r => ['1) …', '2) …', '3) …', '4) …'].slice(0, r).join(' '), fx: { power: 'p_corazon_sol' } },
```

| Campo | Juego | Viene del mockup como | Notas |
|---|---|---|---|
| `id`, `t`, `tag`, `r`, `c`, `max`, `req`, `free` | igual | igual | `t`: `p` pasiva · `c` elección · `k` clave (gratis, rango 1) · `f` final (1–3) · `x` ápice (1–4). Desaparece `a` (activa suelta) |
| `name`, `d(r)`, `win` | igual | `n`, `d`, `win` | `d` se copia como función; ≤ 120 caracteres por rango (G7) |
| `opts[]` | `{ k, name, desc, role, fx }` | `{ k, n, d, role, act, impl }` | `act` → `fx.grant` (solo en A) |
| `fx` | `{ stats, elem, skillLv, mod, tv, power, grant }` | — (se escribe desde `impl`) | Escala: número × rango o lista por rango (`scaleFx`). Finales y ápice: `power` + `talentRank`. Claves `tv` nuevas se declaran en `nucleo_tv` |
| `touch` | lista de ids o selectores | `touch` + banderas (`fire:true`) | Para iluminar en el libro |
| `arch`, `final`, `hyb`, `icon` | igual | igual | `icon` mapeado a `assets/` (§4) |
| `todo` | texto | `impl` | Solo en el esqueleto de E1.5; **prohibido** al cerrar E2 |

**Reglas que valida `test78` (genérico):** ids únicos por clase; solo la clase usa `c` + número; mismo número = misma casilla en las tres especializaciones (G16) y forma igual a `TV2.REJILLA`; `grant` solo en la opción A, ≤ 3 en clase y 1 por árbol héroe (G2); textos (G7: ≤ 120, sin `UNI`, `ÁREA×5`, `TTD`, `stagger`, `proc`, «astadora»); `spec.elem` y `spec.mechanic` válidos; ningún `mod` de clase usa `@spec` ni un id con `spec` (G1); las 12 builds legales punto a punto (G8); G8b; ≥ 3 nodos mecánicos por habilidad del kit (G17); estructura de G18; cada `power` registrado, con el prefijo de su clase y **sin repetirse entre clases** (D28); cada clave `tv` declarada en el núcleo o en `<CLASE>_TV_KEYS` (sustituye a la lista `TV_53` de `test65a`).

### 3.2 Estado guardado `p.talents` (v2)

```js
p.talents = {
  v: 2,
  spec: 'piromante' | null,
  cls: { c1: 2, c4: 3 },                                   // rangos de clase (comunes a las tres especializaciones)
  sp: { piromante: { s1: 3 }, crionte: { i2: 1 } },        // rangos por especialización (se conservan al cambiar)
  choice: { c6: 'B', s9: 'A' },                            // elecciones de clase y de especialización (ids únicos por clase)
  hero: { piromante: { tree: 'crono',
                       nodes:  { crono: { t2: 1, t3: 1 }, invoca: { f1: 1 } },
                       choice: { crono: { t2: 'A' } } } },
  loadouts: { piromante: [ { name: 'Lluvia', cls, choice, sp, hero } ] },   // ≤ 10 por especialización; nombre ≤ 24
};
p.skillForge = { bola_fuego: 'ii', m_dardo: null };        // D3
p.paragon   = { nodes: { /* tablero */ }, glyphs: { /* engarzados */ } };   // sin `points` (D12)
```

- Los nodos gratis (clave de especialización y de héroe) **no se guardan**: cuentan por estar abiertos.
- `normalizeTalents(raw, classId, level)`: si `raw.v !== 2` devuelve un v2 vacío (la migración se encarga de los v1); purga ids desconocidos y rangos > `max`; **valida por árbol** puertas, requisitos y presupuesto (`earnedAt` al nivel): si un árbol es ilegal, vacía **ese** árbol y deja el aviso `talentos-recortados`. Las configuraciones se normalizan al aplicarlas.
- `PLAYER_SAVE_FIELDS`: + `skillForge`; − `skillMods`, `skillBranches`, `skillPoints`. El estado volátil (`skState`, `skCharges`, `forged`, `planted`) **no** se guarda.

### 3.3 API de `js/talents.js` (puntos, puertas, Paragon y builds)

| Export | Contrato |
|---|---|
| `LEVEL_MAX` = 100, `TALENT_RULES` | Espejo exacto de `TV2.REGLAS` (`pts {cls 34, spec 31, hero 10, board 16}`, `specAt 10`, `specLast 70`, `heroAt 71`, `clsLate [85,90,95,100]`); la paridad lo compara |
| `CLASS_GATES` = `[{row:4,need:8},{row:7,need:24}]`, `SPEC_GATES` = `[{row:4,need:8},{row:7,need:20},{row:9,need:25,apex:true}]`, `HERO_GATES` = `[]` | `gateFail` sin requisito de nivel |
| `earnedAt(which, L)` | Copia literal de `talents-v2-comun.js`; `which ∈ cls \| spec \| hero \| board` |
| `pointKindAt(L)` | `'spec' \| 'cls' \| 'hero' \| 'board' \| null`: qué sistema da el punto de ese nivel (avisos) |
| `talentPointsEarned(p, which)`, `talentPointsLeft(p, which)` | `hero`: 0 si el Paragon no está abierto |
| `heroTreesFor(classId, specId)` → `[árbol, árbol]`, `findHero(classId, treeId)`, `activeHeroTree(p)` | Por `hero[].specs` |
| `heroOpen(p)` | `earnedAt('spec', Nv) ≥ 31` **y** 31 puntos gastados en la especialización activa |
| `heroPaused(p)` | Hay nodos de héroe en la especialización activa **y** `!heroOpen(p)` |
| `treeOf(p, 'cls' \| 'spec' \| 'hero')`, `ranksOf`, `choicesOf`, `gateFail`, `reqFail`, `canAddRank(p, which, id)`, `canRemoveRank` | Ámbito héroe = `hero[spec].nodes[tree]` |
| `aggregateTalents(p, { elemOf, kitOf })` | Devuelve `{ stats, tv, powers:Set, skillLv, mods, grants:Set, innate, spec, mechanic, ranks, powerRank, hero, heroOpen, heroPaused }`. El árbol héroe solo aporta si `heroOpen`. `elemOf(skillId)` = elemento **forjado**; `kitOf(specId)` = ids del kit (los pasa `recompute`) |
| `talentRank(p, nodeId)` | Rango efectivo (0 si el árbol no aporta); los poderes de finales/ápice lo usan |
| `specElem(spec)` | `spec.elem` |
| `buildsFor(classId, specId)`, `defaultBuildKey(classId, specId)`, `normBuild(build)` | `'id_'` = rangos tardíos |
| `buildRanks(p, build, { level })` → `{ cls, sp, choice, hero }` | Llenado punto a punto **idéntico** a `simularBuild` del validador y a `t2applyPreset` (incluye `heroNodes` en orden si el Paragon abre) |
| `treeSignature(classId)` | FNV-1a de ids + `max` + `req` + `t` de los tres ámbitos |
| `normalizeTalents(raw, classId, level)` | §3.2 |
| `presetList`, `presetRanks` | Envoltorios de `defaultBuild` para el banco; se borran en E4 |

Se eliminan `featCount`, `TALENT_CAP_LEVEL`, `TALENT_START_LEVEL` (pasa a `TALENT_RULES.specAt`), `specInsignia` y `talentSkillBase`.

### 3.4 Lo que ve la interfaz: `talents-ops` y el mixin

**Mixin `game-talents.js`** (nombres sin choque; `test43`):

| Método | Respuesta |
|---|---|
| `addTalentRank(which, id, k?)` (`which ∈ cls\|spec\|hero`; sin `k`: la última opción elegida o A) | `{ ok, reason?, rank, heroOpened? }` |
| `removeTalentRank(which, id)` | `{ ok, reason?, rank, heroPaused?, missing? }` |
| `chooseTalentOption(id, k)`, `toggleTalentChoice(which, id)` | Busca el nodo en clase, especialización y héroe |
| `chooseSpec(id)` | Conserva rangos por especialización; inicializa `hero[spec].tree` con el primero de `heroTreesFor`; `resetGauges`; barra por `SPEC_BAR` **solo** en las ranuras con kit de la especialización anterior o con habilidades que ya no se conocen; `reco` en habilidades nunca forjadas |
| `chooseHeroTree(id)` | Gratis fuera de combate; conserva los nodos de cada árbol |
| `applyTalentBuild(key?)` (alias `applyTalentPreset`) | Recomendado de la configuración elegida o `defaultBuild` |
| `saveTalentLoadout(name)`, `applyTalentLoadout(i)` (recorta con `buildRanks` si el nivel no da), `renameTalentLoadout(i, name)`, `deleteTalentLoadout(i)` | — |
| `resetTalentTree(which \| 'all')`, `exportTalentCode()`, `importTalentCode(code)` | — |
| `talentPointsInfo()` | `{ cls, spec, hero, board, heroOpen, heroPaused }`, cada uno `{ earned, spent, left }` |

`reason ∈ 'combat' \| 'points' \| 'gate' \| 'req' \| 'max' \| 'hero-closed' \| 'no-spec' \| 'choice' \| 'code-version' \| 'code-class' \| 'code-check' \| 'code-illegal'`. Los textos los pone la UI. `_talentMutate` manda al banner del HUD el aviso suave de pausa (2g §7.1) y el de apertura; con `_talentQuiet` (llamada del panel) no: los devuelve en la respuesta (`heroOpened`, `heroPaused`, `missing`) y el panel los enseña en su aviso y anima la revelación (cola W2c, `paso2-claves-w2.md` §8.3).

**`ops` para el panel** (envoltorio de `ui.js`): los métodos anteriores más `snapshot(p) → string` y `restore(p, s)` (la pila de deshacer vive en la UI y no se guarda).

### 3.5 Catálogo de habilidades y forja (`js/skills-<clase>.js`)

**Definición de habilidad (campos nuevos o que cambian):**

| Campo | Contrato |
|---|---|
| `spec: '<specId>'` | Kit de especialización: se conoce solo con esa especialización activa y Nv ≥ `req` (insignia 10, movilidad/utilidad 12, principal 14, definitiva 15) |
| `kind: 'talent'` | Activa de talento: `cat` `defense\|utility`, `slots: ['k2']`, sin forja, `req` del catálogo (21/27/31/72); se conoce por `talentAgg.grants` |
| `req` | Kit base Nv1–8 (cambios de `req` de cada doc) |
| `line` | Una línea del libro (≤ 120) |
| Claves de verbo | §3.6 |

**Forja** (`<CLASE>_SKILL_FORGE`, formato 2f §2.3 ampliado):

```js
export const GUERRERO_SKILL_FORGE = {
  g_martillo: {
    mejora: { name: 'Mango Largo', icon: 'forge/mejora', line: '…', mod: { perfectWin: 0.1 } },
    vars: [
      { id: 'g_martillo_i',  name: '…', role: 'UNI',  icon: 'forge/v_g_martillo_i',  line: '…', set: { 'charge.max': 1.6 }, add: { 'scale.coef.1': 0.6 } },
      { id: 'g_martillo_ii', name: '…', role: 'CTRL', icon: 'forge/v_g_martillo_ii', line: '…', elem: 'holy', tags: { add: ['zone'], remove: [] }, power: 'v_temple' },
    ],
  },
};
export const GUERRERO_SPEC_BAR = { berserker: { bar: { lmb, rmb, k1, k2, k3, k4 }, sel: 'g_rajar' } };
export const GUERRERO_FORGE_RECO = { berserker: { g_tajo: 'i', g_rajar: 'ii' } };   // 'i' | 'ii' (el mockup usa 'A'/'B')
export const GUERRERO_FALLBACK_BAR = { lmb: 'g_tajo', rmb: 'g_hendidura', k1: 'embestida', k2: 'g_piel', k3: null, k4: null };
export const GUERRERO_CATALOG_V = 2;
```

- **Ids estables:** `<id>_m`, `<id>_i`, `<id>_ii`. **Papeles:** `UNI`, `AREA`, `CTRL`, `AGU`, `APO`, `MOV`.
- **`mod`**: claves de `mergeMods` (2f §2.3) más las nuevas: `windupAdd` (s), `windupMul` (%), `moveMulAdd` (puntos de %), `moveMulMin`, `charges`, `recastAdd`, `recastWin`, `comboWin`, `chargeSpeed` (%), `perfectWin` (s), `perfectEarly` (s), `perfectPct` (%), `zoneMax` (máx.), `pull`/`knock` (máx., m), `killReset` (bool), `shieldGain`, `dmgDirect`, `splashPct`. Toda clave numérica nueva se **suma** salvo que figure en `MOD_MAX`/`MOD_BOOL`.
- **`set`/`add`/`mul`**: rutas con punto sobre la **definición** (`'charge.max'`, `'autoShot.every'`, `'steps.2'`, `'steps.*.coef'`). `elem` cambia elemento y tags; `tags: { add, remove }`.
- **`power`** = `v_<id>` en `powers-forge-<clase>.js`; **`behavior`** = `v_<id>` en `<CLASE>_SKILL_BEHAVIORS` (≤ 3 nuevos por clase).
- **Desbloqueo:** Mejora con Nv ≥ `req + 3`; variantes con Nv ≥ `req + 6`. **API:** `g.chooseForge(skillId, 'i' \| 'ii' \| null)` (sin puntos; `canRespecFree`; `recompute`; desengarza soportes incompatibles con aviso).
- **Puro (`skill-defs.js`):** `forgeDef(sk, entry, { mejora, variant })`, `forgeMods(entry, state)`, `validateForge(entry, sk)` (ids, papel válido, `line` ≤ 120 —aviso si > 70—, poder o comportamiento registrado). **`skill-resolve.js`:** `forgeState(p, sk)`, `forgedDef(p, sk)` (caché `p.forged[id]`), `prof.def`, `prof.variant`.
- **Orden de `resolveSkill`:** rango → **forja de la definición** → mods de forja (Mejora + variante) → talentos (selectores sobre la definición forjada) → soportes por tags forjados → globales → ② `modifyResolve` → coste/CDR/topes.

### 3.6 Tipos genéricos nuevos y claves de verbo (vocabulario único)

| Verbo | Claves canónicas (en la definición) | Mods que suman | Estado / API | En `CastInfo` · `HitInfo` | Alias de los docs que **desaparecen** |
|---|---|---|---|---|---|
| **Preparación** | `windup` (s), `moveMul` | `windupAdd`, `windupMul`, `moveMulMin` | — | — | `windupMult`, `windupMove` |
| **Canalizar** (`type:'channel'`) | `channelT`, `ticks`, `hold: true\|false\|'toggle'`, `moveMul`, `autoShot: { every, coef, target:'nearest'\|'maxHp', range }`, `drainPerSec`, `endless` | `moveMulAdd` | `g.extendChannel(p, s)` (Danza Carmesí, Tierra Santa); fin con `endReason ∈ release \| done \| dodge \| interrupt \| drain \| cc \| cancel` | `cast.endReason`, `cast.released` | `moveFree`, `moveWhileChannel`, `moveSpd`, `stopIf`, `onRelease` |
| **Cargar y soltar** (clave, con cualquier tipo de entrega) | `charge: { min, max, perfect:[desde, hasta], perfectPct, perfectCrit, scale:{ coef, radius, range }, moveMul, autoRelease:true, instant:false, perfectGauge:{ <id>: n } }`. `scale.coef` = `[aMin, aMax]` (lineal) o `[[t, v], …]` (por tramos) | `chargeSpeed`, `perfectWin`, `perfectEarly`, `perfectPct` | `g._charging = { key, t0, … }`; `g.releaseSkillSlot(slot)`; la esquiva cancela **sin coste**; stat `perfectAlways` (Calma Absoluta); `cast.forcePerfect` (Punto Débil) | `cast.charge = { t, frac }`, `cast.perfect`, `hit.perfect` | `type:'charge'`, `chargeT`, `minT`, `coefAt`, `perfectMul`, `perfectBonus`, `moveWhileCharging`, `chargeMul` |
| **Relanzar** (clave) | `recast: { n, win, cond: null\|'hit', perfectLast: 0, cdFrom: 'first'\|'end', free: true, gap: 0.35 }` | `recastAdd`, `recastWin` | `p.skState[id].recast`; el CD cuenta según `cdFrom`; al cerrarse, ⑭ `onSkillEnd` con `kind:'recast'`, `casts`, `hits`, `reason ∈ max \| timeout \| miss` | `cast.recast = { idx, left, perfect }` | `window`, `max` (Arquera), `onChainEnd` |
| **Combo de 3** (`type:'combo'`) | `steps: [{ type, coef, radius, angle, range, width, at, windup, dot, moveMul }]` (`coef` = × el del perfil), `comboWin` | `comboWin` | `p.skState[id].combo`; `g.setComboStep(p, id, n)` | `cast.step` (1-based), `hit.step` | `comboStep` |
| **Secuencia del básico** (clave) | `seq: { every, extra: { count, spread, coef, pierce } }` | — | `g.setSeqCount(p, id, n)` | `cast.seqNth` | — |
| **Postura** (`type:'stance'`) | `stance: { modes: [{ id, name, stats:{…}, moveMul, chargeSpeed, keepGauge, color }, …], dur, swapCd, swapGcd: 0, endOnDodge, recastEnds }` (2 modos = alternar; 1 modo = encender/apagar) | — | `g.stanceOf(p, id)`, `g.setStanceBoth(p, id, dur)` (Guardia Total); se limpia al morir o cambiar de especialización | `cast.stance`, `cast.stanceFrom` | `stance.a/.b`, `stanceBoth` |
| **Plantado** | `needPlanted` (parámetro de efecto), `plant: true` (dash/salto: al llegar cuenta como plantado) | — | `p.planted`, `p.plantedT` (D20) | — | — |
| **Marca** (`type:'mark'` ampliado) | `mark: { id, dur, uses: 1, firstCharged, detonate: { by: <selector>, pct } }` | — | `g.marksOf(e)`, `g.detonateMark(e, id, opts)` | `hit.detonated` | `markUses` |
| **Trampa** (`type:'trap'` ampliado) | `trap: { armT, maxArmed, radius, root, burst: { radius, coef }, consume: true, lure: { radius, eliteRadius, boss: false, speedMul } }` | `zoneMax` | `g.fieldsOf(owner, { kind, skill })`, `g.detonateField(f, opts)`; campo `onDetonate` | — | — |
| **Detonar** (clave de impacto o de llegada) | `detonate: { radius, coef, chain }` | — | Estalla las trampas propias en el radio; 3 en 1 s → Batida (Coto) | — | — |
| **Muro** (`type:'wall'`) | `wall: { len, width, blocks: true, contain: false }` | — | Campo en línea; `Enemy.update` respeta `blocks`/`contain` | — | `type:wall` suelto |
| **Zona que te sigue** | `follow: 'owner' \| 'aim'` (zonas, lluvias, auras, emisores) | `zoneMax` | El campo se recentra en `updateFields` | — | `follow:true` |
| **Desplazar** | `pull` (m), `knock` (m), `drag: true` (avance que arrastra) | `pull`, `knock` | `Enemy.displace(from, dist, { toward })`, acotado a la distancia; rendimientos decrecientes de CC; a jefes, Quebranto | — | — |
| **Cargas** | `charges: n` | `charges` | `p.skCharges[id] = { n, max, nextAt }`; `g.reduceCooldown(p, id, s)` | — | `cds` como `{ t, n }` |
| **Otros** | `killReset`, `shieldGain: [pct, máx]`, buff `minHpPct` y `endHealPct` (se ignoran con golpes `unavoidable`), `taunt` | `killReset`, `shieldGain` | — | — | — |
| **Réplicas** (golpes repetidos en el mismo punto) | `repeat: { n, every, coef, needPlanted }` | `repeatAdd` | Van por `timers.js`; una réplica es un eco (no genera otra) | `hit.repeat` (1-based) | `aftershocks` (Terremoto, Guerrero §11.1) |
| **Estela de un avance** | `trail: { field, dur, width }` en `dash`/`leap` | — | Campo en línea del inicio al final del avance | — | Sendero de Luz (Guerrero §11.1: «dash + campo de sendero») |
| **Saltar a tu campo** | `at: 'ownField'` + `fieldKind` (en `leap`/`blink`/`dash`): destino = tu campo de ese tipo más cercano al cursor; sin campo, no se lanza (sin coste) | — | `g.fieldsOf(owner, { kind })` | — | Salto de Acecho (Arquera §11.1: «salto a la trampa») |
| **Aura con pulsos** | `pulse: { every, radius, taunt, coef }` en un buff con aura | — | Provoca o golpea cada `every` s mientras dura | — | Ciudadela (Guerrero: «`taunt 10` cada 1 s») |

**Alias del mockup que se traducen** (los lista `claves-impl.md`, E0.4): `perfectDmg` → `perfectPct` · `perfectMul: 1.5` (y su `tv.perfectMul`) → `perfectPct: 50` (saco aditivo) · `chargeMul` → `chargeSpeed` · `chargeT` → `charge.max` · `detonatePct` → mod sobre `mark.detonate.pct` · `perfectCdrAll` → clave `tv` nueva de la cola W2 (la lee ③ `afterCast` con `cast.perfect`) · `aftershocks` → `repeat`. Las lluvias de la Arquera son un **comportamiento** (`rain()` en `skills-arquera.js`), no un campo: su `follow` lo implementa KA dentro de `rain()`.

#### 3.6.1 Entrada, bloqueos e interrupciones de mantener y soltar (D27)

| Regla | Contrato |
|---|---|
| **Botones del ratón** | `mouseHeld.l/.r` = `e.buttons & 1` / `& 2` en `pointerdown`, `pointermove` y `pointerup`; el flanco de bajada de cada bit llama `g.releaseSkillSlot('lmb'\|'rmb')`. Con 🖱️Izq ya pulsado, pulsar 🖱️Der no genera `pointerdown` (Pointer Events agrupa los botones acordes en `pointermove`) |
| **Teclas** | `keyup` → acción por `codeToAction` → `releaseSkillSlot('k1'…'k4')`. `Space` (`primary`) no carga: ataca al más cercano como hoy |
| **Cuándo se mide la suelta** | El tiempo de carga avanza con el `dt` de simulación (el *hit-stop* lo congela igual para la barra y la lógica). La suelta se resuelve en el tick siguiente sumando lo transcurrido desde el último tick, para no perder un frame (a 30 fps un frame son 33 ms de una ventana de 200 ms) |
| **Qué bloquea una carga** | Mientras `_charging`: las demás ranuras **no** se lanzan, salvo la esquiva y la movilidad (`1`), que la **cancelan sin coste**, y una postura con `swapGcd: 0`, que se alterna sin cortarla. El básico mantenido no dispara |
| **Interrupciones** | Fin de la carga con `reason ∈ release \| auto \| dodge \| interrupt \| cc \| cancel \| panel`. Control duro (aturdir, congelar) o un golpe > 10 % de la vida = `interrupt`/`cc` **sin coste**, como el canal. `blur`, `visibilitychange`, abrir un panel o pausar = `cancel`/`panel` sin coste (`g.cancelHeld(reason)`) Cada fin queda además en `g._chargeEnd = { key, id, reason, perfect, frac, t, instant }` para la UI, también con `reason: 'reset'` (`resetCastState`: cambio de mundo o muerte, **sin** ⑭); contrato en `paso2-claves-w2.md` §8.1 (cola W2c) |
| **Básico tensable** (Cuerda Tensa) | `charge.repeat: true` (por defecto en `cat:'basic'`): mantener 🖱️Izq tensa, suelta sola al máximo y vuelve a tensar (fuego continuo). Un toque dispara al mínimo. Las demás ranuras usan `_needsRelease` |
| **Esquema clic-mover** | 🖱️Izq mantenido sobre un enemigo tensa el básico tensable; los ataques automáticos a `attackTarget` salen sin tensar |
| **`holdMode: 'toggle'`** | Solo para `charge` y `channel` con `hold`: la 1.ª pulsación empieza y la 2.ª suelta; la ranura muestra el estado enganchado. Un relanzamiento (`recast`) conserva su pulsación |
| **Relanzar + cargar** | Con `recast` y `charge` en la misma habilidad (Tiro Celestial), cada relanzamiento abre su propia carga; la ventana de relanzar no corre mientras se carga |

**Repeticiones** (Eco, Archimaga, Meteoro Gemelo, Marca del Tiempo): `cast.echo > 0` no consume cargas ni relanzamientos, no avanza combo ni secuencia, una carga repetida sale con `frac = 1`, y **una repetición no genera otra**; tope de 3 impactos repetidos por lanzamiento (Maga §12).

**Ganchos.** ⑭ `onSkillEnd(g, p, sk, end)`, `end = { kind: 'recast' \| 'channel' \| 'charge' \| 'stance' \| 'combo', reason, casts, hits, released, frac, perfect }`. El comportamiento `end` (ya en `BEHAVIOR_KEYS`) recibe el mismo `end`. «Perfecto», «paso» y «postura» se leen en ③ `afterCast` y ⑤ `onHit`.

**Chip de verbo** (D22): `skillVerbs(def)` → subconjunto de `hold`, `charge`, `recast`, `combo`, `seq`, `stance`, `trap`, `detonate`, `planted`, `follow`.

**Rendimiento de los estados:** plantado, postura, racha de perfectos y ventana de relanzar **no** se aplican con `addBuff` (cada `addBuff` llama `recompute()`); se leen como condición en `condAdd`/`condDr` o en los poderes. Solo un buff con duración real (Furia Inmortal, Calma Absoluta) usa `addBuff`.

### 3.7 Estado volátil y API de juego (resumen para poderes y UI)

| Pieza | Dónde | Contrato |
|---|---|---|
| `p.skState[id] = { recast, combo, seq, stance }` | `entities.js` | No se guarda; `resetCastState` lo limpia al cambiar de mundo o morir |
| `p.skCharges[id]` | `entities.js` | Recarga perezosa con `simT` |
| `g._charging`, `g._channel` | `game-skills.js` | Lo leen `slotView` y `ui-verbs` |
| `p.setMoveMul(id, mul, dur)` / `p.clearMoveMul(id)` | `entities.js` | `spd ×= Π`; `0` = quieto (`p.moving = false`). Sustituye el clavado a mano de `m_t_bloque` |
| `g.releaseSkillSlot(slot)` | `game-skills.js` | Lo llaman `input.js` (keyup y flanco de `e.buttons`) y el sondeo; en el arnés, `h.release` |
| `g.cancelHeld(reason)` | `game-skills.js` | Cancela carga y canal mantenido **sin coste** (`blur`, panel, pausa); ⑭ con `reason` |
| `g.reduceCooldown(p, id, s)` | `game-skills.js` | Única vía para restar CD (respeta cargas). Test: ningún `p.cds[x] =` fuera de `game-skills.js`/`entities.js` |
| `g.chooseForge(id, v)` | `game-skills.js` | §3.5 |
| `fireProjectile(ctx, { coef, critBonus, from })` | `game-skills.js` | `coef` propio (autoShot, emisores), `from` = posición de un campo |
| `Enemy.displace(from, dist, { toward })` | `entities.js` | §3.6 |

### 3.8 Selectores de talentos (claves de `fx.mod`)

| Selector | Expande a |
|---|---|
| `'<skillId>'` | Esa habilidad (las dos variantes) |
| `'@all'` | Todas las conocidas |
| `'@<elem>'` (`@fire`, `@frost`, `@arcane`, `@holy`, `@nature`, `@physical`) | Por elemento **forjado** (`elemOf`) |
| `'@spec'` | Kit de la especialización activa (`kitOf`). **Prohibido en el árbol de clase** (G1) |
| `'@cat:<cat>'` y atajos `@basic`, `@spender`, `@movement`, `@defense`, `@utility`, `@insignia` (= `spec`), `@ultimate` | Por categoría (`@movement` = «tu movilidad», la de la ranura `1`) |
| `'@tag:<tag>'` y atajos `@melee`, `@charge`, `@recast`, `@combo`, `@stance` | Por tag forjado |
| `'@windup'` | Definición forjada con `windup > 0` |
| `'@holyZone'` | Tag `zone` y elemento `holy` (Cruzado) |

### 3.9 Tablero de glifos

- `paragonPointsEarned(p) = earnedAt('board', Nv)` (16 a Nv100); `paragonPointsLeft(p)` = ganados − nodos activos. Se abre al **Nv81** (la UI decía 20).
- `PARAGON_BOARDS[cls]` (en `paragon-board.js`): 9 × 9; desde el inicio, primer legendario a **8–10 casillas** con **un zócalo en el camino** y el segundo a **10 más**: con 16 puntos se llega a uno con su zócalo, nunca a los dos (test). Los legendarios dan **estadísticas** (sin `power`); los poderes `furia`, `festin`, `volatil`, `multidisparo` y `agil` salen del tablero (si un poder se usa en otra parte, se conserva el `definePower`).
- `allocateParagonNode`, `socketGlyph`/`unsocketGlyph` como hoy; `respecParagon` **gratis** fuera de combate (D12).

### 3.10 Código de build `IRPG2`

`IRPG2-<clase>-<spec|x>-<firma2>-<cls>-<spec>-<árbolHéroe|x>-<héroe>-<chk2>`

- Por nodo **no gratis**, en el orden de los datos: un carácter base36 en minúscula con el rango; tras una elección con rango, `A` o `B` en mayúscula (no se confunde con base36). Héroe: `0/1` por nodo + `A`/`B`.
- `firma2` = 2 caracteres de `treeSignature(classId)`; si no coincide → `code-version` («build de otra versión de los árboles»).
- `chk2` = FNV-1a (2 caracteres base36) de todo lo anterior.
- Importar es **todo o nada** y valida puntos, puertas y requisitos al nivel actual (o recorta con `buildRanks` si el jugador lo acepta). `IRPG1-…` → `code-version` con el texto «código de una versión anterior».

### 3.11 Migración de guardados v4 → v5

**Tablas por clase** (`js/save-legacy-<clase>.js`, **solo datos**, las escribe KA):

```js
export const MAGA_LEGACY = {
  insignia: { piromante: 'p_llamarada', crionte: '…', arcanista: '…' },   // para MIGRATIONS[3] congelada (D16)
  bar: {                                    // habilidad vieja → nueva; por especialización con '*' de reserva
    m_ascua: { to: 'm_dardo', forge: 'i' },
    m_toque: { to: 'm_dardo', forge: 'ii' },
    m_armadura: { to: 'm_barrera' },
    p_muro_fuego: { to: { k2: 'm_barrera', k3: 'p_llamarada' } },          // por ranura
    terremoto: { to: { guardian: 'terremoto', '*': 'g_hendidura' } },      // (ejemplo del Guerrero)
  },
  forge: {                                  // LEGACY_FORGE_MAP: opción de la 3.ª rama de v4 → variante 2g
    bola_fuego: { <optIdDeLa3.ªRama>: 'i' | 'ii' | null },                 // misma habilidad
    torbellino: { to: 'g_remolino', map: { <optId>: 'ii' } },               // habilidad absorbida: variante de OTRA (ejemplo del Guerrero)
  },
  removed: [ 'm_ascua', 'm_toque' ],        // ids que desaparecen (sus soportes vuelven a knownSupports)
  notice: 'Los talentos de la Maga se rehicieron hasta el nivel 100. Te aplicamos el Recomendado; revísalo con N',
};
```

**Las tablas se escriben desde v4, no desde 2f.** §11.6.4 del Guerrero («Torbellino II (Ciclón) → Remolino II», «Furia Inmortal I/II se conservan») y §11.3.3 de la Arquera («las variantes 2f… vuelven a sin elegir; la Mejora se conserva») hablan de variantes 2f que **nunca** se guardaron (D1). KA compone las dos traducciones: opción de la 3.ª rama de v4 (`catalog-v4.json`) → variante 2g, con el criterio de papel de 2f §6.1.

**`MIGRATIONS[4]`** (sobre una copia, idempotente, para las tres clases):

1. **Nivel**: `level ≤ 100`; XP acotada a `xpForLevel(100)`.
2. **Forja**: `skillForge` desde la opción de la 3.ª rama de `skillMods` con `legacy.forge` (entrada con `to` = variante de la habilidad destino); las absorciones de `legacy.bar[*].forge` fijan la variante de la habilidad destino. **Si dos fuentes eligen variante para la misma habilidad** (p. ej. `m_ascua` → `m_dardo` I y `m_toque` → `m_dardo` II, o `a_disperso` y `a_cicuta` → `a_disparo`), gana la de la ranura con más prioridad (`lmb`, `rmb`, `k1`, `k2`, `k3`, `k4`) y, fuera de la barra, la propia habilidad antes que una absorbida. Se borran `skillMods`, `skillBranches` y `skillPoints`. Si el save ya no trae `skillMods` (segunda pasada), `skillForge` no se toca.
3. **Talentos**: `talents = { v:2, spec, cls:{}, sp:{}, choice:{}, hero:{}, loadouts:{} }` conservando `spec` (los ids de especialización no cambian) y luego `buildRanks(fakeHero, build)` con la `defaultBuild` de su especialización al nivel del save (incluye el árbol héroe si llega). Sin especialización (Nv < 10): todo vacío.
4. **Tablero**: `paragon.nodes = {}`; los glifos engarzados vuelven a `materials` (con `canAddMaterial`); si no caben, quedan en `paragon.glyphs` **sin engarzar**. Se borra `paragon.points`.
5. **Barra**: cada ranura pasa por `legacy.bar` (`to: null` = vaciar); las activas de talento salen salvo que el Recomendado las conceda; cada destino se valida con `fitsSlot(sk, ranura)` y **sin duplicados** (en orden `lmb`, `rmb`, `k1`, `k2`, `k3`, `k4`: la primera ranura se lo queda; p. ej. `g_mandoble` en `rmb` → `g_tajo` no cabe en `rmb`); lo inválido, lo que exige otra especialización o ya no se conoce cae a `SPEC_BAR[spec].bar` y, si no, a `FALLBACK_BAR`. `lmb` nunca queda vacía.
6. **Soportes**: se reencajan con `supportFits` sobre la definición **forjada**; lo que no encaja o pertenece a habilidades retiradas vuelve a `knownSupports`.
7. **Aviso**: `notices` es un **array de ids** (como el `'talentos'` de hoy, que muestra `main.js` con `LOAD_NOTICES[id]`): se añaden `'paso2'` («Las ramas ahora son variantes: elige gratis en el libro (T)») y `'paso2-<clase>'` (el `legacy.notice` de su clase). `LOAD_NOTICES` gana esas cuatro entradas; `main.js` no cambia.

**Respaldo:** antes de migrar, `main.js` guarda una copia única del save crudo en `<clave del slot>.bak-v4` (no se borra sola). Va en `try/catch`: si `localStorage` está lleno (hay 3 huecos más el alijo compartido), se migra igual y se avisa por consola. Las importaciones de un save v4 exportado pasan por el mismo camino.
**`MIGRATIONS[3]` congelada:** escribe los talentos v1 tal cual (sin `normalizeTalents` vivo) y `k3 = legacy.insignia[spec]`; `MIGRATIONS[4]` los rehace. **`MIGRATIONS[0]` y `[2]` también se congelan** (W1): hoy importan `SKILL_MODS`, `CLASSES`, `SUPPORTS` y `weaponBasicOf` vivos. `test61` comprueba la **cadena completa** v0 → v5 y v3 → v5.
**Datos vivos a propósito:** `MIGRATIONS[4]` sí usa los datos vivos (`defaultBuild`, `SPEC_BAR`, `FALLBACK_BAR`, `forgeDef`): aplica el Recomendado vigente el día en que el jugador carga. Por eso `test-save-2g` calcula lo esperado con esos datos y no con valores escritos a mano (E4 puede cambiar una build).

### 3.12 Modelos de vista y contrato de DOM (UI y humo)

**Fábricas** (U3 las monta; U1/U2 las implementan):

```js
createTalentPanel(root, { ops, getPlayer, getGame, onClose, onOpenBook })  // → { open(), close(), refresh(), el, check() }
createSkillBook(root,   { game, onClose, onOpenTalents })                  // → { open(), close(), refresh(), el, check() }
createVerbHud(root,     { game })                                          // → { update(realDt), el }  (lo llama ui.updateFloats CADA FRAME, D26; no updateHUD a 10 Hz)
```

**Modelos puros** (testeables sin DOM): `talents-view.js` → `talentsView(p)` (nodos con posición, forma, estado `locked|avail|partial|max|paused`, aristas, bandas de puertas, cabeceras «Gastados X / Y», estado del Paragon); `hud-model.js` → `slotView(p, slot)` ampliado (`charges`, `recast`, `combo`, `seq`, `charge`, `channel`, `stance`, `planted`), `forgeView(p, sk)` (Mejora y variantes con estado `bloqueada|abierta|elegida`, nivel, tags tachados y añadidos), `bookView(p)`, `verbView(g)` (lo que dibuja `ui-verbs`: carga con `frac`, ventana `[desde, hasta]`, `inWindow`, `calm`; relanzar con usos y tiempo; pips), y los que pide 2f §3.8 y §7.1: `talentLinks(p, skillId)` («Talentos que la tocan»), `nodeSkills(node)` («Habilidades que toca»), `specSwapSummary(pPrev, pNext)` (la tira al cambiar de especialización: insignia, activas que entran y salen, variantes recomendadas, barra nueva) y `levelUpNews(p, nvAntes, nvDespués)` (aprendidas, Mejoras a `req+3`, variantes a `req+6`, puntos por sistema; el aviso agrupado «Nivel 8: 3 novedades»).

**Feedback de los verbos** (U2; el mockup no dibuja ninguno, así que esta tabla manda y `tests/visual/verbs.html` la enseña para el juicio):

| Verbo | Ranura (DOM) | Junto al cursor (DOM) | Mundo (`world-marks.js` o `fx-skills.js`) | Sonido (`sfx.js`, lo emite la simulación) |
|---|---|---|---|---|
| Cargar y soltar | Barra que se llena en la ranura | Barra de 64 × 6 px a 24 px del cursor, **dentro de la pantalla**; la ventana es un tramo dorado **con muescas** (no solo color); con Calma Absoluta, dorada desde media carga (chargeRelease: perfecta desde frac 0,5) | Destello en el arma al entrar en la ventana | `verb_win` al entrar · `verb_perfect` + «¡Perfecto!» (`spawnText`) al acertar · `verb_miss` al soltar fuera (reinicia la racha) · acierto, fallo o cancelación según `g._chargeEnd` (misma ranura, mismo id y `t ≥ t0`; sin él, la racha de perfectos): `paso2-claves-w2.md` §8.1 |
| Relanzar | Aro que se vacía y número de usos; dorado en los últimos `perfectLast` s | — | — | `verb_tick` al entrar en el tiempo justo |
| Combo / secuencia | 3 pips; el que toca brilla | — | — | `verb_pip` en el 3.º |
| Canal | Aro que se consume; late si es sin fin | — | Estela (Carrera) | — |
| Postura | El icono se da la vuelta; marco del color del modo | — | Aro a los pies | `verb_stance` al cambiar |
| Plantado | Icono de estado | — | Anillo bajo los pies (10 Hz basta) | — |
| Trampas, cebo y detonar | Contador de trampas armadas | — | Hilos del cebo; las trampas parpadean 0,1 s antes de estallar (por frame, en `field-entities`); anillo de la Batida | `trap` (existe) · `verb_hunt` en la Batida |

Reglas: actualización por frame **solo** con `transform`/`opacity` sobre nodos creados una vez (sin leer el *layout* por frame); con «reducir movimiento», sin pulsos ni sacudidas pero con el mismo color y forma; con el sonido apagado, todo se entiende por la vista. En modo `toggle`, la ranura enseña que la carga está enganchada.

**DOM estable** (para el humo y `?talentscheck=1` / `?skillscheck=1`):
- `#talents-panel[data-open]`, `[data-tree="cls|spec|hero"]`, `.tn[data-node="<id>"][data-state]`, `.tn-choice[data-k="A|B"]`, `.tp-gate[data-row]`, `.tp-hero[data-paused]`.
- `#skills-book[data-open]`, `.sb-tile[data-skill="<id>"]`, `.sb-var[data-var="i|ii"][data-state]`, `.sb-mejora`.
- `.verb-charge[data-in-window]`, `.verb-pips[data-slot]`, `.verb-ring[data-slot]`, `.verb-stance[data-slot][data-mode]`.
- `window.__uicheck = { panel, overlaps: [], offscreen: [] }` tras cada `check()`.
- **Marcador de icono:** si una imagen no existe, `<span class="ico-missing" data-id="<id>">` con el id y el color del papel (como el mockup).

---

## 4. Conversores automáticos

Sí conviene, para **estructura y textos** (exactos y verificables). **No** para efectos (`fx`, poderes, forja): son semántica y se escriben a mano desde `impl`, `k` y el documento.

**`tools/convert-v2/convert.mjs`** (Node, sin dependencias):
- Carga `talents-v2-comun.js` y el archivo de clase en `node:vm` con un `window` falso (el formato de los datos es de script clásico).
- `--draft <clase>|--todas` → `tools/convert-v2/out/<clase>/`:
  - `talents-<clase>.js` y `hero-<clase>.js` en el formato de §3.1 (renombra `n→name`, `opts[].n/d→name/desc`, `act→fx.grant`, banderas → `touch`; copia `builds`, `defaultBuild`, `specs`, `groups`; `role` del juego actual + `roleLabel` del mockup);
  - `skills-<clase>.draft.js`: catálogo (ids, `cat`, `req`, `spec`, `elem`, `coef`, `cost`, `cd`, `line`, `talent`) y forja (nombres, líneas, papeles e ids; el `k` del mockup como comentario), `SPEC_BAR` (`'A'/'B'` → `'i'/'ii'`), `FORGE_RECO`, `FALLBACK_BAR`; para ids que ya existen en el juego, la definición actual como comentario;
  - `pendientes-<clase>.md`: lista de comprobación de cada nodo, opción y entrada de forja con su `impl`/`k` marcado `NUEVO`, `existe` o vacío (la lista de trabajo de KA/KT; E2 termina cuando está vacía). El conversor no reescribe un `pendientes-<clase>.md` que ya existe (`--regenerar-pendientes` lo fuerza, sin copia); el del Guerrero vive en `out/guerrero/`. `power-ids.json` trae además `registrados` (lo que registra hoy el juego, por clase) y `choquesRegistro`.
- `--write talents <clase>|--todas` (solo E1.5): escribe en `js/` el esqueleto (`fx: {}` + `todo`; `grant` solo si la activa ya existe).
- **Funciones `d(r)`**: se serializan con `toString()`; los identificadores libres (`n1`, `pl`) se importan de `js/talent-text.js`; si aparece otro, el conversor falla. Se verifica que `d(r)` dé el mismo texto en el mockup y en la salida para `r = 1…max`.
- **Iconos**: `talents/…`, `icons256/…`, `specs/…` → `assets/<ruta>` si existe en el repo; si no, se conserva la ruta y se anota en `missing-icons.md` (la UI pinta el marcador).
- **Ids de poder** (D28): extrae los `power <id>` y `v_<id>` de `impl` y `k` de las tres clases a `out/power-ids.json`; falla si dos clases (o dos nodos) usan el mismo.
- **Claves de verbo**: lista en `out/claves-impl.md` cada clave de `impl`/`k` que no esté en §3.6, con su traducción de la tabla de alias o «SIN TRADUCCIÓN» (eso para al orquestador antes de E2).
- `--validate-game <clase>` (opcional): convierte los datos del **juego** al formato del mockup y corre `validar-talentos.mjs` (reutiliza `simularBuild`, presupuesto y puertas).

**`tests/test-v2-paridad.mjs`** (en `npm test` desde E0): para cada clase con `v: 2` en el juego, compara contra el mockup: `TALENT_RULES` = `TV2.REGLAS`; ids, `t`, `r`, `c`, `max`, `req`, `free`; opciones (`k`, `role`, `grant`); nombres y `d(r)`; `win`; árboles héroe (`specs`, `key`, `line`); `builds` y `defaultBuild` (igualdad profunda); catálogo (ids, `cat`, `req`, `spec`, `elem`) y forja (nombres, líneas, papeles); `SPEC_BAR`, `FORGE_RECO` y `FALLBACK_BAR`. Las divergencias **deliberadas** van en `tools/convert-v2/divergencias.json` con su motivo. Así, cualquier cambio de diseño posterior (Guerrero y Arquera, D18) rompe el test y obliga a sincronizar a conciencia (`--draft` + diff).

---

## 5. Riesgos y orden de mitigación

| Orden | Riesgo | Mitigación | Etapa |
|---|---|---|---|
| 1 | **Contratos que derivan** entre trabajadores en paralelo (nombres de claves, firmas) | §0 y §3 congelados en E0; `test82` y `test78` los fijan como tests antes de los datos; cambios solo por el orquestador y anotados aquí | E0–E1 |
| 2 | **Pérdida de datos de guardado**: ids reutilizados (`c1…`, `s1…` con otro significado), `MIGRATIONS[3]` con catálogo vivo, glifos que no caben, niveles > 100 | Saves v4 **reales** generados antes de tocar código (E0.2); vaciar talentos **antes** de normalizar; `MIGRATIONS[3]` congelada; glifos sin engarzar si no caben; respaldo `.bak-v4`; `test-save-2g` idempotente | E0, E1, E5 |
| 3 | **Diseño de Guerrero/Arquera aún cambia** | Commit congelado (D18), Maga primero, paridad en `npm test`, `divergencias.json` | E0, E2 |
| 4 | **Conmutación a medias** (kit de especialización al catálogo, insignia que desaparece de la barra, tests de `kind:'talent'`) | Cuarentena explícita (D21) con dueño; KA conmuta catálogo, barra y tablas legadas a la vez; el humo comprueba que a Nv10/15 las ranuras `3` y `4` no quedan vacías | E1.5, E2 |
| 5 | **Volumen de E2** (468 nodos, > 320 efectos nuevos) | KA/KT separados; KT en 3 trabajos; `pendientes-<clase>.md` como lista; cobertura al 100 %; reutilizar claves `tv` de `nucleo_tv` y tipos genéricos antes de crear poderes | E2 |
| 6 | **Verbos contra la entrada**: autofuego de 🖱️ mantenido, esquema clic-mover sin `mouseHeld`, ecos que avanzan combos o esperan a soltar, `p.cds` escrito en 20 sitios | `_needsRelease`, `mouseHeld` en clic-mover, reglas de repetición (§3.6), `reduceCooldown` + test que prohíbe escribir `p.cds` fuera del motor | E1 |
| 7 | **Ergonomía de mantener** (`1` mientras se mueve con WASD; ventana perfecta con ratón) | `holdMode: 'toggle'` en Opciones; barra junto al cursor; ventana base 0,2 s ajustable por datos; el banco simula 60 % de acierto | E1, E3, E4 |
| 8 | **Archivos compartidos** (`ui.js`, `main.js`, `entities.js`, `data.js`) | Dueño único por etapa (§2.1); refactors de E0 que separan `progression.js`, `paragon-board.js` y `mech-<clase>.js`; UI nueva en módulos propios y `ui.js` solo con U3 | E0, E3 |
| 9 | **Potencia de Nv50 a Nv100** (`skillRank` topa en 5, ILVL 40, área 63) y Paragon que pasa al Nv81 (los héroes Nv21–80 de hoy pierden el tablero) | Asumido por el diseño (2g §12, riesgo 3); E4 estira solo la curva de enemigos; aviso de migración que lo explica; itemización fuera (§7) | E4 |
| 10 | **Cambiar de especialización pisa barras personalizadas** | Solo se reescriben ranuras con kit anterior o habilidades no conocidas; forja recomendada solo en habilidades nunca elegidas (D3) | E1 |
| 11 | **Rendimiento**: `recompute()` corre en **cada** `addBuff` y rehace `aggregateTalents` (156 nodos con selectores) y vacía `p.resolved`; con posturas, plantado y perfectos sería varias veces por segundo. Además, campos con `blocks`/`lure` consultados por enemigo y frame | `aggregateTalents` y `forgedDef` **memoizados** por revisión (talentos, nivel, especialización, forja), no por buffs; plantado, postura y rachas como condición, no como `addBuff` (§3.6); `blocks`/`lure` solo con campos de ese tipo vivos y el cebo evaluado a 5 Hz escalonado por enemigo; topes (`maxArmed`, 9 cepos, 1 muro). `test77` afirma el memo de `aggregateTalents` y `test84` mide `recompute` de un héroe Nv100 (media < 0,5 ms en 1000 llamadas) y el humo, el tick con 30 enemigos contra la línea base de E0 | E0, E1, E5 |
| 12 | **Port grande de la UI** (mockup de 2101 líneas) que se ve distinto del aprobado | Fábricas y DOM fijados (§3.12), `?talentscheck=1`/`?skillscheck=1`, capturas del juego junto a las del mockup a 1366 y 1920 para el juicio | E3 |
| 13 | **Textos que vuelven a la jerga** (G7, G15) | Tests genéricos (`test78`, `test81`) y grep de «astadora» en E5 | E1–E5 |
| 14 | **Iconos que faltan** se ven rotos | Marcador obligatorio (§3.12); `missing-icons.md` para la tanda de arte posterior | E3 |
| 15 | **`test43` y `sw.js`** tocados por varios | Solo el integrador/orquestador (`test43`); `sw.js` con todas las rutas desde E0.6 (P5) y C1 al cierre | E0, E1.5, E5 |
| 16 | **El juego no arranca** entre E1 y E3 por un `import { X }` de un export retirado (`ui.js` importa `SKILL_MODS`; `entities.js`, `TALENT_START_LEVEL`; `save-schema.js`, `specInsignia`) | Stubs `@deprecated` (D23) hasta E5; el humo `boot` falla con cualquier error de módulo | E1–E5 |
| 17 | **Feedback de la ventana tardío** (HUD a 10 Hz, suelta procesada un frame tarde, FPS bajos) | Vista por frame (D26), sonido emitido por la simulación en el borde, suelta con el tiempo transcurrido (§3.6.1), ventana base 0,2 s ajustable por datos | E1, E3 |
| 18 | **Botones acordes y foco**: 🖱️Der sin `pointerdown` con 🖱️Izq pulsado; tecla que queda «mantenida» tras `Alt+Tab` (hoy `blur` no vacía `keys`) | `e.buttons` y `cancelHeld` (§3.6.1); `test82` con secuencias de eventos sintéticas | E1 |
| 19 | **Coste de `npm test`**: `forge-bench`, `test-v2-paridad`, `test-save-2g` y los bancos entran solos en `run.mjs` | Modo por defecto rápido (1 semilla, < 60 s por suite); `--report` aparte | E4 |
| 20 | **Pestaña vieja abierta** tras publicar: el *service worker* hace `skipWaiting`/`clients.claim`, pero el JS ya cargado sigue siendo v4 y puede **guardar encima** de un save ya migrado a v5 (lo leería como «versión futura») | Respaldo `.bak-v4`; aviso en `MEMORIA.md` para el día de la publicación (cerrar las pestañas antes de abrir la versión nueva) | E5 |

---

## 6. Test de humo (sin humano)

**`tools/smoke/smoke.mjs`** — `npm run smoke -- [--level boot|panels|full] [--port 8099] [--res 1920x1080,1366x768] [--compare]`. Sin dependencias (Node 24: `WebSocket` y `fetch` globales). **No** entra en `npm test` (necesita Chrome); lo corre cada trabajador al terminar y el orquestador en cada juicio.

**Cómo funciona:**
1. Servidor estático propio (`node:http`) en `127.0.0.1:<puerto>` sobre la raíz del repo (MIME de `.js`, `.css`, `.webp`, `.png`, `.json`, `.glb`).
2. Chrome sin ventana (`CHROME_PATH` o `C:\Program Files\Google\Chrome\Application\chrome.exe`) con `--headless=new --remote-debugging-port=0 --user-data-dir=<temporal> --window-size=1920,1080 --use-angle=swiftshader --enable-unsafe-swiftshader`; el puerto sale de `DevToolsActivePort`. Perfil nuevo en cada corrida (sin guardados del dueño).
3. CDP por WebSocket: `Runtime`, `Log`, `Page`, `Network` (con `setBypassServiceWorker`) y `Fetch` interceptando `https://cdn.jsdelivr.net/npm/three@0.160.0/*` para servirlo desde `node_modules/three` (funciona sin red).
4. Se registran como **error**: `Runtime.exceptionThrown`, `console.error`, `Log.entryAdded` de nivel error y fallos de carga de recursos del mismo origen. Cualquier error falla la corrida.
5. Navega a `index.html?dev&hudcheck=1` y espera `window.__game.state === 'select'` (20 s máx.).

**Niveles:**

| Nivel | Pasos | Afirma |
|---|---|---|
| `boot` | Por clase: `__game.startGame('<clase>', {}, 7)`; 3 s de juego; `p.level = 10`, `chooseSpec` de cada especialización, `recompute`; `spawnPack`/`spawnWave` cerca y `castSkillSlot` en las 6 ranuras (y `releaseSkillSlot`) durante 5 s | Estado `play`; el contador de frames avanza; HUD visible; `hudcheck` sin solapes; ranuras `3`/`4` con habilidad a Nv15 (solo en las clases con `CATALOG_V = 2`); 0 errores (incluidos los de enlace de módulos) |
| `panels` | Por clase y especialización a Nv 10/40/69/70/100 (`p.level`, `applyTalentBuild()`): abre `T` (`ui.togglePanel('skills')`) y `N` (`ui.openTalents()`); cuenta nodos (30 + 29 + 13) y estados; clic real (`Input.dispatchMouseEvent`) en un nodo disponible → sube el gastado; clic derecho → baja; hover en un hexágono → `elementFromPoint` en el centro del icono = el nodo (G14); `Ctrl+Z` restaura; exporta e importa el código (ida y vuelta); a Nv69 el Paragon está en gris y a Nv70 se revela; elige una variante en el libro y cuenta los clics (A4 ≤ 2); `?talentscheck=1` y `?skillscheck=1` | `window.__uicheck.overlaps` y `offscreen` vacíos a 1920 × 1080 y 1366 × 768; capturas `out/<clase>-<spec>-<lvl>-{talents,book}-<res>.png` |
| `full` | `boot` + `panels` + carga los saves v4 de `tests/fixtures/saves-v4-paso2.json` en `localStorage` y `startGame('continue', {}, slot)`; mantiene una carga 0,8 s (barra junto al cursor visible: `.verb-charge`), relanza, alterna postura; 60 s simulados con 30 enemigos | `saveVersion === 5`, `talents.v === 2`, aviso de migración mostrado, existe `.bak-v4`; `.verb-*` visibles cuando tocan y `.verb-charge[data-in-window]` en el mismo frame en que `g._charging` entra en la ventana; coste medio del tick (solo simulación, `performance.now()` alrededor de la lógica, sin el render de SwiftShader) ≤ 1,25 × la línea base de E0 (`baseline.json`); 0 errores |

Cada nivel mantiene una carga **con eventos reales** (`Input.dispatchMouseEvent` con 🖱️Izq ya pulsado y después 🖱️Der) para cubrir los botones acordes (§3.6.1).

**`--compare`**: además captura el mockup (`file:///…/docs/mockups/skills-ux.html?cls=<clase>&view=talents&lvl=<n>&res=<res>&shot=1`) y deja cada par juego/mockup lado a lado en `out/compare/` para el juicio visual del orquestador.

**Salida:** `tools/smoke/out/report.json` (`{ ok, level, errors[], steps[{ name, ok, ms, detail }] }`) y las capturas; código de salida 1 si algo falla. Los pasos de `panels`/`full` que no encuentran el DOM de §3.12 se marcan `skipped` hasta E3 (y fallan desde E3).

---

## 7. Qué NO entra

- **Arte nuevo**: los 95 iconos de forja de 2f §5, los iconos nuevos de nodos y de árboles héroe (2g §7.6, Guerrero y Arquera Anexo/§15) y arte de especialización. Se usan los existentes o el **marcador** (§3.12); `missing-icons.md` queda como encargo para Codex.
- **VFX y SFX de calidad**: la pasada de VFX (aura de pasivas por especialización, 2f §3.9) y sonidos grabados o diseñados. Se reutilizan los efectos existentes (color por elemento, escala) y, para los verbos, se añaden **tonos sintetizados** de `sfx.js` (D26: son datos de una línea, no archivos; hoy no existe ningún «clang», «tic», cuerda ni cuerno).
- **Itemización a Nv100** (ILVL > 40, afijos, aspectos que modifican una variante concreta: Paso 4) y contenido de final de juego nuevo para el 100 (zonas, dificultades). E4 solo estira la curva de enemigos para medir.
- **Multijugador/cooperativo**, guardado en la nube, móvil y controles táctiles (el juego es solo PC).
- **Otras clases** o especializaciones.
- **El mockup**: no se modifica (ni su `codeOf`, ni el validador). Su código `IRPG2` puede alinearse después, en una tarea aparte.
- **Preguntas abiertas del dueño** (Guerrero §17.2, Arquera §17.2, el nombre «Concentración» repetido entre la barra de la Francotiradora y el nodo e10 de la Escriba Rúnica): se implementa la **propuesta actual del diseño** y queda en datos fáciles de cambiar.
- **Tutoriales o guía** más allá de los avisos de carga, subida de nivel, apertura/pausa del Paragon y migración.
- **Balance** más allá de G9, F1–F9 y las reglas vigentes de 2b.2 y 2e.

---

## 8. Criterios de aceptación → etapa y prueba

| Criterio | Qué | Prueba | Etapa |
|---|---|---|---|
| G1 | La clase no toca el kit de especialización ni usa `@spec` | `test78` | E1 (fixture) · E2 |
| G2 | Solo las opciones A previstas conceden habilidades, todas a la `2` | `test78` + `test-skills-<clase>` (`fitsSlot`) | E2 |
| G3 | Ritmo: ningún árbol se completa; último punto de especialización al Nv70 | `test77` | E1 |
| G4 | Un final al máximo cabe; dos no; con dos, el ápice no pasa de 1 | `test77` (algoritmo de `check3.js`) | E1 |
| G5 | Paragon sin efecto hasta 31/31; clave gratis al abrirse | `test77` | E1 |
| G6 | Formas círculo/hexágono/cuadrado | `test85` + capturas | E3 |
| G7 | Textos (≤ 120, sin jerga, `win` en cada elección) | `test78` | E1.5 · E2 |
| G8 | Las 12 builds por clase legales punto a punto | `test78` | E1.5 |
| G8b (Arquera §13) | Los puntos de una build van a habilidades de **su** barra | `test78`: con `build.bar` (opcional, Arquera §16.2.3) si existe; si no, contra `SPEC_BAR[spec]`, como aviso | E1.5 (aviso) · E2 (error en la Arquera) |
| G9 | Cada arquetipo gana su escenario; híbrida ≥ **0,85** (Maga) y ≥ **0,90** (Guerrero y Arquera) | `balance-bench --seeds 5` | E4 |
| G10 | Motion solo con `transform`/`opacity`/`clip-path`/`stroke-dashoffset`; reducir movimiento | Revisión de CSS + grep en `test85` | E3 |
| G11 · A7 | Migración correcta e idempotente | `test80` (algoritmo) · `test-save-2g` (saves reales) | E1 · E5 |
| G12 · A10 | `npm test` en verde, sin cuarentena | `npm test` | E5 |
| G13 | Paragon en pausa y recuperación | `test77` + `test-talentos-<clase>` | E1 · E2 |
| G14 | Hexágono: flotante encima; clic derecho quita | Humo `panels` | E3 |
| G15 | Ningún texto dice «Gastadora» | `grep -ri astadora js/` vacío | E5 |
| G16 | Rejilla común | `test78` + paridad | E1.5 |
| G17 | Verbos: ≥ 3 por especialización, principal distinto, **≥ 3 nodos mecánicos que tocan cada habilidad del kit** (Guerrero §13), feedback visible y a tiempo | `test-skills-<clase>` · `test78` (nodos por `touch`) · `test86`/`verbs.html` · humo `full` | E2 · E3 |
| G18 (Arquera §13) | Paragon: 3 árboles temáticos de la clase, cada especialización en 2, cada build con 10 nodos; diferencia ≤ 5 % entre los dos árboles de cada especialización | `test78` (estructura) · `balance-bench` (≤ 5 %) | E1.5 · E4 |
| A1 · A2/F7 | Forja completa y sin no-ops; `line` de la forja ≤ 70 (2f §3.7): `validateForge` avisa y KA acorta lo que pase (hoy Guerrero 12, máx. 110; Arquera 7, máx. 83) con `divergencias.json` | `test81` + `test-forge-<clase>` | E2 |
| A3 · F1–F9 | Reglas de forja | `forge-bench.mjs` | E4 |
| A4 · A5 | Clics y solapes | Humo `panels` | E3 |
| A6 | Forja bloqueada en combate, gratis fuera | `test81` | E1 |
| A8 | Iconos de forja en `UI_ASSETS` | **Diferido** con el arte (§7); el test acepta el marcador | — |
| A9 | Sin `powers.has(`; prefijos de poder; ids de poder únicos entre clases (D28) | `test67`, `test78`, `power-ids.json` | E0 · E2 |
| A10 | `npm test` verde y `balance-regression` sin regresiones del 2b.2 | `npm test` | E5 |

---

## Anexo · Plantilla de encargo por trabajador

```
Eres <ID> (<modelo>) del Paso 2 (2f + 2g) de IntentoRPG. Lee CLAUDE.md, MEMORIA.md y docs/paso2-implementacion.md (§0, §2.<etapa>, §3.<contratos que consumes>).
Archivos que te pertenecen (SOLO estos): <lista de §2.1>. Si borras o renombras un export, deja un stub @deprecated (D23).
Contratos que consumes (no los cambies): <§3.x>. Si necesitas algo de otro dueño, anótalo en tu informe; no edites su archivo.
Entrada de diseño: <secciones exactas de los docs y borradores del conversor>.
Terminado cuando: <criterio de la etapa>; npm test verde (cuarentena declarada en tests/pending-2g.json con dueño); node --check de tus archivos; npm run smoke -- --level <nivel>.
Informe final: archivos tocados, contratos consumidos, suites que sacaste o metiste en cuarentena, peticiones a otros dueños, dudas de diseño (con la propuesta que implementaste).
```

---

## Crítica y huecos (revisión de completitud, 2026-10-21)

Revisión del plan contra 2f, la Maga (§11, §13, §14), el Guerrero y la Arquera (etapa 2, estructura y verbos), el mockup, su contrato y el **código real** (`grep` sobre `js/` y `tests/`). Orden: de más a menos grave. «Corregido» = ya está en el cuerpo (sección indicada); «Pendiente» = decisión del orquestador o del dueño.

### Críticos (el plan, tal como estaba, no se podía ejecutar)

| # | Hueco | Evidencia | Estado |
|---|---|---|---|
| 1 | **El juego no arranca desde E1**: W1 y W2 retiran exports que otros módulos importan por nombre; un `import { X }` de un export inexistente rompe el grafo de módulos entero, así que el humo `boot` de W2 y de E1.5 no podía pasar | `ui.js:11` importa `SKILL_MODS`; `entities.js:7`, `TALENT_START_LEVEL`; `save-schema.js`, `SKILL_MODS`, `specInsignia` y `TALENT_START_LEVEL`; `game-skills.js`, `SKILL_MODS`; además `balance-bench` y 8 suites | Corregido: D23, riesgo 16, C1 en E5 |
| 2 | **Migraciones v0→v2 rotas**: solo se congelaba `MIGRATIONS[3]`, pero `[2]` usa `SKILL_MODS`, `CLASSES`, `SUPPORTS` y `skillSlots` vivos, y `[0]`, `weaponBasicOf` | `save-schema.js` L76-208 | Corregido: W1 (fila `save-schema.js`) y §3.11 |
| 3 | **`test71` en rojo con cada archivo nuevo**, y W1 compilando contra exports de W2 que en su worktree no existen (`SPEC_BAR`, `FORGE_RECO`) | `test71` L184-187 exige cada `js/*.js` y `css/*.css` en `sw.js`; `sw.js` solo lo tocaban P2 (E0) y C1 (E5) | Corregido: D24, E0.6 (P5 · Sonnet), matriz |
| 4 | **Feedback de la ventana perfecta a 10 Hz**: `createVerbHud.update` iba «en el bucle del HUD», que en `main.js` corre cada 0,1 s; en una ventana de 0,2 s eso es medio margen de retraso. Además, §7 prohibía sonidos nuevos y `sfx.js` **no tiene** «clang», «tic», cuerda ni cuerno | `main.js` L1774 (`hudTimer >= 0.1`); `sfx.js` (26 tonos, ninguno de verbos) | Corregido: D26, §3.12 (tabla de feedback), U2, U3, §7 |
| 5 | **Mantener y soltar con el ratón falla con botones acordes**: con 🖱️Izq pulsado, 🖱️Der no genera `pointerdown` (Pointer Events), y `onPointerUp` suelta los dos botones. El Martillo del Cruzado (DER) no cargaría mientras el básico ataca. Y `blur` no vacía `keys`: tras `Alt+Tab`, una tecla queda «mantenida» y un canal no se corta nunca | `input.js` L56-59 y L198 | Corregido: D27, §3.6.1, fila `input.js` de W2, humo |

### Altos

| # | Hueco | Evidencia | Estado |
|---|---|---|---|
| 6 | **Archivos sin dueño o con dos**: `economy.js` (W1 por el tablero, pero `respecSkills` es de la forja y escribe `p.cds`); `combat-math.js` sin dueño de E1 a E3 aunque las fórmulas solo pueden vivir ahí; `spec-mechanics.js` (núcleo) y `data.js` 🔒 sin cola; `sfx.js`, `fx-skills.js` y `world-marks.js` ausentes de la matriz; `test65a` y `test75` (una suite para tres clases) «reescritos por los tres KT»; `test76` asignado a KT cuando importa de `ui-talents.js` (U1) | `economy.js` L471-485; `test76` L9; `test75` L118-331 | Corregido: D25, matriz §2.1, filas de W1, W2, KT y U1 |
| 7 | **Suites rotas sin plan**: `test55` (afirma `p.skillPoints` y la forma del catálogo), `test66` (kits a Nv20), `test68` (`festin` y `m_aegis`, que sale), `test75` (ids viejos de las tres clases); y la afirmación de `test82` «ningún `p.cds[x] =`» habría fallado en E1, porque hoy lo escriben `skills-arquera.js` (3), `powers-*.js` (5) y `economy.js` (1), archivos que W2 no posee | `grep` de §2.2 | Corregido: §2.2 (inventario), `test87` en cuarentena con dueños |
| 8 | **Orden de dependencias real**: (a) `talent-text.js` nacía con W1 en E1, pero el conversor de E0 lo importa para comprobar `d(r)`; (b) KT necesita el kit real de KA para sus trabajos 2 y 3 (sus nodos modifican relanzar, la ventana, las trampas) y el plan fusionaba KA «antes del cierre de KT»; (c) el diagrama hacía esperar a E4 por E3; (d) U1 y U2 no podían correr el humo `panels` sin la integración de U3; (e) el humo exigía `3`/`4` llenas a Nv15 en E1.5, cuando la insignia aún no está en el catálogo | §2.0, E0, E1.5, E2, E3 | Corregido: diagrama y tabla de §2.0, E0.4, KA1/KA2, E1.5, E3 (`tests/visual/*`) |
| 9 | **Verbos sin tipo ni clave genérica**: réplicas del Terremoto (`aftershocks`), estela del Sendero de Luz (dash + campo), salto a tu trampa (Salto de Acecho), aura que provoca cada 1 s (Ciudadela); relanzar + cargar a la vez (Tiro Celestial) sin prueba; alias del mockup sin traducción (`perfectDmg`, `perfectMul`, `perfectCdrAll`, `detonatePct`, `chargeT`); `follow` del Diluvio prometido en campos, pero `rain()` es un comportamiento de clase | Guerrero §11.1; Arquera §11.1; `talents-v2-guerrero.js` L188, 338, 358; `talents-v2-arquera.js` L77, 283; `skills-arquera.js` L143 | Corregido: filas nuevas de §3.6 (`repeat`, `trail`, `at:'ownField'`, `pulse`), tabla de alias, `claves-impl.md` (E0.4), `test82`/`test83`. **Pendiente:** W2 confirma los nombres en E1 |
| 10 | **Migración de Guerrero y Arquera mal especificada**: sus docs traducen variantes **2f** que nunca se guardaron (D1); KA no tendría de dónde sacar las ramas v4 cuando `SKILL_MODS` desaparezca; la tabla `forge` no podía decir «rama de `torbellino` → variante de `g_remolino`»; sin regla cuando dos habilidades viejas fijan variante para la misma (`a_disperso`/`a_cicuta` → `a_disparo`); sin `fitsSlot` ni deduplicado en la barra (`g_mandoble` en `rmb` → `g_tajo`, que es básico); `notices` es un array de ids, no un objeto | Guerrero §11.6.3-4; Arquera §11.3.2-3; `save-schema.js` L210-228; `main.js` L366 | Corregido: §3.11 (`to`, precedencia, `fitsSlot`, `notices`), `catalog-v4.json` (E0.2) |
| 11 | **Choque de ids de poder entre clases**: la Maga y la Arquera comparten los prefijos `m_` y `a_`, y `definePower` lanza con un id repetido: el choque solo aparecería al fusionar, con el juego entero caído | `powers.js` L79; `OWN_PREFIX` de `test65a` L49 | Corregido: D28, E0.4, `test78`, A9 |
| 12 | **Rendimiento de `recompute()`**: corre en **cada** `addBuff`, rehace `aggregateTalents` y vacía `p.resolved`; con 156 nodos, selectores y estados nuevos (posturas, plantado, rachas) puede ir varias veces por segundo | `entities.js` L1024, L750, L843 | Corregido: contrato de W1 (memo), nota de §3.6, riesgo 11 con medición |
| 13 | **Semántica de la carga sin definir**: qué ranuras bloquea, qué la interrumpe (CC, golpe fuerte, panel, pausa), cómo se mide la suelta, y el básico tensable de la Francotiradora (Cuerda Tensa) frente al ataque continuo con 🖱️Izq mantenido y frente al esquema clic-mover | §3.6 original; `main.js` L1556 (repetición del básico mantenido) | Corregido con valores por defecto en §3.6.1. **Pendiente:** el orquestador los confirma antes de E1 |

### Medios

| # | Hueco | Evidencia | Estado |
|---|---|---|---|
| 14 | **Sin referencia visual aprobada** para el feedback de los verbos: el mockup no dibuja carga, ventana, postura ni pips; U2 lo habría inventado sin juicio previo | Guerrero §18.6; `grep` en `skills-ux.html` sin resultados | Corregido: tabla de §3.12 y arnés `tests/visual/verbs.html`, juzgado antes de integrar |
| 15 | **Criterios sin etapa**: G8b y G18 (Arquera §13), «≥ 3 nodos mecánicos por habilidad del kit» de G17 (Guerrero §13), umbral de G9 por clase (Maga 0,85; Guerrero y Arquera 0,90), A10 | §8 original | Corregido: §8, §3.1 (`test78`), E4 |
| 16 | **A1 relajado sin decirlo**: 2f pide `line` de la forja ≤ 70 y el plan lo bajó a aviso; los datos traen 12 líneas largas en el Guerrero (máx. 110) y 7 en la Arquera (máx. 83) | Medido con `node:vm` sobre `talents-v2-*.js` | Corregido: KA acorta y anota en `divergencias.json`. **Pendiente:** el dueño aprueba los textos cortos |
| 17 | **Contratos de 2f que faltaban**: `talentLinks`, `nodeSkills`, `specSwapSummary` (2f §3.8), el aviso agrupado «Nivel 8: 3 novedades» (2f §7.1) y la navegación del libro con teclado (2f §3.3, §3.7) | 2f §3.8 «Para la implementación» | Corregido: §3.12, U2, U3 |
| 18 | **Umbral de rendimiento sin línea base**: el humo `full` comparaba con un umbral «anotado en E5» y medía con el render de SwiftShader dentro | §6 original | Corregido: línea base en E0.5, medición solo de la simulación, ≤ 1,25 × |
| 19 | **Cliente CDP duplicado**: `tests/visual/chrome.mjs` ya lanza Chrome sin ventana y habla CDP sin dependencias | `tests/visual/chrome.mjs` | Corregido: E0.5 lo reutiliza |
| 20 | **Duración de `npm test`**: `run.mjs` corre todo `.mjs` de `tests/`, así que `forge-bench`, la paridad y `test-save-2g` entran solos | `tests/run.mjs` L8 | Corregido: E4 y riesgo 19 (modo rápido por defecto) |
| 21 | **Tope de 3 comportamientos aplicado a los kits**: 2f §7.2 lo fija para la forja; con 12 habilidades de kit nuevas por clase no es realista | 2f §7.2 | Corregido: fila de KA |
| 22 | **Claves `tv` nuevas sin camino**: `test65a` tiene una lista blanca (`TV_53`) y `nucleo_tv` vive en `powers-common.js` (cola W2): más de 320 efectos nuevos habrían pasado por una sola cola | `test65a` L52; `powers-common.js` L19-45 | Corregido: `<CLASE>_TV_KEYS` (KT) y solo lo que lee el núcleo va a la cola W2 |

### Bajos

| # | Hueco | Estado |
|---|---|---|
| 23 | Respaldo `.bak-v4` sin `try/catch` (3 huecos más el alijo comparten la cuota de `localStorage`) ni para saves importados | Corregido: §3.11 |
| 24 | Pestaña vieja abierta el día de publicar: su JS v4 puede guardar encima de un save ya migrado | Riesgo 20. **Pendiente:** nota en `MEMORIA.md` al publicar |
| 25 | Textos de las barras que nombran nodos viejos (Bastión «−5 % (Muralla)», Fervor «Veredicto Final listo», «Tiro Fijado», «Cepo: recarga») y el desplegable de configuración que recorta nombres | Corregido: filas de KT y U1 |

### Decisiones del orquestador sobre los pendientes (2026-10-21, por delegación del dueño)

1. **§3.6.1:** se confirman los valores por defecto propuestos (bloqueos durante la carga, `charge.repeat` del básico, clic-mover y `toggle`).
2. **Claves `repeat`, `trail`, `at:'ownField'` y `pulse`:** se aceptan esos nombres. W2 puede renombrarlas en E1 solo si choca con algo existente, y lo anota en su informe.
3. **G8b:** «Recomendado» aplica solo los talentos. La barra sale de `SPEC_BAR`, y G8b queda como aviso.
4. **Ventana perfecta:**
   - Base de **0,25 s** (dato; término medio entre 0,2 y 0,3 para tolerar la latencia de la web).
   - Se implementan `stance`, `lure` y `detonate` como están propuestos.
5. **Líneas de forja:**
   - Se acepta un máximo de 120 caracteres, con aviso si pasan de 70.
   - KA acorta las que pueda sin perder información y anota el resto en `divergencias.json` para el dueño.

### Decisiones del orquestador tras E0 (2026-10-21)

E0 fusionada en `paso2-impl` (P1–P4 más la suite `test-fixtures-v4` y el inventario de `pending-2g.json`). Lo que pidieron los trabajadores se resuelve así:

6. **D29 · Dónde viven las 6 activas de talento.** La definición (verbos, forja si la tiene, `req`, `slots:['k2']`) vive en el **catálogo** `skills-<clase>.js` (dueño KA, KA1). En `talents-<clase>.js`, `<CLASE>_TALENT_SKILLS` queda solo como lista de ids (los nodos las conceden con `grant`). `data.js` (W2) toma las activas del catálogo si la clase tiene `CATALOG_V = 2`, y si no, de `TALENT_SKILLS` como hoy. Así se resuelve la contradicción entre las filas KA1 y KT.
7. **Forma de las fusiones en `data.js` (P2):** se aceptan como contrato.
   - `SKILL_FORGE`, `SPEC_BAR` y `FORGE_RECO` van planos, con ids únicos entre clases.
   - `FALLBACK_BAR` y `CATALOG_V` van por `classId`.
   - `specKitOf(classId, specId)` queda en `data.js`; W2 puede cambiar el cuerpo, pero no la firma.
8. **Nombres de los stubs (P2):** quedan como están.
   - `<clase>ForgePowers()` es una función, por el ciclo con `powers.js`, y W2 la registra con `registerPowers`.
   - Los demás stubs: `createSkillBook`, `createVerbHud` y `talentsView`.
9. **Prefijos de poder de la Arquera:** se amplían con `q_`, `w_` e `y_`, los de sus árboles héroe. `test78` acepta, por clase, los prefijos de sus árboles de clase, especialización y héroe. La unicidad entre clases la garantiza `power-ids.json` (D28). Los ids del mockup no se renombran.
10. **Banderas «sangrado» y «flechas» (§3.8):** no se crea un selector nuevo. El conversor las expande a los ids de su grupo en `touch`, como ya hace.
11. **Las 28 claves «SIN TRADUCCIÓN» de `claves-impl.md`:** las resuelve **W2 en E1**.
    - A cada una le busca una clave existente (§3.6 o 2b) o la añade al vocabulario de `validateSkillDef`, con soporte en el motor si es mecánica.
    - Entrega la tabla en `docs/paso2-claves-w2.md`.
    - El integrador de E1.5 la vuelca en el conversor. KA no inventa claves: lo que falte va por la cola W2.
12. **Avisos de P4 para E1 y E3:**
    - D27 está confirmado con eventos reales: con 🖱️Izq pulsado, pulsar 🖱️Der deja `r:false`. Lo arregla W2.
    - `Ctrl+Z` choca con `KeyZ = cleanHud`. Lo resuelven U1 y U3: `input.js` ignora `KeyZ` con Ctrl o con un panel abierto, y esa línea la pide U3 a la cola W2.
    - El humo lee `p.skState[id].recast` y `g.stanceOf(p, id)`. W2 respeta esos nombres o avisa.

13. **D18, congelación de datos (commit `0fa03dc`).** Los datos del Guerrero y de la Arquera quedan congelados para E2. Pasaron 3 rondas de juicio de balance; los bloqueantes y altos están cerrados, y los medios que quedan están anotados en §20–21 del Guerrero y §19–20 de la Arquera. Hashes sha256 (los primeros 16 caracteres):

    | Archivo | Hash |
    |---|---|
    | `talents-v2-guerrero.js` | `8892962c553193ed` |
    | `talents-v2-arquera.js` | `5778dc7d164a46c2` |
    | `talents-v2-maga.js` | `e992080d421f779b` |

    Los ajustes de números que salgan del banco real (E4) entran por el conversor y la paridad, y quedan anotados en `divergencias.json`. Las notas del integrador de cada documento (Guerrero §18 notas 16–18; Arquera notas 15–19) son entrada de E1.5 y E2:
    - el suelo de definitivas `ultCdFloor`, absoluto, de 70 % de `sk.cd`;
    - las zonas que «no se suman»;
    - «cuenta el primer uso de la cadena» en movilidades que se relanzan;
    - la cubeta de autocuración;
    - el escenario del banco contra 10.

14. **Ampliaciones de contrato de E1, ratificadas** (fusión de W1 y W2 en `paso2-impl`, 2026-10-21):
    - §3.3: `aggregateTalents(p, { elemOf, kitOf, defOf?, memoTag? })`. `defOf` da la definición **forjada** (para `@tag:`, los atajos de verbo y `@windup`). `Player.talentAccessors()` devuelve los tres accesores y `recompute` los pasa. El memo guarda una entrada por héroe y por firma de accesores.
    - §3.4: `reason` es el conjunto cerrado `TALENT_REASONS` (`talents-ops.js`), que suma `free`, `empty` (sin rangos que quitar), `unknown`, `level` y `full`. U1 y U3 traducen por código.
    - §3.8: `isKnownSelector(sel)` en `talents.js`.
    - §3.11:
      - `insignia` es **opcional** en `<CLASE>_LEGACY` y `MIGRATIONS[4]` la ignora; si KA la escribe, debe coincidir con `V4_INSIGNIA`.
      - En `to` por ranura, un `null` explícito vacía la ranura; un objeto sin clave aplicable es inválido y cae a `SPEC_BAR` y luego a `FALLBACK_BAR`.
      - Los glifos que no caben van a `paragon.loose`, con el aviso `glifos-sueltos`, y se recuperan con `looseGlyphs()`, `reclaimGlyph(i)` y `reclaimLooseGlyphs()`.
    - §3.7:
      - `CastInfo.sk` es la definición **forjada**: los comportamientos leen `cast.sk` o `prof.def`, nunca el catálogo.
      - `HitInfo.trap` es `{ uid, skill }`.
      - `defineSkillBehavior` declara en `params` las claves propias que lee; `validateSkillDef` v2 avisa de las demás.
      - El bucle de botones mantenidos vive en `game-skills.pumpHeldSlots()` y `heldSlotBusy()`.
    - G8b se lee así: cada nodo comprado que nombra ids en `touch` toca al menos uno de su barra (`build.bar` o `SPEC_BAR[spec].bar`). Es un aviso; la tabla `STRICT` de `test78` lo vuelve error en la Arquera en E2, y `todo` en las tres clases al cerrar E2.
    - `respecSkills` vuelve como stub `@deprecated` (D23), que solo avisa; C1 lo borra en E5.
15. **Peticiones de E1 que quedan en cola** (cada dueño las recibe en su encargo):
    - **KA (E2):**
      - Los comportamientos leen `prof.def` o `cast.sk`; por ejemplo, `orbSegment` lee `prof.def.bounces`.
      - Las escrituras a `p.cds` de `skills-arquera.js` pasan a `recast`, `charges` o `g.reduceCooldown` (`test87`).
      - `trap.armT` es el tiempo de armado y la vida es `dur` (`a_t_cepo`).
      - Las tablas legadas siguen el formato que valida `checkLegacy` de `test80`.
    - **KT (E2):**
      - Las escrituras a `p.cds` de `powers-<clase>.js` pasan a `g.reduceCooldown(p, id, s)` (`Infinity` = reinicio).
      - Las claves `tv` del indicador son suyas: `frostCrit`, `drVsLayered`, `aspdCharges`, `chargeCrit`, `drCharges`, `galeT`.
      - La Batida lee `g.trapBurstsWithin(p, 1)` y emite `verb_hunt`.
      - `test65` dejó fuera Sed Saciada ×1,25 y el astillado de Cero Absoluto (`m_shatter`): van a `test-gauges-<clase>` o `test-powers-<clase>`.
      - Activar `STRICT` de `test78`.
    - **U1/U3 (E3):**
      - Traducir `TALENT_REASONS`.
      - Quitar el botón de `respecSkills` (`ui.js:2482`) y las insignias y resúmenes de `p.skillPoints` (628, 2439-2443, 2839) y el coste de `respecParagonCost` (3625).
      - Puntos con `talentPointsInfo` y `paragonPointsInfo`, y glifos sueltos en el tablero.
      - `TALENT_START_LEVEL` → `TALENT_RULES.specAt`.
      - Ajuste `holdMode` en Opciones.
      - Estado de los verbos para la UI: `g._charging` (`{ key, u, min, max, window, frac, toggle }`), `g._channel.toggle`, `p.skState[id]` y `p.skCharges[id]`, más `g.basicTensable()`.
    - **B1 (E4):**
      - Pasar de `presetRanks`/`presetList` a `buildsFor`/`buildRanks` con el árbol héroe y el tablero.
      - Calibrar los legendarios del tablero: `test38` pide la mejor asignación legal de 16 puntos entre ×1,15 y ×2,0 (hoy ×1,63).
16. **E1.5 cerrada** (fusionada en `paso2-impl` en 5f1a99b, 2026-10-21; npm test verde con 14 en cuarentena, humo boot verde, `--draft --todas` reproducible). Ampliaciones de contrato ratificadas:
    - §3.1: las `opts[]` aceptan además `touch`, `icon` y `todo` (contrato del mockup). G8b suma el `touch` de la opción que elige la build.
    - D29: puente `@deprecated` `<CLASE>_TALENT_SKILL_DEFS` (= `<CLASE>_TALENTS.skills`), que `data.js` fusiona mientras `CATALOG_V = 1`. Entra en la lista de D23: C1 lo borra en E5.
    - El conversor parte de la foto `tools/convert-v2/juego-v1.json` (a3440a7), no del `js/` vivo; el vocabulario es la foto más el juego vivo. En `claves-w2.mjs` el tipo `clase` vale también para parámetros de definición que lee el código de la clase.
    - `test-v2-paridad` exige `v: 2` en las tres clases y solo tolera un `grant` ausente si la activa no existe hoy en `CLASSES`. Por eso **KA, al añadir una activa de talento que hoy falta, escribe también la línea `grant:` de su nodo en `talents-<clase>.js`** (única excepción de propiedad sobre el archivo de KT; KT no toca esa línea). Activas que faltan: Maga `m_h_detener`, `m_h_palabra`, `m_h_constructo`; Guerrero `grito_guerra`, `g_h_bramido`, `g_h_desafio`, `g_h_estandarte`; Arquera `agilidad`, `a_h_torbellino`, `a_h_puntas`, `a_h_halcon`. `grito_guerra` y `agilidad` dejan de ser habilidades base: pasan a `kind:'talent'`, `slots:['k2']`, `req` 27.
    - D7: manda el `req` del mockup congelado (`m_h_constructo` tiene 74, no 72). `test55` usa `req > 16` y el valor exacto lo vigila la paridad del catálogo.
    - `test67` se partió: la parte por clase (los 9 poderes clave de las maestrías) vive en `test67b-poderes-clave-talentos.mjs`. Cada KT edita solo la fila de su clase (poner el poder en su nodo 2g o retirarlo según el doc).
    - Claves decididas para la Maga: `shieldManaPct` (c18) = `mod buff` en `m_barrera`; `layers` (`k_lanza`) = `set: { layers: 2 }`, y la Escarcha de `mech-maga.js` lee `prof.def.layers`; `blocks` (`m_estela_ignea`) = `blocks` del campo `p_muro_fuego` que deja la estela.
    - Ojo para KT-maga: `s0`, `s4`, `s9` y `s14` que citan `ui-gauges-maga.js` y `mech-maga.js` existen en la Piromante v2 con otro contenido; A3 no lo detecta.

    **Cola W2 (W2b), fusionada en `paso2-impl` en 0e89592** (KA2 y KT2-3 la traen con `git merge paso2-impl`). Cómo se escribe cada nodo y qué tiene que hacer KA está en `docs/paso2-claves-w2.md` §7; lo esencial:
    - f15A Quietud: `fx: { tv: { drStill: 15 } }`. Lee `p.stillT` (temporizador propio de quietud, umbral 1 s), no el plantado.
    - m20 Ojo de Trampera: `fx: { tv: { fieldDur: 25 } }` por rango. Alarga las trampas (`isTrap`) y SOLO los campos marcados `data.fieldDur: true`; `data.fieldDur: false` excluye. **KA-arquera:** si marca un zarzal (`a_u_zarzas`, `m_zarzal`), su comportamiento termina con el campo devuelto (`const f = g.spawnField(…); const end = f?.dur ?? dur`) o con `f.dead`, nunca con la `dur` local; `a_humo` no se marca. `test88 §2b` lo vigila con las habilidades reales.
    - d1 Escudo Alzado: `fx: { stats: { blockPower: 10 } }` por rango. Aguante de Roca es **d15·B** (no d16B): buff por eventos (⑩ `gain` con 5 cargas → buff largo; `spent` o comprobación barata en `onTick` → quitarlo), nunca renovado en cada tick. `blockPower` también vale en `STANCE_STATS`.
    - `drStill` y `fieldDur` son del núcleo (`NUCLEO_TV_KEYS`): no van en `<CLASE>_TV_KEYS`.

    Encargo original de la cola:
    - `tv.drStill` (Arquera f15A): en `nucleo_tv.condDr`, espejo de `drMoving` con `p.planted`.
    - `tv.fieldDur` (Arquera m20): +% de duración de las trampas y zonas propias en `spawnField`.
    - `stats.blockPower` (Guerrero d1, d15B): `BLOCK_REDUCTION + blockPower/100`, tope 90, en `combat-math.js` y el saco de `recompute`.
    - (`KeyZ` con Ctrl o con un panel abierto ya lo ignora `input.js:56` desde W2: U3 no tiene que pedirlo.)

17. **E3a y E2 (maga y guerrero) fusionadas** (2026-10-21; `paso2-impl` en 59e1305: npm test verde con 21 en cuarentena, todas con dueño; humo boot verde, 34 pasos y 0 errores). Decisiones del orquestador por delegación del dueño:
    - **Pruebas pesadas por turno** (regla del dueño): `npm test`, el humo, las capturas con Chrome y `balance-bench` pasan por `tools/turno.mjs` (una a la vez en toda la PC). Mientras se trabaja, solo suites sueltas.
    - **E3a:** el icono `cat_gastadora` pasa a `assets/ui/cat_principal.webp` (G15). `closeAllPanels` cierra también `#talents-panel` (no lleva `.panel`). El humo cierra el panel y espera el frame sin pausa antes del ratón real (el aviso de Nv10 abre el selector a pantalla completa).
    - **Arte del catálogo 2g:** `art` (ruta a arte que ya existe) manda sobre `skills/<id>.webp` en `hud-model.baseSkillIcon` y `talents-view.skillIconPath`. La Maga no traía `art`: sus 7 habilidades nuevas usan el icono del mockup copiado a `assets/skills` (y `skills256`, ampliado a 256 px como sustituto hasta la pasada de arte), y sus 3 activas del árbol héroe llevan `art` del nodo que las concede.
    - **Maga, aprobado:** excepción de G17 (el diseño 2g aprobado no da verbos a su kit: Piromante 'follow', Crionte 'follow', Arcanista 'hold'; lo fija `G17_EXCEPTION` de `test-skills-maga`). La Ignición (s0) quema también con los tics del suelo de Fuego. Las líneas `m_dardo` («a distancia») y `a_sello` («tus principales») divergen hasta que W2 dé alcance propio al básico y un coste para todas las habilidades. Celda Lejana congela (no aturde). Muralla, Lluvia de Meteoritos y Sello Ofensivo con comportamientos genéricos. `thaw` de Ruptura (i19) escribe `frozenT`/`stunT` como excepción hasta `Enemy.clearCC`. Textos: c15B dice «con más del 70 % de maná» (lo que hace `highManaDmg`) y a14 «Mientras canalizas el Desgarro recuperas un 2 % de maná por segundo». La calibración de Grieta Eterna (8–12 s) y las Mejoras que valen 0 con alguna variante son de B1.
    - **Guerrero, aprobado:** forja legada Torbellino → Hendidura (pendientes-guerrero §5). Piel de Hierro del Guardián por la opción a (KT pone `mod: { g_piel: { durS: 4, buff: 25 } }` en el `innate` del Guardián y W1 hace que `aggregateTalents` sume `innate.mod`). Fuera `healPct 30` del Cruzado (el diseño no lo nombra; B1 calibra). b8B: el Sangrado de golpe sustituye al anterior y Desangrar guarda hasta 3. Tres Juicios en grupo, el Quebranto del Arpón y las réplicas del Terremoto, a B1. `test78` exime de `POWER_PREFIX` los ids de `powers-common.js` (m_berserk en b0).
    - **Arquera, aprobado** (fusionada en 439da2e; humo boot con las tres clases en 2g: 34 pasos, 0 fallidos, 0 saltados): KA escribe también los `grant` de q4A/w4A/y4A en `hero-arquera.js` (misma excepción del punto 16) y ajustó 3 afirmaciones de `test69`. Tensado Rápido = `set { 'charge.max': 1.3, 'charge.perfect': [1.0, 1.17] }`. Grillete con `slow: 8`. Un Racimo cuenta como una trampa para la Batida (doc §7.2). La Salva de Vigía sale con Disparo Apuntado y los haces de Tiro Celestial. Ralentización mantenida de zarzales y cepos (`holdSlow` de 1,25 s, renovada a 0,2 s). G1 de `test78`: ya se cumple (los `touch` de c2/c6/c16 solo nombran `a_disparo`, `flecha_perforante` y `lluvia_flechas`). G17 de nodos en `test78`: excepción `{ arquera: { a_m_acecho: 1 } }` (en la tanda 2 se quitó `a_m_acecho` del `touch` de m11/m25/m28, cuyo texto no nombra el Salto; el diseño solo le da m18; esos poderes siguen contando los cepos que detona el Salto, lo prueba test-talentos-arquera).
    - **VFX de variante:** `skillFxFor(id, def.forged)` de `js/fx-skills.js` (7ab2513) acepta las tres convenciones (entrada por id de variante en `<CLASE>_FX`, `MAGA_FORGE_FX`, o `vars.i|ii` dentro de la entrada). `_makeCtx` y `basicAttack` lo usan; no hay que migrar datos.
    - **Cola W2d** (la reparte el orquestador tras fusionar la Arquera). Además de lo de abajo, de la Arquera: la trampa genérica aplica su `data.hitDot` al saltar (renueva, no suma) en vez del golpe directo y, con `burst`, quien la pisa no recibe además el golpe directo (sigue emitiendo un ⑤ al saltar); Punto Débil una vez por enemigo cada 8 s aunque se remarque; soltar antes de `charge.min` no dispara y `charge.markMin` (no gastar `firstCharged` ni forzar el perfecto por debajo); `detonate.coef` escala con el rango, un proyectil con `detonate` detona también al final de su alcance y `detonate.consume: false`; los tics de `startChannel` no derivan; `g.castEcho(p, id, { mult, at, origin })` con su propia serie de repeticiones (sustituye a `castFree`, el `castEchoOf` de la Arquera y el `autoCast` de la Maga); el básico de arma lee `prof.cadence` (Mano Rápida) y el alcance de su perfil (Vista Larga); `_logTrapBurst` guarda también la clave del campo y `trapBurstsWithin(owner, s, { distinct: true })` cuenta claves distintas; rendimientos decrecientes del Quebranto por ralentización o desplazamiento reaplicados al mismo enemigo. Lista base: `spawnChainBounce` (el último de la cadena no recibe daño y el salto sale sin `skill`: fallo real); básico de arma con `def.range`/`prof.rangeMul`, color de la definición forjada y salpicadura nativa; stat de coste para todas las habilidades con coste; `Enemy.clearCC('freeze')`; lanzar una principal instantánea durante el canal de una definitiva imparable sin cortarlo (Doble Grieta, a21); `g.castFree(p, id, { mult, at, origin })`; `SKILL_FX[forged.varId]`; `drCapAdd`/`blockCapAdd` en `innate`; velocidad de habilidades para giros y saltos; `hitDot` con `bleedDur`/`bleedPct`/`dotDur`/`dotPct`; `applyCC('fear')`; `@windup` en pasos de combo; `g.startCooldown`, `g.stopDash`, `g.channelInfo`, `g.expireField`, `g.extendMark`; retirar `m_aegis` y `m_judgment` de `powers-common.js`; `wave` sin repetir al del impacto; tope de Quebranto por desplazamiento; `zonePct` de la Estela; `SKILL_KEYS` con `art`, `innate` y `forged`.

18. **E2 · integración, tanda 1 fusionada** (2026-10-21; workflow `wf_cee6fa9c-fd7`, cada trabajo con revisión adversarial y una ronda de corrección): Conversor, W-pruebas, W2d-A y W2d-B. `npm test` verde con **7 en cuarentena** (todas de la tanda 2 por clase); humo boot y panels en verde. Contratos nuevos en `paso2-claves-w2.md` §9. Decisiones del orquestador:
    - Guerrero c6/c9/c23: los `touch` con selectores (`@spender`, `@windup`+`@charge`, `@movement`) quedan **aprobados** (el mismo cambio de G1 que el punto 17 aprueba para la Arquera).
    - `test69`, dos botones: 0 frames con dos lanzamientos; ningún básico sale entre el lanzamiento de la principal de proyectil y su impacto (el vuelo es parte de `actionLockT`); el único impacto doble permitido es el de la principal lanzada DESPUÉS del básico que lo adelanta (arquera, frame 297 a Nv25: el básico le cede como mucho un frame). Ratificado.
    - El productor de `'<id>@windup'` es `skill-resolve` (`comboWindupMods`), nunca también `aggregateTalents`.
    - `castEcho` no repite canalizaciones (devuelve `null`; ojo con `rayo_ii`, que hace canal al Rayo).
    - El Quebranto por ralentización cuenta «segundos pagados» y no sube con la barra cerrada (B1 puede preferir la cobertura real: quitar `&& this.staggerOpen()` en `applyCC('slow')`).
    - Aplicado por el orquestador al fusionar: `test43` con las 6 APIs nuevas; `_logTrapBurst` une `{ t, x, z }` (W2c) con `key` (W2d-B); el campo `a_humo_ciego` vuelve a `powers-arquera.js` (la Bomba de Humo volvía a no cegar desde 91d3b71); `test-skills-arquera` mira el veneno del Cepo; `applyMark` decide el Punto Débil con la marca de antes; el Orbe de la Maga pasa `ctx` a sus saltos; el básico busca y dispara a `p.basicReach()`; `charge.scale.rangeAdd` validado; `test-v2-paridad` siembra un `touch` y una `line`. Salen de la cuarentena 15 suites (test61, 62, 64, 65, 69, 72, 76, 77, 78, 80, 81, 86, 88, test-skills-arquera y test-forge-arquera).
    - **Cola de la tanda 2 (por dueño; lo pidieron los trabajadores de la tanda 1):**
      - **KA/KT-maga — HECHO** (tanda 2, workflow `wf_3d80a959-65d`; además: la copia de un canal —Rayo con Haz Concentrado, Desgarro— es un haz propio que no ata a la heroína y lleva las Cargas; Doble Grieta y Singularidad 4 con el golpe del perfil con rango; Prisión Profunda sin área; Dardo «a 9 m» ratificado; pendiente de E4: nodos con números absolutos sobre la Mejora —s6, i8A, i9A, a17— y buffs × rango): `autoCast` → `g.castEcho(p, id, { mult, at, origin })` (Ventisca Viva con `origin` = centro de la Tormenta); `a_sello` con `costPct −30` (y la línea vuelve a «tus hechizos»); `thaw(e)` → `e.clearCC('freeze')` (powers-maga.js:431); quitar `power: 'v_saeta_ignea'` de `m_dardo_i` (la salpicadura nativa la cubre; `test-forge-maga` espera `source 'splash'`); las Cargas cuentan solo `hit.source === 'hit'` (filtrar `'chain'`). En cuarentena: `test-skills-maga` («consume la quemadura»), `test-talentos-maga` («la Barrera caducó»).
      - **KA/KT-guerrero — HECHO** (tanda 2, workflow `wf_541fb716-c77`; fusionada con el Ciclón ya en el `pull` genérico, `g.startPulses` y el golpe del canal sin doble tirón; también la validación de la innata de `test78:135`): Inquebrantable sin `readyAt` (ya usa `g.startCooldown`); Condena z8B → `g.extendMark(e, 'juicio', { mul: 2 })`; Grieta (`g_hendidura_ii`) con mod `zonePct 40`; Giro Firme sin `v_giro_firme` (el canal da `slowImmune`) y Ciclón con `set: { pull: { dist: 1, radius: 5, boss: false } }` en vez de `v_ciclon`; Onda Sagrada puede volver a `set: { wave }`; Danza Carmesí con `g.channelInfo`; b16 Sangre Hirviente con `skillSpeedPct`; `p.dashMove.step = () => true` → `g.stopDash(p)` (powers-guerrero.js:2197); `g._expireField` → `g.expireField`; innata del Guardián `{ block: 15, threatMult: 3, hpPct: 5, drCapAdd: 15, blockCapAdd: 10, mod: { g_piel: { durS: 4, buff: 25 } } }` y quitar el mod de d0; `test-talentos-guerrero` l8A/u8A miran `fearT` (el miedo ya es control real) o avanzan la IA; apuntar las citas a `tools/convert-v2/out/guerrero/pendientes-guerrero.md`. En cuarentena: `test-talentos-guerrero` (8 nodos sin efecto), `test-forge-guerrero` («sin la variante: ni cura ni escudo»).
      - **KA/KT-arquera — HECHO** (tanda 2, workflow `wf_ad4ee5b7-cd3`; además: Llamada del Halcón sin doble ataque —y_halcon solo suma Garras Afiladas—, cepos sembrados con la forja y el rango aunque no hayas colocado uno, Desborde de Puntas caduca a los 10 s, Vista Larga por la clave tv `tenseRange`): `castEchoOf` → solo `g.castEcho`; comentario de Cuerda Tensa (`markMin` ya lo lee el motor); la Batida con `g.trapBurstsWithin(p, win, { distinct: true })`; Vista Larga (f20) con `charge.scale.rangeAdd = [[tensedAt − 0,01, 0], [tensedAt, 2·rango(f20)]]` en `f_cuerda_tensa.modifyResolve`; `spawnCepo` con `data.rankMul` en los cepos con skill propio; `test-forge-arquera` puede sacar de `PEND_W2` a `a_disparo_m`, `a_t_cepo_i` y `a_m_acecho_i`; decidir si `a_m_acecho` sobra en el `touch` de m11/m25/m28 o si esos poderes cuentan también sus cepos (divergencia con `aprobada: false`). En cuarentena: `test-gauges-arquera` («perfecto de Disparo Apuntado: +15»), `test-talentos-arquera` («c25 r1»).
      - **W-pruebas / W1 (punto 10, retirar los poderes v1):** `test67` sin `m_aegis`, `m_judgment`, `m_conflag`, `m_overload`, `m_deadeye` ni `m_hunt` (`ALLOWED_MULT = ['furia', 'm_berserk']`, `powerState(p, 'festin')`); `test60` sin `m_hunt`; `KEY_NODE_MULTS = ['furia', 'm_berserk']`; luego borrarlos de `powers-common.js`. ~~`test78:135`: validar la innata~~ (hecho por KAT-guerrero).
      - **Textos de buffs con el valor real (E5, decisión del dueño 2026-10-21):** los buffs, escudos y curas siguen creciendo con el rango de la habilidad (`RANK_BUFF_STEP`, como el daño), y los textos del libro, los tooltips y las activas de talento muestran el valor A TU RANGO ACTUAL (la Agilidad a Nv60: «+37 %», no «+30 %»). No cambia el balance (E4a y E4b miden con el crecimiento); es trabajo de texto y UI. Ojo con los nodos de talento cuyo texto cita el número de una activa.
      - **Motor (E5):** `g.skillProfile(p, id)` público (los poderes no pueden importar skill-resolve por el ciclo de módulos; powers-guerrero.js:241 y la Maga lo esperan). `g_senor_guerra` (powers-guerrero.js:~1279) repite por `castSkillSlot`: pasarlo a `g.castEcho` (si la principal fuera un canal, como en la Maga).
      - **U:** `hud-model.enemyStatuses` con `fearT` («Asustado») y su icono.
      - **B1 (E4):** Llamada del Halcón: 12 ataques y 30 de Quebranto con y4A (antes 24 y 60, por el doble ataque): recalibrar Halconera. Las activas de talento escalan con el rango (`RANK_BUFF_STEP`: Agilidad a Nv60 da +37 %/+19 % frente al +30 %/+15 % del texto): decidir texto o número para todos los buffs. Quebranto del Grillete reaplicado. `balance-bench:527` con `CM.drCapOf(p.stats)`; contar el básico de la arquera por `p.basicAt === p.simT` en el modo dos botones; recalibrar con las cifras nuevas del Quebranto (informe de W2d-B en la tanda 1). En cuarentena: `balance-bench`.

19. **E4a fusionada; E4b aplazada** (2026-10-21, decisión del dueño). El banco del catálogo 2g (B1, workflow `wf_d59042bf-ba3` / `wf_18a09fc1-dbd`; revisión cortada a pedido del dueño) queda como herramienta: `balance-bench` y `forge-bench` salen verdes contra sus listas exactas de lo que hoy falla (`PENDING_E4B`, 98 reglas; `PENDING_FORGE`, 97), y su informe para calibrar es `docs/paso2-e4-informe.md`. **La calibración fina de números (E4b) se hace DESPUÉS del rework de ítems, inventario y stats** (paso 4 del roadmap): con el equipo nuevo todo se mueve. Cuarentena: **0**. Antes del cierre solo se arreglan los efectos ROTOS que el banco encontró (no dependen del equipo): E4b-bugs (Danza Carmesí y Montaña Viva restan a su build; Línea Mortal nunca se activa y Tiro Pesado pone la ventana perfecta antes de la carga completa; Vaivén Eterno y Gran Cacería no cambian nada; Estampida Sin Fin −2 %, Tierra Santa ±1 %; la forja recomendada de la Arcanista y la Tiradora hace menos que la Mejora sola). Después, E5.

### Pendientes de decisión (texto original de la crítica)

1. **Valores por defecto de §3.6.1** (bloqueos durante la carga, `charge.repeat` del básico, clic-mover, `toggle`): los propone esta revisión; el orquestador los confirma antes de lanzar E1.
2. **Nombres de las claves nuevas** `repeat`, `trail`, `at:'ownField'` y `pulse`: W2 los confirma en E1 o KA usa un comportamiento (y lo anota en `pendientes-<clase>.md`).
3. **G8b con barra por build**: ninguna build del mockup trae `bar` (0 de 36). Si el dueño quiere que «Recomendado» cambie la barra por build (Arquera §16.2.3), `applyTalentBuild` debe aplicarla; si no, G8b queda como aviso contra `SPEC_BAR`.
4. **Preguntas abiertas del dueño** con efecto en el motor: ventana base 0,2 s o 0,3 s (Guerrero §17.2.2) y los tipos `stance`, `lure` y `detonate` (Arquera §17.2.6). El plan implementa la propuesta actual; la ventana es un dato.
5. **Líneas de forja de más de 70 caracteres**: el dueño aprueba las versiones cortas de `divergencias.json`.
