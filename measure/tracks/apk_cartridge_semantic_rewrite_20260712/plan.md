# Implementation Plan: APK Cartridge Rebuild, Integration, and Cutover

> **Track ID:** `apk_cartridge_semantic_rewrite_20260712`
> **Blocked by:** exact T10 accepted-manifest hashes, versioned shared developer kit, and
> accepted pinned canonical standard-asset pack release `2026.07.23`, catalog
> digest `ac801baee31d3b410050d03f8e9cb672940e3bf24a917df7233a7785f90a8087`, credit receipt,
> and selected-deployment contract required by each cohort

## Phase 0: Freeze readiness, architecture, and change control [checkpoint: pending]

- [b] Task: Validate the T10 acceptance record and record accepted requirements, kit, — deferred:apk_shared_developer_kit_20260712
  canonical standard-pack version/catalog/credit receipt, selected-deployment contract,
  and host-domain versions
- [b] Task: Define a machine-validatable readiness schema covering mechanics, — deferred:apk_shared_developer_kit_20260712
  capabilities, responsive profiles, canonical semantic assets, selected deployment
  outputs, hosts, and legacy disposition
- [b] Task: Write Red readiness tests for missing/stale capabilities, assets, — deferred:apk_shared_developer_kit_20260712
  profiles, host adapters, evidence, or hashes
- [b] Task: Define missing-capability and missing-asset change-control loops — deferred:apk_shared_developer_kit_20260712
- [b] Task: Add architecture guards prohibiting Next/tRPC/auth/db/app imports in — deferred:apk_shared_developer_kit_20260712
  cartridges and direct business logic in host components/routes
- [b] Task: BLOCKED — Measure - User Manual Verification 'Phase 0' (Protocol in workflow.md) — deferred:product-owner

## Phase 1: Build readiness matrix and cohorts [checkpoint: pending]

- [b] Task: Map every game to blueprint, accepted capabilities, responsive — deferred:apk_shared_developer_kit_20260712
  declarations, semantic states, pinned canonical-pack version, selected deployment
  outputs, and host/domain requirements
- [b] Task: Verify every Ready game's Must-have kit and canonical asset dependencies, — deferred:apk_shared_developer_kit_20260712
  including source/credit receipt and selected-output minimization
- [b] Task: Record retained mechanic/learning evidence and rejected renderer assumptions — deferred:apk_shared_developer_kit_20260712
- [b] Task: Publish `cartridge-readiness-matrix.md` with exact blockers — deferred:apk_shared_developer_kit_20260712
- [b] Task: Group Ready games into cohorts of no more than five by meaningful reuse — deferred:apk_shared_developer_kit_20260712
- [b] Task: Create one child Measure track per cohort with Red tests, blast radius, — deferred:apk_shared_developer_kit_20260712
  responsive/browser matrix, host targets, and legacy manifest
- [b] Task: BLOCKED — Obtain product-owner acceptance of readiness and cohort order — deferred:product-owner
- [b] Task: BLOCKED — Measure - User Manual Verification 'Phase 1' (Protocol in workflow.md) — deferred:product-owner

## Phase 2: Harden shared host and completion boundaries [checkpoint: pending]

- [b] Task: Define or confirm Zod cartridge-host and completion adapter contracts — deferred:apk_shared_developer_kit_20260712
- [b] Task: Inspect shared domain completion functions and tRPC routers before editing — deferred:apk_shared_developer_kit_20260712
- [b] Task: Write Red domain/tRPC/route tests for auth, roles, school tenancy, — deferred:apk_shared_developer_kit_20260712
  authoritative XP, idempotency, malformed results, duplicates, and structured errors
- [b] Task: Implement one transport-independent domain completion path and thin — deferred:apk_shared_developer_kit_20260712
  tRPC/Route Handler adapters appropriate to each host
- [b] Task: Implement shared browser host adapter without app business logic — deferred:apk_shared_developer_kit_20260712
- [b] Task: Prove Phaser and cartridges remain dynamically imported and client-only — deferred:apk_shared_developer_kit_20260712
- [b] Task: BLOCKED — Measure - User Manual Verification 'Phase 2' (Protocol in workflow.md) — deferred:product-owner

## Phase 3: Execute cartridge cohort child tracks [checkpoint: pending]

- [b] Task: Write deterministic Red tests from each game's mechanic blueprint — deferred:apk_shared_developer_kit_20260712
- [b] Task: Scaffold each cartridge through the accepted APK authoring workflow — deferred:apk_shared_developer_kit_20260712
- [b] Task: Compose shared session, input, gameplay, responsive, presentation, — deferred:apk_shared_developer_kit_20260712
  asset, diagnostic, and testing capabilities
- [b] Task: Bind each cartridge only to the accepted pinned canonical asset catalog; — deferred:apk_shared_developer_kit_20260712
  route new external art through explicit product decision, canonical import, credit,
  and successor-pack acceptance
- [b] Task: Keep bespoke mechanic rules in cartridge-owned modules with JSDoc and tests — deferred:apk_shared_developer_kit_20260712
- [b] Task: Pause and route newly discovered shared capability or asset needs through change control — deferred:apk_shared_developer_kit_20260712
- [b] Task: Run focused coverage, lint, type, graph, lifecycle, educational, — deferred:apk_shared_developer_kit_20260712
  canonical-pack/binding, selected-delivery, responsive, asset, performance, and
  browser gates per game
