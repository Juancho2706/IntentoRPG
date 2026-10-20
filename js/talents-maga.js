// ============================================================
// TALENTOS de la MAGA — árbol de clase + 3 especializaciones (Paso 2c.1, SOLO DATOS)
// ============================================================
// Transcripción LITERAL de los mockups aprobados (D:\Proyectos\IntentoRPG-assets\mockups\):
//   Talentos.dc.html (Piromante) / Spec-Crionte / Spec-Arcanista.dc.html (árbol de clase idéntico en los 3)
// id, name, t, r, c, max, req, free, fx, opts y d de TREES.cls/spec, con los ajustes
// de forma de docs/paso2-diseno.md §5.1 (d → d(r) cuando el texto depende del rango;
// opts[].d → opts[].desc) y los de contenido de §5.2. El formato de NODO y de fx está en la
// cabecera de js/talents.js, que importa este archivo.
//  · Iconos: talents/<clase>-<spec|clase>-<id>.webp · retrato specs/<spec>.webp · emblema
//    emblems/<spec>.webp (rutas relativas a assets/; arte en IntentoRPG-assets/web/).
//  · preset = RECOMMENDED del mockup como lista ordenada [id, rangos] (filas de arriba abajo,
//    que es el orden que necesita presetRanks); en las elecciones, 3.er elemento = opción.
//    cls.preset es el de la 1.ª especialización; cada spec trae además clsPreset (el
//    RECOMMENDED.cls de su propio mockup) por si 2c.0 quiere usar el de la spec activa.
//  · spec.role ∈ dps|tank|support|control (Main.dc.html) · spec.mechanic = id del indicador
//    de §2 (spec-mechanics.js) · spec.innate = pasivas de línea base de §5.2.5 (no son nodos).
//  · `power` y `tv` son SOLO datos (nombres de §5.3); su efecto es de powers-<clase>.js (2c.1).
//
// AJUSTES Y DESVIACIONES respecto del mockup:
//  · El árbol de clase y la Piromante no traen fx en el mockup: se usan las tablas de §5.2.4 tal cual
//    (c9 usa la clave nueva '@spec', c14 costRedBig {pct:15, over:20}).
//  · s0 de cada especialización otorga la insignia (fx.grant) y su texto la describe; s4 pasa a
//    potenciarla (t:'p', 1 rango): Llamarada Avivada / Prisión Profunda / Orbe Resonante (§5.2.1).
//  · Crionte s0: m_shatter = Congelado por debajo de shatterPct (15) (§5.2.3; el mockup ya lo dice).
//  · p_muro_fuego y k_aliento / a_evocacion (k2/k3 en §3.2) llevan el tag 'spec' para que
//    defaultSlots les abra k2 y k3.
//
// PENDIENTE_2C1: (vacío — Paso 2c.1 hecho: poderes, comportamientos y campos en js/powers-maga.js)
//
// AJUSTES DE DATOS del Paso 2c.1 (para que cada nodo haga lo que dice su texto):
//  · Arcanista x1 (Cadena de Rayos): fuera `mod: { rayo: { chain: 3 } }`. Ese mod encadenaba
//    TODOS los impactos de Rayo (−25 %/salto, rebotes del núcleo); el texto es «los CRÍTICOS
//    saltan a 3 enemigos con el 50 %; si está solo, lo golpean dos veces» → lo hace el poder
//    a_chain_crit (solo el primer crítico de cada Rayo).
//  · m_t_bloque: «cancelable» = la ESQUIVA rompe el hielo (volver a pulsar no llega al
//    comportamiento: la ranura está en enfriamiento); texto actualizado.
//
// Paso 2c.2 — SIN PORTADORES (un poder por nodo; el resto, claves tv del núcleo):
//  · Piromante: s5 burningCrit · s8 burnKillHeal · s12 critFireCdr · s15 burnKillMana ·
//    x2 explodedDmg los consume el núcleo (combat-math / nucleo_tv); s16 supernovaBurn lo
//    lee la Supernova (js/skills-maga.js); s9 Combustión lleva su poder p_combustion
//    (además de la activa) y p_ignicion (s0) solo aplica la Quemadura.
//  · Crionte: s15 Mente Gélida = tv.manaOnKill (núcleo, sin poder) · s16 Nova Perpetua =
//    mod nova_hielo { zone } (la Estela de una Nova que ralentiza también ralentiza: núcleo).
//    k_shatter_chain queda solo en s14 y k_eternal_winter solo en x1.
//  · Arcanista: s8 Piel de Maná = tv.drHighMana (reducción condicional del núcleo; fuera
//    a_manaskin y el tv.dmgReduc incondicional).
//  · Clase: c7 barrierDr lo aplica g.shield(…, { dr }) de la Barrera; m_t_inversion graba
//    su historial desde que conoces la activa (passiveTick).
// RECALIBRACIÓN 2c.2 (banco, típico Nv50 Piromante: jefe 44,4 → 55,9 s; la Maga carga con
// la media de jefe Nv50 porque el Guerrero no puede bajar más sin pasar el óptimo/típico ×15).
// Texto y valor cambian JUNTOS (ningún poder por debajo de su texto):
//  · s7 Pira: charco de 1,5 s/rango → 0,4 s/rango (era el nodo más fuerte: −14,9 % de DPS).
//  · s1 Llama Viva: +5 %/rango de Fuego → +3 %/rango.
//  · s16 Supernova Abrasadora: +50 %/rango de Quemadura → +30 %/rango.
//  · x1 Corazón del Sol: explosión del 40 % → 30 % del total de la Quemadura (powers-maga.js).
//  · x2 Sol Naciente: +15 %/rango → +5 %/rango contra los que ya estallaron.
// RECALIBRACIÓN 2e (banco de roles, §7.2; texto y valor JUNTOS):
//  · Piromante (daño en área ≥ 1,2·M; antes 0,74): Bola de Fuego salpica 100 → 250 % a 2 m
//    (skills-maga.js; la explosión es el daño de área), s14 Conflagración 70 → 200 % del
//    golpe medio al matar (powers-common.js), s1 Llama Viva 3 → 1 %/rango y s11 Llama
//    Persistente 15 → 8 %/rango (su UNI no debe crecer con el área). Supernova: quemadura
//    600 → 1200 % en 6 s (la definitiva aportaba el 11 % de UNI; §7.2 pide 12–22 %; la
//    quemadura no infla el golpe máximo del óptimo).
//  · Arcanista (un objetivo ≥ 1,15·M; área ≥ 0,75·M): Misiles Arcanos (s6A) 2 s/70 %/30 de
//    Maná → 1,2 s/55 %/25 de Maná y 1 Carga Arcana cada 2 misiles (con Barrera en su lugar la
//    Arcanista hacía un 30 % MÁS de UNI: los Misiles eran una trampa que robaba Maná al Rayo).
//    x1 Cadena de Rayos 50 → 90 % a 3 cercanos y SIN el doble golpe en solitario (era UNI
//    disfrazada de área; powers-maga.js). s14 Resonancia +15 → +12 % de crítico, s1 Potencia
//    Arcana 5 → 3 %/rango, s2 Conductividad +4 → +2 % de crítico/rango (el crítico topa al
//    60 %), s12 Concentración Absoluta 8 → 12 %/rango y s17 Dominio Arcano: Rayo y Orbe →
//    Orbe y Misiles (el Rayo ya llegaba al 33 % de la vida del jefe en un golpe óptimo).
//  · Crionte: Lanza de Hielo (s9) estallido 3 → 2 m y s16 Nova Perpetua suelo 4 → 2 s (su
//    área no debe superar a la del Piromante); s1 4 → 5 %/rango de Escarcha (UNI ≥ 0,85·M).
//  · c13 Erudición 5 → 3 %/rango contra élites (la clase entera iba sobrada contra jefes).
//  · Defensas de la ranura 2 (§7.2: la defensiva da ≥ +30 % de TTD+): Barrera de Maná (c2)
//    30 % del maná/30 s → 60 %/20 s (antes +11 %) y Armadura de Hielo (skills-maga.js)
//    escudo 20 → 25 % de la vida.
// RECALIBRACIÓN 2e — cierre (TTD+ al 50 % contra 3 élites + 4 comunes, ÁREA×5 con la manada
// caminando desde 8 m, medianas de 5 semillas; ver talents-guerrero.js):
//  · Piromante: la ranura 2 ofensiva daba +26 % de UNI (> 25): Meteoro (skills-maga.js) 4,1 →
//    3,7. El área vuelve por la Bola de Fuego (salpicadura 2,5 → 3,5 a 2 m) y s14 Conflagración
//    200 → 270 % del golpe medio al matar (powers-common.js): con la manada que llega en
//    oleadas, las muertes encadenadas son su área.
//  · Crionte: ÁREA×5 0,89 → 0,98·M: s0 Cero Absoluto astilla por debajo del 15 → 38 % (no
//    jefes NI élites: las élites no se borran de un golpe; powers-common.js) y s1 Mordedura
//    Gélida 5 → 7 %/rango. Congelado 1,5 → 1 s (spec-mechanics.js, s0): contra la manada de
//    élites congelarla 1,5 s cada 5 golpes le daba ×1,17·M de TTD+ (más que el Berserker) y
//    subía la M de la que cuelgan los suelos de TTD+ del resto; su control sigue en 73 %
//    lento / 29 % duro. Armadura de Hielo (skills-maga.js) 25 %/6 s/20 s → 30 %/8 s/12 s: la
//    defensiva daba +12 % de TTD+ (≥ +30 %).
//  · Arcanista: la ranura 2 ofensiva daba +8 % (< 12) y la definitiva el 11 % del UNI: Rayo
//    (skills-maga.js) 2,8 → 2,3, Misiles Arcanos 55 → 66 % por misil, Desgarro Arcano 3,25 →
//    4,4 por tic (650 → 880 %/s). x1 Cadena de Rayos 90 → 150 % (powers-maga.js) para que el
//    Rayo más flojo no hunda su área (≥ 0,75·M).
//  · Barra (ui-gauges-maga.js lee gaugeTuning): Resonancia 15 → 12 %, como el poder.
// Este archivo no importa nada (talents.js lo importa; evita ciclos con data/powers).

