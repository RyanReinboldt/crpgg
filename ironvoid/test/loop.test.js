const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = 'file:///home/user/crpgg/ironvoid/dist/ironvoid.html';
let fails = 0;
const check = (name, cond, extra) => { console.log((cond ? '  PASS ' : '  FAIL ') + name + (extra ? '  ' + JSON.stringify(extra) : '')); if (!cond) fails++; };

(async () => {
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: 960, height: 540 } });
  page.on('pageerror', (e) => { console.log('PAGEERROR', e.message); fails++; });
  page.on('console', (m) => { if (m.type() === 'error') { console.log('CONSOLE', m.text()); fails++; } });
  await page.goto(URL);
  await page.waitForTimeout(400);

  console.log('\n== extraction run ==');
  await page.click('[data-launch="hallow"]');
  await page.waitForTimeout(400);
  const ext = await page.evaluate(async () => {
    const IV = window.IV, App = IV.App, raid = App.raid, p = raid.player;
    // loot two caches by standing on them and holding use
    let looted = 0;
    for (const c of raid.containers.slice(0, 2)) {
      p.x = c.x + 0.4; p.y = c.y; p.ang = Math.PI;
      App.input.use = true;
      for (let i = 0; i < 400 && !App.input.looting; i++) IV.Sim.update(raid, App.input, 1 / 60);
      if (App.input.looting) {
        // take everything then close
        document.querySelector('[data-takeall]')?.click();
        const rows = document.querySelectorAll('[data-take]');
        rows.forEach((r) => r.click());
        IV.closeLoot();
        looted++;
      }
      App.input.use = false;
    }
    const carried = p.pockets.length;
    // walk onto the dock and hold
    const dock = raid.zones.find((z) => z.kind === 'dock');
    p.x = dock.x; p.y = dock.y;
    for (let i = 0; i < 600 && !raid.over; i++) IV.Sim.update(raid, App.input, 1 / 60);
    await new Promise((r) => setTimeout(r, 300));
    return { looted, carried, outcome: raid.over && raid.over.outcome, value: raid.over && raid.over.value };
  });
  check('looted 2 caches', ext.looted === 2, ext);
  check('carried loot out', ext.carried > 0, ext);
  check('extracted', ext.outcome === 'extract', ext);
  await page.waitForTimeout(300);
  check('summary shown', await page.locator('.summary').count() === 1);
  const after = await page.evaluate(() => {
    const d = window.IV.Profile.data;
    return { stash: d.stash.length, extracts: d.stats.extracts, raids: d.stats.raids, credits: d.credits,
             pockets: d.loadout.pockets.length, sidearm: !!d.loadout.sidearm };
  });
  check('haul reached stash', after.stash > 3, after);
  check('stats recorded', after.extracts === 1 && after.raids === 1, after);
  check('gear came home', after.sidearm === true, after);
  await page.click('[data-todeck]');
  await page.waitForTimeout(200);
  check('back on the deck', await page.evaluate(() => document.body.dataset.scene) === 'meta');

  console.log('\n== market ==');
  await page.click('[data-tab="market"]'); await page.waitForTimeout(150);
  const before = await page.evaluate(() => window.IV.Profile.data.credits);
  await page.click('[data-buy]'); await page.waitForTimeout(150);
  const afterBuy = await page.evaluate(() => ({ c: window.IV.Profile.data.credits, s: window.IV.Profile.data.stash.length }));
  check('purchase debits credits', afterBuy.c < before, { before, afterBuy });
  await page.click('[data-tab="stash"]'); await page.waitForTimeout(150);
  const dump = await page.locator('[data-dump]').first();
  if (await dump.count()) { await dump.click(); await page.waitForTimeout(150); }
  const afterSell = await page.evaluate(() => ({ c: window.IV.Profile.data.credits, rep: window.IV.Profile.data.rep }));
  check('selling pays and builds rep', afterSell.c > 0 && Object.values(afterSell.rep).some((v) => v > 0), afterSell);

  console.log('\n== contracts ==');
  await page.click('[data-tab="contracts"]'); await page.waitForTimeout(150);
  await page.locator('[data-accept]').first().click(); await page.waitForTimeout(150);
  check('contract accepted', await page.evaluate(() => window.IV.Profile.data.contracts.active.length) === 1);

  console.log('\n== persistence ==');
  const snap = await page.evaluate(() => ({ c: window.IV.Profile.data.credits, s: window.IV.Profile.data.stash.length }));
  await page.reload(); await page.waitForTimeout(500);
  const reloaded = await page.evaluate(() => ({ c: window.IV.Profile.data.credits, s: window.IV.Profile.data.stash.length }));
  check('profile survives reload', reloaded.c === snap.c && reloaded.s === snap.s, { snap, reloaded });

  console.log('\n== death run + insurance ==');
  const dead = await page.evaluate(async () => {
    const IV = window.IV, P = IV.Profile;
    // make sure something is equipped and insured
    P.data.credits += 200000;
    const rifle = IV.stack('w_bulldog'); P.toStash(rifle);
    P.equip(rifle.uid, 'primary');
    P.buyInsurance();
    const insuredCount = P.data.insured.length;
    IV.App.startRaid('kilo');
    await new Promise((r) => setTimeout(r, 300));
    const raid = IV.App.raid;
    raid.player.pockets.push(IV.stack('v_bullion', 1));
    IV.Sim.end(raid, 'dead');
    await new Promise((r) => setTimeout(r, 400));
    const d = P.data;
    return { insuredCount, primary: d.loadout.primary, pockets: d.loadout.pockets.length,
             deaths: d.stats.deaths, insured: d.insured, stash: d.stash.length };
  });
  check('insurance was bought', dead.insuredCount > 0, dead);
  check('kit lost on death', dead.primary === null && dead.pockets === 0, dead);
  check('death recorded', dead.deaths === 1, dead);
  check('insurance consumed', dead.insured === null, dead);
  check('summary shows loss', await page.locator('.summary.dead').count() === 1);

  console.log('\n== wipe ==');
  page.on('dialog', (d) => d.accept());
  await page.click('[data-todeck]'); await page.waitForTimeout(200);
  await page.click('[data-wipe]'); await page.waitForTimeout(300);
  check('wipe resets credits', await page.evaluate(() => window.IV.Profile.data.credits) === 12000);

  console.log(fails ? '\n' + fails + ' FAILURES' : '\nall green');
  await b.close();
  process.exit(fails ? 1 : 0);
})();
