# IRONVOID

A playable prototype of the extraction-shooter loop that made Marauders worth
missing: board a station with the kit you paid for, search it under a clock,
and get out with more than you came in with — or lose all of it.

Runs in a browser. No engine, no build step, no binary assets: every texture,
sprite and sound effect is generated in code at boot.

![A raid in progress on Refinery HALLOW-3](docs/shot-raid.png)

**Original work.** Nothing here is taken from Marauders — no assets, no names,
no code. What is reused is the genre, which is not anyone's property. See
[`docs/REVIVAL.md`](docs/REVIVAL.md) for the reasoning, the legal line, and what
building a real successor would actually take, and
[`docs/PRIOR-ART.md`](docs/PRIOR-ART.md) for the open-source landscape — what
can be forked, what can only be read, and which licences are traps.

## Play

```bash
open ironvoid/dist/ironvoid.html          # macOS
xdg-open ironvoid/dist/ironvoid.html      # Linux
```

The single-file build works straight from disk. To hack on the sources instead,
serve the directory (`npx http-server ironvoid`) and open `index.html`, then
rebuild the bundle with `node ironvoid/build.js`.

Click the viewport to capture the mouse.

| | |
|---|---|
| `WASD` | move |
| `Shift` | sprint (costs wind) |
| `Mouse` / `LMB` / `RMB` | look / fire / aim |
| `R` | reload from the rig |
| `E` | interact — **hold** to search a cache |
| `F` | use the best medical item you are carrying |
| `1` / `2` | primary / sidearm |
| `M` or `Tab` | scanner |
| `Esc` | pause, or close a loot panel |

## The loop

Deploy with what you are wearing. Everything in your rig and every slot on your
body is at risk for the whole raid.

- **Caches** take 2-4 seconds of held search. Rare caches are worth more and
  take longer, and you are deaf and stationary while you work.
- **Rig space is the real currency.** A Scav Belt holds six stacks. The Ship AI
  Core weighs 4.5kg and is worth more than your gun; carrying it makes you slow.
- **Armour is beaten by penetration, not damage.** Cheap AP rounds punch a
  Bulwark Carrier that soaks a whole magazine of soft 9mm. A poor player with
  the right ammo can kill a rich one — the deliberate anti-gear-gap mechanic.
- **Noise escalates.** Every shot raises the station alarm; a high alarm extends
  hostile sight range and pulls patrols toward you.
- **Locked areas need cards.** Vault, bridge and comms doors hold the best
  loot. Cards drop in rare caches, off Vault Wardens, or from the Fence.
- **Two ways out.** The ship dock is always live. The escape pod only powers up
  partway through the raid — the shortcut exists, but not when you want it.
- **Six seconds on the pad.** Extraction is a hold, not a touch.

Die or run out the clock and every item on you is gone. Insurance returns 70%
of what you insured, and only what you insured.

![The hideout: mission select and loadout](docs/shot-hideout.png)

Between raids: sell to three vendors whose rates and stock improve with
reputation, run contracts, upgrade the ship (stash capacity, insertion health,
repair costs), and repair armour. Progress is saved to `localStorage`.

## Stations

| Station | Threat | Window | Character |
|---|---|---|---|
| Refinery HALLOW-3 | 1 | 12:00 | Forgiving. Light patrols, vault card circulates in the crew block |
| Freighter SVETLANA-9 | 2 | 10:00 | Tight rusted decks, rival crews, bridge vault |
| Listening Post KILO | 3 | 7:00 | Small, dense, lethal. Short timer and nowhere quiet |

## Code

Thirteen plain scripts, loaded in order, sharing one `window.IV` namespace. No
dependencies, no transpiler.

```
src/00_rng.js       seeded RNG (mulberry32) + math helpers
src/01_items.js     every weapon, round, plate, med and valuable
src/02_maps.js      the three stations as ASCII, plus loot and hostile tables
src/03_art.js       procedural wall textures and sprites, baked at boot
src/04_audio.js     WebAudio synthesis — gunfire, hits, doors, alarms
src/05_econ.js      vendors, reputation curves, contracts, ship modules
src/06_profile.js   persistent crew: stash, loadout, credits, contracts
src/07_world.js     raid generation: grid, doors, caches, hostiles, exits
src/08_render.js    textured raycaster, 480x270 buffer, sprite z-buffering
src/09_raid.js      the simulation: movement, gunplay, AI, looting, extraction
src/10_hud.js       heads-up display, weapon viewmodel, scanner
src/11_ui.js        loot panels, hideout screens, post-raid summary
src/12_main.js      scene management, input, frame loop, raid settlement
```

Maps are hand-authored ASCII in `src/02_maps.js` and readable as level design:

```
#  steel wall     %  rusted wall     +  powered door
V  vault door     B  bridge door     M  comms door
c  cache          C  rare cache      e / E  hostile / elite
S  insertion      X  ship dock       Z  escape pod
```

Edit a row, reload, and you are standing in it. `node test/maps.test.js`
verifies every map is rectangular and that no cache, hostile or exit is walled
off from the insertion points.

## Tests

```bash
node ironvoid/test/maps.test.js     # geometry + reachability, no browser
node ironvoid/test/loop.test.js     # full loop in headless Chromium
```

The loop test drives a real raid — loots caches, extracts, checks the haul
reaches the stash, buys and sells, accepts a contract, reloads the page to
verify persistence, then dies with insured kit and checks the settlement. It
needs Playwright available.

## Known limits

It is a prototype, and these are the honest edges:

- Single-player. Multiplayer is the expensive step, not this one.
- Hostiles steer straight at their target and slide along walls; there is no
  pathfinding, so they can loiter behind geometry.
- No vertical aim — a grid-based raycaster has no floors, ramps or crouching.
- Doors are binary: they animate open, they do not block partially.
- The renderer is a CPU raycaster. It holds 60fps at 480x270 upscaled; it is
  not a lighting model.
