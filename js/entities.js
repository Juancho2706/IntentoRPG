// ============================================================
// Entidades: jugador, enemigos y proyectiles
// ============================================================
import * as THREE from 'three';
import { CLASSES, paragonBoardFor, PET_KINDS, PET_UPGRADES, PET_COLLARS } from './data.js';
// Paso 2c.0: talentos y especialización (sustituyen a las maestrías)
import { aggregateTalents, normalizeTalents, talentsTrimmed, TALENTS_TRIMMED_NOTICE } from './talents.js';
// Paso 2 (E0.3): experiencia, subida de nivel y sus avisos (Player.gainXP delega)
import { gainXP as progressionGainXP } from './progression.js';
import { glyphValue } from './items.js';
import { SETS } from './items.js';
import { migrateSave, serializePlayer, SPEC_BAR_NOTICE } from './save-schema.js';
import { MAX_MATERIALS, PROGRESS_MATERIAL_KINDS, materialStackKey, materialSlotsUsed, canAddMaterial } from './materials.js';
import { CAPS, CRIT_MULT, VULN_PCT, mainStatMult, attackTime, moveSpeed, critChance, hitDamage,
  multiplierProduct, mitigate, sustainRefill, sustainTake, hazardDamage, weaknessMult, sumWeakness,
  condAddPct, condCritPct, dotProfile, healScaled,
  STAGGER_MAX, STAGGER_BREAK_T, STAGGER_LOCK_T, staggerFromCC, staggerFromDamage, staggerFromDisplace, DISPLACE_DR,
  displaceDist, ccDurationWithTalents, drCapOf, blockCapOf, slowStaggerSecs, STAGGER_DISPLACE_DR, STAGGER_SLOW_MIN_PCT,
  FIRST_CHARGED_ICD,
  THREAT_SWITCH, TAUNT_THREAT_BONUS, threatFromDamage, chargeCoefAt } from './combat-math.js';
// Paso 2b.0: resolvedor único, registro de poderes y recursos con identidad
import { resolveSkill, knownRankMap, knownSkills, isKnown, fitsSlot, BIG_HIT_INTERRUPT, forgeState, forgedDef,
  specBarUpgrade, specBarSwapText, rankedText } from './skill-resolve.js';
import { firePower, buildHookIndex, SKILL_BEHAVIORS } from './powers.js';
import { CORE_TV_POWER, usesCoreTv } from './powers-common.js';
import { dotsOf } from './timers.js';
import { SKILL_FX_PRESETS, skillFxFor } from './fx-skills.js';
import { projFanOffset, fanSpread, forgePowers, STANCE_STATS, VERB_DEFAULTS } from './skill-defs.js';
import { resourceDefFor, resourceMax, tickResource, gainResource, onHurtResource, initialResource,
  potionResourceAmount, touchCombat } from './resources.js';

const EMPTY_TAGS = new Set();
const isBossDef = d => !!(d?.boss || d?.uber || d?.worldBoss);
// stats que SOLO suma la innata de la especialización (recompute): ningún objeto, nodo, era ni
// buff las sube. Los topes propios del Guardián (combat-math.drCapOf/blockCapOf: 65 % y 50 %)
export const INNATE_ONLY_STATS = Object.freeze(['drCapAdd', 'blockCapAdd']);
// ¿es un escudo? (la innata de bloqueo del Guardián solo cuenta con uno equipado)
export function isShieldItem(it) {
  return !!it && !it.unidentified && it.slot === 'offhand' && (it.icon === '🛡️' || /escudo/i.test(it.baseName || it.name || ''));
}
// básico de arma de una clase (el "ataque principal" con el que naces)
export function weaponBasicOf(cls) {
  return cls?.skills.find(s => s.cat === 'basic' && s.type === 'weapon') || cls?.skills.find(s => s.cat === 'basic') || null;
}

// Efectos AL GOLPEAR de un perfil de habilidad (resolveSkill) sobre un enemigo
// REALMENTE golpeado: Vulnerable, aturdir/inmovilizar/ralentizar (Enemy.applyCC,
// con rendimientos decrecientes), DoT (perfil central de combat-math) y Decapitar.
// Lo comparten el básico (Player.basicAttack) y el canal de lanzamiento (game-skills).
export function applyHitEffects(g, p, e, prof, avgHit, opts = {}) {
  if (!e || !e.alive || !prof) return;
  if (prof.vuln) e.vulnT = Math.max(e.vulnT || 0, prof.vuln);
  // Paso 2c.0: a los jefes el aturdimiento no los aturde: suma STAGGER (Enemy.applyCC).
  // bossStun numérico (Martillo de Justicia) = duración nominal contra jefes; false
  // (Terremoto) ya no se distingue: todo control de jefe va a la barra de stagger.
  const boss = isBossDef(e.def);
  if (prof.stun) {
    const d = boss && typeof prof.bossStun === 'number' ? prof.bossStun : prof.stun;
    e.applyCC ? e.applyCC('stun', d, { src: p }) : e.applyStun?.(d);
  }
  // stagger propio de la habilidad (sk.stagger: Contrahechizo 20, Martillo de Justicia 30…)
  if (prof.stagger > 0 && boss && e.alive) e.addStagger?.(prof.stagger, p);
  if (prof.root && e.alive) e.applyCC?.('root', prof.root, { src: p });
  if (prof.slow && e.alive) {
    if (e.applyCC) e.applyCC('slow', prof.slow, { pct: prof.slowPct || 50, src: p });
    else e.slowT = Math.max(e.slowT || 0, prof.slow);
  }
  if (prof.dot && e.alive) {
    const d = dotProfile(prof.dot, avgHit, { dotMul: prof.dotMul || 1, tv: p?.tv });
    if (d) g?.applyDoT?.(e, d.total, d.ticks, d.interval, undefined, `${prof.id}:${prof.dot}`);
  }
  // DoT PROPIO de la habilidad (sk.hitDot, p. ej. Flecha de Cicuta): total = golpe
  // medio × coef (avgHit ya es el golpe de la habilidad: se reescala a su coef)
  if (prof.hitDot && e.alive && prof.coef > 0) {
    const hd = prof.hitDot;
    const total = avgHit * hd.coef / prof.coef;
    const ticks = Math.max(1, Math.round(hd.dur / 0.5));
    if (total > 0) g?.applyDoT?.(e, total, ticks, 0.5, undefined, `${prof.id}:${hd.kind}`);
  }
  // Decapitar: ejecuta a enemigos (no jefes) por debajo del umbral de vida
  if (prof.execute && e.alive && !isBossDef(e.def) && e.hp / e.maxHP <= prof.execute / 100)
    e.takeDamage(e.hp + 1, false, { proc: true, source: 'execute', skill: prof.id });
  // Paso 2 (§3.6): desplazar a los golpeados (pull/knock; a los jefes, Quebranto) y marcar.
  // `from` = origen del empuje/atracción (el héroe o el centro del área: lo pone el canal)
  if (e.alive && (prof.pull > 0 || prof.knock > 0) && !opts.noDisplace) {
    const from = opts.from || p?.pos;
    if (prof.pull > 0) {
      const to = prof.pullTo === 'trap' && g?.nearestOwnField ? (g.nearestOwnField(p, e.pos, { kind: 'trampa' })?.pos || from) : from;
      e.displace?.(to, prof.pull, { toward: true, src: p });
    }
    if (prof.knock > 0) e.displace?.(from, prof.knock, { toward: false, src: p });
  }
  if (e.alive && prof.mark && g?.applyMark) markOnce(g, p, e, prof);
  // provocar a los golpeados (clave `taunt`, s): Carga de Escudo, Golpe de Escudo
  if (e.alive && prof.taunt > 0) e.applyCC?.('taunt', prof.taunt, { src: p });
}

// Pone la marca del perfil (g.applyMark: el blanco y, con mark.count/radius, sus vecinos). Punto
// Débil (mark.firstCharged): remarcar refresca la marca, pero su premio llega como mucho una vez
// por enemigo cada FIRST_CHARGED_ICD s (Enemy.firstChargedOk), en CADA enemigo que la recibe. Se
// decide con la marca que tenía antes (la que aún guarda el premio es la misma concesión)
function markOnce(g, p, e, prof) {
  const m = prof.mark;
  p = p || g.player;
  if (!m.firstCharged) { g.applyMark(e, prof, p); return; }
  const id = m.id || prof.id;
  const reach = m.count > 1 && m.radius > 0 ? m.radius + 1e-6 : 0;
  const before = new Map([[e, e.marks?.[id]]]);
  if (reach) for (const o of g.enemies || []) if (o !== e && o.alive && o.pos.distanceTo(e.pos) <= reach) before.set(o, o.marks?.[id]);
  g.applyMark(e, prof, p);
  for (const [o, prev] of before) {
    const got = o.marks?.[id];
    if (!got || got === prev || !got.firstCharged || !o.firstChargedOk) continue;   // no la recibió ahora
    if (!o.firstChargedOk(p, id, m.firstIcd, prev || null)) got.firstCharged = null;
  }
}

function rand(min, max) { return min + Math.random() * (max - min); }

// forja guardada (D3) validada contra el catálogo de la clase: solo ids de habilidades
// que existen y valores 'i' | 'ii' | null (null = «sin variante» elegido a propósito)
function sanitizeForge(raw, cls) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  const ids = new Set((cls?.skills || []).map(s => s.id));
  for (const [id, v] of Object.entries(raw)) if (ids.has(id) && (v === 'i' || v === 'ii' || v === null)) out[id] = v;
  return out;
}
// ¿el enemigo lleva una marca VIVA de este héroe? (tv.markedDmg)
function hasOwnMark(e, p) {
  for (const k in e?.marks || {}) { const m = e.marks[k]; if (m && m.t > 0 && (!m.by || m.by === p)) return true; }
  return false;
}
// firma barata de la forja (revisión de la caché p.forged, riesgo 11)
function forgeSig(p) {
  let s = String(p.level || 1);
  for (const [k, v] of Object.entries(p.skillForge || {})) s += `|${k}:${v}`;
  return s;
}

// Bolsa de materiales: vive en js/materials.js (hoja sin imports; save-schema la usa sin
// formar ciclo con este archivo) y se reexporta aquí para sus importadores de siempre
export { MAX_MATERIALS, PROGRESS_MATERIAL_KINDS, materialStackKey, materialSlotsUsed, canAddMaterial };

// Esquiva: duración corta y pico de velocidad alto con ease-out (recorre ~3.4u)
const DASH_DUR = 0.26;
const DASH_PEAK = 26;
// desplazamiento² (m²) entre fotogramas por debajo del cual sigues QUIETA (stillT)
const STILL_EPS2 = 1e-6;

// Mueve una posición con colisión contra la cuadrícula (por ejes)
export function moveWithCollision(grid, pos, dx, dz, r = 0.32) {
  if (dx !== 0 && grid.walkable(pos.x + dx, pos.z, r)) pos.x += dx;
  if (dz !== 0 && grid.walkable(pos.x, pos.z + dz, r)) pos.z += dz;
}

// ------------------------------------------------------------
// Modelos low-poly procedurales
// ------------------------------------------------------------
function std(color, opts = {}) {
  const m = new THREE.MeshStandardMaterial({ color, roughness: opts.rough ?? 0.85, metalness: opts.metal ?? 0.05, emissive: opts.emissive ?? 0x000000, emissiveIntensity: opts.ei ?? 1 });
  // detalle de superficie procedural (normal + roughness) para que no se vea plano
  const tex = opts.tex ? charTex(opts.tex) : null;
  if (tex) {
    if (tex.normalMap) { m.normalMap = tex.normalMap; const n = opts.normal ?? 0.65; m.normalScale = new THREE.Vector2(n, n); }
    if (tex.roughnessMap) m.roughnessMap = tex.roughnessMap;
  }
  // rim/fresnel: realce en los bordes (silueta) — separa al personaje del fondo.
  // onBeforeCompile no se ejecuta sin renderer (tests headless): es seguro.
  if (opts.rim !== false) addRim(m, opts.rimColor, opts.rimI ?? 0.5);
  return m;
}

// ---- detalle de superficie procedural (cache; null en headless = color plano) ----
const _charTexCache = new Map();
function _sobelNormal(srcCtx, s, strength) {
  const src = srcCtx.getImageData(0, 0, s, s).data;
  const ncv = document.createElement('canvas'); ncv.width = ncv.height = s;
  const nctx = ncv.getContext('2d');
  const nimg = nctx.createImageData(s, s); const nd = nimg.data;
  const lum = (x, y) => { const xi = (x + s) % s, yi = (y + s) % s, k = (yi * s + xi) * 4; return (src[k] + src[k + 1] + src[k + 2]) / 765; };
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    const dx = (lum(x - 1, y) - lum(x + 1, y)) * strength;
    const dy = (lum(x, y - 1) - lum(x, y + 1)) * strength;
    const inv = 1 / Math.hypot(dx, dy, 1); const k = (y * s + x) * 4;
    nd[k] = (dx * inv * 0.5 + 0.5) * 255; nd[k + 1] = (dy * inv * 0.5 + 0.5) * 255; nd[k + 2] = (inv * 0.5 + 0.5) * 255; nd[k + 3] = 255;
  }
  nctx.putImageData(nimg, 0, 0);
  const t = new THREE.CanvasTexture(ncv); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
// genera {normalMap, roughnessMap} para 'cloth'|'metal'|'skin'|'leather'|'fur'|'scale'
function charTex(kind) {
  if (typeof document === 'undefined') return null;     // tests: sin canvas
  if (_charTexCache.has(kind)) return _charTexCache.get(kind);
  const s = 128;
  const cv = document.createElement('canvas'); cv.width = cv.height = s;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, s, s);   // base neutra (height medio)
  const noise = (n, a, sz) => { for (let i = 0; i < n; i++) { const v = 128 + (Math.random() - 0.5) * a; ctx.fillStyle = `rgb(${v},${v},${v})`; const x = Math.random() * s, y = Math.random() * s, r = sz * (0.5 + Math.random()); ctx.beginPath(); ctx.arc(x, y, r, 0, 6.28); ctx.fill(); } };
  let strength = 2.0, rep = 3;
  if (kind === 'cloth') {           // tejido: trama fina cruzada
    ctx.strokeStyle = 'rgba(70,70,70,0.5)'; ctx.lineWidth = 1;
    for (let i = 0; i < s; i += 4) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, s); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(190,190,190,0.4)';
    for (let i = 0; i < s; i += 4) { ctx.beginPath(); ctx.moveTo(0, i + 2); ctx.lineTo(s, i + 2); ctx.stroke(); }
    noise(120, 40, 1.2); strength = 1.4; rep = 4;
  } else if (kind === 'metal') {    // metal cepillado: arañazos horizontales + abolladuras
    ctx.strokeStyle = 'rgba(60,60,60,0.4)'; ctx.lineWidth = 1;
    for (let i = 0; i < 70; i++) { const y = Math.random() * s; ctx.globalAlpha = 0.3 + Math.random() * 0.5; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(s, y + (Math.random() - 0.5) * 3); ctx.stroke(); }
    ctx.globalAlpha = 1; noise(40, 80, 3); strength = 2.4; rep = 2;
  } else if (kind === 'skin') {     // piel: poros suaves de baja frecuencia
    noise(220, 26, 2.4); strength = 0.9; rep = 1;
  } else if (kind === 'leather') {  // cuero: celdas/grietas
    noise(90, 60, 4); ctx.strokeStyle = 'rgba(50,50,50,0.5)'; ctx.lineWidth = 1.4;
    for (let i = 0; i < 26; i++) { ctx.beginPath(); ctx.moveTo(Math.random() * s, Math.random() * s); ctx.lineTo(Math.random() * s, Math.random() * s); ctx.stroke(); }
    strength = 2.0; rep = 2;
  } else if (kind === 'fur') {      // pelaje: mechones direccionales
    ctx.strokeStyle = 'rgba(70,70,70,0.45)'; ctx.lineWidth = 1;
    for (let i = 0; i < 260; i++) { const x = Math.random() * s, y = Math.random() * s; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (Math.random() - 0.5) * 4, y + 5 + Math.random() * 4); ctx.stroke(); }
    strength = 1.6; rep = 3;
  } else {                          // 'scale': escamas
    for (let yy = 0; yy < s; yy += 10) for (let xx = 0; xx < s; xx += 10) { ctx.fillStyle = `rgba(${90 + Math.random() * 60 | 0},${90 + Math.random() * 60 | 0},${90 + Math.random() * 60 | 0},0.6)`; ctx.beginPath(); ctx.arc(xx + (yy / 10 % 2 ? 5 : 0), yy, 5, 0, 3.14); ctx.fill(); }
    strength = 2.2; rep = 3;
  }
  const roughnessMap = new THREE.CanvasTexture(cv);
  roughnessMap.wrapS = roughnessMap.wrapT = THREE.RepeatWrapping; roughnessMap.repeat.set(rep, rep);
  const normalMap = _sobelNormal(ctx, s, strength);
  normalMap.repeat.set(rep, rep);
  const out = { normalMap, roughnessMap };
  _charTexCache.set(kind, out);
  return out;
}

// Rim/fresnel sobre un MeshStandardMaterial: suma luz en los bordes a contraluz.
// Inyección por onBeforeCompile (no corre sin GPU → tests a salvo; si el nombre
// del chunk cambiara, el replace no ocurre y el material sigue funcionando).
const _RIM_DEFAULT = new THREE.Color(0.5, 0.65, 1.0);
function addRim(mat, color, intensity = 0.5) {
  const col = color != null ? new THREE.Color(color) : _RIM_DEFAULT;
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.rimColor = { value: col };
    shader.uniforms.rimIntensity = { value: intensity };
    shader.fragmentShader = 'uniform vec3 rimColor;\nuniform float rimIntensity;\n' + shader.fragmentShader.replace(
      '#include <opaque_fragment>',
      'float _rim = pow(1.0 - clamp(abs(dot(normalize(vNormal), normalize(vViewPosition))), 0.0, 1.0), 3.0);\n  outgoingLight += rimColor * _rim * rimIntensity;\n#include <opaque_fragment>'
    );
  };
  mat.customProgramCacheKey = () => 'rim' + intensity;
}

// oscurece/aclara un color hex (factor <1 oscurece) — para mantos, sombras, etc.
function shade(hex, f) {
  const r = Math.min(255, Math.round(((hex >> 16) & 255) * f));
  const g = Math.min(255, Math.round(((hex >> 8) & 255) * f));
  const b = Math.min(255, Math.round((hex & 255) * f));
  return (r << 16) | (g << 8) | b;
}

// Héroe ARTICULADO: torso, cabeza con cuello, dos brazos (el derecho empuña/actúa),
// dos piernas con pies, capa con inercia y equipo por clase. Todas las piezas
// animables se exponen en `userData.anim` (las anima Player.update con poses
// procedurales: ciclo de caminar, swing con anticipación, idle, esquiva…).
export function makePlayerModel(cls, tint = null) {
  const g = new THREE.Group();
  const rig = new THREE.Group();              // bob/inclinación/voltereta van aquí
  g.add(rig);
  const skin = 0xd9a878;
  const cloth = tint ?? cls.color;

  // torso + pelvis
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.27, 0.42, 6, 12), std(cloth, { tex: 'cloth' }));
  torso.position.y = 1.04; torso.castShadow = true;
  const pelvis = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.1, 4, 10), std(shade(cloth, 0.8), { tex: 'leather' }));
  pelvis.position.y = 0.82;
  rig.add(torso, pelvis);

  // cuello-pivote + cabeza (permite mirar/bob de cabeza)
  const neck = new THREE.Group(); neck.position.set(0, 1.32, 0); rig.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.21, 16, 12), std(skin, { tex: 'skin', rough: 0.6 }));
  head.position.y = 0.18; head.castShadow = true; neck.add(head);
  // ojos con leve brillo (foco facial; captan el bloom)
  for (const ex of [-0.075, 0.075]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 6), new THREE.MeshStandardMaterial({ color: 0x223044, emissive: 0x66aaff, emissiveIntensity: 1.1 }));
    eye.position.set(ex, 0.2, 0.18); neck.add(eye);
  }

  // piernas con pivote en la cadera + pie
  const legGeo = new THREE.CapsuleGeometry(0.1, 0.46, 4, 8);
  const makeLeg = (x) => {
    const piv = new THREE.Group(); piv.position.set(x, 0.8, 0);
    const leg = new THREE.Mesh(legGeo, std(0x3a3128, { tex: 'leather' }));
    leg.position.y = -0.35; leg.castShadow = true;
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.27), std(0x241b12, { tex: 'leather' }));
    foot.position.set(0, -0.66, 0.05);
    piv.add(leg, foot);
    return piv;
  };
  const legL = makeLeg(-0.14), legR = makeLeg(0.14);
  rig.add(legL, legR);

  // brazos con pivote en el hombro; el derecho lleva la mano "activa"
  const armGeo = new THREE.CapsuleGeometry(0.09, 0.4, 4, 8);
  const makeArm = (x) => {
    const piv = new THREE.Group(); piv.position.set(x, 1.2, 0);
    const arm = new THREE.Mesh(armGeo, std(shade(cloth, 0.92), { tex: 'cloth' }));
    arm.position.y = -0.29; arm.castShadow = true;
    const hand = new THREE.Group(); hand.position.y = -0.54;
    piv.add(arm, hand);
    piv.userData.hand = hand;
    return piv;
  };
  const armL = makeArm(-0.34), armR = makeArm(0.34);
  rig.add(armL, armR);
  const rhand = armR.userData.hand, lhand = armL.userData.hand;

  // capa: movimiento secundario (inercia con el desplazamiento y los golpes)
  const capePiv = new THREE.Group(); capePiv.position.set(0, 1.24, -0.16);
  const cape = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.82, 0.035), std(shade(cloth, 0.55), { tex: 'cloth' }));
  cape.position.y = -0.4; capePiv.add(cape); rig.add(capePiv);

  // equipo por clase
  if (cls.id === 'guerrero') {
    // espada en grupo propio, en POSE DE GUARDIA (punta arriba-adelante-afuera) para
    // que en reposo no atraviese el torso/cabeza; el slash la anima desde aquí.
    const weapon = new THREE.Group();
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.85, 0.14), std(0xc8ccd4, { metal: 0.7, rough: 0.3, tex: 'metal' }));
    blade.position.y = 0.45; blade.castShadow = true;
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.07, 0.07), std(0x7a5a2a, { metal: 0.5, tex: 'metal' }));
    weapon.add(blade, guard);
    weapon.rotation.set(0.6, 0, -0.28);   // punta hacia delante (+z) y afuera (+x)
    rhand.add(weapon);
    const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.06, 16), std(0x8a6a3a, { metal: 0.4, rough: 0.4, tex: 'metal' }));
    shield.rotation.x = Math.PI / 2; shield.position.set(-0.04, -0.08, 0.14);
    lhand.add(shield);
    for (const sx of [-1, 1]) {        // hombreras metálicas
      const pa = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), std(0x6a6a72, { metal: 0.5, rough: 0.4, tex: 'metal' }));
      pa.scale.y = 0.65; pa.position.set(sx * 0.34, 1.2, 0); rig.add(pa);
    }
  } else if (cls.id === 'maga') {
    const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.4, 8), std(0x5a4028, { tex: 'leather' }));
    staff.position.y = 0.35; rhand.add(staff);
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), std(0x66ccff, { emissive: 0x3399ff, ei: 1.8, rim: false }));
    orb.position.y = 1.05; rhand.add(orb);
    const hat = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.62, 12), std(0x2a4ba6, { tex: 'cloth' }));
    hat.position.y = 0.35; neck.add(hat);
  } else {
    const bow = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.03, 6, 16, Math.PI), std(0x6e4a22, { tex: 'leather' }));
    bow.rotation.z = -Math.PI / 2; bow.position.y = 0.08; rhand.add(bow);
    const hood = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.42, 12), std(0x2e5e30, { tex: 'cloth' }));
    hood.position.y = 0.16; neck.add(hood);
    const quiver = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.42, 8), std(0x4a3520, { tex: 'leather' }));
    quiver.rotation.x = 0.45; quiver.position.set(-0.16, 1.02, -0.22); rig.add(quiver);
  }

  // handles de compatibilidad + set de animación
  g.userData.body = torso;            // compat
  g.userData.hand = armR;             // compat: el swing/cast animan el brazo derecho
  g.userData.anim = { rig, torso, neck, head, legL, legR, armL, armR, capePiv, cape, rhand, lhand };
  return g;
}

