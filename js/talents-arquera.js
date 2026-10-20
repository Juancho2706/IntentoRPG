// ============================================================
// TALENTOS de la ARQUERA — árbol de clase + 3 especializaciones (Paso 2c.1, SOLO DATOS)
// ============================================================
// Transcripción LITERAL de los mockups aprobados (D:\Proyectos\IntentoRPG-assets\mockups\):
//   Spec-Francotiradora / Spec-Montaraz / Spec-Tiradora.dc.html (árbol de clase idéntico en los 3)
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
//  · s0 de cada especialización otorga la insignia (fx.grant) y su texto la describe; s4 pasa a
//    potenciarla (t:'p', 1 rango): Aliento del Cazador / Cepo Doble / Andanada Impulsiva (§5.2.1).
//  · Francotiradora s0 «+50 %» → «+30 %» (m_deadeye ×1,30); Montaraz s0 «+25 %» → «+20 %» (m_hunt
//    ×1,20) y fuera el tv.slowedDmg 25 duplicado (§5.2.2).
//  · Vocabulario (§5.2.3): Francotiradora s10 cdhit→critCdr, s12 a_p_punteria→a_t_apuntado (y el
//    texto); Montaraz s3 {zone:1, zoneDur:2, slowPct:[30,30]}, s5 {slowPct:10, slow:[3,3,3]},
//    s6A/s16 stun→root, s6B radius 3→100, s17 mod.vuln→tv.rootedWeak; c11 / Tiradora s5
//    agilidad.dur→durS; c14 costRed→costRedBig {pct:15, over:15}.
//    Los valores que NO crecen con el rango van en array ([30,30], [3,3,3]) porque talents.js
//    multiplica por el rango todo número suelto.
//  · DESVIACIÓN (fuera de §5.2): Montaraz s10 «Lazo Corredizo» también stun→root: su texto dice
//    «inmoviliza» y aplica el mismo motivo que s6A/s16.
//  · a_t_arpon lleva el tag 'utility' y a_t_senuelo el tag 'spec' para que defaultSlots les abra
//    k2 y k3 (§3.3 pide k3/k2); a_t_silencio suma el tag 'proj' (es una flecha).
//
//
// AJUSTES DEL PASO 2c.1 (para que cada nodo haga lo que dice su texto; efectos en
// js/powers-arquera.js):
//  · a_t_silencio: fuera `stagger: 20` (applyCC('interrupt') ya suma 20 a los jefes: con
//    los dos eran 40, el texto dice 20).
//  · F s6B Herida Abierta: fuera mod.dot 'bleed' + tv.bleedPct 80 (sangraba con CADA impacto y
//    subía todo sangrado ajeno); ahora solo los críticos sangran el 80 % del golpe en 6 s.
//  · F x3: fuera mod.echo (el Eco del núcleo repetía SIEMPRE al 60 % a los 0,5 s); el doble
//    disparo (2.º crítico seguro) solo con Concentración 100, en el comportamiento.
//  · M s10 Lazo: fuera mod.root (inmovilizaba a TODOS los atravesados; el texto: al primero).
//
// PASO 2c.2 (sin «anfitriones»: cada nodo lleva SU poder o una clave tv del núcleo; tabla
// completa en la cabecera de js/powers-arquera.js):
//  · Poderes propios nuevos: c12B a_camuflaje · F s6B f_herida_abierta, s15 f_acechador ·
//    M s3 m_abrojos, s6A m_cepo_hierro, s6B m_mina, s10 m_lazo, s11 m_ponzona ·
//    T s5 t_viento_cola, s6B t_corona. Retirado f_perch (s8 es ya tv del núcleo).
//  · Claves tv del núcleo: c7 drAfterRoll · F s8 drFocus, s11 focusEnergy · M s8 drVsSlowed
//    (sin dmgReduc: solo contra ralentizados), s15 preyDmg (antes eliteDmg corregido), s17
//    rootedWeak · T s8 drMoving (sin dmgReduc: solo en movimiento), s11 galeHeal + galeEnergy.
//  · M s6A / s16: mod.root → mod.rootAdd (+1 s / +0,5 s que SE SUMAN a los 2 s base).
//  · M s6B: fuera mod.dmg 120 (no era un bono aditivo: la explosión del 120 % la da el
//    comportamiento con su coeficiente).
//  · T s5: fuera mod.agilidad.buff 5 (era un +5 % RELATIVO del buff, ≈ +0,75 de vel. de ataque
//    y +1,5 de movimiento por rango, que el texto no dice); queda solo el +5 %/rango de vel. de
//    ataque del texto (t_viento_cola). Pequeña corrección a la baja, a propósito.
// CHOQUES con el mockup que se quedan como están (núcleo):
//  · T s6A «rebota con el 50 %»: el Encadenado del núcleo rebota al 75 % y −25 % por salto
//    (Paso 2e: el nodo pasa a ser el poder t_rebote; ver RECALIBRACIÓN 2e).
//  · T s2 «Disparar ya no te frena»: disparar no frena en este juego (se cumple solo).
//  · M s2 «Ves el rastro de tu Presa» y la parte «revela invisibles» de la Bengala: no hay
//    enemigos invisibles todavía (la Bengala deja e.revealedT para cuando los haya).
//  · Cepo de Hierro: 50 % a los jefes con pct 100 (applyCC divide a la mitad la de los jefes).
// PENDIENTE_2C1: (vacío)
// RECALIBRACIÓN 2c.2 (banco, típico Nv50 Francotiradora: élite 4,11 → 5,09 s, jefe 35,7 →
// 45,2 s). El crítico ya topa (60 %) y la Energía sobra a Nv50 (recurso al golpear topado
// a 2), así que el exceso estaba en los nodos que solo llegan a Nv50. Texto y valor
// cambian JUNTOS (ningún poder por debajo de su texto):
//  · s7 Letalidad: +15 %/rango de daño crítico → +4 %/rango.
//  · c13 Conocer a la Presa: +5 %/rango contra élites y jefes → +2 %/rango.
//  · c8 Cadencia: +4 %/rango de velocidad de ataque → +2 %/rango.
//  · c14 Economía Letal: −15 % de coste (más de 15 de Energía) → −10 %.
//  · s12 Puntas de Acero Negro: +1 nivel/rango solo a Disparo Apuntado (la insignia; antes
//    también a Flecha Perforante).
//  · skills-arquera.js: Lluvia de Flechas 0,6 → 0,52 por oleada (2,08 WD) y Diluvio de
//    Saetas 2,2 → 1,95 por oleada (15,6 WD; su parte de UNI a Nv50 llegaba a 21 %).
// RECALIBRACIÓN 2e (banco de roles, §7.2; texto y valor JUNTOS):
//  · Francotiradora (un objetivo, la mejor de la clase por ≥ 10 %): Disparo Apuntado 380 →
//    320 % (la insignia entra en la rotación de §7.1 y ponía al jefe en 30 s < 36), s0 Tiro
//    Mortal ×1,30 → ×1,20 (powers-common.js), s1 Ojo de Águila +3 % de crítico → +4 % de daño
//    crítico por rango (el crítico ya topaba al 60 %: el nodo no hacía nada), s7 Letalidad
//    4 → 2, s17 Tiro Limpio 12 → 9, x2 Herida Expuesta 12 → 6 y s6B Herida Abierta 80 → 50 %
//    (powers-arquera.js). Bomba de Humo (skills-arquera.js) 4 s/−40 %/22 s → 6 s/−50 %/13 s:
//    TTD+ 0,43 → 0,97·M (§7.2: ≥ 0,85).
//  · Tiradora (área ≥ 1,2·M; antes 0,63): s6A Flechas Rebotadoras: de «la PRIMERA flecha de
//    cada lanzamiento rebota a 2» (mod.chain del núcleo) a «CADA flecha rebota a 5, la primera
//    con el 180 %» (poder t_rebote; el rebote del núcleo pierde un 25 % por salto); Flecha
//    Múltiple 70 → 35 % por flecha (skills-arquera.js; el abanico de 5 a un jefe grande era un
//    escopetazo de 150 %), s10 Lluvia Torrencial +10 → +50 % de daño/rango; s0 +15 → +8 % y
//    s1 4 → 2 %/rango de velocidad de ataque, s7 −10 → −5 %/rango de coste, s17 6 → 2 %/rango
//    de Físico y x2 Huracán +10 → +5 % de daño/rango (el Impulso sigue en +10/rango: ahora es
//    el doble de infiniteDmg en powers-arquera.js). x1 Ráfaga Infinita: abanico el doble de
//    ancho (contra un jefe no es un escopetazo doble).
//  · Montaraz (control): s0 Cacería ×1,20 → ×1,10 (powers-common.js; contra un jefe ralentizado
//    todo el combate era UNI pura y le quitaba a la Francotiradora ser la mejor de la clase),
//    s1 5 → 2 %/rango, s5 Flecha Lastrada 10/20/30 % → 30/35/40 % de ralentización (§7.2:
//    ≥ 40 % del tiempo inmovilizados o ralentizados; antes 19 %), Trampa de Cepo 150 → 60 %.
//    Red de Caza (skills-arquera.js) inmoviliza 2 → 1,5 s.
//  · Clase: c9 Flechas Templadas: +1 nivel a Múltiple y Perforante → a Múltiple y +2 a Lluvia;
//    c14 Economía Letal −10 → −5 %. skills-arquera.js: Disparo Rápido 1,15 → 1,0 («solo
//    básico» Nv10 ×0,63 > 0,6) y Lluvia de Flechas 0,52 → 0,7 por oleada (2,8 WD).
// Este archivo no importa nada (talents.js lo importa; evita ciclos con data/powers).

