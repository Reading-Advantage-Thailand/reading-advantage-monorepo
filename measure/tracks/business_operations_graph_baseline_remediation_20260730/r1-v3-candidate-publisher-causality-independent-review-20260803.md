# Independent Review: R1-v3 Candidate-Publisher Causality (2026-08-03)

- Reviewer: fresh-eyes independent role (GLM-5.2, Volcengine Coding Plan), which
  did not produce the runner or any R1-v3 evidence. OpenAI subscription
  reviewers were unavailable this session (subscription exhausted); Kimi is
  reserved for orchestration. Reviewer identity substitution is recorded
  honestly and does not claim Terra/Sol equivalence.
- Subject: `measure/business_operations_graph_baseline_execution_closure_v3_podman.py`
  at SHA-256 `4f1eb6a34c946f101791a26cf090f68cfffc360000a57974015947f44feec1c3`.
- Mode: read-only; no files edited; no pnpm/podman/git mutations.

## Verdict: FAIL (two High findings)

## Findings

- **CAND-1 (High)** — runner:6820 — `_publish_candidate_publication_failure_attempt`
  propagates an `os.rename` OSError bare, without `raise rename_error from error`,
  detaching the original candidate-publication failure from the causal chain.
  The parallel pre-seal path (runner:7085-7098) captures and re-raises
  `from error` correctly. Red: injected rename OSError must surface with
  `__cause__` being the original candidate-operation error.
- **CAND-2 (High)** — runner:6817 — the collision
  `_fail("V3_PODMAN_ATTEMPT_PUBLICATION_COLLISION", ...)` raises without
  `from error`; the pre-seal path (runner:7079-7083) wraps and re-raises
  `collision_error from error`. Red: pre-create the canonical final directory,
  force `FileExistsError`, assert the collision error's cause chain reaches the
  original candidate-operation error.
- **CAND-3 (Medium)** — runner:6812 — `_write_json` is not wrapped
  `try/except OSError: raise json_write_error from error`; the pre-seal path
  (runner:7072-7075) wraps it. Red: patch `_write_json` to raise OSError and
  assert the cause chain reaches the original candidate-operation error.

## Areas checked with no new findings above Medium

- `validate_failed_execution_attempt_v1` stage/carrier/NOT_RUN/hash/size bindings
  and attempt-name/run-day traversal rejection.
- Identity-derivation TOCTOU handled by mkdir-as-reservation + `FileExistsError`.
- Private staging cleanup (`except OSError` both publishers; zero remaining bare
  `except FileNotFoundError:`).
- `preserve_failure` outer `CandidateExecutionBlocked from preservation_error`.
- Scheduler/executor stage ordering, NOT_RUN forwarding, sealed-integration
  binding, and capacity probe.

## Disposition

CAND-1, CAND-2, and CAND-3 form the next Red queue, one frozen slice each,
mirroring the accepted pre-seal causality slices. No marker, candidate,
Podman, Finance, registry, successor, or V2/history action is authorized by
this review. Phase R1 v3 remains `[~]`.
