# Phase 0 Test Strategy: APK Special and Historical Evidence Cohort

Track: `apk_corpus_audit_special_historical_20260712`  
Plan phase: **Phase 0: Freeze cohort and roles**  
Strategy role: fresh `measure-strategy`; strategy-only authorship  
Supplied strategy baseline SHA: `a49ebcc4dc3b3792a96b5b114d729b0b542af0fe`  
Supplied strategy role-base SHA: `a49ebcc4dc3b3792a96b5b114d729b0b542af0fe`

This file defines source-neutral contracts. It makes no claim that a game has a
particular route, implementation, mechanic, state, asset, historical revision, or
runnable disposition. Names and focus phrases inherited from the specification are
search assignments, not established source facts.

## 1. Immutable scope and predecessor bindings

The accepted partition assigns exactly these five identities to this cohort. Work is
frozen into two ordered batches:

1. **Batch A (three games):** Griffin Sky-Joust, Realm Carver, Devourer Slime.
2. **Batch B (two games):** The Haunted Library, Babel Architect.

Batch A must complete its independent review and exact-hash acceptance chain before
any Batch B source work starts. No game may move between batches, be merged, split,
renamed, omitted, or added by catalog prose, generated reports, discovery results, or
analogy. The specification's aerial-combat, territory-capture, growth/consumption,
multi-floor haunted-library, and sentence-construction phrases are hypotheses to
verify or refute; they are not implementation facts.

Before source work, B0 recomputes and exact-matches these read-only bindings:

| Accepted input | Path | Required SHA-256 / value |
|---|---|---|
| T1 accepted evidence-integrity gate | `measure/evidence-integrity-accepted-gate.json` | `d9f5c4771a755bae72c037fdbed6e330e523e9f2fabf60010154b981bfb283a3`; version `phase4-v8-candidate`; commit `5aea360f94f978ac78e590e0a64d33d176beaa1a` |
| T2 accepted denominator | `measure/archive/apk_source_denominator_inventory_20260712/accepted-denominator-manifest.json` | `d524171dbc412a213ed4be7ad7a77e2eb404e7c5bf4a5debe2ad68dd121b5729` |
| T2 accepted partition | `measure/archive/apk_source_denominator_inventory_20260712/accepted-partition-manifest.json` | `6badf73b625567b3fc6d4558c52ab68bd0e4fe2fb3afe3792aca4126df2d27b0` |
| T3 accepted pilot | `measure/archive/apk_three_game_truth_pilot_20260712/accepted-pilot-manifest.json` | `cbf04753aa21b0c43999ea202b718573616472a16dce94961242fdcb0260ca1b`; `consumable: true`; `revoked: false` |
| T2 source comparison baseline | accepted T2 manifests | `23bb5ad578c01fb29f9e8bb76a7d934d24a4b286` |
| This strategy's supplied baseline and role base | orchestrator prompt and Git HEAD at strategy entry | `a49ebcc4dc3b3792a96b5b114d729b0b542af0fe` |

The accepted action/defense cohort is a sibling T4 output, not this track's declared
predecessor and not factual input. The failed monolithic ontology track remains
quarantined and may appear only as explicitly labeled negative/failure evidence.

## 2. Commit-before-source phase-base rule

This strategy role does **not** commit and cannot truthfully state the future
`phase_base_sha`. The orchestrator must preserve unrelated work and perform this exact
sequence:

1. Commit only this strategy file.
2. Immediately run `git rev-parse HEAD^{commit}`. That full post-strategy commit is
   the immutable `phase_base_sha`.
3. Record the phase base in every Phase-0 freeze artifact, prompt, role admission,
   receipt, test report, review, and later candidate/acceptance artifact.
4. Capture a separate full `role_base_sha` immediately before every role dispatch.
5. Only after B0 is green may any role inspect game source or history.

The supplied `a49ebcc4dc3b3792a96b5b114d729b0b542af0fe` is the strategy entry baseline and
role base. It must not be copied into `phase_base_sha` unless it is also, by exact Git
verification, the post-strategy commit; no future hash may be guessed or shortened.

## 3. Required role topology and ownership

The orchestrator must publish a machine-readable applicability/task-ownership
manifest before dispatch. Every task records `owner_role`, `reviewer_role`,
`forbidden_roles`, allowed-input-manifest SHA-256, expected output paths, batch, game
when applicable, phase base, and role base.

