# MEMORIA DEL PROYECTO — IntentoRPG

> **Propósito:** índice vivo de lo que YA EXISTE en el juego, para no re-proponer
> ni reimplementar features ya hechas, y para arrancar cada sesión con contexto.
> Mantener actualizado al añadir/cambiar sistemas. Última actualización: **2026‑06‑15**.

---

## 0. Qué es / stack

- **IntentoRPG**: ARPG isométrico estilo Diablo 2/4, **JavaScript vanilla + Three.js 0.160**, **sin build step** (ES modules vía importmap CDN jsdelivr). PWA (Vercel), móvil + desktop, guardado en `localStorage` (3 huecos + export/import base64). Texto del juego en español.
- **Sin bundler, sin npm deps de runtime.** Tests: simulación headless en `tests/*.mjs` (sin DOM/WebGL), corren con `npm test` (`node tests/run.mjs`). **47 suites.**

## 1. Convenciones de desarrollo (IMPORTANTES)

- **`npm test` debe quedar en verde** siempre antes de commitear.
- **Bump de `sw.js` `VERSION`** en cada cambio desplegable de assets (actual: **v37**). Añadir nuevos `js/*.js` a `ASSETS` en `sw.js`.
- **Git author**: `git config user.email noreply@anthropic.com && user.name Claude` antes de commitear (evita commits "Unverified").
- **Push a AMBAS ramas**: `claude/isometric-rpg-game-xmer7p` y `main` (fast‑forward `origin <branch>:main`).
- **No tocar archivos que esté escribiendo un agente en background** (p. ej. informes).
- Investigar "info junio 2026" antes de features grandes; se permiten workflows con agentes Opus en worktrees para tareas grandes e **aisladas** (cuidado con archivos compartidos: `main.js`, `ui.js`).
- **Guardado solo local** por ahora (DB en la nube = futuro).

## 2. Arquitectura

- **`js/main.js`** (~2170 líneas): clase `Game` (orquestador): renderer, escena, cámara isométrica ortográfica, bucle `tick`, `loadWorld`, combate, FX, loot, interacción con NPCs. `js/ui.js` (~2440) es el otro archivo grande (toda la UI).
- **Mixins inyectados en `Game.prototype`** con `Object.assign` (al final de main.js). NO duplicar nombres entre ellos (lo valida `test43-mixins`):
  - `economy.js` → `economyMethods` (tienda, transmutación/cubo, engarce, mascota, drag&drop)
  - `enemy-abilities.js` → `enemyAbilities` (habilidades/telegrafías de enemigos)
  - `game-endgame.js` → `endgameMethods` (bounties de zona, Tormento, Códice de Aspectos, Bendiciones, Pináculo)
  - `game-world-flow.js` → `worldFlowMethods` (misiones, desafío diario, viajes, pactos)
  - `game-zone-life.js` → `zoneLifeMethods` (respawn, jefe de mundo, goblin, oleadas, celdas aleatorias)
  - `game-mastery.js` → `masteryMethods` (elegir rama, asignar nodos, reespecializar)
  - `game-eras.js` → `eraMethods` (temporadas locales: mutador semanal + objetivos)
- **Otros módulos:** `entities.js` (Player, Enemy, Projectile, **Pet**, modelos), `data.js` (clases, skills, enemigos, soportes, paragon, bendiciones, **PET_KINDS/UPGRADES/COLLARS**), `items.js` (loot/rarezas/crafteo), `world.js` (pueblo/mazmorra/refugio), `zones.js` (zonas open), `ui.js` (toda la UI/paneles/HUD), `input.js` (teclado/ratón/joystick), `postfx.js` (post‑proceso + AmbientParticles + BlobShadows), `particles.js` (motor de partículas de gameplay), `fx-skills.js`/`fx-enemies.js` (catálogos VFX), `sfx.js` (sintetizador WebAudio), `music.js`, `vfx.js` (hitStop/noise).

## 3. FEATURES QUE YA EXISTEN (no reimplementar)

