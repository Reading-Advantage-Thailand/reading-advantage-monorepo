# H5 Candidate-Publisher Rename Causality Pre-Green Baseline

This artifact freezes the only production block authorized for the next
Green slice. It is a Red baseline, not acceptance evidence.

- Captured date: `2026-08-03`
- Runner path: `measure/business_operations_graph_baseline_execution_closure_v3_podman.py`
- Pre-Green runner SHA-256: `bff014ae25971a1e378917868dd85d5dc0a02d9a4eebd6a4329e3520deb3f0f4`
- Test path: `measure/tests/test_business_operations_graph_baseline_execution_closure.py`
- Pre-Red full test SHA-256: `771df0ec53d254879d06f27e37b42ed33731eea58143eb89ad23fa73e126278d`
- Post-Red full test SHA-256: `f969e71b1e0700772eb2ac612ebddcff476328538cd93c6c597c1bc3a0cd57d5`
- Authorized Green surface: only the captured candidate-publisher rename
  exception/cleanup block below inside
  `_publish_candidate_publication_failure_attempt`.
- Frozen: candidate-publisher mechanics, private staging and raw-reference
  construction, validator, identity/staging references, stage classification,
  schemas/carriers, reserve/collision/json-write behavior, the outer staging
  `TemporaryDirectory`, `preserve_failure` routing and message, all tests, and
  the already-wrapped pre-seal rename block inside `_publish_failed_attempt`.

## Defect this Red demonstrates

This slice closes review finding CAND-1 (High) from
`r1-v3-candidate-publisher-causality-independent-review-20260803.md` -- the
last open finding of that review. The candidate publisher renames the private
staged leaf into the reserved public directory with a bare `os.rename`; an
OSError raised there propagates without an explicit cause, so the in-flight
candidate-operation failure is detached from the causal chain that an operator
would inspect. The parallel pre-seal path already captures the OSError and
re-raises it `from error`.

Accepted contract: drive the real candidate `preserve_failure` ->
`_publish_candidate_publication_failure_attempt` path, take one deterministic
OSError from `os.rename` after successful private validation against the
empty publisher-owned public reservation, and require the same caught rename
error to explicitly retain the original candidate-operation error as its
`__cause__`, with the exact outer `CandidateExecutionBlocked` message, the
empty public reservation removed, the private staged leaf and its staging
parent removed, no public canonical attempt with failed-attempt content, no
validator/JSON-write after the failure, and no
replace/candidate/generic/Podman/later-stage action.

## Context anchors

The snapshot is within `_publish_candidate_publication_failure_attempt` after
the private `directory = staging_parent / attempt_name` failed-attempt write
and validation path. It begins at `final_reserved = True` after the
public-reservation `mkdir`, then covers exactly one `os.rename`, reservation
cleanup, and the trailing bare propagation. The preceding anchors are the
`try: final_directory.mkdir() / except FileExistsError:` collision block and
the reserved `final_directory`; the outer private staging cleanup is owned by
the enclosing `tempfile.TemporaryDirectory`.

## Exact UTF-8 snapshot

The following code block is the exact UTF-8 byte sequence from pre-Green
runner lines 6824-6833, without any terminal LF. Its SHA-256 is
`47c232db56b81a534830146369360f95525b9e28c983190fb10aff03c672e82e`.

```python
        final_reserved = True
        try:
            os.rename(directory, final_directory)
            published = True
        finally:
            if final_reserved and not published:
                try:
                    shutil.rmtree(final_directory)
                except OSError:
                    pass
```

The only permitted Green change is to convert that one block to exactly the
accepted pre-seal capture/re-raise form, keeping the existing `finally`
cleanup (`except OSError`) byte-identical:

```python
        final_reserved = True
        rename_error: OSError | None = None
        try:
            os.rename(directory, final_directory)
            published = True
        except OSError as caught_rename_error:
            rename_error = caught_rename_error
        finally:
            if final_reserved and not published:
                try:
                    shutil.rmtree(final_directory)
                except OSError:
                    pass
        if rename_error is not None:
            raise rename_error from error
```

No validator, reservation, collision, json-write, cleanup, staging, schema,
carrier, message, or routing behavior may otherwise change, and the pre-seal
wrapped block must stay byte-unchanged.

## Uniqueness proof (required for reconstruction)

The candidate bare block differs from the pre-seal wrapped block by lacking
the `except OSError as caught_rename_error:` / `rename_error = caught_rename_error`
lines and the trailing `if rename_error is not None: raise rename_error from error`.
Concretely, the bare form

```python
        final_reserved = True
        try:
            os.rename(directory, final_directory)
            published = True
        finally:
```

occurs **exactly once** in the pre-Green runner (the pre-seal path inserts
`rename_error: OSError | None = None` between `final_reserved = True` and
`try:`), and the pre-seal wrapped 15-line block (lines 7090-7104) also occurs
exactly once.

| Construct | Occurrences | Status |
| --- | --- | --- |
| Bare block (lines 6824-6833), SHA-256 `47c232db56b81a534830146369360f95525b9e28c983190fb10aff03c672e82e` | 1 | **Authorized.** The sole Green surface. |
| Bare-form 5-line prefix, SHA-256 `460afcb2c89515b905e073acb9fb467b90684fd32482919902e84cda09c49407` | 1 | **Authorized anchor.** Proves the bare form is unique. |
| Pre-seal wrapped block (lines 7090-7104), SHA-256 `390fcc79c193b7476a4c51db8f39c42418ab68e222a4d35787924de74063850d` | 1 | **Frozen.** Byte-unchanged. |

After Green the pre-seal-form block occurs exactly twice; reconstruction must
disambiguate by following context: the candidate occurrence is followed by
blank lines and `def _next_failed_execution_attempt_identity_v1(` while the
pre-seal occurrence is followed by the 4-space outer
`finally: try: shutil.rmtree(staging_parent)`. Replacing only the candidate
occurrence with the frozen bare block must reconstruct the complete pre-Green
runner at `bff014ae25971a1e378917868dd85d5dc0a02d9a4eebd6a4329e3520deb3f0f4`
exactly, and the pre-seal wrapped block must remain byte-unchanged at
`390fcc79c193b7476a4c51db8f39c42418ab68e222a4d35787924de74063850d`.

## Red receipt

Command:

```sh
PYTHONDONTWRITEBYTECODE=1 python3 -m pytest measure/tests/test_business_operations_graph_baseline_execution_closure.py -q -k candidate_failure_evidence_rename
```

which selects exactly
`R1V3ExecutionClosureRedTests.test_candidate_failure_evidence_rename_failure_cleans_reservation_and_retains_cause`.

Observed result: one test failed in `11.06s` only at
`self.assertIs(rename_error.__cause__, candidate_error)`: the pre-created
`OSError('V3_TEST_CANDIDATE_FAILURE_EVIDENCE_RENAME')` has no explicit cause
(`AssertionError: None is not
OSError('V3_TEST_CANDIDATE_FAILURE_EVIDENCE_OPERATION')`). Before that
assertion, the real candidate publisher reached the deterministic rename fault
against the empty publisher-owned public reservation after successful private
validation with the real validator, and proved the exact outer
`CandidateExecutionBlocked` message, exactly one private JSON write and one
private validator acceptance, the empty reservation removed, the private
staged leaf and staging parent removed, no public canonical attempt, and no
raw residue. The real path therefore cannot reach replace, generic publisher,
Podman, trace, build, or generation after the rename failure; the pre-seal
reservation-cleanup masking test remains unchanged and keeps passing.
