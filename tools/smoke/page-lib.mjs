// ============================================================
// Biblioteca que el humo INYECTA en la página del juego (window.__smokeLib)
// ============================================================
// `pageLib` se serializa con toString() y se evalúa en la página tras cada navegación: NO
// puede usar nada de este módulo ni de Node. Importa los módulos del juego por su URL absoluta
// (misma URL = misma instancia que usa el juego: comparten estado).
// Contratos que consume (docs/paso2-implementacion.md): §6 (pasos del humo), §3.3/§3.4 (mixin de
// talentos: chooseSpec, applyTalentBuild, exportTalentCode, talentPointsInfo), §3.5 (CATALOG_V),
// §3.6.1/§3.7 (releaseSkillSlot, cancelHeld, mouseHeld), §3.12 (verbView, DOM estable).
// Todo lo que aún no existe en el juego se detecta y se devuelve como «no disponible» (el
// llamador decide si es un salto o un fallo).

export function pageLib() {
  if (window.__smokeLib) return true;
  const abs = p => new URL(p, location.href).href;
  const mod = p => import(abs(p));
  const G = () => window.__game;
  const now = () => performance.now();
  const yieldNow = () => new Promise(r => { const c = new MessageChannel(); c.port1.onmessage = () => r(); c.port2.postMessage(0); });
  const L = { frames: 0, messages: [] };

  // contador de frames del bucle del juego (setAnimationLoop llama this.tick() en cada frame)
  // y registro de los avisos (ui.message) para afirmar el aviso de migración
  L.install = () => {
    const g = G();
    if (!g || g.__smokeTick) return !!g;
    const tick = g.tick;
    g.__smokeTick = tick;
    g.tick = function () { L.frames++; return tick.apply(this, arguments); };
    const msg = g.ui?.message;
    if (typeof msg === 'function') g.ui.message = function (t) { L.messages.push(String(t)); return msg.apply(this, arguments); };
    return true;
  };

  L.ready = () => {
    const g = G();
    return !!(g && g.ui && g.state === 'select' && document.readyState === 'complete');
  };

  L.hudVisible = () => {
    const h = document.getElementById('hud');
    if (!h || h.classList.contains('hidden')) return false;
    const cs = getComputedStyle(h);
    return cs.display !== 'none' && cs.visibility !== 'hidden';
  };

  // datos de la clase: especializaciones, versión del catálogo (§3.5) y qué contratos del motor existen ya
  L.classInfo = async (cls) => {
    const g = G();
    const T = await mod('js/talents.js');
    const tree = (T.talentTreesFor && T.talentTreesFor(cls)) || T.TALENT_TREES?.[cls] || null;
    const specs = (tree?.specs || []).map(s => ({ id: s.id, name: s.name }));
    let catalogV = 1;
    try {
      const S = await mod(`js/skills-${cls}.js`);
      const v = S[`${cls.toUpperCase()}_CATALOG_V`];
      if (v != null) catalogV = v;
    } catch { /* sin catálogo propio */ }
    try { const D = await mod('js/data.js'); if (D.CATALOG_V && D.CATALOG_V[cls] != null) catalogV = D.CATALOG_V[cls]; } catch { /* */ }
    let saveVersion = null, notices = {};
    try { const SS = await mod('js/save-schema.js'); saveVersion = SS.SAVE_VERSION; notices = SS.LOAD_NOTICES || {}; } catch { /* */ }
    let heroTrees = 0;
    try { heroTrees = (tree?.hero || []).length; } catch { /* */ }
    return {
      specs, catalogV, saveVersion, noticeIds: Object.keys(notices), heroTrees, talentsV: tree?.v || 1,
      has: {
        releaseSkillSlot: typeof g?.releaseSkillSlot === 'function',
        cancelHeld: typeof g?.cancelHeld === 'function',
        applyTalentBuild: typeof g?.applyTalentBuild === 'function',
        chooseForge: typeof g?.chooseForge === 'function',
      },
    };
  };

  L.start = (cls, slot) => {
    const g = G();
    L.messages.length = 0;
    g.startGame(cls, {}, slot);
    return { state: g.state, cls: g.player?.classId, level: g.player?.level, hud: L.hudVisible(), hotbar: { ...(g.player?.hotbar || {}) } };
  };

  // sube de nivel por el camino real (gainXP: avisos, habilidades aprendidas a la barra)
  L.setLevel = async (level) => {
    const g = G(), p = g.player;
    const D = await mod('js/data.js');
    for (let i = 0; i < 300 && p.level < level; i++) {
      const need = Math.max(1, Math.ceil(D.xpForLevel(p.level) - (p.xp || 0)));
      const before = p.level;
      if (typeof p.gainXP === 'function') p.gainXP(need); else p.level++;
      if (p.level === before) break;    // tope de nivel
    }
    if (p.level !== level) { p.level = level; p.xp = 0; }
    p.recompute();
    g.ui?.refreshHotbar?.();
    return { level: p.level, hotbar: { ...(p.hotbar || {}) } };
  };

  // especialización (gratis fuera de combate: sinceCombat ≥ 5 s)
  L.chooseSpec = (spec) => {
    const g = G(), p = g.player;
    p.sinceCombat = 99;
    const r = g.chooseSpec(spec) || {};
    p.recompute();
    g.ui?.refreshHotbar?.();
    return { ok: !!r.ok, reason: r.reason || r.error || null, spec: p.talents?.spec || null, hotbar: { ...(p.hotbar || {}) } };
  };

  // build recomendada (§3.4: applyTalentBuild; antes de W1, applyTalentPreset('all'))
  L.applyBuild = () => {
    const g = G(), p = g.player;
    p.sinceCombat = 99;
    const r = (typeof g.applyTalentBuild === 'function' ? g.applyTalentBuild() : g.applyTalentPreset?.('all')) || {};
    p.recompute();
    g.ui?.refreshHotbar?.();
    return { ok: !!r.ok, reason: r.reason || r.error || null };
  };

  L.clearEnemies = () => {
    const g = G();
    for (const e of g.enemies) { g.entityGroup.remove(e.group); e.dispose?.(); }
    g.enemies.length = 0;
    g.worldMarks?.clear?.();
  };

  // mazmorra con semilla fija (sin zona segura: los enemigos sí te atacan)
  L.enterArena = ({ floor = 3, seed = 424242 } = {}) => {
    const g = G();
    g.loadWorld({ type: 'dungeon', floor, seed });
    L.clearEnemies();
    return { type: g.world?.type, seed: g.world?.seed };
  };

  // n enemigos en anillos alrededor del héroe, en casillas transitables. Elenco fijo
  // (determinista; sin invocadores, para que el número no cambie solo)
  L.spawnRing = async ({ n = 30, floor = 3, immortal = false, roster = ['zombi', 'esqueleto', 'esqueleto', 'brujo', 'demonio'] } = {}) => {
    const g = G(), p = g.player;
    const D = await mod('js/data.js'), E = await mod('js/entities.js');
    const grid = g.world.grid;
    const pos = [];
    for (let r = 2.6; r <= 14 && pos.length < n; r += 1.15) {
      const k = Math.max(6, Math.round((2 * Math.PI * r) / 1.25));
      for (let i = 0; i < k && pos.length < n; i++) {
        const a = (i / k) * Math.PI * 2 + r * 0.37;
        const x = p.pos.x + Math.cos(a) * r, z = p.pos.z + Math.sin(a) * r;
        if (grid?.walkable && !grid.walkable(x, z, 0.45)) continue;
        pos.push(p.pos.clone().set(x, 0, z));
      }
    }
    for (let i = 0; i < pos.length; i++) {
      const base = D.ENEMIES.find(e => e.id === roster[i % roster.length]) || D.ENEMIES[0];
      const e = g.buffByPact(new E.Enemy(g, D.scaleEnemy(base, floor), pos[i]));
      e.aggroed = true;
      if (immortal) { e.maxHP = 1e9; e.hp = 1e9; }
      g.enemies.push(e);
      g.entityGroup.add(e.group);
    }
    return pos.length;
  };

  const nearest = (g, p) => {
    let best = null, bd = Infinity;
    for (const e of g.enemies) {
      if (!e.alive) continue;
      const d = e.pos.distanceToSquared(p.pos);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  };

  // Calibración: trabajo FIJO de JS (vecinos más cercanos entre 64 puntos y una ordenación,
  // ~decenas de µs) que se mide intercalado con los ticks: sufre la misma carga de la máquina
  // que la simulación, así que sim/calib compara corridas hechas en condiciones distintas.
  const CAL_PTS = Array.from({ length: 64 }, (_, i) => ({ x: Math.sin(i * 2.1) * 10, z: Math.cos(i * 1.3) * 10, v: 0 }));
  const calibWork = () => {
    let s = 0;
    for (let k = 0; k < 4; k++) {
      for (const a of CAL_PTS) {
        let best = 1e9;
        for (const b of CAL_PTS) { const dx = a.x - b.x, dz = a.z - b.z, d = dx * dx + dz * dz; if (d > 0 && d < best) best = d; }
        a.v = Math.sqrt(best) + k * 1e-3;
        s += a.v;
      }
      const arr = CAL_PTS.map(p => ({ v: p.v, w: p.x }));
      arr.sort((p, q) => p.v - q.v || p.w - q.w);
      s += arr[0].v;
    }
    return s;
  };
  L.calibSink = 0;

  // Ciclo de pulsación por ranura: [mantener `hold` ticks (castSkillSlot cada tick, como un
  // botón mantenido) → soltar (releaseSkillSlot si existe) → `gap` ticks quieto], desfasado.
  const SLOT_CYCLE = {
    lmb: { hold: 30, gap: 6, phase: 0 }, rmb: { hold: 30, gap: 6, phase: 18 },
    k1: { hold: 1, gap: 119, phase: 40 }, k2: { hold: 1, gap: 89, phase: 10 },
    k3: { hold: 1, gap: 89, phase: 55 }, k4: { hold: 1, gap: 89, phase: 80 },
  };

  // Motor de ticks MANUAL: para el bucle de setAnimationLoop, fija dt, renderiza solo uno de
  // cada `renderEvery` ticks (0 = nunca) y mide cada tick con performance.now(). Los cubos `ui`,
  // `fx` y `render` se restan del total → `sim` = lógica del juego (lo que afirma §6).
  L.drive = async ({ seconds = 5, dt = 1 / 60, renderEvery = 6, slots = ['lmb', 'rmb', 'k1', 'k2', 'k3', 'k4'],
    keepAlive = true, warmup = 0, measure = false, chunk = 60, quietUi = false } = {}) => {
    const g = G(), p = g.player;
    const restore = [];
    const acc = { ui: 0, fx: 0, render: 0 };
    const noop = function () {};
    const wrap = (obj, name, bucket, replace = null) => {
      if (quietUi && bucket !== 'render' && !replace) replace = noop;
      if (!obj || typeof obj[name] !== 'function') return;
      const own = Object.prototype.hasOwnProperty.call(obj, name);
      const f = obj[name];
      obj[name] = function () {
        const t = now();
        try { return replace ? replace.apply(this, arguments) : f.apply(this, arguments); } finally { acc[bucket] += now() - t; }
      };
      restore.push(() => { if (own) obj[name] = f; else delete obj[name]; });
    };
    let renderOn = false;
    const realRender = g.renderScene;
    wrap(g, 'renderScene', 'render', function () { if (renderOn) return realRender.apply(this, arguments); });
    for (const n of ['updateFloats', 'updateHUD', 'drawMinimap', 'renderMap', 'spawnText', 'message', 'updateTopBand']) wrap(g.ui, n, 'ui');
    for (const n of ['syncWorldLabels', 'updatePerfHud']) wrap(g, n, 'ui');
    for (const n of ['emitFx', 'spawnBurst', 'spawnRing', 'addShake', 'sfx', 'vibrate']) wrap(g, n, 'fx');
    wrap(g.psys, 'update', 'fx'); wrap(g.particles, 'update', 'fx'); wrap(g.worldMarks, 'update', 'fx');
    wrap(g.blobShadows, 'update', 'fx'); wrap(g.postfx, 'setOutlineTargets', 'fx');
    // reloj fijo y bucle real parado
    g.renderer.setAnimationLoop(null);
    const clk = g.clock;
    clk.getDelta = () => dt;
    restore.push(() => { delete clk.getDelta; clk.getDelta(); });
    const mh = g.input?.mouseHeld;
    const counts = {}, oks = {};
    for (const s of slots) { counts[s] = 0; oks[s] = 0; }
    const N = Math.round(seconds / dt), W = Math.round(warmup / dt);
    const sim = [], ui = [], fx = [], cal = [];
    let deaths = 0, eMin = Infinity, eMax = 0, eSum = 0, paused = 0;
    if (measure) for (let i = 0; i < 200; i++) L.calibSink += calibWork();   // calentar el JIT
    // con un panel abierto la simulación se congela (main.js tick): se cierran antes de empezar
    const panelAtStart = g.ui?.activePanel || null;
    g.ui?.closeAllPanels?.();
    try {
      for (let i = 0; i < N; i++) {
        if (keepAlive) {
          if (!p.alive || g.state === 'dead') {
            deaths++; p.alive = true; g.state = 'play'; g.ui?.hideDeath?.();
          }
          p.hp = p.stats.maxHP;
        }
        g.hitStopT = 0;
        const tgt = nearest(g, p);
        if (tgt && g.input) g.input.mouseWorld = tgt.pos.clone();
        renderOn = renderEvery > 0 && i % renderEvery === 0;
        const a0 = acc.ui, b0 = acc.fx, c0 = acc.render;
        const t0 = now();
        for (const s of slots) {
          const c = SLOT_CYCLE[s] || { hold: 1, gap: 60, phase: 0 };
          const k = (i + c.phase) % (c.hold + c.gap);
          if (k < c.hold) {
            if (mh && (s === 'lmb' || s === 'rmb')) mh[s === 'lmb' ? 'l' : 'r'] = true;
            counts[s]++;
            if (g.castSkillSlot(s)) oks[s]++;
          } else if (k === c.hold) {
            if (mh && (s === 'lmb' || s === 'rmb')) mh[s === 'lmb' ? 'l' : 'r'] = false;
            g.releaseSkillSlot?.(s);
          }
        }
        g.tick();
        const t1 = now();
        if (g._paused) paused++;
        if (i >= W) {
          const dUi = acc.ui - a0, dFx = acc.fx - b0, dR = acc.render - c0;
          sim.push(t1 - t0 - dUi - dFx - dR); ui.push(dUi); fx.push(dFx);
          if (measure) { const k0 = now(); L.calibSink += calibWork(); cal.push(now() - k0); }
          const n = g.enemies.length; eSum += n; if (n < eMin) eMin = n; if (n > eMax) eMax = n;
        }
        if (i % chunk === chunk - 1) await yieldNow();
      }
    } finally {
      if (mh) mh.l = mh.r = false;
      for (const s of slots) g.releaseSkillSlot?.(s);
      g.cancelHeld?.('cancel');
      for (const r of restore.reverse()) r();
      g.renderer.setAnimationLoop(() => g.tick());
    }
    // tmean = media sin el 1 % de ticks más caros (pausas de GC o del sistema: con un tick de
    // ~0,15 ms, una sola pausa de 30 ms mueve la media de 20 s un 15 %)
    const stats = arr => {
      if (!arr.length) return null;
      const s = [...arr].sort((a, b) => a - b);
      const q = f => s[Math.min(s.length - 1, Math.floor(f * s.length))];
      const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
      const keep = s.slice(0, Math.max(1, Math.floor(s.length * 0.99)));
      const tmean = keep.reduce((a, b) => a + b, 0) / keep.length;
      const r4 = v => Math.round(v * 10000) / 10000;
      return { mean: r4(mean), tmean: r4(tmean), p50: r4(q(0.5)), p95: r4(q(0.95)), p99: r4(q(0.99)), max: r4(s[s.length - 1]) };
    };
    const out = { ticks: N, measured: sim.length, casts: counts, castsOk: oks, deaths, state: g.state, alive: p.alive,
      pausedTicks: paused, panelAtStart, panelAtEnd: g.ui?.activePanel || null,
      enemies: { min: eMin === Infinity ? 0 : eMin, max: eMax, avg: sim.length ? Math.round((eSum / sim.length) * 10) / 10 : 0 } };
    if (measure) {
      out.simMs = stats(sim); out.uiMs = stats(ui); out.fxMs = stats(fx);
      out.frameMs = stats(sim.map((v, i) => v + ui[i] + fx[i]));
      out.calibMs = stats(cal);
      // coste de la simulación en «unidades de calibración» (independiente de la carga de la máquina)
      out.simNorm = out.calibMs?.tmean > 0 ? Math.round((out.simMs.tmean / out.calibMs.tmean) * 10000) / 10000 : null;
    }
    return out;
  };

  // HUD medido en partida (bloques vacíos con muestras: peor caso; docs/paso2d2-hud-pc.md §7.1)
  L.hudCheck = () => {
    const g = G();
    g.ui.applyHudScale?.();
    const r = g.ui.hudCheck();
    return r ? { res: r.res, solapes: r.solapes || [], fuera: r.fuera || [] } : null;
  };

  // estado de la carga y de la vista de verbos (§3.12: verbView(g) y .verb-charge[data-in-window])
  L.verbState = async () => {
    const g = G();
    let view = null;
    try { const HM = await mod('js/hud-model.js'); if (typeof HM.verbView === 'function') view = HM.verbView(g); } catch { /* */ }
    const el = document.querySelector('.verb-charge');
    const visible = !!el && (() => { const cs = getComputedStyle(el); const r = el.getBoundingClientRect(); return cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity) > 0 && r.width > 0; })();
    return {
      charging: !!g._charging, mouseHeld: g.input?.mouseHeld ? { ...g.input.mouseHeld } : null,
      hasVerbView: !!view, inWindowModel: view?.charge ? !!view.charge.inWindow : null,
      el: !!el, visible, inWindowDom: el ? el.dataset.inWindow != null && el.dataset.inWindow !== 'false' : null,
    };
  };

  // primera habilidad del catálogo (de la clase) con un verbo; devuelve dónde ponerla
  L.findVerbSkill = async (verb) => {
    const g = G(), p = g.player;
    const R = await mod('js/skill-resolve.js');
    const has = sk => verb === 'charge' ? !!sk.charge : verb === 'recast' ? !!sk.recast : verb === 'stance' ? (sk.type === 'stance' || !!sk.stance) : false;
    for (const sk of p.cls.skills) {
      if (!has(sk)) continue;
      const slots = sk.slots || [];
      return { id: sk.id, spec: sk.spec || null, req: sk.req || 1, slots, fits: ['rmb', 'k2', 'k3', 'k4', 'k1', 'lmb'].filter(s => !R.fitsSlot || R.fitsSlot(sk, s)) };
    }
    return null;
  };

  L.putInSlot = (skillId, slot) => {
    const g = G(), p = g.player;
    for (const [s, id] of Object.entries(p.hotbar)) if (id === skillId) p.hotbar[s] = null;
    p.hotbar[slot] = skillId;
    p.recompute();
    g.ui?.refreshHotbar?.();
    return { ...p.hotbar };
  };

  // avanza la simulación `n` ticks a mano (sin render) llamando `each(i)` antes de cada uno
  L.step = async (n, dt = 1 / 60, probe = false) => {
    const g = G();
    g.renderer.setAnimationLoop(null);
    const clk = g.clock;
    clk.getDelta = () => dt;
    const seen = [];
    try {
      for (let i = 0; i < n; i++) {
        g.player.hp = g.player.stats.maxHP;
        g.hitStopT = 0;
        g.tick();
        if (probe) seen.push(await L.verbState());
      }
    } finally {
      delete clk.getDelta; clk.getDelta();
      g.renderer.setAnimationLoop(() => g.tick());
    }
    return seen;
  };

  window.__smokeLib = L;
  return true;
}