export function makeEnemyModel(def) {
  const g = new THREE.Group();
  const s = def.scale || 1;
  // textura de superficie por tipo de criatura (detalle de luz, no oscurece albedo)
  const bodyTex = def.shape === 'rat' ? 'fur'
    : def.shape === 'golem' ? 'scale'
    : def.shape === 'slime' ? null
    : def.shape === 'chest' ? 'metal'
    : 'leather';
  const mat = std(def.color, bodyTex ? { tex: bodyTex } : {});
  const anim = {};                 // piezas animables (cuerpo, piernas, brazos…)
  let bodyH = 0.75;
  // pierna/brazo con pivote en la cadera/hombro para que oscilen al rotar
  const limb = (x, topY, len, w, col) => {
    const piv = new THREE.Group();
    piv.position.set(x, topY, 0);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(w, w * 0.8, len, 5), std(col));
    m.position.y = -len / 2; m.castShadow = true;
    piv.add(m);
    return piv;
  };
  let eyeY = 1.34, eyeZ = 0.2;

  if (def.shape === 'rat') {
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.4, 10, 8), mat);
    body.scale.set(1.3, 0.7, 0.9); body.position.y = 0.3; body.castShadow = true;
    const snout = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.3, 6), mat.clone());
    snout.rotation.x = Math.PI / 2; snout.position.set(0, 0.26, 0.5);
    const tailPiv = new THREE.Group(); tailPiv.position.set(0, 0.28, -0.45);
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.06, 0.7, 5), std(0xc09a90));
    tail.rotation.x = Math.PI / 2.3; tail.position.z = -0.3; tailPiv.add(tail);
    for (const sx of [-0.16, 0.16]) {   // orejas
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 5), mat.clone());
      ear.scale.set(1, 1, 0.4); ear.position.set(sx, 0.6, 0.1); g.add(ear);
    }
    g.add(body, snout, tailPiv);
    anim.body = body; anim.tail = tailPiv; bodyH = 0.45; eyeY = 0.42; eyeZ = 0.5;
  } else if (def.shape === 'golem') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.0, 0.55), mat);
    body.position.y = 1.0; body.castShadow = true;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.4, 0.4), mat.clone());
    head.position.y = 1.68;
    const armL = limb(-0.55, 1.4, 0.85, 0.14, def.color), armR = limb(0.55, 1.4, 0.85, 0.14, def.color);
    const legL = limb(-0.22, 0.55, 0.55, 0.18, def.color), legR = limb(0.22, 0.55, 0.55, 0.18, def.color);
    g.add(body, head, armL, armR, legL, legR);
    anim.body = body; anim.head = head; anim.arms = [armL, armR]; anim.legs = [legL, legR];
    bodyH = 1.05; eyeY = 1.68;
  } else if (def.shape === 'demon') {
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 0.55, 6, 10), mat);
    body.position.y = 0.98; body.castShadow = true;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 10, 8), mat.clone());
    head.position.y = 1.52;
    for (const sx of [-0.14, 0.14]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.32, 6), std(0x222222));
      horn.position.set(sx, 1.8, 0); horn.rotation.z = sx > 0 ? -0.2 : 0.2; g.add(horn);
    }
    const armL = limb(-0.34, 1.28, 0.55, 0.09, def.color), armR = limb(0.34, 1.28, 0.55, 0.09, def.color);
    const legL = limb(-0.15, 0.62, 0.62, 0.11, def.color), legR = limb(0.15, 0.62, 0.62, 0.11, def.color);
    const tailPiv = new THREE.Group(); tailPiv.position.set(0, 0.8, -0.3);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.7, 6), mat.clone());
    tail.rotation.x = 1.4; tail.position.set(0, -0.1, -0.3); tailPiv.add(tail);
    g.add(body, head, armL, armR, legL, legR, tailPiv);
    anim.body = body; anim.head = head; anim.arms = [armL, armR]; anim.legs = [legL, legR]; anim.tail = tailPiv;
    bodyH = 0.95; eyeY = 1.52;
  } else if (def.shape === 'slime') {
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 10),
      std(def.color, { rough: 0.4, ei: 0.4, emissive: def.color }));
    body.material.transparent = true; body.material.opacity = 0.85;
    body.scale.set(1.1, 0.8, 1.1); body.position.y = 0.34; body.castShadow = true;
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    core.position.y = 0.32; body.add(core);   // el núcleo va dentro (se deforma con el cuerpo)
    g.add(body);
    anim.body = body; anim.slime = true; anim.sx = 1.1; anim.sy = 0.8;
    bodyH = 0.55; eyeY = 0.42; eyeZ = 0.4;
  } else if (def.shape === 'mimic') {
    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.6), mat);
    chest.position.y = 0.3; chest.castShadow = true;
    const lid = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.16, 0.62), std(0xc9a227, { metal: 0.4, rough: 0.5 }));
    lid.position.set(0, 0.66, -0.2); lid.rotation.x = -0.7;
    for (const sx of [-0.25, 0, 0.25]) {
      const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.16, 4), std(0xf0ead8));
      tooth.position.set(sx, 0.5, 0.26); tooth.rotation.x = Math.PI; g.add(tooth);
    }
    g.add(chest, lid);
    anim.body = chest; anim.lid = lid; anim.lidBase = -0.7; bodyH = 0.7; eyeY = 0.52; eyeZ = 0.33;
  } else {
    // humanoide: torso + cabeza + 2 brazos + 2 piernas
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.25, 0.42, 6, 10), mat);
    torso.position.y = 0.98; torso.castShadow = true;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), mat.clone());
    head.position.y = 1.48;
    const armL = limb(-0.3, 1.22, 0.5, 0.075, def.color), armR = limb(0.3, 1.22, 0.5, 0.075, def.color);
    const legL = limb(-0.13, 0.56, 0.56, 0.1, def.color), legR = limb(0.13, 0.56, 0.56, 0.1, def.color);
    g.add(torso, head, armL, armR, legL, legR);
    anim.body = torso; anim.head = head; anim.arms = [armL, armR]; anim.legs = [legL, legR];
    bodyH = 1.0; eyeY = 1.5; eyeZ = 0.16;
  }
  // bases de animación
  if (anim.body) { anim.bodyY = anim.body.position.y; anim.bodyZ = anim.body.position.z; anim.bodyScale = anim.body.scale.clone(); }

  // ojos brillantes
  for (const sx of [-0.09, 0.09]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6),
      new THREE.MeshBasicMaterial({ color: def.boss ? 0xff2200 : 0xffcc00 }));
    eye.position.set(sx, eyeY, eyeZ);
    (anim.head || g).add(eye);   // si hay cabeza, los ojos la siguen
    if (anim.head) eye.position.y = eyeY - anim.head.position.y; // relativo a la cabeza
  }
  g.scale.setScalar(s);

  // barra de vida
  const bar = new THREE.Group();
  const bg = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.1), new THREE.MeshBasicMaterial({ color: 0x111111, depthTest: false, transparent: true, opacity: 0.8 }));
  const fg = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 0.07), new THREE.MeshBasicMaterial({ color: 0xdd2222, depthTest: false }));
  fg.position.z = 0.001;
  bg.renderOrder = fg.renderOrder = 999;
  bar.add(bg, fg);
  bar.position.y = (bodyH + 1.05) * s;
  bar.visible = false;
  g.add(bar);
  g.userData.bar = bar;
  g.userData.barFg = fg;
  g.userData.anim = anim;
  return g;
}

// ------------------------------------------------------------
// JUGADOR
// ------------------------------------------------------------
export class Player {
  constructor(game, classId, saved = null, opts = {}) {
    this.game = game;
    this.cls = CLASSES[classId];
    this.classId = classId;

    this.level = 1;
    this.xp = 0;
    this.attributes = { ...this.cls.base };
    this.statPoints = 0;
    this.skills = {};           // id -> nivel (derivado; lo rellena recompute)
    this.gold = 50;
    this.potions = { hp: 3, mp: 2 };
    this.inventory = [];        // máx 32 — SOLO objetos de equipo ('item'/'charm')
    this.materials = [];        // bolsa de materiales: gemas, runas, llaves, fragmentos, glifos
    this.equipment = {
      weapon: null, offhand: null, helm: null, shoulders: null, chest: null,
      gloves: null, belt: null, pants: null, boots: null, amulet: null, ring: null, ring2: null,
    };
    this.lastFloor = 1;

    // guardado versionado (js/save-schema.js): migra v0→…→SAVE_VERSION sobre una
    // copia y luego vuelca los campos. saveVersion no vive en el héroe.
    // guardado de antes de S0 (sin hotbarManual), venga de la versión que venga: la barra de la
    // especialización se pone al cargar (abajo), una vez, como si acabaras de aprender su kit
    const preS0Bar = !!saved && typeof saved === 'object' && !('hotbarManual' in saved);
    if (saved) {
      saved = migrateSave(saved);
      Object.assign(this, saved, { game: this.game, cls: this.cls });
      delete this.saveVersion;
    }

    // valores por defecto compatibles con guardados antiguos
    this.equipment = {
      weapon: null, offhand: null, helm: null, shoulders: null, chest: null,
      gloves: null, belt: null, pants: null, boots: null, amulet: null, ring: null, ring2: null,
      ...(this.equipment || {}),
    };
    this.waypoints = Array.isArray(this.waypoints) ? this.waypoints : [];
    this.cube = Array.isArray(this.cube) ? this.cube : [];
    // Bolsa de materiales: gemas, runas, llaves, fragmentos y glifos.
    // (La mudanza mochila→materiales de saves viejos vive en MIGRATIONS[0].)
    this.inventory = Array.isArray(this.inventory) ? this.inventory : [];
    this.materials = Array.isArray(this.materials) ? this.materials : [];
    this.quest = this.quest || null;
    // habilidad → soportes asignados (array, máx 2). El formato viejo (string)
    // se convierte en MIGRATIONS[0]; aquí solo se sanea lo que no sea array.
    this.supports = this.supports && typeof this.supports === 'object' ? this.supports : {};
    for (const k of Object.keys(this.supports)) if (!Array.isArray(this.supports[k])) this.supports[k] = [];
    this.knownSupports = Array.isArray(this.knownSupports) ? this.knownSupports : []; // soportes aprendidos
    this.skillMods = this.skillMods && typeof this.skillMods === 'object' ? this.skillMods : {}; // id skill → { modId:true } (D4-lite)
    this.hardcore = !!this.hardcore;
    // mascota: normaliza el esquema (guardados antiguos {level:1}) y valida contra
    // los catálogos ACTUALES (PET_KINDS/PET_COLLARS). Se queda aquí y no en
    // MIGRATIONS porque el catálogo puede cambiar sin cambiar el formato.
    if (this.pet) {
      const k = PET_KINDS[this.pet.kind] ? this.pet.kind : 'lobo';
      this.pet = {
        kind: k,
        owned: this.pet.owned || { [k]: true },
        level: this.pet.level || 1,
        xp: this.pet.xp || 0,
        upgrades: this.pet.upgrades || {},
        collar: PET_COLLARS[this.pet.collar] ? this.pet.collar : 'none',
        ownedCollars: this.pet.ownedCollars || { none: true },
      };
    } else this.pet = null;
    // talentos (Paso 2c.0, sustituyen a las maestrías): { v, spec, cls, sp, choice }.
    // normalizeTalents valida contra el catálogo ACTUAL (ids/rangos que ya no existen
    // se purgan) y, con el NIVEL (§3.3), cada árbol contra lo que da ese nivel (puertas,
    // requisitos y presupuesto). La migración maestría → especialización vive en MIGRATIONS[3].
    this.talents = normalizeTalents(this.talents, classId, this.level);
    delete this.mastery;
    // avisos de carga (la migración v4 deja 'talentos'); los muestra Game y se vacían
    this.notices = Array.isArray(this.notices) ? this.notices : [];
    // §3.2: un árbol ilegal al nivel que normalizeTalents vació deja el aviso 'talentos-recortados'
    if (talentsTrimmed(this.talents).length && !this.notices.includes(TALENTS_TRIMMED_NOTICE)) this.notices.push(TALENTS_TRIMMED_NOTICE);
    // eras (temporada local): estado por semana; títulos cosméticos obtenidos
    this.era = this.era && typeof this.era === 'object' ? this.era : null;
    this.titles = Array.isArray(this.titles) ? this.titles : [];
    this.title = this.title || null;
    // mundo (D4-lite): zonas descubiertas y pueblo favorito (reaparición)
    this.discoveredZones = Array.isArray(this.discoveredZones) && this.discoveredZones.length ? this.discoveredZones : ['Cripta'];
    this.homeZone = this.homeZone || 'Cripta';
    this.strongholdsCleared = Array.isArray(this.strongholdsCleared) ? this.strongholdsCleared : []; // bastiones reclamados
    this.dailyDone = this.dailyDone || null;
    this.tips = this.tips || {};
    this.refugeUnlocked = !!this.refugeUnlocked;
    // personalización del héroe: nombre y tinte del cuerpo (opts en personajes
    // nuevos; el guardado tiene prioridad para los ya creados)
    this.heroName = this.heroName || opts.name || this.cls.name;
    this.tint = this.tint ?? (opts.tint ?? null);
    // endgame: dificultad seleccionada (Tormento) y Códice de Aspectos
    this.torment = this.torment || 0;
    this.codex = this.codex || {};
    // bendiciones permanentes (una por categoría), ganadas en grietas
    this.blessings = this.blessings || {};
    // registro de colección: sets vistos, poderes legendarios, bestiario
    this.discovered = { sets: {}, powers: {}, bestiary: {}, ...(this.discovered || {}) };
    // Paragon: tablero de glifos. La conversión del formato plano antiguo vive en
    // MIGRATIONS[0]. Paso 2 (D12): los puntos son DERIVADOS del nivel (paragonPointsEarned),
    // así que un héroe nuevo nace con { nodes:{}, glyphs:{} } sin `points` (la migración
    // v4 → v5 borra el campo de los guardados viejos).
    if (this.paragon && this.paragon.nodes) {
      this.paragon.nodes = this.paragon.nodes || {};
      this.paragon.glyphs = this.paragon.glyphs || {};
    } else {
      this.paragon = { nodes: {}, glyphs: {} };
    }
    this.records = {
      kills: 0, eliteKills: 0, bossKills: 0, mimics: 0, deaths: 0,
      maxFloor: 1, legendaries: 0, setPieces: 0, goldEarned: 0, chests: 0, playTime: 0,
      quests: 0, dailies: 0, maxRift: 0,
      ...(this.records || {}),
    };

    // --- Sistema de habilidades v5 (Paso 2b.0, kit de 6 ranuras con categoría):
    // las habilidades se APRENDEN SOLAS al llegar a su nivel y su rango sale del
    // nivel (+talentos/equipo): `this.skills` (id → rango) es DERIVADO y lo
    // rellena recompute(); ya no se guarda.
    this.skills = {};
    // @deprecated (Paso 2): ramas viejas. Se sanean por si un guardado v4 las trae; la
    // migración v4 → v5 las traduce a forja y las borra (sin puntos de habilidad).
    this.skillMods = (this.skillMods && typeof this.skillMods === 'object') ? this.skillMods : {};
    this.skillBranches = (this.skillBranches && typeof this.skillBranches === 'object') ? this.skillBranches : {};
    if (this.skillSystemV == null) this.skillSystemV = 5;
    // FORJA (Paso 2, D3): skillId → 'i' | 'ii' | null (sin clave = nunca elegida). Se valida
    // contra el catálogo actual: ids desconocidos o valores inválidos se descartan.
    this.skillForge = sanitizeForge(this.skillForge, this.cls);
    this.furiaIdle = 0; // temporizador de disipación de Furia (fuera de combate)

    // estado VOLÁTIL de los verbos (§3.7; no se guarda): relanzar/combo/secuencia/postura
    // por habilidad, cargas de enfriamiento, definición forjada en caché, multiplicadores
    // de movimiento y PLANTADO (D20: 1 s sin caminar ni usar movilidad)
    this.skState = {};
    this.skCharges = {};
    this.forged = {};
    this.moveMuls = {};
    this.planted = false;
    this.plantedT = 0;
    // QUIETA (tv.drStill, Quietud): s sin desplazarte por ningún medio. No es el plantado:
    // caminar con keepPlanted, rodar, ser arrastrada o llegar con `plant: true` la ponen a 0
    this.stillT = 0;
    this.perfectStreak = 0;     // sueltas perfectas seguidas (fallar la ventana la reinicia)

    this.buffs = [];
    this.cds = {};
    this.cdMax = {};            // enfriamiento total del último uso (overlay de la UI)
    this.gcdT = 0;              // enfriamiento global (0,2 s entre principales)
    this.castLock = 0;          // bloqueo de lanzamiento (windup / canalización)
    this.actionLockT = 0;       // bloqueo de ACCIÓN para el básico tras una principal (Paso 2b.2)
    this.shields = [];          // escudos [{ amt, t, src }] (se consumen tras mitigar)
    this.invulnT = 0;           // inmunidad (Bloque de Hielo, Fénix…)
    this.unstoppableT = 0;      // imparable: inmune a control e interrupciones
    this.slowImmuneT = 0;       // inmune a ralentizaciones (Agilidad, Piel de Hierro, Furia Inmortal)
    this.invisT = 0;            // invisible (Camuflaje): los enemigos pierden el objetivo (Paso 2c.2)
    this.leap = null;           // salto en curso (tipo de habilidad `leap`)
    this.simT = 0;              // reloj de simulación del héroe (icd de poderes)
    this.sinceCombat = 99;      // s desde el último golpe dado o recibido
    this.powerState = {};       // estado volátil de los poderes (powers.powerState)
    this.gauges = {};           // indicadores de especialización (spec-mechanics.js; volátil)
    this.moving = false;        // ¿se movió en el último frame? (Concentración, Impulso)
    this.resolved = {};         // caché de resolveSkill (se invalida en recompute)
    this.atkCd = 0;
    this.slowT = 0;
    this.dodgeT = 0;
    this.dodgeCd = 0;
    this.dodgeDir = { x: 0, z: 1 };
    this.xpBoostT = 0;
    this.moveTarget = null;
    this.attackTarget = null;
    this.pickTarget = null;
    this.swing = 0;
    this.alive = true;
    this.healCd = 0;

    this.group = makePlayerModel(this.cls, this.tint);
    this.recompute();
    // hotbar de 6 ranuras con categoría (lmb básico · rmb principal · k1 movilidad ·
    // k2 flexible · k3 especialización · k4 definitiva); se valida con el nivel ya cargado
    this.hotbar = this.normalizeHotbar(this.hotbar);
    // ranuras que el jugador colocó A MANO (S0, T1: assignHotbar): la barra de la especialización no
    // las sustituye. Solo las que siguen teniendo esa habilidad
    const hm = this.hotbarManual && typeof this.hotbarManual === 'object' ? this.hotbarManual : {};
    this.hotbarManual = {};
    for (const [s, id] of Object.entries(hm)) if (typeof id === 'string' && this.hotbar[s] === id) this.hotbarManual[s] = id;
    // guardado de antes de S0 (también un v4 o anterior recién migrado): una pasada de la barra de la
    // especialización, como si acabaras de aprender su kit (el Rayo que nunca llegó a 🖱️Der), con su
    // aviso de carga (una sola vez)
    if (preS0Bar && specBarUpgrade(this).length && !this.notices.includes(SPEC_BAR_NOTICE)) this.notices.push(SPEC_BAR_NOTICE);
    this.hp = this.stats.maxHP;
    // recurso inicial (resources.js): la Furia arranca vacía; Maná/Energía llenos
    this.mp = initialResource(resourceDefFor(this.cls), this.stats.maxMP);
    if (saved && saved.hp != null) {
      this.hp = Math.min(saved.hp, this.stats.maxHP);
      // los recursos que se GENERAN (Furia, start:0) no se guardan: siempre 0 al cargar
      if (saved.mp != null && this.cls.resource?.start !== 0) this.mp = Math.min(saved.mp, this.stats.maxMP);
    }
  }

  // Datos persistentes del héroe (lo que escribe Game.save en localStorage).
  // La lista de campos y la versión viven en js/save-schema.js (declarativo).
  toSaveData() {
    return serializePlayer(this);
  }

  // hotbar de 6 ranuras con CATEGORÍA (§1.1): cada habilidad solo entra en sus
  // `slots` (CAT_SLOTS) y no puede estar en dos ranuras. Valida ids, ranura y que
  // la habilidad exista; las que aún no conoces se conservan (se activan al
  // aprenderlas). Rellena por defecto: 🖱️Izq = básico de arma.
  normalizeHotbar(h) {
    const all = this.cls.skills;
    const weapon = weaponBasicOf(this.cls)?.id || null;
    const def = { lmb: weapon, rmb: null, k1: null, k2: null, k3: null, k4: null };
    if (!h || typeof h !== 'object') return def;
    const out = {};
    const used = new Set();
    for (const s of ['lmb', 'rmb', 'k1', 'k2', 'k3', 'k4']) {
      let v = h[s];
      if (v === 'basic') v = weapon;                 // literal viejo 'basic' → básico de arma
      if (v === undefined) { out[s] = def[s]; continue; }
      const sk = v ? all.find(x => x.id === v) : null;
      out[s] = (v === null) ? null : (sk && fitsSlot(sk, s) && !used.has(v) ? v : def[s]);
      if (out[s]) used.add(out[s]);
    }
    if (!out.lmb) out.lmb = weapon;                  // nunca sin ataque principal
    return out;
  }

  // ¿conoce la habilidad? (por nivel o concedida por talento)
  knows(id) {
    const sk = typeof id === 'string' ? this.cls.skills.find(s => s.id === id) : id;
    return isKnown(this, sk);
  }

  // accesores de lo FORJADO que recompute pasa a aggregateTalents (§3.3 y §3.8): elemOf
  // (selectores '@<elem>'), kitOf ('@spec') y defOf (definición forjada: '@tag:', atajos
  // como '@charge' y '@windup'; una variante que añade `charge` recibe los talentos de @charge)
  talentAccessors() {
    const skills = this.cls?.skills || [];
    const defOf = id => { const sk = skills.find(s => s.id === id); return sk ? forgedDef(this, sk) : null; };
    return {
      elemOf: id => defOf(id)?.elem || null,
      kitOf: specId => skills.filter(s => specId && s.spec === specId).map(s => s.id),
      defOf,
    };
  }

  get pos() { return this.group.position; }