// valor de un efecto en el rango r (para los textos d(r)) y plural simple
const x = (v, r) => +(v * r).toFixed(2);
const pl = (r, one, many) => (r > 1 ? many : one);

// Activas `grant` de la Maga (§3.2, estado T). Formato de MEMORIA.md §7; todas
// kind 'talent' y req 10 (TALENT_SKILL_REQ). `type` = tipo genérico de
// game-skills.js; `behavior` = comportamiento propio (js/powers-maga.js, Paso 2c.1): si
// tiene cast, sustituye al `type` genérico; a_misiles solo aporta el tic de su canalización.
export const MAGA_TALENT_SKILLS = [
  // — árbol de clase —
  { id: 'm_t_barrera', name: 'Barrera de Maná', icon: '🔮', kind: 'talent', cat: 'defense', slots: ['k2'], tags: ['defense', 'shield', 'arcane'], elem: 'arcane',
    type: 'shield', behavior: 'm_t_barrera', req: 10, cd: 20, dur: 8, shieldManaPct: 60, color: 0xb98cff,
    desc: 'Una burbuja de maná absorbe daño igual al 60 % de tu maná máximo durante 8 s. Enfriamiento 20 s.' },
  { id: 'm_t_parpadeo', name: 'Parpadeo', icon: '💫', kind: 'talent', cat: 'movement', slots: ['k1'], tags: ['movement', 'arcane'], elem: 'arcane',
    type: 'blink', req: 10, cd: 15, range: 8, color: 0x99aaff,
    desc: 'Te teletransportas al instante 8 m hacia el cursor (atraviesas enemigos, no muros). Enfriamiento 15 s.' },
  { id: 'm_t_contrahechizo', name: 'Contrahechizo', icon: '🚫', kind: 'talent', cat: 'utility', slots: ['k2'], tags: ['utility', 'interrupt', 'arcane'], elem: 'arcane',
    behavior: 'm_t_contrahechizo', req: 10, cd: 18, range: 12, silence: 3, stagger: 20, color: 0xcc88ff,
    desc: 'Interrumpes al lanzador enemigo a 12 m y lo silencias 3 s; a los jefes les sumas 20 de stagger. Enfriamiento 18 s.' },
  { id: 'm_t_inversion', name: 'Inversión del Tiempo', icon: '⏳', kind: 'talent', cat: 'defense', slots: ['k2'], tags: ['defense', 'arcane'], elem: 'arcane',
    behavior: 'm_t_inversion', req: 10, cd: 60, rewind: 5, color: 0xd7c2ff,
    desc: 'Vuelves a la vida y a la posición que tenías hace 5 s (el hilo del tiempo se graba desde que conoces esta activa). Enfriamiento 60 s.' },
  { id: 'm_t_bloque', name: 'Bloque de Hielo', icon: '🧊', kind: 'talent', cat: 'defense', slots: ['k2'], tags: ['defense', 'frost'], elem: 'frost',
    behavior: 'm_t_bloque', req: 10, cd: 90, dur: 4, color: 0x9fe3ff,
    desc: 'Te encierras en hielo: eres inmune durante 4 s, pero no puedes moverte ni atacar (esquiva para romperlo antes). Enfriamiento 90 s.' },
  // — Piromante —
  { id: 'p_llamarada', name: 'Llamarada', icon: '🔥', kind: 'talent', cat: 'spec', slots: ['k3'], tags: ['spec', 'cone', 'fire'], elem: 'fire',
    type: 'cone', behavior: 'p_llamarada', req: 10, coef: 1.5, cost: 25, cd: 8, radius: 7, angle: 70, windup: 0.1, detonatePct: 60, color: 0xff7a22,
    desc: 'Insignia del Piromante: un cono de fuego de 7 m (preparación de 0,1 s): 150 % del arma y detona las Quemaduras, que hacen al instante el 60 % de su daño restante. Cuesta 25 de Maná; enfriamiento 8 s.' },
  { id: 'p_combustion', name: 'Combustión', icon: '☀️', kind: 'talent', cat: 'spec', slots: ['k3'], tags: ['spec', 'buff', 'fire'], elem: 'fire',
    type: 'buff', behavior: 'p_combustion', req: 10, cd: 90, dur: 10, buff: {}, fireAlwaysCrit: true, gaugeMult: 2, color: 0xffaa33,
    desc: 'Durante 10 s tus hechizos de Fuego son siempre críticos y el Calor se llena el doble de rápido. Enfriamiento 90 s.' },
  // tag 'spec' para que admita k2 y k3 (§3.2: k2/k3)
  { id: 'p_muro_fuego', name: 'Muro de Fuego', icon: '🧱', kind: 'talent', cat: 'utility', slots: ['k2', 'k3'], tags: ['utility', 'spec', 'zone', 'fire'], elem: 'fire',
    type: 'zone', behavior: 'p_muro_fuego', at: 'target', req: 10, coef: 0.6, cost: 20, cd: 18, dur: 5, range: 10, radius: 2, length: 8, width: 1, blocks: true, color: 0xff5511,
    desc: 'Levantas una línea de fuego de 8 m durante 5 s que quema (60 % del arma por segundo) y bloquea el paso a los enemigos que no son jefes. Cuesta 20 de Maná; enfriamiento 18 s.' },
  // — Crionte —
  { id: 'k_prision', name: 'Prisión de Hielo', icon: '🏔️', kind: 'talent', cat: 'spec', slots: ['k3'], tags: ['spec', 'area', 'cc', 'frost'], elem: 'frost',
    type: 'area', behavior: 'k_prision', at: 'target', req: 10, coef: 0.8, cost: 30, cd: 20, radius: 4, range: 10, windup: 0.12, layers: 5, freezeDur: 2, bossStagger: 20, color: 0x88ddff,
    desc: 'Insignia del Crionte: encierras en hielo a los enemigos en 4 m (preparación de 0,12 s): 80 % del arma y 5 capas de Escarcha, que los dejan Congelados 2 s; los jefes quedan Ateridos y suman 20 de stagger. Cuesta 30 de Maná; enfriamiento 20 s.' },
  { id: 'k_lanza', name: 'Lanza de Hielo', icon: '🔱', kind: 'talent', cat: 'spec', slots: ['rmb', 'k2', 'k3'], tags: ['spec', 'spender', 'proj', 'frost'], elem: 'frost',
    type: 'proj', behavior: 'k_lanza', req: 10, coef: 2.5, cost: 22, cd: 6, speed: 20, range: 13, pierce: true, frozenMult: 3, burstRadius: 2, color: 0xaeeaff,
    desc: 'Una lanza cristalina perforante: 250 % del arma; a los Congelados les hace el triple y los astilla en un estallido de 2 m. Cuesta 22 de Maná; enfriamiento 6 s.' },
  { id: 'k_ventisca', name: 'Ventisca', icon: '🌨️', kind: 'talent', cat: 'spec', slots: ['k3'], tags: ['spec', 'zone', 'cc', 'frost'], elem: 'frost',
    type: 'zone', behavior: 'k_ventisca', at: 'target', req: 10, coef: 0.3, cost: 35, cd: 15, radius: 5, dur: 6, range: 10, layersPerSec: 1, color: 0xcfefff,
    desc: 'Una tormenta de 5 m durante 6 s: 30 % del arma por segundo y suma 1 capa de Escarcha por segundo a todo lo que está dentro. Cuesta 35 de Maná; enfriamiento 15 s.' },
  { id: 'k_aliento', name: 'Aliento Boreal', icon: '🌬️', kind: 'talent', cat: 'utility', slots: ['k2', 'k3'], tags: ['utility', 'spec', 'cone', 'cc', 'frost'], elem: 'frost',
    type: 'cone', behavior: 'k_aliento', req: 10, coef: 1.0, cost: 20, cd: 12, radius: 6, angle: 70, knock: 4, layers: 3, color: 0xbfeaff,
    desc: 'Exhalas un cono helado de 6 m: 100 % del arma, empuja 4 m y suma 3 capas de Escarcha. Cuesta 20 de Maná; enfriamiento 12 s.' },
  // — Arcanista —
  { id: 'a_orbe', name: 'Orbe Arcano', icon: '🔵', kind: 'talent', cat: 'spec', slots: ['k3'], tags: ['spec', 'proj', 'arcane'], elem: 'arcane',
    type: 'proj', behavior: 'a_orbe', req: 10, coef: 2.0, cost: 20, cd: 8, speed: 6, range: 14, pierce: true, bounces: 2, color: 0xb388ff,
    desc: 'Insignia de la Arcanista: un orbe lento que atraviesa a los enemigos y rebota 2 veces (200 % del arma por impacto). Cuesta 20 de Maná; enfriamiento 8 s.' },
  { id: 'a_misiles', name: 'Misiles Arcanos', icon: '✴️', kind: 'talent', cat: 'spec', slots: ['rmb', 'k2', 'k3'], tags: ['spec', 'spender', 'channel', 'arcane'], elem: 'arcane',
    type: 'channel', behavior: 'a_misiles', req: 10, coef: 0.66, cost: 25, channelT: 1.2, ticks: 6, int: true, range: 10, manaPerTickPct: 1, color: 0xd28cff,
    desc: 'Canalizas 1,2 s seis misiles sobre un objetivo (66 % del arma cada uno); cada misil te devuelve un 1 % de maná y cada dos te dan 1 Carga Arcana. Los golpes fuertes te interrumpen. Cuesta 25 de Maná.' },
  { id: 'a_sello', name: 'Sello del Archimago', icon: '🔯', kind: 'talent', cat: 'spec', slots: ['k3'], tags: ['spec', 'mark', 'arcane'], elem: 'arcane',
    type: 'mark', behavior: 'a_sello', req: 10, cd: 45, dur: 8, range: 12, storePct: 25, charges: 4, color: 0xe0b0ff,
    desc: 'Marcas a un objetivo 8 s y ganas 4 Cargas Arcanas: el sello guarda el 25 % del daño que recibe y, al expirar, estalla con todo. Enfriamiento 45 s.' },
  { id: 'a_evocacion', name: 'Evocación', icon: '🌀', kind: 'talent', cat: 'utility', slots: ['k2', 'k3'], tags: ['utility', 'spec', 'channel', 'arcane'], elem: 'arcane',
    behavior: 'a_evocacion', req: 10, cd: 60, channelT: 3, ticks: 6, int: true, manaPct: 60, color: 0x9f8cff,
    desc: 'Canalizas 3 s y recuperas el 60 % de tu maná. Los golpes fuertes te interrumpen. Enfriamiento 60 s.' },
];

