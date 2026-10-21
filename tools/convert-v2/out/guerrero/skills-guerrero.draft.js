// ============================================================
// CATÁLOGO 2g de la clase Guerrero — BORRADOR para KA (no lo carga el juego)
// ============================================================
// Generado por tools/convert-v2/convert.mjs (--draft) desde docs/mockups/data/talents-v2-guerrero.js (sha1 b0f282184d7d, estado «diseño»).
// Formato: docs/paso2-implementacion.md §3.5 (forja de 2f §2.3). Ids, cat, req, spec, elem, nombres, líneas y papeles
// exactos (los compara tests/test-v2-paridad.mjs cuando <CLASE>_CATALOG_V = 2). Los efectos se escriben a mano desde
// el `k` del mockup (en comentario) y el documento de la clase. Encima de cada habilidad que ya existía, su definición en el juego v1.
// D29: las 6 activas de talento (kind 'talent', slots ['k2']) van en este catálogo, al final de GUERRERO_SKILLS;
// en talents-guerrero.js, GUERRERO_TALENT_SKILLS es solo la lista de ids: g_t_aliento, grito_guerra, g_t_intervencion, g_h_bramido, g_h_desafio, g_h_estandarte.
export const GUERRERO_SKILLS = [
  // juego v1: { id: 'g_tajo', name: 'Tajo', icon: '⚔️', cat: 'basic', slots: ['lmb'], tags: ['basic', 'melee', 'area', 'physical'], elem: 'physical', type: 'weapon', req: 1, coef: 1, gen: 10, genPerExtra: 2, genMax: 16, cleave: 0.5, cleaveR: 2, desc: 'Corta al objetivo (100 % del arma) y a los enemigos pegados a él, a 2 m o menos (50 %). Genera 10 de Furia, +2 por cada enemigo extra (máx. 16).' }
  { id: 'g_tajo', name: 'Tajo', icon: '⚔️', cat: 'basic', req: 1, elem: 'physical', coef: 1, gen: 10, line: 'Cortas al objetivo y al que está pegado a él (50 %). Te da 10 de Furia, +2 por cada enemigo extra.', art: 'skills256/g_tajo.webp', todo: 'KA1: tipo genérico, verbos (§3.6) y números desde el doc de la clase' },
  // juego v1: { id: 'g_hendidura', name: 'Hendidura', icon: '🪓', cat: 'spender', slots: ['rmb', 'k2'], tags: ['spender', 'melee', 'cone', 'physical'], elem: 'physical', type: 'cone', req: 8, coef: 2.9, cost: 27, radius: 4.5, angle: 120, windup: 0.12, desc: 'Tajo frontal pesado (preparación de 0,12 s): 290 % del arma a todo lo que haya en un cono de 120° y 4,5 m. Cuesta 27 de Furia.' }
  { id: 'g_hendidura', name: 'Hendidura', icon: '🪓', cat: 'spender', req: 2, elem: 'physical', coef: 2.9, cost: 27, line: 'Golpe frontal pesado en un cono de 120° y 4,5 m. Se prepara 0,25 s: la esquiva lo cancela sin gastar Furia.', art: 'skills256/g_hendidura.webp', todo: 'KA1: tipo genérico, verbos (§3.6) y números desde el doc de la clase' },
  // juego v1: { id: 'embestida', name: 'Embestida', icon: '💨', cat: 'movement', slots: ['k1'], tags: ['movement', 'melee', 'area', 'physical'], elem: 'physical', type: 'dash', req: 4, coef: 1.2, cd: 8, range: 7, radius: 1.9, lockT: 0.25, genOnHit: 12, desc: 'Embistes hasta 7 m hacia la mira: al llegar haces 120 % del arma a todos en 1,9 m y, si golpeas a alguno, ganas 12 de Furia. Enfriamiento 8 s.' }
  { id: 'embestida', name: 'Embestida', icon: '💨', cat: 'movement', req: 4, elem: 'physical', coef: 1.2, cd: 8, line: 'Embistes 7 m hacia la mira y golpeas al llegar (120 % a 1,9 m). Si golpeas, ganas 12 de Furia.', art: 'skills256/embestida.webp', todo: 'KA1: tipo genérico, verbos (§3.6) y números desde el doc de la clase' },
  // juego v1: { id: 'g_piel', name: 'Piel de Hierro', icon: '🛡️', cat: 'defense', slots: ['k2'], tags: ['defense', 'buff', 'physical'], elem: 'physical', type: 'buff', req: 6, cd: 20, dur: 12, buff: { dr: 50 }, slowImmune: true, desc: 'Tu piel se vuelve de acero 12 s: −50 % de daño recibido (reducción de daño, tope 50 %) e inmunidad a las ralentizaciones. Enfriamiento 20 s.' }
  { id: 'g_piel', name: 'Piel de Hierro', icon: '🛡️', cat: 'defense', req: 6, elem: 'physical', cd: 20, line: 'Durante 8 s recibes un 40 % menos de daño y no te pueden ralentizar. Su recarga empieza al acabar.', innate: { guardian: 'Guardián: 12 s y −50 %' }, art: 'skills256/g_piel.webp', todo: 'KA1: tipo genérico, verbos (§3.6) y números desde el doc de la clase' },
  // juego v1: { id: 'g_lanza', name: 'Lanza Arrojadiza', icon: '🎯', cat: 'spender', slots: ['rmb', 'k2'], tags: ['spender', 'proj', 'physical'], elem: 'physical', type: 'proj', req: 14, coef: 1.9, cost: 20, speed: 16, range: 11, pierce: true, lockT: 0.3, desc: 'Arrojas una lanza que atraviesa a todos los enemigos en 11 m: 190 % del arma a cada uno. Tu respuesta a voladores y lanzadores. Cuesta 20 de Furia.' }
  { id: 'g_lanza', name: 'Lanza Arrojadiza', icon: '🎯', cat: 'spender', req: 8, elem: 'physical', coef: 1.9, cost: 20, line: 'Arrojas una lanza que atraviesa a todos en 11 m (190 %). Tu respuesta a voladores y lanzadores.', art: 'skills256/g_lanza.webp', todo: 'KA1: tipo genérico, verbos (§3.6) y números desde el doc de la clase' },
  // NUEVA en 2g con este id; en el juego hay una parecida: { id: 'g_t_remolino', name: 'Remolino Sangriento', icon: '🌪️', kind: 'talent', cat: 'spec', slots: ['k3'], tags: ['spec', 'melee', 'area', 'dot', 'physical'], elem: 'physical', behavior: 'g_t_remolino', req: 10, coef: 0.57, cost: 30, cd: 6, channelT: 2, ticks: 10, radius: 2.9, dotKind: 'bleed', moveFree: true, color: 13378082, desc: 'Insignia del Berserker: giras 2 s a velocidad normal golpeando 10 veces a todo lo que hay a 2,9 m (57 % del arma por golpe, 570 % en total) y lo desangras. Cuesta 30 de Furia; enfriamiento 6 s.' }
  { id: 'g_remolino', name: 'Remolino Sangriento', icon: '✦', cat: 'spec', req: 10, spec: 'berserker', elem: 'physical', coef: 0.45, cost: 30, cd: 6, line: 'Mantén para girar hasta 3 s sin dejar de moverte: golpeas a 2,9 m 4 veces por segundo (45 %) y desangras.', art: 'skills256/torbellino.webp', todo: 'KA1: tipo genérico, verbos (§3.6) y números desde el doc de la clase' },
  // juego v1: { id: 'g_salto', name: 'Salto Devastador', icon: '🦶', cat: 'movement', slots: ['k1'], tags: ['movement', 'area', 'cc', 'physical'], elem: 'physical', type: 'leap', req: 12, coef: 1.8, cd: 12, radius: 3.2, range: 8, airT: 0.45, slow: 2, slowPct: 40, shake: 0.4, desc: 'Saltas hasta 8 m al punto elegido (0,45 s en el aire, intocable) y al caer haces 180 % del arma en 3,2 m y ralentizas un 40 % durante 2 s. Enfriamiento 12 s.' }
  { id: 'g_salto', name: 'Salto Devastador', icon: '🦶', cat: 'movement', req: 12, spec: 'berserker', elem: 'physical', coef: 1.5, cd: 12, line: 'Saltas hasta 8 m y golpeas al caer (150 % a 3 m). Si golpeas, puedes volver a saltar en 2 s (hasta 3 saltos).', art: 'skills256/g_salto.webp', todo: 'KA1: tipo genérico, verbos (§3.6) y números desde el doc de la clase' },
  // NUEVA en 2g (no existe en el juego)
  { id: 'g_rajar', name: 'Rajar', icon: '✦', cat: 'spender', req: 14, spec: 'berserker', elem: 'physical', coef: 1.4, cost: 15, line: 'Combo de 3: tajo, revés y un golpe descendente (320 %) que se prepara 0,3 s y desangra. Si paras 2,5 s, vuelve al 1.º.', art: 'talents/guerrero-berserker-s7.webp', todo: 'KA1: tipo genérico, verbos (§3.6) y números desde el doc de la clase' },
  // juego v1: { id: 'g_u_furia', name: 'Furia Inmortal', icon: '😤', cat: 'ultimate', slots: ['k4'], tags: ['ultimate', 'buff', 'physical'], elem: 'physical', type: 'buff', req: 15, cd: 60, dur: 10, buff: { aspdPct: 30, spenderCostPct: -100 }, unstoppable: true, slowImmune: true, desc: 'Definitiva: 10 s de furia sin límite: tus gastadoras no cuestan Furia, +30 % de velocidad de ataque y eres imparable (inmune a control e interrupciones). Enfriamiento 60 s.' }
  { id: 'g_u_furia', name: 'Furia Inmortal', icon: '😤', cat: 'ultimate', req: 15, spec: 'berserker', elem: 'physical', cd: 60, line: '10 s imparable: tu vida no baja del 1 % y tus principales no cuestan Furia. Al acabar, te curas un 20 %.', art: 'skills256/g_u_furia.webp', todo: 'KA1: tipo genérico, verbos (§3.6) y números desde el doc de la clase' },
  // NUEVA en 2g (no existe en el juego)
  { id: 'g_guardia', name: 'Cambio de Guardia', icon: '✦', cat: 'spec', req: 10, spec: 'guardian', elem: 'physical', cd: 3, line: 'Alternas dos posturas: Muralla (−15 % de daño recibido y +10 % de bloqueo) y Ariete (+15 % de daño). Cambiar: 3 s.', art: 'talents/guerrero-guardian-s17.webp', todo: 'KA1: tipo genérico, verbos (§3.6) y números desde el doc de la clase' },
  // NUEVA en 2g (no existe en el juego)
  { id: 'g_carga_escudo', name: 'Carga de Escudo', icon: '✦', cat: 'movement', req: 12, spec: 'guardian', elem: 'physical', coef: 1.3, cd: 10, line: 'Avanzas 8 m despacio e imparable (1 s): arrastras a los que encuentras y, al llegar, te atacan a ti 3 s.', art: 'talents/guerrero-guardian-s13.webp', todo: 'KA1: tipo genérico, verbos (§3.6) y números desde el doc de la clase' },
  // juego v1: { id: 'terremoto', name: 'Terremoto', icon: '💥', cat: 'spender', slots: ['rmb', 'k2'], tags: ['spender', 'line', 'cc', 'physical'], elem: 'physical', type: 'line', req: 14, coef: 3.1, cost: 26, cd: 4, range: 8, width: 2, stun: 0.75, bossStun: false, windup: 0.15, desc: 'Partes el suelo en una grieta de 8 × 2 m (preparación de 0,15 s): 310 % del arma y aturde 0,75 s a todo lo que alcanza salvo a los jefes. Cuesta 26 de Furia; enfriamiento 4 s.' }
  { id: 'terremoto', name: 'Terremoto', icon: '💥', cat: 'spender', req: 14, spec: 'guardian', elem: 'physical', coef: 2.2, cost: 30, line: 'Te preparas 0,4 s y golpeas el suelo: 220 % a 5 m. Plantado (1 s sin moverte), suelta 2 réplicas al 50 %.', art: 'skills256/terremoto.webp', todo: 'KA1: tipo genérico, verbos (§3.6) y números desde el doc de la clase' },
  // NUEVA en 2g (no existe en el juego)
  { id: 'g_u_ciudadela', name: 'Ciudadela', icon: '✦', cat: 'ultimate', req: 15, spec: 'guardian', elem: 'physical', cd: 90, line: 'Clavas el escudo 8 s y no te mueves: tú y tus aliados a 6 m reciben −40 %; los enemigos a 10 m te atacan a ti.', art: 'talents/guerrero-guardian-x3.webp', todo: 'KA1: tipo genérico, verbos (§3.6) y números desde el doc de la clase' },
  // NUEVA en 2g (no existe en el juego)
  { id: 'g_juicio', name: 'Juicio', icon: '✦', cat: 'spec', req: 10, spec: 'cruzado', elem: 'holy', coef: 1.2, cost: 20, cd: 8, line: 'Te preparas 0,3 s y lanzas un martillo de luz (120 % a 3 m) que marca 8 s. Tu siguiente principal lo detona: +100 %.', art: 'talents/guerrero-cruzado-s16.webp', todo: 'KA1: tipo genérico, verbos (§3.6) y números desde el doc de la clase' },
  // NUEVA en 2g (no existe en el juego)
  { id: 'g_sendero', name: 'Sendero de Luz', icon: '✦', cat: 'movement', req: 12, spec: 'cruzado', elem: 'holy', coef: 1, cd: 10, line: 'Destello de 8 m: dejas 4 s un sendero sagrado que no se suma: daña un 30 % y cura a tus aliados un 2 % por segundo.', art: 'talents/guerrero-cruzado-s14.webp', todo: 'KA1: tipo genérico, verbos (§3.6) y números desde el doc de la clase' },
  // juego v1: { id: 'g_martillo', name: 'Martillo de Guerra', icon: '🔨', cat: 'spender', slots: ['rmb', 'k2'], tags: ['spender', 'melee', 'area', 'physical'], elem: 'physical', type: 'area', at: 'target', req: 8, coef: 1.5, cost: 30, radius: 3, range: 2.5, windup: 0.15, impactDelay: 0.23, shake: 0.35, desc: 'Descargas el martillo hasta 2,5 m delante (preparación de 0,15 s): la onda hace 150 % del arma a todos en 3 m al tocar el suelo. Cuesta 30 de Furia.' }
  { id: 'g_martillo', name: 'Martillo de Guerra', icon: '🔨', cat: 'spender', req: 14, spec: 'cruzado', elem: 'holy', coef: 1.4, cost: 25, line: 'Mantén para cargar (hasta 1,2 s) y suelta: 140 → 380 % a 3–5 m. Ventana perfecta (destello): +25 % y 1 de Fervor.', art: 'skills256/g_martillo.webp', todo: 'KA1: tipo genérico, verbos (§3.6) y números desde el doc de la clase' },
  // juego v1: { id: 'g_u_cataclismo', name: 'Cataclismo', icon: '☄️', cat: 'ultimate', slots: ['k4'], tags: ['ultimate', 'area', 'holy'], elem: 'holy', type: 'area', at: 'target', behavior: 'g_u_cataclismo', req: 15, coef: 3.1, cd: 50, radius: 3, range: 9, windup: 0.15, impacts: 8, spanT: 5, teleT: 0.4, shake: 0.5, desc: 'Definitiva: 8 meteoros de luz caen en 5 s sobre la zona (cada uno avisa 0,4 s antes): 310 % del arma por impacto en 3 m, hasta 2480 % en el centro. Enfriamiento 50 s.' }
  { id: 'g_u_cataclismo', name: 'Cataclismo', icon: '☄️', cat: 'ultimate', req: 15, spec: 'cruzado', elem: 'holy', coef: 5, cd: 60, line: 'Mantén hasta 2 s y suelta: la luz cae en la mira (500 → 1200 % a 6 m) y consagra el suelo 6 s.', art: 'skills256/g_u_cataclismo.webp', todo: 'KA1: tipo genérico, verbos (§3.6) y números desde el doc de la clase' },
  // juego v1: { id: 'g_t_aliento', name: 'Segundo Aliento', icon: '❤️‍🩹', kind: 'talent', cat: 'defense', slots: ['k2'], tags: ['defense', 'heal', 'physical'], elem: 'physical', behavior: 'g_t_aliento', req: 10, cd: 30, furyPerPct: 3, color: 16734794, desc: 'Consumes toda tu Furia y te curas un 1 % de vida por cada 3 de Furia gastada (100 de Furia → 33 %). Enfriamiento 30 s.' }
  { id: 'g_t_aliento', name: 'Segundo Aliento', icon: '❤️‍🩹', kind: 'talent', cat: 'defense', slots: ['k2'], tags: ['defense', 'heal', 'physical'], elem: 'physical', req: 21, cd: 30, behavior: 'g_t_aliento', furyPerPct: 3, color: 16734794, grantBy: 'c11', line: 'Gastas toda tu Furia y te curas un 1 % de la vida por cada 3 de Furia (100 de Furia: un 33 %).', desc: 'Consumes toda tu Furia y te curas un 1 % de vida por cada 3 de Furia gastada (100 de Furia → 33 %). Enfriamiento 30 s.', art: 'talents/guerrero-clase-c2.webp', todo: 'existe en el juego: revisar texto y números contra la línea 2g' },
  // juego v1: { id: 'grito_guerra', name: 'Grito de Guerra', icon: '📢', cat: 'utility', slots: ['k2'], tags: ['utility', 'shout', 'buff', 'ally', 'physical'], elem: 'physical', type: 'buff', req: 12, cd: 20, dur: 8, buff: { dmgPct: 10 }, allyRadius: 15, gen: 30, desc: 'Rugido de batalla: ganas 30 de Furia al instante y tu grupo a 15 m gana +10 % de daño durante 8 s. Sin coste; enfriamiento 20 s.' }
  { id: 'grito_guerra', name: 'Grito de Guerra', icon: '📢', kind: 'talent', cat: 'utility', slots: ['k2'], tags: ['utility', 'shout', 'buff', 'ally', 'physical'], elem: 'physical', req: 27, cd: 20, gen: 30, type: 'buff', dur: 8, buff: { dmgPct: 10 }, allyRadius: 15, grantBy: 'c17', line: 'Ganas 30 de Furia y tu grupo a 15 m hace +10 % de daño durante 8 s.', desc: 'Rugido de batalla: ganas 30 de Furia al instante y tu grupo a 15 m gana +10 % de daño durante 8 s. Sin coste; enfriamiento 20 s.', art: 'skills256/grito_guerra.webp', todo: 'existe en el juego: revisar texto y números contra la línea 2g' },
  // juego v1: { id: 'g_t_intervencion', name: 'Intervención', icon: '🛡️', kind: 'talent', cat: 'movement', slots: ['k1'], tags: ['movement', 'ally', 'shield', 'physical'], elem: 'physical', type: 'leap', behavior: 'g_t_intervencion', req: 10, cd: 20, range: 8, airT: 0.4, lockT: 0.4, shieldPct: 15, dur: 6, color: 8961023, desc: 'Saltas hasta un aliado (o 8 m hacia el cursor) y ambos ganan un escudo del 15 % de tu vida máxima durante 6 s. Enfriamiento 20 s.' }
  { id: 'g_t_intervencion', name: 'Intervención', icon: '🛡️', kind: 'talent', cat: 'utility', slots: ['k2'], tags: ['ally', 'shield', 'physical', 'utility'], elem: 'physical', req: 31, cd: 20, type: 'leap', behavior: 'g_t_intervencion', range: 8, airT: 0.4, lockT: 0.4, shieldPct: 15, dur: 6, color: 8961023, grantBy: 'c22', line: 'Saltas junto a un aliado (o 8 m hacia la mira) y los dos ganan un escudo del 15 % de tu vida durante 6 s.', desc: 'Saltas hasta un aliado (o 8 m hacia el cursor) y ambos ganan un escudo del 15 % de tu vida máxima durante 6 s. Enfriamiento 20 s.', art: 'talents/guerrero-clase-c3.webp', todo: 'existe en el juego: revisar texto y números contra la línea 2g' },
  { id: 'g_h_bramido', name: 'Bramido de Titán', icon: '✦', kind: 'talent', cat: 'utility', slots: ['k2'], tags: ['utility', 'physical'], elem: 'physical', req: 72, cd: 30, grantBy: 't4', hero: true, line: 'Bramas a 6 m: aturdes 1,5 s (a los jefes, 30 de Quebranto) y tu siguiente principal es un Golpe de Titán.', desc: 'Bramas a 6 m: aturdes 1,5 s (a los jefes, 30 de Quebranto) y tu siguiente principal es un Golpe de Titán.', art: 'skills256/grito_guerra.webp', todo: 'NUEVA: tipo genérico o comportamiento (KA1)' },
  { id: 'g_h_desafio', name: 'Desafío de Arena', icon: '✦', kind: 'talent', cat: 'utility', slots: ['k2'], tags: ['utility', 'physical'], elem: 'physical', req: 72, cd: 40, grantBy: 'l4', hero: true, line: 'Encierras a tu Rival contigo en un círculo de 6 m durante 8 s: no puede salir y le haces +20 %.', desc: 'Encierras a tu Rival contigo en un círculo de 6 m durante 8 s: no puede salir y le haces +20 %.', art: 'skills256/g_provocacion.webp', todo: 'NUEVA: tipo genérico o comportamiento (KA1)' },
  { id: 'g_h_estandarte', name: 'Estandarte de Guerra', icon: '✦', kind: 'talent', cat: 'utility', slots: ['k2'], tags: ['utility', 'physical'], elem: 'physical', req: 72, cd: 30, grantBy: 'u4', hero: true, line: 'Clavas al instante un Pendón en la mira (a 15 m), aparte del que clavas solo cada 15 s.', desc: 'Clavas al instante un Pendón en la mira (a 15 m), aparte del que clavas solo cada 15 s.', art: 'skills256/g_u_estandarte.webp', todo: 'NUEVA: tipo genérico o comportamiento (KA1)' },
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
  g_guardia: {
    // k: cdr −50
    mejora: { name: 'Guardia Ligera', icon: 'forge/mejora', line: 'Cambiar de postura se recarga en 1,5 s (antes 3 s).' },
    vars: [
      // k: ★aura stance 50 % (r 6)
      { id: 'g_guardia_i', name: 'Guardia Compartida', role: 'APO', icon: 'forge/v_g_guardia_i', line: 'Tus aliados a 6 m reciben la mitad de tu postura: −8 % de daño recibido o +8 % de daño.' },
      // k: ★aura enemigos: weakenOutgoing 10 | slow 20 (r 5)
      { id: 'g_guardia_ii', name: 'Guardia Opresiva', role: 'CTRL', icon: 'forge/v_g_guardia_ii', line: 'Tu postura también pesa sobre los enemigos a 5 m: Muralla les quita un 10 % de daño; Ariete los frena un 20 %.' },
    ],
  },
  g_carga_escudo: {
    // k: range +25
    mejora: { name: 'Avance Largo', icon: 'forge/mejora', line: 'Avanzas 10 m (antes 8 m) en el mismo tiempo.' },
    vars: [
      // k: ★knock 1 · stagger 20
      { id: 'g_carga_escudo_i', name: 'Arrollador', role: 'CTRL', icon: 'forge/v_g_carga_escudo_i', line: 'Al llegar derribas 1 s a los arrastrados; a los jefes les llenas 20 de Quebranto.' },
      // k: ★set{range:12, dashT:.3, drag:false, taunt:0}
      { id: 'g_carga_escudo_ii', name: 'Carga Veloz', role: 'MOV', icon: 'forge/v_g_carga_escudo_ii', line: 'Rápida: 12 m en 0,3 s, sin arrastrar ni provocar.' },
    ],
  },
  terremoto: {
    // k: radius +20
    mejora: { name: 'Suelo Partido', icon: 'forge/mejora', line: 'Radio 5 → 6 m.' },
    vars: [
      // k: ★set{at:aim3, radius:2.5} · dmg +60 · stagger 20
      { id: 'terremoto_i', name: 'Martinete', role: 'UNI', icon: 'forge/v_terremoto_i', line: 'Golpeas un solo punto a 3 m: radio 2,5 m, +60 % y 20 de Quebranto a los jefes.' },
      // k: ★set{type:line, range:10, width:2} · dmg −20 · slow 2
      { id: 'terremoto_ii', name: 'Falla', role: 'AREA', icon: 'forge/v_terremoto_ii', line: 'El suelo se abre en línea 10 m: −20 % de daño y ralentiza un 40 % durante 2 s.' },
    ],
  },
  g_u_ciudadela: {
    // k: durS 2
    mejora: { name: 'Muros Altos', icon: 'forge/mejora', line: 'Dura 10 s (antes 8 s).' },
    vars: [
      // k: ★set{root:false, moveSpd:.5} · dr 25
      { id: 'g_u_ciudadela_i', name: 'Ciudadela Andante', role: 'MOV', icon: 'forge/v_g_u_ciudadela_i', line: 'Puedes moverte al 50 % de velocidad; la reducción baja a −25 % (antes −40 %).' },
      // k: ★power v_empalizada (onDamaged, icd 1)
      { id: 'g_u_ciudadela_ii', name: 'Empalizada', role: 'AREA', icon: 'forge/v_g_u_ciudadela_ii', line: 'Quien te golpea mientras dura recibe el 60 % de tu arma (una vez por segundo).' },
    ],
  },
  g_juicio: {
    // k: radius +33
    mejora: { name: 'Juicio Amplio', icon: 'forge/mejora', line: 'Radio 3 → 4 m.' },
    vars: [
      // k: ★set{radius:0, single:true, markDur:12} · vulnPct 15
      { id: 'g_juicio_i', name: 'Sentencia', role: 'UNI', icon: 'forge/v_g_juicio_i', line: 'Marca a un solo enemigo 12 s: recibe un 15 % más de daño de todo el grupo.' },
      // k: ★set{count:3, spread:.3} · dmg −40
      { id: 'g_juicio_ii', name: 'Tres Juicios', role: 'AREA', icon: 'forge/v_g_juicio_ii', line: 'Arrojas 3 martillos en abanico al 60 %; cada uno marca.' },
    ],
  },
  g_sendero: {
    // k: zoneDur +2
    mejora: { name: 'Huella de Luz', icon: 'forge/mejora', line: 'El sendero dura 6 s (antes 4 s).' },
    vars: [
      // k: ★power v_escolta_luz (g.shield al aliado; icd 6 por aliado)
      { id: 'g_sendero_i', name: 'Escolta de Luz', role: 'APO', icon: 'forge/v_g_sendero_i', line: 'Si atraviesas a un aliado, le das un escudo del 12 % de tu vida durante 6 s (una vez cada 6 s por aliado).' },
      // k: ★charges 2 · zoneDur −2
      { id: 'g_sendero_ii', name: 'Destello Doble', role: 'MOV', icon: 'forge/v_g_sendero_ii', line: '2 cargas (10 s cada una); el sendero dura 2 s.' },
    ],
  },
  g_martillo: {
    // k: chargeT .9 · perfect [.6, .85]
    mejora: { name: 'Mano Ágil', icon: 'forge/mejora', line: 'Cargas del todo en 0,9 s (antes 1,2 s); la ventana perfecta se adelanta igual.' },
    vars: [
      // k: ★set{type:proj, range:12, radius:0} · dmg +40
      { id: 'g_martillo_i', name: 'Martillo Arrojado', role: 'UNI', icon: 'forge/v_g_martillo_i', line: 'Al soltar, lo lanzas a 12 m contra uno solo: +40 % y sin área; vuelve a tu mano.' },
      // k: ★add{wave:{range:8, coef:.6}}
      { id: 'g_martillo_ii', name: 'Onda Sagrada', role: 'AREA', icon: 'forge/v_g_martillo_ii', line: 'Al soltar, el golpe sigue en una onda de 8 m hacia delante (60 %).' },
    ],
  },
  g_u_cataclismo: {
    // k: radius +25
    mejora: { name: 'Columna Ancha', icon: 'forge/mejora', line: 'Radio 6 → 7,5 m.' },
    vars: [
      // k: ★set{radius:2} · dmg +80 · stagger 40
      { id: 'g_u_cataclismo_i', name: 'Rayo del Cielo', role: 'UNI', icon: 'forge/v_g_u_cataclismo_i', line: 'Un rayo estrecho de 2 m: +80 % y 40 de Quebranto a los jefes.' },
      // k: ★heal 30 (r 8) · shield 10 · dmg −40
      { id: 'g_u_cataclismo_ii', name: 'Amanecer', role: 'APO', icon: 'forge/v_g_u_cataclismo_ii', line: '−40 % de daño, pero curas un 30 % a tus aliados a 8 m y les das un escudo del 10 %.' },
    ],
  },
};

