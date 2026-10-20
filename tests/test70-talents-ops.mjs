// Paso 2d — operaciones del panel de talentos (js/talents-ops.js)
//  Sumar/restar rango respetando puertas, requisitos y puntos; elecciones A/B;
//  reinicio; build recomendada; elegir especialización; código de build
//  (ida y vuelta, códigos corruptos o ajenos rechazados con mensaje claro).
//  Datos: fixture de los mockups (tests/fixtures/talents-sample.mjs) vía hooks
//  de carga, así no depende de que existan los js/talents-<clase>.js reales.
import assert from 'node:assert/strict';
import './helpers/use-talents-fixture.mjs';
const T = await import('../js/talents.js');
const { createTalentOps, codeChecksum, CODE_VERSION } = await import('../js/talents-ops.js');

const ops = createTalentOps(T);
const hero = (classId, level, extra = {}) => ({ classId, level, talents: T.normalizeTalents(null, classId), ...extra });

// ---- sin especialización / nivel bajo ----
{
  const p = hero('guerrero', 5);
  assert.equal(T.talentPointsLeft(p, 'cls'), 0);
  const r = ops.addRank(p, 'cls', 'c1');
  assert.equal(r.ok, false); assert.match(r.reason, /puntos/);
  assert.equal(ops.chooseSpec(p, 'berserker').ok, false, 'Nv5 no puede elegir especialización');
  assert.equal(ops.addRank(p, 'spec', 's1').ok, false);
  const q = { classId: 'guerrero', level: 12 }; // sin p.talents: ensure() lo crea
  assert.equal(ops.addRank(q, 'cls', 'c1').ok, true);
  assert.equal(q.talents.cls.c1, 1);
}
console.log('Nivel bajo y estado ausente ✓');

// ---- sumar / restar respetando requisitos y puertas ----
{
  const p = hero('guerrero', 50);
  assert.equal(ops.chooseSpec(p, 'berserker').ok, true);
  assert.equal(p.talents.spec, 'berserker');
  assert.equal(ops.chooseSpec(p, 'nada').ok, false);
  // requisito: c2 exige c1 al máximo (2)
  let r = ops.addRank(p, 'cls', 'c2');
  assert.equal(r.ok, false); assert.match(r.reason, /Requiere Fuerza de Titán/);
  assert.ok(ops.addRank(p, 'cls', 'c1').ok);
  assert.equal(ops.addRank(p, 'cls', 'c2').ok, false, 'c1 aún 1/2');
  assert.ok(ops.addRank(p, 'cls', 'c1').ok);
  r = ops.addRank(p, 'cls', 'c1');
  assert.equal(r.ok, false); assert.match(r.reason, /máximo/);
  assert.ok(ops.addRank(p, 'cls', 'c2').ok);
  // quitar c1 rompería c2 → bloqueado con motivo
  r = ops.removeRank(p, 'cls', 'c1');
  assert.equal(r.ok, false); assert.match(r.reason, /Segundo Aliento/);
  assert.ok(ops.removeRank(p, 'cls', 'c2').ok);
  assert.ok(ops.removeRank(p, 'cls', 'c1').ok);
  assert.equal(p.talents.cls.c1, 1);
  assert.equal(ops.removeRank(p, 'cls', 'c2').ok, false, 'sin rangos');
  // puerta de la fila 3 de clase (6 puntos en filas superiores)
  ops.resetTree(p, 'cls');
  for (const id of ['c1', 'c1', 'c2', 'c3', 'c4']) assert.ok(ops.addRank(p, 'cls', id).ok, id);
  r = ops.addRank(p, 'cls', 'c7'); // fila 3, req c4 (máx 3) o c5 (máx 1)
  assert.equal(r.ok, false); assert.match(r.reason, /Gasta 6 puntos/);
  assert.ok(ops.addRank(p, 'cls', 'c5').ok);
  assert.equal(p.talents.choice.c5, 'A', 'una elección nueva arranca en A');
  assert.ok(ops.addRank(p, 'cls', 'c7').ok, 'puerta abierta con 6 puntos y c5 al máximo');
  // quitar un punto de arriba cerraría la puerta → bloqueado
  r = ops.removeRank(p, 'cls', 'c4');
  assert.equal(r.ok, false); assert.match(r.reason, /Desviar Golpes/);
  // nodo gratis
  assert.equal(ops.addRank(p, 'spec', 's0').ok, false);
  assert.equal(ops.removeRank(p, 'spec', 's0').ok, false);
  assert.equal(ops.nodeState(p, 'spec', T.nodeById(T.treeOf(p, 'spec'), 's0')).state, 'free');
  // estados para la UI
  const st = (w, id) => ops.nodeState(p, w, T.nodeById(T.treeOf(p, w), id)).state;
  assert.equal(st('cls', 'c1'), 'max');
  assert.equal(st('cls', 'c7'), 'partial');
  assert.equal(st('cls', 'c6'), 'available');
  assert.equal(st('cls', 'c15'), 'locked');
  assert.equal(st('spec', 's1'), 'available');
  // apex: nivel 40 además de 17 puntos
  const lo = hero('guerrero', 30); ops.chooseSpec(lo, 'berserker');
  const x1 = T.nodeById(T.treeOf(lo, 'spec'), 'x1');
  assert.equal(ops.nodeState(lo, 'spec', x1).state, 'locked');
}
console.log('Sumar/restar con requisitos, puertas y nodo gratis ✓');

