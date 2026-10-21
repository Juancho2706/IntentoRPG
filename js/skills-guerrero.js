// ============================================================
// Catálogo de habilidades del GUERRERO (Furia) — catálogo 2g (Paso 2, KA-guerrero)
// ============================================================
// docs/paso2g-guerrero.md §3.3, §4, §5, §7 y §9 (contenido) y docs/paso2-implementacion.md
// §3.5–§3.7 (formato y verbos). 23 habilidades:
//  · kit base (todo Guerrero, Nv1–8): Tajo, Hendidura, Embestida, Piel de Hierro, Lanza;
//  · kit de cada especialización (`spec`, D7; insignia 10 · movilidad 12 · principal 14 ·
//    definitiva 15): Berserker (canalizar en marcha, relanzar, combo), Guardián (postura,
//    plantado, avance lento) y Cruzado (cargar y soltar, marca que se detona, zona sagrada);
//  · 6 activas de talento (kind 'talent', solo ranura 2, D29): 3 de clase (c11A, c17A, c22A) y
//    una por árbol héroe (t4A, l4A, u4A). Las conceden los nodos con `grant`.
// Salen del libro (§11.1): Mandoble, Embate, Torbellino (→ Remolino), Provocación y el
// Estandarte de Guerra definitivo (→ Caudillo). Sus ids viejos los traduce save-legacy-guerrero.js.
//  · Coef. = WD por objetivo y uso a rango 1 (rango = clamp(1+⌊(Nv−req)/8⌋,1,5);
//    coef ×(1+0,10·(rango−1)); buffs ×(1+0,06·(rango−1))).
//  · Verbos: claves canónicas de §3.6 (charge, recast, steps, stance, repeat, trail, pulse…);
//    lo que ningún tipo genérico cubre va en GUERRERO_SKILL_BEHAVIORS (anotado en
//    tools/convert-v2/out/pendientes-guerrero.md).
//  · `art`: el arte del mockup (assets/<art>; reutiliza el de 2b y el de los nodos para las
//    habilidades nuevas). `innate`: el chip de la pasiva por especialización. Las dos claves
//    esperan a W2 (SKILL_KEYS) y `art`, a U2 (hud-model.baseSkillIcon todavía pide skills/<id>.webp).
// Este archivo no importa nada (evita ciclos con data/powers).

