# Mapper Hypotheses — T4 Batch A Cycle 2 Clean Rewrite

**Role:** requirements-mapper (`requirements-mapper:t4-batch-a:v2:2026-07-20`)
**Status:** NON-AUTHORITATIVE MAPPING HYPOTHESES — this document maps tests to contracts; it does not add gameplay facts or claim acceptance.

## Scope and clean-rewrite boundary

This Cycle 2 mapping consumes only the 110-record Magic Defense v2 ledger, the
77-record Wizard vs Zombie v2 ledger, their v2 reports and collector receipts,
the superseding Wizard vs Zombie receipt, and the v2 truth-test module and
receipt. Castle Defense is not part of the 187-claim rewrite.

The v1 blueprint is shape reference only. Its SHA-256 is
`5d3b0c574897bfcd2c6b438d8b6efd6ffed6cc20414284cf53858955b1865657`.
It is superseded because that blueprint cited 10 fabricated claim IDs. No factual entry is copied from
that blueprint, and this document intentionally does not enumerate or cite its
claim references.

## Evidence posture

- Magic Defense: 110 records = 105 factual + 5 negative fixtures. All 105
  factual citations resolve through the imported resolver.
- Wizard vs Zombie: 77 records = 73 factual + 4 negative fixtures. All 73
  factual citations resolve through the imported resolver.
- Combined: 187 records = 178 factual + 9 fixtures; 0 duplicate ids across the
  two v2 ledgers; 0 unresolved factual citations.
- The v2 module passes 47 tests and 189 subtests at the current role base.

## Test-to-strategy map: all 47 tests

The “contract” column names the strategy obligation actually exercised by each
test. “Gate” is the closest gate in `test-strategy-batch-a.md`. A gate marked as
a precondition is not a substitute for testing the newly authored blueprint or
for downstream asset/reviewer receipts.

### 1. `BatchADenominatorTruthContract` — 7 tests

| Test | Strategy contract | Gate |
|---|---|---|
| `test_magic_defense_declares_claim_ledger_v2_schema` | Ledger schema and Mode A envelope are explicit. | G-DN precondition |
| `test_wizard_vs_zombie_declares_claim_ledger_v2_schema` | Mode B raw-list shape is bound through its report and receipt rather than an invented schema field. | G-DN precondition |
| `test_v2_ledger_claim_counts_are_110_and_77` | Frozen two-game denominator is exactly 187 records. | G-DN / G-SL |
| `test_claim_ids_are_unique_within_each_ledger` | Stable ids are unique within each game ledger. | G-CL precondition |
| `test_claims_carry_required_identity_and_confidence_fields` | Minimum claim-evidence identity contract is present. | G-CL precondition |
| `test_present_hashes_are_lowercase_sha256` | Citation digests use canonical SHA-256 representation. | G-CL precondition |
| `test_collector_reports_bind_modes_a_and_b_to_v2_outputs` | Labeled report totals and remediation modes bind to the v2 outputs. | G-DN / G-RR |

**Hypothesis strength:** strong for the 187-record remediation denominator and
ledger shape. It is only partial for strategy G-DN because none of these tests
re-hashes all T1/T2/T3 predecessor artifacts or checks the T2 archive revision.

### 2. `BatchAClaimLedgerTruthContract` — 6 tests

| Test | Strategy contract | Gate |
|---|---|---|
| `test_magic_defense_non_fixture_citations_resolve` | Every one of 105 Magic Defense factual citations resolves. | G-CL |
| `test_wizard_vs_zombie_non_fixture_citations_resolve` | Every one of 73 Wizard vs Zombie factual citations resolves. | G-CL |
| `test_magic_defense_cited_ranges_match_exact_bytes` | Populated range hashes match exact source bytes. | G-CL |
| `test_wizard_vs_zombie_cited_ranges_match_exact_bytes` | Populated range hashes match exact source bytes. | G-CL |
| `test_magic_defense_blob_hashes_match_full_files` | Populated blob hashes match whole source files. | G-CL |
| `test_wizard_vs_zombie_blob_hashes_match_full_files` | Populated blob hashes match whole source files. | G-CL |

**Hypothesis strength:** strong. These are the direct falsification surface for
the cycle-1 failure class and provide exact-byte, not merely structural,
verification.

### 3. `BatchABlueprintTruthContract` — 9 tests

