# T4 Action and Defense Evidence Cohort — Last Batch Status

## Current: Batch B — STOP-LOSS ACTIVE (product-owner direction required)

### Immutable phase base
- `ff01cee9cc973dee89fdc0ba22102dcea0c50542` — Batch B strategy commit.

### Scope and progress
- Authoritative scope: Village Guardian, Archer's Revenge, Storm the Castle Tower.
- Discovery, separate collector packages, separate mapper packages, asset audit, truth-test v3, and two fresh adversarial reviews are committed through `dd59e5e6`.
- B0-B3 are green: exact scope and predecessors, source envelopes, per-game mapper backing, negative fixtures, and 12/12 asset-candidate reconciliation.
- Fresh review v2 independently re-derived 29 factual claims and all 12 negative fixtures with zero envelope mismatch. It confirmed the original artifacts remain immutable and that no browser bypass occurred.

### Blocking findings
- **Critical B-BLOCK-001:** 87 unavailable provenance fields across active role receipts. Truthful null/unavailable values are non-passing; hash equality does not establish prompt/session/event/final-response/isolation/commit provenance.
- **High B-BLOCK-002:** Two independent browser paths failed (`agent-browser` absent, then CDP/browser-harness attachment failure). No game is marked non-runnable; all three remain `audit-blocked` with zero real-input observations.
- **Medium B-TEST-002:** `batch-b-truth-tests-v3.py` does not select the active browser/review v2 artifacts and all relevant receipts for B4/B5 machine verification.

### Stop-loss decision
- Browser remediation cycles used: 2 of 2.
- Candidate, product-owner acceptance, and accepted manifest are **not authorized**.
- Do not dispatch another browser/provenance remediation without product-owner direction. Preserve all evidence and receipts append-only.
- Primary review record: `batch-b-adversarial-review-v2.json` at output commit `dd59e5e6`.

---

## Batch A — STOP-LOSS TRIGGERED (Cycle 1 / 2)

### Phase base SHA (immutable, captured after strategy commit)
- `9228c5c5` — strategy commit (`chore(measure): t4 batch-a test strategy (track_id: apk_corpus_audit_action_defense_20260712)`)

### Phase progression (in order)

| Step | Role | Artifact | Commit | Status |
|------|------|----------|--------|--------|
| 1 | strategy | `test-strategy-batch-a.md` (472 lines) | `64293960` | ✅ committed |
| 2 | (orchestrator) | `_orchestrator/LAST-BATCH-STATUS.md` (initial) | `9228c5c5` | ✅ committed |
| 3 | requirements-mapper | `batch-a-blueprint.json`, `mapper-hypotheses-batch-a.md`, `mapper-final-report-batch-a.json`, role-receipt | outputs `fc643d04` / bind `0b641aa3` | ✅ committed; receipts bound |
| 4 | truth-test-author | `batch-a-truth-tests.py` (41 tests, 6 classes) + role-receipt | outputs `31dac90b` / bind `5464dc6b` | ✅ committed; **38 PASS / 3 RED** |

### STOP-LOSS TRIGGERED — Truth-test outcome (cycle 1 of 2)

The truth-test-author authored 41 tests across six contract classes. **3 tests fail intentionally** because they are the G-CL / G-SL fraud-detection surfaces — they correctly detected that the Batch A evidence has 12 fabricated or anchor-drifted claims and a receipt immutability breach.

**SLO-TTA-BA-1 (BLOCKING — Evidence fabrication, 12 bad claims):**

| Game | Claim IDs | Defect |
|------|-----------|--------|
| magic-defense | MD-HIST-001, MD-HIST-002 | `blob_sha256` is the SHA-256 of the empty byte string (`e3b0c44…b855`); `cited_range_sha256` is the same fabricated value (`01ba4719…546b`) for both ranges. The real historical blob at 097545f1 is `a05dc35f…556d`. Both cited ranges 1..1 and 1..14 produce hashes that match neither the empty blob nor the real content. |
| wizard-vs-zombie | WVZ-COMP-004, WVZ-MECH-019, WVZ-TEST-007 | Cited range SHA-256 does not match any contiguous window of the cited file or its host copies at any width/encoding — looks like real-path citation with fabricated hash. |
| wizard-vs-zombie | WVZ-TEST-008, WVZ-HIST-002, WVZ-HIST-003, WVZ-HIST-004 | `cited_range_sha256` and `blob_sha256` are sequential-hex placeholder strings (not real SHA-256s); `WVZ-HIST-002/003` even equate the range hash to the blob hash, which is only valid for whole-file citations. |
| wizard-vs-zombie | WVZ-COMP-005, WVZ-COMP-006, WVZ-MECH-008 | Anchor drift — real window exists but at different lines (482-504 vs real 484-504, 33 vs real 35, 171-182 vs real 172-182). |

