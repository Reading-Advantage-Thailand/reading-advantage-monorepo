# H7 Directory-Enumeration Trace Events Pre-Green Baseline

This artifact freezes the only production seam authorized for the next Green
slice. It is a Red baseline, not acceptance evidence.

- Captured date: 2026-08-04
- Runner path: measure/business_operations_graph_baseline_execution_closure_v3_podman.py
- Pre-Red runner SHA-256: 77d38e5e4911ea0bc2a32bf935ab596914eb4f01c0b4fe006b6f759784d05516
- Test path: measure/tests/test_business_operations_graph_baseline_execution_closure.py
- Pre-Red full test SHA-256: 0653f19618c820ebdd03063e736db6d4be82fc0b90a1f8898a966153dbfdd025
- Post-Red full test SHA-256: 93cc1b791850fb131ce649a4644a2edd909d202c189232cc1b3e37aefae897bd
- Authorized Green surface: the directory-enumeration event seam only —
  `parse_direct_command_runtime_trace_events_v1`, the read-set/read-set-contract
  shape validators and builders, `validate_direct_command_runtime_execution_trace_v1`,
  the in-container fs-promises wrapper and its trace-config writers, and the
  production read-set builder in `DirectCommandRuntimeProductionExecutorV1.post_build_identity`.
  The H6 cap line (runner line 2970) and every other runner line remain
  byte-unchanged.
- Frozen: the H6 cap formula, the pre-seal/candidate/phase-level evidence
  paths, all H3/H5/H6/H8 evidence behavior, the read-set output shape of
  `discover_direct_command_runtime_read_set_v1` (asserted byte-exactly by
  `test_direct_command_runtime_read_set_discovery_binds_full_fixture_tree`),
  the discovery artifact contract, the trace-policy truncation/duplicates
  semantics, and every previously accepted test.

## Defect this Red demonstrates

The live blocked chain (attempt 0004, log `/tmp/opencode/r1v3-attempt-20260804-c.log`)
runs the standard-pack catalog generator through the in-container ESM tracer.
The generator issues 1,895 recursive `readdir` directory enumerations
(discovery's own `directoryListingCount`, attempts
`r1-v3-podman-execution-attempt-20260804-0002/-0003`; full operation profile in
`d4-apk-generator-read-profile-handoff-20260804.md`). The fs-promises wrapper's
`record()` classifies every traced path against `baselineByPath`, then
`derivedByPath`, and falls through to `append("UNDECLARED", …)` — a directory is
in neither map, so all ~1,900 `readdir` events classify as `UNDECLARED`, and
`parse_direct_command_runtime_trace_events_v1` rejects every one of them with
`V3_DIRECT_RUNTIME_RUNNER_INTEGRATION_TRACE_EVENT_INVALID` at the kind gate.
H6 widened the trace-event cap to include the readdir events (committed,
`cf8f7b9a…`), and H8 (committed, runner `77d38e5e…`) made the resulting
phase-level failure publish preserved evidence — but the parser must now
**accept** these events, not merely fail gracefully.

User-approved design (option b — declare and validate; `readdir` stays traced):

1. New trace event kind `DIRECTORY_ENUMERATION` with value `{path}`, using the
   exact event shape discipline of the other kinds.
2. The in-container fs-promises wrapper classifies `readdir`-family operations
   against a declared directory-enumeration set and emits
   `DIRECTORY_ENUMERATION`; unmatched operations keep the current behavior
   (`UNDECLARED` still rejected).
3. The declared set is derived from the existing discovery measurement (the
   same directories `directoryListingCount` counts) and carried in the
   integration read-set contract the same way baseline/derived/write sets are —
   hash-bound and nonce-bound.
4. `parse_direct_command_runtime_trace_events_v1` accepts
   `DIRECTORY_ENUMERATION` into a fourth bucket (`directoryEnumerations`),
   keeping ordinal/nonce/duplicate discipline identical to the other kinds;
   unknown kinds still fail `TRACE_EVENT_INVALID`.
5. `validate_direct_command_runtime_execution_trace_v1` validates traced
   enumerations against the declared set with the same strictness as the other
   kinds: undeclared enumeration rejects, declared-but-untraced rejects, exact
   bijection.
6. H6 cap math unchanged in behavior: `readdir` events count toward the cap.
7. Happy path and all H8 behavior unchanged.

