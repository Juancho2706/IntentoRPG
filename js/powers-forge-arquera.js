// ============================================================
// PODERES DE LA FORJA DE LA ARQUERA (variantes 2g: `power: 'v_<id>'`) — dueño: KA-arquera
// ============================================================
// Paso 2 (docs/paso2-implementacion.md §3.5, D23, D24 y D28). Mismo patrón que
// js/powers-<clase>.js: se exporta una FUNCIÓN (no una constante) porque este módulo está en el
// ciclo con js/powers.js, que la llama al cargar. Ids `v_*` únicos entre clases (D28; los
// comprueba tests/test-forge-arquera.mjs contra tools/convert-v2/out/power-ids.json).
// Solo variantes cuyo efecto no cabe en un parámetro de la definición (ARQUERA_SKILL_FORGE en
// js/skills-arquera.js); los números salen de la definición forjada siempre que se puede.
//   v_rodar             Paso Veloz I · Rodar y Disparar: al acabar la rodada, un Disparo Rápido gratis
//   v_carrera_esquiva   Carrera del Viento II · Carrera Esquiva: fallo de disparos enemigos mientras corres
//   v_puesto_fijo       Rodilla en Tierra I · Puesto Fijo: +15 % a Disparo Apuntado y a los haces de rodillas
//   v_red_caza          Trampa de Cepo II · Red de Caza: al pisar el cepo, una red inmoviliza a los cercanos
//   v_acecho_enredador  Salto de Acecho I · Acecho Enredador: al caer, inmovilizas a los cercanos
import { powerState } from './powers.js';

// Puesto Fijo: bonificación de los tensados de rodillas (el texto de la variante dice +15 %)
const PUESTO_FIJO_DMG = 15;
const CHARGED_SHOTS = new Set(['a_t_apuntado', 'a_u_celeste']);
// Red de Caza: radio y raíz si el perfil del cepo ya no está en caché (los de la variante)
const NET_R = 3, NET_ROOT = 2.5;
const ESQUIVA = 'v_carrera_esquiva';

// ¿`e` está a `r` m de (x, z)? (su tamaño cuenta, como dealArea)
const near = (e, x, z, r) => {
  const rr = r + 0.5 * (e.def?.scale || 1);
  return (e.pos.x - x) ** 2 + (e.pos.z - z) ** 2 <= rr * rr;
};
// quita un buff y rehace las estadísticas (solo si estaba)
function dropBuff(p, id) {
  if (!p?.buffs?.some(b => b.id === id)) return;
  p.buffs = p.buffs.filter(b => b.id !== id);
  p.recompute?.();
}
// inmoviliza a los enemigos vivos a `r` m de (x, z) → cuántos
function rootAround(g, p, x, z, r, dur, skip = null) {
  let n = 0;
  for (const e of g.enemies || []) {
    if (!e.alive || e === skip || !near(e, x, z, r)) continue;
    e.applyCC?.('root', dur, { src: p });
    n++;
  }
  return n;
}

