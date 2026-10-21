// ============================================================
// Test 82 — VERBOS del motor (Paso 2, docs/paso2-implementacion.md §3.6, §3.6.1, §3.7)
// ============================================================
// Con habilidades SINTÉTICAS (tests/fixtures/skills-verbs-sample.mjs) sobre el canal real
// (js/game-skills.js), el héroe real (js/entities.js) y el despachador real de poderes:
//  1) el fixture es válido (validateSkillDef v2) y sus chips de verbo se derivan
//  2) cargar y soltar: ventana y sonido en el borde exacto, perfecto (+% y crítico), escala,
//     esquiva/golpe/panel/blur sin coste, suelta automática + _needsRelease, forcePerfect,
//     básico tensable con repeat, otras ranuras bloqueadas, moveMul
//  3) relanzar: n, cond:'hit', perfectLast + tic, cdFrom; relanzar + cargar
//  4) combo de 3 (pasos, comboWin, preparación del 3.º, setComboStep) · secuencia (proj y arma)
//  5) canal: moveMul, autoShot, drainPerSec, endReason, toggle, extendChannel
//  6) posturas (alternar sin GCD, también durante una carga; 1 modo con dur, endOnDodge)
//  7) cargas de enfriamiento con g.reduceCooldown · repeticiones (eco) que no avanzan estado
//  8) marcas que detonan · killReset · shieldGain · réplicas · ⑭ onSkillEnd
import assert from 'node:assert/strict';
import { definePower } from '../js/powers.js';
import { validateSkillDef, normalizeSkillDef, skillVerbs, VERB_DEFAULTS } from '../js/skill-defs.js';
import { resolveSkill } from '../js/skill-resolve.js';
import { SKILL_BEHAVIORS } from '../js/powers.js';
import { VERB_SFX } from '../js/sfx.js';
import { VERB_SKILLS, verbSkill, verbHarness } from './fixtures/skills-verbs-sample.mjs';

const DT = 1 / 60;
const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;

// espía de poderes: CastInfo (onCast/afterCast), HitInfo (onHit) y ⑭ onSkillEnd
const SPY = { cast: [], after: [], hit: [], end: [], forcePerfect: false };
definePower('vx_spy', {
  name: 'espía de verbos',
  onCast(g, p, cast) { if (SPY.forcePerfect) cast.forcePerfect = true; SPY.cast.push({ ...cast }); },
  afterCast(g, p, cast, res) { SPY.after.push({ cast: { ...cast }, res: { ...res } }); },
  onHit(g, p, e, hit) { SPY.hit.push({ ...hit }); },
  onSkillEnd(g, p, sk, end) { SPY.end.push({ id: sk.id, ...end }); },
});
const spyReset = () => { SPY.cast = []; SPY.after = []; SPY.hit = []; SPY.end = []; SPY.forcePerfect = false; };
const mk = (classId = 'guerrero', opts = {}) => { spyReset(); const h = verbHarness(classId, { level: 30, powers: ['vx_spy'], ...opts }); h.p.stats.critRaw = -1000; return h; };
const dealt = e => e.maxHP - e.hp;

// ------------------------------------------------ 1) fixture
{
  for (const def of VERB_SKILLS) {
    const errs = validateSkillDef(normalizeSkillDef(def), { behaviors: SKILL_BEHAVIORS, v2: true });
    assert.deepEqual(errs, [], `${def.id} válida: ${errs.join(' · ')}`);
  }
  assert.deepEqual(skillVerbs(verbSkill('vx_celeste')), ['charge', 'recast']);
  assert.deepEqual(skillVerbs(verbSkill('vx_carrera')), ['hold']);
  assert.ok(skillVerbs(verbSkill('vx_cepo')).includes('trap') && skillVerbs(verbSkill('vx_detonante')).includes('detonate'));
  assert.ok(normalizeSkillDef(verbSkill('vx_martillo')).tags.includes('charge'), 'el tag charge se deriva');
  // un error de verbo se detecta
  const bad = validateSkillDef(normalizeSkillDef({ ...verbSkill('vx_andanada'), recast: { n: 1, win: 2 } }), { v2: true });
  assert.ok(bad.some(x => /recast\.n/.test(x)), 'recast.n < 2 es error');
  for (const n of VERB_SFX) assert.ok(typeof n === 'string' && n.startsWith('verb_'));
  console.log('Fixture de verbos válido; chips derivados ✓');
}