  // estadísticas derivadas de atributos + equipo + buffs + pasivas
  recompute() {
    const a = { ...this.attributes };
    // Sacos de stats (combat-math). dmgPct = saco ADITIVO de daño; critDmg = extra
    // de daño crítico (también aditivo, solo en críticos); dr = reducción de daño
    // %; block = prob. de bloqueo; res* = resistencias elementales (0 por defecto).
    // HOOK DE TALENTOS: un nodo que "suma" declara stats (van por addStats a su
    // saco); uno "multiplicativo" se registra con combat-math.registerMultiplier
    // (condicional) o se añade a this.extraMultipliers ([{id, mult}] estáticos).
    const item = { hp: 0, mp: 0, dmgPct: 0, crit: 0, arm: 0, spdPct: 0, aspdPct: 0, mf: 0,
                   lph: 0, mph: 0, cdr: 0, thorns: 0, goldPct: 0,
                   critDmg: 0, dr: 0, block: 0, resFire: 0, resCold: 0, resLightning: 0, resPoison: 0,
                   // Paso 2b.0: esquiva (s menos de recarga), regen. de Energía y curación de habilidad
                   dodgeCdr: 0, energyRegen: 0, healPct: 0,
                   // Paso 2b.2: coste de principales por buff (−100 = gratis) y fallo de proyectiles enemigos
                   spenderCostPct: 0, projMissPct: 0,
                   // Paso 2c.0 (talentos, §5.3): % de vida/maná máx., % de experiencia,
                   // amenaza extra (se suma al ×1 base; la innata del Guardián lo fija en ×3)
                   // y % de stagger contra jefes
                   hpPct: 0, mpPct: 0, xpPct: 0, threatMult: 0, staggerPct: 0,
                   // Paso 2c.2: daño recibido extra (%, tras mitigar: Temeridad +10)
                   dmgTakenPct: 0,
                   // Paso 2 (claves de talento, docs/paso2-claves-w2.md): +% de regeneración del
                   // recurso (Maná/Energía) y +% del recurso GENERADO (Furia Creciente)
                   regenPct: 0, resGainPct: 0,
                   // Paso 2 (§3.6): suelta perfecta desde media carga (buff Calma Absoluta)
                   perfectAlways: 0,
                   // Paso 2 (cola W2): puntos que suma lo que PARA un bloqueo (Escudo Alzado;
                   // combat-math.blockReduction: 50 + blockPower, tope 90)
                   blockPower: 0,
                   // Paso 2 (cola W2d): % de coste de TODAS las habilidades con coste (Sello del
                   // Archimago) y % de velocidad de habilidades (giros y saltos: Sangre Hirviente);
                   // los lee la cola W2d-A (skill-resolve). Los topes propios (INNATE_ONLY_STATS)
                   // no van en este saco: solo los da la innata
                   costPct: 0, skillSpeedPct: 0 };

    const addStats = (src) => {
      for (const [k, v] of Object.entries(src)) {
        if (k in a) a[k] += v; else if (k in item) item[k] += v;
      }
    };

    // amuletos de mochila (charms): otorgan stats sin equiparse
    for (const it of this.inventory || []) {
      if (it && it.kind === 'charm') addStats(it.affixes || {});
    }

    const setCounts = {};
    this.powers = new Set();
    for (const it of Object.values(this.equipment)) {
      if (!it || it.unidentified) continue; // sin identificar no da nada
      // calidad (masterworking): escala armadura y afijos del objeto
      const q = 1 + (it.quality || 0) * 0.06;
      if (it.arm) item.arm += Math.round(it.arm * q);
      if (q !== 1) { const scaled = {}; for (const [k, v] of Object.entries(it.affixes || {})) scaled[k] = Math.round(v * q); addStats(scaled); }
      else addStats(it.affixes || {});
      for (const gm of it.gems || []) addStats(gm.stats); // gemas y runas engarzadas
      if (it.runeword) addStats(it.runeword.stats);       // bonus de palabra rúnica
      if (it.setId) setCounts[it.setId] = (setCounts[it.setId] || 0) + 1;
      if (it.power) this.powers.add(it.power.id);          // poderes únicos de legendarios/reliquias
      if (it.power2) this.powers.add(it.power2.id);        // míticos: segundo poder
    }
    // paragon: tablero TEMÁTICO de la clase (los nodos legendarios otorgan poderes)
    const board = paragonBoardFor(this.classId);
    const pnodes = this.paragon?.nodes || {};
    for (const node of board) {
      if (node.type !== 'start' && !pnodes[node.id]) continue;
      if (node.stats) addStats(node.stats);
      if (node.power) this.powers.add(node.power);
    }
    // glifos engarzados: valor por rango + bonus por nodos activos adyacentes
    // (+ bonus de FAMILIA por cada adyacente del mismo cuadrante que el glifo)
    const glyphs = this.paragon?.glyphs || {};
    for (const [nodeId, gl] of Object.entries(glyphs)) {
      if (!pnodes[nodeId]) continue; // solo si el engarce está activo
      const node = board.find(n => n.id === nodeId);
      if (!node) continue;
      const adjNodes = board.filter(o => Math.abs(o.x - node.x) + Math.abs(o.y - node.y) === 1 && (o.type === 'start' || pnodes[o.id]));
      const adjFam = gl.fam ? adjNodes.filter(o => o.cat === gl.fam).length : 0;
      addStats({ [gl.stat]: glyphValue(gl, adjNodes.length, adjFam) });
    }
    // bonus de conjunto por número de piezas equipadas
    for (const [sid, n] of Object.entries(setCounts)) {
      const set = SETS.find(s => s.id === sid);
      if (!set) continue;
      for (const [need, stats] of Object.entries(set.bonuses))
        if (n >= Number(need)) addStats(stats);
    }
    for (const b of this.buffs) addStats(b.stats);
    // bendiciones permanentes del endgame (una por categoría)
    for (const bl of Object.values(this.blessings || {})) addStats({ [bl.stat]: bl.value });
    // collar de la mascota: aura de UTILIDAD (un stat de jugador, nunca daño)
    if (this.pet?.collar && this.pet.collar !== 'none') {
      const c = PET_COLLARS[this.pet.collar];
      if (c?.stat) addStats({ [c.stat]: c.value });
    }
    // FORJA (Paso 2, §3.5): la caché de definiciones forjadas solo se rehace si cambian el
    // nivel o la forja (no en cada addBuff: riesgo 11)
    const fsig = forgeSig(this);
    if (fsig !== this._forgeSig) { this.forged = {}; this._forgeSig = fsig; }
    const clsSkills = this.cls?.skills || [];
    // TALENTOS (Paso 2c.0, §5.4): árbol de clase + especialización activa (Nv ≥ 10).
    // §3.3: los selectores de talento se expanden por el elemento FORJADO (elemOf) y por el
    // kit de la especialización (kitOf). talentExtra = agregado extra de los tests/arnés.
    const agg = aggregateTalents(this, this.talentAccessors());
    const ex = this.talentExtra;
    if (ex) {
      for (const [k, v] of Object.entries(ex.stats || {})) agg.stats[k] = (agg.stats[k] || 0) + v;
      for (const [k, v] of Object.entries(ex.tv || {})) agg.tv[k] = (typeof v === 'object' || !Number.isFinite(agg.tv[k])) ? v : agg.tv[k] + v;
      for (const id of ex.powers || []) agg.powers.add(id);
      for (const id of ex.grants || []) agg.grants.add(id);
      for (const [k, v] of Object.entries(ex.skillLv || {})) agg.skillLv[k] = (agg.skillLv[k] || 0) + v;
      for (const [k, m] of Object.entries(ex.mods || {})) agg.mods[k] = { ...(agg.mods[k] || {}), ...m };
      if (ex.mechanic !== undefined) agg.mechanic = ex.mechanic;
      if (ex.innate) agg.innate = { ...agg.innate, ...ex.innate };
    }
    this.talentAgg = agg;
    addStats(agg.stats);
    // incondicionales de tv: daño crítico (saco aditivo) y reducción de daño
    if (agg.tv.critDmg) item.critDmg += agg.tv.critDmg;
    if (agg.tv.dmgReduc) item.dr += agg.tv.dmgReduc;
    // pasivas INNATAS de la especialización (§5.2.5): el bloqueo solo con escudo; los topes
    // propios (INNATE_ONLY_STATS) solo desde aquí
    const inn = agg.innate || {};
    const capAdd = Object.fromEntries(INNATE_ONLY_STATS.map(k => [k, 0]));
    for (const [k, v] of Object.entries(inn)) {
      if (k in capAdd) capAdd[k] += v;
      else if (k === 'block') { if (isShieldItem(this.equipment.offhand)) item.block += v; }
      else if (k === 'threatMult') item.threatMult += Math.max(0, v - 1);   // ×3 → +2 sobre el ×1 base
      else if (k in item) item[k] += v;
    }
    // indicador de la especialización (spec-mechanics.js): su poder gauge_<id>; al
    // cambiar de especialización se vacían los indicadores
    if (agg.mechanic) this.powers.add(`gauge_${agg.mechanic}`);
    if ((this._gaugeMech || null) !== (agg.mechanic || null)) { this.gauges = {}; this._gaugeMech = agg.mechanic || null; }
    // mutador de la Era (temporada local): stat/power global de la semana
    const eraB = this.game?.eraMutatorBonus?.();
    if (eraB) { if (eraB.stat) addStats(eraB.stat); if (eraB.power) this.powers.add(eraB.power); }
    // poderes y claves tv de los talentos
    for (const id of agg.powers) this.powers.add(id);
    this.tv = agg.tv;
    // Paso 2c.2: las claves tv que consume el NÚCLEO (curas y recurso al matar, Ejecutar,
    // reducción de daño condicional, Pirotecnia, Espinas Venenosas…) van por el poder
    // común `nucleo_tv` (powers-common.js): sin poderes «portadores» en los nodos
    if (usesCoreTv(agg.tv)) this.powers.add(CORE_TV_POWER);
    // poderes de la FORJA (Mejora y variante elegida, `power: 'v_<id>'`) de las habilidades
    // que conoces (una variante de otro kit no aplica)
    for (const sk of clsSkills) {
      const fs = forgeState(this, sk);
      if (!fs.entry || (!fs.mejora && !fs.variant) || !isKnown(this, sk)) continue;
      for (const id of forgePowers(fs.entry, fs)) this.powers.add(id);
    }
    this._vstats = null;        // stats de postura (verbStats): se recalculan al pedirlas
    // activas conocidas con passiveTick (⑨ a 10 Hz aunque no estén en la barra)
    this.passiveBehaviors = [];
    for (const id of agg.grants || []) {
      const sk = this.cls?.skills?.find(s => s.id === id);
      const b = sk?.behavior ? SKILL_BEHAVIORS[sk.behavior] : null;
      if (b?.passiveTick) this.passiveBehaviors.push(b);
    }
    // ① PODERES: índice de ganchos de los poderes activos + sus stats (registro
    // data-driven, js/powers.js). Las pasivas compradas se eliminaron (Paso 2b.0).
    // powerStats = lo que devolvieron (también claves propias, p. ej. 'gaugeMax:coto')
    buildHookIndex(this);
    this.powerStats = firePower('stats', this, this);
    addStats(this.powerStats);

    const c = this.cls;
    const w = this.equipment.weapon;
    const wq = w ? 1 + (w.quality || 0) * 0.06 : 1; // calidad del arma
    const wDmg = w ? [w.dmg[0] * wq, w.dmg[1] * wq] : c.fists;
    const main = a[c.mainStat];
    const mainMult = mainStatMult(main);
    const sheet = v => v * mainMult * Math.max(0, 1 + item.dmgPct / 100);
    const critRaw = 5 + a.des * 0.15 + item.crit;

    this.stats = {
      ...a,
      // vida por nivel según clase (Paso 1A) × (1 + hpPct) (talentos/innata del Guardián, Paso 2c)
      maxHP: Math.round((c.baseHP + a.vit * c.hpPerVit + item.hp + (this.level - 1) * (c.hpPerLevel ?? 4)) * Math.max(0.1, 1 + item.hpPct / 100)),
      // recurso de clase (resources.js §2): Furia 100 · Maná 100+2·Ene+3·(Nv−1) · Energía 60; × (1 + mpPct)
      maxMP: Math.round(resourceMax(resourceDefFor(c), { ene: a.ene, level: this.level, bonus: item.mp }) * Math.max(0.1, 1 + item.mpPct / 100)),
      // daño de hoja (arma × atributo × saco aditivo de equipo): lo que ve la UI
      dmgMin: Math.max(1, Math.round(sheet(wDmg[0]))),
      dmgMax: Math.max(2, Math.round(sheet(wDmg[1]))),
      // piezas de la fórmula (combat-math.hitDamage)
      wMin: wDmg[0], wMax: wDmg[1], mainMult, dmgPct: item.dmgPct, critDmg: item.critDmg,
      critRaw,                                   // sin topar (se le suman bonus de habilidad)
      crit: critChance(critRaw),                 // tope CAPS.crit
      arm: Math.round(item.arm + a.des * 0.3),
      aspdPct: Math.min(CAPS.aspd, item.aspdPct),
      spdPct: Math.min(CAPS.spd, item.spdPct),
      spd: moveSpeed(4.3, item.spdPct),          // tope +50 %
      atkTime: attackTime(c.atkTime, item.aspdPct), // tope +100 %
      mf: Math.round(item.mf),
      lph: item.lph, mph: Math.min(CAPS.mph, item.mph), thorns: item.thorns,   // recurso al golpear topado (§2)
      cdr: Math.min(CAPS.cdr, item.cdr), // tope de reducción de enfriamiento
      goldPct: Math.round(item.goldPct), // bonus de oro recogido (collar del pet)
      // topes de reducción de daño y de bloqueo: los de CAPS o los propios de la innata
      drCapAdd: capAdd.drCapAdd, blockCapAdd: capAdd.blockCapAdd,
      dr: Math.min(drCapOf(capAdd), item.dr), block: Math.min(blockCapOf(capAdd), item.block),
      resFire: item.resFire, resCold: item.resCold, resLightning: item.resLightning, resPoison: item.resPoison,
      dodgeCdr: item.dodgeCdr, energyRegen: item.energyRegen, healPct: Math.min(CAPS.heal, item.healPct),
      spenderCostPct: Math.max(-100, item.spenderCostPct), projMissPct: Math.min(100, Math.max(0, item.projMissPct)),
      // Paso 2c.0: experiencia, amenaza (multiplicador ≥ 1) y stagger contra jefes
      hpPct: item.hpPct, mpPct: item.mpPct, xpPct: item.xpPct,
      threatMult: Math.max(0.1, 1 + item.threatMult), staggerPct: item.staggerPct,
      dmgTakenPct: item.dmgTakenPct,
      regenPct: item.regenPct, resGainPct: item.resGainPct,
      perfectAlways: item.perfectAlways,
      blockPower: item.blockPower,               // el tope lo pone combat-math (blockReduction)
      // −100 = gratis; la velocidad de habilidades con el mismo tope que la de ataque
      costPct: Math.max(-100, item.costPct), skillSpeedPct: Math.max(-50, Math.min(CAPS.aspd, item.skillSpeedPct)),
    };
    // habilidades conocidas y su rango (DERIVADO del nivel; §4.1) + caché del resolvedor
    this.resolved = {};
    this.skills = knownRankMap(this);
    // "Poder del héroe": puntuación única que resume tu build (sube al mejorar
    // equipo/nivel/paragon/talentos…). Refuerza la sensación de "número sube".
    const st = this.stats;
    // el crítico multiplica el daño efectivo; aspd (atkTime menor = más DPS)
    const dmgAvg = (st.dmgMin + st.dmgMax) / 2 * (1 + st.crit / 100 * (CRIT_MULT - 1)) * (this.cls.atkTime / st.atkTime);
    st.power = Math.round(
      dmgAvg * 1.4 + st.maxHP * 0.08 + st.arm * 0.25 + st.maxMP * 0.03 +
      (st.mf || 0) * 0.1 + (st.lph || 0) * 0.6 + (st.thorns || 0) * 0.3 + st.cdr * 0.6
    );
    if (this.hp != null) {
      this.hp = Math.min(this.hp, this.stats.maxHP);
      this.mp = Math.min(this.mp, this.stats.maxMP);
    }
  }

  // registra en la colección un objeto identificado/recogido
  discover(item) {
    if (!item) return;
    if (item.setId) (this.discovered.sets[item.setId] ||= {})[item.slot] = true;
    if (item.power) this.discovered.powers[item.power.id] = true;
    if (item.power2) this.discovered.powers[item.power2.id] = true;
  }

  // vida/recurso al golpear (una vez por impacto: AoE, proyectil, golpe). La vida
  // al golpear (lph) ENTRA en la cubeta de sustento (§6.1, cambio intencional).
  // Los poderes "por golpe" (Cero Absoluto, los de la forja y los talentos…) van por ⑤ onHit (registro).
  onDealHit() {
    this.sinceCombat = 0;
    touchCombat(this);
    if (this.stats.lph) this.sustain(this.stats.lph, 'lph');
    if (this.stats.mph) gainResource(this, this.stats.mph);
  }

  // ③ Tirada de un golpe (combat-math.hitDamage): arma × coef × (1+Σaditivo) ×
  // atributo × crítico. coef = coeficiente de la habilidad (1 = básico);
  // addPct = lo que la habilidad suma al saco ADITIVO (ramas, soportes,
  // talentos); critBonus = prob. de crítico extra (se topa DESPUÉS).
  // `e` (objetivo, si se conoce al tirar: los proyectiles tiran AL IMPACTAR) y
  // `hit` ({skill, tags, elem}) habilitan los bonos condicionados al objetivo:
  // claves tv (combat-math.condAddPct) + poderes condAdd/condCrit.
  // Debilidad y los multiplicadores [×] los aplica Enemy.takeDamage al impactar.
  rollDamage(coef = 1, critBonus = 0, addPct = 0, e = null, hit = null) {
    const r = this.combatRng || Math.random;
    let st = this.stats;
    let add = addPct, cb = critBonus;
    // Paso 2 (§3.6): stats de las posturas activas (sin recompute) y DETONACIÓN de una marca
    // propia por este golpe (+pct al saco aditivo; consume un uso; hit.detonated)
    const vs = this.verbStats();
    if (vs.dmgPct) add += vs.dmgPct;
    if (vs.crit) cb += vs.crit;
    if (vs.critDmg) st = { ...st, critDmg: (st.critDmg || 0) + vs.critDmg };
    let det = 0;
    if (e && hit && this.game?.markDetonation) det = this.game.markDetonation(e, hit) || 0;
    if (det > 0) add += det;
    if (e && this.tv) {
      // Paso 2c.2: Presa (preyDmg), «ya estallaron» (explodedDmg, Fuego), Ejecutar contra
      // élites/jefes (executePct) y crítico contra enemigos en llamas (burningCrit).
      // Paso 2: plantado (plantedDmg), objetivo con tu marca (markedDmg), detonación (detonateDmg)
      const c = {
        targetElite: !!(e.def?.rank || isBossDef(e.def) || e.prey),
        targetSlowed: e.slowT > 0 || e.frozenT > 0,
        targetFrac: e.maxHP ? e.hp / e.maxHP : 1,
        manaFrac: st.maxMP ? this.mp / st.maxMP : 0,
        targetPrey: !!e.prey, targetExploded: !!e.pyroBurst, elem: hit?.elem || null,
        targetBurning: !!this.tv.burningCrit && dotsOf(e, 'burn').length > 0,
        planted: !!this.planted, targetMarked: hasOwnMark(e, this), detonated: det > 0,
      };
      add += condAddPct(this.tv, c);
      cb += condCritPct(this.tv, c);
    }
    if (this.hookIndex?.condAdd) add += firePower('condAdd', this, this, e, hit || {});
    if (this.hookIndex?.condCrit) cb += firePower('condCrit', this, this, e, hit || {});
    const w = st.wMin + r() * (st.wMax - st.wMin);
    // hit.forceCrit: crítico seguro (Ignición Total del Calor; suelta perfecta con perfectCrit);
    // se tira igual (azar estable)
    const crit = r() * 100 < critChance(st.critRaw ?? st.crit, cb) || !!hit?.forceCrit;
    const dmg = hitDamage(w, coef, st, add, crit);
    return { dmg: Math.max(1, Math.round(dmg)), crit, detonated: det > 0 };
  }

  // Stats VOLÁTILES de los verbos (§3.6): las posturas activas suman sus `stats` sin pasar
  // por recompute (cambiar de postura no rehace el héroe). Caché hasta el próximo cambio.
  verbStats() {
    if (this._vstats) return this._vstats;
    const out = {};
    const g = this.game;
    const modes = g?.activeStanceModes ? g.activeStanceModes(this) : [];
    for (const m of modes) for (const [k, v] of Object.entries(m.stats || {})) if (STANCE_STATS.has(k) && Number.isFinite(v)) out[k] = (out[k] || 0) + v;
    this._vstats = out;
    return out;
  }
  // multiplicadores de movimiento (§3.7): spd ×= Π; 0 = quieto. dur en s (Infinity = hasta clear)
  setMoveMul(id, mul, dur = Infinity) {
    if (!id) return;
    this.moveMuls = this.moveMuls || {};
    this.moveMuls[id] = { mul: Math.max(0, Number(mul) || 0), t: dur > 0 ? dur : Infinity };
  }
  clearMoveMul(id) { if (this.moveMuls) delete this.moveMuls[id]; }
  // plantado al instante (`plant: true` al llegar de un avance o salto) · usar movilidad lo rompe
  // (llegar de un desplazamiento no es estar quieta: stillT vuelve a 0)
  plantNow() { this.plantedT = Math.max(this.plantedT || 0, VERB_DEFAULTS.plantedAfter); this.planted = true; this.stillT = 0; }
  unplant() { this.plantedT = 0; this.planted = false; this.stillT = 0; }
  moveMulProduct() {
    let m = 1;
    for (const k in this.moveMuls || {}) m *= this.moveMuls[k].mul;
    return m;
  }
  // vida mínima de los buffs con minHpPct (Furia Inmortal), en puntos de vida (0 = sin suelo)
  minHpFloor() {
    let pct = 0;
    for (const b of this.buffs || []) if (b.t > 0 && b.stats?.minHpPct > pct) pct = b.stats.minHpPct;
    return pct > 0 ? Math.max(1, this.stats.maxHP * pct / 100) : 0;
  }

  // golpe MEDIO esperado sin crítico (para DoT/Estela/explosiones/encadenado)
  avgHit(coef = 1, addPct = 0) {
    const st = this.stats;
    return hitDamage((st.wMin + st.wMax) / 2, coef, st, addPct, false);
  }

  // SUSTENTO (§6.1 A): TODA cura disparada por un golpe o una muerte propios
  // (robo de vida, vida al golpear, Festín, curas al matar…) comparte UNA cubeta
  // con tope de 6 % de la vida máx. por segundo. No escala con healPct.
  sustain(amount, src = 'sustain') {
    if (!(amount > 0) || !this.alive) return 0;
    const r = sustainTake(this._leech, this.stats.maxHP, amount);
    this._leech = r.bucket;
    const before = this.hp;
    this.hp = Math.min(this.stats.maxHP, this.hp + r.heal);
    const healed = this.hp - before;
    this._sustained = (this._sustained || 0) + healed;
    void src;
    return healed;
  }
  // robo de vida = sustento sobre el daño infligido de verdad
  leech(amount) { return this.sustain(amount, 'leech'); }

  // CURACIÓN DE HABILIDAD (§6.1 B): acción deliberada; escala con healPct (tope +50 %)
  // y NO usa la cubeta. Devuelve la curación efectiva (sin exceso).
  healSkill(amount, src = 'skill') {
    if (!(amount > 0) || !this.alive) return 0;
    const before = this.hp;
    this.hp = Math.min(this.stats.maxHP, this.hp + healScaled(amount, this.stats.healPct));
    void src;
    return this.hp - before;
  }
  // RESTAURACIÓN: fija la vida a un valor (Negación de la Muerte, Fénix…); no escala
  setHp(v, src = 'restore') {
    this.hp = Math.max(0, Math.min(this.stats.maxHP, v));
    void src;
    return this.hp;
  }
  // escudo: se consume DESPUÉS de mitigar y antes de la vida (escala con healPct).
  // opts.dr (Paso 2c.2): puntos de reducción de daño mientras el escudo aguanta
  // (Escudo Prismático de la Barrera de Maná); el mayor de los escudos activos
  addShield(amount, dur, src = 'shield', opts = null) {
    const amt = Math.round(healScaled(amount, this.stats.healPct));
    if (!(amt > 0) || !(dur > 0)) return 0;
    this.shields = (this.shields || []).filter(s => s.src !== src);
    this.shields.push({ amt, t: dur, src, dr: Math.max(0, opts?.dr || 0) });
    return amt;
  }
  shieldDr() { let d = 0; for (const s of this.shields || []) if (s.amt > 0 && s.t > 0 && s.dr > d) d = s.dr; return d; }
  // INVISIBILIDAD (Paso 2c.2, Camuflaje): mientras dura, los enemigos pierden el
  // objetivo y no adquieren uno nuevo (Enemy.update); atacar NO la rompe aquí (lo
  // decide el poder que la da: reveal())
  goInvisible(sec) { if (sec > 0) this.invisT = Math.max(this.invisT || 0, sec); }
  reveal() { this.invisT = 0; }
  isInvisible() { return (this.invisT || 0) > 0; }
  shieldTotal() { return (this.shields || []).reduce((a, s) => a + s.amt, 0); }
  // absorbe `dmg` con los escudos activos (los más antiguos primero); devuelve lo que pasa
  absorbShields(dmg) {
    let left = dmg;
    for (const s of this.shields || []) {
      if (left <= 0) break;
      const take = Math.min(s.amt, left);
      s.amt -= take; left -= take;
    }
    if (this.shields?.length) this.shields = this.shields.filter(s => s.amt > 0 && s.t > 0);
    return left;
  }
  grantInvuln(sec) { this.invulnT = Math.max(this.invulnT || 0, sec || 0); }
  // libera de ralentizaciones (opción de rama «Purga»)
  cleanse() { this.slowT = 0; }
  // ÚNICA entrada de las ralentizaciones al héroe (enemigos, telarañas, auras,
  // telegrafías): respeta la inmunidad (slowImmuneT) y el estado imparable.
  // Devuelve true si se aplicó.
  applySlow(dur, total = dur) {
    if (!(dur > 0) || !this.alive) return false;
    if (this.slowImmuneT > 0 || this.unstoppableT > 0) return false;
    if (dur > (this.slowT || 0)) { this.slowT = dur; this._slowTotal = total; }
    return true;
  }
  // inmunidad a ralentizaciones durante `sec` (purga la que hubiera)
  grantSlowImmune(sec) {
    if (!(sec > 0)) return;
    this.slowImmuneT = Math.max(this.slowImmuneT || 0, sec);
    this.slowT = 0;
  }
  // defensa de las ZONAS aliadas que te contienen (Bomba de Humo…): campos con
  // data.allyDr (puntos de reducción de daño) y data.projMissPct (fallo de los
  // proyectiles enemigos). Gana la más fuerte de cada clave (no se suman nubes).
  zoneDefense() {
    const out = { dr: 0, miss: 0 };
    const list = this.game?.fieldsAt?.(this.pos) || [];
    for (const f of list) {
      if (f.owner && f.owner !== this && !this.game?.allies?.().includes(f.owner)) continue;
      out.dr = Math.max(out.dr, f.data?.allyDr || 0);
      out.miss = Math.max(out.miss, f.data?.projMissPct || 0);
    }
    return out;
  }
  // probabilidad (%) de que un proyectil ENEMIGO falle al héroe: buff + zona + postura (tope 100)
  projMissChance() {
    return Math.min(100, Math.max(this.stats?.projMissPct || 0, this.zoneDefense().miss, this.verbStats().projMissPct || 0));
  }

  // meta opcional: { name, icon, desc } para que la UI muestre el efecto.
  // Guardamos `dur` (total) además de `t` (restante) para poder calcular progreso.
  addBuff(id, stats, dur, meta = {}) {
    this.buffs = this.buffs.filter(b => b.id !== id);
    // X1 (E5): el aviso del buff de una habilidad tuya (su `desc` del catálogo) lleva los números a tu rango
    const sk = meta.desc ? this.cls?.skills?.find(s => s.id === id && s.desc === meta.desc) : null;
    this.buffs.push({
      id, stats, t: dur, dur,
      name: meta.name, icon: meta.icon, desc: sk ? rankedText(this, sk, meta.desc) : meta.desc,
    });
    this.recompute();
  }

