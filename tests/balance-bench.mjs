// ============================================================
// BANCO DE BALANCE — Paso 1A (objetivos) · 2b.2 (canal real) · 2e (pruebas de rol)
// ============================================================
// Simula combates con:
//  - héroes construidos con el código real (Player.recompute, generateItem,
//    talentos —especialización + preset de su nivel—, paragon, bendiciones,
//    soportes, ramas de habilidad);
//  - el CANAL REAL de lanzamiento (js/game-skills.js vía el arnés de tests): el
//    mismo resolveSkill, GCD de 0,2 s, windup, impactDelay, bloqueos, cadencia de
//    los básicos, proyectiles que tiran el daño al impactar, comportamientos de
//    varios golpes, canalizaciones por tics, campos de suelo, DoT por el
//    planificador, Debilidad y multiplicadores [×], recurso real, indicadores de
//    especialización (spec-mechanics.js) y Furia por daño recibido;
//  - azar con semilla fija (js/rng.js) → resultados reproducibles.
//
// BARRA (Paso 2e, §7.1): Nv < 10 → LOADOUT por clase (sin especialización);
// Nv ≥ 10 → LOADOUT_SPEC de la especialización (🖱️Der · 2 ofensiva/defensiva ·
// 3 insignia · 4 definitiva de daño de la clase). La movilidad (1) no entra.
// ROTACIÓN ROT_SPEC (§7.1, una acción cada vez que el canal lo permite y como mucho
// una cada HUMAN_GAP s): defensa de 2 (vida < 50 %, o al enfriarse en TTD+) →
// gasto del indicador lleno (GAUGE_SPEND) → definitiva → insignia (3) → gastadora
// de 2 con enfriamiento → 🖱️Der → gastadora de 2 sin enfriamiento → básico. Se
// reserva recurso para una habilidad con enfriamiento lista (3 o 2).
//
// ESCENARIOS (típico Nv50 T0 por especialización; matriz de `--report`):
//  - UNI: 60 s contra un jefe de «90 s de vida» (vida = vida del jefe × 90 / su
//    TTK de jefe): DPS, reparto por habilidad y Quebrantados/min (stagger real).
//  - ÁREA×5: 30 s contra 5 comunes agrupados (r 1,4 alrededor de un punto) con
//    vida de campeón (×3) que se reponen al morir: DPS total (cuentan las muertes:
//    Juicio, Conflagración, remates…).
//  - TTD+: manada inmortal (1 campeón + 4 comunes en anillo de 1,3 m) que pega
//    cuerpo a cuerpo sin pausa por Player.takeDamage (bloqueo, armadura, dr,
//    escudos, condDr, onDamaged, onLethal, curas, Bastión, Furia); el héroe pelea
//    con su rotación y usa la defensa de 2 al enfriarse. Los aturdidos/congelados
//    no pegan; a los héroes a distancia tampoco les pegan los inmovilizados (se
//    alejan). Tope 180 s.
//  - APOYO: UNI con 2 aliados fantasma en g.party (vida = media de las 9
//    especializaciones, pierden 2 %/s, empiezan al 60 %). Aporte = Σ aliados del
//    DPS extra que les dan tus buffs (dmgPct, vel. de ataque, crítico ×0,5) y la
//    Debilidad del jefe, en «DPS de un aliado»; curación = curación + escudos
//    EFECTIVOS que reciben los aliados, en % de su vida por segundo.
//  - CONTROL: 30 s contra 5 comunes inmortales: % del tiempo con control duro
//    (aturdir/congelar), duro o inmovilizados, y «lento» (ralentización ≥ 30 % o
//    peor: inmovilizado o aturdido); contra jefe, Quebrantados por minuto (UNI).
// Variantes: la ofensiva en UNI/ÁREA/APOYO/CONTROL; TTD+ con la defensiva; el
// Guardián todo con la defensiva. `--report` desdobla UNI y TTD+ por variante.
// La Tiradora se mide disparando en movimiento (vaivén lateral de 0,3 s): su
// Impulso solo se llena así; el resto, quietos.
// Uso: `node tests/balance-bench.mjs` (afirma) · `--report` (solo imprime) ·
//      `--seeds N` (medianas de las semillas 1..N, solo informe)
// ============================================================
import * as THREE from 'three';
import { Player, Enemy } from '../js/entities.js';
import { generateItem } from '../js/items.js';
import { CLASSES, ENEMIES, ELITE_MODS, ENEMY_RANKS, bossForFloor, scaleEnemy,
  SKILL_MODS, paragonBoardFor, BLESSINGS, blessingValue } from '../js/data.js';
import { normalizeTalents, presetRanks, presetList, TALENT_START_LEVEL } from '../js/talents.js';
import * as CM from '../js/combat-math.js';
import { resolveSkill, isKnown, GCD } from '../js/skill-resolve.js';
import { onHurtResource } from '../js/resources.js';
import { gaugeValue, gaugeState } from '../js/spec-mechanics.js';
import { createRng, hashSeed } from '../js/rng.js';
import { makeGame } from './helpers/power-harness.mjs';

globalThis.performance = globalThis.performance || { now: () => Date.now() };
const REPORT_ONLY = process.argv.includes('--report');

const DT = 1 / 60, WALK = 0.6, HUMAN_GAP = GCD, UNI_T = 60, UNI_LIFE = 90;
const AREA_T = 30, CTL_T = 30, TTD_MAX = 180, APOYO_T = 60;
const SLOTS = [['weapon', 'weapon'], ['offhand', 'offhand'], ['helm', 'helm'], ['shoulders', 'shoulders'],
  ['chest', 'chest'], ['gloves', 'gloves'], ['belt', 'belt'], ['pants', 'pants'], ['boots', 'boots'],
  ['amulet', 'amulet'], ['ring', 'ring'], ['ring2', 'ring']];
// LOADOUT por clase (Nv < 10, sin especialización): por ranura, la primera habilidad
// CONOCIDA de la lista (y distinta de la de 🖱️Der). k2off = variante ofensiva ·
// k2def = variante defensiva. (Paso 2b.2)
export const LOADOUT = {
  guerrero: { rmb: ['g_hendidura', 'torbellino'], k2off: ['terremoto'], k2def: ['g_piel'], k4: ['g_u_cataclismo'] },
  maga:     { rmb: ['bola_fuego'], k2off: ['meteoro', 'rayo'], k2def: ['m_armadura'], k4: ['m_u_supernova'] },
  arquera:  { rmb: ['flecha_perforante'], k2off: ['lluvia_flechas'], k2def: ['a_humo'], k4: ['a_u_diluvio'] },
};
// Paso 2e (§7.1): barra por ESPECIALIZACIÓN (tabla de docs/paso2-diseno.md §7.1). Las
// listas llevan alternativas para niveles en que la primera aún no se conoce. La
// definitiva (4) es la de daño de la clase (§7.1 no la fija; así la regla del 12–22 %
// se mide igual en las 9), salvo la Arcanista: Desgarro Arcano (la de su elemento; la
// Supernova es de Fuego y no recibe ninguno de sus talentos).
export const LOADOUT_SPEC = {
  berserker:      { rmb: ['g_hendidura', 'torbellino'], k2off: ['torbellino'], k2def: ['g_piel'], k3: ['g_t_remolino'], k4: ['g_u_cataclismo'] },
  guardian:       { rmb: ['g_martillo', 'torbellino'], k2off: ['terremoto', 'g_hendidura'], k2def: ['g_piel'], k3: ['g_t_desafio'], k4: ['g_u_cataclismo'] },
  cruzado:        { rmb: ['g_t_veredicto', 'g_martillo'], k2off: ['g_martillo', 'torbellino'], k2def: ['g_t_bramido', 'g_piel'], k3: ['g_t_devocion'], k4: ['g_u_cataclismo'] },
  piromante:      { rmb: ['bola_fuego'], k2off: ['meteoro', 'rayo'], k2def: ['m_armadura'], k3: ['p_llamarada'], k4: ['m_u_supernova'] },
  crionte:        { rmb: ['nova_hielo', 'bola_fuego'], k2off: ['k_lanza', 'rayo'], k2def: ['m_armadura'], k3: ['k_prision'], k4: ['m_u_supernova'] },
  arcanista:      { rmb: ['rayo', 'bola_fuego'], k2off: ['a_misiles', 'meteoro'], k2def: ['m_t_barrera', 'm_armadura'], k3: ['a_orbe'], k4: ['m_u_desgarro', 'm_u_supernova'] },
  francotiradora: { rmb: ['flecha_perforante'], k2off: ['a_t_apuntado', 'lluvia_flechas'], k2def: ['a_humo', 'a_red'], k3: ['a_t_vision'], k4: ['a_u_diluvio'] },
  montaraz:       { rmb: ['flecha_multiple', 'flecha_perforante'], k2off: ['lluvia_flechas'], k2def: ['a_red'], k3: ['a_t_cepo'], k4: ['a_u_diluvio'] },
  tiradora:       { rmb: ['flecha_multiple', 'flecha_perforante'], k2off: ['lluvia_flechas'], k2def: ['a_humo', 'a_red'], k3: ['a_t_andanada'], k4: ['a_u_diluvio'] },
};
export const SPECS = { guerrero: ['berserker', 'guardian', 'cruzado'], maga: ['piromante', 'crionte', 'arcanista'], arquera: ['francotiradora', 'montaraz', 'tiradora'] };
export const SPEC_CLASS = Object.fromEntries(Object.entries(SPECS).flatMap(([c, l]) => l.map(s => [s, c])));
export const ALL_SPECS = Object.values(SPECS).flat();
// especialización por defecto de las filas por CLASE (la de daño; Paso 2c.0)
export const SPEC_PICK = { guerrero: 'berserker', maga: 'piromante', arquera: 'francotiradora' };
// el Guardián se mide en TODO con la variante defensiva (§7.1: es la que define su rol)
export const DEF_ALL = new Set(['guardian']);
// distancia al objetivo: cuerpo a cuerpo / a distancia; la Crionte juega a media
// distancia (su Nova es de 3,3 m a su alrededor)
const DIST = { guerrero: 1.6, maga: 5, arquera: 5 };
const SPEC_DIST = { crionte: 2.4 };
const SPEC_MOVING = new Set(['tiradora']);
const PARAGON_ORDER = ['4_3', '4_5', '4_2', '4_6', '4_1', '4_7', '3_2', '5_2', '3_6', '5_6', '4_0', '4_8',
  '3_4', '5_4', '2_4', '6_4', '1_4', '7_4', '2_3', '2_5', '6_3', '6_5', '0_4', '8_4', '3_3', '5_3', '3_5', '5_5'];

