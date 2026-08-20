// IRONVOID - heads-up display, weapon viewmodel and scanner, drawn in 2D
// over the upscaled raycast frame.
(function (IV) {
  'use strict';

  const HUD = {};
  const AMBER = '#e0a94c';
  const GREEN = '#7de08a';
  const RED = '#d05a45';
  const DIM = 'rgba(224,169,76,0.45)';

  function panel(g, x, y, w, h, alpha) {
    g.fillStyle = 'rgba(8,11,14,' + (alpha == null ? 0.55 : alpha) + ')';
    g.fillRect(x, y, w, h);
    g.strokeStyle = 'rgba(224,169,76,0.28)';
    g.lineWidth = 1;
    g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }

  function bar(g, x, y, w, h, frac, color, label) {
    g.fillStyle = 'rgba(0,0,0,0.55)';
    g.fillRect(x, y, w, h);
    g.fillStyle = color;
    g.fillRect(x, y, Math.max(0, Math.min(1, frac)) * w, h);
    g.strokeStyle = 'rgba(255,255,255,0.16)';
    g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    if (label) {
      g.fillStyle = '#e8e4da';
      g.font = '10px ui-monospace, Menlo, Consolas, monospace';
      g.fillText(label, x + 4, y + h - 3);
    }
  }

  // ---- viewmodel ---------------------------------------------------------
  function drawWeapon(g, W, H, raid) {
    const p = raid.player;
    const wd = p.active ? IV.def(p[p.active].id) : null;
    if (!wd) return;
    const s = Math.min(W / 960, H / 540) * 1.35;
    const bobX = Math.sin(p.bob) * 10 * s;
    const bobY = Math.abs(Math.cos(p.bob)) * 8 * s;
    const reloadDip = p.reloadT > 0 ? Math.sin((1 - p.reloadT / wd.reload) * Math.PI) * 90 * s : 0;
    const useDip = p.useT > 0 ? 120 * s : 0;
    const ads = p.ads ? 1 : 0;
    const cx = W * (0.72 - 0.22 * ads) + bobX * (1 - ads * 0.8);
    const cy = H - 10 + bobY + reloadDip + useDip + p.recoil * 260 * s;

    g.save();
    g.translate(cx, cy);
    g.scale(s, s);

    const dark = '#1c2026', metal = '#333a42', wood = '#5a4227', hi = '#4a545e';
    const heavy = wd.cal === '7.62' || wd.cal === '12ga';
    if (wd.slot === 'sidearm') {
      g.fillStyle = dark; g.fillRect(-14, -70, 26, 22);
      g.fillStyle = metal; g.fillRect(-10, -78, 14, 12);
      g.fillStyle = wd.id === 'w_hardline' ? wood : dark;
      g.fillRect(-18, -52, 20, 52);
      g.fillStyle = hi; g.fillRect(6, -74, 30, 7);
    } else {
      // stock + receiver + barrel, roughly shouldered
      g.fillStyle = wood; g.fillRect(-70, -60, 60, 26);
      g.fillStyle = dark; g.fillRect(-20, -74, 70, 30);
      g.fillStyle = metal; g.fillRect(40, -68, heavy ? 90 : 66, 10);
      g.fillStyle = hi; g.fillRect(46, -72, 10, 5);
      g.fillStyle = dark; g.fillRect(-4, -44, 16, 34);       // magazine
      g.fillStyle = metal; g.fillRect(-30, -44, 12, 16);     // grip
      if (wd.id === 'w_longshot') { g.fillStyle = '#222'; g.fillRect(0, -86, 44, 12); }
      if (wd.id === 'w_ironjaw') { g.fillStyle = metal; g.fillRect(40, -56, 60, 8); }
    }
    if (p.flash > 0) {
      const bx = wd.slot === 'sidearm' ? 36 : (heavy ? 130 : 106);
      const by = wd.slot === 'sidearm' ? -70 : -63;
      g.globalAlpha = p.flash;
      g.fillStyle = '#ffd98a';
      g.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const r = i % 2 ? 10 : 26;
        g.lineTo(bx + Math.cos(a) * r, by + Math.sin(a) * r * 0.7);
      }
      g.fill();
      g.globalAlpha = 1;
    }
    g.restore();
  }

  // ---- scanner -----------------------------------------------------------
  function drawScanner(g, raid, x, y, size) {
    const p = raid.player;
    const range = 11;
    const scale = size / (range * 2);
    g.save();
    g.beginPath(); g.rect(x, y, size, size); g.clip();
    g.fillStyle = 'rgba(6,9,12,0.82)'; g.fillRect(x, y, size, size);
    const cx = x + size / 2, cy = y + size / 2;
    for (let ty = (p.y - range) | 0; ty <= p.y + range; ty++) {
      for (let tx = (p.x - range) | 0; tx <= p.x + range; tx++) {
        const c = IV.cellAt(raid, tx, ty);
        const sx = cx + (tx + 0.5 - p.x) * scale, sy = cy + (ty + 0.5 - p.y) * scale;
        if (IV.isSolidCell(c)) g.fillStyle = 'rgba(120,140,150,0.30)';
        else if (c === IV.CELL.DOOR) g.fillStyle = 'rgba(224,169,76,0.55)';
        else if (c === IV.CELL.LOCKED) g.fillStyle = 'rgba(208,90,69,0.65)';
        else continue;
        g.fillRect(sx - scale / 2, sy - scale / 2, scale, scale);
      }
    }
    for (const z of raid.zones) {
      const d = IV.dist(z.x, z.y, p.x, p.y);
      const a = Math.atan2(z.y - p.y, z.x - p.x);
      const r = Math.min(d * scale, size / 2 - 6);
      g.fillStyle = z.open ? GREEN : 'rgba(125,224,138,0.35)';
      g.beginPath(); g.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 3.5, 0, 7); g.fill();
    }
    for (const c of raid.containers) {
      if (c.searched || IV.dist(c.x, c.y, p.x, p.y) > range) continue;
      g.fillStyle = c.tier === 'rare' ? '#63d1c2' : 'rgba(200,176,106,0.75)';
      g.fillRect(cx + (c.x - p.x) * scale - 1.5, cy + (c.y - p.y) * scale - 1.5, 3, 3);
    }
    // only hostiles actively hunting show up: the scanner reads their radios
    for (const e of raid.enemies) {
      if (e.dead || e.alert < 0.5 || IV.dist(e.x, e.y, p.x, p.y) > range) continue;
      g.fillStyle = RED;
      g.beginPath(); g.arc(cx + (e.x - p.x) * scale, cy + (e.y - p.y) * scale, 2.6, 0, 7); g.fill();
    }
    g.strokeStyle = AMBER; g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(cx + Math.cos(p.ang) * 7, cy + Math.sin(p.ang) * 7);
    g.lineTo(cx + Math.cos(p.ang + 2.5) * 5, cy + Math.sin(p.ang + 2.5) * 5);
    g.lineTo(cx + Math.cos(p.ang - 2.5) * 5, cy + Math.sin(p.ang - 2.5) * 5);
    g.closePath(); g.fillStyle = AMBER; g.fill();
    g.restore();
    g.strokeStyle = 'rgba(224,169,76,0.35)';
    g.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);
  }

  // ---- main --------------------------------------------------------------
  HUD.draw = function (g, W, H, raid, opts) {
    const p = raid.player;
    const mono = 'ui-monospace, Menlo, Consolas, monospace';

    drawWeapon(g, W, H, raid);

    // damage vignette
    if (p.hurtFlash > 0 || p.hp < p.maxHp * 0.35) {
      const a = Math.max(p.hurtFlash * 0.45, p.hp < p.maxHp * 0.35 ? 0.10 + Math.sin(raid.t * 4) * 0.04 : 0);
      const grd = g.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.75);
      grd.addColorStop(0, 'rgba(150,20,10,0)');
      grd.addColorStop(1, 'rgba(150,20,10,' + a.toFixed(3) + ')');
      g.fillStyle = grd; g.fillRect(0, 0, W, H);
    }

    // crosshair
    if (!opts.looting) {
      const wd = p.active ? IV.def(p[p.active].id) : null;
      const spread = wd ? wd.spread * (p.ads ? 0.42 : 1) * (p.sprinting ? 1.9 : 1) * (1 + p.recoil * 4) : 0.03;
      const rad = 6 + spread * H * 0.9;
      g.strokeStyle = 'rgba(232,228,218,0.75)';
      g.lineWidth = 1.5;
      for (const a of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
        g.beginPath();
        g.moveTo(W / 2 + Math.cos(a) * rad, H / 2 + Math.sin(a) * rad);
        g.lineTo(W / 2 + Math.cos(a) * (rad + 6), H / 2 + Math.sin(a) * (rad + 6));
        g.stroke();
      }
      if (p.hitMark > 0) {
        g.strokeStyle = 'rgba(255,110,80,' + Math.min(1, p.hitMark * 4) + ')';
        g.lineWidth = 2;
        for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
          g.beginPath();
          g.moveTo(W / 2 + dx * 7, H / 2 + dy * 7);
          g.lineTo(W / 2 + dx * 14, H / 2 + dy * 14);
          g.stroke();
        }
      }
    }

    // top bar: timer, map, alarm
    panel(g, W / 2 - 130, 10, 260, 52);
    g.textAlign = 'center';
    const low = raid.timeLeft < 60;
    g.font = 'bold 19px ' + mono;
    g.fillStyle = low ? RED : AMBER;
    g.fillText(IV.fmtTime(raid.timeLeft), W / 2, 31);
    g.font = '10px ' + mono; g.fillStyle = DIM;
    g.fillText(raid.map.name.toUpperCase(), W / 2, 45);
    g.textAlign = 'left';
    bar(g, W / 2 - 122, 50, 244, 5, raid.alarm, raid.alarm > 0.6 ? RED : 'rgba(224,169,76,0.7)');
    if (raid.alarm > 0.6) {
      g.textAlign = 'center'; g.fillStyle = RED; g.font = '9px ' + mono;
      g.fillText('STATION ALERT', W / 2, 72); g.textAlign = 'left';
    }

    // bottom left: condition
    const bx = 20, by = H - 92;
    panel(g, bx, by, 210, 74);
    g.font = '10px ' + mono; g.fillStyle = DIM;
    g.fillText('CONDITION', bx + 8, by + 15);
    bar(g, bx + 8, by + 20, 194, 12, p.hp / p.maxHp, p.hp / p.maxHp > 0.35 ? '#b8443a' : '#e2503f', Math.ceil(p.hp) + ' HP');
    const armorDef = p.armor ? IV.def(p.armor.id) : null;
    bar(g, bx + 8, by + 36, 94, 9, armorDef ? p.armor.dura / armorDef.dura : 0, '#5b8fd6',
      armorDef ? 'AC' + armorDef.ac : 'NO ARMOUR');
    bar(g, bx + 108, by + 36, 94, 9, p.stamina / 100, '#7de08a', 'WIND');
    g.fillStyle = DIM;
    const wt = IV.Sim.carriedWeight(p);
    g.fillText('LOAD ' + wt.toFixed(1) + ' kg' + (wt > 18 ? '  [SLOW]' : ''), bx + 8, by + 62);
    g.fillText('RIG ' + p.pockets.length + '/' + (p.rig ? IV.def(p.rig.id).slots : 0), bx + 128, by + 62);

    // bottom right: weapon
    const wx = W - 250, wy = H - 92;
    panel(g, wx, wy, 230, 74);
    const w = p.active ? p[p.active] : null;
    if (w) {
      const wd = IV.def(w.id);
      g.fillStyle = '#e8e4da'; g.font = 'bold 13px ' + mono;
      g.fillText(wd.name.toUpperCase(), wx + 10, wy + 20);
      g.font = 'bold 26px ' + mono;
      g.fillStyle = w.loaded ? AMBER : RED;
      g.textAlign = 'right';
      g.fillText(w.loaded + '/' + wd.mag, wx + 220, wy + 50);
      g.textAlign = 'left';
      g.font = '10px ' + mono; g.fillStyle = DIM;
      let reserve = 0;
      for (const s of p.pockets) if (IV.def(s.id).kind === 'ammo' && IV.def(s.id).cal === wd.cal) reserve += s.n;
      g.fillText((w.ammo ? IV.def(w.ammo).name : wd.cal) + '   RESERVE ' + reserve, wx + 10, wy + 38);
      g.fillText(p.active === 'primary' ? '[1] PRIMARY' : '[2] SIDEARM', wx + 10, wy + 64);
      if (p.reloadT > 0) bar(g, wx + 10, wy + 68, 210, 4, 1 - p.reloadT / wd.reload, AMBER);
    } else {
      g.fillStyle = RED; g.font = '13px ' + mono;
      g.fillText('UNARMED', wx + 10, wy + 24);
    }

    // scanner
    if (opts.scanner) drawScanner(g, raid, W - 150, 66, 130);

    // interaction prompt
    const near = raid.hint;
    g.textAlign = 'center';
    if (near && !opts.looting) {
      let label = '', prog = -1;
      if (near.kind === 'door') label = near.obj.locked ? '[E] FORCE ' + near.obj.locked.toUpperCase() + ' LOCK' : '[E] OPEN DOOR';
      else if (near.kind === 'cache') {
        if (near.obj.searched) label = '[E] OPEN CACHE';
        else { label = '[HOLD E] SEARCH'; prog = near.obj.searchT / IV.Sim.SEARCH_TIME[near.obj.tier]; }
      } else if (near.kind === 'body') label = '[E] SEARCH BODY';
      else if (near.kind === 'bag') label = '[E] OPEN BAG';
      g.font = '13px ' + mono; g.fillStyle = '#e8e4da';
      g.fillText(label, W / 2, H * 0.66);
      if (prog > 0) bar(g, W / 2 - 70, H * 0.66 + 8, 140, 6, prog, AMBER);
    }

    // extraction
    if (p.extractZone) {
      const z = p.extractZone;
      if (!z.open) {
        g.fillStyle = RED; g.font = '14px ' + mono;
        g.fillText(z.name + ' NOT POWERED', W / 2, H * 0.58);
      } else {
        g.fillStyle = GREEN; g.font = 'bold 15px ' + mono;
        g.fillText('EXTRACTING - ' + z.name, W / 2, H * 0.56);
        bar(g, W / 2 - 110, H * 0.58, 220, 10, p.extractT / IV.Sim.EXTRACT_TIME, GREEN);
        g.fillStyle = DIM; g.font = '10px ' + mono;
        g.fillText('HOLD POSITION', W / 2, H * 0.58 + 26);
      }
    }

    // med use
    if (p.useT > 0 && p.useWhat) {
      g.fillStyle = '#e8e4da'; g.font = '13px ' + mono;
      g.fillText('USING ' + IV.def(p.useWhat.id).name.toUpperCase(), W / 2, H * 0.72);
      bar(g, W / 2 - 80, H * 0.72 + 8, 160, 6, 1 - p.useT / IV.def(p.useWhat.id).useTime, GREEN);
    }
    g.textAlign = 'left';
  };

  IV.HUD = HUD;
})(window.IV);