// valor de un efecto en el rango r (para los textos d(r)) y plural simple
const x = (v, r) => +(v * r).toFixed(2);
const pl = (r, one, many) => (r > 1 ? many : one);

// Activas `grant` de la Arquera (§3.3, estado T). Formato de MEMORIA.md §7; todas
// kind 'talent' y req 10 (TALENT_SKILL_REQ). `type` = tipo genérico de
// game-skills.js; `behavior` = comportamiento propio (js/powers-arquera.js,
// arqueraSkillBehaviors: manda sobre el `type` genérico).
export const ARQUERA_TALENT_SKILLS = [
  // — árbol de clase —
  { id: 'a_t_voltereta', name: 'Voltereta', icon: '🤸', kind: 'talent', cat: 'movement', slots: ['k1'], tags: ['movement', 'physical'], elem: 'physical',
    behavior: 'a_t_voltereta', req: 10, cd: 12, range: 6, lockT: 0.25, freeShot: true, color: 0xd8c49a,
    desc: 'Ruedas 6 m hacia atrás y tu próximo disparo no cuesta Energía. Enfriamiento 12 s.' },
  { id: 'a_t_conmocion', name: 'Disparo Conmocionante', icon: '🎯', kind: 'talent', cat: 'utility', slots: ['k2'], tags: ['utility', 'proj', 'cc', 'physical'], elem: 'physical',
    type: 'proj', req: 10, coef: 1.0, cost: 10, cd: 6, speed: 18, range: 12, slow: 4, slowPct: 50, color: 0xc8b48a,
    desc: 'Una flecha roma: 100 % del arma y ralentiza un 50 % durante 4 s. Cuesta 10 de Energía; enfriamiento 6 s.' },
  { id: 'a_t_silencio', name: 'Flecha Silenciadora', icon: '🤫', kind: 'talent', cat: 'utility', slots: ['k2'], tags: ['utility', 'interrupt', 'proj', 'physical'], elem: 'physical',
    type: 'proj', behavior: 'a_t_silencio', req: 10, coef: 0.8, cd: 18, speed: 22, range: 14, silence: 3, color: 0xb98cff,
    desc: 'Una flecha que interrumpe al lanzador enemigo y lo silencia 3 s (80 % del arma); a los jefes les suma 20 de stagger. Enfriamiento 18 s.' },
  { id: 'a_t_bengala', name: 'Flecha Bengala', icon: '🎆', kind: 'talent', cat: 'utility', slots: ['k2'], tags: ['utility', 'zone', 'ally', 'physical'], elem: 'physical',
    behavior: 'a_t_bengala', at: 'target', req: 10, cd: 30, radius: 10, dur: 8, range: 12, dmgPct: 8, reveal: true, color: 0xffcc55,
    desc: 'Una bengala revela a los enemigos invisibles en 10 m durante 8 s; dentro, el grupo hace +8 % de daño. Enfriamiento 30 s.' },
  { id: 'a_t_camuflaje', name: 'Camuflaje', icon: '🍃', kind: 'talent', cat: 'defense', slots: ['k2'], tags: ['defense', 'physical'], elem: 'physical',
    behavior: 'a_t_camuflaje', req: 10, cd: 30, dur: 4, color: 0x8fbf7a,
    desc: 'Te vuelves invisible 4 s (los enemigos pierden el objetivo); tu primer disparo al salir es crítico seguro. Enfriamiento 30 s.' },
  // — Francotiradora —
  { id: 'a_t_apuntado', name: 'Disparo Apuntado', icon: '🏹', kind: 'talent', cat: 'spec', slots: ['rmb', 'k2', 'k3'], tags: ['spec', 'spender', 'proj', 'physical'], elem: 'physical',
    type: 'proj', behavior: 'a_t_apuntado', req: 10, coef: 3.2, cost: 30, cd: 6, windup: 1.0, speed: 30, range: 16, pierce: true, beam: true, color: 0xfff1a8,
    desc: 'Insignia de la Francotiradora: cargas 1 s (la esquiva lo cancela) y disparas una saeta que atraviesa toda la línea con el 320 % del arma. Cuesta 30 de Energía; enfriamiento 6 s.' },
  { id: 'a_t_vision', name: 'Visión Certera', icon: '👁️', kind: 'talent', cat: 'spec', slots: ['k3'], tags: ['spec', 'buff', 'physical'], elem: 'physical',
    type: 'buff', behavior: 'a_t_vision', req: 10, cd: 90, dur: 12, buff: { aspdPct: 25 }, keepFocus: true, aimedCdr: 50, color: 0xffd966,
    desc: 'Durante 12 s moverte no vacía la Concentración, ganas +25 % de velocidad de ataque y Disparo Apuntado se recarga un 50 % más rápido. Enfriamiento 90 s.' },
  { id: 'a_t_disuasorio', name: 'Disparo Disuasorio', icon: '💥', kind: 'talent', cat: 'movement', slots: ['k1'], tags: ['movement', 'proj', 'cc', 'physical'], elem: 'physical',
    behavior: 'a_t_disuasorio', req: 10, coef: 1.2, cd: 12, range: 8, selfKnock: 8, stun: 1, color: 0xe8d27a,
    desc: 'Un disparo a quemarropa: 120 % del arma, aturde 1 s al objetivo y el retroceso te lanza 8 m hacia atrás. Enfriamiento 12 s.' },
  // — Montaraz —
  { id: 'a_t_cepo', name: 'Trampa de Cepo', icon: '🪤', kind: 'talent', cat: 'spec', slots: ['k3'], tags: ['spec', 'trap', 'cc', 'nature'], elem: 'nature',
    type: 'trap', behavior: 'a_t_cepo', req: 10, coef: 0.6, cost: 10, cd: 8, charges: 1, maxArmed: 3, radius: 1.5, root: 2, armT: 30, range: 9, dotKind: 'poison', dotDur: 5, color: 0x86d47a,
    desc: 'Insignia del Montaraz: armas una trampa (hasta 3 a la vez) que inmoviliza 2 s a quien la pisa y lo envenena con el 60 % del arma en 5 s. 1 carga (8 s por carga); cuesta 10 de Energía.' },
  // tag 'utility' para que admita la ranura 2 (k3/k2 en §3.3; defaultSlots lo exige)
  { id: 'a_t_arpon', name: 'Arpón', icon: '🪝', kind: 'talent', cat: 'spec', slots: ['k2', 'k3'], tags: ['spec', 'proj', 'cc', 'utility', 'physical'], elem: 'physical',
    type: 'proj', behavior: 'a_t_arpon', req: 10, coef: 1.2, cost: 15, cd: 10, speed: 22, range: 12, slow: 3, slowPct: 60, pull: 6, color: 0xa0a0a0,
    desc: 'Un arpón con cadena: 120 % del arma, atrae al objetivo 6 m hacia tu trampa más cercana y lo ralentiza un 60 % durante 3 s. Cuesta 15 de Energía; enfriamiento 10 s.' },
  { id: 'a_t_senuelo', name: 'Señuelo de Paja', icon: '🎎', kind: 'talent', cat: 'utility', slots: ['k2', 'k3'], tags: ['utility', 'spec', 'summon', 'taunt', 'nature'], elem: 'nature',
    behavior: 'a_t_senuelo', at: 'target', req: 10, coef: 2.0, cd: 25, dur: 5, radius: 8, burstRadius: 3, range: 10, color: 0xc9a86a,
    desc: 'Plantas un muñeco de paja que provoca a los enemigos a 8 m durante 5 s y luego estalla en espinas (200 % del arma en 3 m). Enfriamiento 25 s.' },
  // — Tiradora Veloz —
  { id: 'a_t_andanada', name: 'Andanada', icon: '🎇', kind: 'talent', cat: 'spec', slots: ['k3'], tags: ['spec', 'proj', 'area', 'movement', 'physical'], elem: 'physical',
    type: 'proj', behavior: 'a_t_andanada', req: 10, coef: 0.6, cost: 25, cd: 6, count: 12, spread: 1.047, speed: 18, range: 10, lockT: 0.35, backstep: 3, color: 0x66d7c7,
    desc: 'Insignia de la Tiradora: barres un arco de 120° con 12 flechas (60 % del arma cada una) mientras retrocedes 3 m. Cuesta 25 de Energía; enfriamiento 6 s.' },
  { id: 'a_t_danza', name: 'Danza de Flechas', icon: '🌀', kind: 'talent', cat: 'spec', slots: ['k3'], tags: ['spec', 'area', 'channel', 'movement', 'physical'], elem: 'physical',
    behavior: 'a_t_danza', req: 10, coef: 0.5, cost: 20, cd: 25, channelT: 4, ticks: 16, radius: 4, moveFree: true, slowImmune: true, color: 0x7fe8d8,
    desc: 'Durante 4 s disparas 16 flechas en espiral a tu alrededor (50 % del arma cada una) sin dejar de correr, inmune a las ralentizaciones. Cuesta 20 de Energía; enfriamiento 25 s.' },
  { id: 'a_t_salto', name: 'Salto de Retirada', icon: '🦘', kind: 'talent', cat: 'movement', slots: ['k1'], tags: ['movement', 'proj', 'physical'], elem: 'physical',
    behavior: 'a_t_salto', req: 10, coef: 0.6, cd: 12, range: 7, airT: 0.4, lockT: 0.4, count: 5, gaugeGain: 30, color: 0x9fe0d6,
    desc: 'Saltas 7 m hacia atrás y al aterrizar disparas 5 flechas (60 % del arma cada una); ganas 30 de Impulso. Enfriamiento 12 s.' },
];