| Test | Strategy contract | Gate |
|---|---|---|
| `test_magic_defense_revisions_stay_at_strategy_sources` | Magic Defense citations stay at the baseline or its approved historical revision. | G-BP precondition |
| `test_wizard_vs_zombie_revisions_stay_at_baseline` | Wizard vs Zombie clean-rewrite citations stay at the baseline. | G-BP precondition |
| `test_magic_defense_line_ranges_stay_inside_files` | Text ranges remain inside cited files. | G-BP / G-CL precondition |
| `test_wizard_vs_zombie_line_ranges_stay_inside_files` | Text ranges remain inside cited files. | G-BP / G-CL precondition |
| `test_magic_defense_file_paths_stay_in_strategy_roots` | Paths stay relative and inside approved source roots. | G-BP precondition |
| `test_wizard_vs_zombie_file_paths_stay_in_strategy_roots` | Paths stay relative and inside approved source roots. | G-BP precondition |
| `test_binary_claims_use_zero_zero_whole_file_anchors` | Binary assets use the v2 whole-file anchor convention. | G-AS / G-BP precondition |
| `test_quarantined_path_is_only_an_uncited_negative_evidence_marker` | Quarantined ontology output cannot become primary evidence. | G-BP |
| `test_asset_claim_anchor_surface_is_green` | All 26 asset records have exact source-backed envelopes. | G-AS |

**Hypothesis strength:** strong for source-boundary and asset-anchor
preconditions, but weak for the blueprint artifact itself. The module never
opens `batch-a-blueprint-v2.json`, because that output did not exist when the
tests were authored. A post-mapper truth test must validate this file before
G-BP can be called fully green.

### 4. `BatchAActionDefenseSpecificContract` — 9 tests

| Test | Strategy contract | Gate |
|---|---|---|
| `test_magic_defense_fixture_ids_are_preserved` | All five Magic Defense fixtures remain present exactly once. | G-NF |
| `test_wizard_vs_zombie_fixture_ids_are_preserved` | All four Wizard vs Zombie fixtures remain present exactly once. | G-NF |
| `test_md_neg_001_remains_fail` | The real-citation false-mechanic fixture remains FAIL and is source-rederived. | G-NF |
| `test_md_neg_002_remains_reject` | The uncited generic-template fixture remains REJECT. | G-NF |
| `test_md_neg_003_remains_reject` | The absent-responsive-API fixture remains REJECT with exact source support. | G-NF |
| `test_md_neg_004_remains_reject` | The directory-only asset fixture remains REJECT. | G-NF |
| `test_md_neg_005_remains_reject` | The uncited data-store fixture remains REJECT. | G-NF |
| `test_all_wvz_fixtures_remain_reject` | All four Wizard vs Zombie fixtures retain REJECT disposition. | G-NF |
| `test_every_populated_fixture_citation_still_matches` | Every populated fixture envelope remains exact. | G-NF / G-CL |

**Hypothesis strength:** strong in the two-game remediation scope. The full
three-game strategy named 12 fixtures; this rewrite deliberately excludes the
three Castle Defense fixtures with Castle Defense itself.

### 5. `BatchANegativeFixtureContract` — 6 tests

| Test | Strategy contract | Gate |
|---|---|---|
| `test_no_duplicate_claim_ids_across_v2_ledgers` | No id collision crosses the two v2 ledgers. | G-SL / G-CL precondition |
| `test_phase3_totals_align_with_claim_totals` | Frozen phase total equals 187. | G-SL |
| `test_claim_totals_match_ledger_counts` | Declared game totals match actual ledger lengths. | G-SL |
| `test_report_claim_totals_match_ledgers` | Labeled report totals match each ledger. | G-SL |
| `test_report_category_counts_match_ledgers` | Category counters are mechanically reproducible. | G-SL |
| `test_fixture_and_factual_subtotals_sum_to_claim_totals` | Factual plus fixture subtotals reconcile exactly. | G-SL / G-NF |

**Hypothesis strength:** strong for count integrity. The class name is inherited
from the six-class shape, but these tests primarily exercise cross-ledger and
report reconciliation rather than fixture semantics.

### 6. `BatchAStopLossContract` — 10 tests