// ------------------------------------------------ 2) cargar y soltar
{
  // perfecto: ventana [0,9, 1,1], sonido al entrar en el borde exacto, +50 % y crítico, coste al soltar
  const h = mk();
  const e = h.enemy({ hp: 1e7, pos: [1.5, 0, 0] });
  h.aim(1.5, 0); h.setSlot('rmb', 'vx_martillo');
  const mp0 = h.p.mp;
  assert.equal(h.press('rmb'), true, 'empieza la carga');
  const t0 = h.p.simT;
  assert.equal(h.g._charging?.key, 'rmb');
  assert.equal(h.p.mp, mp0, 'el coste NO se cobra al empezar a cargar');
  assert.ok(near(h.p.moveMulProduct(), 0.5), 'cargando vas al 50 %');
  h.step(0.95);
  assert.equal(e.hp, e.maxHP, 'sin daño mientras carga');
  const win = h.g.sfxLog.filter(x => x.name === 'verb_win');
  assert.equal(win.length, 1, 'un solo «clang» al entrar en la ventana');
  assert.ok(win[0].t - t0 >= 0.9 - 1e-9 && win[0].t - t0 <= 0.9 + DT + 1e-9, `el sonido suena en el borde (0,9 s): ${(win[0].t - t0).toFixed(4)}`);
  h.release('rmb');
  assert.equal(h.g._charging?.key, 'rmb', 'la suelta se resuelve en el tick siguiente');
  h.step(DT);
  assert.ok(!h.g._charging);
  assert.equal(h.p.mp, mp0 - 20, 'al soltar se cobra el coste');
  assert.ok(h.p.cds.vx_martillo > 0, 'y empieza el enfriamiento');
  assert.ok(dealt(e) > 0, 'el golpe sale');
  assert.equal(h.sfxCount('verb_perfect'), 1, 'sonido de suelta perfecta');
  const ac = SPY.after.find(x => x.cast.sk.id === 'vx_martillo');
  assert.ok(ac.cast.perfect && ac.cast.charge.frac > 0.7 && ac.cast.charge.frac < 0.95, `CastInfo: perfect y charge.frac (${ac.cast.charge.frac})`);
  const hit = SPY.hit.find(x => x.skill === 'vx_martillo');
  assert.ok(hit.perfect && hit.crit, 'HitInfo.perfect y crítico forzado (perfectCrit)');
  assert.ok(SPY.end.some(x => x.id === 'vx_martillo' && x.kind === 'charge' && x.reason === 'release' && x.perfect && x.released), '⑭ onSkillEnd charge/release/perfect');
  assert.equal(h.p.perfectStreak, 1, 'racha de perfectos');
}
{
  // la escala del coef: soltar a 0,3 s (frac 0,1 → ×0,65) contra 0,8 s (frac 0,6 → ×1,4); fuera de la ventana
  const dmgAt = (sec) => {
    const h = mk();
    const e = h.enemy({ hp: 1e7, pos: [1.5, 0, 0] });
    h.aim(1.5, 0); h.setSlot('rmb', 'vx_martillo');
    h.p.stats.wMin = h.p.stats.wMax = 5000;       // sin varianza del arma
    h.press('rmb'); h.step(sec); h.release('rmb'); h.step(DT);
    assert.equal(h.sfxCount('verb_miss'), 1, 'suelta fuera de la ventana: sonido de fallo');
    assert.ok(!SPY.after.at(-1).cast.perfect);
    return dealt(e);
  };
  const lo = dmgAt(0.3), hi = dmgAt(0.8);
  // u = 0,3 → frac 0,1 → coef 0,65 · u = 0,8 → frac 0,6 → coef 1,4 (u se mide por frames: ±1 frame)
  assert.ok(hi / lo > 2.0 && hi / lo < 2.3, `escala lineal del coef (×${(hi / lo).toFixed(3)}, esperado ≈ 2,15)`);
  console.log('Carga: ventana y sonido en el borde, perfecto (+% y crítico), escala, coste al soltar ✓');
}
{
  // la esquiva cancela SIN coste ni enfriamiento; golpe > 10 % e interrupción; panel y blur
  const cancelBy = (how) => {
    const h = mk();
    h.enemy({ hp: 1e7, pos: [1.5, 0, 0] });
    h.aim(1.5, 0); h.setSlot('rmb', 'vx_martillo');
    const mp0 = h.p.mp;
    h.press('rmb'); h.step(0.4);
    how(h);
    assert.ok(!h.g._charging, 'la carga termina');
    h.setHeld('rmb', false);           // suelta el botón sin suelta (si no, el bucle vuelve a cargar)
    h.step(0.1);
    assert.equal(h.p.mp, mp0, 'sin coste');
    assert.equal(h.p.cds.vx_martillo || 0, 0, 'sin enfriamiento');
    assert.ok(near(h.p.moveMulProduct(), 1), 'recupera la velocidad');
    return SPY.end.find(x => x.kind === 'charge')?.reason;
  };
  assert.equal(cancelBy(h => h.p.dodge()), 'dodge');
  assert.equal(cancelBy(h => h.p.takeDamage(Math.round(h.p.stats.maxHP * 0.3), 1)), 'interrupt');
  assert.equal(cancelBy(h => h.g.cancelHeld('panel')), 'panel');
  assert.equal(cancelBy(h => h.g.cancelHeld('cancel')), 'cancel');
  console.log('Carga: esquiva, golpe > 10 %, panel y blur cancelan sin coste ✓');
}
{
  // suelta automática al máximo + _needsRelease; forcePerfect; otras ranuras bloqueadas
  const h = mk();
  const e = h.enemy({ hp: 1e7, pos: [1.5, 0, 0] });
  h.aim(1.5, 0); h.setSlot('rmb', 'vx_martillo'); h.setSlot('k2', 'vx_corazon'); h.setSlot('k1', 'vx_paso');
  h.press('rmb'); h.step(0.3);
  assert.equal(h.g.castSkillSlot('k2'), false, 'otra ranura no sale durante la carga');
  assert.ok(h.g._charging, 'y no corta la carga');
  h.step(1.0);
  assert.ok(!h.g._charging, 'suelta sola al máximo');
  assert.ok(SPY.end.some(x => x.kind === 'charge' && x.reason === 'auto' && near(x.frac, 1)), '⑭ reason auto, frac 1');
  assert.ok(dealt(e) > 0);
  assert.equal(h.g._needsRelease.rmb, true, 'hay que soltar antes de volver a cargar');
  h.p.cds.vx_martillo = 0; h.p.gcdT = 0;
  assert.equal(h.g.castSkillSlot('rmb'), false, 'mantenido tras la suelta automática: no recarga');
  h.release('rmb');
  assert.equal(h.g._needsRelease.rmb, false);
  h.p.mp = h.p.stats.maxMP;
  // la movilidad cancela la carga sin coste y sale
  h.press('rmb'); h.step(0.2);
  const mp1 = h.p.mp;
  assert.equal(h.g.castSkillSlot('k1'), true, 'la movilidad sale durante la carga');
  assert.ok(!h.g._charging, '…y la cancela');
  assert.equal(h.p.mp, mp1, 'sin cobrar la carga');
  h.release('rmb');
  // forcePerfect (Punto Débil): una suelta temprana cuenta como perfecta
  h.step(0.5); h.p.cds = {}; h.p.gcdT = 0;
  SPY.forcePerfect = true;
  h.press('rmb'); h.step(0.3); h.release('rmb'); h.step(DT);
  assert.ok(SPY.after.at(-1).cast.perfect, 'cast.forcePerfect fuerza la suelta perfecta');
  SPY.forcePerfect = false;
  console.log('Carga: suelta automática + _needsRelease, movilidad la cancela, forcePerfect, ranuras bloqueadas ✓');
}
{
  // sin autoRelease: se queda al máximo hasta soltar; la velocidad de carga de una postura
  const h = mk('arquera');
  h.enemy({ hp: 1e7, pos: [0, 0, 6] });
  h.aim(0, 6); h.setSlot('rmb', 'vx_tenso');
  h.press('rmb'); h.step(1.5);
  assert.ok(h.g._charging && near(h.g._charging.u, 0.6), 'autoRelease:false: espera al máximo');
  h.release('rmb'); h.step(DT);
  assert.ok(!h.g._charging);
  // Rodilla en Tierra: chargeSpeed +40 % (la ventana llega antes)
  h.setSlot('k2', 'vx_rodilla');
  assert.equal(h.press('k2'), true); h.release('k2');
  h.p.cds = {}; h.p.gcdT = 0;
  h.press('rmb'); h.step(0.25);
  assert.ok(near(h.g._charging.u, 0.25 * 1.4, 0.02), `postura: carga ×1,4 (${h.g._charging.u.toFixed(3)})`);
  h.release('rmb'); h.step(DT);
  console.log('Carga: autoRelease false y chargeSpeed de la postura ✓');
}
{
  // básico de arma TENSABLE (charge.repeat por defecto): mantener = fuego continuo, sin _needsRelease
  const wbCharge = { charge: { min: 0.1, max: 0.5, perfect: [0.4, 0.5], perfectCrit: true } };
  const h = mk('arquera', { forge: { a_disparo: { mejora: { name: 'Cuerda Tensa', line: 'tensa el básico', set: wbCharge } } } });
  h.p.level = 30; h.p.recompute();
  assert.ok(h.g.basicTensable(), 'el básico forjado se tensa');
  const e = h.enemy({ hp: 1e7, pos: [0, 0, 5] });
  h.aim(0, 5);
  assert.equal(h.press('lmb'), true, 'tensar empieza');
  assert.equal(h.g.projectiles.length, 0, 'sin disparar mientras tensa');
  h.step(0.5 + h.p.stats.atkTime + 0.6);
  const shots = SPY.cast.filter(c => c.weapon).length;
  assert.ok(shots >= 2, `al máximo suelta sola y vuelve a tensar (fuego continuo): ${shots}`);
  assert.ok(!h.g._needsRelease?.lmb, 'repeat: sin _needsRelease');
  h.release('lmb'); h.step(0.5);
  assert.ok(dealt(e) > 0 && SPY.hit.some(x => x.skill === 'a_disparo' && x.perfect), 'el disparo al máximo es perfecto');
  console.log('Básico tensable: repeat, fuego continuo, perfecto ✓');
}

