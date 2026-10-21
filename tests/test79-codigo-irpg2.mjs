// Paso 2g · E1 (W1) — código de build IRPG2 (js/talents-ops.js §3.10) sobre el fixture v2
//   IRPG2-<clase>-<spec|x>-<firma2>-<cls>-<spec>-<árbolHéroe|x>-<héroe>-<chk2>
//  1) ida y vuelta de las 36 builds del fixture al Nv100 (rangos, elecciones A/B de clase,
//     especialización y héroe, árbol héroe) y exportar lo importado da el mismo código
//  2) forma: 9 partes, firma2 = treeSignature, chk2 = FNV-1a; sin especialización ('x')
//  3) versión: IRPG1 y firma de otros árboles → 'code-version'
//  4) suma de verificación: cualquier carácter cambiado o recortado → 'code-check'
//  5) clase ajena o desconocida → 'code-class'; rangos/opciones/árboles imposibles → 'code-illegal'
//  6) nivel: sin trim, todo o nada (el personaje no cambia); con trim, recorte legal punto a punto
//  7) Paragon: nodos sin 31/31 de especialización → ilegal; apertura (heroOpened) al importar
//  8) espacios y saltos de línea tolerados; parseCode no muta nada
import assert from 'node:assert/strict';
import './helpers/use-talents-fixture.mjs';
const T = await import('../js/talents.js');
const { createTalentOps, codeChecksum, CODE_VERSION, CODE_VERSION_OLD } = await import('../js/talents-ops.js');
const F = await import('./fixtures/talents-sample.mjs');

const ops = createTalentOps(T);
const mk = (classId, level, talents = null) => ({ classId, level, talentsRev: 0, talents: T.normalizeTalents(talents, classId) });
const state = p => JSON.stringify({ spec: p.talents.spec, cls: p.talents.cls, sp: p.talents.sp, choice: p.talents.choice, hero: p.talents.hero });
const spent = (nodes, ranks) => T.spentIn({ nodes }, ranks);
const B36 = '0123456789abcdefghijklmnopqrstuvwxyz';
// FNV-1a de referencia (independiente del módulo)
const refChk = s => { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return B36[h % 36] + B36[Math.floor(h / 36) % 36]; };
// re-firma un cuerpo de 8 partes alterado (para llegar a las validaciones de después de chk2)
const sign = parts => { const body = parts.slice(0, 8).join('-'); return `${body}-${codeChecksum(body)}`; };
const partsOf = code => code.split('-');
const expectFail = (r, reason, what) => { assert.equal(r.ok, false, `${what}: debía fallar`); assert.equal(r.reason, reason, `${what}: reason ${r.reason} (${r.text})`); assert.ok(typeof r.text === 'string' && r.text.length > 5, `${what}: sin texto para el jugador`); };

// ------------------------------------------------ 0) suma de verificación
assert.equal(codeChecksum(''), refChk(''));
for (const s of ['IRPG2-maga', 'a', 'IRPG2-guerrero-bastion-0z-123', 'ñandú']) assert.equal(codeChecksum(s), refChk(s), s);
assert.match(codeChecksum('x'.repeat(500)), /^[0-9a-z]{2}$/);
assert.equal(CODE_VERSION, 'IRPG2'); assert.equal(CODE_VERSION_OLD, 'IRPG1');

