// ============================================================
// FIXTURE de talentos v2 (formato §3.1 de docs/paso2-implementacion.md)
// ============================================================
// Datos SINTÉTICOS pero completos para probar el motor v2 (js/talents.js), las operaciones
// (js/talents-ops.js), el mixin, el código IRPG2 y la migración v4 → v5 sin depender de los
// js/talents-<clase>.js reales (que llegan en E1.5/E2). Lo cargan los tests con
//   import './helpers/use-talents-fixture.mjs';   (redirige js/talents-<clase>.js aquí)
// o importándolo directamente (test78: las reglas genéricas de los datos).
//
// Forma (la de cualquier clase v2): árbol de clase de 30 nodos (rejilla de clase), tres
// especializaciones de 29 (la misma rejilla), tres árboles héroe de 13 (cada especialización
// en dos), 12 builds por clase (4 por especialización, una híbrida) y defaultBuild. La rejilla
// es una COPIA de TV2.REJILLA (docs/mockups/data/talents-v2-comun.js): test78 la compara con
// la del mockup, así que un error aquí se ve. Las builds son las 12 aprobadas de la Maga
// (docs/mockups/data/talents-v2-maga.js) con los prefijos de cada clase: la legalidad de una
// build solo depende de la rejilla.
// Los efectos (fx) son variados a propósito: stats, tv del núcleo y de la clase, mods con
// selectores (§3.8), skillLv, poderes (finales y ápice con rango) y activas de talento (grant).
import { n1, pl } from '../../js/talent-text.js';

// ---------------------------------------------------------------- rejillas (copia de TV2.REJILLA)
const g = rows => rows.map(([n, r, c, max, t, req]) => ({ n, r, c, max, t, req }));
export const GRID = {
  cls: g([
    [1, 0, 1, 2, 'p', []], [2, 0, 3, 2, 'p', []], [3, 0, 5, 2, 'p', []],
    [4, 1, 0, 3, 'p', [1]], [5, 1, 2, 1, 'c', [1, 2]], [6, 1, 4, 1, 'c', [2, 3]], [7, 1, 6, 1, 'p', [3]],
    [8, 2, 1, 2, 'p', [4, 5]], [9, 2, 3, 1, 'c', [5, 6]], [10, 2, 5, 1, 'c', [6, 7]],
    [11, 3, 0, 1, 'c', [8]], [12, 3, 2, 2, 'p', [8, 9]], [13, 3, 4, 2, 'p', [9, 10]], [14, 3, 6, 1, 'c', [10]],
    [15, 4, 1, 1, 'c', [11, 12]], [16, 4, 3, 1, 'c', [12, 13]], [17, 4, 5, 1, 'c', [13, 14]],
    [18, 5, 0, 2, 'p', [15]], [19, 5, 2, 1, 'p', [15, 16]], [20, 5, 4, 1, 'p', [16, 17]], [21, 5, 6, 1, 'p', [17]],
    [22, 6, 1, 1, 'c', [18, 19]], [23, 6, 3, 2, 'p', [19, 20]], [24, 6, 5, 2, 'p', [20, 21]],
    [25, 7, 0, 3, 'p', [22]], [26, 7, 3, 3, 'p', [23]], [27, 7, 6, 3, 'p', [24]],
    [28, 8, 0, 3, 'f', [25]], [29, 8, 3, 3, 'f', [26]], [30, 8, 6, 3, 'f', [27]],
  ]),
  spec: g([
    [0, 0, 3, 1, 'k', []],
    [1, 1, 1, 3, 'p', [0]], [2, 1, 3, 3, 'p', [0]], [3, 1, 5, 3, 'p', [0]],
    [4, 2, 0, 2, 'p', [1]], [5, 2, 2, 1, 'p', [1, 2]], [6, 2, 4, 1, 'p', [2, 3]], [7, 2, 6, 2, 'p', [3]],
    [8, 3, 1, 1, 'c', [4, 5]], [9, 3, 3, 1, 'c', [5, 6]], [10, 3, 5, 1, 'c', [6, 7]],
    [11, 4, 0, 2, 'p', [8]], [12, 4, 2, 2, 'p', [8, 9]], [13, 4, 4, 2, 'p', [9, 10]], [14, 4, 6, 1, 'p', [10]],
    [15, 5, 1, 1, 'c', [11, 12]], [16, 5, 3, 2, 'p', [12, 13]], [17, 5, 5, 2, 'p', [13, 14]],
    [18, 6, 0, 2, 'p', [15]], [19, 6, 2, 2, 'p', [15, 16]], [20, 6, 4, 2, 'p', [16, 17]], [21, 6, 6, 1, 'p', [17]],
    [22, 7, 0, 3, 'p', [18]], [23, 7, 3, 3, 'p', [19]], [24, 7, 6, 3, 'p', [21]],
    [25, 8, 0, 3, 'f', [22]], [26, 8, 3, 3, 'f', [23]], [27, 8, 6, 3, 'f', [24]],
    [28, 9, 3, 4, 'x', [25, 26, 27]],
  ]),
  hero: g([
    [0, 0, 1, 1, 'k', []],
    [1, 1, 0, 1, 'p', [0]], [2, 1, 1, 1, 'c', [0]], [3, 1, 2, 1, 'p', [0]],
    [4, 2, 0, 1, 'c', [1, 2]], [5, 2, 1, 1, 'p', [2]], [6, 2, 2, 1, 'p', [2, 3]],
    [7, 3, 0, 1, 'p', [4, 5]], [8, 3, 1, 1, 'c', [5]], [9, 3, 2, 1, 'p', [5, 6]],
    [10, 4, 0.5, 1, 'p', [7, 8]], [11, 4, 1.5, 1, 'p', [8, 9]],
    [12, 5, 1, 1, 'f', [10, 11]],
  ]),
};