  // Descripción legible por defecto a partir de los stats de un buff
  _buffStatsDesc(stats) {
    if (!stats) return '';
    const LABELS = {
      dmgPct: '% daño', crit: '% crítico', arm: ' armadura', spdPct: '% vel. mov.',
      aspdPct: '% vel. ataque', mf: '% hallazgo mágico', hp: ' vida', mp: ' maná',
      lph: ' vida al golpear', mph: ' maná al golpear', cdr: '% enfriamiento', thorns: ' espinas',
    };
    return Object.entries(stats)
      .map(([k, v]) => `+${v}${LABELS[k] || ' ' + k}`)
      .join(', ');
  }

  // CONTRATO UI: devuelve TODOS los efectos temporales activos, normalizados.
  // Cada uno: { id, name, icon, remaining, total, desc } (segundos).
  // Nunca lanza: si no hay efectos devuelve [].
  activeBuffs() {
    const out = [];
    try {
      // 1) buffs de habilidades/altares con stats
      for (const b of this.buffs || []) {
        if (!b || b.t <= 0) continue;
        out.push({
          id: b.id,
          name: b.name || 'Bendición',
          icon: b.icon || '✨',
          remaining: Math.max(0, b.t),
          total: b.dur || b.t,
          desc: b.desc || this._buffStatsDesc(b.stats),
        });
      }
      // 2) santuario de experiencia (temporizador suelto, no es un buff con stats)
      if (this.xpBoostT > 0) {
        out.push({
          id: 'xp_boost', name: 'Bendición de Experiencia', icon: '✨',
          remaining: this.xpBoostT, total: this._xpBoostTotal || 60,
          desc: '+50% experiencia',
        });
      }
      // 3) ralentización del jugador (telaraña/escarcha/congelación)
      if (this.slowT > 0) {
        out.push({
          id: 'slow', name: 'Ralentizado', icon: '❄️',
          remaining: this.slowT, total: this._slowTotal || this.slowT,
          desc: '-45% velocidad de movimiento',
        });
      }
      // 4) invulnerabilidad de esquiva (si está activa)
      if (this.dodgeT > 0) {
        out.push({
          id: 'dodge', name: 'Esquiva', icon: '💨',
          remaining: this.dodgeT, total: DASH_DUR,
          desc: 'Invulnerable mientras dura',
        });
      }
    } catch { /* nunca lanzar: la UI debe poder llamarlo siempre */ }
    return out;
  }

  // esquiva: impulso rápido con invulnerabilidad breve
  dodge() {
    // durante un avance lento (dashT, imparable) no se esquiva: el avance manda
    if (!this.alive || this.dodgeCd > 0 || this.dodgeT > 0 || this.dashMove) return;
    const g = this.game;
    const dir = g.input.keyDir;
    let dx, dz;
    if (dir) { const l = Math.hypot(dir.x, dir.z) || 1; dx = dir.x / l; dz = dir.z / l; }
    else { dx = Math.sin(this.group.rotation.y); dz = Math.cos(this.group.rotation.y); }
    this.dodgeDir = { x: dx, z: dz };
    this.dodgeT = DASH_DUR;
    // recarga 3 s (stat dodgeCdr: el poder Ágil la deja en 1,8 s)
    this.dodgeCd = this.dodgeCdMax = Math.max(0.6, 3 - (this.stats.dodgeCdr || 0));
    // la esquiva CANCELA el windup (sin cobrar el coste) y la canalización en curso
    g.cancelCast?.('dodge');
    this.dashTrail = 0;
    this.moveTarget = this.attackTarget = this.pickTarget = null;
    this.group.rotation.y = Math.atan2(dx, dz);
    g.sfx('dash');
    g.vibrate(20);
  }

  // experiencia y subida de nivel: js/progression.js (Paso 2, E0.3)
  gainXP(amount) { progressionGainXP(this, amount); }

  // habilidades aprendidas solas al subir de nivel (§4.1): aviso y, si su ranura
  // natural está libre, se colocan en la barra. S0 (T1): una del kit de la especialización ACTIVA va
  // a su ranura de SPEC_BAR aunque la ocupe una del kit base que no pusiste a mano (con aviso)
  onSkillsLearned(knownBefore) {
    const fresh = knownSkills(this).filter(sk => !knownBefore.has(sk.id));
    if (!fresh.length) return;
    const swaps = specBarUpgrade(this, new Set(fresh.map(sk => sk.id)));
    let placed = swaps.length > 0;
    const key = this.game.ui?.actionKey?.('skills', 'T') || 'T';
    for (const sk of fresh) {
      const sw = swaps.find(x => x.id === sk.id);
      // el aviso de la sustitución va al banner aunque la subida de nivel saque su tarjeta de novedades
      // (no empieza por «📖 Nueva habilidad», que la tarjeta se queda)
      if (sw) { this.game.ui?.message?.(specBarSwapText(this, sw, key), 5000); continue; }
      const slot = (sk.slots || []).find(s => this.hotbar && !this.hotbar[s]);
      if (slot && !Object.values(this.hotbar).includes(sk.id)) { this.hotbar[slot] = sk.id; placed = true; }
      this.game.ui?.message?.(`📖 Nueva habilidad: ${sk.icon} ${sk.name}${slot ? ` (ranura ${slot.toUpperCase()})` : ''}`, 3500);
    }
    if (placed) this.game.ui?.refreshHotbar?.();
  }

  // Daño recibido en CAPAS (combat-math.mitigate): bloqueo → armadura (solo
  // físico, vs nivel de área del atacante, tope 75 %) → resistencia elemental
  // (tope 70 %) → reducción de daño %. opts: { element='phys', melee=false,
  // source=Enemy }. Las espinas SOLO responden a golpes cuerpo a cuerpo.
  // ⑧ Paso 2b.0: condDr (poderes) → mitigar → escudos → onDamaged → vida → onLethal.
  // Recibir daño genera Furia (resources.onHurtResource) y un golpe de más del 10 %
  // de la vida interrumpe las canalizaciones/habilidades `int` (salvo imparable).
  takeDamage(amount, attackerLevel = 1, opts = {}) {
    if (!this.alive) return;
    if (this.dodgeT > 0 || this.invulnT > 0 || this.leap) {
      // invulnerable durante la esquiva, el salto o una inmunidad
      this.game.ui.spawnText(this.pos, '¡Esquivado!', 'txt-heal');
      return;
    }
    const g = this.game;
    // daño SALIENTE del atacante debilitado (Provocación: Enemy.outDmgMul)
    const om = opts.source?.outDmgMul?.() ?? 1;
    if (om !== 1) amount = Math.max(0, amount * om);
    const info = { amount, raw: amount, element: opts.element || 'phys', melee: !!opts.melee, blocked: false, src: opts.source || null };
    let extraDr = this.hookIndex?.condDr ? firePower('condDr', this, this, info) : 0;
    const zd = this.zoneDefense().dr;                 // dentro de una zona aliada (Bomba de Humo)
    if (zd > 0) extraDr += zd;
    const sd = this.shieldDr();                       // escudo con reducción (Escudo Prismático)
    if (sd > 0) extraDr += sd;
    // Paso 2: postura activa (Muralla −15 %, Parapeto −30 %…: sin recompute)
    const vs = this.verbStats();
    if (vs.dr) extraDr += vs.dr;
    let st = extraDr ? { ...this.stats, dr: (this.stats.dr || 0) + extraDr } : this.stats;
    if (vs.block || vs.blockPower || vs.dmgTakenPct) st = { ...st, block: (st.block || 0) + (vs.block || 0),
      blockPower: (st.blockPower || 0) + (vs.blockPower || 0), dmgTakenPct: (st.dmgTakenPct || 0) + (vs.dmgTakenPct || 0) };
    const mit = mitigate(amount, st, { al: attackerLevel, element: info.element, rng: this.combatRng });
    info.blocked = mit.blocked;
    const absorbed = mit.dmg - this.absorbShields(mit.dmg);
    info.amount = mit.dmg - absorbed;
    if (this.hookIndex?.onDamaged) firePower('onDamaged', this, g, this, info);
    let dmg = Math.max(0, Math.round(info.amount));
    // vida mínima (buff minHpPct, Furia Inmortal): no baja del suelo salvo golpes `unavoidable`
    const floor = opts.unavoidable ? 0 : this.minHpFloor();
    if (floor > 0 && this.hp - dmg < floor) dmg = Math.max(0, Math.floor(this.hp - floor));
    this.hp -= dmg;
    this.sinceCombat = 0;
    onHurtResource(this, dmg);                      // Furia por daño recibido (tope 12/s)
    if (dmg > BIG_HIT_INTERRUPT * this.stats.maxHP && !(this.unstoppableT > 0)) g.interruptCast?.('hit');
    if (absorbed > 0) g.ui.spawnText(this.pos, `🛡${absorbed}`, 'txt-heal');
    // espinas: refleja daño al atacante CUERPO A CUERPO (no a proyectiles/áreas)
    if (this.stats.thorns && opts.melee) {
      const e = (opts.source && opts.source.alive) ? opts.source : this.game.nearestEnemy?.(2.6);
      if (e) e.takeDamage(this.stats.thorns, false, { proc: true });
    }
    if (mit.blocked) this.game.ui.spawnText(this.pos, '¡Bloqueo!', 'txt-heal');
    this.game.ui.spawnText(this.pos, `-${dmg}`, 'txt-dmg-player');
    this.game.ui.flashDamage();
    this.hurtT = 1;   // sacudida de daño (flinch) del cuerpo
    // sonido al RECIBIR daño (throttle para no saturar con golpes seguidos)
    const now = performance.now();
    if (!this._hurtAt || now - this._hurtAt > 220) { this.game.sfx?.('hurt'); this._hurtAt = now; }
    this.game.addShake(0.15 + Math.min(0.25, dmg / this.stats.maxHP), 0.22);
    this.game.vibrate(35);
    this.game.sfx('hurt');
    this.game.tip('pocion', 'Si tu vida baja, bebe una poción: tecla Q o el botón 🧪');
    if (this.hp <= 0) {
      // onLethal: un poder puede salvarte (Negación de la Muerte, Fénix…); gana el primero por prioridad
      if (this.hookIndex?.onLethal && firePower('onLethal', this, g, this, info)) {
        if (this.hp <= 0) this.hp = 1;
        return;
      }
      this.hp = 0;
      this.alive = false;
      this.game.onPlayerDeath();
    }
  }

  usePotion(pot) {
    if (this.potions[pot] <= 0) { this.game.ui.message('No te quedan pociones'); return; }
    if (pot === 'hp') {
      if (this.hp >= this.stats.maxHP) return;
      // curación de habilidad (§6.1 B): escala con healPct
      this.healSkill(Math.round(this.stats.maxHP * 0.4), 'potion');
      this.game.ui.spawnText(this.pos, '+Vida', 'txt-heal');
    } else {
      if (this.mp >= this.stats.maxMP) return;
      // poción de recurso (§2): Furia +40 · Maná +45 % · Energía +100 %
      const def = resourceDefFor(this.cls);
      this.mp = Math.min(this.stats.maxMP, this.mp + potionResourceAmount(def, this.stats.maxMP));
      this.game.ui.spawnText(this.pos, `+${def.name}`, 'txt-mana');
    }
    this.potions[pot]--;
    this.game.sfx('potion');
  }

  faceToward(target) {
    const dx = target.x - this.pos.x, dz = target.z - this.pos.z;
    if (dx * dx + dz * dz > 0.0001) this.group.rotation.y = Math.atan2(dx, dz);
  }

  update(dt) {
    if (!this.alive) return;
    const g = this.game;

    // buffs (Paso 2: endHealPct = cura al ACABAR, p. ej. Furia Inmortal 20 %)
    let expired = false;
    for (const b of this.buffs) { b.t -= dt; if (b.t <= 0) expired = true; }
    if (expired) {
      const ends = this.buffs.filter(b => b.t <= 0 && b.stats?.endHealPct > 0);
      this.buffs = this.buffs.filter(b => b.t > 0);
      this.recompute();
      for (const b of ends) this.healSkill(this.stats.maxHP * b.stats.endHealPct / 100, b.id);
    }
    // multiplicadores de movimiento con duración (§3.7)
    for (const k in this.moveMuls || {}) { const m = this.moveMuls[k]; if (Number.isFinite(m.t)) { m.t -= dt; if (m.t <= 0) delete this.moveMuls[k]; } }

    // cooldowns y regeneración
    this.simT = (this.simT || 0) + dt;
    this.sinceCombat = (this.sinceCombat || 0) + dt;
    this.atkCd = Math.max(0, this.atkCd - dt);
    this.dodgeCd = Math.max(0, this.dodgeCd - dt);
    this.gcdT = Math.max(0, (this.gcdT || 0) - dt);
    if (this.actionLockT > 0) this.actionLockT = Math.max(0, this.actionLockT - dt);
    if (this.castLock > 0) this.castLock = Math.max(0, this.castLock - dt); // red de seguridad (windup/canalización)
    if (this.invulnT > 0) this.invulnT = Math.max(0, this.invulnT - dt);
    if (this.invisT > 0) this.invisT = Math.max(0, this.invisT - dt);
    if (this.unstoppableT > 0) this.unstoppableT = Math.max(0, this.unstoppableT - dt);
    if (this.slowImmuneT > 0) { this.slowImmuneT = Math.max(0, this.slowImmuneT - dt); this.slowT = 0; }
    if (this.shields?.length) { for (const s of this.shields) s.t -= dt; this.shields = this.shields.filter(s => s.t > 0 && s.amt > 0); }
    if (this.xpBoostT > 0) this.xpBoostT -= dt;
    for (const k in this.cds) this.cds[k] = Math.max(0, this.cds[k] - dt);
    // verbos (§3.6): avance de la carga, ventanas de relanzar, combos y posturas (game-skills)
    g.tickSkillVerbs?.(dt);
    // recurso de clase (resources.js §2): Furia se pierde fuera de combate; Maná/Energía regeneran
    tickResource(this, dt);
    this.hp = Math.min(this.stats.maxHP, this.hp + (0.4 + this.stats.vit * 0.02) * dt);
    this._leech = sustainRefill(this._leech, this.stats.maxHP, dt); // cubeta de sustento
    // ⑨ onTick de los poderes a 10 Hz (dt acumulado)
    if (this.hookIndex?.onTick) {
      this._tickAcc = (this._tickAcc || 0) + dt;
      while (this._tickAcc >= 0.1) { this._tickAcc -= 0.1; firePower('onTick', this, g, this, 0.1); this._passiveTick(g, 0.1); }
    } else if (this.passiveBehaviors?.length) {
      this._tickAcc = (this._tickAcc || 0) + dt;
      while (this._tickAcc >= 0.1) { this._tickAcc -= 0.1; this._passiveTick(g, 0.1); }
    } else this._tickAcc = 0;

    // salto en curso (tipo `leap`): vuela al destino, intocable; al caer, impacto
    if (this.leap) {
      const L = this.leap;
      L.t += dt;
      const k = Math.min(1, L.t / L.dur);
      this.pos.x = L.from.x + (L.to.x - L.from.x) * k;
      this.pos.z = L.from.z + (L.to.z - L.from.z) * k;
      const a = this.group.userData.anim;
      if (a) a.rig.position.y = Math.sin(k * Math.PI) * 1.4;
      if (k >= 1) {
        this.leap = null;
        if (a) a.rig.position.y = 0;
        try { L.onLand?.(); } catch (err) { console.warn('[salto] onLand', err); }
      }
      this.moving = true;
      this.stillT = 0;
      if (!this.leap && L.plant) this.plantNow();     // `plant: true`: al caer cuentas como plantado
      else { this.plantedT = 0; this.planted = false; }
      return;
    }
    // avance LENTO en curso (dash con dashT: lo mueve g.tickSkillVerbs): no se camina
    if (this.dashMove) { this.moving = true; this.stillT = 0; this.plantedT = 0; this.planted = false; return; }

    // ---- movimiento ----
    let dir = null;
    const key = g.input.keyDir;
    if (key) { dir = key; this.moveTarget = this.attackTarget = this.pickTarget = null; }

    if (!dir && this.attackTarget) {
      const t = this.attackTarget;
      if (!t.alive) { this.attackTarget = null; }
      else {
        const d = this.pos.distanceTo(t.pos);
        if (d <= this.basicReach()) {
          this.faceToward(t.pos);
          if (this.atkCd <= 0 && !g._charging) this.basicAttack(t);   // durante una carga no sale
        } else {
          dir = { x: t.pos.x - this.pos.x, z: t.pos.z - this.pos.z };
        }
      }
    }
    if (!dir && this.pickTarget) {
      const p = this.pickTarget;
      const d = this.pos.distanceTo(p.mesh.position);
      if (d < 1.0) { g.pickupGroundItem(p); this.pickTarget = null; }
      else dir = { x: p.mesh.position.x - this.pos.x, z: p.mesh.position.z - this.pos.z };
    }
    if (!dir && this.moveTarget) {
      const d = this.pos.distanceTo(this.moveTarget);
      if (d < 0.18) this.moveTarget = null;
      else dir = { x: this.moveTarget.x - this.pos.x, z: this.moveTarget.z - this.pos.z };
    }

    if (this.slowT > 0) this.slowT -= dt;
    // §3.7: Π de los multiplicadores de movimiento (preparar, cargar, canalizar, postura…)
    const spd = this.stats.spd * (this.slowT > 0 ? 0.55 : 1) * this.moveMulProduct();

    // esquiva en curso: voltereta de buceo (gira sobre los pies + arco de salto).
    // Velocidad con ease-out (sale rápido y frena) — se siente mucho más ágil.
    const a = this.group.userData.anim;
    if (this.dodgeT > 0) {
      this.dodgeT -= dt;
      const k = Math.max(0, this.dodgeT) / DASH_DUR;     // 1 → 0
      const speed = DASH_PEAK * k;                        // decelera hacia el final
      moveWithCollision(g.world.grid, this.pos, this.dodgeDir.x * speed * dt, this.dodgeDir.z * speed * dt);
      if (a) { a.rig.rotation.x = (1 - k) * Math.PI * 2; a.rig.position.y = Math.sin((1 - k) * Math.PI) * 0.22; }
      // estela de imágenes residuales (cada ~25ms)
      this.dashTrail = (this.dashTrail || 0) + dt;
      if (this.dashTrail >= 0.025) { this.dashTrail = 0; g.spawnDashGhost?.(this); }
      if (this.dodgeT <= 0 && a) { a.rig.rotation.x = 0; a.rig.position.y = 0; }
      this.moving = true;
      this.stillT = 0;
      this.plantedT = 0; this.planted = false;
      return;
    }

    let moving = false;
    if (dir && spd > 0) {
      const len = Math.hypot(dir.x, dir.z);
      if (len > 0.001) {
        const nx = dir.x / len, nz = dir.z / len;
        const before = this.pos.clone();
        moveWithCollision(g.world.grid, this.pos, nx * spd * dt, nz * spd * dt);
        if (this.pos.distanceToSquared(before) > 1e-8) {
          moving = true;
          this.group.rotation.y = Math.atan2(nx, nz);
        } else if (this.moveTarget) {
          this.moveTarget = null; // atascado contra un muro
        }
      }
    }

    this.moving = moving;       // Concentración (quieta) / Impulso (en movimiento)
    // PLANTADO (D20): 1 s sin caminar ni usar movilidad. Una preparación o carga con
    // keepPlanted (Sin Pausa) deja caminar sin romperlo
    if (moving && !g.keepsPlanted?.()) this.plantedT = 0;
    else this.plantedT = (this.plantedT || 0) + dt;
    this.planted = this.plantedT >= VERB_DEFAULTS.plantedAfter;
    // QUIETA: también la rompe cualquier desplazamiento entre fotogramas (rodar o un parpadeo
    // de un comportamiento, ser arrastrada); chocar contra un muro sin avanzar no la rompe
    const at = this._stillAt;
    const shifted = !at || (this.pos.x - at.x) ** 2 + (this.pos.z - at.z) ** 2 > STILL_EPS2;
    this.stillT = moving || shifted ? 0 : (this.stillT || 0) + dt;
    if (at) { at.x = this.pos.x; at.z = this.pos.z; } else this._stillAt = { x: this.pos.x, z: this.pos.z };

    // esquema WASD+ratón: el héroe MIRA hacia el cursor (apuntado libre), no hacia
    // su dirección de movimiento. En clic-mover o táctil (sin mouseWorld) se ignora.
    if (g.settings?.controlScheme !== 'click' && g.input?.mouseWorld) {
      const mw = g.input.mouseWorld;
      const dx = mw.x - this.pos.x, dz = mw.z - this.pos.z;
      if (dx * dx + dz * dz > 0.04) this.group.rotation.y = Math.atan2(dx, dz);
    }

    // ---- animación procedural del cuerpo articulado ----
    const t = performance.now() / 1000;
    this.swing = Math.max(0, this.swing - dt * 5);
    this.castPoseT = Math.max(0, (this.castPoseT || 0) - dt * 4);
    this.hurtT = Math.max(0, (this.hurtT || 0) - dt * 5);
    if (a) {
      const wt = (this._walkT = (this._walkT || 0) + dt * (moving ? 11 : 0));
      const sw = Math.sin(wt);
      const breathe = Math.sin(t * 2) * 0.012;
      // bob vertical: peso del paso al andar; respiración en reposo
      a.rig.position.y = moving ? Math.abs(sw) * 0.06 : breathe;
      // inclinación: se adelanta al correr; sacudida al recibir daño
      a.rig.rotation.x = (moving ? 0.13 : 0) - this.hurtT * 0.55;
      // squash en cada pisada (cambio de peso)
      const land = moving ? Math.max(0, -Math.cos(wt * 2)) * 0.045 : 0;
      a.torso.scale.y = 1 - land; a.torso.scale.x = a.torso.scale.z = 1 + land * 0.5;
      // piernas en contrafase
      if (a.legL) { a.legL.rotation.x = moving ? sw * 0.7 : 0; a.legR.rotation.x = moving ? -sw * 0.7 : 0; }
      // brazo izquierdo: contrabalanceo al andar / vaivén leve en reposo
      const idle = Math.sin(t * 1.5) * 0.05;
      a.armL.rotation.x = moving ? -sw * 0.55 : idle;
      // brazo derecho (activo): caminar + SLASH diagonal (anticipación→barrido→retorno) + pose de cast
      const raise = this.castPoseT * (this.castPoseDir || 0);
      const sa = this._swingArm();
      const ss = this.classId === 'guerrero' ? 1 : 0.6;   // el guerrero hace el slash completo
      a.armR.rotation.x = (moving ? sw * 0.55 : -idle) + (sa ? sa.x * ss : 0) + raise;
      a.armR.rotation.z = sa ? sa.z * ss : 0;
      // el cuerpo se inclina hacia el golpe (peso/follow-through)
      a.rig.rotation.z = sa ? sa.lean * ss : 0;
      // cabeza: contramovimiento al andar + respiración
      if (a.head) a.head.rotation.x = (moving ? -Math.sin(wt * 2) * 0.04 : breathe * 0.6);
      // capa con inercia: reacciona a la velocidad y al golpe
      const target = (moving ? 0.45 : 0.12) + this.swing * 0.7;
      this._capeSway = (this._capeSway || 0) + (target - (this._capeSway || 0)) * Math.min(1, dt * 8);
      if (a.capePiv) a.capePiv.rotation.x = -this._capeSway;
    }
  }

  // Slash diagonal del brazo derecho a partir de `this.swing` (1→0): carga arriba-
  // derecha (anticipación), barrido rápido abajo-izquierda (golpe) y recuperación.
  // Devuelve {x,z,lean} (rotaciones del hombro + inclinación del torso) o null.
  _swingArm() {
    const s = this.swing; if (s <= 0) return null;
    const p = 1 - s;                                  // fase 0 → 1
    if (p < 0.2) {                                    // anticipación: cargar arriba-derecha
      const w = p / 0.2;
      return { x: -1.4 * w, z: 0.7 * w, lean: 0.07 * w };
    }
    if (p < 0.5) {                                    // golpe: barrido diagonal abajo-izquierda
      const w = (p - 0.2) / 0.3;
      return { x: -1.4 + 1.1 * w, z: 0.7 - 1.7 * w, lean: 0.07 - 0.27 * w };
    }
    const w = (p - 0.5) / 0.5;                        // recuperación suave
    return { x: -0.3 * (1 - w), z: -1.0 * (1 - w), lean: -0.2 * (1 - w) };
  }

  // Dispara una pose breve de lanzamiento de habilidad. El tipo ajusta el gesto:
  // los buffs/área levantan más el brazo; los proyectiles/melee, un gesto corto.
  // Solo afecta a la pose visual del brazo (canal aparte del swing).
  castPose(type) {
    this.castPoseT = 1;
    this.castPoseDir = ['buff', 'area', 'shield', 'zone', 'taunt', 'channel', 'aoe_self', 'aoe_target'].includes(type) ? 1.7 : 1.1;
  }