The following roles are distinct and mandatory:

1. **Discovery auditor:** one fresh session per batch; reconciles accepted denominator
   ownership and candidate source locations but authors no implementation claims.
2. **Current-source specialists:** one fresh session per game (five sessions); inspect
   only the frozen current revision and author exact current-source observations.
3. **Historical-source specialists:** one fresh session per game (five sessions);
   author revision reachability, deletion/change chronology, and exact historical
   source observations.
4. **Evidence collectors:** one fresh session per game (five sessions); reconcile the
   discovery/current/history inputs into atomic claim ledgers without inventing facts.
5. **Requirements mappers:** one fresh session per game (five sessions); map only
   accepted claim IDs into scene/state/transition, mechanic/learning,
   developer-effort, responsive, asset-usage, conflict, hypothesis, and unknown
   records. Mappers may not add source facts or decide the final capability ontology.
6. **Browser auditors:** one fresh session per game after a mechanically reviewed
   runnable disposition; author live evidence or a complete non-runnable disposition.
7. **Truth-test authors:** one fresh session per batch; author source-semantic,
   chronology, artifact, receipt, browser, and acceptance contracts, but no evidence
   or mappings.
8. **Adversarial reviewers:** one fresh batch-level session with provider-attested
   `fork_turns="none"`, or retained raw-export proof of no inherited pre-prompt turns;
   independently reconcile every game, not a sample of games.

The root may coordinate, commit independently authored outputs, and render manifests.
It may not substitute for any listed role. For one game/package, discovery,
current-source, historical-source, collector, mapper, browser, truth-test, and review
ownership are pairwise incompatible. A reviewer cannot repair reviewed bytes; fixes
return to the owning isolated role and require a new review.

Every output-producing role requires an append-only `apk-role-receipt.v1` containing
the program's spawn/ancestry/event/timestamp fields, exact prompt and context-manifest
hashes, allowed-input hash, prior-role history, final-response hash, output paths and
hashes, findings, numeric usage, budget-declaration hash, full phase/role/commit SHAs,
and isolation proof. Placeholders, copied IDs, stale hashes, mutable receipts, or prose
standing in for tool proof fail closed. Reviewed changes require a superseding receipt;
the original remains immutable (A15).

## 4. Frozen resource budgets

All ceilings below are inclusive, use labeled JSON integers, and are frozen before
source work. Actual usage uses the same keys and units. Booleans, dates, digit-bearing
prose, negative values, missing fields, or `unmeasured` fail B0 or the affected later
gate. A ceiling change requires prior product-owner approval and invalidates affected
candidate bytes.

| Role invocation | `source_bytes_read` | `source_objects_read` | `command_invocations` | `elapsed_minutes` | Additional ceiling |
|---|---:|---:|---:|---:|---|
| Discovery auditor, per batch | 16,777,216 | 160 | 100 | 120 | `records_authored: 300` |
| Current-source specialist, per game | 33,554,432 | 240 | 150 | 240 | `observations_authored: 300` |
| Historical-source specialist, per game | 67,108,864 | 600 | 300 | 360 | `revision_metadata_examined: 2744`; `observations_authored: 400` |
| Evidence collector, per game | 33,554,432 | 240 | 160 | 300 | `claims_authored: 500`; `negative_fixtures: 10` |
| Requirements mapper, per game | 16,777,216 | 160 | 120 | 240 | `mapped_records: 500`; `hypotheses: 50` |
| Browser auditor, per game | 8,388,608 | 80 | 100 | 240 | `browser_interactions: 240`; `captured_artifacts: 80`; `viewports: 2` |
| Truth-test author, per batch | 67,108,864 | 500 | 300 | 360 | `test_cases: 200`; `assertions_executed: 5000` |
| Adversarial reviewer, per batch | 134,217,728 | 1000 | 500 | 480 | `claims_machine_checked: 1500`; `claims_manually_rederived: 500`; `fixtures_rederived: 50` |

Per-batch aggregate ceilings are `source_bytes_read: 536870912`,
`command_invocations: 2500`, `elapsed_role_minutes: 5000`, and
`captured_artifacts: 500`. The game-count ceilings are exactly three for Batch A and
exactly two for Batch B. Reaching a ceiling without completing the contract is a
truthful stop, not permission to narrow coverage.

## 5. Frozen chronology search bounds

