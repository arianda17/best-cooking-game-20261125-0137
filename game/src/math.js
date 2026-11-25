// Small math helpers for the game.
export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// Deterministic, seeded RNG so screenshot scenes are reproducible.
export function createRng(seed) {
  let s = seed >>> 0;
  return {
    next: () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return (s >>> 0) / 4294967296;
    },
    range: (lo, hi) => lo + (hi - lo) * ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296),
    pick: (arr) => arr[Math.floor(((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296) * arr.length)],
  };
}

export const dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
