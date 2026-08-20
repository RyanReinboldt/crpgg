// IRONVOID - DOM interface: toasts, the loot panel, the hideout screens and
// the post-raid summary.
(function (IV) {
  'use strict';

  const UI = {};
  const $ = (sel) => document.querySelector(sel);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ---- toasts ------------------------------------------------------------
  IV.toast = function (msg, kind) {
    const host = $('#toasts');
    if (!host) return;
    const el = document.createElement('div');
    el.className = 'toast' + (kind ? ' ' + kind : '');
    el.textContent = msg;
    host.appendChild(el);
    setTimeout(() => { el.classList.add('out'); }, 2400);
    setTimeout(() => { el.remove(); }, 3000);
  };

  function itemRow(s, right) {
    const d = IV.def(s.id);
    return '<div class="row">' +
      '<span class="dot" style="background:' + IV.rarityColor(s.id) + '"></span>' +
      '<span class="nm" title="' + esc(d.desc || '') + '">' + esc(IV.stackLabel(s)) + '</span>' +
      '<span class="meta">' + IV.stackWeight(s).toFixed(1) + 'kg</span>' +
      '<span class="meta val">' + IV.stackValue(s).toLocaleString('en-US') + '</span>' +
      right + '</div>';
  }

  // ---- loot panel --------------------------------------------------------
  let lootCtx = null;

  IV.openLoot = function (raid, src) {
    lootCtx = { raid: raid, src: src };
    IV.App.input.looting = true;
    IV.App.input.use = false;
    UI.renderLoot();
    $('#overlay').classList.add('show');
  };

  IV.closeLoot = function () {
    lootCtx = null;
    IV.App.input.looting = false;
    $('#overlay').classList.remove('show');
    $('#overlay').innerHTML = '';
  };

  UI.renderLoot = function () {
    if (!lootCtx) return;
    const raid = lootCtx.raid, p = raid.player, src = lootCtx.src;
    const cap = p.rig ? IV.def(p.rig.id).slots : 0;
    let h = '<div class="panel loot">';
    h += '<div class="ph"><span>' + esc(src.title) + '</span><span class="hint">ESC / E to close</span></div>';
    h += '<div class="cols">';
    h += '<div class="col"><div class="ch">CONTENTS</div>';
    if (!src.items.length) h += '<div class="empty">stripped</div>';
    src.items.forEach((s, i) => {
      h += itemRow(s, '<button class="mini" data-take="' + i + '">TAKE</button>');
    });
    if (src.items.length > 1) h += '<button class="wide" data-takeall="1">TAKE EVERYTHING</button>';
    h += '</div>';
    h += '<div class="col"><div class="ch">RIG ' + p.pockets.length + '/' + cap +
         ' &middot; ' + IV.Sim.carriedWeight(p).toFixed(1) + 'kg</div>';
    if (!p.pockets.length) h += '<div class="empty">empty</div>';
    p.pockets.forEach((s, i) => {
      h += itemRow(s, '<button class="mini bad" data-put="' + i + '">PUT</button>');
    });
    h += '</div></div></div>';
    $('#overlay').innerHTML = h;
  };

  UI.lootClick = function (e) {
    if (!lootCtx) return;
    const t = e.target.closest('button');
    if (!t) return;
    const raid = lootCtx.raid, p = raid.player, src = lootCtx.src;
    if (t.dataset.take != null) {
      const i = +t.dataset.take;
      const s = src.items[i];
      if (!s) return;
      if (IV.Sim.addToRig(p, s)) { src.items.splice(i, 1); IV.sfx('loot'); }
      else if (s.n > 0) { IV.sfx('uiBad'); IV.toast('rig is full'); }
      if (s && s.n <= 0) src.items.splice(i, 1);
    } else if (t.dataset.takeall) {
      let full = false;
      for (let i = src.items.length - 1; i >= 0; i--) {
        if (IV.Sim.addToRig(p, src.items[i])) src.items.splice(i, 1);
        else if (src.items[i].n <= 0) src.items.splice(i, 1);
        else full = true;
      }
      IV.sfx(full ? 'uiBad' : 'loot');
      if (full) IV.toast('rig is full');
    } else if (t.dataset.put != null) {
      const i = +t.dataset.put;
      const s = p.pockets[i];
      if (!s) return;
      p.pockets.splice(i, 1);
      src.items.push(s);
      IV.sfx('ui');
    }
    UI.renderLoot();
  };

  // ---- hideout -----------------------------------------------------------
  let tab = 'launch';
  let vendorId = 'vex';

  UI.setTab = function (t) { tab = t; UI.renderMeta(); };
  UI.setVendor = function (v) { vendorId = v; tab = 'market'; UI.renderMeta(); };

  function repBadge(id) {
    const P = IV.Profile, pts = P.data.rep[id] || 0;
    const lvl = IV.repLevel(pts), next = IV.repNext(pts);
    return '<span class="rep">REP ' + lvl + (next ? ' <i>' + pts.toLocaleString('en-US') + '/' + next.toLocaleString('en-US') + '</i>' : ' <i>MAX</i>') + '</span>';
  }

  function slotBox(name, key, s) {
    let inner = '<span class="mt">empty</span>';
    if (s) {
      inner = '<span class="dot" style="background:' + IV.rarityColor(s.id) + '"></span>' +
        '<span class="nm">' + esc(IV.stackLabel(s)) + '</span>' +
        '<button class="mini bad" data-unequip="' + key + '">X</button>';
    }
    return '<div class="slot"><div class="sl">' + name + '</div><div class="sv">' + inner + '</div></div>';
  }

  function launchScreen() {
    const P = IV.Profile;
    let h = '<div class="grid2">';
    h += '<div class="card"><h3>SELECT TARGET</h3>';
    for (const m of IV.MAPS) {
      h += '<div class="mission">' +
        '<div class="mtitle">' + esc(m.name) + '<span class="danger d' + m.danger + '">THREAT ' + m.danger + '</span></div>' +
        '<div class="msub">' + esc(m.sub) + '</div>' +
        '<div class="mbrief">' + esc(m.brief) + '</div>' +
        '<div class="mfoot"><span>' + IV.fmtTime(m.raidTime) + ' window</span>' +
        '<button class="go" data-launch="' + m.id + '">DEPLOY</button></div></div>';
    }
    h += '</div>';

    const l = P.data.loadout;
    const wt = P.loadoutWeight();
    h += '<div class="card"><h3>LOADOUT</h3>';
    h += slotBox('PRIMARY', 'primary', l.primary);
    h += slotBox('SIDEARM', 'sidearm', l.sidearm);
    h += slotBox('ARMOUR', 'armor', l.armor);
    h += slotBox('HELMET', 'helmet', l.helmet);
    h += slotBox('RIG', 'rig', l.rig);
    h += '<div class="sl" style="margin-top:10px">RIG CONTENTS ' + l.pockets.length + '/' + P.rigSlots() + '</div>';
    if (!l.pockets.length) h += '<div class="empty">nothing packed</div>';
    l.pockets.forEach((s, i) => {
      h += itemRow(s, '<button class="mini bad" data-pocketout="' + i + '">X</button>');
    });
    h += '<div class="stat"><span>CARRIED</span><b>' + wt.toFixed(1) + ' kg' + (wt > 18 ? ' (slow)' : '') + '</b></div>';
    h += '<div class="stat"><span>KIT VALUE</span><b>' + IV.fmtCredits(P.loadoutValue()) + '</b></div>';
    const prem = P.insurancePremium();
    h += '<div class="stat"><span>INSURANCE</span><b>' + IV.fmtCredits(prem) + '</b></div>';
    h += '<button class="wide' + (P.data.insured ? ' on' : '') + '" data-insure="1">' +
         (P.data.insured ? 'KIT INSURED FOR THIS RUN' : 'BUY INSURANCE (70% RECOVERY)') + '</button>';
    h += '</div></div>';
    return h;
  }

  function stashScreen() {
    const P = IV.Profile;
    let h = '<div class="grid2"><div class="card"><h3>STASH ' + P.stashUsed() + '/' + P.stashCap() + '</h3>';
    h += '<div class="tools"><input id="stashFilter" placeholder="filter..." value="' + esc(UI.filter || '') + '"></div>';
    const list = P.data.stash
      .map((s, i) => ({ s: s, i: i }))
      .filter((x) => !UI.filter || IV.def(x.s.id).name.toLowerCase().indexOf(UI.filter.toLowerCase()) >= 0)
      .sort((a, b) => IV.stackValue(b.s) - IV.stackValue(a.s));
    if (!list.length) h += '<div class="empty">nothing here</div>';
    for (const x of list) {
      const d = IV.def(x.s.id);
      let btns = '';
      if (d.slot) btns += '<button class="mini" data-equip="' + x.s.uid + '|' + d.slot + '">EQUIP</button>';
      if (d.kind !== 'armor' && d.kind !== 'helmet' && d.kind !== 'rig') {
        btns += '<button class="mini" data-equip="' + x.s.uid + '|pocket">PACK</button>';
      }
      btns += '<button class="mini bad" data-sell="' + x.s.uid + '">SELL</button>';
      h += itemRow(x.s, btns);
    }
    h += '</div>';
    h += '<div class="card"><h3>QUICK SELL</h3><p class="note">Dump everything a dealer will take, at their current rate. Reputation improves the rate.</p>';
    for (const v of IV.VENDORS) {
      const takes = P.data.stash.filter((s) => v.buys.indexOf(IV.def(s.id).kind) >= 0);
      const total = takes.reduce((n, s) => n + P.sellPrice(v, s), 0);
      h += '<div class="stat"><span>' + esc(v.name) + '</span><b>' + takes.length + ' items &middot; ' + IV.fmtCredits(total) + '</b></div>';
      if (takes.length) h += '<button class="wide" data-dump="' + v.id + '">SELL ALL TO ' + esc(v.tag) + '</button>';
    }
    h += '</div></div>';
    return h;
  }

  function marketScreen() {
    const P = IV.Profile;
    const v = IV.vendorById(vendorId);
    let h = '<div class="tabs sub">';
    for (const vv of IV.VENDORS) {
      h += '<button class="tab' + (vv.id === vendorId ? ' on' : '') + '" data-vendor="' + vv.id + '">' + esc(vv.name) + '</button>';
    }
    h += '</div><div class="grid2">';
    h += '<div class="card"><h3>' + esc(v.name) + ' ' + repBadge(v.id) + '</h3><p class="line">&ldquo;' + esc(v.line) + '&rdquo;</p>';
    const stock = P.vendorStock(v);
    for (const e of stock) {
      const price = P.buyPrice(v, e.id, e.n);
      const d = IV.def(e.id);
      h += '<div class="row"><span class="dot" style="background:' + IV.rarityColor(e.id) + '"></span>' +
        '<span class="nm" title="' + esc(d.desc || '') + '">' + esc(d.name) + (e.n > 1 ? ' <i>x' + e.n + '</i>' : '') + '</span>' +
        '<span class="meta val">' + IV.fmtCredits(price) + '</span>' +
        '<button class="mini" data-buy="' + v.id + '|' + e.id + '|' + e.n + '">BUY</button></div>';
    }
    const locked = v.stock.length - stock.length;
    if (locked > 0) h += '<div class="empty">' + locked + ' more line' + (locked > 1 ? 's' : '') + ' unlock with reputation</div>';
    h += '</div>';
    h += '<div class="card"><h3>SELL TO ' + esc(v.tag) + '</h3>';
    const sellable = P.data.stash.filter((s) => v.buys.indexOf(IV.def(s.id).kind) >= 0);
    if (!sellable.length) h += '<div class="empty">nothing this dealer wants</div>';
    for (const s of sellable) {
      h += itemRow(s, '<button class="mini" data-sellto="' + v.id + '|' + s.uid + '">' + IV.fmtCredits(P.sellPrice(v, s)) + '</button>');
    }
    h += '</div></div>';
    return h;
  }

  function contractsScreen() {
    const P = IV.Profile;
    let h = '<div class="grid2"><div class="card"><h3>ACTIVE</h3>';
    if (!P.data.contracts.active.length) h += '<div class="empty">no contracts running</div>';
    for (const id of P.data.contracts.active) {
      const c = IV.contractById(id);
      const at = P.contractProgress(c), ready = P.contractReady(c);
      h += '<div class="contract' + (ready ? ' ready' : '') + '">' +
        '<div class="ctitle">' + esc(c.name) + '<span class="giver">' + esc(IV.vendorById(c.giver).name) + '</span></div>' +
        '<div class="cdesc">' + esc(c.desc) + '</div>' +
        '<div class="cbar"><div style="width:' + Math.round((at / c.req.n) * 100) + '%"></div></div>' +
        '<div class="cfoot"><span>' + at + '/' + c.req.n + '</span>' +
        '<span>' + IV.fmtCredits(c.reward.credits) + '</span>' +
        (ready ? '<button class="go" data-turnin="' + c.id + '">TURN IN</button>' :
                 '<button class="mini bad" data-abandon="' + c.id + '">DROP</button>') +
        '</div></div>';
    }
    h += '</div><div class="card"><h3>AVAILABLE</h3>';
    const avail = P.availableContracts();
    if (!avail.length) h += '<div class="empty">nothing on offer - raise reputation</div>';
    for (const c of avail) {
      h += '<div class="contract">' +
        '<div class="ctitle">' + esc(c.name) + '<span class="giver">' + esc(IV.vendorById(c.giver).name) + '</span></div>' +
        '<div class="cdesc">' + esc(c.desc) + '</div>' +
        '<div class="cfoot"><span>' + IV.fmtCredits(c.reward.credits) + '</span>' +
        '<button class="mini" data-accept="' + c.id + '">ACCEPT</button></div></div>';
    }
    h += '</div></div>';
    return h;
  }

  function shipScreen() {
    const P = IV.Profile;
    let h = '<div class="grid2"><div class="card"><h3>SHIP MODULES</h3>';
    for (const key in IV.SHIP) {
      const mod = IV.SHIP[key];
      const lvl = P.data.ship[key];
      const next = mod.levels[lvl + 1];
      h += '<div class="module"><div class="mtitle">' + esc(mod.name) + '<span class="lvl">LV ' + (lvl + 1) + '/' + mod.levels.length + '</span></div>' +
        '<div class="msub">' + esc(mod.desc) + '</div>';
      if (key === 'hold') h += '<div class="stat"><span>capacity</span><b>' + mod.levels[lvl].cap + ' slots</b></div>';
      if (key === 'medbay') h += '<div class="stat"><span>insertion health</span><b>' + Math.round(mod.levels[lvl].heal * 100) + '%</b></div>';
      if (key === 'workshop') h += '<div class="stat"><span>repair cost</span><b>' + Math.round(mod.levels[lvl].repair * 100) + '%</b></div>';
      if (next) h += '<button class="wide" data-upgrade="' + key + '">UPGRADE &middot; ' + IV.fmtCredits(next.cost) + '</button>';
      else h += '<div class="empty">fully upgraded</div>';
      h += '</div>';
    }
    h += '</div><div class="card"><h3>WORKSHOP</h3><p class="note">Repair armour and helmets. Cost scales with what the workshop can do.</p>';
    const dam = P.data.stash.concat(P.loadoutStacks()).filter((s) => {
      const d = IV.def(s.id);
      return (d.kind === 'armor' || d.kind === 'helmet') && s.dura < d.dura;
    });
    if (!dam.length) h += '<div class="empty">nothing needs work</div>';
    for (const s of dam) {
      const d = IV.def(s.id);
      const cost = Math.round((d.dura - s.dura) * (d.value / d.dura) * 0.6 * P.workshop().repair);
      h += itemRow(s, '<button class="mini" data-repair="' + s.uid + '">' + IV.fmtCredits(cost) + '</button>');
    }
    h += '<h3 style="margin-top:18px">CREW RECORD</h3>';
    const st = P.data.stats;
    const rate = st.raids ? Math.round((st.extracts / st.raids) * 100) : 0;
    for (const [k, v] of [['Raids run', st.raids], ['Extractions', st.extracts], ['Survival rate', rate + '%'],
                          ['Crews killed', st.kills], ['Best haul', IV.fmtCredits(st.bestHaul)],
                          ['Lifetime earnings', IV.fmtCredits(st.earned)]]) {
      h += '<div class="stat"><span>' + k + '</span><b>' + v + '</b></div>';
    }
    h += '</div></div>';
    return h;
  }

  UI.renderMeta = function () {
    const P = IV.Profile;
    const host = $('#meta');
    let h = '<header><div class="brand">IRON<span>VOID</span></div>' +
      '<div class="tabs">';
    for (const [k, label] of [['launch', 'DEPLOY'], ['stash', 'STASH'], ['market', 'MARKET'], ['contracts', 'CONTRACTS'], ['ship', 'SHIP']]) {
      h += '<button class="tab' + (tab === k ? ' on' : '') + '" data-tab="' + k + '">' + label + '</button>';
    }
    h += '</div><div class="wallet">' + IV.fmtCredits(P.data.credits) + '</div></header>';
    h += '<main>';
    h += tab === 'launch' ? launchScreen()
      : tab === 'stash' ? stashScreen()
      : tab === 'market' ? marketScreen()
      : tab === 'contracts' ? contractsScreen()
      : shipScreen();
    h += '</main>';
    h += '<footer><span>' + esc(P.data.log[0] || 'The dock is quiet.') + '</span>' +
      '<span class="right"><button class="mini" data-sound="1">SOUND ' + (IV.audioEnabled() ? 'ON' : 'OFF') + '</button>' +
      '<button class="mini bad" data-wipe="1">WIPE CREW</button></span></footer>';
    host.innerHTML = h;
    const f = $('#stashFilter');
    if (f) {
      f.addEventListener('input', () => { UI.filter = f.value; UI.renderMeta(); $('#stashFilter').focus(); });
    }
  };

  // ---- summary -----------------------------------------------------------
  UI.showSummary = function (res) {
    let h = '<div class="panel summary ' + res.outcome + '">';
    const title = res.outcome === 'extract' ? 'EXTRACTED'
      : res.outcome === 'dead' ? 'KILLED IN ACTION' : 'MISSING IN ACTION';
    h += '<div class="ph big"><span>' + title + '</span><span class="hint">' + esc(res.mapName) + '</span></div>';
    h += '<div class="cols">';
    h += '<div class="col"><div class="ch">RUN</div>';
    const rows = [
      ['Time in raid', IV.fmtTime(res.time)],
      ['Caches opened', res.searched],
      ['Rounds fired', res.shots],
      ['Hostiles down', res.kills.length],
      ['Damage taken', res.damage],
    ];
    if (res.outcome === 'extract') rows.push(['Route', res.viaPod ? 'Escape pod' : 'Ship dock']);
    for (const [k, v] of rows) h += '<div class="stat"><span>' + k + '</span><b>' + v + '</b></div>';
    if (res.contractBumps && res.contractBumps.length) {
      h += '<div class="ch" style="margin-top:14px">CONTRACTS</div>';
      for (const b of res.contractBumps) h += '<div class="stat"><span>' + esc(b.name) + '</span><b>' + b.at + '/' + b.of + '</b></div>';
    }
    if (res.recovered && res.recovered.length) {
      h += '<div class="ch" style="margin-top:14px">INSURANCE RECOVERED</div>';
      for (const s of res.recovered) h += itemRow(s, '');
    }
    h += '</div><div class="col"><div class="ch">' + (res.outcome === 'extract' ? 'HAUL' : 'LOST') + '</div>';
    const list = res.outcome === 'extract' ? res.haul : res.lost;
    if (!list || !list.length) h += '<div class="empty">nothing</div>';
    for (const s of (list || [])) h += itemRow(s, '');
    h += '<div class="stat total"><span>' + (res.outcome === 'extract' ? 'HAUL VALUE' : 'VALUE LOST') + '</span><b>' +
      IV.fmtCredits(res.value || 0) + '</b></div>';
    if (res.overflow) h += '<div class="warn">stash full: ' + res.overflow + ' item(s) left on the dock</div>';
    h += '</div></div>';
    h += '<button class="wide go" data-todeck="1">RETURN TO THE SHIP</button></div>';
    $('#overlay').innerHTML = h;
    $('#overlay').classList.add('show');
  };

  UI.esc = esc;
  UI.itemRow = itemRow;
  IV.UI = UI;
})(window.IV);