// ------------------------------------------------ 1) ida y vuelta de las 36 builds
let trips = 0;
for (const [cid, data] of Object.entries(F.FIXTURE_TREES)) {
  const sig = T.treeSignature(cid).slice(-2).padStart(2, '0');
  const nonFree = nodes => nodes.filter(n => !n.free).length;
  for (const [key, b] of Object.entries(data.builds)) {
    const src = mk(cid, 100);
    assert.equal(ops.applyBuild(src, key).ok, true, `${cid}/${key}: applyBuild`);
    const code = ops.exportCode(src);
    const P = partsOf(code);
    assert.equal(P.length, 9, `${cid}/${key}: 9 partes`);
    assert.deepEqual(P.slice(0, 4), ['IRPG2', cid, b.sp, sig], `${cid}/${key}: cabecera`);
    assert.equal(P[6], b.hero, `${cid}/${key}: árbol héroe`);
    assert.equal(P[8], refChk(P.slice(0, 8).join('-')), `${cid}/${key}: chk2`);
    // un carácter de rango por nodo comprable + la letra de cada elección con rango
    const chosen = (nodes, ranks) => nodes.filter(n => n.t === 'c' && (ranks[n.id] | 0) > 0).length;
    const sp = data.specs.find(s => s.id === b.sp), ht = data.hero.find(h => h.id === b.hero);
    assert.equal(P[4].length, nonFree(data.cls.nodes) + chosen(data.cls.nodes, src.talents.cls), `${cid}/${key}: longitud de la clase`);
    assert.equal(P[5].length, nonFree(sp.nodes) + chosen(sp.nodes, src.talents.sp[b.sp]), `${cid}/${key}: longitud de la especialización`);
    const hr = src.talents.hero[b.sp].nodes[b.hero];
    assert.equal(P[7].length, nonFree(ht.nodes) + chosen(ht.nodes, hr), `${cid}/${key}: longitud del héroe`);
    assert.equal(Object.keys(hr).length, 10, `${cid}/${key}: 10 nodos héroe al Nv100`);
    assert.match(P[7], /^[01AB]+$/);
    // importar en un personaje vacío del mismo nivel
    const dst = mk(cid, 100);
    const r = ops.importCode(dst, code);
    assert.equal(r.ok, true, `${cid}/${key}: importCode → ${r.text}`);
    assert.equal(r.specId, b.sp); assert.equal(r.trimmed, false); assert.equal(r.heroOpened, true, `${cid}/${key}: el Paragon se abre al importar`);
    assert.equal(dst.talentsRev, 1, 'importCode sube la revisión una vez');
    assert.deepEqual(dst.talents.cls, src.talents.cls, `${cid}/${key}: clase`);
    assert.deepEqual(dst.talents.sp[b.sp], src.talents.sp[b.sp], `${cid}/${key}: especialización`);
    assert.deepEqual(dst.talents.hero[b.sp], src.talents.hero[b.sp], `${cid}/${key}: héroe (árbol, nodos y elecciones)`);
    for (const n of [...data.cls.nodes, ...sp.nodes]) if (n.t === 'c' && ((src.talents.cls[n.id] | 0) || (src.talents.sp[b.sp][n.id] | 0)))
      assert.equal(dst.talents.choice[n.id], src.talents.choice[n.id], `${cid}/${key}: elección ${n.id}`);
    assert.equal(ops.exportCode(dst), code, `${cid}/${key}: exportar lo importado da el mismo código`);
    assert.equal(T.heroOpen(dst), true);
    trips++;
  }
}
assert.equal(trips, 36);
// las elecciones B sobreviven (el fixture tiene builds con B en clase, especialización y héroe)
{
  const src = mk('maga', 100); ops.applyBuild(src, 'brasa');
  assert.equal(src.talents.choice.c5, 'B'); assert.equal(src.talents.choice.s15, 'B'); assert.equal(src.talents.hero.piromante.choice.invoca.f2, 'B');
  const code = ops.exportCode(src);
  const P = partsOf(code);
  const dst = mk('maga', 100); ops.importCode(dst, code);
  assert.equal(dst.talents.choice.c5, 'B'); assert.equal(dst.talents.choice.s15, 'B'); assert.equal(dst.talents.hero.piromante.choice.invoca.f2, 'B');
  // cambiar la B de c5 por A (re-firmado) se respeta: el código lleva la opción, no la deduce
  const i = P[4].indexOf('B'); assert.ok(i > 0);
  const alt = [...P]; alt[4] = P[4].slice(0, i) + 'A' + P[4].slice(i + 1);
  const d2 = mk('maga', 100); assert.equal(ops.importCode(d2, sign(alt)).ok, true);
  const firstB = data => data.cls.nodes.filter(n => n.t === 'c' && (src.talents.cls[n.id] | 0) > 0).find(n => src.talents.choice[n.id] === 'B');
  assert.equal(d2.talents.choice[firstB(F.MAGA_TALENTS).id], 'A');
  // una elección sin letra cae en la opción A
  const noLetter = [...P]; noLetter[4] = P[4].slice(0, i) + P[4].slice(i + 1);
  const d3 = mk('maga', 100); assert.equal(ops.importCode(d3, sign(noLetter)).ok, true);
  assert.equal(d3.talents.choice[firstB(F.MAGA_TALENTS).id], 'A');
}
console.log('✓ ida y vuelta de las 36 builds (clase, especialización, héroe y elecciones A/B)');

