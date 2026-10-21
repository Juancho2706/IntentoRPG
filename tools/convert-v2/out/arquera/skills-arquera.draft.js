// ============================================================
// CATÁLOGO 2g de la clase Arquera — BORRADOR para KA (no lo carga el juego)
// ============================================================
// Generado por tools/convert-v2/convert.mjs (--draft) desde docs/mockups/data/talents-v2-arquera.js (sha1 db6e09d7abe7, estado «diseño»).
// Formato: docs/paso2-implementacion.md §3.5 (forja de 2f §2.3). Ids, cat, req, spec, elem, nombres, líneas y papeles
// exactos (los compara tests/test-v2-paridad.mjs cuando <CLASE>_CATALOG_V = 2). Los efectos se escriben a mano desde
// el `k` del mockup (en comentario) y el documento de la clase. Encima de cada habilidad que ya existe, su definición actual.
// Las 3 activas de talento viven en talents-arquera.js (ARQUERA_TALENT_SKILLS): a_t_camuflaje, agilidad, a_t_bengala.
export const ARQUERA_SKILLS = [
  // juego actual: { id: 'a_disparo', name: 'Disparo Rápido', icon: '🏹', cat: 'basic', slots: ['lmb'], tags: ['basic', 'proj', 'physical'], elem: 'physical', type: 'weapon', req: 1, coef: 1, gen: 5, desc: 'Dispara una flecha veloz (100 % del daño del arma). Al acertar recupera 5 de Energía.' }
  { id: 'a_disparo', name: 'Disparo Rápido', icon: '🏹', cat: 'basic', req: 1, elem: 'physical', coef: 1, gen: 5, line: 'Dispara una flecha veloz (100 % del arma). Cada acierto te devuelve 5 de Energía.', innate: { tiradora: 'Tiradora: cada 3.er disparo, 2 flechas más' }, art: 'skills256/a_disparo.webp', todo: 'KA1: tipo genérico, verbos (§3.6) y números desde el doc de la clase' },
  // juego actual: { id: 'flecha_perforante', name: 'Flecha Perforante', icon: '➶', cat: 'spender', slots: ['rmb', 'k2'], tags: ['spender', 'proj', 'physical'], elem: 'physical', type: 'proj', req: 2, coef: 2.4, cost: 26, cd: 0, speed: 17, range: 13, pierce: true, lockT: 0.35, color: 16777164, desc: 'Una flecha pesada (240 % del arma) que atraviesa a todos los enemigos en su camino. 26 de Energía, sin enfriamiento.' }
  { id: 'flecha_perforante', name: 'Flecha Perforante', icon: '➶', cat: 'spender', req: 2, elem: 'physical', coef: 2.4, cost: 26, line: 'Una flecha pesada (240 %) que atraviesa a todos los enemigos en línea. Cuesta 26 de Energía.', art: 'skills256/flecha_perforante.webp', todo: 'KA1: tipo genérico, verbos (§3.6) y números desde el doc de la clase' },
  // juego actual: { id: 'a_paso', name: 'Paso Veloz', icon: '👣', cat: 'movement', slots: ['k1'], tags: ['movement', 'physical'], elem: 'physical', behavior: 'a_paso', req: 4, cd: 9, range: 6, rollT: 0.2, lockT: 0.2, dur: 3, buff: { aspdPct: 20 }, desc: 'Ruedas 6 m en la dirección en que te mueves (o hacia el cursor) y ganas +20 % de velocidad de ataque durante 3 s. Enfriamiento 9 s.' }
  { id: 'a_paso', name: 'Paso Veloz', icon: '👣', cat: 'movement', req: 4, elem: 'physical', cd: 9, line: 'Ruedas 6 m hacia donde te mueves y ganas +20 % de velocidad de ataque durante 3 s.', art: 'skills256/a_paso.webp', todo: 'KA1: tipo genérico, verbos (§3.6) y números desde el doc de la clase' },
  // juego actual: { id: 'a_humo', name: 'Bomba de Humo', icon: '💨', cat: 'defense', slots: ['k2'], tags: ['defense', 'zone', 'physical'], elem: 'physical', type: 'zone', behavior: 'a_humo', at: 'self', req: 12, cd: 16, radius: 4, dur: 8, allyDr: 50, projMissPct: 50, blindPct: 30, color: 10133672, desc: 'Una nube de humo de 4 m a tus pies durante 8 s: dentro recibes −50 % de daño, la mitad de los proyectiles enemigos que la cruzan se pierden y los enemigos dentro, cegados, hacen −30 % de daño. Enfriamiento 16 s.' }
  { id: 'a_humo', name: 'Bomba de Humo', icon: '💨', cat: 'defense', req: 6, elem: 'physical', cd: 16, line: 'Nube de 4 m durante 8 s: dentro recibes un 50 % menos de daño y los enemigos, cegados, pegan un 30 % menos.', art: 'skills256/a_humo.webp', todo: 'KA1: tipo genérico, verbos (§3.6) y números desde el doc de la clase' },
  // juego actual: { id: 'lluvia_flechas', name: 'Lluvia de Flechas', icon: '🌧️', cat: 'spender', slots: ['rmb', 'k2'], tags: ['spender', 'area', 'physical'], elem: 'physical', behavior: 'a_lluvia', at: 'target', req: 14, coef: 0.6, waves: 4, span: 1.2, cost: 30, cd: 4, radius: 3, range: 11, impactDelay: 0.3, color: 11206570, desc: 'Tras 0,3 s de aviso, 4 oleadas de flechas caen en 1,5 s sobre un círculo de 3 m (60 % del arma cada una: 240 % en total). 30 de Energía, enfriamiento 4 s.' }
  { id: 'lluvia_flechas', name: 'Lluvia de Flechas', icon: '🌧️', cat: 'spender', req: 8, elem: 'physical', coef: 0.6, cost: 30, cd: 4, line: 'Tras 0,3 s de aviso, caen 4 oleadas de flechas en un círculo de 3 m (60 % cada una).', art: 'skills256/lluvia_flechas.webp', todo: 'KA1: tipo genérico, verbos (§3.6) y números desde el doc de la clase' },
  // juego actual: { id: 'a_t_andanada', name: 'Andanada', icon: '🎇', kind: 'talent', cat: 'spec', slots: ['k3'], tags: ['spec', 'proj', 'area', 'movement', 'physical'], elem: 'physical', type: 'proj', behavior: 'a_t_andanada', req: 10, coef: 0.6, cost: 25, cd: 6, count: 12, spread: 1.047, speed: 18, range: 10, lockT: 0.35, backstep: 3, color: 6739911, desc: 'Insignia de la Tiradora: barres un arco de 120° con 12 flechas (60 % del arma cada una) mientras retrocedes 3 m. Cuesta 25 de Energía; enfriamiento 6 s.' }
  { id: 'a_t_andanada', name: 'Andanada', icon: '🎇', cat: 'spec', req: 10, spec: 'tiradora', elem: 'physical', coef: 0.55, cost: 25, cd: 8, line: 'Saltas 4 m atrás y disparas 10 flechas en 120° (55 % cada una). En 2 s, pulsa otra vez: saltas adelante y repites.', art: 'talents/arquera-tiradora-s4.webp', todo: 'KA1: tipo genérico, verbos (§3.6) y números desde el doc de la clase' },
  // NUEVA en 2g (no existe en el juego)
  { id: 'a_v_carrera', name: 'Carrera del Viento', icon: '✦', cat: 'movement', req: 12, spec: 'tiradora', elem: 'physical', coef: 0.45, cd: 10, line: 'Mantén pulsado: corres un 40 % más rápido hasta 4 s y disparas sola al enemigo más cercano cada 0,4 s (45 %).', art: 'talents/arquera-tiradora-s9.webp', todo: 'KA1: tipo genérico, verbos (§3.6) y números desde el doc de la clase' },
  // juego actual: { id: 'flecha_multiple', name: 'Flecha Múltiple', icon: '🔱', cat: 'spender', slots: ['rmb', 'k2'], tags: ['spender', 'proj', 'area', 'physical'], elem: 'physical', type: 'proj', req: 8, coef: 0.39, cost: 22, cd: 0, speed: 15, range: 10, count: 5, spread: 0.436, lockT: 0.35, color: 13426090, desc: 'Dispara 5 flechas en un abanico de 50° (39 % del arma cada una; ≈78 % a un objetivo pegado). 22 de Energía, sin enfriamiento.' }
  { id: 'flecha_multiple', name: 'Flecha Múltiple', icon: '🔱', cat: 'spender', req: 14, spec: 'tiradora', elem: 'physical', coef: 0.39, cost: 22, line: 'Disparas 5 flechas en un abanico de 50° (39 % cada una). No te frena: úsala corriendo.', art: 'skills256/flecha_multiple.webp', todo: 'KA1: tipo genérico, verbos (§3.6) y números desde el doc de la clase' },
  // juego actual: { id: 'a_u_diluvio', name: 'Diluvio de Saetas', icon: '🌠', cat: 'ultimate', slots: ['k4'], tags: ['ultimate', 'area', 'physical'], elem: 'physical', behavior: 'a_diluvio', at: 'target', req: 15, coef: 2.73, waves: 8, span: 3.6, cd: 50, radius: 5, range: 12, windup: 0.15, impactDelay: 0.4, shake: 0.18, color: 12582847, desc: 'Definitiva: tras una telegrafía, 8 oleadas de saetas arrasan un círculo de 5 m durante 4 s (273 % del arma cada una: 2184 % por objetivo). Enfriamiento 50 s.' }
  { id: 'a_u_diluvio', name: 'Diluvio de Saetas', icon: '🌠', cat: 'ultimate', req: 15, spec: 'tiradora', elem: 'physical', coef: 1.7, cd: 50, line: 'Una nube de saetas te sigue 6 s y cada 0,5 s descarga en 4 m a tu alrededor (170 % por oleada).', art: 'skills256/a_u_diluvio.webp', todo: 'KA1: tipo genérico, verbos (§3.6) y números desde el doc de la clase' },
];

