# T4 Batch A — Risk-Based Test Strategy

Track: `apk_corpus_audit_action_defense_20260712` (T4 — APK Action and Defense Evidence Cohort)
Phase scope: **Phase 1 (Batch A evidence packages) → Phase 4 (Batch A cohort reconciliation)**
Author: `measure-strategy` subagent, fresh context, `fork_turns=none`, `parent_ancestry_ids=[]`
Strategy baseline SHA (HEAD at strategy write time): `2d1d9949a9af3c18f5a8047a5c0af017215d61e9` (= immutable phase base from orchestrator; no commits authored under this role)
Document status: working-tree file, not yet committed. The orchestrator commits the strategy, then **immediately after the strategy commit** captures the immutable `phase_base_sha` (= post-commit HEAD). The strategy deliberately does NOT embed that post-commit SHA.

---

## 1. Scope and binding

This strategy governs acceptance of Batch A (Castle Defense, Magic Defense, Wizard vs Zombie) only. Batches B and C inherit the structure but get their own strategy authored when their evidence lands. Batch A is the first post-pilot evidence batch and must replicate the pilot's six-contract structure with no shortcuts; it must also defend against cohort-specific risks identified below.

### 1.1 Predecessor hashes (mandatory; binding by reference only)

| Artifact | sha256 | Role |
|---|---|---|
| T1 evidence integrity gate | `phase4-v8-candidate` (`5aea360f`) | accepted, see `measure/evidence-integrity-accepted-gate.json` |
| T2 accepted denominator manifest | `d524171dbc412a213ed4be7ad7a77e2eb404e7c5bf4a5debe2ad68dd121b5729` | canonical, unamended by stop-loss resolutions |
| T2 accepted partition manifest | `6badf73b625567b3fc6d4558c52ab68bd0e4fe2fb3afe3792aca4126df2d27b0` | canonical, unamended by stop-loss resolutions |
| T3 accepted pilot manifest | `cbf04753aa21b0c43999ea202b718573616472a16dce94961242fdcb0260ca1b` | accepted-conditional; pilot precedent for SLO-MD-1 / SLO-WVZ-1 |
| Source baseline revision | `23bb5ad578c01fb29f9e8bb76a7d934d24a4b286` | every claim cites this revision or the T2 archive revision `da51b4e0` |

Both T2 hashes remain canonical. `stop-loss-resolutions-batch-a.md` resolves SLO-MD-1 and SLO-WVZ-1 as conditional-item + exclusion; it does NOT amend the denominator or partition manifests.

### 1.2 Batch A evidence posture

| Game | Canonical identity | Disposition | Claims | Neg fixtures | SLO count | Output commit | Bind commit |
|---|---|---|---:|---:|---:|---|---|
| Castle Defense | `sentence/castle-defense` (alias `vocabulary/castle-defense`) | current | 139 | 3 | 0 | `040802b3` | `9cfc102b` |
| Magic Defense | `vocabulary/magic-defense` | current | 110 | 5 | 1 (SLO-MD-1, conditional-inclusion) | `6998570b` | `d119bbad` |
| Wizard vs Zombie | `vocabulary/wizard-vs-zombie` | current | 77 | 4 | 1 (SLO-WVZ-1, exclusion-by-byte-identicality) | `91416b97` (4 binds) | `20af6417` |
| **Total** | | | **326** | **12** | **2 resolved** | | |

### 1.3 Known process imperfections (documented, blocking for clean acceptance — must be remediated by the next role)

| ID | Imfection | Where | Defense strategy (this doc) |
|---|---|---|---|
| IMP-CD-1 | `evidence-collector-castle-defense.json` lacks `final_response_sha256` field entirely | role receipt | Required gate G-RR (role-receipt integrity); placeholder-fixing role-receipt normalization required before POA writes `product-owner-acceptance-batch-a.json`. See §6. |
| IMP-MD-1 | `evidence-collector-magic-defense.json` carries `final_response_sha256: "PENDING-RECEIPT-BIND"` (placeholder string) | role receipt | Same as IMP-CD-1; placeholder is not a valid hex-64 value, fails A15 audit. Truth-test-author's role-receipt-integrity class MUST re-derive the hash from the receipt's enumerated `output_hashes` or the bind commit `d119bbad` and pin the real value, then refresh the receipt by issuing a new receipt that explicitly supersedes the placeholder (do not edit the original immutable receipt). |
| IMP-WVZ-1 | Wizard-vs-zombie evidence-collector produced 4 intermediate bind commits (`2f551701`, `01e4615e`, `2bcb883c`); final state on `20af6417`. Intermediate commits may exist as garbage objects in the working tree or refs. | git history | Truth-test-author's ledger schema test MUST pin `commit_sha` for wvz to `20af6417` and assert that all enumerated `output_hashes` match the bytes at that commit. Intermediate commits are not authoritative; their hashes are not bound. |

These are the only known imperfections at the time of strategy authoring. Any new finding raised by the truth-test-author or adversarial-reviewer is a blocking finding under §6.

---

## 2. Risk catalogue (per anti-pattern + cohort-specific)

Every entry below names the risk class, the defense, the falsification condition, and the gate that catches it. The catalog is the audit's primary input.

### 2.1 Project anti-patterns (A1–A15) — selected for Batch A applicability

