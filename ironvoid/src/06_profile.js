// IRONVOID - persistent crew profile: stash, loadout, credits, reputation,
// contracts and ship upgrades. Saved to localStorage, defensively.
(function (IV) {
  'use strict';

  const KEY = 'ironvoid.profile.v1';
  const SAVE_VERSION = 1;

  function fresh() {
    const p = {
      v: SAVE_VERSION,
      callsign: 'NEW CREW',
      credits: 12000,
      hp: 100,
      maxHp: 100,
      stash: [],
      loadout: { primary: null, sidearm: null, armor: null, helmet: null, rig: null, pockets: [] },
      rep: { vex: 0, doc: 0, fence: 0 },
      contracts: { active: [], done: [], progress: {} },
      ship: { hold: 0, medbay: 0, workshop: 0 },
      insured: null,
      stats: { raids: 0, extracts: 0, deaths: 0, kills: 0, earned: 0, bestHaul: 0, podExtracts: 0 },
      log: [],
      intro: false,
    };
    // Starting kit: enough to run the refinery once.
    p.loadout.sidearm = IV.stack('w_vesper');
    p.loadout.sidearm.ammo = 'a9_std';
    p.loadout.sidearm.loaded = 12;
    p.loadout.rig = IV.stack('rg_belt');
    p.loadout.helmet = IV.stack('hl_welder');
    p.loadout.pockets = [IV.stack('m_bandage', 2), IV.stack('a9_std', 36)];
    p.stash.push(IV.stack('a9_std', 60), IV.stack('m_bandage', 2), IV.stack('v_ration', 2));
    return p;
  }

  const P = { data: null };

  P.load = function () {
    let raw = null;
    try { raw = window.localStorage.getItem(KEY); } catch (e) { raw = null; }
    if (raw) {
      try {
        const d = JSON.parse(raw);
        if (d && d.v === SAVE_VERSION && d.loadout && Array.isArray(d.stash)) {
          // drop anything referencing content that no longer exists
          d.stash = d.stash.filter((s) => IV.ITEMS[s.id]);
          d.loadout.pockets = (d.loadout.pockets || []).filter((s) => IV.ITEMS[s.id]);
          for (const k of ['primary', 'sidearm', 'armor', 'helmet', 'rig']) {
            if (d.loadout[k] && !IV.ITEMS[d.loadout[k].id]) d.loadout[k] = null;
          }
          P.data = d;
          return P.data;
        }
      } catch (e) { /* corrupt save: start over rather than trap the player */ }
    }
    P.data = fresh();
    return P.data;
  };

  P.save = function () {
    try { window.localStorage.setItem(KEY, JSON.stringify(P.data)); } catch (e) { /* private mode */ }
  };

  P.reset = function () {
    P.data = fresh();
    P.save();
    return P.data;
  };

  // ---- capacity ---------------------------------------------------------
  P.stashCap = () => IV.SHIP.hold.levels[P.data.ship.hold].cap;
  P.stashUsed = () => P.data.stash.length;
  P.rigSlots = () => (P.data.loadout.rig ? IV.def(P.data.loadout.rig.id).slots : 0);
  P.medbayHeal = () => IV.SHIP.medbay.levels[P.data.ship.medbay].heal;
  P.workshop = () => IV.SHIP.workshop.levels[P.data.ship.workshop];

  // ---- stash ------------------------------------------------------------
  function canMerge(a, b) {
    if (a.id !== b.id) return false;
    const d = IV.def(a.id);
    if (d.stack <= 1) return false;
    if (d.kind === 'weapon' || d.kind === 'armor' || d.kind === 'helmet') return false;
    return true;
  }

  // Returns the number of units that did not fit.
  P.toStash = function (stack) {
    const d = IV.def(stack.id);
    let left = stack.n;
    if (d.stack > 1) {
      for (const s of P.data.stash) {
        if (!canMerge(s, stack)) continue;
        const room = d.stack - s.n;
        if (room <= 0) continue;
        const move = Math.min(room, left);
        s.n += move; left -= move;
        if (left <= 0) return 0;
      }
    }
    while (left > 0) {
      if (P.stashUsed() >= P.stashCap()) return left;
      const take = Math.min(left, d.stack);
      const copy = Object.assign({}, stack, { uid: IV.uid(), n: take });
      P.data.stash.push(copy);
      left -= take;
    }
    return 0;
  };

  P.fromStash = function (uid) {
    const i = P.data.stash.findIndex((s) => s.uid === uid);
    return i < 0 ? null : P.data.stash.splice(i, 1)[0];
  };

  P.countInStash = function (id) {
    return P.data.stash.reduce((n, s) => n + (s.id === id ? s.n : 0), 0);
  };

  P.consumeFromStash = function (id, n) {
    let left = n;
    for (let i = P.data.stash.length - 1; i >= 0 && left > 0; i--) {
      const s = P.data.stash[i];
      if (s.id !== id) continue;
      const take = Math.min(s.n, left);
      s.n -= take; left -= take;
      if (s.n <= 0) P.data.stash.splice(i, 1);
    }
    return n - left;
  };

  // ---- loadout ----------------------------------------------------------
  P.loadoutStacks = function () {
    const l = P.data.loadout;
    const out = [];
    for (const k of ['primary', 'sidearm', 'armor', 'helmet', 'rig']) if (l[k]) out.push(l[k]);
    for (const s of l.pockets) out.push(s);
    return out;
  };

  P.loadoutWeight = function () {
    return P.loadoutStacks().reduce((w, s) => w + IV.stackWeight(s), 0);
  };

  P.loadoutValue = function () {
    return P.loadoutStacks().reduce((v, s) => v + IV.stackValue(s), 0);
  };

  // Move a stash stack into an equipment slot or the rig; returns an error string or null.
  P.equip = function (uid, slot) {
    const s = P.data.stash.find((x) => x.uid === uid);
    if (!s) return 'not in stash';
    const d = IV.def(s.id);
    const l = P.data.loadout;
    if (slot === 'pocket') {
      if (l.pockets.length >= P.rigSlots()) return 'rig is full';
      if (d.kind === 'armor' || d.kind === 'helmet' || d.kind === 'rig') return 'wear it, do not pocket it';
      P.fromStash(uid);
      l.pockets.push(s);
      return null;
    }
    if (d.slot !== slot) return 'wrong slot';
    P.fromStash(uid);
    const old = l[slot];
    l[slot] = s;
    if (old) {
      if (slot === 'rig') {
        // shrinking the rig spills whatever no longer fits
        const keep = d.slots;
        while (l.pockets.length > keep) {
          const spill = l.pockets.pop();
          if (P.toStash(spill)) return 'stash full: some kit was left on the dock';
        }
      }
      if (P.toStash(old)) return 'stash full: old kit left on the dock';
    }
    return null;
  };

  P.unequip = function (slot, index) {
    const l = P.data.loadout;
    let s = null;
    if (slot === 'pocket') s = l.pockets.splice(index, 1)[0];
    else { s = l[slot]; l[slot] = null; }
    if (!s) return 'nothing there';
    if (slot === 'rig') {
      while (l.pockets.length) {
        const spill = l.pockets.pop();
        if (P.toStash(spill)) return 'stash full';
      }
    }
    return P.toStash(s) ? 'stash full' : null;
  };

  // ---- money and reputation --------------------------------------------
  P.pay = function (n) {
    if (P.data.credits < n) return false;
    P.data.credits -= n;
    return true;
  };
  P.earn = function (n) {
    P.data.credits += n;
    P.data.stats.earned += n;
  };
  P.addRep = function (vendorId, n) {
    const before = IV.repLevel(P.data.rep[vendorId] || 0);
    P.data.rep[vendorId] = (P.data.rep[vendorId] || 0) + n;
    const after = IV.repLevel(P.data.rep[vendorId]);
    return after > before;
  };

  P.buyPrice = function (vendor, id, n) {
    const lvl = IV.repLevel(P.data.rep[vendor.id] || 0);
    return Math.round(IV.def(id).value * (n || 1) * vendor.sellMult * (1 - lvl * 0.025));
  };
  P.sellPrice = function (vendor, stack) {
    const lvl = IV.repLevel(P.data.rep[vendor.id] || 0);
    return Math.round(IV.stackValue(stack) * (vendor.buyMult + lvl * 0.025));
  };
  P.vendorFor = function (kind) {
    return IV.VENDORS.find((v) => v.buys.indexOf(kind) >= 0);
  };
  P.vendorStock = function (vendor) {
    const lvl = IV.repLevel(P.data.rep[vendor.id] || 0);
    return vendor.stock.filter((e) => e.rep <= lvl);
  };

  // ---- contracts --------------------------------------------------------
  P.availableContracts = function () {
    return IV.CONTRACTS.filter((c) => {
      if (P.data.contracts.done.indexOf(c.id) >= 0) return false;
      if (P.data.contracts.active.indexOf(c.id) >= 0) return false;
      return IV.repLevel(P.data.rep[c.giver] || 0) >= c.rep;
    });
  };

  P.acceptContract = function (id) {
    if (P.data.contracts.active.indexOf(id) >= 0) return 'already active';
    if (P.data.contracts.active.length >= 3) return 'three contracts is the limit';
    P.data.contracts.active.push(id);
    P.data.contracts.progress[id] = P.data.contracts.progress[id] || 0;
    return null;
  };

  P.contractProgress = function (c) {
    if (c.req.type === 'deliver') return Math.min(P.countInStash(c.req.item), c.req.n);
    return Math.min(P.data.contracts.progress[c.id] || 0, c.req.n);
  };
  P.contractReady = (c) => P.contractProgress(c) >= c.req.n;

  P.turnIn = function (id) {
    const c = IV.contractById(id);
    if (!c || !P.contractReady(c)) return 'not complete';
    if (c.req.type === 'deliver') P.consumeFromStash(c.req.item, c.req.n);
    P.earn(c.reward.credits);
    for (const v in (c.reward.rep || {})) P.addRep(v, c.reward.rep[v]);
    for (const [iid, n] of (c.reward.items || [])) P.toStash(IV.stack(iid, n));
    P.data.contracts.active = P.data.contracts.active.filter((x) => x !== id);
    P.data.contracts.done.push(id);
    delete P.data.contracts.progress[id];
    return null;
  };

  // Called from the raid summary with the tally of what happened in there.
  P.applyContractEvents = function (ev) {
    const bumped = [];
    for (const id of P.data.contracts.active.slice()) {
      const c = IV.contractById(id);
      if (!c || c.req.type === 'deliver') continue;
      let add = 0;
      if (c.req.type === 'kill') {
        for (const k of ev.kills) {
          if (k.arch !== c.req.arch) continue;
          if (c.req.slot && k.slot !== c.req.slot) continue;
          add++;
        }
      } else if (c.req.type === 'extract' && ev.extracted) {
        let ok = true;
        if (c.req.map && ev.map !== c.req.map) ok = false;
        if (c.req.flag === 'pod' && !ev.viaPod) ok = false;
        if (c.req.flag === 'noshots' && ev.shots > 0) ok = false;
        if (c.req.carry && !ev.carried[c.req.carry]) ok = false;
        if (c.req.weight && ev.weight < c.req.weight) ok = false;
        if (ok) add = 1;
      }
      if (add) {
        P.data.contracts.progress[id] = (P.data.contracts.progress[id] || 0) + add;
        bumped.push({ id: id, name: c.name, at: Math.min(P.data.contracts.progress[id], c.req.n), of: c.req.n });
      }
    }
    return bumped;
  };

  // ---- insurance --------------------------------------------------------
  P.insurancePremium = function () {
    return Math.round(P.loadoutValue() * 0.14 * P.workshop().ins);
  };
  P.buyInsurance = function () {
    const cost = P.insurancePremium();
    if (cost <= 0) return 'nothing worth insuring';
    if (!P.pay(cost)) return 'not enough credits';
    P.data.insured = P.loadoutStacks().map((s) => s.uid);
    return null;
  };

  P.log = function (line) {
    P.data.log.unshift(line);
    if (P.data.log.length > 40) P.data.log.length = 40;
  };

  IV.Profile = P;
})(window.IV);
