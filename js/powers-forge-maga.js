// ============================================================
// PODERES DE LA FORJA DE LA MAGA (variantes 2f: `power: 'v_<id>'`) — dueño: KA-maga (KA2)
// ============================================================
// Paso 2 (docs/paso2-implementacion.md §3.5, D23, D24 y D28). Mismo patrón que
// js/powers-<clase>.js: se exporta una FUNCIÓN (no una constante) porque este módulo está en
// el ciclo con js/powers.js, que la llama al cargar. Por eso nada del nivel superior lee un
// binding importado ni una constante: los números salen de forgeTuning() (perezosa) y los
// ganchos solo usan los imports cuando el juego los llama. Tampoco se importa data.js ni
// skill-resolve.js (resources.js → powers.js → aquí → data.js leería RESOURCE_DEFS sin iniciar):
// el perfil del lanzamiento se guarda en ⑦ onCast (cast.prof) y, si no, se lee de p.resolved.
// Los ids `v_*` son únicos entre clases (tools/convert-v2/out/power-ids.json, D28; definePower
// lanza con uno repetido). Los VFX de cada estallido salen de MAGA_FORGE_FX (fx-skills-maga.js).
//   magaForgePowers() → { v_<id>: PowerDef }
//  v_saeta_ignea      Saeta Ígnea (Dardo I): el Dardo estalla al impactar (splash/radius forjados)
//  v_racimo           Racimo (Bola II): al explotar suelta 3 brasas que estallan (40 % c/u)
//  v_fractura         Nova Fracturante (Nova II): +40 % a los ya ralentizados
//  v_reactiva         Barrera Gélida (Barrera I): al romperse, congela 1,5 s a 3 m
//  v_coraza_arcana    Coraza Arcana (Barrera II): +15 % de daño mientras aguanta
//  v_prision_fugaz    Prisión Fugaz (Paso de Escarcha II): al llegar, congela 1 s a 2 m
//  v_ojo              Ojo Tranquilo (Mejora de la Tormenta): dentro, −10 % de daño recibido
//  v_sello_contencion Sello de Contención (Sello II): ralentiza 40 % a los enemigos dentro
import { powerState } from './powers.js';
import { magaStorm } from './skills-maga.js';
import { MAGA_FORGE_FX } from './fx-skills-maga.js';

// eslint-disable-next-line no-var
var TUNE;
function forgeTuning() {
  return TUNE || (TUNE = Object.freeze({
    emberN: 3, emberCoef: 0.4, emberR: 1.2, emberRing: 2, emberDelay: 0.3,   // Racimo
    fracturePct: 40,                                                       // Nova Fracturante
    reactR: 3, reactFreeze: 1.5,                                           // Barrera Gélida
    cuirassPct: 15,                                                        // Coraza Arcana
    fleetR: 2, fleetFreeze: 1,                                             // Prisión Fugaz
    eyeDr: 10,                                                             // Ojo Tranquilo
    sealSlowEvery: 0.5, sealSlowT: 0.6, sealSlowPct: 40,                   // Sello de Contención
  }));
}

// ---- utilidades (function: se elevan; el ciclo de módulos puede llamarlas antes de evaluar) ----
function dist2(a, b) { const dx = a.x - b.x, dz = a.z - b.z; return dx * dx + dz * dz; }
// enemigo dentro de un radio (su tamaño cuenta, como Game.dealArea)
function near(e, c, r) { const rr = r + 0.5 * (e.def?.scale || 1); return dist2(e.pos, c) <= rr * rr; }
// copia de una posición en el suelo (Vector3 sin importar THREE)
function at(v, y = 0) { const o = v.clone(); o.y = y; return o; }
function fx(g, varId, key, pos, y) { const name = MAGA_FORGE_FX[varId]?.[key]; if (name && pos) g.emitFx?.(name, at(pos, y)); }
// ¿la Barrera de Maná aguanta? (su escudo se reconoce por la fuente, como c4/c19/c25/c28)
function hasBarrier(p) { return !!p?.shields?.some(s => s.src === 'm_barrera' && s.amt > 0 && s.t > 0); }
// golpe directo de una habilidad (no un tic, un proc ni un estallido de poder)
function direct(hit, id) { return hit?.skill === id && !hit.proc && !hit.dot; }
// perfil del último lanzamiento de la habilidad (⑦ onCast) o el que dejó resolveSkill
function profOf(p, st, id) { return st.prof || p?.resolved?.[id] || null; }

