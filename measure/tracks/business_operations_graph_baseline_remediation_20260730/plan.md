# Implementation Plan: Business Operations Graph Baseline Remediation

## Current Gate State

- Parent Review B verdict remains `FAIL`; RB-01, RB-02, and RB-03 remain
  represented by pinned parent evidence and keep the parent gate blocked.
- Phase R0 validator/contract remediation is accepted for its limited scope:
  the Green receipt and independent rereviews A and B report PASS with no
  remaining Critical/High findings. This does not accept R1+ evidence or
  authorize any parent/successor unblock.
- `small_company_admin_privileges_20260722` Phase S1 remains blocked.
- `customer_licensing_crm_20260722` remains blocked at its shared graph gate.
- Work occurs only in the shared `master` checkout. Never stage, revert, reset,
  stash, overwrite, or repair unrelated APK changes.
- This track must not edit `measure/automation-supervisor.py`.

## Exact Next Red Task

- [x] Task: Keep `measure/tests/test_business_operations_graph_baseline_remediation.py` and its versioned adversarial fixtures executable, close every Critical/High finding from `r0-review-a-correctness-20260730.json` and `r0-review-b-safety-20260730.json`, and obtain a passing independent re-review. Evidence: `r0-critical-high-remediation-20260730.json` Green receipt, `r0-rereview-a-20260730.json`, `r0-rereview-b-20260730.json`, and the focused unittest command recorded below. No parent/successor gate was changed.

## Phase R0: Freeze contracts and make Red executable

- [x] Task: After the Red result is recorded, add the minimal versioned acceptance schemas, validator, source-snapshot denominator rules, and counterexample corpus needed to make only the frozen contract tests pass; keep this task in progress until independent re-review reports no Critical/High findings. Evidence: `red-run-receipt-20260730.md`, `r0-rereview-a-20260730.json`, and `r0-rereview-b-20260730.json`. Acceptance is limited to R0 validator/contract remediation; R1+ and all parent/successor gates remain blocked.
- [x] Follow-up: implement and test a genuinely non-writing `fixtures/v1/generate-fixtures.py --check` mode before using that command as fixture-integrity evidence. Evidence: `r0-rereview-a-20260730.json` finding `R0-REREVIEW-M1` (Medium, CLOSED), `r0-rereview-m1-follow-up-receipt-20260731.md`, and commit `fc2f3ea`. Scope was limited to the fixture generator, focused tests, this plan, and one follow-up receipt; no parent or successor gate changes.

## Phase R1: Bind the dirty-worktree source and graph

