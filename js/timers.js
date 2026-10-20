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
// Se detiene solo al morir el objetivo (o al limpiar el planificador).
//   opts: { total, ticks, interval, source = 'dot' }
export function applyDoTInstance(sched, enemy, opts) {
  const ticks = Math.max(1, opts.ticks | 0);
  const total = +opts.total || 0;
  if (!sched || !enemy || !enemy.alive || total <= 0) return null;
  const interval = Math.max(0.01, +opts.interval || 1);
  const source = opts.source || 'dot';
  const dots = enemy._dots || (enemy._dots = {});
  const prev = dots[source];
  // pendiente de la instancia previa (si sigue viva) → se integra en la nueva
  let pending = 0;
  if (prev && prev.left > 0) { pending = prev.per * prev.left; sched.cancel(prev.timer); }
  const per = Math.max(1, Math.round((Math.max(1, Math.round(total / ticks)) * ticks + pending) / ticks));
  const inst = { source, per, left: ticks, interval, timer: 0 };
  dots[source] = inst;
  const step = () => {
    if (dots[source] !== inst) return;               // reemplazada
    if (!enemy.alive) { inst.left = 0; delete dots[source]; return; }
    enemy.takeDamage(inst.per, false);
    inst.left--;
    if (inst.left > 0 && enemy.alive) inst.timer = sched.schedule(interval, step);
    else delete dots[source];
  };
  inst.timer = sched.schedule(interval, step);
  return inst;
}