// valor de un objeto para el héroe del banco. Paso 2b.2 (solo el ÓPTIMO): el daño del
// arma vale ×6 (es la base de todo golpe), el atributo PRINCIPAL de la clase ×2
// (multiplica el daño) y los demás ×0,5 (vitalidad ×1).
function itemValue(it, mainStat = null) {
  const a = it.affixes || {};
  const attr = k => (a[k] || 0) * (!mainStat ? 1 : k === mainStat ? 2 : k === 'vit' ? 1 : 0.5);
  return (it.dmg ? (it.dmg[0] + it.dmg[1]) * (mainStat ? 6 : 2) : 0) + (it.arm || 0) + (a.hp || 0) * 0.5 +
    (a.dmgPct || 0) * 2 + (a.crit || 0) * 2 + attr('fue') + attr('des') + attr('ene') + attr('vit') + (a.aspdPct || 0);
}

// build: 'tipico' (raros, sin soportes/ramas, talentos con el preset y paragon en orden natural)
//        'optimo' (legendarios calidad máx. con poderes elegidos, soportes,
//                  ramas, paragon con glifos r10, bendiciones de grieta)
// opts: spec (Nv ≥ 10; por defecto SPEC_PICK) · loadout 'auto' (Nv < 10 clase, Nv ≥ 10
//       especialización) | 'class' | 'spec' · variant 'ofensiva' | 'defensiva' | 'basico'
export function buildHero(classId, level, build, { al = CM.areaLevelForHero(level), torment = 0, seed = 1, variant = 'ofensiva', spec = null, loadout = 'auto' } = {}) {
  const rng = createRng(hashSeed('bench', classId, level, build, al, torment, seed));
  const g = makeGame({ seed });
  const p = new Player(g, classId);
  g.player = p;
  p.combatRng = rng.fork('combate');
  p.level = level;
  const cls = CLASSES[classId];
  const pts = 5 * (Math.min(level, 20) - 1);
  p.attributes[cls.mainStat] += Math.round(pts * 0.6);
  p.attributes.vit += pts - Math.round(pts * 0.6);
  const opt = build === 'optimo';
  // equipo: ilvl del área (acotado) y calidad del Tormento (combat-math)
  const il = CM.itemLevel(al);
  const q = CM.tormentMods(torment).quality;
  const irng = rng.fork('items');
  for (const [slot, kind] of SLOTS) {
    let best = null, bv = -1;
    for (let i = 0; i < (opt ? 12 : 3); i++) {
      const it = generateItem(il, opt ? 'legendario' : 'raro', kind, null, classId, irng);
      const v = itemValue(it, opt ? cls.mainStat : null);   // el típico no optimiza (Paso 1A)
      if (v > bv) { bv = v; best = it; }
    }
    best.unidentified = false;
    best.quality = opt ? CM.tormentMods(10).quality : q;
    if (opt) {
      // poderes elegidos: Furia en el arma, Volátil/Vendaval en joyas; resto sin poder
      const pw = slot === 'weapon' ? 'furia' : slot === 'amulet' ? (cls.ranged ? 'multidisparo' : 'volatil') : null;
      best.power = pw ? { id: pw, name: pw, desc: '' } : null;
    }
    p.equipment[slot] = best;
  }
  // talentos (Nv ≥ 10): especialización + el preset recomendado recortado a los puntos
  // de su nivel (clase: el clsPreset de esa especialización), con sus elecciones
  const sp = level >= TALENT_START_LEVEL ? (spec || SPEC_PICK[classId]) : null;
  if (sp) {
    p.talents = normalizeTalents({ spec: sp }, classId);
    p.talents.cls = presetRanks(p, 'cls') || {};
    p.talents.sp[sp] = presetRanks(p, 'spec') || {};
    for (const which of ['cls', 'spec']) for (const [id, , k] of presetList(p, which)) if (k) p.talents.choice[id] = k;
  }
  // paragon: puntos = nivel − 20, nodos en orden contiguo
  if (level > 20) {
    const board = paragonBoardFor(classId);
    const n = Math.min(PARAGON_ORDER.length, level - 20);
    for (let i = 0; i < n; i++) p.paragon.nodes[PARAGON_ORDER[i]] = true;
    if (opt) {
      for (const s of board.filter(x => x.type === 'socket'))
        if (p.paragon.nodes[s.id]) p.paragon.glyphs[s.id] = { stat: 'dmgPct', per: 1.5, adj: 0.5, fam: 'ofensiva', famAdj: 1.5, rank: 10 };
      const tier = Math.max(0, Math.round((level - 20) / 3));
      const pick = id => { const b = BLESSINGS.find(x => x.id === id); return { stat: b.stat, value: blessingValue(b, tier), name: b.name }; };
      p.blessings = { Ofensiva: pick('b_dmg'), Celeridad: pick('b_cdr'), Defensiva: pick('b_hp') };
    }
  }
  // soportes y ramas (solo el óptimo)
  if (opt) {
    for (const s of cls.skills) {
      // los incompatibles por tags (Sobrecarga en básicos, definitivas…) los ignora el resolvedor
      if (s.type !== 'buff') p.supports[s.id] = ['amplify', 'overcharge'];
      const br = SKILL_MODS[s.id];
      if (!br) continue;
      const ch = {};
      for (const b of br) {
        const pref = b.opts.find(o => o.dmg >= 40 && !o.radius) || b.opts.find(o => o.cdr > 0 && b.name !== 'Potencia')
          || b.opts.find(o => o.zone) || b.opts.find(o => o.vuln) || b.opts.find(o => o.buff > 0) || b.opts[0];
        ch[b.id] = pref.id;
      }
      p.skillMods[s.id] = ch;
    }
  }
  p.recompute();
  p.hp = p.stats.maxHP;
  p.mp = cls.resource?.start === 0 ? 0 : p.stats.maxMP;
  p.pos.set(0, 0, 0);
  p._benchSpec = sp;
  p._benchLoadout = loadout === 'auto' ? (sp ? 'spec' : 'class') : loadout;
  p._benchVariant = variant;
  applyLoadout(p, variant);
  return p;
}

// barra del banco según la variante (solo habilidades conocidas a ese nivel)
export function loadoutOf(p, variant = 'ofensiva') {
  const useSpec = p._benchLoadout === 'spec' && p._benchSpec && LOADOUT_SPEC[p._benchSpec];
  const L = useSpec ? LOADOUT_SPEC[p._benchSpec] : LOADOUT[p.classId];
  const cls = p.cls;
  const known = id => { const s = cls.skills.find(x => x.id === id); return s && isKnown(p, s) ? id : null; };
  const first = (list, not = []) => (list || []).map(known).find(id => id && !not.includes(id)) || null;
  const bar = { lmb: cls.skills.find(s => s.cat === 'basic' && s.type === 'weapon').id, rmb: null, k1: null, k2: null, k3: null, k4: null };
  if (variant === 'basico') return bar;
  bar.rmb = first(L.rmb);
  bar.k3 = first(L.k3, [bar.rmb]);
  bar.k2 = variant === 'defensiva' ? first(L.k2def, [bar.rmb, bar.k3]) : first(L.k2off, [bar.rmb, bar.k3]);
  bar.k4 = first(L.k4);
  return bar;
}
function applyLoadout(p, variant) { p.hotbar = loadoutOf(p, variant); }
// distancia al objetivo del banco
function distOf(p) { return SPEC_DIST[p._benchSpec] ?? DIST[p.classId] ?? 2; }

// --- enemigos de referencia de un nivel de área ---
export function refEnemies(al, torment = 0) {
  const pool = ENEMIES.filter(e => e.minFloor <= al && e.weight > 0);
  const W = pool.reduce((s, e) => s + e.weight, 0);
  const sc = pool.map(e => ({ e, s: scaleEnemy(e, al) }));
  const tm = CM.tormentMods(torment);
  const hp = sc.reduce((s, x) => s + x.s.hp * x.e.weight, 0) / W * tm.hp;
  const dps = sc.reduce((s, x) => s + x.s.dmg / x.e.atkTime * x.e.weight, 0) / W * tm.dmg;
  const eliteMod = ELITE_MODS.reduce((s, m) => s + (m.hp || 1), 0) / ELITE_MODS.length;
  const bossDef = bossForFloor(al);
  const boss = scaleEnemy(bossDef, al);
  return {
    common: hp,
    elite: hp * CM.eliteHpMult(al) * eliteMod,
    boss: boss.hp * tm.hp,
    commonDps: dps, champDps: dps * ENEMY_RANKS.campeon.dmg, eliteDps: dps * ENEMY_RANKS.elite.dmg,
    bossDps: boss.dmg / (bossDef.atkTime || 1) * tm.dmg,
    al,
  };
}

// enemigo REAL inmóvil (Enemy de entities.js: applyCC, Debilidad, Π[×], onKill)
// kind 'common' | 'champ' (rango campeón) | 'elite' | 'boss'
function spawnAt(g, ref, kind, hp, x, z = 0) {
  const base = kind === 'boss' ? bossForFloor(ref.al) : ENEMIES[0];
  const def = { ...scaleEnemy(base, ref.al), hp };
  if (kind === 'elite') def.rank = 'elite';
  if (kind === 'champ') def.rank = 'campeon';
  const e = new Enemy(g, def, new THREE.Vector3(x, 0, z));
  e.maxHP = e.hp = hp;
  e._home = new THREE.Vector3(x, 0, z);
  g.enemies.push(e);
  return e;
}
function spawnTarget(g, kind, hp, ref, dist) { return spawnAt(g, ref, kind, hp, dist, 0); }