// ------------------------------------------------ 2) sin especialización
{
  const p = mk('maga', 20);
  for (const id of ['c1', 'c1', 'c2', 'c3']) assert.equal(ops.addRank(p, 'cls', id).ok, true, id);
  const code = ops.exportCode(p);
  const P = partsOf(code);
  assert.equal(P[2], 'x'); assert.equal(P[5], ''); assert.equal(P[6], 'x'); assert.equal(P[7], '');
  const q = mk('maga', 20);
  const r = ops.importCode(q, code);
  assert.equal(r.ok, true); assert.equal(r.specId, null); assert.equal(r.changedSpec, false);
  assert.equal(q.talents.spec, null); assert.deepEqual(q.talents.cls, { c1: 2, c2: 1, c3: 1 });
  // un código con especialización en un personaje sin ella la elige; sin especialización no toca la suya
  const withSpec = mk('maga', 100); ops.chooseSpec(withSpec, 'crionte'); ops.addRank(withSpec, 'spec', 'i1');
  assert.equal(ops.importCode(withSpec, code).ok, true);
  assert.equal(withSpec.talents.spec, 'crionte'); assert.deepEqual(withSpec.talents.sp.crionte, { i1: 1 });
  // ramas de especialización/héroe sin especialización → dañado
  expectFail(ops.parseCode(sign(['IRPG2', 'maga', 'x', P[3], P[4], '0', 'x', ''])), 'code-check', 'especialización sin spec');
  expectFail(ops.parseCode(sign(['IRPG2', 'maga', 'x', P[3], P[4], '', 'crono', ''])), 'code-check', 'héroe sin spec');
  expectFail(ops.parseCode(sign(['IRPG2', 'maga', 'x', P[3], P[4], '', 'x', '0'])), 'code-check', 'nodos héroe sin spec');
}
console.log('✓ código sin especialización (x) y sin Paragon');

// ------------------------------------------------ 3) versión y firma
const base = (() => { const p = mk('maga', 100); ops.applyBuild(p, 'glaciar'); return ops.exportCode(p); })();
const BP = partsOf(base);
expectFail(ops.parseCode(['IRPG1', ...BP.slice(1)].join('-')), 'code-version', 'IRPG1');
expectFail(ops.parseCode('IRPG1-maga-001122'), 'code-version', 'IRPG1 corto');
expectFail(ops.importCode(mk('maga', 100), ['IRPG1', ...BP.slice(1)].join('-')), 'code-version', 'IRPG1 al importar');
{
  const other = BP[3] === 'zz' ? 'yy' : 'zz';
  expectFail(ops.parseCode(sign([...BP.slice(0, 3), other, ...BP.slice(4)])), 'code-version', 'firma de otros árboles');
  // cambiar los árboles cambia la firma: un código de antes ya no entra
  const n = F.MAGA_TALENTS.specs[1].nodes.find(x => x.id === 'i3');
  const max0 = n.max;
  const sig0 = T.treeSignature('maga');
  n.max = max0 + 1;
  try {
    assert.notEqual(T.treeSignature('maga'), sig0, 'la firma depende de los máximos');
    expectFail(ops.parseCode(base), 'code-version', 'árboles cambiados tras exportar');
  } finally { n.max = max0; }
  assert.equal(T.treeSignature('maga'), sig0);
  assert.equal(ops.parseCode(base).ok, true);
}
console.log('✓ IRPG1 y otra versión de los árboles → code-version');

