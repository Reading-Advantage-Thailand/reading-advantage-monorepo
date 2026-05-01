# Implementation Plan: Game Triage and Fidelity Audit

This plan outlines the steps to audit and patch games developed after 'Spellweaver's Run' for fidelity with the `vocab-game-builder` skill and general quality.

## Phase 1: Fidelity Checklist & Prep
**Goal:** Establish the criteria for the audit and set up the triage tools.

- [x] Task: Create `measure/notes/game-fidelity-checklist.md` based on `vocab-game-builder` skill requirements. 5d6745b
- [x] Task: Create a script/command to check test coverage across all game-specific directories. 5d6745b
- [x] Task: Measure - User Manual Verification 'Phase 1: Fidelity Checklist & Prep' (Protocol in workflow.md)

## Phase 2: Triage & Patch - Archived Games (Set 1)
**Goal:** Audit and fix 'Shadow Gate Dungeon', 'Rune Forge Chamber', and 'Village Guardian'.

- [x] Task: Audit 'Shadow Gate Dungeon' against checklist and identify bugs.
- [x] Task: Fix identified bugs in 'Shadow Gate Dungeon' (UI, Logic, Gameplay). 67b41d4
- [x] Task: Verify >80% coverage and architectural fidelity for 'Shadow Gate Dungeon'. 67b41d4
- [x] Task: Audit 'Rune Forge Chamber' against checklist and identify bugs.
- [x] Task: Fix identified bugs in 'Rune Forge Chamber' (UI, Logic, Gameplay). 67b41d4
- [x] Task: Verify >80% coverage and architectural fidelity for 'Rune Forge Chamber'. 67b41d4
- [x] Task: Audit 'Village Guardian' against checklist and identify bugs.
- [x] Task: Fix identified bugs in 'Village Guardian' (UI, Logic, Gameplay). 4a87838
- [x] Task: Verify >80% coverage and architectural fidelity for 'Village Guardian'. 4a87838
- [x] Task: Measure - User Manual Verification 'Phase 2: Triage & Patch - Archived Games (Set 1)' (Protocol in workflow.md)

### Phase 2 Manual Verification — Bugs Found

**Village Guardian:**
- Game ends after one level (victory). Should continue until player dies with more/faster opponents each level (no victory state).

**Shadow Gate Dungeon:**
- Monster too fast and too aggressive — player can't escape.
- Arrow keys stop responding for ~1 second (keyboard repeat delay bug).
- Gameplay too similar to Village Guardian — needs significant differentiation.

**Rune Forge Chamber:**
- Touch/click targets too small or not responsive to mouse clicks.
- Needs multi-level timer progression: level 1 timer doubles current value, each subsequent level reduces by 20%.

### Phase 2 Bug Fixes

- [x] Task: Fix Village Guardian — multi-level progression, remove victory state, add monsters per level. a7d845e
- [x] Task: Fix Shadow Gate Dungeon — reduce creature speed, fix keyboard repeat delay, redesign creature AI as patrol/stealth (differentiated from Village Guardian and other dungeon games). 1bd5b86
- [x] Task: Fix Rune Forge Chamber — fix click/tap targets, implement multi-level timer progression (level 1 = 2×timer, each level −20%). b32d7bc

### Phase 2 Additional Bug Fixes (Manual Verification Round 2)

- [x] Task: Fix Shadow Gate Dungeon — shrink all entities (player/creature/crystals) for mobile portrait canvas, reduce sight radius from 67% to ~40% of canvas width, reduce patrol radius, slow creature chase speeds, increase tick rate from 20 FPS to 60 FPS for responsive controls, reduce chase duration. 2926f49
- [x] Task: Migrate all 6 action games from setInterval(50ms) to requestAnimationFrame for smooth 60 FPS. 4dc8f8e
- [x] Task: Update vocab-game-builder skill and GameNameGame.tsx template to use rAF pattern. c1714f7