// estadísticas de daño por habilidad (atribución por opts.skill del golpe)
function newStats() { return { maxHit: 0, maxHitBy: null, by: {}, total: 0, uses: {}, frame: 0, frameHits: {}, sameFrameCasts: 0 }; }
function track(e, stats) {
  const orig = e.takeDamage.bind(e);
  e.takeDamage = (amount, crit, opts = {}) => {
    const before = e.hp;
    const dealt = orig(amount, crit, opts);
    const d = Math.max(0, before - Math.max(0, e.hp));    // vida quitada (sin el exceso)
    const raw = Math.max(0, before - e.hp);               // golpe real (para el golpe máximo)
    const k = opts.skill || (opts.source && String(opts.source)) || 'otros';
    if (raw > stats.maxHit) { stats.maxHit = raw; stats.maxHitBy = k; }
    stats.by[k] = (stats.by[k] || 0) + d;
    stats.total += d;
    // impactos DIRECTOS por frame (sin tics de DoT/campos ni procs): regla de los dos botones
    if (!opts.dot && !opts.proc && opts.skill) (stats.frameHits[stats.frame] || (stats.frameHits[stats.frame] = new Set())).add(opts.skill);
    return dealt;
  };
}

// ---------------- ROT_SPEC (§7.1) ----------------
const slotOf = (p, id) => ['rmb', 'k2', 'k3', 'k4'].find(s => p.hotbar[s] === id) || null;
const readySlot = (p, id) => { const s = slotOf(p, id); return s && !((p.cds[id] || 0) > 0) ? s : null; };
const hasBuff = (p, id) => (p.buffs || []).some(b => b.id === id && b.t > 0);
// «gasto del indicador lleno» por especialización → ranura a pulsar primero (o null)
export const GAUGE_SPEND = {
  cruzado: p => (gaugeValue(p, 'fervor') >= 3 ? readySlot(p, 'g_t_veredicto') : null),
  guardian: p => (gaugeValue(p, 'bastion') >= 5 ? readySlot(p, 'g_t_muro') : null),
  piromante: p => (gaugeState(p, 'calor')?.ready ? (readySlot(p, 'meteoro') || readySlot(p, 'bola_fuego')) : null),
  crionte: (p, g, e) => (e?.frozenT > 0 ? readySlot(p, 'k_lanza') : null),
  arcanista: p => (gaugeValue(p, 'cargas') >= 4 ? readySlot(p, 'rayo') : null),
  francotiradora: p => (gaugeValue(p, 'concentracion') >= 100 ? readySlot(p, 'a_t_apuntado') : null),
  tiradora: p => (gaugeState(p, 'impulso')?.galeT > 0 ? readySlot(p, 'flecha_multiple') : null),
};
// habilidades que solo se pulsan con su indicador (si no, el lanzamiento no hace nada)
const SKILL_GATE = {
  g_t_veredicto: p => gaugeValue(p, 'fervor') >= 3 || hasBuff(p, 'g_ascension'),
  g_t_muro: p => gaugeValue(p, 'bastion') >= 1,
};
// rotación de un héroe: devuelve una función (g, e) → ranura lanzada o null
export function makeRotation(p, { defAtCd = false } = {}) {
  const skOf = id => (id ? p.cls.skills.find(s => s.id === id) : null);
  const bar = p.hotbar;
  const k2 = skOf(bar.k2);
  const k2def = !!k2 && (k2.cat === 'defense' || k2.cat === 'utility');
  const k2cd = !!k2 && !k2def && (k2.cd || 0) > 0;
  const tail = ['k4', 'k3', ...(k2cd ? ['k2'] : []), 'rmb', ...(!k2def && !k2cd && k2 ? ['k2'] : [])];
  const spec = p._benchSpec;
  const ok = k => { const id = bar[k]; return !!id && (!SKILL_GATE[id] || SKILL_GATE[id](p)); };
  return (g, e) => {
    const order = [];
    if (k2def && (defAtCd || p.hp < 0.5 * p.stats.maxHP)) order.push('k2');
    const gs = GAUGE_SPEND[spec]?.(p, g, e);
    if (gs) order.push(gs);
    // una gastadora de 2 sin enfriamiento que deja Vulnerable se pulsa antes si el
    // objetivo ya no lo está (mantener el debilitamiento, como haría un jugador)
    if (k2 && !k2def && !k2cd && e && !(e.vulnT > 0.3) && resolveSkill(p, k2).vuln > 0) order.push('k2');
    for (const k of tail) if (!order.includes(k)) order.push(k);
    // reserva: una habilidad CON enfriamiento lista (3, o 2 ofensiva) pero sin recurso
    // → no se gasta en las gastadoras sin enfriamiento (se junta para ella)
    const reserve = ['k3', ...(k2cd ? ['k2'] : [])].some(k => {
      const s = skOf(bar[k]);
      if (!s || !isKnown(p, s) || !((s.cd || 0) > 0) || (p.cds[s.id] || 0) > 0 || !ok(k)) return false;
      const c = resolveSkill(p, s).cost;
      return c > 0 && p.mp < c;
    });
    for (const k of order) {
      if (!ok(k)) continue;
      if (reserve && (k === 'rmb' || (k === 'k2' && !k2cd && !k2def))) {
        const s = skOf(bar[k]);
        if (!((s?.cd || 0) > 0)) continue;
      }      if (g.castSkillSlot(k)) return k;
    }
    if (p.atkCd <= 0 && !(p.castLock > 0)) {
      g.castSkillSlot('lmb');                       // básico: arrancó si puso su cadencia o un windup
      if (p.atkCd > 0 || g._windup) return 'lmb';
    }
    return null;
  };
}

// un paso de simulación: la rotación (cada HUMAN_GAP), la Tiradora en vaivén, el mundo
function stepper(p, { rot, buttons = false, stats }) {
  const g = p.game;
  const moving = SPEC_MOVING.has(p._benchSpec);
  const st = { t: 0, gap: 0 };
  return (act, e) => {
    if (stats) stats.frame++;
    if (moving) g.input.keyDir = { x: 0, z: Math.floor(st.t / 0.3) % 2 ? 1 : -1 };
    if (act && buttons && e?.alive) {
      g.input.mouseWorld = e.pos.clone();
      g.input.mouseHeld = { l: true, r: true };
      const a0 = p.atkCd, w0 = !!g._windup;
      g.castSkillSlot('lmb');
      const basic = p.atkCd > a0 || (!w0 && !!g._windup);
      const sp = g.castSkillSlot('rmb');
      if (basic) stats.uses[p.hotbar.lmb] = (stats.uses[p.hotbar.lmb] || 0) + 1;
      if (sp) stats.uses[p.hotbar.rmb] = (stats.uses[p.hotbar.rmb] || 0) + 1;
      if (basic && sp) stats.sameFrameCasts++;
    } else if (act && st.gap <= 0 && e?.alive) {
      g.input.mouseWorld = e.pos.clone();
      const acted = rot(g, e);
      if (acted) {
        st.gap = HUMAN_GAP;
        const id = p.hotbar[acted];
        if (stats) stats.uses[id] = (stats.uses[id] || 0) + 1;
      }
    }
    g.step(DT);
    // el héroe no se desplaza (como el objetivo): se deshacen los retrocesos (Andanada…);
    // la Tiradora oscila ±0,8 m en el eje lateral
    if (!p.leap) { p.pos.x = 0; p.pos.z = moving ? Math.max(-0.8, Math.min(0.8, p.pos.z)) : 0; }
    st.gap = Math.max(0, st.gap - DT);
    st.t += DT;
    return st.t;
  };
}

// --- simulación con el canal REAL contra una cadena de objetivos ---
// kind: 'common' | 'elite' | 'boss' · count objetivos de vida hpEach · maxT por objetivo
// buttons: true = «los dos botones mantenidos» (🖱️Izq + 🖱️Der cada frame, como el
// bucle de main.js) en vez de la rotación; mide acciones lanzadas en el mismo frame.
export function simulate(p, hpEach, count, { kind = 'common', ref, maxT = 400, buttons = false, onFrame = null } = {}) {
  const g = p.game;
  const dist = distOf(p);
  const incDps = kind === 'boss' ? ref.bossDps : kind === 'elite' ? ref.eliteDps : ref.commonDps;
  const stats = newStats();
  const kills = [];
  const step = stepper(p, { rot: makeRotation(p), buttons, stats });
  let t = 0, last = null;
  const run = (act, e) => {
    // Furia por daño recibido (el objetivo pega con su DPS medio, tras mitigar)
    if (act && e?.alive && incDps > 0) onHurtResource(p, incDps * CM.expectedMitigation(p.stats, ref.al) * DT);
    t = step(act, e);
    if (e?.alive) e.pos.copy(e._home);              // inmóvil (deshace el retroceso)
    if (onFrame && e) onFrame(e);
  };
  for (let k = 0; k < count; k++) {
    g.enemies = g.enemies.filter(x => x.alive);
    const e = spawnTarget(g, kind, hpEach, ref, dist);
    last = e;
    track(e, stats);
    const t0 = t;
    while (e.alive && t - t0 < maxT) run(true, e);
    kills.push(t - t0);
    for (let w = 0; w < WALK - 1e-9; w += DT) run(false, null);
  }
  const fight = kills.reduce((a, b) => a + b, 0);
  const ttk = fight / kills.length;
  return { ttk, dps: stats.total / Math.max(1e-9, fight), fight, maxHit: stats.maxHit, maxHitBy: stats.maxHitBy, stats, last };
}

// UNI (§7.1): `dur` s contra un jefe de vida `hp` (por defecto inmortal) → DPS, reparto por
// habilidad y Quebrantados (stagger real: con vida finita el daño también suma stagger)
export function simulateUni(p, ref, dur = UNI_T, { buttons = false, hp = 1e12, onFrame = null } = {}) {
  const r = simulate(p, hp, 1, { kind: 'boss', ref, maxT: dur, buttons, onFrame });
  const both = Object.values(r.stats.frameHits).filter(s => s.has(p.hotbar.lmb) && p.hotbar.rmb && s.has(p.hotbar.rmb)).length;
  const T = Math.max(1e-9, r.fight);
  return { dps: r.stats.total / T, by: r.stats.by, uses: r.stats.uses, total: r.stats.total, maxHit: r.maxHit, maxHitBy: r.maxHitBy,
    sameFrameCasts: r.stats.sameFrameCasts, sameFrameHits: both, breaks: r.last?.staggerBreaks || 0, t: T };
}

