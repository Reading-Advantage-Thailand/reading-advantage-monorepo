# R1 v3 Post-D2 Findings and Dispositions (2026-08-04)

## Scope

This document records four findings that surfaced while verifying commit
`f8455cf51` (D1/D2a/D2b evidence preservation) and were **not** in the approved
plan. It assigns each a disposition. It changes no code, no frozen evidence, and
no marker. Phase R1 v3 remains `[~]`; R2 Tasks 3-5 and all R3 tasks remain `[b]`.

The verification runs behind these findings are recorded in
`d1-d2-evidence-preservation-verification-receipt-20260804.md`.

F1, F2, and F4 are the same root pattern the 2026-08-02 review named: the
evidence path and the live path drift apart while tests pin bytes and argv
literals instead of behavior. F3 is the external event that made F2 permanent.

---

## F1 — Attempt 0005 no longer validates under the current runner

**Status: OPEN. Requires a bounded slice. Not fixed here.**

### Observation (verified in-loop 2026-08-04)

    validate_failed_execution_attempt_v1(
        json.loads(Path(".../r1-v3-podman-execution-attempt-20260802-0005/failed-attempt.json").read_text()),
        Path(".../r1-v3-podman-execution-attempt-20260802-0005"),
    )
    -> ExecutionClosureValidationError:
       V3_DIRECT_RUNTIME_RUNNER_INTEGRATION_FAILED_ATTEMPT_RUNTIME_CARRIER_MISSING

### Cause

The frozen record's `failure.stage` is `generate-standard-pack-catalog`, which is
a member of `_DIRECT_RUNTIME_RUNNER_STAGES` (runner lines 1067-1076). Since the
direct-runtime carrier contract landed, the validator requires every attempt
whose stage is in that tuple to carry either `directRuntimePreSealAttempt` or
`directRuntimeIntegration` (runner lines 4863-4870). Attempt 0005 was written on
2026-08-02, before that contract existed, and carries neither; its top-level keys
are exactly `attempt`, `commands`, `failure`, `historicalBlocker`, `kind`,
`markerDisposition`, `schemaVersion`, `status`, `upstreamAuthority`.

The record declares `schemaVersion: 1`. So does every record the current runner
writes. **The contract tightened inside a single schema version**, so the version
field cannot discriminate between the two, and no automated consumer can tell a
legitimately pre-carrier record from a malformed current one.

### Why this matters

Frozen attempt records are historical evidence for this track's blocker chain. If
the validator that is supposed to prove them cannot replay them, the evidence is
unverifiable going forward, and the failure mode is silent: it looks identical to
a corrupt record.

### Disposition

**OPEN — remediate in a bounded slice before the confirming closure attempt.**
Two admissible fixes:

- **(a) Version the failed-attempt schema and dispatch on the declared version**,
  so a record keeps validating under the contract it was written against, and
  bump the version at the carrier boundary. Recommended: it preserves
  replayability and makes future tightening explicit.
- **(b) Declare pre-carrier attempts historical-only** and stop re-validating
  them. Cheaper, but it permanently removes attempt 0005 from the verifiable
  chain and hides the next such tightening.

Forbidden either way: rewriting, re-dating, or "migrating" the frozen record.
Attempt 0005 is immutable evidence bound to its commit; the validator moves, the
evidence does not.

---

## F2 — A test reads the live worktree for state the closure never uses

**Status: OPEN. Requires a bounded slice. Not fixed here.**

### Observation

`test_direct_command_runtime_attempt_preserves_missing_script_blocker`
(test file lines 1973-1975) does:

    baseline_script_bytes = Path(STANDARD_PACK_RUNTIME_ASSET).read_bytes()
    self.assertEqual(_sha256(baseline_script_bytes), "ea4e0724…a35edbb6")
    self.assertEqual(len(baseline_script_bytes), 5081)

`Path(STANDARD_PACK_RUNTIME_ASSET)` is CWD-relative: it reads
`packages/advantage-play-kit/scripts/generate-standard-pack-release.mjs` **from
the live working tree**, then asserts the hash of the *baseline commit's* blob.

### Why it is wrong

The runner deliberately does the opposite. Runner lines 1078-1082:

    # The retained V2 archive deliberately did not contain this direct-runtime
    # source tree. It is captured from this immutable commit only; no live
    # worktree fallback is permitted during preparation.
    _DIRECT_RUNTIME_BASELINE_COMMIT = "e78fe22bb405de732de14c18590b19af0ce5f0de"

It sources the generator through `git ls-tree` / `git cat-file` against that
commit (runner lines 1147, 1197, 2870) and refuses live-worktree fallback. So the
test asserts on a byte source the closure never reads. Any legitimate change to
the generator script — committed or not, by this track or any other — reds the
suite, while the closure itself is entirely unaffected. It is a false signal in
both directions: it fires when nothing is wrong, and it would stay green if the
baseline blob itself were somehow substituted.

### Disposition