export const GUERRERO_SKILLS = [
  // ———————————————— KIT BASE (todo Guerrero, Nv1–8) ————————————————
  // básico de arma: genera Furia al ACERTAR (+2 por enemigo extra); sin GCD
  { id: 'g_tajo', name: 'Tajo', icon: '⚔️', art: 'skills256/g_tajo.webp', cat: 'basic', slots: ['lmb'], tags: ['basic', 'melee', 'area', 'physical'], elem: 'physical',
    type: 'weapon', req: 1, coef: 1.0, gen: 10, genPerExtra: 2, genMax: 16, cleave: 0.5, cleaveR: 2.0,
    line: 'Cortas al objetivo y al que está pegado a él (50 %). Te da 10 de Furia, +2 por cada enemigo extra.',
    desc: 'Cortas al objetivo (100 % del arma) y a los enemigos pegados a él, a 2 m o menos (50 %). Ganas 10 de Furia, +2 por cada enemigo extra (máx. 16).' },
  // principal cuerpo a cuerpo con preparación (la esquiva la cancela sin coste)
  { id: 'g_hendidura', name: 'Hendidura', icon: '🪓', art: 'skills256/g_hendidura.webp', cat: 'spender', slots: ['rmb', 'k2'], tags: ['spender', 'melee', 'cone', 'physical'], elem: 'physical',
    type: 'cone', req: 2, coef: 2.9, cost: 27, radius: 4.5, angle: 120, windup: 0.25,
    line: 'Golpe frontal pesado en un cono de 120° y 4,5 m. Se prepara 0,25 s: la esquiva lo cancela sin gastar Furia.',
    desc: 'Tajo frontal pesado: 290 % del arma a todo lo que haya en un cono de 120° y 4,5 m. Se prepara 0,25 s y la esquiva lo cancela sin gastar Furia. Cuesta 27 de Furia.' },
  { id: 'embestida', name: 'Embestida', icon: '💨', art: 'skills256/embestida.webp', cat: 'movement', slots: ['k1'], tags: ['movement', 'melee', 'area', 'physical'], elem: 'physical',
    type: 'dash', req: 4, coef: 1.2, cd: 8, range: 7, radius: 1.9, lockT: 0.25, genOnHit: 12,
    line: 'Embistes 7 m hacia la mira y golpeas al llegar (120 % a 1,9 m). Si golpeas, ganas 12 de Furia.',
    desc: 'Embistes hasta 7 m hacia la mira: al llegar haces 120 % del arma a todos en 1,9 m y, si golpeas a alguno, ganas 12 de Furia. Recarga 8 s.' },
  // la recarga empieza al ACABAR (cdOnEnd, rejuicio §20); el Guardián la lleva a 12 s y −50 % (su
  // pasiva, §11.1). `innate` = el texto del chip por especialización (mockup); el efecto aún no lo
  // aplica nadie (pendientes-guerrero.md §3: decisión del orquestador)
  { id: 'g_piel', name: 'Piel de Hierro', icon: '🛡️', art: 'skills256/g_piel.webp', cat: 'defense', slots: ['k2'], tags: ['defense', 'buff', 'physical'], elem: 'physical',
    type: 'buff', req: 6, cd: 20, dur: 8, buff: { dr: 40 }, slowImmune: true, cdOnEnd: true, innate: { guardian: 'Guardián: 12 s y −50 %' },
    line: 'Durante 8 s recibes un 40 % menos de daño y no te pueden ralentizar. Su recarga empieza al acabar.',
    desc: 'Tu piel se vuelve de acero 8 s: recibes un 40 % menos de daño y no te pueden ralentizar. La recarga (20 s) empieza al acabar. Con el Guardián, 12 s y −50 %.' },
  // principal a distancia: atraviesa
  { id: 'g_lanza', name: 'Lanza Arrojadiza', icon: '🎯', art: 'skills256/g_lanza.webp', cat: 'spender', slots: ['rmb', 'k2'], tags: ['spender', 'proj', 'physical'], elem: 'physical',
    type: 'proj', req: 8, coef: 1.9, cost: 20, speed: 16, range: 11, pierce: true, lockT: 0.3,
    line: 'Arrojas una lanza que atraviesa a todos en 11 m (190 %). Tu respuesta a voladores y lanzadores.',
    desc: 'Arrojas una lanza que atraviesa a todos los enemigos en 11 m: 190 % del arma a cada uno. Tu respuesta a voladores y lanzadores. Cuesta 20 de Furia.' },

  // ———————————————— KIT DEL BERSERKER (Nv10–15) ————————————————
  // canalizar EN MARCHA (moveMul 1 por defecto): giras mientras mantienes; cada golpe desangra
  { id: 'g_remolino', name: 'Remolino Sangriento', icon: '🌪️', art: 'skills256/torbellino.webp', cat: 'spec', spec: 'berserker', slots: ['k3'],
    tags: ['spec', 'melee', 'area', 'channel', 'dot', 'physical'], elem: 'physical',
    type: 'channel', at: 'self', req: 10, coef: 0.45, cost: 30, cd: 6, channelT: 3, ticks: 12, radius: 2.9, hold: true,
    hitDot: { kind: 'bleed', coef: 0.08, dur: 3 },
    line: 'Mantén para girar hasta 3 s sin dejar de moverte: golpeas a 2,9 m 4 veces por segundo (45 %) y desangras.',
    desc: 'Mantén para girar hasta 3 s sin dejar de moverte: golpeas a todo lo que hay a 2,9 m 4 veces por segundo (45 % del arma) y lo desangras. Soltar corta el giro. Cuesta 30 de Furia; recarga 6 s.' },
  // RELANZAR si golpea: hasta 3 saltos, 2 s entre uno y otro (la ventana se renueva con cada acierto)
  { id: 'g_salto', name: 'Salto Devastador', icon: '🦶', art: 'skills256/g_salto.webp', cat: 'movement', spec: 'berserker', slots: ['k1'], tags: ['movement', 'area', 'physical'], elem: 'physical',
    type: 'leap', req: 12, coef: 1.5, cd: 12, radius: 3, range: 8, airT: 0.45, shake: 0.4,
    recast: { n: 3, win: 2, cond: 'hit' },
    line: 'Saltas hasta 8 m y golpeas al caer (150 % a 3 m). Si golpeas, puedes volver a saltar en 2 s (hasta 3 saltos).',
    desc: 'Saltas hasta 8 m al punto elegido (intocable en el aire) y al caer haces 150 % del arma en 3 m. Si golpeas, puedes volver a saltar en 2 s, hasta 3 saltos. Recarga 12 s desde el primero.' },
  // COMBO DE 3: tajo, revés y golpe descendente (320 %) con preparación que desangra
  { id: 'g_rajar', name: 'Rajar', icon: '🗡️', art: 'skills256/g_rajar.webp', cat: 'spender', spec: 'berserker', slots: ['rmb', 'k2'], tags: ['spender', 'melee', 'physical'], elem: 'physical',
    type: 'combo', req: 14, coef: 1.4, cost: 15, range: 2.5, radius: 2.5, comboWin: 2.5,
    steps: [
      { type: 'cone', coef: 1, angle: 100, radius: 2.5 },                                   // tajo
      { type: 'cone', coef: 1, angle: 140, radius: 2.5 },                                   // revés
      { type: 'area', at: 'target', coef: 3.2 / 1.4, radius: 2, windup: 0.3, dot: 'bleed' }, // descendente: 320 %
    ],
    line: 'Combo de 3: tajo, revés y un golpe descendente (320 %) que se prepara 0,3 s y desangra. Si paras 2,5 s, vuelve al 1.º.',
    desc: 'Combo de 3 golpes: tajo y revés (140 % del arma) y un golpe descendente (320 %) que se prepara 0,3 s y desangra. Si paras 2,5 s, vuelve al primero. Cuesta 15 de Furia por golpe.' },
  // ventana de riesgo: vida mínima del 1 % y principales gratis; al acabar te curas
  { id: 'g_u_furia', name: 'Furia Inmortal', icon: '😤', art: 'skills256/g_u_furia.webp', cat: 'ultimate', spec: 'berserker', slots: ['k4'], tags: ['ultimate', 'buff', 'physical'], elem: 'physical',
    type: 'buff', req: 15, cd: 60, cdFloor: 0.7, dur: 10, buff: { spenderCostPct: -100, minHpPct: 1, endHealPct: 20 }, unstoppable: true, slowImmune: true,
    line: '10 s imparable: tu vida no baja del 1 % y tus principales no cuestan Furia. Al acabar, te curas un 20 %.',
    desc: 'Definitiva: 10 s imparable. Tu vida no baja del 1 % y tus habilidades principales no cuestan Furia. Al acabar, te curas un 20 % de la vida. Recarga 60 s (nunca baja de 42 s).' },

  // ———————————————— KIT DEL GUARDIÁN (Nv10–15) ————————————————
  // POSTURAS que se alternan (sin tiempo global): Muralla (−15 % y +10 % de bloqueo) · Ariete (+15 %)
  { id: 'g_guardia', name: 'Cambio de Guardia', icon: '🔰', art: 'skills256/g_guardia.webp', cat: 'spec', spec: 'guardian', slots: ['k3'], tags: ['spec', 'buff', 'physical'], elem: 'physical',
    type: 'stance', req: 10, cd: 3,
    stance: { modes: [
      { id: 'muralla', name: 'Muralla', stats: { dr: 15, block: 10 }, color: 0x4a7ad8 },
      { id: 'ariete', name: 'Ariete', stats: { dmgPct: 15 }, color: 0xd83a2a },
    ], swapCd: 3, swapGcd: 0 },
    line: 'Alternas dos posturas: Muralla (−15 % de daño recibido y +10 % de bloqueo) y Ariete (+15 % de daño). Cambiar: 3 s.',
    desc: 'Dos posturas que se alternan: Muralla (recibes un 15 % menos de daño y +10 % de bloqueo) y Ariete (+15 % de daño). Cambiar no gasta el tiempo global y se recarga en 3 s.' },
  // avance LENTO e imparable que arrastra; al llegar provoca 3 s a los que golpea
  { id: 'g_carga_escudo', name: 'Carga de Escudo', icon: '🐂', art: 'skills256/g_carga_escudo.webp', cat: 'movement', spec: 'guardian', slots: ['k1'], tags: ['movement', 'melee', 'taunt', 'physical'], elem: 'physical',
    type: 'dash', req: 12, coef: 1.3, cd: 10, range: 8, radius: 2.5, dashT: 1, unstoppable: true, drag: true, taunt: 3,
    line: 'Avanzas 8 m despacio e imparable (1 s): arrastras a los que encuentras y, al llegar, te atacan a ti 3 s.',
    desc: 'Avance lento e imparable: 8 m en 1 s con el escudo por delante. Arrastras a los que encuentras y, al llegar, golpeas en 2,5 m (130 % del arma) y te atacan a ti 3 s. Recarga 10 s.' },
  // preparación y RÉPLICAS si estás plantado (1 s sin caminar)
  { id: 'terremoto', name: 'Terremoto', icon: '💥', art: 'skills256/terremoto.webp', cat: 'spender', spec: 'guardian', slots: ['rmb', 'k2'], tags: ['spender', 'melee', 'area', 'physical'], elem: 'physical',
    type: 'area', at: 'self', req: 14, coef: 2.2, cost: 30, radius: 5, windup: 0.4, shake: 0.5,
    repeat: { n: 2, every: 0.5, coef: 0.5, needPlanted: true },
    line: 'Te preparas 0,4 s y golpeas el suelo: 220 % a 5 m. Plantado (1 s sin moverte), suelta 2 réplicas al 50 %.',
    desc: 'Te preparas 0,4 s y golpeas el suelo: 220 % del arma a todo lo que hay a 5 m. Si estás plantado (1 s sin moverte), suelta 2 réplicas al 50 %. Cuesta 30 de Furia.' },
  // te CLAVAS: no te mueves; −40 % a ti y a tus aliados a 6 m; provocas a 10 m cada segundo
  { id: 'g_u_ciudadela', name: 'Ciudadela', icon: '🏰', art: 'skills256/g_u_ciudadela.webp', cat: 'ultimate', spec: 'guardian', slots: ['k4'], tags: ['ultimate', 'aura', 'buff', 'ally', 'taunt', 'physical'], elem: 'physical',
    behavior: 'g_u_ciudadela', req: 15, cd: 90, cdFloor: 0.7, dur: 8, radius: 6, buff: { dr: 40 }, moveMul: 0, plant: true,
    pulse: { every: 1, radius: 10, taunt: 1.5 },
    line: 'Clavas el escudo 8 s y no te mueves: tú y tus aliados a 6 m reciben −40 %; los enemigos a 10 m te atacan a ti.',
    desc: 'Definitiva: te clavas 8 s y no te mueves. Tú y tus aliados a 6 m reciben un 40 % menos de daño y los enemigos a 10 m te atacan a ti. Recarga 90 s (nunca baja de 63 s).' },

  // ———————————————— KIT DEL CRUZADO (Nv10–15) ————————————————
  // MARCA que detona tu siguiente principal (+100 % a ese enemigo); se prepara 0,3 s
  { id: 'g_juicio', name: 'Juicio', icon: '⚖️', art: 'talents/guerrero-cruzado-s16.webp', cat: 'spec', spec: 'cruzado', slots: ['k3'], tags: ['spec', 'proj', 'mark', 'holy'], elem: 'holy',
    type: 'proj', req: 10, coef: 1.2, splash: 1.2, radius: 3, cost: 20, cd: 8, range: 12, speed: 20, size: 0.3, windup: 0.3,
    mark: { id: 'juicio', dur: 8, detonate: { by: '@spender', pct: 100 } },
    line: 'Te preparas 0,3 s y lanzas un martillo de luz (120 % a 3 m) que marca 8 s. Tu siguiente principal lo detona: +100 %.',
    desc: 'Te preparas 0,3 s y lanzas un martillo de luz a 12 m: 120 % del arma a todos en 3 m y los marca 8 s. Tu siguiente habilidad principal detona la marca: +100 % a ese enemigo. Cuesta 20 de Furia; recarga 8 s.' },
  // destello rápido que deja un SENDERO sagrado (daña y cura a tus aliados)
  { id: 'g_sendero', name: 'Sendero de Luz', icon: '✨', art: 'skills256/g_sendero.webp', cat: 'movement', spec: 'cruzado', slots: ['k1'], tags: ['movement', 'zone', 'holy'], elem: 'holy',
    type: 'blink', req: 12, coef: 1.0, cd: 10, range: 8,
    trail: { field: 'zona', dur: 4, width: 1.5, coef: 0.3, heal: 2 },
    line: 'Destello de 8 m: dejas 4 s un sendero sagrado que no se suma: daña un 30 % y cura a tus aliados un 2 % por segundo.',
    desc: 'Destello rápido de 8 m: dejas un sendero sagrado 4 s que hace un 30 % del arma por segundo a los enemigos y cura a tus aliados un 2 % de la vida por segundo. Recarga 10 s.' },
  // CARGAR Y SOLTAR: 140 → 380 % a 3–5 m; la ventana perfecta (0,9–1,15 s) da +25 % y 1 de Fervor
  { id: 'g_martillo', name: 'Martillo de Guerra', icon: '🔨', art: 'skills256/g_martillo.webp', cat: 'spender', spec: 'cruzado', slots: ['rmb', 'k2'], tags: ['spender', 'melee', 'area', 'holy'], elem: 'holy',
    type: 'area', at: 'target', req: 14, coef: 1.4, cost: 25, radius: 3, range: 2.5, shake: 0.35,
    charge: { max: 1.2, perfect: [0.9, 1.15], perfectPct: 25, scale: { coef: [1.4, 3.8], radius: [3, 5] }, moveMul: 0.5, perfectGauge: { fervor: 1 } },
    line: 'Mantén para cargar (hasta 1,2 s) y suelta: 140 → 380 % a 3–5 m. Ventana perfecta (destello): +25 % y 1 de Fervor.',
    desc: 'Mantén para cargar (hasta 1,2 s; caminas al 50 %) y suelta: de 140 a 380 % del arma en 3–5 m. Soltar en la ventana perfecta (0,9–1,15 s, con destello) da +25 % y 1 de Fervor. La esquiva cancela la carga sin coste. Cuesta 25 de Furia.' },
  // CARGAR Y SOLTAR la definitiva: 500 → 1200 % en la mira y consagra el suelo 6 s
  { id: 'g_u_cataclismo', name: 'Cataclismo', icon: '☄️', art: 'skills256/g_u_cataclismo.webp', cat: 'ultimate', spec: 'cruzado', slots: ['k4'], tags: ['ultimate', 'area', 'zone', 'holy'], elem: 'holy',
    behavior: 'g_u_cataclismo', type: 'area', at: 'target', req: 15, coef: 5, cd: 60, cdFloor: 0.7, radius: 6, range: 12, impactDelay: 0.3, shake: 0.6,
    charge: { max: 2, perfect: [1.7, 1.95], scale: { coef: [5, 12] }, perfectGauge: { fervor: 3 } },
    floor: { dur: 6, coef: 0.4 },
    line: 'Mantén hasta 2 s y suelta: la luz cae en la mira (500 → 1200 % a 6 m) y consagra el suelo 6 s.',
    desc: 'Definitiva: mantén hasta 2 s y suelta. La luz cae en la mira (de 500 a 1200 % del arma en 6 m) y consagra el suelo 6 s (40 % por segundo). Ventana perfecta: +3 de Fervor. Recarga 60 s (nunca baja de 42 s).' },

  // ———————————————— ACTIVAS DE TALENTO (kind 'talent', solo ranura 2; D29) ————————————————
  // de clase: c11A (Nv21), c17A (Nv27) y c22A (Nv31). Sus comportamientos (g_t_aliento,
  // g_t_intervencion) viven en js/powers-guerrero.js (KT)
  { id: 'g_t_aliento', name: 'Segundo Aliento', icon: '❤️‍🩹', art: 'skills256/g_t_aliento.webp', kind: 'talent', cat: 'defense', slots: ['k2'], tags: ['defense', 'heal', 'physical'], elem: 'physical',
    behavior: 'g_t_aliento', req: 21, cd: 30, color: 0xff5a4a,
    line: 'Gastas toda tu Furia y te curas un 1 % de la vida por cada 3 de Furia (100 de Furia: un 33 %).',
    desc: 'Gastas toda tu Furia y te curas un 1 % de la vida por cada 3 de Furia gastada (100 de Furia: un 33 %). Recarga 30 s.' },
  { id: 'grito_guerra', name: 'Grito de Guerra', icon: '📢', art: 'skills256/grito_guerra.webp', kind: 'talent', cat: 'utility', slots: ['k2'], tags: ['utility', 'shout', 'buff', 'ally', 'physical'], elem: 'physical',
    type: 'buff', req: 27, cd: 20, dur: 8, buff: { dmgPct: 10 }, allyRadius: 15, gen: 30,
    line: 'Ganas 30 de Furia y tu grupo a 15 m hace +10 % de daño durante 8 s.',
    desc: 'Rugido de batalla: ganas 30 de Furia al instante y tu grupo a 15 m hace +10 % de daño durante 8 s. Sin coste; recarga 20 s.' },
  { id: 'g_t_intervencion', name: 'Intervención', icon: '🤝', art: 'skills256/g_t_intervencion.webp', kind: 'talent', cat: 'utility', slots: ['k2'], tags: ['utility', 'ally', 'shield', 'physical'], elem: 'physical',
    type: 'leap', behavior: 'g_t_intervencion', req: 31, cd: 20, range: 8, airT: 0.4, lockT: 0.4, shieldPct: 15, dur: 6, color: 0x88bbff,
    line: 'Saltas junto a un aliado (o 8 m hacia la mira) y los dos ganan un escudo del 15 % de tu vida durante 6 s.',
    desc: 'Saltas junto a un aliado (o 8 m hacia la mira) y los dos ganan un escudo del 15 % de tu vida máxima durante 6 s. Recarga 20 s.' },
  // de los árboles héroe (fila 2 del Paragon, Nv72): Titán t4A, Gladiador l4A y Caudillo u4A.
  // Lo que enlaza con su mecánica (Golpe de Titán, Rival, Pendón) lo leen los poderes del
  // árbol en ③ afterCast con el id de la habilidad
  { id: 'g_h_bramido', name: 'Bramido de Titán', icon: '📯', art: 'skills256/g_h_bramido.webp', kind: 'talent', cat: 'utility', slots: ['k2'], tags: ['utility', 'shout', 'cc', 'physical'], elem: 'physical',
    behavior: 'g_h_bramido', req: 72, cd: 30, radius: 6, stun: 1.5, bossStun: 1,
    line: 'Bramas a 6 m: aturdes 1,5 s (a los jefes, 30 de Quebranto) y tu siguiente principal es un Golpe de Titán.',
    desc: 'Bramas a 6 m: aturdes 1,5 s a los enemigos (a los jefes, 30 de Quebranto) y tu siguiente habilidad principal es un Golpe de Titán. Recarga 30 s.' },
  { id: 'g_h_desafio', name: 'Desafío de Arena', icon: '🏟️', art: 'skills256/g_provocacion.webp', kind: 'talent', cat: 'utility', slots: ['k2'], tags: ['utility', 'zone', 'mark', 'physical'], elem: 'physical',
    behavior: 'g_h_desafio', req: 72, cd: 40, range: 12, radius: 6, dur: 8, contain: true,
    mark: { id: 'g_h_desafio', dur: 8, weakPct: 20 },
    line: 'Encierras a tu Rival contigo en un círculo de 6 m durante 8 s: no puede salir y le haces +20 %.',
    desc: 'Encierras a tu Rival (el enemigo en la mira) contigo en un círculo de 6 m durante 8 s: no puede salir y recibe un 20 % más de daño. Recarga 40 s.' },
  { id: 'g_h_estandarte', name: 'Estandarte de Guerra', icon: '🚩', art: 'skills256/g_u_estandarte.webp', kind: 'talent', cat: 'utility', slots: ['k2'], tags: ['utility', 'aura', 'buff', 'ally', 'physical'], elem: 'physical',
    type: 'aura', at: 'target', req: 72, cd: 30, range: 15, radius: 8, dur: 12, buff: { dmgPct: 8, dr: 8 },
    line: 'Clavas al instante un Pendón en la mira (a 15 m), aparte del que clavas solo cada 15 s.',
    desc: 'Clavas al instante un Pendón en la mira (a 15 m), aparte del que clavas solo cada 15 s: durante 12 s, tú y tus aliados a 8 m hacen +8 % de daño y reciben un 8 % menos. Recarga 30 s.' },
];

