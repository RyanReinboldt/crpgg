// IRONVOID - deterministic RNG + small math helpers.
window.IV = window.IV || {};
(function (IV) {
  'use strict';

  // mulberry32: fast, seedable, good enough for loot rolls and raid layout.
  IV.makeRng = function (seed) {
    let a = seed >>> 0;
    const rng = function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    rng.int = (min, max) => min + Math.floor(rng() * (max - min + 1));
    rng.pick = (arr) => arr[Math.floor(rng() * arr.length)];
    rng.chance = (p) => rng() < p;
    rng.shuffle = (arr) => {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
      }
      return arr;
    };
    // Weighted pick over [{w:number, ...}] entries.
    rng.weighted = (entries) => {
      let total = 0;
      for (const e of entries) total += e.w;
      let r = rng() * total;
      for (const e of entries) { r -= e.w; if (r <= 0) return e; }
      return entries[entries.length - 1];
    };
    return rng;
  };

  IV.clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
  IV.lerp = (a, b, t) => a + (b - a) * t;
  IV.dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
  // Shortest signed angular difference, in radians.
  IV.angDiff = function (a, b) {
    let d = b - a;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
  };
  IV.fmtCredits = (n) => (n | 0).toLocaleString('en-US') + ' cr';
  IV.fmtTime = function (sec) {
    sec = Math.max(0, Math.ceil(sec));
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  };
  IV.uid = (function () { let n = 1; return () => 'i' + (n++).toString(36); })();
})(window.IV);
