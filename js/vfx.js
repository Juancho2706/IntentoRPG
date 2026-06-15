// vfx.js — helpers de game-feel (hit-stop, trauma-shake, impactos).
// Sin dependencias externas; opera sobre la instancia de Game vía métodos.

// Ruido suave 1D (value noise interpolado) para una sacudida orgánica,
// en lugar de Math.random() puro cada frame (que produce un temblor "sucio").
// Devuelve un valor continuo en [-1, 1] respecto a t.
export function smoothNoise(t, seed = 0) {
  const x = t + seed * 13.37;
  const i = Math.floor(x);
  const f = x - i;
  // hash determinista por entero
  const h = (n) => {
    const s = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453;
    return (s - Math.floor(s)) * 2 - 1; // [-1, 1]
  };
  const a = h(i);
  const b = h(i + 1);
  // suavizado smoothstep para una curva continua
  const u = f * f * (3 - 2 * f);
  return a + (b - a) * u;
}

// Duración de hit-stop (ms) según la "fuerza" del golpe.
// normal ~50ms, fuerte ~90ms, crítico ~160ms.
export function hitStopMs(kind) {
  switch (kind) {
    case 'crit': return 160;
    case 'heavy': return 90;
    default: return 50;
  }
}