// TTD contra manada (1 campeón + 4 comunes) sin mitigación activa (Paso 1A)
export function ttdPack(p, ref, al) {
  const incoming = (ref.commonDps * 4 + ref.champDps) * CM.expectedMitigation(p.stats, al);
  const regen = 0.4 + p.stats.vit * 0.02;
  return incoming <= regen ? Infinity : p.stats.maxHP / (incoming - regen);
}
// TTD+ analítico (Paso 2b.2; filas por clase): la defensa de la ranura 2 se usa al
// enfriarse (dr de buff, escudo, zona con allyDr). Perfiles reales de resolveSkill.
export function ttdPlus(p, ref, al) {
  const id = p.hotbar.k2;
  const sk = id ? p.cls.skills.find(s => s.id === id) : null;
  const prof = sk && (sk.cat === 'defense' || sk.cat === 'utility') ? resolveSkill(p, sk) : null;
  const regen = 0.4 + p.stats.vit * 0.02;
  const raw = ref.commonDps * 4 + ref.champDps;
  let hp = p.stats.maxHP, t = 0, cd = 0, active = 0, shield = 0;
  const dt = 0.05;
  while (hp > 0 && t < 600) {
    if (prof && cd <= 0) {
      cd = prof.cd || 20;
      active = prof.dur || sk.dur || 0;
      if (sk.type === 'shield') shield = (sk.shieldPct || 20) / 100 * p.stats.maxHP * prof.buffMul;
    }
    let dr = 0;
    if (active > 0 && prof) dr = (prof.buff?.dr || 0) + (sk.allyDr ? sk.allyDr * prof.buffMul : 0);
    const st = dr ? { ...p.stats, dr: Math.min(CM.CAPS.dr, (p.stats.dr || 0) + dr) } : p.stats;
    let inc = raw * CM.expectedMitigation(st, al) * dt;
    if (shield > 0) { const a = Math.min(shield, inc); shield -= a; inc -= a; }
    hp -= inc - regen * dt;
    t += dt; cd -= dt; active -= dt;
    if (active <= 0) shield = 0;
  }
  return t;
}

// ---------------- Paso 2e: escenarios de rol ----------------
// anillo de n posiciones de radio r alrededor de (cx, cz) (la primera en el centro si center)
function ring(n, r, cx = 0, cz = 0, center = false, off = 0.3) {
  const out = [];
  if (center) out.push([cx, cz]);
  const m = n - (center ? 1 : 0);
  for (let i = 0; i < m; i++) { const a = i * 2 * Math.PI / m + off; out.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]); }
  return out;
}

// TTD+ (§7.1) simulado: manada inmortal que pega de verdad. defAtCd = la defensa de 2
// se pulsa al enfriarse (variante defensiva); la ofensiva pelea igual sin defensa.
export function ttdPlusSim(p, ref, { defAtCd = true, maxT = TTD_MAX } = {}) {
  const g = p.game;
  const rot = makeRotation(p, { defAtCd });
  const step = stepper(p, { rot });
  const pack = ring(5, 1.3).map(([x, z], i) => {
    const e = spawnAt(g, ref, i === 0 ? 'champ' : 'common', 1e12, x, z);
    return { e, dps: i === 0 ? ref.champDps : ref.commonDps, atk: 0.2 * i + 0.1 };
  });
  const ranged = !!p.cls.ranged;
  const ATK = 1.0;
  let t = 0;
  while (p.alive && t < maxT) {
    t = step(true, pack[0].e);
    for (const s of pack) {
      const e = s.e;
      e.pos.copy(e._home);
      s.atk -= DT;
      if (s.atk > 0) continue;
      s.atk += ATK * (e.numbT > 0 ? 1 / 0.85 : 1);
      const stopped = e.stunT > 0 || (ranged && e.rootT > 0);
      if (!stopped && p.alive) p.takeDamage(s.dps * ATK, ref.al, { melee: true, source: e });
    }
  }
  return t;
}

// manada de ÁREA×5 / CONTROL: 5 enemigos dentro de un círculo de 3 m de radio (uno en el
// centro y 4 a 2 m, en cruz alineada con el héroe: una perforación atraviesa 3 en línea);
// el cuerpo a cuerpo pelea en el BORDE de la manada (centro a 2,2 m) y la distancia apunta
// al centro desde su distancia de combate
const AREA_R = 2.0;
function packCenter(p) { return p.cls.ranged || SPEC_DIST[p._benchSpec] ? distOf(p) + 0.5 : 2.2; }
// ÁREA×5 (§7.1): 5 comunes agrupados con vida de campeón que se reponen al morir
export function areaSim(p, ref, { dur = AREA_T } = {}) {
  const g = p.game;
  const stats = newStats();
  const step = stepper(p, { rot: makeRotation(p), stats });
  // dos disposiciones de la manada, la mitad del tiempo cada una: en CRUZ alineada con el
  // héroe (una perforación atraviesa 3; un proyectil choca con el de delante) y en ASPA
  // (el camino al centro libre: la explosión al impactar alcanza a los 5)
  const layouts = [ring(5, AREA_R, packCenter(p), 0, true, 0), ring(5, AREA_R, packCenter(p), 0, true, Math.PI / 4)];
  const hp = ref.common * ENEMY_RANKS.campeon.hp;
  const mk = ([x, z]) => { const e = spawnAt(g, ref, 'common', hp, x, z); track(e, stats); return e; };
  let spots = layouts[0];
  let live = spots.map(mk);
  let t = 0, kills = 0;
  const inc = 5 * ref.commonDps;
  while (t < dur) {
    if (spots === layouts[0] && t >= dur / 2) {
      for (const e of live) { e.alive = false; }
      g.enemies = g.enemies.filter(x => !live.includes(x));
      spots = layouts[1];
      live = spots.map(mk);
    }
    const focus = live[0];
    onHurtResource(p, inc * CM.expectedMitigation(p.stats, ref.al) * DT);
    t = step(true, focus);
    for (let i = 0; i < live.length; i++) {
      if (!live[i].alive) { kills++; g.enemies = g.enemies.filter(x => x !== live[i]); live[i] = mk(spots[i]); }
      else live[i].pos.copy(live[i]._home);
    }
  }
  return { dps: stats.total / dur, by: stats.by, total: stats.total, kills };
}

// CONTROL (§7.1): 5 comunes inmortales agrupados; % del tiempo con control
export function controlSim(p, ref, { dur = CTL_T } = {}) {
  const g = p.game;
  const step = stepper(p, { rot: makeRotation(p) });
  const live = ring(5, AREA_R, packCenter(p), 0, true, Math.PI / 4).map(([x, z]) => spawnAt(g, ref, 'common', 1e12, x, z));
  let t = 0, n = 0, hard = 0, hardRoot = 0, slow = 0;
  while (t < dur) {
    onHurtResource(p, 5 * ref.commonDps * CM.expectedMitigation(p.stats, ref.al) * DT);
    t = step(true, live[0]);
    for (const e of live) {
      e.pos.copy(e._home);
      const h = e.stunT > 0, r = e.rootT > 0, s = e.slowT > 0 && (e.slowPct || 0) >= 30;
      n++; if (h) hard++; if (h || r) hardRoot++; if (h || r || s) slow++;
    }
  }
  return { hard: hard / n, hardRoot: hardRoot / n, slow: slow / n };
}

// aliado fantasma del cooperativo (contrato de g.allies, §6; como h.ally del arnés) con
// su cubeta de sustento y la contabilidad de la curación EFECTIVA que recibe
function ghostAlly(g, x, z, maxHP) {
  const a = {
    pos: new THREE.Vector3(x, 0, z), alive: true, hp: maxHP * 0.6, stats: { maxHP, healPct: 0 }, buffs: [], shields: [],
    healed: 0, absorbed: 0, _leech: null,
    addBuff(id, stats, dur) { this.buffs = this.buffs.filter(b => b.id !== id); this.buffs.push({ id, stats: { ...stats }, t: dur, dur }); },
    healSkill(n) { const b = this.hp; this.hp = Math.min(this.stats.maxHP, this.hp + Math.max(0, n || 0)); this.healed += this.hp - b; return this.hp - b; },
    sustain(n) {
      const r = CM.sustainTake(this._leech, this.stats.maxHP, n);
      this._leech = r.bucket;
      return this.healSkill(r.heal);
    },
    addShield(n, dur, src) { this.shields = this.shields.filter(s => s.src !== src); if (n > 0 && dur > 0) this.shields.push({ amt: n, t: dur, src }); return n; },
    setHp(v) { this.hp = Math.max(0, Math.min(this.stats.maxHP, v)); return this.hp; },
    grantInvuln(s) { this.invulnT = s; },
    takeDamage(n, al, opts) { return g.damageAlly(this, n, opts); },
    tick(dt) {
      for (const b of this.buffs) b.t -= dt;
      this.buffs = this.buffs.filter(b => b.t > 0);
      for (const s of this.shields) s.t -= dt;
      this.shields = this.shields.filter(s => s.t > 0 && s.amt > 0);
      if (this.invulnT > 0) this.invulnT -= dt;
      this._leech = CM.sustainRefill(this._leech, this.stats.maxHP, dt);
    },
    // pierde `n` de vida: primero los escudos (cuentan como efectivos), luego g.damageAlly (⑫)
    hurt(n, src) {
      let left = n;
      for (const s of this.shields) { const take = Math.min(s.amt, left); s.amt -= take; left -= take; this.absorbed += take; if (left <= 0) break; }
      if (left > 0) g.damageAlly(this, left, { source: src });
      if (!this.alive || this.hp < 0.2 * this.stats.maxHP) { this.alive = true; this.hp = 0.5 * this.stats.maxHP; } // «poción» (no cuenta)
    },
    // multiplicador de su daño por tus buffs y la Debilidad del objetivo
    dmgMult(e) {
      let add = 0, crit = 0, aspd = 0;
      for (const b of this.buffs) { add += b.stats.dmgPct || 0; crit += b.stats.crit || 0; aspd += b.stats.aspdPct || 0; }
      const weak = e ? CM.weaknessMult(e.vulnT > 0 ? CM.VULN_PCT : 0, CM.sumWeakness(e.debuffs)) : 1;
      return (1 + add / 100) * (1 + (CM.CRIT_MULT - 1) * crit / 100) * (1 + aspd / 100) * weak;
    },
  };
  return a;
}
// APOYO (§7.1): UNI con 2 aliados en g.party
export function apoyoSim(p, ref, { hp = 1e12, allyHp = 1000, dur = APOYO_T } = {}) {
  const g = p.game;
  const allies = [ghostAlly(g, -1.0, 1.6, allyHp), ghostAlly(g, -1.0, -1.6, allyHp)];
  g.party = allies;
  let extra = 0, frames = 0, acc = 0;
  const r = simulateUni(p, ref, dur, { hp, onFrame: e => {
    for (const a of allies) { a.tick(DT); extra += a.dmgMult(e) - 1; }
    frames++;
    acc += DT;
    if (acc >= 0.5) { acc -= 0.5; for (const a of allies) a.hurt(0.02 * a.stats.maxHP * 0.5, e); }
  } });
  g.party = [];
  const healed = allies.reduce((s, a) => s + a.healed + a.absorbed, 0);
  return { dpsShare: extra / Math.max(1, frames), heal: healed / allies.reduce((s, a) => s + a.stats.maxHP, 0) / r.t * 100, uni: r };
}

