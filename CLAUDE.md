# CLAUDE.md — IntentoRPG

Guía operativa para trabajar en este repo. **Antes de implementar cualquier
feature, consulta `MEMORIA.md`** (inventario de lo que YA existe) para no
reimplementar algo hecho. La hoja de ruta de producto está en
`INFORME_EXPANSION_2026.md`.

## Qué es
ARPG isométrico estilo Diablo 2/4 en **JavaScript vanilla + Three.js 0.160**,
**sin build step** (ES modules vía importmap CDN jsdelivr). PWA (Vercel), móvil +
desktop, guardado en `localStorage`. Texto del juego en **español**.

## Comandos
- **Tests:** `npm test` (corre `node tests/run.mjs`; suites de simulación headless en `tests/*.mjs`, sin DOM/WebGL). Debe quedar **en verde** antes de commitear.
- **Servir local:** `npm start` (http-server en :8080). No hay paso de build.
- Sintaxis rápida: `node --check js/<archivo>.js`.

## Convenciones (IMPORTANTES)
0. **Antes de implementar CUALQUIER cosa: investiga en internet** (WebSearch/WebFetch) con la **fecha de este mes/año** (p. ej. "… 2026") buscando inspiración/referencias actuales, y LUEGO combínalo con tu creatividad para diseñar lo que vas a hacer. Aplica a toda feature/pulido de aquí en adelante.
1. **`npm test` en verde** siempre antes de commitear.
2. **Bump `sw.js` `VERSION`** en cada cambio de assets desplegable; añade nuevos `js/*.js` a `ASSETS` en `sw.js`.
3. **Git author:** `git config user.email noreply@anthropic.com && user.name Claude` antes de commitear (evita "Unverified").
4. **Push a AMBAS ramas:** `claude/isometric-rpg-game-xmer7p` y `main` (p. ej. `git push origin claude/isometric-rpg-game-xmer7p:main`).
5. **NO crear PRs** salvo petición explícita.
6. **Actualiza `MEMORIA.md`** cuando añadas/cambies un sistema; márcalo ✅ y mueve el backlog.
7. No toques archivos que esté escribiendo un agente en background (p. ej. informes).
8. Para features grandes y aisladas se pueden lanzar agentes Opus en worktrees; ojo con archivos compartidos (`main.js`, `ui.js`).
9. Guardado **solo local** por ahora (DB en la nube = futuro). Investigar "info junio 2026" antes de features grandes.

## Arquitectura (mapa rápido)
- **`js/main.js`** — clase `Game`: renderer, escena, cámara iso ortográfica, bucle `tick`, `loadWorld`, combate, FX, loot.
- **Mixins de `Game`** (al final de main.js, `Object.assign(Game.prototype, …)`; **sin colisión de nombres**, lo valida `test43-mixins`):
  `economy.js` (tienda/cubo/engarce/mascota/drag), `enemy-abilities.js` (habilidades enemigas), `game-endgame.js` (bounties/tormento/códice/bendiciones/pináculo), `game-world-flow.js` (misiones/diaria/viajes/pactos), `game-zone-life.js` (respawn/jefe/goblin/oleadas), `game-mastery.js` (maestrías), `game-eras.js` (temporadas locales/eras), `game-skills.js` (canal de lanzamiento: GCD/windup/impacto/canalización/tipos genéricos), `field-entities.js` (campos de suelo).
- **`js/entities.js`** — `Player` (incl. `recompute()`, fuente única de stats: equipo, gemas, sets, paragon/glifos, bendiciones, collar del pet, **maestría**, buffs, pasivas), `Enemy`, `Projectile`, `Pet`.
- **Habilidades (Paso 2b)** — `js/skill-defs.js` (vocabulario puro: `CAT_SLOTS`, tags, formato, `validateSkillDef`, ramas), `js/skills-<clase>.js` + `js/fx-skills-<clase>.js` (catálogo/VFX por clase; `data.js`/`fx-skills.js` los fusionan), `js/skill-resolve.js`, `js/resources.js`, `js/powers.js` + `js/powers-common.js`.
- **`js/data.js`** — catálogos: `CLASSES` (habilidades desde `skills-<clase>.js`), `ENEMIES`/`BOSSES`, `SUPPORTS`, `MASTERIES`, `PARAGON_BOARD`, `BLESSINGS`, `PACTS`, `PET_KINDS/UPGRADES/COLLARS`, `ZONE_LIST`, quests.
- **`js/items.js`** — loot/rarezas/afijos/sets/runewords/gemas/runas/míticos/glifos/charms/masterworking/gamble/`rollDrops`.
- **`js/world.js`** (pueblo/mazmorra/refugio), **`js/zones.js`** (open world), **`js/ui.js`** (toda la UI/paneles/HUD), **`js/input.js`** (teclado/ratón/joystick), **`js/postfx.js`** (post-FX + AmbientParticles + BlobShadows), **`js/particles.js`** (motor VFX gameplay), **`js/fx-skills.js`/`fx-enemies.js`** (catálogos VFX), **`js/sfx.js`**, **`js/music.js`**, **`js/vfx.js`**.