Chronology is bounded to the committed ancestry of the supplied baseline:

| Bound | Frozen value |
|---|---|
| Inclusive upper/current revision | `a49ebcc4dc3b3792a96b5b114d729b0b542af0fe` |
| Accepted denominator comparison revision | `23bb5ad578c01fb29f9e8bb76a7d934d24a4b286` (must remain an ancestor of the upper revision) |
| Inclusive reachable root | `029261b617143c1773b724b86d54375cd47cb5d2` |
| Maximum reachable commit metadata records | `2744` (`git rev-list --count` at the upper revision) |
| Allowed revision set | exactly commits emitted by `git rev-list a49ebcc4dc3b3792a96b5b114d729b0b542af0fe` |

No later commit, worktree byte, stash, reflog-only object, unreachable object, remote-only
revision, or working-directory fallback is evidence. Current-source claims resolve at
the inclusive upper revision. Historical-source claims resolve at an exact reachable
ancestor and include full revision, path, blob SHA-256, inclusive cited range and
range SHA-256, plus ancestry/change evidence. Commit timestamps are display metadata;
graph ancestry determines ordering when possible, and incomparable branches remain an
explicit conflict.

The historical search order is frozen: accepted T2 exact historical locators first;
then identity/path history including rename/delete status within the allowed set; then
bounded content search within that same set. Search stops only when every assigned
denominator item is resolved or explicitly unknown, or a numeric ceiling/stop-loss is
hit. A historical claim is invalid if its revision is unreachable or its exact bytes
cannot be reproduced.

## 6. Evidence-class separation contract

Every factual or unknown record has exactly one `source_class` from this closed set:

| Class | What it can establish | What it cannot establish |
|---|---|---|
| `current_implementation` | Exact source behavior at the frozen upper revision; live behavior only with separate browser corroboration | Historical behavior, intended behavior, or behavior absent from its anchor |
| `historical_implementation` | Exact implementation behavior at a reachable ancestor | Current behavior or future shipping intent |
| `active_specification` | An active requirement or intended behavior at its cited revision | Implemented or runnable behavior |
| `catalog_prose` | The exact wording and existence of a catalog description | Detailed mechanics, states, routes, assets, responsiveness, or implementation |
| `cancelled_design` | A cited proposal/design and evidence that its tracked disposition is cancelled | Any implementation fact, current behavior, or shipment |
| `unknown` | The bounded absence/conflict and the proposition that remains unresolved | A positive fact or analogy-based replacement |

Tests, generated reports, browser observations, and negative fixtures are evidence
methods/artifacts, not substitutes for these classes. Each atomic proposition has its
own exact envelope and class. Compound claims are split. Interpretation is separate
from extracted source fact. Conflicts preserve all classed records and are reconciled
chronologically without convenient-source precedence: current does not erase history,
history does not establish current behavior, specification does not prove
implementation, catalog prose never proves detailed mechanics, and cancelled work is
design evidence only. Missing behavior stays `unknown` and blocks dependent Must-have
conclusions.

## 7. Truth, fixture, history, and browser test method

The truth-test author creates one batch module per batch. Automated checks cover 100%
of factual fields, exact source envelopes, denominator assignments, conflicts,
chronology records, role receipts, budgets, fixtures, browser records, and acceptance
bindings. Hash validity proves byte identity only; semantic tests must show that each
anchor establishes every atom claimed.

Each game requires six core negative fixtures, one for each failure class:

1. catalog prose promoted to a detailed mechanic;
2. cancelled design promoted to implementation;
3. active specification promoted to current behavior;
4. historical implementation promoted to current behavior;
5. missing evidence filled by analogy;
6. hash-valid but semantically overstated or compound source claim.

All fixtures are independently re-derived and never count toward factual coverage.
Additional fixtures are allowed only within the frozen per-role ceiling and are also
re-derived exhaustively. Filters use exact IDs/paths; bare English exclusion words are
forbidden.

The fresh adversarial reviewer machine-checks every record and manually re-derives:

- every historical-implementation, cancelled-design, chronology-conflict, changed,
  deleted, and unknown-dependent conclusion;
- every negative fixture and every claim changed after review;
- every candidate/review/approval binding;
- for remaining factual claims in each game, `max(10, ceil(10% of the population))`,
  stratified across every populated source class, evidence method, scene/state shape,
  route/API shape, responsive shape, asset shape, and cited revision class.