export const ARQUERA_TALENTS = {
  cls: {
    name: 'Arquera',
    nodes: [
      { id: 'c1', name: 'Pulso Firme', icon: 'talents/arquera-clase-c1.webp', t: 'p', r: 0, c: 1.5, max: 2, d: r => `+${x(4, r)}% de daño con arco.`, fx: { stats: { dmgPct: 4 } } },
      { id: 'c2', name: 'Voltereta', icon: 'talents/arquera-clase-c2.webp', t: 'a', r: 1, c: 0.5, max: 1, req: ['c1'], d: 'Activa nueva: ruedas 6 m hacia atrás y tu próximo disparo no cuesta Energía. Enfriamiento 12 s.', fx: { grant: 'a_t_voltereta' } },
      { id: 'c3', name: 'Disparo Conmocionante', icon: 'talents/arquera-clase-c3.webp', t: 'a', r: 1, c: 2.5, max: 1, req: ['c1'], d: 'Activa nueva: una flecha roma que ralentiza un 50% durante 4 s. 10 de Energía, enfriamiento 6 s.', fx: { grant: 'a_t_conmocion' } },
      { id: 'c4', name: 'Ojo de Halcón', icon: 'talents/arquera-clase-c4.webp', t: 'p', r: 2, c: 0, max: 3, req: ['c2'], d: r => `+${x(2, r)}% de probabilidad de crítico.`, fx: { stats: { crit: 2 } } },
      { id: 'c5', name: 'Silencio o Paso Ligero', icon: 'talents/arquera-clase-c5.webp', t: 'c', r: 2, c: 1.5, max: 1, req: ['c2', 'c3'], opts: [
        { k: 'A', name: 'Flecha Silenciadora', desc: 'Activa: interrumpe al lanzador enemigo y lo silencia 3 s. Ideal en grupo.', active: true, fx: { grant: 'a_t_silencio' } },
        { k: 'B', name: 'Paso Ligero', desc: '+12% de velocidad de movimiento si no recibes daño durante 3 s.', fx: { power: 'a_tailwind' } } ] },
      { id: 'c6', name: 'Carcaj Profundo', icon: 'talents/arquera-clase-c6.webp', t: 'p', r: 2, c: 3, max: 2, req: ['c3'], d: r => `+${x(6, r)} de Energía máxima.`, fx: { stats: { mp: 6 } } },
      { id: 'c7', name: 'Cuero Curtido', icon: 'talents/arquera-clase-c7.webp', t: 'p', r: 3, c: 0.5, max: 2, req: ['c4', 'c5'], d: r => `−${x(4, r)}% de daño recibido; el doble durante 2 s tras una Voltereta.`, fx: { tv: { dmgReduc: 4, drAfterRoll: 4 } } },
      { id: 'c8', name: 'Cadencia', icon: 'talents/arquera-clase-c8.webp', t: 'p', r: 3, c: 2.5, max: 2, req: ['c5', 'c6'], d: r => `+${x(2, r)}% de velocidad de ataque.`, fx: { stats: { aspdPct: 2 } } },
      { id: 'c9', name: 'Flechas Templadas', icon: 'talents/arquera-clase-c9.webp', t: 'p', r: 4, c: 0, max: 2, req: ['c7'], d: r => `+${x(1, r)} ${pl(r, 'nivel', 'niveles')} a Flecha Múltiple y +${x(2, r)} a Lluvia de Flechas.`, fx: { skillLv: { flecha_multiple: 1, lluvia_flechas: 2 } } },
      { id: 'c10', name: 'Instinto de Cazadora', icon: 'talents/arquera-clase-c10.webp', t: 'p', r: 4, c: 1.5, max: 3, req: ['c7', 'c8'], d: r => `+${x(1, r)} de Energía al golpear.`, fx: { stats: { mph: 1 } } },
      { id: 'c11', name: 'Paso de Viento', icon: 'talents/arquera-clase-c11.webp', t: 'p', r: 4, c: 3, max: 2, req: ['c8'], d: r => `+${x(4, r)}% de velocidad de movimiento y +${x(1, r)} s de duración de Agilidad.`, fx: { stats: { spdPct: 4 }, mod: { agilidad: { durS: 1 } } } },
      { id: 'c12', name: 'Bengala o Camuflaje', icon: 'talents/arquera-clase-c12.webp', t: 'c', r: 5, c: 0.5, max: 1, req: ['c9', 'c10'], opts: [
        { k: 'A', name: 'Flecha Bengala', desc: 'Activa: revela a los invisibles en 10 m durante 8 s; dentro, el grupo hace +8% de daño.', active: true, fx: { grant: 'a_t_bengala' } },
        { k: 'B', name: 'Camuflaje', desc: 'Activa: invisible 4 s; tu primer disparo al salir es crítico seguro.', active: true, fx: { grant: 'a_t_camuflaje', power: 'a_camuflaje' } } ] },
      { id: 'c13', name: 'Conocer a la Presa', icon: 'talents/arquera-clase-c13.webp', t: 'p', r: 5, c: 2.5, max: 2, req: ['c10', 'c11'], d: r => `+${x(2, r)}% de daño contra élites y jefes.`, fx: { tv: { eliteDmg: 2 } } },
      { id: 'c14', name: 'Economía Letal', icon: 'talents/arquera-clase-c14.webp', t: 'p', r: 6, c: 1.5, max: 1, req: ['c12', 'c13'], d: 'Las habilidades que cuestan más de 15 de Energía cuestan un 5% menos.', fx: { tv: { costRedBig: { pct: 5, over: 15 } } } },
      { id: 'c15', name: 'Espíritu del Halcón', icon: 'talents/arquera-clase-c15.webp', t: 'k', r: 7, c: 1.5, max: 1, req: ['c14'], d: 'Grupo: tú y los aliados a 15 m ganan +5% de probabilidad de crítico y +6% de velocidad de movimiento.', fx: { power: 'a_aura_halcon' } },
    ],
    preset: [['c1', 2], ['c2', 1], ['c3', 1], ['c4', 3], ['c5', 1, 'A'], ['c7', 1], ['c8', 2], ['c10', 3], ['c13', 2], ['c14', 1], ['c15', 1]],
  },
  specs: [
    {
      id: 'francotiradora', name: 'Francotiradora', role: 'dps', icon: 'specs/francotiradora.webp', emblem: 'emblems/francotiradora.webp',
      mechanic: 'concentracion', innate: {},
      desc: 'Un disparo, una baja: críticos devastadores desde lejos.',
      // preset de clase propio de esta especialización (RECOMMENDED.cls del mockup)
      clsPreset: [['c1', 2], ['c2', 1], ['c3', 1], ['c4', 3], ['c5', 1, 'A'], ['c7', 1], ['c8', 2], ['c10', 3], ['c13', 2], ['c14', 1], ['c15', 1]],
      nodes: [
        { id: 's0', name: 'Tiro Mortal', icon: 'talents/arquera-francotiradora-s0.webp', t: 'k', r: 0, c: 1.5, max: 1, free: true, d: 'Nodo clave (gratis): tus críticos contra enemigos con más del 60% de vida hacen +20% de daño. Quedarte quieta genera Concentración. Otorga la activa Disparo Apuntado: cargas 1 s y disparas una saeta que atraviesa toda la línea con el 320% de daño.', fx: { power: 'm_deadeye', grant: 'a_t_apuntado' } },
        { id: 's1', name: 'Ojo de Águila', icon: 'talents/arquera-francotiradora-s1.webp', t: 'p', r: 1, c: 0.5, max: 3, req: ['s0'], d: r => `+${x(4, r)}% de daño crítico.`, fx: { tv: { critDmg: 4 } } },
        { id: 's2', name: 'Aliento Contenido', icon: 'talents/arquera-francotiradora-s2.webp', t: 'p', r: 1, c: 2.5, max: 2, req: ['s0'], d: r => `La Concentración sube un ${x(20, r)}% más rápido.`, fx: { tv: { focusRate: 20 } } },
        { id: 's3', name: 'Calibre Pesado', icon: 'talents/arquera-francotiradora-s3.webp', t: 'p', r: 2, c: 0, max: 2, req: ['s1'], d: r => `+${x(10, r)}% de daño de Flecha Perforante.`, fx: { mod: { flecha_perforante: { dmg: 10 } } } },
        { id: 's4', name: 'Aliento del Cazador', icon: 'talents/arquera-francotiradora-s4.webp', t: 'p', r: 2, c: 1.5, max: 1, req: ['s1', 's2'], d: 'Con la Concentración al 100%, Disparo Apuntado sale al instante (sin carga) y gasta 50 de Concentración.', fx: { power: 'f_aliento_cazador' } },
        { id: 's5', name: 'Primera Sangre', icon: 'talents/arquera-francotiradora-s5.webp', t: 'p', r: 2, c: 3, max: 3, req: ['s2'], d: r => `+${x(6, r)}% de daño contra enemigos con más del 60% de vida.`, fx: { tv: { highHpDmg: 6 } } },
        { id: 's6', name: 'Remate o Herida Abierta', icon: 'talents/arquera-francotiradora-s6.webp', t: 'c', r: 3, c: 0.5, max: 1, req: ['s3', 's4'], opts: [
          { k: 'A', name: 'Golpe de Gracia', desc: 'Disparo Apuntado remata a enemigos por debajo del 15% de vida (no jefes).', fx: { mod: { a_t_apuntado: { execute: 15 } } } },
          { k: 'B', name: 'Herida Abierta', desc: 'Los críticos de Disparo Apuntado sangran un 50% extra en 6 s. Mejor contra jefes.', fx: { power: 'f_herida_abierta' } } ] },
        { id: 's7', name: 'Letalidad', icon: 'talents/arquera-francotiradora-s7.webp', t: 'p', r: 3, c: 2.5, max: 2, req: ['s4', 's5'], d: r => `+${x(2, r)}% de daño de crítico.`, fx: { tv: { critDmg: 2 } } },
        { id: 's8', name: 'Posición Elevada', icon: 'talents/arquera-francotiradora-s8.webp', t: 'p', r: 4, c: 0, max: 2, req: ['s6'], d: r => `−${x(3, r)}% de daño recibido; el doble con la Concentración por encima de 50.`, fx: { tv: { dmgReduc: 3, drFocus: 3 } } },
        { id: 's9', name: 'Visión Certera', icon: 'talents/arquera-francotiradora-s9.webp', t: 'a', r: 4, c: 1.5, max: 1, req: ['s6', 's7'], d: 'Activa nueva: durante 12 s moverte no vacía la Concentración, +25% de velocidad de ataque y Disparo Apuntado se recarga un 50% más rápido. Enfriamiento 90 s.', fx: { grant: 'a_t_vision' } },
        { id: 's10', name: 'Recarga Táctica', icon: 'talents/arquera-francotiradora-s10.webp', t: 'p', r: 4, c: 3, max: 2, req: ['s7'], d: r => `Cada crítico reduce ${x(0.4, r)} s el enfriamiento de Disparo Apuntado.`, fx: { mod: { a_t_apuntado: { critCdr: 0.4 } } } },
        { id: 's11', name: 'Respiración Profunda', icon: 'talents/arquera-francotiradora-s11.webp', t: 'p', r: 5, c: 0.5, max: 2, req: ['s8', 's9'], d: r => `Al llenar la Concentración recuperas ${x(8, r)} de Energía.`, fx: { tv: { focusEnergy: 8 } } },
        { id: 's12', name: 'Puntas de Acero Negro', icon: 'talents/arquera-francotiradora-s12.webp', t: 'p', r: 5, c: 2.5, max: 2, req: ['s9', 's10'], d: r => `+${x(1, r)} ${pl(r, 'nivel', 'niveles')} a Disparo Apuntado.`, fx: { skillLv: { a_t_apuntado: 1 } } },
        { id: 's13', name: 'Disuasión o Paciencia', icon: 'talents/arquera-francotiradora-s13.webp', t: 'c', r: 6, c: 0, max: 1, req: ['s11'], opts: [
          { k: 'A', name: 'Disparo Disuasorio', desc: 'Activa: disparo a quemarropa que te empuja 8 m atrás y aturde 1 s al objetivo.', active: true, fx: { grant: 'a_t_disuasorio' } },
          { k: 'B', name: 'Paciencia del Depredador', desc: 'Quieta, ganas +2% de daño por segundo, hasta +20%. Se pierde al moverte.', fx: { power: 'f_patience' } } ] },
        { id: 's14', name: 'Sobrepenetración', icon: 'talents/arquera-francotiradora-s14.webp', t: 'k', r: 6, c: 1.5, max: 1, req: ['s11', 's12'], d: 'Cada enemigo que atraviesa Disparo Apuntado aumenta un 15% su daño contra el siguiente.', fx: { mod: { a_t_apuntado: { pierce: true } }, power: 'f_overpen' } },
        { id: 's15', name: 'Paso del Acechador', icon: 'talents/arquera-francotiradora-s15.webp', t: 'p', r: 6, c: 3, max: 2, req: ['s12'], d: r => `+${x(5, r)}% de velocidad de movimiento; moverte vacía un 15% menos de Concentración.`, fx: { stats: { spdPct: 5 }, power: 'f_acechador' } },
        { id: 's16', name: 'Cazamayores', icon: 'talents/arquera-francotiradora-s16.webp', t: 'p', r: 7, c: 1, max: 2, req: ['s13', 's14'], d: r => `+${x(8, r)}% de daño contra élites y jefes.`, fx: { tv: { eliteDmg: 8 } } },
        { id: 's17', name: 'Tiro Limpio', icon: 'talents/arquera-francotiradora-s17.webp', t: 'p', r: 7, c: 2, max: 2, req: ['s14', 's15'], d: r => `+${x(9, r)}% de daño de Disparo Apuntado.`, fx: { mod: { a_t_apuntado: { dmg: 9 } } } },
        { id: 'x1', name: 'Punto Débil', icon: 'talents/arquera-francotiradora-x1.webp', t: 'x', r: 8, c: 0.5, max: 1, req: ['s16', 's17'], d: 'Apex I: Disparo Apuntado marca a élites y jefes 8 s; tú y tu grupo tienen +15% de probabilidad de crítico contra ellos.', fx: { power: 'f_weakspot' } },
        { id: 'x2', name: 'Herida Expuesta', icon: 'talents/arquera-francotiradora-x2.webp', t: 'x', r: 8, c: 1.5, max: 2, req: ['x1'], d: r => `Apex II: el grupo hace +${x(6, r)}% de daño de crítico contra objetivos con Punto Débil.`, fx: { tv: { weakCritDmg: 6 } } },
        { id: 'x3', name: 'Disparo Imposible', icon: 'talents/arquera-francotiradora-x3.webp', t: 'x', r: 8, c: 2.5, max: 1, req: ['x2'], d: 'Apex III (cúspide): con Concentración al 100%, Disparo Apuntado se dispara dos veces y el segundo es crítico seguro.', fx: { power: 'f_impossible' } },
      ],
      preset: [['s1', 3], ['s2', 2], ['s4', 1], ['s6', 1, 'B'], ['s7', 2], ['s9', 1], ['s10', 2], ['s12', 2], ['s14', 1], ['s17', 2], ['x1', 1], ['x2', 1]],
    },
    {
      id: 'montaraz', name: 'Montaraz', role: 'control', icon: 'specs/montaraz.webp', emblem: 'emblems/montaraz.webp',
      mechanic: 'coto', innate: { staggerPct: 25 },
      desc: 'Trampas y terreno: la presa nunca escapa de tu coto de caza.',
      // preset de clase propio de esta especialización (RECOMMENDED.cls del mockup)
      clsPreset: [['c1', 2], ['c2', 1], ['c3', 1], ['c4', 1], ['c5', 1, 'A'], ['c7', 2], ['c8', 2], ['c9', 2], ['c10', 3], ['c12', 1, 'A'], ['c14', 1], ['c15', 1]],
      nodes: [
        { id: 's0', name: 'Cacería', icon: 'talents/arquera-montaraz-s0.webp', t: 'k', r: 0, c: 1.5, max: 1, free: true, d: 'Nodo clave (gratis): +10% de daño contra enemigos ralentizados o inmovilizados. El primer élite que golpeas se convierte en tu Presa. Otorga la activa Trampa de Cepo: armas una trampa (hasta 3) que inmoviliza 2 s y envenena con el 60% de daño en 5 s. 1 carga.', fx: { power: 'm_hunt', grant: 'a_t_cepo' } },
        { id: 's1', name: 'Puntas de Cicuta', icon: 'talents/arquera-montaraz-s1.webp', t: 'p', r: 1, c: 0.5, max: 3, req: ['s0'], d: r => `+${x(2, r)}% de daño de Naturaleza y de Veneno.`, fx: { elem: { nature: 2 }, tv: { poisonPct: 2 } } },
        { id: 's2', name: 'Paso del Rastreador', icon: 'talents/arquera-montaraz-s2.webp', t: 'p', r: 1, c: 2.5, max: 2, req: ['s0'], d: r => `+${x(4, r)}% de velocidad de movimiento. Ves el rastro de tu Presa.`, fx: { stats: { spdPct: 4 } } },
        { id: 's3', name: 'Abrojos', icon: 'talents/arquera-montaraz-s3.webp', t: 'p', r: 2, c: 0, max: 2, req: ['s1'], d: r => `Lluvia de Flechas deja abrojos durante ${x(2, r)} s que ralentizan un 30%.`, fx: { mod: { lluvia_flechas: { zone: 1, zoneDur: 2, slowPct: [30, 30] } }, power: 'm_abrojos' } },
        { id: 's4', name: 'Cepo Doble', icon: 'talents/arquera-montaraz-s4.webp', t: 'p', r: 2, c: 1.5, max: 1, req: ['s1', 's2'], d: 'Trampa de Cepo gana una 2.ª carga.', fx: { power: 'm_cepo_doble' } },
        { id: 's5', name: 'Flecha Lastrada', icon: 'talents/arquera-montaraz-s5.webp', t: 'p', r: 2, c: 3, max: 3, req: ['s2'], d: r => `Flecha Múltiple ralentiza un ${[30, 35, 40][r - 1]}% durante 3 s.`, fx: { mod: { flecha_multiple: { slowPct: [30, 35, 40], slow: [3, 3, 3] } } } },
        { id: 's6', name: 'Cepo o Mina', icon: 'talents/arquera-montaraz-s6.webp', t: 'c', r: 3, c: 0.5, max: 1, req: ['s3', 's4'], opts: [
          { k: 'A', name: 'Cepo de Hierro', desc: 'La trampa inmoviliza 1 s más y a los jefes los ralentiza un 50%.', fx: { mod: { a_t_cepo: { rootAdd: 1 } }, power: 'm_cepo_hierro' } },
          { k: 'B', name: 'Mina de Espinas', desc: 'La trampa estalla en 3 m con el 120% de daño, pero no inmoviliza.', fx: { mod: { a_t_cepo: { radius: 100 } }, power: 'm_mina' } } ] },
        { id: 's7', name: 'Veneno de Mantícora', icon: 'talents/arquera-montaraz-s7.webp', t: 'p', r: 3, c: 2.5, max: 2, req: ['s4', 's5'], d: r => `+${x(20, r)}% de daño de Veneno.`, fx: { tv: { poisonPct: 20 } } },
        { id: 's8', name: 'Pellejo de Oso', icon: 'talents/arquera-montaraz-s8.webp', t: 'p', r: 4, c: 0, max: 2, req: ['s6'], d: r => `−${x(5, r)}% de daño recibido contra enemigos ralentizados.`, fx: { tv: { drVsSlowed: 5 } } },
        { id: 's9', name: 'Arpón', icon: 'talents/arquera-montaraz-s9.webp', t: 'a', r: 4, c: 1.5, max: 1, req: ['s6', 's7'], d: 'Activa nueva: un arpón con cadena atrae al objetivo 6 m hacia tu trampa más cercana y lo ralentiza un 60% durante 3 s. Enfriamiento 10 s.', fx: { grant: 'a_t_arpon' } },
        { id: 's10', name: 'Lazo Corredizo', icon: 'talents/arquera-montaraz-s10.webp', t: 'p', r: 4, c: 3, max: 2, req: ['s7'], d: r => `Flecha Perforante inmoviliza ${x(0.5, r)} s al primer enemigo que toca.`, fx: { power: 'm_lazo' } },
        { id: 's11', name: 'Ponzoña Lenta', icon: 'talents/arquera-montaraz-s11.webp', t: 'p', r: 5, c: 0.5, max: 2, req: ['s8', 's9'], d: r => `El Veneno dura +${x(1.5, r)} s y ralentiza un 10%.`, fx: { tv: { dotDur: 1.5 }, power: 'm_ponzona' } },
        { id: 's12', name: 'Rearme Rápido', icon: 'talents/arquera-montaraz-s12.webp', t: 'p', r: 5, c: 2.5, max: 2, req: ['s9', 's10'], d: r => `−${x(15, r)}% de enfriamiento de Trampa de Cepo y Arpón.`, fx: { mod: { a_t_cepo: { cdr: 15 }, a_t_arpon: { cdr: 15 } } } },
        { id: 's13', name: 'Señuelo o Guardabosques', icon: 'talents/arquera-montaraz-s13.webp', t: 'c', r: 6, c: 0, max: 1, req: ['s11'], opts: [
          { k: 'A', name: 'Señuelo de Paja', desc: 'Activa: un muñeco provoca a los enemigos cercanos 5 s y luego estalla en espinas.', active: true, fx: { grant: 'a_t_senuelo' } },
          { k: 'B', name: 'Guardabosques', desc: 'Tus trampas armadas curan un 3% de vida por segundo a los aliados encima.', fx: { power: 'm_warden' } } ] },
        { id: 's14', name: 'Coto Cerrado', icon: 'talents/arquera-montaraz-s14.webp', t: 'k', r: 6, c: 1.5, max: 1, req: ['s11', 's12'], d: 'Puedes armar 1 trampa más (hasta 4) y su radio de activación crece un 30%.', fx: { power: 'm_extratrap' } },
        { id: 's15', name: 'Cazadora Paciente', icon: 'talents/arquera-montaraz-s15.webp', t: 'p', r: 6, c: 3, max: 2, req: ['s12'], d: r => `+${x(10, r)}% de daño contra tu Presa.`, fx: { tv: { preyDmg: 10 } } },
        { id: 's16', name: 'Raíces Profundas', icon: 'talents/arquera-montaraz-s16.webp', t: 'p', r: 7, c: 1, max: 2, req: ['s13', 's14'], d: r => `La inmovilización de tus trampas dura +${x(0.5, r)} s.`, fx: { mod: { a_t_cepo: { rootAdd: 0.5 } } } },
        { id: 's17', name: 'Espinas Venenosas', icon: 'talents/arquera-montaraz-s17.webp', t: 'p', r: 7, c: 2, max: 2, req: ['s14', 's15'], d: r => `Los enemigos inmovilizados reciben +${x(10, r)}% de daño de todo el grupo.`, fx: { tv: { rootedWeak: 10 } } },
        { id: 'x1', name: 'Red de Espinas', icon: 'talents/arquera-montaraz-x1.webp', t: 'x', r: 8, c: 0.5, max: 1, req: ['s16', 's17'], d: 'Apex I: las trampas armadas a menos de 10 m se unen con una red de espinas; quien la cruza queda ralentizado un 50% y sangra.', fx: { power: 'm_thornweb' } },
        { id: 'x2', name: 'Zarzal', icon: 'talents/arquera-montaraz-x2.webp', t: 'x', r: 8, c: 1.5, max: 2, req: ['x1'], d: r => `Apex II: la red inflige el ${x(20, r)}% de tu daño por segundo.`, fx: { tv: { webDmg: 20 } } },
        { id: 'x3', name: 'Gran Cacería', icon: 'talents/arquera-montaraz-x3.webp', t: 'x', r: 8, c: 2.5, max: 1, req: ['x2'], d: 'Apex III (cúspide): si tu Presa queda atrapada en la red, todas las trampas se rearman y el grupo gana +15% de daño durante 6 s.', fx: { power: 'm_greathunt' } },
      ],
      preset: [['s1', 3], ['s2', 2], ['s4', 1], ['s5', 1], ['s6', 1, 'A'], ['s8', 2], ['s9', 1], ['s11', 2], ['s13', 1, 'A'], ['s14', 1], ['s16', 2], ['x1', 1], ['x2', 1]],
    },
    {
      id: 'tiradora', name: 'Tiradora Veloz', role: 'dps', icon: 'specs/tiradora.webp', emblem: 'emblems/tiradora.webp',
      mechanic: 'impulso', innate: {},
      desc: 'Cadencia y multiproyectil: una tormenta de flechas sin pausa.',
      // preset de clase propio de esta especialización (RECOMMENDED.cls del mockup)
      clsPreset: [['c1', 2], ['c2', 1], ['c3', 1], ['c6', 2], ['c8', 2], ['c10', 3], ['c11', 2], ['c12', 1, 'B'], ['c13', 2], ['c14', 1], ['c15', 1]],
      nodes: [
        { id: 's0', name: 'Tormenta de Flechas', icon: 'talents/arquera-tiradora-s0.webp', t: 'k', r: 0, c: 1.5, max: 1, free: true, d: 'Nodo clave (gratis): +1 proyectil y +8% de velocidad de ataque. Disparar mientras te mueves genera Impulso. Otorga la activa Andanada: barres un arco de 120° con 12 flechas (60% de daño cada una) mientras retrocedes 3 m.', fx: { power: 'multidisparo', stats: { aspdPct: 8 }, grant: 'a_t_andanada' } },
        { id: 's1', name: 'Dedos Ligeros', icon: 'talents/arquera-tiradora-s1.webp', t: 'p', r: 1, c: 0.5, max: 3, req: ['s0'], d: r => `+${x(2, r)}% de velocidad de ataque.`, fx: { stats: { aspdPct: 2 } } },
        { id: 's2', name: 'Correr y Disparar', icon: 'talents/arquera-tiradora-s2.webp', t: 'p', r: 1, c: 2.5, max: 2, req: ['s0'], d: r => `+${x(4, r)}% de velocidad de movimiento. Disparar ya no te frena.`, fx: { stats: { spdPct: 4 } } },
        { id: 's3', name: 'Abanico Amplio', icon: 'talents/arquera-tiradora-s3.webp', t: 'p', r: 2, c: 0, max: 2, req: ['s1'], d: r => `Flecha Múltiple dispara +${x(1, r)} ${pl(r, 'flecha', 'flechas')}.`, fx: { mod: { flecha_multiple: { proj: 1 } } } },
        { id: 's4', name: 'Andanada Impulsiva', icon: 'talents/arquera-tiradora-s4.webp', t: 'p', r: 2, c: 1.5, max: 1, req: ['s1', 's2'], d: 'Andanada te da 20 de Impulso.', fx: { power: 't_andanada_impulsiva' } },
        { id: 's5', name: 'Viento de Cola', icon: 'talents/arquera-tiradora-s5.webp', t: 'p', r: 2, c: 3, max: 3, req: ['s2'], d: r => `Agilidad dura +${x(1, r)} s y da +${x(5, r)}% de velocidad de ataque adicional.`, fx: { mod: { agilidad: { durS: 1 } }, power: 't_viento_cola' } },
        { id: 's6', name: 'Rebote o Corona', icon: 'talents/arquera-tiradora-s6.webp', t: 'c', r: 3, c: 0.5, max: 1, req: ['s3', 's4'], opts: [
          { k: 'A', name: 'Flechas Rebotadoras', desc: 'Cada flecha de Flecha Múltiple que impacta rebota a 5 enemigos cercanos (la primera con el 180% de daño).', fx: { power: 't_rebote' } },
          { k: 'B', name: 'Corona de Flechas', desc: 'Flecha Múltiple sale en 360° con −30% de daño. Ideal si te rodean.', fx: { mod: { flecha_multiple: { proj: 4, dmg: -30 } }, power: 't_corona' } } ] },
        { id: 's7', name: 'Puntas Ligeras', icon: 'talents/arquera-tiradora-s7.webp', t: 'p', r: 3, c: 2.5, max: 2, req: ['s4', 's5'], d: r => `−${x(5, r)}% de coste de Energía de Flecha Múltiple y Andanada.`, fx: { mod: { flecha_multiple: { cost: -5 }, a_t_andanada: { cost: -5 } } } },
        { id: 's8', name: 'Esquiva Felina', icon: 'talents/arquera-tiradora-s8.webp', t: 'p', r: 4, c: 0, max: 2, req: ['s6'], d: r => `−${x(4, r)}% de daño recibido mientras te mueves.`, fx: { tv: { drMoving: 4 } } },
        { id: 's9', name: 'Danza de Flechas', icon: 'talents/arquera-tiradora-s9.webp', t: 'a', r: 4, c: 1.5, max: 1, req: ['s6', 's7'], d: 'Activa nueva: durante 4 s disparas flechas en espiral a tu alrededor sin dejar de correr, inmune a ralentizaciones. Enfriamiento 25 s.', fx: { grant: 'a_t_danza' } },
        { id: 's10', name: 'Lluvia Torrencial', icon: 'talents/arquera-tiradora-s10.webp', t: 'p', r: 4, c: 3, max: 2, req: ['s7'], d: r => `+${x(15, r)}% de radio y +${x(50, r)}% de daño de Lluvia de Flechas.`, fx: { mod: { lluvia_flechas: { radius: 15, dmg: 50 } } } },
        { id: 's11', name: 'Segundo Aliento', icon: 'talents/arquera-tiradora-s11.webp', t: 'p', r: 5, c: 0.5, max: 2, req: ['s8', 's9'], d: r => `Al llenar el Impulso recuperas un ${x(4, r)}% de vida y ${x(10, r)} de Energía.`, fx: { tv: { galeHeal: 4, galeEnergy: 10 } } },
        { id: 's12', name: 'Carcaj Sin Fondo', icon: 'talents/arquera-tiradora-s12.webp', t: 'p', r: 5, c: 2.5, max: 2, req: ['s9', 's10'], d: r => `+${x(1, r)} ${pl(r, 'nivel', 'niveles')} a Flecha Múltiple y Lluvia de Flechas.`, fx: { skillLv: { flecha_multiple: 1, lluvia_flechas: 1 } } },
        { id: 's13', name: 'Salto o Estela', icon: 'talents/arquera-tiradora-s13.webp', t: 'c', r: 6, c: 0, max: 1, req: ['s11'], opts: [
          { k: 'A', name: 'Salto de Retirada', desc: 'Activa: saltas 7 m atrás y disparas 5 flechas al aterrizar. +30 de Impulso.', active: true, fx: { grant: 'a_t_salto' } },
          { k: 'B', name: 'Estela de Viento', desc: 'Durante el Vendaval dejas una estela que acelera un 15% a los aliados.', fx: { power: 't_slipstream' } } ] },
        { id: 's14', name: 'Vendaval Perpetuo', icon: 'talents/arquera-tiradora-s14.webp', t: 'k', r: 6, c: 1.5, max: 1, req: ['s11', 's12'], d: 'Durante el Vendaval, cada enemigo abatido alarga su duración 0.5 s (hasta +6 s).', fx: { power: 't_galechain' } },
        { id: 's15', name: 'Ojo de Tormenta', icon: 'talents/arquera-tiradora-s15.webp', t: 'p', r: 6, c: 3, max: 2, req: ['s12'], d: r => `+${x(3, r)}% de crítico a Flecha Múltiple y Andanada.`, fx: { mod: { flecha_multiple: { crit: 3 }, a_t_andanada: { crit: 3 } } } },
        { id: 's16', name: 'Diluvio Constante', icon: 'talents/arquera-tiradora-s16.webp', t: 'p', r: 7, c: 1, max: 2, req: ['s13', 's14'], d: r => `−${x(15, r)}% de enfriamiento de Diluvio de Saetas.`, fx: { mod: { a_u_diluvio: { cdr: 15 } } } },
        { id: 's17', name: 'Filo del Viento', icon: 'talents/arquera-tiradora-s17.webp', t: 'p', r: 7, c: 2, max: 2, req: ['s14', 's15'], d: r => `+${x(2, r)}% de daño Físico a todas tus flechas.`, fx: { elem: { physical: 2 } } },
        { id: 'x1', name: 'Ráfaga Infinita', icon: 'talents/arquera-tiradora-x1.webp', t: 'x', r: 8, c: 0.5, max: 1, req: ['s16', 's17'], d: 'Apex I: cada 10 disparos, el siguiente no cuesta Energía y lanza el doble de proyectiles en un abanico el doble de ancho.', fx: { power: 't_infinite' } },
        { id: 'x2', name: 'Huracán', icon: 'talents/arquera-tiradora-x2.webp', t: 'x', r: 8, c: 1.5, max: 2, req: ['x1'], d: r => `Apex II: los disparos de Ráfaga Infinita hacen +${x(5, r)}% de daño y dan +${x(10, r)} de Impulso.`, fx: { tv: { infiniteDmg: 5 } } },
        { id: 'x3', name: 'Ojo del Huracán', icon: 'talents/arquera-tiradora-x3.webp', t: 'x', r: 8, c: 2.5, max: 1, req: ['x2'], d: 'Apex III (cúspide): durante el Vendaval, Ráfaga Infinita se activa cada 5 disparos en lugar de 10.', fx: { power: 't_eyestorm' } },
      ],
      preset: [['s1', 3], ['s2', 2], ['s4', 1], ['s6', 1, 'A'], ['s7', 2], ['s9', 1], ['s10', 2], ['s12', 2], ['s14', 1], ['s17', 2], ['x1', 1], ['x2', 1]],
    },
  ],
  skills: ARQUERA_TALENT_SKILLS,
};
