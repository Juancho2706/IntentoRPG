// ============================================================
// CATÁLOGO 2g de la clase Arquera — BORRADOR para KA (no lo carga el juego)
// ============================================================
// Generado por tools/convert-v2/convert.mjs (--draft) desde docs/mockups/data/talents-v2-arquera.js (sha1 76ae75357a1e, estado «diseño»).
// Formato: docs/paso2-implementacion.md §3.5 (forja de 2f §2.3). Ids, cat, req, spec, elem, nombres, líneas y papeles
// exactos (los compara tests/test-v2-paridad.mjs cuando <CLASE>_CATALOG_V = 2). Los efectos se escriben a mano desde
// el `k` del mockup (en comentario) y el documento de la clase. Encima de cada habilidad que ya existe, su definición actual.
// D29: las 6 activas de talento (kind 'talent', slots ['k2']) van en este catálogo, al final de ARQUERA_SKILLS;
// en talents-arquera.js, ARQUERA_TALENT_SKILLS es solo la lista de ids: a_t_camuflaje, agilidad, a_t_bengala, a_h_torbellino, a_h_puntas, a_h_halcon.
export const ARQUERA_SKILLS = [
  // juego actual: { id: 'a_disparo', name: 'Disparo Rápido', icon: '🏹', cat: 'basic', slots: ['lmb'], tags: ['basic', 'proj', 'physical'], elem: 'physical', type: 'weapon', req: 1, coef: 1, gen: 5, desc: 'Dispara una flecha veloz (100 % del daño del arma). Al acertar recupera 5 de Energía.' }
  { id: 'a_disparo', name: 'Disparo Rápido', icon: '🏹', cat: 'basic', req: 1, elem: 'physical', coef: 1, gen: 5, line: 'Dispara una flecha veloz (100 % del arma). Cada acierto te devuelve 5 de Energía.', innate: { tiradora: 'Tiradora: cada 3.er disparo, 2 flechas más', francotiradora: 'Francotiradora: se puede tensar (mantén)' }, art: 'skills256/a_disparo.webp', todo: 'KA1: tipo genérico, verbos (§3.6) y números desde el doc de la clase' },
  // juego actual: { id: 'flecha_perforante', name: 'Flecha Perforante', icon: '➶', cat: 'spender', slots: ['rmb', 'k2'], tags: ['spender', 'proj', 'physical'], elem: 'physical', type: 'proj', req: 2, coef: 2.4, cost: 26, cd: 0, speed: 17, range: 13, pierce: true, lockT: 0.35, color: 16777164, desc: 'Una flecha pesada (240 % del arma) que atraviesa a todos los enemigos en su camino. 26 de Energía, sin enfriamiento.' }
  { id: 'flecha_perforante', name: 'Flecha Perforante', icon: '➶', cat: 'spender', req: 2, elem: 'physical', coef: 2.4, cost: 26, line: 'Una flecha pesada (240 %) que atraviesa a todos los enemigos en línea. Cuesta 26 de Energía.', art: 'skills256/flecha_perforante.webp', todo: 'KA1: tipo genérico, verbos (§3.6) y números desde el doc de la clase' },
  // juego actual: { id: 'a_paso', name: 'Paso Veloz', icon: '👣', cat: 'movement', slots: ['k1'], tags: ['movement', 'physical'], elem: 'physical', behavior: 'a_paso', req: 4, cd: 9, range: 6, rollT: 0.2, lockT: 0.2, dur: 3, buff: { aspdPct: 20 }, desc: 'Ruedas 6 m en la dirección en que te mueves (o hacia el cursor) y ganas +20 % de velocidad de ataque durante 3 s. Enfriamiento 9 s.' }
  { id: 'a_paso', name: 'Paso Veloz', icon: '👣', cat: 'movement', req: 4, elem: 'physical', cd: 9, line: 'Ruedas 6 m hacia donde te mueves y ganas +20 % de velocidad de ataque durante 3 s.', art: 'skills256/a_paso.webp', todo: 'KA1: tipo genérico, verbos (§3.6) y números desde el doc de la clase' },
  // juego actual: { id: 'a_humo', name: 'Bomba de Humo', icon: '💨', cat: 'defense', slots: ['k2'], tags: ['defense', 'zone', 'physical'], elem: 'physical', type: 'zone', behavior: 'a_humo', at: 'self', req: 12, cd: 16, radius: 4, dur: 8, allyDr: 50, projMissPct: 50, blindPct: 30, color: 10133672, desc: 'Una nube de humo de 4 m a tus pies durante 8 s: dentro recibes −50 % de daño, la mitad de los proyectiles enemigos que la cruzan se pierden y los enemigos dentro, cegados, hacen −30 % de daño. Enfriamiento 16 s.' }
  { id: 'a_humo', name: 'Bomba de Humo', icon: '💨', cat: 'defense', req: 6, elem: 'physical', cd: 16, line: 'Nube de 4 m durante 8 s: dentro recibes un 50 % menos de daño y los cegados pegan un 30 % menos. Recarga al disiparse.', art: 'skills256/a_humo.webp', todo: 'KA1: tipo genérico, verbos (§3.6) y números desde el doc de la clase' },
  // juego actual: { id: 'lluvia_flechas', name: 'Lluvia de Flechas', icon: '🌧️', cat: 'spender', slots: ['rmb', 'k2'], tags: ['spender', 'area', 'physical'], elem: 'physical', behavior: 'a_lluvia', at: 'target', req: 14, coef: 0.6, waves: 4, span: 1.2, cost: 30, cd: 4, radius: 3, range: 11, impactDelay: 0.3, color: 11206570, desc: 'Tras 0,3 s de aviso, 4 oleadas de flechas caen en 1,5 s sobre un círculo de 3 m (60 % del arma cada una: 240 % en total). 30 de Energía, enfriamiento 4 s.' }
  { id: 'lluvia_flechas', name: 'Lluvia de Flechas', icon: '🌧️', cat: 'spender', req: 8, elem: 'physical', coef: 0.6, cost: 30, cd: 4, line: 'Tras 0,3 s de aviso, caen 4 oleadas de flechas en un círculo de 3 m (60 % cada una).', art: 'skills256/lluvia_flechas.webp', todo: 'KA1: tipo genérico, verbos (§3.6) y números desde el doc de la clase' },
  // juego actual: { id: 'a_t_andanada', name: 'Andanada', icon: '🎇', kind: 'talent', cat: 'spec', slots: ['k3'], tags: ['spec', 'proj', 'area', 'movement', 'physical'], elem: 'physical', type: 'proj', behavior: 'a_t_andanada', req: 10, coef: 0.6, cost: 25, cd: 6, count: 12, spread: 1.047, speed: 18, range: 10, lockT: 0.35, backstep: 3, color: 6739911, desc: 'Insignia de la Tiradora: barres un arco de 120° con 12 flechas (60 % del arma cada una) mientras retrocedes 3 m. Cuesta 25 de Energía; enfriamiento 6 s.' }
  { id: 'a_t_andanada', name: 'Andanada', icon: '🎇', cat: 'spec', req: 10, spec: 'tiradora', elem: 'physical', coef: 0.45, cost: 25, cd: 8, line: 'Saltas 4 m atrás y disparas 10 flechas en 120° (45 % cada una). En 2 s, pulsa otra vez: saltas adelante y repites.', art: 'talents/arquera-tiradora-s4.webp', todo: 'KA1: tipo genérico, verbos (§3.6) y números desde el doc de la clase' },
  // NUEVA en 2g (no existe en el juego)
  { id: 'a_v_carrera', name: 'Carrera del Viento', icon: '✦', cat: 'movement', req: 12, spec: 'tiradora', elem: 'physical', coef: 0.45, cd: 10, line: 'Mantén pulsado: corres un 40 % más rápido hasta 4 s y disparas sola al enemigo más cercano cada 0,4 s (45 %).', art: 'talents/arquera-tiradora-s9.webp', todo: 'KA1: tipo genérico, verbos (§3.6) y números desde el doc de la clase' },
  // juego actual: { id: 'flecha_multiple', name: 'Flecha Múltiple', icon: '🔱', cat: 'spender', slots: ['rmb', 'k2'], tags: ['spender', 'proj', 'area', 'physical'], elem: 'physical', type: 'proj', req: 8, coef: 0.39, cost: 22, cd: 0, speed: 15, range: 10, count: 5, spread: 0.436, lockT: 0.35, color: 13426090, desc: 'Dispara 5 flechas en un abanico de 50° (39 % del arma cada una; ≈78 % a un objetivo pegado). 22 de Energía, sin enfriamiento.' }
  { id: 'flecha_multiple', name: 'Flecha Múltiple', icon: '🔱', cat: 'spender', req: 14, spec: 'tiradora', elem: 'physical', coef: 0.45, cost: 22, line: 'Disparas 5 flechas en un abanico de 50° (45 % cada una). No te frena: úsala corriendo.', art: 'skills256/flecha_multiple.webp', todo: 'KA1: tipo genérico, verbos (§3.6) y números desde el doc de la clase' },
  // juego actual: { id: 'a_u_diluvio', name: 'Diluvio de Saetas', icon: '🌠', cat: 'ultimate', slots: ['k4'], tags: ['ultimate', 'area', 'physical'], elem: 'physical', behavior: 'a_diluvio', at: 'target', req: 15, coef: 2.73, waves: 8, span: 3.6, cd: 50, radius: 5, range: 12, windup: 0.15, impactDelay: 0.4, shake: 0.18, color: 12582847, desc: 'Definitiva: tras una telegrafía, 8 oleadas de saetas arrasan un círculo de 5 m durante 4 s (273 % del arma cada una: 2184 % por objetivo). Enfriamiento 50 s.' }
  { id: 'a_u_diluvio', name: 'Diluvio de Saetas', icon: '🌠', cat: 'ultimate', req: 15, spec: 'tiradora', elem: 'physical', coef: 1.7, cd: 50, line: 'Una nube de saetas te sigue 6 s y cada 0,5 s descarga en 4 m a tu alrededor (170 % por oleada).', art: 'skills256/a_u_diluvio.webp', todo: 'KA1: tipo genérico, verbos (§3.6) y números desde el doc de la clase' },
  // juego actual: { id: 'a_t_apuntado', name: 'Disparo Apuntado', icon: '🏹', kind: 'talent', cat: 'spec', slots: ['rmb', 'k2', 'k3'], tags: ['spec', 'spender', 'proj', 'physical'], elem: 'physical', type: 'proj', behavior: 'a_t_apuntado', req: 10, coef: 3.2, cost: 30, cd: 6, windup: 1, speed: 30, range: 16, pierce: true, beam: true, color: 16773544, desc: 'Insignia de la Francotiradora: cargas 1 s (la esquiva lo cancela) y disparas una saeta que atraviesa toda la línea con el 320 % del arma. Cuesta 30 de Energía; enfriamiento 6 s.' }
  { id: 'a_t_apuntado', name: 'Disparo Apuntado', icon: '🏹', cat: 'spec', req: 10, spec: 'francotiradora', elem: 'physical', coef: 2.5, cost: 30, cd: 4, line: 'Mantén para tensar hasta 1,5 s y suelta: de 80 a 250 % y atraviesa. En la ventana dorada, +50 % y crítico.', art: 'icons256/a_p_punteria.webp', todo: 'KA1: tipo genérico, verbos (§3.6) y números desde el doc de la clase' },
  // NUEVA en 2g (no existe en el juego)
  { id: 'a_f_rodilla', name: 'Rodilla en Tierra', icon: '✦', cat: 'utility', req: 12, spec: 'francotiradora', elem: 'physical', cd: 14, line: 'Postura 8 s: Disparo Apuntado y los haces se tensan un 40 % más rápido y moverte no gasta Concentración (vas al 50 %).', art: 'talents/arquera-francotiradora-s8.webp', todo: 'KA1: tipo genérico, verbos (§3.6) y números desde el doc de la clase' },
  // NUEVA en 2g (no existe en el juego)
  { id: 'a_f_rastreador', name: 'Tiro Rastreador', icon: '✦', cat: 'spender', req: 14, spec: 'francotiradora', elem: 'physical', coef: 1.4, cost: 20, line: 'Una flecha (140 %) que abre un Punto Débil 8 s: tu primer tensado contra él es perfecto y +30 % (uno cada 8 s).', art: 'talents/arquera-francotiradora-x1.webp', todo: 'KA1: tipo genérico, verbos (§3.6) y números desde el doc de la clase' },
  // juego actual: { id: 'a_u_celeste', name: 'Tiro Celestial', icon: '🌌', cat: 'ultimate', slots: ['k4'], tags: ['ultimate', 'proj', 'physical'], elem: 'physical', behavior: 'a_celeste', req: 15, coef: 7, shots: 3, window: 8, recastGap: 0.35, cd: 50, speed: 30, range: 16, pierce: true, beam: true, windup: 0.3, color: 10475775, desc: 'Definitiva: hasta 3 haces celestes perforantes (700 % del arma cada uno) que disparas a voluntad pulsando otra vez la tecla durante 8 s; cada uno carga 0,3 s. Enfriamiento 50 s desde el primero.' }
  { id: 'a_u_celeste', name: 'Tiro Celestial', icon: '🌌', cat: 'ultimate', req: 15, spec: 'francotiradora', elem: 'physical', coef: 4, cd: 50, line: 'Durante 8 s tensas hasta 3 haces celestes (0,8 s cada uno): 400 % y atraviesan. Perfecto: +50 % y crítico.', art: 'skills256/a_u_celeste.webp', todo: 'KA1: tipo genérico, verbos (§3.6) y números desde el doc de la clase' },
  // juego actual: { id: 'a_t_cepo', name: 'Trampa de Cepo', icon: '🪤', kind: 'talent', cat: 'spec', slots: ['k3'], tags: ['spec', 'trap', 'cc', 'nature'], elem: 'nature', type: 'trap', behavior: 'a_t_cepo', req: 10, coef: 0.6, cost: 10, cd: 8, charges: 1, maxArmed: 3, radius: 1.5, root: 2, armT: 30, range: 9, dotKind: 'poison', dotDur: 5, color: 8836218, desc: 'Insignia del Montaraz: armas una trampa (hasta 3 a la vez) que inmoviliza 2 s a quien la pisa y lo envenena con el 60 % del arma en 5 s. 1 carga (8 s por carga); cuesta 10 de Energía.' }
  { id: 'a_t_cepo', name: 'Trampa de Cepo', icon: '🪤', cat: 'spec', req: 10, spec: 'montaraz', elem: 'nature', coef: 0.6, cost: 10, cd: 8, line: 'Colocas un cepo (hasta 3; se arma en 0,5 s): inmoviliza 2 s y envenena (60 % en 5 s; se renueva, no se suma). 2 cargas.', art: 'talents/arquera-montaraz-s0.webp', todo: 'KA1: tipo genérico, verbos (§3.6) y números desde el doc de la clase' },
  // NUEVA en 2g (no existe en el juego)
  { id: 'a_m_acecho', name: 'Salto de Acecho', icon: '✦', cat: 'movement', req: 12, spec: 'montaraz', elem: 'physical', coef: 1, cd: 10, line: 'Saltas a tu trampa más cercana al cursor (hasta 15 m) y la haces estallar al llegar (100 %). Sin trampas, 6 m.', art: 'talents/arquera-montaraz-s2.webp', todo: 'KA1: tipo genérico, verbos (§3.6) y números desde el doc de la clase' },
  // NUEVA en 2g (no existe en el juego)
  { id: 'a_m_detonante', name: 'Flecha Detonante', icon: '✦', cat: 'spender', req: 14, spec: 'montaraz', elem: 'physical', coef: 0.8, cost: 24, line: 'Estalla en 3 m (80 %) y hace estallar tus trampas que alcanza (100 % cada una; como mucho 2 por enemigo).', art: 'talents/arquera-montaraz-s6.webp', todo: 'KA1: tipo genérico, verbos (§3.6) y números desde el doc de la clase' },
  // juego actual: { id: 'a_u_zarzas', name: 'Cerco de Zarzas', icon: '🌵', cat: 'ultimate', slots: ['k4'], tags: ['ultimate', 'zone', 'cc', 'nature'], elem: 'nature', behavior: 'a_zarzas', at: 'self', req: 15, coef: 1, cd: 55, radius: 7, dur: 8, crossRoot: 1.5, weakPct: 15, color: 5933626, desc: 'Definitiva: un anillo de zarzas de 7 m a tu alrededor durante 8 s. Quien lo cruza queda inmovilizado 1,5 s; dentro, los enemigos sufren Veneno (100 % del arma por segundo: 800 % en total) y reciben +15 % de daño (Debilidad). Enfriamiento 55 s.' }
  { id: 'a_u_zarzas', name: 'Cerco de Zarzas', icon: '🌵', cat: 'ultimate', req: 15, spec: 'montaraz', elem: 'nature', coef: 1, cd: 45, line: 'Anillo de zarzas de 7 m, 8 s: cruzarlo inmoviliza 1,5 s; dentro, veneno (100 % por segundo); al cerrarse, 300 %.', art: 'skills256/a_u_zarzas.webp', todo: 'KA1: tipo genérico, verbos (§3.6) y números desde el doc de la clase' },
  // juego actual: { id: 'a_t_camuflaje', name: 'Camuflaje', icon: '🍃', kind: 'talent', cat: 'defense', slots: ['k2'], tags: ['defense', 'physical'], elem: 'physical', behavior: 'a_t_camuflaje', req: 10, cd: 30, dur: 4, color: 9420666, desc: 'Te vuelves invisible 4 s (los enemigos pierden el objetivo); tu primer disparo al salir es crítico seguro. Enfriamiento 30 s.' }
  { id: 'a_t_camuflaje', name: 'Camuflaje', icon: '🍃', kind: 'talent', cat: 'defense', slots: ['k2'], tags: ['defense', 'physical'], elem: 'physical', req: 21, cd: 20, behavior: 'a_t_camuflaje', dur: 4, color: 9420666, grantBy: 'c11', line: 'Te vuelves invisible 4 s, los enemigos te pierden y Paso Veloz se recarga; tu primer disparo al salir es crítico.', desc: 'Te vuelves invisible 4 s (los enemigos pierden el objetivo); tu primer disparo al salir es crítico seguro. Enfriamiento 30 s.', art: 'talents/arquera-clase-c12.webp', todo: 'existe en el juego: revisar texto y números contra la línea 2g' },
  // juego actual: { id: 'agilidad', name: 'Agilidad', icon: '🌪️', cat: 'movement', slots: ['k1'], tags: ['movement', 'buff', 'physical'], elem: 'physical', type: 'buff', req: 12, cd: 16, dur: 6, buff: { spdPct: 30, aspdPct: 15 }, slowImmune: true, desc: 'Durante 6 s: +30 % de velocidad de movimiento, +15 % de velocidad de ataque e inmunidad a las ralentizaciones. Enfriamiento 16 s.' }
  { id: 'agilidad', name: 'Agilidad', icon: '🌪️', kind: 'talent', cat: 'utility', slots: ['k2'], tags: ['buff', 'physical', 'utility'], elem: 'physical', req: 27, cd: 16, type: 'buff', dur: 6, buff: { spdPct: 30, aspdPct: 15 }, slowImmune: true, grantBy: 'c17', line: 'Durante 6 s: +30 % de velocidad, +15 % de velocidad de ataque e inmunidad a las ralentizaciones.', desc: 'Durante 6 s: +30 % de velocidad de movimiento, +15 % de velocidad de ataque e inmunidad a las ralentizaciones. Enfriamiento 16 s.', art: 'skills256/agilidad.webp', todo: 'existe en el juego: revisar texto y números contra la línea 2g' },
  // juego actual: { id: 'a_t_bengala', name: 'Flecha Bengala', icon: '🎆', kind: 'talent', cat: 'utility', slots: ['k2'], tags: ['utility', 'zone', 'ally', 'physical'], elem: 'physical', behavior: 'a_t_bengala', at: 'target', req: 10, cd: 30, radius: 10, dur: 8, range: 12, dmgPct: 8, reveal: true, color: 16763989, desc: 'Una bengala revela a los enemigos invisibles en 10 m durante 8 s; dentro, el grupo hace +8 % de daño. Enfriamiento 30 s.' }
  { id: 'a_t_bengala', name: 'Flecha Bengala', icon: '🎆', kind: 'talent', cat: 'utility', slots: ['k2'], tags: ['utility', 'zone', 'ally', 'physical'], elem: 'physical', req: 31, cd: 20, behavior: 'a_t_bengala', at: 'target', radius: 10, dur: 8, range: 12, dmgPct: 8, reveal: true, color: 16763989, grantBy: 'c22', line: 'Una bengala de 10 m durante 10 s: dentro, los enemigos reciben un 15 % más de daño del grupo y pegan un 15 % menos.', desc: 'Una bengala revela a los enemigos invisibles en 10 m durante 8 s; dentro, el grupo hace +8 % de daño. Enfriamiento 30 s.', art: 'talents/arquera-clase-c15.webp', todo: 'existe en el juego: revisar texto y números contra la línea 2g' },
  { id: 'a_h_torbellino', name: 'Torbellino', icon: '✦', kind: 'talent', cat: 'utility', slots: ['k2'], tags: ['utility', 'physical'], elem: 'physical', req: 72, cd: 40, grantBy: 'q4', hero: true, line: 'Un torbellino de 4 m levanta 1,5 s a los enemigos y te da 3 Ráfagas.', desc: 'Un torbellino de 4 m levanta 1,5 s a los enemigos y te da 3 Ráfagas.', art: 'talents/arquera-tiradora-s15.webp', todo: 'NUEVA: tipo genérico o comportamiento (KA1)' },
  { id: 'a_h_puntas', name: 'Desborde de Puntas', icon: '✦', kind: 'talent', cat: 'utility', slots: ['k2'], tags: ['utility', 'physical'], elem: 'physical', req: 72, cd: 20, grantBy: 'w4', hero: true, line: 'Tus 4 siguientes disparos llevan las tres puntas encantadas a la vez, al 50 % (sin Trenza ni Punta Repartida).', desc: 'Tus 4 siguientes disparos llevan las tres puntas encantadas a la vez, al 50 % (sin Trenza ni Punta Repartida).', art: 'talents/arquera-clase-c9.webp', todo: 'NUEVA: tipo genérico o comportamiento (KA1)' },
  { id: 'a_h_halcon', name: 'Llamada del Halcón', icon: '✦', kind: 'talent', cat: 'utility', slots: ['k2'], tags: ['utility', 'physical'], elem: 'physical', req: 72, cd: 30, grantBy: 'y4', hero: true, line: 'El halcón ataca a tu blanco 6 s sin parar (40 % cada 0,5 s), lo deja ciego y le llena 30 de Quebranto.', desc: 'El halcón ataca a tu blanco 6 s sin parar (40 % cada 0,5 s), lo deja ciego y le llena 30 de Quebranto.', art: 'talents/arquera-clase-c4.webp', todo: 'NUEVA: tipo genérico o comportamiento (KA1)' },
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
      // k: ★set{spread:30°, perTarget:3} · range +3 (tope por salto)
      { id: 'a_t_andanada_i', name: 'Andanada Cerrada', role: 'UNI', icon: 'forge/v_a_t_andanada_i', line: 'Abanico de 30° y +3 m de alcance: hasta 3 flechas de cada salto dan al mismo enemigo.' },
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
      // k: ★set{count:7, spread:90°, coef:.38}
      { id: 'flecha_multiple_i', name: 'Abanico Abierto', role: 'AREA', icon: 'forge/v_flecha_multiple_i', line: '7 flechas en 90° (38 % cada una).' },
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
      // k: ★set{waves:4, span:2, radius:1.5, coef:7}
      { id: 'a_u_diluvio_ii', name: 'Saetas Pesadas', role: 'UNI', icon: 'forge/v_a_u_diluvio_ii', line: '4 saetas de 700 % caen sobre tu objetivo en 2 s.' },
    ],
  },
  a_t_apuntado: {
    // k: ★set{charge.max:1.3}
    mejora: { name: 'Tensado Rápido', icon: 'forge/mejora', line: 'Tensas un 15 % más rápido (carga completa en 1,3 s).' },
    vars: [
      // k: ★set{charge.fullCount:3, spread:20°, coef ×0,4}
      { id: 'a_t_apuntado_i', name: 'Tres Saetas', role: 'AREA', icon: 'forge/v_a_t_apuntado_i', line: 'A carga completa sueltas 3 saetas en abanico de 20° que atraviesan (40 % cada una).' },
      // k: ★set{charge.max:2.5, charge.coefMax:3, pierce:false}
      { id: 'a_t_apuntado_ii', name: 'Tiro Pesado', role: 'UNI', icon: 'forge/v_a_t_apuntado_ii', line: 'Tensas hasta 2,5 s: hasta 300 %, pero no atraviesa.' },
    ],
  },
  a_f_rodilla: {
    // k: ★set{chargeMul:1.5}
    mejora: { name: 'Rodilla Firme', icon: 'forge/mejora', line: 'Disparo Apuntado y los haces se tensan un 50 % más rápido (antes 40 %).' },
    vars: [
      // k: ★set{moveMul:0, chargeMul:2} · dmg +15 (Apuntado y haces)
      { id: 'a_f_rodilla_i', name: 'Puesto Fijo', role: 'UNI', icon: 'forge/v_a_f_rodilla_i', line: 'No te mueves: Disparo Apuntado y los haces se tensan el doble de rápido y hacen +15 %.' },
      // k: ★set{dr:30, projMissPct:50}
      { id: 'a_f_rodilla_ii', name: 'Parapeto', role: 'AGU', icon: 'forge/v_a_f_rodilla_ii', line: 'De rodillas recibes un 30 % menos de daño y la mitad de los proyectiles te fallan.' },
    ],
  },
  a_f_rastreador: {
    // k: mark.dur 12
    mejora: { name: 'Marca Duradera', icon: 'forge/mejora', line: 'El Punto Débil dura 12 s (antes 8 s).' },
    vars: [
      // k: ★set{markCount:3, markRadius:4, mark.dur:6}
      { id: 'a_f_rastreador_i', name: 'Rastreo Múltiple', role: 'AREA', icon: 'forge/v_a_f_rastreador_i', line: 'Abre el Punto Débil en 3 enemigos a 4 m del blanco; dura 6 s.' },
      // k: slow 8 · slowPct 50 · stagger 20 (jefes)
      { id: 'a_f_rastreador_ii', name: 'Grillete', role: 'CTRL', icon: 'forge/v_a_f_rastreador_ii', line: 'El marcado va un 50 % más lento; a un jefe le llena 20 de Quebranto.' },
    ],
  },
  a_u_celeste: {
    // k: window 10
    mejora: { name: 'Cielo Abierto', icon: 'forge/mejora', line: 'Tienes 10 s para disparar los haces (antes 8 s).' },
    vars: [
      // k: ★set{at:target, radius:4, coef:1.5, pierce:false}
      { id: 'a_u_celeste_i', name: 'Lluvia Estelar', role: 'AREA', icon: 'forge/v_a_u_celeste_i', line: 'Cada haz cae del cielo donde apuntas, en 4 m (150 %); no atraviesa.' },
      // k: ★set{shots:1, charge.max:3, charge.coefMax:10}
      { id: 'a_u_celeste_ii', name: 'Haz Único', role: 'UNI', icon: 'forge/v_a_u_celeste_ii', line: 'Un solo haz que tensas hasta 3 s: hasta 1000 %.' },
    ],
  },
  a_t_cepo: {
    // k: armT .2
    mejora: { name: 'Muelles Firmes', icon: 'forge/mejora', line: 'Se arma en 0,2 s (antes 0,5 s).' },
    vars: [
      // k: ★set{root:0, burst:{radius:3, coef:1}}
      { id: 'a_t_cepo_i', name: 'Mina de Espinas', role: 'AREA', icon: 'forge/v_a_t_cepo_i', line: 'No inmoviliza: al pisarla estalla en 3 m (100 %).' },
      // k: ★set{radius:3, root:2.5} · absorbe a Red de Caza (a_red)
      { id: 'a_t_cepo_ii', name: 'Red de Caza', role: 'CTRL', icon: 'forge/v_a_t_cepo_ii', line: 'Al pisarla lanza una red de 3 m que inmoviliza 2,5 s a todos los que atrapa.' },
    ],
  },
  a_m_acecho: {
    // k: range 20
    mejora: { name: 'Acecho Lejano', icon: 'forge/mejora', line: 'Llegas a trampas a 20 m (antes 15 m).' },
    vars: [
      // k: ★set{consume:false, root:1.5, radius:3}
      { id: 'a_m_acecho_i', name: 'Acecho Enredador', role: 'CTRL', icon: 'forge/v_a_m_acecho_i', line: 'Al llegar no la gastas: inmovilizas 1,5 s a todos a 3 m.' },
      // k: ★charges 2 · dmg −30
      { id: 'a_m_acecho_ii', name: 'Doble Acecho', role: 'MOV', icon: 'forge/v_a_m_acecho_ii', line: '2 cargas (10 s cada una); el estallido hace un 30 % menos.' },
    ],
  },
  a_m_detonante: {
    // k: radius +33
    mejora: { name: 'Pólvora Fina', icon: 'forge/mejora', line: 'Estalla en 4 m (antes 3 m).' },
    vars: [
      // k: ★set{chain:6}
      { id: 'a_m_detonante_i', name: 'Detonación en Cadena', role: 'AREA', icon: 'forge/v_a_m_detonante_i', line: 'Cada trampa que estalla hace estallar las tuyas a 6 m, una tras otra.' },
      // k: ★set{splash:0, pull:{to:trap, dist:6}} · absorbe al Arpón (a_t_arpon)
      { id: 'a_m_detonante_ii', name: 'Flecha de Garfio', role: 'CTRL', icon: 'forge/v_a_m_detonante_ii', line: 'No estalla: arrastra 6 m al enemigo hacia tu trampa más cercana.' },
    ],
  },
  a_u_zarzas: {
    // k: dur 10
    mejora: { name: 'Espinas Duraderas', icon: 'forge/mejora', line: 'Dura 10 s (antes 8 s).' },
    vars: [
      // k: ★set{radius:3, target:one, trapIn:true} · dmg +30 (ronda 3; antes +60)
      { id: 'a_u_zarzas_i', name: 'Jaula de Espinas', role: 'UNI', icon: 'forge/v_a_u_zarzas_i', line: 'Se cierra sobre un enemigo: 3 m, no puede salir y el veneno hace +30 %.' },
      // k: ★set{decoy:{dur:6, radius:10}} · absorbe al Señuelo de Paja (a_t_senuelo)
      { id: 'a_u_zarzas_ii', name: 'Señuelo de Zarzas', role: 'AGU', icon: 'forge/v_a_u_zarzas_ii', line: 'En el centro, un señuelo de paja atrae 6 s a los enemigos a 10 m.' },
    ],
  },
};