export function arqueraForgePowers() {
  return {
    // Rodar y Disparar: al terminar la rodada (③ afterCast de a_paso), un Disparo Rápido de
    // verdad (Player.basicAttack: Energía al acertar, efectos del básico, secuencia) con
    // `rollShot` × su coeficiente, al enemigo de la mira (o al más cercano a tiro, o a la mira).
    // Es gratis: no retrasa tu siguiente disparo. El coeficiente viaja por el canal `charge` del
    // básico (cast.charge = { t: 0, frac: 0 }, sin perfecto).
    v_rodar: {
      name: 'Rodar y Disparar', desc: 'Al rodar disparas un Disparo Rápido gratis.',
      afterCast(g, p, cast) {
        if (cast?.sk?.id !== 'a_paso' || cast.echo || !p?.alive || typeof p.basicAttack !== 'function') return;
        const mul = cast.sk.rollShot || 0;
        if (!(mul > 0)) return;
        const aim = g.input?.mouseWorld || null;
        const reach = (p.cls?.atkRange || 8) + 3;
        let e = aim ? g.nearestEnemy?.(3, aim) : null;
        if (!e || e.pos.distanceTo(p.pos) > reach) e = g.nearestEnemy?.(reach) || null;
        const target = e || (aim ? { pos: aim.clone() } : null);
        if (!target) return;
        const cd = p.atkCd;
        p.faceToward?.(target.pos);
        p.basicAttack(target, { charge: { t: 0, frac: 0, perfect: false, coefMul: mul, addPct: 0 } });
        p.atkCd = cd;
      },
    },

    // Carrera Esquiva: mientras canalizas la Carrera del Viento, un buff con el `projMissPct` de la
    // definición forjada. Sale al acabar el canal (⑭) o, si el canal desaparece sin ⑭ (muerte,
    // cambio de mundo), en la comprobación a 10 Hz.
    [ESQUIVA]: {
      name: 'Carrera Esquiva', desc: 'Mientras corres con la Carrera del Viento, parte de los disparos enemigos te fallan.',
      onCast(g, p, cast) {
        if (cast?.sk?.id !== 'a_v_carrera' || cast.echo) return;
        const pct = cast.sk.projMissPct || 0;
        if (pct > 0) p.addBuff(ESQUIVA, { projMissPct: pct }, 3600, { name: 'Carrera Esquiva', icon: '🌬️', desc: `El ${pct} % de los disparos enemigos te fallan` });
      },
      onSkillEnd(g, p, sk, end) {
        if (sk?.id === 'a_v_carrera' && end?.kind === 'channel') dropBuff(p, ESQUIVA);
      },
      onTick(g, p) {
        if (!p?.buffs?.some(b => b.id === ESQUIVA)) return;
        if (g._channel?.ctx?.sk?.id !== 'a_v_carrera') dropBuff(p, ESQUIVA);
      },
    },

    // Puesto Fijo: de rodillas (postura de a_f_rodilla activa), Disparo Apuntado y los haces de
    // Tiro Celestial suman +15 % al saco aditivo (③ condAdd). La rapidez y el no moverte son
    // datos de la postura forjada.
    v_puesto_fijo: {
      name: 'Puesto Fijo', desc: 'De rodillas, Disparo Apuntado y los haces hacen más daño.',
      condAdd(p, e, hit) {
        if (!CHARGED_SHOTS.has(hit?.skill)) return 0;
        return p.game?.stanceOf?.(p, 'a_f_rodilla') ? PUESTO_FIJO_DMG : 0;
      },
    },

    // Red de Caza: cuando un cepo de Trampa de Cepo SALTA al pisarlo (⑤ con hit.trap y la fuente
    // del campo; no en un estallido por detonación), inmoviliza también a los demás enemigos a
    // `radius` m de la trampa. Raíz = la del cepo (con rootAdd); una red por trampa.
    v_red_caza: {
      name: 'Red de Caza', desc: 'Al pisar tu cepo, una red inmoviliza a todos los que atrapa.',
      onHit(g, p, e, hit) {
        if (hit?.trap?.skill !== 'a_t_cepo' || hit.source !== 'field:trampa') return;
        const st = powerState(p, 'v_red_caza');
        if (st.uid === hit.trap.uid) return;
        st.uid = hit.trap.uid;
        const trap = (g.fields || []).find(f => f.uid === hit.trap.uid);
        const r = p.forged?.a_t_cepo?.def?.radius || NET_R;
        const root = trap?.data?.root || p.resolved?.a_t_cepo?.root || NET_ROOT;
        const x = trap ? trap.pos.x : hit.pos.x, z = trap ? trap.pos.z : hit.pos.z;
        rootAround(g, p, x, z, r, root, e);
        g.spawnRing?.({ x, y: 0.05, z }, r, trap?.data?.color ?? 0xd8c08a);
        g.emitFx?.('arqNetBurst', { x, y: 0.4, z });
      },
    },

    // Acecho Enredador: al caer del Salto de Acecho (③ afterCast: el salto es diferido),
    // inmoviliza `root` s (con rootAdd) a los enemigos a `radius` m del perfil forjado
    v_acecho_enredador: {
      name: 'Acecho Enredador', desc: 'Al caer del Salto de Acecho inmovilizas a los enemigos cercanos.',
      afterCast(g, p, cast) {
        if (cast?.sk?.id !== 'a_m_acecho' || cast.echo || !p?.alive) return;
        const r = cast.prof?.radius || NET_R, root = cast.prof?.root || 0;
        if (!(root > 0)) return;
        rootAround(g, p, p.pos.x, p.pos.z, r, root);
        g.emitFx?.('arqNetBurst', { x: p.pos.x, y: 0.4, z: p.pos.z });
      },
    },
  };
}
