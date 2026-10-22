// ============================================================
// Test 53 — De las RAMAS a la FORJA (Paso 2: 2f §2.3; docs/paso2-implementacion.md §3.5, D23)
// ============================================================
// Las ramas (3 × 3 opciones con puntos de habilidad) desaparecen: cada habilidad base tiene
// una Mejora y dos Variantes en js/skills-<clase>.js (<CLASE>_SKILL_FORGE), que data.js
// fusiona tal cual. Lo viejo (los stubs @deprecated de las ramas) se borró en E5 (D23); que no
// vuelva lo vigila test-cierre-e5:
//  1) el héroe ya no tiene puntos de habilidad
//  2) un guardado viejo con skillMods/skillBranches no cambia ningún perfil
//  3) contratos de data.js: SKILL_FORGE / SPEC_BAR / FORGE_RECO / FALLBACK_BAR / CATALOG_V
//     fusionados por clase, cls.forge, ids de la propia clase, recomendaciones 'i'|'ii',
//     barras que encajan en sus ranuras, specKitOf
import assert from 'node:assert/strict';
import { CLASSES, SKILL_FORGE, SPEC_BAR, FORGE_RECO, FALLBACK_BAR, CATALOG_V, specKitOf } from '../js/data.js';
import { validateForge } from '../js/skill-defs.js';
import { resolveSkill, fitsSlot } from '../js/skill-resolve.js';
import { POWER_HOOKS, SKILL_BEHAVIORS } from '../js/powers.js';
import * as G from '../js/skills-guerrero.js';
import * as M from '../js/skills-maga.js';
import * as A from '../js/skills-arquera.js';
import { makeHarness } from './helpers/power-harness.mjs';

// ------------------------------------------------ 1) sin puntos de habilidad
{
  const h = makeHarness({ classId: 'guerrero', level: 30 });
  assert.equal(h.p.skillPoints, undefined, 'sin puntos de habilidad');
}
console.log('Ramas: el héroe no tiene puntos de habilidad ✓');

// ------------------------------------------------ 2) un guardado viejo con ramas no cambia nada
for (const cid of Object.keys(CLASSES)) {
  const h = makeHarness({ classId: cid, level: 40 });
  const before = Object.fromEntries(h.p.cls.skills.map(sk => [sk.id, resolveSkill(h.p, sk)]));
  // ramas «elegidas» como en un guardado v4: ya no las lee resolveSkill
  h.p.skillMods = Object.fromEntries(h.p.cls.skills.map(sk => [sk.id, { b1: 'o1', b2: 'o2' }]));
  h.p.skillBranches = Object.fromEntries(h.p.cls.skills.map(sk => [sk.id, { b1: true, b2: true }]));
  h.p.recompute();
  for (const sk of h.p.cls.skills) {
    const a = before[sk.id], b = resolveSkill(h.p, sk);
    assert.ok(a.coef === b.coef && a.addPct === b.addPct && a.cd === b.cd && a.cost === b.cost && a.radius === b.radius && a.dot === b.dot,
      `${cid}/${sk.id}: las ramas viejas no cambian el perfil`);
  }
}
console.log('Guardados con ramas: sin efecto en resolveSkill ✓');

// ------------------------------------------------ 3) contratos de data.js (forja por clase)
const OWN = {
  guerrero: { forge: G.GUERRERO_SKILL_FORGE, bar: G.GUERRERO_SPEC_BAR, reco: G.GUERRERO_FORGE_RECO, fb: G.GUERRERO_FALLBACK_BAR, v: G.GUERRERO_CATALOG_V },
  maga: { forge: M.MAGA_SKILL_FORGE, bar: M.MAGA_SPEC_BAR, reco: M.MAGA_FORGE_RECO, fb: M.MAGA_FALLBACK_BAR, v: M.MAGA_CATALOG_V },
  arquera: { forge: A.ARQUERA_SKILL_FORGE, bar: A.ARQUERA_SPEC_BAR, reco: A.ARQUERA_FORGE_RECO, fb: A.ARQUERA_FALLBACK_BAR, v: A.ARQUERA_CATALOG_V },
};
let entries = 0;
for (const [cid, o] of Object.entries(OWN)) {
  const cls = CLASSES[cid];
  assert.equal(cls.forge, o.forge, `${cid}: cls.forge es el mapa de skills-${cid}.js`);
  assert.equal(CATALOG_V[cid], o.v, `${cid}: CATALOG_V`);
  assert.equal(cls.catalogV, o.v);
  assert.equal(FALLBACK_BAR[cid], o.fb, `${cid}: FALLBACK_BAR`);
  const ids = new Set(cls.skills.map(s => s.id));
  for (const [id, entry] of Object.entries(o.forge)) {
    entries++;
    assert.equal(SKILL_FORGE[id], entry, `${id}: SKILL_FORGE fusiona la entrada tal cual`);
    const sk = cls.skills.find(s => s.id === id);
    assert.ok(sk && sk.kind !== 'talent', `${cid}: forja de una habilidad que no es suya o de talento: ${id}`);
    const v = validateForge(entry, sk, { powers: POWER_HOOKS, behaviors: SKILL_BEHAVIORS });
    assert.deepEqual(v.errors, [], v.errors.join(' · '));
  }
  for (const [spec, b] of Object.entries(o.bar)) {
    assert.equal(SPEC_BAR[spec], b, `${spec}: SPEC_BAR fusiona la barra tal cual`);
    for (const [slot, id] of Object.entries(b.bar || {})) {
      if (!id) continue;
      const sk = cls.skills.find(s => s.id === id);
      assert.ok(sk && fitsSlot(sk, slot), `${spec}: ${id} no encaja en ${slot}`);
    }
    if (b.sel) assert.ok(ids.has(b.sel), `${spec}: sel ${b.sel}`);
  }
  for (const [spec, reco] of Object.entries(o.reco)) {
    assert.equal(FORGE_RECO[spec], reco);
    for (const [id, v] of Object.entries(reco)) {
      assert.ok(v === 'i' || v === 'ii', `${spec}/${id}: recomendación 'i' | 'ii' (el mockup usa A/B)`);
      assert.ok(o.forge[id], `${spec}/${id}: recomienda una variante sin forja`);
    }
  }
  if (o.fb) for (const [slot, id] of Object.entries(o.fb)) if (id) assert.ok(fitsSlot(cls.skills.find(s => s.id === id), slot), `${cid}: FALLBACK_BAR ${slot}`);
  // specKitOf: el kit de cada especialización = las habilidades con sk.spec
  for (const sk of cls.skills.filter(s => s.spec)) assert.ok(specKitOf(cid, sk.spec).includes(sk.id));
  assert.deepEqual(specKitOf(cid, null), []);
}
console.log(`Contratos de forja en data.js (${entries} entradas hoy; KA2 las llena en E2) ✓`);

// las tres clases no comparten ids de forja (mapa plano)
const all = [...Object.keys(G.GUERRERO_SKILL_FORGE), ...Object.keys(M.MAGA_SKILL_FORGE), ...Object.keys(A.ARQUERA_SKILL_FORGE)];
assert.equal(new Set(all).size, all.length, 'ids de forja únicos entre clases');

console.log('\n✅ DE LAS RAMAS A LA FORJA (guardados viejos, contratos de data.js) OK');
