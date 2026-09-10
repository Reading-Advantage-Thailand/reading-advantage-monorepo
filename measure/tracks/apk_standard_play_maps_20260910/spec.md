# Specification: Standard Play Maps

## Overview

**Sprint goal:** Give every top-down Advantage game a reusable authored play map,
and rebuild the Wizard vs. Zombie graveyard as the reference map.

Most cartridges paint one flat ground tile plus a few props. The owner rejected
that on the Wizard pilot. Only Wizard vs. Zombie has a typed map. This track
generalizes that map into one shared contract, then authors nine maps.

## Stories

### Story S1: Shared play-map contract
**As a** cartridge author
**I want** one typed map contract
**So that** every game describes terrain, spawns, paths, props, and solids the same way

**Acceptance Criteria:**
- Given the current `WizardGraveyardMap` interfaces, When I read `standard-play-map.ts`, Then a generic `StandardPlayMap` shape exposes world, playerSpawn, enemySpawns, clearings, paths, terrain, decor, and solids.
- Given a malformed map, When it is validated, Then the error names the failing field.
- Given two different maps, When the renderer and collision code consume them, Then both use the same API.

**Estimate:** M
**Priority:** Must

### Story S2: Wizard graveyard rework
**As a** student
**I want** a distinctive graveyard
**So that** the Wizard vs. Zombie board reads as a real place with routes

**Acceptance Criteria:**
- Given the reworked map, When it renders, Then it shows a central crypt, four answer clearings, winding dirt paths, a fence border, graves, dead trees, and lanterns.
- Given play start, When the map loads, Then the player spawns in the lower-left outdoor area and an enemy spawns inside the crypt.
- Given the map data, When reachability runs, Then every clearing is reachable from spawn.
- Given the existing tests, When the rework lands, Then `wizard-graveyard-map.test.ts` and `wizard-vs-zombie.test.ts` pass.

**Estimate:** L
**Priority:** Must

### Story S3: Dungeon maps
**As a** student
**I want** dungeon maps for Shadow Gate Dungeon and Dungeon Liberator
**So that** I can plan routes between rooms

**Acceptance Criteria:**
- Given a crypt theme, When each map renders, Then walls and tan floor appear only inside the dungeon, and a gate or exit exists.
- Given rooms and corridors, When reachability runs, Then every word spot and the exit are reachable.
- Given each game, When it loads, Then it uses its own map id, spawn, and solids.

**Estimate:** L
**Priority:** Must

### Story S4: Library and village maps
**As a** student
**I want** a library interior and a village
**So that** Enchanted Library and Village Guardian have stable landmarks

**Acceptance Criteria:**
- Given the library map, When it renders, Then shelves form stable aisles with clear exits.
- Given the village map, When it renders, Then roads connect a sanctuary and hazard lanes.
- Given both maps, When reachability runs, Then every target is reachable.

**Estimate:** M
**Priority:** Must

### Story S5: Open-field maps
**As a** student
**I want** shaped open fields
**So that** Devourer Slime, Astral Mage, and Realm Carver have cover and corridors

**Acceptance Criteria:**
- Given the field maps, When they render, Then green ground stays dominant and dirt paths stay corridors.
- Given Astral Mage, When it renders, Then crystal nodes and blockers appear.
- Given each map, When reachability runs, Then spawns and targets connect.

**Estimate:** M
**Priority:** Should

### Story S6: Maze map art
**As a** student
**I want** the Labyrinth maze to use coherent crypt art
**So that** the maze reads as one place

**Acceptance Criteria:**
- Given the existing 11x15 grid at 32 pixels, When the map renders, Then floor and wall art align to the grid.
- Given the art swap, When tests run, Then movement, goblin behavior, and collision are unchanged.

**Estimate:** M
**Priority:** Should

### Story S7: Verification and provenance
**As a** project owner
**I want** map evidence
**So that** I can approve the set

**Acceptance Criteria:**
- Given each map, When the PNG and typed layout are compared, Then placements match.
- Given each map, When tests run, Then spawn safety, reachability, and no-overlap checks pass.
- Given the map set, When I read `assets/play-maps/README.md`, Then it lists inspected sources and the ElvGames credit.
- Given CI, When the suite runs, Then game-cartridges `test` and `check-types` exit 0.

**Estimate:** M
**Priority:** Must

## Non-Functional Requirements
- NFR-1: Composed PNGs are derived art. They stay outside the pinned pack tree (`assets/play-maps/`) and do not change the accepted pack digest.
- NFR-2: Semantic keys stay stable (`world:ground`, `world:path`, `prop:*`).
- NFR-3: No new hashes unless a contract requires them.
- NFR-4: Every exported map symbol has JSDoc.
- NFR-5: Layout validation is pure. Tests do not load assets.

## Acceptance Criteria (track-level)
- AC-1: `StandardPlayMap` contract exists with validation and tests.
- AC-2: Wizard graveyard is reworked and green ground stays dominant.
- AC-3: Nine maps ship a PNG plus a typed layout at the owning canvas size.
- AC-4: Reachability and spawn-safety tests pass for every map.
- AC-5: `pnpm turbo run test --filter=@reading-advantage/game-cartridges` and `check-types` pass.
- AC-6: `assets/play-maps/README.md` lists inspected sources and the ElvGames credit.

## Out of Scope
- Lane, flight, vertical, and fixed-board games.
- Magic Defense, Castle Defense, and Paladin's Twin-Soul arenas.
- Theme palette variants (jungle, harbor, lost city, atlantis, sanctuary, hell).
- Mechanic changes to Labyrinth or Realm Carver.
