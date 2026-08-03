# H5 Candidate-Publisher Publication-Collision Causality Pre-Green Baseline

This artifact freezes the only production block authorized for the next Green
slice. It is a Red baseline, not acceptance evidence.

- Captured date: 2026-08-03
- Runner path: measure/business_operations_graph_baseline_execution_closure_v3_podman.py
- Pre-Red runner SHA-256: e52859d6b4f01c374662f33c6af97a21643ce6a8f344d7d2a0e2de8ae6051cb2
- Test path: measure/tests/test_business_operations_graph_baseline_execution_closure.py
- Pre-Red full test SHA-256: 4bd0a875ba002781138c30ea0197b79656a42f5d6e7452599b8dbb264592dd46
- Post-Red full test SHA-256: 771df0ec53d254879d06f27e37b42ed33731eea58143eb89ad23fa73e126278d
- Authorized Green surface: only the captured `FileExistsError` block below
  inside `_publish_candidate_publication_failure_attempt`.
- Frozen: candidate-publisher mechanics, validator, private identity/staging
  references, stage classification, schemas/carriers, reserve/rename and
  cleanup behavior, the outer staging TemporaryDirectory,
  preserve_failure routing/message, all tests, shared helper identity, and the
  already-wrapped pre-seal collision block inside `_publish_failed_attempt`.

## Defect this Red demonstrates

This slice closes review finding CAND-2 (High) from
`r1-v3-candidate-publisher-causality-independent-review-20260803.md`, which
reviewed this runner at the exact SHA-256 pinned above. The candidate publisher
raises `_fail("V3_PODMAN_ATTEMPT_PUBLICATION_COLLISION", attempt_name)` bare
from the `except FileExistsError:` block, so the collision validation error
propagates without an explicit cause and the in-flight candidate-operation
failure is detached from the causal chain an operator would inspect. The
parallel pre-seal path already wraps the identical call in
`try/except core.ExecutionClosureValidationError as collision_error: raise
collision_error from error`.

Accepted contract: drive the real candidate `preserve_failure` ->
`_publish_candidate_publication_failure_attempt` path with successful private
validation, pre-create the canonical final attempt directory containing a
hash-bound sentinel so `final_directory.mkdir()` raises `FileExistsError`, and
require the exact `V3_PODMAN_ATTEMPT_PUBLICATION_COLLISION` validation error to
explicitly retain the original candidate-operation error as its `__cause__`.
The competing directory and sentinel must remain byte-for-byte intact with no
publisher JSON/raw child, the private staged leaf must be removed, and no
rename/replace/candidate/generic/Podman/later-stage path may execute.

## Exact UTF-8 snapshot

The following code block is the exact UTF-8 byte sequence from pre-Green
runner lines 6817-6820, including one terminal LF. Its SHA-256 is
`3d05a8465e98620956829c709a92dc703f99b28ca4854d1330d4887b23820383` and it is
156 bytes.

```python
        try:
            final_directory.mkdir()
        except FileExistsError:
            _fail("V3_PODMAN_ATTEMPT_PUBLICATION_COLLISION", attempt_name)
```

The only permitted Green change is to wrap the candidate-publisher `_fail` call
in the exact pre-seal pattern, i.e. the authorized block becomes byte-identical
to the already-wrapped pre-seal block at runner lines 7080-7086 (SHA-256
`79c2d4c32b3401d64566b563e06b41e4687db54e4b19b0bc8bdfbc2f9f8a3084`, 302
bytes), adding the inner

```python
            try:
                _fail("V3_PODMAN_ATTEMPT_PUBLICATION_COLLISION", attempt_name)
            except core.ExecutionClosureValidationError as collision_error:
                raise collision_error from error
```

so the same collision error is rethrown from the existing `error` argument. No
validator, reservation, rename, cleanup, staging, schema, carrier, message, or
routing behavior may otherwise change, and the pre-seal block must remain
byte-unchanged.

## Occurrence-count and uniqueness proof

