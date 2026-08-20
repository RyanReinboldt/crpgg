// IRONVOID - procedural textures and sprites. No binary assets: everything here
// is drawn once into an offscreen canvas at boot and read back as pixel data.
(function (IV) {
  'use strict';

  const TS = 64; // wall texture size

  function scratch(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.imageSmoothingEnabled = false;
    return { c, x };
  }

  // Returns {w,h,px:Uint32Array} in native ImageData byte order.
  function bake(w, h, draw) {
    const s = scratch(w, h);
    s.x.clearRect(0, 0, w, h);
    draw(s.x, w, h);
    const img = s.x.getImageData(0, 0, w, h);
    return { w: w, h: h, px: new Uint32Array(img.data.buffer.slice(0)) };
  }

  function noise(ctx, w, h, amount, alpha) {
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (Math.random() - 0.5) * amount;
      d[i] = IV.clamp(d[i] + n, 0, 255);
      d[i + 1] = IV.clamp(d[i + 1] + n, 0, 255);
      d[i + 2] = IV.clamp(d[i + 2] + n, 0, 255);
      if (alpha) d[i + 3] = d[i + 3];
    }
    ctx.putImageData(img, 0, 0);
  }

  function platedWall(base, seam, rivet, rustAmt) {
    return function (g, w, h) {
      g.fillStyle = base; g.fillRect(0, 0, w, h);
      // horizontal plate seams
      g.fillStyle = seam;
      g.fillRect(0, 0, w, 2); g.fillRect(0, h / 2 - 1, w, 2);
      g.fillRect(0, 0, 2, h); g.fillRect(w / 2 - 1, 0, 2, h / 2);
      g.fillRect(w / 2 - 1, h / 2, 2, h / 2);
      // rivets
      g.fillStyle = rivet;
      for (const [x, y] of [[6, 6], [w - 8, 6], [6, h / 2 - 6], [w - 8, h / 2 - 6],
                            [6, h / 2 + 6], [w - 8, h / 2 + 6], [6, h - 8], [w - 8, h - 8]]) {
        g.fillRect(x, y, 2, 2);
      }
      // rust / grime blotches
      for (let i = 0; i < rustAmt; i++) {
        const x = Math.random() * w, y = Math.random() * h, r = 2 + Math.random() * 9;
        g.fillStyle = 'rgba(96,52,26,' + (0.05 + Math.random() * 0.22) + ')';
        g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
      }
      // vertical streaks
      for (let i = 0; i < 10; i++) {
        const x = Math.random() * w;
        g.fillStyle = 'rgba(0,0,0,' + (0.05 + Math.random() * 0.12) + ')';
        g.fillRect(x, Math.random() * h * 0.4, 1, h * (0.3 + Math.random() * 0.6));
      }
      noise(g, w, h, 26);
    };
  }

  IV.buildArt = function () {
    const T = {};

    T.steel = bake(TS, TS, platedWall('#4a5058', '#2d3238', '#6d747c', 10));
    T.rust  = bake(TS, TS, platedWall('#5a4335', '#33251c', '#7a6046', 46));
    T.glass = bake(TS, TS, function (g, w, h) {
      g.fillStyle = '#1b2a30'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#2f4a55';
      for (let y = 0; y < h; y += 16) g.fillRect(0, y, w, 2);
      for (let x = 0; x < w; x += 16) g.fillRect(x, 0, 2, h);
      g.fillStyle = 'rgba(180,220,235,0.10)';
      g.beginPath(); g.moveTo(0, h); g.lineTo(w, 0); g.lineTo(w, 18); g.lineTo(14, h); g.fill();
      noise(g, w, h, 14);
    });
    T.door = bake(TS, TS, function (g, w, h) {
      g.fillStyle = '#3d4a52'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#2a343a'; g.fillRect(0, 0, w, 4); g.fillRect(0, h - 4, w, 4);
      g.fillStyle = '#556570';
      for (let y = 8; y < h - 8; y += 10) g.fillRect(4, y, w - 8, 5);
      g.fillStyle = '#c8b06a'; g.fillRect(w / 2 - 10, h / 2 - 3, 20, 6);
      g.fillStyle = '#1a1d20'; g.fillRect(w / 2 - 1, 0, 2, h);
      noise(g, w, h, 18);
    });
    T.locked = bake(TS, TS, function (g, w, h) {
      g.fillStyle = '#3a3230'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#241e1c';
      for (let i = -h; i < w; i += 12) { g.save(); g.translate(i, 0); g.rotate(0.35); g.fillRect(0, -10, 6, h * 1.6); g.restore(); }
      g.strokeStyle = '#8a2f22'; g.lineWidth = 3;
      g.strokeRect(6, 6, w - 12, h - 12);
      g.fillStyle = '#d04a30'; g.fillRect(w / 2 - 4, h / 2 - 4, 8, 8);
      noise(g, w, h, 16);
    });
    T.floor = bake(TS, TS, function (g, w, h) {
      g.fillStyle = '#23282c'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#2c3237';
      g.fillRect(0, 0, w, 3); g.fillRect(0, 0, 3, h);
      g.fillStyle = '#1c2023';
      for (let y = 8; y < h; y += 8) for (let x = 8; x < w; x += 8) g.fillRect(x, y, 3, 3);
      for (let i = 0; i < 20; i++) {
        g.fillStyle = 'rgba(70,45,25,' + (0.04 + Math.random() * 0.10) + ')';
        g.beginPath(); g.arc(Math.random() * w, Math.random() * h, 3 + Math.random() * 10, 0, 7); g.fill();
      }
      noise(g, w, h, 16);
    });
    T.ceil = bake(TS, TS, function (g, w, h) {
      g.fillStyle = '#191d21'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#14171a'; g.fillRect(0, h / 2 - 2, w, 4);
      g.fillStyle = '#2a3036';
      for (let x = 4; x < w; x += 12) g.fillRect(x, 0, 4, h);
      noise(g, w, h, 10);
    });

    // ---- sprites -------------------------------------------------------
    const SW = 48, SH = 72;
    function humanoid(color, opts) {
      opts = opts || {};
      return function (g, w, h) {
        const cx = w / 2;
        const skin = '#3a3a3c';
        // legs
        g.fillStyle = shade(color, -0.45);
        g.fillRect(cx - 9, h - 26, 7, 26); g.fillRect(cx + 2, h - 26, 7, 26);
        // torso
        g.fillStyle = color;
        g.fillRect(cx - 13, h - 52, 26, 28);
        // chest plate
        g.fillStyle = shade(color, -0.25);
        g.fillRect(cx - 10, h - 48, 20, 14);
        g.fillStyle = shade(color, 0.25);
        g.fillRect(cx - 10, h - 48, 20, 2);
        // arms
        g.fillStyle = shade(color, -0.15);
        g.fillRect(cx - 19, h - 50, 6, 22); g.fillRect(cx + 13, h - 50, 6, 22);
        // head + helmet
        g.fillStyle = skin; g.fillRect(cx - 7, h - 66, 14, 15);
        g.fillStyle = shade(color, opts.elite ? 0.35 : -0.35);
        g.fillRect(cx - 9, h - 68, 18, 9);
        g.fillStyle = opts.elite ? '#ffb347' : '#c8402c';
        g.fillRect(cx - 6, h - 58, 12, 3); // visor glow
        // weapon
        g.fillStyle = '#20242a';
        g.fillRect(cx + 4, h - 42, 24, 5);
        g.fillRect(cx + 8, h - 38, 5, 8);
        if (opts.elite) { g.fillStyle = '#ffb347'; g.fillRect(cx - 13, h - 54, 26, 2); }
        noise(g, w, h, 12, true);
      };
    }
    function shade(hex, amt) {
      const n = parseInt(hex.slice(1), 16);
      let r = (n >> 16) & 255, gg = (n >> 8) & 255, b = n & 255;
      const f = (v) => IV.clamp(Math.round(amt > 0 ? v + (255 - v) * amt : v * (1 + amt)), 0, 255);
      return 'rgb(' + f(r) + ',' + f(gg) + ',' + f(b) + ')';
    }
    IV.shade = shade;

    T.sprites = {};
    for (const k in IV.HOSTILES) {
      const hd = IV.HOSTILES[k];
      T.sprites[k] = bake(SW, SH, humanoid(hd.color, { elite: k === 'breacher' || k === 'warden' }));
    }
    T.sprites.crate = bake(SW, SH, function (g, w, h) {
      const y0 = h - 34;
      g.fillStyle = '#5b4a2e'; g.fillRect(8, y0, w - 16, 34);
      g.fillStyle = '#3d3120'; g.fillRect(8, y0, w - 16, 4); g.fillRect(8, h - 5, w - 16, 5);
      g.fillStyle = '#6f5a38'; g.fillRect(12, y0 + 8, w - 24, 18);
      g.fillStyle = '#c8b06a'; g.fillRect(w / 2 - 6, y0 + 14, 12, 5);
      g.fillStyle = '#8a8f96'; g.fillRect(8, y0 + 15, w - 16, 3);
      noise(g, w, h, 18, true);
    });
    T.sprites.crateRare = bake(SW, SH, function (g, w, h) {
      const y0 = h - 40;
      g.fillStyle = '#2f3a44'; g.fillRect(6, y0, w - 12, 40);
      g.fillStyle = '#1d252c'; g.fillRect(6, y0, w - 12, 5); g.fillRect(6, h - 6, w - 12, 6);
      g.fillStyle = '#3f4d59'; g.fillRect(11, y0 + 10, w - 22, 22);
      g.fillStyle = '#63d1c2'; g.fillRect(w / 2 - 8, y0 + 18, 16, 4);
      g.fillStyle = '#8a8f96'; g.fillRect(6, y0 + 20, w - 12, 3);
      noise(g, w, h, 16, true);
    });
    T.sprites.opened = bake(SW, SH, function (g, w, h) {
      const y0 = h - 22;
      g.fillStyle = '#3a3128'; g.fillRect(8, y0, w - 16, 22);
      g.fillStyle = '#241d17'; g.fillRect(10, y0 + 3, w - 20, 12);
      noise(g, w, h, 14, true);
    });
    T.sprites.bag = bake(SW, SH, function (g, w, h) {
      const y0 = h - 26;
      g.fillStyle = '#4a3f2c'; g.beginPath(); g.ellipse(w / 2, y0 + 14, 15, 12, 0, 0, 7); g.fill();
      g.fillStyle = '#2c2519'; g.fillRect(w / 2 - 13, y0 + 8, 26, 4);
      g.fillStyle = '#c8b06a'; g.fillRect(w / 2 - 3, y0 + 2, 6, 7);
      noise(g, w, h, 14, true);
    });
    T.sprites.corpse = bake(SW, SH, function (g, w, h) {
      g.fillStyle = '#3b3b40'; g.fillRect(6, h - 14, w - 12, 10);
      g.fillStyle = '#2a2a2e'; g.fillRect(10, h - 18, 18, 6);
      g.fillStyle = '#5a1f18'; g.beginPath(); g.ellipse(w / 2, h - 3, 18, 4, 0, 0, 7); g.fill();
      noise(g, w, h, 12, true);
    });
    T.sprites.extract = bake(SW, SH, function (g, w, h) {
      g.fillStyle = '#1f2a1f'; g.fillRect(w / 2 - 6, h - 30, 12, 30);
      g.fillStyle = '#7de08a'; g.fillRect(w / 2 - 10, h - 44, 20, 14);
      g.fillStyle = '#0d160d'; g.fillRect(w / 2 - 6, h - 40, 12, 6);
      g.fillStyle = 'rgba(125,224,138,0.35)';
      g.beginPath(); g.moveTo(w / 2, h - 46); g.lineTo(w / 2 - 16, h - 4); g.lineTo(w / 2 + 16, h - 4); g.fill();
    });
    T.sprites.pod = bake(SW, SH, function (g, w, h) {
      g.fillStyle = '#2b3540'; g.fillRect(w / 2 - 14, h - 42, 28, 42);
      g.fillStyle = '#5fa8d8'; g.fillRect(w / 2 - 9, h - 36, 18, 16);
      g.fillStyle = '#16202a'; g.fillRect(w / 2 - 9, h - 30, 18, 3);
      g.fillStyle = '#d8a24a'; g.fillRect(w / 2 - 14, h - 44, 28, 4);
      noise(g, w, h, 12, true);
    });

    IV.ART = T;
    return T;
  };
})(window.IV);
