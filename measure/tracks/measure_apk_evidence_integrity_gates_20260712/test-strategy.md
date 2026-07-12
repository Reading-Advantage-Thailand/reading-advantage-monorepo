# Test Strategy: Measure APK Evidence Integrity Gates

## Purpose and test boundary

This is infrastructure for FR1–FR6, not evidence about any game. The implementation
should be a small, dependency-free Python gate package under `measure/` with versioned
JSON fixtures and a command-line runner. Keep the policy/validation core pure; put Git
and collaboration-tool reads behind narrow adapters. A JSON schema test proves only an
artifact's shape. A live proof must resolve the claimed Git revision/range or
tool-generated event through the real adapter and must fail closed when that resolution
is unavailable.

Suggested layout (to be created by the truth-test author):

```text
measure/evidence_integrity_gates/
  contracts.py              # versioned parsing and stable rejection codes
  git_source.py             # exact revision/file/range resolution
  events.py                 # collaboration-event resolver interface
  validator.py              # claim, denominator, receipt, lifecycle validation
  cli.py
measure/tests/evidence_integrity_gates/
  fixtures/{valid,invalid}/
  test_contract_scaffold.py
  test_claim_evidence.py
  test_denominator_roles.py
  test_stop_loss_lifecycle.py
  test_supervisor_integration.py
```

All negative fixtures carry an expected stable rejection code. A test is falsified if it
accepts its negative fixture, rejects the paired valid control, or returns a reason code
different from the documented violation. No fixture directory, generated report, or
author-provided summary may stand in for source/event resolution.

## Shared fixtures, mocks, and live proofs

- **Exact-source fixture repository:** create a temporary Git repository with a committed
  source file, a generated file, a changed second revision, and an unreachable object.
  The live adapter must use `git cat-file`/`git show` (or their Python equivalent) to
  resolve the claimed revision/path/range and rehash the selected bytes. Mocking the
  adapter is permitted only for unit tests of error mapping; it is prohibited in the
  phase Green proof.
- **Role/event fixtures:** store complete valid and tampered raw collaboration-event
  exports, ownership manifests, final-response bytes, and output-file inventories.
  Unit tests use a deterministic resolver fake to prove the adapter contract. Phase 4
  must also validate a real tool export: distinct spawn/parent IDs, `fork_turns="none"`
  for reviewers, exact prompt/input hashes, event chronology, and response/output hashes.
- **Lifecycle fixtures:** provide a valid candidate → reviewed → owner-approved →
  accepted history, plus one minimal invalid history per stop condition. Resource amounts
  are labeled integers with explicit units (for example `tokens: 1000`), never a digit
  search. An approval is a raw tool-generated user-message event whose message hash and
  timestamp are resolved, not an agent-authored JSON assertion.
- **Supervisor fixtures:** use isolated temporary copies of plans/track directories to
  test marker/dependency behavior. Shell tests that scan the real active registry remain
  integration checks, not substitutes for fixture-based behavior tests.

## Phase gates and falsification

### Phase 0 — freeze contracts and counterexample corpus

- **Targeted Red:** `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest -v measure.tests.evidence_integrity_gates.test_contract_scaffold`
  must fail before the contract parser/harness exists; the first test asserts that every
  failure attempt has a named invalid fixture, expected rejection code, and valid paired
  control. It is falsified by an unrepresented attempt, an unparseable labeled budget,
  or an empty control corpus.
- **Green gate:** the same command passes; the fixture manifest checks exact fixture
  hashes and rejects `unmeasured`, missing units, unknown schema versions, and non-canonical
  `dependencies`. This is artifact validation only.
- **Closeout gate:** role receipts show different authors for contract/counterexample/
  review work, allowed-input hashes are frozen, and no task is described as complete
  merely because fixture JSON parses. Record the baseline commit and all fixture hashes.
- **Anti-pattern defenses:**
  - **A3:** parse labeled integer-plus-unit fields and assert the parsed value; a date or
    unrelated digit must fail.
  - **A4:** reject a fixture set with zero valid controls or zero negative cases; no
    “consistent” empty corpus can pass.
  - **A5/A6:** assert the candidate/report status is `candidate`, never `accepted` or
    “all checks pass,” until the actual phase gate result is present.
  - **A8:** fixture plans accept only `[~]`, `[x]`, `[b]`; a legacy blank marker is a
    negative control.
  - **A12:** validate that each catalog guard reference resolves to a file before
    claiming coverage.

