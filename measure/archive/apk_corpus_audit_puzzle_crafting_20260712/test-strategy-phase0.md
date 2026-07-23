# Phase 0 Test Strategy — APK Puzzle and Crafting Evidence Cohort

## Purpose and immutable inputs

This is a source-neutral Phase 0 strategy. It freezes how evidence will be
collected and falsified; it makes no assertion about any game's implementation,
route, state, content, responsiveness, assets, or runnable status.

The only admissible predecessor inputs are the accepted, non-revoked manifests
and their exact hashes recorded in the handoff:

- T2 accepted denominator: `d524171dbc412a213ed4be7ad7a77e2eb404e7c5bf4a5debe2ad68dd121b5729`
- T2 accepted partition: `6badf73b625567b3fc6d4558c52ab68bd0e4fe2fb3afe3792aca4126df2d27b0`
- T3 accepted conditional pilot: `cbf04753aa21b0c43999ea202b718573616472a16dce94961242fdcb0260ca1b`
- Source baseline and Phase-0 role base: `a49ebcc4dc3b3792a96b5b114d729b0b542af0fe`

The failed ontology track remains quarantine-only negative evidence. No current
worktree bytes, generated prose, directory citation, family analogy, or
unaccepted predecessor artifact may establish a factual claim.

## Frozen cohort and execution order

The accepted partition is consumed without renaming, merging, or reassignment.
No batch may overlap, and Batch B may not open until Batch A has an accepted
cohort manifest.

| Batch | Canonical identities | Maximum games |
| --- | --- | ---: |
| A | Enchanted Library; Rune Match; Alchemist's Synthesis | 3 |
| B | Potion Rush; Rune Forge Chamber; Astral Mage | 3 |

Astral Mage is not presumed runnable, complete, absent, or comparable to any
other game. Its package must classify each missing/in-development boundary from
exact current or historical evidence as `supported`, `unknown`, or
`not-observed`; `unknown` blocks every dependent Must-have conclusion.

## B0: freeze-before-source gate

B0 is GREEN only when all conditions below are machine-checkable and recorded
in the Phase 0 ownership/freeze artifact:

1. The four immutable inputs above are SHA-256 recomputed from their committed
   bytes, and T2/T3 status, consumability, and revocation fields are verified.
2. The two batches exactly match the table above, each denominator item is
   assigned once, and the per-batch maximum is three.
3. Every role below has a distinct agent/session for each output it owns;
   incompatible-role pairs are all pairs. Root coordination is forbidden from
   discovery, collection, mapping, browser auditing, truth-test authorship, and
   review authorship.
4. Every role prompt and receipt requires `fresh-context-only`,
   `inherited_narrative=false`, `parent_ancestry_ids=[]`, and
   `fork_turns="none"`; reviewer isolation is additionally verified from a
   provider attestation or retained raw export beginning with the review prompt.
5. The numeric ceilings and stop-loss values below are present, positive, and
   hashed into every role receipt. `unmeasured` use is a B0 failure.
6. The strategy is committed first. Only after that commit exists may the root
   coordinator create and commit an immutable `phase_base` that names this
   strategy commit and the fixed input hashes. Source inspection begins only
   after the `phase_base` commit. This document intentionally contains no
   invented strategy-commit or phase-base hash.

## Isolated role matrix and frozen budgets

Budgets are ceilings, not targets, and apply separately to each batch. A role
must stop and report before exceeding a ceiling; changing any ceiling requires
prior product-owner approval, a new freeze, and invalidation of affected
candidate outputs.

| Role | Sole responsibility | Frozen per-batch ceiling |
| --- | --- | --- |
| discovery auditor | Re-derive assigned denominator membership, identities, and source pointers | 36 path admissions; 24 Git/history queries; 1 denominator report |
| evidence collector | Produce per-game exact claim-evidence ledgers and source/asset/history facts | 72 cited ranges per game; 120 source-path reads per game; 24 history queries per game; 12 negative fixtures per batch |
| requirements mapper | Derive state/transition, learning, effort, responsive, and asset mapping only from collector evidence | 90 ledger-record reads per game; 48 mapping records per game; 0 new factual citations |
| browser auditor | Record runnable disposition and compact/wide, real-input browser evidence where admissible | 18 launch/navigation attempts per game; 12 state-transition attempts per game; 8 captures per game; 4 Thai/English boundary cases per runnable game |
| truth-test author | Write and run falsification tests for ledgers, hashes, fixtures, gates, and role separation | 80 assertions per batch; 24 fixture executions per batch; 2 test runs per revision |
| adversarial reviewer | Fresh, independent claim/fixture re-derivation and severity report | 5 claim re-derivations per game; 4 fixture re-derivations per game; 1 full batch review |

For a single artifact, its owner and reviewer must differ. The evidence
collector cannot map, browser-audit, truth-test, or review its own game;
the mapper cannot review its mapping; the browser auditor cannot validate its
own browser result; and the truth-test author cannot review its own tests.

## Evidence and browser test contracts

