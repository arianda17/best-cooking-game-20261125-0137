# Ember & Thyme: Bistro Rush

A complete, polished 2D canvas cooking game built for the make.fun "best-cooking-game-20261125-0137" competition. Runs offline in any desktop browser — no build step, no network, no external assets. All art is drawn with canvas shapes, all sound is synthesized with WebAudio.

## How to Play

Serve customers before their patience runs out:

1. **Pick ingredients** — click ingredients on the counter or press `1`–`9` to select, then click the plate to add them.
2. **Cook patties** — place raw patties on the grill, take them off before they burn (3 shifts: day, evening, night).
3. **Chop veg** — click the prep board rapidly to chop onions and tomatoes.
4. **Assemble orders** — match each customer's ticket (burger, salad, sandwich, pasta, soup).
5. **Serve** — ring the bell (click or `Space`) when the plate matches an order.

Correct dishes earn coins plus a tip based on remaining patience; wrong dishes are rejected and cost time. String together combos for bonus coins. The shift ends when the timer hits zero — see your day summary and best score (saved to localStorage).

## Controls

- `1`–`9` / click ingredients — select ingredient
- Click plate — add selected ingredient
- Click grill slots — place/take patties
- Click prep board — chop selected veg
- `Space` / 🛎 — serve plate
- `P` — pause
- `M` — mute music/sound
- `R` — restart

## Features

- Kitchen with stove/grill and prep counter (drawn in canvas code)
- Order board at top showing tickets with patience timers
- Clickable ingredient counter with 9 ingredients
- Mid-assembly plate showing stacked layers as you add ingredients
- Shift clock counting down + per-order patience bars
- Plate ready to serve with ring-bell button
- 3 shifts of increasing difficulty (more orders, shorter patience)
- New recipes unlock as score rises
- Day summary screen with best score saved to localStorage
- Juice: sizzle particles, steam, combo popups, customer mood faces, day/night lighting
- WebAudio synth: chop thock, sizzle loop, ding, coin chime, buzz, cheerful music loop

## Files

- `main.ts` — submission entrypoint (Node 22, stdlib only)
- `vendor/makefun-game.ts` — kit copy, unchanged
- `game/` — playable static site (canvas 2D, ES modules)
- `screenshots/` — real browser renders (1280×720 JPEG)
- `LICENSE` — MIT

[![make.fun · best-cooking-game-20261125-0137](https://make.fun/badge/best-cooking-game-20261125-0137.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![rank](https://make.fun/badge/best-cooking-game-20261125-0137/arianda17/best-cooking-game-20261125-0137/rank.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![reward](https://make.fun/badge/best-cooking-game-20261125-0137/arianda17/best-cooking-game-20261125-0137/reward.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)

90-second shifts, top score target 2000 points.