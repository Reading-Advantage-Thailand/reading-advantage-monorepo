# Independent Re-Review: R1-v3 Candidate-Publisher Causality (2026-08-03)

- Reviewer: fresh-eyes independent role (GLM-5.2, Volcengine Coding Plan), the
  same reviewer identity as `r1-v3-candidate-publisher-causality-independent-review-20260803.md`;
  it did not produce the runner or any R1-v3 evidence. Read-only; no edits.
- Subject: `measure/business_operations_graph_baseline_execution_closure_v3_podman.py`
  at SHA-256 `b8abd4e1e140d49e585d74d5acff0b9a2ecb638b2514b36fa330e96ad8d4743d`,
  after the CAND-3 (`61bd3ca68`), CAND-2 (`a39088a64`), and CAND-1 (`fa30c2fcc`)
  Green slices.

## Verdict: PASS (no Critical/High open)

## Prior findings

- **CAND-1: CLOSED** — runner:6825-6838 captures `os.rename` OSError into
  `rename_error` and re-raises `from error`; byte-equivalent to pre-seal
  runner:7096-7109. Test asserts `rename_error.__cause__ is candidate_error`.
- **CAND-2: CLOSED** — runner:6817-6823 wraps the collision `_fail` and
  re-raises `collision_error from error`; byte-equivalent to pre-seal
  runner:7088-7094. Test asserts sentinel preservation and cause chain.
- **CAND-3: CLOSED** — runner:6812-6815 wraps `_write_json`
  `try/except OSError: raise json_write_error from error`; byte-equivalent to
  pre-seal runner:7083-7086. Test asserts no validator call, private-stage
  cleanup, and cause chain.

## Frozen behavior and fresh-eyes sweep

Ordering preserved: private staging → private JSON write → real validator
acceptance → single reservation mkdir → single rename → `except OSError`
cleanup. The three H5 commits touch only the candidate publisher
(hunk ranges within 6721-6838); the pre-seal publisher has zero diff lines.
No new Critical/High defects: zero bare `except FileNotFoundError:` remain;
validation precedes public reservation; identity/mkdir TOCTOU is absorbed by
the collision path; staging cleanup cannot mask the captured cause chain.

## Disposition

The 2026-08-03 review cycle (FAIL → three frozen slices → PASS) is closed at
the candidate-publisher causality scope only. No marker, candidate, Podman,
Finance, registry, successor, or V2/history action is authorized. Phase R1 v3
remains `[~]`; R2 Tasks 3-5 and all R3 tasks remain `[b]`.
