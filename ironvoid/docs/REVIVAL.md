# Bringing Marauders back, and building a successor

Two different problems get bundled into "the game died". Separating them is the
whole exercise, because only one of them is yours to solve.

---

## 1. Where Marauders actually stands

Marauders is a 1990s-dieselpunk-in-space extraction shooter by **Small Impact
Games**, published by **Team17**, in Steam Early Access since 2022. Its
technical shape is worth knowing before you copy it: it is an Unreal Engine
title whose backend runs on **Nakama** (Heroic Labs) — a small team shipped a
persistent multiplayer economy *without a dedicated backend engineer*
([case study](https://heroiclabs.com/blog/marauders-case-study/)).

The status, as of this writing (verify before acting on it — this moves):

- In 2025 the publisher signalled that active development had stopped, and the
  community read the game as abandoned
  ([Steam discussions](https://steamcommunity.com/app/1789480/discussions/0/4635989156416287582/)).
- More recently Small Impact Games posted that they have been "reworking core
  systems and rebuilding mechanics" — framed as a full overhaul rather than a
  patch ([coverage](https://www.pcgamer.com/games/fps/after-2-years-of-silence-an-extraction-shooter-we-liked-back-in-2022-for-its-impeccable-vibes-suddenly-springs-back-to-life-on-steam/)).
- **The servers are still up.** The game is not dead in the "shut down"
  sense. It is dead in the sense that matters more to a player: population
  collapse.

That distinction drives everything below. A game with live servers and no
players has a *demand* problem. A game with no servers has an *access* problem.
Marauders has the first one.

---

## 2. Path A — make the original playable again

You cannot fix a population problem with code you do not own. You can fix it
with coordination, and extraction shooters are unusually responsive to it
because they need very few concurrent players per lobby (a Marauders raid is
~10-16 people, not 100).

What actually works, in rough order of effect per hour spent:

1. **Synchronise the queue.** The failure mode of a low-population extraction
   shooter is ten people queuing at ten different times and all matching into
   an empty lobby. A Discord with a "queue at :00 and :30" ritual, a bot that
   pings a role, and one pinned timezone table converts the same ten people
   into full raids. This is the single highest-leverage thing, and it is free.
2. **Pick regions deliberately.** Concentrate on one or two server regions
   instead of letting the population smear across all of them.
3. **Run events with stakes.** Wipe nights, kit-limited runs ("pistols and
   welder hoods only"), scheduled server-wide contract races. Scarcity of
   *occasion* substitutes for scarcity of population.
4. **Make the game legible again.** Current-patch guides, a loot-value sheet,
   a new-player kit list. Extraction shooters lose returning players to
   confusion far more than to difficulty.
5. **Talk to the developer with specifics, not vibes.** Ask for the things a
   small team can actually ship: bot backfill, merged queues, a single global
   region during off-hours, offline/private lobbies, and — the big one —
   **server binaries for community hosting**. That last request is what makes
   a game survivable after its studio moves on.

Two honest limits. First, if the studio ever shuts the servers down, there is
no lawful private-server path without their cooperation: reverse-engineering
their protocol and redistributing server code is not something to plan around.
Second, none of this compounds. It holds a game up; it does not grow one. If
what you want is a game that exists in five years regardless of one studio's
runway, you want Path B.

---

## 3. Path B — build the successor

This is what `ironvoid/` in this repository is: a working, playable prototype
of the loop, built from scratch, owned by you.

### 3.1 The legal line, plainly

Not legal advice, but the line is well-established and not subtle:

**You may freely reuse:** the genre and its systems. Raid-with-your-kit,
lose-it-on-death, timed extraction, searchable containers, armour classes and
ammo penetration, insurance, a hideout with vendors and contracts, wipes.
Game *mechanics and systems* are not protected by copyright — this is why forty
Tarkov-likes exist.

**You may not reuse:** the name "Marauders" or its logo and trade dress; any
art, audio, animation, model or map file; decompiled or copied code; the
specific text of its items, descriptions and lore; character and faction
names. Do not extract assets "as placeholders" — placeholder assets have a
habit of shipping.

**The practical rule:** if a screenshot of your game could be mistaken by a
storefront moderator for the original, you have gone too far. Build your own
setting. IRONVOID is set in a belt-mining collapse with its own factions,
weapons and stations for exactly this reason — the loop is the same, nothing
else is.

### 3.2 Why extraction shooters die (design your way out of it up front)

Every one of these killed a real game. Treat them as requirements, not polish:

| Failure | What it looks like | Mitigation to build in from day one |
|---|---|---|
| **Population spiral** | Queues stop filling, so players leave, so queues stop filling | Bot/AI backfill so a raid is playable at *one* human; one global queue, never per-mode |
| **Gear gap** | Veterans in top armour farm new players who cannot damage them | Penetration-based armour (a cheap AP round beats a rich player's plate), kit-value-based matchmaking |
| **Economy inflation** | Everyone is rich, nothing is scarce, risk evaporates | Hard sinks: repairs, insurance premiums, ammo, contract turn-ins that *consume* items; scheduled wipes |
| **Dead time** | 4 minutes of walking per firefight | Short raid timers (7-12 min), dense loot, extractions that move |
| **Onboarding cliff** | New player loses their kit twice and quits | Free starter kit every raid, insurance, a first contract chain that pays for failure |
| **Cheating** | The one thing that kills a shooter fastest | Server-authoritative everything; the client never owns the inventory |

### 3.3 Technology

For a real production, not a prototype:

- **Engine: Unreal Engine 5.** Not fashion — it is the only mainstream engine
  where dedicated-server builds, replication, and first-person weapon tooling
  are all first-party and battle-tested. Marauders itself is Unreal. Godot 4 is
  a legitimate choice if your team is small and 2D/low-poly; Unity is fine
  technically and carries business risk you should price in.
- **Netcode: authoritative dedicated servers, one process per raid instance.**
  Client-side prediction for movement, server-side hit validation with lag
  compensation. Never trust a client with damage, loot, or inventory.
- **Orchestration:** Agones on Kubernetes, or a managed layer (Edgegap,
  Hathora, Multiplay). Raid instances are cattle: spin up, run 12 minutes,
  die.
- **Meta backend:** this is where the game actually lives. Accounts, stash,
  loadouts, market, contracts, wipes. Use **Nakama** (open source, Unreal SDK,
  self-hostable — the exact path Small Impact Games took) or PlayFab if you
  want managed. Postgres is the source of truth for item ownership, and every
  item move is a transaction. Extraction shooters are inventory databases that
  happen to render.
- **The one rule that matters:** the item exists in the database, not on the
  client. Loot enters the DB when the raid server says the raid ended
  successfully. If your architecture cannot survive a player closing the game
  mid-raid, redesign it before you write a line of gameplay code.

### 3.4 Staging

| Stage | Scope | Realistic effort |
|---|---|---|
| **0. Prototype** | Single-player, one map, the loop end to end. *Is this fun with no other humans in it?* | days — **this is `ironvoid/`** |
| **1. Vertical slice** | One map at production quality, real feel, AI that reads as a threat | 2-4 months |
| **2. Networked slice** | Dedicated server, 8-10 players, persistent stash | +3-6 months, the hardest step |
| **3. Closed alpha** | 3 maps, economy, wipes, ~200 testers | +6 months |
| **4. Early access** | Anti-cheat, storefront, live ops, a wipe cadence you can sustain | 18-30 months total, small team |

Scope discipline is the whole game. Marauders' own lesson — and the reason the
loop is so imitable — is that a small team got a persistent multiplayer economy
shipped by buying the backend instead of building it.

---

## 4. What the prototype in this repo already proves

`ironvoid/` implements the complete single-player loop, browser-native, no
engine and no install:

- Raid insertion → search caches on a timer → fill a limited rig → decide
  whether to push for the vault or leave → hold an extraction for six seconds
  → keep everything, or die and lose all of it.
- Lethal gunplay where **ammo penetration versus armour class** decides fights,
  not raw damage — the anti-gear-gap mechanic from the table above.
- Weight that slows you down, so a greedy rig is a real decision.
- A station alarm that escalates as you make noise, so looting loudly costs you.
- An escape pod that only powers up partway through the raid, so the safe exit
  is not always available.
- Hideout meta: stash with capacity, three vendors with reputation gates,
  twelve contracts, ship upgrades, insurance at 70% recovery.

What it deliberately does not have, and what stage 1-2 must add: multiplayer,
server authority, ragdolls/animation, vertical aim and level geometry beyond a
grid, pathfinding (hostiles currently steer directly and slide along walls),
and a real audio bed.

If you would rather stand on someone else's code than start from this one,
[`PRIOR-ART.md`](PRIOR-ART.md) surveys what open source actually offers the
genre — one MIT-licensed Godot extraction prototype worth reading, a permissive
Tarkov server emulator worth studying and not shipping, a STALKER engine whose
licence is a trap, and the backend stack that saves you the year that matters.

Play it, then read `ironvoid/README.md` for how it is put together. The point of
a prototype is to answer one question — *is the loop fun before any of the
expensive parts exist?* — cheaply enough that a "no" costs you a weekend.