The authorized bare block is distinguishable from the pre-seal wrapped block
because it lacks the inner try/except. Verified against the pre-Green runner:

| Construct | Occurrences | Status |
| --- | --- | --- |
| The 4-line bare block above (SHA-256 `3d05a846...`, 156 bytes) as a full block | 1 | **Authorized.** The sole Green surface (lines 6817-6820). |
| The 7-line pre-seal wrapped block (SHA-256 `79c2d4c3...`, 302 bytes) as a full block | 1 | **Frozen.** Byte-unchanged (lines 7080-7086). |
| The 8-space `_fail("V3_PODMAN_ATTEMPT_PUBLICATION_COLLISION", attempt_name)` line as a substring | 2 | Line 6820 (candidate) and line 7084 (pre-seal, inside the inner try). |

The frozen block SHA-256 `3d05a846...` equals the frozen bare-block hash
recorded in `h3-preseal-materialize-collision-pre-green-baseline-20260803.md`
because the two call sites were byte-identical before the pre-seal wrap
landed; this slice freezes the surviving bare occurrence (candidate
publisher), and that occurrence is unique.

The pre-Red candidate disambiguation anchor (the bare block plus the candidate
publisher tail through the reservation `finally:`) is

```python
        try:
            final_directory.mkdir()
        except FileExistsError:
            _fail("V3_PODMAN_ATTEMPT_PUBLICATION_COLLISION", attempt_name)
        final_reserved = True
        try:
            os.rename(directory, final_directory)
            published = True
        finally:
```

with SHA-256
`29b680946eef2aa13ff719b3aa1ab9ad85e324faa7d3a8f126f4b22176372422` and exactly
**one** occurrence in the pre-Red runner. After Green the wrapped candidate
block is byte-identical to the pre-seal wrapped block, so reconstruction must
anchor on the longer unique context that continues with the candidate tail
(`final_reserved = True`, `try:`, `os.rename(directory, final_directory)`,
`published = True`, `finally:`), which the pre-seal path never follows (it
opens `rename_error: OSError | None = None` instead). Green acceptance must
verify that replacing only the wrapped block within that unique context
reconstructs the complete pre-Green runner at
`e52859d6b4f01c374662f33c6af97a21643ce6a8f344d7d2a0e2de8ae6051cb2` exactly,
and that the pre-seal wrapped block remains byte-unchanged at SHA-256
`79c2d4c3...`.

## Red receipt

Command:

    PYTHONDONTWRITEBYTECODE=1 python3 -m pytest measure/tests/test_business_operations_graph_baseline_execution_closure.py -q -k candidate_failure_evidence_collision

which selects exactly
`R1V3ExecutionClosureRedTests.test_candidate_failure_evidence_collision_preserves_existing_attempt_and_retains_cause`.

Observed result: one test failed in 6.71s only at
`self.assertIs(collision_error.__cause__, candidate_error)`: the real
`ExecutionClosureValidationError` for
`V3_PODMAN_ATTEMPT_PUBLICATION_COLLISION: r1-v3-podman-execution-attempt-20260802-0001`
has no explicit cause (`AssertionError: None is not
OSError('V3_TEST_CANDIDATE_FAILURE_EVIDENCE_OPERATION')`). Before that
assertion, the test proved one real private validation with the exact
candidate-publisher structure, no public path during validation, a single
intercepted expected public `Path.mkdir` creating the canonical attempt
directory plus the sentinel, a byte-identical pre-existing sentinel with no
publisher JSON/raw child, private staging cleanup including the staging parent,
the exact outer `CandidateExecutionBlocked` message, and no
rename/replace/pre-seal/generic/Podman/trace/later-stage action.

## Authorship

The test method was transcribed from the accepted candidate fixture surface
(the real builder/validator/failure-carrier fixture from the recent candidate
slices combined with the pre-seal collision mkdir interception) and the fault
design, disambiguation, Red run, and hashes were performed in-loop for this
slice against the real runner and the real frozen fixture surface.