  // Ataque básico de arma = GENERADOR (§2) y una habilidad más (cat:'basic'): su
  // coeficiente, ramas, soportes y poderes salen de resolveSkill. El recurso se
  // gana SOLO al acertar (Tajo/Embate: +extra por objetivo adicional).
  // ⑨ passiveTick de las activas conocidas (Inversión del Tiempo graba su historial)
  _passiveTick(g, dt) {
    for (const b of this.passiveBehaviors || []) {
      try { b.passiveTick(g, this, dt); } catch (err) { try { console.warn(`[activa ${b.id}] passiveTick`, err); } catch { /* */ } }
    }
  }

  // DETIENE un avance lento en curso (p.dashMove; Choque Frontal): no avanza más y llega donde está
  // (su llegada e impacto salen en el siguiente paso de los verbos, como al acabar). → true si había
  stopDash() {
    const d = this.dashMove;
    if (!d) return false;
    d.stopped = true;
    d.step = () => true;
    return true;
  }

  // ALCANCE del disparo del básico de arma (cola W2d): el de la definición forjada (def.range) o,
  // sin él, atkRange + 2 (lo que siempre voló), × prof.rangeMul (Dardo Veloz +20 %). Con `t` (s de
  // carga de un básico TENSADO), la escala de su carga: charge.scale.range da los metros (nunca
  // menos que sin tensar) y charge.scale.rangeAdd los SUMA (Vista Larga: +2 m por rango)
  basicRange(t = null) {
    const wb = weaponBasicOf(this.cls);
    const prof = wb ? resolveSkill(this, wb) : null;
    const def = prof?.def || wb;
    let base = def?.range > 0 ? def.range : (this.cls?.atkRange || 2) + 2;
    const ch = prof?.charge, sc = ch?.scale;
    if (t != null && sc) {
      const at = key => chargeCoefAt(sc[key], t, ch.min || 0, ch.max || 1) || 0;
      base = Math.max(base, at('range')) + Math.max(0, at('rangeAdd'));
    }
    return base * (prof?.rangeMul || 1);
  }
  // distancia a la que el básico se pone a disparar (clic-mover): atkRange y, a distancia, lo que el
  // perfil alarga el disparo. Cuerpo a cuerpo, atkRange
  basicReach() {
    const r = this.cls?.atkRange || 2;
    return this.cls?.ranged ? Math.max(r, this.basicRange() - 2) : r;
  }

  // opts.charge (Paso 2, básico tensable): { t, frac, perfect, coefMul, addPct, rangeMul? } de la suelta
  basicAttack(target, opts = {}) {
    const g = this.game;
    const atk = this.cls.atk || (this.cls.ranged ? 'arrow' : 'cleave');
    const wb = weaponBasicOf(this.cls);
    const prof = wb ? resolveSkill(this, wb) : null;
    const def = prof?.def || wb;
    // secuencia del básico (§3.6: seq { every, extra }): el N-ésimo ataque lleva extra
    const seq = def?.seq && g.seqAdvance ? g.seqAdvance(this, wb) : null;
    const ch = opts.charge || null;
    // ⑦ Paso 2c.2: el básico de ARMA también pasa por onCast (CastInfo.weapon = true):
    // Ráfaga Infinita cuenta sus disparos y un onCast puede forzar el crítico
    // (cast.forceCrit: Camuflaje) o cancelarlo (false)
    const cast = { sk: wb, prof, slot: 'lmb', target: target?.pos || null, enemy: target?.def ? target : null, weapon: true,
      seqNth: !!seq?.nth, seqIdx: seq?.idx || 0, charge: ch ? { t: ch.t, frac: ch.frac } : null, perfect: !!ch?.perfect };
    if (wb && prof && this.hookIndex?.onCast && firePower('onCast', this, g, this, cast) === false) return;
    // cadencia del perfil (Mano Rápida ×0,9), como los básicos que no son de arma
    this.atkCd = this.stats.atkTime * (prof?.cadence || 1);
    this.swing = 1;
    const coef = (prof ? prof.coef : 1) * (ch?.coefMul || 1);
    const bAdd = (prof?.addPct || 0) + (ch?.addPct || 0);
    const bCrit = prof?.critBonus || 0;
    const direct = prof?.dmgDirect || 0;   // +% al golpe directo (no a la salpicadura)
    const hitInfo = { skill: wb?.id || null, tags: prof?.tags || EMPTY_TAGS, elem: prof?.elem || null,
      forceCrit: !!(prof?.forceCrit || cast.forceCrit || (ch?.perfect && prof?.charge?.perfectCrit)) };
    const dmgOpts = { skill: hitInfo.skill, tags: hitInfo.tags, elem: hitInfo.elem, perfect: !!ch?.perfect };
    const avgHit = this.avgHit(coef, bAdd);
    // VFX/SFX del básico de la clase (fx-skills-<clase>.js) con los de su variante encima: el Dardo
    // suena `bolt`, la Cicuta deja su estela verde
    const fxBase = wb ? skillFxFor(wb.id) : null;
    const fx = wb ? skillFxFor(wb.id, def?.forged) : null;
    const fxp = x => (typeof x === 'string' ? (SKILL_FX_PRESETS[x] || x) : x);
    // recurso: SOLO al acertar (una vez por ataque, aunque haya multidisparo)
    let genGiven = false;
    const grantGen = (targets = 1) => {
      if (genGiven) return;
      genGiven = true;
      let add = prof ? prof.gen : (this.cls.resource?.gen || 0);
      if (prof?.genPerExtra && targets > 1) add = Math.min(Math.max(prof.genMax || 0, prof.gen), add + prof.genPerExtra * (targets - 1));
      gainResource(this, add);
    };
    // efectos de ramas/soportes sobre un enemigo REALMENTE golpeado
    const onHit = e => applyHitEffects(g, this, e, prof, avgHit);
    // robo de vida sobre el daño infligido de verdad (cubeta de sustento)
    const lifeHeal = (dealt) => { if (prof?.lifesteal && dealt > 0) this.leech(dealt * prof.lifesteal / 100); };

    if (atk === 'cleave') {
      // Guerrero: tajo amplio — golpea al objetivo y a los enemigos pegados
      const { dmg, crit } = this.rollDamage(coef, bCrit, bAdd + direct, target, hitInfo);
      const tpos = target.pos.clone();
      let dealtTotal = target.takeDamage(dmg, crit, dmgOpts) || 0;
      onHit(target);
      this.onDealHit();
      // game-feel: hit-stop seco SOLO en crítico (en cada golpe se sentía
      // como tirones); el golpe normal se refuerza con el destello/partículas. S0 (G08): 40 ms
      // (basicCrit), el peso grande queda para las habilidades que declaran `heavy`
      if (crit) g.hitStop?.('basicCrit');
      g.spawnBurst?.(tpos, crit ? 0xffffff : 0xffddaa, crit ? 8 : 5);
      if (target.alive && target.def.thorns)
        this.takeDamage(Math.max(1, Math.round(dmg * target.def.thorns)), target.def.level || 1);
      let targets = 1;
      // salpicadura del tajo con la definición FORJADA (Filo Ancho, Siega) y splashPct
      const cleaveCoef = coef * (def?.cleave ?? 0.5) * Math.max(0, 1 + (prof?.splashPct || 0) / 100);
      const cleaveR = def?.cleaveR ?? 2.0;
      for (const e of g.enemies) {
        if (e === target || !e.alive) continue;
        if (e.pos.distanceToSquared(target.pos) < cleaveR * cleaveR) {
          const r = this.rollDamage(cleaveCoef, bCrit, bAdd, e, hitInfo);
          dealtTotal += e.takeDamage(r.dmg, r.crit, dmgOpts) || 0;
          onHit(e);
          targets++;
        }
      }
      grantGen(targets); // el tajo solo se lanza con un objetivo a rango: siempre acierta
      lifeHeal(dealtTotal);
      g.spawnRing?.(target.pos.clone(), 1.4, 0xffbb66);
      // arco de chispas del tajo + impacto seco sobre el objetivo.
      const cp = tpos.clone(); cp.y = 1.0;
      g.emitFx?.(fxp(fx?.impact) || 'basicCleave', cp);
      g.emitFx?.(fxp(fx?.extra) || 'meleeHit', target.pos.clone().setY(1.0));
      g.sfx(fx?.sfx || 'hit');
      return;
    }

    // Maga (proyectil arcano) y Arquera (flecha): a distancia; el daño se TIRA AL
    // IMPACTAR (rollAt), con los bonos condicionados al objetivo real
    const arrow = atk === 'arrow';
    // color: el del VFX de la variante → el de la definición FORJADA (Saeta Ígnea, Cicuta) → el del
    // VFX base → el de la clase
    const varColor = fx !== fxBase && fx?.color != null && fx.color !== fxBase?.color ? fx.color : null;
    const color = varColor ?? def?.color ?? fxBase?.color ?? (arrow ? 0xe8d8a0 : 0xcc66ff);
    const speed = arrow ? 18 : 13;
    const size = arrow ? 0.09 : 0.17;
    // alcance del perfil (basicRange) y, en un básico tensado, el de su carga
    const chScale = prof?.charge?.scale;
    const scaled = !!(ch && (chScale?.range || chScale?.rangeAdd));
    let range = this.basicRange(scaled ? (ch.t ?? 0) : null);
    if (ch?.rangeMul > 0 && !scaled) range *= ch.rangeMul;
    // SALPICADURA nativa (clave `splash` del perfil, en prof.radius alrededor del impacto): golpes de
    // la habilidad con source 'splash'. Un enemigo recibe el ataque UNA vez (castHits: ni la flecha
    // que llega después ni otra salpicadura) y no repite con quien ya recibió esta habilidad en este
    // instante (el estallido de un poder: no se encadena)
    const splashR = prof?.splash > 0 && prof.radius > 0 ? prof.radius : 0;
    const splashAt = (e, c) => {
      if (!splashR || !e) return;
      const at = e.pos.clone().setY(0), now = this.simT;
      const sc = prof.splash * (prof.coef > 0 ? c / prof.coef : 1);
      let hits = 0;
      for (const o of g.enemies.slice()) {
        if (o === e || !o.alive || castHits?.has(o) || o._hitAt?.[hitInfo.skill] === now) continue;
        const r = splashR + 0.5 * (o.def?.scale || 1);
        if (o.pos.distanceToSquared(at) > r * r) continue;
        if (castHits instanceof Map) castHits.set(o, perTarget); else castHits?.add(o);
        const { dmg, crit } = this.rollDamage(sc, bCrit, bAdd, o, hitInfo);
        o.takeDamage(dmg, crit, { ...dmgOpts, color, source: 'splash' });
        onHit(o);
        hits++;
      }
      if (hits) this.onDealHit();
      g.spawnRing?.(at, splashR, color);
    };
    // proyectiles de la definición forjada (Disparo Disperso: count/spread) + multidisparo
    // (poder) + aspecto «Doble»/«Enjambre»; la secuencia (seq) añade los suyos al N-ésimo
    const count = Math.max(1, Math.floor(def?.count || 1)) + (prof?.proj || 0);
    // abanico que se cierra con la distancia al blanco y, contra un blanco SOLO, no se abre más que él
    // (S-arquera: fanW de Disparo Disperso; radio de impacto de un proyectil = 0,55 × escala, como
    // Projectile.update): a una rata sola le dan 2 flechas; en un grupo (otro enemigo a menos de 2 m) el
    // abanico sigue abierto para repartirse. Si apuntas a un punto (WASD), el blanco es el enemigo bajo la
    // mira (a menos de su radio + 0,4 m)
    const aimDist = Math.hypot(target.pos.x - this.pos.x, target.pos.z - this.pos.z);
    let aimR = 0;
    if (def?.count > 1 && def.fanW > 0) {
      let aimed = target.def ? target : null;
      if (!aimed) {
        let best = Infinity;
        for (const e of g.enemies || []) {
          if (!e.alive) continue;
          const d = Math.hypot(e.pos.x - target.pos.x, e.pos.z - target.pos.z);
          if (d < 0.55 * (e.def?.scale || 1) + 0.4 && d < best) { best = d; aimed = e; }
        }
      }
      const alone = aimed && !(g.enemies || []).some(o => o !== aimed && o.alive && o.pos.distanceToSquared(aimed.pos) < 4);
      if (alone) aimR = 0.55 * (aimed.def?.scale || 1);
    }
    const spread = def?.count > 1 ? fanSpread(def, aimDist, prof?.spread || 0, aimR) : 0;
    const baseAngle = Math.atan2(target.pos.x - this.pos.x, target.pos.z - this.pos.z);
    // fogonazo en la mano al lanzar (arcano para la maga, viento para la arquera).
    const muzzle = this.pos.clone().setY(1.0)
      .add(new THREE.Vector3(Math.sin(baseAngle) * 0.45, 0, Math.cos(baseAngle) * 0.45));
    g.emitFx?.(fxp(fx?.aura || fx?.trail) || (arrow ? 'basicArrow' : 'basicBolt'), muzzle);
    // sin escopetazo: un impacto por enemigo (con salpicadura, también entre flechas y salpicaduras);
    // perTarget > 1 (S-arquera: Disparo Disperso) deja que hasta N flechas del disparo den al mismo
    const perTarget = Math.max(1, prof?.perTarget || 1);
    const castHits = perTarget > 1 ? new Map() : (count > 1 || seq?.nth || splashR ? new Set() : null);
    const shoot = (a, c, pierce) => {
      const to = this.pos.clone().add(new THREE.Vector3(Math.sin(a) * 6, 0, Math.cos(a) * 6));
      g.spawnProjectile({
        from: this.pos.clone().setY(1.0), to: to.setY(1.0),
        speed: def?.speed || speed, range, friendly: true, color, size, pierce, castHits, perTarget,
        rollAt: e => this.rollDamage(c, bCrit, bAdd + direct, e, hitInfo), ...dmgOpts, hitOpts: ch?.perfect ? { perfect: true } : null,
        ...(fx?.impact ? { impactPreset: fxp(fx.impact) } : {}),
        // recurso, efectos de forja/soporte y robo de vida: al IMPACTAR (no al disparar).
        // Así también funcionan apuntando a un punto vacío ({pos: aim} en WASD).
        onHit: (e, dealt) => { grantGen(1); onHit(e); lifeHeal(dealt); splashAt(e, c); },
      });
    };
    for (let i = 0; i < count; i++) shoot(baseAngle + projFanOffset(i, count, spread), coef, !!prof?.pierce);
    // N-ésimo de la secuencia: proyectiles extra a los lados, alternos, hasta la semiapertura
    // `spread` (rad) (Tercera Flecha)
    if (seq?.nth) {
      const x = def.seq.extra || {};
      const n = Math.max(1, x.count || 1), half = Math.ceil(n / 2);
      for (let i = 0; i < n; i++) {
        const off = (i % 2 ? -1 : 1) * Math.ceil((i + 1) / 2) * (x.spread || 0.26) / half;
        shoot(baseAngle + off, coef * (x.coef ?? 1), x.pierce ?? !!prof?.pierce);
      }
    }
    g.sfx(fx?.sfx || (arrow ? 'shoot' : 'skill'));
  }
}

// ------------------------------------------------------------
// ENEMIGO
// ------------------------------------------------------------
let enemyUid = 1;

export class Enemy {
  constructor(game, def, pos) {
    this.game = game;
    this.def = def;
    this.uid = enemyUid++;
    this.hp = def.hp;
    this.maxHP = def.hp;
    this.alive = true;
    this.atkCd = rand(0.2, 1);
    this.slowT = 0;
    this.vulnT = 0;             // vulnerable (+% de daño recibido) por opciones de habilidad
    this.stunT = 0;             // aturdido (no se mueve ni ataca)
    this.stunDR = 0;            // rendimientos decrecientes del canal DURO (aturdir/congelar/empujar)
    this.rootT = 0;             // inmovilizado (no se mueve, sí ataca)
    this.rootDR = 0;            // rendimientos decrecientes del canal INMOVILIZAR
    this.frozenT = 0;           // congelado (aturdimiento de escarcha)
    this.slowPct = 0;           // magnitud de la ralentización activa (gana la más fuerte)
    this.silenceT = 0;          // silenciado/interrumpido
    this.tauntT = 0;            // provocado (objetivo forzado)
    this.tauntSrc = null;       // quién lo provocó (fuente de amenaza forzada)
    // Paso 2c.0 (§6): STAGGER (solo jefes) · AMENAZA · lanzamientos interrumpibles
    this.stagger = 0;           // 0–100: el control suma aquí en vez de aturdir al jefe
    this.staggerBrokenT = 0;    // Quebrantado (aturdido de verdad + Vulnerable)
    this.staggerLockT = 0;      // tras el Quebrantado, barra bloqueada (gris)
    this.threat = null;         // Map(fuente → amenaza); se crea al primer golpe
    this.threatTarget = null;   // objetivo actual por amenaza (null = el jugador)
    this.numbT = 0;             // Aterido (Escarcha en jefes): −30 % de movimiento, −15 % de vel. de ataque
    this.casting = null;        // lanzamiento visible { id, t, total, interruptible, run, onInterrupt }
    this.debuffs = {};          // saco DEBILIDAD: { id: { pct, t } } (una entrada por fuente)
    this.outWeak = {};          // daño SALIENTE debilitado: { id: { pct, t } } (Provocación)
    this.flashT = 0;
    this.fade = 0;
    this.lunge = 0;             // empuje de animación al atacar
    this.baseEmissive = def.glow || 0x000000; // campeones y élites brillan
    this.burnTick = 0;
    this.group = makeEnemyModel(def);
    this.group.position.copy(pos);
    this.spawnPos = pos.clone();   // punto de aparición: al que regresa si te pierde / entras a zona segura
    this.group.userData.enemy = this;
    // hereda la política de sombras de la calidad actual (gama baja = sin sombra)
    if (game.enemyShadows === false) {
      this.group.traverse(o => { if (o.isMesh) o.castShadow = false; });
    }
    // élites/campeones/jefes/goblin muestran su barra de vida SIEMPRE (no solo al
    // recibir daño), para que se distingan e identifiquen de un vistazo
    if (def.rank || def.boss || def.uber || def.goblin) {
      const bar = this.group.userData.bar;
      if (bar) bar.visible = true;
    }
    // aura visible bajo campeones y élites
    if (def.aura) {
      const aura = new THREE.Mesh(
        new THREE.RingGeometry(0.55, 0.78, 24),
        new THREE.MeshBasicMaterial({ color: def.aura, transparent: true, opacity: 0.5, side: THREE.DoubleSide }));
      aura.rotation.x = -Math.PI / 2;
      aura.position.y = 0.06;
      this.group.add(aura);
      this.aura = aura;
    }
  }

  get pos() { return this.group.position; }

  // Aturdimiento con RENDIMIENTOS DECRECIENTES (evita el bloqueo permanente con
  // Bola de Fuego/Mandoble + "Conmocionar"):
  //  - cada aturdimiento que se aplica suma resistencia (stunDR, 0..1) que decae
  //    sola con el tiempo (~0.12/s); la duración efectiva es dur × (1 − stunDR);
  //  - con stunDR ≥ 0.9 el enemigo es INMUNE hasta que la resistencia baje;
  //  - jefes/uber/jefes de mundo: duración ×0.35 y acumulan resistencia más rápido.
  // Un aturdimiento más corto que el que ya tiene no lo extiende ni suma DR.
  // Devuelve la duración aplicada (0 si no tuvo efecto).
  applyStun(dur) { return this.applyCC('stun', dur); }

  // CONTROL centralizado (Paso 2b.0, §6/§9.1.4) con rendimientos decrecientes por CANAL:
  //  - duro (stun/freeze/knock): +0,35 por aplicación (jefes ×0,35 de duración y +0,6)
  //  - inmovilizar (root): +0,25 por aplicación
  //  - ambos decaen 0,12/s y el enemigo es inmune con ≥0,9
  //  - slow: no acumula (gana el más fuerte), tope 70 % (jefes ×0,5)
  //  - interrupt: sin rendimientos; 6 s de inmunidad tras silenciar
  //  - taunt: objetivo forzado (los jefes sí se pueden provocar)
  //  - fear (cola W2d): huye de `from` (o de quien lo aplica) sin atacar; canal duro
  // opts = { src, pct (slow), from (knock/fear: origen), stagger (extra), noDR }.
  // noDR (S0, F2): un control CORTO que no suma resistencia (stun/freeze/knock/root): la resistencia
  // que ya haya lo acorta igual, pero no gasta la del control grande que venga detrás (las réplicas
  // de Montaña Viva no le quitan el aturdimiento a Arrollador).
  // Devuelve lo aplicado (0 = nada).
  // Paso 2c.0 (§6) — JEFES (boss/uber/jefe de mundo): el control duro, inmovilizar y
  // asustar NO los afectan: suman STAGGER (combat-math.staggerFromCC × staggerPct del
  // héroe); al llenarse la barra quedan QUEBRANTADOS (addStagger). Ralentizar sí se aplica
  // (×0,5) y además suma stagger si es ≥ 30 % (solo los segundos nuevos: slowStaggerSecs);
  // interrumpir corta su lanzamiento y suma 20; la provocación funciona igual.
  applyCC(kind, dur, opts = {}) {
    if (!(dur > 0) || !this.alive) return 0;
    // claves de talento del héroe que lo aplica (ccDurPct, freezeDur: combat-math), en un
    // único punto para todas las fuentes
    dur = ccDurationWithTalents(kind, dur, opts.src?.tv);
    const boss = isBossDef(this.def);
    if (boss) {
      const sp = opts.src?.stats?.staggerPct || 0;
      if (opts.stagger > 0) this.addStagger(opts.stagger, opts.src);
      if (kind === 'stun' || kind === 'freeze' || kind === 'root' || kind === 'knock' || kind === 'fear') {
        return this.addStagger(staggerFromCC(kind, dur, { staggerPct: sp }), opts.src, { raw: true });
      }
      if (kind === 'slow' && (opts.pct ?? 50) >= STAGGER_SLOW_MIN_PCT && this.staggerOpen()) {
        // ralentización reaplicada: solo los segundos que alargan la que ya llenó Quebranto (con
        // la barra cerrada no llena ni cuenta como pagada)
        const secs = slowStaggerSecs(dur, this.slowStagT);
        this.slowStagT = Math.max(this.slowStagT || 0, dur);
        if (secs > 0) this.addStagger(staggerFromCC('slow', secs, { pct: opts.pct ?? 50, staggerPct: sp }), opts.src, { raw: true });
      }
      if (kind === 'interrupt') this.addStagger(staggerFromCC('interrupt', dur, { staggerPct: sp }), opts.src, { raw: true });
    }
    switch (kind) {
      case 'stun': case 'freeze': {
        const dr = this.stunDR || 0;
        if (dr >= 0.9) return 0;                                   // inmune por ahora
        const d = dur * (1 - dr) * (boss ? 0.35 : 1);
        if (d < 0.05 || d <= (this.stunT || 0)) return 0;          // no mejora el actual
        this.stunT = d;
        if (kind === 'freeze') this.frozenT = Math.max(this.frozenT || 0, d);
        this.slowT = Math.max(this.slowT || 0, d);
        if (!opts.noDR) this.stunDR = Math.min(1, dr + (boss ? 0.6 : 0.35));
        return d;
      }
      case 'knock': {                                              // dur = metros de empuje
        if (boss) return 0;
        const dr = this.stunDR || 0;
        if (dr >= 0.9) return 0;
        const dist = dur * (1 - dr);
        const src = opts.from || this.game.player?.pos;
        if (src) {
          const dx = this.pos.x - src.x, dz = this.pos.z - src.z, l = Math.hypot(dx, dz) || 1;
          const nx = this.pos.x + dx / l * dist, nz = this.pos.z + dz / l * dist;
          if (this.game.world?.grid?.walkable(nx, nz)) { this.pos.x = nx; this.pos.z = nz; }
        }
        if (!opts.noDR) this.stunDR = Math.min(1, dr + 0.35);
        return dist;
      }
      case 'root': {
        const dr = this.rootDR || 0;
        if (dr >= 0.9) return 0;
        const d = dur * (1 - dr) * (boss ? 0.35 : 1);
        if (d < 0.05 || d <= (this.rootT || 0)) return 0;
        this.rootT = d;
        if (!opts.noDR) this.rootDR = Math.min(1, dr + 0.25);
        return d;
      }
      case 'slow': {
        const pct = Math.min(70, Math.max(1, opts.pct ?? 50) * (boss ? 0.5 : 1));
        if (this.slowT > 0 && pct < (this.slowPct || 0)) return 0;  // gana el más fuerte
        this.slowPct = pct;
        this.slowT = Math.max(this.slowT || 0, dur);
        return dur;
      }
      case 'interrupt': {
        if ((this.silenceImmuneT || 0) > 0) return 0;
        this.silenceT = dur;
        this.silenceImmuneT = dur + 6;
        this.castT = 0;
        this.interruptCast();            // corta el lanzamiento visible (enemy-abilities: interruptible)
        return dur;
      }
      case 'taunt': {
        this.forceTarget(opts.src || this.game.player, dur);
        return dur;
      }
      case 'fear': {                                               // huye (canal duro, como aturdir)
        const dr = this.stunDR || 0;
        if (dr >= 0.9) return 0;
        const d = dur * (1 - dr);
        if (d < 0.05 || d <= (this.fearT || 0)) return 0;
        const from = opts.from || opts.src?.pos || this.game.player?.pos;
        if (!from) return 0;
        this.fearT = d;
        this.fearFrom = { x: from.x, z: from.z };
        this._fleeSide = this.uid % 2 ? 1 : -1;                    // lado al rodear un muro (_fleeStep)
        this.stunDR = Math.min(1, dr + 0.35);
        this.interruptCast();                                      // corta un lanzamiento interrumpible
        return d;
      }
    }
    return 0;
  }

