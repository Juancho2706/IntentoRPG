// ============================================================
// Test 89 — COLA W2c del Paso 2 (E3b): lo que pidieron U1 y U2 al motor
// ============================================================
//  1) g._chargeEnd = { key, id, reason, perfect, frac, t, instant } al terminar CADA carga:
//     suelta (release | auto, perfect = el de la suelta), cancelación sin coste (esquiva, panel,
//     cancelar, golpe, control, movilidad: el motivo de ⑭; reinicio: 'reset', sin ⑭; perfect
//     false) y carga instantánea; el eco no lo escribe. t va en el reloj de _charging.t0
//     (p.simT). Contra el consumidor REAL (ui-verbs.finishCharge): un fallo sin racha previa ya
//     da el destello rojo, y un registro viejo, de otra ranura, de otra habilidad o ninguno no
//     cuentan (manda la racha); se pisa entre la simulación y la pintura, porque el motor ya
//     escribe el suyo en cada suelta
//  2) estallidos de trampa: owner.trapBursts guarda { t, x, z } con el centro del campo que
//     estalla (pisada y detonación); trapBurstsWithin cuenta los dos formatos; el anillo de la
//     Batida (respaldo del Coto en world-marks) sale en el centro de los estallidos
//  3) avisos del Paragon (apertura y pausa): con _talentQuiet (la llamada viene del panel, que
//     los enseña en su aviso) no van además a ui.message; sin _talentQuiet, igual que antes
import assert from 'node:assert/strict';
import './helpers/use-talents-fixture.mjs';
const T = await import('../js/talents.js');
const { definePower } = await import('../js/powers.js');
const { talentMethods } = await import('../js/game-talents.js');
const { gameTalentOps } = await import('../js/ui-talents.js');
const { verbMarksPlan } = await import('../js/world-marks.js');
const { createVerbHud } = await import('../js/ui-verbs.js');
const { makeHarness } = await import('./helpers/power-harness.mjs');
const { verbHarness } = await import('./fixtures/skills-verbs-sample.mjs');

const DT = 1 / 60;
const near = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;

// espía del fin de verbo (⑭): el _chargeEnd tiene que coincidir con lo que ve onSkillEnd
const ENDS = [];
definePower('vx_spy89', { name: 'espía de fin de verbo', onSkillEnd(g, p, sk, end) { ENDS.push({ id: sk.id, ...end }); } });
// carga instantánea (como Ojo Entrenado: «sale al instante y a carga completa»)
definePower('vx_instant89', { name: 'carga instantánea', onCast(g, p, cast) { if (cast.sk?.id === 'vx_martillo') cast.instant = true; } });