// ------------------------------------------------ 3) relanzar
{
  const h = mk();
  const e = h.enemy({ hp: 1e7, pos: [1.5, 0, 0] });
  h.aim(1.5, 0); h.setSlot('rmb', 'vx_andanada');
  const mp0 = h.p.mp;
  assert.equal(h.press('rmb'), true); h.release('rmb');
  assert.equal(h.p.mp, mp0 - 10, 'el 1.º cuesta');
  assert.ok(near(h.p.cds.vx_andanada, 6), 'cdFrom first: el CD empieza con el 1.º');
  h.step(0.4);
  const rc = h.p.skState.vx_andanada.recast;
  assert.ok(rc && rc.left === 2 && rc.idx === 1, 'ventana abierta con 2 relanzamientos');
  assert.equal(h.press('rmb'), true, 'relanzar (con CD corriendo)'); h.release('rmb');
  assert.equal(h.p.mp, mp0 - 10, 'relanzar es gratis');
  assert.equal(SPY.cast.at(-1).recast.idx, 2);
  assert.equal(h.g.castSkillSlot('rmb'), false, 'separación mínima entre relanzamientos (gap 0,35 s)');
  // «tiempo justo»: los últimos 0,5 s de la ventana (tic sonoro) → cast.recast.perfect
  h.step(1.3);
  assert.equal(h.sfxCount('verb_tick'), 1, 'tic del tiempo justo');
  assert.equal(h.press('rmb'), true); h.release('rmb');
  assert.ok(SPY.cast.at(-1).recast.perfect, 'relanzamiento en el tiempo justo');
  assert.ok(!h.p.skState.vx_andanada.recast, 'n = 3 usos: la cadena se cierra');
  const end = SPY.end.find(x => x.kind === 'recast');
  assert.ok(end && end.reason === 'max' && end.casts === 3 && end.hits >= 3, `⑭ recast max, 3 usos (${JSON.stringify(end)})`);
  assert.ok(dealt(e) > 0);
  // caduca: timeout
  h.p.cds = {}; h.p.gcdT = 0; h.step(0.5);
  h.press('rmb'); h.release('rmb'); h.step(2.2);
  assert.ok(!h.p.skState.vx_andanada.recast);
  assert.equal(SPY.end.at(-1).reason, 'timeout', '⑭ recast timeout');
  console.log('Relanzar: n, gratis, gap, tiempo justo con tic, max/timeout ✓');
}
{
  // cond:'hit' y cdFrom:'end'
  const h = mk();
  h.aim(1.5, 0); h.setSlot('rmb', 'vx_garra');
  h.press('rmb'); h.release('rmb');
  assert.equal(h.p.skState.vx_garra?.recast || null, null, 'sin golpear no se abre la ventana');
  assert.ok(near(h.p.cds.vx_garra, 5), 'cdFrom end sin cadena: CD al instante');
  h.p.cds = {}; h.p.gcdT = 0; h.step(0.5);
  const e = h.enemy({ hp: 1e7, pos: [1, 0, 0] });
  h.press('rmb'); h.release('rmb');
  assert.ok(h.p.skState.vx_garra.recast, 'golpeando se abre');
  assert.equal(h.p.cds.vx_garra || 0, 0, 'cdFrom end: aún sin CD');
  h.step(0.4);
  h.press('rmb'); h.release('rmb');
  assert.ok(!h.p.skState.vx_garra.recast);
  assert.ok(near(h.p.cds.vx_garra, 5), 'al cerrar la cadena empieza el CD');
  assert.ok(dealt(e) > 0);
  console.log("Relanzar: cond 'hit' y cdFrom 'end' ✓");
}
{
  // relanzar + cargar: cada relanzamiento abre su propia carga y la ventana no corre mientras carga
  const h = mk('arquera');
  h.enemy({ hp: 1e7, pos: [0, 0, 8] });
  h.aim(0, 8); h.setSlot('rmb', 'vx_celeste');
  h.press('rmb'); h.step(0.7); h.release('rmb'); h.step(DT);
  const rc = h.p.skState.vx_celeste.recast;
  assert.ok(rc && rc.left === 1, 'tras la 1.ª suelta, ventana de relanzar');
  const until0 = rc.until;
  h.step(0.4);
  assert.equal(h.press('rmb'), true, 'el relanzamiento empieza una carga');
  assert.ok(h.g._charging, 'carga del relanzamiento');
  h.step(0.7);
  assert.ok(rc.until - until0 > 0.65, 'la ventana se pausa mientras cargas');
  h.release('rmb'); h.step(DT);
  assert.ok(!h.p.skState.vx_celeste.recast, 'n = 2: cadena cerrada');
  h.step(0.4);                                   // los proyectiles impactan (afterCast al terminar)
  const casts = SPY.after.filter(x => x.cast.sk.id === 'vx_celeste');
  assert.ok(casts.length === 2 && casts.every(x => x.cast.perfect) && casts[1].cast.recast.idx === 2, 'dos sueltas perfectas, la 2.ª es relanzamiento');
  console.log('Relanzar + cargar (Tiro Celestial) ✓');
}