### Phase 1 — claim evidence

- **Targeted Red:** `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest -v measure.tests.evidence_integrity_gates.test_claim_evidence`
  initially fails on the exact-source contract. Each negative case must be rejected for
  its own reason: directory locator, stale cited bytes, unreachable revision, generated
  prose used as primary evidence, or interpretation duplicated as fact.
- **Green gate:** the same command passes against a temporary Git repository; it proves
  the validator resolves the revision/path/range and hashes the live bytes. A separately
  mutated revision or range is a required refutation, not a mocked success.
- **Closeout gate:** focused mutation run records that changing any locator component,
  range byte, source class, fact/interpretation boundary, collector, or reviewer makes
  the package fail. Valid exact-source control remains accepted.
- **Anti-pattern defenses:**
  - **A5:** pair each report claim with executable source resolution; a claim-like
    document cannot make a test pass.
  - **A7:** use explicit source-class/path predicates and positive controls, never a
    broad English-word exclusion that hides a prohibited locator.
  - **A9:** tests resolve active-or-archived fixture-track paths through one helper;
    moving a fixture track must not produce a permanently red test.
  - **A10:** after structural Python changes, regenerate/verify any required Measure
    facts or record the exact unrelated doctor failure; never call stale generated data
    evidence.

### Phase 2 — denominator and role independence

- **Targeted Red:** `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest -v measure.tests.evidence_integrity_gates.test_denominator_roles`
  initially fails until denominators and receipts are validated. It is falsified if it
  accepts authored-output coverage, a synthetic `main` scene, hardcoded/keyword/slug
  substitution, cohort-level asset inspection, role overlap, copied event IDs, root
  substitution, output mismatch, inherited reviewer context, forged/replayed approval,
  or the `dependencies` alias.
- **Green gate:** the targeted suite passes with independent valid denominators and raw
  event fixtures; it verifies final-response and every listed output hash, and uses a
  resolver fake only to exercise adapter errors. The close-to-live proof uses a real
  event export, not just fixture-shaped JSON.
- **Closeout gate:** accepted candidate inputs include one discovery-origin denominator
  independent of requirements output, ownership manifest, distinct receipts, and zero
  unresolved role/approval validation errors. Unknown or unreachable event provenance
  blocks rather than downgrades confidence.
- **Anti-pattern defenses:**
  - **A1:** classification of blocked work is structured status/`deferred:<owner>`,
    never a free-text substring; a prose `deferred` counterexample stays incomplete.
  - **A3/A4:** denominator and coverage are parsed, labeled counts with at least one
    independently discovered item; an empty reconciliation fails.
  - **A5/A6:** candidate prose cannot assert independent review; the reviewer event,
    `fork_turns="none"`, and exact hashes are checked.
  - **A7:** allow/deny source classes and asset records are exact enumerations with
    false-positive controls, not grep exclusions.
  - **A9:** archive-aware path resolution is a required test fixture.

### Phase 3 — stop-loss and completion lifecycle

- **Targeted Red:** `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest -v measure.tests.evidence_integrity_gates.test_stop_loss_lifecycle`
  initially fails until the state machine exists. It is falsified if a batch of four,
  unsupported claim, denominator mismatch, third/follow-on review after two failures,
  unresolved Critical/High/Medium finding, unlabeled/non-numeric budget, stale approval,
  changed input, missing pilot acceptance, or gate-editing product track reaches
  candidate/accepted.
- **Green gate:** the same suite passes both valid and invalid state histories through
  the CLI/adapter. It must show revocation after any covered input change and prohibit
  candidate/accepted transitions except review → no blocking findings → authentic owner
  acceptance → accepted manifest.
- **Closeout gate:** a generated transition report contains parsed resource totals and
  blocker reason codes; every product-track fixture records immutable gate commit and
  manifest hash before first work. Re-running after a gate change makes the prior
  candidate invalid.