// Barra, forja ('i'/'ii'; el mockup usa 'A'/'B') y habilidad seleccionada al elegir la especialización (D6)
export const GUERRERO_SPEC_BAR = {
  berserker: { bar: { lmb: 'g_tajo', rmb: 'g_rajar', k1: 'g_salto', k2: 'g_piel', k3: 'g_remolino', k4: 'g_u_furia' }, forge: { g_tajo: 'i', g_remolino: 'ii' }, sel: 'g_rajar' },
  guardian: { bar: { lmb: 'g_tajo', rmb: 'terremoto', k1: 'g_carga_escudo', k2: 'g_piel', k3: 'g_guardia', k4: 'g_u_ciudadela' }, forge: { g_tajo: 'ii', g_piel: 'ii', g_guardia: 'i' }, sel: 'g_guardia' },
  cruzado: { bar: { lmb: 'g_tajo', rmb: 'g_martillo', k1: 'g_sendero', k2: 'g_piel', k3: 'g_juicio', k4: 'g_u_cataclismo' }, forge: { g_juicio: 'ii', g_sendero: 'i' }, sel: 'g_martillo' },
};
export const GUERRERO_FORGE_RECO = {
  berserker: { g_tajo: 'i', g_remolino: 'ii', g_u_furia: 'i' },
  guardian: { g_tajo: 'ii', g_piel: 'ii', g_guardia: 'i', g_carga_escudo: 'i', g_u_ciudadela: 'ii' },
  cruzado: { g_juicio: 'ii', g_sendero: 'i', g_martillo: 'ii', g_u_cataclismo: 'i' },
};
export const GUERRERO_FALLBACK_BAR = { lmb: 'g_tajo', rmb: 'g_hendidura', k1: 'embestida', k2: 'g_piel', k3: null, k4: null };
export const GUERRERO_CATALOG_V = 2;
