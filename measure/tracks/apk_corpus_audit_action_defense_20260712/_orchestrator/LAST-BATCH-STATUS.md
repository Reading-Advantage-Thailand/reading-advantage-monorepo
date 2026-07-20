# T4 Action and Defense Evidence Cohort — Last Batch Status

## Batch A — Phase 1 → Phase 4 (Castle Defense, Magic Defense, Wizard vs Zombie)

- **Phase base SHA (immutable, captured after strategy commit)**: `642939602f44a939b6fb610394351d4a70f83ce0`
- **Strategy commit**: `642939602f44a939b6fb610394351d4a70f83ce0` — `chore(measure): t4 batch-a test strategy (track_id: apk_corpus_audit_action_defense_20260712)`
- **Strategy file**: `measure/tracks/apk_corpus_audit_action_defense_20260712/test-strategy-batch-a.md` (472 lines)
- **Status**: Strategy committed. Ready to dispatch requirements-mapper for Batch A.
- **Predecessor binding** (every role receipt must include):
  - T1 evidence integrity gate: `phase4-v8-candidate` (`5aea360f`)
  - T2 accepted denominator manifest sha256: `d524171dbc412a213ed4be7ad7a77e2eb404e7c5bf4a5debe2ad68dd121b5729`
  - T2 accepted partition manifest sha256: `6badf73b625567b3fc6d4558c52ab68bd0e4fe2fb3afe3792aca4126df2d27b0`
  - T3 accepted pilot manifest sha256: `cbf04753aa21b0c43999ea202b718573616472a16dce94961242fdcb0260ca1b`
  - Source baseline revision: `23bb5ad578c01fb29f9e8bb76a7d934d24a4b286`
  - Phase base SHA: `642939602f44a939b6fb610394351d4a70f83ce0` ← BIND THIS INTO EVERY ROLE RECEIPT

## Next concrete action (next dispatch)

Dispatch one requirements-mapper subagent (`coder-minimax-m3`, fresh-context-only,
`fork_turns=none`, `parent_ancestry_ids=[]`) for Batch A.

The mapper consumes:
- `castle-defense-claim-ledger.json` (139 claims, 3 neg fixtures)
- `magic-defense-claim-ledger.json` (110 claims, 5 neg fixtures)
- `wizard-vs-zombie-claim-ledger.json` (77 claims, 4 neg fixtures)
- `stop-loss-resolutions-batch-a.md` (SLO-MD-1, SLO-WVZ-1)

The mapper produces:
- `batch-a-blueprint.json` — scene/state/transition/mechanic blueprint
- `mapper-hypotheses-batch-a.md` — NON-AUTHORITATIVE HYPOTHESES only
- `mapper-final-report-batch-a.json`
- `role-receipts/requirements-mapper-batch-a.json`

After mapper, dispatch (per `_orchestrator/DISPATCH.md`):
1. truth-test-author
2. browser-auditor (current games: all three)
3. asset-auditor (per-path records)
4. adversarial-reviewer (`fork_turns=none`, 15+ claim re-derivations, 12 fixture re-derivations)
5. Orchestrator (delegated product-owner authority): candidate-cohort-manifest-batch-a.json, product-owner-acceptance-batch-a.json, accepted-cohort-manifest-batch-a.json
6. Bind accepted-cohort-manifest-batch-a.json sha256 into the program-wide successor gate.