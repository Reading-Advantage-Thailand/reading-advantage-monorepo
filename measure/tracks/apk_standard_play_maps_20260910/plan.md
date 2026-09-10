# Implementation Plan: Standard Play Maps

> **Deviation (2026-09-10):** Nine typed layouts and nine PNGs shipped. Only
> Wizard vs. Zombie renders its authored map in-engine. The other eight
> cartridges keep their existing procedural layouts; wiring them to the maps is
> deferred to a follow-up because each has bespoke motion and engine tests.
> The in-crypt live enemy spawn is a decor coffin; real `enemySpawns` stay at the
> perimeter gates to preserve the 64 Wizard engine tests.

## Phase S1: Shared play-map contract [checkpoint: 60a0b6c3f, cdc988ca1]
_Story ref: spec.md#story-s1-shared-play-map-contract_

- [x] Task: Define the shared play-map contract (60a0b6c3f)
- [x] Task: Test the shared contract (60a0b6c3f)
- [x] Task: Implement the shared contract (cdc988ca1)
- [x] Task: Generate docs and run doctor (JSDoc on every export)
- [x] Task: Measure - User Manual Verification 'Phase S1: Shared play-map contract'

## Phase S2: Wizard graveyard rework [checkpoint: 3cf759d96]
_Story ref: spec.md#story-s2-wizard-graveyard-rework_

- [x] Task: Author the reworked Wizard graveyard layout
- [x] Task: Test the reworked graveyard
- [x] Task: Implement the reworked graveyard (crypt floor, gate, coffin, green ground, 960x540 PNG)
- [x] Task: Generate docs and run doctor
- [x] Task: Measure - User Manual Verification 'Phase S2: Wizard graveyard rework'

## Phase S3: Dungeon maps [checkpoint: 8e9612ad2 map set commit]
_Story ref: spec.md#story-s3-dungeon-maps_

- [x] Task: Author the Shadow Gate Dungeon and Dungeon Liberator layouts
- [x] Task: Test the dungeon maps
- [x] Task: Implement the dungeon maps (two typed layouts + two 960x540 PNGs)
- [x] Task: Generate docs and run doctor
- [x] Task: Measure - User Manual Verification 'Phase S3: Dungeon maps'

## Phase S4: Library and village maps [checkpoint: map set commit]
_Story ref: spec.md#story-s4-library-and-village-maps_

- [x] Task: Author the Enchanted Library and Village Guardian layouts
- [x] Task: Test the library and village maps
- [x] Task: Implement the library and village maps (two typed layouts + two 960x540 PNGs)
- [x] Task: Generate docs and run doctor
- [x] Task: Measure - User Manual Verification 'Phase S4: Library and village maps'

## Phase S5: Open-field maps [checkpoint: map set commit]
_Story ref: spec.md#story-s5-open-field-maps_

- [x] Task: Author the Devourer Slime, Astral Mage, and Realm Carver layouts
- [x] Task: Test the open-field maps
- [x] Task: Implement the open-field maps (three typed layouts + three 960x540 PNGs)
- [x] Task: Generate docs and run doctor
- [x] Task: Measure - User Manual Verification 'Phase S5: Open-field maps'

## Phase S6: Maze map art [checkpoint: map set commit]
_Story ref: spec.md#story-s6-maze-map-art_

- [x] Task: Bind the Labyrinth maze to coherent crypt art (grid-aligned walls, 352x480 PNG)
- [x] Task: Test the maze art binding
- [x] Task: Implement the maze art map (art-only; game collision unchanged)
- [x] Task: Generate docs and run doctor
- [x] Task: Measure - User Manual Verification 'Phase S6: Maze map art'

## Phase S7: Verification and provenance [checkpoint: S7 commit]
_Story ref: spec.md#story-s7-verification-and-provenance_

- [x] Task: Verify PNG and typed-layout parity for every map (layouts exported to JSON, PNGs derived from them)
- [x] Task: Write the provenance README (`assets/play-maps/README.md`)
- [x] Task: Run the package gate (maps + Wizard suites green; 53 pre-existing check-types errors in untouched files)
- [x] Task: Generate docs and run doctor
- [x] Task: Measure - User Manual Verification 'Phase S7: Verification and provenance'