10 of the 12 bad IDs are cited as blueprint backing. The blueprint is **evidentially contaminated** in those entries even though its structural references resolve.

**SLO-TTA-BA-2 (BLOCKING — Receipt immutability breach, anti-pattern A15):**

Commit `ca423fbb` (an unrelated Company SSO cutover postflight commit) mutated the wizard-vs-zombie evidence-collector receipt in place, rewriting its `commit_sha` and `final_response_sha256` fields after binding. The enumerated output hash for the wizard-vs-zombie final report matches neither the HEAD bytes nor the bytes at the authoritative bind commit `20af6417`. This is the full IMP-WVZ-1 manifestation.

**Gates red:**
- G-CL (Claim Ledger) — 12 unresolvable citations
- G-SL (Stop-Loss) — aggregate of those 12
- G-RR (Role Receipt) — WVZ receipt immutability breach + IMP-CD-1 / IMP-MD-1

### Per program rule: "One unsupported or fabricated factual claim stops the batch."

Gates G-CL / G-SL / G-RR are RED. Batch A acceptance is **blocked** until the magic-defense and wizard-vs-zombie evidence is remediated.

### Remediation decision (cycle 1 of 2 — orchestrator-direct)

The orchestrator (under delegated product-owner authority) issues the following remediation:

1. **Dispatch TWO evidence-collector subagents** (`coder-minimax-m3`, fresh-context-only, `fork_turns=none`, `parent_ancestry_ids=[]`):
   - **Magic Defense re-collector** — supersede MD-HIST-001 and MD-HIST-002 with correct citation envelopes computed from the actual blob at 097545f1 (`a05dc35f80130771bf0340794717f830793c9a9fa712f846514b08f45f4d556d`). Publish a new ledger file `magic-defense-claim-ledger-v2.json` (do NOT overwrite v1). New role-receipt: `role-receipts/evidence-collector-magic-defense-v2.json`.
   - **Wizard vs Zombie re-collector** — supersede all 10 WVZ bad claims with correct citation envelopes (real hash from real window). Publish `wizard-vs-zombie-claim-ledger-v2.json`. New role-receipt: `role-receipts/evidence-collector-wizard-vs-zombie-v2.json`. **ALSO publish a superseding receipt** `role-receipts/evidence-collector-wizard-vs-zombie-supersede.json` that documents the receipt immutability breach by ca423fbb and re-asserts provenance for the v1 outputs on their real commit (91416b97).

2. **After re-collection**, dispatch a fresh **requirements-mapper** to produce `batch-a-blueprint-v2.json` referencing only the v2 claim IDs (and any non-bad v1 IDs that resolve cleanly).

3. **Re-run the truth-tests** — expect 41/41 PASS at HEAD with v2 ledgers + v2 blueprint.

4. **Continue the role chain**: browser-auditor → asset-auditor → adversarial-reviewer → candidate-cohort-manifest → product-owner-acceptance → accepted-cohort-manifest → successor hash binding.

If cycle 2 also fails, **escalate to product-owner** per the program rule.

### Files NOT touched by orchestrator (preserved)
- `.opencode/goals/state.json*` (unrelated)
- `apps/sales-advantage/next-env.d.ts` (unrelated)
- `measure/archive/apk_three_game_truth_pilot_20260712/metadata.json` (unrelated)
- `measure/tests/__pycache__/`, `measure/evidence_integrity_gates/__pycache__/`, etc. (generated/ignorable)
- `measure/tracks/agents_md_audit_science_advantage_20260603/` (stale untracked dir — separate cleanup, anti-pattern A13)

### Next concrete action (next dispatch)

Issue the remediation directive and dispatch:
1. Magic Defense v2 evidence-collector (commit hash binding: 9228c5c5; supersede v1)
2. Wizard vs Zombie v2 evidence-collector + superseding receipt (commit hash binding: 9228c5c5; supersede v1)

These run in parallel. Bind phase_base_sha 9228c5c5 (or the post-remediation HEAD if the strategy commits afterward) into every role receipt.