- [b] Task: BLOCKED — Obtain explicit product-owner gameplay acceptance per child track — deferred:product-owner
- [b] Task: BLOCKED — Measure - User Manual Verification 'Phase 3' (Protocol in workflow.md) — deferred:product-owner

## Phase 4: Verify compact/wide and readable gameplay [checkpoint: pending]

- [b] Task: Run the same pinned canonical pack/binding manifests and selected — deferred:apk_shared_developer_kit_20260712
  derived deployment outputs at every required phone, tablet, and desktop viewport
- [b] Task: Run real touch, pointer, keyboard, and supported hybrid input — deferred:apk_shared_developer_kit_20260712
- [b] Task: Verify short/worst-case Thai and English content plus enlarged accessibility text — deferred:apk_shared_developer_kit_20260712
- [b] Task: Verify HUD, prompts, feedback, controls, and text do not obscure protected gameplay — deferred:apk_shared_developer_kit_20260712
- [b] Task: Verify wide layouts use available space and compact layouts are not shrunken desktops — deferred:apk_shared_developer_kit_20260712
- [b] Task: Verify resize, orientation, fullscreen, pause, restart, and selected-output — deferred:apk_shared_developer_kit_20260712
  URL resolution preserve state and one-canvas/exactly-once completion
- [b] Task: Record automated geometry and browser evidence per cartridge — deferred:apk_shared_developer_kit_20260712
- [b] Task: BLOCKED — Measure - User Manual Verification 'Phase 4' (Protocol in workflow.md) — deferred:product-owner

## Phase 5: Cut over Reading and Primary incrementally [checkpoint: pending]

- [b] Task: Add each accepted game to typed shared registries and host configuration — deferred:apk_shared_developer_kit_20260712
- [b] Task: Mount the same cartridge package, pinned canonical pack version, and — deferred:apk_shared_developer_kit_20260712
  semantic binding manifests through Reading and Primary thin hosts
- [b] Task: Connect completion through shared domain and appropriate tRPC/thin route adapters — deferred:apk_shared_developer_kit_20260712
- [b] Task: Verify server-derived identity/school, authorization, idempotency, — deferred:apk_shared_developer_kit_20260712
  authoritative XP, persistence, errors, and audit/diagnostic metadata
- [b] Task: Verify compact and wide host containers do not override cartridge composition — deferred:apk_shared_developer_kit_20260712
- [b] Task: Run package/bundle guards proving no source/assets copy, no whole-pack — deferred:apk_shared_developer_kit_20260712
  default delivery, deterministic selected-output reconciliation, and no unrelated route inflation
- [b] Task: Restore catalog/production exposure independently after both-host acceptance — deferred:apk_shared_developer_kit_20260712
- [b] Task: BLOCKED — Measure - User Manual Verification 'Phase 5' (Protocol in workflow.md) — deferred:product-owner

## Phase 6: Retire exact legacy implementations [checkpoint: pending]

- [b] Task: Publish `catalog-restoration-manifest.md` with replacement, contracts, — deferred:apk_shared_developer_kit_20260712
  kit/canonical-pack versions, binding manifests, selected outputs, routes, adapters,
  imported copies, and legacy files per game
- [b] Task: Query graph callers for every legacy shared/exported symbol before deletion — deferred:apk_shared_developer_kit_20260712
- [b] Task: Delete only replaced components, logic, routes, copied app-local assets, — deferred:apk_shared_developer_kit_20260712
  and obsolete tests after both hosts prove the same cartridge/binding manifest
- [b] Task: Preserve still-used shared files with explicit owners and remaining callers — deferred:apk_shared_developer_kit_20260712
- [b] Task: Update graph and add guards against copied code/assets, direct legacy asset — deferred:apk_shared_developer_kit_20260712
  URLs, uncredited canonical assets, whole-pack default delivery, and legacy renderers
- [b] Task: Prove blocked games remain truthful and non-playable — deferred:apk_shared_developer_kit_20260712
- [b] Task: BLOCKED — Measure - User Manual Verification 'Phase 6' (Protocol in workflow.md) — deferred:product-owner

## Phase 7: Program verification and closeout [checkpoint: pending]

- [b] Task: Run the complete accepted game/canonical-pack/binding/profile/input/content/host matrix — deferred:apk_shared_developer_kit_20260712
- [b] Task: Run root and affected Turbo lint, check-types, test, coverage, build, — deferred:apk_shared_developer_kit_20260712
  graph audit/update, generated docs, Measure doctor, package-boundary, migration,
  tenant, no-fallback, lifecycle, persistence, performance, and bundle gates
- [b] Task: Use real browser input to verify QC, Reading, and Primary flows through — deferred:apk_shared_developer_kit_20260712
  play, feedback, completion, persistence, replay, navigation, resize, canonical
  asset resolution, selected-output delivery, and attribution inspection
- [b] Task: Compare final developer workflow against the predecessor baseline — deferred:apk_shared_developer_kit_20260712
- [b] Task: Run independent review and remediate every Critical, High, and Medium finding — deferred:apk_shared_developer_kit_20260712
- [b] Task: Reconcile registry, child tracks, readiness, canonical-pack versions, — deferred:apk_shared_developer_kit_20260712
  source/credit receipts, selected outputs, host registries, completion contracts,
  and legacy manifest with repository reality
- [b] Task: BLOCKED — Obtain explicit product-owner acceptance — deferred:product-owner
- [b] Task: BLOCKED — Measure - User Manual Verification 'Phase 7' (Protocol in workflow.md) — deferred:product-owner
