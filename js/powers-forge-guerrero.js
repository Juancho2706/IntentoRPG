// ============================================================
// PODERES DE LA FORJA DEL GUERRERO (Mejoras y variantes 2f: `power: 'v_<id>'`)
// ============================================================
// Paso 2 (KA2; docs/paso2-implementacion.md §3.5, D23, D24 y D28; contenido: docs/paso2g-guerrero.md
// §4, §7 y §10). Se exporta una FUNCIÓN (no una constante): este módulo está en el ciclo con
// js/powers.js, que la llama al cargar. Los bindings importados solo se usan DENTRO de los ganchos.
// Recompute añade el poder solo si la pieza de forja que lo declara está activa (Mejora a Nv
// req+3, variante elegida a req+6) y la habilidad se conoce.
// Ids únicos entre clases (D28; definePower lanza con uno repetido): los del mockup (v_rompefilas,
// v_temple, v_espinas, v_sed_voraz, v_empalizada, v_escolta_luz) y dos propios de esta clase
// (v_guardia_compartida, v_guardia_opresiva), anotados en tools/convert-v2/out/guerrero/
// pendientes-guerrero.md §4 (Forja). v_carnero no hace falta: el arrastre es `drag`. Giro Firme y el
// Ciclón ya no son poderes: el canal genérico da `slowImmune` y `pull` en cada giro.
//   guerreroForgePowers() → { v_<id>: PowerDef }
import { dealProcDamage, powerState } from './powers.js';

// números de diseño de cada poder (los textos de la forja los citan)
export function guerreroForgeTuning() {
  return {
    rompefilas: { dmgPct: 45 },                                   // Hendidura I
    temple: { healPct: 8 },                                       // Piel de Hierro (Mejora)
    espinas: { reflectPct: 40 },                                  // Piel de Hierro I
    sedVoraz: { leechPct: 8 },                                    // Furia Inmortal I
    empalizada: { coef: 0.6, icd: 1 },                            // Ciudadela II
    escolta: { shieldPct: 12, dur: 6, icd: 6, reach: 1.5 },       // Sendero de Luz I
    compartida: { radius: 6, share: 0.5, every: 0.25 },           // Cambio de Guardia I
    opresiva: { radius: 5, weakPct: 10, slowPct: 20, keep: 0.35 }, // Cambio de Guardia II
  };
}

const now = p => p?.simT || 0;
const buffOn = (p, id) => !!p?.buffs?.some(b => b.id === id && b.t > 0);
// jefe (mismo criterio que entities.js: jefe, über o jefe de mundo)
const isBoss = e => !!(e?.def?.boss || e?.def?.uber || e?.def?.worldBoss);
// perfil de la habilidad (caché que deja resolveSkill al lanzar) o su definición forjada.
// Sin importar skill-resolve.js: el ciclo powers.js → aquí → skill-resolve → data.js (como powers-common)
const defOf = (p, id) => p?.forged?.[id]?.def || p?.resolved?.[id]?.def || p?.cls?.skills?.find(s => s.id === id) || null;
// distancia de un punto al segmento a–b (plano XZ)
function distToSeg(q, a, b) {
  const abx = b.x - a.x, abz = b.z - a.z, l2 = abx * abx + abz * abz;
  const t = l2 > 1e-9 ? Math.max(0, Math.min(1, ((q.x - a.x) * abx + (q.z - a.z) * abz) / l2)) : 0;
  return Math.hypot(q.x - (a.x + abx * t), q.z - (a.z + abz * t));
}
// suma de una stat en las posturas activas (Muralla, Ariete o las dos con Guardia Total)
const stanceSum = (modes, k) => modes.reduce((s, m) => s + (Number.isFinite(m?.stats?.[k]) ? m.stats[k] : 0), 0);