- **Anti-pattern defenses:**
  - **A2:** no public publish gate exists here; the analogous acceptance transition is
    deliberately fail-closed on authentic owner approval and complete independent review,
    not a status flip.
  - **A3:** totals are parsed from labeled integers/units and compared to ceilings.
  - **A4:** zero completed review, zero discovered denominator, or an all-in-progress
    plan cannot advance lifecycle state.
  - **A5/A6:** emitted status is derived from validated transitions, so candidate reports
    cannot overstate acceptance.
  - **A10:** lifecycle closeout rejects changed gate/version/input hashes until all
    affected validations are rerun.

### Phase 4 — supervisor integration and independent audit

- **Targeted Red:** `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest -v measure.tests.evidence_integrity_gates.test_supervisor_integration`
  initially fails until the supervisor invokes the gate runner and rejects absent,
  revoked, non-canonical, or self-edited records. It is falsified if a free-text
  `deferred`, legacy marker, alias dependency field, stale archive path, missing guard,
  or unrefreshed generated fact allows completion.
- **Green gate:** run the focused suite plus:

  ```bash
  bash tests/orchestrator_supervisor_invariants.sh
  bash tests/orchestrator_review_execution_truthfulness.sh
  bash tests/orchestrator_catalog.sh
  bash tests/orchestrator_marker_vocabulary.sh
  ```

  The live proof validates an actual reviewer/tool event export and invokes the
  supervisor against an isolated track fixture. It must reject a product track that edits
  its validated gate or begins without the accepted Phase 4 manifest.
- **Closeout gate:** all focused and aggregate commands exit zero; an independent
  `fork_turns="none"` reviewer reports zero unresolved Critical/High/Medium findings;
  the product owner then approves the exact candidate/review/gate hashes. Only the
  resulting accepted manifest is consumable by T2.
- **Anti-pattern defenses:**
  - **A1:** retain and behavior-test `is_task_structurally_blocked`; prose does not
    suppress incompleteness.
  - **A5/A6:** registry/plan status is cross-checked to the executed command result;
    a red aggregate suite forbids “resolved”/“complete.”
  - **A7:** audit tests use precise path/policy filters plus injected prohibited hits.
  - **A8:** all active plans are scanned; legacy marker is a hard failure.
  - **A9:** every static test uses an archive-aware track resolver.
  - **A10:** run `measure/doctor.sh` (or documented successor) after structural changes;
    stale generated facts fail the audit rather than being silently ignored.
  - **A11:** an executed review artifact cannot leave all tasks blocked by
    `deferred:review-execution`.
  - **A12:** catalog references are verified to exist, not merely that A1–A13 headings
    exist.
  - **A13:** audit rejects a registry-archived track that still has a stale active
    directory.

## Intentionally-red aggregate handling

At baseline, `bash tests/orchestrator_marker_vocabulary.sh` is intentionally red: it
reports legacy blank markers in many active APK successor tracks and unrelated active
tracks, including this track before this setup update. That is a real repository-wide
integrity failure, not a Phase 4 pass condition and not evidence that the focused gate
tests are faulty. Preserve its output and list each active-track owner; do not weaken its
scope, exclude wording, or write a passing count claim. This plan removes this track's
own legacy markers only. Phase 4 cannot close until the named owners normalize their
plans or an accepted remediation decision changes the shared test; aggregate exit 1 must
remain visible in the candidate report.

## Phase 0 retry — clean replacement after failed acceptance

This retry starts from the user-supplied baseline `5103c24b`. It is a replacement
attempt, **not** a repair that upgrades the failed attempt into completion. The
following remain immutable rejected evidence: the pre-retry Phase 0 fixture corpus
and receipt, `phase0-acceptance-result.json` (`blocked`),
`review-b-security-result.json` (`BLOCKED`), and
`orchestrator-audit-result.json` (`fail`). The first retry artifact is a
`phase0-retry-rejected-evidence.json` ledger that records their paths, Git/blob or
SHA-256 identities where available, failure statuses, and blocking finding IDs. It
must say `disposition: rejected-not-completion`; it must not rewrite a receipt,
refresh its hashes, or mark an old task `[x]`.

### Attestation feasibility and truthful schema equivalence

