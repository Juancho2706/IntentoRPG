// ============================================================
// TALENTOS Y ESPECIALIZACIÓN (mixin de Game) — v2 (Paso 2g)
// ============================================================
// Las reglas (puntos, puertas, requisitos, builds, Paragon) viven en js/talents.js y las
// mutaciones puras en js/talents-ops.js (las mismas que usa el panel); aquí solo va la
// orquestación con el juego (docs/paso2-implementacion.md §3.4):
//   · fuera de combate (Game.canRespecFree: 5 s sin daño o en un campamento) los cambios
//     son GRATIS; en combate se rechazan con reason 'combat';
//   · tras cada cambio: Player.recompute(), la barra se sincroniza (activas de talento que
//     ya no se conocen fuera; las nuevas, a la ranura 2 si está libre; al cambiar de
//     especialización, su barra de SPEC_BAR en las ranuras del kit anterior, vacías o con
//     habilidades que ya no se conocen, y su forja recomendada en las habilidades nunca
//     forjadas, D3), avisos de apertura y pausa del Paragon y guardado.
// Respuestas { ok, reason?, text?, … } (reason = código; text = texto para el jugador).
// Se inyecta en Game.prototype con Object.assign (test43 vigila los nombres).
import * as Talents from './talents.js';
import { createTalentOps } from './talents-ops.js';
import { fitsSlot, isKnown } from './skill-resolve.js';
import { resetGauges } from './spec-mechanics.js';
import { SPEC_BAR, FORGE_RECO } from './data.js';

// operaciones puras compartidas con el panel (js/ui-talents.js las crea igual)
export const TALENT_OPS = createTalentOps(Talents);
const BAR_SLOTS = ['lmb', 'rmb', 'k1', 'k2', 'k3', 'k4'];
const COMBAT_TEXT = '⚔️ Solo fuera de combate (5 s sin daño) o en un campamento';

const skillOf = (p, id) => (id && p.cls?.skills?.find(s => s.id === id)) || null;

// forja recomendada de la especialización en las habilidades NUNCA elegidas (D3)
function applyForgeReco(p, spec) {
  const reco = FORGE_RECO?.[spec];
  if (!reco) return;
  p.skillForge ||= {};
  for (const [id, v] of Object.entries(reco)) if (p.skillForge[id] === undefined) p.skillForge[id] = v;
}
// barra de la especialización (D6): solo se tocan las ranuras vacías, con una habilidad
// del kit de la especialización anterior o con una que ya no se conoce (riesgo 10)
function applySpecBar(p, prevSpec, spec) {
  const hb = p.hotbar || (p.hotbar = {});
  const want = SPEC_BAR?.[spec]?.bar || {};
  for (const slot of BAR_SLOTS) {
    const cur = hb[slot];
    const curSk = skillOf(p, cur);
    const stale = !!cur && (!curSk || !isKnown(p, curSk) || (!!prevSpec && curSk.spec === prevSpec));
    if (cur && !stale) continue;
    const id = want[slot];
    const sk = skillOf(p, id);
    if (sk && isKnown(p, sk) && fitsSlot(sk, slot) && !Object.values(hb).includes(id)) hb[slot] = id;
    else if (stale) hb[slot] = null;
  }
}

