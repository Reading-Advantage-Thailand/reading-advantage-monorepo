# Implementation Plan: APK Cartridge Rebuild, Integration, and Cutover

> **Track ID:** `apk_cartridge_semantic_rewrite_20260712`
> **Blocked by:** exact T10 accepted-manifest hashes, versioned shared developer kit, and
> accepted pinned canonical standard-asset pack release `2026.07.23`, catalog
> digest `ac801baee31d3b410050d03f8e9cb672940e3bf24a917df7233a7785f90a8087`, credit receipt,
> and selected-deployment contract required by each cohort

## Phase 0: Freeze readiness, architecture, and change control [checkpoint: pending]

- [ ] Task: Validate the T10 acceptance record and record accepted requirements, kit,
  canonical standard-pack version/catalog/credit receipt, selected-deployment contract,
  and host-domain versions
- [ ] Task: Define a machine-validatable readiness schema covering mechanics,
  capabilities, responsive profiles, canonical semantic assets, selected deployment
  outputs, hosts, and legacy disposition
- [ ] Task: Write Red readiness tests for missing/stale capabilities, assets,
  profiles, host adapters, evidence, or hashes
- [ ] Task: Define missing-capability and missing-asset change-control loops
- [ ] Task: Add architecture guards prohibiting Next/tRPC/auth/db/app imports in
  cartridges and direct business logic in host components/routes
- [ ] Task: BLOCKED — Measure - User Manual Verification 'Phase 0' (Protocol in workflow.md) — deferred:product-owner

## Phase 1: Build readiness matrix and cohorts [checkpoint: pending]

- [ ] Task: Map every game to blueprint, accepted capabilities, responsive
  declarations, semantic states, pinned canonical-pack version, selected deployment
  outputs, and host/domain requirements
- [ ] Task: Verify every Ready game's Must-have kit and canonical asset dependencies,
  including source/credit receipt and selected-output minimization
- [ ] Task: Record retained mechanic/learning evidence and rejected renderer assumptions
- [ ] Task: Publish `cartridge-readiness-matrix.md` with exact blockers
- [ ] Task: Group Ready games into cohorts of no more than five by meaningful reuse
- [ ] Task: Create one child Measure track per cohort with Red tests, blast radius,
  responsive/browser matrix, host targets, and legacy manifest
- [ ] Task: BLOCKED — Obtain product-owner acceptance of readiness and cohort order — deferred:product-owner
- [ ] Task: BLOCKED — Measure - User Manual Verification 'Phase 1' (Protocol in workflow.md) — deferred:product-owner

## Phase 2: Harden shared host and completion boundaries [checkpoint: pending]

- [ ] Task: Define or confirm Zod cartridge-host and completion adapter contracts
- [ ] Task: Inspect shared domain completion functions and tRPC routers before editing
- [ ] Task: Write Red domain/tRPC/route tests for auth, roles, school tenancy,
  authoritative XP, idempotency, malformed results, duplicates, and structured errors
- [ ] Task: Implement one transport-independent domain completion path and thin
  tRPC/Route Handler adapters appropriate to each host
- [ ] Task: Implement shared browser host adapter without app business logic
- [ ] Task: Prove Phaser and cartridges remain dynamically imported and client-only
- [ ] Task: BLOCKED — Measure - User Manual Verification 'Phase 2' (Protocol in workflow.md) — deferred:product-owner

## Phase 3: Execute cartridge cohort child tracks [checkpoint: pending]

- [ ] Task: Write deterministic Red tests from each game's mechanic blueprint
- [ ] Task: Scaffold each cartridge through the accepted APK authoring workflow
- [ ] Task: Compose shared session, input, gameplay, responsive, presentation,
  asset, diagnostic, and testing capabilities
- [ ] Task: Bind each cartridge only to the accepted pinned canonical asset catalog;
  route new external art through explicit product decision, canonical import, credit,
  and successor-pack acceptance
- [ ] Task: Keep bespoke mechanic rules in cartridge-owned modules with JSDoc and tests
- [ ] Task: Pause and route newly discovered shared capability or asset needs through change control
- [ ] Task: Run focused coverage, lint, type, graph, lifecycle, educational,
  canonical-pack/binding, selected-delivery, responsive, asset, performance, and
  browser gates per game