// ------------------------------------------------ 4) combo y secuencia
{
  const h = mk();
  const e = h.enemy({ hp: 1e7, pos: [1.5, 0, 0] });
  h.aim(1.5, 0); h.setSlot('rmb', 'vx_combo');
  const steps = [];
  for (let i = 0; i < 3; i++) {
    assert.equal(h.press('rmb'), true, `paso ${i + 1}`); h.release('rmb');
    steps.push(SPY.cast.at(-1).step);
    if (i === 2) {
      assert.ok(h.g._windup, 'el 3.º prepara (windup 0,3 s)');
      const before = dealt(e);
      h.step(0.2);
      assert.equal(dealt(e), before, 'aún preparando');
    }
    h.step(0.45);
  }
  assert.deepEqual(steps, [1, 2, 3]);
  assert.ok(SPY.hit.some(x => x.skill === 'vx_combo' && x.step === 3), 'HitInfo.step');
  assert.ok(SPY.end.some(x => x.kind === 'combo' && x.reason === 'done'), '⑭ combo done');
  assert.equal(h.p.skState.vx_combo.combo.idx, 0, 'vuelve al 1.º');
  // comboWin: si pasa la ventana, vuelve al 1.º
  h.press('rmb'); h.release('rmb'); h.step(VERB_DEFAULTS.comboWin + 0.2);
  h.press('rmb'); h.release('rmb');
  assert.equal(SPY.cast.at(-1).step, 1, 'ventana caducada: paso 1');
  assert.ok(SPY.end.some(x => x.kind === 'combo' && x.reason === 'timeout'));
  // setComboStep (Caída Brutal salta al 3.º) y su pip
  h.step(0.5);
  const pips = h.sfxCount('verb_pip');
  h.g.setComboStep(h.p, 'vx_combo', 3);
  assert.equal(h.sfxCount('verb_pip'), pips + 1, 'pip: el último paso queda listo');
  h.press('rmb'); h.release('rmb');
  assert.equal(SPY.cast.at(-1).step, 3);
  console.log('Combo de 3: pasos, preparación del 3.º, comboWin, setComboStep ✓');
}
{
  // secuencia en una principal de proyectil: el 3.º dispara 1 + 2 flechas
  const h = mk('arquera');
  h.enemy({ hp: 1e7, pos: [0, 0, 9] });
  h.aim(0, 9); h.setSlot('rmb', 'vx_tercera');
  const counts = [];
  for (let i = 0; i < 3; i++) {
    const n0 = h.g.projectiles.length;
    h.press('rmb'); h.release('rmb');
    counts.push(h.g.projectiles.length - n0);
    h.step(0.3);
  }
  assert.deepEqual(counts, [1, 1, 3], 'el N-ésimo añade los extra');
  assert.deepEqual(SPY.cast.map(c => c.seqNth), [false, false, true], 'CastInfo.seqNth');
  // setSeqCount: el siguiente es el especial
  h.g.setSeqCount(h.p, 'vx_tercera', 2);
  const n0 = h.g.projectiles.length;
  h.press('rmb'); h.release('rmb');
  assert.equal(h.g.projectiles.length - n0, 3, 'setSeqCount adelanta el especial');
  // en el básico de ARMA (forja: Tercera Flecha del disparo)
  const w = mk('arquera', { forge: { a_disparo: { mejora: { name: 'Tercera', line: 'x', set: { seq: { every: 3, extra: { count: 2, spread: 0.3, coef: 0.6 } } } } } } });
  w.enemy({ hp: 1e7, pos: [0, 0, 6] });
  w.aim(0, 6);
  const wc = [];
  for (let i = 0; i < 3; i++) {
    const m0 = w.g.projectiles.length;
    w.p.atkCd = 0; w.p.basicAt = null;
    w.g.castBasic();
    wc.push(w.g.projectiles.length - m0);
  }
  assert.deepEqual(wc, [1, 1, 3], 'seq en el básico de arma');
  console.log('Secuencia: proyectil y arma, setSeqCount ✓');
}