export const MAGA_TALENTS = {
  cls: {
    name: 'Maga',
    nodes: [
      { id: 'c1', name: 'Intelecto Arcano', icon: 'talents/maga-clase-c1.webp', t: 'p', r: 0, c: 1.5, max: 2, d: r => `+${x(4, r)}% de daño de hechizos.`, fx: { mod: { '@all': { dmg: 4 } } } },
      { id: 'c2', name: 'Barrera de Maná', icon: 'talents/maga-clase-c2.webp', t: 'a', r: 1, c: 0.5, max: 1, req: ['c1'], d: 'Activa nueva: absorbe daño igual al 60% de tu maná máximo. Enfriamiento 20 s.', fx: { grant: 'm_t_barrera' } },
      { id: 'c3', name: 'Parpadeo', icon: 'talents/maga-clase-c3.webp', t: 'a', r: 1, c: 2.5, max: 1, req: ['c1'], d: 'Activa nueva: te teletransportas 8 m hacia el cursor. Enfriamiento 15 s.', fx: { grant: 'm_t_parpadeo' } },
      { id: 'c4', name: 'Mente Afilada', icon: 'talents/maga-clase-c4.webp', t: 'p', r: 2, c: 0, max: 3, req: ['c2'], d: r => `+${x(2, r)}% de probabilidad de crítico.`, fx: { stats: { crit: 2 } } },
      { id: 'c5', name: 'Contrahechizo o Ralentizar', icon: 'talents/maga-clase-c5.webp', t: 'c', r: 2, c: 1.5, max: 1, req: ['c2', 'c3'], opts: [
        { k: 'A', name: 'Contrahechizo', desc: 'Activa: interrumpe al lanzador enemigo y lo silencia 3 s. Ideal en grupo.', active: true, fx: { grant: 'm_t_contrahechizo' } },
        { k: 'B', name: 'Ralentizar', desc: 'Tu siguiente hechizo ralentiza un 50% durante 4 s.', fx: { power: 'm_ralentizar' } } ] },
      { id: 'c6', name: 'Reservas Profundas', icon: 'talents/maga-clase-c6.webp', t: 'p', r: 2, c: 3, max: 2, req: ['c3'], d: r => `+${x(8, r)}% de maná máximo.`, fx: { stats: { mpPct: 8 } } },
      { id: 'c7', name: 'Escudo Prismático', icon: 'talents/maga-clase-c7.webp', t: 'p', r: 3, c: 0.5, max: 2, req: ['c4', 'c5'], d: r => `−${x(10, r)}% de daño recibido mientras la Barrera de Maná está activa.`, fx: { tv: { barrierDr: 10 } } },
      { id: 'c8', name: 'Presencia Mental', icon: 'talents/maga-clase-c8.webp', t: 'p', r: 3, c: 2.5, max: 2, req: ['c5', 'c6'], d: r => `−${x(4, r)}% de enfriamiento de todas tus habilidades.`, fx: { stats: { cdr: 4 } } },
      { id: 'c9', name: 'Conducto Elemental', icon: 'talents/maga-clase-c9.webp', t: 'p', r: 4, c: 0, max: 2, req: ['c7'], d: r => `+${x(1, r)} ${pl(r, 'nivel', 'niveles')} a las habilidades del elemento de tu especialización.`, fx: { skillLv: { '@spec': 1 } } },
      { id: 'c10', name: 'Flujo de Maná', icon: 'talents/maga-clase-c10.webp', t: 'p', r: 4, c: 1.5, max: 3, req: ['c7', 'c8'], d: r => `+${x(1, r)} de maná al golpear.`, fx: { stats: { mph: 1 } } },
      { id: 'c11', name: 'Celeridad', icon: 'talents/maga-clase-c11.webp', t: 'p', r: 4, c: 3, max: 2, req: ['c8'], d: r => `+${x(4, r)}% de velocidad de lanzamiento.`, fx: { stats: { aspdPct: 4 } } },
      { id: 'c12', name: 'Inversión o Bloque', icon: 'talents/maga-clase-c12.webp', t: 'c', r: 5, c: 0.5, max: 1, req: ['c9', 'c10'], opts: [
        { k: 'A', name: 'Inversión del Tiempo', desc: 'Activa: vuelves a tu vida y posición de hace 5 s. Enfriamiento 60 s.', active: true, fx: { grant: 'm_t_inversion' } },
        { k: 'B', name: 'Bloque de Hielo', desc: 'Activa: inmune 4 s, pero no puedes moverte ni atacar. Enfriamiento 90 s.', active: true, fx: { grant: 'm_t_bloque' } } ] },
      { id: 'c13', name: 'Erudición', icon: 'talents/maga-clase-c13.webp', t: 'p', r: 5, c: 2.5, max: 2, req: ['c10', 'c11'], d: r => `+${x(3, r)}% de daño contra élites y +${x(6, r)}% de experiencia.`, fx: { tv: { eliteDmg: 3 }, stats: { xpPct: 6 } } },
      { id: 'c14', name: 'Maestría Arcana', icon: 'talents/maga-clase-c14.webp', t: 'p', r: 6, c: 1.5, max: 1, req: ['c12', 'c13'], d: 'Los hechizos que cuestan más de 20 de maná cuestan un 15% menos.', fx: { tv: { costRedBig: { pct: 15, over: 20 } } } },
      { id: 'c15', name: 'Aura de Intelecto', icon: 'talents/maga-clase-c15.webp', t: 'k', r: 7, c: 1.5, max: 1, req: ['c14'], d: 'Grupo: tú y los aliados a 15 m ganan +5% de daño y +10% de maná máximo.', fx: { power: 'm_aura_intelecto' } },
    ],
    preset: [['c1', 2], ['c2', 1], ['c3', 1], ['c4', 3], ['c5', 1, 'A'], ['c6', 2], ['c8', 2], ['c10', 3], ['c13', 2]],
  },
  specs: [
    {
      id: 'piromante', name: 'Piromante', role: 'dps', icon: 'specs/piromante.webp', emblem: 'emblems/piromante.webp',
      mechanic: 'calor', innate: {},
      desc: 'Todo arde: la quemadura se propaga de enemigo en enemigo y estalla.',
      // preset de clase propio de esta especialización (RECOMMENDED.cls del mockup)
      clsPreset: [['c1', 2], ['c2', 1], ['c3', 1], ['c4', 3], ['c5', 1, 'A'], ['c6', 2], ['c8', 2], ['c10', 3], ['c13', 2]],
      nodes: [
        { id: 's0', name: 'Ignición', icon: 'talents/maga-piromante-s0.webp', t: 'k', r: 0, c: 1.5, max: 1, free: true, d: 'Nodo clave (gratis): tus golpes de Fuego aplican Quemadura, el 60% del golpe en 4 s, y generan Calor. Otorga la activa Llamarada: un cono de fuego de 7 m que detona las Quemaduras y hace el 60% de su daño restante al instante.', fx: { power: 'p_ignicion', grant: 'p_llamarada' } },
        { id: 's1', name: 'Llama Viva', icon: 'talents/maga-piromante-s1.webp', t: 'p', r: 1, c: 0.5, max: 3, req: ['s0'], d: r => `+${x(1, r)}% de daño de Fuego.`, fx: { elem: { fire: 1 } } },
        { id: 's2', name: 'Combustión Rápida', icon: 'talents/maga-piromante-s2.webp', t: 'p', r: 1, c: 2.5, max: 2, req: ['s0'], d: r => `−${x(10, r)}% de enfriamiento de Bola de Fuego.`, fx: { mod: { bola_fuego: { cdr: 10 } } } },
        { id: 's3', name: 'Brasas', icon: 'talents/maga-piromante-s3.webp', t: 'p', r: 2, c: 0, max: 2, req: ['s1'], d: r => `La Quemadura dura +${x(1, r)} s.`, fx: { tv: { burnDur: 1 } } },
        { id: 's4', name: 'Llamarada Avivada', icon: 'talents/maga-piromante-s4.webp', t: 'p', r: 2, c: 1.5, max: 1, req: ['s1', 's2'], d: 'Llamarada detona el 100% (en vez del 60%) del daño restante de las Quemaduras y te da 25 de Calor.', fx: { power: 'p_llamarada_avivada' } },
        { id: 's5', name: 'Calor Abrasador', icon: 'talents/maga-piromante-s5.webp', t: 'p', r: 2, c: 3, max: 3, req: ['s2'], d: r => `+${x(4, r)}% de crítico contra enemigos en llamas.`, fx: { tv: { burningCrit: 4 } } },
        { id: 's6', name: 'Propagación o Concentración', icon: 'talents/maga-piromante-s6.webp', t: 'c', r: 3, c: 0.5, max: 1, req: ['s3', 's4'], opts: [
          { k: 'A', name: 'Propagación', desc: 'Si muere un enemigo en llamas, su Quemadura salta a 2 enemigos cercanos.', fx: { power: 'p_propagacion' } },
          { k: 'B', name: 'Concentración', desc: 'La Quemadura se acumula hasta 3 veces sobre el mismo objetivo. Mejor contra jefes.', fx: { power: 'p_acumular' } } ] },
        { id: 's7', name: 'Pira', icon: 'talents/maga-piromante-s7.webp', t: 'p', r: 3, c: 2.5, max: 2, req: ['s4', 's5'], d: r => `Meteoro deja un charco de fuego durante ${x(0.4, r)} s.`, fx: { mod: { meteoro: { zone: 1, zoneDur: 0.4 } } } },
        { id: 's8', name: 'Fuego Interior', icon: 'talents/maga-piromante-s8.webp', t: 'p', r: 4, c: 0, max: 2, req: ['s6'], d: r => `Matar a un enemigo en llamas te cura un ${x(2, r)}% de vida.`, fx: { tv: { burnKillHeal: 2 } } },
        { id: 's9', name: 'Combustión', icon: 'talents/maga-piromante-s9.webp', t: 'a', r: 4, c: 1.5, max: 1, req: ['s6', 's7'], d: 'Activa nueva: durante 10 s tus hechizos de Fuego son siempre críticos y el Calor se duplica. Enfriamiento 90 s.', fx: { grant: 'p_combustion', power: 'p_combustion' } },
        { id: 's10', name: 'Ceniza Ardiente', icon: 'talents/maga-piromante-s10.webp', t: 'p', r: 4, c: 3, max: 2, req: ['s7'], d: r => `+${x(10, r)}% de daño de Meteoro y Supernova.`, fx: { mod: { meteoro: { dmg: 10 }, m_u_supernova: { dmg: 10 } } } },
        { id: 's11', name: 'Llama Persistente', icon: 'talents/maga-piromante-s11.webp', t: 'p', r: 5, c: 0.5, max: 2, req: ['s8', 's9'], d: r => `+${x(8, r)}% de daño de Quemadura.`, fx: { tv: { burnPct: 8 } } },
        { id: 's12', name: 'Pirotecnia', icon: 'talents/maga-piromante-s12.webp', t: 'p', r: 5, c: 2.5, max: 2, req: ['s9', 's10'], d: r => `Cada crítico reduce ${x(0.5, r)} s los enfriamientos de Fuego.`, fx: { tv: { critFireCdr: 0.5 } } },
        { id: 's13', name: 'Fénix o Muro de Fuego', icon: 'talents/maga-piromante-s13.webp', t: 'c', r: 6, c: 0, max: 1, req: ['s11'], opts: [
          { k: 'A', name: 'Fénix', desc: 'Una vez cada 2 minutos, al morir renaces con el 50% de vida.', fx: { power: 'p_fenix' } },
          { k: 'B', name: 'Muro de Fuego', desc: 'Activa: levanta una línea de fuego que quema y bloquea el paso 5 s.', active: true, fx: { grant: 'p_muro_fuego' } } ] },
        { id: 's14', name: 'Conflagración', icon: 'talents/maga-piromante-s14.webp', t: 'k', r: 6, c: 1.5, max: 1, req: ['s11', 's12'], d: 'Al matar, una explosión de fuego daña la zona con el 270% de tu daño.', fx: { power: 'm_conflag' } },
        { id: 's15', name: 'Combustible', icon: 'talents/maga-piromante-s15.webp', t: 'p', r: 6, c: 3, max: 2, req: ['s12'], d: r => `+${x(3, r)} de maná por cada enemigo en llamas que muere.`, fx: { tv: { burnKillMana: 3 } } },
        { id: 's16', name: 'Supernova Abrasadora', icon: 'talents/maga-piromante-s16.webp', t: 'p', r: 7, c: 1, max: 2, req: ['s13', 's14'], d: r => `Supernova aplica una Quemadura un ${x(30, r)}% más fuerte.`, fx: { tv: { supernovaBurn: 30 } } },
        { id: 's17', name: 'Ola de Calor', icon: 'talents/maga-piromante-s17.webp', t: 'p', r: 7, c: 2, max: 2, req: ['s14', 's15'], d: r => `+${x(20, r)}% de radio de las habilidades de Fuego.`, fx: { mod: { '@fire': { radius: 20 } } } },
        { id: 'x1', name: 'Corazón del Sol', icon: 'talents/maga-piromante-x1.webp', t: 'x', r: 8, c: 0.5, max: 1, req: ['s16', 's17'], d: 'Apex I: cuando una Quemadura termina, explota en área con el 30% de su daño total.', fx: { power: 'p_corazon_sol' } },
        { id: 'x2', name: 'Sol Naciente', icon: 'talents/maga-piromante-x2.webp', t: 'x', r: 8, c: 1.5, max: 2, req: ['x1'], d: r => `Apex II: +${x(5, r)}% de daño de Fuego contra enemigos que ya estallaron.`, fx: { tv: { explodedDmg: 5 } } },
        { id: 'x3', name: 'Nova Solar', icon: 'talents/maga-piromante-x3.webp', t: 'x', r: 8, c: 2.5, max: 1, req: ['x2'], d: 'Apex III (cúspide): cada 20 explosiones, Supernova se lanza sola y gratis.', fx: { power: 'p_nova_solar' } },
      ],
      preset: [['s1', 3], ['s2', 2], ['s4', 1], ['s6', 1, 'A'], ['s7', 2], ['s9', 1], ['s11', 2], ['s14', 1], ['s17', 2], ['s16', 2], ['x1', 1], ['x2', 1]],
    },
    {
      id: 'crionte', name: 'Crionte', role: 'control', icon: 'specs/crionte.webp', emblem: 'emblems/crionte.webp',
      mechanic: 'escarcha', innate: { staggerPct: 25 },
      desc: 'Congela, ralentiza y astilla: el enemigo nunca llega a tocarte.',
      // preset de clase propio de esta especialización (RECOMMENDED.cls del mockup)
      clsPreset: [['c1', 2], ['c2', 1], ['c3', 1], ['c5', 1, 'A'], ['c6', 2], ['c7', 2], ['c8', 2], ['c9', 2], ['c10', 2], ['c12', 1, 'B'], ['c14', 1], ['c15', 1]],
      nodes: [
        { id: 's0', name: 'Cero Absoluto', icon: 'talents/maga-crionte-s0.webp', t: 'k', r: 0, c: 1.5, max: 1, free: true, d: 'Nodo clave (gratis): tus golpes de Escarcha suman capas de hielo; a 5 capas el enemigo queda Congelado 1 s. Los Congelados con menos del 38% de vida se astillan (no jefes ni élites). Otorga la activa Prisión de Hielo: encierra en hielo a los enemigos en 4 m (5 capas: Congelados 2 s); los jefes quedan Ateridos. Enfriamiento 20 s.', fx: { power: 'm_shatter', tv: { shatterPct: 38 }, grant: 'k_prision' } },
        { id: 's1', name: 'Mordedura Gélida', icon: 'talents/maga-crionte-s1.webp', t: 'p', r: 1, c: 0.5, max: 3, req: ['s0'], d: r => `+${x(7, r)}% de daño de Escarcha.`, fx: { elem: { frost: 7 } } },
        { id: 's2', name: 'Invierno Temprano', icon: 'talents/maga-crionte-s2.webp', t: 'p', r: 1, c: 2.5, max: 2, req: ['s0'], d: r => `Nova de Hielo: −${x(10, r)}% de enfriamiento y +${x(10, r)}% de radio.`, fx: { mod: { nova_hielo: { cdr: 10, radius: 10 } } } },
        { id: 's3', name: 'Frío Persistente', icon: 'talents/maga-crionte-s3.webp', t: 'p', r: 2, c: 0, max: 2, req: ['s1'], d: r => `Tus hechizos de Escarcha ralentizan durante ${[4, 5][r - 1]} s${r < 2 ? ' (5 s en el rango 2)' : ''}.`, fx: { mod: { '@frost': { slow: [4, 5] } } } },
        { id: 's4', name: 'Prisión Profunda', icon: 'talents/maga-crionte-s4.webp', t: 'p', r: 2, c: 1.5, max: 1, req: ['s1', 's2'], d: 'Prisión de Hielo congela 3 s (en vez de 2) y suma 35 de stagger a los jefes (en vez de 20).', fx: { power: 'k_prision_profunda' } },
        { id: 's5', name: 'Sangre Fría', icon: 'talents/maga-crionte-s5.webp', t: 'p', r: 2, c: 3, max: 3, req: ['s2'], d: r => `+${x(6, r)}% de daño contra enemigos ralentizados o Congelados.`, fx: { tv: { slowedDmg: 6 } } },
        { id: 's6', name: 'Ventisca o Témpano', icon: 'talents/maga-crionte-s6.webp', t: 'c', r: 3, c: 0.5, max: 1, req: ['s3', 's4'], opts: [
          { k: 'A', name: 'Ventisca', desc: 'Activa: una tormenta de 5 m durante 6 s que suma 1 capa por segundo a todo lo que está dentro. Control de zona.', active: true, fx: { grant: 'k_ventisca' } },
          { k: 'B', name: 'Témpano', desc: 'Nova de Hielo se expande como un anillo que empuja 3 m y aturde 1 s. Para alejar a quien te alcanza.', fx: { mod: { nova_hielo: { radius: 30, stun: 1 } }, power: 'k_nova_push' } } ] },
        { id: 's7', name: 'Carámbanos', icon: 'talents/maga-crionte-s7.webp', t: 'p', r: 3, c: 2.5, max: 2, req: ['s4', 's5'], d: r => `Dardo Arcano dispara carámbanos que suman 1 capa de Escarcha; +${x(10, r)}% de su daño.`, fx: { power: 'k_icicle_dart', mod: { m_dardo: { dmg: 10 } } } },
        { id: 's8', name: 'Coraza de Escarcha', icon: 'talents/maga-crionte-s8.webp', t: 'p', r: 4, c: 0, max: 2, req: ['s6'], d: r => `−${x(5, r)}% de daño recibido; quien te golpea cuerpo a cuerpo gana 1 capa.`, fx: { tv: { dmgReduc: 5 }, power: 'k_frost_armor' } },
        { id: 's9', name: 'Lanza de Hielo', icon: 'talents/maga-crionte-s9.webp', t: 'a', r: 4, c: 1.5, max: 1, req: ['s6', 's7'], d: 'Activa nueva: una lanza perforante que hace el triple de daño a los Congelados y los astilla; el estallido golpea en 2 m. Enfriamiento 6 s.', fx: { grant: 'k_lanza' } },
        { id: 's10', name: 'Hielo Eterno', icon: 'talents/maga-crionte-s10.webp', t: 'p', r: 4, c: 3, max: 2, req: ['s7'], d: r => `+${x(1, r)} ${pl(r, 'nivel', 'niveles')} de Nova de Hielo y Prisión de Hielo.`, fx: { skillLv: { nova_hielo: 1, k_prision: 1 } } },
        { id: 's11', name: 'Escarcha Contagiosa', icon: 'talents/maga-crionte-s11.webp', t: 'p', r: 5, c: 0.5, max: 2, req: ['s8', 's9'], d: r => `Nova de Hielo suma ${x(1, r)} ${pl(r, 'capa adicional', 'capas adicionales')} a cada enemigo que toca.`, fx: { tv: { frostLayers: 1 } } },
        { id: 's12', name: 'Filo Cristalino', icon: 'talents/maga-crionte-s12.webp', t: 'p', r: 5, c: 2.5, max: 2, req: ['s9', 's10'], d: r => `Lanza de Hielo: −${x(12, r)}% de enfriamiento.${r >= 2 ? ' Es siempre crítica contra ralentizados.' : ' En el rango 2 es siempre crítica contra ralentizados.'}`, fx: { mod: { k_lanza: { cdr: 12, coldblood: [false, true] } } } },
        { id: 's13', name: 'Tumba o Aliento', icon: 'talents/maga-crionte-s13.webp', t: 'c', r: 6, c: 0, max: 1, req: ['s11'], opts: [
          { k: 'A', name: 'Tumba Glacial', desc: 'Los enemigos que mueren Congelados dejan un bloque de hielo que corta el paso 4 s.', fx: { power: 'k_ice_tomb' } },
          { k: 'B', name: 'Aliento Boreal', desc: 'Activa: un cono helado de 6 m que empuja 4 m y suma 3 capas. Enfriamiento 12 s.', active: true, fx: { grant: 'k_aliento' } } ] },
        { id: 's14', name: 'Reacción Glacial', icon: 'talents/maga-crionte-s14.webp', t: 'k', r: 6, c: 1.5, max: 1, req: ['s11', 's12'], d: 'Cada astillamiento suma 2 capas a los enemigos en 4 m: la congelación salta de uno a otro.', fx: { power: 'k_shatter_chain' } },
        { id: 's15', name: 'Mente Gélida', icon: 'talents/maga-crionte-s15.webp', t: 'p', r: 6, c: 3, max: 2, req: ['s12'], d: r => `+${x(3, r)} de maná por cada enemigo astillado o abatido.`, fx: { tv: { manaOnKill: 3 } } },
        { id: 's16', name: 'Nova Perpetua', icon: 'talents/maga-crionte-s16.webp', t: 'p', r: 7, c: 1, max: 2, req: ['s13', 's14'], d: r => `Nova de Hielo deja suelo helado 2 s que daña y ralentiza; +${x(15, r)}% de su daño.`, fx: { mod: { nova_hielo: { zone: 1, zoneDur: 2, dmg: 15 } } } },
        { id: 's17', name: 'Frío Implacable', icon: 'talents/maga-crionte-s17.webp', t: 'p', r: 7, c: 2, max: 2, req: ['s14', 's15'], d: r => `+${x(8, r)}% de daño contra élites y jefes; los Ateridos atacan un 15% más lento.`, fx: { tv: { eliteDmg: 8 }, power: 'k_numb' } },
        { id: 'x1', name: 'Invierno Eterno', icon: 'talents/maga-crionte-x1.webp', t: 'x', r: 8, c: 0.5, max: 1, req: ['s16', 's17'], d: 'Apex I: Nova de Hielo deja un campo helado de 6 s que suma 1 capa por segundo y ralentiza un 50%.', fx: { power: 'k_eternal_winter' } },
        { id: 'x2', name: 'Glaciación', icon: 'talents/maga-crionte-x2.webp', t: 'x', r: 8, c: 1.5, max: 2, req: ['x1'], d: r => `Apex II: los enemigos dentro del campo helado reciben +${x(8, r)}% de daño de todo tu grupo.`, fx: { tv: { fieldVuln: 8 } } },
        { id: 'x3', name: 'Edad de Hielo', icon: 'talents/maga-crionte-x3.webp', t: 'x', r: 8, c: 2.5, max: 1, req: ['x2'], d: 'Apex III (cúspide): cada 15 astillamientos, Prisión de Hielo se lanza sola y gratis sobre el grupo más numeroso.', fx: { power: 'k_ice_age' } },
      ],
      preset: [['s1', 3], ['s2', 2], ['s4', 1], ['s6', 1, 'A'], ['s7', 2], ['s9', 1], ['s11', 2], ['s12', 1], ['s13', 1, 'B'], ['s14', 1], ['s16', 2], ['x1', 1], ['x2', 1]],
    },
    {
      id: 'arcanista', name: 'Arcanista', role: 'dps', icon: 'specs/arcanista.webp', emblem: 'emblems/arcanista.webp',
      mechanic: 'cargas', innate: {},
      desc: 'Maná, críticos y cadenas: un solo objetivo, cero piedad.',
      // preset de clase propio de esta especialización (RECOMMENDED.cls del mockup)
      clsPreset: [['c1', 2], ['c2', 1], ['c3', 1], ['c4', 3], ['c6', 2], ['c8', 2], ['c10', 3], ['c11', 2], ['c13', 2]],
      nodes: [
        { id: 's0', name: 'Sobrecarga Arcana', icon: 'talents/maga-arcanista-s0.webp', t: 'k', r: 0, c: 1.5, max: 1, free: true, d: 'Nodo clave (gratis): cada golpe Arcano te devuelve 1 de maná. Dardo Arcano genera Cargas Arcanas (máx. 4) y Rayo las descarga todas a la vez. Otorga la activa Orbe Arcano: un orbe lento que atraviesa y rebota 2 veces (enfriamiento 8 s).', fx: { power: 'm_overload', stats: { mph: 1 }, grant: 'a_orbe' } },
        { id: 's1', name: 'Potencia Arcana', icon: 'talents/maga-arcanista-s1.webp', t: 'p', r: 1, c: 0.5, max: 3, req: ['s0'], d: r => `+${x(3, r)}% de daño Arcano.`, fx: { elem: { arcane: 3 } } },
        { id: 's2', name: 'Conductividad', icon: 'talents/maga-arcanista-s2.webp', t: 'p', r: 1, c: 2.5, max: 2, req: ['s0'], d: r => `Rayo: −${x(10, r)}% de enfriamiento y +${x(2, r)}% de crítico.`, fx: { mod: { rayo: { cdr: 10, crit: 2 } } } },
        { id: 's3', name: 'Manantial', icon: 'talents/maga-arcanista-s3.webp', t: 'p', r: 2, c: 0, max: 2, req: ['s1'], d: r => `+${x(2, r)} de maná al golpear.`, fx: { stats: { mph: 2 } } },
        { id: 's4', name: 'Orbe Resonante', icon: 'talents/maga-arcanista-s4.webp', t: 'p', r: 2, c: 1.5, max: 1, req: ['s1', 's2'], d: 'Orbe Arcano te da 1 Carga Arcana por enemigo golpeado (máx. 2 por lanzamiento).', fx: { power: 'a_orbe_resonante' } },
        { id: 's5', name: 'Precisión Letal', icon: 'talents/maga-arcanista-s5.webp', t: 'p', r: 2, c: 3, max: 3, req: ['s2'], d: r => `+${x(8, r)}% de daño crítico.`, fx: { tv: { critDmg: 8 } } },
        { id: 's6', name: 'Misiles o Arco Voltaico', icon: 'talents/maga-arcanista-s6.webp', t: 'c', r: 3, c: 0.5, max: 1, req: ['s3', 's4'], opts: [
          { k: 'A', name: 'Misiles Arcanos', desc: 'Activa: canalizas 1,2 s seis misiles sobre un objetivo; cada uno devuelve 1% de maná y cada dos te dan 1 Carga Arcana. Foco total.', active: true, fx: { grant: 'a_misiles' } },
          { k: 'B', name: 'Arco Voltaico', desc: 'Dardo Arcano rebota a 2 enemigos con −10% de daño. Más limpieza de oleadas, menos foco.', fx: { mod: { m_dardo: { chain: 2, dmg: -10 } } } } ] },
        { id: 's7', name: 'Gravedad del Orbe', icon: 'talents/maga-arcanista-s7.webp', t: 'p', r: 3, c: 2.5, max: 2, req: ['s4', 's5'], d: r => `Orbe Arcano: −${x(12, r)}% de enfriamiento y +${x(15, r)}% de daño.`, fx: { mod: { a_orbe: { cdr: 12, dmg: 15 } } } },
        { id: 's8', name: 'Piel de Maná', icon: 'talents/maga-arcanista-s8.webp', t: 'p', r: 4, c: 0, max: 2, req: ['s6'], d: r => `Con más del 50% de maná, −${x(5, r)}% de daño recibido.`, fx: { tv: { drHighMana: 5 } } },
        { id: 's9', name: 'Sello del Archimago', icon: 'talents/maga-arcanista-s9.webp', t: 'a', r: 4, c: 1.5, max: 1, req: ['s6', 's7'], d: 'Activa nueva: marca a un objetivo 8 s y te da 4 Cargas. Guarda el 25% del daño que le haces y al expirar estalla con todo. Enfriamiento 45 s.', fx: { grant: 'a_sello' } },
        { id: 's10', name: 'Alto Voltaje', icon: 'talents/maga-arcanista-s10.webp', t: 'p', r: 4, c: 3, max: 2, req: ['s7'], d: r => `+${x(10, r)}% de daño de Rayo.`, fx: { mod: { rayo: { dmg: 10 } } } },
        { id: 's11', name: 'Claridad', icon: 'talents/maga-arcanista-s11.webp', t: 'p', r: 5, c: 0.5, max: 2, req: ['s8', 's9'], d: r => `Descargar 4 Cargas tiene un ${x(15, r)}% de probabilidad de dejar gratis tu siguiente Rayo.`, fx: { power: 'a_clarity', tv: { clarityPct: 15 } } },
        { id: 's12', name: 'Concentración Absoluta', icon: 'talents/maga-arcanista-s12.webp', t: 'p', r: 5, c: 2.5, max: 2, req: ['s9', 's10'], d: r => `+${x(12, r)}% de daño contra élites y jefes.`, fx: { tv: { eliteDmg: 12 } } },
        { id: 's13', name: 'Evocación o Pacto', icon: 'talents/maga-arcanista-s13.webp', t: 'c', r: 6, c: 0, max: 1, req: ['s11'], opts: [
          { k: 'A', name: 'Evocación', desc: 'Activa: canalizas 3 s y recuperas el 60% de tu maná. Los golpes fuertes te interrumpen.', active: true, fx: { grant: 'a_evocacion' } },
          { k: 'B', name: 'Pacto de Maná', desc: 'Con más del 70% de maná, +15% de daño. Premia no vaciarte nunca.', fx: { tv: { highManaDmg: 15 } } } ] },
        { id: 's14', name: 'Resonancia', icon: 'talents/maga-arcanista-s14.webp', t: 'k', r: 6, c: 1.5, max: 1, req: ['s11', 's12'], d: 'Con 4 Cargas, tus hechizos Arcanos tienen +12% de crítico y las Cargas no se desvanecen fuera de combate.', fx: { power: 'a_resonance' } },
        { id: 's15', name: 'Sobretensión', icon: 'talents/maga-arcanista-s15.webp', t: 'p', r: 6, c: 3, max: 2, req: ['s12'], d: r => `Con 4 Cargas, Dardo Arcano atraviesa a los enemigos; +${x(10, r)}% de su daño.`, fx: { power: 'a_overvolt', mod: { m_dardo: { dmg: 10 } } } },
        { id: 's16', name: 'Desintegrar', icon: 'talents/maga-arcanista-s16.webp', t: 'p', r: 7, c: 1, max: 2, req: ['s13', 's14'], d: r => `+${x(10, r)}% de daño contra enemigos por debajo del 35% de vida.`, fx: { tv: { lowHpDmg: 10 } } },
        { id: 's17', name: 'Dominio Arcano', icon: 'talents/maga-arcanista-s17.webp', t: 'p', r: 7, c: 2, max: 2, req: ['s14', 's15'], d: r => `+${x(1, r)} ${pl(r, 'nivel', 'niveles')} de Orbe Arcano y Misiles Arcanos.`, fx: { skillLv: { a_orbe: 1, a_misiles: 1 } } },
        { id: 'x1', name: 'Cadena de Rayos', icon: 'talents/maga-arcanista-x1.webp', t: 'x', r: 8, c: 0.5, max: 1, req: ['s16', 's17'], d: 'Apex I: los críticos de Rayo saltan a 3 enemigos cercanos con el 150% del daño.', fx: { power: 'a_chain_crit' } },
        { id: 'x2', name: 'Arco Eterno', icon: 'talents/maga-arcanista-x2.webp', t: 'x', r: 8, c: 1.5, max: 2, req: ['x1'], d: r => `Apex II: cada salto de la cadena tiene un ${x(25, r)}% de probabilidad de darte 1 Carga Arcana.`, fx: { power: 'a_arc_charge', tv: { arcChargePct: 25 } } },
        { id: 'x3', name: 'Singularidad', icon: 'talents/maga-arcanista-x3.webp', t: 'x', r: 8, c: 2.5, max: 1, req: ['x2'], d: 'Apex III (cúspide): descargar 4 Cargas hace que el objetivo reciba +15% de tu daño durante 6 s (hasta 2 veces).', fx: { power: 'a_singularity' } },
      ],
      preset: [['s1', 3], ['s2', 2], ['s4', 1], ['s6', 1, 'A'], ['s7', 2], ['s9', 1], ['s12', 2], ['s14', 1], ['s15', 2], ['s17', 2], ['x1', 1], ['x2', 1]],
    },
  ],
  skills: MAGA_TALENT_SKILLS,
};