### Clases y progresión
- **3 clases** (Guerrero/Maga/Arquera), 6 skills c/u en 3 tiers (`TIER_LEVELS=[1,6,12]`), máx 5 puntos, **sinergias** (`data.js`).
- **Soportes de habilidad** (estilo gemas de soporte PoE): 12 soportes, 2 por skill (`data.js SUPPORTS`).
- ✅ **UI del árbol de habilidades reworkeada** (2026‑06‑15): `UI.renderSkills` rediseñado — cabecera con clase + puntos destacados, rejilla de **tarjetas** (1/2 col responsive), **pips de rango** (●●●○○), etiquetas Activa/Pasiva/▲Mejorable/★Máx, **previsualización del próximo nivel** (`skillUpgradeLine`/`skillMainAt`: "actual → siguiente"), botón **+** flotante, engarces de soporte con look de chip. CSS `.sk-*` nuevo. (Cuidado: `.sk-plus` absoluto SOLO bajo `.sk-card`; en la ficha el `+` de atributos es `.cs-plus` hijo flex.)
- ✅ **Polish UI/UX ficha/inventario/paragon** (2026‑06‑15): título de Era bajo el nombre (`.cs-hero-title`), **engarce activo vacío resaltado** (`.para-node.open-socket`, antes sin CSS), micro‑interacciones (hover/scale/transición, solo `hover:hover`), foco accesible, latido del glifo engarzado, brillo de rareza en ranuras equipadas. Lógica (drag&drop/asignación) intacta.
- **Paragon**: tablero 9×9 con nodos + engarces de **glifos** (escalan con adyacentes).
- **Bendiciones** permanentes (8, 4 categorías, una por categoría) — recompensa de grietas.
- **Tormento** (dificultad 0–10, Estatua del Mundo), **Códice de Aspectos** (extraer/grabar poderes), **Pináculo** (uber boss con Fragmentos → míticos).
- ✅ **Eras / temporadas locales YA EXISTEN** (HECHO 2026‑06‑15, #16): `game-eras.js` + `ERA_MUTATORS`/`ERA_OBJECTIVES`/`eraIdForTime` (data.js). Cada **semana** (bucket de 7 días, determinista) cambia un **mutador global** (reaprovecha recompute stat/power + `xpMul`/`goldMul`) y **3 objetivos** semanales medidos como **delta de `p.records`** desde una instantánea (sin hooks de combate nuevos). Recompensa: oro + Fragmentos; completar las 3 da un **título** cosmético (`p.titles`/`p.title`). UI: sección "Temporada" en el panel de la Estatua del Mundo (`renderProgress`), con barras y botón de reclamar. Estado en `p.era = {id, base, claimed, titleClaimed}`. Tests: `test48-eras`.
- ✅ **Maestrías/ramas de clase YA EXISTEN** (HECHO 2026‑06‑15): `MASTERIES` en `data.js` (3 ramas por clase, 6 nodos c/u: 3 menores + 2 notables + 1 capstone). Se desbloquean en nivel `MASTERY_START_LEVEL` (12), +1 punto cada 2 niveles. Estado en `player.mastery = { id, nodes, points }`. Nodos = `stats` (los suma `recompute`) y/o `power` (entra en `this.powers` y se interpreta en combate). Capstones nuevos cableados: `m_berserk` (rollDamage), `m_aegis` (Player.takeDamage, survive‑lethal), `m_judgment`/`m_conflag` (onEnemyKilled novas), `m_overload` (onDealHit maná), `m_deadeye`/`m_shatter`/`m_hunt` (Enemy.takeDamage). Reespecializable por oro. UI: pestaña "Maestría" en el build‑nav → `UI.openMastery/renderMastery`, `#panel-mastery`. Economía/gestión: `game-mastery.js`. Tests: `test45-maestrias`.

### Poder del héroe (HECHO 2026‑06‑15, #15)
- ✅ `stats.power` (en `recompute`): puntuación única que resume la build (daño efectivo con crít/aspd + vida + armadura + maná + mf + lph + thorns + cdr). Se muestra en la ficha (`.cs-power`, "⚡ Poder N") y **flota "+N ⚡ Poder"** cuando sube (detección en `updateHUD`, 10Hz). Test: `test50-poder-heroe`.

### Loot / crafteo
- Rarezas normal→conjunto, afijos primarios/secundarios (mayores ★), **engarces+gemas (6)+runas (6)+runewords (5)**, **sets (3)**, **míticos** doble poder, **relics** de jefe, glifos, fragmentos, llaves de grieta.
- **Masterworking / calidad** (`it.quality` 0–`MAX_QUALITY=5`): escala armadura y afijos; lo aplica `recompute` (`q = 1 + quality*0.06`).
- **Charms** (`makeCharm`): amuletos de mochila que dan stats **sin equiparse** (los suma `recompute` desde `inventory`).
- **Cubo** (transmutación/reforja/engarce, recetas en `#panel-recipes`), **bolsa de materiales** (`p.materials`, cap `MAX_MATERIALS=60`), **alijo** compartido (`#panel-stash`), **filtro de loot**.
- **Apuesta** (gamble): el Mercader vende objetos sin identificar por slot (`buyGambleItem`/`gambleItem`).
- **Colección / Bestiario** (`#panel-collection`): registro de sets, poderes y enemigos descubiertos (`player.discovered`).
- ✅ **Feedback de drop YA EXISTE**: pilar de luz por rareza (altura/grosor/brillo escalados), **halo giratorio** en legendario+/mítico, **sonido de drop por rareza** (`droprare`/`droplegend`, con anti‑spam), flourish de legendario al recoger (`main.js spawnGroundItem`, `lootTier`, `dropSound`).
- ✅ **Comparador de objetos YA EXISTE**: `UI.buildCompare()` con **veredicto ⬆ Mejora / ↔ Lateral / ⬇ Peor** (por "poder" `itemPower`), diffs ▲▼ por stat, y manejo de anillos (compara con el que se reemplazaría).

### Mundo
- ✅ **Pueblo CONTIGUO / seamless hub YA EXISTE** (HECHO 2026‑06‑15): la **Cripta es el hogar**. `buildZone('Cripta', {townPocket:true})` coloca un **campamento** (servicios) en el bolsillo seguro del spawn vía `placeTownServices` (world.js). Se **sale caminando** al mundo abierto, **sin portal** (no hay `portal_town` en el hogar). `world.safeZone` (rect) + `world.isHome`; los enemigos no aparecen dentro (`randomZoneCellFrom` lo excluye) y dentro hay **regen rápida** (`game.inSafeCamp`). `startGame`/`respawn`/`travelTo('town')`/`portal_town` cargan `{type:'zone',biome:'Cripta'}`. Servicios del campamento: curandero, mercader, encantadora, capitán, **domador**, alijo, estatua del mundo, portal diario. El waypoint/entradas de mazmorra siguen en el campo de la zona. Tests: `test46-pueblo-contiguo`.
- ✅ **Leash a zona segura** (2026‑06‑15): cada enemigo guarda `spawnPos`; si el jugador está dentro del `safeZone` (o el enemigo cruza el borde), **abandona la caza y vuelve a su spawn** (no puede tocarte en el campamento). En `Enemy.update`, antes del bloque de jefe; aplica a todos. Test: `test51-leash-zona-segura`. Campamento ampliado (radio 10).
- ✅ **Mundo conectado D4‑lite** (2026‑06‑15): `ZONE_LIST` ahora es un **grafo** (`links` simétricos, `home` en la Cripta). Cada zona coloca **"caminos"** (`zone_exit`, auto‑cruce) a sus regiones vecinas → caminas al borde y cruzas (`loadWorld`). **Descubrimiento**: `player.discoveredZones` se rellena al pisar una región. **Mapa del Mundo**: sección en el panel de mapa (`renderWorldMap`) que lista las regiones descubiertas con estado (aquí / 🔒 Nv / Viajar) e insinúa las vecinas sin descubrir como "???". **Pueblo favorito**: `player.homeZone` (reaparición al morir / portal de retorno); `setHomeZone` (solo zonas‑hogar descubiertas). Tests: `test52-mundo`. (Seamless real cosido = futuro; esto es transición breve por borde, estilo Stronghold.)
- **`buildTown()`** (pueblo clásico 36×36) se conserva pero ya **no se usa** en el flujo principal (fallback). **Refugio** (2.º pueblo, piso 16) y **mazmorras** procedurales (altares de pacto, **cofres**, **santuarios/shrines**, waypoints cada 5 pisos, jefe por bioma) sin cambios. Otras **zonas open** (Hielo/Infierno/Abismo, 120×120) mantienen su `portal_town` de retorno (→ ahora vuelve al hogar Cripta).
- **Desafío Diario** (portal en el campamento, semilla determinista por fecha) con **registro/tabla local** (`dailyLog`, top 14). **Hardcore** (muerte permanente, flag persistente).

### Descubribilidad / onboarding (HECHO 2026‑06‑15)
- ✅ **Sistemas late‑game visibles aunque bloqueados** (aspiración, estilo ARPG moderno): `buildNavHTML` muestra SIEMPRE las pestañas Maestría (🔒 Nv12) y Paragon (🔒 Nv20); al pulsarlas se abre una **vista previa** (maestría: preview de las 3 ramas + capstones; paragon: banner "se desbloquea en Nv20" + tablero visible).
- ✅ **Guía de Sistemas** (códice de onboarding): botón **❓** en el HUD → `#panel-guide` (`UI.openGuide/renderGuide`) que lista los 16 sistemas (`SYSTEMS_GUIDE` en data.js) con icono, descripción y estado 🔒 Nv X / ✓ Disponible / cómo se accede. Tests: `test49-guia`.

### Paneles de UI (todos en index.html, render en ui.js)
`inv` · `skills` · `stats` · `mastery` · `paragon` · `shop` · `stash` · `quest` · `pacts` · `progress` (Estatua: Tormento/Códice/Bendiciones/Pináculo) · `pet` (Domador) · `collection` (bestiario) · `recipes` (cubo) · `waypoints` · `map` · `blessing` (modal) · `settings`. Navegación de build: `buildNavHTML` (Personaje↔Habilidades↔Maestría↔Paragon).

### Mascota (REWORK HECHO 2026‑06‑15)
- ✅ **Mascota de UTILIDAD, NO hace daño.** Se compra/mejora con el **Domador de Bestias** (NPC en pueblo y refugio), NO en el Mercader.
- **3 modelos**: lobo 🐺 / halcón 🦅 / familiar arcano ✨ (cada uno con malla 3D y radio base distinto; comprar otro lo conserva, cambio gratis si ya es tuyo).
- **Mejoras por oro** (coste creciente, `PET_UPGRADES`): radio de recolección, imán de tesoros, recolección de materiales (Nv1 gemas/runas → Nv2 fragmentos/llaves/glifos), agilidad.
- **Collares** (`PET_COLLARS`) = aura de utilidad: Avaricia (+`goldPct`), Fortuna (+mf), Vigor (+spdPct). Se aplican en `Player.recompute()`.
- Estado: `player.pet = { kind, owned, level, xp, upgrades, collar, ownedCollars }`. Migración de saves antiguos `{level:1}` en el constructor de `Player`.
- UI: panel del Domador (`UI.openPet`/`renderPet`, `#panel-pet`). Economía: `buyPet/upgradePet/setPetCollar/switchPetKind/petUpgradeCost` (economy.js), `refreshPet` (main.js).
- Cubierto por `test44-mascota` (economía), `test15-recogida` (recolección/imán), `test8` (no daña).

### Rendimiento / calidad (YA EXISTE)
- **Gama de dispositivo** (`detectDeviceTier`), **calidad adaptativa 0–3** con histéresis (`applyQuality`/`monitorFPS`), selector de calidad en Opciones, **overlay FPS/draw calls** (`perfHud`), post‑proceso de carga perezosa (no se baja en gama mínima), densidad de partículas escalada, sombras de enemigos solo en gama alta, animación de miembros omitida fuera de pantalla.
- Estética: GTAO/SMAA/Outline/bloom/viñeta, IBL (RoomEnvironment), BlobShadows, grading por bioma, rim light.

### Controles / opciones (HECHO 2026‑06‑15)
- ✅ **Remapeo de teclado** (#5): `js/bindings.js` (módulo PURO: `DEFAULT_BINDINGS`, `BINDABLE_ACTIONS`, `mergeBindings`/`buildCodeMap`/`assignBinding`/`keyLabel`). `input.js` resuelve `code→action` (`doAction`), captura de tecla (`beginCapture`), `setBinding`/`resetBindings`; anulaciones en `settings.bindings`. Movimiento se lee "mantenido" (`held()`), el resto dispara al pulsar.
- ✅ **Menú de opciones por categorías** (#6): `UI.renderSettings` ahora es **data-driven** (`settingsCategories()` → `renderOptItem`) con **pestañas** (Gráficos/Audio/Controles/Interfaz/Accesib./Datos), **buscador** (`opt-search`, corta propagación para no disparar acciones) y **presets de gráficos** (Batería/Equilibrado/Calidad → `applyGraphicsPreset`).
- ✅ **Táctil parcial** (#7): joystick a la derecha (zurdo, `joystickRight` → `body.joy-right`) y **escala de controles** (`hudScale` → var CSS `--hud-scale`), aplicados en `applyAccessibility`. Drag libre de botones = pendiente.
- Tests: `test47-remapeo` (módulo de bindings). Joystick táctil + asistencia de puntería siguen igual.

### PWA / accesibilidad
- SW con cache versionado, offline. Orientación **landscape** + overlay "gira el dispositivo". Accesibilidad: movimiento reducido, texto grande, daltónico, brillo, sacudida, vibración.

## 4. Documentos en la raíz

- **`CLAUDE.md`**: guía operativa (convenciones, comandos, arquitectura, patrones) que Claude Code carga automáticamente. Apunta aquí.
- **`INFORME_EXPANSION_2026.md`**: auditoría + investigación de mercado 2026 + backlog priorizado de 18 ítems (ramas de clase, pueblo contiguo, pet, remapeo, menú, hub). Es la hoja de ruta de producto.
- **`MEMORIA.md`** (este): inventario detallado de lo que ya existe.

## 5. Backlog grande pendiente (del informe, sin empezar)

| # | Feature | Estado |
|---|---|---|
| #5 | Remapeo de teclado (capa acción↔tecla) | ✅ HECHO (2026‑06‑15) |
| #6 | Menú de opciones por categorías + presets/búsqueda | ✅ HECHO (2026‑06‑15) |
| #7 | Remapeo táctil (zurdo + escala) | ✅ parcial; drag libre de botones pendiente |
| #10 | **Maestrías/ramas de clase** (rama + nodos + capstones) | ✅ HECHO (2026‑06‑15) |
| #13 | Maestrías fase 3: soportes `transform`/aspectos de habilidad | pendiente (ampliación) |
| #11 | **Pueblo contiguo a zona open** (seamless hub, sin portal) | ✅ HECHO (2026‑06‑15) |
| #12 | Herrero (Masterworking) + más servicios de hub | pendiente |
| #15 | "Poder del héroe" (puntuación de build + feedback) | ✅ HECHO (2026‑06‑15); HUD de objetivo del loop = pendiente |
| #16 | "Eras"/temporadas locales (mutador + objetivos semanales) | ✅ HECHO (2026‑06‑15) |

## 6. Bugs/gotchas conocidos

- `recompute()` **ignora objetos sin identificar** (no dan stats) — clave en tests de gemas (ver `test9`, ya endurecido).
- El motor de partículas necesita `document` (canvas) → guardado con try/catch para tests headless (`game.psys?`).
- `ui.js` y `main.js` **no se pueden importar headless** (usan `window`/DOM) → la lógica UI/Game no es unit‑testable directamente; se prueban los módulos puros (data/items/economy/entities/world/zones).
- Pickup a prueba de doble‑recogida (`indexOf<0` guard) en `pickupGroundItem`.
