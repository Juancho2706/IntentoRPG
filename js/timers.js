// ============================================================
// Planificador por ticks de la SIMULACIÓN (módulo puro, testeable headless)
// ============================================================
// Sustituye a setTimeout en efectos de combate (DoT, Eco, impactos diferidos):
//  - avanza con el dt de la simulación (Game.tick → timers.tick(dt)), así que
//    se CONGELA con la pausa (paneles abiertos) y respeta el hit-stop;
//  - es determinista: tareas ordenadas por (instante, orden de alta);
//  - se limpia al cambiar de mundo (Game.loadWorld → timers.clear()), así ningún
//    efecto del mundo anterior "salta" en el nuevo.
// Los setTimeout puramente visuales/UI (ui.js, music.js) siguen como estaban.

export class TickScheduler {
  constructor() {
    this.now = 0;        // segundos de simulación acumulados
    this.tasks = [];     // { id, at, fn }
    this._seq = 0;
  }

  // ejecuta fn tras `delay` segundos de simulación. Devuelve un id cancelable.
  schedule(delay, fn) {
    const id = ++this._seq;
    this.tasks.push({ id, at: this.now + Math.max(0, +delay || 0), fn });
    return id;
  }

  // segundos que le faltan a la tarea `id` (null si ya no está programada)
  dueIn(id) {
    const t = this.tasks.find(x => x.id === id);
    return t ? Math.max(0, t.at - this.now) : null;
  }

  cancel(id) {
    const i = this.tasks.findIndex(t => t.id === id);
    if (i >= 0) { this.tasks.splice(i, 1); return true; }
    return false;
  }

  // avanza el reloj y ejecuta, en orden, todo lo vencido (incluidas tareas que
  // se programen durante el tick con delay 0). Un error en una tarea no rompe
  // las demás ni el bucle del juego.
  tick(dt) {
    this.now += Math.max(0, +dt || 0);
    for (let guard = 0; guard < 10000; guard++) {
      let best = -1;
      for (let i = 0; i < this.tasks.length; i++) {
        const t = this.tasks[i];
        if (t.at > this.now) continue;
        if (best < 0 || t.at < this.tasks[best].at || (t.at === this.tasks[best].at && t.id < this.tasks[best].id)) best = i;
      }
      if (best < 0) break;
      const [task] = this.tasks.splice(best, 1);
      try { task.fn(); } catch (err) { console.error('[timers]', err); }
    }
  }

  clear() { this.tasks.length = 0; }

  get size() { return this.tasks.length; }
}