// Forja: ids estables <id>_i / <id>_ii; papeles UNI · AREA · CTRL · AGU · APO · MOV; Mejora a Nv req+3, variantes a req+6
export const ARQUERA_SKILL_FORGE = {
  a_disparo: {
    // k: ★set{cadence:.9}
    mejora: { name: 'Mano Rápida', icon: 'forge/mejora', line: 'Disparas un 10 % más rápido.' },
    vars: [
      // k: ★set{count:3, spread:.218, coef:.45} (absorbe a Disparo Disperso)
      { id: 'a_disparo_i', name: 'Disparo Disperso', role: 'AREA', icon: 'forge/v_a_disparo_i', line: '3 flechas en abanico de 25° (45 % cada una).' },
      // k: ★elem nature · coef .7 · hitDot poison .5/4 s (absorbe a Flecha de Cicuta)
      { id: 'a_disparo_ii', name: 'Flecha de Cicuta', role: 'UNI', icon: 'forge/v_a_disparo_ii', line: 'Se vuelve de Naturaleza: 70 % y veneno del 50 % en 4 s, que se suma.' },
    ],
  },
  flecha_perforante: {
    // k: range +15 · ★add{speed:+20%}
    mejora: { name: 'Astil de Fresno', icon: 'forge/mejora', line: '+2 m de alcance y +20 % de velocidad de la flecha.' },
    vars: [
      // k: ★set{pierce:false} · ★set{splash:.8, radius:3}
      { id: 'flecha_perforante_i', name: 'Flecha Explosiva', role: 'AREA', icon: 'forge/v_flecha_perforante_i', line: 'No atraviesa: explota en 3 m al 80 %.' },
      // k: ★set{windup:.35} · dmg +45
      { id: 'flecha_perforante_ii', name: 'Tiro de Precisión', role: 'UNI', icon: 'forge/v_flecha_perforante_ii', line: 'Preparas 0,35 s (la esquiva la cancela): +45 % de daño.' },
    ],
  },
  a_paso: {
    // k: durS 1
    mejora: { name: 'Ágil', icon: 'forge/mejora', line: 'El bonus dura 3 → 4 s.' },
    vars: [
      // k: ★power v_rodar (afterCast)
      { id: 'a_paso_i', name: 'Rodar y Disparar', role: 'UNI', icon: 'forge/v_a_paso_i', line: 'Al rodar disparas un Disparo Rápido gratis al 150 %.' },
      // k: ★charges 2 · buff 0
      { id: 'a_paso_ii', name: 'Doble Rodada', role: 'MOV', icon: 'forge/v_a_paso_ii', line: '2 cargas (9 s cada una), sin el bonus de ataque.' },
    ],
  },
  a_humo: {
    // k: radius +25
    mejora: { name: 'Humo Espeso', icon: 'forge/mejora', line: 'Radio 4 → 5 m.' },
    vars: [
      // k: dot poison · ★set{coef:.4}
      { id: 'a_humo_i', name: 'Humo Venenoso', role: 'AREA', icon: 'forge/v_a_humo_i', line: 'Dentro, los enemigos sufren veneno del 40 % por segundo.' },
      // k: ★knock 3 · slow 2 · slowPct 40
      { id: 'a_humo_ii', name: 'Estallido de Humo', role: 'CTRL', icon: 'forge/v_a_humo_ii', line: 'Al lanzarla, empuja 3 m a los cercanos y los ralentiza un 40 % 2 s.' },
    ],
  },
  lluvia_flechas: {
    // k: ★add{waves:1}
    mejora: { name: 'Cielo Plomizo', icon: 'forge/mejora', line: '4 → 5 oleadas.' },
    vars: [
      // k: radius −33 · ★set{span:.8} · dmg +40
      { id: 'lluvia_flechas_i', name: 'Aguacero', role: 'UNI', icon: 'forge/v_lluvia_flechas_i', line: 'Radio 2 m, cae en 0,8 s y hace +40 % de daño.' },
      // k: ★set{allyDr:15, projMissPct:50} (zona)
      { id: 'lluvia_flechas_ii', name: 'Cortina', role: 'AGU', icon: 'forge/v_lluvia_flechas_ii', line: 'Dentro, los enemigos pegan un 15 % menos y fallan la mitad de sus proyectiles.' },
    ],
  },
  a_t_andanada: {
    // k: ★set{spread:150°}
    mejora: { name: 'Arco Ancho', icon: 'forge/mejora', line: 'Abanico 120 → 150°.' },
    vars: [
      // k: ★set{spread:30°} · range +3
      { id: 'a_t_andanada_i', name: 'Andanada Cerrada', role: 'UNI', icon: 'forge/v_a_t_andanada_i', line: 'Abanico de 30° y +3 m de alcance: más flechas sobre el mismo enemigo.' },
      // k: ★knock 2 · slow 2 · slowPct 30 · dmg −15
      { id: 'a_t_andanada_ii', name: 'Andanada Repulsora', role: 'CTRL', icon: 'forge/v_a_t_andanada_ii', line: 'Las flechas empujan 2 m y ralentizan un 30 % 2 s; −15 % de daño.' },
    ],
  },
  a_v_carrera: {
    // k: ★set{moveMul:1.55}
    mejora: { name: 'Galope', icon: 'forge/mejora', line: 'Corres un 40 → 55 % más rápido.' },
    vars: [
      // k: ★set{autoShot.every:.6, autoShot.target:maxHp} · dmg +70
      { id: 'a_v_carrera_i', name: 'Carrera Certera', role: 'UNI', icon: 'forge/v_a_v_carrera_i', line: 'Disparas cada 0,6 s al enemigo con más vida; +70 % de daño.' },
      // k: ★set{projMissPct:40} · dmg −30
      { id: 'a_v_carrera_ii', name: 'Carrera Esquiva', role: 'AGU', icon: 'forge/v_a_v_carrera_ii', line: 'Mientras corres, el 40 % de los proyectiles enemigos te fallan; −30 % de daño.' },
    ],
  },
  flecha_multiple: {
    // k: range +30
    mejora: { name: 'Alcance Largo', icon: 'forge/mejora', line: '+3 m de alcance (10 → 13 m).' },
    vars: [
      // k: ★set{count:7, spread:90°, coef:.33}
      { id: 'flecha_multiple_i', name: 'Abanico Abierto', role: 'AREA', icon: 'forge/v_flecha_multiple_i', line: '7 flechas en 90° (33 % cada una).' },
      // k: ★set{count:3, spread:10°, pierce:true, coef:.55}
      { id: 'flecha_multiple_ii', name: 'Haz Cerrado', role: 'UNI', icon: 'forge/v_flecha_multiple_ii', line: '3 flechas juntas en 10° que atraviesan; 55 % cada una.' },
    ],
  },
  a_u_diluvio: {
    // k: radius +25
    mejora: { name: 'Nube Ancha', icon: 'forge/mejora', line: 'Radio 4 → 5 m.' },
    vars: [
      // k: ★set{follow:false, at:target, radius:6}
      { id: 'a_u_diluvio_i', name: 'Diluvio Anclado', role: 'AREA', icon: 'forge/v_a_u_diluvio_i', line: 'Queda fijo donde apuntas, con 6 m de radio.' },
      // k: ★set{waves:4, span:2, radius:1.5, coef:5}
      { id: 'a_u_diluvio_ii', name: 'Saetas Pesadas', role: 'UNI', icon: 'forge/v_a_u_diluvio_ii', line: '4 saetas de 500 % caen sobre tu objetivo en 2 s.' },
    ],
  },
};

