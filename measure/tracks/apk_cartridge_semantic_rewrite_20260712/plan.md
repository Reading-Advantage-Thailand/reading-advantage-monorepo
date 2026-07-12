# Implementation Plan: APK Cartridge Semantic Rewrite and Integration

> **Track ID:** `apk_cartridge_semantic_rewrite_20260712`
> **Blocked by:** accepted ontology and validated dual-theme asset batches

## Phase 0: Freeze readiness and change control [checkpoint: pending]

- [ ] Task: Record accepted predecessor artifact versions and reject stale or
  unaccepted ontology/pack inputs
- [ ] Task: Define a machine-validatable readiness schema covering game status,
  educational ABI, mechanics, semantic asset/state requirements, both-theme
  availability, runtime capabilities, and blockers
- [ ] Task: Write failing tests proving a game cannot become Ready with missing
  Must-have semantics, missing theme parity, unresolved requirements, or stale hashes
- [ ] Task: Define the missing-requirement change-control path back through the
  usage matrix, ontology review, physical contract, and paired asset production
- [ ] Task: Measure - User Manual Verification 'Phase 0' (Protocol in workflow.md)

## Phase 1: Build the cartridge readiness matrix [checkpoint: pending]

- [ ] Task: Map every accepted game to its semantic asset IDs/states and shared
  runtime capabilities using the scene-level usage matrix
- [ ] Task: Verify each mapped physical asset/state exists and validates in both themes
- [ ] Task: Record the retained mechanic/learning evidence and the legacy renderer,
  filename, route, and asset assumptions that must not be carried forward
- [ ] Task: Publish `cartridge-readiness-matrix.md` with Ready/Blocked reasons for
  every in-scope game
- [ ] Task: Obtain product-owner acceptance of the initial Ready set
- [ ] Task: Measure - User Manual Verification 'Phase 1' (Protocol in workflow.md)

## Phase 2: Define bounded rewrite cohorts [checkpoint: pending]

- [ ] Task: Group Ready games by shared mechanics, controls, camera, runtime
  primitives, and asset capabilities without erasing product identity
- [ ] Task: Limit each cohort to at most five exact game IDs and ensure every
  member's Must-have assets exist before opening implementation
- [ ] Task: Create one child Measure track per cohort with Red tests, exact source
  baselines, semantic requirements, package blast radius, and browser matrix
- [ ] Task: Publish `rewrite-cohorts.md` with dependency order and child-track links
- [ ] Task: Measure - User Manual Verification 'Phase 2' (Protocol in workflow.md)

## Phase 3: Harden shared semantic runtime seams [checkpoint: pending]

- [ ] Task: Write Red tests for semantic resolution, physical-load deduplication,
  state registration, missing-role failures, theme parity, and safe lifecycle cleanup
- [ ] Task: Retain or revise the existing physical manifest/loader only where it
  implements the accepted type contracts and readiness requirements
- [ ] Task: Implement cartridge-facing helpers that resolve semantic roles/states
  without exposing theme paths or requiring cartridge-owned asset mapping logic
- [ ] Task: Prove semantic runtime changes preserve the stable educational input,
  result, host, completion, persistence, and one-canvas contracts
- [ ] Task: Measure - User Manual Verification 'Phase 3' (Protocol in workflow.md)

## Phase 4: Execute cohort child tracks [checkpoint: pending]

- [ ] Task: For each cohort, recover mechanic/learning behavior from accepted
  source evidence and rewrite against the semantic runtime
- [ ] Task: Keep cartridge scenes thin and reuse tested family systems while
  preserving each game's distinct controls, progression, and terminal loop
- [ ] Task: Pause and route any newly discovered asset need through formal change control
- [ ] Task: Run per-game tests and Kimi verification in both themes at desktop
  and 390x844 before accepting a child track
- [ ] Task: Keep the readiness and cohort documents synchronized with accepted
  child-track commits and verification evidence
- [ ] Task: Measure - User Manual Verification 'Phase 4' (Protocol in workflow.md)

## Phase 5: Restore catalog and production routes incrementally [checkpoint: pending]

- [ ] Task: Restore each accepted game independently; do not perform a bulk
  playable-status or route restoration
- [ ] Task: Prove the generic authenticated host, server-owned completion,
  restart/theme-switch lifecycle, and exact one-canvas behavior per restored game
- [ ] Task: Update `catalog-restoration-manifest.md` with replacement cartridge,
  semantic assets, both-theme evidence, route ownership, and legacy disposition
- [ ] Task: Confirm blocked/unresolved games remain non-playable and are not
  silently redirected or mapped to another cartridge
- [ ] Task: Measure - User Manual Verification 'Phase 5' (Protocol in workflow.md)

## Phase 6: Program verification and closeout [checkpoint: pending]

- [ ] Task: Run the complete accepted game/theme/desktop/mobile interaction matrix
- [ ] Task: Run scoped coverage, lint, type-check, build, graph, package-boundary,
  no-fallback, lifecycle, educational ABI, and persistence gates
- [ ] Task: Use Kimi WebBridge to verify all restored games through real input,
  feedback, completion, replay, navigation, and theme changes
- [ ] Task: Run independent review and remediate every Critical, High, and Medium finding
- [ ] Task: Reconcile the registry, readiness matrix, cohort tracks, asset pack
  versions, and catalog restoration manifest with repository reality
- [ ] Task: Obtain explicit product-owner acceptance
- [ ] Task: Measure - User Manual Verification 'Phase 6' (Protocol in workflow.md)
