// ============================================================
// Música ambiental generativa por zona (WebAudio, sin assets):
// un dron grave de dos osciladores desafinados + notas suaves
// de una escala por bioma, programadas a intervalos aleatorios.
// ============================================================

const ZONES = {
  town:               { root: 220, scale: [0, 2, 4, 7, 9],  noteEvery: [2.5, 5],  bright: 1400, drone: 0.030, note: 0.045, wave: 'triangle' },
  refuge:             { root: 174, scale: [0, 3, 5, 7, 10], noteEvery: [3, 6],    bright: 1100, drone: 0.034, note: 0.042, wave: 'sine' },
  'Cripta':           { root: 110, scale: [0, 2, 3, 7, 8],  noteEvery: [4, 8],    bright: 700,  drone: 0.040, note: 0.038, wave: 'sine' },
  'Cavernas de Hielo':{ root: 146, scale: [0, 2, 3, 7, 10], noteEvery: [3, 7],    bright: 2000, drone: 0.030, note: 0.040, wave: 'sine' },
  'Infierno':         { root: 92,  scale: [0, 1, 4, 6, 7],  noteEvery: [2.5, 5],  bright: 600,  drone: 0.046, note: 0.036, wave: 'sawtooth' },
  'Abismo Estelar':   { root: 73,  scale: [0, 2, 3, 6, 7],  noteEvery: [4, 9],    bright: 900,  drone: 0.044, note: 0.040, wave: 'sine' },
};

export class Music {
  constructor() {
    this.enabled = true;
    this.zone = null;     // clave de zona pendiente o sonando
    this.ctx = null;
    this.nodes = [];
    this.noteTimer = null;
  }

  // llamar en el primer gesto del usuario (los navegadores bloquean el audio antes)
  resume() {
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.master = this.ctx.createGain();
        this.master.gain.value = 1;
        this.filter = this.ctx.createBiquadFilter();
        this.filter.type = 'lowpass';
        this.filter.connect(this.master).connect(this.ctx.destination);
      } catch { return; }
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    if (this.zone && this.enabled && !this.nodes.length) this._start();
  }

  play(zoneKey) {
    if (this.zone === zoneKey && this.nodes.length) return;
    this.zone = zoneKey;
    if (!this.ctx || !this.enabled) return;
    this._start();
  }

  setEnabled(v) {
    this.enabled = v;
    if (!v) this._stop();
    else if (this.zone && this.ctx) this._start();
  }

  _start() {
    this._stop();
    const z = ZONES[this.zone] || ZONES['Cripta'];
    const c = this.ctx;
    this.filter.frequency.value = z.bright;

    // dron: dos osciladores desafinados con vaivén lento de volumen
    for (const mul of [0.5, 0.503]) {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = z.wave;
      o.frequency.value = z.root * mul;
      g.gain.value = 0;
      g.gain.linearRampToValueAtTime(z.drone, c.currentTime + 3);
      const lfo = c.createOscillator();
      const lfoG = c.createGain();
      lfo.frequency.value = 0.05 + Math.random() * 0.05;
      lfoG.gain.value = z.drone * 0.4;
      lfo.connect(lfoG).connect(g.gain);
      o.connect(g).connect(this.filter);
      o.start(); lfo.start();
      this.nodes.push(o, g, lfo, lfoG);
    }

    // notas suaves de la escala, a intervalos irregulares
    const scheduleNote = () => {
      if (!this.enabled) return;
      const semi = z.scale[Math.floor(Math.random() * z.scale.length)];
      const oct = [1, 2, 2, 4][Math.floor(Math.random() * 4)];
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = 'sine';
      o.frequency.value = z.root * oct * Math.pow(2, semi / 12);
      g.gain.value = 0;
      const t = c.currentTime;
      g.gain.linearRampToValueAtTime(z.note, t + 1.6);
      g.gain.linearRampToValueAtTime(0.0001, t + 4.5);
      o.connect(g).connect(this.filter);
      o.start(t);
      o.stop(t + 5);
      const next = z.noteEvery[0] + Math.random() * (z.noteEvery[1] - z.noteEvery[0]);
      this.noteTimer = setTimeout(scheduleNote, next * 1000);
    };
    this.noteTimer = setTimeout(scheduleNote, 1500);
  }

  // motivo corto de victoria (muerte de jefe)
  sting() {
    if (!this.ctx || !this.enabled) return;
    const c = this.ctx;
    const z = ZONES[this.zone] || ZONES['Cripta'];
    [0, 7, 12].forEach((semi, i) => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = 'triangle';
      o.frequency.value = z.root * 2 * Math.pow(2, semi / 12);
      const t = c.currentTime + i * 0.18;
      g.gain.setValueAtTime(0.08, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      o.connect(g).connect(this.master);
      o.start(t);
      o.stop(t + 0.7);
    });
  }

  _stop() {
    clearTimeout(this.noteTimer);
    for (const n of this.nodes) {
      try { if (n.stop) n.stop(); n.disconnect(); } catch { /* ya parado */ }
    }
    this.nodes = [];
  }
}
