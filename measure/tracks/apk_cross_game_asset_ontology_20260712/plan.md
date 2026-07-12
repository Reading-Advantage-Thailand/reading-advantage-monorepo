# Implementation Plan: APK Cross-Game Asset Requirements and Ontology

> **Track ID:** `apk_cross_game_asset_ontology_20260712`
> **Program:** `measure/apk-asset-system-program.md`

## Phase 0: Freeze the evidence model [checkpoint: pending]

- [ ] Task: Record the superseded planning assumptions and prohibit art
  generation, physical-manifest expansion, and cartridge rewriting in this track
- [ ] Task: Define a versioned schema for the game corpus, scene-level asset
  usage matrix, source citations, confidence, disposition, and ontology links
- [ ] Task: Write failing validation tests for missing game IDs, uncited usages,
  orphan ontology entries, invalid statuses, and unreviewed existing assets
- [ ] Task: Implement only the validation tooling needed to keep the research
  artifacts complete and machine-checkable
- [ ] Task: Measure - User Manual Verification 'Phase 0' (Protocol in workflow.md)

## Phase 1: Build the complete game corpus [checkpoint: pending]

- [ ] Task: Reconcile all 27 entries in `gameCards.ts` with current routes,
  implementations, tests, and status overrides
- [ ] Task: Recover the withdrawn W0-W4 cartridge mechanics and asset-consumer
  evidence from Git history, archived baselines, blueprints, and cutover manifests
- [ ] Task: Discover active/in-development game tracks and implementations not
  represented accurately in the current catalog, including Babel Architect
- [ ] Task: Record conflicts between catalog, implementation, route, test, and
  Measure claims rather than selecting one silently
- [ ] Task: Publish `game-corpus.md` with a completeness check proving every
  discovered game has an evidence-backed status and source set
- [ ] Task: Measure - User Manual Verification 'Phase 1' (Protocol in workflow.md)

## Phase 2: Extract scene-level asset usages [checkpoint: pending]

- [ ] Task: Analyze defense, combat, duel, and survival games for actors,
  strength/attack roles, defenses, projectiles, waves, damage states, and HUD
- [ ] Task: Analyze runners, traversal, aerial, patrol, and territory games for
  mounts, gates, lanes, targets, hazards, camera indicators, minimaps, and biomes
- [ ] Task: Analyze collector, adventure, maze, dungeon, and rescue games for
  environments, NPCs, enemies, pickups, doors, props, paths, and feedback states
- [ ] Task: Analyze puzzle, forge, alchemy, shop, matching, and construction
  games for workstations, pieces, ingredients, containers, UI states, and effects
- [ ] Task: Capture cross-cutting start/result, touch-control, prompt, progress,
  accessibility, and responsive presentation needs
- [ ] Task: Publish `game-asset-usage-matrix.md` with one source citation and
  confidence value for every usage row
- [ ] Task: Measure - User Manual Verification 'Phase 2' (Protocol in workflow.md)

## Phase 3: Audit existing assets [checkpoint: pending]

- [ ] Task: Enumerate candidate 2D assets across app/package/public paths and
  the approved authoring repository, excluding build output and dependency caches
- [ ] Task: Manually inspect every candidate and record visual content,
  dimensions, provenance/license, current callers, and contract suitability
- [ ] Task: Classify each candidate as reusable, adaptable, cover-only,
  placeholder-only, rejected, or unknown with explicit evidence
- [ ] Task: Publish `existing-asset-audit.md` and validate that no proposed reuse
  lacks manual inspection
- [ ] Task: Measure - User Manual Verification 'Phase 3' (Protocol in workflow.md)

## Phase 4: Normalize the shared asset ontology [checkpoint: pending]

- [ ] Task: Group repeated usages into semantic families without referring to
  physical filenames or legacy sheet layouts
- [ ] Task: Define gameplay variants only for proven strength, behavior,
  movement, attack, scale, interaction, collision/readability, or scene roles
- [ ] Task: Define reusable environment kits and their terrain, boundary,
  structure, prop, hazard, ambient, and navigation capabilities
- [ ] Task: Record allowed reuse/substitution and prohibited conflations for
  actors, enemies, mounts, targets, props, projectiles, VFX, and UI
- [ ] Task: Publish `asset-ontology.md` and pass orphan, duplicate, citation,
  and game-coverage validators
- [ ] Task: Measure - User Manual Verification 'Phase 4' (Protocol in workflow.md)

## Phase 5: Identify holes and production coverage [checkpoint: pending]

- [ ] Task: Compare the usage matrix, ontology, and existing-asset audit to
  identify missing Must/Should/Could capabilities
- [ ] Task: Distinguish required gameplay variants from optional visual variety
  and record rejected duplicate concepts
- [ ] Task: Rank asset groups by the number of games/scenes unlocked and by
  upstream dependencies such as shared environment or actor capabilities
- [ ] Task: Publish `asset-gap-analysis.md` and `asset-coverage-plan.md` with
  proposed bounded production batches and explicit game coverage
- [ ] Task: Run independent completeness review and remediate every Critical,
  High, and Medium finding
- [ ] Task: Obtain explicit product-owner acceptance of the corpus, ontology,
  variants, environment kits, gaps, and batch priorities
- [ ] Task: Measure - User Manual Verification 'Phase 5' (Protocol in workflow.md)
