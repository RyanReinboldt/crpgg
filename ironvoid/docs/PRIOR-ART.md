# Open-source prior art for an extraction shooter

Short version: **there is no open-source extraction shooter worth forking as a
game.** The genre's entire FOSS presence is a handful of hobby prototypes with
single-digit star counts. That sounds discouraging and is not, because the
expensive part of an extraction shooter was never the shooting — it is the
persistent economy, the server authority and the orchestration, and *those* are
mature, permissive and free.

Licenses and status below were checked in August 2026 against the projects'
own repositories. Verify before you depend on any of them; licenses change and
hobby projects go quiet.

---

## 1. Actual open-source extraction games

| Project | License | Stack | Scale | Verdict |
|---|---|---|---|---|
| [operation-steel-tide](https://github.com/AetherRadar/operation-steel-tide) | **MIT** | Godot 4.6 + C#, Go backend | ~228 commits, playable Windows builds | The only one you could legally fork and ship. Read it first |
| [the-fog](https://github.com/furmonenko/the-fog) | — | Godot 4, GDScript | tiny | 2D top-down PvE extraction. Reference only |
| [search-strike-extract](https://github.com/zzusp/search-strike-extract) | — | vanilla JS canvas | tiny | 2D browser extraction. Reference only |
| [she](https://github.com/JoshuaGessner/she) | — | Godot 4 | design phase | First-person fantasy extraction roguelite. Nothing to use yet |
| [deltaops-ai-edition](https://github.com/topbat/deltaops-ai-edition) | — | JS | tiny | 2D tactical extraction roguelite |

**operation-steel-tide is the real find.** MIT, Godot 4 with C#, a Go backend
service, and the loop already present: infiltration, objectives, graded loot
with modular weapon parts and armour durability, backpack management, atomic
profile saves, squad AI with revives, and ENet co-op. If you want a networked
starting point instead of a blank project, this is it.

Two things to check before committing to it: its co-op is **host-authoritative
state relay**, which is not the same as an authoritative dedicated server — the
host can cheat, and converting that later is a rewrite of the trust boundary,
not a refactor. And at this size the code has had no real review but your own,
so audit it as you would any dependency you are about to build a year on.

## 2. The Tarkov mod ecosystem — read it, do not build on it

- [SPT server](https://github.com/sp-tarkov/server) — **NCSA licensed**, which is
  permissive, but it is a server *emulator* for a proprietary client: it is
  useless without owning Escape from Tarkov, and shipping a product derived
  from it is not a plan. What it is genuinely worth: the best available
  reference implementation of extraction-shooter **meta systems** — quests,
  hideout, flea market, loot tables, insurance, trader reputation. If you want
  to know how these are actually modelled at production scale, this is the
  source to read.
- [Project Fika](https://github.com/project-fika) (SPT co-op) — **CC BY-NC-SA
  4.0**. Explicitly non-commercial. Do not copy code from it into anything you
  intend to sell.

## 3. The S.T.A.L.K.E.R. lineage — the ancestor of the loop

[OpenXRay](https://github.com/OpenXRay/xray-16) is an actively maintained,
cross-platform revival of the X-Ray engine (3.2k stars, 64-bit, Linux/macOS/BSD,
ARM and more). STALKER is where this genre's loop comes from — venture into the
zone, loot, degrade your gear, come back and sell.

**License trap:** the repository is not free software. Its own licence file
states the included source is commercial GSC Game World proprietary code, made
available for non-commercial fan use. Study its A-Life scheduler, artifact
economy and weapon-degradation model. Do not ship its code.

## 4. Shooter foundations you *can* build on

| Base | License | Why |
|---|---|---|
| [Godot 4](https://github.com/godotengine/godot) | MIT | Best cost/benefit for a small team. No royalty, real 3D, built-in high-level multiplayer |
| [O3DE](https://github.com/o3de/o3de) | Apache-2.0 | Heavier, AAA-oriented, genuinely open. Steeper ramp, smaller ecosystem |
| Unreal Engine 5 | Source-available, 5% royalty | Not open source, but the pragmatic pick for a Marauders-alike: dedicated-server builds, replication and FPS tooling are first-party. Marauders itself is Unreal |
| [ioquake3](https://github.com/ioquake/ioq3) / [dhewm3](https://github.com/dhewm/dhewm3) / [Xonotic](https://gitlab.com/xonotic) / [Red Eclipse](https://github.com/redeclipse) | GPL | Decades-proven netcode, prediction and movement feel. GPL is viral: a derivative ships GPL too. Read them for how, don't fork them for what |
| [Liblast](https://codeberg.org/Liblast) | FOSS (verify) | Godot 4 multiplayer FPS built on a 100% open toolchain. The main repo currently points at a framework rewrite — check status before depending on it |

## 5. The parts that actually cost you — all permissive, all free

This is where open source saves you a year, and it is not the gameplay layer:

- **[Nakama](https://github.com/heroiclabs/nakama)** — Apache-2.0, Go, 13.2k
  stars. Accounts, storage, matchmaking, chat, groups, leaderboards, with SDKs
  for Unreal, Unity, Godot, .NET and more. This is the exact stack Small Impact
  Games used to ship Marauders' persistent economy *without a dedicated backend
  engineer*. Self-host it or buy the managed version.
- **[Agones](https://github.com/googleforgames/agones)** — Apache-2.0. Dedicated
  game-server orchestration on Kubernetes. Raid instances are cattle: spin up,
  run twelve minutes, die.
- **[Open Match](https://github.com/googleforgames/open-match)** — Apache-2.0,
  Google for Games, actively developed. Matchmaking framework if Nakama's isn't
  enough.
- **Postgres** — the item-ownership ledger. Every loot move is a transaction.
  This is the actual game.
- **Netcode libraries** — [Mirror](https://github.com/MirrorNetworking/Mirror)
  (MIT) or FishNet for Unity; Godot's high-level multiplayer; UE's replication.

## 6. Assets, the other silent cost

CC0 so you never have to untangle attribution later: [Kenney](https://kenney.nl),
[Quaternius](https://quaternius.com), [ambientCG](https://ambientcg.com),
[Poly Haven](https://polyhaven.com). Mixed-licence, read each file:
[OpenGameArt](https://opengameart.org), [freesound](https://freesound.org).

---

## What to actually do

- **Shipping something** → don't fork a hobby prototype. Keep a loop you already
  believe in (that is what `ironvoid/` is for), pick Godot 4 or UE5, and *buy*
  the backend with Nakama. The engine choice is reversible early; the trust
  boundary is not.
- **Want a networked co-op starting point in Godot** → read
  operation-steel-tide, then decide fork versus reference.
- **Want to understand the meta systems** → read SPT's server. Nothing else
  open shows you a full extraction economy.
- **Want the tone** → play STALKER with OpenXRay. Take the feel, not the code.
