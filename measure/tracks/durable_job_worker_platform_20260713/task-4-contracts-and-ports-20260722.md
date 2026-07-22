# Task 4 — Durable Job Contracts and Ports — 2026-07-22

## Decision

**PASS for Task 4 only.** Provider-neutral runtime contracts and least-
privilege lifecycle ports now encode the Task 3 compatibility and safety
decisions. No schema, migration, PostgreSQL adapter, polling loop, worker
composition, or review-job cutover was added.

## Red evidence

The initial focused command was:

`CI=true node node_modules/vitest/vitest.mjs run packages/backend/src/jobs/__tests__/contracts.red.test.ts packages/backend/src/jobs/__tests__/ports.red.test.ts`

The runtime suite failed before collection because
`packages/backend/src/jobs/index.ts` did not exist. The compile-time-only port
shape suite passed because its imports were erased. This established the
missing runtime boundary without attributing later queue behavior to Task 4.

## Accepted contract surface

- Handler-owned Zod payload and result schemas plus state-safe generic
  envelopes.
- Explicit global or trusted tenant scope on enqueue, claim, heartbeat,
  settlement, failure, reclaim, dead-letter listing, and replay requests.
- Opaque lease-token ownership and typed `stale-lease`, `not-running`, and
  `missing` zero-row outcomes.
- One-based running attempts bounded by `maxAttempts`; dead-letter summaries
  enforce the same invariant.
- Active-lease-safe enqueue outcomes and active-lease replay rejection.
- Fixed `admin:dashboard` authorization evidence, actor identity, decision
  identity, and audit correlation metadata for replay.
- Payload-free, raw-error-free, cursor-bounded dead-letter summaries.
- Separate enqueue, worker, dead-letter, and replay interfaces. Worker
  composition has no replay or dead-letter administration capability.
- Runtime handler-definition validation for stable names, genuine Zod schemas,
  and executable handlers.
- Public `@reading-advantage/backend/jobs` export plus root re-export.

Persisted failures use `code` plus an explicitly named `safeSummary`;
contracts reject raw `message` fields. Exact expired-time transitions,
authorization-policy execution, immutable audit transactions, PostgreSQL
locking, and tenant predicate enforcement remain implementation behavior for
Tasks 8–13 rather than claims made by these interfaces.

## Independent review and remediation

The first independent pass identified three material gaps:

1. dead-letter visibility had no public port;
2. replay carried caller identity but no authorization-policy evidence; and
3. claim/lease/reclaim/replay operations lacked trusted tenant scope.

The producer added payload-free dead-letter contracts and a separate
administration port, fixed replay authorization evidence to
`admin:dashboard`, added tenant scope to every affected request, and added
expiry/tenant/authorization/dead-list counterexamples. The reviewer then found
two temporary `.orig` files, an unbounded dead-letter summary attempt, and a
missing `superRefine` closure. The producer removed the artifacts, enforced
the attempt bound, and corrected the parse defect. Both the producer test run
and reviewer independently reproduced the parse failure before the correction.

Fresh final reviewer decision: **PASS; no blocking findings.**

## Verification

- Focused contracts/ports/exports:
  9 files, 26 tests passed.
- Isolated Task 4 coverage:
  100% statements, 100% branches, 100% functions, 100% lines.
- Full backend regression:
  26 files passed; 234 tests passed and 7 explicitly skipped.
- Production and test TypeScript no-emit checks: exit 0.
- Configured ESLint for jobs and package export test: exit 0.
- Backend build, including `./jobs` declarations and JavaScript: exit 0.
- Live architecture checker: exit 0 in the fresh independent re-review.
- Scoped `git diff --check`: exit 0.
- Patch-artifact search: no `.orig` or `.rej` files.

The documented `build-graph` executable is unavailable in this environment.
The installed `repo-graph` replacement completed the required direct full
scan after two incremental fallback attempts were killed during concurrent
work: 85,917 nodes and 113,712 edges in 261,138 ms, with persistence peaking at
1,660 MiB RSS. Fresh inspect resolved `DurableJobWorkerPort` to
`packages/backend/src/jobs/ports.ts`, and search resolved `DeadJobSummary`

## Boundary

Task 5 still owns schema/migration, indexes, state mapping, transition design,
tenant-registry classification, reversible `review_jobs` adoption, and the
exact PostgreSQL adapter ownership root. No Task 5 decision is implied by this
Task 4 PASS.