| ID | Anti-pattern | Risk to Batch A | Defense (per phase) | Falsification condition |
|---|---|---|---|---|
| A1 | Substring-as-signal in supervisor | Plan.md `[~]` markers can drift; supervisor must not under-count on prose. | `tests/orchestrator_supervisor_invariants.sh` already guards. Strategy re-asserts `[b] deferred:<owner>` and `[~]` discipline in §4. | A `[~]` task with `deferred:product-owner` substring in prose is silently dropped from incomplete count. |
| A3 | Digit-only as labeled count | Counts in receipts/reports (claims_authored, negative_fixtures) must be labeled integers, not bare digits. | Truth-test-author must `rg 'claims_total[[:space:]]*:[[:space:]]*[0-9]+'` and parse integer per game. Reject bare `rg -q '[0-9]+'` patterns. | A detector matches "2026" or "20260712" instead of the labeled integer and reports zero failures. |
| A4 | Vacuous-pass on nothing-done | Pilot allowed 0 SLO. Batch A allows at most 2 resolved SLOs (SLO-MD-1 conditional-inclusion, SLO-WVZ-1 exclusion); zero SLO would still pass if the test logic is "stop_loss_observations in {0,1,2} → PASS". | Reclassify: PASS requires `unresolved_blocking_findings == 0 AND (denominator_mismatches==0 AND unsupported_factual_claims==0 AND SLO carry-forward items in conditional_open_items)`. | A all-`[~]` state without any `[x]` is reported PASS. |
| A5 | False-claim text vs test reality | plan.md task "Run truth tests and full independent batch review" claims will be tested. | Truth tests run as a real `python3 -m pytest` invocation under `PYTHONDONTWRITEBYTECODE=1`; reviewer MUST independently reproduce the suite exit code before publishing review report. | A plan task says "all checks pass" while the test exits non-zero. |
| A6 | Registry-note overstatement | `measure/tracks.md` entry for T4 must be truthful: Batch A acceptance requires every gate in §6 to be green. | Track registry update must NOT claim "Batch A accepted" before `accepted-cohort-manifest-batch-a.json` exists with `decision: approve`. | `tracks.md` says "Batch A accepted" while review report records unresolved findings. |
| A7 | Over-broad filter swallowing real hits | Truth-test-author's negative-fixture grep exclusions must NOT use bare English words. | Only exclude `outcome-claims-policy.md`, `❌`, `BANNED` markers; never `never`, `do not`, `forbidden` as bare tokens. | A real banned-term line containing "never" is silently dropped by the filter. |
| A8 | `[ ]` marker ambiguity | plan.md uses `[b] deferred:product-owner` — confirmed `[~x]` only at writing; strategy forbids `[ ]` markers. | `tests/orchestrator_marker_vocabulary.sh` already enforces `[~xb]` only. Plan-updates must convert any `[ ]` to one of these before supervisor runs. | A `[ ]` task is counted in-progress. |
| A9 | Pre-existing test references archived track paths | T2 phase tests already fail at HEAD on `measure/tracks/apk_source_denominator_inventory_20260712/` relocation (recorded in pilot review). | Out of scope for Batch A truth-tests; pilot already documented. If truth-tests touch T2 files, use `track_dir_resolve()` helper. | A test fails forever after a future archive move. |
| A10 | Generated-facts drift after structural change | If strategy text is later regenerated by `measure/generate.sh`, hashes will drift. | Strategy is a working-tree file authored this session; it is NOT regenerated. Pin by SHA after orchestrator commits. | `phase_base_sha` captured at HEAD no longer matches the strategy's binding. |
| A11 | Executed review track left fully blocked | After adversarial reviewer completes, plan.md task markers must reflect real state. | After adversarial review lands, the orchestrator must flip the matching plan task from `[~]` to `[x]` and convert any `[b] deferred:review-execution` to truthful `[x]/[~]`. | Plan still says `[b] deferred:review-execution` while `*review-report.json` exists in the track. |
| A12 | Dangling catalog guard-references | Strategy references no external guards (all gates are pytest-truth-test classes). | N/A directly. Orchestrator-audit's catalog-exists check still applies. | A catalog entry names a guard file that does not exist. |
| A13 | Stale track dir left after archive move | Out of scope for Batch A. | N/A. | A future archive move leaves a stray dir. |
| A14 | Invalid ripgrep option | Orchestrator's audit detector recipes must use `rg -n`, not `rg -nE`. | Strategy specifies only `python3 -m pytest` invocations; no rg detectors in this strategy. | Detector exits 2 and is collapsed into zero findings. |
| A15 | Stale role-receipt hashes after reviewed fixes | **DIRECTLY APPLICABLE** — IMP-CD-1, IMP-MD-1 are A15-class failures. | §6 Gate G-RR forbids accepting role receipts with placeholder strings, missing required fields, or hashes that don't match HEAD. Receipts with placeholders MUST be superseded by a fresh receipt bound to a new commit (do not mutate the immutable original). | A receipt enumerates output hashes that do not match HEAD; or carries a placeholder `final_response_sha256` like `"PENDING-RECEIPT-BIND"`. |

### 2.2 Cohort-specific risks (Batch A action/defense)