OpenCode 1.17.18 exposes complete session exports through `opencode export <sessionID>`.
The Phase 0 adapter treats that CLI as a provider boundary, stores exact raw-export hashes
plus replayable normalized evidence, and validates session/agent/parent/message IDs,
timestamps, prompt/final-response hashes, output ownership, distinct sessions, common
resolved parent session, and post-author reviewer chronology. The current export schema
does not expose `fork_turns`; evidence therefore records `schema-field-absent` rather than
inventing a value. When a future schema supplies the field, the adapter requires reviewer
`fork_turns` to equal `none`. Luna remains unavailable and is not selected for any role.

### Atomic scope and retry subphases

The replacement may touch only this track's planning/Measure gate artifacts named
in the retry plan; no product source, shared supervisor, registry, anti-pattern
catalog, or unrelated track is in scope. It has exactly one implementation commit
after all staged Red/Green/review work is complete. That commit contains the retry
plan/status update, rejected-evidence ledger, replacement-only manifests/receipts,
new focused tests and validator changes (if preflight has made live attestation
possible), and its staged-tree binding. Do not make setup, fix, review, receipt, or
acceptance-result commits around it. If the live event export is unavailable, make
only the one planning/blocked-evidence commit; do not manufacture replacement
implementation or a passing receipt. The product-owner gate remains `[b]
deferred:product-owner` and can never be counted as completion.

#### Retry Phase 0A — preserve failure and prove the preflight

- **Targeted Red:** `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest -v measure.tests.evidence_integrity_gates.test_phase0_retry_provenance` initially fails for an absent/malformed rejected-evidence ledger, duplicate roles, stale receipt, or unavailable resolver presented as success.
- **Green gate:** the focused unit suite passes only when unavailable attestation is
  represented as a structured blocked result and every old artifact is classified
  `rejected-not-completion`; the live command
  `PYTHONDONTWRITEBYTECODE=1 python3 -m measure.evidence_integrity_gates.phase0_retry_verify --repo . --require-live-attestation`
  remains intentionally nonzero on this tool surface.
- **Closeout gate:** only a real raw tool export plus successful resolver comparison
  can turn the live command green. Otherwise publish the blocked result and stop;
  there is no Phase 1 handoff.
- **Fixtures/mocks/live proof:** unit fixtures include missing event export, copied
  task ID, same task for two incompatible roles, `fork_turns != none`, replayed event,
  response/output mismatch, and a valid *raw-export-shaped* control. A deterministic
  resolver fake is unit-only. The closeout proof must query the actual task facility;
  an artifact-shaped JSON file, Git identity, and documentation text are not live
  behavior tests.
- **Anti-pattern defenses:** **A4** rejects an empty role matrix or zero owned files;
  **A5/A6** require `blocked`, never “complete,” from unavailable evidence; **A15**
  recomputes each preserved and replacement output hash and rejects stale receipts;
  **A3** parses the number of roles/outputs as labeled integers rather than searching
  for digits. Falsification is any old artifact treated as completion or any missing
  runtime field accepted.

#### Retry Phase 0B — replace only proven contracts and counterexamples

- **Targeted Red:** `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest -v measure.tests.evidence_integrity_gates.test_phase0_retry_contracts` fails for malformed `severity`, `stop_loss`, `acceptance`, or `revocation` values, an absent allowed-input manifest/hash, an unowned output, and every attempts 1–5 counterexample.
- **Green gate:** this focused suite and the existing scaffold suite pass with
  replacement artifacts only; validators must parse contract values rather than
  merely checking non-empty keys. Each negative fixture receives its documented
  stable rejection code and the paired synthetic non-product control passes.
- **Closeout gate:** the replacement manifest identifies the exact allowed inputs and
  their hashes, each contract value has a typed validator, and the authentic distinct
  author receipts (if preflight is available) bind their owned outputs. Without those
  receipts, this subphase stays blocked even when artifact tests are green.
- **Fixtures/mocks/live proof:** use copied/tampered allowed-input manifests,
  date/generic/non-positive resource labels, empty corpus, legacy `dependencies`,
  `[ ]` markers, broad-filter false positives, and the five preserved shortcut
  fixtures. These are artifact tests. Live behavior is limited to resolver-backed
  ownership verification; parsing a fresh JSON manifest is not that proof.
- **Anti-pattern defenses:** **A3** labeled integer/unit parsing; **A4** nonempty
  positive/negative corpus and role/output inventory; **A5/A6** status derived from
  validators; **A7** exact fixture/path predicates with injected prohibited hits;
  **A8** rejects blank markers; **A12** keeps every dangling catalog reference visible.
  Falsification is acceptance of any malformed value, shortcut fixture, alias, or
  missing input/output binding.

