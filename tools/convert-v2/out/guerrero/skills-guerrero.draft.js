// ============================================================
// CATÁLOGO 2g de la clase Guerrero — BORRADOR para KA (no lo carga el juego)
// ============================================================
// Generado por tools/convert-v2/convert.mjs (--draft) desde docs/mockups/data/talents-v2-guerrero.js (sha1 966148bcbff2, estado «diseño»).
// Formato: docs/paso2-implementacion.md §3.5 (forja de 2f §2.3). Ids, cat, req, spec, elem, nombres, líneas y papeles
// exactos (los compara tests/test-v2-paridad.mjs cuando <CLASE>_CATALOG_V = 2). Los efectos se escriben a mano desde
// el `k` del mockup (en comentario) y el documento de la clase. Encima de cada habilidad que ya existe, su definición actual.
// Las 3 activas de talento viven en talents-guerrero.js (GUERRERO_TALENT_SKILLS): g_t_aliento, grito_guerra, g_t_intervencion.
export const GUERRERO_SKILLS = [
  // juego actual: { id: 'g_tajo', name: 'Tajo', icon: '⚔️', cat: 'basic', slots: ['lmb'], tags: ['basic', 'melee', 'area', 'physical'], elem: 'physical', type: 'weapon', req: 1, coef: 1, gen: 10, genPerExtra: 2, genMax: 16, cleave: 0.5, cleaveR: 2, desc: 'Corta al objetivo (100 % del arma) y a los enemigos pegados a él, a 2 m o menos (50 %). Genera 10 de Furia, +2 por cada enemigo extra (máx. 16).' }
  { id: 'g_tajo', name: 'Tajo', icon: '⚔️', cat: 'basic', req: 1, elem: 'physical', coef: 1, gen: 10, line: 'Cortas al objetivo y al que está pegado a él (50 %). Te da 10 de Furia, +2 por cada enemigo extra.', art: 'skills256/g_tajo.webp', todo: 'KA1: tipo genérico, verbos (§3.6) y números desde el doc de la clase' },
  // juego actual: { id: 'g_hendidura', name: 'Hendidura', icon: '🪓', cat: 'spender', slots: ['rmb', 'k2'], tags: ['spender', 'melee', 'cone', 'physical'], elem: 'physical', type: 'cone', req: 8, coef: 2.9, cost: 27, radius: 4.5, angle: 120, windup: 0.12, desc: 'Tajo frontal pesado (preparación de 0,12 s): 290 % del arma a todo lo que haya en un cono de 120° y 4,5 m. Cuesta 27 de Furia.' }
  { id: 'g_hendidura', name: 'Hendidura', icon: '🪓', cat: 'spender', req: 2, elem: 'physical', coef: 2.9, cost: 27, line: 'Golpe frontal pesado en un cono de 120° y 4,5 m. Se prepara 0,25 s: la esquiva lo cancela sin gastar Furia.', art: 'skills256/g_hendidura.webp', todo: 'KA1: tipo genérico, verbos (§3.6) y números desde el doc de la clase' },
  // juego actual: { id: 'embestida', name: 'Embestida', icon: '💨', cat: 'movement', slots: ['k1'], tags: ['movement', 'melee', 'area', 'physical'], elem: 'physical', type: 'dash', req: 4, coef: 1.2, cd: 8, range: 7, radius: 1.9, lockT: 0.25, genOnHit: 12, desc: 'Embistes hasta 7 m hacia la mira: al llegar haces 120 % del arma a todos en 1,9 m y, si golpeas a alguno, ganas 12 de Furia. Enfriamiento 8 s.' }
  { id: 'embestida', name: 'Embestida', icon: '💨', cat: 'movement', req: 4, elem: 'physical', coef: 1.2, cd: 8, line: 'Embistes 7 m hacia la mira y golpeas al llegar (120 % a 1,9 m). Si golpeas, ganas 12 de Furia.', art: 'skills256/embestida.webp', todo: 'KA1: tipo genérico, verbos (§3.6) y números desde el doc de la clase' },
  // juego actual: { id: 'g_piel', name: 'Piel de Hierro', icon: '🛡️', cat: 'defense', slots: ['k2'], tags: ['defense', 'buff', 'physical'], elem: 'physical', type: 'buff', req: 6, cd: 20, dur: 12, buff: { dr: 50 }, slowImmune: true, desc: 'Tu piel se vuelve de acero 12 s: −50 % de daño recibido (reducción de daño, tope 50 %) e inmunidad a las ralentizaciones. Enfriamiento 20 s.' }
  { id: 'g_piel', name: 'Piel de Hierro', icon: '🛡️', cat: 'defense', req: 6, elem: 'physical', cd: 20, line: 'Durante 8 s recibes un 40 % menos de daño y no te pueden ralentizar.', art: 'skills256/g_piel.webp', todo: 'KA1: tipo genérico, verbos (§3.6) y números desde el doc de la clase' },
  // juego actual: { id: 'g_lanza', name: 'Lanza Arrojadiza', icon: '🎯', cat: 'spender', slots: ['rmb', 'k2'], tags: ['spender', 'proj', 'physical'], elem: 'physical', type: 'proj', req: 14, coef: 1.9, cost: 20, speed: 16, range: 11, pierce: true, lockT: 0.3, desc: 'Arrojas una lanza que atraviesa a todos los enemigos en 11 m: 190 % del arma a cada uno. Tu respuesta a voladores y lanzadores. Cuesta 20 de Furia.' }
  { id: 'g_lanza', name: 'Lanza Arrojadiza', icon: '🎯', cat: 'spender', req: 8, elem: 'physical', coef: 1.9, cost: 20, line: 'Arrojas una lanza que atraviesa a todos en 11 m (190 %). Tu respuesta a voladores y lanzadores.', art: 'skills256/g_lanza.webp', todo: 'KA1: tipo genérico, verbos (§3.6) y números desde el doc de la clase' },
  // NUEVA en 2g con este id; en el juego hay una parecida: { id: 'g_t_remolino', name: 'Remolino Sangriento', icon: '🌪️', kind: 'talent', cat: 'spec', slots: ['k3'], tags: ['spec', 'melee', 'area', 'dot', 'physical'], elem: 'physical', behavior: 'g_t_remolino', req: 10, coef: 0.57, cost: 30, cd: 6, channelT: 2, ticks: 10, radius: 2.9, dotKind: 'bleed', moveFree: true, color: 13378082, desc: 'Insignia del Berserker: giras 2 s a velocidad normal golpeando 10 veces a todo lo que hay a 2,9 m (57 % del arma por golpe, 570 % en total) y lo desangras. Cuesta 30 de Furia; enfriamiento 6 s.' }
  { id: 'g_remolino', name: 'Remolino Sangriento', icon: '✦', cat: 'spec', req: 10, spec: 'berserker', elem: 'physical', coef: 0.45, cost: 30, cd: 6, line: 'Mantén para girar hasta 3 s sin dejar de moverte: golpeas a 2,9 m 4 veces por segundo (45 %) y desangras.', art: 'skills256/torbellino.webp', todo: 'KA1: tipo genérico, verbos (§3.6) y números desde el doc de la clase' },
  // juego actual: { id: 'g_salto', name: 'Salto Devastador', icon: '🦶', cat: 'movement', slots: ['k1'], tags: ['movement', 'area', 'cc', 'physical'], elem: 'physical', type: 'leap', req: 12, coef: 1.8, cd: 12, radius: 3.2, range: 8, airT: 0.45, slow: 2, slowPct: 40, shake: 0.4, desc: 'Saltas hasta 8 m al punto elegido (0,45 s en el aire, intocable) y al caer haces 180 % del arma en 3,2 m y ralentizas un 40 % durante 2 s. Enfriamiento 12 s.' }
  { id: 'g_salto', name: 'Salto Devastador', icon: '🦶', cat: 'movement', req: 12, spec: 'berserker', elem: 'physical', coef: 1.5, cd: 12, line: 'Saltas hasta 8 m y golpeas al caer (150 % a 3 m). Si golpeas, puedes volver a saltar en 2 s (hasta 3 saltos).', art: 'skills256/g_salto.webp', todo: 'KA1: tipo genérico, verbos (§3.6) y números desde el doc de la clase' },
  // NUEVA en 2g (no existe en el juego)
  { id: 'g_rajar', name: 'Rajar', icon: '✦', cat: 'spender', req: 14, spec: 'berserker', elem: 'physical', coef: 1.4, cost: 15, line: 'Combo de 3: tajo, revés y un golpe descendente (320 %) que se prepara 0,3 s y desangra. Si paras 2,5 s, vuelve al 1.º.', art: 'talents/guerrero-berserker-s7.webp', todo: 'KA1: tipo genérico, verbos (§3.6) y números desde el doc de la clase' },
  // juego actual: { id: 'g_u_furia', name: 'Furia Inmortal', icon: '😤', cat: 'ultimate', slots: ['k4'], tags: ['ultimate', 'buff', 'physical'], elem: 'physical', type: 'buff', req: 15, cd: 60, dur: 10, buff: { aspdPct: 30, spenderCostPct: -100 }, unstoppable: true, slowImmune: true, desc: 'Definitiva: 10 s de furia sin límite: tus gastadoras no cuestan Furia, +30 % de velocidad de ataque y eres imparable (inmune a control e interrupciones). Enfriamiento 60 s.' }
  { id: 'g_u_furia', name: 'Furia Inmortal', icon: '😤', cat: 'ultimate', req: 15, spec: 'berserker', elem: 'physical', cd: 60, line: '10 s imparable: tu vida no baja del 1 % y tus principales no cuestan Furia. Al acabar, te curas un 20 %.', art: 'skills256/g_u_furia.webp', todo: 'KA1: tipo genérico, verbos (§3.6) y números desde el doc de la clase' },
];