// ------------------------------------------------------------
// Daño por tiempo (sangrado/veneno/quemadura) sobre el planificador
// ------------------------------------------------------------
// UNA instancia por (fuente, objetivo) guardada en enemy._dots[source]. Si la
// misma fuente vuelve a aplicar el DoT antes de terminar, la instancia se
// REFRESCA: duración nueva y el daño pendiente se suma al nuevo (el daño total
// entregado es el mismo que con el apilado anterior → sin cambio de balance; solo
// se acota el número de temporizadores vivos). El ajuste fino de cómo apilan los
// DoT queda para el paso de fórmulas (combat-math).
// El refresco (y la sustitución) NO reinicia el ritmo de los tics: el siguiente llega
// cuando tocaba (E4b-bugs). Antes cada reaplicación lo empujaba un intervalo entero, así
// que un DoT reaplicado más deprisa que su intervalo no hacía ni un tic mientras se
// reaplicaba: el Sangrado del Remolino (4 golpes/s, tics de 0,5 s) se acumulaba durante
// todo el giro, sin Sed, y Reabrir dejaba sin tics los Sangrados que reiniciaba.
// Se detiene solo al morir el objetivo (o al limpiar el planificador).
//   opts: { total, ticks, interval, source = 'dot', replace = false }
//   replace (Paso 2c.2): SUSTITUYE a la instancia previa sin integrar lo pendiente
//   («no se apila»: Quemadura de Ignición sin Concentración).
// Al AGOTARSE sola (el objetivo sigue vivo) avisa a enemy.game.onDotEnd(enemy, inst)
// (⑬ onDotEnd de los poderes: Corazón del Sol). inst = { source, per, left, ticks,
// total, interval, timer }.
export function applyDoTInstance(sched, enemy, opts) {
  const ticks = Math.max(1, opts.ticks | 0);
  const total = +opts.total || 0;
  if (!sched || !enemy || !enemy.alive || total <= 0) return null;
  const interval = Math.max(0.01, +opts.interval || 1);
  const source = opts.source || 'dot';
  const dots = enemy._dots || (enemy._dots = {});
  const prev = dots[source];
  // pendiente de la instancia previa (si sigue viva) → se integra en la nueva; su
  // siguiente tic marca el ritmo de la nueva
  let pending = 0, due = null;
  if (prev && prev.left > 0) {
    if (!opts.replace) pending = prev.per * prev.left;
    due = sched.dueIn ? sched.dueIn(prev.timer) : null;
    sched.cancel(prev.timer);
  }
  const per = Math.max(1, Math.round((Math.max(1, Math.round(total / ticks)) * ticks + pending) / ticks));
  const inst = { source, per, left: ticks, ticks, total: per * ticks, interval, timer: 0 };
  dots[source] = inst;
  const step = () => {
    if (dots[source] !== inst) return;               // reemplazada
    if (!enemy.alive) { inst.left = 0; delete dots[source]; return; }
    // tic de DoT (HitInfo.dot: no dispara onHit salvo `procs:true`); la fuente
    // `${habilidad}:${tipo}` atribuye el daño a su habilidad (KillInfo, banco)
    const sep = source.indexOf(':');
    enemy.takeDamage(inst.per, false, { dot: true, source: `dot:${source}`, skill: sep > 0 ? source.slice(0, sep) : null });
    inst.left--;
    if (inst.left > 0 && enemy.alive) inst.timer = sched.schedule(interval, step);
    else {
      if (dots[source] === inst) delete dots[source];
      if (enemy.alive && inst.left <= 0) { try { enemy.game?.onDotEnd?.(enemy, inst); } catch (err) { console.error('[dot] onDotEnd', err); } }
    }
  };
  inst.timer = sched.schedule(due != null ? Math.min(interval, due) : interval, step);
  return inst;
}

// ---- consulta y consumo de DoT (Paso 2c.2: los poderes no tocan enemy._dots) ----
// tipo de un DoT a partir de su fuente `<habilidad>:<tipo>` ('p_ignicion:burn' → 'burn')
export function dotKindOf(source) {
  const s = String(source || '');
  const i = s.lastIndexOf(':');
  return i >= 0 ? s.slice(i + 1) : s;
}
// casa una instancia con `which`: null (todas), un tipo ('burn'), una fuente exacta
// ('p_ignicion:burn') o una función (inst, source) → bool
function dotMatch(source, inst, which) {
  if (which == null) return true;
  if (typeof which === 'function') return !!which(inst, source);
  return source === which || dotKindOf(source) === which;
}
// instancias VIVAS: [{ source, kind, per, left, ticks, total, remaining, interval }]
// (interval: s entre tics; left × interval = lo que le queda, cola W2d)
export function dotsOf(enemy, which = null) {
  const out = [];
  for (const [source, inst] of Object.entries(enemy?._dots || {})) {
    if (!inst || !(inst.left > 0) || !dotMatch(source, inst, which)) continue;
    out.push({ source, kind: dotKindOf(source), per: inst.per, left: inst.left, ticks: inst.ticks || inst.left, total: inst.total || inst.per * inst.left,
      remaining: inst.per * inst.left, interval: inst.interval || 1 });
  }
  return out;
}
export function dotRemaining(enemy, which = null) {
  return dotsOf(enemy, which).reduce((a, d) => a + d.remaining, 0);
}
// quita (sin aplicar) los DoT que casan y devuelve su daño restante (detonar)
export function consumeDoTs(sched, enemy, which = null) {
  let rem = 0;
  const dots = enemy?._dots;
  if (!dots) return 0;
  for (const [source, inst] of Object.entries(dots)) {
    if (!inst || !(inst.left > 0) || !dotMatch(source, inst, which)) continue;
    rem += inst.per * inst.left;
    try { sched?.cancel?.(inst.timer); } catch { /* */ }
    inst.left = 0;
    delete dots[source];
  }
  return rem;
}
// sustituye el DoT de opts.source (lo pendiente se pierde)
export function replaceDoTInstance(sched, enemy, opts) {
  return applyDoTInstance(sched, enemy, { ...opts, replace: true });
}