// ------------------------------------------------ 5) canal ampliado
{
  const h = mk('arquera');
  const e = h.enemy({ hp: 1e7, pos: [0, 0, 6] });
  h.aim(0, 6); h.setSlot('rmb', 'vx_carrera');
  h.p.mp = 60;
  assert.equal(h.press('rmb'), true);
  assert.ok(near(h.p.moveMulProduct(), 1.4), 'canal: moveMul 1,4');
  h.step(1.0);
  assert.ok(h.g._channel, 'endless: sigue mientras mantienes');
  const shots = h.g.projectiles.length + (dealt(e) > 0 ? 1 : 0);
  assert.ok(shots >= 2, `autoShot cada 0,4 s (${shots})`);
  assert.ok(h.p.mp < 60 && h.p.mp > 45, `drena 10/s (${h.p.mp.toFixed(1)})`);
  h.release('rmb');
  assert.ok(!h.g._channel, 'soltar termina');
  const end = SPY.end.find(x => x.kind === 'channel');
  assert.ok(end.reason === 'release' && end.released, '⑭ channel release');
  assert.equal(SPY.after.at(-1).cast.endReason, 'release', 'CastInfo.endReason');
  assert.ok(near(h.p.moveMulProduct(), 1), 'recupera la velocidad');
  // drenaje: sin recurso termina con 'drain'
  h.p.cds = {}; h.p.mp = 3;                      // drena 10/s y la Energía regenera 6/s: ≈ 1 s
  h.press('rmb'); h.step(1.5);
  assert.ok(!h.g._channel, 'sin recurso termina');
  assert.equal(SPY.end.at(-1).reason, 'drain');
  assert.ok(h.g._needsRelease.rmb, 'tras drenarse hay que soltar para volver a canalizar');
  h.release('rmb');
  console.log('Canal: moveMul, autoShot, drainPerSec, endReason ✓');
}
{
  // toggle: la 1.ª pulsación empieza, la 2.ª suelta (sin mantener) · extendChannel
  const h = mk('maga');
  h.enemy({ hp: 1e7, pos: [0, 0, 5] });
  h.aim(0, 5); h.setSlot('k2', 'vx_rayo');
  h.press('k2'); h.release('k2');
  h.step(0.5);
  assert.ok(h.g._channel?.toggle, 'enganchado sin mantener');
  assert.ok(h.g.extendChannel(h.p, 1), 'extendChannel');
  h.step(2.0);
  assert.ok(h.g._channel, 'alargado 1 s: aún canaliza a los 2,5 s');
  h.press('k2'); h.release('k2');
  assert.ok(!h.g._channel, 'la 2.ª pulsación lo suelta');
  assert.equal(SPY.end.at(-1).reason, 'release');
  // holdMode toggle en ajustes: también para las cargas
  const t = mk();
  t.g.settings.holdMode = 'toggle';
  t.enemy({ hp: 1e7, pos: [1.5, 0, 0] });
  t.aim(1.5, 0); t.setSlot('rmb', 'vx_martillo');
  t.press('rmb'); t.release('rmb'); t.step(0.95);
  assert.ok(t.g._charging, 'toggle: la carga sigue sin mantener');
  t.press('rmb'); t.release('rmb'); t.step(DT);
  assert.ok(!t.g._charging, '2.ª pulsación: suelta');
  assert.ok(SPY.after.at(-1).cast.perfect);
  console.log('Canal y carga enganchables (toggle) · extendChannel ✓');
}

// ------------------------------------------------ 6) posturas
{
  const h = mk();
  h.setSlot('k2', 'vx_guardia');
  const dr0 = h.p.verbStats().dr || 0;
  assert.equal(h.press('k2'), true); h.release('k2');
  assert.equal(h.g.stanceOf(h.p, 'vx_guardia'), 'escudo');
  assert.equal(h.p.verbStats().dr, dr0 + 20, 'stats del modo sin recompute');
  assert.ok(near(h.p.moveMulProduct(), 0.8), 'moveMul del modo');
  assert.equal(h.sfxCount('verb_stance'), 1);
  h.step(1.1);
  h.press('k2'); h.release('k2');
  assert.equal(h.g.stanceOf(h.p, 'vx_guardia'), 'espada', 'alternar');
  assert.ok(!(h.p.verbStats().dr > 0) && h.p.verbStats().dmgPct === 25);
  assert.ok(near(h.p.cds.vx_guardia, 1), 'swapCd 1 s');
  assert.equal(SPY.cast.at(-1).stance, 'espada'); assert.equal(SPY.cast.at(-1).stanceFrom, 'escudo');
  // las dos a la vez (Guardia Total)
  h.g.setStanceBoth(h.p, 'vx_guardia', 2);
  assert.ok(h.p.verbStats().dr === 20 && h.p.verbStats().dmgPct === 25, 'Guardia Total: los dos modos');
  h.step(2.1);
  assert.ok(!(h.p.verbStats().dr > 0), 'acaba Guardia Total');
  // alternar DURANTE una carga (swapGcd 0) sin cortarla
  h.aim(1.5, 0); h.setSlot('rmb', 'vx_martillo');
  h.p.cds = {};
  h.press('rmb'); h.step(0.2);
  assert.equal(h.g.castSkillSlot('k2'), true, 'la postura se alterna durante la carga');
  assert.ok(h.g._charging, 'sin cortar la carga');
  h.release('rmb'); h.step(DT);
  // 1 modo con duración: endOnDodge y recastEnds
  const r = mk();
  r.setSlot('k2', 'vx_rodilla');
  r.press('k2'); r.release('k2');
  assert.equal(r.g.stanceOf(r.p, 'vx_rodilla'), 'rodilla');
  r.p.dodge(); r.step(0.1);
  assert.equal(r.g.stanceOf(r.p, 'vx_rodilla'), null, 'endOnDodge');
  assert.equal(SPY.end.at(-1).reason, 'dodge');
  r.p.cds = {}; r.p.dodgeT = 0; r.step(0.5);
  r.press('k2'); r.release('k2'); r.step(0.5);
  r.press('k2'); r.release('k2');
  assert.equal(r.g.stanceOf(r.p, 'vx_rodilla'), null, 'recastEnds: la vuelves a pulsar y acaba');
  r.p.cds = {}; r.step(0.5);
  r.press('k2'); r.release('k2'); r.step(8.1);
  assert.equal(r.g.stanceOf(r.p, 'vx_rodilla'), null, 'dur 8 s');
  assert.equal(SPY.end.at(-1).reason, 'end');
  console.log('Posturas: alternar, Guardia Total, durante una carga, endOnDodge, recastEnds, dur ✓');
}

