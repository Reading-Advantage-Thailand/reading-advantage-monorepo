# Bounded Green/Acceptance: Direct-Runtime Tracer Child-Only Pinned-Podman Gate (2026-08-03)

Accepted in-loop, single-authority per `AGENTS.md` Measure-acceptance ownership,
for only the opt-in pinned-image child-trace acceptance gate described in the
Phase R1 v3 plan ("Pinned-image child-trace acceptance correction").

## Command and result

```
RUN_R1_PODMAN_CHILD_TRACE_ACCEPTANCE=1 python3 -m unittest \
  measure.tests.test_business_operations_graph_baseline_execution_closure.R1V3ExecutionClosureRedTests.test_direct_runtime_tracer_child_only_pinned_podman_acceptance
```

Result: `Ran 1 test in 4.632s` — `OK`.

## Environment binding

- Runner SHA-256: `4f1eb6a34c946f101791a26cf090f68cfffc360000a57974015947f44feec1c3`
- Test-file SHA-256: `69053a5a5e49c22bdfeb4c4d2ac3b2f0e050c96f63a97de64c49b541adafc01e`
- Podman: `4.9.3` (`/usr/bin/podman`)
- Image: `docker.io/library/node:22-slim@sha256:6c74791e557ce11fc957704f6d4fe134a7bc8d6f5ca4403205b2966bd488f6b3`
  (verified present locally via `podman image inspect` before the run; the gate
  used `--pull=never` and did not pull or build any image)

## Scope

The gate staged only a tiny synthetic parent-pnpm-to-child-generator ESM fixture
under one `TemporaryDirectory`, derived the mounted runner scripts and
`/runner/direct-runtime-trace-config.json` from the committed `_runner_scripts`
integration path, and used exactly two
`podman run --rm --pull=never --network none --userns=keep-id` invocations
(generator trace, then in-container raw receipt). Green required both exits `0`,
distinct parent/child PIDs, one raw `node:fs/promises` child-only baseline-read
event with the config nonce/packet/tracer/resolved script, a matching
in-container receipt/raw digest, deletion of the raw artifact, and temporary
mount cleanup.

## Exclusions

This accepts only the child-only tracer inheritance behavior against the pinned
image with a synthetic fixture. It does not accept: a candidate run or
publication, any R1-v3 execution-closure candidate, H3/H4/H5, R1 v3 phase
completion, any marker change, any Finance action, any V2/history modification,
any registry/successor action, or any repository/V2/candidate mount. Phase R1 v3
remains `[~]`; R2 Tasks 3-5 and all R3 tasks remain `[b]`.