export function magaForgePowers() {
  return {
    // Saeta Ígnea: el Dardo de Fuego estalla donde impacta. La salpicadura y su radio son los de
    // la definición forjada (perfil: rango, talentos y soportes); el objetivo directo no la recibe.
    // Los estallidos son golpes de la habilidad (Calor, Quemadura) y no vuelven a estallar
    v_saeta_ignea: {
      name: 'Saeta Ígnea', desc: 'El Dardo Arcano se vuelve de Fuego y estalla al impactar.',
      state: () => ({ prof: null, busy: false }),
      onCast(g, p, cast) { if (cast?.sk?.id === 'm_dardo') powerState(p, 'v_saeta_ignea').prof = cast.prof || null; },
      onHit(g, p, e, hit) {
        if (!direct(hit, 'm_dardo') || !e) return;
        const st = powerState(p, 'v_saeta_ignea');
        const prof = profOf(p, st, 'm_dardo');
        if (st.busy || !(prof?.splash > 0) || !(prof.radius > 0)) return;
        const c = at(e.pos);
        st.busy = true;
        try {
          g.dealArea(c, prof.radius, prof.splash, { addPct: prof.addPct, critBonus: prof.critBonus, exclude: e, from: c,
            hitInfo: { skill: 'm_dardo', tags: prof.tags, elem: prof.elem } });
        } finally { st.busy = false; }
        g.spawnRing?.(c, prof.radius, 0xff7a22);
        fx(g, 'm_dardo_i', 'impact', c, 0.6);
      },
    },

    // Racimo: la PRIMERA explosión de cada instante (el impacto, no su salpicadura) suelta
    // emberN brasas en anillo a emberRing m que estallan emberDelay s después (emberR m, 40 %
    // del arma × rango, con el saco aditivo de la Bola). Ni el objetivo directo ni nadie recibe
    // dos brasas; las brasas no sueltan más brasas
    v_racimo: {
      name: 'Racimo', desc: 'La Bola de Fuego suelta 3 brasas que estallan al explotar.',
      state: () => ({ prof: null, at: -1, busy: false }),
      onCast(g, p, cast) { if (cast?.sk?.id === 'bola_fuego') powerState(p, 'v_racimo').prof = cast.prof || null; },
      onHit(g, p, e, hit) {
        if (!direct(hit, 'bola_fuego') || !e) return;
        const st = powerState(p, 'v_racimo');
        const now = p.simT || 0;
        if (st.busy || st.at === now) return;
        st.at = now;
        const prof = profOf(p, st, 'bola_fuego');
        if (!prof) return;
        const T = forgeTuning();
        const c = at(e.pos);
        const coef = T.emberCoef * prof.coef / Math.max(1e-6, prof.def?.coef || prof.coef || 1);
        const cap = { map: new Map([[e, 1]]), max: 1 };
        const base = Math.atan2(c.x - p.pos.x, c.z - p.pos.z);
        const hitInfo = { skill: 'bola_fuego', tags: prof.tags, elem: prof.elem };
        g.timers.schedule(T.emberDelay, () => {
          if (!p.alive || g.player !== p) return;
          st.busy = true;
          try {
            for (let i = 0; i < T.emberN; i++) {
              const a = base + i * Math.PI * 2 / T.emberN;
              const s = at(c); s.x += Math.sin(a) * T.emberRing; s.z += Math.cos(a) * T.emberRing;
              g.dealArea(s, T.emberR, coef, { addPct: prof.addPct, critBonus: prof.critBonus, perTarget: cap, from: s, hitInfo });
              g.spawnRing?.(s, T.emberR, 0xff6622);
              fx(g, 'bola_fuego_ii', 'extra', s, 0.4);
            }
          } finally { st.busy = false; }
        });
      },
    },

    // Nova Fracturante: +40 % (saco aditivo) a los golpes de la Nova sobre enemigos que YA estaban
    // ralentizados o congelados (③ se tira antes de que la propia Nova los ralentice)
    v_fractura: {
      name: 'Nova Fracturante', desc: 'La Nova de Hielo hace +40 % a los enemigos ya ralentizados.',
      condAdd(p, e, hit) { return hit?.skill === 'nova_hielo' && ((e?.slowT || 0) > 0 || (e?.frozenT || 0) > 0) ? forgeTuning().fracturePct : 0; },
    },

    // Barrera Gélida: si la Barrera se ROMPE (un golpe la deja a 0; caducar no cuenta), congela
    // reactFreeze s a los enemigos a reactR m (a los jefes, Quebranto). ⑧ condDr mira si estaba
    // puesta antes del golpe y onDamaged, si ya no está
    v_reactiva: {
      name: 'Barrera Gélida', desc: 'Al romperse la Barrera de Maná, congela a los enemigos cercanos.',
      state: () => ({ had: false }),
      condDr(p) { powerState(p, 'v_reactiva').had = hasBarrier(p); return 0; },
      onDamaged(g, p) {
        const st = powerState(p, 'v_reactiva');
        if (!st.had || hasBarrier(p)) return;
        st.had = false;
        const T = forgeTuning();
        for (const e of g.enemies || []) if (e.alive && near(e, p.pos, T.reactR)) e.applyCC('freeze', T.reactFreeze, { src: p });
        g.spawnRing?.(at(p.pos), T.reactR, 0x9fe3ff);
        fx(g, 'm_barrera_i', 'impact', p.pos, 0.6);
        g.sfx?.('ice');
      },
    },

    // Coraza Arcana: +15 % de daño (saco aditivo) mientras la Barrera de Maná aguanta
    v_coraza_arcana: {
      name: 'Coraza Arcana', desc: 'Mientras aguanta la Barrera de Maná, tus hechizos hacen +15 %.',
      condAdd(p) { return hasBarrier(p) ? forgeTuning().cuirassPct : 0; },
    },

    // Prisión Fugaz: al terminar el Paso de Escarcha (el desliz es instantáneo: ③ afterCast ya
    // está en la llegada) congela fleetFreeze s a los enemigos a fleetR m
    v_prision_fugaz: {
      name: 'Prisión Fugaz', desc: 'Al llegar con el Paso de Escarcha, congelas a los enemigos cercanos.',
      afterCast(g, p, cast) {
        if (cast?.sk?.id !== 'm_paso_escarcha') return;
        const T = forgeTuning();
        for (const e of g.enemies || []) if (e.alive && near(e, p.pos, T.fleetR)) e.applyCC('freeze', T.fleetFreeze, { src: p });
        fx(g, 'm_paso_escarcha_ii', 'extra', p.pos, 0.3);
      },
    },

    // Ojo Tranquilo: −10 % de daño recibido mientras estás dentro de tu Tormenta Glacial
    v_ojo: {
      name: 'Ojo Tranquilo', desc: 'Dentro de tu Tormenta Glacial recibes un 10 % menos de daño.',
      condDr(p) {
        const s = magaStorm(p);
        if (!s) return 0;
        const c = s.center(), r = s.radius;
        return dist2(p.pos, c) <= r * r ? forgeTuning().eyeDr : 0;
      },
    },

    // Sello de Contención: el aura del Sello (campo 'aura' con buffId a_sello) queda marcada al
    // lanzarla con la ralentización de su perfil; cada sealSlowEvery s, los enemigos dentro se
    // ralentizan sealSlowT s (se renueva mientras sigan dentro)
    v_sello_contencion: {
      name: 'Sello de Contención', desc: 'El Sello del Archimago ralentiza a los enemigos que entran.',
      state: () => ({ acc: 0 }),
      afterCast(g, p, cast) {
        if (cast?.sk?.id !== 'a_sello') return;
        const T = forgeTuning();
        const seals = (g.fieldsOf?.(p, { kind: 'aura' }) || []).filter(f => f.data?.buffId === 'a_sello');
        const f = seals[seals.length - 1];
        if (f) f.data.sealSlow = { pct: cast.prof?.slowPct || cast.sk?.slowPct || T.sealSlowPct, t: T.sealSlowT };
      },
      onTick(g, p, dt) {
        const st = powerState(p, 'v_sello_contencion');
        const T = forgeTuning();
        st.acc += dt;
        if (st.acc < T.sealSlowEvery - 1e-9) return;
        st.acc = 0;
        for (const f of g.fieldsOf?.(p, { kind: 'aura' }) || []) {
          const s = f.data?.sealSlow;
          if (!s) continue;
          for (const e of g.enemies || []) if (e.alive && near(e, f.pos, f.radius)) e.applyCC('slow', s.t, { pct: s.pct, src: p });
        }
      },
    },
  };
}
