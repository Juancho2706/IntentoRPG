// Paso 2b.0 — dos reglas de sustento y daño (§5.3, §6.1)
//  1) saco DEBILIDAD único en el objetivo: Vulnerable (+20) + debilitamientos por
//     fuente (aditivos, uno por id), TOPE ×1,5 (no hay un segundo multiplicador)
//  2) cubeta de SUSTENTO compartida (6 % de la vida máx./s): robo de vida, vida al
//     golpear, curas al matar (Festín) — no escala con healPct
//  3) curación de HABILIDAD: escala con healPct, tope +50 % (CAPS.heal); escudos
//  4) restauraciones (onLethal / setHp) y control centralizado con rendimientos
//     decrecientes por canal (duro / inmovilizar)
import assert from 'node:assert/strict';
import * as CM from '../js/combat-math.js';
import { makeHarness } from './helpers/power-harness.mjs';
import { POWER_HOOKS } from '../js/powers.js';
import { LEGENDARY_POWERS } from '../js/items.js';
import { PARAGON_BOARDS } from '../js/paragon-board.js';

const approx = (a, b, e = 1e-6) => Math.abs(a - b) <= e;

// ------------------------------------------------ 1) Debilidad
assert.ok(approx(CM.weaknessMult(0, 0), 1));
assert.ok(approx(CM.weaknessMult(CM.VULN_PCT, 0), 1.2), 'Vulnerable solo = ×1,2 (como el Paso 1A)');
assert.ok(approx(CM.weaknessMult(20, 20 + 15), CM.WEAKNESS_CAP), 'V 20 + Espinas 20 + Zarzas 15 = 55 → tope ×1,5');
assert.equal(CM.WEAKNESS_CAP, 1.5);
{
  const h = makeHarness({ classId: 'guerrero', level: 10 });
  const e = h.enemy({ hp: 1e7 });
  assert.equal(e.takeDamage(1000, false, { proc: true }), 1000, 'sin debilidad');
  e.applyWeakness('espinas', 10, 5);
  assert.equal(e.takeDamage(1000, false, { proc: true }), 1100, 'un debilitamiento suma al saco');
  e.applyWeakness('espinas', 10, 5);
  assert.equal(e.takeDamage(1000, false, { proc: true }), 1100, 'la misma fuente se refresca, no apila');
  e.applyWeakness('sentencia', 20, 5);
  assert.equal(e.takeDamage(1000, false, { proc: true }), 1300, 'fuentes distintas se suman (aditivo)');
  e.vulnT = 3;
  e.applyWeakness('zarzas', 15, 5);
  assert.equal(e.takeDamage(1000, false, { proc: true }), 1500, 'Vulnerable + 45 → tope ×1,5 (no ×1,65)');
  h.step(6);
  assert.equal(e.weaknessPct(), 0, 'los debilitamientos caducan');
  console.log('Saco Debilidad: Vulnerable + debilitamientos por fuente, tope ×1,5 ✓');
}

// ------------------------------------------------ 2) cubeta de sustento compartida
// Paso 2g: Festín ya no sale del tablero de glifos (sus legendarios solo dan estadísticas);
// sigue registrado porque lo dan el equipo (afijo legendario y el Núcleo del Rey Gélido)
assert.ok(POWER_HOOKS.festin, 'festin sigue registrado');
assert.ok(LEGENDARY_POWERS.some(x => x.id === 'festin'), 'festin sigue siendo un poder de equipo');
for (const [cid, board] of Object.entries(PARAGON_BOARDS)) assert.ok(board.every(n => !n.power), `${cid}: ningún nodo del tablero concede poderes`);
{
  const h = makeHarness({ classId: 'guerrero', level: 30, powers: ['festin'] });
  const p = h.p, max = p.stats.maxHP, cap = CM.SUSTAIN_CAP_PER_SEC * max;
  p.hp = 1;
  // mismo instante: robo de vida + vida al golpear + Festín → nunca más de la cubeta
  p.leech(max);
  p.equipment.helm = { kind: 'item', slot: 'helm', affixes: { lph: 50 }, quality: 0 }; p.recompute();
  p.onDealHit();
  const e = h.enemy({ hp: 10 });
  e.takeDamage(1e6, false, { proc: true });                    // muere → ⑥ onKill → Festín
  assert.ok(h.g.kills.length === 1, 'la muerte pasó por onKill');
  assert.ok(approx(h.sustained(), cap), `todas las fuentes comparten la cubeta (${h.sustained()} vs ${cap})`);
  assert.ok(approx(p.hp, 1 + cap));
  // con el tiempo, nunca más de 6 %/s (más la capacidad inicial de 1 s)
  for (let i = 0; i < 30; i++) { p.leech(max); p.onDealHit(); h.tick(0.1); }
  const T = 3.0;
  assert.ok(h.sustained() <= cap * (1 + T) + 1e-6, `tope por segundo respetado: ${h.sustained()} ≤ ${cap * (1 + T)}`);
  // el sustento NO escala con healPct
  const s0 = h.sustained();
  p.equipment.amulet = { kind: 'item', slot: 'amulet', affixes: { healPct: 40 }, quality: 0 }; p.recompute();
  h.tick(1.0); p.hp = 1;
  const healed = p.sustain(max, 'test');
  assert.ok(healed <= cap + 1e-6, 'healPct no infla el sustento');
  void s0;
  console.log('Cubeta de sustento compartida (robo, vida al golpear, Festín): 6 %/s ✓');
}

