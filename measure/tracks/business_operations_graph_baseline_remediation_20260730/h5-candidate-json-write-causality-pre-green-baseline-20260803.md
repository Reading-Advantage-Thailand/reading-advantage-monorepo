# H5 Candidate-Publisher JSON-Write Causality Pre-Green Baseline

This artifact freezes the only production call authorized for the next Green
slice. It is a Red baseline, not acceptance evidence.

- Captured date: 2026-08-03
- Runner path: measure/business_operations_graph_baseline_execution_closure_v3_podman.py
- Pre-Red runner SHA-256: 4f1eb6a34c946f101791a26cf090f68cfffc360000a57974015947f44feec1c3
- Test path: measure/tests/test_business_operations_graph_baseline_execution_closure.py
- Pre-Red full test SHA-256: 69053a5a5e49c22bdfeb4c4d2ac3b2f0e050c96f63a97de64c49b541adafc01e
- Post-Red full test SHA-256: 4bd0a875ba002781138c30ea0197b79656a42f5d6e7452599b8dbb264592dd46
- Authorized Green surface: only the single `_write_json` call below inside
  `_publish_candidate_publication_failure_attempt`.
- Frozen: candidate-publisher mechanics, validator, private identity/staging
  references, stage classification, schemas/carriers, reserve/collision/rename
  and cleanup behavior, the outer staging TemporaryDirectory,
  preserve_failure routing/message, all tests, shared helper identity, and the
  already-wrapped pre-seal `_write_json` call inside `_publish_failed_attempt`.

## Defect this Red demonstrates

This slice closes review finding CAND-3 (Medium) from
`r1-v3-candidate-publisher-causality-independent-review-20260803.md`, which
reviewed this runner at the exact SHA-256 pinned above. The candidate publisher
writes `failed-attempt.json` with a bare `_write_json(...)` call; any OSError
raised there propagates without an explicit cause, so the in-flight
candidate-operation failure is detached from the causal chain that an operator
would inspect. The parallel pre-seal path already wraps the identical call in
`try/except OSError as json_write_error: raise json_write_error from error`.

Accepted contract: drive the real candidate `preserve_failure` ->
`_publish_candidate_publication_failure_attempt` path, take one deterministic
OSError from `_write_json` while `failed-attempt.json` is still absent, and
require the same caught JSON-write error to explicitly retain the original
candidate-operation error as its `__cause__`, with the exact outer
`CandidateExecutionBlocked` message, zero validator calls, no reservation,
rename, or replace, no public canonical attempt, and no private raw or staging
residue.

## Exact UTF-8 snapshot

The authorized call is the candidate-publisher `failed-attempt.json` write.
Its exact UTF-8 bytes (8-space indentation, trailing newline) are

        _write_json(directory / "failed-attempt.json", attempt)

with SHA-256
`dce45138d4a2347ccfcec49e2c206b7092c027724817311c88b8ee9ced58876f`.

The only permitted Green change is to wrap that one call in

        try:
            _write_json(directory / "failed-attempt.json", attempt)
        except OSError as json_write_error:
            raise json_write_error from error

so the same caught OSError is rethrown from the existing `error` argument. No
validator, reservation, collision, rename, cleanup, staging, schema, carrier,
message, or routing behavior may otherwise change.

## Call-site disambiguation (required for reconstruction)

The authorized byte sequence is **not unique** in the runner as a substring:
the 8-space-indented line occurs as a full line exactly once (line 6812 in the
candidate publisher) and as a substring of the 12-space-indented line inside the
already-wrapped pre-seal block (line 7073). A whole-file reconstruction check
that replaces the block by content alone is therefore ambiguous and must not be
used.