// ---------------------------------------------------------------- clases
const ELEM_TXT = { fire: 'Fuego', frost: 'Hielo', arcane: 'Arcano', physical: 'Físico', holy: 'Sagrado', nature: 'Naturaleza' };
const CFG = {
  maga: {
    name: 'Maga', pw: 'm_', tvKey: 'fxRunas',
    specs: [
      { id: 'piromante', name: 'Piromante', role: 'dps', roleLabel: 'Daño en área', mechanic: 'calor', elem: 'fire', prefix: 's', innate: { dmgPct: 2 } },
      { id: 'crionte', name: 'Crionte', role: 'control', roleLabel: 'Control', mechanic: 'escarcha', elem: 'frost', prefix: 'i', innate: { staggerPct: 25 } },
      { id: 'arcanista', name: 'Arcanista', role: 'dps', roleLabel: 'Un objetivo', mechanic: 'cargas', elem: 'arcane', prefix: 'a', innate: { crit: 2 } },
    ],
    hero: [{ id: 'crono', name: 'Cronomante', prefix: 't' }, { id: 'invoca', name: 'Invocadora', prefix: 'f' }, { id: 'escriba', name: 'Escriba Rúnica', prefix: 'e' }],
    grants: ['m_t_bloque', 'm_t_inversion', 'm_t_contrahechizo'], heroGrants: ['m_h_detener', 'm_h_constructo', 'm_h_palabra'], elem: 'arcane',
  },
  guerrero: {
    name: 'Guerrero', pw: 'g_', tvKey: 'fxFuriaTope',
    specs: [
      { id: 'berserker', name: 'Berserker', role: 'dps', roleLabel: 'Daño', mechanic: 'sed', elem: 'physical', prefix: 'b', innate: { aspdPct: 3 } },
      { id: 'guardian', name: 'Guardián', role: 'tank', roleLabel: 'Tanque', mechanic: 'bastion', elem: 'physical', prefix: 'd', innate: { block: 15, threatMult: 3, hpPct: 5 } },
      { id: 'cruzado', name: 'Cruzado', role: 'support', roleLabel: 'Apoyo', mechanic: 'fervor', elem: 'holy', prefix: 'z', innate: { healPct: 30 } },
    ],
    hero: [{ id: 'titan', name: 'Titán', prefix: 't' }, { id: 'caudillo', name: 'Caudillo', prefix: 'u' }, { id: 'heraldo', name: 'Heraldo', prefix: 'l' }],
    grants: ['g_t_aliento', 'g_t_intervencion', 'g_t_bramido'], heroGrants: ['g_h_titan', 'g_h_caudillo', 'g_h_heraldo'], elem: 'physical',
  },
  arquera: {
    name: 'Arquera', pw: 'y_', tvKey: 'fxPluma',
    specs: [
      { id: 'tiradora', name: 'Tiradora Veloz', role: 'dps', roleLabel: 'Daño en área', mechanic: 'impulso', elem: 'physical', prefix: 'v', innate: { spdPct: 3 } },
      { id: 'francotiradora', name: 'Francotiradora', role: 'dps', roleLabel: 'Un objetivo', mechanic: 'concentracion', elem: 'physical', prefix: 'f', innate: { crit: 3 } },
      { id: 'montaraz', name: 'Montaraz', role: 'control', roleLabel: 'Control', mechanic: 'coto', elem: 'nature', prefix: 'm', innate: { staggerPct: 25 } },
    ],
    hero: [{ id: 'centinela', name: 'Centinela', prefix: 'q' }, { id: 'sombra', name: 'Sombra', prefix: 'w' }, { id: 'druida', name: 'Druida', prefix: 'y' }],
    grants: ['a_t_camuflaje', 'a_t_bengala', 'a_t_silencio'], heroGrants: ['a_h_centinela', 'a_h_sombra', 'a_h_druida'], elem: 'nature',
  },
};
// árboles héroe: 0 = especializaciones 1.ª + 3.ª · 1 = 1.ª + 2.ª · 2 = 2.ª + 3.ª (como la Maga)
const HERO_SPECS = [[0, 2], [0, 1], [1, 2]];

// kit sintético por especialización (insignia, movilidad/utilidad, principal, definitiva):
// solo existe en el fixture (lo usan '@spec' vía kitOf y la regla G17 de test78)
export const FIXTURE_KITS = {};
for (const c of Object.values(CFG)) for (const s of c.specs) FIXTURE_KITS[s.id] = [1, 2, 3, 4].map(k => `fx_${s.id}_k${k}`);