| Test | Strategy contract | Gate |
|---|---|---|
| `test_md_v1_bad_ids_have_corrected_v2_envelopes` | Both detected Magic Defense defects have explicit, exact v2 supersession. | G-SL / G-CL |
| `test_wvz_v1_bad_ids_have_different_v2_content` | All ten Wizard vs Zombie defects have explicit old/new correction records and exact v2 envelopes. | G-SL / G-CL |
| `test_corrected_claims_contain_no_v1_placeholder_hashes` | Known fabricated placeholder hashes cannot survive remediation. | G-SL / G-CL |
| `test_magic_defense_v2_receipt_hashes_outputs_at_commit` | Magic Defense receipt output hashes match committed bytes. | G-RR |
| `test_wvz_v2_receipt_hashes_outputs_at_commit` | Wizard vs Zombie receipt output hashes match committed bytes. | G-RR |
| `test_ca423fbb_mutation_is_acknowledged_by_supersede_receipt` | The A15 receipt mutation is append-only acknowledged and superseded. | G-RR |
| `test_v2_receipts_preserve_fresh_context_isolation` | Collector and supersede receipts retain literal isolation fields and valid hashes. | G-RR |
| `test_receipt_bind_commits_are_immutable_ancestors` | Collector receipt bind commits are immutable ancestors of the role base. | G-RR |
| `test_stop_loss_counters_are_zero_after_v2_corrections` | Unsupported claims, denominator mismatches, failed cycles, and unresolved blockers are zero in collector scope. | G-SL |
| `test_predecessor_truth_test_and_phase_bindings_are_preserved` | Phase and cycle-1 detection bindings remain present in the v2 reports/receipts. | G-DN / G-RR |

**Hypothesis strength:** strong for collector-receipt integrity and remediation
stop-loss state. Full G-RR remains open until this mapper receipt is bound and a
future adversarial-reviewer receipt exists.

## Gate backing by v2 ledger categories

| Gate | Ledger/category backing | Receipt backing | Current conclusion |
|---|---|---|---|
| G-DN | 25 identity + 15 route records; 187-record frozen total | Both collector receipts and truth-test receipt | Partial: phase/remediation binds tested; full T1/T2/T3 hash-pin contract not rerun. |
| G-CL | All 178 factual records across every category | Truth-test receipt records 178 resolved, 0 unresolved | Green in Cycle 2 scope. |
| G-NF | 9 `negative_fixture` records | Both collector reports/receipts | Green in Cycle 2 scope. |
| G-BP | Mechanical inventory of all 187 records and 12 category labels | Truth-test receipt supplies source-boundary preconditions | Open: the new blueprint itself is not loaded by the 47-test suite. |
| G-SL | 187 = 178 factual + 9 fixtures; reports reproduce all category counts | Collector and truth-test findings report zero unresolved citation blocker | Green in Cycle 2 scope. |
| G-AS | 26 asset records, all exact-byte anchored | Truth-test receipt marks asset anchors green in scope | Partial: downstream three-record asset-auditor summary is absent. |
| G-RR | Ledger hashes bound by collector receipts | Two collector receipts, one supersede receipt, one truth-test receipt | Partial: mapper bind and adversarial-reviewer receipt remain pending. |

## Difference in blueprint-hypothesis strength: v1 versus v2

1. **Evidence exactness:** v1 had structurally resolvable references but cited
   10 fabricated claim IDs.
   V2 starts from 178/178 exact-byte-resolving factual citations.
2. **Scope:** v1 attempted a three-game, feature-rich blueprint. V2 is narrower:
   only the two remediated games and 187 records. This makes v2 stronger inside
   its stated scope but unsuitable as a replacement for Castle Defense mapping.
3. **Inference boundary:** v1 embedded gameplay-level scene/mechanic prose.
   V2 limits itself to mechanical category/evidence/gate inventories and adds no
   novel factual proposition.
4. **Negative evidence:** v2 preserves and re-derives all nine fixtures in its
   scope, including exact hashes where populated. This is stronger than merely
   checking fixture membership.
5. **Receipt integrity:** v2 binds collector output bytes and records the prior
   receipt mutation through an append-only supersede receipt. That closes the
   known collector-scope A15 defect.
6. **Remaining weakness:** a green pre-mapper suite cannot truth-test an output
   written afterward. G-BP requires a post-mapper test, while G-AS and full G-RR
   require downstream roles. Passing 47/47 therefore supports the inputs, not
   final Batch A acceptance.

## Concerns to carry forward

- G-DN is not fully reproduced by the v2 suite: the four predecessor hashes and
  archive revision required by the strategy are not all independently asserted.
- G-BP has no test that opens the new v2 blueprint.
- G-AS has exact asset anchors but not the strategy's three per-game auditor
  summaries; the two-game rewrite cannot supply a Castle Defense summary.
- G-RR is green only for collector/supersede inputs. Mapper binding and a fresh
  adversarial-reviewer receipt are still required.
- The Magic Defense collector receipt discloses that no numeric resource ceiling
  was supplied, and the Wizard vs Zombie and truth-test receipts use
  `unmeasured`. Program-level budget acceptance therefore needs explicit
  orchestrator/reviewer treatment rather than silent promotion.

No cross-game capability, ontology, standardization, or asset-suitability
conclusion is proposed by this document.