// ------------------------------------------------ 7) cargas de enfriamiento y repeticiones
{
  const h = mk();
  h.setSlot('k1', 'vx_paso');
  h.aim(3, 0);
  for (let i = 0; i < 3; i++) { assert.equal(h.press('k1'), true, `carga ${i + 1}`); h.release('k1'); h.step(0.05); }
  assert.equal(h.p.skCharges.vx_paso.n, 0);
  assert.equal(h.g.castSkillSlot('k1'), false, 'sin cargas');
  assert.ok(h.p.cds.vx_paso > 5.5, 'p.cds muestra el tiempo a la siguiente carga');
  h.g.reduceCooldown(h.p, 'vx_paso', 5);
  assert.equal(h.g.castSkillSlot('k1'), false, 'aún falta ~0,85 s');
  h.step(1.0);
  assert.equal(h.press('k1'), true, 'reduceCooldown adelantó la siguiente carga'); h.release('k1');
  assert.equal(h.p.skCharges.vx_paso.n, 0);
  h.g.reduceCooldown(h.p, 'vx_paso', Infinity);
  assert.equal(h.p.skCharges.vx_paso.n, 1, 'reinicio: devuelve UNA carga');
  console.log('Cargas de enfriamiento: p.skCharges, reduceCooldown ✓');
}
{
  // repeticiones (Eco): no consumen cargas ni relanzamientos, no avanzan combo ni secuencia;
  // tope de 3 por lanzamiento original; una carga repetida sale a frac 1
  const h = mk();
  const e = h.enemy({ hp: 1e7, pos: [1.5, 0, 0] });
  h.aim(1.5, 0); h.setSlot('rmb', 'vx_combo');
  h.press('rmb'); h.release('rmb');
  assert.equal(h.g.castSkillSlot('rmb', 0.5), true, 'repetición');
  assert.equal(h.p.skState.vx_combo.combo.idx, 1, 'la repetición no avanza el combo');
  assert.equal(SPY.cast.length, 1, 'la repetición no pasa por ⑦ onCast');
  assert.ok(h.g.castSkillSlot('rmb', 0.5) && h.g.castSkillSlot('rmb', 0.5), '3 repeticiones');
  assert.equal(h.g.castSkillSlot('rmb', 0.5), false, 'tope de 3 por lanzamiento');
  assert.ok(SPY.hit.some(x => x.echo), 'HitInfo.echo');
  // carga repetida: instantánea a carga completa, sin cobrar
  h.setSlot('k2', 'vx_martillo');
  const mp0 = h.p.mp;
  assert.equal(h.g.castSkillSlot('k2', 0.5), true);
  assert.ok(!h.g._charging, 'una repetición no carga');
  assert.equal(h.p.mp, mp0, 'ni cobra');
  assert.ok(dealt(e) > 0);
  // relanzar: la repetición no consume relanzamientos
  h.setSlot('k2', 'vx_andanada'); h.step(0.5); h.p.gcdT = 0;
  h.press('k2'); h.release('k2');
  const left = h.p.skState.vx_andanada.recast.left;
  h.g.castSkillSlot('k2', 0.5);
  assert.equal(h.p.skState.vx_andanada.recast.left, left, 'no consume relanzamientos');
  console.log('Repeticiones: sin estado, tope 3, carga a frac 1 sin coste ✓');
}

// ------------------------------------------------ 8) marcas, killReset, shieldGain, réplicas
{
  const h = mk();
  const e = h.enemy({ hp: 1e7, pos: [2, 0, 0] });
  h.aim(2, 0); h.setSlot('k2', 'vx_sentencia'); h.setSlot('rmb', 'vx_corazon');
  h.p.stats.wMin = h.p.stats.wMax = 5000;         // golpes grandes y sin varianza: la razón se lee limpia
  assert.equal(h.press('k2'), true); h.release('k2');
  assert.equal(h.g.marksOf(e).length, 1, 'marca puesta');
  assert.equal(e.weaknessPct(), 10, 'Debilidad de la marca');
  h.step(0.3);
  h.press('rmb'); h.release('rmb');
  const det = SPY.hit.find(x => x.skill === 'vx_corazon');
  assert.ok(det?.detonated, 'la principal la detona (HitInfo.detonated)');
  assert.equal(h.g.marksOf(e).length, 0, '1 uso: se consume');
  const d1 = dealt(e);
  h.step(0.3);
  h.press('rmb'); h.release('rmb');
  const d2 = dealt(e) - d1;
  assert.ok(!SPY.hit.filter(x => x.skill === 'vx_corazon').at(-1).detonated, 'sin marca no detona');
  assert.ok(d1 / d2 > 1.25 && d1 / d2 < 1.45, `la detonación suma +40 % al saco aditivo (${d1} vs ${d2})`);
  console.log('Marca: Debilidad, detonación por selector, usos ✓');
}
{
  // killReset: matar devuelve el enfriamiento · shieldGain: escudo por enemigo golpeado (tope)
  const h = mk();
  h.aim(1.5, 0); h.setSlot('rmb', 'vx_verdugo'); h.setSlot('k2', 'vx_corazon');
  h.enemy({ hp: 1, pos: [1.5, 0, 0] });
  h.press('rmb'); h.release('rmb');
  assert.equal(h.p.cds.vx_verdugo || 0, 0, 'killReset');
  h.step(0.3);
  h.enemy({ hp: 1e7, pos: [1.5, 0, 0] });
  h.press('rmb'); h.release('rmb');
  assert.ok(h.p.cds.vx_verdugo > 7, 'sin matar: enfriamiento normal');
  h.step(0.3);
  for (let i = 0; i < 6; i++) h.enemy({ hp: 1e7, pos: [1 + i * 0.3, 0, 0.5] });
  const sh0 = h.p.shieldTotal();
  h.press('k2'); h.release('k2');
  const sh = h.p.shieldTotal() - sh0;
  assert.ok(near(sh, h.p.stats.maxHP * 0.20, 1.5), `shieldGain 5 %/enemigo con tope 20 % (${sh})`);
  console.log('killReset y shieldGain ✓');
}
{
  // réplicas (needPlanted): solo plantado; una réplica es un eco (HitInfo.repeat)
  const h = mk();
  const e = h.enemy({ hp: 1e7, pos: [1.5, 0, 0] });
  h.setSlot('rmb', 'vx_terremoto');
  h.walk({ x: -1, z: 0 }, 0.2);
  h.press('rmb'); h.release('rmb'); h.step(1.2);
  assert.ok(!SPY.hit.some(x => x.repeat), 'sin plantar no hay réplicas');
  h.stand(1.1);
  assert.ok(h.p.planted, 'plantado tras 1 s quieto');
  h.p.cds = {}; h.p.gcdT = 0;
  h.press('rmb'); h.release('rmb');
  const n0 = SPY.hit.length;
  h.step(1.2);
  const reps = SPY.hit.slice(n0).filter(x => x.skill === 'vx_terremoto' && x.repeat);
  assert.deepEqual(reps.map(x => x.repeat), [1, 2], 'dos réplicas (repeat 1, 2)');
  assert.ok(reps.every(x => x.echo));
  assert.ok(dealt(e) > 0);
  console.log('Réplicas: needPlanted, HitInfo.repeat ✓');
}
{
  // la definición FORJADA manda en el canal: una variante que convierte la principal en carga
  const forge = { vx_corazon: { mejora: null, vars: [
    { id: 'vx_corazon_i', name: 'Gélido', role: 'UNI', line: 'se carga', set: { charge: { min: 0.1, max: 0.5, perfect: [0.4, 0.5] } } },
    { id: 'vx_corazon_ii', name: 'Ráfaga', role: 'AREA', line: 'más radio', mul: { radius: 1.5 } }] } };
  const h = mk('guerrero', { forge });
  h.p.skillForge = { vx_corazon: 'i' }; h.p.recompute();
  h.enemy({ hp: 1e7, pos: [1.5, 0, 0] });
  h.aim(1.5, 0); h.setSlot('rmb', 'vx_corazon');
  h.press('rmb');
  assert.ok(h.g._charging, 'la variante convierte la habilidad en carga');
  h.release('rmb'); h.step(DT);
  assert.ok(near(resolveSkill(h.p, h.p.cls.skills.find(s => s.id === 'vx_corazon')).radius, 4), 'variante i: radio base');
  console.log('El canal lee la definición forjada ✓');
}