// ---------------------------------------------------------------- contenido por posición
const opt = (k, name, desc, role, fx) => ({ k, name, desc, role, fx });
const P = (pw, tag, n) => `${pw}fx_${tag}_${n}`;
// árbol de CLASE: toca el kit base y lo genérico (nunca @spec ni el kit: G1)
function clsContent(c) {
  const pw = c.pw, el = ELEM_TXT[c.elem], pwr = n => P(pw, 'cls', n);
  return {
    1: { name: 'Temple', tag: 'num', d: r => `+${20 * r} de vida máxima`, fx: { stats: { hp: 20 } } },
    2: { name: 'Disciplina', tag: 'num', d: r => `Todas tus habilidades hacen +${6 * r} % de daño`, fx: { mod: { '@all': { dmg: 6 } } }, touch: ['@all'] },
    3: { name: 'Reflejos', tag: 'num', d: r => `Tu movilidad se recarga un ${10 * r} % antes`, fx: { mod: { '@movement': { cdr: 10 } } }, touch: ['@movement'] },
    4: { name: 'Coraza', tag: 'num', d: r => `Recibes un ${2 * r} % menos de daño (antes 0 %)`, fx: { tv: { dmgReduc: 2 } } },
    5: { name: 'Básica: Certera o Amplia', tag: 'mec', touch: ['@basic'], opts: [
      opt('A', 'Certera', 'Cada 4.º golpe básico es crítico seguro', 'UNI', { power: pwr('5a') }),
      opt('B', 'Amplia', 'Tu habilidad básica hace +20 % de daño', 'AREA', { mod: { '@basic': { dmg: 20 } } })],
      win: 'A, contra jefes: un crítico seguro cada pocos segundos. B, contra grupos' },
    6: { name: 'Principal: Núcleo u Onda', tag: 'num', touch: ['@spender'], opts: [
      opt('A', 'Núcleo', 'Tus habilidades principales hacen +15 % de daño', 'UNI', { mod: { '@spender': { dmg: 15 } } }),
      opt('B', 'Onda', 'Tus habilidades principales tienen +30 % de radio', 'AREA', { mod: { '@spender': { radius: 30 } } })],
      win: 'A, contra jefes. B, contra grupos' },
    7: { name: 'Paso Ligero', tag: 'mec', d: () => 'Después de tu movilidad corres un 30 % más rápido durante 3 s', fx: { power: pwr(7) }, touch: ['@movement'] },
    8: { name: 'Piel Dura', tag: 'num', d: r => `+${15 * r} de armadura`, fx: { stats: { arm: 15 } } },
    9: { name: 'Frenar o Golpear', tag: 'mec', touch: ['@spender'], opts: [
      opt('A', 'Frenar', 'Tus habilidades principales ralentizan un 30 % durante 2 s', 'CTRL', { mod: { '@spender': { slow: 2, slowPct: 30 } } }),
      opt('B', 'Golpear', 'Tus habilidades principales hacen +20 % de daño a grupos', 'AREA', { mod: { '@spender': { dmg: 20 } } })],
      win: 'A, para controlar. B, contra grupos' },
    10: { name: 'Corte o Silencio', tag: 'mec', opts: [
      opt('A', 'Corte', 'Cada 8 s, tu siguiente golpe ralentiza un 50 % durante 4 s', 'CTRL', { power: pwr('10a') }),
      opt('B', 'Silencio', 'Cada 10 s, tu siguiente golpe deja mudo al enemigo 3 s', 'UNI', { power: pwr('10b') })],
      win: 'A, contra grupos que te rodean. B, contra jefes que lanzan hechizos' },
    11: { name: 'Refugio o Aguante', tag: 'mec', opts: [
      opt('A', 'Refugio', 'Habilidad (ranura 2): no recibes daño durante 4 s. Se recarga en 90 s', 'AGU', { grant: c.grants[0] }),
      opt('B', 'Aguante', 'Un golpe que te mataría te deja con 1 de vida. Una vez cada 120 s', 'AGU', { power: pwr('11b') })],
      win: 'A, contra golpes que se ven venir (ocupa la ranura 2). B, siempre activo' },
    12: { name: 'Precisión', tag: 'num', d: r => `+${3 * r} % de probabilidad de crítico`, fx: { stats: { crit: 3 } } },
    13: { name: 'Cazador', tag: 'num', d: r => `+${6 * r} % de daño contra élites y jefes`, fx: { tv: { eliteDmg: 6 } } },
    14: { name: 'Huida o Reparo', tag: 'mec', touch: ['@movement'], opts: [
      opt('A', 'Huida', 'Tu movilidad dura un 20 % más', 'CTRL', { mod: { '@movement': { dur: 20 } } }),
      opt('B', 'Reparo', 'Tu movilidad te cura un 5 % de la vida', 'AGU', { power: pwr('14b') })],
      win: 'A, para controlar el espacio. B, para sobrevivir' },
    15: { name: 'Vigor o Festín', tag: 'mec', opts: [
      opt('A', 'Vigor', '+60 de vida máxima', 'AGU', { stats: { hp: 60 } }),
      opt('B', 'Festín', 'Matar a un enemigo te cura un 2 % de la vida', 'AGU', { tv: { killHeal: 2 } })],
      win: 'A, contra jefes. B, contra grupos' },
    16: { name: 'Filo o Maestría', tag: 'mec', opts: [
      opt('A', 'Filo', 'Todas tus habilidades tienen +5 % de crítico', 'UNI', { mod: { '@all': { crit: 5 } } }),
      opt('B', 'Maestría', '+1 nivel a tus habilidades principales', 'AREA', { skillLv: { '@spender': 1 } })],
      win: 'A, contra jefes. B, contra grupos' },
    17: { name: 'Pausa o Remate', tag: 'mec', opts: [
      opt('A', 'Pausa', 'Habilidad (ranura 2): detienes a los enemigos a 8 m 3 s. Se recarga en 60 s', 'CTRL', { grant: c.grants[1] }),
      opt('B', 'Remate', 'Rematas a los enemigos normales bajo el 10 % de vida', 'UNI', { tv: { executePct: 10 } })],
      win: 'A, para controlar (ocupa la ranura 2). B, contra grupos que se quedan con poca vida' },
    18: { name: 'Escudo Firme', tag: 'mec', d: r => `Con escudo recibes un ${5 * r} % menos de daño`, fx: { tv: { barrierDr: 5 } } },
    19: { name: 'Resonancia', tag: 'mec', d: () => 'Tus escudos te devuelven 5 de recurso al romperse', fx: { power: pwr(19) } },
    20: { name: 'Eco', tag: 'mec', d: () => `Tus golpes de ${el} repiten un 10 % del daño`, fx: { power: pwr(20) } },
    21: { name: 'Zancada', tag: 'mec', d: () => 'En movimiento recibes un 8 % menos de daño', fx: { tv: { drMoving: 8 } } },
    22: { name: 'Corte o Canal', tag: 'mec', opts: [
      opt('A', 'Corte', 'Habilidad (ranura 2): cortas el hechizo de un enemigo a 12 m. Se recarga en 18 s', 'UNI', { grant: c.grants[2] }),
      opt('B', 'Canal', 'Al bajar del 30 % de vida recibes un 30 % menos de daño 5 s', 'AGU', { power: pwr('22b') })],
      win: 'A, contra jefes que lanzan hechizos (ocupa la ranura 2). B, para sobrevivir' },
    23: { name: 'Ritmo', tag: 'mec', d: r => `Tus habilidades se recargan un ${4 * r} % antes`, fx: { mod: { '@all': { cdr: 4 } } } },
    24: { name: 'Celeridad', tag: 'num', d: r => `+${5 * r} % de velocidad de ataque`, fx: { stats: { aspdPct: 5 } } },
    25: { name: 'Bastión', tag: 'mec', d: r => `Recibes un ${2 * r} % menos de daño más`, fx: { tv: { dmgReduc: 2 } } },
    26: { name: 'Torrente', tag: 'mec', d: r => `Tus habilidades principales hacen +${5 * r} % de daño`, fx: { mod: { '@spender': { dmg: 5 } } } },
    27: { name: 'Estela', tag: 'mec', d: r => `+${4 * r} % de velocidad de movimiento`, fx: { stats: { spdPct: 4 } } },
    28: { name: 'Muralla', tag: 'mec', final: 'Defensa', d: r => `Cada ${12 - 2 * r} s un escudo te cubre`, fx: { power: pwr(28) } },
    29: { name: 'Archimagia', tag: 'mec', final: 'Poder', d: r => `Tus principales se repiten al ${20 * r} %`, fx: { power: pwr(29) } },
    30: { name: 'Paso del Vacío', tag: 'mec', final: 'Movilidad', d: r => `Tu movilidad tiene ${r} ${pl(r, 'carga', 'cargas')}`, fx: { power: pwr(30) } },
  };
}
// árbol de ESPECIALIZACIÓN (la misma rejilla para las tres): toca su kit y su elemento
function specContent(c, s) {
  const pw = c.pw, [k1, k2, k3, k4] = FIXTURE_KITS[s.id], el = ELEM_TXT[s.elem], pwr = n => P(pw, s.id, n);
  return {
    0: { name: `Clave ${s.name}`, tag: 'mec', d: () => `Tu mecánica de ${s.name} se enciende`, fx: { power: pwr(0) } },
    1: { name: 'Kit Afilado', tag: 'num', d: r => `Tu kit hace +${5 * r} % de daño`, fx: { mod: { '@spec': { dmg: 5 } } }, touch: [k1] },
    2: { name: 'Kit Experto', tag: 'num', d: r => `+${r} ${pl(r, 'nivel', 'niveles')} a las habilidades de tu kit`, fx: { skillLv: { '@spec': 1 } } },
    3: { name: `Afinidad de ${el}`, tag: 'num', d: r => `+${4 * r} % de daño de ${el}`, fx: { elem: { [s.elem]: 4 } } },
    4: { name: 'Pulso', tag: 'num', d: r => `+${2 * r} de potencia de tu mecánica`, fx: { tv: { [c.tvKey]: 2 } } },
    5: { name: 'Puente', tag: 'mec', hyb: 'A + B', d: () => 'Tu insignia acelera tu movilidad 1 s', fx: { power: pwr(5) }, touch: [k2] },
    6: { name: 'Enlace', tag: 'mec', hyb: 'B + C', d: () => 'Tu principal deja una marca 3 s', fx: { power: pwr(6) }, touch: [k3] },
    7: { name: 'Acoso', tag: 'num', d: r => `+${5 * r} % de daño contra ralentizados`, fx: { tv: { slowedDmg: 5 } } },
    8: { name: 'Insignia: Ancha o Densa', tag: 'mec', touch: [k1], opts: [
      opt('A', 'Ancha', 'Tu insignia tiene +30 % de radio', 'AREA', { mod: { [k1]: { radius: 30 } } }),
      opt('B', 'Densa', 'Tu insignia hace +25 % de daño', 'UNI', { mod: { [k1]: { dmg: 25 } } })],
      win: 'A, contra grupos. B, contra jefes' },
    9: { name: 'Principal: Doble o Fija', tag: 'mec', touch: [k3], opts: [
      opt('A', 'Doble', 'Tu principal lanza un proyectil más', 'AREA', { mod: { [k3]: { proj: 1 } } }),
      opt('B', 'Fija', 'Tu principal hace +30 % al mismo enemigo', 'UNI', { power: pwr('9b') })],
      win: 'A, contra grupos. B, contra jefes' },
    10: { name: 'Definitiva: Hielo o Pronta', tag: 'mec', touch: [k4], opts: [
      opt('A', 'Atadura', 'Tu definitiva inmoviliza 1 s', 'CTRL', { power: pwr('10a') }),
      opt('B', 'Pronta', 'Tu definitiva se recarga un 15 % antes', 'UNI', { mod: { [k4]: { cdr: 15 } } })],
      win: 'A, para controlar. B, contra jefes' },
    11: { name: 'Aguante', tag: 'num', d: r => `+${30 * r} de vida máxima`, fx: { stats: { hp: 30 } } },
    12: { name: 'Golpe Doble', tag: 'mec', d: r => `Tu principal hace +${8 * r} % de daño`, fx: { mod: { [k3]: { dmg: 8 } } }, touch: [k3] },
    13: { name: 'Paso Firme', tag: 'mec', d: r => `Tu movilidad te protege ${r} s`, fx: { power: pwr(13) }, touch: [k2] },
    14: { name: 'Remate Final', tag: 'mec', d: () => 'Tu definitiva remata bajo el 15 % de vida', fx: { power: pwr(14) }, touch: [k4] },
    15: { name: 'Sangre o Escudo', tag: 'mec', opts: [
      opt('A', 'Sangre', 'Matar a un enemigo te cura un 3 % de la vida', 'AGU', { tv: { killHeal: 3 } }),
      opt('B', 'Escudo', 'Al bajar del 40 % de vida ganas un escudo', 'AGU', { power: pwr('15b') })],
      win: 'A, contra grupos. B, contra jefes' },
    16: { name: 'Núcleo', tag: 'mec', hyb: 'A + B + C', d: r => `Tu mecánica dura ${r} s más`, fx: { power: pwr(16) }, touch: [k1, k2] },
    17: { name: 'Prisa', tag: 'mec', d: r => `Tu movilidad dura ${r} s más`, fx: { mod: { [k2]: { durS: 1 } } }, touch: [k2] },
    18: { name: 'Brasa Viva', tag: 'mec', d: r => `Tu insignia deja una zona ${r} s`, fx: { power: pwr(18) }, touch: [k1] },
    19: { name: 'Astillas', tag: 'mec', d: r => `Tu principal salta a ${r} ${pl(r, 'enemigo', 'enemigos')}`, fx: { power: pwr(19) }, touch: [k3] },
    20: { name: 'Agudeza', tag: 'mec', d: r => `+${10 * r} % de daño crítico`, fx: { tv: { critDmg: 10 } } },
    21: { name: 'Ojo Frío', tag: 'mec', d: () => 'Tu definitiva marca al enemigo más fuerte', fx: { power: pwr(21) }, touch: [k4] },
    22: { name: 'Penúltimo A', tag: 'mec', d: r => `Tu insignia hace +${n1(0.5 * r)} de daño por capa`, fx: { power: pwr(22) }, touch: [k1] },
    23: { name: 'Penúltimo B', tag: 'mec', d: r => `Tu principal golpea ${r} ${pl(r, 'vez', 'veces')} más`, fx: { power: pwr(23) }, touch: [k3] },
    24: { name: 'Penúltimo C', tag: 'mec', d: r => `Tu definitiva dura ${r} s más`, fx: { power: pwr(24) }, touch: [k4] },
    25: { name: 'Final A', tag: 'mec', final: 'A', d: r => `Tu insignia estalla al ${100 * r} %`, fx: { power: pwr(25) }, touch: [k1] },
    26: { name: 'Final B', tag: 'mec', final: 'B', d: r => `Tu principal se repite al ${20 * r} %`, fx: { power: pwr(26) }, touch: [k3] },
    27: { name: 'Final C', tag: 'mec', final: 'C', d: r => `Tu definitiva y tu movilidad se recargan ${r} s antes`, fx: { power: pwr(27) }, touch: [k4, k2] },
    28: { name: `Ápice ${s.name}`, tag: 'mec', d: r => ['1) Tu mecánica arranca llena.', '2) Tu insignia no cuesta.', '3) Tu principal es crítica.', '4) Tu definitiva se repite.'].slice(0, r).join(' '), fx: { power: pwr(28) } },
  };
}
// árbol HÉROE: temático de la clase; una sola activa (opción A del nodo 4)
function heroContent(c, h, grant) {
  const pw = c.pw, pwr = n => P(pw, h.id, n);
  return {
    0: { name: h.name, tag: 'mec', d: () => `Tu identidad de ${h.name} se despierta`, fx: { power: pwr(0) } },
    1: { name: `${h.name}: Brío`, tag: 'num', d: () => '+5 % de daño', fx: { stats: { dmgPct: 5 } } },
    2: { name: `${h.name}: Uno o Muchos`, tag: 'mec', opts: [
      opt('A', `${h.name}: Uno`, 'Tu marca hace +45 % a un enemigo', 'UNI', { power: pwr('2a') }),
      opt('B', `${h.name}: Muchos`, 'Tu marca pasa a 2 enemigos cercanos', 'AREA', { power: pwr('2b') })],
      win: 'A, contra jefes. B, contra grupos' },
    3: { name: `${h.name}: Prisa`, tag: 'mec', d: () => 'Cada marca que termina te acelera 3 s', fx: { power: pwr(3) } },
    4: { name: `${h.name}: Llamada o Retiro`, tag: 'mec', opts: [
      opt('A', `${h.name}: Llamada`, 'Habilidad (ranura 2): paras a los enemigos a 8 m 3 s. Se recarga en 75 s', 'CTRL', { grant }),
      opt('B', `${h.name}: Retiro`, 'Al bajar del 40 % de vida vuelves a la vida de hace 3 s', 'AGU', { power: pwr('4b') })],
      win: 'A, para controlar grupos (ocupa la ranura 2). B, para sobrevivir' },
    5: { name: `${h.name}: Saña`, tag: 'num', d: () => '+8 % de daño contra élites y jefes', fx: { tv: { eliteDmg: 8 } } },
    6: { name: `${h.name}: Paradoja`, tag: 'mec', d: () => 'Si el marcado muere, la marca pasa al más cercano', fx: { power: pwr(6) } },
    7: { name: `${h.name}: Bucle`, tag: 'mec', d: () => 'Cada 4.ª marca se repite', fx: { power: pwr(7) } },
    8: { name: `${h.name}: Presagio o Memoria`, tag: 'mec', opts: [
      opt('A', `${h.name}: Presagio`, '+5 % de probabilidad de crítico', 'UNI', { stats: { crit: 5 } }),
      opt('B', `${h.name}: Memoria`, 'Matar a un enemigo te cura un 2 % de la vida', 'AGU', { tv: { killHeal: 2 } })],
      win: 'A, contra jefes. B, para aguantar en grupos' },
    9: { name: `${h.name}: Grieta`, tag: 'mec', d: () => 'Tres marcas a la vez abren una grieta 3 s', fx: { power: pwr(9) } },
    10: { name: `${h.name}: Aceleración`, tag: 'num', d: () => '+6 % de velocidad de ataque', fx: { stats: { aspdPct: 6 } } },
    11: { name: `${h.name}: Momento`, tag: 'mec', d: () => 'Tus críticos alargan la marca 1 s', fx: { power: pwr(11) } },
    12: { name: `${h.name}: Cumbre`, tag: 'mec', d: () => 'Cada 30 s tu siguiente principal se repite entera', fx: { power: pwr(12) } },
  };
}
// arma un árbol a partir de la rejilla y su contenido
function buildTree(grid, prefix, content, iconBase) {
  return grid.map(gn => {
    const id = `${prefix}${gn.n}`, ct = content[gn.n];
    const node = { id, name: ct.name, t: gn.t, tag: ct.tag, r: gn.r, c: gn.c, max: gn.max };
    if (gn.req.length) node.req = gn.req.map(x => `${prefix}${x}`);
    if (gn.t === 'k') node.free = true;
    if (gn.t === 'c') { node.opts = ct.opts.map(o => ({ ...o, fx: { ...o.fx } })); node.win = ct.win; }
    else { node.d = ct.d; node.fx = { ...ct.fx }; }
    for (const k of ['touch', 'final', 'hyb']) if (ct[k]) node[k] = Array.isArray(ct[k]) ? [...ct[k]] : ct[k];
    node.icon = `talents/${iconBase}-${id}.webp`;
    return node;
  });
}