- [ ] Task: BLOCKED — Obtain explicit product-owner gameplay acceptance per child track — deferred:product-owner
- [ ] Task: BLOCKED — Measure - User Manual Verification 'Phase 3' (Protocol in workflow.md) — deferred:product-owner

## Phase 4: Verify compact/wide and readable gameplay [checkpoint: pending]

- [ ] Task: Run the same pinned canonical pack/binding manifests and selected
  derived deployment outputs at every required phone, tablet, and desktop viewport
- [ ] Task: Run real touch, pointer, keyboard, and supported hybrid input
- [ ] Task: Verify short/worst-case Thai and English content plus enlarged accessibility text
- [ ] Task: Verify HUD, prompts, feedback, controls, and text do not obscure protected gameplay
- [ ] Task: Verify wide layouts use available space and compact layouts are not shrunken desktops
- [ ] Task: Verify resize, orientation, fullscreen, pause, restart, and selected-output
  URL resolution preserve state and one-canvas/exactly-once completion
- [ ] Task: Record automated geometry and browser evidence per cartridge
- [ ] Task: BLOCKED — Measure - User Manual Verification 'Phase 4' (Protocol in workflow.md) — deferred:product-owner

## Phase 5: Cut over Reading and Primary incrementally [checkpoint: pending]

- [ ] Task: Add each accepted game to typed shared registries and host configuration
- [ ] Task: Mount the same cartridge package, pinned canonical pack version, and
  semantic binding manifests through Reading and Primary thin hosts
- [ ] Task: Connect completion through shared domain and appropriate tRPC/thin route adapters
- [ ] Task: Verify server-derived identity/school, authorization, idempotency,
  authoritative XP, persistence, errors, and audit/diagnostic metadata
- [ ] Task: Verify compact and wide host containers do not override cartridge composition
- [ ] Task: Run package/bundle guards proving no source/assets copy, no whole-pack
  default delivery, deterministic selected-output reconciliation, and no unrelated route inflation
- [ ] Task: Restore catalog/production exposure independently after both-host acceptance
- [ ] Task: BLOCKED — Measure - User Manual Verification 'Phase 5' (Protocol in workflow.md) — deferred:product-owner

## Phase 6: Retire exact legacy implementations [checkpoint: pending]

- [ ] Task: Publish `catalog-restoration-manifest.md` with replacement, contracts,
  kit/canonical-pack versions, binding manifests, selected outputs, routes, adapters,
  imported copies, and legacy files per game
- [ ] Task: Query graph callers for every legacy shared/exported symbol before deletion
- [ ] Task: Delete only replaced components, logic, routes, copied app-local assets,
  and obsolete tests after both hosts prove the same cartridge/binding manifest
- [ ] Task: Preserve still-used shared files with explicit owners and remaining callers
- [ ] Task: Update graph and add guards against copied code/assets, direct legacy asset
  URLs, uncredited canonical assets, whole-pack default delivery, and legacy renderers
- [ ] Task: Prove blocked games remain truthful and non-playable
- [ ] Task: BLOCKED — Measure - User Manual Verification 'Phase 6' (Protocol in workflow.md) — deferred:product-owner

## Phase 7: Program verification and closeout [checkpoint: pending]

- [ ] Task: Run the complete accepted game/canonical-pack/binding/profile/input/content/host matrix
- [ ] Task: Run root and affected Turbo lint, check-types, test, coverage, build,
  graph audit/update, generated docs, Measure doctor, package-boundary, migration,
  tenant, no-fallback, lifecycle, persistence, performance, and bundle gates
- [ ] Task: Use real browser input to verify QC, Reading, and Primary flows through
  play, feedback, completion, persistence, replay, navigation, resize, canonical
  asset resolution, selected-output delivery, and attribution inspection
- [ ] Task: Compare final developer workflow against the predecessor baseline
- [ ] Task: Run independent review and remediate every Critical, High, and Medium finding
- [ ] Task: Reconcile registry, child tracks, readiness, canonical-pack versions,
  source/credit receipts, selected outputs, host registries, completion contracts,
  and legacy manifest with repository reality
- [ ] Task: BLOCKED — Obtain explicit product-owner acceptance — deferred:product-owner
- [ ] Task: BLOCKED — Measure - User Manual Verification 'Phase 7' (Protocol in workflow.md) — deferred:product-owner
