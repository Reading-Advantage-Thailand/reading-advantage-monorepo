# Phase 1 foundation acceptance — 2026-08-10

## Accepted scope

The first Finance Operations task is accepted as the policy-neutral contract
and test foundation for the planned `apps/accounting` product. It provides:

- exact minor-unit money and same-currency arithmetic;
- tenant-scoped, atomic record acceptance with replay/conflict classification;
- append-only corrections with scoped supersession checks;
- Company Identity authorization with explicit school attestation;
- immutable allowed, denied, succeeded, and failed audit evidence;
- provider-neutral CRM, Tutor, private-evidence, durable-job, and audit ports;
- strict provenance and private-evidence references; and
- an architecture guard covering the public barrel and every foundation source
  file.

The foundation does not implement a database adapter, source-system adapters,
an `apps/accounting` UI, or Thai accounting/tax policy. Those remain later
tasks and gates.

## Verification evidence

All verification used repository-local ignored caches. `/tmp` remained at 2.7
MB with no Reading, Finance, graph, or Fleet artifacts.

- Finance Vitest suite: 6 files, 42 tests passed.
- Finance production-only strict TypeScript check: passed.
- Finance test-only strict TypeScript check: passed.
- Focused Finance ESLint: passed.
- Prettier check for the package export and Finance module: passed.
- Direct backend TypeScript emit build: passed.
- Runtime import of `@reading-advantage/backend/finance-operations` from
  `apps/accounts`: passed.
- Independent security/correctness re-review: no Critical, High, or Medium
  findings; Phase 1 foundation accepted technically.
- Independent test-quality re-review: no Critical or High blocker; Phase 1
  evidence supports acceptance.

The aggregate backend commands still encounter previously recorded failures
outside Finance Operations (Standard Pack cross-root configuration and Planned
Game Intake typing). The focused Finance production and test configurations
contain no Finance errors.

## Deferred follow-ups

These are not foundation-acceptance blockers and belong with concrete adapter
work:

- prove atomic concurrency with a barrier-backed persistence adapter test;
- add a different-company record-identity regression case in addition to the
  existing different-school case;
- validate durable-job receipt binding at the concrete `enqueue()` adapter
  seam; and
- decide whether command results should expose immutable snapshots or retain
  the current minimal status/identity shape.

The next active task is the minimum persistence implementation behind the
accepted atomic repository contract. It must remain tenant-scoped,
append-only, provider-neutral above the database adapter, and free of guessed
Thai policy.