// ---------------- ejecución ----------------
const ULT_MIN_LEVEL = 15;
export function runBench({ classes = ['guerrero', 'maga', 'arquera'], levels = [1, 5, 10, 25, 50], torment = [[50, 10]], seed = 1 } = {}) {
  const rows = [];
  const cases = [...levels.map(L => ({ L, T: 0 })), ...torment.map(([L, T]) => ({ L, T }))];
  for (const c of classes) for (const { L, T } of cases) {
    const al = CM.areaLevelForHero(L);
    const ref = refEnemies(al, T);
    const row = { cls: c, L, T, al };
    for (const b of ['tipico', 'optimo']) {
      const mk = (variant = 'ofensiva') => buildHero(c, L, b, { al, torment: T, variant, seed });
      const n = simulate(mk(), ref.common, 24, { kind: 'common', ref });
      const e = simulate(mk(), ref.elite, 6, { kind: 'elite', ref });
      const bo = simulate(mk(), ref.boss, 2, { kind: 'boss', ref });
      const def = mk('defensiva');
      const top = [n, e, bo].reduce((a, x) => (x.maxHit > a.maxHit ? x : a));
      row[b] = { ttkN: n.ttk, ttkE: e.ttk, ttkB: bo.ttk, dps: bo.dps, maxHit: top.maxHit, maxHitBy: top.maxHitBy,
        ttd: ttdPack(def, ref, al), ttdPlus: ttdPlus(def, ref, al) };
      if (b === 'tipico' && T === 0) {
        const off = mk();
        const hp = ref.boss * UNI_LIFE / Math.max(1, bo.ttk);    // §7.1: jefe de 90 s de vida
        row.uni = simulateUni(off, ref, UNI_T, { hp });
        row.uniBar = { ...off.hotbar };
        row.uniBasic = simulateUni(mk('basico'), ref, UNI_T, { hp });
        row.uniDef = simulateUni(mk('defensiva'), ref, UNI_T, { hp });
        row.ttdPlusOff = ttdPlus(off, ref, al);
        row.basicHit = off.avgHit(resolveSkill(off, off.cls.skills.find(s => s.id === off.hotbar.lmb)).coef, 0);
        row.wd = off.avgHit(1, 0);                      // 1 WD (arma × atributo, coef 1)
      }
    }
    row.bossHp = ref.boss;
    row.ratio = row.optimo.dps / row.tipico.dps;
    rows.push(row);
  }
  return rows;
}

// matriz de rol: 9 especializaciones × 5 escenarios (típico Nv50 T0)
export function runSpecs({ level = 50, seed = 1, specs = ALL_SPECS } = {}) {
  const al = CM.areaLevelForHero(level);
  const ref = refEnemies(al);
  const mk = (spec, variant, build = 'tipico') => buildHero(SPEC_CLASS[spec], level, build, { al, seed, spec, variant, loadout: 'spec' });
  const mainOf = spec => (DEF_ALL.has(spec) ? 'defensiva' : 'ofensiva');
  // vida de los aliados de APOYO = media de las especializaciones
  const allyHp = specs.reduce((s, sp) => s + mk(sp, mainOf(sp)).stats.maxHP, 0) / specs.length;
  const rows = [];
  for (const spec of specs) {
    const main = mainOf(spec);
    const row = { spec, cls: SPEC_CLASS[spec], L: level, main };
    const n = simulate(mk(spec, main), ref.common, 24, { kind: 'common', ref });
    const e = simulate(mk(spec, main), ref.elite, 6, { kind: 'elite', ref });
    const b = simulate(mk(spec, main), ref.boss, 2, { kind: 'boss', ref });
    Object.assign(row, { ttkN: n.ttk, ttkE: e.ttk, ttkB: b.ttk, bossHp: ref.boss });
    const hp = ref.boss * UNI_LIFE / Math.max(1, b.ttk);
    const hero = mk(spec, main);
    row.bar = { ...hero.hotbar };
    row.uni = simulateUni(hero, ref, UNI_T, { hp });
    row.uniOff = main === 'ofensiva' ? row.uni : simulateUni(mk(spec, 'ofensiva'), ref, UNI_T, { hp });
    row.uniDef = main === 'defensiva' ? row.uni : simulateUni(mk(spec, 'defensiva'), ref, UNI_T, { hp });
    row.uniBasic = simulateUni(mk(spec, 'basico'), ref, UNI_T, { hp });
    row.area = areaSim(mk(spec, main), ref);
    row.ctl = controlSim(mk(spec, main), ref);
    row.breaks = row.uni.breaks / (row.uni.t / 60);
    row.ttdp = ttdPlusSim(mk(spec, 'defensiva'), ref, { defAtCd: true });
    row.ttdpOff = ttdPlusSim(mk(spec, 'ofensiva'), ref, { defAtCd: false });
    row.ttd = ttdPack(mk(spec, 'defensiva'), ref, al);
    row.apoyo = apoyoSim(mk(spec, main), ref, { hp, allyHp });
    const ob = simulate(mk(spec, main, 'optimo'), ref.boss, 2, { kind: 'boss', ref });
    row.optMaxHit = ob.maxHit; row.optMaxHitBy = ob.maxHitBy;
    row.ult = row.bar.k4 ? (row.uni.by[row.bar.k4] || 0) / row.uni.total : 0;
    rows.push(row);
  }
  return rows;
}