The deterministic sample seed is SHA-256 of the frozen per-game package SHA-256 plus
the normalized identity label. Population, algorithm, seed, and selected IDs are
recorded. One mismatch invokes the unsupported-claim stop-loss for the whole batch.

### Browser evidence

After current-source review establishes a mechanically reviewed disposition, every
runnable current implementation requires browser evidence in compact and wide
viewports, with actual application input paths and source-discovered state transitions;
screenshots alone fail. A non-runnable disposition requires attempted command,
environment, route candidate, revision, exact failure, logs, and independent review.
Setup or test failure never silently waives browser work.

**Kimi WebBridge is preferred** because it operates the user's real browser session.
The browser receipt must record whether Kimi was used and its health. If unavailable,
the auditor records the failed Kimi attempt and may use a declared browser adapter only
if it preserves the same evidence contract; the substitution is a disclosure, not a
silent equivalence.

All automated browser inputs, including Kimi-issued clicks, keys, pointer actions, and
touch emulation, are synthetic automation. Each record must disclose that they can
exercise application event paths but do not prove physical-device ergonomics,
hardware keyboard/touch behavior, OS/browser combinations not run, assistive-technology
behavior not run, real-user timing, production identity/persistence, or external
network behavior unless separately observed. Test data and mocked boundaries are
listed exactly; a mocked or directly mutated state cannot prove a real transition.

## 8. B0 source-work admission gate

The Mid-Red role authors a source-neutral
`phase0-freeze-tests.py`. The orchestrator/Green role authors only the following
freeze artifacts plus fresh receipts before source work:

- `phase0-predecessor-bindings.json`;
- `phase0-scope-batches.json`;
- `phase0-role-applicability-ownership.json`;
- `phase0-budget-declaration.json`;
- `phase0-chronology-bounds.json`;
- `phase0-stop-loss.json`.

The focused contract is:

```bash
PYTHONDONTWRITEBYTECODE=1 python3 -m pytest -q \
  measure/tracks/apk_corpus_audit_special_historical_20260712/phase0-freeze-tests.py \
  -k Phase0FreezeContract
```

The intentional Red is absence or exact invalidity of one of those freeze artifacts;
syntax/import/tooling errors are not valid Red. Green requires all of the following:

- exact predecessor bytes/status/revocation fields and supplied baseline/role base;
- exact ordered batches with positive cardinalities `3` and `2` and five unique
  accepted partition identities;
- the complete pairwise-incompatible role matrix, positive task/output counts, and
  no root substitution;
- every numeric budget and same-unit accounting schema;
- exact chronology upper/root/count/allowed-set rules and ancestor checks;
- closed evidence classes and explicit catalog/specification/cancelled/current/
  historical/unknown prohibitions;
- stop-loss thresholds and candidate/acceptance ordering;
- strategy committed first and full post-strategy `phase_base_sha` present everywhere;
- no game-source path, mechanic, route, runtime, historical, or asset assertion in a
  Phase-0 freeze artifact.

B0 closeout reruns the focused contract plus:

```bash
bash tests/orchestrator_supervisor_invariants.sh && \
bash tests/orchestrator_marker_vocabulary.sh && \
bash tests/orchestrator_review_execution_truthfulness.sh && \
bash tests/orchestrator_detector_syntax.sh && \
bash tests/orchestrator_catalog.sh && \
bash tests/orchestrator_role_receipt_integrity.sh
```

Every command, exit code, and labeled test count is retained. Detector exit `2` is a
failure. B0 is not proof of any game behavior; it only admits later source work.

## 9. Later batch gates and stop-loss

For each batch, later truth modules must provide separately reported artifact/source,
historical/chronology, and live-browser results. The minimum gates are:

1. denominator coverage exactly once;
2. current and historical source semantic truth;
3. class separation and conflict chronology;
4. claim ledger and mapper backing-ID completeness;
5. exhaustive fixture refutation;
6. runnable/non-runnable browser disposition and synthetic-input disclosure;
7. receipt/isolation/budget integrity;
8. fresh full-batch adversarial review;
9. exact candidate/product-owner/accepted lifecycle.

Stop immediately on one unsupported/fabricated claim, one denominator mismatch, one
unreachable/stale historical citation, one class-promotion violation, one unassigned or
duplicate denominator item, one budget breach/`unmeasured` role, one stale/missing
receipt, or any unresolved Critical, High, or Medium finding. Maximum failed
fix/review cycles is two; after the second failure, block pending product-owner
direction. No later phase or Batch B starts while a blocking condition remains.