// ------------------------------------------------ 4) suma de verificación
{
  const body = BP.slice(0, 8).join('-');
  let changed = 0;
  // cada carácter de rango/opción cambiado por otro válido
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === '-') continue;
    const sub = /[0-9]/.test(ch) ? (ch === '1' ? '0' : '1') : /[A-Z]/.test(ch) ? (ch === 'A' ? 'B' : 'A') : (ch === 'a' ? 'b' : 'a');
    const bad = body.slice(0, i) + sub + body.slice(i + 1) + '-' + BP[8];
    const r = ops.parseCode(bad);
    assert.equal(r.ok, false, `carácter ${i} cambiado: no lo detecta`);
    changed++;
  }
  assert.ok(changed > 60, `se probaron ${changed} sustituciones`);
  // una de rango en la clase: es code-check (no llega a decodificar)
  const k = body.indexOf(BP[4]) + 3;
  expectFail(ops.parseCode(body.slice(0, k) + (body[k] === '0' ? '1' : '0') + body.slice(k + 1) + '-' + BP[8]), 'code-check', 'rango cambiado');
  expectFail(ops.parseCode(base.slice(0, -1)), 'code-check', 'chk recortado');
  expectFail(ops.parseCode(base.slice(0, -2) + (BP[8] === 'aa' ? 'ab' : 'aa')), 'code-check', 'chk cambiado');
  expectFail(ops.parseCode(BP.slice(0, 8).join('-')), 'code-check', 'sin chk');
  expectFail(ops.parseCode(base + '-00'), 'code-check', 'parte de más');
  expectFail(ops.parseCode(''), 'code-check', 'vacío');
  expectFail(ops.parseCode(null), 'code-check', 'null');
  expectFail(ops.parseCode('hola mundo'), 'code-check', 'texto');
  expectFail(ops.parseCode('IRPG3-maga'), 'code-check', 'otra cabecera');
}
console.log('✓ suma de verificación: sustituciones, recortes y partes de más → code-check');