#### Retry Phase 0C — independent review, aggregate truth, and one-commit boundary

- **Targeted Red:** `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest -v measure.tests.evidence_integrity_gates.test_phase0_retry_acceptance` fails if a reviewer shares an author/task/ancestry context, has `fork_turns` other than `none`, reviews unbound bytes, or approval/acceptance occurs with a blocked live attestation.
- **Green gate:** the focused acceptance suite, scaffold suite, and the exact
  resolver-backed verifier pass only with a genuine independent reviewer. Run
  `bash tests/orchestrator_supervisor_invariants.sh`,
  `bash tests/orchestrator_review_execution_truthfulness.sh`,
  `bash tests/orchestrator_catalog.sh`,
  `bash tests/orchestrator_detector_syntax.sh`, and
  `bash tests/orchestrator_role_receipt_integrity.sh` as evidence, not substitutes
  for the live event proof.
- **Closeout gate:** the final requested Phase 0 completion change is one atomic commit;
  all live proofs are green; no Critical,
  High, or Medium review finding remains; then and only then may the manual
  product-owner gate be requested. The current user's explicit owner designation is
  bound without an invented event ID.
- **Aggregate repairs:** Phase 0 owner authorization includes normalizing active task
  markers, resolving real A12 Guard declarations, and removing the sole A13 stale active
  directory only after archive fixture parity is verified. The aggregate guards and
  `measure/doctor.sh` must exit zero.
- **Anti-pattern defenses:** **A1** behavior-tests structured blocking rather than
  prose; **A2** treats the analogous acceptance transition as fail-closed on authentic
  owner evidence; **A5/A6** bind all status text to command results; **A7** injects
  forbidden hits to prove precise filters; **A8** scans active plans; **A9** uses an
  archive-aware resolver; **A10** records generated-facts verification rather than
  trusting stale facts; **A11** rejects an executed review left wholly blocked;
  **A12/A13** preserve global failures; **A14** makes detector exit 2 fatal; and
  **A15** rehashes receipts after every staged change. Falsification is any red
  aggregate or unavailable attestation described as clean, any reviewer independence
  field unchecked, or more/fewer than one post-baseline commit.

## Architecture and changed-contract guardrails

- No APK game discovery, requirements, browser audit, asset conclusion, or product code
  belongs in this track. Gates accept records; they do not infer records or choose
  semantics (generator boundary).
- Keep gate contracts versioned and additive where possible. A schema/reason-code,
  canonical-dependency, approval-event, or supervisor-completion change breaks all
  downstream candidate manifests and must revoke/revalidate them.
- The supervisor is the integration seam. Do not modify it outside Phase 4, and do not
  let it bypass the CLI with substring parsing or self-authored success flags.
- Graph inspection found no graph nodes for this Python supervisor or shell guards;
  `graph.db` is therefore not an authority for their callers. Use direct focused shell
  tests and update the graph only if a structural TypeScript surface is changed.

MEASURE_AGENT_RESULT
role: strategy
status: complete
track: measure_apk_evidence_integrity_gates_20260712
phase: track setup and full-track strategy
commits: afcfd215
tests_run: bash tests/orchestrator_marker_vocabulary.sh (expected aggregate red: legacy markers in other active plans); bash tests/orchestrator_supervisor_invariants.sh (pass); bash tests/orchestrator_review_execution_truthfulness.sh (pass); bash tests/orchestrator_catalog.sh (pass)
files_changed: measure/tracks/measure_apk_evidence_integrity_gates_20260712/test-strategy.md (new); measure/tracks/measure_apk_evidence_integrity_gates_20260712/plan.md
plan_updates: replaced deprecated blank task markers with truthful incomplete or product-owner-blocked markers; no implementation task claimed complete
known_failures: aggregate marker-vocabulary suite remains red for unrelated active plans; Phase 4 closeout is intentionally blocked until their owners normalize them
handoff: Truth-test author starts Phase 0 with test_contract_scaffold, creates the immutable fixture/receipt corpus, and records a real Red result before validators. Do not begin APK evidence work or claim gate acceptance.
END_MEASURE_AGENT_RESULT