## 10. Candidate and acceptance order

This strategy publishes no candidate, approval, or accepted manifest. Authorized
later roles enforce this exact order for Batch A, then Batch B, then the five-game
cohort:

1. Complete all package, truth, browser, history, budget, and receipt gates.
2. Complete fresh independent review with zero unresolved Critical, High, or Medium
   findings.
3. Publish a separate **non-consumable** candidate manifest binding exact predecessor,
   phase, package, test, browser, receipt, budget, and review hashes.
4. Obtain product-owner acceptance after review, bound to the exact candidate,
   review, and gate-version hashes and all required owner/event/thread/message/time,
   revocation, and supersession fields. Agent-authored, replayed, missing, stale, or
   pre-review approval fails.
5. Only then generate a separate accepted manifest. Any bound input change revokes it.

Batch A's accepted hash is a process prerequisite for opening Batch B. The final
five-game candidate binds both accepted batch manifests; only its separately reviewed
and owner-approved accepted cohort manifest is consumable downstream.

## 11. A1-A15 defenses

| ID | Required defense and falsification |
|---|---|
| A1 | State comes only from structured markers/fields; prose containing “deferred” cannot change task status. |
| A2 | Browser artifacts use synthetic/non-identifying data or record consent/anonymization; exact human approval is required for publication. |
| A3 | Budgets, counts, samples, and severities are parsed as labeled integers; dates or arbitrary digits fail. |
| A4 | Exact nonzero games, roles, tasks, claims, reviewed records, interactions, and accepted denominator coverage are required; nothing-done cannot pass. |
| A5 | Narrative status must match retained command exits and semantic/live evidence; structural/hash Green never proves behavior. |
| A6 | Plan/registry/metadata cannot claim acceptance before the exact accepted manifest exists and all gates are green. |
| A7 | Refutation and absence filters use exact IDs/paths/domains, never broad English-word exclusions. |
| A8 | Only `[~]`, `[x]`, and genuine `[b] ... (deferred:<owner>)` markers are valid; `[ ]` fails. |
| A9 | Validators resolve active/archive predecessor locations without retaining stale active-track paths. |
| A10 | Generated graph/report output is discovery aid only; any authorized structural change requires generated-fact refresh, but product-source changes are outside this track. |
| A11 | Existing review outputs require truthful executable/completed task state; executed review cannot remain wholly blocked. |
| A12 | Every named guard must exist and execute; a dangling guard reference blocks B0/closeout. |
| A13 | Eventual closeout must leave exactly one archived track location and no stale active directory. |
| A14 | `rg -nE` is forbidden; detector/tool exit `2` is failure and cannot be collapsed into zero findings. |
| A15 | Receipts are immutable and byte-bound; every reviewed fix requires an additive superseding receipt and complete revalidation. |

Every truth test links to at least one defense and declares a narrower `fails_when`.
The table itself is not a passing test.

## 12. Review applicability and architecture guardrails

- **Correctness review:** mandatory; all atomic semantics, denominator coverage,
  chronology, conflicts, and unknowns.
- **Security review:** mandatory for provenance, revision/path confinement, command
  safety, retained browser data, approval identity/replay, and receipt tampering.
- **UX/API review:** applicable to exact source-backed user-visible and route/API
  claims; it cannot infer implementation from specification or catalog.
- **Browser review:** conditionally mandatory per mechanically reviewed current
  disposition; every runnable game requires it, and every non-runnable decision is
  independently reviewed.
- **Adversarial testing:** mandatory, fresh, `fork_turns="none"`, and full-batch.

This evidence track changes no game source, route, runtime, asset, schema, provider
adapter, product behavior, ontology, or plan/registry state. Generators may format
approved records only; they cannot select sources, infer behavior, resolve conflicts,
assign confidence, or decide disposition. Discovery of a missing capability or asset
is recorded as evidence/unknown, not implemented here.

## 13. Phase-0 handoff

After the orchestrator commits this file, captures the full post-commit phase base,
and obtains a green B0 contract with fresh role admissions and numeric budget bindings,
the next legal work is Batch A discovery. Until then, no source or history work is
admitted. This strategy neither requests product-owner acceptance nor marks any plan
task complete.