- [x] Task: Correct the deterministic snapshot producer so its concurrent-drift contract is scoped to the complete scanner-input denominator rather than unrelated repository documentation activity. It must capture and verify a pre/post HEAD interval, while still failing closed for every scanner-input, scanner-status, scanner-staged-diff, branch, worktree, or non-ancestor-history drift. Scanner symlink targets that traverse another symlink now fail closed before the scan window. Accepted by independent rereview v3 PASS: `r1-task1-scoped-concurrency-independent-rereview-v3-20260731.json`. (deferred:phase-r0-contract-green)

  Producer: `measure/business_operations_graph_baseline_snapshot.py` (`produce_snapshot`, `replay_archive`, `verify_snapshot`).
  Focused tests: `measure/tests/test_business_operations_graph_baseline_snapshot.py` (`37` tests, all `OK`) and `measure/tests/test_business_operations_graph_baseline_remediation.py` (`29` tests, all `OK`; `66` combined tests in `38.455s`). Adversaries cover untouched replay, already-dirty byte drift with unchanged status, nested workspace-export `extends`, staged deletion, non-master, alternate scanner root, second worktree, executable `lstat` mode, scanner-emitted Next declaration capture, produced-artifact R0 validation, scanner-scoped staged-diff drift, unrelated staged-documentation drift, changed-and-reverted scanner commits, changed-and-reverted intermediate-symlink chains, and non-ancestor history.
  Red receipt: `r1-task1-snapshot-producer-red-receipt-20260730.md`.
  Historical high-finding remediation receipt: `r1-task1-high-remediation-20260730.md`. Its independent rereview `r1-task1-independent-rereview-20260730.json` correctly reports `PASS` for the superseded global-Git-state contract at audited HEAD `96f9f81ba`; it does not accept this source-scoped correction. The new Red receipt is `r1-task1-scoped-concurrency-red-receipt-20260731.md`; the Green receipt is `r1-task1-scoped-concurrency-green-receipt-20260731.md`. `r1-task1-scoped-concurrency-rereview-remediation-receipt-20260731.md` records the H2 multi-hop fail-closed follow-up and 65 combined focused tests Green. The independent v3 rereview `r1-task1-scoped-concurrency-independent-rereview-v3-20260731.json` reports `PASS` with no findings, accepting Task 1's bounded producer scope. No parent/successor gate is changed.
  Integration check: a producer-written R0 v1 projection is accepted end to end by the unchanged validator, and the accepted R0 regression suite (`measure.tests.test_business_operations_graph_baseline_remediation`, `29` tests) passes (`8.227s`). The R0 validator is not modified.
  No parent or successor gate was changed; the master worktree dirty tree, the real Git index, and unrelated paths are preserved.
- [x] Task: Capture the candidate source snapshot in a coordinated stable window, prove archive replay equals its manifest, and prove pre-scan/post-scan denominator, status, and staged-diff identity. Abort rather than normalize or clean the dirty tree when drift occurs. The first current-head capture was discarded before commit when its graph contained 24 `.next/**/*.d.ts` file rows absent from the producer denominator; the focused producer test and denominator walk now cover those scanner-emitted declarations. Fresh accepted Task 2 evidence: `r1-task2-source-and-graph-20260731/` and `r1-task2-stable-window-receipt-20260731.md`; `r1-tasks2-3-independent-review-20260731.json` reports PASS. No parent/successor gate changed.

  The prior `r1-task2-source-snapshot-run-receipt-20260730.md` is invalidated: it did not execute the canonical scan in the producer transaction, kept the full bundle only outside the repository, and its verifier omitted rich/R0 state artifacts. `r1-task2-evidence-transaction-remediation-20260730.md` records the bounded correction and 50-test Green run. The retained fresh bundle was produced by the canonical in-transaction scan, replayed externally and durably, and then reconciled against the scan-bound graph. The first replacement bundle was discarded because quoted workspace globs were recorded incorrectly; `r1-task2-quoted-workspace-remediation-20260730.md` records the Red/Green correction.
- [x] Task: Run the canonical `repo-graph scan . ./graph.db` between equal source manifests; bind graph SHA/size/schema/tool/commands and every graph file-row hash to the snapshot; rerun exact Accounts, backend-kernel, company-identity, license, and www `search`/`inspect`/`callers` probes. Evidence: `r1-task3-graph-binding-20260731.json` and `r1-task2-stable-window-receipt-20260731.md`; all `3420` graph file rows bind to archived snapshot path/hash/size entries and all `28` read-only commands replayed with matching result hashes. `r1-tasks2-3-independent-review-20260731.json` reports PASS. No parent/successor gate changed.

## Phase R2: Close or compensate graph coverage gaps