export const talentMethods = {
  // null = se puede editar · texto = motivo (en combate)
  canEditTalents() {
    const p = this.player;
    if (!p) return 'Sin héroe';
    if (typeof this.canRespecFree === 'function' && !this.canRespecFree()) return COMBAT_TEXT;
    return null;
  },

  // aplica una mutación de talents-ops y, si salió bien, sincroniza el juego
  _talentMutate(fn, okMsg = null, { needEdit = true } = {}) {
    const p = this.player;
    if (!p) return { ok: false, reason: 'unknown', text: 'Sin héroe' };
    // _talentQuiet: la llamada viene del panel de talentos, que ya muestra sus avisos
    const say = this._talentQuiet ? () => {} : (t, ms) => this.ui?.message?.(t, ms);
    if (needEdit) {
      const why = this.canEditTalents();
      if (why) { say(why, 2500); return { ok: false, reason: why === COMBAT_TEXT ? 'combat' : 'unknown', text: why, error: why }; }
    }
    const before = new Set(p.talentAgg?.grants || []);
    const specBefore = p.talents?.spec || null;
    const r = fn(p) || { ok: false };
    if (!r.ok) { if (r.text || r.reason) say(r.text || r.reason, 2500); return r; }
    this.onTalentsChanged(before, specBefore);
    // apertura y pausa del Paragon: en el banner del HUD; desde el panel (_talentQuiet) no, porque
    // el panel tapa el banner y ya los enseña en su aviso con r.heroOpened / r.heroPaused (y anima
    // la revelación)
    if (r.heroOpened) say('🌟 ¡Paragon abierto! Su nodo clave ya funciona: gasta tus puntos en el árbol héroe (N)', 4000);
    if (r.heroPaused) say(`Paragon en pausa: te falta gastar ${r.missing || 1} punto${(r.missing || 1) > 1 ? 's' : ''} de especialización. Tus nodos del Paragon se guardan.`, 4000);
    if (okMsg) say(okMsg, 2500);
    return r;
  },

  // recompute + barra ↔ activas concedidas + guardado
  onTalentsChanged(grantsBefore = new Set(), specBefore = null) {
    const p = this.player;
    if (!p) return;
    const spec = p.talents?.spec || null;
    const specChanged = spec !== specBefore;
    if (specChanged) { resetGauges(p); if (spec) applyForgeReco(p, spec); }
    p.recompute();
    const hb = p.hotbar || (p.hotbar = {});
    // 1) fuera las activas de talento que ya no se conocen (nodo retirado, otra especialización…)
    for (const [slot, id] of Object.entries(hb)) {
      const sk = skillOf(p, id);
      if (sk && sk.kind === 'talent' && !isKnown(p, sk)) hb[slot] = null;
    }
    // 2) barra de la especialización nueva
    if (specChanged && spec) applySpecBar(p, specBefore, spec);
    // 3) las activas recién concedidas van a la ranura 2 si está libre (D7: solo caben ahí)
    const fresh = [...(p.talentAgg?.grants || [])].filter(id => !grantsBefore.has(id));
    for (const id of fresh) {
      const sk = skillOf(p, id);
      if (!sk || Object.values(hb).includes(id)) continue;
      const slot = !hb.k2 && fitsSlot(sk, 'k2') ? 'k2' : null;
      if (slot) hb[slot] = id;
      this.ui?.message?.(`📖 Nueva habilidad de talento: ${sk.icon || ''} ${sk.name}${slot ? ' (ranura 2)' : ' (en el libro)'}`, 3500);
    }
    this.ui?.refreshHotbar?.();
    this.ui?.updateHUD?.();
    this.ui?.renderPanel?.();
    this.save?.();
  },

  // elegir / cambiar especialización (Nv ≥ 10; gratis fuera de combate). Cada una conserva
  // sus rangos y su árbol héroe; su nodo clave es gratis
  chooseSpec(specId) {
    const p = this.player;
    if (p?.talents?.spec === specId) return { ok: true, same: true };
    const s = Talents.findSpec(p?.classId, specId);
    return this._talentMutate(q => TALENT_OPS.chooseSpec(q, specId), s ? `🌿 Especialización: ${s.name}` : null);
  },
  switchSpec(specId) { return this.chooseSpec(specId); },
  // árbol héroe de la especialización activa (conserva los nodos de cada árbol)
  chooseHeroTree(treeId) { return this._talentMutate(q => TALENT_OPS.chooseHeroTree(q, treeId)); },

  // which: 'cls' | 'spec' | 'hero'; k = opción de una elección (sin k: la última o la A)
  addTalentRank(which, nodeId, k) { return this._talentMutate(q => TALENT_OPS.addRank(q, which, nodeId, k)); },
  removeTalentRank(which, nodeId) { return this._talentMutate(q => TALENT_OPS.removeRank(q, which, nodeId)); },
  // opción A/B de un nodo de elección (lo busca en clase, especialización y héroe)
  chooseTalentOption(nodeId, k) {
    const which = this.player ? TALENT_OPS.whichOf(this.player, nodeId) : null;
    if (!which) return { ok: false, reason: 'unknown', text: 'Talento desconocido' };
    return this._talentMutate(q => TALENT_OPS.setChoice(q, which, nodeId, k));
  },
  // nodo de elección ya comprado: alterna entre sus opciones
  toggleTalentChoice(which, nodeId) { return this._talentMutate(q => TALENT_OPS.toggleChoice(q, which, nodeId)); },

  // Recomendado: la build `key` (o la defaultBuild de la especialización activa)
  applyTalentBuild(key = null) {
    return this._talentMutate(q => TALENT_OPS.applyBuild(q, key), '🌿 Recomendado aplicado');
  },
  // alias del panel de 2d (aplica la build entera)
  applyTalentPreset() { return this.applyTalentBuild(); },

  // configuraciones guardadas (≤ 10 por especialización)
  saveTalentLoadout(name) { return this._talentMutate(q => TALENT_OPS.saveLoadout(q, name), '🌿 Configuración guardada', { needEdit: false }); },
  applyTalentLoadout(i) { return this._talentMutate(q => TALENT_OPS.applyLoadout(q, i), '🌿 Configuración aplicada'); },
  renameTalentLoadout(i, name) { return this._talentMutate(q => TALENT_OPS.renameLoadout(q, i, name), null, { needEdit: false }); },
  deleteTalentLoadout(i) { return this._talentMutate(q => TALENT_OPS.deleteLoadout(q, i), null, { needEdit: false }); },

  resetTalentTree(which = 'all') {
    return this._talentMutate(q => (which === 'all' ? TALENT_OPS.resetAll(q) : TALENT_OPS.resetTree(q, which)), '🌿 Talentos reiniciados');
  },
  // código de build IRPG2 (exportar no exige estar fuera de combate)
  exportTalentCode() { return this.player ? TALENT_OPS.exportCode(this.player) : ''; },
  importTalentCode(code, opts) { return this._talentMutate(q => TALENT_OPS.importCode(q, code, opts), '🌿 Build importada'); },

  // puntos de cada sistema: { earned, spent, left } + estado del Paragon
  talentPointsInfo() {
    const p = this.player;
    const z = { earned: 0, spent: 0, left: 0 };
    if (!p) return { cls: z, spec: z, hero: z, board: z, heroOpen: false, heroPaused: false };
    const info = which => {
      const earned = Talents.talentPointsEarned(p, which);
      const left = Talents.talentPointsLeft(p, which);
      return { earned, spent: Math.max(0, earned - left), left };
    };
    const bEarned = Talents.paragonPointsEarned(p), bLeft = Talents.paragonPointsLeft(p);
    return { cls: info('cls'), spec: info('spec'), hero: info('hero'), board: { earned: bEarned, spent: bEarned - bLeft, left: bLeft },
      heroOpen: Talents.heroOpen(p), heroPaused: Talents.heroPaused(p) };
  },
};
