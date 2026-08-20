// IRONVOID - hand-authored raid maps.
//   #  steel wall        %  rusted wall      |  reinforced glass
//   .  deck              +  powered door     V/B/M  locked door (vault/bridge/comms)
//   c  common cache      C  rare cache       e  hostile      E  elite hostile
//   S  insertion point   X  ship dock extract    Z  escape pod extract (opens late)
(function (IV) {
  'use strict';

  const MAPS = [
    {
      id: 'hallow',
      name: 'Refinery HALLOW-3',
      sub: 'Ore cracker, half-abandoned. The Combine still runs a security shift.',
      brief: 'Low pressure. Guard patrols are light and the vault card circulates in the crew block.',
      raidTime: 12 * 60,
      danger: 1,
      hostiles: [7, 10],
      lootBias: 1.0,
      podOpensAt: 0.45, // fraction of raid elapsed before escape pod powers up
      rows: [
        '########################################',
        '#.............................S...S..S.#',
        '#.#####+#####.#####+#####.#####+######.#',
        '#.#c...e...c#.#..e...e..#.#c........e#.#',
        '#.#.#.....#.#.#.#######.#.#.########.#.#',
        '#.#.#..c..#.#.#.#CC.CC#.#.#.#CC..c.#.#S#',
        '#.#.#.....#.#.#.#..E..#.#.#.#......#.#.#',
        '#.#.......#.#.#.###V###.#.#.####M###.#.#',
        '#.#..c...e.#.#....c.....#.#e........c#.#',
        '#.#####+#####.#####+#####.#####+######.#',
        '#......................................#',
        '#.###+#######.#######+###.######+#####.#',
        '#.#..c...c..#.#.........#.#c........c#.#',
        '#.#.#.###.#.#.#.#.#.#.#.#.#.##....##.#.#',
        '#.#...#e....#.#....e....#.#.#C....C#.#S#',
        '#.#.#.###.#.#.#.#.#.#.#.#.#.##.ee.##.#.#',
        '#.#..c...c..#.#..c...c..#.#c........c#.#',
        '#.#....e....#.#....E....#.#..........#.#',
        '#.#######+###.#####+#####.####+#######.#',
        '#......................................#',
        '#.#####+#####.#####+#####.#####+######.#',
        '#.#.........#.#c.......c#.#..........#.#',
        '#.#..XXXXX..#.#.#.#.#.#.#.#.###..###.#.#',
        '#.#..XXXXX..#.#..e...e..#.#.#C.ee#C..#.#',
        '#.#.........#.#.#.#.#.#.#.#.###..###.#.#',
        '#.#..c...c..#.#c...c...c#.#...ZZZZ...#.#',
        '#.#.........#.#.........#.#..........#.#',
        '#.#####+#####.#####+#####.#####+######.#',
        '#......................................#',
        '########################################',
      ],
    },
    {
      id: 'svetlana',
      name: 'Freighter SVETLANA-9',
      sub: 'Drifting bulk hauler. Nobody answered the distress call for eleven months.',
      brief: 'Tight decks, poor light. Rival crews board this wreck constantly - expect contact.',
      raidTime: 10 * 60,
      danger: 2,
      hostiles: [10, 14],
      lootBias: 1.25,
      podOpensAt: 0.55,
      rows: [
        '########################################',
        '#.S..........................S........S#',
        '#.%%%%%+%%%%%.%%%%%+%%%%%.%%%%%+%%%%%%.#',
        '#.%c.......c%.%..e.....e%.%e........c%.#',
        '#.%.%%%.%%%.%.%.%%%%%%%.%.%.%%%%%%%%.%.#',
        '#.%.%C....E%.%..C.ee..%.%.%.%..c...%.%.#',
        '#.%.%%%B%%%%.%.%%%%%%%.%.%.%..%.%..%.%.#',
        '#.%....e....%.%....c...%.%.%..%C%..%.%.#',
        '#.%%%%%+%%%%%.%%%%%+%%%%%.%%%%%+%%%%%%.#',
        '#......................................#',
        '#.%%%%%+%%%%%.%%%%%+%%%%%.%%%%%+%%%%%%.#',
        '#.%..c.....c%.%c.......c%.%..........%.#',
        '#.%.%%.%%%.%%.%.%%%.%%%.%.%.%%%%%%.%.%.#',
        '#.%.%E.....%%.%.%e..%e..%.%..CC..%.%.%S#',
        '#.%.%%%%%%.%%.%.%%%.%%%.%.%.%....%.%.%.#',
        '#.%......c.%%.%....E....%.%.%%%%%%.%.%.#',
        '#.%c.......c%.%c.......c%.%c.......c%.#.',
        '#.%%%%%+%%%%%.%%%%%+%%%%%.%%%%%+%%%%%%.#',
        '#......................................#',
        '#.%%%%%+%%%%%.%%%%%+%%%%%.%%%%%+%%%%%%.#',
        '#.%.........%.%..c...c..%.%..........%.#',
        '#.%.XXXXXXX.%.%.%%%.%%%.%.%.%%%%%%%%.%.#',
        '#.%.XXXXXXX.%.%.%e..%e..%.%..C.ee.C%.%.#',
        '#.%.........%.%.%%%.%%%.%.%.%%%%%%%%.%.#',
        '#.%..c...c..%.%..c...c..%.%....ZZ....%.#',
        '#.%.........%.%.........%.%..........%.#',
        '#.%%%%%+%%%%%.%%%%%+%%%%%.%%%%%+%%%%%%.#',
        '#......................................#',
        '#.......e..........E..........e........#',
        '########################################',
      ],
    },
    {
      id: 'kilo',
      name: 'Listening Post KILO',
      sub: 'A rock with an antenna. Whoever holds it hears every convoy in the belt.',
      brief: 'Small, loud and lethal. Short timer, dense loot, and no quiet way out.',
      raidTime: 7 * 60,
      danger: 3,
      hostiles: [11, 15],
      lootBias: 1.6,
      podOpensAt: 0.4,
      rows: [
        '#############################',
        '#...S...................S...#',
        '#.#####+######.#####+######.#',
        '#.#c........e#.#.e......c.#.#',
        '#.#.########.#.#.########.#.#',
        '#.#.#CC..C.#.#.#.#C....C#.#.#',
        '#.#.#..E...#.#.#.#..E...#.#.#',
        '#.#.####M###.#.#.###B####.#.#',
        '#.#e...c....c#.#c......e..#.#',
        '#.#####+######.#####+######.#',
        '#...........................#',
        '#.###+########.#######+####.#',
        '#.#..XXXXXX..#.#c........c#.#',
        '#.#..XXXXXX..#.#.#.####.#.#.#',
        '#.#..........#.#....CC#..e#.#',
        '#.#c...e....c#.#.#.####.#.#.#',
        '#.#..........#.#...ZZZZ...#.#',
        '#.#.c......e.#.#e...c....c#.#',
        '#...........................#',
        '#############################',
      ],
    },
  ];

  // Loot tables per cache tier. Weights are relative within the table.
  const LOOT = {
    common: [
      { w: 20, id: 'v_ration',  n: [1, 3] },
      { w: 16, id: 'v_coil',    n: [1, 2] },
      { w: 14, id: 'v_valve',   n: [1, 3] },
      { w: 10, id: 'a9_std',    n: [12, 30] },
      { w: 10, id: 'a762_std',  n: [10, 24] },
      { w: 8,  id: 'm_bandage', n: [1, 2] },
      { w: 6,  id: 'v_coolant', n: [1, 1] },
      { w: 5,  id: 'a12_buck',  n: [6, 14] },
      { w: 4,  id: 'v_optics',  n: [1, 1] },
      { w: 3,  id: 'a9_ap',     n: [10, 20] },
      { w: 3,  id: 'm_trauma',  n: [1, 1] },
      { w: 2,  id: 'v_gyro',    n: [1, 1] },
      { w: 2,  id: 'w_vesper',  n: [1, 1] },
      { w: 1,  id: 'k_comms',   n: [1, 1] },
    ],
    rare: [
      { w: 14, id: 'v_fuel',     n: [1, 2] },
      { w: 12, id: 'v_gyro',     n: [1, 2] },
      { w: 11, id: 'v_optics',   n: [1, 2] },
      { w: 9,  id: 'a762_ap',    n: [14, 30] },
      { w: 8,  id: 'v_drive',    n: [1, 1] },
      { w: 7,  id: 'm_stim',     n: [1, 2] },
      { w: 6,  id: 'w_hardline', n: [1, 1] },
      { w: 6,  id: 'ar_deckhand',n: [1, 1] },
      { w: 5,  id: 'v_bullion',  n: [1, 1] },
      { w: 5,  id: 'k_vault',    n: [1, 1] },
      { w: 4,  id: 'hl_breach',  n: [1, 1] },
      { w: 4,  id: 'k_bridge',   n: [1, 1] },
      { w: 3,  id: 'w_longshot', n: [1, 1] },
      { w: 3,  id: 'ar_boarder', n: [1, 1] },
      { w: 2,  id: 'v_aicore',   n: [1, 1] },
      { w: 1,  id: 'ar_bulwark', n: [1, 1] },
    ],
  };

  // Hostile archetypes. Escalate with map danger.
  const HOSTILES = {
    guard: {
      id: 'guard', name: 'Combine Guard', hp: 90, armor: 1, speed: 1.5,
      weapon: 'w_vesper', dmg: 15, rpm: 240, burst: 3, acc: 0.72, sight: 14, xp: 30,
      drops: [{ w: 6, id: 'a9_std', n: [8, 20] }, { w: 3, id: 'v_ration', n: [1, 2] }, { w: 2, id: 'm_bandage', n: [1, 1] }, { w: 1, id: 'hl_welder', n: [1, 1] }],
      color: '#7d8a6a',
    },
    raider: {
      id: 'raider', name: 'Syndicate Raider', hp: 115, armor: 2, speed: 2.0,
      weapon: 'w_kestrel', dmg: 19, rpm: 500, burst: 5, acc: 0.66, sight: 17, xp: 55,
      drops: [{ w: 6, id: 'a9_ap', n: [10, 22] }, { w: 3, id: 'v_coolant', n: [1, 1] }, { w: 3, id: 'm_bandage', n: [1, 2] }, { w: 2, id: 'ar_deckhand', n: [1, 1] }, { w: 1, id: 'v_optics', n: [1, 1] }],
      color: '#8a5b4a',
    },
    breacher: {
      id: 'breacher', name: 'Breacher', hp: 150, armor: 3, speed: 2.3,
      weapon: 'w_bulldog', dmg: 30, rpm: 420, burst: 4, acc: 0.70, sight: 20, xp: 110,
      drops: [{ w: 5, id: 'a762_ap', n: [12, 24] }, { w: 3, id: 'm_trauma', n: [1, 1] }, { w: 3, id: 'v_fuel', n: [1, 1] }, { w: 2, id: 'ar_boarder', n: [1, 1] }, { w: 2, id: 'hl_breach', n: [1, 1] }, { w: 1, id: 'v_drive', n: [1, 1] }],
      color: '#6a6f8a',
    },
    warden: {
      id: 'warden', name: 'Vault Warden', hp: 220, armor: 4, speed: 2.1,
      weapon: 'w_longshot', dmg: 48, rpm: 200, burst: 2, acc: 0.80, sight: 26, xp: 240,
      drops: [{ w: 5, id: 'a762_ap', n: [20, 40] }, { w: 4, id: 'v_bullion', n: [1, 1] }, { w: 3, id: 'k_vault', n: [1, 1] }, { w: 3, id: 'ar_bulwark', n: [1, 1] }, { w: 2, id: 'v_aicore', n: [1, 1] }, { w: 2, id: 'w_longshot', n: [1, 1] }],
      color: '#8a7a4a',
    },
  };

  // Which archetype fills 'e' / 'E' at each danger level.
  const SPAWN_TABLE = {
    1: { e: [{ w: 8, id: 'guard' }, { w: 2, id: 'raider' }],                      E: [{ w: 7, id: 'raider' }, { w: 3, id: 'breacher' }] },
    2: { e: [{ w: 5, id: 'guard' }, { w: 5, id: 'raider' }],                      E: [{ w: 6, id: 'breacher' }, { w: 4, id: 'raider' }] },
    3: { e: [{ w: 3, id: 'guard' }, { w: 5, id: 'raider' }, { w: 2, id: 'breacher' }], E: [{ w: 6, id: 'breacher' }, { w: 4, id: 'warden' }] },
  };

  IV.MAPS = MAPS;
  IV.LOOT = LOOT;
  IV.HOSTILES = HOSTILES;
  IV.SPAWN_TABLE = SPAWN_TABLE;
  IV.mapById = (id) => MAPS.find((m) => m.id === id) || MAPS[0];
})(window.IV);