// ------------------------------------------------ 5) clase y legalidad del contenido
{
  expectFail(ops.importCode(mk('guerrero', 100), base), 'code-class', 'código de Maga en un Guerrero');
  assert.match(ops.importCode(mk('arquera', 100), base).text, /Maga/);
  expectFail(ops.parseCode(sign(['IRPG2', 'brujo', ...BP.slice(2)])), 'code-class', 'clase desconocida');
  const S = BP[3];
  const clsLen = BP[4].length;
  expectFail(ops.parseCode(sign([...BP.slice(0, 4), BP[4].slice(0, -1), ...BP.slice(5)])), 'code-illegal', 'clase corta');
  expectFail(ops.parseCode(sign([...BP.slice(0, 4), BP[4] + '0', ...BP.slice(5)])), 'code-illegal', 'clase larga');
  expectFail(ops.parseCode(sign([...BP.slice(0, 4), '9' + BP[4].slice(1), ...BP.slice(5)])), 'code-illegal', 'rango por encima del máximo');
  expectFail(ops.parseCode(sign([...BP.slice(0, 4), '_' + BP[4].slice(1), ...BP.slice(5)])), 'code-illegal', 'carácter no válido');
  const ci = BP[4].search(/[AB]/);
  expectFail(ops.parseCode(sign([...BP.slice(0, 4), BP[4].slice(0, ci) + 'C' + BP[4].slice(ci + 1), ...BP.slice(5)])), 'code-illegal', 'opción C');
  expectFail(ops.parseCode(sign(['IRPG2', 'maga', 'nigromante', S, ...BP.slice(4)])), 'code-illegal', 'especialización desconocida');
  expectFail(ops.parseCode(sign([...BP.slice(0, 6), 'crono', ...BP.slice(7)])), 'code-illegal', 'árbol héroe que no es de la especialización');
  expectFail(ops.parseCode(sign([...BP.slice(0, 6), 'zzz', ...BP.slice(7)])), 'code-illegal', 'árbol héroe desconocido');
  expectFail(ops.parseCode(sign([...BP.slice(0, 7), BP[7].replace('1', '2')])), 'code-illegal', 'héroe con rango 2');
  expectFail(ops.parseCode(sign([...BP.slice(0, 7), BP[7] + '1'])), 'code-illegal', 'héroe largo');
  assert.equal(clsLen, BP[4].length);
  // una build que rompe una puerta (todo en la última fila) es ilegal aunque quepa en puntos
  const p = mk('maga', 100);
  p.talents.cls = { c28: 3 };
  const bad = ops.exportCode(p);
  expectFail(ops.importCode(mk('maga', 100), bad), 'code-illegal', 'puerta incumplida');
  assert.match(ops.importCode(mk('maga', 100), bad).text, /Build no válida/);
  // requisito incumplido (nodo hijo sin padre)
  const q = mk('maga', 100);
  q.talents.spec = 'piromante'; q.talents.sp.piromante = { s4: 1 };
  expectFail(ops.importCode(mk('maga', 100), ops.exportCode(q)), 'code-illegal', 'requisito incumplido');
}
console.log('✓ clase ajena → code-class; longitudes, rangos, opciones, árboles, puertas y requisitos → code-illegal');

// ------------------------------------------------ 6) nivel: todo o nada, y trim
{
  const tgt = mk('maga', 40);
  ops.chooseSpec(tgt, 'arcanista'); ops.addRank(tgt, 'spec', 'a1'); ops.addRank(tgt, 'cls', 'c2');
  ops.saveLoadout(tgt, 'mía');
  const before = state(tgt), rev = tgt.talentsRev, loads = JSON.stringify(tgt.talents.loadouts);
  const r = ops.importCode(tgt, base);
  expectFail(r, 'code-illegal', 'build de Nv100 en un Nv40');
  assert.match(r.text, /solo tienes \d+/);
  assert.equal(state(tgt), before, 'todo o nada: nada cambió');
  assert.equal(tgt.talentsRev, rev, 'sin cambios no sube la revisión');
  // con trim: recorte legal punto a punto, Paragon cerrado
  const t = ops.importCode(tgt, base, { trim: true });
  assert.equal(t.ok, true, t.text); assert.equal(t.trimmed, true); assert.equal(t.specId, 'crionte');
  assert.equal(tgt.talents.spec, 'crionte');
  assert.deepEqual(tgt.talents.sp.arcanista, { a1: 1 }, 'la otra especialización conserva sus rangos');
  assert.equal(JSON.stringify(tgt.talents.loadouts), loads, 'las configuraciones no se tocan');
  const cls = T.talentTreesFor('maga').cls.nodes, sp = T.findSpec('maga', 'crionte').nodes;
  assert.equal(spent(cls, tgt.talents.cls), T.earnedAt('cls', 40), 'gasta todos los puntos de clase del nivel');
  assert.equal(spent(sp, tgt.talents.sp.crionte), T.earnedAt('spec', 40), 'gasta todos los de especialización');
  assert.ok(T.validRanks({ nodes: cls, gates: T.CLASS_GATES }, tgt.talents.cls, 40));
  assert.ok(T.validRanks({ nodes: sp, gates: T.SPEC_GATES }, tgt.talents.sp.crionte, 40));
  const from = ops.parseCode(base);
  for (const [id, r2] of Object.entries(tgt.talents.cls)) assert.ok(r2 <= (from.cls[id] | 0), `recorte: ${id} no supera el código`);
  for (const [id, r2] of Object.entries(tgt.talents.sp.crionte)) assert.ok(r2 <= (from.spec[id] | 0), `recorte: ${id} no supera el código`);
  assert.deepEqual(tgt.talents.hero.crionte.nodes.escriba, {}, 'Paragon sin puntos al Nv40');
  assert.equal(T.heroOpen(tgt), false);
  // nivel de especialización
  expectFail(ops.importCode(mk('maga', 9), base), 'code-illegal', 'especialización antes del Nv10');
  expectFail(ops.importCode(mk('maga', 9), base, { trim: true }), 'code-illegal', 'especialización antes del Nv10 (trim)');
  // al Nv100 el trim no recorta nada
  const full = mk('maga', 100);
  const f = ops.importCode(full, base, { trim: true });
  assert.equal(f.ok, true); assert.equal(f.trimmed, false);
}
console.log('✓ nivel: rechazo sin cambios (todo o nada) y trim legal punto a punto');