// ---------------------------------------------------------------- builds (las 12 de la Maga)
const MAGA_SPEC_PREFIX = ['s', 'i', 'a'], MAGA_HERO_PREFIX = ['t', 'f', 'e'];
const MAGA_SPECS = ['piromante', 'crionte', 'arcanista'], MAGA_HEROES = ['crono', 'invoca', 'escriba'];
const BUILD_TEMPLATES = {
  brasa: { sp: 'piromante', n: 'Incendio', arch: 'Brasa', hero: 'invoca', heroCh: { f2: 'B', f4: 'A', f8: 'B' }, heroNodes: ['f2', 'f3', 'f6', 'f5', 'f9', 'f8', 'f11', 'f12', 'f4', 'f1'], cls: { c1: 2, c4: 3, c5: 1, c8: 2, c11: 1, c15: 1, c19: 1, c22: 1, c2: 2, c12: 2, c9: 1, c16: 1, c18: 2, c13: 2, c6: 1, c10: 1, c25: 3, c28: 3, c3: 2, c7: 1, c14: 1 }, clsCh: { c5: 'B', c6: 'B', c9: 'B', c10: 'A', c11: 'B', c14: 'A', c15: 'A', c16: 'B', c22: 'B' }, spec: { s1: 3, s4: 2, s5: 1, s8: 1, s11: 2, s15: 1, s18: 2, s22: 3, s25: 3, s28: 4, s2: 3, s9: 1, s12: 2, s16: 2, s3: 1 }, specCh: { s8: 'A', s9: 'B', s15: 'B' } },
  cataclismo: { sp: 'piromante', n: 'Lluvia de Fuego', arch: 'Cataclismo', hero: 'crono', heroCh: { t2: 'B', t4: 'B', t8: 'A' }, heroNodes: ['t2', 't3', 't6', 't5', 't9', 't8', 't11', 't12', 't4', 't1'], cls: { c2: 2, c3: 2, c6: 1, c7: 1, c10: 1, c14: 1, c17: 1, c20: 1, c24: 2, c1: 2, c5: 1, c9: 1, c12: 2, c13: 2, c16: 1, c21: 1, c23: 2, c27: 3, c30: 3, c8: 2, c4: 2 }, clsCh: { c5: 'B', c6: 'B', c9: 'B', c10: 'A', c14: 'A', c16: 'B', c17: 'B' }, spec: { s3: 3, s7: 2, s6: 1, s10: 1, s13: 2, s14: 1, s17: 2, s21: 1, s24: 3, s27: 3, s28: 4, s2: 3, s9: 1, s16: 2, s20: 2 }, specCh: { s9: 'B', s10: 'A' } },
  ignicion: { sp: 'piromante', n: 'Combustión Perpetua', arch: 'Ignición', hero: 'crono', heroCh: { t2: 'A', t4: 'B', t8: 'A' }, heroNodes: ['t2', 't1', 't3', 't5', 't8', 't4', 't7', 't10', 't12', 't11'], cls: { c1: 2, c2: 2, c5: 1, c6: 1, c9: 1, c12: 2, c13: 2, c16: 1, c19: 1, c23: 2, c10: 1, c17: 1, c20: 1, c4: 1, c8: 2, c15: 1, c3: 2, c26: 3, c29: 3, c24: 2, c4_: 2 }, clsCh: { c5: 'A', c6: 'A', c9: 'B', c10: 'B', c15: 'B', c16: 'A', c17: 'A' }, spec: { s2: 3, s5: 1, s9: 1, s12: 2, s16: 2, s19: 2, s23: 3, s26: 3, s28: 4, s1: 3, s4: 1, s8: 1, s15: 1, s3: 3, s6: 1 }, specCh: { s8: 'B', s9: 'A', s15: 'A' } },
  hibrido: { sp: 'piromante', n: 'Brasa Ardiente', arch: 'Híbrido Brasa-Ignición', hero: 'invoca', heroCh: { f2: 'A', f4: 'A', f8: 'A' }, heroNodes: ['f2', 'f1', 'f4', 'f5', 'f8', 'f3', 'f7', 'f10', 'f12', 'f11'], cls: { c1: 2, c2: 2, c5: 1, c6: 1, c9: 1, c12: 2, c13: 2, c16: 1, c19: 1, c23: 2, c10: 1, c17: 1, c20: 1, c4: 1, c8: 2, c15: 1, c3: 2, c26: 3, c29: 3, c24: 2, c7: 1, c4_: 1 }, clsCh: { c5: 'A', c6: 'B', c9: 'B', c10: 'A', c15: 'A', c16: 'B', c17: 'B' }, spec: { s1: 3, s2: 3, s4: 2, s5: 1, s8: 1, s9: 1, s11: 2, s12: 2, s15: 1, s16: 2, s18: 2, s19: 2, s22: 3, s23: 3, s3: 1, s20: 2 }, specCh: { s8: 'A', s9: 'A', s15: 'B' } },
  glaciar: { sp: 'crionte', n: 'Era Glacial', arch: 'Glaciar', hero: 'escriba', heroCh: { e2: 'B', e4: 'B', e8: 'B' }, heroNodes: ['e2', 'e3', 'e6', 'e5', 'e9', 'e8', 'e11', 'e12', 'e4', 'e1'], cls: { c1: 2, c4: 3, c5: 1, c8: 2, c11: 1, c15: 1, c19: 1, c22: 1, c2: 2, c12: 2, c9: 1, c16: 1, c18: 2, c13: 2, c6: 1, c10: 1, c25: 3, c28: 3, c3: 2, c7: 1, c14: 1 }, clsCh: { c5: 'B', c6: 'B', c9: 'B', c10: 'A', c11: 'B', c14: 'A', c15: 'A', c16: 'B', c22: 'B' }, spec: { i1: 3, i4: 2, i5: 1, i8: 1, i11: 2, i15: 1, i18: 2, i22: 3, i25: 3, i28: 4, i2: 3, i9: 1, i12: 2, i16: 2, i3: 1 }, specCh: { i8: 'A', i9: 'A', i15: 'A' } },
  tormenta: { sp: 'crionte', n: 'Invierno Eterno', arch: 'Tormenta', hero: 'invoca', heroCh: { f2: 'B', f4: 'A', f8: 'B' }, heroNodes: ['f2', 'f3', 'f6', 'f5', 'f9', 'f8', 'f11', 'f12', 'f4', 'f1'], cls: { c2: 2, c3: 2, c6: 1, c7: 1, c10: 1, c14: 1, c17: 1, c20: 1, c24: 2, c1: 2, c5: 1, c9: 1, c12: 2, c13: 2, c16: 1, c21: 1, c23: 2, c27: 3, c30: 3, c8: 2, c4: 2 }, clsCh: { c5: 'B', c6: 'B', c9: 'B', c10: 'A', c14: 'A', c16: 'B', c17: 'B' }, spec: { i3: 3, i7: 2, i6: 1, i10: 1, i13: 2, i14: 1, i17: 2, i21: 1, i24: 3, i27: 3, i28: 4, i2: 3, i9: 1, i16: 2, i20: 2 }, specCh: { i9: 'A', i10: 'A' } },
  fractura: { sp: 'crionte', n: 'Cero Absoluto', arch: 'Fractura', hero: 'escriba', heroCh: { e2: 'A', e4: 'B', e8: 'A' }, heroNodes: ['e2', 'e1', 'e3', 'e5', 'e8', 'e4', 'e7', 'e10', 'e12', 'e11'], cls: { c1: 2, c2: 2, c5: 1, c6: 1, c9: 1, c12: 2, c13: 2, c16: 1, c19: 1, c23: 2, c10: 1, c17: 1, c20: 1, c4: 1, c8: 2, c15: 1, c3: 2, c26: 3, c29: 3, c24: 2, c4_: 2 }, clsCh: { c5: 'A', c6: 'A', c9: 'B', c10: 'B', c15: 'B', c16: 'A', c17: 'A' }, spec: { i2: 3, i5: 1, i9: 1, i12: 2, i16: 2, i19: 2, i23: 3, i26: 3, i28: 4, i1: 3, i4: 1, i8: 1, i15: 1, i3: 3, i6: 1 }, specCh: { i8: 'B', i9: 'B', i15: 'B' } },
  hibcrio: { sp: 'crionte', n: 'Escarcha Quebradiza', arch: 'Híbrido Glaciar-Fractura', hero: 'invoca', heroCh: { f2: 'A', f4: 'B', f8: 'B' }, heroNodes: ['f2', 'f1', 'f4', 'f5', 'f8', 'f3', 'f7', 'f10', 'f12', 'f11'], cls: { c1: 2, c2: 2, c5: 1, c6: 1, c9: 1, c12: 2, c13: 2, c16: 1, c19: 1, c23: 2, c10: 1, c17: 1, c20: 1, c4: 1, c8: 2, c15: 1, c3: 2, c26: 3, c29: 3, c24: 2, c7: 1, c4_: 1 }, clsCh: { c5: 'A', c6: 'B', c9: 'B', c10: 'A', c15: 'A', c16: 'B', c17: 'B' }, spec: { i1: 3, i2: 3, i4: 2, i5: 1, i8: 1, i9: 1, i11: 2, i12: 2, i15: 1, i16: 2, i18: 2, i19: 2, i22: 3, i23: 3, i3: 1, i20: 2 }, specCh: { i8: 'A', i9: 'B', i15: 'A' } },
  rayo: { sp: 'arcanista', n: 'Tormenta de Cargas', arch: 'Rayo', hero: 'crono', heroCh: { t2: 'A', t4: 'B', t8: 'A' }, heroNodes: ['t2', 't1', 't3', 't5', 't8', 't4', 't7', 't10', 't12', 't11'], cls: { c1: 2, c2: 2, c5: 1, c6: 1, c9: 1, c12: 2, c13: 2, c16: 1, c19: 1, c23: 2, c10: 1, c17: 1, c20: 1, c4: 1, c8: 2, c15: 1, c3: 2, c26: 3, c29: 3, c24: 2, c4_: 2 }, clsCh: { c5: 'A', c6: 'A', c9: 'B', c10: 'B', c15: 'B', c16: 'A', c17: 'A' }, spec: { a1: 3, a4: 2, a5: 1, a8: 1, a11: 2, a15: 1, a18: 2, a22: 3, a25: 3, a28: 4, a2: 3, a9: 1, a12: 2, a16: 2, a3: 1 }, specCh: { a8: 'A', a9: 'A', a15: 'B' } },
  orbe: { sp: 'arcanista', n: 'Constelación', arch: 'Orbe', hero: 'escriba', heroCh: { e2: 'B', e4: 'B', e8: 'A' }, heroNodes: ['e2', 'e3', 'e6', 'e5', 'e9', 'e8', 'e11', 'e12', 'e4', 'e1'], cls: { c2: 2, c3: 2, c6: 1, c7: 1, c10: 1, c14: 1, c17: 1, c20: 1, c24: 2, c1: 2, c5: 1, c9: 1, c12: 2, c13: 2, c16: 1, c21: 1, c23: 2, c27: 3, c30: 3, c8: 2, c4: 2 }, clsCh: { c5: 'B', c6: 'B', c9: 'B', c10: 'A', c14: 'A', c16: 'B', c17: 'B' }, spec: { a2: 3, a5: 1, a9: 1, a12: 2, a16: 2, a19: 2, a23: 3, a26: 3, a28: 4, a1: 3, a4: 1, a8: 1, a15: 1, a3: 3, a6: 1 }, specCh: { a8: 'B', a9: 'B', a15: 'A' } },
  grieta: { sp: 'arcanista', n: 'Grieta Eterna', arch: 'Grieta', hero: 'crono', heroCh: { t2: 'A', t4: 'A', t8: 'A' }, heroNodes: ['t2', 't3', 't6', 't5', 't9', 't8', 't11', 't12', 't4', 't1'], cls: { c1: 2, c4: 3, c5: 1, c8: 2, c11: 1, c15: 1, c19: 1, c22: 1, c2: 2, c12: 2, c9: 1, c16: 1, c18: 2, c13: 2, c6: 1, c10: 1, c25: 3, c28: 3, c3: 2, c7: 1, c14: 1 }, clsCh: { c5: 'B', c6: 'B', c9: 'B', c10: 'A', c11: 'B', c14: 'A', c15: 'A', c16: 'B', c22: 'B' }, spec: { a3: 3, a7: 2, a6: 1, a10: 1, a13: 2, a14: 1, a17: 2, a21: 1, a24: 3, a27: 3, a28: 4, a2: 3, a9: 1, a16: 2, a20: 2 }, specCh: { a9: 'A', a10: 'A' } },
  hibarca: { sp: 'arcanista', n: 'Rayo Orbital', arch: 'Híbrido Rayo-Orbe', hero: 'escriba', heroCh: { e2: 'A', e4: 'B', e8: 'A' }, heroNodes: ['e2', 'e1', 'e3', 'e5', 'e8', 'e4', 'e7', 'e10', 'e12', 'e11'], cls: { c1: 2, c2: 2, c5: 1, c6: 1, c9: 1, c12: 2, c13: 2, c16: 1, c19: 1, c23: 2, c10: 1, c17: 1, c20: 1, c4: 1, c8: 2, c15: 1, c3: 2, c26: 3, c29: 3, c24: 2, c7: 1, c4_: 1 }, clsCh: { c5: 'A', c6: 'B', c9: 'B', c10: 'A', c15: 'A', c16: 'B', c17: 'B' }, spec: { a1: 3, a2: 3, a4: 2, a5: 1, a8: 1, a9: 1, a11: 2, a12: 2, a15: 1, a16: 2, a18: 2, a19: 2, a22: 3, a23: 3, a3: 1, a20: 2 }, specCh: { a8: 'A', a9: 'B', a15: 'B' } },
};
const DEFAULT_TEMPLATE = ['brasa', 'glaciar', 'rayo'];
// traduce una build de la Maga a la clase: prefijos de especialización y de héroe, ids
function translateBuild(b, c) {
  const pre = {}, ids = {};
  MAGA_SPEC_PREFIX.forEach((p, i) => { pre[p] = c.specs[i].prefix; });
  MAGA_SPECS.forEach((s, i) => { ids[s] = c.specs[i].id; });
  const hpre = {}, hids = {};
  MAGA_HERO_PREFIX.forEach((p, i) => { hpre[p] = c.hero[i].prefix; });
  MAGA_HEROES.forEach((h, i) => { hids[h] = c.hero[i].id; });
  const mapId = (id, table) => id.replace(/^([a-z]+)(\d+_?)$/, (m, p, rest) => (p === 'c' ? m : `${table[p] ?? p}${rest}`));
  const mapObj = (o, table) => Object.fromEntries(Object.entries(o).map(([k, v]) => [mapId(k, table), v]));
  return { ...b, sp: ids[b.sp], hero: hids[b.hero], heroCh: mapObj(b.heroCh, hpre), heroNodes: b.heroNodes.map(id => mapId(id, hpre)),
    cls: { ...b.cls }, clsCh: { ...b.clsCh }, spec: mapObj(b.spec, pre), specCh: mapObj(b.specCh, pre) };
}

