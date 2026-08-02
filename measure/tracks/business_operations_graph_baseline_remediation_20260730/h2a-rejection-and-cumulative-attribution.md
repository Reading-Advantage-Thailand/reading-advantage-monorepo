# H2a Rejection and Cumulative Runner Attribution

## Scope

This Sol review records the read-only attribution of the cumulative uncommitted
R1 v3 runner diff observed on 2026-08-02. It evaluates whether that diff can be
accepted or committed as the narrow H2a production-consumption correction.

It does not accept H1-H5, R1 v3, R2 Tasks 3-5, R3, either successor track, or
Finance work. It authorizes no runner commit, candidate execution, candidate
publication, marker change, registry change, or successor unblock.

## Decision

**H2a: REJECTED.**

The cumulative runner change cannot truthfully be described as an H2a-only
implementation. It combines preparation, same-attempt identity, production
ownership, trace, failure-retention, candidate-publication, compatibility, and
H2 replacement work. Production validators also reject the new package-relative
H2 command semantics.

- Runner commit disposition: **NONE**.
- Candidate commit disposition: **NONE**.
- Candidate execution authority: **NONE**.
- Acceptance or marker authority: **NONE**.

## Baseline and Current Evidence

The comparison base was `master` HEAD
`8c27354836a674a009a63a8ed34dd476206c4ba2`.

| File | HEAD | Observed current file | Diff |
|---|---|---|---|
| `measure/business_operations_graph_baseline_execution_closure_v3_podman.py` | 6,095 lines; SHA-256 `29f7855cf9a7e587811267846f7639b5416eeda96e39de0d47e5a3b62d2deb54` | 8,913 lines; SHA-256 `39f23949c93705b59d9a65d191df40e8470e8d9d5f90f6a587478813bea17c8f` | `+5440/-2622` |
| `measure/tests/test_business_operations_graph_baseline_r1_r2_v2_acceptance.py` | 333 lines; SHA-256 `3a671f390fadf85e64a7f9cbdada191c4e3792ab2eda3837f3a9021a31729bae` | 340 lines; SHA-256 `081e6ed4da7e4aaf494e619ccab9f412a028c89deef3fc8e92e4e7fed0f8ba1d` | `+9/-2` |

Definition-local analysis found 46 added definitions, 12 semantically changed
definitions, no removed definitions, and 125 pre-existing definitions whose
3,836 source lines are byte-identical but relocated. The relocation-only
portion is compatibility/retention churn and is not evidence of H2a delivery.

## Cumulative Attribution

### H1 — Same-attempt identity and sealing

The diff adds the nonce-bound identity envelope, preparation/build/observer
links, archive/context binding, fresh post-generator re-attestation, and the
associated finalization and validation functions. Executor ownership includes
post-build identity, envelope construction, finalization binding, and trace-time
TOCTOU validation.

### H2 replacement — Frozen direct-Node split

The diff derives a package-local `pnpm build` plus direct
`node scripts/generate-standard-pack-release.mjs` contract from frozen manifest
bytes and adds production build-context, runtime-build, and generator consumers.
The superseded root-level segment helper remains compatibility-only.

This intended attribution is not acceptance: the production environment,
receipt, profile, and failed-attempt validators do not consistently recognize
the package-relative logical commands.

### H3 — Preparation, capacity, and production ownership

The diff adds Git-object-only source preparation, the detached source packet,
tree-derived and production-filesystem capacity probes, preparation-aware
archive/context construction, the concrete production executor, the ordered
scheduler, and the thin writer-to-scheduler handoff.

### H4 — Real trace evidence

The diff adds the sealed trace execution context, generator-child trace
capture, staged raw-receipt binding, post-generator identity observation, and
trace/profile/receipt publication wiring. Existing embedded tracer/parser
content that is byte-identical and merely relocated is retention, not new H4
evidence.

### H5 — Failure state and atomic candidate publication

The diff adds scheduler failure routing, post-trace gates, append-only failure
preservation, private candidate construction, candidate validation, and final
atomic publication. It also changes failed-attempt and ordered-stage validators.
The blocking gaps below prevent H5 acceptance.

### Compatibility and retention

This category includes the 125 relocated byte-identical definitions, retained
legacy validators and historical-attempt handling, the superseded root-level
segment helper, and the adjacent acceptance test's strengthened Measure
plan/blocker assertions. Those test changes do not accept runner behavior.

## UNKNOWN Blocking Clusters

### 1. Package-relative generator versus root-relative validators

The H2 contract and executor use
`["node", "scripts/generate-standard-pack-release.mjs"]` from the package
working directory. Environment override, failed-attempt, container, profile,
and publication validation instead recognize the root-relative
`DIRECT_NODE_STANDARD_PACK_GENERATOR`. The production path therefore rejects
the required `NODE_OPTIONS` before execution or rejects the resulting receipt.

### 2. Package-local runtime build versus legacy receipt identity

The H2 contract and executor run `["pnpm", "build"]` in the package working
directory. Finalization and the retained APK build-receipt validator still
require
`["pnpm", "--filter", "@reading-advantage/advantage-play-kit", "build"]`.
The H1 finalizer and final candidate validator cannot both accept the H2
production receipt.

### 3. Early failure loses required NOT_RUN integration state

The HEAD validator rejected materialization failures without a
`directRuntimeIntegration` carrier. The current diff removes that requirement,
while production failure preservation forwards the integration and exact later
`NOT_RUN` stages only after sealing. Early materialization or pre-seal failures
can therefore omit the required reached-stage and later-stage evidence.

### 4. Candidate-publication failures are not durably retainable

The publisher uses `candidate-publication` as a failure stage, but the
failed-attempt validator does not allow that stage. Non-offline preservation
errors are suppressed. Final candidate validation remains fail-closed, but an
append-only failure record is not guaranteed.

No other changed definition or contract assignment remained unattributed in
the observed diff.

## Required Continuation

1. Terra must freeze H2b Red against the real production environment,
   build-receipt, failed-attempt, profile, retention, and candidate validators.
2. Luna must implement the smallest correction to those frozen tests without
   weakening legacy evidence validation or introducing a bypass schema.
3. Terra must review H2b and then the cumulative H3-H5 integration, including
   exactly one runtime build, one direct-Node generator, real trace evidence,
   first-failure `NOT_RUN` retention, and private atomic candidate validation.
4. Sol must independently review the full diff and attribution boundary after
   Terra acceptance. Only a truthful cumulative runner-stabilization scope may
   be considered; the rejected H2a label must not be reused.
5. A candidate run requires a separate, fresh authorization after the accepted
   implementation commit. This record is not that authorization.

## Boundary Preservation

- No runner or test file was changed by this review.
- No plan, registry, task marker, acceptance state, or successor marker was
  changed.
- No Podman, candidate, or failed-attempt operation was run.
- No V2 or historical evidence was rewritten.
- No Finance file, input, marker, or implementation was changed or authorized.