## Phase 3: Triage & Patch - Archived Games (Set 2)
**Goal:** Audit and fix 'Labyrinth of the Goblin King' and 'The Abyssal Well'.

- [x] Task: Audit 'Labyrinth of the Goblin King' against checklist and identify bugs.
- [x] Task: Fix identified bugs in 'Labyrinth of the Goblin King' (UI, Logic, Gameplay).
- [x] Task: Verify >80% coverage and architectural fidelity for 'Labyrinth of the Goblin King'.
- [x] Task: Audit 'The Abyssal Well' against checklist and identify bugs.
- [x] Task: Fix identified bugs in 'The Abyssal Well' (UI, Logic, Gameplay).
- [x] Task: Verify >80% coverage and architectural fidelity for 'The Abyssal Well'.
- [x] Task: Measure - User Manual Verification 'Phase 3: Triage & Patch - Archived Games (Set 2)' (Protocol in workflow.md)

### Phase 3 Manual Verification — Bugs Found

**Labyrinth of the Goblin King:**
- API routes missing `export const dynamic = "force-static"` — 500 error on sentence fetch.
- `vocabulary` undefined on start screen — ReferenceError (should use `sentences` prop).
- Game canvas rendered but nothing moved — `startLabyrinthGoblinKing()` was imported but never called, so state stayed at `status: 'start'`.
- Arrow keys scrolled the page instead of moving the player.
- Movement required pixel-perfect alignment to turn corners — no corner-rounding.
- Player stopped when keys released (not Pac-Man style continuous movement).
- Goblins stuck bouncing in dead-ends (free-roaming collision, not tile-based pathing).
- After clearing all words and eating all goblins, empty board with nothing to do.
- Heroic aura powerup too long.

**The Abyssal Well:**
- Same API route `force-static` bug.
- Same `vocabulary` undefined on start screen.

### Phase 3 Bug Fixes

- [x] Task: Fix missing `export const dynamic = "force-static"` on 4 API routes (labyrinth + abyssal sentences/complete). Fix both API route templates to prevent recurrence. 1bb4130
- [x] Task: Fix `vocabulary` → `sentences` prop reference on start screens for both games. aa322fe
- [x] Task: Fix Labyrinth — call `startLabyrinthGoblinKing()` to transition game to playing state. d580980
- [x] Task: Fix Labyrinth — Pac-Man style movement (always moving, arrows change direction), corner-rounding snap, arrow key preventDefault. 61360fe
- [x] Task: Fix Labyrinth — tile-based goblin AI at intersections, sentence cycling on word completion, goblin respawn on eaten, pass full sentences array. 475b1a5
- [x] Task: Fix Labyrinth — goblin nudge past tile center to prevent stuck-at-center bug, respawn at far floor positions, reduce heroic aura to 6s. eee2278

## Phase 4: Triage & Patch - Active/Planned Games
**Goal:** Audit and fix 'Archer's Revenge', 'Griffin Sky-Joust', and 'Realm Carver'.

- [x] Task: Audit 'Archer's Revenge' (Active Track) against checklist.
- [x] Task: Fix/Ensure fidelity for 'Archer's Revenge' features (Shared screens, rAF loop, mobile UI).
- [x] Task: Verify >80% coverage for 'Archer's Revenge'.
- [ ] Task: (If started) Audit 'Griffin Sky-Joust' and 'Realm Carver' specs and early code.
- [x] Task: Measure - User Manual Verification 'Phase 4: Triage & Patch - Active/Planned Games' (Protocol in workflow.md)

## Phase 5: Final Platform Verification
**Goal:** Ensure all audited games work harmoniously on the platform.

- [x] Task: Run full test suite: `CI=true npm test`.
- [x] Task: Perform build check: `CI=true npm run build`.
- [x] Task: Verify mobile responsiveness for all 8 games on 390x844 viewport.
- [x] Task: Measure - User Manual Verification 'Phase 5: Final Platform Verification' (Protocol in workflow.md)
