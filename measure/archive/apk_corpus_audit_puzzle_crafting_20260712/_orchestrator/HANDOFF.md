# Orchestrator Handoff Summary — T2 → T11 APK Program

## Predecessor status (closed)
- **T1 — APK Evidence Integrity Gates**: ACCEPTED (`measure/evidence-integrity-accepted-gate.json`, gate_version `phase4-v8-candidate`, gate_commit `5aea360f`).
- **T2 — APK Independent Source Denominator Inventory**: ACCEPTED and ARCHIVED (`measure/archive/apk_source_denominator_inventory_20260712/`).
  - accepted-denominator-manifest sha256: `d524171dbc412a213ed4be7ad7a77e2eb404e7c5bf4a5debe2ad68dd121b5729`
  - accepted-partition-manifest sha256: `6badf73b625567b3fc6d4558c52ab68bd0e4fe2fb3afe3792aca4126df2d27b0`
- **T3 — APK Three-Game Source-Truth Pilot**: ACCEPTED (CONDITIONAL) and ARCHIVED (`measure/archive/apk_three_game_truth_pilot_20260712/`).
  - accepted-pilot-manifest sha256: `cbf04753aa21b0c43999ea202b718573616472a16dce94961242fdcb0260ca1b`
  - pilot review: 15/15 claim re-derivations exact, 8/8 negative fixtures supported, 41/41 truth tests pass.
  - Conditional open items: Phase 3 (browser), Phase 4 (asset) — documented in `pilot-independent-review.json` and `product-owner-acceptance.json`.

## Source of truth for the rest
- `measure/apk-evidence-reconstruction-program.md` — full program rules, mandatory role contract, claim-evidence ledger format, stop-loss, gates.
- `measure/apk-asset-system-program.md` — capability domains, asset modeling rules, completion criteria.
- `measure/archive/apk_source_denominator_inventory_20260712/accepted-{denominator,partition}-manifest.json` — the gate hashes every T4+ must bind.
- `measure/archive/apk_three_game_truth_pilot_20260712/accepted-pilot-manifest.json` — the pilot-acceptance hash every T4+ must additionally bind.

## Per-track dispatch templates
Each `measure/tracks/<T_track>/_orchestrator/DISPATCH.md` is the orchestrator-facing dispatch template for that track, listing:
- The predecessor hashes (T2 accepted, T3 accepted pilot).
- The exact games in the cohort with stop-loss batching.
- The role-separation contract.
- The orchestrator dispatch sequence (5–10 steps per batch).
- A phase plan template.
- References to existing role prompt templates in `measure/archive/apk_three_game_truth_pilot_20260712/role-receipts/`.

## Successor dependency graph
```
T4 (Action/defense) ─┐
T5 (Traversal)       ├─→ T8 (Asset forensics) ─→ T9 (Ontology synthesis) ─→ T10 (Independent acceptance & handoff) ─→ T11 (Shared developer kit)
T6 (Puzzle/Crafting) ┤
T7 (Special/Hist.)   ┘
```
T4–T7 may run in parallel after T3 acceptance (already conditional). T8 starts after T4–T7 accepted. T9 requires T2–T8 hashes. T10 publishes successor hashes that unlock T11.

## How to resume from this state
1. Open a fresh session.
2. Read `measure/tracks.md` to see the current state — T2 and T3 are closed.
3. Read the `_orchestrator/DISPATCH.md` of the next track (T4 if starting corpus work, or any other track depending on priority).
4. Spawn evidence collectors in batches of 3 games (stop-loss rule).
5. Bind each batch's accepted cohort manifest hash into the successor chain.
6. After T4–T7 all accepted, proceed to T8 then T9 then T10 then T11.

## Hands-on guidance for fresh-session execution
- Each role MUST have `fresh-context-only` / `inherited_narrative=false` / `fork_turns=none` in role receipts.
- Subagents must compute their own SHA-256 of prompts and inputs (no inherited prose).
- Every claim must resolve to an exact citation (`{path, range.sha256, blob_sha256, revision}`); the cite-then-hash discipline is non-negotiable.
- The orchestrator (root coordinator) holds `forbidden_roles: [discovery-auditor, evidence-collector, requirements-mapper, truth-test-author, adversarial-reviewer]` per `phase0-role-ownership-manifest.json`.
- The orchestrator (under delegated product-owner authority) is the ONLY role that may write `product-owner-acceptance.json` and `accepted-*manifest.json`.
- Each track must close by moving its directory to `measure/archive/` and flipping its `metadata.json.status` to `done`.