// ------------------------------------------------ 1) g._chargeEnd al terminar CADA carga
{
  const mk = (powers = []) => {
    const h = verbHarness('guerrero', { level: 40, powers: ['vx_spy89', ...powers] });
    h.setSlot('rmb', 'vx_martillo'); h.setSlot('k1', 'vx_paso');
    h.p.recompute();
    return h;
  };
  // entre cargas: pasa el GCD de la suelta anterior y se rellena todo
  const fresh = h => { h.step(0.35); h.g.resetCooldowns(h.p); h.p.mp = 999; h.g._needsRelease = {}; h.g._chargeEnd = null; };
  // empieza una carga del Martillo (ventana [0,9, 1,1], máx. 1,2) y devuelve su t0
  const begin = (h, sec = 0.3) => {
    fresh(h);
    const t = h.p.simT;
    assert.equal(h.press('rmb'), true, 'empieza la carga');
    const c = h.g._charging;
    assert.ok(c && c.key === 'rmb' && c.id === 'vx_martillo', 'carga del Martillo en 🖱️Der');
    assert.equal(c.t0, t, 't0 = p.simT al empezar (el reloj de _chargeEnd.t)');
    if (sec > 0) h.step(sec);
    return c;
  };
  const lastEnd = () => ENDS.filter(e => e.kind === 'charge').at(-1);
  // forma y reloj de un _chargeEnd
  const check = (h, c, want, label) => {
    const e = h.g._chargeEnd;
    assert.ok(e && typeof e === 'object', `${label}: el motor escribe g._chargeEnd`);
    assert.deepEqual(Object.keys(e).sort(), ['frac', 'id', 'instant', 'key', 'perfect', 'reason', 't'], `${label}: forma { key, id, reason, perfect, frac, t, instant }`);
    assert.equal(e.key, 'rmb', `${label}: ranura`);
    assert.equal(e.id, 'vx_martillo', `${label}: habilidad`);
    assert.equal(e.reason, want.reason, `${label}: motivo`);
    assert.equal(e.perfect, want.perfect, `${label}: perfecta`);
    assert.equal(e.instant, !!want.instant, `${label}: instantánea`);
    assert.ok(Number.isFinite(e.frac) && e.frac >= 0 && e.frac <= 1, `${label}: frac en [0, 1] (${e.frac})`);
    assert.equal(e.t, h.p.simT, `${label}: t = p.simT del instante en que terminó`);
    if (c) assert.ok(e.t >= c.t0, `${label}: t ≥ t0 de la carga (mismo reloj)`);
    return e;
  };

  // a) suelta en la ventana → release, perfecta; frac y perfect = los de la suelta (onSkillEnd)
  const h = mk();
  let c = begin(h, 0);
  for (let i = 0; i < 90 && !h.g._charging?.inWindow; i++) h.step(DT);
  assert.ok(h.g._charging?.inWindow, 'la carga llega a la ventana');
  h.release('rmb');
  assert.equal(h.g._chargeEnd, null, 'la suelta se resuelve en el tick siguiente, no antes');
  h.step(DT);
  assert.equal(h.g._charging, null, 'suelta resuelta');
  let e = check(h, c, { reason: 'release', perfect: true }, 'suelta perfecta');
  const se = lastEnd();
  assert.ok(se.reason === 'release' && se.perfect === true && near(e.frac, se.frac) && e.frac > 0, `frac de la suelta (${e.frac} / ${se.frac})`);

  // b) suelta antes de la ventana (sin racha) → release, NO perfecta
  h.p.perfectStreak = 0;
  c = begin(h, 0.25);
  assert.ok(!h.g._charging.inWindow, 'antes de la ventana');
  h.release('rmb'); h.step(DT);
  e = check(h, c, { reason: 'release', perfect: false }, 'suelta fuera');
  assert.ok(near(e.frac, lastEnd().frac), 'frac de la suelta fuera');

  // c) suelta automática al máximo (1,2: fuera de la ventana) → auto, no perfecta
  c = begin(h, 0);
  let n = 0;
  while (h.g._charging && n++ < 120) h.step(DT);
  assert.equal(h.g._charging, null, 'se suelta sola al máximo');
  e = check(h, c, { reason: 'auto', perfect: false }, 'suelta automática');
  assert.ok(near(e.frac, 1), 'carga completa: frac 1');
  h.release('rmb');

  // d) cancelaciones sin coste: el motivo que llegue, perfect false y frac = el de la carga
  const cancels = [
    ['dodge', g => g.cancelCast('dodge')],                                     // esquiva
    ['panel', (g, hh) => { g._paused = true; hh.release('rmb'); g._paused = false; }],   // soltar con un panel abierto
    ['panel', g => g.cancelHeld('panel')],                                     // abrir un panel
    ['cancel', g => g.cancelHeld('cancel')],                                   // blur / pestaña
    ['cc', g => g.cancelHeld('cc')],                                           // control duro
    ['interrupt', g => g.interruptCast('hit')],                                // golpe fuerte
    ['cancel', (g, hh) => { assert.equal(hh.press('k1'), true, 'la movilidad sale'); hh.release('k1'); }],   // movilidad
    ['reset', g => g.resetCastState()],                                        // cambio de mundo / muerte
  ];
  const chargeEnds = () => ENDS.filter(x => x.kind === 'charge').length;
  for (const [reason, act] of cancels) {
    c = begin(h, 0.3);
    const frac = c.frac, n14 = chargeEnds();
    act(h.g, h);
    assert.equal(h.g._charging, null, `${reason}: la carga terminó`);
    e = check(h, c, { reason, perfect: false }, `cancelar (${reason})`);
    assert.ok(near(e.frac, frac) && frac > 0, `${reason}: frac de la carga cancelada (${e.frac})`);
    // el mismo final que ve ⑭; el reinicio (cambio de mundo, muerte) limpia sin ⑭, como el canal
    if (reason === 'reset') assert.equal(chargeEnds(), n14, 'reset: sin ⑭ onSkillEnd');
    else {
      const se = lastEnd();
      assert.ok(chargeEnds() === n14 + 1 && se.reason === reason && se.perfect === false && near(se.frac, e.frac), `${reason}: ⑭ con el mismo motivo y frac`);
    }
    h.release('rmb');
    h.p.dashMove = null; h.p.leap = null;
  }

  // e) el ECO (repetición) no lo escribe, aunque pase por _releaseWith
  fresh(h);
  const sentinel = { key: 'rmb', id: 'vx_martillo', reason: 'release', perfect: true, frac: 0.5, t: h.p.simT, instant: false };
  h.g._chargeEnd = sentinel;
  const echo0 = h.p.skState?.vx_martillo?.echo?.n || 0;
  h.g.castSkillSlot('rmb', 0.5);
  assert.equal(h.p.skState.vx_martillo.echo.n, echo0 + 1, 'el eco salió (a carga completa, sin cargar)');
  assert.equal(h.g._chargeEnd, sentinel, 'el eco no escribe _chargeEnd');

  // f) carga instantánea: auto, sin _charging, instant true
  const hi = mk(['vx_instant89']);
  fresh(hi);
  assert.equal(hi.press('rmb'), true, 'sale al instante');
  assert.ok(!hi.g._charging, 'sin carga visible');
  e = check(hi, null, { reason: 'auto', perfect: false, instant: true }, 'carga instantánea');
  assert.ok(near(e.frac, 1), 'a carga completa');
  hi.release('rmb');
  console.log('_chargeEnd: suelta (release/auto, perfecta o no, frac de la suelta), 8 cancelaciones, eco sin registro e instantánea; t en el reloj de t0 ✓');

  // g) contra el consumidor REAL (ui-verbs.finishCharge) sobre un DOM mínimo simulado
  const kebab = k => k.replace(/[A-Z]/g, ch => '-' + ch.toLowerCase());
  class El {
    constructor(doc, tag) {
      this.ownerDocument = doc; this.tagName = tag.toUpperCase(); this.attrs = new Map(); this.children = []; this.parentNode = null;
      this._cls = ''; this._txt = ''; this._html = ''; this.title = '';
      const props = {};
      this.style = { setProperty: (k, v) => { props[k] = v; }, getPropertyValue: k => props[k] ?? '' };
      for (const k of ['transform', 'opacity']) Object.defineProperty(this.style, k, { get: () => props[k] ?? '', set: v => { props[k] = v; } });
      this.dataset = new Proxy({}, {
        get: (_, k) => this.getAttribute('data-' + kebab(String(k))) ?? undefined,
        set: (_, k, v) => { this.setAttribute('data-' + kebab(String(k)), v); return true; },
      });
    }
    get className() { return this._cls; }
    set className(v) { this._cls = v; }
    get textContent() { return this._txt; }
    set textContent(v) { this._txt = String(v); }
    set innerHTML(v) { this._html = String(v); }
    get innerHTML() { return this._html; }
    setAttribute(k, v) { this.attrs.set(k, String(v)); }
    getAttribute(k) { return this.attrs.has(k) ? this.attrs.get(k) : null; }
    hasAttribute(k) { return this.attrs.has(k); }
    removeAttribute(k) { this.attrs.delete(k); }
    appendChild(ch) { ch.parentNode?.children.splice(ch.parentNode.children.indexOf(ch), 1); this.children.push(ch); ch.parentNode = this; return ch; }
    append(...cs) { for (const ch of cs) this.appendChild(ch); }
    remove() { if (this.parentNode) { this.parentNode.children.splice(this.parentNode.children.indexOf(this), 1); this.parentNode = null; } }
    get isConnected() { let x = this; while (x.parentNode) x = x.parentNode; return !!x._root; }
    get classList() { return { contains: cl => this._cls.split(/\s+/).includes(cl) }; }
    find(cl) { for (const ch of this.children) { if (ch.classList.contains(cl)) return ch; const r = ch.find(cl); if (r) return r; } return null; }
  }
  const win = { innerWidth: 1366, innerHeight: 768, addEventListener() {}, removeEventListener() {} };
  const doc = { defaultView: win, createElement: tag => new El(doc, tag), querySelector: () => null };
  const body = new El(doc, 'body'); body._root = true;
  const root = body.appendChild(new El(doc, 'div'));
  const bar = body.appendChild(new El(doc, 'div'));
  const btn = {};
  for (const s of ['lmb', 'rmb', 'k1', 'k2', 'k3', 'k4']) { btn[s] = bar.appendChild(new El(doc, 'button')); btn[s].className = 'skill-btn'; btn[s].dataset.slot = s; }
  const hu = mk();
  hu.g.input.mouseScreen = { x: 600, y: 400 };
  const hud = createVerbHud(root, { game: hu.g, slotEl: s => btn[s] });
  const cursor = hud.bar.parentNode, glow = hud.bar.find('vc-glow');
  const state = () => cursor.getAttribute('data-state');
  const frame = (dt = DT) => { hu.step(dt, dt); hud.update(dt); };
  const settle = () => { for (let i = 0; i < 30; i++) frame(); };
  // fallo SIN racha previa: la racha sigue en 0, así que solo el motor sabe que fue un fallo
  hu.p.perfectStreak = 0;
  begin(hu, 0); hud.update(DT);
  for (let i = 0; i < 15; i++) frame();
  assert.ok(hu.g._charging && !hu.g._charging.inWindow, 'carga corta, antes de la ventana');
  hu.release('rmb'); frame();
  assert.equal(hu.p.perfectStreak, 0, 'la racha no cambió (0 → 0)');
  assert.ok(state() === 'miss' && /^miss-/.test(glow.getAttribute('data-flash') || ''), `suelta fuera sin racha → destello de fallo (estado ${state()})`);
  settle();
  // la suelta automática fuera de la ventana también es un fallo
  begin(hu, 0); hud.update(DT);
  for (let i = 0; i < 120 && hu.g._charging; i++) frame();
  assert.equal(hu.g._chargeEnd.reason, 'auto');
  assert.equal(state(), 'miss', 'suelta automática fuera de la ventana → fallo');
  hu.release('rmb'); settle();
  // acierto: destello dorado
  begin(hu, 0); hud.update(DT);
  for (let i = 0; i < 90 && !hu.g._charging?.inWindow; i++) frame();
  hu.release('rmb'); frame();
  assert.equal(state(), 'perfect', 'suelta en la ventana → perfecto');
  settle();
  // esquiva con racha: cancelar no es fallar (sin destello nuevo)
  hu.p.perfectStreak = 2;
  begin(hu, 0); hud.update(DT);
  for (let i = 0; i < 10; i++) frame();
  const flash0 = glow.getAttribute('data-flash');
  hu.g.cancelCast('dodge'); hu.release('rmb'); hud.update(DT);
  assert.ok(state() === 'end' && glow.getAttribute('data-flash') === flash0, 'esquiva: la carga termina sin destello');
  settle();

  // guardas del consumidor: el motor ya dejó SU registro en el tick de la suelta, así que aquí se
  // pisa después de la simulación y antes de pintar (lo que vería la UI con un registro ajeno)
  const flashed = (kind, f0) => { const f = glow.getAttribute('data-flash'); return f !== f0 && f?.startsWith(kind + '-'); };
  // carga del Martillo hasta la ventana (inWin) o corta, antes de ella
  const chargeTo = (inWin, streak) => {
    hu.p.perfectStreak = streak;
    begin(hu, 0); hud.update(DT);
    if (inWin) for (let i = 0; i < 90 && !hu.g._charging?.inWindow; i++) frame();
    else for (let i = 0; i < 15; i++) frame();
    assert.ok(hu.g._charging && !!hu.g._charging.inWindow === inWin, inWin ? 'en la ventana' : 'antes de la ventana');
    return hu.g._charging;
  };
  const releaseWith = (c, end) => {
    const f0 = glow.getAttribute('data-flash');
    hu.release('rmb'); hu.step(DT, DT);
    assert.equal(hu.g._charging, null, 'suelta resuelta');
    assert.equal(hu.g._chargeEnd?.key, 'rmb', 'el motor escribió el suyo');
    hu.g._chargeEnd = typeof end === 'function' ? end(c) : end;
    hud.update(DT);
    return f0;
  };
  // a) registro VIEJO (anterior al t0 de esta carga) que dice «perfecta»: no cuenta; la racha cae → fallo
  let cc = chargeTo(false, 1);
  let f0 = releaseWith(cc, x => ({ key: 'rmb', id: 'vx_martillo', reason: 'release', perfect: true, frac: 0.9, t: x.t0 - 1, instant: false }));
  assert.equal(hu.p.perfectStreak, 0, 'racha 1 → 0');
  assert.ok(state() === 'miss' && flashed('miss', f0), `_chargeEnd anterior a la carga → manda la racha: fallo (estado ${state()})`);
  settle();
  // b) registro de OTRA ranura que dice «fallo»: no cuenta; la racha sube → perfecto
  cc = chargeTo(true, 0);
  f0 = releaseWith(cc, { key: 'lmb', id: 'vx_martillo', reason: 'release', perfect: false, frac: 0.2, t: hu.p.simT, instant: false });
  assert.equal(hu.p.perfectStreak, 1, 'racha 0 → 1');
  assert.ok(state() === 'perfect' && flashed('perfect', f0), `_chargeEnd de otra ranura → manda la racha: perfecto (estado ${state()})`);
  settle();
  // c) registro de OTRA habilidad en la misma ranura que dice «perfecta»: no cuenta → fallo
  cc = chargeTo(false, 1);
  f0 = releaseWith(cc, { key: 'rmb', id: 'vx_otra', reason: 'release', perfect: true, frac: 0.9, t: hu.p.simT, instant: false });
  assert.ok(state() === 'miss' && flashed('miss', f0), `_chargeEnd de otra habilidad → manda la racha: fallo (estado ${state()})`);
  settle();
  // d) SIN registro: la racha decide (sube → perfecto, cae → fallo, 0 → 0 sin datos: sin destello)
  cc = chargeTo(true, 1);
  f0 = releaseWith(cc, null);
  assert.ok(hu.p.perfectStreak === 2 && state() === 'perfect' && flashed('perfect', f0), `sin _chargeEnd, racha 1 → 2: perfecto (estado ${state()})`);
  settle();
  cc = chargeTo(false, 2);
  f0 = releaseWith(cc, null);
  assert.ok(hu.p.perfectStreak === 0 && state() === 'miss' && flashed('miss', f0), `sin _chargeEnd, racha 2 → 0: fallo (estado ${state()})`);
  settle();
  cc = chargeTo(false, 0);
  f0 = releaseWith(cc, null);
  assert.ok(state() === 'end' && glow.getAttribute('data-flash') === f0, `sin _chargeEnd ni racha: sin destello (estado ${state()})`);
  settle();
  hud.destroy();
  console.log('ui-verbs (consumidor real): fallo sin racha y suelta automática → destello rojo; perfecto → dorado; esquiva → sin destello; registro viejo, de otra ranura, de otra habilidad o ninguno → manda la racha ✓');
}