// ------------------------------------------------ 7) Paragon con la especialización incompleta
{
  const src = mk('maga', 100);
  ops.applyBuild(src, 'glaciar');
  // quitar un rango de especialización deja el Paragon en pausa con sus nodos guardados
  const sp = T.findSpec('maga', 'crionte').nodes;
  const leaf = sp.filter(n => !n.free && (src.talents.sp.crionte[n.id] | 0) > 0).find(n => ops.removeRank(src, 'spec', n.id).ok);
  assert.ok(leaf, 'algún rango de especialización se puede quitar');
  assert.equal(T.heroPaused(src), true);
  const code = ops.exportCode(src);
  assert.match(partsOf(code)[7], /1/, 'el código lleva los nodos guardados del Paragon en pausa');
  const r = ops.importCode(mk('maga', 100), code);
  expectFail(r, 'code-illegal', 'Paragon sin 31/31');
  assert.match(r.text, /Paragon/);
  const t = ops.importCode(mk('maga', 100), code, { trim: true });
  assert.equal(t.ok, true); assert.equal(t.trimmed, true);
  // a la Nv72 la especialización llega a 31: el Paragon entra con lo que dé el nivel
  const lv = 72;
  const mid = mk('maga', lv);
  const m = ops.importCode(mid, base, { trim: true });
  assert.equal(m.ok, true); assert.equal(m.heroOpened, true);
  assert.equal(spent(T.findHero('maga', 'escriba').nodes, mid.talents.hero.crionte.nodes.escriba), T.earnedAt('hero', lv));
}
console.log('✓ Paragon: nodos sin 31/31 → code-illegal; trim los quita; apertura al importar');

// ------------------------------------------------ 8) espacios, saltos de línea y pureza de parseCode
{
  const spaced = `  ${base.slice(0, 10)} \n ${base.slice(10, 40)}\t${base.slice(40)}  `;
  const a = mk('maga', 100), b = mk('maga', 100);
  assert.equal(ops.importCode(a, spaced).ok, true);
  ops.importCode(b, base);
  assert.equal(state(a), state(b));
  const p = mk('maga', 100); ops.applyBuild(p, 'rayo');
  const s0 = state(p), r0 = p.talentsRev;
  const d = ops.parseCode(base);
  assert.equal(d.ok, true); assert.equal(d.classId, 'maga'); assert.equal(d.specId, 'crionte'); assert.equal(d.heroTree, 'escriba');
  assert.equal(Object.keys(d.hero).length, 10);
  assert.equal(state(p), s0); assert.equal(p.talentsRev, r0);
}
console.log('✓ espacios tolerados; parseCode es puro');

console.log('\n✅ CÓDIGO DE BUILD IRPG2 (test79) OK');
