// IRONVOID - procedural audio. Synthesised on the fly, no sample files.
(function (IV) {
  'use strict';

  let ctx = null, master = null, enabled = true;

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
    return ctx;
  }

  function noiseBuffer(dur) {
    const n = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  function burst(o) {
    if (!enabled || !ensure()) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(o.dur);
    const filt = ctx.createBiquadFilter();
    filt.type = o.type || 'lowpass';
    filt.frequency.setValueAtTime(o.f0, t);
    filt.frequency.exponentialRampToValueAtTime(Math.max(60, o.f1), t + o.dur);
    filt.Q.value = o.q || 1;
    const g = ctx.createGain();
    g.gain.setValueAtTime(o.vol, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + o.dur);
    src.connect(filt); filt.connect(g); g.connect(master);
    src.start(t); src.stop(t + o.dur);
  }

  function tone(o) {
    if (!enabled || !ensure()) return;
    const t = ctx.currentTime + (o.delay || 0);
    const osc = ctx.createOscillator();
    osc.type = o.wave || 'sine';
    osc.frequency.setValueAtTime(o.f0, t);
    if (o.f1) osc.frequency.exponentialRampToValueAtTime(o.f1, t + o.dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    osc.connect(g); g.connect(master);
    osc.start(t); osc.stop(t + o.dur + 0.02);
  }

  const SFX = {
    shot: (cal) => {
      const heavy = cal === '7.62' || cal === '.44' || cal === '12ga';
      burst({ dur: heavy ? 0.20 : 0.11, f0: heavy ? 1800 : 2600, f1: heavy ? 160 : 340, vol: heavy ? 0.55 : 0.34 });
      tone({ wave: 'square', f0: heavy ? 150 : 240, f1: 50, dur: 0.09, vol: heavy ? 0.22 : 0.12 });
    },
    enemyShot: () => burst({ dur: 0.14, f0: 1500, f1: 200, vol: 0.16 }),
    hit: () => burst({ dur: 0.09, f0: 900, f1: 120, vol: 0.30 }),
    armorHit: () => { burst({ dur: 0.07, f0: 4200, f1: 900, vol: 0.26, type: 'bandpass', q: 4 }); },
    playerHurt: () => { burst({ dur: 0.28, f0: 500, f1: 90, vol: 0.34 }); tone({ wave: 'sawtooth', f0: 90, f1: 44, dur: 0.3, vol: 0.14 }); },
    kill: () => { tone({ wave: 'triangle', f0: 320, f1: 120, dur: 0.22, vol: 0.16 }); burst({ dur: 0.3, f0: 700, f1: 90, vol: 0.18 }); },
    reload: () => { burst({ dur: 0.05, f0: 3000, f1: 900, vol: 0.18, type: 'bandpass', q: 3 }); burst({ dur: 0.06, f0: 2200, f1: 700, vol: 0.16, type: 'bandpass', q: 3, delay: 0.18 }); },
    dry: () => burst({ dur: 0.04, f0: 3600, f1: 1400, vol: 0.2, type: 'bandpass', q: 6 }),
    step: () => burst({ dur: 0.07, f0: 420, f1: 110, vol: 0.055 }),
    door: () => { tone({ wave: 'sawtooth', f0: 70, f1: 130, dur: 0.45, vol: 0.10 }); burst({ dur: 0.4, f0: 800, f1: 200, vol: 0.10 }); },
    locked: () => { tone({ wave: 'square', f0: 180, f1: 120, dur: 0.14, vol: 0.16 }); },
    loot: () => { tone({ wave: 'triangle', f0: 520, dur: 0.09, vol: 0.13 }); tone({ wave: 'triangle', f0: 780, dur: 0.10, vol: 0.11, delay: 0.08 }); },
    search: () => burst({ dur: 0.10, f0: 1600, f1: 400, vol: 0.07 }),
    heal: () => { tone({ wave: 'sine', f0: 300, f1: 600, dur: 0.4, vol: 0.13 }); },
    ui: () => tone({ wave: 'square', f0: 660, dur: 0.045, vol: 0.07 }),
    uiBad: () => tone({ wave: 'square', f0: 180, dur: 0.10, vol: 0.09 }),
    alarm: () => { tone({ wave: 'sawtooth', f0: 440, f1: 300, dur: 0.6, vol: 0.14 }); tone({ wave: 'sawtooth', f0: 440, f1: 300, dur: 0.6, vol: 0.14, delay: 0.7 }); },
    extract: () => { [330, 440, 660].forEach((f, i) => tone({ wave: 'triangle', f0: f, dur: 0.5, vol: 0.16, delay: i * 0.16 })); },
    death: () => { tone({ wave: 'sawtooth', f0: 220, f1: 40, dur: 1.4, vol: 0.25 }); burst({ dur: 1.2, f0: 600, f1: 60, vol: 0.2 }); },
    beep: () => tone({ wave: 'square', f0: 1000, dur: 0.05, vol: 0.06 }),
  };

  IV.sfx = function (name, arg) {
    const f = SFX[name];
    if (f) { try { f(arg); } catch (e) { /* audio is never fatal */ } }
  };
  IV.audioResume = function () { const c = ensure(); if (c && c.state === 'suspended') c.resume(); };
  IV.audioToggle = function (on) { enabled = on; if (master) master.gain.value = on ? 0.5 : 0; return enabled; };
  IV.audioEnabled = () => enabled;
})(window.IV);