The production read-set built in `post_build_identity` already computes the
enumerated-directory set (`directories = {root} ∪ ancestors of every baseline
path under root`) and reports its size as `discovery.directoryListingCount`
(1,895 in the live attempts). The declared set is that same set, sorted, so
`directoryEnumerations` and `directoryListingCount` agree by construction.

## Red receipt

Command:

    PYTHONDONTWRITEBYTECODE=1 python3 -m pytest measure/tests/test_business_operations_graph_baseline_execution_closure.py -q -k "directory_enumeration or unknown_trace_event_kind"

which selects exactly

- `R1V3ExecutionClosureRedTests.test_directory_enumeration_events_parse_and_validate_against_declared_set`
- `R1V3ExecutionClosureRedTests.test_undeclared_directory_enumeration_is_rejected_by_trace_validation`
- `R1V3ExecutionClosureRedTests.test_unknown_trace_event_kind_is_still_rejected_by_parser`
- `R1V3ExecutionClosureRedTests.test_duplicate_directory_enumeration_is_rejected_by_parser`

Observed result: all four failed in 17.86s against the byte-reconstructed
pre-Green runner (`77d38e5e…`), each at the real read-set shape gate:
`ExecutionClosureValidationError: V3_DIRECT_RUNTIME_READ_SET_READ_SET_INVALID`
— the fixture read-set carrying the new `directoryEnumerations` field is
rejected because the pre-Green shape validator requires an exact top-level key
set. The Red demonstrates the declared-set field is not yet part of the
read-set contract.

Focused-suite green baseline receipt (pre-fix, the shared no-Podman
`preseal`/`production_materialize`/`candidate_failure_evidence`/
`trace_event_cap`/`trace_capture_failure_evidence` selection):

    PYTHONDONTWRITEBYTECODE=1 python3 -m pytest measure/tests/test_business_operations_graph_baseline_execution_closure.py -k "preseal or production_materialize or candidate_failure_evidence or trace_event_cap or trace_capture_failure_evidence" -q
    17 passed, 49 deselected in 29.23s

## Authorized Green surface (bounded)

- `_direct_runtime_validate_read_set_shape_v1`: admit an optional top-level
  `directoryEnumerations` (sorted, unique, safe paths under the discovery root,
  count equal to `directoryListingCount`). Absence stays valid so the frozen
  `discover_direct_command_runtime_read_set_v1` output shape and all legacy
  fixture read-sets are unchanged.
- `build_direct_command_runtime_read_set_contract_v1`: carry
  `directoryEnumerations` (default `[]`) next to baseline/derived/write sets,
  which makes it nonce-bound through the existing
  `sha256(canonical({readSetContract, sourcePacketSha256}))` computation.
- `validate_direct_command_runtime_execution_trace_v1`: exact bijection over
  four members — the three existing members keep their exact equality, and a
  fourth `directoryEnumerations` member (absent means `[]`) must equal
  `[{"path": p} for p in contract["directoryEnumerations"]]`.
- `parse_direct_command_runtime_trace_events_v1`: fourth bucket
  `DIRECTORY_ENUMERATION`, identical ordinal/nonce/duplicate discipline, and
  each bucket normalized to sorted-by-path order so the trace satisfies the
  sorted contract lists the real generator's unsorted event stream produces.
- The `direct-runtime-fs-promises-wrapper.mjs` text: validate
  `config.directoryEnumerations`, classify `readdir` against the declared set,
  emit `DIRECTORY_ENUMERATION` or `UNDECLARED`, and keep all other operations
  unchanged.
- The two trace-config writers (`_runner_scripts` and
  `_derive_trace_execution_context`): carry `directoryEnumerations` from the
  integration read set into the in-container config.
- `DirectCommandRuntimeProductionExecutorV1.post_build_identity`: emit
  `directoryEnumerations = sorted(directories)` in the production read set so
  the count and the declared set agree by construction.

The H6 cap line, the discover output shape, the discovery artifact, the
trace-policy truncation/duplicates semantics, the tracer ordinal guard, and all
pre-seal/candidate/phase-level carriers are frozen.

## Authorship

The test methods, the fixture, the declared-set derivation, and the Red run
were performed in-loop for this slice against the real runner and the real test
file.
