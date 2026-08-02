# H3 Materialize Pre-Seal Retention Green Acceptance

## Scope

This Terra and Sol acceptance is limited to one real nonzero production
`materialize` failure before the direct-runtime integration is sealed. It
accepts the phase-aware terminal carrier and its real production preservation
handoff only.

It does not accept other pre-seal stages, preservation-failure injection,
candidate-publication durability, H3/H4/H5 as a whole, R1 v3, or the
cumulative runner worktree diff.

## Frozen evidence

| Item | Value |
| --- | --- |
| Runner SHA-256 | `1e843616bb27cabb0677af2cd8098471f12408121dbcfed4935918b12f546cf2` |
| Test-file SHA-256 | `7bf0c72ae63f4b5a5bbec965d4010e1dbdd486d6b202947728859378e5938609` |
| Terra exact test | `test_production_materialize_failure_persists_real_preseal_terminal_carrier` |
| Terra result | `1` test passed in `0.268s` |

Terra reviewed the Red/pre-Luna definition-local delta, rather than assigning
the cumulative `HEAD..worktree` runner diff to this narrow gate. The approved
surface is:

- `_build_direct_runtime_preseal_attempt_v1`;
- `_validate_direct_runtime_preseal_failed_attempt_v1` and its branch in
  `validate_failed_execution_attempt_v1`;
- `_publish_failed_attempt`; and
- `DirectCommandRuntimeProductionExecutorV1.__init__`, `_run`, and
  `preserve_failure`.

No definition or module assignment outside that approved surface is attributed
to this acceptance.

## Decision

**ACCEPT — bounded only to retention of one real nonzero production
`materialize` failure before sealing.** The real scheduler and production
executor emitted one validator-accepted append-only
`directRuntimePreSealAttempt` with the exact preparation digest, nonce,
reached stage, ordered `NOT_RUN` suffix, and finalized raw references. No
sealed integration or candidate was created.

The helper is called only from production `_run`, which captures
executor-owned preparation and nonce before dispatch and annotates only a
nonzero receipt. The publisher validates and copies the mutually exclusive
carrier without inventing integration or raw references. `preserve_failure`
forwards it and fails closed when a pre-seal record cannot be preserved.

## Boundary preservation

- Phase R1 v3 remains `[~]`.
- The validator and production-retention implementation are frozen.
- The cumulative runner is deliberately uncommitted; a runner commit requires
  a truthful cumulative scope and separate acceptance.
- No Podman, candidate, failed-attempt, Finance, marker, registry, successor,
  V2/history, branch, worktree, clean, stash, or reset action is accepted or
  authorized by this receipt.
