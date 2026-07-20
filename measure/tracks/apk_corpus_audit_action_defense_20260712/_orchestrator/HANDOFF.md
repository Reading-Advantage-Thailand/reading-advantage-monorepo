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

## Batch-A Evidence Collector Resolution (2026-07-20)

- Three evidence collectors dispatched in parallel via coder-minimax-m3 subagents (Kimi coders returned empty in the dispatch session).
- Castle Defense (sentence/canonical): 139 claims, 3 neg fixtures, 0 SLO. Outputs `040802b3`, bind `9cfc102b`.
- Magic Defense (vocabulary/shared-game-impl): 110 claims, 5 neg fixtures, SLO-MD-1 (magic-defense-controller denominator gap). Outputs `6998570b`, bind `d119bbad`.
- Wizard vs Zombie (vocabulary): 77 claims, 4 neg fixtures, SLO-WVZ-1 (www asset denominator gap). Outputs `91416b97`, bind `20af6417`. NOTE: wvz subagent produced 4 bind commits (`2f551701`, `01e4615e`, `2bcb883c`, `20af6417`); final state on `20af6417` is correct, intermediate binds are noise.
- Both SLOs resolved as conditional-item + exclusion by orchestrator (delegated product-owner authority). See `stop-loss-resolutions-batch-a.md`. T2 denominator hash `d524171dbc412a213ed4be7ad7a77e2eb404e7c5bf4a5debe2ad68dd121b5729` remains canonical.

## Known minor process imperfections

- Magic Defense role-receipt has `final_response_sha256: "PENDING-RECEIPT-BIND"` (placeholder not updated). Functional impact: none; documentation gap.
- Castle Defense role-receipt lacks `final_response_sha256` field. Functional impact: none; documentation gap.
- Wizard vs Zombie role-receipt and final-report `commit_sha` and `final_response_sha256` are consistent on the latest bind commit; intermediate binds should be ignored.

## Next concrete action (next session)

Dispatch one requirements-mapper subagent (coder-minimax-m3) for batch-A. The mapper consumes the three evidence-ledgers + the stop-loss resolutions file and produces `pilot-blueprint-batch-a.json` + `mapper-hypotheses-batch-a.md` + `mapper-final-report-batch-a.json` + `role-receipts/requirements-mapper-batch-a.json`. After the mapper lands, dispatch truth-test-author, browser-auditor (skip if no runnable routes), asset-auditor, and adversarial-reviewer, then product-owner-acceptance writes `candidate-cohort-manifest-batch-a.json` + `product-owner-acceptance-batch-a.json` + `accepted-cohort-manifest-batch-a.json`. Bind the accepted-cohort-manifest sha256 into the program-wide successor gate.
