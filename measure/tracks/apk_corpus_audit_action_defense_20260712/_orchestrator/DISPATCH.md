# T4 — APK Action & Defense Evidence Cohort — Orchestrator Dispatch

## Predecessor binding (mandatory)
- T2 accepted denominator manifest sha256: `d524171dbc412a213ed4be7ad7a77e2eb404e7c5bf4a5debe2ad68dd121b5729`
- T2 accepted partition manifest sha256: `6badf73b625567b3fc6d4558c52ab68bd0e4fe2fb3afe3792aca4126df2d27b0`
- T3 accepted pilot manifest sha256: `cbf04753aa21b0c43999ea202b718573616472a16dce94961242fdcb0260ca1b`
- Source baseline revision: `23bb5ad578c01fb29f9e8bb76a7d934d24a4b286`

## Cohort games (8) per `measure/apk-evidence-reconstruction-program.md`
- Castle Defense — `vocabulary/castle-defense` (current) + `sentence/castle-defense` (alias)
- Magic Defense — `vocabulary/magic-defense`
- Wizard vs Zombie — `vocabulary/wizard-vs-zombie`
- Village Guardian — `sentence/village-guardian`
- Archer's Revenge — `vocabulary/archers-revenge` (historical/withdrawn)
- Storm the Castle Tower — `sentence/storm-castle-tower` (historical/withdrawn)
- Paladin's Twin-Soul — `vocabulary/paladins-twin-soul` (historical/withdrawn)
- Gryphon Patrol — `sentence/gryphon-patrol` (historical/withdrawn)

## Stop-loss: max 3 games per evidence batch
Process in three batches:
- Batch A: Castle Defense, Magic Defense, Wizard vs Zombie (3 current)
- Batch B: Village Guardian, Storm the Castle Tower, Paladin's Twin-Soul (1 current + 2 historical)
- Batch C: Archer's Revenge, Gryphon Patrol (1 historical + 1 historical)

After each batch: validate, then proceed.

## Role-separation contract (per `phase0-role-ownership-manifest.json` style)
Each game requires:
1. **evidence-collector** — fresh-context-only, fork_turns=none, parent_ancestry_ids=[]
2. **requirements-mapper** — fresh-context-only
3. **truth-test-author** — fresh-context-only (writes truth tests for the game)
4. **browser-auditor** — fresh-context-only (only for current/runnable routes)
5. **asset-auditor** — fresh-context-only (per-candidate records)
6. **adversarial-reviewer** — fresh-context-only, fork_turns=none — the *fifth* gate

## Orchestrator dispatch sequence (per batch)
1. Read T2 accepted artifacts (denominator, partition).
2. Read T3 accepted-pilot-manifest.
3. For each game in batch: dispatch ONE evidence-collector subagent.
   - Prompt template: same shape as `apk_three_game_truth_pilot_20260712` evidence collectors.
   - Differences: switch game identity, dispose of allowance for current/historical.
4. After all evidence collectors land, dispatch ONE requirements-mapper.
5. Dispatch ONE truth-test-author for the batch.
6. Dispatch ONE browser-auditor for current games only (skip historical).
7. Dispatch ONE asset-auditor for the batch.
8. Dispatch ONE adversarial-reviewer for the batch (fork_turns=none, fresh-context).
9. Orchestrator (delegated product-owner authority): write candidate-cohort-manifest, product-owner-acceptance.json, accepted-cohort-manifest.json.
10. Bind accepted-cohort manifest hash into the program-wide successor gate.

## Phase plan template (use as the track plan.md)
```md
## Phase 0: Freeze batch and resources
- [x] Verify T2 accepted hashes; bind T3 accepted pilot sha256 to this track
- [x] Confirm 3-game batch identity
- [~] Spawn distinct roles; record isolated prompts
- [~] Set budget and stop-loss
- [b] User manual verification (deferred:product-owner)

## Phase 1: Exact evidence collection (3 parallel collectors)
- [~] Batch-A game 1
- [~] Batch-A game 2
- [~] Batch-A game 3
- [~] Negative fixtures and unsupported-claim injection
- [b] User manual verification

## Phase 2: Mapping
- [~] Requirements mapper (one subagent, fresh-context)
- [b] User manual verification

## Phase 3: Responsive + browser truth (current games only)
- [~] Browser auditor
- [b] User manual verification

## Phase 4: Asset audit
- [~] Asset auditor
- [b] User manual verification

## Phase 5: Acceptance
- [~] Truth tests
- [~] Adversarial reviewer (fork_turns=none)
- [~] Candidate cohort manifest
- [b] Product-owner acceptance
- [b] Accepted cohort manifest
- [b] User manual verification
```

## Role prompt templates
Three templates are already executed in `measure/archive/apk_three_game_truth_pilot_20260712/`:
- evidence-collector prompt pattern (per game, e.g., dragon-flight)
- requirements-mapper prompt pattern
- truth-test-author prompt pattern
- adversarial-reviewer prompt pattern
- (asset-auditor and browser-auditor templates pending first successful run)

Each prompt MUST:
- declare the specific game identity (vocabulary/X or sentence/X)
- require `apk-role-receipt.v1` with `reviewer_isolation: fresh-context-only, inherited_narrative=false, fork_turns=none`
- require `parent_ancestry_ids: []`
- declare the truth-test schema and the stop-loss counters
- bind to T2 hashes via `t2_accepted_denominator_sha256` and `t2_accepted_partition_sha256`
- bind to T3 hash via `t3_accepted_pilot_sha256`
- include the source baseline revision `23bb5ad578c01fb29f9e8bb76a7d934d24a4b286`
- include SHA-256 recomputation instructions for cited ranges

## Orchestrator handoff (when this session pauses)
Before pausing, the orchestrator must:
1. Commit any unsaved cohort artifacts with the existing per-track prefix.
2. Push HEAD with commit title containing `track_id: apk_corpus_audit_action_defense_20260712`.
3. Update `measure/tracks.md` registry line for T4 to reflect actual state.
4. Document in `_orchestrator/LAST-BATCH-STATUS.md` which batches are complete and which are next.

## Success criterion per cohort
- All batch claims resolve to exact source/range hashes.
- All negative fixtures have backed expected_disposition.
- Adversarial review re-derives 5 claims per game with sha-exact match.
- Truth tests (one module per batch) show 100% pass.
- Browser audit (where applicable) lists real-input evidence.
- Asset audit (where applicable) lists one record per denominator path.
- Product-owner acceptance + accepted cohort manifest published.
- Successor hash bound into the program-wide gate for downstream T11 dependency.
