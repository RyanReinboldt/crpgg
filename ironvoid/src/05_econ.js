// IRONVOID - vendors, contracts, ship upgrades. The meta-game economy.
(function (IV) {
  'use strict';

  const VENDORS = [
    {
      id: 'vex', name: 'Quartermaster Vex', tag: 'ARMS',
      line: 'Bring me scrap, leave with iron. Do not bleed on the counter.',
      buys: ['weapon', 'ammo', 'rig', 'key'], sellMult: 1.35, buyMult: 0.52,
      stock: [
        { id: 'w_vesper', rep: 0, n: 2 }, { id: 'a9_std', rep: 0, n: 120 },
        { id: 'a762_std', rep: 0, n: 90 }, { id: 'rg_belt', rep: 0, n: 3 },
        { id: 'w_kestrel', rep: 1, n: 2 }, { id: 'a12_buck', rep: 1, n: 60 },
        { id: 'rg_board', rep: 1, n: 2 }, { id: 'a9_ap', rep: 2, n: 60 },
        { id: 'w_ironjaw', rep: 2, n: 1 }, { id: 'w_hardline', rep: 2, n: 1 },
        { id: 'a12_slug', rep: 3, n: 40 }, { id: 'w_bulldog', rep: 3, n: 1 },
        { id: 'a762_ap', rep: 4, n: 60 }, { id: 'rg_quarter', rep: 4, n: 1 },
        { id: 'w_longshot', rep: 5, n: 1 },
      ],
    },
    {
      id: 'doc', name: 'Doc Halloway', tag: 'MEDICAL',
      line: 'I can put you back together. I cannot make you clever.',
      buys: ['med', 'armor', 'helmet'], sellMult: 1.30, buyMult: 0.50,
      stock: [
        { id: 'm_bandage', rep: 0, n: 8 }, { id: 'hl_welder', rep: 0, n: 3 },
        { id: 'ar_deckhand', rep: 1, n: 2 }, { id: 'm_trauma', rep: 1, n: 4 },
        { id: 'm_stim', rep: 3, n: 3 }, { id: 'hl_breach', rep: 3, n: 1 },
        { id: 'ar_boarder', rep: 4, n: 1 }, { id: 'ar_bulwark', rep: 6, n: 1 },
      ],
    },
    {
      id: 'fence', name: 'The Fence', tag: 'SALVAGE',
      line: 'No names. No manifests. Only what it weighs and what it is worth.',
      buys: ['loot', 'key'], sellMult: 1.6, buyMult: 0.78,
      stock: [
        { id: 'k_comms', rep: 1, n: 1 }, { id: 'k_vault', rep: 2, n: 1 },
        { id: 'k_bridge', rep: 4, n: 1 }, { id: 'v_fuel', rep: 2, n: 2 },
      ],
    },
  ];

  // Reputation thresholds. Index = rep level.
  const REP_STEPS = [0, 900, 2400, 5200, 10500, 19000, 34000];
  IV.repLevel = function (points) {
    let lvl = 0;
    for (let i = 0; i < REP_STEPS.length; i++) if (points >= REP_STEPS[i]) lvl = i;
    return lvl;
  };
  IV.repNext = function (points) {
    for (let i = 0; i < REP_STEPS.length; i++) if (points < REP_STEPS[i]) return REP_STEPS[i];
    return null;
  };

  const CONTRACTS = [
    { id: 'c_supply', giver: 'vex', rep: 0, name: 'Hungry Deck',
      desc: 'Hand over 4 Ration Packs. My crew eats before it fights.',
      req: { type: 'deliver', item: 'v_ration', n: 4 },
      reward: { credits: 2600, rep: { vex: 600 }, items: [['a9_std', 60]] } },
    { id: 'c_thin', giver: 'vex', rep: 0, name: 'Thin the Shift',
      desc: 'Put down 6 Combine Guards. Any station, any deck.',
      req: { type: 'kill', arch: 'guard', n: 6 },
      reward: { credits: 3400, rep: { vex: 800 }, items: [['m_bandage', 2]] } },
    { id: 'c_optics', giver: 'fence', rep: 0, name: 'Ground Glass',
      desc: 'Two sets of Salvaged Optics. Do not scratch the coating.',
      req: { type: 'deliver', item: 'v_optics', n: 2 },
      reward: { credits: 4200, rep: { fence: 900 }, items: [] } },
    { id: 'c_firstblood', giver: 'doc', rep: 0, name: 'Walk It Off',
      desc: 'Come back from three raids alive. That is the whole contract.',
      req: { type: 'extract', n: 3 },
      reward: { credits: 3000, rep: { doc: 700 }, items: [['m_trauma', 1]] } },
    { id: 'c_fuel', giver: 'vex', rep: 1, name: 'Burn Rate',
      desc: 'Three Fuel Cells. Carry them carefully or do not carry them at all.',
      req: { type: 'deliver', item: 'v_fuel', n: 3 },
      reward: { credits: 9500, rep: { vex: 1500 }, items: [['a762_ap', 30]] } },
    { id: 'c_pod', giver: 'fence', rep: 1, name: 'Back Door',
      desc: 'Leave twice by escape pod. The dock is watched, the pod is not.',
      req: { type: 'extract', flag: 'pod', n: 2 },
      reward: { credits: 7800, rep: { fence: 1400 }, items: [['k_comms', 1]] } },
    { id: 'c_sidearm', giver: 'vex', rep: 2, name: 'Close Work',
      desc: 'Kill 3 Syndicate Raiders with a sidearm. Prove the pistol is not decoration.',
      req: { type: 'kill', arch: 'raider', n: 3, slot: 'sidearm' },
      reward: { credits: 8600, rep: { vex: 1800 }, items: [['w_hardline', 1]] } },
    { id: 'c_bullion', giver: 'fence', rep: 2, name: 'Heavy Departure',
      desc: 'Extract from the refinery carrying a Bullion Bar.',
      req: { type: 'extract', map: 'hallow', carry: 'v_bullion', n: 1 },
      reward: { credits: 12000, rep: { fence: 2400 }, items: [] } },
    { id: 'c_ghost', giver: 'doc', rep: 2, name: 'Quiet Hands',
      desc: 'Extract from Listening Post KILO without firing a single round.',
      req: { type: 'extract', map: 'kilo', flag: 'noshots', n: 1 },
      reward: { credits: 14000, rep: { doc: 2600 }, items: [['m_stim', 2]] } },
    { id: 'c_breach', giver: 'doc', rep: 3, name: 'Field Surgery',
      desc: 'Kill 4 Breachers. Bring me their plate carriers if any survive.',
      req: { type: 'kill', arch: 'breacher', n: 4 },
      reward: { credits: 16500, rep: { doc: 3200 }, items: [['ar_boarder', 1]] } },
    { id: 'c_core', giver: 'fence', rep: 4, name: 'It Still Talks',
      desc: 'One Ship AI Core. Do not power it on. Do not answer it.',
      req: { type: 'deliver', item: 'v_aicore', n: 1 },
      reward: { credits: 38000, rep: { fence: 6000 }, items: [['ar_bulwark', 1]] } },
    { id: 'c_mule', giver: 'vex', rep: 3, name: 'Mule Run',
      desc: 'Extract once carrying over 35 kilos. Slow is a tactic, not a flaw.',
      req: { type: 'extract', weight: 35, n: 1 },
      reward: { credits: 15000, rep: { vex: 3000 }, items: [['rg_quarter', 1]] } },
  ];

  const SHIP = {
    hold:    { name: 'Cargo Hold',   desc: 'Stash capacity.',
               levels: [{ cost: 0, cap: 40 }, { cost: 6000, cap: 60 }, { cost: 18000, cap: 90 }, { cost: 46000, cap: 140 }] },
    medbay:  { name: 'Med Bay',      desc: 'Health you insert with. Wounds do not heal themselves out here.',
               levels: [{ cost: 0, heal: 0.72 }, { cost: 7500, heal: 0.85 }, { cost: 21000, heal: 0.94 }, { cost: 52000, heal: 1.0 }] },
    workshop:{ name: 'Workshop',     desc: 'Armour repair cost and insurance premium.',
               levels: [{ cost: 0, repair: 1.0, ins: 1.0 }, { cost: 9000, repair: 0.7, ins: 0.85 }, { cost: 26000, repair: 0.45, ins: 0.7 }, { cost: 60000, repair: 0.25, ins: 0.5 }] },
  };

  IV.VENDORS = VENDORS;
  IV.CONTRACTS = CONTRACTS;
  IV.SHIP = SHIP;
  IV.vendorById = (id) => VENDORS.find((v) => v.id === id);
  IV.contractById = (id) => CONTRACTS.find((c) => c.id === id);
})(window.IV);
