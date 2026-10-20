// Paso 1B — efectos de tiempo sin setTimeout en combate (js/timers.js)
//  1) TickScheduler: orden determinista, delay 0, cancelar, limpiar, sin avance
//     sin tick (= pausa), errores aislados
//  2) DoT: se aplica COMPLETO avanzando con tick() y se detiene al morir el objetivo
//  3) DoT: una instancia por (fuente, objetivo) que se refresca sin perder daño;
//     fuentes distintas conviven
//  4) main.js ya no usa setTimeout en combate (DoT/Eco/impacto diferido)
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { TickScheduler, applyDoTInstance } from '../js/timers.js';

// ------------------------------------------------ 1) planificador
{
  const t = new TickScheduler();
  const log = [];
  t.schedule(0.5, () => log.push('b'));
  t.schedule(0.2, () => log.push('a'));
  t.schedule(0.5, () => log.push('c'));   // mismo instante que b → después (orden de alta)
  const x = t.schedule(0.3, () => log.push('X'));
  assert.equal(t.cancel(x), true);
  t.tick(0.1); assert.deepEqual(log, []);
  t.tick(0.1); assert.deepEqual(log, ['a']);
  // "pausa": sin tick no avanza nada
  assert.deepEqual(log, ['a']);
  t.tick(1);   assert.deepEqual(log, ['a', 'b', 'c']);
  // delay 0 programado durante el tick corre en el mismo tick
  t.schedule(0, () => { log.push('d'); t.schedule(0, () => log.push('e')); });
  t.tick(0); assert.deepEqual(log.slice(3), ['d', 'e']);
  // un error en una tarea no rompe las demás
  const ce = console.error; console.error = () => {};
  t.schedule(0.1, () => { throw new Error('boom'); });
  t.schedule(0.1, () => log.push('f'));
  t.tick(0.2); console.error = ce;
  assert.equal(log.at(-1), 'f');
  // clear (cambio de mundo) descarta lo pendiente
  t.schedule(1, () => log.push('nunca'));
  assert.equal(t.size, 1); t.clear(); assert.equal(t.size, 0);
  t.tick(5); assert.ok(!log.includes('nunca'));
  console.log('TickScheduler: orden determinista, cancelar, limpiar, pausa sin tick ✓');
}

// enemigo falso mínimo
const mkEnemy = (hp) => ({
  alive: true, hp, hits: [],
  takeDamage(n) { this.hits.push(n); this.hp -= n; if (this.hp <= 0) { this.hp = 0; this.alive = false; } return n; },
});

// ------------------------------------------------ 2) DoT completo / muerte
{
  const t = new TickScheduler();
  const e = mkEnemy(1000);
  applyDoTInstance(t, e, { total: 50, ticks: 5, interval: 1.0, source: 'veneno' });
  for (let i = 0; i < 60; i++) t.tick(0.1); // 6 s de simulación a 10 Hz
  assert.deepEqual(e.hits, [10, 10, 10, 10, 10], 'DoT completo: 5 tics de 10');
  assert.equal(e._dots.veneno, undefined, 'instancia cerrada al terminar');
  assert.equal(t.size, 0);

  // pausa: sin tick() no hay daño aunque pase tiempo real
  const p = mkEnemy(1000);
  applyDoTInstance(t, p, { total: 30, ticks: 3, interval: 1, source: 's' });
  assert.equal(p.hits.length, 0);
  t.tick(1.0); assert.equal(p.hits.length, 1);

  // muerte: se detiene
  const d = mkEnemy(25);
  applyDoTInstance(t, d, { total: 100, ticks: 10, interval: 0.5, source: 'sangrado' });
  for (let i = 0; i < 100; i++) t.tick(0.1);
  assert.equal(d.alive, false);
  assert.equal(d.hits.length, 3, 'tras morir no hay más tics');
  assert.equal(d._dots.sangrado, undefined);
  // muerto por otra causa entre tics: el siguiente tic no golpea
  const k = mkEnemy(500);
  applyDoTInstance(t, k, { total: 40, ticks: 4, interval: 1, source: 'q' });
  t.tick(1); k.alive = false; t.tick(5);
  assert.equal(k.hits.length, 1);
  // objetivo ya muerto o daño 0 → no crea instancia
  assert.equal(applyDoTInstance(t, { alive: false }, { total: 10, ticks: 2, interval: 1 }), null);
  assert.equal(applyDoTInstance(t, mkEnemy(9), { total: 0, ticks: 2, interval: 1 }), null);
  console.log('DoT: se aplica completo con tick(), respeta la pausa y se detiene al morir ✓');
}

// ------------------------------------------------ 3) refresco por (fuente, objetivo)
{
  const t = new TickScheduler();
  const e = mkEnemy(1e6);
  // 10 aplicaciones seguidas de la misma fuente: antes = 10 temporizadores
  for (let i = 0; i < 10; i++) { applyDoTInstance(t, e, { total: 30, ticks: 3, interval: 1, source: 'tajo:bleed' }); t.tick(0.25); }
  assert.equal(t.size, 1, 'una sola instancia viva por (fuente, objetivo)');
  for (let i = 0; i < 100; i++) t.tick(0.1);
  const total = e.hits.reduce((a, b) => a + b, 0);
  // el daño pendiente se integra al refrescar → total ≈ 10 × 30 (redondeo por tic)
  assert.ok(Math.abs(total - 300) <= 10, `daño total conservado: ${total}`);
  // fuentes distintas conviven
  const f = mkEnemy(1e6);
  applyDoTInstance(t, f, { total: 30, ticks: 3, interval: 1, source: 'a' });
  applyDoTInstance(t, f, { total: 30, ticks: 3, interval: 1, source: 'b' });
  assert.equal(t.size, 2);
  for (let i = 0; i < 50; i++) t.tick(0.1);
  assert.equal(f.hits.reduce((a, b) => a + b, 0), 60);
  console.log(`DoT: instancia única por fuente que se refresca sin perder daño (${total}/300) ✓`);
}

// ------------------------------------------------ 4) sin setTimeout en combate
{
  const dir = dirname(fileURLToPath(import.meta.url));
  const src = ['main.js', 'entities.js', 'enemy-abilities.js', 'game-zone-life.js', 'game-endgame.js']
    .map(f => readFileSync(join(dir, '..', 'js', f), 'utf8')).join('\n');
  const uses = src.split('\n').filter(l => /\bsetTimeout\s*\(/.test(l) && !/^\s*\/\//.test(l));
  assert.deepEqual(uses, [], 'setTimeout en código de simulación:\n' + uses.join('\n'));
  const main = readFileSync(join(dir, '..', 'js', 'main.js'), 'utf8');
  assert.ok(/this\.timers\.tick\(dt\)/.test(main), 'el bucle avanza el planificador con el dt de la simulación');
  assert.ok(/this\.timers\.clear\(\)/.test(main), 'loadWorld limpia el planificador');
  console.log('main/entities/mixins de combate sin setTimeout; tick(dt) y clear() cableados ✓');
}
