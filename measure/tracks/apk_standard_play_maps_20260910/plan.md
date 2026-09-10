# Implementation Plan: Standard Play Maps

## Phase S1: Shared play-map contract
_Story ref: spec.md#story-s1-shared-play-map-contract_

- [ ] Task: Define the shared play-map contract
    - [ ] Define `StandardPlayMap` interfaces in `packages/game-cartridges/src/maps/standard-play-map.ts`
    - [ ] Define typed validation with per-field error messages
    - [ ] Export the contract from the maps module root
- [ ] Task: Test the shared contract
    - [ ] Test that a valid map parses
    - [ ] Test that a malformed map names the failing field
    - [ ] Test that two maps share one renderer and collision API
- [ ] Task: Implement the shared contract
    - [ ] Migrate the Wizard-specific interfaces to `StandardPlayMap`
    - [ ] Keep all callers compiling
- [ ] Task: Generate docs and run doctor
    - [ ] Add JSDoc to every exported symbol
    - [ ] Run `measure/generate.sh` and `measure/doctor.sh`
- [ ] Task: Measure - User Manual Verification 'Phase S1: Shared play-map contract' (Protocol in workflow.md)

## Phase S2: Wizard graveyard rework
_Story ref: spec.md#story-s2-wizard-graveyard-rework_

- [ ] Task: Author the reworked Wizard graveyard layout
    - [ ] Define spawn, four clearings, winding paths, crypt, fence border, and props
    - [ ] Define collision solids that leave walkable corridors
- [ ] Task: Test the reworked graveyard
    - [ ] Test reachability from spawn to every clearing
    - [ ] Test player spawn is outdoor and enemy spawn is inside the crypt
    - [ ] Test no prop overlaps a clearing or a spawn
- [ ] Task: Implement the reworked graveyard
    - [ ] Rewrite `wizard-graveyard-map.ts` on the shared contract
    - [ ] Update `wizard-vs-zombie.ts` imports and renderer
    - [ ] Compose the 960x540 PNG under `assets/play-maps/`
- [ ] Task: Generate docs and run doctor
    - [ ] Update map note and JSDoc
    - [ ] Run `measure/generate.sh` and `measure/doctor.sh`
- [ ] Task: Measure - User Manual Verification 'Phase S2: Wizard graveyard rework' (Protocol in workflow.md)

## Phase S3: Dungeon maps
_Story ref: spec.md#story-s3-dungeon-maps_

- [ ] Task: Author the Shadow Gate Dungeon and Dungeon Liberator layouts
    - [ ] Define crypt walls, tan floor, gate, and debris
    - [ ] Define spawns, word spots, exits, and solids
- [ ] Task: Test the dungeon maps
    - [ ] Test reachability from spawn to every word spot and exit
    - [ ] Test spawn safety and solid overlap
    - [ ] Test that crypt floor appears only inside dungeon bounds
- [ ] Task: Implement the dungeon maps
    - [ ] Add the two typed layouts under `packages/game-cartridges/src/maps/`
    - [ ] Compose the two 960x540 PNGs under `assets/play-maps/`
- [ ] Task: Generate docs and run doctor
    - [ ] Add JSDoc and source notes
    - [ ] Run `measure/generate.sh` and `measure/doctor.sh`
- [ ] Task: Measure - User Manual Verification 'Phase S3: Dungeon maps' (Protocol in workflow.md)

## Phase S4: Library and village maps
_Story ref: spec.md#story-s4-library-and-village-maps_

- [ ] Task: Author the Enchanted Library and Village Guardian layouts
    - [ ] Define stable shelf aisles and exits
    - [ ] Define village roads, sanctuary, and hazard lanes
- [ ] Task: Test the library and village maps
    - [ ] Test reachability from spawn to every target
    - [ ] Test spawn safety and solid overlap
- [ ] Task: Implement the library and village maps
    - [ ] Add the two typed layouts under `packages/game-cartridges/src/maps/`
    - [ ] Compose the two 960x540 PNGs under `assets/play-maps/`
- [ ] Task: Generate docs and run doctor
    - [ ] Add JSDoc and source notes
    - [ ] Run `measure/generate.sh` and `measure/doctor.sh`
- [ ] Task: Measure - User Manual Verification 'Phase S4: Library and village maps' (Protocol in workflow.md)

## Phase S5: Open-field maps
_Story ref: spec.md#story-s5-open-field-maps_

- [ ] Task: Author the Devourer Slime, Astral Mage, and Realm Carver layouts
    - [ ] Define ground, dirt corridors, cover, and crystal nodes
    - [ ] Define spawns, targets, and solids
- [ ] Task: Test the open-field maps
    - [ ] Test that green ground stays dominant
    - [ ] Test reachability between spawns and targets
- [ ] Task: Implement the open-field maps
    - [ ] Add the three typed layouts under `packages/game-cartridges/src/maps/`
    - [ ] Compose the three 960x540 PNGs under `assets/play-maps/`
- [ ] Task: Generate docs and run doctor
    - [ ] Add JSDoc and source notes
    - [ ] Run `measure/generate.sh` and `measure/doctor.sh`
- [ ] Task: Measure - User Manual Verification 'Phase S5: Open-field maps' (Protocol in workflow.md)

## Phase S6: Maze map art
_Story ref: spec.md#story-s6-maze-map-art_

- [ ] Task: Bind the Labyrinth maze to coherent crypt art
    - [ ] Map floor and wall cells to standard-pack semantic keys
    - [ ] Keep the 11x15 grid at 32 pixels
- [ ] Task: Test the maze art binding
    - [ ] Test grid-to-art alignment
    - [ ] Test that movement, goblin behavior, and collision are unchanged
- [ ] Task: Implement the maze art map
    - [ ] Add the Labyrinth layout under `packages/game-cartridges/src/maps/`
    - [ ] Compose the 390x700 PNG under `assets/play-maps/`
- [ ] Task: Generate docs and run doctor
    - [ ] Add JSDoc and source notes
    - [ ] Run `measure/generate.sh` and `measure/doctor.sh`
- [ ] Task: Measure - User Manual Verification 'Phase S6: Maze map art' (Protocol in workflow.md)

## Phase S7: Verification and provenance
_Story ref: spec.md#story-s7-verification-and-provenance_

- [ ] Task: Verify PNG and typed-layout parity for every map
    - [ ] Compare placements for all nine maps
    - [ ] Run the reachability and spawn-safety suite
- [ ] Task: Write the provenance README
    - [ ] List inspected source files and reasons
    - [ ] Add the ElvGames credit
- [ ] Task: Run the full package gate
    - [ ] Run `pnpm turbo run test --filter=@reading-advantage/game-cartridges`
    - [ ] Run `pnpm turbo run check-types --filter=@reading-advantage/game-cartridges`
- [ ] Task: Generate docs and run doctor
    - [ ] Run `measure/generate.sh` and `measure/doctor.sh`
- [ ] Task: Measure - User Manual Verification 'Phase S7: Verification and provenance' (Protocol in workflow.md)