// Barra, forja ('i'/'ii'; el mockup usa 'A'/'B') y habilidad seleccionada al elegir la especialización (D6)
export const ARQUERA_SPEC_BAR = {
  tiradora: { bar: { lmb: 'a_disparo', rmb: 'flecha_multiple', k1: 'a_v_carrera', k2: 'a_humo', k3: 'a_t_andanada', k4: 'a_u_diluvio' }, forge: { a_disparo: 'i', flecha_multiple: 'i' }, sel: 'flecha_multiple' },
  francotiradora: { bar: { lmb: 'a_disparo', rmb: 'a_f_rastreador', k1: 'a_paso', k2: 'a_f_rodilla', k3: 'a_t_apuntado', k4: 'a_u_celeste' }, forge: { a_disparo: 'ii', a_t_apuntado: 'ii', a_f_rastreador: 'ii' }, sel: 'a_t_apuntado' },
  montaraz: { bar: { lmb: 'a_disparo', rmb: 'a_m_detonante', k1: 'a_m_acecho', k2: 'a_humo', k3: 'a_t_cepo', k4: 'a_u_zarzas' }, forge: { a_disparo: 'ii', a_t_cepo: 'ii' }, sel: 'a_t_cepo' },
};
export const ARQUERA_FORGE_RECO = {
  tiradora: { a_disparo: 'i', flecha_multiple: 'i', a_t_andanada: 'ii', a_v_carrera: 'ii', a_u_diluvio: 'i', a_humo: 'i', a_paso: 'i' },
  francotiradora: { a_disparo: 'ii', a_t_apuntado: 'ii', a_f_rastreador: 'ii', a_f_rodilla: 'i', a_u_celeste: 'ii', flecha_perforante: 'ii', a_paso: 'i' },
  montaraz: { a_disparo: 'ii', a_t_cepo: 'ii', a_m_detonante: 'i', a_m_acecho: 'i', a_u_zarzas: 'i', a_humo: 'ii', lluvia_flechas: 'ii' },
};
export const ARQUERA_FALLBACK_BAR = { lmb: 'a_disparo', rmb: 'flecha_perforante', k1: 'a_paso', k2: 'a_humo', k3: null, k4: null };
export const ARQUERA_CATALOG_V = 2;
