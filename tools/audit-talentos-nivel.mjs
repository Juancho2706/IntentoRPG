// ============================================================
// Auditoría del nivel de aprendizaje de los talentos (T0) — solo lectura
// ============================================================
// Por clase y árbol (clase y especializaciones), cada nodo con su fila, su learnAt (el nivel en que
// conoces la primera habilidad que toca o concede), su nivel de compra (el que da la forma del árbol:
// fila, padres al máximo y puertas) y el nivel más temprano en que de verdad se puede tomar
// (canAddRank real). En una elección, lo mismo por opción. «!» = el nivel de aprendizaje llega
// DESPUÉS que el de compra: ese nodo (u opción) se queda bloqueado un tiempo. Sirve para el
// antes/después del reorden de cada clase.
//
//   node tools/audit-talentos-nivel.mjs                 todas las clases
//   node tools/audit-talentos-nivel.mjs maga            una clase
//   node tools/audit-talentos-nivel.mjs --solo-bloq     solo los nodos/opciones con «!»
//   node tools/audit-talentos-nivel.mjs --json          lo mismo en JSON (para comparar dos versiones)
import { CLASS_IDS, levelTrees, takeLevel, buyLevel, firstLevel } from '../tests/helpers/talent-level.mjs';
import * as T from '../js/talents.js';

const args = process.argv.slice(2);
const only = args.find(a => !a.startsWith('--'));
const onlyBlocked = args.includes('--solo-bloq');
const asJson = args.includes('--json');
const fmt = v => (v == null ? '—' : v === Infinity ? 'nunca' : `Nv${v}`);

const report = [];
for (const classId of CLASS_IDS) {
  if (only && only !== classId) continue;
  const cls = { classId, trees: [], blocked: { nodes: 0, opts: 0 } };
  for (const tree of levelTrees(classId)) {
    const rows = [];
    for (const n of [...tree.nodes].sort((a, b) => a.r - b.r || a.c - b.c)) {
      if (n.free) { rows.push({ id: n.id, name: n.name, row: n.r, free: true }); continue; }
      const l = T.nodeLearn(n);
      const buy = buyLevel(tree, n), take = takeLevel(tree, n);
      const row = { id: n.id, name: n.name, row: n.r, learnAt: l?.at ?? null, skill: l?.name ?? null, buy, take,
        blocked: !!l && buy != null && l.at > buy };
      if (row.blocked) cls.blocked.nodes++;
      if (n.t === 'c') {
        row.opts = n.opts.map(o => {
          const ol = T.nodeLearn(n, o.k);
          const ot = takeLevel(tree, n, o.k);
          // una opción cuenta aparte si su nivel llega después que el del nodo (la otra ya sirve)
          const blocked = !!ol && buy != null && ol.at > Math.max(buy, l?.at ?? 0);
          if (blocked) cls.blocked.opts++;
          return { k: o.k, name: o.name, learnAt: ol?.at ?? null, skill: ol?.name ?? null, take: ot, blocked };
        });
      }
      rows.push(row);
    }
    cls.trees.push({ key: tree.key, name: tree.name, which: tree.which, first: firstLevel(tree), nodes: rows });
  }
  report.push(cls);
}

if (asJson) { console.log(JSON.stringify(report, null, 1)); process.exit(0); }
for (const cls of report) {
  console.log(`\n=== ${cls.classId} · bloqueados: ${cls.blocked.nodes} nodos y ${cls.blocked.opts} opciones (learnAt después del nivel de compra)`);
  for (const t of cls.trees) {
    console.log(`\n-- ${t.name} (${t.which === 'cls' ? 'clase' : 'especialización'}; primer punto Nv${t.first})`);
    console.log('   nodo                                   fila  learnAt  compra  se toma');
    for (const r of t.nodes) {
      if (r.free) { if (!onlyBlocked) console.log(`   ${`${r.id} ${r.name}`.padEnd(38)} ${String(r.row).padStart(3)}   (clave gratis)`); continue; }
      const anyOpt = (r.opts || []).some(o => o.blocked);
      if (!onlyBlocked || r.blocked || anyOpt) {
        console.log(`${r.blocked ? ' ! ' : '   '}${`${r.id} ${r.name}`.padEnd(38)} ${String(r.row).padStart(3)}  ${fmt(r.learnAt).padStart(6)}  ${fmt(r.buy).padStart(6)}  ${fmt(r.take).padStart(6)}${r.skill ? `  (${r.skill})` : ''}`);
        for (const o of r.opts || []) {
          if (onlyBlocked && !o.blocked) continue;
          console.log(`${o.blocked ? ' ! ' : '   '}   ${`${o.k}: ${o.name}`.padEnd(35)}      ${fmt(o.learnAt).padStart(6)}          ${fmt(o.take).padStart(6)}${o.skill ? `  (${o.skill})` : ''}`);
        }
      }
    }
  }
}
