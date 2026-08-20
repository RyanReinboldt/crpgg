// IRONVOID - raid instance generation: grid, doors, caches, hostiles, exits.
(function (IV) {
  'use strict';

  const CELL = { FLOOR: 0, STEEL: 1, RUST: 2, GLASS: 3, DOOR: 4, LOCKED: 5 };
  IV.CELL = CELL;
  IV.isSolidCell = (c) => c === CELL.STEEL || c === CELL.RUST || c === CELL.GLASS;

  const KEY_FOR = { V: 'vault', B: 'bridge', M: 'comms' };

  function rollLoot(rng, tier, bias, count) {
    const table = IV.LOOT[tier];
    const out = [];
    for (let i = 0; i < count; i++) {
      const e = rng.weighted(table);
      const n = rng.int(e.n[0], e.n[1]);
      const scaled = Math.max(1, Math.round(n * (e.n[1] > 4 ? bias : 1)));
      out.push(IV.stack(e.id, scaled));
    }
    // merge identical stackables so the loot panel stays readable
    const merged = [];
    for (const s of out) {
      const d = IV.def(s.id);
      const hit = d.stack > 1 && merged.find((m) => m.id === s.id && m.n + s.n <= d.stack);
      if (hit) hit.n += s.n; else merged.push(s);
    }
    return merged;
  }
  IV.rollLoot = rollLoot;

  IV.buildRaid = function (mapDef, seed, profile) {
    const rng = IV.makeRng(seed);
    const rows = mapDef.rows;
    const h = rows.length, w = rows[0].length;
    const cells = new Uint8Array(w * h);
    const doors = new Map(); // "x,y" -> door
    const containers = [];
    const spawns = [];
    const hostileSpots = [];
    const exitTiles = [];

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const ch = rows[y][x];
        let c = CELL.FLOOR;
        switch (ch) {
          case '#': c = CELL.STEEL; break;
          case '%': c = CELL.RUST; break;
          case '|': c = CELL.GLASS; break;
          case '+':
            c = CELL.DOOR;
            doors.set(x + ',' + y, { x: x, y: y, open: 0, want: 0, locked: null });
            break;
          case 'V': case 'B': case 'M':
            c = CELL.LOCKED;
            doors.set(x + ',' + y, { x: x, y: y, open: 0, want: 0, locked: KEY_FOR[ch] });
            break;
          case 'c': containers.push({ x: x + 0.5, y: y + 0.5, tier: 'common' }); break;
          case 'C': containers.push({ x: x + 0.5, y: y + 0.5, tier: 'rare' }); break;
          case 'e': hostileSpots.push({ x: x + 0.5, y: y + 0.5, elite: false }); break;
          case 'E': hostileSpots.push({ x: x + 0.5, y: y + 0.5, elite: true }); break;
          case 'S': spawns.push({ x: x + 0.5, y: y + 0.5 }); break;
          case 'X': exitTiles.push({ x: x, y: y, kind: 'dock' }); break;
          case 'Z': exitTiles.push({ x: x, y: y, kind: 'pod' }); break;
          default: break;
        }
        cells[y * w + x] = c;
      }
    }

    // Fill caches.
    for (const c of containers) {
      c.searched = false;
      c.searchT = 0;
      c.items = rollLoot(rng, c.tier, mapDef.lootBias, c.tier === 'rare' ? rng.int(3, 5) : rng.int(2, 4));
      c.id = 'k' + (c.x | 0) + '_' + (c.y | 0);
    }

    // Populate hostiles up to the map's budget.
    rng.shuffle(hostileSpots);
    const budget = rng.int(mapDef.hostiles[0], mapDef.hostiles[1]);
    const table = IV.SPAWN_TABLE[mapDef.danger];
    const enemies = [];
    for (const spot of hostileSpots) {
      if (enemies.length >= budget) break;
      const pickId = rng.weighted(spot.elite ? table.E : table.e).id;
      const arch = IV.HOSTILES[pickId];
      enemies.push({
        id: 'e' + enemies.length, arch: pickId, def: arch,
        x: spot.x, y: spot.y, hp: arch.hp, maxHp: arch.hp,
        state: 'idle', ang: rng() * Math.PI * 2, alert: 0, cd: rng() * 1.5,
        burst: 0, home: { x: spot.x, y: spot.y }, target: null,
        hurtT: 0, dead: false, deadT: 0, looted: false, loot: null, seenT: 0,
        stepPhase: rng() * 6,
      });
    }

    // Group exit tiles into zones so each gets one beacon.
    const zones = [];
    const claimed = new Set();
    for (const t of exitTiles) {
      const k = t.x + ',' + t.y;
      if (claimed.has(k)) continue;
      const group = [];
      const q = [t];
      claimed.add(k);
      while (q.length) {
        const cur = q.pop();
        group.push(cur);
        for (const o of exitTiles) {
          const ok = o.x + ',' + o.y;
          if (claimed.has(ok) || o.kind !== cur.kind) continue;
          if (Math.abs(o.x - cur.x) + Math.abs(o.y - cur.y) === 1) { claimed.add(ok); q.push(o); }
        }
      }
      const cx = group.reduce((s, g) => s + g.x + 0.5, 0) / group.length;
      const cy = group.reduce((s, g) => s + g.y + 0.5, 0) / group.length;
      zones.push({
        kind: group[0].kind, tiles: group, x: cx, y: cy,
        name: group[0].kind === 'dock' ? 'SHIP DOCK' : 'ESCAPE POD',
        open: group[0].kind === 'dock',
      });
    }

    // Insert the player as far from the exits as the spawn list allows.
    let spawn = spawns.length ? spawns[0] : { x: 1.5, y: 1.5 };
    let best = -1;
    for (const s of spawns) {
      let d = Infinity;
      for (const z of zones) d = Math.min(d, IV.dist(s.x, s.y, z.x, z.y));
      if (d > best) { best = d; spawn = s; }
    }

    const l = profile.loadout;
    const clone = (s) => (s ? JSON.parse(JSON.stringify(s)) : null);

    const raid = {
      seed: seed,
      map: mapDef,
      w: w, h: h, cells: cells, doors: doors,
      containers: containers, enemies: enemies, zones: zones,
      bags: [],           // dropped loot bags (dead hostiles keep theirs on the corpse)
      bullets: [],        // tracers, cosmetic
      rng: rng,
      t: 0,
      timeLeft: mapDef.raidTime,
      alarm: 0,           // 0..1 station alert; rises with gunfire
      over: null,
      events: { kills: [], shots: 0, searched: 0, damage: 0 },
      player: {
        x: spawn.x, y: spawn.y, ang: rng() * Math.PI * 2,
        hp: Math.max(20, Math.round(profile.maxHp * IV.Profile.medbayHeal())),
        maxHp: profile.maxHp,
        stamina: 100, sprinting: false,
        primary: clone(l.primary), sidearm: clone(l.sidearm),
        armor: clone(l.armor), helmet: clone(l.helmet), rig: clone(l.rig),
        pockets: (l.pockets || []).map(clone),
        active: l.primary ? 'primary' : (l.sidearm ? 'sidearm' : null),
        reloadT: 0, fireT: 0, useT: 0, useWhat: null,
        bob: 0, recoil: 0, flash: 0, hurtFlash: 0, ads: false,
        extractT: 0, extractZone: null,
      },
    };
    raid.player.maxHp = profile.maxHp;
    return raid;
  };

  IV.cellAt = function (raid, x, y) {
    if (x < 0 || y < 0 || x >= raid.w || y >= raid.h) return IV.CELL.STEEL;
    return raid.cells[(y | 0) * raid.w + (x | 0)];
  };

  // Blocking test used by movement and by line-of-sight.
  IV.blocked = function (raid, x, y) {
    const c = IV.cellAt(raid, x, y);
    if (IV.isSolidCell(c)) return true;
    if (c === IV.CELL.DOOR || c === IV.CELL.LOCKED) {
      const d = raid.doors.get((x | 0) + ',' + (y | 0));
      return !d || d.open < 0.75;
    }
    return false;
  };

  IV.zoneAtTile = function (raid, tx, ty) {
    for (const z of raid.zones) {
      for (const t of z.tiles) if (t.x === tx && t.y === ty) return z;
    }
    return null;
  };
})(window.IV);
