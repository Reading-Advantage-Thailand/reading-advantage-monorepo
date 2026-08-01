# Historical Guard Maintenance Acceptance — 2026-08-02

## Status

Accepted as a narrowly bounded historical-guard maintenance microphase for
`apk_existing_core_cutover_20260727`. This record is not Task 5, corrective
phase, track, runtime/browser, host, owner, retirement, cohort, or cutover
acceptance.

## Base and Scope

- Reviewed base: `8fee4a9845dc9dc68573f2c1ea33164f8100c596`.
- Immutable historical acceptance revision: `e0a5fb2a579ab7ec8d80c2336f4c93a946605452`.
- Changed guard files only:
  - `measure/tests/test_apk_existing_core_cutover_task3_acceptance.py`
  - `measure/tests/test_apk_existing_core_cutover_task4_acceptance.py`
- This receipt is the only additional file in the transaction.

The patch corrects obsolete plan-state assertions: the Dragon Flight-only Task
5 corrective phase remains `[~]`, while Tasks 6 and 7 remain `[b]` with the
`apk_existing_core_cutover_20260727-dragon-flight-reference-acceptance`
deferral. The guards retain the non-negotiable both-host checkpoint,
direct-JSON/same-frame-bypass, server-dwell, and failed-or-missing-receipt
boundaries.

Task 3 retains its live catalog/loader quarantine digest check so it continues
to detect unauthorized current exposure. A separate immutable-revision check
records the accepted historical bytes. Task 4 similarly evaluates historical
implementation bindings at the immutable acceptance revision, without
reclassifying current runtime work as accepted.

## Verification

In a clean detached worktree at the reviewed base:

```sh
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest \
  measure.tests.test_apk_existing_core_cutover_task3_acceptance \
  measure.tests.test_apk_existing_core_cutover_task4_acceptance
```

Result: `13 tests`, `OK`.

`git diff --check` passed for the two guard files. Terra performed independent
phase acceptance and Sol performed independent track acceptance.

## Explicit Non-Closure

The Task 5 runtime/browser remediation guard remains unchanged and red/pending.
The shared 24-title candidate remains historical, non-consumable user-owned
work and is not staged, consumed, or accepted here. No plan, metadata, registry,
candidate, application, runtime, UI, asset, catalog, host-cutover, retirement,
or deployment file is changed by this microphase.