export function guerreroForgePowers() {
  const T = guerreroForgeTuning();
  return {
    // Hendidura I · Rompefilas: +45 % si el cono alcanza a UN solo enemigo. El cono se resuelve
    // de golpe (GENERIC.cone): se cuenta una vez por instante con la misma geometría (el héroe
    // ya mira hacia el golpe) y vale para todos los impactos de ese lanzamiento.
    v_rompefilas: {
      name: 'Rompefilas', desc: '+45 % de daño de la Hendidura si golpea a un único enemigo',
      state: () => ({ at: -1, n: 0 }),
      condAdd(p, e, hit) {
        if (!e || hit?.skill !== 'g_hendidura' || hit.proc || hit.dot) return 0;
        const g = p.game, st = powerState(p, 'v_rompefilas');
        if (st.at !== now(p)) {
          const prof = p.resolved?.g_hendidura, def = defOf(p, 'g_hendidura');
          const yaw = p.group?.rotation?.y || 0;
          const dir = { x: Math.sin(yaw), z: Math.cos(yaw) };
          st.at = now(p);
          st.n = g?.enemiesInCone ? g.enemiesInCone(p.pos, dir, prof?.radius || def?.radius || 3, prof?.angle || def?.angle || 90).length : 1;
        }
        return st.n === 1 ? T.rompefilas.dmgPct : 0;
      },
    },

    // Piel de Hierro (Mejora) · Acero Templado: te curas el 8 % al activarla (crece con el rango de la Piel)
    v_temple: {
      name: 'Acero Templado', desc: 'Piel de Hierro te cura el 8 % de la vida al activarla (más con su rango)',
      afterCast(g, p, cast) {
        if (cast?.sk?.id !== 'g_piel' || cast.echo) return;
        g.heal?.(p.stats.maxHP * T.temple.healPct / 100 * (cast.prof?.buffMul || 1), { target: 'self', src: 'v_temple' });
      },
    },

    // Piel de Hierro I · Espinas: mientras dura, devuelves el 40 % del daño cuerpo a cuerpo que te llega
    v_espinas: {
      name: 'Espinas', desc: 'Con Piel de Hierro, devuelves el 40 % del daño cuerpo a cuerpo que recibes',
      onDamaged(g, p, dmg) {
        if (!dmg?.melee || !(dmg.amount > 0) || !buffOn(p, 'g_piel')) return;
        const e = dmg.src;
        if (!e?.alive || typeof e.takeDamage !== 'function') return;
        dealProcDamage(g, e, dmg.amount * T.espinas.reflectPct / 100, { source: 'power:v_espinas', skill: 'g_piel' });
        g.spawnBurst?.(e.pos.clone(), 0xb8c4d0, 4);
      },
    },

    // Furia Inmortal I · Sed Voraz: mientras dura, robas el 8 % del daño (cubeta de sustento)
    v_sed_voraz: {
      name: 'Sed Voraz', desc: 'Con Furia Inmortal, robas el 8 % del daño como vida',
      onHit(g, p, e, hit) {
        if (!(hit?.dealt > 0) || !buffOn(p, 'g_u_furia')) return;
        p.leech?.(hit.dealt * T.sedVoraz.leechPct / 100);
      },
    },

    // Ciudadela II · Empalizada: quien te golpea mientras dura recibe el 60 % de tu arma (una vez por segundo)
    v_empalizada: {
      name: 'Empalizada', desc: 'Con la Ciudadela, quien te golpea recibe el 60 % de tu arma (una vez por segundo)',
      icd: T.empalizada.icd,
      onDamaged(g, p, dmg) {
        const e = dmg?.src;
        if (!buffOn(p, 'g_u_ciudadela') || !e?.alive || typeof e.takeDamage !== 'function') return false;   // sin gastar el icd
        dealProcDamage(g, e, p.avgHit(T.empalizada.coef), { source: 'power:v_empalizada', skill: 'g_u_ciudadela' });
        return true;
      },
    },

    // Sendero de Luz I · Escolta de Luz: al atravesar a un aliado con el destello, escudo del 12 % de
    // tu vida 6 s (como mucho una vez cada 6 s por aliado; crece con el rango del Sendero)
    v_escolta_luz: {
      name: 'Escolta de Luz', desc: 'El Sendero de Luz escuda a los aliados que atraviesas',
      state: () => ({ from: null, until: new Map() }),
      onCast(g, p, cast) {
        if (cast?.sk?.id === 'g_sendero' && !cast.echo) powerState(p, 'v_escolta_luz').from = { x: p.pos.x, z: p.pos.z };
      },
      afterCast(g, p, cast) {
        if (cast?.sk?.id !== 'g_sendero' || cast.echo) return;
        const st = powerState(p, 'v_escolta_luz');
        const a = st.from;
        st.from = null;
        if (!a) return;
        const reach = Math.max(T.escolta.reach, cast.prof?.trail?.width || 0);
        for (const ally of g.allies?.() || []) {
          if (ally === p || !ally.alive || distToSeg(ally.pos, a, p.pos) > reach) continue;
          if ((st.until.get(ally) || -Infinity) > now(p)) continue;
          st.until.set(ally, now(p) + T.escolta.icd);
          ally.addShield?.(p.stats.maxHP * T.escolta.shieldPct / 100 * (cast.prof?.buffMul || 1), T.escolta.dur, 'v_escolta_luz');
        }
      },
    },

    // Cambio de Guardia I · Guardia Compartida: tus aliados a 6 m reciben la mitad de tu postura
    // (reducción de daño en Muralla, daño en Ariete). Se renueva sin recompute mientras no cambie.
    v_guardia_compartida: {
      name: 'Guardia Compartida', desc: 'Tus aliados a 6 m reciben la mitad de tu postura',
      state: () => ({ acc: 0, ring: -9 }),
      onTick(g, p, dt) {
        const st = powerState(p, 'v_guardia_compartida');
        st.acc += dt || 0.1;
        if (st.acc < T.compartida.every - 1e-9 || !p.alive) return;
        st.acc = 0;
        const modes = g.activeStanceModes?.(p) || [];
        const stats = {};
        for (const k of ['dr', 'dmgPct']) { const v = Math.round(stanceSum(modes, k) * T.compartida.share); if (v) stats[k] = v; }
        if (!Object.keys(stats).length) return;
        const keep = T.compartida.every + 0.15;
        const meta = { name: 'Guardia Compartida', icon: '🔰', desc: 'La mitad de la postura de tu Guardián' };
        let shared = 0;
        for (const a of g.allies?.(p.pos, T.compartida.radius) || []) {
          if (a === p) continue;
          shared++;
          const b = a.buffs?.find(x => x.id === 'v_guardia_compartida');
          if (b && b.stats?.dr === stats.dr && b.stats?.dmgPct === stats.dmgPct) { b.t = Math.max(b.t, keep); continue; }
          a.addBuff?.('v_guardia_compartida', { ...stats }, keep, meta);
        }
        // un aro del color de la postura por segundo mientras llega a alguien
        if (shared && now(p) - st.ring >= 1) { st.ring = now(p); g.spawnRing?.(p.pos, T.compartida.radius, modes[0]?.color || 0x7fb0e8); }
      },
    },

    // Cambio de Guardia II · Guardia Opresiva: tu postura pesa sobre los enemigos a 5 m: en Muralla
    // hacen un 10 % menos de daño; en Ariete van un 20 % más lentos (bajo el 30 %: sin Quebranto)
    v_guardia_opresiva: {
      name: 'Guardia Opresiva', desc: 'Tu postura debilita (Muralla) o frena (Ariete) a los enemigos a 5 m',
      state: () => ({ ring: -9 }),
      onTick(g, p) {
        if (!p.alive) return;
        const modes = g.activeStanceModes?.(p) || [];
        const ids = new Set(modes.map(m => m.id));
        const wall = ids.has('muralla'), ram = ids.has('ariete');
        if (!wall && !ram) return;
        const O = T.opresiva;
        for (const e of g.enemies || []) {
          if (!e.alive || e.pos.distanceTo(p.pos) > O.radius) continue;
          if (wall) e.weakenOutgoing?.('v_guardia_opresiva', O.weakPct, O.keep);
          if (ram) e.applyCC?.('slow', O.keep, { pct: O.slowPct, src: p });
        }
        // el alcance de la postura: un aro de su color por segundo
        const st = powerState(p, 'v_guardia_opresiva');
        if (now(p) - st.ring >= 1) { st.ring = now(p); g.spawnRing?.(p.pos, O.radius, modes[0]?.color || 0x4a7ad8); }
      },
    },
  };
}