  // QUITA un control (cola W2d). 'freeze': la congelación y SOLO el aturdimiento que venía del hielo
  // (uno más largo de otra fuente sigue entero: Ruptura) · 'stun': aturdido y congelado · 'root',
  // 'slow', 'fear', 'silence'. No toca los rendimientos decrecientes. → true si quitó algo
  clearCC(kind) {
    const active = () => [this.stunT, this.frozenT, this.rootT, this.slowT, this.fearT, this.silenceT].filter(v => v > 0).length;
    const before = active();
    switch (kind) {
      case 'freeze':
        if (!(this.frozenT > 0)) return false;
        if ((this.stunT || 0) <= this.frozenT + 1e-6) this.stunT = 0;
        this.frozenT = 0;
        break;
      case 'stun': this.stunT = 0; this.frozenT = 0; break;
      case 'root': this.rootT = 0; break;
      case 'slow': this.slowT = 0; this.slowPct = 0; break;
      case 'fear': this.fearT = 0; this.fearFrom = null; break;
      case 'silence': this.silenceT = 0; break;
      default: return false;
    }
    return active() < before;
  }

  // Punto Débil (mark.firstCharged, cola W2d): ¿la marca `id` que `p` pone ahora puede llevar su
  // premio? `live` = la marca que tenía antes de ponerla (null: ninguna; omitido, la de ahora:
  // pregúntese ANTES de sobrescribirla). Si es de `p` y aún guarda el premio, es la misma
  // concesión; si no, como mucho una vez cada `icd` s (8 por defecto) por héroe aunque se
  // remarque. Si lo concede, lo apunta; preguntar otra vez en el mismo instante da lo mismo
  firstChargedOk(p, id, icd = FIRST_CHARGED_ICD, live = this.marks?.[id]) {
    if (!p) return true;
    if (live && live.t > 0 && live.by === p && live.firstCharged) return true;
    const now = p.simT || 0;
    const rec = this._firstAt || (this._firstAt = new WeakMap());   // héroe → { id: instante }
    let mine = rec.get(p);
    if (!mine) rec.set(p, mine = {});
    const at = mine[id];
    if (at != null) {
      const since = now - at;
      if (since <= 1e-9) return true;
      if (since < (icd ?? FIRST_CHARGED_ICD) - 1e-9) return false;
    }
    mine[id] = now;
    return true;
  }

  // ---------- STAGGER (Paso 2c.0, §6) ----------
  // Suma `n` a la barra (solo jefes; nada mientras está Quebrantado o bloqueada).
  // raw: n ya viene escalado por staggerPct (applyCC); si no, se escala aquí con el
  // staggerPct de `src`. A STAGGER_MAX → QUEBRANTADO STAGGER_BREAK_T s: aturdimiento
  // REAL (ignora la resistencia) + Vulnerable (saco Debilidad, no se suma a otro
  // Vulnerable); después la barra queda bloqueada STAGGER_LOCK_T s. Devuelve lo sumado.
  addStagger(n, src = null, { raw = false } = {}) {
    if (!(n > 0) || !this.alive || !isBossDef(this.def)) return 0;
    if (!this.staggerOpen()) return 0;
    const add = raw ? n : n * Math.max(0, 1 + (src?.stats?.staggerPct || 0) / 100);
    this.stagger = Math.min(STAGGER_MAX, (this.stagger || 0) + add);
    if (this.stagger >= STAGGER_MAX) this.breakStagger();
    return add;
  }
  // ¿la barra admite Quebranto? (ni Quebrantado ni bloqueada)
  staggerOpen() { return !(this.staggerBrokenT > 0 || this.staggerLockT > 0); }
  breakStagger() {
    this.stagger = 0;
    this.staggerBrokenT = STAGGER_BREAK_T;
    this.staggerLockT = STAGGER_BREAK_T + STAGGER_LOCK_T;
    this.stunT = Math.max(this.stunT || 0, STAGGER_BREAK_T);   // ignora stunDR
    this.vulnT = Math.max(this.vulnT || 0, STAGGER_BREAK_T);
    this.interruptCast();
    this.staggerBreaks = (this.staggerBreaks || 0) + 1;
    const g = this.game;
    try {
      // aviso grande en la franja del HUD (bajo el marco del jefe); sin HUD, texto flotante
      if (g.ui?.announce) g.ui.announce('¡QUEBRANTADO!', 'broken');
      else g.ui?.spawnText?.(this.pos.clone().add(new THREE.Vector3(0, (this.def.scale || 1) + 1.0, 0)), '¡QUEBRANTADO!', 'txt-crit', { big: true });
      g.addShake?.(0.3, 0.3);
      g.onStaggerBreak?.(this);
    } catch { /* headless */ }
  }
  // lectura para la UI (barra bajo la vida del jefe; 2d): null si no es jefe
  staggerView() {
    if (!isBossDef(this.def)) return null;
    return { value: this.stagger || 0, max: STAGGER_MAX, broken: this.staggerBrokenT > 0, locked: this.staggerLockT > 0 && !(this.staggerBrokenT > 0),
      brokenT: Math.max(0, this.staggerBrokenT || 0), lockT: Math.max(0, this.staggerLockT || 0) };
  }

  // ---------- AMENAZA y provocación (Paso 2c.0, §6) ----------
  // En solitario no cambia nada (una sola fuente: el jugador); el Señuelo o los
  // aliados del cooperativo son fuentes extra. Una fuente válida es un objeto con
  // { pos, alive, takeDamage(amount, nivel, opts) } (y opcional applySlow).
  addThreat(src, n) {
    if (!src || !(n > 0) || !this.alive) return;
    const m = this.threat || (this.threat = new Map());
    m.set(src, (m.get(src) || 0) + n);
  }
  threatOf(src) { return this.threat?.get(src) || 0; }
  // objetivo forzado durante `t` s y amenaza = máx. × 1,1 (los jefes SÍ se provocan)
  forceTarget(src, t) {
    if (!src || !(t > 0) || !this.alive) return 0;
    let max = 0;
    for (const v of this.threat?.values() || []) max = Math.max(max, v);
    const m = this.threat || (this.threat = new Map());
    m.set(src, Math.max(m.get(src) || 0, max * TAUNT_THREAT_BONUS, 1));
    this.tauntT = Math.max(this.tauntT || 0, t);
    this.tauntSrc = src;
    this.threatTarget = src;
    this.aggroed = true;
    return t;
  }
  // a quién persigue/ataca: provocación > amenaza (con histéresis 110 % cuerpo a
  // cuerpo / 130 % a distancia) > `fallback` (el jugador). Fuentes muertas se olvidan.
  combatTarget(fallback) {
    const ok = s => !!s && s.alive !== false && !!s.pos && typeof s.takeDamage === 'function';
    if (this.tauntT > 0 && ok(this.tauntSrc)) return this.tauntSrc;
    const m = this.threat;
    if (!m || m.size < 2) { this.threatTarget = null; return fallback; }
    for (const k of [...m.keys()]) if (!ok(k)) m.delete(k);
    let cur = ok(this.threatTarget) && m.has(this.threatTarget) ? this.threatTarget : (m.has(fallback) ? fallback : null);
    let best = cur, bv = cur ? m.get(cur) : -1;
    const need = (this.def.rangedAttack ? THREAT_SWITCH.ranged : THREAT_SWITCH.melee);
    for (const [k, v] of m) if (k !== cur && v > (cur ? bv * need : bv)) { best = k; bv = v; }
    this.threatTarget = best;
    return best || fallback;
  }

  // ---------- lanzamientos visibles (enemy-abilities: interruptible) ----------
  // Mientras lanza no se mueve ni ataca; Contrahechizo / Flecha Silenciadora (o
  // cualquier applyCC('interrupt')) lo cortan y no se ejecuta.
  beginCast(id, castT, run, { interruptible = true, onInterrupt = null } = {}) {
    if (!this.alive || this.casting) return false;
    if (this.silenceT > 0) return false;                       // silenciado: no puede lanzar
    if (!(castT > 0)) { run?.(); return true; }
    this.casting = { id, t: castT, total: castT, interruptible: !!interruptible, run, onInterrupt };
    this.castT = castT;
    return true;
  }
  interruptCast() {
    const c = this.casting;
    if (this.snipeFireT > 0) this.snipeFireT = 0;              // el disparo cargado también
    if (!c) return false;
    if (!c.interruptible && !(this.staggerBrokenT > 0)) return false;
    this.casting = null;
    this.castT = 0;
    try { c.onInterrupt?.(); } catch { /* */ }
    try { this.game.ui?.spawnText?.(this.pos.clone().add(new THREE.Vector3(0, (this.def.scale || 1) + 0.7, 0)), '¡Interrumpido!', 'txt-heal'); } catch { /* */ }
    return true;
  }
  tickCast(dt) {
    const c = this.casting;
    if (!c) return false;
    if (this.stunT > 0) return true;                           // aturdido: el lanzamiento espera
    c.t -= dt;
    this.castT = Math.max(0, c.t);
    if (c.t <= 0) {
      this.casting = null;
      this.castT = 0;
      try { c.run?.(); } catch (err) { console.warn(`[lanzamiento ${c.id}]`, err); }
    }
    return true;
  }

  // Entrada del saco DEBILIDAD: una por id (se refresca), `pct` puntos durante `dur` s
  applyWeakness(id, pct, dur) {
    if (!this.alive || !(dur > 0)) return;
    this.debuffs[id] = { pct: Math.max(0, pct || 0), t: dur };
  }
  weaknessPct() { return sumWeakness(this.debuffs); }
  // Debilita el daño que ESTE enemigo inflige (una entrada por id, se refresca;
  // tope −90 %). Lo aplica Player.takeDamage con opts.source = este enemigo.
  weakenOutgoing(id, pct, dur) {
    if (!this.alive || !(dur > 0) || !(pct > 0)) return;
    this.outWeak[id] = { pct: Math.min(90, pct), t: dur };
  }
  // multiplicador del daño saliente (Π de las entradas activas)
  outDmgMul() {
    let m = 1;
    for (const k in this.outWeak) m *= 1 - this.outWeak[k].pct / 100;
    return Math.max(0.1, m);
  }