**OPEN — bind the assertion to the same baseline blob the runner uses**
(`git cat-file blob e78fe22bb:<path>`, or the runner's own capture helper), so
the test proves the property the closure depends on. Do **not** repin the
constant to the current worktree hash: that would bless whatever the tree happens
to contain and destroy the drift signal the assertion was written to carry.

The size assertion (`5081`) is subject to the same defect; it currently passes
only by coincidence (see F3) and must move to the same source.

---

## F3 — The generator script has diverged from the baseline commit (committed)

**Status: NO ACTION on the sibling change. It is legitimate. Closed as an
explanation of F2's failure.**

### Observation (verified in-loop 2026-08-04)

| Source | SHA-256 |
| --- | --- |
| Baseline `e78fe22bb` blob | `ea4e072430cdc26d6072950651b3b18fbc4a62bde8bfbd91d8a3dda6a35edbb6` |
| `HEAD` blob | `cda4ee633d13dd39dcf83a5880bc41a75224ec8e30b811d335d4295d43ce814d` |
| Live worktree | `cda4ee633d13dd39dcf83a5880bc41a75224ec8e30b811d335d4295d43ce814d` |

`git status --porcelain` and `git diff --stat` for that path are both empty: the
worktree is **clean** and equals `HEAD`.

### Cause

Commit `d6becf5f1` — `feat(apk): accept release 2026.08.04 (track_id:
apk_audio_cohort_release_acceptance_20260804)` — changed one line:

    -  version: process.env.APK_STANDARD_PACK_VERSION ?? "2026.07.23",
    +  version: process.env.APK_STANDARD_PACK_VERSION ?? "2026.08.04",

Both version strings are ten characters, so the file length is still `5081` and
only the hash assertion fails.

### Correction of an earlier in-loop reading

An earlier reading in this session characterized this as an *uncommitted* edit by
a concurrent APK session and treated it as cross-track interference of the kind
that caused the 2026-08-03 frozen-evidence drift incident. That was wrong. The
change is committed, attributed, scoped to a sibling track's own product file,
and touches no evidence directory of this track. There is no interference and
nothing to restore.

### Consequence

F2's failure is therefore **permanent, not transient**. It will not clear on its
own, and it will recur on every future standard-pack version bump. The fix is F2:
bind the test to the baseline blob. Reverting or repinning is not on the table —
`d6becf5f1` is a sibling track's accepted work, and this track does not edit it.

---

## F4 — `validate_noninstall_pnpm_executor_v1` has an unreachable generator branch

**Status: OPEN. Pre-existing, not caused by D2a. Requires a bounded slice.**

### Observation (verified in-loop 2026-08-04)

`test_noninstall_pnpm_executor_validator_rejects_payload_environment_and_executor_drift`
errors with `V3_PNPM_NONINSTALL_EXECUTOR_INVALID`, raised at runner line 9403 —
the *first* guard in the validator:

    logical = command.get("argv") if isinstance(command, dict) else None
    if not isinstance(logical, list) or not any(logical == expected for _, expected in NONINSTALL_PNPM_COMMANDS):
        _fail("V3_PNPM_NONINSTALL_EXECUTOR_INVALID")
    environment_overrides = (
        {"NODE_OPTIONS": DIRECT_RUNTIME_GENERATOR_NODE_OPTIONS}
        if logical == STANDARD_PACK_GENERATOR
        else {}
    )

`NONINSTALL_PNPM_COMMANDS` is `BUILDS + FR4` (runner lines 95-100). It does **not**
contain `STANDARD_PACK_GENERATOR`. The test's loop at test line 1535 validates
`[*BUILDS, STANDARD_PACK_GENERATOR, *FR4]`, and the generator entry is rejected
by the first guard.

Two things follow. The test asserts a contract the validator does not implement,
**and** the `logical == STANDARD_PACK_GENERATOR` branch immediately below the
guard is dead code — the only argv that could select it has already been
rejected.

### Attribution

Not a D2a regression. `validate_noninstall_pnpm_executor_v1` and
`NONINSTALL_PNPM_COMMANDS` are byte-identical at `f8455cf51^`; the same error is
produced by the pre-Green runner. D2a is nonetheless adjacent: it declared
`PACKAGE_RELATIVE_STANDARD_PACK_GENERATOR` the single argv source for generator
environment expectations, while this validator still compares against the pnpm
`STANDARD_PACK_GENERATOR` form in a branch that cannot execute.

### Disposition

**OPEN — decide which of the two contracts is real, then make code and test
agree.** Either the generator belongs in `NONINSTALL_PNPM_COMMANDS` (in which
case the validator has a genuine coverage gap and the dead branch becomes live),
or the generator is validated only through the failed-attempt and receipt
validators (in which case both the test's loop entry and the dead branch must
go). Do not silence the test by deleting the assertion without settling that
question.

---

## Combined effect on the track

- No frozen evidence was modified by this analysis.
- No marker changed. Phase R1 v3 remains `[~]`.
- F1, F2, and F4 are now actionable tasks in `plan.md` under Phase R1 v3. Per this
  project's standing rule, they are encoded as work, not as "out of scope" notes.
  F3 needs no task.
- F1 in particular should land **before** the confirming closure attempt: that
  attempt will write a new failed-attempt record, and the same validator that
  cannot replay attempt 0005 is the one that will have to prove it.