// ------------------------------------------------ 2) estallidos de trampa con su sitio
{
  // a) pisada (tick de la trampa genérica): { t, x, z } con el centro de la trampa, no del héroe
  const h = verbHarness('arquera', { level: 30 });
  h.setSlot('k2', 'vx_cepo');
  h.aim(4, -1);
  h.press('k2'); h.release('k2');
  const [f] = h.g.fieldsOf(h.p, { kind: 'trampa', skill: 'vx_cepo' });
  assert.ok(f && near(f.pos.x, 4) && near(f.pos.z, -1), 'trampa colocada en la mira');
  h.enemy({ hp: 1e6, pos: [4, 0, -1] });
  const n0 = (h.p.trapBursts || []).length;
  for (let i = 0; i < 90 && (h.p.trapBursts || []).length === n0; i++) h.step(DT);
  const log = h.p.trapBursts;
  assert.equal(log.length, n0 + 1, 'un estallido registrado al pisarla');
  const b = log.at(-1);
  assert.ok(b && typeof b === 'object', 'el registro es un objeto { t, x, z }');
  assert.deepEqual(Object.keys(b).sort(), ['t', 'x', 'z']);
  assert.equal(b.t, h.p.simT, 't = p.simT del estallido');
  assert.ok(near(b.x, 4) && near(b.z, -1), `x, z = centro de la trampa (${b.x}, ${b.z})`);
  assert.ok(Math.hypot(b.x - h.p.pos.x, b.z - h.p.pos.z) > 3, 'no son los pies de la cazadora');
  assert.equal(h.g.trapBurstsWithin(h.p, 1), 1, 'trapBurstsWithin lo cuenta');

  // b) detonación (detonateField): cada mina con SU sitio
  const d = verbHarness('arquera', { level: 30 });
  d.setSlot('k2', 'vx_mina');
  for (const x of [5, 5.6, 6.2]) { d.aim(x, 0.4); d.press('k2'); d.release('k2'); d.step(0.25); }
  assert.equal(d.g.fieldsOf(d.p, { kind: 'trampa', skill: 'vx_mina' }).length, 3, 'tres minas');
  assert.equal(d.g.detonateAt(d.p, { x: 5.6, z: 0.4 }, { radius: 3, coef: 1 }), 3, 'las tres van a estallar');
  d.step(0.2);
  const pts = (d.p.trapBursts || []).filter(x => x && typeof x === 'object');
  assert.equal(pts.length, 3, 'tres estallidos con sitio');
  assert.deepEqual(pts.map(x => Math.round(x.x * 10) / 10).sort((a, c) => a - c), [5, 5.6, 6.2], 'cada uno en su mina');
  assert.ok(pts.every(x => near(x.z, 0.4)), 'z de cada mina');
  assert.equal(d.g.trapBurstsWithin(d.p, 1), 3, '3 en 1 s (la Batida lo lee)');

  // c) trapBurstsWithin acepta los dos formatos (instantes sueltos y { t, x, z }) y descarta lo raro
  const p = d.p, now = p.simT;
  p.trapBursts = [now - 2, now - 0.5, { t: now - 0.9, x: 1, z: 2 }, { t: now }, { t: now - 1.5, x: 0, z: 0 }, { x: 3, z: 3 }, null];
  assert.equal(d.g.trapBurstsWithin(p, 1), 3, 'en 1 s: el instante de −0,5 y los objetos de −0,9 y 0');
  assert.equal(d.g.trapBurstsWithin(p, 2), 5, 'en 2 s: también −2 (número) y −1,5 (objeto)');
  p.trapBursts.push({ t: null, x: 0, z: 0 }, { t: String(now) });
  assert.equal(d.g.trapBurstsWithin(p, 1e6), 5, 'sin instante numérico no cuenta, por ancha que sea la ventana (null, { x, z }, t nulo o en texto)');
  p.trapBursts = [now - 0.3, now - 0.2, now];
  assert.equal(d.g.trapBurstsWithin(p, 1), 3, 'el formato viejo (solo instantes) sigue contando');
  p.trapBursts = null;
  assert.equal(d.g.trapBurstsWithin(p, 1), 0, 'sin registro: 0');
  assert.equal(d.g.trapBurstsWithin(null, 1), 0, 'sin dueño: 0');

  // d) world-marks: el anillo de la Batida (respaldo del Coto) sale en el centro de los estallidos
  const m = verbHarness('arquera', { level: 40, spec: 'montaraz' });
  assert.equal(m.p.talentAgg?.mechanic, 'coto', 'la Montaraz lleva el Coto');
  m.setSlot('k2', 'vx_mina');
  for (const x of [5, 5.6, 6.2]) { m.aim(x, 3); m.press('k2'); m.release('k2'); m.step(0.25); }
  m.g.detonateAt(m.p, { x: 5.6, z: 3 }, { radius: 3, coef: 1 });
  m.step(0.15);
  m.g._huntAt = null;               // sin el evento del motor (cola KT): manda el respaldo del registro
  const hunt = verbMarksPlan(m.g).hunt;
  assert.ok(hunt && hunt.n === 3, 'Coto: 3 estallidos en 1 s → Batida');
  assert.ok(near(hunt.x, 5.6, 1e-6) && near(hunt.z, 3, 1e-6), `anillo en el centro de los estallidos (${hunt.x.toFixed(2)}, ${hunt.z.toFixed(2)}), no a los pies (${m.p.pos.x.toFixed(2)}, ${m.p.pos.z.toFixed(2)})`);
  console.log('Estallidos de trampa: { t, x, z } al pisar y al detonar, trapBurstsWithin con los dos formatos y anillo de la Batida en su sitio ✓');
}

