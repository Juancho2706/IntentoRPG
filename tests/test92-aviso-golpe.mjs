// Aviso del golpe cuerpo a cuerpo enemigo: el enemigo prepara (meleeWindup) y el daño cae al final.
//  1) durante la preparación no hay daño; al terminar, sí
//  2) apartarse más allá de alcance + MELEE_REACH lo esquiva (y el ataque se gasta)
//  3) el control (aturdir) corta el golpe en preparación
//  4) meleeWindup: 0,35 s normal, 0,5 s jefes, `def.windup` manda, nunca más de media cadencia
import assert from 'node:assert/strict';
import { makeHarness } from './helpers/power-harness.mjs';
import { meleeWindup, MELEE_REACH } from '../js/entities.js';

const paso = (e, s) => { for (let t = 0; t < s - 1e-9; t += 0.05) e.update(0.05); };
const monta = () => {
  const h = makeHarness({ classId: 'guerrero', level: 20 });
  const e = h.enemy({ hp: 1e6, pos: [1, 0, 0] });
  e.aggroed = true; e.atkCd = 0; e.def.range = 1.5; e.hasLOS = true;
  return { h, p: h.p, e };
};

{ // 1
  const { p, e } = monta();
  const hp0 = p.hp;
  e.update(0.05);
  assert.ok(e.swingT > 0, 'empieza la preparación');
  assert.equal(p.hp, hp0, 'sin daño mientras prepara');
  paso(e, 0.4);
  assert.ok(p.hp < hp0, 'el daño cae al terminar la preparación');
  assert.equal(e.swingT, 0);
}
{ // 2
  const { p, e } = monta();
  const hp0 = p.hp;
  e.update(0.05);
  p.pos.x = e.pos.x + e.def.range + MELEE_REACH + 0.5;      // el héroe se aparta
  const cd = e.atkCd;
  paso(e, 0.4);
  assert.equal(p.hp, hp0, 'fuera de alcance al caer el golpe: falla');
  assert.ok(e.atkCd < cd && e.atkCd > 0, 'el ataque se gastó (sigue en enfriamiento)');
}
{ // 3
  const { p, e } = monta();
  const hp0 = p.hp;
  e.update(0.05);
  e.stunT = 0.2;
  e.update(0.05);
  assert.equal(e.swingT, 0, 'aturdido: suelta la preparación');
  e.stunT = 0;
  e.update(0.05);
  assert.equal(p.hp, hp0, 'el golpe cortado no hace daño');
}
{ // 4
  assert.equal(meleeWindup({ atkTime: 1.2 }), 0.35);
  assert.equal(meleeWindup({ atkTime: 1.5, boss: true }), 0.5);
  assert.equal(meleeWindup({ atkTime: 2, windup: 0.8 }), 0.8);
  assert.equal(meleeWindup({ atkTime: 0.5 }), 0.25);
}
console.log('✅ AVISO DEL GOLPE ENEMIGO OK');
