// ============================================================
// Sonido: pequeño sintetizador con WebAudio
// ============================================================
// Los tonos son DATOS (SFX_TONES, sin archivos de audio): cada nota { f (Hz), d (s),
// type, v (volumen), t (retardo), slide (Hz al final) }. Se exportan para que los tests
// comprueben que un nombre existe sin crear un AudioContext.
export const SFX_TONES = Object.freeze({
  hit:     [{ f: 160, d: 0.08, type: 'square', v: 0.12 }],
  shoot:   [{ f: 700, d: 0.07, type: 'sawtooth', v: 0.06, slide: -400 }],
  eshoot:  [{ f: 300, d: 0.12, type: 'sawtooth', v: 0.07, slide: -150 }],
  hurt:    [{ f: 120, d: 0.15, type: 'square', v: 0.13, slide: -60 }],
  potion:  [{ f: 500, d: 0.1, type: 'sine', v: 0.12, slide: 300 }],
  gold:    [{ f: 900, d: 0.06, type: 'sine', v: 0.1 }, { f: 1300, d: 0.08, type: 'sine', v: 0.08, t: 0.05 }],
  pickup:  [{ f: 600, d: 0.08, type: 'triangle', v: 0.1, slide: 200 }],
  levelup: [{ f: 440, d: 0.12, type: 'sine', v: 0.14 }, { f: 660, d: 0.12, type: 'sine', v: 0.14, t: 0.12 }, { f: 880, d: 0.2, type: 'sine', v: 0.14, t: 0.24 }],
  death:   [{ f: 200, d: 0.5, type: 'sawtooth', v: 0.12, slide: -150 }],
  portal:  [{ f: 300, d: 0.3, type: 'sine', v: 0.12, slide: 500 }],
  chest:   [{ f: 350, d: 0.1, type: 'triangle', v: 0.12 }, { f: 700, d: 0.15, type: 'triangle', v: 0.1, t: 0.1 }],
  skill:   [{ f: 520, d: 0.1, type: 'sawtooth', v: 0.09, slide: 250 }],
  dash:    [{ f: 450, d: 0.16, type: 'sawtooth', v: 0.08, slide: -280 }],
  // caída de botín por rareza: raro = doble nota corta; legendario = arpegio brillante
  droprare:  [{ f: 660, d: 0.09, type: 'triangle', v: 0.09 }, { f: 990, d: 0.1, type: 'triangle', v: 0.08, t: 0.07 }],
  droplegend:[{ f: 780, d: 0.1, type: 'sine', v: 0.12 }, { f: 1170, d: 0.1, type: 'sine', v: 0.11, t: 0.08 }, { f: 1560, d: 0.22, type: 'sine', v: 0.1, t: 0.16 }],
  // nuevos efectos: crítico (chasquido agudo), equipar, error/sin maná, clic UI
  crit:    [{ f: 1100, d: 0.05, type: 'square', v: 0.1, slide: 400 }, { f: 1700, d: 0.08, type: 'square', v: 0.07, t: 0.04 }],
  equip:   [{ f: 300, d: 0.06, type: 'triangle', v: 0.1 }, { f: 520, d: 0.12, type: 'triangle', v: 0.09, t: 0.05 }],
  error:   [{ f: 200, d: 0.12, type: 'square', v: 0.08, slide: -70 }],
  uiclick: [{ f: 660, d: 0.04, type: 'triangle', v: 0.06 }],
  // sabores elementales (impactos de habilidades)
  fire:    [{ f: 240, d: 0.22, type: 'sawtooth', v: 0.08, slide: -120 }],
  ice:     [{ f: 1300, d: 0.18, type: 'sine', v: 0.07, slide: -500 }],
  bolt:    [{ f: 1600, d: 0.07, type: 'square', v: 0.08, slide: -900 }],
  // Paso 2b.0 (§4.4): sagrado (campana), trampa (clac metálico) y cadena
  holy:    [{ f: 880, d: 0.25, type: 'sine', v: 0.09 }, { f: 1320, d: 0.3, type: 'sine', v: 0.06, t: 0.04 }],
  trap:    [{ f: 220, d: 0.05, type: 'square', v: 0.12, slide: 600 }, { f: 140, d: 0.08, type: 'square', v: 0.09, t: 0.05 }],
  chain:   [{ f: 500, d: 0.06, type: 'sawtooth', v: 0.07, slide: 300 }, { f: 700, d: 0.06, type: 'sawtooth', v: 0.06, t: 0.06, slide: 300 }],
  // S0: golpe grave de las réplicas (Terremoto): el plantado se oye
  thud:    [{ f: 95, d: 0.2, type: 'sine', v: 0.16, slide: -45 }, { f: 60, d: 0.14, type: 'triangle', v: 0.1, t: 0.03 }],
  // S-maga: descarga del Orbe Arcano (chasquido corto), zumbido suave de un orbe vivo o de un haz
  // canalizado (un tono por tic: suena continuo) y el orbe que vuelve a la mano
  zap:     [{ f: 2100, d: 0.045, type: 'square', v: 0.05, slide: -1300 }],
  hum:     [{ f: 140, d: 0.24, type: 'sawtooth', v: 0.03, slide: 12 }, { f: 280, d: 0.2, type: 'sine', v: 0.02 }],
  absorb:  [{ f: 520, d: 0.12, type: 'sine', v: 0.08, slide: 380 }, { f: 1040, d: 0.1, type: 'triangle', v: 0.05, t: 0.06 }],
  // Paso 2 (D26): tonos de los VERBOS; los emite la simulación (game-skills.js) en el
  // instante del borde. Cortos y distintos entre sí para leerse sin mirar.
  verb_win:     [{ f: 1480, d: 0.06, type: 'triangle', v: 0.1 }, { f: 2220, d: 0.09, type: 'sine', v: 0.06, t: 0.01 }],          // «clang» al entrar en la ventana
  verb_perfect: [{ f: 988, d: 0.09, type: 'sine', v: 0.12 }, { f: 1480, d: 0.14, type: 'sine', v: 0.1, t: 0.05 }, { f: 1976, d: 0.2, type: 'triangle', v: 0.06, t: 0.09 }],
  verb_miss:    [{ f: 190, d: 0.1, type: 'triangle', v: 0.1, slide: -60 }],                                                   // suelta fuera de la ventana
  verb_tick:    [{ f: 1250, d: 0.03, type: 'square', v: 0.06 }],                                                              // tiempo justo de un relanzamiento
  verb_stance:  [{ f: 330, d: 0.08, type: 'triangle', v: 0.1, slide: 110 }, { f: 495, d: 0.1, type: 'triangle', v: 0.08, t: 0.06 }],
  verb_pip:     [{ f: 880, d: 0.05, type: 'triangle', v: 0.08 }, { f: 1175, d: 0.06, type: 'triangle', v: 0.06, t: 0.04 }],  // 3.er paso listo
  verb_hunt:    [{ f: 220, d: 0.35, type: 'sawtooth', v: 0.07, slide: 40 }, { f: 330, d: 0.4, type: 'sawtooth', v: 0.05, t: 0.12 }], // cuerno de la Batida
});
// nombres de los tonos de verbo (los tests vigilan que existan)
export const VERB_SFX = Object.freeze(['verb_win', 'verb_perfect', 'verb_miss', 'verb_tick', 'verb_stance', 'verb_pip', 'verb_hunt']);

export function createSfx() {
  let ctx = null;
  const ensure = () => {
    if (!ctx) try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { /* sin audio */ }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  };
  window.addEventListener('pointerdown', ensure, { once: true });
  const tones = SFX_TONES;
  // `vol` (0..1) escala el volumen de salida (control de volumen del jugador)
  return (name, vol = 1) => {
    const c = ensure();
    const def = tones[name];
    if (!c || !def || vol <= 0) return;
    for (const n of def) {
      const o = c.createOscillator(), gn = c.createGain();
      o.type = n.type;
      const t0 = c.currentTime + (n.t || 0);
      o.frequency.setValueAtTime(n.f, t0);
      if (n.slide) o.frequency.linearRampToValueAtTime(Math.max(40, n.f + n.slide), t0 + n.d);
      gn.gain.setValueAtTime(n.v * vol, t0);
      gn.gain.exponentialRampToValueAtTime(0.0001, t0 + n.d);
      o.connect(gn).connect(c.destination);
      o.start(t0); o.stop(t0 + n.d + 0.02);
    }
  };
}
