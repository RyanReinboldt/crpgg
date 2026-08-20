// IRONVOID - application shell: scene management, input, the frame loop and
// the bridge between a finished raid and the persistent profile.
(function (IV) {
  'use strict';

  const App = {
    scene: 'meta',
    raid: null,
    canvas: null,
    ctx: null,
    scanner: true,
    paused: false,
    sens: 0.0022,
    input: {
      fwd: false, back: false, left: false, right: false,
      sprint: false, fire: false, fireHeld: false, ads: false,
      use: false, looting: false,
    },
  };

  // ---- boot --------------------------------------------------------------
  App.boot = function () {
    IV.buildArt();
    IV.Renderer.init();
    IV.Profile.load();
    App.canvas = document.getElementById('view');
    App.ctx = App.canvas.getContext('2d');
    App.ctx.imageSmoothingEnabled = false;
    resize();
    window.addEventListener('resize', resize);
    bindInput();
    bindClicks();
    IV.UI.renderMeta();
    showScene('meta');
    requestAnimationFrame(frame);
  };

  function resize() {
    const c = App.canvas;
    const r = c.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    c.width = Math.max(320, Math.floor(r.width * dpr));
    c.height = Math.max(180, Math.floor(r.height * dpr));
    App.ctx.imageSmoothingEnabled = false;
  }

  function showScene(s) {
    App.scene = s;
    document.body.dataset.scene = s;
  }

  // ---- input -------------------------------------------------------------
  const KEYMAP = {
    KeyW: 'fwd', ArrowUp: 'fwd', KeyS: 'back', ArrowDown: 'back',
    KeyA: 'left', KeyD: 'right', ShiftLeft: 'sprint', ShiftRight: 'sprint',
  };

  function bindInput() {
    const c = App.canvas;
    c.addEventListener('click', () => {
      if (App.scene !== 'raid' || App.input.looting || App.paused) return;
      IV.audioResume();
      if (document.pointerLockElement !== c && c.requestPointerLock) c.requestPointerLock();
    });
    document.addEventListener('mousemove', (e) => {
      if (App.scene !== 'raid' || !App.raid || App.raid.over) return;
      if (document.pointerLockElement !== App.canvas) return;
      App.raid.player.ang += e.movementX * App.sens * (App.raid.player.ads ? 0.55 : 1);
    });
    document.addEventListener('mousedown', (e) => {
      if (App.scene !== 'raid' || App.paused) return;
      if (document.pointerLockElement !== App.canvas) return;
      if (e.button === 0) App.input.fire = true;
      if (e.button === 2) App.input.ads = true;
    });
    document.addEventListener('mouseup', (e) => {
      if (e.button === 0) App.input.fire = false;
      if (e.button === 2) App.input.ads = false;
    });
    document.addEventListener('contextmenu', (e) => { if (App.scene === 'raid') e.preventDefault(); });

    document.addEventListener('keydown', (e) => {
      if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
      if (KEYMAP[e.code] !== undefined) { App.input[KEYMAP[e.code]] = true; e.preventDefault(); }
      if (App.scene !== 'raid') return;
      const raid = App.raid;
      switch (e.code) {
        case 'KeyE':
          if (App.input.looting) IV.closeLoot();
          else App.input.use = true;
          e.preventDefault();
          break;
        case 'KeyR': if (!App.input.looting && !App.paused) IV.Sim.reload(raid); break;
        case 'KeyF': if (!App.input.looting && !App.paused) IV.Sim.useMed(raid); break;
        case 'Digit1': if (!App.paused) IV.Sim.swap(raid, 'primary'); break;
        case 'Digit2': if (!App.paused) IV.Sim.swap(raid, 'sidearm'); break;
        case 'KeyM': App.scanner = !App.scanner; IV.sfx('ui'); break;
        case 'Tab': App.scanner = !App.scanner; e.preventDefault(); break;
        case 'Escape':
          if (App.input.looting) IV.closeLoot();
          else togglePause();
          break;
        default: break;
      }
    });
    document.addEventListener('keyup', (e) => {
      if (KEYMAP[e.code] !== undefined) App.input[KEYMAP[e.code]] = false;
      if (e.code === 'KeyE') App.input.use = false;
    });
    document.addEventListener('pointerlockchange', () => {
      if (App.scene === 'raid' && document.pointerLockElement !== App.canvas &&
          !App.input.looting && !App.paused && App.raid && !App.raid.over) {
        togglePause(true);
      }
    });
  }

  function togglePause(force) {
    if (App.scene !== 'raid' || !App.raid || App.raid.over) return;
    App.paused = force != null ? force : !App.paused;
    const ov = document.getElementById('overlay');
    if (App.paused) {
      ov.innerHTML =
        '<div class="panel pause"><div class="ph big"><span>RAID PAUSED</span>' +
        '<span class="hint">' + IV.UI.esc(App.raid.map.name) + '</span></div>' +
        '<p class="note">The station does not wait. The clock is still running when you resume.</p>' +
        '<div class="keys">' +
        '<div><b>WASD</b> move</div><div><b>SHIFT</b> sprint</div>' +
        '<div><b>MOUSE</b> look</div><div><b>LMB</b> fire</div>' +
        '<div><b>RMB</b> aim</div><div><b>R</b> reload</div>' +
        '<div><b>E</b> interact / hold to search</div><div><b>F</b> use medical</div>' +
        '<div><b>1 / 2</b> primary / sidearm</div><div><b>M</b> scanner</div>' +
        '</div>' +
        '<button class="wide go" data-resume="1">RESUME</button>' +
        '<button class="wide bad" data-abandonraid="1">ABANDON RAID (LOSE KIT)</button></div>';
      ov.classList.add('show');
    } else {
      ov.classList.remove('show');
      ov.innerHTML = '';
      if (App.canvas.requestPointerLock) App.canvas.requestPointerLock();
    }
  }

  // ---- click routing -----------------------------------------------------
  function bindClicks() {
    document.getElementById('overlay').addEventListener('click', (e) => {
      const t = e.target.closest('button');
      if (t && t.dataset.todeck) { IV.sfx('ui'); backToDeck(); return; }
      if (t && t.dataset.resume) { IV.sfx('ui'); togglePause(false); return; }
      if (t && t.dataset.abandonraid) { IV.sfx('uiBad'); App.paused = false; IV.Sim.end(App.raid, 'mia'); return; }
      IV.UI.lootClick(e);
    });
    document.getElementById('meta').addEventListener('click', onMetaClick);
  }

  function onMetaClick(e) {
    const t = e.target.closest('button');
    if (!t) return;
    const P = IV.Profile;
    const d = t.dataset;
    let rerender = true;
    IV.audioResume();
    if (d.tab) { IV.UI.setTab(d.tab); IV.sfx('ui'); return; }
    if (d.vendor) { IV.UI.setVendor(d.vendor); IV.sfx('ui'); return; }
    if (d.launch) { startRaid(d.launch); return; }
    if (d.equip) {
      const [uid, slot] = d.equip.split('|');
      const err = P.equip(uid, slot);
      if (err) { IV.toast(err); IV.sfx('uiBad'); } else IV.sfx('ui');
    } else if (d.unequip) {
      const err = P.unequip(d.unequip);
      if (err) { IV.toast(err); IV.sfx('uiBad'); } else IV.sfx('ui');
    } else if (d.pocketout) {
      const err = P.unequip('pocket', +d.pocketout);
      if (err) { IV.toast(err); IV.sfx('uiBad'); } else IV.sfx('ui');
    } else if (d.sell || d.sellto) {
      const [vid, uid] = d.sellto ? d.sellto.split('|') : [null, d.sell];
      const s = P.data.stash.find((x) => x.uid === uid);
      if (s) {
        const v = vid ? IV.vendorById(vid) : P.vendorFor(IV.def(s.id).kind);
        if (!v) { IV.toast('nobody buys that'); IV.sfx('uiBad'); }
        else {
          const price = P.sellPrice(v, s);
          P.fromStash(uid);
          P.earn(price);
          if (P.addRep(v.id, Math.round(price * 0.35))) IV.toast(v.name + ' respects you a little more');
          IV.sfx('ui');
          P.log('Sold ' + IV.stackLabel(s) + ' to ' + v.name + ' for ' + IV.fmtCredits(price) + '.');
        }
      }
    } else if (d.dump) {
      const v = IV.vendorById(d.dump);
      let total = 0, n = 0;
      for (const s of P.data.stash.slice()) {
        if (v.buys.indexOf(IV.def(s.id).kind) < 0) continue;
        total += P.sellPrice(v, s);
        P.fromStash(s.uid);
        n++;
      }
      P.earn(total);
      P.addRep(v.id, Math.round(total * 0.35));
      P.log('Sold ' + n + ' items to ' + v.name + ' for ' + IV.fmtCredits(total) + '.');
      IV.toast('sold ' + n + ' items for ' + IV.fmtCredits(total));
      IV.sfx('loot');
    } else if (d.buy) {
      const [vid, iid, n] = d.buy.split('|');
      const v = IV.vendorById(vid);
      const price = P.buyPrice(v, iid, +n);
      if (!P.pay(price)) { IV.toast('not enough credits'); IV.sfx('uiBad'); }
      else if (P.toStash(IV.stack(iid, +n))) { IV.toast('stash is full'); P.earn(price); IV.sfx('uiBad'); }
      else { IV.sfx('ui'); P.log('Bought ' + IV.def(iid).name + ' from ' + v.name + '.'); }
    } else if (d.accept) {
      const err = P.acceptContract(d.accept);
      if (err) { IV.toast(err); IV.sfx('uiBad'); } else IV.sfx('ui');
    } else if (d.abandon) {
      P.data.contracts.active = P.data.contracts.active.filter((x) => x !== d.abandon);
      IV.sfx('uiBad');
    } else if (d.turnin) {
      const c = IV.contractById(d.turnin);
      const err = P.turnIn(d.turnin);
      if (err) { IV.toast(err); IV.sfx('uiBad'); }
      else { IV.toast('contract paid: ' + IV.fmtCredits(c.reward.credits)); IV.sfx('extract'); P.log('Completed ' + c.name + '.'); }
    } else if (d.upgrade) {
      const mod = IV.SHIP[d.upgrade];
      const next = mod.levels[P.data.ship[d.upgrade] + 1];
      if (!next) return;
      if (!P.pay(next.cost)) { IV.toast('not enough credits'); IV.sfx('uiBad'); }
      else { P.data.ship[d.upgrade]++; IV.toast(mod.name + ' upgraded'); IV.sfx('extract'); }
    } else if (d.repair) {
      const all = P.data.stash.concat(P.loadoutStacks());
      const s = all.find((x) => x.uid === d.repair);
      if (s) {
        const def = IV.def(s.id);
        const cost = Math.round((def.dura - s.dura) * (def.value / def.dura) * 0.6 * P.workshop().repair);
        if (!P.pay(cost)) { IV.toast('not enough credits'); IV.sfx('uiBad'); }
        else { s.dura = def.dura; IV.sfx('ui'); IV.toast(def.name + ' repaired'); }
      }
    } else if (d.insure) {
      if (P.data.insured) { IV.toast('already insured for this run'); IV.sfx('uiBad'); }
      else {
        const err = P.buyInsurance();
        if (err) { IV.toast(err); IV.sfx('uiBad'); } else { IV.sfx('ui'); IV.toast('kit insured'); }
      }
    } else if (d.sound) {
      IV.audioToggle(!IV.audioEnabled());
    } else if (d.wipe) {
      if (window.confirm('Wipe this crew and start over? Everything in the stash is lost.')) {
        IV.Profile.reset();
        IV.toast('new crew registered');
      }
    } else rerender = false;
    if (rerender) { P.save(); IV.UI.renderMeta(); }
  }

  // ---- raid lifecycle ----------------------------------------------------
  function startRaid(mapId) {
    const P = IV.Profile;
    const map = IV.mapById(mapId);
    if (!P.data.loadout.rig) { IV.toast('equip a rig before you deploy'); IV.sfx('uiBad'); return; }
    IV.audioResume();
    const seed = (Math.random() * 0xffffffff) >>> 0;
    App.raid = IV.buildRaid(map, seed, P.data);
    App.paused = false;
    showScene('raid');
    document.getElementById('overlay').classList.remove('show');
    document.getElementById('overlay').innerHTML = '';
    resize();
    IV.toast('inserted on ' + map.name, 'good');
    if (App.canvas.requestPointerLock) App.canvas.requestPointerLock();
  }
  App.startRaid = startRaid;

  function backToDeck() {
    document.getElementById('overlay').classList.remove('show');
    document.getElementById('overlay').innerHTML = '';
    App.raid = null;
    showScene('meta');
    IV.UI.renderMeta();
  }

  function finishRaid(raid) {
    const P = IV.Profile, d = P.data, res = raid.over;
    const p = res.player;
    d.stats.raids++;
    d.stats.kills += res.kills.length;

    const ev = {
      kills: res.kills, extracted: res.outcome === 'extract', map: res.map,
      viaPod: res.viaPod, shots: res.shots, weight: res.weight, carried: res.carried,
    };
    res.contractBumps = P.applyContractEvents(ev);

    if (res.outcome === 'extract') {
      d.stats.extracts++;
      if (res.viaPod) d.stats.podExtracts++;
      // equipment comes home in the state it was in
      const l = d.loadout;
      for (const k of ['primary', 'sidearm', 'armor', 'helmet', 'rig']) l[k] = p[k] || null;
      l.pockets = [];
      let value = 0, overflow = 0;
      const haul = [];
      for (const s of p.pockets) {
        value += IV.stackValue(s);
        haul.push(s);
        const left = P.toStash(s);
        if (left) overflow += left;
      }
      res.haul = haul;
      res.value = value;
      res.overflow = overflow;
      d.stats.bestHaul = Math.max(d.stats.bestHaul, value);
      P.log('Extracted from ' + res.mapName + ' with ' + IV.fmtCredits(value) + ' of salvage.');
      IV.toast('extracted with ' + IV.fmtCredits(value), 'good');
    } else {
      d.stats.deaths++;
      const lost = [];
      let value = 0;
      const insured = d.insured || [];
      const recovered = [];
      for (const s of P.loadoutStacks()) {
        value += IV.stackValue(s);
        lost.push(s);
        if (insured.indexOf(s.uid) >= 0 && Math.random() < 0.7) {
          const copy = Object.assign({}, s, { uid: IV.uid() });
          if (!P.toStash(copy)) recovered.push(copy);
        }
      }
      for (const s of p.pockets) { value += IV.stackValue(s); lost.push(s); }
      d.loadout = { primary: null, sidearm: null, armor: null, helmet: null, rig: null, pockets: [] };
      res.lost = lost;
      res.value = value;
      res.recovered = recovered;
      P.log(res.outcome === 'dead'
        ? 'Killed on ' + res.mapName + '. Lost ' + IV.fmtCredits(value) + ' of kit.'
        : 'Failed to extract from ' + res.mapName + '. Kit written off.');
      IV.toast(res.outcome === 'dead' ? 'crew lost' : 'extraction window closed', 'bad');
    }
    d.insured = null;
    P.save();
    if (document.exitPointerLock) document.exitPointerLock();
    IV.UI.showSummary(res);
  }

  // ---- frame loop --------------------------------------------------------
  let last = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;
    if (App.scene !== 'raid' || !App.raid) return;
    const raid = App.raid;

    if (!raid.over && !App.paused) IV.Sim.update(raid, App.input, dt);
    if (raid.over && !raid.summarised) { raid.summarised = true; finishRaid(raid); }

    const p = raid.player;
    const cam = {
      fov: p.ads ? 0.44 : 0.66,
      horizon: Math.sin(p.bob * 2) * 3 - p.recoil * 220,
    };
    const frameBuf = IV.Renderer.render(raid, cam);
    const g = App.ctx, W = App.canvas.width, H = App.canvas.height;
    g.imageSmoothingEnabled = false;
    g.drawImage(frameBuf, 0, 0, W, H);

    // tracers, drawn in screen space over the frame
    drawTracers(g, W, H, raid, cam);
    IV.HUD.draw(g, W, H, raid, { looting: App.input.looting, scanner: App.scanner });
  }

  function drawTracers(g, W, H, raid, cam) {
    const p = raid.player;
    const dirX = Math.cos(p.ang), dirY = Math.sin(p.ang);
    const planeX = -dirY * cam.fov, planeY = dirX * cam.fov;
    const invDet = 1 / (planeX * dirY - dirX * planeY);
    const horizon = H / 2 + (cam.horizon * H) / IV.Renderer.H;
    g.lineWidth = Math.max(1, H / 300);
    for (const b of raid.bullets) {
      const project = (x, y) => {
        const rx = x - p.x, ry = y - p.y;
        const tX = invDet * (dirY * rx - dirX * ry);
        const tY = invDet * (-planeY * rx + planeX * ry);
        if (tY <= 0.1) return null;
        return { x: (W / 2) * (1 + tX / tY), y: horizon + (H * 0.06) / tY, d: tY };
      };
      const a = project(b.x0, b.y0), c = project(b.x1, b.y1);
      if (!a || !c) continue;
      g.strokeStyle = b.hostile ? 'rgba(255,150,90,0.55)' : 'rgba(255,225,150,0.65)';
      g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(c.x, c.y); g.stroke();
    }
  }

  IV.App = App;
  window.addEventListener('DOMContentLoaded', () => {
    try { App.boot(); } catch (err) {
      document.body.innerHTML = '<pre style="color:#e0a94c;padding:24px;font:13px monospace">' +
        'IRONVOID failed to start:\n\n' + (err && err.stack ? err.stack : err) + '</pre>';
    }
  });
})(window.IV);
