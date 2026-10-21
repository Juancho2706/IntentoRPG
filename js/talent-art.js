// ============================================================
// ARTE PROPIO DE LOS NODOS DE TALENTO (Paso 2 · 2g; Codex, 2026-10-21)
// ============================================================
// Nodos con icono propio en assets/talents2g/<clase>-<árbol>-<nodo>.webp. Manda sobre node.icon,
// que en muchos nodos era un icono compartido con otro. Clave '<árbol>:<nodo>': árbol = 'clase',
// el id de la especialización o el del árbol héroe. Lista generada por
// IntentoRPG-assets/raw/_lotes/integrar.py (no editar a mano).
export const TALENT_ART = {
  arquera: new Set([
    'clase:c18', 'francotiradora:f20', 'francotiradora:f21', 'francotiradora:f22', 'francotiradora:f23',
    'francotiradora:f24', 'francotiradora:f27', 'francotiradora:f28', 'francotiradora:f6', 'francotiradora:f7',
    'h1:q0', 'h1:q1', 'h1:q10', 'h1:q11', 'h1:q12', 'h1:q2', 'h1:q3', 'h1:q4', 'h1:q5', 'h1:q6', 'h1:q7', 'h1:q8',
    'h1:q9', 'h2:w0', 'h2:w1', 'h2:w10', 'h2:w11', 'h2:w12', 'h2:w2', 'h2:w3', 'h2:w4', 'h2:w5', 'h2:w6', 'h2:w7',
    'h2:w8', 'h3:y0', 'h3:y1', 'h3:y10', 'h3:y11', 'h3:y12', 'h3:y2', 'h3:y3', 'h3:y4', 'h3:y5', 'h3:y6', 'h3:y7',
    'h3:y8', 'h3:y9', 'montaraz:m14', 'montaraz:m15', 'montaraz:m18', 'montaraz:m21', 'montaraz:m22', 'montaraz:m24',
    'montaraz:m25', 'montaraz:m26', 'montaraz:m27', 'montaraz:m28', 'tiradora:v1', 'tiradora:v15', 'tiradora:v16',
    'tiradora:v17', 'tiradora:v19', 'tiradora:v20', 'tiradora:v22', 'tiradora:v23', 'tiradora:v24', 'tiradora:v26',
    'tiradora:v28', 'tiradora:v7'
  ]),
  guerrero: new Set([
    'berserker:b24', 'berserker:b3', 'clase:c28', 'clase:c29', 'clase:c30', 'cruzado:z14', 'cruzado:z18',
    'cruzado:z21', 'cruzado:z23', 'cruzado:z24', 'cruzado:z25', 'cruzado:z26', 'cruzado:z27', 'guardian:d19',
    'guardian:d21', 'guardian:d22', 'guardian:d23', 'guardian:d24', 'guardian:d26', 'guardian:d28', 'guardian:d9',
    'h1:t0', 'h1:t1', 'h1:t10', 'h1:t11', 'h1:t2', 'h1:t3', 'h1:t4', 'h1:t5', 'h1:t6', 'h1:t8', 'h1:t9', 'h2:l0',
    'h2:l1', 'h2:l10', 'h2:l11', 'h2:l12', 'h2:l2', 'h2:l3', 'h2:l4', 'h2:l5', 'h2:l6', 'h2:l7', 'h2:l8', 'h2:l9',
    'h3:u10', 'h3:u11', 'h3:u12', 'h3:u2', 'h3:u3', 'h3:u4', 'h3:u5', 'h3:u6', 'h3:u7', 'h3:u8', 'h3:u9'
  ]),
  maga: new Set([
    'arcanista:a10', 'arcanista:a14', 'arcanista:a15', 'arcanista:a17', 'arcanista:a18', 'arcanista:a19',
    'arcanista:a20', 'arcanista:a21', 'arcanista:a23', 'arcanista:a24', 'arcanista:a25', 'arcanista:a27',
    'arcanista:a28', 'arcanista:a3', 'arcanista:a9', 'clase:c13', 'clase:c14', 'clase:c17', 'clase:c18', 'clase:c22',
    'clase:c23', 'clase:c24', 'clase:c25', 'clase:c29', 'crionte:i1', 'crionte:i18', 'crionte:i19', 'crionte:i2',
    'crionte:i20', 'crionte:i21', 'crionte:i23', 'crionte:i24', 'crionte:i25', 'crionte:i28', 'crionte:i3',
    'crionte:i8', 'crono:t0', 'crono:t10', 'crono:t11', 'crono:t12', 'crono:t2', 'crono:t3', 'crono:t4', 'crono:t5',
    'crono:t6', 'crono:t7', 'crono:t8', 'crono:t9', 'escriba:e0', 'escriba:e1', 'escriba:e10', 'escriba:e11',
    'escriba:e12', 'escriba:e2', 'escriba:e3', 'escriba:e4', 'escriba:e5', 'escriba:e6', 'escriba:e7', 'escriba:e8',
    'escriba:e9', 'invoca:f0', 'invoca:f1', 'invoca:f10', 'invoca:f11', 'invoca:f12', 'invoca:f2', 'invoca:f3',
    'invoca:f4', 'invoca:f5', 'invoca:f6', 'invoca:f7', 'invoca:f8', 'invoca:f9', 'piromante:s13', 'piromante:s18',
    'piromante:s19', 'piromante:s21', 'piromante:s22', 'piromante:s24', 'piromante:s28', 'piromante:s5',
    'piromante:s6'
  ]),
};
// ruta del arte propio de un nodo, o null
export function talentArtPath(classId, tree, nodeId) {
  return TALENT_ART[classId]?.has(`${tree}:${nodeId}`) ? `talents2g/${classId}-${tree}-${nodeId}.webp` : null;
}