// Barra, forja ('i'/'ii'; el mockup usa 'A'/'B') y habilidad seleccionada al elegir la especialización (D6)
export const ARQUERA_SPEC_BAR = {
  tiradora: { bar: { lmb: 'a_disparo', rmb: 'flecha_multiple', k1: 'a_v_carrera', k2: 'a_humo', k3: 'a_t_andanada', k4: 'a_u_diluvio' }, forge: { a_disparo: 'i', flecha_multiple: 'i' }, sel: 'flecha_multiple' },
  francotiradora: { bar: { lmb: 'a_disparo', rmb: 'flecha_perforante', k1: 'a_paso', k2: 'a_humo', k3: null, k4: null }, forge: {}, sel: 'flecha_perforante' },
  montaraz: { bar: { lmb: 'a_disparo', rmb: 'flecha_perforante', k1: 'a_paso', k2: 'lluvia_flechas', k3: null, k4: null }, forge: {}, sel: 'lluvia_flechas' },
};
export const ARQUERA_FORGE_RECO = {
  tiradora: { a_disparo: 'i', flecha_multiple: 'i', a_t_andanada: 'ii', a_v_carrera: 'ii', a_u_diluvio: 'i', a_humo: 'i', a_paso: 'i' },
};
export const ARQUERA_FALLBACK_BAR = { lmb: 'a_disparo', rmb: 'flecha_perforante', k1: 'a_paso', k2: 'a_humo', k3: null, k4: null };
export const ARQUERA_CATALOG_V = 2;