// ---------------------------------------------------------------- activas de talento (kind 'talent', ranura 2)
function talentSkill(id, cat, elem, req, grantBy, extra = {}) {
  return { id, name: `Activa ${id}`, icon: '✦', kind: 'talent', cat, slots: ['k2'], tags: [cat, elem], elem, type: 'buff',
    req, cd: 30, dur: 4, stats: { dr: 10 }, grantBy, desc: `Habilidad de talento de prueba (${id}).`, ...extra };
}

// ---------------------------------------------------------------- ensamblado por clase
export const FIXTURE_POWERS = new Set();
function makeClass(classId) {
  const c = CFG[classId];
  const cls = { name: c.name, nodes: buildTree(GRID.cls, 'c', clsContent(c), `${classId}-clase`) };
  const specs = c.specs.map(s => ({ id: s.id, name: s.name, role: s.role, roleLabel: s.roleLabel, icon: `specs/${s.id}.webp`,
    emblem: `emblems/${s.id}.webp`, mechanic: s.mechanic, elem: s.elem, prefix: s.prefix, innate: { ...s.innate },
    innateText: `Pasiva de ${s.name}`, line: `La fantasía de ${s.name} en una frase.`, desc: `Especialización ${s.name} (fixture).`,
    nodes: buildTree(GRID.spec, s.prefix, specContent(c, s), `${classId}-${s.id}`) }));
  const hero = c.hero.map((h, i) => ({ id: h.id, name: h.name, specs: HERO_SPECS[i].map(k => c.specs[k].id), art: 'ui256/menu_viajes.webp',
    line: `La línea de ${h.name}`, key: `El nodo clave de ${h.name} en una frase`, prefix: h.prefix,
    nodes: buildTree(GRID.hero, h.prefix, heroContent(c, h, c.heroGrants[i]), `${classId}-${h.id}`) }));
  const builds = {};
  for (const [k, b] of Object.entries(BUILD_TEMPLATES)) builds[k] = translateBuild(b, c);
  const defaultBuild = Object.fromEntries(c.specs.map((s, i) => [s.id, DEFAULT_TEMPLATE[i]]));
  const skills = [
    talentSkill(c.grants[0], 'defense', c.elem, 21, 'c11'),
    talentSkill(c.grants[1], 'utility', c.elem, 27, 'c17'),
    talentSkill(c.grants[2], 'utility', c.elem, 31, 'c22'),
    ...c.heroGrants.map((id, i) => talentSkill(id, 'utility', c.elem, 72, `${c.hero[i].prefix}4`, { hero: true })),
  ];
  for (const n of [...cls.nodes, ...specs.flatMap(s => s.nodes), ...hero.flatMap(h => h.nodes)])
    for (const fx of n.t === 'c' ? n.opts.map(o => o.fx) : [n.fx]) if (fx.power) FIXTURE_POWERS.add(fx.power);
  return { v: 2, cls, specs, hero, builds, defaultBuild, groups: {}, skills };
}

export const MAGA_TALENTS = makeClass('maga');
export const GUERRERO_TALENTS = makeClass('guerrero');
export const ARQUERA_TALENTS = makeClass('arquera');
export const MAGA_TALENT_SKILLS = MAGA_TALENTS.skills;
export const GUERRERO_TALENT_SKILLS = GUERRERO_TALENTS.skills;
export const ARQUERA_TALENT_SKILLS = ARQUERA_TALENTS.skills;
// claves tv propias de cada clase (las consume un poder de la clase; test78 las acepta)
export const MAGA_TV_KEYS = [CFG.maga.tvKey];
export const GUERRERO_TV_KEYS = [CFG.guerrero.tvKey];
export const ARQUERA_TV_KEYS = [CFG.arquera.tvKey];
export const FIXTURE_TREES = { maga: MAGA_TALENTS, guerrero: GUERRERO_TALENTS, arquera: ARQUERA_TALENTS };