  // Libera la memoria de GPU del modelo al quitar el enemigo de la escena: cada
  // enemigo crea sus PROPIAS geometrías/materiales (makeEnemyModel, aura, cáscara
  // de escudo). Las TEXTURAS (normal/roughness de charTex) están cacheadas y
  // compartidas → NO se liberan (material.dispose() no toca texturas).
  dispose() {
    if (this._disposed) return;
    this._disposed = true;
    this.group?.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose());
    });
  }

  // avanza el aturdimiento y su resistencia (llamado desde update)
  tickStun(dt) {
    if (this.stunT > 0) this.stunT -= dt;
    if (this.stunDR > 0) this.stunDR = Math.max(0, this.stunDR - dt * 0.12);
    if (this.rootT > 0) this.rootT -= dt;
    if (this.rootDR > 0) this.rootDR = Math.max(0, this.rootDR - dt * 0.12);
    if (this.frozenT > 0) this.frozenT -= dt;
    if (this.fearT > 0) { this.fearT -= dt; if (this.fearT <= 0) this.fearFrom = null; }
    if (this.silenceT > 0) this.silenceT -= dt;
    if (this.silenceImmuneT > 0) this.silenceImmuneT -= dt;
    if (this.tauntT > 0) { this.tauntT -= dt; if (this.tauntT <= 0) this.tauntSrc = null; }
    if (this.staggerBrokenT > 0) this.staggerBrokenT -= dt;
    if (this.staggerLockT > 0) this.staggerLockT -= dt;
    if (this.numbT > 0) this.numbT -= dt;
    for (const k in this.debuffs) { const d = this.debuffs[k]; d.t -= dt; if (d.t <= 0) delete this.debuffs[k]; }
    for (const k in this.outWeak) { const d = this.outWeak[k]; d.t -= dt; if (d.t <= 0) delete this.outWeak[k]; }
    // Paso 2: resistencia a los DESPLAZAMIENTOS y caducidad de las marcas (§3.6); en jefes, lo
    // que queda cubierto de ralentización y la resistencia al Quebranto por desplazar (cola W2d)
    if (this.dispDR > 0) this.dispDR = Math.max(0, this.dispDR - dt * DISPLACE_DR.decay);
    if (this.slowStagT > 0) this.slowStagT = Math.max(0, this.slowStagT - dt);
    if (this.dispStagDR > 0) this.dispStagDR = Math.max(0, this.dispStagDR - dt * STAGGER_DISPLACE_DR.decay);
    if (this.marks) for (const k in this.marks) { const m = this.marks[k]; if (m && Number.isFinite(m.t)) { m.t -= dt; if (m.t <= 0) delete this.marks[k]; } }
  }

  // DESPLAZAR (§3.6, §3.7): mueve `dist` m alejándolo de `from` (o hacia él con toward,
  // sin pasarse: se queda a 0,8 m). Rendimientos decrecientes propios (dispDR) y, a los
  // JEFES, ningún movimiento: suma Quebranto (combat-math.staggerFromDisplace) con su propia
  // resistencia a desplazamientos reaplicados (dispStagDR, STAGGER_DISPLACE_DR). Devuelve
  // los metros recorridos (0 = nada).
  displace(from, dist, { toward = false, src = null } = {}) {
    if (!this.alive || !from || !(dist > 0)) return 0;
    const g = this.game;
    if (isBossDef(this.def)) {
      // con la barra cerrada (Quebrantado o bloqueada) ni llena ni sube la resistencia
      if (!this.staggerOpen()) return 0;
      const sp = src?.stats?.staggerPct || 0;
      const dr = this.dispStagDR || 0;
      this.dispStagDR = Math.min(1, dr + STAGGER_DISPLACE_DR.add);
      this.addStagger(staggerFromDisplace(dist, sp, dr), src, { raw: true });
      return 0;
    }
    const dr = this.dispDR || 0;
    if (dr >= 0.9) return 0;
    let d = displaceDist(dist, dr, !!this.def.rank);
    const dx = this.pos.x - from.x, dz = this.pos.z - from.z, l = Math.hypot(dx, dz);
    if (l < 1e-4) return 0;
    const sgn = toward ? -1 : 1;
    if (toward) d = Math.min(d, Math.max(0, l - 0.8));
    if (!(d > 0.01)) return 0;
    const bx = this.pos.x, bz = this.pos.z;
    const grid = g.world?.grid;
    const ux = sgn * dx / l, uz = sgn * dz / l;
    // en pasos de 0,3 m: no atraviesa muros
    for (let left = d; left > 1e-6; left -= 0.3) {
      const s = Math.min(0.3, left);
      if (grid) moveWithCollision(grid, this.pos, ux * s, uz * s, 0.3);
      else { this.pos.x += ux * s; this.pos.z += uz * s; }
    }
    this.dispDR = Math.min(1, dr + DISPLACE_DR.add);
    return Math.hypot(this.pos.x - bx, this.pos.z - bz);
  }

  // Devuelve el daño REALMENTE infligido (0 si ya estaba muerto), para que el
  // robo de vida/efectos se calculen sobre impactos reales.
  // ④ Paso 2b.0 (sin ganchos): aplica el saco DEBILIDAD (Vulnerable + debilitamientos,
  // tope ×1,5) y los multiplicadores [×] del héroe (MULT_POWERS, máx. 3), resta la
  // vida y llama a ⑤ (Game.onPlayerHit → poderes onHit).
  // opts = { skill, tags:Set, elem, proc, dot, source, color, from }.
  //   proc: daño de un poder/espinas/explosión → sin Π[×] y no dispara onHit
  //   dot: tic de DoT o de campo → recibe Π[×] pero tampoco dispara onHit
  takeDamage(amount, crit = false, opts = {}) {
    if (!this.alive) return 0;
    this.aggroed = true; // ser golpeado despierta al enemigo al instante
    const raw = amount;
    amount *= weaknessMult(this.vulnT > 0 ? VULN_PCT : 0, sumWeakness(this.debuffs));
    // multiplicadores [×] del héroe (Furia, Sed de Batalla y los nodos clave de
    // talento): solo los MAX_MULT_ACTIVE mayores activos. No
    // aplican a los "procs" para que no se realimenten. (El daño al enemigo siempre
    // procede del jugador: la mascota no daña y los enemigos no se golpean entre sí.)
    const pl = this.game.player;
    if (pl && !opts.proc) {
      amount *= multiplierProduct(pl.powers, {
        hpFrac: pl.stats?.maxHP ? pl.hp / pl.stats.maxHP : 1,
        targetFrac: this.hp / this.maxHP, targetSlowed: this.slowT > 0 || this.frozenT > 0, crit, p: pl, e: this,
      }, pl.extraMultipliers);
    }
    amount = Math.max(1, Math.round(amount));
    const dealt = Math.max(0, Math.min(amount, this.hp));
    // último golpe recibido (KillInfo de ⑥ onKill)
    if (opts.skill) { this._lastSkill = opts.skill; this._lastTags = opts.tags || EMPTY_TAGS; }
    // instante del último golpe (no tic) de cada habilidad: la salpicadura del básico no repite en
    // quien ya la recibió en ese instante
    if (opts.skill && !opts.dot && pl) (this._hitAt || (this._hitAt = {}))[opts.skill] = pl.simT;
    this._lastCrit = !!crit;
    this.hp -= amount;
    // Paso 2c.0: amenaza (× threatMult del héroe) y stagger por daño (jefes)
    if (pl && dealt > 0) {
      this.addThreat(pl, threatFromDamage(dealt, pl.stats?.threatMult || 1));
      if (isBossDef(this.def)) this.addStagger(staggerFromDamage(dealt, this.maxHP, pl.stats?.staggerPct || 0), pl, { raw: true });
    }
    // destello BLANCO: ~70ms base, escala suave con el % de daño recibido
    const pct = Math.min(1, amount / Math.max(1, this.maxHP));
    this.flashT = 0.07 + pct * 0.08;
    if (this.hp > 0) this.hitT = 0.16 + pct * 0.12;   // squash de impacto (juice)
    const bar = this.group.userData.bar;
    bar.visible = true;
    const fg = this.group.userData.barFg;
    fg.scale.x = Math.max(0.001, this.hp / this.maxHP);
    fg.position.x = -0.43 * (1 - fg.scale.x);
    this.game.ui.spawnText(this.pos.clone().add(new THREE.Vector3(rand(-0.3, 0.3), this.def.scale, 0)),
      `${amount}${crit ? '!' : ''}`, crit ? 'txt-crit' : 'txt-dmg', { big: pct >= 0.18, color: opts.color });
    // KNOCKBACK físico: empuje breve alejándose del jugador, escalado por el daño
    // e inverso al tamaño del enemigo (masa). Jefes/uber son inamovibles.
    const immovable = this.def.boss || this.def.uber || this.def.worldBoss;
    if (!immovable && this.hp > 0) {
      const src = opts.from || this.game.player?.pos;
      if (src) {
        const dx = this.pos.x - src.x, dz = this.pos.z - src.z, l = Math.hypot(dx, dz) || 1;
        const k = Math.min(0.34, 0.12 + pct * 0.9) / Math.max(0.6, this.def.scale || 1) * (this.def.rank ? 0.5 : 1);
        const nx = this.pos.x + dx / l * k, nz = this.pos.z + dz / l * k;
        if (this.game.world?.grid?.walkable(nx, nz)) { this.pos.x = nx; this.pos.z = nz; }
        this.lunge = Math.max(this.lunge || 0, 0.6); // reacción de animación
      }
    }
    // impacto: hit-stop BREVE solo en golpes NOTABLES (peso a los momentos
    // grandes sin que cada impacto/AoE se sienta lento). hitStop usa max, así que
    // varios golpes en el mismo frame no se acumulan.
    const notable = this.def.boss || this.def.uber || this.def.worldBoss || this.def.rank;
    if (!this.game.settings?.reduceMotion) {
      if (this.hp <= 0 && notable) { this.game.hitStop?.(130); this.game.addShake?.(0.35, 0.35); }
      else if (crit && notable) { this.game.hitStop?.(55); this.game.sfx?.('crit'); }
      else if (pct >= 0.30) this.game.hitStop?.(45);
    }
    if (this.hp <= 0) this.die();
    // ⑤ punto único por impacto: poderes onHit (y, en 2c, indicadores de especialización)
    if (pl) {
      // Paso 2 (§3.6): perfect (suelta perfecta), step (paso de combo), repeat (réplica),
      // echo (repetición), detonated (este golpe detonó una marca), trap (estallido de trampa)
      const detonated = !!this._detPending; this._detPending = false;
      const hit = { dealt, raw, crit: !!crit, skill: opts.skill || null, tags: opts.tags || EMPTY_TAGS, elem: opts.elem || null,
        proc: !!opts.proc, dot: !!opts.dot, source: opts.source || (opts.proc ? 'proc' : opts.dot ? 'dot' : 'hit'),
        pos: { x: this.pos.x, z: this.pos.z },
        perfect: !!opts.perfect, step: opts.step || 0, repeat: opts.repeat || 0, echo: !!opts.echo, detonated, trap: opts.trap || null };
      const g = this.game;
      if (g.onPlayerHit) g.onPlayerHit(this, hit);
      else if (pl.hookIndex?.onHit) firePower('onHit', pl, g, pl, this, hit);
    }
    return dealt;
  }

  die() {
    this.alive = false;
    // los explosivos detonan al morir (con aviso para esquivar)
    if (this.def.explode)
      this.game.spawnTelegraph(this.pos.clone(), 2.2, 0.7, Math.round(this.def.dmg * 1.5), this.def.level || 1);
    this.game.onEnemyKilled(this);
  }

  // animación procedural barata: caminar (según movimiento del frame previo),
  // respiración en reposo, coletazo y "lunge" al atacar. Solo transforms.
  animate(dt) {
    const a = this.group.userData.anim;
    if (!a) return;
    const t = performance.now() / 1000;
    if (!this._apos) { this._apos = this.pos.clone(); this._aoff = Math.random() * 6.28; }
    const moved = this.pos.distanceTo(this._apos);
    this._apos.copy(this.pos);
    const moving = moved > 0.002;
    this.walkT = (this.walkT || 0) + dt * (moving ? 11 : 0);
    this.lunge = Math.max(0, (this.lunge || 0) - dt * 4);
    this.hitT = Math.max(0, (this.hitT || 0) - dt * 6);
    const sw = Math.sin(this.walkT);
    const lunge = this.lunge;
    const hit = this.hitT;     // squash de impacto (0 → ~0.28)

    if (a.slime) {
      // gelatina: salta aplastándose; al moverse, salto más marcado
      const k = moving ? 0.22 : 0.07;
      const w = Math.abs(Math.sin(t * (moving ? 9 : 2.2) + this._aoff));
      a.body.scale.y = a.sy * (1 - w * k) * (1 - hit * 1.4);
      a.body.scale.x = a.body.scale.z = a.sx * (1 + w * k * 0.5) * (1 + hit * 0.8);
      a.body.position.y = a.bodyY + (moving ? w * 0.12 : 0) + lunge * 0.2;
      return;
    }
    if (a.body) {
      a.body.position.y = a.bodyY + (moving ? Math.abs(sw) * 0.06 : Math.sin(t * 2 + this._aoff) * 0.02);
      a.body.position.z = a.bodyZ + lunge * 0.28;
      a.body.rotation.x = -lunge * 0.5 + (moving ? Math.sin(this.walkT * 2) * 0.04 : 0);
      // squash de impacto al recibir daño (sobre la escala base de la forma)
      if (a.bodyScale) a.body.scale.set(a.bodyScale.x * (1 + hit * 0.7), a.bodyScale.y * (1 - hit * 1.3), a.bodyScale.z * (1 + hit * 0.7));
    }
    if (a.head) a.head.rotation.x = lunge * 0.6 + (moving ? -Math.sin(this.walkT * 2) * 0.05 : 0);
    if (a.legs) {
      a.legs[0].rotation.x = moving ? sw * 0.7 : 0;
      a.legs[1].rotation.x = moving ? -sw * 0.7 : 0;
    }
    if (a.arms) {
      const idle = Math.sin(t * 1.5 + this._aoff) * 0.05;
      a.arms[0].rotation.x = -lunge * 1.2 + (moving ? -sw * 0.45 : idle);
      a.arms[1].rotation.x = -lunge * 1.2 + (moving ? sw * 0.45 : -idle);
    }
    if (a.tail) a.tail.rotation.y = Math.sin(this.walkT * 1.5 + t * (moving ? 0 : 1.5)) * (moving ? 0.5 : 0.18);
    if (a.lid) a.lid.rotation.x = a.lidBase - (moving ? Math.abs(sw) * 0.3 : 0) - lunge * 0.5;
  }

  // Paso 2 (§3.6): campos que cambian el movimiento enemigo (muros que BLOQUEAN, zonas que
  // CONTIENEN y cebos que ATRAEN; field-entities.js). Solo cuestan algo si hay campos de
  // ese tipo vivos (g._moveFields > 0): el cebo se evalúa a 5 Hz escalonado por enemigo y
  // sustituye SOLO el movimiento y la decisión (lo hace _updateAI tras los temporizadores).
  update(dt) {
    const g = this.game;
    if (!(g._moveFields > 0) || !this.alive) return this._updateAI(dt);
    const bx = this.pos.x, bz = this.pos.z;
    const r = this._updateAI(dt);
    if (this.alive) g.constrainMove?.(this, bx, bz);
    return r;
  }

  // velocidad de movimiento con su control: ralentizado ×0,45, aura de mando ×1,2, inmovilizado 0
  // y Aterido (Escarcha en jefes) −30 %
  _moveSpd() {
    return this.def.spd * (this.slowT > 0 ? 0.45 : 1) * (this.rallyT > 0 ? 1.2 : 1) * (this.rootT > 0 ? 0 : 1) * (this.numbT > 0 ? 0.7 : 1);
  }
  // un paso de HUIDA (miedo, cola W2d): se aleja de fearFrom. Contra un muro (avanza menos de la
  // mitad) lo rodea de lado con lo que le falta, siempre hacia el mismo (_fleeSide; en una esquina,
  // cambia de lado)
  _fleeStep(dt) {
    if (this.slowT > 0) this.slowT -= dt;
    const f = this.fearFrom, want = this._moveSpd() * dt;
    if (!f || !(want > 0)) return;
    let ux = this.pos.x - f.x, uz = this.pos.z - f.z;
    const l = Math.hypot(ux, uz);
    if (l < 1e-4) { ux = 0; uz = 1; } else { ux /= l; uz /= l; }
    const grid = this.game.world?.grid;
    const step = (x, z) => {
      if (grid) moveWithCollision(grid, this.pos, x, z, 0.3);
      else { this.pos.x += x; this.pos.z += z; }
    };
    const bx = this.pos.x, bz = this.pos.z;
    step(ux * want, uz * want);
    const moved = Math.hypot(this.pos.x - bx, this.pos.z - bz);
    if (moved < want * 0.5) {
      const side = this._fleeSide || 1, rest = want - moved;
      const sx = this.pos.x, sz = this.pos.z;
      step(-uz * side * rest, ux * side * rest);
      if (Math.hypot(this.pos.x - sx, this.pos.z - sz) < rest * 0.5) this._fleeSide = -side;
    }
    const mx = this.pos.x - bx, mz = this.pos.z - bz;
    if (mx * mx + mz * mz > 1e-10) this.group.rotation.y = Math.atan2(mx, mz);
  }

  _updateAI(dt) {
    const g = this.game;
    // afijo Escudado: si un golpe lo "mató" durante la ventana de inmunidad,
    // la inmunidad lo niega (revive a la vida que tenía al activar el escudo).
    // Resuelve aquí el caso de un burst letal sin tocar takeDamage().
    if (!this.alive && this.shieldT > 0 && this.def.shielded) {
      this.alive = true;
      this.hp = this.shieldHP || Math.max(1, Math.round(this.maxHP * 0.2));
      this.fade = 0; this._deathRoll = null;
      this.group.position.y = 0;
      this.group.rotation.x = 0; this.group.rotation.z = 0;
      this.group.scale.setScalar(1);
      const fg = this.group.userData.barFg;
      if (fg) { fg.scale.x = Math.max(0.001, this.hp / this.maxHP); fg.position.x = -0.43 * (1 - fg.scale.x); }
    }
    if (!this.alive) {
      // animación de muerte: "pop" breve, desplome de lado y hundimiento
      this.fade += dt;
      if (this._deathRoll == null) this._deathRoll = (Math.random() < 0.5 ? -1 : 1);
      const f = this.fade;
      const pop = f < 0.12 ? 1 + (0.12 - f) * 1.6 : 1;
      this.group.scale.setScalar(pop);
      this.group.position.y = -f * 1.0;
      this.group.rotation.x = Math.min(Math.PI / 2, f * 3.0);
      this.group.rotation.z = this._deathRoll * Math.min(0.55, f * 1.3);
      return f > 1.2; // true => eliminar
    }

    if (this.flashT > 0) this.flashT -= dt;
    if (this.vulnT > 0) this.vulnT -= dt;   // vulnerabilidad temporal
    this.tickStun(dt);                       // aturdimiento + rendimientos decrecientes
    // recorrer el modelo solo cuando el flash cambia de estado
    const flashing = this.flashT > 0;
    if (flashing !== this._flashState) {
      this._flashState = flashing;
      this.group.traverse(o => {
        if (o.isMesh && o.material && o.material.emissive)
          o.material.emissive.setHex(flashing ? 0xffffff : this.baseEmissive);
      });
    }

    // animación procedural de miembros: se OMITE para enemigos lejos de la
    // cámara (fuera de pantalla en isométrica). La IA/movimiento sigue corriendo;
    // solo nos ahorramos el vaivén de miembros cuando nadie lo ve.
    const pl = g.player;
    if (!pl || this.group.position.distanceToSquared(pl.pos) < 30 * 30) this.animate(dt);

    // MIEDO (applyCC 'fear'): huye de su origen sin atacar ni lanzar (aturdido, ni eso). Manda sobre el cebo
    if (this.fearT > 0) { if (!(this.stunT > 0)) this._fleeStep(dt); return false; }
    // CEBO (§3.6): un cebo armado lo atrae en lugar de moverse y decidir; los temporizadores
    // de arriba (Vulnerable, control, marcas, destello) siguen corriendo y un lanzamiento en
    // curso termina antes
    if (g._moveFields > 0 && !this.casting && g.lureStep?.(this, dt)) return false;

    // objetivo: provocación > amenaza > el jugador (Paso 2c.0; en solitario, el jugador)
    const player = pl ? this.combatTarget(pl) : pl;
    if (!player || !player.alive) return false;
    // héroe INVISIBLE (Camuflaje, Paso 2c.2): pierde el objetivo y no adquiere uno nuevo
    // mientras dura (se queda donde está; si te ve al acabar, vuelve a enzarzarse)
    if (player === pl && pl.invisT > 0) { this.aggroed = false; this.threatTarget = null; return false; }
    // ATURDIDO: ni se mueve ni ataca (la animación/flash siguen)
    if (this.stunT > 0) return false;
    // LANZANDO (habilidad interrumpible, enemy-abilities.js): quieto hasta terminar
    if (this.casting) { if (player.pos) this.group.rotation.y = Math.atan2(player.pos.x - this.pos.x, player.pos.z - this.pos.z); this.tickCast(dt); return false; }

    // --- goblin del tesoro: nunca ataca; huye y, si no lo cazas, escapa ---
    // Tres tipos, cada uno con una VENTANA REAL para alcanzarlo (melee o rango):
    //   'veloz'  → corre rápido pero se detiene a burlarse cada pocos segundos
    //   'cargado'→ lento (más que el jugador) y deja un reguero de oro
    //   'portal' → se teletransporta de cerca pero queda aturdido tras parpadear
    if (this.def.goblin) {
      if (this.slowT > 0) this.slowT -= dt;
      const type = this.def.goblinType || 'veloz';
      const dg = this.pos.distanceTo(player.pos);
      this.escapeT = (this.escapeT ?? 26) - dt;

      // estado de aturdimiento (portal): quieto y vulnerable
      this.gobStunT = Math.max(0, (this.gobStunT ?? 0) - dt);
      // estado de descanso/burla (veloz): quieto y vulnerable
      this.gobRestT = Math.max(0, (this.gobRestT ?? 0) - dt);

      // multiplicador de huida por tipo (relativo a su def.spd)
      let fleeMul = 1.25;
      if (type === 'cargado') fleeMul = 1.0;
      else if (type === 'portal') fleeMul = 0.9;

      let resting = false;

      if (type === 'veloz') {
        // ciclo correr / descansar: corre ~2.5s, descansa ~1.2s (ventana de golpe)
        if (this.gobRestT > 0) {
          resting = true;
        } else {
          this.gobRunT = (this.gobRunT ?? 2.5) - dt;
          if (this.gobRunT <= 0) { this.gobRunT = 2.5; this.gobRestT = 1.2; resting = true; }
        }
      } else if (type === 'portal') {
        if (this.gobStunT > 0) {
          resting = true; // aturdido tras parpadear
        } else {
          // se teletransporta lejos cuando te acercas, y queda aturdido al llegar
          this.gobBlinkCd = Math.max(0, (this.gobBlinkCd ?? 0) - dt);
          if (dg < 2.6 && this.gobBlinkCd <= 0 && dg > 0.01) {
            for (let t = 0; t < 8; t++) {
              const a = Math.random() * Math.PI * 2;
              const nx = this.pos.x + Math.sin(a) * 5, nz = this.pos.z + Math.cos(a) * 5;
              if (g.world.grid.walkable(nx, nz, 0.3) &&
                  Math.hypot(nx - player.pos.x, nz - player.pos.z) > dg) {
                g.spawnRing?.(this.pos.clone(), 0.9, 0xffd24a);
                this.pos.set(nx, 0, nz);
                this.gobBlinkCd = 4;
                this.gobStunT = 1.5; // ventana de golpe: queda aturdido
                g.sfx?.('portal');
                break;
              }
            }
          }
        }
      }

      const gspd = this.def.spd * (this.slowT > 0 ? 0.5 : 1) * (this.rootT > 0 ? 0 : 1) * fleeMul;

      if (resting) {
        // detenido (descansando, burlándose o aturdido): bamboleo en el sitio
        if (dg > 0.01) this.group.rotation.y = Math.atan2(player.pos.x - this.pos.x, player.pos.z - this.pos.z);
      } else if (dg < 11 && dg > 0.01) {
        // huye del jugador; si choca con un muro, lo rodea en perpendicular
        const nx = (this.pos.x - player.pos.x) / dg, nz = (this.pos.z - player.pos.z) / dg;
        const before = this.pos.clone();
        moveWithCollision(g.world.grid, this.pos, nx * gspd * dt, nz * gspd * dt, 0.3);
        if (this.pos.distanceToSquared(before) < 1e-7) {
          moveWithCollision(g.world.grid, this.pos, -nz * gspd * dt, nx * gspd * dt, 0.3);
          this.group.rotation.y = Math.atan2(-nz, nx);
        } else {
          this.group.rotation.y = Math.atan2(nx, nz);
        }
        // goblin cargado: va soltando un reguero de oro mientras huye
        if (type === 'cargado') {
          this.goldDripT = (this.goldDripT ?? 0) - dt;
          if (this.goldDripT <= 0) { this.goldDripT = 0.55; g.goblinGoldDrip?.(this); }
        }
      } else {
        // deambula despacio mientras no lo ves
        this.wanderT = (this.wanderT ?? 0) - dt;
        if (this.wanderT <= 0 || !this.wanderTarget) {
          this.wanderT = 1.5 + Math.random() * 2;
          const a = Math.random() * Math.PI * 2, r = 3 + Math.random() * 4;
          this.wanderTarget = this.pos.clone().add(new THREE.Vector3(Math.sin(a) * r, 0, Math.cos(a) * r));
        }
        const wt = this.wanderTarget, dw = this.pos.distanceTo(wt);
        if (dw > 0.5) {
          const nx = (wt.x - this.pos.x) / dw, nz = (wt.z - this.pos.z) / dw;
          moveWithCollision(g.world.grid, this.pos, nx * gspd * 0.5 * dt, nz * gspd * 0.5 * dt, 0.3);
          this.group.rotation.y = Math.atan2(nx, nz);
        }
      }
      const body = this.group.userData.body;
      // bamboleo más intenso al correr; suave al descansar/aturdido
      if (body) body.position.y = 0.75 + Math.abs(Math.sin(performance.now() / (resting ? 220 : 90))) * (resting ? 0.05 : 0.12);
      if (this.escapeT <= 0) { g.goblinEscape(this); return false; }
      return false;
    }

    // --- zona segura (campamento/pueblo): los enemigos NO entran. Si te
    // persiguen hasta el borde o tú entras, abandonan la caza y vuelven a su
    // punto de aparición (no pueden tocarte estando a salvo). Aplica a todos. ---
    const sz = g.world.safeZone;
    if (sz) {
      const inSafe = (x, z) => x >= sz.minX - 0.6 && x <= sz.maxX + 0.6 && z >= sz.minZ - 0.6 && z <= sz.maxZ + 0.6;
      if (inSafe(player.pos.x, player.pos.z) || inSafe(this.pos.x, this.pos.z)) {
        this.aggroed = false;
        const h = this.spawnPos || this.home || this.pos;
        const dh = this.pos.distanceTo(h);
        if (dh > 0.8) {
          const nx = (h.x - this.pos.x) / dh, nz = (h.z - this.pos.z) / dh;
          moveWithCollision(g.world.grid, this.pos, nx * this.def.spd * 1.2 * dt, nz * this.def.spd * 1.2 * dt, 0.3);
          this.group.rotation.y = Math.atan2(nx, nz);
          this.hp = Math.min(this.maxHP, this.hp + this.maxHP * 0.04 * dt); // se cura al volver
        }
        return false;
      }
    }

    // --- jefe de mundo: ronda su zona y, si lo alejas, vuelve a su spawn ---
    if (this.home) {
      const dh = this.pos.distanceTo(this.home);
      // si lo alejas más allá del leash, se compromete a regresar del todo
      // (no hace yo-yo en el borde persiguiéndote)
      if (this.aggroed && dh > this.leash) this.returning = true;
      if (this.returning) {
        // regresa a su spawn y se regenera; ignora al jugador hasta llegar
        const nx = dh > 0.01 ? (this.home.x - this.pos.x) / dh : 0, nz = dh > 0.01 ? (this.home.z - this.pos.z) / dh : 0;
        moveWithCollision(g.world.grid, this.pos, nx * this.def.spd * 1.4 * dt, nz * this.def.spd * 1.4 * dt, 0.3);
        this.group.rotation.y = Math.atan2(nx, nz);
        this.hp = Math.min(this.maxHP, this.hp + this.maxHP * 0.06 * dt);
        if (dh < this.leash * 0.5) { this.returning = false; this.aggroed = false; }
        return false;
      }
      if (!this.aggroed) {
        // patrulla lenta alrededor de su casa
        this.wanderT = (this.wanderT ?? 0) - dt;
        if (this.wanderT <= 0 || !this.wanderTarget) {
          this.wanderT = 2 + Math.random() * 2;
          const a = Math.random() * Math.PI * 2, r = Math.random() * this.leash * 0.6;
          this.wanderTarget = this.home.clone().add(new THREE.Vector3(Math.sin(a) * r, 0, Math.cos(a) * r));
        }
        const wt = this.wanderTarget, dw = this.pos.distanceTo(wt);
        if (dw > 0.6) {
          const nx = (wt.x - this.pos.x) / dw, nz = (wt.z - this.pos.z) / dw;
          moveWithCollision(g.world.grid, this.pos, nx * this.def.spd * 0.5 * dt, nz * this.def.spd * 0.5 * dt, 0.3);
          this.group.rotation.y = Math.atan2(nx, nz);
        }
        // aggro si entras en su área con visión
        if (this.pos.distanceToSquared(player.pos) <= 100) {
          this.losT = (this.losT ?? 0) - dt;
          if (this.losT <= 0) { this.losT = 0.2; this.hasLOS = g.world.grid.lineOfSight(this.pos.x, this.pos.z, player.pos.x, player.pos.z); }
          if (this.hasLOS) this.aggroed = true;
        }
        if (!this.aggroed) return false;
      }
    } else if (!this.aggroed) {
      // --- LOD: los enemigos dormidos razonan a intervalos, no cada frame ---
      this.thinkT = (this.thinkT ?? Math.random() * 0.35) - dt;
      if (this.thinkT > 0) return false;
      this.thinkT = 0.3 + Math.random() * 0.15;
      const aggroR = this.def.boss ? 12 : 9;
      if (this.pos.distanceToSquared(player.pos) > aggroR * aggroR) return false;
      this.hasLOS = g.world.grid.lineOfSight(this.pos.x, this.pos.z, player.pos.x, player.pos.z);
      if (!this.hasLOS) return false;
      this.aggroed = true;
    }

    // Aterido (Escarcha en jefes): −15 % de velocidad de ataque
    this.atkCd = Math.max(0, this.atkCd - dt * (this.numbT > 0 ? 0.85 : 1));
    if (this.slowT > 0) this.slowT -= dt;

    const d = this.pos.distanceTo(player.pos);
    // enemigos normales: si te alejas mucho, se duermen (los jefes de mundo no)
    if (!this.home && d > (this.def.boss ? 18 : 14)) { this.aggroed = false; return false; }

    // línea de visión (cada 0.2s): para decidir disparos/ataques
    this.losT = (this.losT ?? 0) - dt;
    if (this.losT <= 0) {
      this.losT = 0.2;
      this.hasLOS = g.world.grid.lineOfSight(this.pos.x, this.pos.z, player.pos.x, player.pos.z);
    }

    const aggro = this.def.boss ? 12 : 9;

    // aura pulsante; los ardientes queman de cerca
    if (this.aura) {
      this.aura.material.opacity = 0.35 + Math.sin(performance.now() / 200) * 0.2;
      if (this.def.burn && d < 2.0) {
        this.burnTick -= dt;
        if (this.burnTick <= 0) {
          this.burnTick = 0.5;
          // aura ardiente: daño de FUEGO (lo mitiga la resistencia, no la armadura)
          player.takeDamage(hazardDamage(3, this.def.level || 1), this.def.level || 1, { element: 'fire' });
        }
      }
      // aura de escarcha: ralentiza al jugador mientras esté cerca (sin daño)
      if (this.def.frostAura && d < 2.6) {
        player.applySlow?.(0.4, player._slowTotal || 0.4);
      }
      // niebla fría pulsante alrededor del portador del aura de escarcha
      if (this.def.frostAura) {
        this.frostFxT = (this.frostFxT ?? 0) - dt;
        if (this.frostFxT <= 0) { this.frostFxT = 0.6; g.enemyFrostAuraPulse?.(this.pos); }
      }
    }
    // aura de mando: potencia a los aliados cercanos (vel. de ataque) — el buff
    // se aplica de forma pasiva marcando a los enemigos próximos cada ~0.5s.
    if (this.def.rallyAura) {
      this.rallyTick = (this.rallyTick ?? 0) - dt;
      if (this.rallyTick <= 0) {
        this.rallyTick = 0.5;
        for (const e of g.enemies) {
          if (e === this || !e.alive || e.def.boss) continue;
          if (e.pos.distanceToSquared(this.pos) < 5 * 5) {
            e.rallyT = 0.7;
            // destellos ascendentes de exaltación sobre el aliado potenciado
            g.enemyRallyFx?.(e.pos);
          }
        }
      }
    }
    // beneficiado por un aura de mando aliada: ataca más rápido un instante
    this.rallyT = Math.max(0, (this.rallyT ?? 0) - dt);

    // aura de baluarte (Portaestandarte): otorga escudo/armadura temporal a los
    // aliados cercanos marcándolos cada ~0.6s (no toca su velocidad). El propio
    // portaestandarte también se beneficia. Contrajuego: matarlo retira el aura.
    if (this.def.wardAura) {
      this.wardTick = (this.wardTick ?? 0) - dt;
      if (this.wardTick <= 0) {
        this.wardTick = 0.6;
        for (const e of g.enemies) {
          if (!e.alive || e.def.boss) continue;
          if (e.pos.distanceToSquared(this.pos) < 5.5 * 5.5) e.wardT = 0.9;
        }
      }
    }
    // beneficiado por un aura de baluarte: escudo regenerativo. Mientras el aura
    // lo cubre, recupera vida lentamente (sin tocar takeDamage). Contrajuego:
    // matar al portaestandarte (cae el aura) o reventarlos con burst.
    if (this.wardT > 0) {
      this.wardT -= dt;
      if (this.hp < this.maxHP) {
        this.hp = Math.min(this.maxHP, this.hp + this.maxHP * 0.04 * dt);
        const fg = this.group.userData.barFg;
        if (fg) { fg.scale.x = Math.max(0.001, this.hp / this.maxHP); fg.position.x = -0.43 * (1 - fg.scale.x); }
      }
    }

    // afijo Encarcelador: telegrafía un anillo bajo tus pies con cooldown largo;
    // si no sales antes de que se llene, te enraíza brevemente (SLOW corto, sin
    // stun). El cooldown largo evita encadenarlo (DR efectiva).
    if (this.def.jail && this.hasLOS) {
      this.jailCd = Math.max(0, (this.jailCd ?? 3) - dt);
      if (this.jailCd <= 0 && d < 8 && d > 0.01) {
        this.jailCd = 9;
        g.enemyJail?.(this, player.pos.clone());
      }
    }
    // afijo Vórtice: una sola vez, cuando se acerca, telegrafía y te atrae.
    if (this.def.vortex && !this.vortexUsed && this.hasLOS && d < 7 && d > 2.5) {
      this.vortexUsed = true;
      g.enemyVortex?.(this);
    }
    // afijo Escudado: gana inmunidad periódica visible. Mientras dura, restaura
    // la vida perdida (la inmunidad se resuelve aquí sin tocar takeDamage) y
    // brilla con fuerza. Contrajuego: esperar a que caiga (ventana clara).
    if (this.def.shielded) {
      this.shieldCd = Math.max(0, (this.shieldCd ?? 5) - dt);
      if (this.shieldT > 0) {
        this.shieldT -= dt;
        this.hp = this.shieldHP ?? this.hp; // niega el daño recibido durante la ventana
        if (this.aura) this.aura.material.opacity = 0.75;
        if (this.shieldT <= 0 && this.shieldShell) { this.shieldShell.visible = false; }
      } else if (this.shieldCd <= 0) {
        this.shieldCd = 8;
        this.shieldT = 2.0;
        this.shieldHP = this.hp;
        g.enemyShield?.(this);
      }
    }

    const spd = this._moveSpd();

    // cobardes: con poca vida huyen de ti, pero EN RÁFAGAS — corren ~1.5s y
    // luego se cansan ~1.5s (se ralentizan y se dan la vuelta), dando una
    // ventana real para alcanzarlos. Ya no huyen indefinidamente.
    if (this.def.coward && this.hp < this.maxHP * 0.3 && d < 6 && d > 0.01) {
      this.cowardPhaseT = (this.cowardPhaseT ?? 0) - dt;
      if (this.cowardPhaseT <= 0) {
        // alterna entre huir y cansarse
        this.cowardFleeing = !this.cowardFleeing;
        this.cowardPhaseT = this.cowardFleeing ? 1.5 : 1.5;
      }
      if (this.cowardFleeing) {
        const nx = (this.pos.x - player.pos.x) / d, nz = (this.pos.z - player.pos.z) / d;
        moveWithCollision(g.world.grid, this.pos, nx * spd * dt, nz * spd * dt, 0.3);
        this.group.rotation.y = Math.atan2(nx, nz);
        return false;
      }
      // cansado: se gira hacia el jugador y avanza muy despacio (alcanzable);
      // si el jugador está en rango, deja que el bloque de ataque actúe.
      this.group.rotation.y = Math.atan2(player.pos.x - this.pos.x, player.pos.z - this.pos.z);
      if (d > this.def.range) {
        const nx = (player.pos.x - this.pos.x) / d, nz = (player.pos.z - this.pos.z) / d;
        moveWithCollision(g.world.grid, this.pos, nx * spd * 0.35 * dt, nz * spd * 0.35 * dt, 0.3);
        return false;
      }
    }

    // brujos: se teletransportan lejos si te acercas demasiado
    this.blinkCd = Math.max(0, (this.blinkCd || 0) - dt);
    if (this.def.blink && this.blinkCd <= 0 && d < 2.6 && this.hasLOS) {
      for (let t = 0; t < 8; t++) {
        const a = Math.random() * Math.PI * 2;
        const nx = this.pos.x + Math.sin(a) * 5, nz = this.pos.z + Math.cos(a) * 5;
        if (g.world.grid.walkable(nx, nz, 0.3) &&
            Math.hypot(nx - player.pos.x, nz - player.pos.z) > d) {
          g.spawnRing(this.pos.clone(), 0.8, 0xaa66ff);
          const fromPos = this.pos.clone();
          this.pos.set(nx, 0, nz);
          // implosión en el origen + aparición sombría en el destino
          g.enemyBlinkFx?.(fromPos, this.pos.clone());
          this.blinkCd = 5;
          g.sfx('eshoot');
          break;
        }
      }
    }

    // afijo Cadenas: el pack comparte el daño. Cada frame igualamos a todos los
    // miembros vivos a la fracción de vida MÁS BAJA del grupo (el daño a uno
    // arrastra a todos: caen juntos). Nunca cura (solo propaga pérdidas).
    if (this.chainId && g.chains && g.chains[this.chainId]) {
      const members = g.chains[this.chainId].filter(e => e.alive);
      if (members.length > 1) {
        let minFrac = 1;
        for (const e of members) minFrac = Math.min(minFrac, e.hp / e.maxHP);
        for (const e of members) {
          const target = minFrac * e.maxHP;
          if (e.hp > target + 0.01) {
            e.hp = target;
            const fg = e.group.userData.barFg;
            if (fg) { fg.scale.x = Math.max(0.001, e.hp / e.maxHP); fg.position.x = -0.43 * (1 - fg.scale.x); e.group.userData.bar.visible = true; }
            if (e.hp <= 0 && e.alive) e.die();
          }
        }
      }
    }

    // francotirador: tras la línea de aviso, dispara el proyectil cargado
    if (this.snipeFireT > 0) {
      this.snipeFireT -= dt;
      if (this.snipeFireT <= 0) g.fireSnipe?.(this);
    }

    // enemigo activo: mira, usa mecánicas, ataca o persigue
    {
      this.group.rotation.y = Math.atan2(player.pos.x - this.pos.x, player.pos.z - this.pos.z);

      // mecánicas especiales de jefe
      if (this.def.mechanic) {
        if (this.def.mechanic === 'summon') {
          if (!this.summoned && this.hp < this.maxHP * 0.5) {
            this.summoned = true;
            if (g.enemyCast) g.enemyCast(this, 'bossSummon'); else g.bossSummon(this);   // interrumpible
          }
        } else if (this.def.mechanic === 'charge') {
          // Embestidor: máquina de estados. Marca tu posición (telegrafía la
          // línea ~1s), embiste en línea recta aplicando SLOW (no stun), y queda
          // vulnerable ~1.5s tras la carga. Maneja su propio movimiento y sale.
          if (this.updateCharge(dt, player, d)) return false;
        } else {
          this.mechCd = (this.mechCd ?? 4) - dt;
          if (this.mechCd <= 0) {
            // las de lanzamiento visible pasan por g.enemyCast (interrumpibles, enemy-abilities.ENEMY_CASTS)
            const cast = (id, ...a) => (g.enemyCast ? g.enemyCast(this, id, ...a) : g[id]?.(this, ...a));
            if (this.def.mechanic === 'frost_nova' && d < 7) { this.mechCd = 6; cast('bossFrostNova'); }
            else if (this.def.mechanic === 'fire_pool' && d < 11) { this.mechCd = 5; g.spawnFirePool(player.pos.clone()); }
            // telaraña/escarcha telegrafiada: avisa y, si no esquivas, te ralentiza
            else if (this.def.mechanic === 'web' && d < 9 && this.hasLOS) { this.mechCd = 5; g.enemyWeb(this, player.pos.clone()); }
            // abanico de proyectiles hacia el jugador (esquivable)
            else if (this.def.mechanic === 'fan' && d < 11 && this.hasLOS) { this.mechCd = 4.5; g.enemyFan(this, player.pos.clone()); }
            // Nigromante: invoca 2 esqueletos con anillo visible (~8s)
            else if (this.def.mechanic === 'raise' && d < 10 && this.hasLOS) { this.mechCd = 8; cast('enemyRaise'); }
            // Acólito: cura a un aliado herido cercano con un haz visible (~3s)
            else if (this.def.mechanic === 'heal') { this.mechCd = 3; cast('enemyHeal'); }
            // Sembrador: sin habilidad activa; su efecto es al morir (split)
            else if (this.def.mechanic === 'split') { this.mechCd = 4; }
            // Francotirador: disparo cargado de largo alcance con línea de aviso
            else if (this.def.mechanic === 'snipe' && d < 14 && this.hasLOS) { this.mechCd = 4; g.enemySnipe(this, player.pos.clone()); }
          }
        }
      }

      const range = this.def.range;
      if (d <= range && this.hasLOS) {
        if (this.atkCd <= 0) {
          this.atkCd = this.def.atkTime * (this.rallyT > 0 ? 0.8 : 1);
          this.lunge = 1;   // arremetida visual al atacar
          if (this.def.rangedAttack && d > 2.2) {
            g.spawnProjectile({
              from: this.pos.clone().setY(1.1), to: player.pos.clone().setY(1.0),
              speed: this.def.projSpeed || 8, range: range + 3,
              dmg: this.def.dmg, friendly: false, color: this.def.projColor || 0xaa44ff, size: 0.16,
              attackerLevel: this.def.level || 1, source: this,
            });
            g.sfx('eshoot');
          } else if (this.def.slam) {
            // golpe pesado telegrafiado: avisa, pero castiga fuerte si no lo esquivas
            g.spawnTelegraph(player.pos.clone(), 1.6, 0.65, Math.round(this.def.dmg * 1.5), this.def.level || 1,
              { onDone: (at) => g.enemySlamFx?.(at), source: this });
          } else {
            player.takeDamage(this.def.dmg, this.def.level || 1, { melee: true, source: this });
            // chispa breve en el punto de golpe (impacto cuerpo a cuerpo)
            if (player.alive) g.enemyMeleeFx?.(player.pos);
          }
        }
      } else {
        // jefes con ataque a distancia (rangedChance): fuera de su alcance melee
        // pueden lanzarte un proyectil mientras te persiguen
        this.tryRangedVolley(d, player);
        // perseguir; los tiradores mantienen distancia
        const stop = this.def.rangedAttack ? range * 0.8 : 0;
        if (d > stop) {
          const nx = (player.pos.x - this.pos.x) / d, nz = (player.pos.z - this.pos.z) / d;
          moveWithCollision(g.world.grid, this.pos, nx * spd * dt, nz * spd * dt, 0.3);
        }
      }
      void aggro;
    }
    return false;
  }

  // Ataque a distancia de JEFE (def.rangedChance): antes nunca se disparaba porque
  // la condición era d > 2.2 && d <= range con range 2.2 (melee). Ahora, cuando
  // estás FUERA de su alcance melee pero a tiro (def.rangedRange, por defecto 10)
  // y con línea de visión, cada vez que su ataque está listo tira rangedChance:
  // si sale, dispara; si no, espera medio ciclo (sin re-tirar cada frame).
  // Devuelve true si disparó.
  tryRangedVolley(d, player) {
    const def = this.def;
    if (!(def.rangedChance > 0) || !def.rangedAttack) return false;
    if (d <= def.range || d > (def.rangedRange || 10) || this.hasLOS === false) return false;
    if (this.atkCd > 0) return false;
    const g = this.game;
    if (Math.random() >= def.rangedChance) { this.atkCd = def.atkTime * 0.5; return false; }
    this.atkCd = def.atkTime * (this.rallyT > 0 ? 0.8 : 1);
    this.lunge = 1;
    g.spawnProjectile({
      from: this.pos.clone().setY(1.1), to: player.pos.clone().setY(1.0),
      speed: def.projSpeed || 8, range: (def.rangedRange || 10) + 3,
      dmg: def.dmg, friendly: false, color: def.projColor || 0xaa44ff, size: 0.22,
      attackerLevel: def.level || 1, source: this,
    });
    g.sfx?.('eshoot');
    return true;
  }

  // Embestidor: ciclo windup → dash → recuperación. Devuelve true mientras el
  // ciclo controla al enemigo (movimiento propio); false para usar la IA normal.
  // Anti-feel-bad: el aviso (línea telegrafiada) precede a la carga; el impacto
  // aplica SLOW breve (no stun) y al terminar queda vulnerable un rato.
  updateCharge(dt, player, d) {
    const g = this.game;
    this.chargeState = this.chargeState || 'idle';
    this.chargeCd = Math.max(0, (this.chargeCd ?? 2.5) - dt);

    if (this.chargeState === 'idle') {
      if (this.chargeCd <= 0 && d < 9 && d > 2.2 && this.hasLOS) {
        // marca tu posición actual y telegrafía la línea de carga
        this.chargeState = 'windup';
        this.windupT = 1.0;
        const dx = player.pos.x - this.pos.x, dz = player.pos.z - this.pos.z;
        const l = Math.hypot(dx, dz) || 1;
        this.chargeDir = { x: dx / l, z: dz / l };
        g.enemyChargeWarn?.(this, this.chargeDir, Math.min(9, l + 1.5));
        return true;
      }
      return false; // sin carga: IA normal
    }

    if (this.chargeState === 'windup') {
      // se prepara: quieto, mirando la dirección marcada (ventana de escape)
      this.windupT -= dt;
      this.group.rotation.y = Math.atan2(this.chargeDir.x, this.chargeDir.z);
      if (this.windupT <= 0) { this.chargeState = 'dash'; this.dashT = 0.55; this.chargeHit = false; }
      return true;
    }

    if (this.chargeState === 'dash') {
      this.dashT -= dt;
      const dashSpd = this.def.spd * 4.5;
      const before = this.pos.clone();
      moveWithCollision(g.world.grid, this.pos, this.chargeDir.x * dashSpd * dt, this.chargeDir.z * dashSpd * dt, 0.3);
      // impacta una sola vez si pasa cerca del jugador: daño + SLOW (no stun)
      if (!this.chargeHit && player.alive && this.pos.distanceTo(player.pos) < 1.4) {
        this.chargeHit = true;
        player.takeDamage(this.def.dmg, this.def.level || 1, { melee: true, source: this });
        player.applySlow?.(1.2);
        g.addShake?.(0.18, 0.2);
        // polvo al impactar la embestida (físico/marrón)
        g.enemyChargeImpact?.(player.pos);
      }
      // termina al agotar tiempo o al chocar con un muro
      if (this.dashT <= 0 || this.pos.distanceToSquared(before) < 1e-7) {
        this.chargeState = 'recover'; this.recoverT = 1.5;
      }
      return true;
    }

    if (this.chargeState === 'recover') {
      // vulnerable: quieto y tambaleante tras la carga
      this.recoverT -= dt;
      const body = this.group.userData.body;
      if (body) body.rotation.z = Math.sin(performance.now() / 90) * 0.18;
      if (this.recoverT <= 0) {
        if (body) body.rotation.z = 0;
        this.chargeState = 'idle';
        this.chargeCd = 3.5;
      }
      return true;
    }
    return false;
  }
}