// ---- límite de puntos ----
{
  const p = hero('maga', 11); // spec: Nv10 → 1 punto; clase: Nv11 → 1 punto
  ops.chooseSpec(p, 'piromante');
  assert.equal(T.talentPointsLeft(p, 'spec'), 1);
  assert.ok(ops.addRank(p, 'spec', 's1').ok);
  const r = ops.addRank(p, 'spec', 's1');
  assert.equal(r.ok, false); assert.match(r.reason, /No te quedan puntos de especialización/);
  assert.equal(T.talentPointsLeft(p, 'spec'), 0);
}
console.log('Límite de puntos por árbol ✓');

// ---- elecciones A/B ----
{
  const p = hero('guerrero', 50);
  assert.equal(ops.setChoice(p, 'cls', 'c5', 'B').ok, true);
  assert.equal(p.talents.choice.c5, 'B');
  assert.equal(ops.setChoice(p, 'cls', 'c5', 'Z').ok, false);
  assert.equal(ops.setChoice(p, 'cls', 'c1', 'A').ok, false, 'c1 no es elección');
  assert.ok(ops.toggleChoice(p, 'cls', 'c5').ok);
  assert.equal(p.talents.choice.c5, 'A');
}
console.log('Elecciones A/B ✓');

// ---- reinicio y build recomendada ----
{
  const p = hero('guerrero', 50);
  ops.chooseSpec(p, 'berserker');
  assert.ok(ops.applyPresetAll(p).ok);
  const clsSpent = T.spentIn(T.treeOf(p, 'cls'), p.talents.cls);
  const spSpent = T.spentIn(T.treeOf(p, 'spec'), p.talents.sp.berserker);
  assert.ok(clsSpent > 10 && clsSpent <= T.talentPointsEarned(p, 'cls'), 'preset de clase dentro del presupuesto');
  assert.ok(spSpent > 10 && spSpent <= T.talentPointsEarned(p, 'spec'));
  assert.equal(p.talents.choice.c5, 'B', 'el preset trae su elección');
  assert.equal(p.talents.choice.s6, 'A');
  // el preset respeta reglas: todos los nodos son válidos
  for (const w of ['cls', 'spec']) {
    const tree = T.treeOf(p, w), ranks = T.ranksOf(p, w);
    for (const n of tree.nodes) if ((ranks[n.id] | 0) > 0) assert.ok(!T.gateFail(tree, ranks, n, p.level) && !T.reqFail(tree, ranks, n), n.id);
  }
  // preset con poco nivel: recorta sin romper reglas
  const q = hero('arquera', 14); ops.chooseSpec(q, 'tiradora');
  assert.ok(ops.applyPreset(q, 'spec').ok);
  assert.ok(T.spentIn(T.treeOf(q, 'spec'), T.ranksOf(q, 'spec')) <= T.talentPointsEarned(q, 'spec'));
  // reinicio
  assert.ok(ops.resetAll(p).ok);
  assert.deepEqual(p.talents.cls, {});
  assert.deepEqual(p.talents.sp.berserker, { s0: 1 }, 'solo queda el nodo clave gratis');
  assert.equal(p.talents.choice.c5, undefined);
  assert.equal(p.talents.spec, 'berserker', 'reiniciar no quita la especialización');
}
console.log('Reinicio y build recomendada ✓');

// ---- cambio de especialización conserva cada build ----
{
  const p = hero('maga', 40);
  ops.chooseSpec(p, 'piromante'); ops.applyPreset(p, 'spec');
  const pyro = { ...p.talents.sp.piromante };
  ops.chooseSpec(p, 'crionte');
  assert.deepEqual(T.ranksOf(p, 'spec'), { s0: 1 }, 'build nueva: solo el nodo clave');
  assert.ok(ops.addRank(p, 'spec', 's1').ok, 's1 (req s0 gratis) se puede aprender');
  ops.chooseSpec(p, 'piromante');
  assert.deepEqual(p.talents.sp.piromante, pyro, 'la build de Piromante sigue ahí');
  assert.equal(p.talents.sp.crionte.s1, 1);
}
console.log('Cambio de especialización ✓');