| ID | Risk class | Defense | Falsification |
|---|---|---|---|
| R-CD-1 | Citation drift — CD cites T2 archive revision `da51b4e0` for ID/HIST claims and `23bb5ad5` for source claims. Truth-test-author MUST verify both forms resolve. | Class 1 denominator + Class 2 ledger citations contract — see §4. | Any non-fixture CD claim fails resolve_claim_citation. |
| R-MD-1 | Magic-defense shares `useGameStore.ts` + `magicDefenseConfig.ts` + `game/` shared implementation across catalog cards. Risk: cross-game ontology leak into evidence. | Strategy §3.2 forbids mapper from advancing cross-game findings as facts; `mapper-hypotheses-batch-a.md` MUST segregate any cross-game observation as `NON-AUTHORITATIVE HYPOTHESIS`. Truth-test-author's blueprint contract enforces segregation. | A blueprint entry cites a hypothesis id as if it were a fact. |
| R-MD-2 | Magic-defense has 5 negative fixtures (largest fixture set per game in Batch A). MD-NEG-001 is a "must FAIL with REAL citation" fixture (citation present, claim false). | Truth-test-author's negative-fixture contract MUST verify both `MUST FAIL` and `MUST REJECT` classes; explicitly check MD-NEG-001 re-derives the false claim from its own citation. | MD-NEG-001 disposition re-derives as PASS or REJECT instead of FAIL. |
| R-WVZ-1 | Wizard-vs-zombie has 4 binding commits; only `20af6417` is authoritative. Risk: intermediate commits leak as authoritative references. | Truth-test-author MUST pin `commit_sha == 20af6417` for WVZ; enumerate `output_hashes` and verify bytes-at-HEAD match. | Truth test references any of `2f551701`, `01e4615e`, `2bcb883c` as authoritative. |
| R-WVZ-2 | WVZ-NEG-004 is a withdrawn-id membership fixture (catalog id `wizard-vs-zombie` was withdrawn from one cohort and re-entered another). | Truth-test-author MUST verify the negative fixture is NOT promoted into an accepted claim. | WVZ-NEG-004 disposition re-derives as accepted. |
| R-ALL-1 | Hash drift between output commit and bind commit — every collector has separate `commit_sha_outputs` and `bind` commit. The receipt MUST pin one canonical commit (the bind) and enumerate hashes-at-bind. | Truth-test-author MUST run all citation resolutions at the bind commit, not the outputs commit. | Citation resolves at outputs commit but fails at bind commit. |
| R-ALL-2 | Role-isolation breach — receipt `parent_ancestry_ids: []` and `fork_turns: "none"` MUST be present and literal. Any prose basis (e.g., the abyssal-well pilot receipt used "prose basis" instead of literal hash) MUST be re-pinned. | Gate G-RR enforces literal field presence; receipts that record prose basis are rejected. | A receipt lacks `parent_ancestry_ids` field or carries prose basis for prompt_sha256. |
| R-ALL-3 | SLO slippage — pilot had 0 SLO; Batch A has 2 already-resolved SLOs. A 3rd SLO would trip the "two failed fix/review cycles" rule only if 2 failed cycles had happened; 3rd SLO with 0 failed cycles is allowed IF accepted. | §5 stop-loss section explicitly allows ≤2 resolved (conditional or exclusion) SLOs for the three-game batch; a 3rd SLO blocks acceptance pending product-owner direction. | A 3rd SLO is added and the orchestrator proceeds to POA without escalation. |
| R-ALL-4 | Batch size discipline — three games, max. Pilot was three games; pilot review precedent fixed this ceiling. | §5 stop-loss: any evidence batch > 3 games fails the batch. | A fourth game is added to Batch A. |
| R-ALL-5 | Blueprint hypothesis-as-fact — risk that the mapper's narrative confuses `mapper-hypotheses-batch-a.md` (NON-AUTHORITATIVE) with `pilot-blueprint-batch-a.json` (authoritative). | Truth-test-author's blueprint contract MUST scan for `H[1-9]` ids in the blueprint and FAIL on any; verify the boundary declaration's `cross_game_similarity_findings` field starts with `"none"` and references `mapper-hypotheses-batch-a.md` with the literal substring `NON-AUTHORITATIVE HYPOTHES`. | A `H1..H6`-style id appears in the blueprint. |
| R-ALL-6 | Cross-cohort ontology leak — Batch B (Village Guardian, Storm the Castle Tower, Paladin's Twin-Soul) and Batch C (Archer's Revenge, Gryphon Patrol) may tempt the mapper to advance cross-batch observations. | Mapper prompt forbids cross-batch claims in Batch A's blueprint. Any cross-batch observation MUST go into `mapper-hypotheses-batch-a.md` only. Truth-test-author's blueprint contract catches leakage by checking that no claim_id in the Batch A blueprint references a path under the Batch B/C catalog ids. | A claim cites `sentence/village-guardian` from Batch B in Batch A's blueprint. |
| R-ALL-7 | Browser-audit deferral — T3 deferred both browser and asset audits. T4 Batch A is "current" per HANDOFF.md, so the question is whether current games require browser evidence before Batch A acceptance. See §5.3. | This strategy explicitly authorizes deferral of browser evidence to a separate successor track for all three Batch A games, conditional on the asset-audit-gate (G-AS) producing real-input evidence OR explicit non-runnable disposition per program rules. | Browser evidence is required but the asset-audit gate produced no real-input record. |
| R-ALL-8 | Asset-audit deferral — T3 deferred per-path asset records. T8 (asset forensics) is the successor track. Batch A is allowed to defer ONLY the per-candidate forensic records to T8; the asset-usage map per game (artifact D in blueprint) MUST be present. | Truth-test-author MUST verify the blueprint has `D_asset_usage_map` and `D_asset_usage_non_scene_surfaces` for each game and that every entry has `backing_claims`. | A game blueprint lacks `D_asset_usage_map` or entries have no backing_claims. |
| R-ALL-9 | T3 conditional items inherited — pilot non-blocking observations include (1) Phase 3 browser audit deferred; (2) AW receipt prose-basis normalization; (3) T2 module path relocation. Batch A must NOT re-open these as blocking. | Pilot review precedent binds; these remain recorded as T3 non-blocking observations and are not promoted to Batch A blocking. | A pilot non-blocking observation is re-classified as Batch A blocking without new evidence. |
| R-ALL-10 | Receipt schema drift — pilot receipts had prose-basis fields; Batch A has explicit hashes for Castle Defense but missing/placeholder for MD and CD. Gate G-RR enforces the canonical schema. | See IMP-CD-1 / IMP-MD-1 / IMP-WVZ-1 above. | Receipt schema drift is silently accepted. |

### 2.3 Risk classification summary

- **Critical**: A15 (stale role-receipt hashes — directly applicable); R-ALL-7 (browser audit gate).
- **High**: R-MD-1 (cross-game ontology leak); R-ALL-5 (hypothesis-as-fact); R-ALL-6 (cross-cohort leak); R-MD-2 (5-fixture re-derivation); R-WVZ-2 (withdrawn-id membership fixture).
- **Medium**: A1, A3, A4, A5, A6, A7, A8, A10, A11, A14; R-CD-1, R-WVZ-1, R-ALL-1, R-ALL-2, R-ALL-3, R-ALL-4, R-ALL-8, R-ALL-9, R-ALL-10.
- **Low**: A2, A9, A12, A13 (not directly applicable to Batch A).

---

## 3. Test scope

### 3.1 Six-contract class structure (mirrors pilot, specialized for action/defense)

The truth-test-author MUST author one pytest module `measure/tracks/apk_corpus_audit_action_defense_20260712/batch-a-truth-tests.py` containing six unittest.TestCase classes. Each class covers one of the pilot's contracts; coverage is specialized for action/defense subject matter (wave, spawn, targeting, typed-answer, defense-zone, escort, projectile, health/lives, combat-feedback, camera, terminal behavior).