// Forja: ids estables <id>_i / <id>_ii; papeles UNI · AREA · CTRL · AGU · APO · MOV; Mejora a Nv req+3, variantes a req+6
export const GUERRERO_SKILL_FORGE = {
  g_tajo: {
    // k: ★add{cleave:+.15, cleaveR:+.5}
    mejora: { name: 'Filo Ancho', icon: 'forge/mejora', line: 'Salpicadura 50 → 65 % y alcance 2 → 2,5 m.' },
    vars: [
      // k: hitDot bleed .6/3s · ★add{cleave:−.2}
      { id: 'g_tajo_i', name: 'Desgarro', role: 'UNI', icon: 'forge/v_g_tajo_i', line: 'El objetivo sangra el 60 % del golpe en 3 s; salpicadura 30 %.' },
      // k: ★set{cleave:.75, cleaveR:3} · dmg −15 (absorbe a Embate)
      { id: 'g_tajo_ii', name: 'Siega', role: 'AREA', icon: 'forge/v_g_tajo_ii', line: 'Barrido de 3 m a todos al 75 %; el principal, al 85 %.' },
    ],
  },
  g_hendidura: {
    // k: ★set{angle:150}
    mejora: { name: 'Arco Amplio', icon: 'forge/mejora', line: 'Cono 120 → 150°.' },
    vars: [
      // k: ★power v_rompefilas (condAdd)
      { id: 'g_hendidura_i', name: 'Rompefilas', role: 'UNI', icon: 'forge/v_g_hendidura_i', line: '+45 % de daño si golpea a un único enemigo.' },
      // k: zone · zoneDur 2 · ★add{zoneMax:1}
      { id: 'g_hendidura_ii', name: 'Grieta', role: 'AREA', icon: 'forge/v_g_hendidura_ii', line: 'Deja una grieta 2 s que hace el 40 % por segundo; solo 1 a la vez.' },
    ],
  },
  embestida: {
    // k: range +28 · ★add{genOnHit:4}
    mejora: { name: 'Carga Fiera', icon: 'forge/mejora', line: 'Alcance 7 → 9 m y +4 de Furia si golpea.' },
    vars: [
      // k: ★power v_carnero · stun .5
      { id: 'embestida_i', name: 'Carnero', role: 'CTRL', icon: 'forge/v_embestida_i', line: 'Arrastras a los que encuentras y los aturdes 0,5 s.' },
      // k: ★charges 2
      { id: 'embestida_ii', name: 'Doble Carga', role: 'MOV', icon: 'forge/v_embestida_ii', line: '2 cargas (8 s cada una).' },
    ],
  },
  g_piel: {
    // k: ★power v_temple (onCast g.heal)
    mejora: { name: 'Acero Templado', icon: 'forge/mejora', line: 'Al activarla te curas el 8 % de la vida.' },
    vars: [
      // k: ★power v_espinas (onDamaged)
      { id: 'g_piel_i', name: 'Espinas', role: 'AREA', icon: 'forge/v_g_piel_i', line: 'Mientras dura, devuelves el 40 % del daño cuerpo a cuerpo que recibes.' },
      // k: durS 2 · ★set{unstoppable:true} · cdr −25 (antes «Bastión», nombre de la barra del Guardián)
      { id: 'g_piel_ii', name: 'Inamovible', role: 'AGU', icon: 'forge/v_g_piel_ii', line: 'Dura 10 s y te vuelve imparable; se recarga en 25 s.' },
    ],
  },
  g_lanza: {
    // k: slow 2 · slowPct 30
    mejora: { name: 'Punta de Arpón', icon: 'forge/mejora', line: 'Los golpeados se ralentizan un 30 % durante 2 s.' },
    vars: [
      // k: ★pull 4 · ★set{pierce:false} · dmg +30
      { id: 'g_lanza_i', name: 'Arpón', role: 'CTRL', icon: 'forge/v_g_lanza_i', line: 'El primero que golpea es arrastrado 4 m hacia ti (+30 %).' },
      // k: ★set{count:3, spread:.25} · dmg −30
      { id: 'g_lanza_ii', name: 'Jabalinas', role: 'AREA', icon: 'forge/v_g_lanza_ii', line: '3 lanzas en abanico al 70 %.' },
    ],
  },
  g_remolino: {
    // k: ★set{slowImmune:true}
    mejora: { name: 'Giro Firme', icon: 'forge/mejora', line: 'Mientras giras no te pueden ralentizar.' },
    vars: [
      // k: ★set{moveFree:false, radius:2} · dmg +60
      { id: 'g_remolino_i', name: 'Remolino Anclado', role: 'UNI', icon: 'forge/v_g_remolino_i', line: 'Giras sin moverte: radio 2 m y +60 % de daño.' },
      // k: ★pull 1/tic (r 5) · dmg −15
      { id: 'g_remolino_ii', name: 'Ciclón', role: 'CTRL', icon: 'forge/v_g_remolino_ii', line: 'Cada giro atrae 1 m a los enemigos a 5 m; −15 % de daño.' },
    ],
  },
  g_salto: {
    // k: radius +33
    mejora: { name: 'Caída Pesada', icon: 'forge/mejora', line: 'Radio de la caída 3 → 4 m.' },
    vars: [
      // k: ★set{recast:0} · ★pull 2 · stun .75 (antes «Impacto Sísmico»: nombre de un nodo de la Maga)
      { id: 'g_salto_i', name: 'Caída Atronadora', role: 'CTRL', icon: 'forge/v_g_salto_i', line: 'Un solo salto: al caer atraes 2 m y aturdes 0,75 s a todos.' },
      // k: ★set{range:12, airT:.25} · dmg −20
      { id: 'g_salto_ii', name: 'Salto Rasante', role: 'MOV', icon: 'forge/v_g_salto_ii', line: 'Saltas 12 m, bajo y rápido (0,25 s en el aire); −20 % de daño.' },
    ],
  },
  g_rajar: {
    // k: ★set{comboWin:4}
    mejora: { name: 'Filo Encadenado', icon: 'forge/mejora', line: 'El combo espera 4 s (antes 2,5 s).' },
    vars: [
      // k: ★set{steps[2]:{type:line, range:5, width:1}} · dmg3 +40
      { id: 'g_rajar_i', name: 'Estocada Final', role: 'UNI', icon: 'forge/v_g_rajar_i', line: 'El 3.er golpe es una estocada de 5 m en línea: +40 % y sin área.' },
      // k: ★set{steps:*{type:area, at:self, radius:2.5}} · dmg −20
      { id: 'g_rajar_ii', name: 'Molino', role: 'AREA', icon: 'forge/v_g_rajar_ii', line: 'Los tres golpes son giros de 2,5 m a tu alrededor; −20 % de daño.' },
    ],
  },
  g_u_furia: {
    // k: durS 2
    mejora: { name: 'Sin Freno', icon: 'forge/mejora', line: 'Dura 10 → 12 s.' },
    vars: [
      // k: ★power v_sed_voraz (sustain) · endHeal 0
      { id: 'g_u_furia_i', name: 'Sed Voraz', role: 'AGU', icon: 'forge/v_g_u_furia_i', line: 'Mientras dura, robas el 8 % del daño como vida; al acabar no te curas.' },
      // k: buff aspdPct +40 · ★set{minHpPct:0}
      { id: 'g_u_furia_ii', name: 'Frenesí', role: 'UNI', icon: 'forge/v_g_u_furia_ii', line: '+40 % de velocidad de ataque, pero tu vida sí puede bajar del 1 %.' },
    ],
  },
};