- [x] Task: Execute and record the documented clean-audit/configuration attempt, including `repo-graph config`, scan options, raw audit JSON, stdout/stderr, and exits; select the clean branch only for audit exit `0` with empty unaudited and integrity sets. Evidence: `r2-clean-audit-attempt-20260731/attempt.json` and its six hash-bound raw stream artifacts. The accepted R1 archive was materialized outside the repository, scanned with documented empty `customEdges` configuration, and audited without touching repository `graph.db`: config/scan exited `0`; audit exited `1`, returned empty missing/stale/orphan/duplicate integrity sets, and returned `3,971` unaudited symbols. The result is truthfully labeled `COMPENSATION_REQUIRED`, with the complete raw symbol denominator and digest preserved; it is not a clean-audit claim. (deferred:phase-r1-bound-graph)
- [~] Task: If the clean branch is unavailable, generate the exact unaudited route/field denominator, reconcile every node to frozen source anchors and digests, and prove two unchanged-input full scans have identical normalized file/route/field inventories. Preserve audit exit `1` and the compensation label. Implementation in progress as `measure/business_operations_graph_baseline_compensation.py` plus the frozen `measure/tests/test_business_operations_graph_baseline_r2_compensation.py` suite, with focused evidence at `r2-task2-compensation-denominator-20260731.json` and a Red/Green receipt at `r2-task2-red-receipt-20260731.md` / `r2-task2-green-receipt-20260731.md`. Evidence test scope is limited to the producer, tests, evidence file, this plan update, and the two receipts. (deferred:phase-r2-clean-decision)
- [b] Task: Produce and test the Accounts unaudited-route security matrix, covering the complete discovered set and explicit authentication, permission ownership, validation, tenant/global scope, audit, and destructive-effect dispositions; run the Accounts and backend test/type gates from FR4. (deferred:phase-r2-audit-disposition)
- [b] Task: Compute the snapshot TypeScript-minus-graph denominator and resolve every excluded file by graph-safe inclusion or explicit source-anchor/type/test compensation; run the backend, Advantage Play Kit, and Advantage Games commands from FR5 without modifying failed unrelated APK code. (deferred:phase-r2-audit-disposition)
- [b] Task: Apply the FR6 decision rule: create and record one minimal `bodangren/repo-graph` issue only if a verified tool limitation forces the compensation branch; otherwise record why no upstream issue is required. Test both decision outcomes. (deferred:phase-r2-clean-and-exclusion-decisions)

## Phase R3: Verify, review, and control unblocking

- [b] Task: Run the focused contract/counterexample suite, all required package gates, graph stats/audit/probes, and a final snapshot drift check; publish a candidate evidence manifest whose hashes cover every input and result without claiming acceptance. (deferred:phase-r2-complete)
- [b] Task: Perform a producer self-audit against RB-01/RB-02/RB-03 and anti-patterns A5/A6/A8/A10/A12/A15/A16; confirm only `[~]`, `[x]`, and `[b]` markers occur in this track and that successor blockers remain unchanged. (deferred:phase-r3-candidate)
- [b] Task: Obtain an independent acceptance review from a role that did not produce the candidate. The reviewer must independently rerun digest/denominator/decision checks, report severity-ranked findings, and emit a machine-readable `ACCEPT` or `REJECT`; any Critical/High finding keeps this task and both successor gates blocked. (deferred:phase-r3-candidate-self-audit)
- [b] Task: Complete Measure manual verification for the evidence replay and reviewer decision, with explicit owner confirmation; do not treat owner confirmation as a substitute for independent technical acceptance. (deferred:phase-r3-independent-acceptance)
- [b] Task: Only after independent `ACCEPT` and owner confirmation, publish a hash-bound handoff and update the parent Admin Phase 0 and CRM dependency markers in their owning plans/registry. If either prerequisite is absent, make no unblock edit and record the blocked disposition. (deferred:phase-r3-independent-acceptance-and-owner-confirmation)

## Completion Rule

The R0 validator/contract remediation is complete only within the acceptance
boundary recorded above. R1 Tasks 1 through 3 are complete only within their
bounded producer, stable-window, and scan-binding evidence scopes; all R2/R3
tasks remain `[b]` because no later-phase evidence or authorization is recorded
here.
No Admin S1 or CRM work may begin from producer or R0 evidence alone, and all
parent/successor gates remain blocked until the later hash-bound handoff,
independent R3 acceptance, and owner confirmation.