/** @deprecated Paso 2 (D23): las ramas desaparecen (las sustituye la forja). data.js aún lo
 *  importa; C1 lo borra en E5. */
export const GUERRERO_SKILL_MODS = {};

// ============================================================
// Comportamientos a medida (solo donde ningún tipo genérico basta; tools/convert-v2/out/
// pendientes-guerrero.md dice por qué). Firma: cast(g, p, prof, cast) con
//   cast = { sk (definición FORJADA), prof, slot, target, enemy, ctx, done }
//   ctx = { coef, prof, baseProf, areaOpts, hitInfo, avgHit, color, fx, isEcho, res, hit(e, dealt) }
// Devuelven ctx.res (instantáneo) o undefined y luego cast.done(ctx.res) (diferido, siempre por
// g.timers.schedule). `params`: claves propias de la definición que lee el comportamiento.
// ============================================================

// emite un campo de FX (string = nombre de preset, objeto = preset) si existe
const emit = (g, preset, pos) => { if (preset) g.emitFx?.(preset, pos); };

export const GUERRERO_SKILL_BEHAVIORS = {
  // Cataclismo: la luz cae en la mira AL SOLTAR (no donde apuntabas al empezar a cargar),
  // impactDelay s después (coef y radio ya escalados por la carga), y CONSAGRA el suelo
  // (`floor`: zona sagrada de `dur` s que hace `coef` × arma por segundo; una a la vez). El
  // tipo `area` no deja zona propia.
  g_u_cataclismo: {
    params: ['floor'],
    cast(g, p, prof, cast) {
      const { ctx } = cast;
      const def = cast.sk;
      const base = ctx.baseProf || prof;
      const aim = !ctx.isEcho && typeof g.skillTarget === 'function' ? g.skillTarget(p, base).target : cast.target;
      const center = aim.clone().setY(0);
      const rad = ctx.prof.radius || def.radius || 6;
      p.faceToward(center);
      g.spawnRing?.(center, rad, ctx.color || 0xffe7a0);                       // telegrafía
      emit(g, ctx.fx?.trail, center.clone().setY(4.5));
      g.timers.schedule(base.impactDelay || 0.3, () => {
        if (p.alive) {
          g.dealArea(center, rad, ctx.coef, { ...ctx.areaOpts, from: center });
          emit(g, ctx.fx?.impact, center.clone().setY(0.3));
          emit(g, ctx.fx?.aura, center.clone().setY(0.3));
          g.addShake?.(def.shake || 0.5);
          const fl = def.floor;
          if (fl?.dur > 0) {
            // daño de la zona: coef por segundo con el rango y el saco aditivo del perfil (sin la carga)
            const rk = (def.coef || 0) > 0 ? base.coef / def.coef : 1;
            g.spawnField?.('zona', { pos: center, radius: rad, dur: fl.dur, owner: p, maxPerSkill: 1,
              data: { dps: fl.coef > 0 ? p.avgHit(fl.coef * rk, base.addPct) : 0, color: ctx.color || 0xffe7a0, skill: def.id, tags: base.tags } });
            emit(g, ctx.fx?.extra, center.clone().setY(0.2));
          }
        }
        ctx.zoneCenter = center; ctx.zoneRad = rad;
        cast.done(ctx.res);
      });
      return undefined;   // diferido: termina con el impacto
    },
  },

  // Ciudadela: aura a tus pies (tú y tus aliados dentro reciben el buff), te clavas
  // (moveMul de la definición durante `dur`; con `plant` cuentas ya como plantado) y provocas
  // por pulsos (`pulse`) mientras dura. Ningún tipo genérico frena al héroe durante un buff.
  g_u_ciudadela: {
    cast(g, p, prof, cast) {
      const { ctx } = cast;
      const def = cast.sk;
      const dur = ctx.prof.dur || def.dur || 8;
      const pos = p.pos.clone().setY(0);
      const f = g.spawnField?.('aura', { pos, radius: ctx.prof.radius || 6, dur, owner: p, follow: def.follow || null, maxPerSkill: 1,
        data: { buff: { ...ctx.prof.buff }, buffId: def.id, meta: { name: def.name, icon: def.icon, desc: def.desc }, color: ctx.color || 0x7fb0e8 } });
      const mm = ctx.prof.moveMul ?? 1;
      if (mm !== 1) p.setMoveMul(def.id, mm, dur);
      if (def.plant) p.plantNow?.();
      const pl = def.pulse;
      if (pl?.taunt > 0) {
        // primer pulso al clavarte; los demás, cada `every` s mientras el aura siga en pie
        for (const e of g.enemies || []) if (e.alive && e.pos.distanceTo(p.pos) <= (pl.radius || 10)) e.applyCC?.('taunt', pl.taunt, { src: p });
        g._startPulses?.(ctx, () => p.pos, () => !!f && !f.dead);
      }
      g.spawnRing?.(pos, ctx.prof.radius || 6, ctx.color || 0x7fb0e8);
      emit(g, ctx.fx?.aura, p.pos.clone().setY(1.0));
      emit(g, ctx.fx?.extra, p.pos.clone().setY(0.2));
      ctx.res.hits = 1;
      return ctx.res;
    },
  },

  // Bramido de Titán: grito que aturde a los enemigos del radio SIN dañarlos (un `area` con
  // coef 0 haría 1 de daño a cada uno). El aturdimiento de los jefes va a su Quebranto
  // (bossStun = duración nominal: 1 s = 30). «Tu siguiente principal es un Golpe de Titán» lo
  // pone el poder del Titán (g_ti_golpe_titan) en ③ afterCast con esta habilidad.
  g_h_bramido: {
    cast(g, p, prof, cast) {
      const { ctx } = cast;
      const rad = ctx.prof.radius || 6;
      for (const e of g.enemies || []) {
        if (!e.alive) continue;
        const r = rad + 0.5 * (e.def?.scale || 1);
        if (e.pos.distanceToSquared(p.pos) <= r * r) ctx.hit(e, 0);
      }
      g.spawnRing?.(p.pos, rad, ctx.color || 0xff6644);
      emit(g, ctx.fx?.aura, p.pos.clone().setY(1.0));
      emit(g, ctx.fx?.extra, p.pos.clone().setY(0.3));
      return ctx.res;
    },
  },

  // Desafío de Arena: un círculo que ENCIERRA (zona `contain`) al enemigo de la mira contigo
  // (centrado entre los dos si cabéis; si no, sobre él) y su marca le da Debilidad mientras
  // dura. Sin enemigo al alcance no se lanza (el enfriamiento vuelve).
  g_h_desafio: {
    cast(g, p, prof, cast) {
      const { ctx } = cast;
      const def = cast.sk;
      const reach = ctx.prof.range || 12;
      const near = e => e?.alive && e.pos.distanceTo(p.pos) <= reach + 0.5;
      const e = near(cast.enemy) ? cast.enemy : (g.nearestEnemy?.(reach) || null);
      if (!e) {
        g.reduceCooldown(p, def.id, Infinity);
        g.ui?.message?.('Ningún enemigo al alcance');
        return ctx.res;
      }
      const rad = ctx.prof.radius || 6;
      const both = p.pos.distanceTo(e.pos) <= rad * 1.6;
      const center = (both ? p.pos.clone().add(e.pos).multiplyScalar(0.5) : e.pos.clone()).setY(0);
      g.spawnField?.('zona', { pos: center, radius: rad, dur: ctx.prof.dur || def.dur || 8, owner: p, maxPerSkill: 1,
        data: { dps: 0, contain: !!def.contain, color: ctx.color || 0xe0a040, skill: def.id, tags: ctx.prof.tags } });
      ctx.hit(e, 0);                                   // la marca (y su Debilidad) del perfil
      p.faceToward(e.pos);
      g.spawnRing?.(center, rad, ctx.color || 0xe0a040);
      emit(g, ctx.fx?.aura, center.clone().setY(0.3));
      emit(g, ctx.fx?.impact, e.pos.clone().setY(1.6));
      return ctx.res;
    },
  },

  // FORJA · Martillo de Guerra II (Onda Sagrada): el golpe del Martillo en la mira (coef y radio
  // ya escalados por la carga; la ventana perfecta y el Fervor los pone el canal al soltar) y una
  // onda en línea de `onda.range` m desde el impacto hacia delante al `onda.coef` del golpe. La
  // onda no vuelve a dar a quien ya recibió el impacto (la clave genérica `wave` sí). Una
  // repetición (Eco) no lanza onda, como `wave`.
  v_onda_sagrada: {
    params: ['onda'],
    cast(g, p, prof, cast) {
      const { ctx } = cast;
      const def = cast.sk;
      const center = ctx.target.clone().setY(0);
      const rad = ctx.prof.radius || 3;
      p.faceToward(center);
      g.spawnRing?.(center, rad, ctx.color || 0xffe08a);
      const struck = new Set();
      g.dealArea(center, rad, ctx.coef, { ...ctx.areaOpts, from: center, onHit: (e, dealt, from) => { struck.add(e); ctx.hit(e, dealt, from); } });
      emit(g, ctx.fx?.impact, center.clone().setY(0.3));
      emit(g, ctx.fx?.aura, center.clone().setY(0.3));
      emit(g, ctx.fx?.extra, center.clone().setY(0.1));
      g.addShake?.(def.shake || 0.25);
      ctx.zoneCenter = center; ctx.zoneRad = rad;
      const w = def.onda;
      if (!ctx.isEcho && w?.range > 0) {
        const dir = center.clone().sub(p.pos).setY(0);
        if (dir.lengthSq() < 1e-6) { const yaw = p.group?.rotation?.y || 0; dir.set(Math.sin(yaw), 0, Math.cos(yaw)); }
        dir.normalize();
        for (const e of g.enemiesInLine(center, dir, w.range, w.width || 2)) {
          if (struck.has(e)) continue;
          const { dmg, crit } = p.rollDamage(ctx.coef * (w.coef ?? 0.6), ctx.prof.critBonus, ctx.prof.addPct, e, ctx.hitInfo);
          ctx.hit(e, e.takeDamage(dmg, crit, ctx.dmgOpts) || 0, center);
        }
        g.spawnBeam?.(center, center.clone().addScaledVector(dir, w.range), ctx.color || 0xffe680, 0.2);
      }
      return ctx.res;
    },
  },
};