// ------------------------------------------------------------
// PROYECTIL
// ------------------------------------------------------------
export class Projectile {
  constructor(game, opts) {
    this.game = game;
    this.friendly = opts.friendly;
    this.dmg = opts.dmg;
    this.crit = opts.crit || false;
    // Paso 2b.0: los proyectiles del jugador TIRAN EL DAÑO AL IMPACTAR —
    // rollAt(e) → { dmg, crit } (Player.rollDamage con el objetivo real: bonos
    // condicionados al objetivo). Sin rollAt se usan dmg/crit fijos (enemigos, rebotes).
    this.rollAt = typeof opts.rollAt === 'function' ? opts.rollAt : null;
    this.skill = opts.skill || null;
    this.tags = opts.tags || null;
    this.elem = opts.elem || null;
    this.pierce = opts.pierce || false;
    this.slow = opts.slow || 0;
    this.slowPct = opts.slowPct || 0;
    this.attackerLevel = opts.attackerLevel || 1;
    this.source = opts.source || null;   // enemigo que lo disparó (daño saliente debilitado)
    this.missed = false;                 // proyectil enemigo que FALLÓ al héroe (sigue de largo)
    this.hitSet = new Set();
    // SIN ESCOPETAZO (Paso 2b.2): los proyectiles de un mismo lanzamiento que
    // comparten `castHits` golpean a cada enemigo UNA vez (los extra de
    // Multiproyectil/Doble/Vendaval cubren más enemigos, no multiplican el daño a uno)
    this.castHits = opts.castHits || null;
    // Paso 2: `perTarget` > 1 (Andanada Cerrada): castHits es un Map de impactos por enemigo
    // y cada uno admite hasta perTarget proyectiles del mismo lanzamiento
    this.perTarget = Math.max(1, opts.perTarget || 1);
    // datos del lanzamiento que viajan al HitInfo (§3.6: perfect, step, repeat, echo)
    this.hitOpts = opts.hitOpts || null;
    // callback al IMPACTAR de verdad (e, dañoInfligido): DoT/aturdir/vulnerable/
    // encadenado/robo de vida/recurso se aplican aquí, no al lanzar
    this.onHit = typeof opts.onHit === 'function' ? opts.onHit : null;
    this.color = opts.color || 0xffffff; // color del estallido al impactar
    // estela + impacto con partículas (motor js/particles.js); personalizable por el llamador
    this._hex = '#' + (((this.color >>> 0) & 0xffffff).toString(16).padStart(6, '0'));
    this._trailT = 0;
    this.trailPreset = opts.trailPreset || { texture: 'glow', count: 1, burst: true, lifetime: [0.2, 0.32], shape: 'point', speed: [0, 0.3], drag: 3, size: { start: [0.16, 0.22], end: 0 }, color: { start: this._hex, end: this._hex }, alpha: { start: 0.5, end: 0 } };
    this._autoImpact = !opts.impactPreset;
    this.impactPreset = opts.impactPreset || { texture: 'glow', count: this.crit ? 16 : 9, burst: true, lifetime: [0.25, 0.5], shape: 'sphere', shapeRadius: 0.12, speed: [1.2, this.crit ? 4.5 : 3], gravity: -2, drag: 2.5, size: { start: [0.2, 0.32], end: 0 }, color: { start: this._hex, end: this._hex }, alpha: { start: 0.9, end: 0 } };

    const dir = opts.to.clone().sub(opts.from);
    dir.y = 0;
    if (dir.lengthSq() < 0.001) dir.set(0, 0, 1);
    dir.normalize();
    this.vel = dir.multiplyScalar(opts.speed);
    this.life = (opts.range || 10) / opts.speed;

    this.mesh = new THREE.Mesh(
      new THREE.SphereGeometry(opts.size || 0.14, 8, 6),
      new THREE.MeshBasicMaterial({ color: opts.color || 0xffffff })
    );
    this.mesh.position.copy(opts.from);
  }

  // estallido/anillo en el punto de impacto (la "Bola de Fuego" explota)
  burst() {
    const g = this.game;
    const at = this.mesh.position.clone();
    if (g.psys) g.psys.emit(this.impactPreset, at);
    else g.spawnBurst?.(at, this.color, this.crit ? 6 : 4);
    if (this.crit) g.spawnRing?.(at, 0.8, this.color); // anillo extra solo en crítico
  }

  // devuelve true cuando hay que eliminarlo
  update(dt) {
    const g = this.game;
    this.life -= dt;
    if (this.life <= 0) return true;
    this.mesh.position.addScaledVector(this.vel, dt);
    const p = this.mesh.position;
    // estela de partículas
    if (g.psys) { this._trailT -= dt; if (this._trailT <= 0) { this._trailT = 0.03; g.psys.emit(this.trailPreset, p); } }

    if (!g.world.grid.walkable(p.x, p.z, 0.05)) { this.burst(); return true; }

    if (this.friendly) {
      for (const e of g.enemies) {
        if (!e.alive || this.hitSet.has(e)) continue;
        const ch = this.castHits;
        if (ch && (ch instanceof Map ? (ch.get(e) || 0) >= this.perTarget : ch.has(e))) continue;
        const r = 0.55 * (e.def.scale || 1);
        if (p.distanceToSquared(e.pos.clone().setY(p.y)) < r * r) {
          if (this.rollAt) {
            const roll = this.rollAt(e);
            this.dmg = roll.dmg; this.crit = roll.crit;
            if (this._autoImpact) this.impactPreset.count = this.crit ? 16 : 9;
          }
          if (ch instanceof Map) ch.set(e, (ch.get(e) || 0) + 1); else ch?.add(e);
          const dealt = e.takeDamage(this.dmg, this.crit, { color: this.color, skill: this.skill, tags: this.tags || undefined, elem: this.elem, ...(this.hitOpts || {}) }) || 0;
          g.player?.onDealHit();
          if (this.slow && e.alive) {
            if (e.applyCC) e.applyCC('slow', this.slow, { pct: this.slowPct || 50, src: g.player });
            else e.slowT = this.slow;
          }
          if (this.onHit) { try { this.onHit(e, dealt); } catch (err) { console.warn('onHit de proyectil', err); } }
          g.sfx('hit');
          this.burst();
          // hit-stop SOLO en crítico y breve: en impactos normales causaba
          // micro-pausas constantes con clases a distancia (mago/arquera)
          if (this.crit) g.hitStop?.(45);
          if (!this.pierce) return true;
          this.hitSet.add(e);
        }
      }
    } else {
      const pl = g.player;
      if (!this.missed && pl && pl.alive && p.distanceToSquared(pl.pos.clone().setY(p.y)) < 0.45) {
        // probabilidad de FALLO (Bomba de Humo, buffs projMissPct): una tirada por proyectil
        const miss = pl.projMissChance?.() || 0;
        if (miss > 0 && (pl.combatRng || Math.random)() * 100 < miss) {
          this.missed = true;
          g.ui?.spawnText?.(pl.pos, '¡Fallo!', 'txt-heal');
          return false;
        }
        pl.takeDamage(this.dmg, this.attackerLevel, { source: this.source });
        this.burst();
        return true;
      }
    }
    return false;
  }
}

// ------------------------------------------------------------
// MASCOTA DE UTILIDAD: compañero que sigue al jugador, recoge botín y otorga
// un aura (collar). NO hace daño. Tres modelos cosméticos (lobo/halcón/familiar).
// ------------------------------------------------------------
function makeWolfModel() {
  const g = new THREE.Group();
  const fur = std(0x8a8d96);
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.34, 0.3), fur);
  body.position.y = 0.34;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.24, 0.26), fur.clone());
  head.position.set(0, 0.5, 0.36);
  const snout = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.14), std(0x6a6d76));
  snout.position.set(0, 0.45, 0.54);
  for (const sx of [-0.08, 0.08]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.14, 4), fur.clone());
    ear.position.set(sx, 0.68, 0.34);
    g.add(ear);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xffdd44 }));
    eye.position.set(sx, 0.53, 0.5);
    g.add(eye);
  }
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.3), fur.clone());
  tail.position.set(0, 0.42, -0.4);
  tail.rotation.x = -0.5;
  body.castShadow = head.castShadow = true;
  g.add(body, head, snout, tail);
  // gira sobre su eje Z+ (mismo convenio que jugador/enemigos)
  return g;
}

// halcón vigía: sobrevuela; cuerpo fusiforme + alas que baten (animadas)
function makeHawkModel(color = 0xb98a55) {
  const g = new THREE.Group();
  const feather = std(color, { rough: 0.7 });
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.6, 8), feather);
  body.rotation.x = Math.PI / 2; body.position.y = 0.9; body.castShadow = true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), feather.clone());
  head.position.set(0, 0.94, 0.3);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.14, 5), std(0xf0c040));
  beak.rotation.x = Math.PI / 2; beak.position.set(0, 0.93, 0.46);
  for (const sx of [-0.06, 0.06]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), new THREE.MeshBasicMaterial({ color: 0x111111 }));
    eye.position.set(sx, 0.97, 0.4); g.add(eye);
  }
  const wings = [];
  for (const sx of [-1, 1]) {
    const wing = new THREE.Group();
    const w = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.26), feather.clone());
    w.position.x = sx * 0.28; w.castShadow = true; wing.add(w);
    wing.position.set(0, 0.9, 0); g.add(wing); wings.push(wing);
  }
  g.add(body, head, beak);
  g.userData.wings = wings; // animadas en Pet.update
  return g;
}

// familiar arcano: orbe emisivo translúcido con un núcleo brillante
function makeWispModel(color = 0x66ccff) {
  const g = new THREE.Group();
  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.26, 14, 12),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.1, roughness: 0.3, transparent: true, opacity: 0.85 }));
  orb.position.y = 0.85;
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  core.position.y = 0.85;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.02, 6, 20),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending }));
  ring.position.y = 0.85; ring.rotation.x = Math.PI / 2;
  g.add(orb, core, ring);
  g.userData.ring = ring; // gira en Pet.update
  return g;
}

export function makePetModel(kind = 'lobo') {
  const def = PET_KINDS[kind] || PET_KINDS.lobo;
  if (def.model === 'hawk') return makeHawkModel(def.color);
  if (def.model === 'wisp') return makeWispModel(def.color);
  return makeWolfModel();
}

export class Pet {
  constructor(game) {
    this.game = game;
    this.lunge = 0;
    this.t = 0;
    this.kind = game.player?.pet?.kind || 'lobo';
    this.group = makePetModel(this.kind);
  }

  get pos() { return this.group.position; }

  // datos de mejora del pet (vive en player.pet)
  get data() { return this.game.player?.pet || {}; }
  upg(key) { return this.data.upgrades?.[key] || 0; }

  // radio de auto-recolección (base del modelo + mejora de radio), al cuadrado
  pickRadiusSq() {
    const base = PET_KINDS[this.kind]?.baseRadius || 5.5;
    const r = base + this.upg('pickup') * 1.6;
    return r * r;
  }

  // ¿este objeto del suelo lo recoge el pet automáticamente?
  // acepta el objeto (preferido: permite saber si apila) o solo su kind
  autoPicks(kindOrItem, p) {
    const item = (kindOrItem && typeof kindOrItem === 'object') ? kindOrItem : null;
    const kind = item ? item.kind : kindOrItem;
    if (kind === 'gold' || kind === 'potion') return true;
    const mat = this.upg('materials');
    const pouchOK = canAddMaterial(p.materials, item || { kind });
    if ((kind === 'gem' || kind === 'rune') && mat >= 1 && pouchOK) return true;
    // las llaves son kind 'riftkey' (antes se buscaba 'key' y nunca se recogían)
    if ((kind === 'fragment' || kind === 'riftkey' || kind === 'glyph') && mat >= 2 && pouchOK) return true;
    return false;
  }

  // botín recogible más cercano al DUEÑO (no al pet, para no alejarse)
  nearestLoot(g, p) {
    let best = null, bd = this.pickRadiusSq();
    for (const gi of g.groundItems || []) {
      if (!this.autoPicks(gi.item, p)) continue;
      const d = gi.mesh.position.distanceToSquared(p.pos);
      if (d < bd) { bd = d; best = gi; }
    }
    return best;
  }

  // imán de tesoros: arrastra oro/orbes cercanos hacia el jugador (muy satisfactorio)
  magnetPull(g, p, dt) {
    const lvl = this.upg('magnet');
    if (lvl <= 0) return;
    const range = 6 + lvl * 2.5, rangeSq = range * range, speed = (5 + lvl * 3) * dt;
    for (const gi of g.groundItems || []) {
      const k = gi.item.kind;
      if (k !== 'gold' && k !== 'potion') continue;
      const m = gi.mesh.position;
      const dx = p.pos.x - m.x, dz = p.pos.z - m.z;
      const dsq = dx * dx + dz * dz;
      if (dsq > rangeSq || dsq < 0.04) continue;
      const l = Math.sqrt(dsq);
      m.x += dx / l * speed; m.z += dz / l * speed;
    }
  }

  update(dt) {
    const g = this.game, p = g.player;
    this.t += dt;
    this.lunge = Math.max(0, this.lunge - dt * 4);
    const flying = this.kind !== 'lobo';   // halcón/familiar flotan más alto
    const baseY = flying ? 0.6 : 0;

    const dp = this.pos.distanceTo(p.pos);
    if (dp > 13) { this.pos.copy(p.pos); return; } // teletransporte si se queda atrás

    // imán de tesoros (no requiere moverse)
    this.magnetPull(g, p, dt);

    // velocidad de desplazamiento (mejora de agilidad)
    const moveSpd = 5 + this.upg('speed') * 1.4;

    let dest = null;
    // sin daño: el compañero solo va a por el botín recogible cercano
    const gi = this.nearestLoot(g, p);
    if (gi) {
      const dgi = this.pos.distanceTo(gi.mesh.position.clone().setY(this.pos.y));
      if (dgi < 0.8) { g.pickupGroundItem(gi); this.lunge = 1; }
      else dest = gi.mesh.position;
    } else if (dp > 2.2) {
      dest = p.pos;
    }

    if (dest) {
      const dx = dest.x - this.pos.x, dz = dest.z - this.pos.z;
      const l = Math.hypot(dx, dz) || 1;
      moveWithCollision(g.world.grid, this.pos, dx / l * moveSpd * dt, dz / l * moveSpd * dt, 0.25);
      this.group.rotation.y = Math.atan2(dx, dz);
    }

    // animación cosmética por modelo
    const moving = !!dest;
    if (this.kind === 'lobo') {
      this.group.position.y = Math.abs(Math.sin(this.t * 8)) * (moving ? 0.07 : 0.02) + this.lunge * 0.18;
    } else if (this.kind === 'halcon') {
      this.group.position.y = baseY + Math.sin(this.t * 2.5) * 0.12;
      const flap = Math.sin(this.t * 16) * 0.5;
      for (const [i, wing] of (this.group.userData.wings || []).entries())
        wing.rotation.z = (i === 0 ? 1 : -1) * flap;
    } else { // familiar
      this.group.position.y = baseY + Math.sin(this.t * 3) * 0.1;
      this.group.rotation.y += dt * 0.6;
      if (this.group.userData.ring) this.group.userData.ring.rotation.z += dt * 2;
    }
  }
}