const f1 = v => (v === Infinity ? '∞' : v.toFixed(v < 10 ? 2 : 1));
const pct = v => `${(v * 100).toFixed(0)}%`;
const sgn = v => `${v >= 0 ? '+' : ''}${(v * 100).toFixed(0)}%`;
export function printRows(rows) {
  console.log('clase    Nv  T  AL | TÍPICO TTK común/élite/jefe  TTD  TTD+ | ÓPTIMO común/élite/jefe  TTD  | opt/típ  golpeMáx/vidaJefe');
  for (const r of rows) {
    const t = r.tipico, o = r.optimo;
    console.log(`${r.cls.padEnd(8)} ${String(r.L).padStart(2)} ${String(r.T).padStart(2)} ${String(r.al).padStart(3)} | ` +
      `${f1(t.ttkN).padStart(5)} ${f1(t.ttkE).padStart(5)} ${f1(t.ttkB).padStart(6)}  ${f1(t.ttd).padStart(5)} ${f1(t.ttdPlus).padStart(5)} | ` +
      `${f1(o.ttkN).padStart(5)} ${f1(o.ttkE).padStart(5)} ${f1(o.ttkB).padStart(6)}  ${f1(o.ttd).padStart(5)} | ` +
      `×${r.ratio.toFixed(1).padStart(4)}   ${(o.maxHit / r.bossHp * 100).toFixed(1)}% ${o.maxHitBy || ''}`);
  }
  console.log('\nUNI (típico, 60 s a un jefe de 90 s de vida; variante ofensiva) — reparto del daño por habilidad');
  for (const r of rows.filter(x => x.uni)) {
    const parts = Object.entries(r.uni.by).sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k} ${pct(v / r.uni.total)}${r.uni.uses[k] ? `·${r.uni.uses[k]}u` : ''}`).join(' · ');
    const k2 = r.uniDef.dps > 0 ? r.uni.dps / r.uniDef.dps - 1 : 0;
    const k2t = r.ttdPlusOff > 0 ? r.tipico.ttdPlus / r.ttdPlusOff - 1 : 0;
    console.log(`${r.cls.padEnd(8)} Nv${String(r.L).padStart(2)} | DPS ${f1(r.uni.dps).padStart(7)} (${(r.uni.dps / r.wd).toFixed(2)} WD/s) · solo básico ×${(r.uniBasic.dps / r.uni.dps).toFixed(2)} · ` +
      `ranura 2: ofensiva ${sgn(k2)} UNI / defensiva ${sgn(k2t)} TTD | ${parts}`);
  }
}
// media de una métrica entre especializaciones
const meanOf = (rows, f) => rows.reduce((s, r) => s + f(r), 0) / rows.length;
export function printSpecs(rows) {
  const M = { uni: meanOf(rows, r => r.uni.dps), area: meanOf(rows, r => r.area.dps), ttdp: meanOf(rows, r => r.ttdp) };
  console.log(`\nMATRIZ DE ROL (típico Nv${rows[0]?.L} T0; ×M = frente a la media de las 9 · Guardián con la defensiva)`);
  console.log('spec            |  UNI ofens.  UNI def. (k2)  |  ÁREA×5   |  TTD+ def.  TTD+ of. (k2) | APOYO dps/cura | CONTROL duro/d+inm/lento Q/min | jefe  élite común TTD | ult  básico');
  for (const r of rows) {
    const k2u = r.uniOff.dps / Math.max(1e-9, r.uniDef.dps) - 1, k2t = r.ttdp / Math.max(1e-9, r.ttdpOff) - 1;
    console.log(`${r.spec.padEnd(15)} | ${f1(r.uniOff.dps).padStart(6)} ×${(r.uni.dps / M.uni).toFixed(2)} ${f1(r.uniDef.dps).padStart(6)} (${sgn(k2u).padStart(4)}) | ` +
      `${f1(r.area.dps).padStart(6)} ×${(r.area.dps / M.area).toFixed(2)} | ${f1(r.ttdp).padStart(5)} ×${(r.ttdp / M.ttdp).toFixed(2)} ${f1(r.ttdpOff).padStart(5)} (${sgn(k2t).padStart(5)}) | ` +
      `${pct(r.apoyo.dpsShare).padStart(4)} ${r.apoyo.heal.toFixed(2).padStart(5)}%/s | ${pct(r.ctl.hard).padStart(4)} ${pct(r.ctl.hardRoot).padStart(4)} ${pct(r.ctl.slow).padStart(4)} ${r.breaks.toFixed(1).padStart(4)} | ` +
      `${f1(r.ttkB).padStart(5)} ${f1(r.ttkE).padStart(5)} ${f1(r.ttkN).padStart(4)} ${f1(r.ttd).padStart(5)} | ${pct(r.ult).padStart(4)} ×${(r.uniBasic.dps / r.uni.dps).toFixed(2)}`);
  }
  console.log(`M: UNI ${f1(M.uni)} · ÁREA×5 ${f1(M.area)} · TTD+ ${f1(M.ttdp)}`);
  console.log('Reparto UNI por especialización:');
  for (const r of rows) {
    const parts = Object.entries(r.uni.by).sort((a, b) => b[1] - a[1]).slice(0, 7)
      .map(([k, v]) => `${k} ${pct(v / r.uni.total)}${r.uni.uses[k] ? `·${r.uni.uses[k]}u` : ''}`).join(' · ');
    console.log(`  ${r.spec.padEnd(15)} [${['rmb', 'k2', 'k3', 'k4'].map(s => r.bar[s] || '—').join(' ')}] ${parts}`);
  }
}

// OBJETIVOS (héroe típico, T0). Paso 1A (sin cambios):
//  - DISEÑO: la MEDIA de las 3 clases dentro del objetivo del Paso 1A
//    (común 0,6–1,5 s · élite 4,5–10,5 · jefe 45–90 · TTD 6–10);
//  - CLASE: cada clase por separado (élite 4,5–10,5 s y TTD 6–13 s en todos los
//    niveles; común y jefe con algo de tolerancia).
// Jefe por nivel: la vida de jefe sube en rampa (combat-math.bossHpMult) → Nv1
// (solo el básico) 30–60 s, Nv5 30–90 s, y desde Nv10 el rango normal.
// Paso 2b.2 (UNI, típico, T0):
//  - basicOnly: «solo básico» ≤ 0,6× la rotación (desde Nv5, con al menos una gastadora);
//  - ultShare: la definitiva aporta el 12–22 % del daño (Nv ≥ 15);
//  - NINGUNA GASTADORA TRAMPA: cada gastadora de 🖱️Der y la de 2 CON enfriamiento
//    aportan ≥ spenderShare (10 %) del daño y su daño por uso es ≥ spenderPerUse (1,8×)
//    el golpe medio del básico (1,3× si es de área/cono/línea). Una gastadora de 2
//    SIN enfriamiento (Torbellino junto a la Hendidura) vale por su área: la juzga el
//    intercambio de la ranura 2 de la matriz de rol (Paso 2e).
// Paso 2e (§7.2, Nv50): TARGETS.role (métrica principal y suelos por especialización;
// M = media de las 9), TARGETS.spec (rangos del Paso 1A ±20 % por especialización,
// jefe ≤ 2,0× el más rápido) y TARGETS.k2Tradeoff (intercambio de la ranura 2).
export const TARGETS = {
  mean: { ttkN: [0.6, 1.5], ttkE: [4.5, 10.5], ttkB: [45, 90], ttd: [6, 10] },
  cls: { ttkN: [0.45, 1.8], ttkE: [4.5, 10.5], ttkB: [35, 100], ttd: [6, 13] },
  bossNv1: [30, 60],
  bossRamp: [30, 90],      // Nv 2–9 (rampa)
  ratio: [1.3, 15],        // DPS óptimo / típico (Nv ≥ 10)
  classSpread: 2.5,        // jefe: clase más lenta / más rápida (Nv ≥ 10)
  maxHitBoss: 0.25,        // un golpe del óptimo ≤ 25 % de la vida del jefe
  basicOnly: 0.6,
  ultShare: [0.12, 0.22],
  spenderShare: 0.10,
  spenderPerUse: 1.8,       // gastadora de un objetivo
  spenderPerUseArea: 1.3,   // de área/cono/línea: reparte ≈70 % por objetivo (§3.0) → 1,8 × 0,7
  // Paso 2e — rangos del Paso 1A (media) ±20 % por especialización; jefe del Guardián ≤ 130 s
  spec: { ttkN: [0.48, 1.8], ttkE: [3.6, 12.6], ttkB: [36, 108], ttd: [4.8, 12], guardianBoss: 130, bossSpread: 2.0 },
  // §7.2: métrica principal (×M o absoluta) y suelos. `best` = la métrica que debe ser la
  // mejor de su clase por ≥ 10 % (bestBy).
  role: {
    berserker:      { best: 'uni', min: { uni: 1.10, area: 1.0, ttdp: 0.9 } },
    guardian:       { best: 'ttdp', min: { ttdp: 2.0, uni: 0.70 }, ttdpVsClass: 1.8 },
    cruzado:        { best: 'apoyo', abs: { apoyoDps: 0.25, apoyoHeal: 1.5 }, min: { uni: 0.80, ttdp: 1.3 } },
    piromante:      { best: 'area', min: { area: 1.20, uni: 0.85 } },
    crionte:        { best: 'ctl', abs: { slow: 0.50, hard: 0.20, breaks: 2 }, min: { area: 0.90, uni: 0.85 } },
    arcanista:      { best: 'uni', min: { uni: 1.15, area: 0.75 } },
    francotiradora: { best: 'uni', min: { uni: 1.15, area: 0.70, ttdp: 0.85 } },
    montaraz:       { best: 'ctl', abs: { slow: 0.40, breaks: 2 }, min: { area: 0.90 } },
    tiradora:       { best: 'area', min: { area: 1.20, uni: 0.85 } },
  },
  bestBy: 1.10,
  // intercambio de la ranura 2 (salvo el Guardián): ofensiva +12–25 % de UNI sobre la
  // defensiva y defensiva ≥ +30 % de TTD+ sobre la ofensiva
  k2Tradeoff: { uni: [0.12, 0.25], ttdp: 0.30, except: ['guardian'] },
};

export function checkRows(rows) {
  const errs = [];
  const chk = (ok, msg) => { if (!ok) errs.push(msg); };
  const inR = (v, [lo, hi]) => v >= lo && v <= hi;
  for (const r of rows) {
    const id = `${r.cls} Nv${r.L}${r.T ? ' T' + r.T : ''}`;
    if (r.T === 0) {
      const t = r.tipico, C = TARGETS.cls;
      chk(inR(t.ttkN, C.ttkN), `${id}: TTK común ${f1(t.ttkN)}s fuera de ${C.ttkN}`);
      chk(inR(t.ttkE, C.ttkE), `${id}: TTK élite ${f1(t.ttkE)}s fuera de ${C.ttkE}`);
      const bw = r.L === 1 ? TARGETS.bossNv1 : r.L < 10 ? TARGETS.bossRamp : C.ttkB;
      chk(inR(t.ttkB, bw), `${id}: TTK jefe ${f1(t.ttkB)}s fuera de ${bw}`);
      chk(inR(t.ttd, C.ttd), `${id}: TTD manada ${f1(t.ttd)}s fuera de ${C.ttd}`);
      chk(t.ttdPlus >= t.ttd - 1e-6, `${id}: TTD+ con defensa (${f1(t.ttdPlus)}) < TTD sin ella (${f1(t.ttd)})`);
      if (r.L >= 10) chk(inR(r.ratio, TARGETS.ratio), `${id}: óptimo/típico ×${r.ratio.toFixed(1)} fuera de ${TARGETS.ratio}`);
      // --- reglas del Paso 2b.2 sobre UNI ---
      const u = r.uni, bar = r.uniBar;
      if (r.L >= 5 && bar.rmb) chk(r.uniBasic.dps <= TARGETS.basicOnly * u.dps, `${id}: «solo básico» ×${(r.uniBasic.dps / u.dps).toFixed(2)} de la rotación (> ${TARGETS.basicOnly})`);
      if (r.L >= ULT_MIN_LEVEL && bar.k4) {
        const sh = (u.by[bar.k4] || 0) / u.total;
        chk(inR(sh, TARGETS.ultShare), `${id}: la definitiva ${bar.k4} aporta ${pct(sh)} del daño UNI (objetivo 12–22 %)`);
      }
      for (const slot of ['rmb', 'k2']) {
        const sid = bar[slot]; if (!sid) continue;
        const sk = CLASSES[r.cls].skills.find(s => s.id === sid);
        if (slot === 'k2' && !((sk.cd || 0) > 0)) continue;   // su valor es de área (matriz de rol)
        const sh = (u.by[sid] || 0) / u.total;
        const per = u.uses[sid] ? (u.by[sid] || 0) / u.uses[sid] : 0;
        chk(sh >= TARGETS.spenderShare, `${id}: gastadora trampa ${sid} (${slot}) aporta ${pct(sh)} del daño UNI (< ${pct(TARGETS.spenderShare)})`);
        const area = (sk.tags || []).some(t => t === 'area' || t === 'cone' || t === 'line');
        const need = (area ? TARGETS.spenderPerUseArea : TARGETS.spenderPerUse) * r.basicHit;
        chk(per >= need, `${id}: gastadora trampa ${sid}: ${f1(per)} por uso < ${area ? TARGETS.spenderPerUseArea : TARGETS.spenderPerUse}× el básico (${f1(r.basicHit)})`);
      }
    }
    chk(r.optimo.maxHit <= r.bossHp * TARGETS.maxHitBoss, `${id}: un golpe óptimo quita ${(r.optimo.maxHit / r.bossHp * 100).toFixed(0)}% de la vida del jefe`);
  }
  // media de las 3 clases por nivel (objetivo de diseño)
  for (const L of [...new Set(rows.map(r => r.L))]) {
    const rs = rows.filter(r => r.L === L && r.T === 0);
    if (rs.length < 2) continue;
    const mean = k => rs.reduce((a, r) => a + r.tipico[k], 0) / rs.length;
    const M = TARGETS.mean;
    for (const k of ['ttkN', 'ttkE', 'ttd']) chk(inR(mean(k), M[k]), `Nv${L}: media ${k} ${f1(mean(k))} fuera de ${M[k]}`);
    if (L >= 10) {
      chk(inR(mean('ttkB'), M.ttkB), `Nv${L}: media TTK jefe ${f1(mean('ttkB'))}s fuera de ${M.ttkB}`);
      const bs = rs.map(r => r.tipico.ttkB);
      chk(Math.max(...bs) / Math.min(...bs) <= TARGETS.classSpread, `Nv${L}: dispersión de TTK de jefe entre clases ×${(Math.max(...bs) / Math.min(...bs)).toFixed(1)}`);
    }
  }
  // Tormento: con el equipo que da, subir de T0 a T10 debe ser MÁS difícil
  for (const c of ['guerrero', 'maga', 'arquera']) {
    const t0 = rows.find(r => r.cls === c && r.L === 50 && r.T === 0);
    const t10 = rows.find(r => r.cls === c && r.L === 50 && r.T === 10);
    if (!t0 || !t10) continue;
    chk(t10.tipico.ttkB > t0.tipico.ttkB * 1.5, `${c}: T10 no es más lento de matar (${f1(t10.tipico.ttkB)}s vs ${f1(t0.tipico.ttkB)}s)`);
    chk(t10.tipico.ttd < t0.tipico.ttd * 0.8, `${c}: T10 no es más peligroso (TTD ${f1(t10.tipico.ttd)}s vs ${f1(t0.tipico.ttd)}s)`);
  }
  return errs;
}

// métricas de rol de una fila de la matriz (×M y absolutas)
function roleMetric(r, k) {
  if (k === 'uni') return r.uni.dps;
  if (k === 'area') return r.area.dps;
  if (k === 'ttdp') return r.ttdp;
  if (k === 'apoyo') return r.apoyo.dpsShare;
  if (k === 'ctl') return r.ctl.slow;
  return 0;
}
export function checkSpecs(rows) {
  const errs = [];
  const chk = (ok, msg) => { if (!ok) errs.push(msg); };
  const inR = (v, [lo, hi]) => v >= lo && v <= hi;
  const M = { uni: meanOf(rows, r => r.uni.dps), area: meanOf(rows, r => r.area.dps), ttdp: meanOf(rows, r => r.ttdp) };
  const S = TARGETS.spec;
  for (const r of rows) {
    const id = `${r.spec} Nv${r.L}`;
    const R = TARGETS.role[r.spec];
    // §7.2 suelos y métrica principal (×M)
    for (const [k, v] of Object.entries(R?.min || {})) {
      const x = roleMetric(r, k) / M[k];
      chk(x >= v - 1e-9, `${id}: ${k.toUpperCase()} ×${x.toFixed(2)} de la media (< ×${v})`);
    }
    const A = R?.abs || {};
    if (A.apoyoDps != null) chk(r.apoyo.dpsShare >= A.apoyoDps, `${id}: APOYO ${pct(r.apoyo.dpsShare)} del DPS de un aliado (< ${pct(A.apoyoDps)})`);
    if (A.apoyoHeal != null) chk(r.apoyo.heal >= A.apoyoHeal, `${id}: APOYO cura ${r.apoyo.heal.toFixed(2)} %/s al grupo (< ${A.apoyoHeal})`);
    if (A.slow != null) chk(r.ctl.slow >= A.slow, `${id}: CONTROL ${pct(r.ctl.slow)} del tiempo ralentizados/inmovilizados (< ${pct(A.slow)})`);
    if (A.hard != null) chk(r.ctl.hard >= A.hard, `${id}: CONTROL ${pct(r.ctl.hard)} del tiempo con control duro (< ${pct(A.hard)})`);
    if (A.breaks != null) chk(r.breaks >= A.breaks, `${id}: ${r.breaks.toFixed(1)} Quebrantados/min contra el jefe (< ${A.breaks})`);
    // la mejor de su clase en su métrica por ≥ 10 %
    if (R?.best) {
      const mine = roleMetric(r, R.best);
      const others = rows.filter(o => o.cls === r.cls && o.spec !== r.spec);
      const top = Math.max(0, ...others.map(o => roleMetric(o, R.best)));
      const need = r.spec === 'guardian' ? R.ttdpVsClass : TARGETS.bestBy;
      chk(mine >= top * need - 1e-9, `${id}: ${R.best.toUpperCase()} no es la mejor de su clase por ×${need} (${f1(mine)} frente a ${f1(top)})`);
    }
    // rangos del Paso 1A ±20 % por especialización
    chk(inR(r.ttkN, S.ttkN), `${id}: TTK común ${f1(r.ttkN)}s fuera de ${S.ttkN}`);
    chk(inR(r.ttkE, S.ttkE), `${id}: TTK élite ${f1(r.ttkE)}s fuera de ${S.ttkE}`);
    const bw = r.spec === 'guardian' ? [S.ttkB[0], S.guardianBoss] : S.ttkB;
    chk(inR(r.ttkB, bw), `${id}: TTK jefe ${f1(r.ttkB)}s fuera de ${bw}`);
    chk(inR(r.ttd, S.ttd), `${id}: TTD manada ${f1(r.ttd)}s fuera de ${S.ttd}`);
    // transversales en UNI
    if (r.bar.k4) chk(inR(r.ult, TARGETS.ultShare), `${id}: la definitiva ${r.bar.k4} aporta ${pct(r.ult)} del daño UNI (objetivo 12–22 %)`);
    chk(r.uniBasic.dps <= TARGETS.basicOnly * r.uni.dps, `${id}: «solo básico» ×${(r.uniBasic.dps / r.uni.dps).toFixed(2)} de la rotación (> ${TARGETS.basicOnly})`);
    chk(r.optMaxHit <= r.bossHp * TARGETS.maxHitBoss, `${id}: un golpe óptimo (${r.optMaxHitBy}) quita ${(r.optMaxHit / r.bossHp * 100).toFixed(0)}% de la vida del jefe`);
    // intercambio de la ranura 2
    const K = TARGETS.k2Tradeoff;
    if (!K.except.includes(r.spec)) {
      const u = r.uniOff.dps / Math.max(1e-9, r.uniDef.dps) - 1, t = r.ttdp / Math.max(1e-9, r.ttdpOff) - 1;
      chk(inR(u, K.uni), `${id}: ranura 2 ofensiva ${sgn(u)} de UNI sobre la defensiva (objetivo +12–25 %)`);
      chk(t >= K.ttdp, `${id}: ranura 2 defensiva ${sgn(t)} de TTD+ sobre la ofensiva (objetivo ≥ +30 %)`);
    }
  }
  const bs = rows.map(r => r.ttkB);
  if (rows.length > 1) chk(Math.max(...bs) / Math.min(...bs) <= S.bossSpread, `Nv${rows[0].L}: jefe más lento ×${(Math.max(...bs) / Math.min(...bs)).toFixed(2)} el más rápido (> ×${S.bossSpread})`);
  return errs;
}

// Paso 2e: objetivos de §7.2 que NO se alcanzan sin tocar el núcleo (spec-mechanics), los
// enemigos o el propio escenario de §7.1. No se relajan en silencio: cada uno lleva la causa
// y el cambio mínimo propuesto, se imprime como «⚠ PENDIENTE» y vigila un SUELO de
// no-regresión (si la medida cae por debajo del suelo, vuelve a ser un error). Si un
// pendiente llega a cumplirse, el banco avisa para quitarlo de la lista.
const k2u = r => r.uniOff.dps / Math.max(1e-9, r.uniDef.dps) - 1;
const k2t = r => r.ttdp / Math.max(1e-9, r.ttdpOff) - 1;
export const PENDING_2E = [
  { re: /^cruzado Nv50: ranura 2 ofensiva/, spec: 'cruzado', floor: r => k2u(r) <= 1.0, floorTxt: 'ofensiva ≤ +100 % de UNI',
    why: 'la tabla de §7.1 pone el Martillo de Guerra (el motor del Fervor: 3 golpes = 1 Fervor) en la ranura 2 ofensiva; con el Bramido en su lugar el Cruzado no genera Fervor contra un jefe (solo al matar), nunca lanza Veredicto y su UNI queda en Tajo + Cataclismo',
    fix: 'spec-mechanics: el Fervor también por golpes del básico (p. ej. 1 cada 4 Tajos), o la tabla de §7.1 con el Martillo en 🖱️Der y el Veredicto en la ranura 2 ofensiva' },
  { re: /^cruzado Nv50: ranura 2 defensiva/, spec: 'cruzado', floor: r => k2t(r) >= -0.45, floorTxt: 'defensiva ≥ −45 % de TTD+',
    why: 'misma causa: el Martillo es también el sustento del Cruzado (Martillos Benditos, vida al golpear de Mano Sanadora y la cura del Veredicto); sin él, la variante defensiva aguanta menos que la ofensiva aunque lleve el Bramido',
    fix: 'el mismo cambio del Fervor (con Fervor sin Martillo, el Veredicto vuelve a curar al grupo en la variante defensiva)' },
  { re: /^montaraz Nv50: AREA/, spec: 'montaraz', floor: (r, M) => r.area.dps / M.area >= 0.70, floorTxt: 'ÁREA×5 ≥ 0,70·M',
    why: 'el daño en área del Montaraz son trampas que se activan al pisarlas, la Red de Espinas entre trampas armadas (Apex I/II) y los Abrojos; ÁREA×5 (§7.1) es un grupo QUIETO que reaparece en su sitio: la trampa salta al instante sobre el objetivo (0 % del daño) y la red nunca se forma (pide ≥ 2 trampas armadas)',
    fix: 'ÁREA×5 con la manada caminando hacia el héroe desde 8 m (como en el juego) o con trampas prearmadas para las especializaciones de trampas; subir la Lluvia para todos rompe la Francotiradora (mejor de su clase) y el intercambio de la ranura 2 del Montaraz' },
];
export function splitPending(errs, rows) {
  const M = { uni: meanOf(rows, r => r.uni.dps), area: meanOf(rows, r => r.area.dps), ttdp: meanOf(rows, r => r.ttdp) };
  const pending = [], solved = [], out = [];
  for (const e of errs) {
    const P = PENDING_2E.find(x => x.re.test(e));
    const r = P && rows.find(x => x.spec === P.spec);
    if (P && r && P.floor(r, M)) pending.push(`${e}\n     causa: ${P.why}\n     propuesta: ${P.fix}\n     suelo vigilado: ${P.floorTxt}`);
    else out.push(P ? `${e} — PENDIENTE por debajo de su suelo (${P.floorTxt})` : e);
  }
  for (const P of PENDING_2E) if (rows.some(r => r.spec === P.spec) && !errs.some(e => P.re.test(e))) solved.push(`${P.re.source}: ya se cumple; quítalo de PENDING_2E`);
  return { errs: out, pending, solved };
}

// --seeds N: robustez frente al azar del EQUIPO (solo informe). Para cada fila típica
// T0: mínimo / mediana / máximo del TTK de élite y de jefe y del reparto de la
// definitiva en UNI con las semillas 1..N. Las afirmaciones siguen con la semilla 1.
// Paso 2c.2: marca con ⚠ las MEDIANAS fuera de su rango (TARGETS.cls / rampa de jefe /
// ultShare) o a menos de un 5 % de un borde, e imprime la media de las medianas de jefe.
const med = a => { const s = [...a].sort((x, y) => x - y); return s[Math.floor((s.length - 1) / 2)]; };
export function seedReport(n, { classes = ['guerrero', 'maga', 'arquera'], levels = [1, 5, 10, 25, 50] } = {}) {
  const fmt = a => `${f1(Math.min(...a)).padStart(5)} / ${f1(med(a)).padStart(5)} / ${f1(Math.max(...a)).padStart(5)}`;
  console.log(`
SEMILLAS 1..${n} (típico T0): mín / mediana / máx`);
  console.log('clase    Nv |   élite (s)            |   jefe (s)             | definitiva UNI');
  const out = [];
  for (const c of classes) for (const L of levels) {
    const al = CM.areaLevelForHero(L), ref = refEnemies(al);
    const E = [], B = [], U = [];
    for (let seed = 1; seed <= n; seed++) {
      const mk = () => buildHero(c, L, 'tipico', { al, seed });
      E.push(simulate(mk(), ref.elite, 6, { kind: 'elite', ref }).ttk);
      const bt = simulate(mk(), ref.boss, 2, { kind: 'boss', ref }).ttk;
      B.push(bt);
      const p = mk();
      if (L >= ULT_MIN_LEVEL && p.hotbar.k4) { const u = simulateUni(p, ref, UNI_T, { hp: ref.boss * UNI_LIFE / Math.max(1, bt) }); U.push((u.by[p.hotbar.k4] || 0) / u.total * 100); }
    }
    const row = { cls: c, L, E, B, U, medE: med(E), medB: med(B), medU: U.length ? med(U) : null };
    const bw = L === 1 ? TARGETS.bossNv1 : L < 10 ? TARGETS.bossRamp : TARGETS.cls.ttkB;
    const warn = [nearEdge(row.medE, TARGETS.cls.ttkE) && 'élite', nearEdge(row.medB, bw) && 'jefe',
      row.medU != null && nearEdge(row.medU / 100, TARGETS.ultShare) && 'definitiva'].filter(Boolean);
    out.push(row);
    console.log(`${c.padEnd(8)} ${String(L).padStart(2)} | ${fmt(E)} | ${fmt(B)} | ${U.length ? fmt(U) + ' %' : '—'}${warn.length ? '  ⚠ mediana ' + warn.join('/') : ''}`);
  }
  // media de las medianas de jefe por nivel (objetivo de diseño 45–90 s, Nv ≥ 10)
  for (const L of levels.filter(x => x >= 10)) {
    const rs = out.filter(r => r.L === L);
    if (rs.length < 2) continue;
    const m = rs.reduce((a, r) => a + r.medB, 0) / rs.length;
    console.log(`media de medianas de jefe Nv${L}: ${f1(m)} s${nearEdge(m, TARGETS.mean.ttkB) ? '  ⚠' : ''}`);
  }
  return out;
}
// ¿fuera de [lo, hi] o a menos de un 5 % de uno de sus bordes? (Paso 2c.2: margen de las medianas)
function nearEdge(v, [lo, hi]) { return !(v >= lo * 1.05 && v <= hi * 0.95); }

// Paso 2e: medianas de la matriz de rol con las semillas 1..N. Cada métrica se toma de la
// fila mediana; las métricas relativas (×M) se recalculan con las medianas, y se pasan
// las mismas comprobaciones que con la semilla 1 (solo informe).
export function specSeedReport(n, { level = 50 } = {}) {
  const runs = [];
  for (let seed = 1; seed <= n; seed++) runs.push(runSpecs({ level, seed }));
  const pick = (spec, f) => med(runs.map(rs => f(rs.find(r => r.spec === spec))));
  const rows = ALL_SPECS.map(spec => {
    const base = runs[0].find(r => r.spec === spec);
    const m = f => pick(spec, f);
    return {
      ...base,
      ttkN: m(r => r.ttkN), ttkE: m(r => r.ttkE), ttkB: m(r => r.ttkB), ttd: m(r => r.ttd), ult: m(r => r.ult),
      uni: { ...base.uni, dps: m(r => r.uni.dps) }, uniOff: { dps: m(r => r.uniOff.dps) }, uniDef: { dps: m(r => r.uniDef.dps) },
      uniBasic: { dps: m(r => r.uniBasic.dps / r.uni.dps) * m(r => r.uni.dps) },
      area: { dps: m(r => r.area.dps) }, ttdp: m(r => r.ttdp), ttdpOff: m(r => r.ttdpOff),
      apoyo: { dpsShare: m(r => r.apoyo.dpsShare), heal: m(r => r.apoyo.heal) },
      ctl: { hard: m(r => r.ctl.hard), hardRoot: m(r => r.ctl.hardRoot), slow: m(r => r.ctl.slow) }, breaks: m(r => r.breaks),
      optMaxHit: m(r => r.optMaxHit),
    };
  });
  console.log(`\nMEDIANAS DE ${n} SEMILLAS — matriz de rol Nv${level}`);
  printSpecs(rows);
  const sp = splitPending(checkSpecs(rows), rows);
  if (sp.pending.length) console.log('⚠ PENDIENTES (PENDING_2E) en las medianas:\n - ' + sp.pending.map(s => s.split('\n')[0]).join('\n - '));
  console.log(sp.errs.length ? '⚠ medianas de valores absolutos fuera de objetivo:\n - ' + sp.errs.join('\n - ') : '✅ medianas dentro de objetivo (salvo los pendientes)');
  // Por semilla: cada semilla es un mundo coherente (mismo equipo para las especializaciones de
  // una clase y su propia M), así que las reglas relativas (×M, mejor de su clase, ranura 2)
  // se comprueban semilla a semilla; una regla «falla en la mediana» si falla en más de la
  // mitad de las semillas.
  const keyOf = e => e.replace(/[-+−]?\d+(?:[.,]\d+)?/g, '#');
  const fails = new Map();
  for (const rs of runs) for (const e of splitPending(checkSpecs(rs), rs).errs) {
    const k = keyOf(e);
    if (!fails.has(k)) fails.set(k, []);
    fails.get(k).push(e);
  }
  const medFail = [...fails.values()].filter(a => a.length > n / 2);
  const lines = [...fails.values()].sort((a, b) => b.length - a.length).map(a => `${a.length}/${n} semillas · ${a[0]}`);
  console.log(lines.length ? `Reglas que fallan en alguna semilla (por semilla, con su propia M):\n - ${lines.join('\n - ')}` : 'Ninguna regla falla en ninguna semilla.');
  console.log(medFail.length ? `⚠ ${medFail.length} regla(s) fallan en la mayoría de las semillas` : `✅ por semilla: ninguna regla falla en la mayoría de las ${n} semillas (salvo los pendientes)`);
  return { rows, errs: sp.errs, pending: sp.pending, perSeed: lines, medFail: medFail.map(a => a[0]) };
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop());
if (isMain) {
  const t0 = Date.now();
  const rows = runBench();
  printRows(rows);
  const errs = checkRows(rows);
  const specRows = runSpecs();
  printSpecs(specRows);
  const sp = splitPending(checkSpecs(specRows), specRows);
  errs.push(...sp.errs);
  const si = process.argv.indexOf('--seeds');
  if (si > 0) {
    const n = Math.max(1, parseInt(process.argv[si + 1], 10) || 5);
    seedReport(n);
    specSeedReport(n);
  }
  console.log(`(${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  if (sp.pending.length) console.log('⚠ PENDIENTES DEL PASO 2e (no se relajan; ver PENDING_2E):\n - ' + sp.pending.join('\n - '));
  if (sp.solved.length) console.log('ℹ pendientes ya resueltos:\n - ' + sp.solved.join('\n - '));
  // todo error que no sea un pendiente documentado (y por encima de su suelo) falla
  if (errs.length && !REPORT_ONLY) { console.error('❌ BANCO DE BALANCE FUERA DE RANGO\n - ' + errs.join('\n - ')); process.exit(1); }
  if (errs.length) console.log('(report) avisos:\n - ' + errs.join('\n - '));
  else console.log('✅ BANCO DE BALANCE DENTRO DE RANGO');
}