// ---- código de build: ida y vuelta ----
{
  const p = hero('guerrero', 50);
  ops.chooseSpec(p, 'berserker'); ops.applyPresetAll(p);
  ops.setChoice(p, 'cls', 'c5', 'B');
  const code = ops.exportCode(p);
  assert.ok(code.startsWith(CODE_VERSION + '-guerrero-berserker-'), code);
  assert.ok(code.length < 90, 'código compacto: ' + code.length);
  const q = hero('guerrero', 50);
  const r = ops.importCode(q, code);
  assert.equal(r.ok, true, r.error);
  assert.equal(q.talents.spec, 'berserker');
  assert.deepEqual(q.talents.cls, p.talents.cls);
  assert.deepEqual(q.talents.sp.berserker, p.talents.sp.berserker);
  assert.equal(q.talents.choice.c5, 'B');
  assert.equal(ops.exportCode(q), code, 'exportar(importar(x)) = x');
  // espacios alrededor tolerados
  assert.equal(ops.importCode(hero('guerrero', 50), `  ${code}\n`).ok, true);
  // sin especialización
  const n = hero('arquera', 20); ops.addRank(n, 'cls', 'c1');
  const c2 = ops.exportCode(n);
  assert.match(c2, /^IRPG1-arquera-x-/);
  const m = hero('arquera', 20);
  assert.equal(ops.importCode(m, c2).ok, true);
  assert.equal(m.talents.cls.c1, 1);
  assert.equal(m.talents.spec, null);
}
console.log('Exportar/importar: ida y vuelta ✓');

// ---- códigos corruptos o ajenos ----
{
  const p = hero('guerrero', 50);
  ops.chooseSpec(p, 'berserker'); ops.applyPresetAll(p);
  const code = ops.exportCode(p);
  const before = JSON.stringify(p.talents);
  const bad = (c, re, who = hero('guerrero', 50)) => {
    const r = ops.importCode(who, c);
    assert.equal(r.ok, false, 'debió rechazar: ' + c);
    assert.match(r.error, re);
  };
  bad('', /Pega un código/);
  bad('hola', /Formato no reconocido/);
  bad('IRPG1-guerrero-berserker', /incompleto/);
  // un carácter cambiado → falla la verificación
  const parts = code.split('-');
  const flip = parts[3][0] === '2' ? '1' + parts[3].slice(1) : '2' + parts[3].slice(1);
  bad([...parts.slice(0, 3), flip, ...parts.slice(4)].join('-'), /dañado/);
  // longitud distinta pero con checksum correcto → no encaja con el árbol
  const short = [parts[0], parts[1], parts[2], parts[3].slice(0, -1), parts[4]].join('-');
  bad(short + '-' + codeChecksum(short), /no encaja/);
  // rango imposible con checksum correcto
  const over = [parts[0], parts[1], parts[2], '9' + parts[3].slice(1), parts[4]].join('-');
  bad(over + '-' + codeChecksum(over), /Rango no válido/);
  // otra clase
  bad(code, /es de Guerrero y tu personaje es Maga/, hero('maga', 50));
  // especialización inexistente
  const fake = [parts[0], parts[1], 'pirata', parts[3], parts[4]].join('-');
  bad(fake + '-' + codeChecksum(fake), /Especialización desconocida/);
  // más puntos de los que tiene el personaje
  bad(code, /solo tienes|no válida/, hero('guerrero', 20));
  // un nivel 30 no puede tener el apex (puerta de nivel 40)
  const apex = hero('guerrero', 50); ops.chooseSpec(apex, 'berserker');
  ops.applyPreset(apex, 'spec');
  assert.ok((apex.talents.sp.berserker.x1 | 0) > 0, 'el preset Nv50 llega al apex');
  // nada cambió en el jugador original tras los intentos
  assert.equal(JSON.stringify(p.talents), before);
  // un rechazo no aplica nada a medias
  const victim = hero('guerrero', 20); ops.addRank(victim, 'cls', 'c1');
  const snap = JSON.stringify(victim.talents);
  assert.equal(ops.importCode(victim, code).ok, false);
  assert.equal(JSON.stringify(victim.talents), snap, 'todo o nada');
}
console.log('Códigos corruptos/ajenos rechazados con mensaje claro ✓');

// ---- habilidades concedidas ----
{
  const p = hero('guerrero', 50); ops.chooseSpec(p, 'berserker'); ops.applyPresetAll(p);
  const g = [...ops.grantsOf(p, 'cls'), ...ops.grantsOf(p, 'spec')];
  assert.ok(g.some(x => x.skill === 'g_t_aliento' && x.learned));
  const bram = g.find(x => x.skill === 'g_t_bramido');
  assert.ok(bram && bram.choice);
}
console.log('Lista de habilidades concedidas ✓');
console.log('\ntest70-talents-ops: OK');