## Patrones clave
- **Poderes = registro data‑driven** (`js/powers.js`): `player.powers` (Set, se llena en `recompute()`) solo dice QUÉ poderes hay; su efecto es un `definePower(id, { stats, modifyResolve, condAdd, condCrit, onCast, afterCast, onHit, onKill, condDr, onDamaged, onLethal, onTick, mult, icd, procs, state })` que el juego invoca con `firePower(hook, p, ...args)` desde 10 puntos fijos (①‒⑩, cabecera de powers.js). **Prohibido `powers.has(` fuera de `js/powers*.js`** (`test67`). Efecto nuevo → nuevo `definePower` (comunes en `powers-common.js`; por clase en `powers-<clase>.js`, 2c), nunca un `if` en combate. Comportamientos de habilidad a medida: `defineSkillBehavior` (`<CLASE>_SKILL_BEHAVIORS`).
- **`resolveSkill(p, sk)`** (`skill-resolve.js`) es la única fuente del perfil de una habilidad (rango por nivel → ramas → talentos → soportes por tags → `modifyResolve` → CDR/coste); cacheado en `p.resolved`. Rango = `clamp(1+⌊(Nv−req)/8⌋,1,5)`; las habilidades se aprenden solas por nivel (`isKnown`); `p.skills` es derivado (no se guarda).
- **`CAT_SLOTS`** (`skill-defs.js`): `basic→lmb`, `spender→rmb|k2`, `movement→k1`, `defense|utility→k2`, `spec→k3`, `ultimate→k4` (k2 flexible). `fitsSlot(sk, slot)` valida la barra. Formato exacto de habilidad y guía de trabajo por clase: `MEMORIA.md` §7.
- **`recompute()`** es la única fuente de `player.stats`. Cualquier bonus nuevo se suma ahí.
- **Fórmulas de combate**: SOLO en `js/combat-math.js` (puro): daño = arma × coef × (1+Σaditivo) × atributo × crítico × vulnerable × Π[×] (máx 3 multiplicadores), topes (`CAPS`), defensas en capas, curva `G(AL)`, Tormento. Un bonus "+X %" va al saco aditivo (stat `dmgPct` o `addPct` de la habilidad); un multiplicador nuevo se registra con `registerMultiplier`. Tras tocar números, `node tests/balance-bench.mjs --report`.
- **Recurso**: `js/resources.js` (`spendResource`/`gainResource`/`tickResource`); sustento (robo, vida al golpear, Festín) por la cubeta compartida `p.sustain()`; CC enemigo por `Enemy.applyCC(kind, dur)` (rendimientos decrecientes), nunca asignar `stunT`/`slowT` a mano.
- **Habilidades** (`js/skills-<clase>.js`): primero un **tipo genérico** de `game-skills.js` con sus claves (`cadence`, `gen`/`genOnHit`, `splash`, `hitDot`, `slowImmune`, `unstoppable`, `allyDr`/`projMissPct`, `weakenPct`, buff `spenderCostPct`, type `aura`); solo si no basta, un `behavior` que use `g.gainResource`, `g.fireProjectile`, `g.startChannel`, `g.dealArea`. Ralentizar al héroe: SOLO `p.applySlow(dur)`. Debilitar el daño de un enemigo: `e.weakenOutgoing(id, pct, dur)`. Proyectiles extra de una habilidad de 1 proyectil: un impacto por enemigo (`castHits`). Tras tocar números: `node tests/balance-bench.mjs --report` (canal real, LOADOUT por clase, UNI con reparto por habilidad).
- **Nuevo sistema de progresión** → considera un **mixin** nuevo (como `game-mastery.js`) y regístralo en `Object.assign` + `test43-mixins`.
- **`ui.js` y `main.js` NO se importan headless** (usan `window`/DOM): la lógica testeable vive en módulos puros (data/items/economy/entities/world/zones). Los tests usan un `game` "fake".

## Gotchas
- `recompute()` **ignora objetos sin identificar** (no dan stats).
- El motor de partículas necesita `document` → protegido con `?.`/try-catch para tests.
- `pickupGroundItem` tiene guarda anti doble-recogida (`indexOf<0`).
- Migración de saves: los campos persistidos y las migraciones de formato viven en `js/save-schema.js` (`PLAYER_SAVE_FIELDS`, `SAVE_VERSION`, `MIGRATIONS[v]`); el constructor de `Player` solo pone valores por defecto y valida contra catálogos.
- Azar: la simulación usa streams con semilla (`js/rng.js`: `layout`/`spawn`/`loot`; `game.simRng(stream)`); `Math.random` solo para FX/UI. Efectos con retardo de combate van por el planificador por ticks (`js/timers.js`), nunca `setTimeout`.