Every factual atomic proposition requires a stable claim ID, identity, exact
scene/state when applicable, baseline revision, path, line range, cited-range
SHA-256, blob SHA-256, extracted fact distinct from interpretation, evidence
class, collector identity, conflict status, and independent review disposition.
Negative fixtures must prove rejection of unsupported claims, stale hashes,
directory citations, mismatched denominators, and inference presented as fact.

For any independently established runnable disposition, browser evidence must
cover actual content variation and actual state transitions at compact and wide
compositions. Thai and English are separate boundary cases: the auditor must
use real source-derived shortest and worst-case prompt/answer/feedback strings,
record their claim IDs and hashes, enlarged-text setting, viewport, visible
HUD/station/board regions, input mode, expected observation, and capture/log
hash. Placeholder, translated-by-the-auditor, or family-derived text is invalid.

Kimi WebBridge is the preferred browser mechanism for navigation, observation,
and capture. Its synthetic DOM-event limitation is explicit: synthetic
DOM-event dispatch cannot by itself establish pointer, touch, keyboard, typing,
drag, radial, or other gameplay interaction. A claimed transition therefore
requires independently retained evidence of a real accepted input mechanism.
If that mechanism is unavailable, the browser auditor records the attempted
command/environment/route/failure/log/revision and marks the interaction and
dependent responsive conclusion `unknown`; screenshots alone do not pass.

For Astral Mage, the same attempt record is required for every requested
current/browser boundary. Missing or in-development evidence remains an
explicit source-classified unknown, never a waiver and never a browser claim.

## Candidate, review, and acceptance sequence

For each batch, the only permitted order is:

1. B0 GREEN and immutable `phase_base` exist; collect exact evidence and
   receipts within frozen budgets.
2. Map only cited evidence; browser-audit only independently admitted runnable
   routes; author and execute truth tests and negative fixtures.
3. Run the isolated `fork_turns="none"` adversarial review against raw-source
   pointers, the candidate revision, and receipts—not mapper narrative.
4. Reconcile every Critical, High, and Medium finding and rerun affected
   tests/review. One unsupported factual claim or one denominator mismatch
   activates stop-loss immediately; two failed fix/review cycles block the
   track pending product-owner direction.
5. Publish a non-consumable candidate manifest only after review reports zero
   unresolved Critical, High, or Medium findings. It binds candidate, test,
   review, receipt, input, and output hashes.
6. Obtain a product-owner acceptance event bound to the exact candidate and
   review hashes, after the review event. Agent-authored, missing, replayed, or
   earlier approval fails closed.
7. Only then generate a separate accepted manifest. Any input/output change
   revokes its candidate acceptance and accepted-manifest lineage.

## A1–A15 defense checklist

| ID | Phase-0 defense |
| --- | --- |
| A1 | Parse structured task/receipt fields; never treat a prose substring as a status signal. |
| A2 | Do not publish an accepted manifest without the exact product-owner event and hash binding. |
| A3 | Parse labeled integer budgets, counts, and stop-loss counters; reject digit-only matches. |
| A4 | Require non-empty owned outputs, executed tests, and receipts; an all-pending batch cannot pass. |
| A5 | Compare every strategy/result claim to executed test output; no pass-language without the cited exit result. |
| A6 | Keep registry/status language bounded to observed gate state; no completion or resolution claims in Phase 0. |
| A7 | Use allowlisted paths/IDs and explicit policy-marker exclusions only; never filter by broad natural-language terms. |
| A8 | Use only `[~]`, `[x]`, and `[b]` markers with a structured `deferred:<owner>` field for actual blocks; reject `[ ]`. |
| A9 | Resolve predecessor paths through archived locations before executing any referenced test or manifest read. |
| A10 | No structural source edits are authorized here; later structural edits must refresh generated facts before a gate claim. |
| A11 | If any role artifact exists, plan/receipt state must truthfully become completed, active, or genuinely externally blocked. |
| A12 | Run every referenced guard/detector and fail on a missing guard rather than calling it protected. |
| A13 | At closeout, verify the archived track contains required artifacts and no stale active directory remains. |
| A14 | Treat detector syntax/exit 2 as failure; use portable `rg -n '<regex>'`, never `rg -nE`, and never mask failure with `|| true`. |
| A15 | Preserve immutable receipts and create a new tool-attested superseding receipt after any reviewed-output change; rehash all listed outputs. |

## Phase-0 validation result

Validation for this strategy is documentation-only: confirm it names only the
fixed baseline/predecessor hashes, the two frozen batches, six isolated roles,
numeric ceilings, B0 ordering, stop-loss, Thai/English and Astral-Mage unknown
rules, Kimi's limitation, candidate ordering, and A1–A15 defenses. No game
source was inspected or evaluated while authoring this strategy.

MEASURE_AGENT_RESULT: status=complete; role=fresh-measure-strategy-author; track=apk_corpus_audit_puzzle_crafting_20260712; phase="Phase 0: Freeze cohort and roles"; artifact=measure/tracks/apk_corpus_audit_puzzle_crafting_20260712/test-strategy-phase0.md; source_behavior_inspected=false; plans_registry_source_commits_modified=false; strategy_commit=not-created; phase_base=not-created
