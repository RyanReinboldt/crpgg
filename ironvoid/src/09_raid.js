// IRONVOID - the raid simulation: movement, gunplay, hostile AI, looting,
// extraction. Everything that can take your kit away from you lives here.
(function (IV) {
  'use strict';

  const PLAYER_R = 0.22;
  const ENEMY_R = 0.30;
  const BASE_SPEED = 2.6;
  const SPRINT_MULT = 1.7;
  const SEARCH_TIME = { common: 2.2, rare: 3.8 };
  const EXTRACT_TIME = 6.0;

  const Sim = {};

  // ---- helpers ----------------------------------------------------------
  function los(raid, ax, ay, bx, by, maxD) {
    const dx = bx - ax, dy = by - ay;
    const d = Math.hypot(dx, dy);
    if (maxD && d > maxD) return false;
    const steps = Math.ceil(d / 0.18);
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      if (IV.blocked(raid, ax + dx * t, ay + dy * t)) return false;
    }
    return true;
  }
  Sim.los = los;

  function tryMove(raid, ent, nx, ny, r) {
    // axis-separated so we slide along walls instead of sticking to them
    const cx = ent.x, cy = ent.y;
    if (!IV.blocked(raid, nx + Math.sign(nx - cx) * r, cy)) ent.x = nx;
    if (!IV.blocked(raid, ent.x, ny + Math.sign(ny - cy) * r)) ent.y = ny;
  }

  function weaponOf(p) {
    return p.active ? p[p.active] : null;
  }
  function weaponDef(p) {
    const w = weaponOf(p);
    return w ? IV.def(w.id) : null;
  }

  function ammoInPockets(p, cal) {
    for (const s of p.pockets) {
      const d = IV.def(s.id);
      if (d.kind === 'ammo' && d.cal === cal && s.n > 0) return s;
    }
    return null;
  }

  function rigUsed(p) { return p.pockets.length; }
  function rigCap(p) { return p.rig ? IV.def(p.rig.id).slots : 0; }

  function addToRig(p, stack) {
    const d = IV.def(stack.id);
    if (d.stack > 1) {
      for (const s of p.pockets) {
        if (s.id !== stack.id) continue;
        const room = d.stack - s.n;
        if (room <= 0) continue;
        const move = Math.min(room, stack.n);
        s.n += move; stack.n -= move;
        if (stack.n <= 0) return true;
      }
    }
    if (rigUsed(p) >= rigCap(p)) return false;
    p.pockets.push(stack);
    return true;
  }
  Sim.addToRig = addToRig;

  function carriedWeight(p) {
    let w = 0;
    for (const k of ['primary', 'sidearm', 'armor', 'helmet', 'rig']) if (p[k]) w += IV.stackWeight(p[k]);
    for (const s of p.pockets) w += IV.stackWeight(s);
    return w;
  }
  Sim.carriedWeight = carriedWeight;

  function speedFor(p) {
    const w = carriedWeight(p);
    const over = Math.max(0, w - 18);
    return BASE_SPEED * IV.clamp(1 - over * 0.014, 0.45, 1);
  }

  // ---- damage -----------------------------------------------------------
  function armorFactor(pen, ac) {
    if (ac <= 0) return 1;
    if (pen >= ac) return 1;
    return IV.clamp(0.5 - (ac - pen) * 0.13, 0.12, 0.5);
  }

  function damageEnemy(raid, e, dmg, pen, head, slot) {
    if (e.dead) return;
    let mult = 1;
    if (head) mult = 2.4;
    const f = armorFactor(pen, e.def.armor);
    const applied = Math.max(3, Math.round(dmg * mult * f));
    e.hp -= applied;
    e.hurtT = 0.12;
    e.alert = 1;
    e.target = { x: raid.player.x, y: raid.player.y };
    e.state = 'engage';
    if (f < 0.6) IV.sfx('armorHit'); else IV.sfx('hit');
    if (e.hp <= 0) {
      e.dead = true; e.deadT = 0; e.state = 'dead';
      e.loot = [];
      const rolls = 1 + (raid.rng.chance(0.45) ? 1 : 0) + (e.def.armor >= 3 ? 1 : 0);
      for (let i = 0; i < rolls; i++) {
        const d = raid.rng.weighted(e.def.drops);
        e.loot.push(IV.stack(d.id, raid.rng.int(d.n[0], d.n[1])));
      }
      if (raid.rng.chance(0.35)) e.loot.push(IV.stack(e.def.weapon, 1));
      raid.events.kills.push({ arch: e.arch, slot: slot, name: e.def.name });
      IV.sfx('kill');
    }
    return applied;
  }

  function damagePlayer(raid, amount, pen) {
    const p = raid.player;
    let dmg = amount;
    const armor = p.armor ? IV.def(p.armor.id) : null;
    if (armor && p.armor.dura > 0) {
      const f = armorFactor(pen, armor.ac);
      const absorbed = dmg * (1 - f);
      dmg *= f;
      p.armor.dura = Math.max(0, p.armor.dura - Math.max(1, Math.round(absorbed * 0.18)));
    }
    dmg = Math.max(1, Math.round(dmg));
    p.hp -= dmg;
    p.hurtFlash = 1;
    raid.events.damage += dmg;
    IV.sfx('playerHurt');
    if (p.hp <= 0) {
      p.hp = 0;
      Sim.end(raid, 'dead');
    }
  }

  // ---- shooting ---------------------------------------------------------
  function fire(raid) {
    const p = raid.player;
    const w = weaponOf(p), wd = weaponDef(p);
    if (!w || !wd || p.reloadT > 0 || p.useT > 0) return;
    if (p.fireT > 0) return;
    if (!w.loaded) { IV.sfx('dry'); p.fireT = 0.25; return; }

    w.loaded--;
    p.fireT = 60 / wd.rpm;
    p.flash = 1;
    p.recoil = Math.min(0.09, p.recoil + wd.recoil);
    raid.events.shots++;
    raid.alarm = Math.min(1, raid.alarm + 0.10);
    IV.sfx('shot', wd.cal);

    const ammoDef = w.ammo ? IV.def(w.ammo) : null;
    const dmg = wd.dmg + (ammoDef ? ammoDef.dmg : 0);
    const pen = wd.pen + (ammoDef ? ammoDef.pen : 0);
    const spread = wd.spread * (p.ads ? 0.42 : 1) * (p.sprinting ? 1.9 : 1) * (1 + p.recoil * 4);

    for (let i = 0; i < wd.pellets; i++) {
      const ang = p.ang + (raid.rng() - 0.5) * spread * 2;
      const hit = castShot(raid, p.x, p.y, ang, wd.range);
      if (hit.enemy) {
        const head = raid.rng.chance(p.ads ? 0.17 : 0.11);
        damageEnemy(raid, hit.enemy, dmg, pen, head, p.active);
        p.hitMark = 0.25;
      }
      raid.bullets.push({ x0: p.x, y0: p.y, x1: hit.x, y1: hit.y, t: 0.06 });
    }
    // gunfire wakes the deck
    for (const e of raid.enemies) {
      if (e.dead) continue;
      const d = IV.dist(e.x, e.y, p.x, p.y);
      if (d < 16 + raid.alarm * 10) {
        e.alert = Math.max(e.alert, 0.6);
        if (e.state === 'idle' || e.state === 'patrol') {
          e.state = 'search';
          e.target = { x: p.x + (raid.rng() - 0.5) * 3, y: p.y + (raid.rng() - 0.5) * 3 };
        }
      }
    }
  }

  // March a ray, returning the first enemy struck or the wall it stopped at.
  function castShot(raid, x, y, ang, maxD) {
    const dx = Math.cos(ang), dy = Math.sin(ang);
    const step = 0.06;
    let d = 0;
    while (d < maxD) {
      d += step;
      const cx = x + dx * d, cy = y + dy * d;
      if (IV.blocked(raid, cx, cy)) return { x: cx, y: cy, enemy: null };
      for (const e of raid.enemies) {
        if (e.dead) continue;
        if (Math.abs(e.x - cx) < ENEMY_R && Math.abs(e.y - cy) < ENEMY_R) {
          return { x: cx, y: cy, enemy: e };
        }
      }
    }
    return { x: x + dx * maxD, y: y + dy * maxD, enemy: null };
  }

  function reload(raid) {
    const p = raid.player;
    const w = weaponOf(p), wd = weaponDef(p);
    if (!w || !wd || p.reloadT > 0) return;
    if (w.loaded >= wd.mag) return;
    const src = ammoInPockets(p, wd.cal);
    if (!src) { IV.sfx('dry'); IV.toast('no ' + wd.cal + ' in the rig'); return; }
    if (w.ammo && w.ammo !== src.id && w.loaded > 0) {
      // dumping a partial mag of a different type: keep it simple, it is lost
      w.loaded = 0;
    }
    p.reloadT = wd.reload;
    p.reloadInto = src.id;
    IV.sfx('reload');
  }

  function finishReload(raid) {
    const p = raid.player;
    const w = weaponOf(p), wd = weaponDef(p);
    if (!w || !wd) return;
    const src = ammoInPockets(p, wd.cal);
    if (!src) return;
    const need = wd.mag - w.loaded;
    const take = Math.min(need, src.n);
    w.ammo = src.id;
    w.loaded += take;
    src.n -= take;
    if (src.n <= 0) p.pockets.splice(p.pockets.indexOf(src), 1);
  }

  // ---- hostile AI -------------------------------------------------------
  function updateEnemy(raid, e, dt) {
    if (e.dead) { e.deadT += dt; return; }
    const p = raid.player;
    e.hurtT = Math.max(0, e.hurtT - dt);
    const d = IV.dist(e.x, e.y, p.x, p.y);
    const sight = e.def.sight * (0.55 + raid.alarm * 0.6);
    const canSee = d < sight && los(raid, e.x, e.y, p.x, p.y, sight);

    if (canSee) {
      e.seenT += dt;
      if (e.seenT > (e.state === 'engage' ? 0 : 0.25)) {
        e.state = 'engage';
        e.alert = 1;
        e.target = { x: p.x, y: p.y };
      }
    } else {
      e.seenT = Math.max(0, e.seenT - dt * 0.5);
      if (e.state === 'engage') { e.state = 'search'; e.searchT = 5; }
    }

    const spd = e.def.speed * (raid.alarm * 0.25 + 0.9);
    switch (e.state) {
      case 'idle':
        e.cd -= dt;
        if (e.cd <= 0) {
          e.cd = 2 + raid.rng() * 4;
          if (raid.rng.chance(0.6)) {
            e.state = 'patrol';
            const a = raid.rng() * Math.PI * 2, r = 2 + raid.rng() * 5;
            e.target = { x: e.home.x + Math.cos(a) * r, y: e.home.y + Math.sin(a) * r };
            e.patrolT = 4;
          } else e.ang += (raid.rng() - 0.5) * 2;
        }
        break;
      case 'patrol':
        e.patrolT -= dt;
        if (!e.target || e.patrolT <= 0 || IV.dist(e.x, e.y, e.target.x, e.target.y) < 0.4) {
          e.state = 'idle'; e.cd = 1 + raid.rng() * 3;
        } else moveToward(raid, e, e.target, spd * 0.55, dt);
        break;
      case 'search':
        e.searchT -= dt;
        if (e.searchT <= 0 || !e.target) {
          e.state = 'idle'; e.cd = 1;
        } else if (IV.dist(e.x, e.y, e.target.x, e.target.y) < 0.5) {
          e.target = { x: e.x + (raid.rng() - 0.5) * 6, y: e.y + (raid.rng() - 0.5) * 6 };
        } else moveToward(raid, e, e.target, spd * 0.8, dt);
        break;
      case 'engage': {
        e.ang = Math.atan2(p.y - e.y, p.x - e.x);
        const want = e.def.sight * 0.35;
        if (d > want) moveToward(raid, e, { x: p.x, y: p.y }, spd, dt);
        else if (d < want * 0.45) moveToward(raid, e, { x: e.x * 2 - p.x, y: e.y * 2 - p.y }, spd * 0.7, dt);
        else {
          // strafe for a harder target
          const s = (e.id.charCodeAt(1) % 2 ? 1 : -1);
          moveToward(raid, e, { x: e.x - Math.sin(e.ang) * s, y: e.y + Math.cos(e.ang) * s }, spd * 0.6, dt);
        }
        e.cd -= dt;
        if (canSee && e.cd <= 0) {
          if (e.burst <= 0) { e.burst = e.def.burst; e.cd = 0; }
          e.burst--;
          e.cd = e.burst > 0 ? 60 / e.def.rpm : 0.7 + raid.rng() * 1.1;
          IV.sfx('enemyShot');
          const acc = e.def.acc * IV.clamp(1 - d / e.def.sight, 0.25, 1) * (p.sprinting ? 0.85 : 1);
          if (raid.rng.chance(acc) && los(raid, e.x, e.y, p.x, p.y)) {
            damagePlayer(raid, e.def.dmg * (0.85 + raid.rng() * 0.3), e.def.armor);
          }
          raid.bullets.push({ x0: e.x, y0: e.y, x1: p.x, y1: p.y, t: 0.05, hostile: true });
          raid.alarm = Math.min(1, raid.alarm + 0.04);
        }
        break;
      }
      default: break;
    }
  }

  function moveToward(raid, e, tgt, spd, dt) {
    const a = Math.atan2(tgt.y - e.y, tgt.x - e.x);
    const nx = e.x + Math.cos(a) * spd * dt;
    const ny = e.y + Math.sin(a) * spd * dt;
    const before = e.x + ',' + e.y;
    tryMove(raid, e, nx, ny, ENEMY_R);
    e.ang = a;
    if (before === e.x + ',' + e.y) {
      // wedged on geometry: shove sideways for a moment
      const side = a + (raid.rng.chance(0.5) ? 1.4 : -1.4);
      tryMove(raid, e, e.x + Math.cos(side) * spd * dt, e.y + Math.sin(side) * spd * dt, ENEMY_R);
    }
    e.stepPhase += spd * dt * 3;
  }

  // ---- interaction ------------------------------------------------------
  function nearestInteract(raid) {
    const p = raid.player;
    let best = null, bestD = 1.35;
    for (const c of raid.containers) {
      if (c.searched && (!c.items || !c.items.length)) continue;
      const d = IV.dist(p.x, p.y, c.x, c.y);
      if (d < bestD) { bestD = d; best = { kind: 'cache', obj: c, d: d }; }
    }
    for (const e of raid.enemies) {
      if (!e.dead || e.looted) continue;
      const d = IV.dist(p.x, p.y, e.x, e.y);
      if (d < bestD) { bestD = d; best = { kind: 'body', obj: e, d: d }; }
    }
    for (const b of raid.bags) {
      const d = IV.dist(p.x, p.y, b.x, b.y);
      if (d < bestD) { bestD = d; best = { kind: 'bag', obj: b, d: d }; }
    }
    // doors just ahead
    const fx = p.x + Math.cos(p.ang) * 0.9, fy = p.y + Math.sin(p.ang) * 0.9;
    const key = (fx | 0) + ',' + (fy | 0);
    const door = raid.doors.get(key);
    if (door && door.open < 0.2) {
      const d = IV.dist(p.x, p.y, (fx | 0) + 0.5, (fy | 0) + 0.5);
      if (d < 1.6) best = { kind: 'door', obj: door, d: d };
    }
    return best;
  }
  Sim.nearestInteract = nearestInteract;

  function useKeyFor(p, lockId) {
    for (const s of p.pockets) {
      const d = IV.def(s.id);
      if (d.kind === 'key' && d.opens === lockId) return s;
    }
    return null;
  }

  function openDoor(raid, door) {
    const p = raid.player;
    if (door.locked) {
      const k = useKeyFor(p, door.locked);
      if (!k) { IV.sfx('locked'); IV.toast('locked - needs the ' + door.locked + ' key'); return; }
      k.uses--;
      if (k.uses <= 0) {
        p.pockets.splice(p.pockets.indexOf(k), 1);
        IV.toast(IV.def(k.id).name + ' burned out');
      }
      IV.toast('lock released');
    }
    door.want = 1;
    IV.sfx('door');
    raid.alarm = Math.min(1, raid.alarm + (door.locked ? 0.15 : 0.02));
  }

  // ---- lifecycle --------------------------------------------------------
  Sim.end = function (raid, outcome, zone) {
    if (raid.over) return;
    const p = raid.player;
    const carried = {};
    for (const s of p.pockets) carried[s.id] = (carried[s.id] || 0) + s.n;
    raid.over = {
      outcome: outcome,
      map: raid.map.id,
      mapName: raid.map.name,
      viaPod: !!(zone && zone.kind === 'pod'),
      kills: raid.events.kills,
      shots: raid.events.shots,
      searched: raid.events.searched,
      damage: raid.events.damage,
      weight: carriedWeight(p),
      carried: carried,
      hp: p.hp,
      time: raid.map.raidTime - raid.timeLeft,
      player: p,
    };
    IV.sfx(outcome === 'extract' ? 'extract' : 'death');
  };

  Sim.update = function (raid, input, dt) {
    if (raid.over) return;
    const p = raid.player;
    raid.t += dt;
    raid.timeLeft -= dt;
    if (raid.timeLeft <= 0) { Sim.end(raid, 'mia'); return; }
    raid.alarm = Math.max(0, raid.alarm - dt * 0.012);

    // escape pod powers up partway through the raid
    for (const z of raid.zones) {
      if (z.kind === 'pod' && !z.open && raid.t >= raid.map.raidTime * raid.map.podOpensAt) {
        z.open = true;
        IV.toast('escape pod is powered - hatch unlocked');
        IV.sfx('alarm');
      }
    }

    // doors animate
    raid.doors.forEach((d) => {
      const speed = 2.4;
      if (d.want > d.open) d.open = Math.min(1, d.open + dt * speed);
      else if (d.autoClose && d.open > 0) d.open = Math.max(0, d.open - dt * speed);
    });

    // timers
    p.fireT = Math.max(0, p.fireT - dt);
    p.flash = Math.max(0, p.flash - dt * 8);
    p.hurtFlash = Math.max(0, p.hurtFlash - dt * 1.6);
    p.hitMark = Math.max(0, (p.hitMark || 0) - dt);
    p.recoil = Math.max(0, p.recoil - dt * 0.32);
    if (p.reloadT > 0) {
      p.reloadT -= dt;
      if (p.reloadT <= 0) finishReload(raid);
    }
    if (p.useT > 0) {
      p.useT -= dt;
      if (p.useT <= 0 && p.useWhat) {
        const s = p.useWhat;
        const d = IV.def(s.id);
        p.hp = Math.min(p.maxHp, p.hp + d.heal);
        if (d.stamina) p.stamina = 100;
        s.n--;
        if (s.n <= 0) p.pockets.splice(p.pockets.indexOf(s), 1);
        IV.sfx('heal');
        p.useWhat = null;
      }
    }

    // ---- movement
    const looting = input.looting;
    let mx = 0, my = 0;
    if (!looting) {
      if (input.fwd) my += 1;
      if (input.back) my -= 1;
      if (input.left) mx -= 1;
      if (input.right) mx += 1;
    }
    const moving = (mx || my) && p.useT <= 0;
    p.sprinting = !!(input.sprint && my > 0 && p.stamina > 1 && !p.ads && p.useT <= 0);
    const spd = speedFor(p) * (p.sprinting ? SPRINT_MULT : 1) * (p.ads ? 0.55 : 1) * (p.useT > 0 ? 0.35 : 1);
    if (moving) {
      const len = Math.hypot(mx, my) || 1;
      const fx = Math.cos(p.ang), fy = Math.sin(p.ang);
      const sx = -fy, sy = fx;
      const dx = (fx * my + sx * mx) / len;
      const dy = (fy * my + sy * mx) / len;
      tryMove(raid, p, p.x + dx * spd * dt, p.y + dy * spd * dt, PLAYER_R);
      p.bob += dt * spd * 2.4;
      if (Math.sin(p.bob * 2) > 0.985) IV.sfx('step');
    }
    p.stamina = IV.clamp(p.stamina + (p.sprinting ? -24 : 15) * dt, 0, 100);
    if (p.stamina <= 0) p.sprinting = false;

    // ---- weapon
    p.ads = !!input.ads && !p.sprinting && p.useT <= 0 && !looting;
    if (input.fire && !looting) {
      const wd = weaponDef(p);
      if (wd && (wd.auto || !input.fireHeld)) fire(raid);
      input.fireHeld = true;
    } else input.fireHeld = false;

    // ---- interaction (hold)
    const near = nearestInteract(raid);
    raid.hint = near;
    if (input.use && near && !looting && p.useT <= 0) {
      if (near.kind === 'door') { openDoor(raid, near.obj); input.use = false; }
      else if (near.kind === 'cache') {
        const c = near.obj;
        if (!c.searched) {
          c.searchT += dt;
          if (Math.random() < dt * 6) IV.sfx('search');
          if (c.searchT >= SEARCH_TIME[c.tier]) {
            c.searched = true;
            raid.events.searched++;
            IV.sfx('loot');
            IV.openLoot(raid, { title: c.tier === 'rare' ? 'SEALED CACHE' : 'CACHE', items: c.items });
          }
        } else IV.openLoot(raid, { title: 'CACHE', items: c.items });
      } else if (near.kind === 'body') {
        near.obj.looted = true;
        IV.openLoot(raid, { title: near.obj.def.name.toUpperCase(), items: near.obj.loot });
      } else if (near.kind === 'bag') {
        IV.openLoot(raid, { title: 'DROP BAG', items: near.obj.items });
      }
    } else if (near && near.kind === 'cache' && !near.obj.searched && !input.use) {
      near.obj.searchT = Math.max(0, near.obj.searchT - dt * 1.6);
    }

    // ---- extraction
    const tx = p.x | 0, ty = p.y | 0;
    const zone = IV.zoneAtTile(raid, tx, ty);
    if (zone && zone.open) {
      p.extractZone = zone;
      p.extractT += dt;
      if (p.extractT >= EXTRACT_TIME) { Sim.end(raid, 'extract', zone); return; }
    } else {
      p.extractZone = zone && !zone.open ? zone : null;
      p.extractT = Math.max(0, p.extractT - dt * 2);
    }

    // ---- hostiles
    for (const e of raid.enemies) updateEnemy(raid, e, dt);

    // ---- tracers
    for (let i = raid.bullets.length - 1; i >= 0; i--) {
      raid.bullets[i].t -= dt;
      if (raid.bullets[i].t <= 0) raid.bullets.splice(i, 1);
    }
  };

  Sim.reload = reload;
  Sim.fire = fire;
  Sim.swap = function (raid, which) {
    const p = raid.player;
    if (!p[which]) { IV.toast('no ' + which + ' equipped'); return; }
    if (p.active === which) return;
    p.active = which;
    p.reloadT = 0;
    p.fireT = 0.25;
    IV.sfx('beep');
  };
  Sim.useMed = function (raid) {
    const p = raid.player;
    if (p.useT > 0) return;
    if (p.hp >= p.maxHp) { IV.toast('no injuries'); return; }
    let best = null;
    for (const s of p.pockets) {
      const d = IV.def(s.id);
      if (d.kind !== 'med') continue;
      const waste = Math.max(0, (p.hp + d.heal) - p.maxHp);
      if (!best || waste < best.waste) best = { s: s, waste: waste };
    }
    if (!best) { IV.toast('no medical kit in the rig'); return; }
    p.useT = IV.def(best.s.id).useTime;
    p.useWhat = best.s;
  };
  Sim.dropStack = function (raid, index) {
    const p = raid.player;
    const s = p.pockets[index];
    if (!s) return;
    p.pockets.splice(index, 1);
    let bag = raid.bags.find((b) => IV.dist(b.x, b.y, p.x, p.y) < 0.6);
    if (!bag) { bag = { x: p.x, y: p.y, items: [] }; raid.bags.push(bag); }
    bag.items.push(s);
    IV.toast('dropped ' + IV.stackLabel(s));
  };

  Sim.EXTRACT_TIME = EXTRACT_TIME;
  Sim.SEARCH_TIME = SEARCH_TIME;
  IV.Sim = Sim;
})(window.IV);
