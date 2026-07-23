# Spellweaver's Run — Evidence Collection Method

Collector role: `evidence-collector-spellweavers-run:t5:2026-07-20`  
Track: `apk_corpus_audit_traversal_exploration_20260712`  
Phase: `Phase 1: Batch A`  
Phase base: `52e48970bc9c4b585c55b53072ebebe466a1c4f4`  
Role base: `aef2a5a0da9c4a687295af0fc841c5e8e09180f0`

## Method

1. Read the Phase 0 strategy and records, track specification and plan, reconstruction program, and cohort protocol before source inspection.
2. Used the accepted T2 source baseline `23bb5ad578c01fb29f9e8bb76a7d934d24a4b286`. Recomputed citations from reachable Git objects with `git show <revision>:<path>` rather than from deleted working-tree paths.
3. Separated three temporal scopes: role-base catalog facts at `aef2a5a0…`; deleted legacy React/Konva facts at `4106ba39…`; and deleted cartridge facts at `1a21fb95…`. Historical facts are never represented as current behavior.
4. Computed every cited-range SHA-256 from the cited lines, each terminated by `\n`, and every blob SHA-256 from exact Git-object bytes.
5. Kept each source fact separate from its interpretation. Movement records describe only orb position changes and lane selection; they do not infer an avatar, camera, obstacles, hazards, or a generic runner family.
6. Did not run a browser, inspect screenshots as behavior proof, or infer trusted input. Runtime, movement, profile-transition, console, and network observations are unavailable.

## Denominator reconciliation

The accepted T2 records associated with `spellweaver` reconcile as follows:

| denominator | records | disposition |
|---|---:|---|
| identity ledger | 1 | `catalog/spellweavers-run`; accepted |
| source denominator | 9 | all nine are Measure archive/compliance files at the T2 baseline |
| scene/state denominator | 0 | no current scene/state record at the T2 baseline |
| asset-file denominator | 6 | two sidecar files, one compliance metadata file, cover PNG, gameplay PNG, and action MP3 |
| historical-source denominator | 17 | seven deleted cartridge files and ten deleted legacy implementation/route/test files |
| phase-3 selected records | 66 | 6 asset + 34 discrepancy + 9 file + 6 hash-group + 1 identity + 1 replacement-program + 9 source records; all `matched`, zero blocking |

This is not a denominator amendment. The retained baseline E2E test is recorded as test intent only; it does not restore a current route or prove a browser transition.

## Exact evidence boundaries

- **Current:** role-base `gameCards.ts` places the game in `unroutableGameIds`; exported cards in that set receive `href: undefined` and `status: "coming-soon"`.
- **Legacy historical:** exact logic defines three lanes, downward orb motion, a bounded collection zone, ordered-word transitions, mana, fixed 390×600 logical geometry, ResizeObserver scaling, pointer/touch lane projection, and keyboard lane bindings.
- **Withdrawn cartridge historical:** exact files define a 960×540 three-lane surface, one scrolling orb, bounded collection input, semantic slots, and normalized pointer regions. These are historical facts only.
- **Assets:** the cover has a current catalog binding. The gameplay PNG and action MP3 are denominator candidates; source-backed gameplay/audio use is unavailable. The historical legacy renderer uses Konva primitives for the orb and HUD.

## Fixtures

- `SW-NEG-001` rejects title-based inference of avatar movement, camera follow, obstacles, and hazards.
- `SW-NEG-002` rejects archived prose/screenshots as proof of current responsive transitions.
- `SW-NEG-003` rejects slug-only assignment of every named PNG/MP3 to runtime use.

## Stop-loss and budget

- Unsupported accepted factual claims: `0`.
- Denominator mismatches: `0`.
- Browser claims authored: `0`.
- Negative fixtures: `3`, all expected `REJECT`.
- Unique evidence bytes inspected: `11,558,850` across `19` unique evidence objects. This exceeds the frozen per-game collector ceiling of `8,000,000` bytes.
- Elapsed minutes and provider/session provenance are unavailable from this harness and are not fabricated.

The budget breach and unavailable elapsed measurement make this package **non-authoritative and blocked pending orchestrator disposition**, even though citation validation can pass. No acceptance is claimed.
