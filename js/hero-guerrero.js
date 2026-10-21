// ============================================================
// ÁRBOLES HÉROE (Paragon) de la clase Guerrero — esqueleto v2
// ============================================================
// Generado por tools/convert-v2/convert.mjs (--write talents, E1.5) desde docs/mockups/data/talents-v2-guerrero.js (sha1 b0f282184d7d, estado «diseño»).
// Formato: docs/paso2-implementacion.md §3.1 y D5 (lo importa SOLO js/talents-guerrero.js, campo `hero`).
// Estructura y textos exactos (tests/test-v2-paridad.mjs); `fx: {}` + `todo` = `impl` del mockup (E2: KT).
export const GUERRERO_HERO = [
  { id: 'h1', name: 'Titán', specs: ['berserker', 'guardian'], art: 'ui256/menu_maestria.webp', line: 'Peso y sacudidas: la Furia que gastas se convierte en golpes de gigante que hacen temblar el suelo', key: 'Cada 60 de Furia que gastas, tu siguiente principal hace +40 % y sacude el suelo a 4 m', prefix: 't', nodes: [
    { id: 't0', name: 'Golpe de Titán', t: 'k', tag: 'mec', r: 0, c: 1, max: 1, free: true, d: ()=>'Cada 60 de Furia gastada, tu siguiente principal hace +40 % y sacude el suelo a 4 m (50 %); a los jefes, 15 de Quebranto', icon: 'talents/guerrero-guardian-s10.webp', fx: { power: 'g_ti_golpe_titan' } },
    { id: 't1', name: 'Talla de Gigante', t: 'p', tag: 'num', r: 1, c: 0, max: 1, req: ['t0'], d: ()=>'Eres un 10 % más grande: +10 % de alcance cuerpo a cuerpo y +8 % de vida máxima', icon: 'talents/guerrero-guardian-s11.webp', fx: { stats: { hpPct: 8 }, mod: { '@melee': { range: 10 } } } },
    { id: 't2', name: 'Sacudida o Aplastar', t: 'c', tag: 'mec', r: 1, c: 1, max: 1, req: ['t0'], icon: 'talents/guerrero-berserker-s1.webp', opts: [
        { k: 'A', name: 'Sacudida Amplia', desc: 'La sacudida del Golpe de Titán llega a 7 m (antes 4 m) y ralentiza un 30 % durante 2 s', role: 'AREA', fx: { tv: { titanRadius: 3, titanSlow: 30 } } },
        { k: 'B', name: 'Aplastar', desc: 'El Golpe de Titán hace +80 % (antes +40 %) y a los jefes les llena 25 de Quebranto (antes 15)', role: 'UNI', fx: { tv: { titanPct: 40, titanStagger: 10 } } },
      ],
      win: 'A, contra grupos: cada Golpe de Titán alcanza y frena a la manada. B, contra jefes: un golpe enorme que les rompe la guardia' },
    { id: 't3', name: 'Aplomo', t: 'p', tag: 'mec', r: 1, c: 2, max: 1, req: ['t0'], d: ()=>'Tras un Golpe de Titán, nada te derriba, aturde ni ralentiza durante 3 s', icon: 'talents/guerrero-clase-c7.webp', fx: { power: 'g_ti_aplomo' } },
    { id: 't4', name: 'Bramido o Piel de Montaña', t: 'c', tag: 'mec', r: 2, c: 0, max: 1, req: ['t1', 't2'], icon: 'skills256/grito_guerra.webp', opts: [
        { k: 'A', name: 'Bramido de Titán', desc: 'Habilidad (ranura 2): aturdes 1,5 s a los enemigos a 6 m y tu siguiente principal es de Titán. Se recarga en 30 s', role: 'CTRL', fx: {}, todo: 'grant g_h_bramido: lo escribe KA1 con la activa (punto 16 del plan); su «siguiente principal de Titán» ya lo hace g_ti_golpe_titan' },
        { k: 'B', name: 'Piel de Montaña', desc: 'Cada Golpe de Titán te da un escudo del 8 % de tu vida durante 5 s', role: 'AGU', fx: { power: 'g_ti_piel_montana' } },
      ],
      win: 'A, para controlar grupos y adelantar el golpe grande (ocupa la ranura 2). B, para aguantar sin ocupar ranura' },
    { id: 't5', name: 'Ira Acumulada', t: 'p', tag: 'num', r: 2, c: 1, max: 1, req: ['t2'], d: ()=>'El Golpe de Titán llega cada 50 de Furia gastada (antes 60)', icon: 'ui/res_furia.webp', fx: { tv: { titanCostRed: 10 } } },
    { id: 't6', name: 'Eco Pétreo', t: 'p', tag: 'mec', r: 2, c: 2, max: 1, req: ['t2', 't3'], d: ()=>'La sacudida se repite 1 s después al 50 %', icon: 'skills256/terremoto.webp', fx: { power: 'g_ti_eco_petreo' } },
    { id: 't7', name: 'Quiebrahuesos', t: 'p', tag: 'mec', r: 3, c: 0, max: 1, req: ['t4', 't5'], d: ()=>'Los jefes Quebrantados reciben +15 % de tu daño mientras dura el Quebranto', icon: 'ui/st_quebrantado.webp', fx: { power: 'g_ti_quiebrahuesos' } },
    { id: 't8', name: 'Derrumbe o Mole', t: 'c', tag: 'mec', r: 3, c: 1, max: 1, req: ['t5'], icon: 'talents/guerrero-berserker-s17.webp', opts: [
        { k: 'A', name: 'Derrumbe', desc: 'Si el Golpe de Titán mata, el enemigo estalla: 100 % a todos a 3 m', role: 'AREA', fx: { power: 'g_ti_derrumbe' } },
        { k: 'B', name: 'Mole', desc: 'Cada Golpe de Titán seguido sobre el mismo enemigo hace +20 % más (hasta +40 %)', role: 'UNI', fx: { power: 'g_ti_mole' } },
      ],
      win: 'A, contra grupos: cada muerte encadena estallidos. B, contra jefes: cada golpe de gigante pega más fuerte' },
    { id: 't9', name: 'Temblor', t: 'p', tag: 'mec', r: 3, c: 2, max: 1, req: ['t5', 't6'], d: ()=>'Los alcanzados por la sacudida hacen un 10 % menos de daño durante 4 s', icon: 'talents/guerrero-guardian-s16.webp', fx: { power: 'g_ti_temblor' } },
    { id: 't10', name: 'Músculo de Gigante', t: 'p', tag: 'num', r: 4, c: 0.5, max: 1, req: ['t7', 't8'], d: ()=>'Tus habilidades principales hacen +12 % de daño', icon: 'talents/guerrero-clase-c1.webp', fx: { mod: { '@spender': { dmg: 12 } } } },
    { id: 't11', name: 'Peso Acumulado', t: 'p', tag: 'mec', r: 4, c: 1.5, max: 1, req: ['t8', 't9'], d: ()=>'Cada Golpe de Titán acorta 1 s la recarga de tu definitiva', icon: 'talents/guerrero-clase-c14.webp', fx: { power: 'g_ti_peso' } },
    { id: 't12', name: 'Coloso Despierto', t: 'f', tag: 'mec', r: 5, c: 1, max: 1, req: ['t10', 't11'], d: ()=>'Cada 30 s, tu siguiente Golpe de Titán te hace gigante 8 s: todos tus golpes sacuden el suelo (al 50 %)', icon: 'talents/guerrero-guardian-x3.webp', fx: { power: 'g_ti_coloso' } },
  ] },
  { id: 'h2', name: 'Gladiador', specs: ['berserker', 'cruzado'], art: 'ui256/menu_tormento.webp', line: 'El duelo: eliges un Rival, lo persigues con armas arrojadizas y contraatacas tras esquivar', key: 'Tu primer golpe nombra Rival al enemigo 10 s: le haces +15 %; si muere, ganas Furia y el Rival pasa al siguiente', prefix: 'l', nodes: [
    { id: 'l0', name: 'Rival', t: 'k', tag: 'mec', r: 0, c: 1, max: 1, free: true, d: ()=>'Tu primer golpe nombra Rival al enemigo 10 s: le haces +15 %. Si muere, ganas 20 de Furia y el Rival pasa al más cercano', icon: 'skills256/g_provocacion.webp', fx: { power: 'g_gl_rival' } },
    { id: 'l1', name: 'Ovación', t: 'p', tag: 'num', r: 1, c: 0, max: 1, req: ['l0'], d: ()=>'Matar a un Rival élite o Quebrantar a tu Rival te cura un 10 %; un Rival normal, un 2 % (una vez cada 2 s)', icon: 'talents/guerrero-clase-c10.webp', fx: { tv: { rivalKillHeal: 10 } } },
    { id: 'l2', name: 'Rivales o Duelo', t: 'c', tag: 'mec', r: 1, c: 1, max: 1, req: ['l0'], icon: 'talents/guerrero-clase-c13.webp', opts: [
        { k: 'A', name: 'Muchos Rivales', desc: 'Tienes 3 Rivales a la vez, a +10 % cada uno (antes 1 a +15 %)', role: 'AREA', fx: { power: 'g_gl_rivales' } },
        { k: 'B', name: 'Duelo a Muerte', desc: 'Tu Rival recibe +30 % (antes +15 %), pero solo cambia cuando muere', role: 'UNI', fx: { power: 'g_gl_duelo' } },
      ],
      win: 'A, contra grupos: tres blancos marcados a la vez. B, contra jefes y élites: el duelo largo paga el doble' },
    { id: 'l3', name: 'Tiro de Arena', t: 'p', tag: 'mec', r: 1, c: 2, max: 1, req: ['l0'], d: ()=>'Al nombrar un Rival, le arrojas gratis una Lanza Arrojadiza que lo ralentiza un 40 % 3 s (una vez cada 4 s)', touch: ['g_lanza'], icon: 'skills256/g_lanza.webp', fx: { power: 'g_gl_tiro_arena' } },
    { id: 'l4', name: 'Desafío o Contraataque', t: 'c', tag: 'mec', r: 2, c: 0, max: 1, req: ['l1', 'l2'], icon: 'skills256/g_provocacion.webp', opts: [
        { k: 'A', name: 'Desafío de Arena', desc: 'Habilidad (ranura 2): encierras a tu Rival contigo en un círculo de 6 m 8 s; le haces +20 %. Se recarga en 40 s', role: 'UNI', fx: {}, todo: 'grant g_h_desafio: lo escribe KA1 con la activa (punto 16 del plan); el Rival y su +20 % ya los hace g_gl_rival' },
        { k: 'B', name: 'Contraataque', desc: 'Tras esquivar, tu siguiente golpe en 2 s hace +60 % y te cura un 5 %', role: 'AGU', fx: { power: 'g_gl_contraataque' } },
      ],
      win: 'A, contra jefes y élites que huyen o llaman ayuda (ocupa la ranura 2). B, para jugar con la esquiva sin ocupar ranura' },
    { id: 'l5', name: 'Gloria', t: 'p', tag: 'mec', r: 2, c: 1, max: 1, req: ['l2'], d: ()=>'Cada Rival que matas y cada 20 % de vida que pierde tu Rival te dan 1 de Gloria (hasta 5): +4 % de daño cada una', icon: 'talents/guerrero-clase-c14.webp', fx: { power: 'g_gl_gloria' } },
    { id: 'l6', name: 'Retirada Táctica', t: 'p', tag: 'mec', r: 2, c: 2, max: 1, req: ['l2', 'l3'], d: ()=>'Al esquivar, arrojas gratis una Lanza Arrojadiza a tu Rival (+30 %), una vez cada 6 s', touch: ['g_lanza'], icon: 'talents/guerrero-clase-c11.webp', fx: { power: 'g_gl_retirada' } },
    { id: 'l7', name: 'Sangre en la Arena', t: 'p', tag: 'mec', r: 3, c: 0, max: 1, req: ['l4', 'l5'], d: ()=>'Cada punto de Gloria da a tus críticos +5 % de daño (5 de Gloria: +25 %)', icon: 'ui/st_sangrado.webp', fx: { power: 'g_gl_sangre_arena' } },
    { id: 'l8', name: 'Público o Pulgar', t: 'c', tag: 'mec', r: 3, c: 1, max: 1, req: ['l5'], icon: 'talents/guerrero-clase-c12.webp', opts: [
        { k: 'A', name: 'Clamor del Público', desc: 'Matar a un Rival asusta a los enemigos a 6 m: huyen 2 s (los jefes no: les llena 20 de Quebranto)', role: 'CTRL', fx: { power: 'g_gl_clamor' } },
        { k: 'B', name: 'Pulgar Abajo', desc: 'Tu Rival con menos del 30 % de vida recibe +40 % de daño', role: 'UNI', fx: { power: 'g_gl_pulgar' } },
      ],
      win: 'A, para controlar grupos: cada muerte abre hueco. B, contra jefes: rematas antes' },
    { id: 'l9', name: 'Finta', t: 'p', tag: 'mec', r: 3, c: 2, max: 1, req: ['l5', 'l6'], d: ()=>'Esquivar a menos de 3 m de tu Rival acorta 2 s la recarga de tu movilidad', icon: 'talents/guerrero-clase-c3.webp', fx: { power: 'g_gl_finta' } },
    { id: 'l10', name: 'Campeón', t: 'p', tag: 'num', r: 4, c: 0.5, max: 1, req: ['l7', 'l8'], d: ()=>'Contra tu Rival, tienes +10 % de probabilidad de crítico', icon: 'talents/guerrero-clase-c8.webp', fx: { power: 'g_gl_campeon' } },
    { id: 'l11', name: 'Vítores', t: 'p', tag: 'mec', r: 4, c: 1.5, max: 1, req: ['l8', 'l9'], d: ()=>'Matar a un Rival élite o Quebrantar a tu Rival acorta 6 s la recarga de tu definitiva (como mucho una vez cada 15 s)', icon: 'talents/guerrero-clase-c15.webp', fx: { power: 'g_gl_vitores' } },
    { id: 'l12', name: 'Triunfo', t: 'f', tag: 'mec', r: 5, c: 1, max: 1, req: ['l10', 'l11'], d: ()=>'Rival Quebrantado o 5 de Gloria (cada 35 s): 10 s de +25 % de daño y principales a media Furia; matar, +1 s (hasta 15 s)', icon: 'ui/st_quebrantado.webp', fx: { power: 'g_gl_triunfo' } },
  ] },
  { id: 'h3', name: 'Caudillo', specs: ['guardian', 'cruzado'], art: 'ui256/menu_bendiciones.webp', line: 'Estandartes y gritos que mandan sobre el grupo: clavas pendones y das órdenes', key: 'Cada 15 s clavas un Pendón donde estás (12 s): tú y tus aliados a 8 m hacen +8 % de daño y reciben un 8 % menos', prefix: 'u', nodes: [
    { id: 'u0', name: 'Pendón', t: 'k', tag: 'mec', r: 0, c: 1, max: 1, free: true, d: ()=>'Cada 15 s clavas un Pendón donde estás (12 s): tú y tus aliados a 8 m hacen +8 % de daño y reciben un 8 % menos', icon: 'skills256/g_u_estandarte.webp', fx: { power: 'g_cau_pendon' } },
    { id: 'u1', name: 'Asta Alta', t: 'p', tag: 'num', r: 1, c: 0, max: 1, req: ['u0'], d: ()=>'El Pendón alcanza 12 m (antes 8 m)', icon: 'talents/guerrero-cruzado-s10.webp', fx: { tv: { pendonRadius: 4 } } },
    { id: 'u2', name: 'Pendón: Asalto o Defensa', t: 'c', tag: 'mec', r: 1, c: 1, max: 1, req: ['u0'], icon: 'talents/guerrero-cruzado-s4.webp', opts: [
        { k: 'A', name: 'Pendón de Asalto', desc: 'El Pendón da +16 % de daño (antes +8 %)', role: 'UNI', fx: { tv: { pendonDmg: 8 } } },
        { k: 'B', name: 'Pendón de Defensa', desc: 'El Pendón quita un 16 % del daño recibido (antes 8 %)', role: 'AGU', fx: { tv: { pendonDr: 8 } } },
      ],
      win: 'A, para hacer daño (sobre todo en ráfagas contra jefes). B, para aguantar contra grupos y golpes fuertes' },
    { id: 'u3', name: 'Arenga', t: 'p', tag: 'mec', r: 1, c: 2, max: 1, req: ['u0'], d: ()=>'Al clavar un Pendón, tú y tus aliados a 8 m recuperan un 5 % de la vida', icon: 'skills256/grito_guerra.webp', fx: { power: 'g_cau_arenga' } },
    { id: 'u4', name: 'Estandarte o Abanderado', t: 'c', tag: 'mec', r: 2, c: 0, max: 1, req: ['u1', 'u2'], icon: 'skills256/g_u_estandarte.webp', opts: [
        { k: 'A', name: 'Estandarte de Guerra', desc: 'Habilidad (ranura 2): clavas al instante un Pendón en la mira (a 15 m), aparte del automático. Se recarga en 30 s', role: 'UNI', fx: {}, todo: 'grant g_h_estandarte: lo escribe KA1 con la activa (punto 16 del plan); el Pendón en la mira ya lo clava g_cau_pendon' },
        { k: 'B', name: 'Abanderado', desc: 'Llevas el Pendón a la espalda: te sigue y siempre estás dentro', role: 'AGU', fx: { power: 'g_cau_abanderado' } },
      ],
      win: 'A, para poner el Pendón donde pelea el grupo (ocupa la ranura 2). B, si te mueves mucho y no quieres ocupar ranura' },
    { id: 'u5', name: 'Clarín', t: 'p', tag: 'mec', r: 2, c: 1, max: 1, req: ['u2'], d: ()=>'Cada vez que clavas un Pendón, ganas 20 de Furia', icon: 'ui/res_furia.webp', fx: { power: 'g_cau_clarin' } },
    { id: 'u6', name: 'Tropel', t: 'p', tag: 'mec', r: 2, c: 2, max: 1, req: ['u2', 'u3'], d: ()=>'Dentro del Pendón, tú y tus aliados se mueven un 15 % más rápido', icon: 'talents/guerrero-clase-c11.webp', fx: { tv: { pendonSpd: 15 } } },
    { id: 'u7', name: 'Línea de Batalla', t: 'p', tag: 'mec', r: 3, c: 0, max: 1, req: ['u4', 'u5'], d: ()=>'Los enemigos dentro del Pendón hacen un 10 % menos de daño', icon: 'talents/guerrero-guardian-s14.webp', fx: { tv: { pendonWeak: 10 } } },
    { id: 'u8', name: 'Desbandada u Orden', t: 'c', tag: 'mec', r: 3, c: 1, max: 1, req: ['u5'], icon: 'talents/guerrero-clase-c12.webp', opts: [
        { k: 'A', name: 'Desbandada', desc: 'Al clavar un Pendón, los enemigos a 8 m huyen 2 s (los jefes no: les llenas 20 de Quebranto)', role: 'CTRL', fx: { power: 'g_cau_desbandada' } },
        { k: 'B', name: 'Orden de Ataque', desc: 'Al clavar un Pendón, el enemigo con más vida a 15 m recibe +15 % de daño de todo el grupo durante 10 s', role: 'UNI', fx: { power: 'g_cau_orden' } },
      ],
      win: 'A, para controlar grupos y dar respiro. B, contra jefes: todo el grupo pega más al mismo' },
    { id: 'u9', name: 'Doble Asta', t: 'p', tag: 'mec', r: 3, c: 2, max: 1, req: ['u5', 'u6'], d: ()=>'Tu Pendón dura 20 s (antes 12 s): siempre tienes uno clavado; dos a la vez no se suman', icon: 'talents/guerrero-cruzado-s10.webp', fx: { tv: { pendonDur: 8 } } },
    { id: 'u10', name: 'Disciplina', t: 'p', tag: 'num', r: 4, c: 0.5, max: 1, req: ['u7', 'u8'], d: ()=>'Dentro del Pendón, tus habilidades se recargan un 12 % más rápido', icon: 'talents/guerrero-cruzado-s2.webp', fx: { tv: { pendonCdr: 12 } } },
    { id: 'u11', name: 'Relevo', t: 'p', tag: 'mec', r: 4, c: 1.5, max: 1, req: ['u8', 'u9'], d: ()=>'Al acabar un Pendón, tú y tus aliados a 8 m ganan un escudo del 10 % de su vida', icon: 'ui/st_escudo.webp', fx: { power: 'g_cau_relevo' } },
    { id: 'u12', name: 'Gran Estandarte', t: 'f', tag: 'mec', r: 5, c: 1, max: 1, req: ['u10', 'u11'], d: ()=>'Cada 40 s, tu siguiente Pendón es un Gran Estandarte 15 s: el doble de grande y de efecto', icon: 'skills256/g_u_estandarte.webp', fx: { power: 'g_cau_gran_estandarte' } },
  ] },
];