| Class | Pilot equivalent | Batch A scope (action/defense specialization) |
|---|---|---|
| Class 1 — Denominator Truth Contract | `T3DenominatorTruthContract` | Bind T2 accepted hashes; verify Batch A is exactly the three current games from the partition; verify each game has one identity record in the accepted T2 identity ledger; reconcile per-game `source-denominator.json` record counts (file, graph, copy, route, identity); verify zero phase-3 blocking records. |
| Class 2 — Claim-Ledger Truth Contract | `T3ClaimLedgerTruthContract` | Three sub-classes: (a) `CastleDefenseLedgerTruthContract` for 139 non-fixture + 3 fixtures; (b) `MagicDefenseLedgerTruthContract` for 110 non-fixture + 5 fixtures; (c) `WizardVsZombieLedgerTruthContract` for 77 non-fixture + 4 fixtures. Per-game: schema check (confidence ∈ {high, medium, low}; category ∈ allowed set; collector_agent exact match), citation resolution (range hash + blob hash) for all non-fixture claims, negative-fixture presence with `expected_disposition` set, claim-count match against the evidence-final-report. |
| Class 3 — Blueprint Truth Contract | `T3BlueprintTruthContract` | One blueprint (`pilot-blueprint-batch-a.json`) covers all three games. Verify scene/state/transition/mechanic entries carry `backing`/`backing_claims` that resolve to ledger claim_ids. Verify zero `H[1-9]` ids appear as fact. Verify boundary declaration segregates cross-game similarity findings to `mapper-hypotheses-batch-a.md` with the literal substring `NON-AUTHORITATIVE HYPOTHES`. Verify `D_asset_usage_map` and `D_asset_usage_non_scene_surfaces` are populated for every game. Verify the `controlled-inclusion-source` fixture for SLO-MD-1 resolves to the magic-defense-controller import relationship. |
| Class 4 — Action/Defense Subject Contract (replaces `T3AbyssalWellHistoricalContract`) | N/A in pilot; new for Batch A | Verify wave/spawn mechanics: every mechanic claim cites a line in a known source file; combat-feedback claims cite game-over/boss-encounter logic; projectile claims cite projectile-spawn or projectile-hit logic; defense-zone claims cite base-health or zone-bounds logic. Also verify NO "AOE/area-of-effect" language is fabricated (mirror pilot's no-mana check). |
| Class 5 — Negative-Fixture Contract | `T3NegativeFixtureContract` | All 12 fixtures across the three games. Re-derive each `expected_disposition` from source: CD-NEG-001 (REJECT — uncited multiplier injection), CD-NEG-002 (REJECT — directory-only), CD-NEG-003 (REJECT — keyword-only responsive); MD-NEG-001 (FAIL with REAL citation; verify the cited controller.ts:48-60 range contains no multiplier branch — re-derive the FAIL disposition from the citation itself), MD-NEG-002 (REJECT — directory-only `/games/_shared/defense-template.tsx`), MD-NEG-003 (REJECT — matchMedia substring absent), MD-NEG-004 (REJECT — directory-only asset citation), MD-NEG-005 (REJECT — no Redis/zadd identifiers); WVZ-NEG-001 (REJECT — XP multiplier injection), WVZ-NEG-002 (REJECT — generic defense-template substitution), WVZ-NEG-003 (REJECT — matchMedia substring absent), WVZ-NEG-004 (REJECT — withdrawn-id membership). |
| Class 6 — Stop-Loss Contract | `T3StopLossContract` | Aggregate: total atomic claims = 326 (labeled integer check); zero unsupported factual claims; zero denominator mismatches against T2; zero failed fix/review cycles; zero unresolved Critical/High/Medium findings; ≤2 SLOs already resolved as conditional-item + exclusion (SLO-MD-1 + SLO-WVZ-1); receipt integrity gate green. |

### 3.2 What MUST be authored (concrete deliverables, by role)

The truth-test-author subagent (fresh context, `fork_turns=none`, `parent_ancestry_ids=[]`) produces **one pytest module** plus **one role receipt**:

- `measure/tracks/apk_corpus_audit_action_defense_20260712/batch-a-truth-tests.py` — six TestCase classes; runs under `PYTHONDONTWRITEBYTECODE=1 python3 -m pytest -q` with `exit 0`.
- `measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/truth-test-author-batch-a.json` — fresh-context attestation, prompt SHA-256, enumerated output hashes, gate-version pin (gate_version `phase4-v8-candidate`).

The requirements-mapper subagent (fresh context, `fork_turns=none`, `parent_ancestry_ids=[]`) produces **one blueprint**, **one hypothesis file**, **one final report**, and **one role receipt**:

- `measure/tracks/apk_corpus_audit_action_defense_20260712/pilot-blueprint-batch-a.json` — six sections per game (A scene/state blueprint, B mechanic/learning blueprint, C developer-effort decomposition, D asset-usage map, D asset-usage non-scene surfaces, F visible unknowns). Every `backing_claims` field resolves to a real claim_id in one of the three ledgers. Zero `H[1-9]` ids. Zero cross-cohort claim references.
- `measure/tracks/apk_corpus_audit_action_defense_20260712/mapper-hypotheses-batch-a.md` — six numbered hypotheses (H1..H6) each prefixed with `## H<n> —` and the literal banner `NON-AUTHORITATIVE HYPOTHESIS` on line 4. Cite ledger claim_ids only; never cite cross-cohort games.
- `measure/tracks/apk_corpus_audit_action_defense_20260712/mapper-final-report-batch-a.json` — counts: per-game scene counts, state counts, transition counts, mechanic counts, control-surface counts, asset-usage entries, test modules, visible-unknowns, six non-authoritative-hypothesis count, total structured claim references (expected ≈ 326 × ~2 = ~650; labeled integer).
- `measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/requirements-mapper-batch-a.json`.

The adversarial-reviewer subagent (fresh context, `fork_turns=none`, `parent_ancestry_ids=[]`) produces **one review report** and **one role receipt**:

- `measure/tracks/apk_corpus_audit_action_defense_20260712/batch-a-independent-review.json` — re-derives 5 random non-fixture claims per game = 15 total (`random.sample` with `seed 20260720` for reproducibility); re-verifies every one of 12 negative fixtures; records cross-ledger invariants (zero collisions, zero conflicting blob hashes, zero unresolved blueprint references); records `unresolved_blocking_findings: {critical: 0, high: 0, medium: 0}`.
- `measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/adversarial-reviewer-batch-a.json`.

The browser-auditor and asset-auditor subagents are **conditionally dispatched** per §5.3. For Batch A acceptance, the asset-auditor MUST produce **one record per game** (3 records, not per-path) showing whether real-input browser evidence is feasible and the asset-usage map lines up with the blueprint. Per-path forensic records are deferred to T8.

The orchestrator (delegated product-owner authority) writes **three** final artifacts:

- `measure/tracks/apk_corpus_audit_action_defense_20260712/candidate-cohort-manifest-batch-a.json` — non-consumable; binds truth-tests + review + receipt outputs.
- `measure/tracks/apk_corpus_audit_action_defense_20260712/product-owner-acceptance-batch-a.json` — tool-attested event id, exact candidate/review/gate hashes bound; records `conditional_open_items` for browser/asset audit (mirroring pilot precedent).
- `measure/tracks/apk_corpus_audit_action_defense_20260712/accepted-cohort-manifest-batch-a.json` — published only AFTER POA; `consumable: true`; carries the SHA-256 that binds into the T11 successor gate.

---

## 4. Test method

### 4.1 pytest discovery expected counts

The pilot truth-tests module produced exactly 41 tests across 6 classes. Batch A truth-tests is a separate pytest module; it is not the same file as the pilot. Pytest discovery yields the count for the Batch A module alone, not the cumulative count.

Expected Batch A pytest discovery: **at least 28 tests**, distributed as:
- Class 1 (Denominator): 4 tests — T2 hash pin, partition-coverage, per-game identity-ledger record presence, per-game source-denominator record count.
- Class 2 (Claim-Ledger): 12 tests — 3 games × (3 schema + 1 citation-resolution). 12 covers schema+resolution pairs.
- Class 3 (Blueprint): 6 tests — backing claims resolve, blueprint structure, hypothesis-as-fact guard, hypothesis segregation, asset-usage map presence, controlled-inclusion-source fixture resolves.
- Class 4 (Action/Defense Subject): 3 tests — one per game (wave/spawn/projectile/health-discipline).
- Class 5 (Negative-Fixture): 6 tests — re-derivation across 12 fixtures (combined where fixtures are co-class) plus MD-NEG-001 special-case (FAIL with REAL citation).
- Class 6 (Stop-Loss): 2 tests — total-claim-count labeled integer, zero-blocking-findings + receipt integrity.

The truth-test-author MUST assert these counts explicitly via `pytest --collect-only` in a unit test (mirrors pilot's `test_t2_phase0_3_modules_discover_exactly_86_tests`).

### 4.2 Environment

```
PYTHONDONTWRITEBYTECODE=1 python3 -m pytest -q \
  measure/tracks/apk_corpus_audit_action_defense_20260712/batch-a-truth-tests.py
```

No `conftest.py` under the track directory. No fixtures that mutate the working tree. No network. All git reads via `git show`, `git ls-tree`, `git cat-file -t`, `git merge-base --is-ancestor`. All file reads via `pathlib.Path.read_text` / `read_bytes`. No `subprocess.run` with `shell=True`.

### 4.3 Role prompt isolation requirements

Every role prompt that lands work in this track MUST include the following literal fields. The adversarial reviewer verifies these on every receipt:

| Field | Value (literal) |
|---|---|
| `schema_version` | `apk-role-receipt.v1` |
| `reviewer_isolation` | `fresh-context-only, inherited_narrative=false, fork_turns=none` |
| `parent_ancestry_ids` | `[]` (empty list, literal) |
| `fork_turns` | `"none"` (literal string, not Python None) |
| `inherited_narrative` | `false` (literal boolean) |
| `prompt_sha256` | 64-hex sha256 of the literal prompt bytes (no prose basis accepted) |
| `final_response_sha256` | 64-hex sha256 of the actual final response (no placeholders like `"PENDING-RECEIPT-BIND"`; missing field is A15-class) |
| `commit_sha` | 40-hex sha of the commit that owns the outputs |
| `output_paths` | list of relative paths from repo root |
| `output_hashes` | per-path 64-hex sha256; must match bytes at `commit_sha` |
| `budget_declaration.frozen_resource_ceiling` | numeric ceilings for `bytes_read`, `command_invocations`, `source_files` (or explicit `"unmeasured"` with explanation, NOT a placeholder) |

A receipt missing any of these fields, or carrying a placeholder value, fails Gate G-RR (§6) and the role's outputs are not acceptable for cohort acceptance. The original receipt is preserved as immutable; the role MUST issue a new receipt bound to a new commit (do not mutate the original).

### 4.4 Truth-test isolation requirements

- Truth-test-author prompt forbids inheriting mapper or collector narrative. Reviewer must be able to identify that the test module was authored from scratch (no shared prose with the pilot truth-tests other than mechanical structure).
- Tests do NOT assert "all 41 pilot tests still pass" — that is a pilot concern, not a Batch A concern. Tests do NOT import from `apk_three_game_truth_pilot_20260712`.
- Tests use `python3 -m pytest` discovery, not unittest's `python3 -m unittest discover`. The pilot used `unittest` import-time execution; this strategy authorizes `pytest` since the pilot's `truth_tests.py` docstring already documents `python3 -m pytest` invocation (line 14 of pilot `truth_tests.py`).

### 4.5 Adversarial-reviewer scope (concrete sampling)

Per-game: 5 random non-fixture claims, `random.sample` with `seed 20260720` (matches pilot precedent). For each sampled claim:

1. Run `git show <revision>:<file_path>` (or `git show <bind_commit>:<file_path>` for Batch A — see R-ALL-1).
2. SHA-256 the whole blob; assert equality with `blob_sha256`.
3. Decode bytes as UTF-8; split on `\n`; assert `1 <= line_start <= line_end <= len(lines)`.
4. SHA-256 the joined-bytes of `lines[line_start-1 : line_end]` with trailing newline AND without trailing newline; assert equality with `cited_range_sha256` in either form.
5. For binary-whole-file citations, assert `cited_range_sha256 == blob_sha256`.

Any mismatch is recorded as a blocking finding. The reviewer report MUST report exact hash matches for all 15 (or "mismatched_claim_ids": [...]).

Per-game: all negative fixtures are re-verified (not sampled) — every fixture's `expected_disposition` is re-derived from source via grep/ls-tree/show as appropriate.

---

## 5. Stop-loss points

### 5.1 Numeric thresholds

| Stop-loss counter | Batch A ceiling | Source |
|---|---|---|
| Games per evidence batch | 3 | program line 84; pilot precedent |
| Unsupported factual claims | 0 | program line 84; gate G-SL-1 |
| Denominator mismatches | 0 (SLO-MD-1 and SLO-WVZ-1 are resolved as conditional + exclusion, not counted as mismatches) | program line 84; gate G-SL-2; stop-loss-resolutions-batch-a.md |
| Failed fix/review cycles | 0 (per phase); 2 cumulative → escalate to product-owner | program line 86 |
| Unresolved Critical findings | 0 | program line 87; gate G-SL-3 |
| Unresolved High findings | 0 | program line 87; gate G-SL-3 |
| Unresolved Medium findings | 0 | program line 87; gate G-SL-3 |
| Resolved SLOs tolerated per batch | ≤2 (SLO-MD-1 + SLO-WVZ-1; if a 3rd SLO appears it is blocking pending POA) | this strategy §2 R-ALL-3 |
| Frozen resource ceiling violations | 0 per role receipt | program line 88 |
| Browser-evidence gap (deferred) | Tolerated as `conditional_open_items`; does NOT block acceptance | pilot precedent line 12; this strategy §5.3 |
| Per-path asset audit gaps | Tolerated as T8 carry-forward; per-game asset-usage map MUST be present | this strategy §2 R-ALL-8 |

### 5.2 1-SLO tolerance decision

The pilot had 0 SLO. Batch A has 2 resolved SLOs (SLO-MD-1 conditional-inclusion, SLO-WVZ-1 exclusion-by-byte-identicality). Both are resolved by `stop-loss-resolutions-batch-a.md` and trace to a documented rationale.

**Decision**: a 3rd SLO is blocking pending product-owner direction. Two SLOs is the absolute ceiling; any additional observation is escalated via `escalate_human` route. This is documented in `conditional_open_items` and recorded in `product-owner-acceptance-batch-a.json`.

### 5.3 Browser / asset audit deferral policy

Per `HANDOFF.md`, all three Batch A games are **current** (Castle Defense, Magic Defense, Wizard vs Zombie all have live routes in `apps/advantage-games` and host copies in `apps/reading-advantage`). The pilot deferred both browser and asset audits to a successor track.

**Decision for Batch A acceptance**:
- **Browser evidence**: deferred. Current routes are real but the environment does not yet have a deterministic browser runner; the asset-auditor must produce a real-input OR non-runnable-disposition record per game (3 records total, not per-path). Browser evidence per game becomes a T8/T11 successor requirement.
- **Per-path asset audit**: deferred to T8 (per-program successor track). The per-game asset-usage map (artifact D in blueprint) IS required for Batch A acceptance.
- **Per-game asset summary**: required. The asset-auditor produces one record per game (3 records) confirming (a) the asset-usage map lines up with the blueprint, (b) the asset paths exist at HEAD with the expected sha256, (c) the byte-identicality of SLO-WVZ-1 is recorded.

Rationale: the T3 pilot precedent (Phase 3 + Phase 4 deferred, conditional acceptance) sets the bar; Batch A's three games are all "current" but the testbed is the same environment that blocked pilot browser evidence. Carrying browser evidence into a separate successor track is consistent with the pilot precedent and avoids re-creating a runner inside Batch A.

### 5.4 Remediation budget

- **Per-phase fix/review cycles**: maximum **2**. On the 3rd failure of any gate, route to product-owner (escalate_human). Per program line 86: "Two failed fix/review cycles block the track pending product-owner direction."
- **Per-batch**: maximum 2 fix/review cycles per Batch A acceptance run. If the adversarial reviewer reports Critical/High/Medium findings, the orchestrator MUST either (a) request re-authoring once, then re-review once; (b) escalate to product-owner on the 3rd attempt.
- **Per-track**: unbounded — but every batch must close before the next opens (program line 22: "Complete and accept one batch before opening the next.").

---

## 6. Required gates

Eight gates must all be green before `accepted-cohort-manifest-batch-a.json` is published. Each gate's red condition blocks acceptance.

| ID | Gate | Red condition | Test or check |
|---|---|---|---|
| G-DN | Denominator hash pin | Any of the four predecessor hashes (T1 gate, T2 denom, T2 partition, T3 pilot) does not match the literal value in §1.1, OR T2 archive revision `da51b4e0` does not exist. | Class 1 denominator tests, frozen pin check |
| G-CL | Claim citation resolves | Any non-fixture claim in any of the three ledgers fails `resolve_claim_citation`. Total expected: 326. | Class 2 ledger tests |
| G-NF | Negative-fixture disposition re-derivable | Any of the 12 fixtures fails to re-derive `expected_disposition` from source. | Class 5 negative-fixture tests |
| G-BP | Blueprint backing_claims resolve | Any `backing` or `backing_claims` reference in `pilot-blueprint-batch-a.json` does not resolve to a ledger claim_id. Plus: any `H[1-9]` id appears as fact; any cross-cohort path appears; any `D_asset_usage_map` entry lacks backing_claims; `cross_game_similarity_findings` does not start with `"none"` and does not reference `mapper-hypotheses-batch-a.md` with `NON-AUTHORITATIVE HYPOTHES`. | Class 3 blueprint tests |
| G-SL | Stop-loss counters | Total claims ≠ 326 (labeled integer check), OR `unsupported_factual_claims > 0`, OR `denominator_mismatches > 0` (resolved SLOs do not count), OR `unresolved_blocking_findings != {critical: 0, high: 0, medium: 0}`, OR `failed_fix_review_cycles >= 1` for the current acceptance run. | Class 6 stop-loss tests |
| G-RR | Role-receipt integrity | Any of the five role receipts (3 collector + mapper + reviewer) lacks a required field, carries a placeholder (e.g., `"PENDING-RECEIPT-BIND"`, `"prose basis"`, prose-basis prompt_sha256), or its `output_hashes` do not match bytes-at-bind-commit. Note: IMP-CD-1 (Castle Defense receipt missing `final_response_sha256`), IMP-MD-1 (Magic Defense receipt placeholder), IMP-WVZ-1 (WVZ final_response_sha256 inconsistency) must be remediated by issuing a new receipt on a new commit BEFORE this gate is green. | Class 6 receipt-integrity sub-tests + adversarial reviewer verification |
| G-AS | Asset summary gate | Asset-auditor does not produce 3 per-game records (one per game). The records MUST confirm asset-usage map alignment with the blueprint. Per-path audit is OUT OF SCOPE; deferred to T8. | Adversarial reviewer verifies asset-auditor outputs exist with required fields |
| G-PO | Product-owner acceptance | `product-owner-acceptance-batch-a.json` is missing, OR `decision != "approve"`, OR `candidate_manifest_hash != sha256(candidate-cohort-manifest-batch-a.json)`, OR `review_report_hash != sha256(batch-a-independent-review.json)`, OR the approval event id is replayed/agent-authored. | Validator resolves approval event; orchestrator-audit's `evidence-integrity` gates chain (gate_version `phase4-v8-candidate`) |

All eight gates MUST be green. The accepted-cohort-manifest publishes only after G-PO is green; G-PO is the last gate.

---

## 7. Adversarial-reviewer scope (detailed)

The adversarial-reviewer subagent (fresh context, `fork_turns=none`, `parent_ancestry_ids=[]`) re-derives:

### 7.1 Claim re-derivations (15 total = 5 per game × 3 games)

Sampling: `random.sample` over each ledger's non-negative-fixture claims with `file_path` non-null, `seed 20260720` (matches pilot precedent). The reviewer records the sampled ids and the exact hashes for reproducibility.

| Game | Expected sampled ids (deterministic from seed) | Re-derivation expectation |
|---|---|---|
| castle-defense | 5 IDs from `castle-defense-claim-ledger.json`, non-fixture, with file_path | All 5 cite-range SHA-256 + blob SHA-256 match exactly |
| magic-defense | 5 IDs from `magic-defense-claim-ledger.json`, non-fixture, with file_path | All 5 match exactly |
| wizard-vs-zombie | 5 IDs from `wizard-vs-zombie-claim-ledger.json`, non-fixture, with file_path | All 5 match exactly |

Any mismatch is a **blocking finding**. The pilot precedent (`pilot-independent-review.json` `claim_rerun.exact_range_sha_match: 15`) requires 15/15.

### 7.2 Negative-fixture re-verification (12 total = exhaustive, not sampled)

Per-fixture independent corroboration:
- CD-NEG-001..003 — independently re-derive each `expected_disposition`.
- MD-NEG-001 — special case: FAIL with REAL citation. Re-derive by `git show` on `apps/reading-advantage/server/controllers/magic-defense-controller.ts` (lines 48-60 at bind commit `d119bbad`); assert no multiplier branch; assert XP formula matches the controller's actually-implemented logic.
- MD-NEG-002..005 — directory-only / matchMedia-absent / Redis-absent independently re-derive.
- WVZ-NEG-001..004 — XP multiplier / generic defense-template / matchMedia / withdrawn-id membership independently re-derive.

### 7.3 Cross-ledger invariants

- `claim_id_collisions_across_ledgers: 0` (no two ledgers share a claim_id).
- `conflicting_blob_sha256_for_same_revision_and_path: 0` (if two ledgers cite the same revision+path, they must agree on `blob_sha256`).
- `blueprint_ledger_claim_references_unresolved: 0` (every `backing_claims` in the blueprint resolves to one of the 326 ledger claim_ids).

### 7.4 What blocks acceptance

Any **Critical**, **High**, or **Medium** finding blocks. The reviewer must report zero findings in those buckets. Low / informational findings are recorded but do not block.

### 7.5 Auditor verification

The reviewer MUST also verify that the truth-test-author's pytest run produced 28+ tests with `exit 0`. Run the suite independently and record the result:

```
PYTHONDONTWRITEBYTECODE=1 python3 -m pytest -q \
  measure/tracks/apk_corpus_audit_action_defense_20260712/batch-a-truth-tests.py
```

Exit code MUST be 0. Summary line MUST contain `28 passed` (or the actual count, labeled integer). The reviewer records the exact summary line in the review report.

---

## 8. Successor hash binding

The accepted-cohort-manifest is the gate that unlocks downstream T8 (asset forensics), T9 (ontology synthesis), and T10 (independent acceptance & handoff). The binding is:

```
T4-Batch-A accepted-cohort-manifest:
  path: measure/tracks/apk_corpus_audit_action_defense_20260712/accepted-cohort-manifest-batch-a.json
  sha256: <computed by `sha256sum` after orchestrator writes the file>

The orchestrator writes this hash into measure/tracks.md:
  "Accepted Batch A hash: <sha256>"

T8 / T9 / T10 then read this hash as a predecessor binding alongside:
  - T1 evidence-integrity-accepted-gate.json (gate_version phase4-v8-candidate)
  - T2 accepted-denominator-manifest (sha256 d524171d...)
  - T2 accepted-partition-manifest (sha256 6badf73b...)
  - T3 accepted-pilot-manifest (sha256 cbf04753...)
  - T4-Batch-A accepted-cohort-manifest (sha256 <new>)
```

The accepted-cohort-manifest is published **only** when:
1. G-DN through G-PO are all green.
2. `product-owner-acceptance-batch-a.json` carries `decision: "approve"` (or `approve-conditional` mirroring pilot).
3. The orchestrator has committed the manifest atomically with its `sha256` recorded.
4. `measure/tracks.md` has been updated to reflect the new accepted hash.

A **revocation** triggers if any input changes (per `apk-evidence-reconstruction-program.md` line 162). Any subsequent edit to a role receipt, a ledger, or the blueprint revokes the acceptance.

---

## 9. References (exact paths)

### 9.1 Predecessor manifests (read-only)

| Artifact | Path |
|---|---|
| T1 evidence integrity gate | `measure/evidence-integrity-accepted-gate.json` |
| T2 accepted denominator manifest | `measure/archive/apk_source_denominator_inventory_20260712/accepted-denominator-manifest.json` (sha256 `d524171d...`) |
| T2 accepted partition manifest | `measure/archive/apk_source_denominator_inventory_20260712/accepted-partition-manifest.json` (sha256 `6badf73b...`) |
| T2 phase 1-3 frozen reports | `measure/archive/apk_source_denominator_inventory_20260712/phase{1,2,3}-green-test-report.json` |
| T2 phase 3 reconciliation | `measure/archive/apk_source_denominator_inventory_20260712/phase3-reconciliation.json` |
| T2 identity ledger | `measure/archive/apk_source_denominator_inventory_20260712/game-identity-ledger.json` |
| T2 source denominator | `measure/archive/apk_source_denominator_inventory_20260712/source-denominator.json` |
| T2 historical source denominator | `measure/archive/apk_source_denominator_inventory_20260712/historical-source-denominator.json` |
| T2 asset-file denominator | `measure/archive/apk_source_denominator_inventory_20260712/asset-file-denominator.json` (line 5837: `apps/advantage-games/public/wizard-vs-zombie.png`) |
| T2 scene-state denominator | `measure/archive/apk_source_denominator_inventory_20260712/scene-state-denominator.json` |
| T3 accepted pilot manifest | `measure/archive/apk_three_game_truth_pilot_20260712/accepted-pilot-manifest.json` (sha256 `cbf04753...`) |
| T3 pilot blueprint | `measure/archive/apk_three_game_truth_pilot_20260712/pilot-blueprint.json` |
| T3 pilot mapper-hypotheses | `measure/archive/apk_three_game_truth_pilot_20260712/mapper-hypotheses.md` |
| T3 pilot truth tests | `measure/archive/apk_three_game_truth_pilot_20260712/truth_tests.py` |
| T3 pilot review | `measure/archive/apk_three_game_truth_pilot_20260712/pilot-independent-review.json` |
| T3 pilot POA | `measure/archive/apk_three_game_truth_pilot_20260712/product-owner-acceptance.json` |
| T3 pilot role receipts | `measure/archive/apk_three_game_truth_pilot_20260712/role-receipts/` (5 files) |

### 9.2 Batch A in-flight artifacts (live track)

| Artifact | Path | sha256 (known) |
|---|---|---|
| Castle Defense ledger | `measure/tracks/apk_corpus_audit_action_defense_20260712/castle-defense-claim-ledger.json` | `ddb98a7c...` |
| Castle Defense method | `measure/tracks/apk_corpus_audit_action_defense_20260712/castle-defense-evidence-method.md` | `60d0aa3e...` |
| Castle Defense final report | `measure/tracks/apk_corpus_audit_action_defense_20260712/castle-defense-evidence-final-report.json` | `2666afae...` |
| Castle Defense receipt | `measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/evidence-collector-castle-defense.json` | (lacks `final_response_sha256` — see IMP-CD-1) |
| Magic Defense ledger | `measure/tracks/apk_corpus_audit_action_defense_20260712/magic-defense-claim-ledger.json` | `3ba47cb4...` |
| Magic Defense method | `measure/tracks/apk_corpus_audit_action_defense_20260712/magic-defense-evidence-method.md` | `187e916b...` |
| Magic Defense final report | `measure/tracks/apk_corpus_audit_action_defense_20260712/magic-defense-evidence-final-report.json` | `d1944621...` |
| Magic Defense receipt | `measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/evidence-collector-magic-defense.json` | (`final_response_sha256: "PENDING-RECEIPT-BIND"` — see IMP-MD-1) |
| Wizard vs Zombie ledger | `measure/tracks/apk_corpus_audit_action_defense_20260712/wizard-vs-zombie-claim-ledger.json` | `1cb9eac5...` |
| Wizard vs Zombie method | `measure/tracks/apk_corpus_audit_action_defense_20260712/wizard-vs-zombie-evidence-method.md` | `b58f1bea...` |
| Wizard vs Zombie final report | `measure/tracks/apk_corpus_audit_action_defense_20260712/wizard-vs-zombie-evidence-final-report.json` | `daa5a124...` |
| Wizard vs Zombie receipt | `measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/evidence-collector-wizard-vs-zombie.json` | (`final_response_sha256: c9111693...`, `commit_sha: 20af6417` — see IMP-WVZ-1 for bind stability) |
| Stop-loss resolutions | `measure/tracks/apk_corpus_audit_action_defense_20260712/stop-loss-resolutions-batch-a.md` | (this strategy's binding) |

### 9.3 Batch A artifacts to be authored (post-strategy)

| Artifact | Path |
|---|---|
| This strategy | `measure/tracks/apk_corpus_audit_action_defense_20260712/test-strategy-batch-a.md` (this file) |
| Mapper blueprint | `measure/tracks/apk_corpus_audit_action_defense_20260712/pilot-blueprint-batch-a.json` |
| Mapper hypotheses | `measure/tracks/apk_corpus_audit_action_defense_20260712/mapper-hypotheses-batch-a.md` |
| Mapper final report | `measure/tracks/apk_corpus_audit_action_defense_20260712/mapper-final-report-batch-a.json` |
| Mapper receipt | `measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/requirements-mapper-batch-a.json` |
| Truth tests | `measure/tracks/apk_corpus_audit_action_defense_20260712/batch-a-truth-tests.py` |
| Truth-test receipt | `measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/truth-test-author-batch-a.json` |
| Asset-auditor outputs | `measure/tracks/apk_corpus_audit_action_defense_20260712/asset-audit-batch-a.json` (3 per-game records) |
| Asset-auditor receipt | `measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/asset-auditor-batch-a.json` |
| Adversarial review | `measure/tracks/apk_corpus_audit_action_defense_20260712/batch-a-independent-review.json` |
| Adversarial reviewer receipt | `measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/adversarial-reviewer-batch-a.json` |
| Candidate cohort manifest | `measure/tracks/apk_corpus_audit_action_defense_20260712/candidate-cohort-manifest-batch-a.json` |
| Product-owner acceptance | `measure/tracks/apk_corpus_audit_action_defense_20260712/product-owner-acceptance-batch-a.json` |
| Accepted cohort manifest | `measure/tracks/apk_corpus_audit_action_defense_20260712/accepted-cohort-manifest-batch-a.json` |

### 9.4 Anti-pattern catalog

`measure/anti-patterns.md` (A1–A15); per-pattern defenses are in §2.1 above.

### 9.5 Orchestrator dispatch templates

`measure/tracks/apk_corpus_audit_action_defense_20260712/_orchestrator/DISPATCH.md`, `HANDOFF.md`. Plan template follows the dispatch's Phase 0-5 structure.

---

## 10. Phase Base SHA capture (orchestrator action)

**This strategy does NOT embed a `phase_base_sha`** because the strategy is a working-tree file at the moment of authoring and the post-commit SHA does not yet exist.

The orchestrator, upon receiving this strategy, MUST:

1. Commit this strategy file using the track-prefixed subject:
   ```
   chore(measure): test strategy for t4 batch-a (track_id: apk_corpus_audit_action_defense_20260712)
   ```
   (lower-case subject per commitlint hook; see evidence-final-report IMP notes about subject-case deviations).

2. **Immediately after the strategy commit**, capture the immutable `phase_base_sha` via:
   ```
   git rev-parse HEAD
   ```
   Record this SHA in `_orchestrator/LAST-BATCH-STATUS.md` and in the registry entry for T4.

3. Bind the post-strategy `phase_base_sha` into every subsequent role receipt as `phase_base_sha: "<sha>"` so the receipt chain is anchored to a known-good state. Any receipt whose `phase_base_sha` does not match the captured value is rejected.

4. Update `measure/tracks.md` T4 entry to add "Strategy committed; phase_base_sha = <sha>; ready to dispatch mapper."

5. Proceed to dispatch the requirements-mapper subagent per `_orchestrator/DISPATCH.md` §orchestrator-dispatch-sequence step 4.

---

## 11. Out of scope (explicit)

- **Batches B and C** (Village Guardian, Archer's Revenge, Storm the Castle Tower, Paladin's Twin-Soul, Gryphon Patrol). Each batch gets its own strategy.
- **T5 / T6 / T7 cohort tracks**. They inherit the role contract but not this strategy.
- **T8 per-path asset forensics**. Deferred per pilot precedent. Per-game summary IS in scope.
- **Browser evidence per game**. Deferred per pilot precedent and §5.3.
- **Cross-cohort ontology claims**. Forbidden by `apk-evidence-cohort-protocol.md` line 22 and by §2.2 R-ALL-6.
- **The failed `apk_cross_game_asset_ontology_20260712` artifacts**. Quarantined negative evidence; not consumable.

---

## 12. Failure modes and rollback

If any gate G-DN through G-PO fails, the orchestrator MUST:

1. NOT publish `accepted-cohort-manifest-batch-a.json`.
2. Record the failure in `_orchestrator/LAST-BATCH-STATUS.md` with the gate id and red condition.
3. Update the T4 entry in `measure/tracks.md` to reflect the failure truthfully (A6).
4. Either (a) request re-authoring once, then re-review once (≤2 cycles); (b) escalate to product-owner on the 3rd attempt.
5. Any revoked acceptance must propagate a revocation event recorded in `_orchestrator/REVOCATION-LOG.md`.

---

## 13. Acceptance of this strategy

This strategy is a working-tree artifact at the moment of authoring. It is NOT a "complete" measure plan until the orchestrator commits it and captures the post-commit SHA. The orchestrator's commit + phase_base_sha capture is the formal acceptance of this strategy; from that point forward, the truth-test-author's prompt MUST bind to the captured `phase_base_sha`.