// ------------------------------------------------ 3) avisos del Paragon con y sin _talentQuiet
{
  const h = makeHarness({ classId: 'guerrero', level: 100 });
  Object.assign(h.g, talentMethods);
  h.g.canRespecFree = () => !h.g._inCombat;
  const g = h.g, p = h.p;
  const since = n => h.messages().slice(n);
  const OPEN = /Paragon abierto/, PAUSE = /Paragon en pausa/;
  assert.equal(g.chooseSpec('berserker').ok, true);
  // desde el panel (_talentQuiet): la apertura vuelve en la respuesta, pero no al banner
  let n = h.messages().length;
  g._talentQuiet = true;
  const b = g.applyTalentBuild('brasa');
  g._talentQuiet = false;
  assert.ok(b.ok && b.heroOpened, 'la build abre el Paragon (r.heroOpened)');
  assert.ok(!since(n).some(m => OPEN.test(m)), 'con _talentQuiet la apertura no va a ui.message');
  assert.ok(!since(n).some(m => /Recomendado aplicado/.test(m)), 'ni el aviso de éxito (como antes)');
  // la pausa, igual
  const leaf = () => T.treeOf(p, 'spec').nodes.find(x => !x.free && (p.talents.sp.berserker[x.id] | 0) > 0 && T.canRemoveRank(p, 'spec', x.id));
  const l = leaf();
  assert.ok(l, 'un nodo de especialización que se puede quitar');
  n = h.messages().length;
  g._talentQuiet = true;
  const r = g.removeTalentRank('spec', l.id);
  g._talentQuiet = false;
  assert.ok(r.ok && r.heroPaused && r.missing === 1, 'quitar un punto pausa el Paragon (r.heroPaused, missing 1)');
  assert.ok(!since(n).some(m => PAUSE.test(m)), 'con _talentQuiet la pausa no va a ui.message');
  // sin _talentQuiet (HUD, atajos): los dos avisos al banner, como antes
  n = h.messages().length;
  assert.equal(g.addTalentRank('spec', l.id).heroOpened, true);
  assert.ok(since(n).some(m => m === '🌟 ¡Paragon abierto! Su nodo clave ya funciona: gasta tus puntos en el árbol héroe (N)'), 'sin _talentQuiet: apertura al banner');
  n = h.messages().length;
  assert.equal(g.removeTalentRank('spec', l.id).heroPaused, true);
  assert.ok(since(n).some(m => m === 'Paragon en pausa: te falta gastar 1 punto de especialización. Tus nodos del Paragon se guardan.'), 'sin _talentQuiet: pausa al banner');
  // por el envoltorio REAL del panel (ui-talents.gameTalentOps): silencio y _talentQuiet restaurado
  const ops = gameTalentOps(g);
  const q0 = g._talentQuiet;
  n = h.messages().length;
  const ro = ops.addTalentRank('spec', l.id);
  assert.ok(ro.ok && ro.heroOpened, 'panel: la apertura vuelve en la respuesta (el panel la enseña en su aviso)');
  assert.ok(!since(n).some(m => OPEN.test(m) || PAUSE.test(m)), 'panel: sin avisos del Paragon en el banner');
  const rp = ops.removeTalentRank('spec', l.id);
  assert.ok(rp.ok && rp.heroPaused, 'panel: la pausa vuelve en la respuesta');
  assert.ok(!since(n).some(m => OPEN.test(m) || PAUSE.test(m)), 'panel: tampoco la pausa');
  assert.equal(g._talentQuiet, q0, 'el envoltorio deja _talentQuiet como estaba');
  // con _talentQuiet los rechazos tampoco van al banner (igual que antes); sin él, sí
  g._inCombat = true;
  n = h.messages().length;
  assert.equal(ops.addTalentRank('spec', l.id).reason, 'combat');
  assert.equal(since(n).length, 0, 'panel en combate: el motivo vuelve en la respuesta, sin banner');
  assert.equal(g.addTalentRank('spec', l.id).reason, 'combat');
  assert.equal(since(n).length, 1, 'fuera del panel: el motivo al banner');
  g._inCombat = false;
  console.log('Paragon: con _talentQuiet (panel) apertura y pausa solo en la respuesta; sin él, al banner como antes ✓');
}

console.log('\n✅ COLA W2c (_chargeEnd · estallidos con sitio · avisos del Paragon) OK');
