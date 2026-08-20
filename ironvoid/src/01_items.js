// IRONVOID - item catalogue. Everything lootable, sellable or shootable lives here.
(function (IV) {
  'use strict';

  const RARITY = {
    common:   { name: 'Common',    color: '#9aa7b0' },
    uncommon: { name: 'Uncommon',  color: '#68b06a' },
    rare:     { name: 'Rare',      color: '#5b8fd6' },
    epic:     { name: 'Prototype', color: '#a978d8' },
    legend:   { name: 'Blackbox',  color: '#d8a24a' },
  };

  // caliber -> the ammo items that feed it
  const AMMO = {
    'a9_std':   { id: 'a9_std',  name: '9x18 Soft',        kind: 'ammo', cal: '9mm',  dmg: 0,  pen: 0, weight: 0.02, value: 4,  rarity: 'common',   stack: 60 },
    'a9_ap':    { id: 'a9_ap',   name: '9x18 Hardcore',    kind: 'ammo', cal: '9mm',  dmg: -3, pen: 2, weight: 0.02, value: 14, rarity: 'uncommon', stack: 60 },
    'a762_std': { id: 'a762_std',name: '7.62 Ball',        kind: 'ammo', cal: '7.62', dmg: 0,  pen: 1, weight: 0.03, value: 9,  rarity: 'common',   stack: 60 },
    'a762_ap':  { id: 'a762_ap', name: '7.62 Steelcore',   kind: 'ammo', cal: '7.62', dmg: -6, pen: 3, weight: 0.03, value: 26, rarity: 'rare',     stack: 60 },
    'a12_buck': { id: 'a12_buck',name: '12ga Buckshot',    kind: 'ammo', cal: '12ga', dmg: 0,  pen: 0, weight: 0.05, value: 11, rarity: 'common',   stack: 40 },
    'a12_slug': { id: 'a12_slug',name: '12ga Breacher',    kind: 'ammo', cal: '12ga', dmg: 18, pen: 2, weight: 0.05, value: 30, rarity: 'uncommon', stack: 40 },
    'a44_std':  { id: 'a44_std', name: '.44 Heavy',        kind: 'ammo', cal: '.44',  dmg: 0,  pen: 1, weight: 0.04, value: 16, rarity: 'uncommon', stack: 40 },
  };

  // Weapons. dmg is per-projectile before ammo/armor modifiers.
  const WEAPONS = {
    'w_kestrel': {
      id: 'w_kestrel', name: 'Kestrel SMG', kind: 'weapon', slot: 'primary', cal: '9mm',
      dmg: 22, pen: 1, rpm: 780, mag: 32, pellets: 1, spread: 0.030, recoil: 0.010,
      reload: 2.1, range: 22, auto: true, weight: 2.6, value: 5200, rarity: 'common',
      desc: 'Refinery guard issue. Spits lead, respects nothing, penetrates less.',
    },
    'w_bulldog': {
      id: 'w_bulldog', name: 'Bulldog Autorifle', kind: 'weapon', slot: 'primary', cal: '7.62',
      dmg: 38, pen: 2, rpm: 520, mag: 24, pellets: 1, spread: 0.021, recoil: 0.020,
      reload: 2.7, range: 40, auto: true, weight: 4.1, value: 12800, rarity: 'uncommon',
      desc: 'Stamped, ugly, and the reason most boarding actions end in ninety seconds.',
    },
    'w_longshot': {
      id: 'w_longshot', name: 'Longshot Marksman', kind: 'weapon', slot: 'primary', cal: '7.62',
      dmg: 74, pen: 3, rpm: 190, mag: 10, pellets: 1, spread: 0.006, recoil: 0.045,
      reload: 3.2, range: 90, auto: false, weight: 4.8, value: 21500, rarity: 'rare',
      desc: 'Semi-auto. One good corridor and the corridor is yours.',
    },
    'w_ironjaw': {
      id: 'w_ironjaw', name: 'Ironjaw Shotgun', kind: 'weapon', slot: 'primary', cal: '12ga',
      dmg: 17, pen: 0, rpm: 95, mag: 6, pellets: 8, spread: 0.075, recoil: 0.060,
      reload: 3.6, range: 12, auto: false, weight: 3.9, value: 9400, rarity: 'uncommon',
      desc: 'Door opener. Works on doors, hinges, and the people standing behind them.',
    },
    'w_vesper': {
      id: 'w_vesper', name: 'Vesper Pistol', kind: 'weapon', slot: 'sidearm', cal: '9mm',
      dmg: 24, pen: 1, rpm: 320, mag: 12, pellets: 1, spread: 0.028, recoil: 0.018,
      reload: 1.7, range: 18, auto: false, weight: 1.1, value: 2100, rarity: 'common',
      desc: 'Every crew starts here. Most crews die here too.',
    },
    'w_hardline': {
      id: 'w_hardline', name: 'Hardline Revolver', kind: 'weapon', slot: 'sidearm', cal: '.44',
      dmg: 58, pen: 2, rpm: 150, mag: 6, pellets: 1, spread: 0.020, recoil: 0.050,
      reload: 3.4, range: 30, auto: false, weight: 1.6, value: 7600, rarity: 'uncommon',
      desc: 'Six chances to be right.',
    },
  };

  // Armor. ac = armor class; ammo pen >= ac punches through cleanly.
  const ARMOR = {
    'ar_deckhand': { id: 'ar_deckhand', name: 'Deckhand Vest',  kind: 'armor',  slot: 'armor',  ac: 2, dura: 40, weight: 4.0, value: 4200,  rarity: 'common',   desc: 'Quilted plate liner. Stops soft rounds and morale.' },
    'ar_boarder':  { id: 'ar_boarder',  name: 'Boarder Plate',  kind: 'armor',  slot: 'armor',  ac: 3, dura: 65, weight: 7.5, value: 15600, rarity: 'rare',     desc: 'Salvaged hull steel, bolted to a harness. Heavy. Honest.' },
    'ar_bulwark':  { id: 'ar_bulwark',  name: 'Bulwark Carrier',kind: 'armor',  slot: 'armor',  ac: 4, dura: 90, weight: 11.0,value: 41000, rarity: 'epic',     desc: 'Syndicate breaching plate. You will be slow. You will be alive.' },
    'hl_welder':   { id: 'hl_welder',   name: "Welder's Hood",  kind: 'helmet', slot: 'helmet', ac: 2, dura: 25, weight: 1.4, value: 2600,  rarity: 'common',   desc: 'Scorched visor. Turns a headshot into a bad headache, once.' },
    'hl_breach':   { id: 'hl_breach',   name: 'Breach Helm',    kind: 'helmet', slot: 'helmet', ac: 3, dura: 45, weight: 3.0, value: 13400, rarity: 'rare',     desc: 'Full steel pot with a slit. The slit is the problem.' },
  };

  const RIGS = {
    'rg_belt':   { id: 'rg_belt',   name: 'Scav Belt',        kind: 'rig', slot: 'rig', slots: 6,  weight: 0.8, value: 900,   rarity: 'common',   desc: 'Six loops of webbing and optimism.' },
    'rg_board':  { id: 'rg_board',  name: 'Boarding Rig',     kind: 'rig', slot: 'rig', slots: 10, weight: 1.8, value: 6800,  rarity: 'uncommon', desc: 'Standard pirate loadbearing kit.' },
    'rg_quarter':{ id: 'rg_quarter',name: 'Quartermaster Rig',kind: 'rig', slot: 'rig', slots: 16, weight: 3.2, value: 24000, rarity: 'rare',     desc: 'Carries a small business worth of other peoples property.' },
  };

  const MEDS = {
    'm_bandage': { id: 'm_bandage', name: 'Field Bandage', kind: 'med', heal: 32, useTime: 2.2, weight: 0.3, value: 700,  rarity: 'common',   stack: 4, desc: 'Slow, cheap, and better than bleeding.' },
    'm_trauma':  { id: 'm_trauma',  name: 'Trauma Kit',    kind: 'med', heal: 75, useTime: 4.0, weight: 1.2, value: 3400, rarity: 'uncommon', stack: 3, desc: 'Full patch job. Do not do this in the open.' },
    'm_stim':    { id: 'm_stim',    name: 'Combat Stim',   kind: 'med', heal: 20, useTime: 1.0, weight: 0.2, value: 2600, rarity: 'rare',     stack: 3, stamina: true, desc: 'Instant. Refills wind. Your heart files a complaint later.' },
  };

  // Pure loot: no use beyond selling and contract turn-ins.
  const VALUABLES = {
    'v_ration':   { id: 'v_ration',   name: 'Ration Pack',      kind: 'loot', weight: 0.5, value: 380,   rarity: 'common',   stack: 6, desc: 'Salt, fat, and a date stamp from before the blockade.' },
    'v_coil':     { id: 'v_coil',     name: 'Copper Coil',      kind: 'loot', weight: 0.9, value: 620,   rarity: 'common',   stack: 6, desc: 'Stripped from a dead junction box.' },
    'v_valve':    { id: 'v_valve',    name: 'Radio Valve',      kind: 'loot', weight: 0.2, value: 940,   rarity: 'common',   stack: 8, desc: 'Glass, filament, vacuum. Still warm.' },
    'v_coolant':  { id: 'v_coolant',  name: 'Coolant Flask',    kind: 'loot', weight: 1.4, value: 1500,  rarity: 'uncommon', stack: 4, desc: 'Do not shake. Do not shoot. Do not ask.' },
    'v_optics':   { id: 'v_optics',   name: 'Salvaged Optics',  kind: 'loot', weight: 0.7, value: 2400,  rarity: 'uncommon', stack: 4, desc: 'Ground glass worth more than the gun it came off.' },
    'v_gyro':     { id: 'v_gyro',     name: 'Gyro Compass',     kind: 'loot', weight: 2.1, value: 4100,  rarity: 'rare',     stack: 2, desc: 'Navigation grade. Ships do not fly straight without it.' },
    'v_fuel':     { id: 'v_fuel',     name: 'Fuel Cell',        kind: 'loot', weight: 3.0, value: 5200,  rarity: 'rare',     stack: 2, desc: 'Heavy, volatile, and the only currency that never devalues.' },
    'v_drive':    { id: 'v_drive',    name: 'Encrypted Drive',  kind: 'loot', weight: 0.3, value: 9800,  rarity: 'epic',     stack: 2, desc: 'Someone paid a crew to lose this. Someone will pay more to find it.' },
    'v_bullion':  { id: 'v_bullion',  name: 'Bullion Bar',      kind: 'loot', weight: 6.0, value: 14500, rarity: 'epic',     stack: 1, desc: 'Six kilos of reason to walk slowly to extract.' },
    'v_aicore':   { id: 'v_aicore',   name: 'Ship AI Core',     kind: 'loot', weight: 4.5, value: 32000, rarity: 'legend',   stack: 1, desc: 'It is still running. It knows you took it.' },
  };

  const KEYS = {
    'k_vault':  { id: 'k_vault',  name: 'Refinery Vault Card', kind: 'key', opens: 'vault',  weight: 0.05, value: 8000, rarity: 'rare',   uses: 3, desc: 'Magnetic stripe, refinery admin. Three swipes before it demagnetises.' },
    'k_bridge': { id: 'k_bridge', name: 'Bridge Override Key', kind: 'key', opens: 'bridge', weight: 0.05, value: 11000,rarity: 'epic',   uses: 3, desc: 'Cut from a captain who no longer needs the bridge.' },
    'k_comms':  { id: 'k_comms',  name: 'Comms Cage Key',      kind: 'key', opens: 'comms',  weight: 0.05, value: 6500, rarity: 'rare',   uses: 3, desc: 'Opens the cage. Does not stop the alarm.' },
  };

  const ITEMS = Object.assign({}, AMMO, WEAPONS, ARMOR, RIGS, MEDS, VALUABLES, KEYS);
  for (const id in ITEMS) if (!ITEMS[id].stack) ITEMS[id].stack = 1;

  IV.RARITY = RARITY;
  IV.ITEMS = ITEMS;
  IV.AMMO = AMMO;
  IV.WEAPONS = WEAPONS;

  IV.def = (id) => ITEMS[id];
  IV.rarityColor = (id) => (RARITY[(ITEMS[id] || {}).rarity] || RARITY.common).color;

  // A stack instance carried in stash/rig/loadout.
  IV.stack = function (id, count) {
    const d = ITEMS[id];
    if (!d) throw new Error('unknown item ' + id);
    const s = { uid: IV.uid(), id: id, n: count || 1 };
    if (d.kind === 'weapon') { s.loaded = 0; s.ammo = null; }
    if (d.kind === 'armor' || d.kind === 'helmet') s.dura = d.dura;
    if (d.kind === 'key') s.uses = d.uses;
    return s;
  };

  IV.stackWeight = function (s) {
    const d = ITEMS[s.id];
    let w = d.weight * s.n;
    if (d.kind === 'weapon' && s.loaded) w += s.loaded * 0.03;
    return w;
  };

  // Sale value accounts for durability, magazine contents and stack size.
  IV.stackValue = function (s) {
    const d = ITEMS[s.id];
    let v = d.value * s.n;
    if ((d.kind === 'armor' || d.kind === 'helmet') && s.dura != null) {
      v = Math.round(v * (0.35 + 0.65 * (s.dura / d.dura)));
    }
    if (d.kind === 'weapon' && s.loaded && s.ammo && ITEMS[s.ammo]) {
      v += s.loaded * ITEMS[s.ammo].value;
    }
    if (d.kind === 'key' && s.uses != null) v = Math.round(v * (s.uses / d.uses));
    return v;
  };

  IV.stackLabel = function (s) {
    const d = ITEMS[s.id];
    let l = d.name;
    if (s.n > 1) l += ' x' + s.n;
    if (d.kind === 'weapon' && s.ammo) l += ' [' + s.loaded + '/' + d.mag + ']';
    if ((d.kind === 'armor' || d.kind === 'helmet') && s.dura != null) {
      l += ' (' + Math.round((s.dura / d.dura) * 100) + '%)';
    }
    return l;
  };
})(window.IV);
