# Phase S3 Acceptance: Persist activity evidence

## Outcome

Phase S3 passes. The shared runtime now owns authenticated, replay-safe activity
sessions; bounded engagement batches; server-assessed evidence; thin tRPC and
HTTP boundaries; teacher-scoped summaries; and a durable assessed-event outbox
that projects `practice.v1` into canonical Mastery records.

Codecamp's explicit platform tenant maps into reserved Mastery school
`c0deca00-0000-4000-8000-000000000001` through `mastery_principals`, retaining
`codecamp` as source-tenant provenance. School tenants continue to use their
own school UUIDs. Engagement events never enter the correctness projection.

## Verification

- Activity runtime: 12 files, 66 tests passed; build types, test types, and lint passed.
- DB: activity schema tests 2/2 and build type-check passed.
- Domain: focused activity/Drizzle/Mastery suites 25/25 passed; type-check and affected lint passed.
- Migration: 0029 applied through the real PGlite migration harness.
- Integration: a null-school Codecamp actor produced one assessed event, one
  Mastery principal, one evidence record, and one idempotency commit; an
  identical retry remained one logical submission.
- Graph: affected structural files were incrementally indexed.

## Independent review

Final review reported no Critical or High findings. It verified platform
Mastery projection, durable pending/projected/failed outbox state, retry-worker
recovery, canonical JSONB comparison, tenant classifications, and ownership
foreign keys.

## Browser applicability

Browser acceptance is not applicable to this persistence-only phase. The
learner-visible player was accepted in S2, and the end-to-end learner/teacher
browser walkthrough remains the S5 vertical-slice gate.

## Operational follow-up

Before production volume, schedule `retryPendingActivityMasteryProjections` in
the worker service and add retry pacing, a maximum-attempt policy, and a status
index. These are operational hardening tasks; the durable recovery path itself
is implemented and tested.