// ------------------------------------------------------------
// Paso 2 (2f + 2g) · barra, forja y versión del catálogo (docs/paso2-implementacion.md §3.5,
// D3, D6). data.js los fusiona (SKILL_FORGE, SPEC_BAR, FORGE_RECO, FALLBACK_BAR, CATALOG_V).
// ------------------------------------------------------------
// FORJA (KA2; docs/paso2g-guerrero.md §4, §7 y §10; 2f §2.3): Mejora a Nv req+3 y dos variantes a
// Nv req+6. Nombres, líneas y papeles del mockup (las líneas de más de 70 caracteres, acortadas y
// anotadas en tools/convert-v2/divergencias.json); los efectos, desde su `k` y el documento:
//  · set/add/mul sobre la DEFINICIÓN (rutas con punto); una variante se aplica DESPUÉS de la
//    Mejora (que ya está activa cuando se abren las variantes): sus `set` pisan lo de la Mejora.
//  · mod = mods del perfil (2f §2.3, §3.5); power = poder v_* de js/powers-forge-guerrero.js.
// Lo que difiere del `k` del mockup (y por qué) está en tools/convert-v2/out/pendientes-guerrero.md §4.
const F = id => `forge/v_${id}`;
export const GUERRERO_SKILL_FORGE = {
  // ———— kit base ————
  // la salpicadura del Tajo es cleave × (1 + splashPct/100): Mejora 50 → 65 %, Desgarro → 30 %, Siega → 75 %
  g_tajo: {
    mejora: { id: 'g_tajo_m', name: 'Filo Ancho', icon: 'forge/mejora', line: 'Salpicadura 50 → 65 % y alcance 2 → 2,5 m.',
      mod: { splashPct: 30 }, add: { cleaveR: 0.5 } },
    vars: [
      { id: 'g_tajo_i', name: 'Desgarro', role: 'UNI', icon: F('g_tajo_i'), line: 'El objetivo sangra el 60 % del golpe en 3 s; salpicadura 30 %.',
        set: { hitDot: { kind: 'bleed', coef: 0.6, dur: 3 } }, mod: { splashPct: -70 }, tags: { add: ['dot'] } },
      // el principal al 85 % (golpe directo) y el barrido al 75 % a 3 m
      { id: 'g_tajo_ii', name: 'Siega', role: 'AREA', icon: F('g_tajo_ii'), line: 'Barrido de 3 m a todos al 75 %; el principal, al 85 %.',
        mod: { splashPct: 20, dmgDirect: -15 }, add: { cleaveR: 0.5 } },
    ],
  },
  g_hendidura: {
    mejora: { id: 'g_hendidura_m', name: 'Arco Amplio', icon: 'forge/mejora', line: 'Cono 120 → 150°.', set: { angle: 150 } },
    vars: [
      { id: 'g_hendidura_i', name: 'Rompefilas', role: 'UNI', icon: F('g_hendidura_i'), line: '+45 % de daño si golpea a un único enemigo.',
        power: 'v_rompefilas' },
      // la Estela genérica (zone): 2 s, una a la vez
      { id: 'g_hendidura_ii', name: 'Grieta', role: 'AREA', icon: F('g_hendidura_ii'), line: 'Deja una grieta 2 s que hace el 40 % por segundo; solo 1 a la vez.',
        mod: { zone: 1, zoneDur: 2, zoneMax: 1 } },
    ],
  },
  embestida: {
    mejora: { id: 'embestida_m', name: 'Carga Fiera', icon: 'forge/mejora', line: 'Alcance 7 → 9 m y +4 de Furia si golpea.',
      add: { range: 2, genOnHit: 4 } },
    vars: [
      // arrastrar = `drag` del avance (no hace falta el poder v_carnero del mockup); franja de 1 m a
      // cada lado: los arrastrados llegan dentro del golpe de 1,9 m (con 1,5 m quedaban fuera)
      { id: 'embestida_i', name: 'Carnero', role: 'CTRL', icon: F('embestida_i'), line: 'Arrastras a los que encuentras y los aturdes 0,5 s.',
        set: { drag: true, dragWidth: 1 }, mod: { stun: 0.5 }, tags: { add: ['cc'] } },
      { id: 'embestida_ii', name: 'Doble Carga', role: 'MOV', icon: F('embestida_ii'), line: '2 cargas (8 s cada una).',
        set: { charges: 2 } },
    ],
  },
  g_piel: {
    mejora: { id: 'g_piel_m', name: 'Acero Templado', icon: 'forge/mejora', line: 'Al activarla te curas el 8 % de la vida.', power: 'v_temple' },
    vars: [
      { id: 'g_piel_i', name: 'Espinas', role: 'AREA', icon: F('g_piel_i'), line: 'Mientras dura, devuelves el 40 % del daño cuerpo a cuerpo que recibes.',
        power: 'v_espinas' },
      // 10 s; la recarga (20 → 25 s) sigue empezando al acabar
      { id: 'g_piel_ii', name: 'Inamovible', role: 'AGU', icon: F('g_piel_ii'), line: 'Dura 10 s y te vuelve imparable; se recarga en 25 s.',
        set: { unstoppable: true }, mod: { durS: 2, cdr: -25 } },
    ],
  },
  g_lanza: {
    mejora: { id: 'g_lanza_m', name: 'Punta de Arpón', icon: 'forge/mejora', line: 'Los golpeados se ralentizan un 30 % durante 2 s.',
      mod: { slow: 2, slowPct: 30 } },
    vars: [
      { id: 'g_lanza_i', name: 'Arpón', role: 'CTRL', icon: F('g_lanza_i'), line: 'El primero que golpea es arrastrado 4 m hacia ti (+30 %).',
        set: { pierce: false }, mod: { pull: 4, dmg: 30 } },
      { id: 'g_lanza_ii', name: 'Jabalinas', role: 'AREA', icon: F('g_lanza_ii'), line: '3 lanzas en abanico al 70 %.',
        set: { count: 3, spread: 0.25 }, mod: { dmg: -30 } },
    ],
  },

  // ———— kit del Berserker ————
  g_remolino: {
    // el canal no da inmunidad por sí solo: v_giro_firme la mantiene mientras giras
    mejora: { id: 'g_remolino_m', name: 'Giro Firme', icon: 'forge/mejora', line: 'Mientras giras no te pueden ralentizar.',
      set: { slowImmune: true }, power: 'v_giro_firme' },
    vars: [
      { id: 'g_remolino_i', name: 'Remolino Anclado', role: 'UNI', icon: F('g_remolino_i'), line: 'Giras sin moverte: radio 2 m y +60 % de daño.',
        set: { moveMul: 0, radius: 2 }, mod: { dmg: 60 } },
      // atrae a 5 m en cada giro (v_ciclon); el radio del daño no cambia
      { id: 'g_remolino_ii', name: 'Ciclón', role: 'CTRL', icon: F('g_remolino_ii'), line: 'Cada giro atrae 1 m a los enemigos a 5 m; −15 % de daño.',
        mod: { dmg: -15 }, power: 'v_ciclon', tags: { add: ['cc'] } },
    ],
  },
  g_salto: {
    mejora: { id: 'g_salto_m', name: 'Caída Pesada', icon: 'forge/mejora', line: 'Radio de la caída 3 → 4 m.', add: { radius: 1 } },
    vars: [
      // sin relanzar: renuncias a la cadena a cambio de control (§10)
      { id: 'g_salto_i', name: 'Caída Atronadora', role: 'CTRL', icon: F('g_salto_i'), line: 'Un solo salto: al caer atraes 2 m y aturdes 0,75 s a todos.',
        set: { recast: null }, mod: { pull: 2, stun: 0.75 }, tags: { add: ['cc'] } },
      { id: 'g_salto_ii', name: 'Salto Rasante', role: 'MOV', icon: F('g_salto_ii'), line: 'Saltas 12 m, bajo y rápido (0,25 s en el aire); −20 % de daño.',
        set: { range: 12, airT: 0.25 }, mod: { dmg: -20 } },
    ],
  },
  g_rajar: {
    mejora: { id: 'g_rajar_m', name: 'Filo Encadenado', icon: 'forge/mejora', line: 'El combo espera 4 s (antes 2,5 s).', set: { comboWin: 4 } },
    vars: [
      // el 3.er paso pasa a estocada en línea (conserva la preparación y el sangrado): ×1,4 = 448 %.
      // La etiqueta `line` nombra la forma nueva, como `area` en el Molino (ningún soporte ni
      // selector de talento la exige ni la prohíbe)
      { id: 'g_rajar_i', name: 'Estocada Final', role: 'UNI', icon: F('g_rajar_i'), line: 'El 3.er golpe es una estocada de 5 m en línea: +40 % y sin área.',
        set: { 'steps.2': { type: 'line', range: 5, width: 1 } }, mul: { 'steps.2.coef': 1.4 }, tags: { add: ['line'] } },
      { id: 'g_rajar_ii', name: 'Molino', role: 'AREA', icon: F('g_rajar_ii'), line: 'Los tres golpes son giros de 2,5 m a tu alrededor; −20 % de daño.',
        set: { 'steps.*': { type: 'area', at: 'self', radius: 2.5 } }, mod: { dmg: -20 }, tags: { add: ['area'] } },
    ],
  },
  g_u_furia: {
    mejora: { id: 'g_u_furia_m', name: 'Sin Freno', icon: 'forge/mejora', line: 'Dura 10 → 12 s.', mod: { durS: 2 } },
    vars: [
      { id: 'g_u_furia_i', name: 'Sed Voraz', role: 'AGU', icon: F('g_u_furia_i'), line: 'Mientras dura, robas el 8 % del daño como vida; al acabar no te curas.',
        set: { 'buff.endHealPct': 0 }, power: 'v_sed_voraz' },
      // quita la inmortalidad (§10)
      { id: 'g_u_furia_ii', name: 'Frenesí', role: 'UNI', icon: F('g_u_furia_ii'), line: '+40 % de velocidad de ataque, pero tu vida sí puede bajar del 1 %.',
        set: { 'buff.minHpPct': 0 }, add: { 'buff.aspdPct': 40 } },
    ],
  },

  // ———— kit del Guardián ————
  g_guardia: {
    // el cambio usa stance.swapCd (no el CDR del perfil)
    mejora: { id: 'g_guardia_m', name: 'Guardia Ligera', icon: 'forge/mejora', line: 'Cambiar de postura se recarga en 1,5 s (antes 3 s).',
      set: { cd: 1.5, 'stance.swapCd': 1.5 } },
    vars: [
      // la forja decide A QUIÉN llega la postura (§10): aliados o enemigos
      { id: 'g_guardia_i', name: 'Guardia Compartida', role: 'APO', icon: F('g_guardia_i'), line: 'Aliados a 6 m: media postura (−8 % de daño recibido o +8 % de daño).',
        power: 'v_guardia_compartida' },
      { id: 'g_guardia_ii', name: 'Guardia Opresiva', role: 'CTRL', icon: F('g_guardia_ii'), line: 'Enemigos a 5 m: −10 % de daño en Muralla; frenados un 20 % en Ariete.',
        power: 'v_guardia_opresiva' },
    ],
  },
  g_carga_escudo: {
    mejora: { id: 'g_carga_escudo_m', name: 'Avance Largo', icon: 'forge/mejora', line: 'Avanzas 10 m (antes 8 m) en el mismo tiempo.', add: { range: 2 } },
    vars: [
      // derribar = aturdir 1 s; a los jefes no: solo los 20 de Quebranto (bossStun 0)
      { id: 'g_carga_escudo_i', name: 'Arrollador', role: 'CTRL', icon: F('g_carga_escudo_i'), line: 'Al llegar derribas 1 s a los arrastrados (jefes: 20 de Quebranto).',
        set: { bossStun: 0 }, mod: { stun: 1, stagger: 20 }, tags: { add: ['cc'] } },
      // renuncia a la Vanguardia: ni arrastra ni provoca (§10)
      { id: 'g_carga_escudo_ii', name: 'Carga Veloz', role: 'MOV', icon: F('g_carga_escudo_ii'), line: 'Rápida: 12 m en 0,3 s, sin arrastrar ni provocar.',
        set: { range: 12, dashT: 0.3, drag: false, taunt: 0 }, tags: { remove: ['taunt'] } },
    ],
  },
  terremoto: {
    mejora: { id: 'terremoto_m', name: 'Suelo Partido', icon: 'forge/mejora', line: 'Radio 5 → 6 m.', add: { radius: 1 } },
    vars: [
      { id: 'terremoto_i', name: 'Martinete', role: 'UNI', icon: F('terremoto_i'), line: 'Un solo punto a 3 m: radio 2,5 m, +60 % y 20 de Quebranto a jefes.',
        set: { at: 'target', range: 3, radius: 2.5 }, mod: { dmg: 60, stagger: 20 } },
      { id: 'terremoto_ii', name: 'Falla', role: 'AREA', icon: F('terremoto_ii'), line: 'El suelo se abre en línea 10 m: −20 % de daño; frena un 40 % 2 s.',
        set: { type: 'line', range: 10, width: 2 }, mod: { dmg: -20, slow: 2, slowPct: 40 } },
    ],
  },
  g_u_ciudadela: {
    mejora: { id: 'g_u_ciudadela_m', name: 'Muros Altos', icon: 'forge/mejora', line: 'Dura 10 s (antes 8 s).', mod: { durS: 2 } },
    vars: [
      // deja de estar plantada: caminas al 50 % y el aura va contigo (§10)
      { id: 'g_u_ciudadela_i', name: 'Ciudadela Andante', role: 'MOV', icon: F('g_u_ciudadela_i'), line: 'Te mueves al 50 % y te sigue; la reducción baja de −40 % a −25 %.',
        set: { moveMul: 0.5, plant: false, follow: 'owner', 'buff.dr': 25 } },
      { id: 'g_u_ciudadela_ii', name: 'Empalizada', role: 'AREA', icon: F('g_u_ciudadela_ii'), line: 'Quien te golpea recibe el 60 % de tu arma (una vez por segundo).',
        power: 'v_empalizada' },
    ],
  },

  // ———— kit del Cruzado ————
  g_juicio: {
    mejora: { id: 'g_juicio_m', name: 'Juicio Amplio', icon: 'forge/mejora', line: 'Radio 3 → 4 m.', add: { radius: 1 } },
    vars: [
      // sin salpicadura: solo el golpeado lleva la marca (12 s) y su Debilidad
      { id: 'g_juicio_i', name: 'Sentencia', role: 'UNI', icon: F('g_juicio_i'), line: 'Marca a un solo enemigo 12 s: recibe +15 % de daño de todo el grupo.',
        set: { radius: 0, splash: 0, 'mark.dur': 12, 'mark.weakPct': 15 } },
      { id: 'g_juicio_ii', name: 'Tres Juicios', role: 'AREA', icon: F('g_juicio_ii'), line: 'Arrojas 3 martillos en abanico al 60 %; cada uno marca.',
        set: { count: 3, spread: 0.3 }, mod: { dmg: -40 } },
    ],
  },
  g_sendero: {
    mejora: { id: 'g_sendero_m', name: 'Huella de Luz', icon: 'forge/mejora', line: 'El sendero dura 6 s (antes 4 s).', add: { 'trail.dur': 2 } },
    vars: [
      { id: 'g_sendero_i', name: 'Escolta de Luz', role: 'APO', icon: F('g_sendero_i'), line: 'Al atravesar a un aliado, escudo del 12 % de tu vida 6 s (cada 6 s).',
        power: 'v_escolta_luz' },
      { id: 'g_sendero_ii', name: 'Destello Doble', role: 'MOV', icon: F('g_sendero_ii'), line: '2 cargas (10 s cada una); el sendero dura 2 s.',
        set: { charges: 2, 'trail.dur': 2 } },
    ],
  },
  g_martillo: {
    // la ventana perfecta conserva su ancho (0,25 s) y acaba 0,05 s antes del tope
    mejora: { id: 'g_martillo_m', name: 'Mano Ágil', icon: 'forge/mejora', line: 'Carga completa en 0,9 s (antes 1,2 s); la ventana se adelanta igual.',
      set: { 'charge.max': 0.9, 'charge.perfect': [0.6, 0.85] } },
    vars: [
      // se sigue cargando y soltando: lo que sale es un proyectil de un solo objetivo
      { id: 'g_martillo_i', name: 'Martillo Arrojado', role: 'UNI', icon: F('g_martillo_i'), line: 'Al soltar, lo lanzas a 12 m contra uno solo: +40 % y sin área.',
        set: { type: 'proj', range: 12, radius: 0, speed: 18, size: 0.3 }, mod: { dmg: 40 }, tags: { remove: ['melee'] } },
      // onda en línea desde el impacto hacia la mira (comportamiento v_onda_sagrada: la clave
      // genérica `wave` vuelve a golpear a los del impacto)
      { id: 'g_martillo_ii', name: 'Onda Sagrada', role: 'AREA', icon: F('g_martillo_ii'), line: 'Al soltar, el golpe sigue en una onda de 8 m hacia delante (60 %).',
        behavior: 'v_onda_sagrada', set: { onda: { range: 8, width: 2, coef: 0.6 } } },
    ],
  },
  g_u_cataclismo: {
    mejora: { id: 'g_u_cataclismo_m', name: 'Columna Ancha', icon: 'forge/mejora', line: 'Radio 6 → 7,5 m.', add: { radius: 1.5 } },
    vars: [
      { id: 'g_u_cataclismo_i', name: 'Rayo del Cielo', role: 'UNI', icon: F('g_u_cataclismo_i'), line: 'Un rayo estrecho de 2 m: +80 % y 40 de Quebranto a los jefes.',
        set: { radius: 2, color: 0xfff6d8 }, mod: { dmg: 80, stagger: 40 } },
      // cura y escudo a los aliados a 8 m del impacto (heal/shield del motor)
      { id: 'g_u_cataclismo_ii', name: 'Amanecer', role: 'APO', icon: F('g_u_cataclismo_ii'), line: '−40 % de daño; cura un 30 % y da un escudo del 10 % a aliados a 8 m.',
        set: { heal: { pct: 30, radius: 8 }, shield: { pct: 10, radius: 8 } }, mod: { dmg: -40 }, tags: { add: ['heal'] } },
    ],
  },
};
// specId → { bar: { lmb, rmb, k1, k2, k3, k4 }, forge, sel }   (barra por especialización, D6;
// `forge` = variantes que propone el mockup con esa barra, 'i' | 'ii')
export const GUERRERO_SPEC_BAR = {
  berserker: { bar: { lmb: 'g_tajo', rmb: 'g_rajar', k1: 'g_salto', k2: 'g_piel', k3: 'g_remolino', k4: 'g_u_furia' },
    forge: { g_tajo: 'i', g_remolino: 'ii' }, sel: 'g_rajar' },
  guardian: { bar: { lmb: 'g_tajo', rmb: 'terremoto', k1: 'g_carga_escudo', k2: 'g_piel', k3: 'g_guardia', k4: 'g_u_ciudadela' },
    forge: { g_tajo: 'ii', g_piel: 'ii', g_guardia: 'i' }, sel: 'g_guardia' },
  cruzado: { bar: { lmb: 'g_tajo', rmb: 'g_martillo', k1: 'g_sendero', k2: 'g_piel', k3: 'g_juicio', k4: 'g_u_cataclismo' },
    forge: { g_juicio: 'ii', g_sendero: 'i' }, sel: 'g_martillo' },
};
// specId → { skillId: 'i' | 'ii' }   (forja recomendada, D3; ★ del libro, §7). Ninguna apaga la
// barra de su especialización (2f §7.7): conserva el sangrado (Sed), las posturas y el plantado
// (Bastión) y la carga y la marca (Fervor)
export const GUERRERO_FORGE_RECO = {
  berserker: { g_tajo: 'i', g_remolino: 'ii', g_u_furia: 'i' },
  guardian: { g_tajo: 'ii', g_piel: 'ii', g_guardia: 'i', g_carga_escudo: 'i', g_u_ciudadela: 'ii' },
  cruzado: { g_juicio: 'ii', g_sendero: 'i', g_martillo: 'ii', g_u_cataclismo: 'i' },
};
// barra de reserva de la migración (§3.11): solo el kit base
export const GUERRERO_FALLBACK_BAR = { lmb: 'g_tajo', rmb: 'g_hendidura', k1: 'embestida', k2: 'g_piel', k3: null, k4: null };
// 1 = catálogo v4 · 2 = catálogo 2g
export const GUERRERO_CATALOG_V = 2;
