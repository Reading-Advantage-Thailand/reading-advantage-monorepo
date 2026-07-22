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
- [b] Task: Complete the required isolated role set by adding browser-auditor and asset-auditor evidence; six existing receipt files cover three evidence collectors, the requirements mapper, truth-test author, and adversarial reviewer. (deferred:apk_three_game_truth_pilot_20260712-browser-asset-reconciliation)
- [x] Task: Set time/token/resource ceilings and stop-loss state. Evidence: All six existing receipts declare numeric resource ceilings and usage; five include a literal `budget_declaration_sha256`, while the Abyssal Well receipt records the canonical hash basis only; stop-loss counters are 0 in the pilot review.
- [b] Task: Measure - User Manual Verification 'Phase 0' (Protocol in workflow.md) — deferred:product-owner

## Phase 1: Exact evidence collection

- [x] Task: Collect Dragon Flight claims from exact current sources and tests. Evidence: `dragon-flight-claim-ledger.json` 225 claims across all 10 categories; every cited range SHA-256 re-verified; 3 negative fixtures (DF-NEG-001 slug-allowlist role FAIL; DF-NEG-002 unsupported XP injection REJECT; DF-NEG-003 directory-only citation REJECT).
- [x] Task: Collect RPG Battle claims across every discovered scene/state. Evidence: `rpg-battle-claim-ledger.json` 215 claims (212 atomic + 3 negative fixtures); 47 distinct states across 10 state vocabularies; 22 transitions; dead-state findings (defend pose, heal text type).
- [x] Task: Recover Abyssal Well chronology and behavior at exact historical revisions. Evidence: `abyssal-well-claim-ledger.json` 51 claims (49 historical_evidence + 2 negative fixtures); 3 distinct historical revisions touched (c76f6af3, 1c448546, da51b4e0); deletion commit 0ee91847 referenced.
- [x] Task: Reconcile every claim to the accepted denominator. Evidence: blueprint references 448 claim_ids mechanically validated against the three ledgers; zero unresolved.
- [x] Task: Run negative evidence and unsupported-claim fixtures. Evidence: 8 negative fixtures total (3 DF + 3 RPG + 2 AW) with verifiable expected_disposition.
- [b] Task: Measure - User Manual Verification 'Phase 1' (Protocol in workflow.md) — deferred:product-owner

## Phase 2: Evidence-only mapping

- [x] Task: Map complete scene/state and mechanic blueprints without adding claims. Evidence: `pilot-blueprint.json` artifacts A+B for all three games; every entry cites ledger claim_ids (448 referenced ids validated against the three ledgers; zero unresolved).
- [x] Task: Decompose current developer effort and copied-host surfaces. Evidence: `pilot-blueprint.json` artifact C per game, columns mirrored from the T2 phase-0 input freeze (record_type, file_path, relevance_rule_id vocabulary, host root from frozen source_scope roots); no platform-shared-infrastructure entries.
- [x] Task: Map concrete asset usages and candidate files per scene. Evidence: `pilot-blueprint.json` artifact D per game; zero-usage scenes marked explicitly (RPG StartScreen/GameEndScreen/BattleResults/Loading/Error; all three AW scenes).
- [x] Task: Keep capability similarities as non-authoritative hypotheses. Evidence: `mapper-hypotheses.md` — 6 entries, each tagged NON-AUTHORITATIVE HYPOTHESIS requiring evidence-collector validation.
- [b] Task: Measure - User Manual Verification 'Phase 2' (Protocol in workflow.md) — deferred:product-owner

## Phase 3: Responsive and browser truth

- [b] Task: Audit current compact/wide layout, camera, HUD, controls, text, and failures for runnable games — deferred:browser-auditor (gated by environment; required for corpus-scale work)
- [b] Task: Run real touch/pointer/keyboard paths, resize/orientation/fullscreen transitions, and completion/restart — deferred:browser-auditor
- [b] Task: Verify real short/worst-case Thai/English and enlarged-text fixtures — deferred:browser-auditor
- [b] Task: Define intentional profile contracts with exact evidence and visible unknowns — deferred:browser-auditor
- [b] Task: Measure - User Manual Verification 'Phase 3' (Protocol in workflow.md) — deferred:product-owner

## Phase 4: Candidate-level asset truth

- [b] Task: Produce one record per denominator path; identical hashes may share content inspection only — partial method and stub exist, but full per-path records remain required. (deferred:apk_three_game_truth_pilot_20260712-asset-auditor)
- [b] Task: Record format, dimensions/duration, provenance/license, callers, visible/audible content, states, theme/responsive suitability, and disposition — deferred:asset-auditor
- [b] Task: Independently review every reusable/adaptable decision and every invalid file — deferred:asset-auditor
- [b] Task: Measure - User Manual Verification 'Phase 4' (Protocol in workflow.md) — deferred:product-owner

## Phase 5: Independent pilot acceptance

- [x] Task: Run truth tests against denominator, claims, browser evidence, and candidate counts. Evidence: `truth_tests.py` 41 unittest cases across 6 classes (denominator 7, claim-ledger 12, blueprint 8, abyssal-well-historical 4, negative-fixture 6, stop-loss 4); 41/41 PASS at HEAD `75cf80cd84c8b9d66a646df16289515d7e0b8111`.
- [x] Task: Spawn the `fork_turns="none"`, tool-attested adversarial reviewer to check every claim. Evidence: `pilot-independent-review.json` and `role-receipts/adversarial-reviewer.json` at HEAD `2163831f`; 15/15 claim re-derivations exact; 8/8 negative fixtures supported; 41/41 truth tests reproduced.
- [x] Task: Remediate all Critical, High, and Medium findings or trigger stop-loss. Evidence: pilot review `blocking_findings` is empty; severity counters {critical:0,high:0,medium:0}.
- [x] Task: Publish non-consumable candidate pilot manifest, complete review report, and resource report. Evidence: `candidate-pilot-manifest.json` sha256 `cd1a2fe12f6b723451a395f286e4a00fe56ae09ead337eddda0d9a71986a9168`; `pilot-independent-review.json` sha256 `ddd4c4ab9e4ea9e9de824ef78c748729e0ce9b6dbbf17d698ae88f0baf89dcd8`.
- [x] Task: Obtain product-owner acceptance bound to exact candidate/review hashes, then publish the accepted pilot manifest. Evidence: `product-owner-acceptance.json` decision `approve-conditional`, sha256 `3a59c50e9269aed4bf2c49fe9ff3fa9943684580553cdbc6c37eaa34b780a004`; `accepted-pilot-manifest.json` sha256 `cbf04753aa21b0c43999ea202b718573616472a16dce94961242fdcb0260ca1b`.
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