// ------------------------------------------------ 9) claves resueltas (docs/paso2-claves-w2.md)
{
  // chainPct (Rayo en Cadena): cada salto hace el 70 % del golpe base (no −25 % compuesto)
  const h = mk('maga');
  h.p.stats.wMin = h.p.stats.wMax = 1000;
  h.enemy({ hp: 1e7, pos: [3, 0, 0] });
  for (const z of [2, 4, 6]) h.enemy({ hp: 1e7, pos: [3, 0, z] });
  h.aim(6, 0); h.setSlot('rmb', 'vx_rayo_cadena');
  const prof = resolveSkill(h.p, h.p.cls.skills.find(s => s.id === 'vx_rayo_cadena'));
  h.press('rmb'); h.release('rmb');
  const jumps = h.g.projectiles.filter(x => x.dmg > 0);
  const want = Math.round(Math.round(h.p.avgHit(prof.coef, prof.addPct)) * 0.7);
  assert.equal(jumps.length, 3, 'salta a 3');
  assert.ok(jumps.every(x => x.dmg === want), `cada salto al 70 % del golpe (${jumps.map(x => x.dmg)} vs ${want})`);
}
{
  // impacts + scatter (Lluvia de Meteoritos): 3 impactos repartidos a 0,6 × scatter del centro
  const h = mk('maga');
  h.setSlot('rmb', 'vx_meteoritos');
  h.aim(6, 0);
  const r = 0.6 * 2.5;
  const ring = [0, 1, 2].map(i => { const a = Math.PI / 2 + i * 2 * Math.PI / 3; return h.enemy({ hp: 1e7, pos: [6 + Math.sin(a) * r, 0, Math.cos(a) * r] }); });
  const mid = h.enemy({ hp: 1e7, pos: [6, 0, 0] });
  h.press('rmb'); h.release('rmb');
  assert.ok(ring.every(e => e.hp < 1e7), 'cada impacto alcanza su punto del anillo');
  assert.equal(mid.hp, 1e7, 'el centro queda entre impactos (radio 1)');
}
{
  // dmg3 → mul { 'steps.2.coef' } (Estocada Final: el 3.er paso del combo +40 %)
  const forge = { vx_combo: { mejora: { name: 'Estocada Final', line: 'x', mul: { 'steps.2.coef': 1.4 } }, vars: [] } };
  const h = mk('guerrero', { forge });
  const sk = h.p.cls.skills.find(s => s.id === 'vx_combo');
  const prof = resolveSkill(h.p, sk);
  assert.ok(Math.abs(prof.def.steps[2].coef - 2.8) < 1e-9 && prof.def.steps[0].coef === 1, 'solo el 3.er paso');
  const c3 = h.g._makeCtx(h.p, sk, prof, 'rmb', { sk, prof }, { target: h.p.pos.clone(), near: null, isEcho: false, echoMult: 0, comboIdx: 2 });
  assert.ok(Math.abs(c3.coef - prof.coef * 2.8) < 1e-9, 'el paso 3 lanza con su coef forjado');
  console.log('Claves resueltas: chainPct, impacts + scatter, dmg3 → steps.2.coef ✓');
}