// Barra, forja ('i'/'ii'; el mockup usa 'A'/'B') y habilidad seleccionada al elegir la especialización (D6)
export const GUERRERO_SPEC_BAR = {
  berserker: { bar: { lmb: 'g_tajo', rmb: 'g_rajar', k1: 'g_salto', k2: 'g_piel', k3: 'g_remolino', k4: 'g_u_furia' }, forge: { g_tajo: 'i', g_remolino: 'ii' }, sel: 'g_rajar' },
  guardian: { bar: { lmb: 'g_tajo', rmb: 'g_hendidura', k1: 'embestida', k2: 'g_lanza', k3: null, k4: null }, forge: {}, sel: 'g_hendidura' },
  cruzado: { bar: { lmb: 'g_tajo', rmb: 'g_hendidura', k1: 'embestida', k2: 'g_piel', k3: null, k4: null }, forge: {}, sel: 'g_hendidura' },
};
export const GUERRERO_FORGE_RECO = {
  berserker: { g_tajo: 'i', g_remolino: 'ii', g_u_furia: 'i' },
};
export const GUERRERO_FALLBACK_BAR = { lmb: 'g_tajo', rmb: 'g_hendidura', k1: 'embestida', k2: 'g_piel', k3: null, k4: null };
export const GUERRERO_CATALOG_V = 2;