// ------------------------------------------------ 3) curación de habilidad y escudos
{
  const h = makeHarness({ classId: 'guerrero', level: 30 });
  const p = h.p;
  p.equipment.amulet = { kind: 'item', slot: 'amulet', affixes: { healPct: 80 }, quality: 0 }; p.recompute();
  assert.equal(p.stats.healPct, CM.CAPS.heal, 'healPct topado a +50');
  p.hp = 1;
  assert.ok(approx(p.healSkill(100), 150), 'curación de habilidad +50 % (tope)');
  p.hp = 1;
  assert.ok(approx(h.g.heal(100, { target: 'lowest' }), 150), 'Game.heal (aliado con menos vida) escala igual');
  p.hp = p.stats.maxHP;
  const amt = h.g.shield(100, { dur: 5, src: 'prueba' });
  assert.equal(amt, 150, 'los escudos escalan con healPct');
  p.stats.arm = 0; p.stats.dr = 0; p.stats.block = 0;
  const hp0 = p.hp;
  p.takeDamage(100, 1);
  assert.equal(p.hp, hp0, 'el escudo se consume antes que la vida');
  p.takeDamage(100, 1);
  assert.equal(p.hp, hp0 - 50, 'lo que sobra del golpe pasa a la vida');
  h.tick(6);
  assert.equal(p.shields.length, 0, 'los escudos caducan');
  console.log('Curación de habilidad y escudos: escalan con healPct (tope +50 %) ✓');
}

// ------------------------------------------------ 4) restauraciones y control
{
  const h = makeHarness({ classId: 'guerrero', level: 30, powers: ['m_aegis'] });
  const p = h.p;
  p.hp = 5;
  p.takeDamage(1e6, 1);
  assert.ok(p.alive && p.hp === 1 && p.invulnT > 0, 'Muro Inquebrantable (onLethal) te deja a 1 de vida e inmune');
  h.tick(3);
  p.hp = 5; p.takeDamage(1e6, 1);
  assert.ok(!p.alive, 'con la recarga activa, el golpe letal mata');
  // rendimientos decrecientes por canal
  const h2 = makeHarness({ classId: 'guerrero', level: 10 });
  const e = h2.enemy({ hp: 1e6 });
  assert.ok(approx(e.applyCC('stun', 1), 1), 'primer aturdimiento completo');
  e.stunT = 0;
  assert.ok(e.applyCC('stun', 1) < 1, 'el segundo dura menos (canal duro)');
  assert.ok(approx(e.applyCC('root', 1), 1), 'inmovilizar tiene SU canal (no lo reduce el aturdimiento)');
  e.rootT = 0;
  assert.ok(approx(e.applyCC('root', 1), 0.75), 'inmovilizar: +0,25 de resistencia por aplicación');
  assert.equal(e.applyCC('slow', 3, { pct: 30 }), 3);
  assert.equal(e.applyCC('slow', 3, { pct: 20 }), 0, 'ralentizar: gana el más fuerte');
  assert.equal(e.slowPct, 30);
  e.applyCC('slow', 3, { pct: 95 });
  assert.equal(e.slowPct, 70, 'tope de ralentización 70 %');
  const boss = h2.enemy({ hp: 1e6, boss: true });
  // Paso 2c.0: el control de jefes suma STAGGER (test66-roles-primitivas lo cubre entero)
  assert.ok(boss.applyCC('stun', 1) > 0 && boss.stunT === 0 && approx(boss.stagger, 30), 'jefes: el aturdimiento suma stagger (30/s) en vez de aturdir');
  const bx = boss.pos.x;
  assert.ok(boss.applyCC('knock', 3) > 0 && boss.pos.x === bx, 'los jefes no se empujan (suman stagger)');
  console.log('Restauraciones (onLethal) y control con rendimientos decrecientes por canal ✓');
}
console.log('\n✅ SUSTENTO + DEBILIDAD OK');
