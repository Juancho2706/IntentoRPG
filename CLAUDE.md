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
  `economy.js` (tienda/cubo/engarce/mascota/drag), `enemy-abilities.js` (habilidades enemigas), `game-endgame.js` (bounties/tormento/códice/bendiciones/pináculo), `game-world-flow.js` (misiones/diaria/viajes/pactos), `game-zone-life.js` (respawn/jefe/goblin/oleadas), `game-mastery.js` (maestrías).
- **`js/entities.js`** — `Player` (incl. `recompute()`, fuente única de stats: equipo, gemas, sets, paragon/glifos, bendiciones, collar del pet, **maestría**, buffs, pasivas), `Enemy`, `Projectile`, `Pet`.
- **`js/data.js`** — catálogos: `CLASSES`, skills+sinergias, `ENEMIES`/`BOSSES`, `SUPPORTS`, `MASTERIES`, `PARAGON_BOARD`, `BLESSINGS`, `PACTS`, `PET_KINDS/UPGRADES/COLLARS`, `ZONE_LIST`, quests.
- **`js/items.js`** — loot/rarezas/afijos/sets/runewords/gemas/runas/míticos/glifos/charms/masterworking/gamble/`rollDrops`.
- **`js/world.js`** (pueblo/mazmorra/refugio), **`js/zones.js`** (open world), **`js/ui.js`** (toda la UI/paneles/HUD), **`js/input.js`** (teclado/ratón/joystick), **`js/postfx.js`** (post-FX + AmbientParticles + BlobShadows), **`js/particles.js`** (motor VFX gameplay), **`js/fx-skills.js`/`fx-enemies.js`** (catálogos VFX), **`js/sfx.js`**, **`js/music.js`**, **`js/vfx.js`**.

## Patrones clave
- **Poderes** (`player.powers` Set): el punto de extensión de comportamiento. Se llenan en `recompute()` (items, paragon, **nodos de maestría**) y se consumen en combate (`rollDamage`, `Enemy.takeDamage`, `onEnemyKilled`, `onDealHit`, `Player.takeDamage`). Para un efecto nuevo: añade un `power` a un nodo/objeto y cabléalo en el hook adecuado.
- **`recompute()`** es la única fuente de `player.stats`. Cualquier bonus nuevo se suma ahí.
- **Nuevo sistema de progresión** → considera un **mixin** nuevo (como `game-mastery.js`) y regístralo en `Object.assign` + `test43-mixins`.
- **`ui.js` y `main.js` NO se importan headless** (usan `window`/DOM): la lógica testeable vive en módulos puros (data/items/economy/entities/world/zones). Los tests usan un `game` "fake".

## Gotchas
- `recompute()` **ignora objetos sin identificar** (no dan stats).
- El motor de partículas necesita `document` → protegido con `?.`/try-catch para tests.
- `pickupGroundItem` tiene guarda anti doble-recogida (`indexOf<0`).
- Migración de saves: normaliza esquemas nuevos en el constructor de `Player` (ver `pet`, `mastery`).