// ------------------------------------------------ 10) otros verbos: carga completa, perTarget, cdOnEnd/cdFloor, onda,
// cura/escudo al lanzar, señuelo, pulsos
{
  const extra = [
    { id: 'vx_x_saetas', name: 'Tres Saetas', cat: 'spender', tags: ['spender', 'proj', 'physical'], type: 'proj', coef: 1, cost: 0, cd: 0, range: 12, speed: 30,
      charge: { min: 0.1, max: 0.5, perfect: [0.4, 0.5], full: { count: 3, spread: 0.3, coefMul: 0.8 } } },
    { id: 'vx_x_cerrada', name: 'Andanada Cerrada', cat: 'spender', tags: ['spender', 'proj', 'physical'], type: 'proj', coef: 1, cost: 0, cd: 0, range: 12, speed: 30, spread: 0.05, perTarget: 2 },
    { id: 'vx_x_abierta', name: 'Andanada', cat: 'spender', tags: ['spender', 'proj', 'physical'], type: 'proj', coef: 1, cost: 0, cd: 0, range: 12, speed: 30, spread: 0.05 },
    { id: 'vx_x_piel', name: 'Piel de Hierro', cat: 'defense', tags: ['defense', 'buff', 'physical'], type: 'buff', cd: 5, dur: 3, buff: { dr: 10 }, cdOnEnd: true },
    { id: 'vx_x_ulti', name: 'Definitiva', cat: 'ultimate', tags: ['ultimate', 'area', 'physical'], type: 'area', at: 'self', coef: 1, cd: 10, radius: 3, cdFloor: 0.5 },
    { id: 'vx_x_onda', name: 'Onda Sagrada', cat: 'spender', tags: ['spender', 'melee', 'holy'], elem: 'holy', type: 'melee', coef: 1, cost: 0, cd: 0, range: 2.5, wave: { range: 6, width: 1.5, coef: 0.5 } },
    { id: 'vx_x_amanecer', name: 'Amanecer', cat: 'defense', tags: ['defense', 'buff', 'heal', 'shield', 'holy'], elem: 'holy', type: 'buff', cd: 0, dur: 2, buff: { dr: 5 },
      heal: { pct: 10, radius: 8 }, shield: { pct: 10, radius: 8, dur: 4 } },
    { id: 'vx_x_senuelo', name: 'Señuelo de Zarzas', cat: 'utility', tags: ['utility', 'area', 'nature'], elem: 'nature', type: 'area', at: 'target', coef: 0.1, cd: 0, range: 12, radius: 1,
      lure: { radius: 8, dur: 4, speedMul: 1 } },
  ];
  // carga completa (charge.full): otra cuenta de proyectiles
  let h = mk('arquera', { skills: extra });
  h.enemy({ hp: 1e7, pos: [0, 0, 8] });
  h.aim(0, 8); h.setSlot('rmb', 'vx_x_saetas');
  h.press('rmb'); h.step(0.6); h.release('rmb');
  const full = h.g.projectiles.length;
  h.step(1);
  h.press('rmb'); h.step(0.2); h.release('rmb'); h.step(DT);
  assert.ok(full === 3 && h.g.projectiles.length === 1, `carga completa: 3 saetas; a medias: 1 (${full}, ${h.g.projectiles.length})`);
  // perTarget: con +1 proyectil (Vendaval), la Andanada normal da 1 vez al mismo enemigo y la Cerrada 2
  const hitsOn = (id) => {
    const k = mk('arquera', { skills: extra, powers: ['vx_spy', 'multidisparo'] });
    const e = k.enemy({ hp: 1e7, pos: [0, 0, 3] });    // abanico estrecho (0,05 rad): los dos le llegan
    k.aim(0, 6); k.setSlot('rmb', id);
    k.press('rmb'); k.release('rmb'); k.step(0.6);
    return SPY.hit.filter(x => x.skill === id).length + (dealt(e) > 0 ? 0 : -99);
  };
  assert.equal(hitsOn('vx_x_abierta'), 1, 'sin perTarget: un impacto por enemigo y lanzamiento');
  assert.equal(hitsOn('vx_x_cerrada'), 2, 'perTarget 2: los dos proyectiles al mismo enemigo');
  // cdOnEnd: el enfriamiento corre al acabar el efecto (las reducciones no cuentan mientras dura)
  h = mk('guerrero', { skills: extra });
  h.setSlot('k2', 'vx_x_piel');
  h.press('k2'); h.release('k2');
  assert.ok(near(h.p.cds.vx_x_piel, 8), 'cdOnEnd: 3 s de efecto + 5 s');
  assert.equal(h.g.reduceCooldown(h.p, 'vx_x_piel', 2), 0, 'durante el efecto no se reduce');
  h.step(3.1);
  assert.ok(h.g.reduceCooldown(h.p, 'vx_x_piel', 2) > 1.9, 'acabado el efecto, sí');
  // cdFloor: ninguna reducción baja la recarga de la definitiva de su 50 %
  h.setSlot('k4', 'vx_x_ulti');
  h.press('k4'); h.release('k4');
  for (let i = 0; i < 5; i++) h.g.reduceCooldown(h.p, 'vx_x_ulti', 2);
  assert.ok(near(h.p.cds.vx_x_ulti, 5, 1e-6), `cdFloor 0,5: como mucho −5 s de 10 (${h.p.cds.vx_x_ulti})`);
  h.g.reduceCooldown(h.p, 'vx_x_ulti', Infinity);
  assert.equal(h.p.cds.vx_x_ulti, 0, 'un reinicio explícito sí');
  // onda tras el golpe: alcanza en línea más allá del cuerpo a cuerpo
  h = mk('guerrero', { skills: extra });
  const near1 = h.enemy({ hp: 1e7, pos: [1.5, 0, 0] }), far1 = h.enemy({ hp: 1e7, pos: [5, 0, 0] }), off1 = h.enemy({ hp: 1e7, pos: [5, 0, 3] });
  h.aim(6, 0); h.setSlot('rmb', 'vx_x_onda');
  h.press('rmb'); h.release('rmb');
  assert.ok(dealt(near1) > 0 && dealt(far1) > 0 && dealt(off1) === 0, 'onda: golpe + línea hacia la mira');
  // cura y escudo al grupo al lanzar
  h.setSlot('k2', 'vx_x_amanecer'); h.step(0.25);   // GCD de la onda
  h.p.hp = h.p.stats.maxHP * 0.5;
  const hp0 = h.p.hp, sh0 = h.p.shieldTotal();
  assert.equal(h.press('k2'), true); h.release('k2');
  assert.ok(h.p.hp - hp0 >= h.p.stats.maxHP * 0.1 - 1 && h.p.shieldTotal() - sh0 >= h.p.stats.maxHP * 0.1 - 1, 'heal y shield al lanzar (≥ 10 %)');
  // señuelo: campo que atrae
  h.setSlot('k2', 'vx_x_senuelo'); h.step(0.3);
  h.aim(8, 0); h.press('k2'); h.release('k2');
  const [s] = h.g.fieldsOf(h.p, { kind: 'senuelo' });
  assert.ok(s && h.g._moveFields > 0, 'campo señuelo');
  const lured = h.enemy({ hp: 1e7, pos: [8, 0, 5] });
  const z0 = lured.pos.z;
  for (let i = 0; i < 30; i++) h.g.lureStep(lured, DT);
  assert.ok(lured.pos.z < z0 - 0.3, 'el señuelo atrae');
  // pulsos (Ciudadela): provoca cada 1 s a los del radio mientras dura el buff
  h = mk('guerrero');
  const inR = h.enemy({ hp: 1e7, pos: [4, 0, 0] }), outR = h.enemy({ hp: 1e7, pos: [9, 0, 0] });
  h.setSlot('k2', 'vx_ciudadela');
  h.press('k2'); h.release('k2');
  assert.ok(!(inR.tauntT > 0), 'el pulso llega a cada segundo');
  h.step(1.05);
  assert.ok(inR.tauntT > 0 && !(outR.tauntT > 0), 'pulso: provoca a los del radio');
  h.step(4);
  inR.tauntT = 0; h.step(1.1);
  assert.ok(!(inR.tauntT > 0), 'acabado el buff, no hay más pulsos');
  console.log('Carga completa, perTarget, cdOnEnd, cdFloor, onda, cura/escudo, señuelo y pulsos ✓');
}

console.log('\n✅ VERBOS (carga · relanzar · combo · secuencia · canal · postura · cargas · ecos · marcas) OK');
