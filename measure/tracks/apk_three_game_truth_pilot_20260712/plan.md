# Implementation Plan: APK Three-Game Source-Truth Pilot

## Predecessor binding
- T2 accepted denominator manifest sha256: `d524171dbc412a213ed4be7ad7a77e2eb404e7c5bf4a5debe2ad68dd121b5729`
- T2 accepted partition manifest sha256: `6badf73b625567b3fc6d4558c52ab68bd0e4fe2fb3afe3792aca4126df2d27b0`
- T2 track head SHA: `ba95e6fb1db6acdaecd0808ca1f22dec339d6c5d`
- Source baseline revision: `23bb5ad578c01fb29f9e8bb76a7d934d24a4b286`
- Three pilot games (per program spec `measure/apk-evidence-reconstruction-program.md` lines 109-114):
  - Dragon Flight (`vocabulary/dragon-flight`) — large current action implementation
  - RPG Battle (`vocabulary/rpg-battle`) — multi-state turn-based implementation
  - The Abyssal Well (`sentence/abyssal-well`) — stale/historical evidence recovery

## Phase 0: Freeze pilot and resources

- [x] Task: Verify truth-gate and denominator hashes (T2 accepted manifests are the gate; both pinned above). Evidence: `measure/archive/apk_source_denominator_inventory_20260712/accepted-{denominator,partition}-manifest.json` at HEAD `da51b4e0`.
- [x] Task: Confirm three pilot cases and reject expansion beyond them. Evidence: partition manifest `T3:pilot` cohort contains exactly the three identities listed above.
- [~] Task: Spawn distinct collectors (one per game), mapper, truth-test author, browser auditor, asset auditor, and adversarial reviewer; record isolated prompts
- [~] Task: Set time/token/resource ceilings and stop-loss state
- [b] Task: Measure - User Manual Verification 'Phase 0' (Protocol in workflow.md) — deferred:product-owner

## Phase 1: Exact evidence collection

- [~] Task: Collect Dragon Flight claims from exact current sources and tests
- [~] Task: Collect RPG Battle claims across every discovered scene/state
- [~] Task: Recover Abyssal Well chronology and behavior at exact historical revisions
- [~] Task: Reconcile every claim to the accepted denominator
- [~] Task: Run negative evidence and unsupported-claim fixtures
- [b] Task: Measure - User Manual Verification 'Phase 1' (Protocol in workflow.md) — deferred:product-owner

## Phase 2: Evidence-only mapping

- [x] Task: Map complete scene/state and mechanic blueprints without adding claims. Evidence: `pilot-blueprint.json` artifacts A+B for all three games; every entry cites ledger claim_ids (448 referenced ids validated against the three ledgers; zero unresolved).
- [x] Task: Decompose current developer effort and copied-host surfaces. Evidence: `pilot-blueprint.json` artifact C per game, columns mirrored from the T2 phase-0 input freeze (record_type, file_path, relevance_rule_id vocabulary, host root from frozen source_scope roots); no platform-shared-infrastructure entries.
- [x] Task: Map concrete asset usages and candidate files per scene. Evidence: `pilot-blueprint.json` artifact D per game; zero-usage scenes marked explicitly (RPG StartScreen/GameEndScreen/BattleResults/Loading/Error; all three AW scenes).
- [x] Task: Keep capability similarities as non-authoritative hypotheses. Evidence: `mapper-hypotheses.md` — 6 entries, each tagged NON-AUTHORITATIVE HYPOTHESIS requiring evidence-collector validation.
- [b] Task: Measure - User Manual Verification 'Phase 2' (Protocol in workflow.md) — deferred:product-owner

## Phase 3: Responsive and browser truth

- [~] Task: Audit current compact/wide layout, camera, HUD, controls, text, and failures for runnable games (Dragon Flight, RPG Battle only — Abyssal Well is non-runnable per deletion)
- [~] Task: Run real touch/pointer/keyboard paths, resize/orientation/fullscreen transitions, and completion/restart
- [~] Task: Verify real short/worst-case Thai/English and enlarged-text fixtures
- [~] Task: Define intentional profile contracts with exact evidence and visible unknowns
- [b] Task: Measure - User Manual Verification 'Phase 3' (Protocol in workflow.md) — deferred:product-owner

## Phase 4: Candidate-level asset truth

- [~] Task: Produce one record per denominator path; identical hashes may share content inspection only
- [~] Task: Record format, dimensions/duration, provenance/license, callers, visible/audible content, states, theme/responsive suitability, and disposition
- [~] Task: Independently review every reusable/adaptable decision and every invalid file
- [b] Task: Measure - User Manual Verification 'Phase 4' (Protocol in workflow.md) — deferred:product-owner

## Phase 5: Independent pilot acceptance

- [~] Task: Run truth tests against denominator, claims, browser evidence, and candidate counts
- [~] Task: Spawn the `fork_turns="none"`, tool-attested adversarial reviewer to check every claim
- [~] Task: Remediate all Critical, High, and Medium findings or trigger stop-loss
- [~] Task: Publish non-consumable candidate pilot manifest, complete review report, and resource report
- [b] Task: Obtain product-owner acceptance bound to exact candidate/review hashes, then publish the accepted pilot manifest — deferred:product-owner
- [b] Task: Measure - User Manual Verification 'Phase 5' (Protocol in workflow.md) — deferred:product-owner

## Truth-test author evidence (2026-07-20, role-isolated)

- Artifact: `truth_tests.py` — 41 unittest cases across 6 contract classes
  (denominator 7, claim-ledger 12, blueprint 8, abyssal-well-historical 4,
  negative-fixture 6, stop-loss 4), derived from the T2 denominator, the three
  ledgers, and the blueprint only.
- Command: `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest measure.tracks.apk_three_game_truth_pilot_20260712.truth_tests -v`
  → **41/41 PASS, exit 0** (~180 s).
- Negative fixtures re-derived: DF-NEG-001 FAIL (slug-allowlist contradicted by
  cited source), DF-NEG-002/003 + RPG-NEG-001/002 REJECT-class (uncited /
  directory-only citations), RPG-NEG-003 FAILED (no `battle-sprite` allowlist
  exists at baseline), AW-HIST-NEG-001 MUST_FAIL (zero AW paths at HEAD),
  AW-HIST-NEG-002 REJECTED (no streak/daily mechanic in cited logic).
- Stop-loss observation (not a content mismatch): the four committed T2 phase
  test modules fail at HEAD purely from the T2 archival path relocation
  (`measure/tracks/` → `measure/archive/`, anti-pattern A9). Discovery still
  yields exactly 13/18/31/24 = 86 tests; phases 0+1 pass 31/31 under a
  disclosed 3-line relocation shim; all phase 2/3 failures are path-class with
  zero content/hash failures. Repair of the committed T2 modules is
  infrastructure work for the orchestrator, not the truth-test author.
- Task markers left to the orchestrator per this track's role-isolation
  convention (collector precedent).