| Construct | Occurrences | Status |
| --- | --- | --- |
| `        _write_json(directory / "failed-attempt.json", attempt)` as a full line | 1 | **Authorized.** The sole Green surface (line 6812). |
| The same 8-space byte sequence as a substring | 2 | The second is inside the frozen pre-seal wrapped block (line 7073). |
| Pre-seal wrapped block (lines 7072-7075), SHA-256 `c5b1563bcbc8898d1ae40037675f8971461039b4fc236893b5ac864a30c600ea` | 1 | **Frozen.** Byte-unchanged. |

The unique-anchor strategy: the candidate-publisher occurrence is identified by
its following line `validate_failed_execution_attempt_v1(attempt, directory)`
plus the subsequent `try:` / `final_directory.mkdir()` /
`except FileExistsError:`. The exact UTF-8 multi-line anchor is

        _write_json(directory / "failed-attempt.json", attempt)
        validate_failed_execution_attempt_v1(attempt, directory)
        try:
            final_directory.mkdir()
        except FileExistsError:

with SHA-256
`62dd09767a7ef099d238d9cdf5f96832730857a8bc5e5e42714cb0eb62e7fed2` and exactly
**one** occurrence in the pre-Red runner. Green acceptance must verify that the
pre-seal wrapped block at SHA-256
`c5b1563bcbc8898d1ae40037675f8971461039b4fc236893b5ac864a30c600ea` is
byte-unchanged, and that replacing only the Green hunk reconstructs the complete
pre-Green runner at `4f1eb6a34c946f101791a26cf090f68cfffc360000a57974015947f44feec1c3`
exactly. After the authorized wrap the 5-line anchor falls to zero occurrences
(both `_write_json` lines become 12-space), which is the expected signature of
the change.

Reconstruction hazard after Green: the wrapped candidate-publisher block will be
byte-identical to the pre-seal wrapped block, so content-only replacement is
still ambiguous. Reconstruction must anchor on the unique longer context that
ends at the candidate publisher's
`_fail("V3_PODMAN_ATTEMPT_PUBLICATION_COLLISION", attempt_name)` line, which
appears directly after `except FileExistsError:` only in the candidate
publisher (the pre-seal path opens a nested `try:` there).

## Red receipt

Command:

    PYTHONDONTWRITEBYTECODE=1 python3 -m pytest measure/tests/test_business_operations_graph_baseline_execution_closure.py -q -k candidate_failure_evidence_json_write

which selects exactly
`R1V3ExecutionClosureRedTests.test_candidate_failure_evidence_json_write_failure_cleans_private_stage_and_retains_cause`.

Observed result: one test failed in 3.56s only at
`self.assertIs(json_write_error.__cause__, candidate_error)`: the same
pre-created OSError for `V3_TEST_CANDIDATE_FAILURE_EVIDENCE_JSON_WRITE` has no
explicit cause (`AssertionError: None is not
OSError('V3_TEST_CANDIDATE_FAILURE_EVIDENCE_OPERATION')`). Before that
assertion, the real candidate publisher reached the deterministic JSON-write
fault against `failed-attempt.json` under the private
`.candidate-publication-failure-` staging parent while that JSON was still
absent. The test proved the exact outer
`CandidateExecutionBlocked` message, zero validator calls, zero rename calls, no
public attempt, no lingering private leaf or staging parent, and no raw residue;
the real path therefore cannot reach reservation, rename, replace,
candidate/generic publisher, Podman, trace, build, or generation. The raw
receipt-copy clause of the contract is vacuous for this path: the candidate
publisher performs no raw receipt copies, and the test mirrors that actual
structure.

## Authorship

The test method was transcribed and the fault design, disambiguation, Red run,
and hashes were performed in-loop for this slice against the real runner and the
real frozen fixture surface. The Red test drives the real candidate
`preserve_failure` path through `_publish_candidate_publication_failure_attempt`
with successful private integration/failure-carrier validation, a deterministic
injected `_write_json` OSError, and validator/rename/replace/generic/Podman/
trace/later-stage tripwires, while the private staging rmtree is allowed to run
via the real TemporaryDirectory cleanup.
